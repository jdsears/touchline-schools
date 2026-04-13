import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { loadClub, requireClubRole, requireClubFeature } from '../middleware/clubAuth.js'
import { sendNotificationEmail, isEmailEnabled, sendEmail } from '../services/emailService.js'
import { uploadFile } from '../services/storageService.js'

const router = Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ==========================================
// MULTER CONFIG FOR COMPLIANCE DOCUMENTS
// ==========================================

const uploadsBaseDir = path.join(__dirname, '../uploads/clubs')

const complianceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { clubId } = req.params
    const userId = req.body.user_id || req.params.id
    const dir = path.join(uploadsBaseDir, clubId, 'compliance', String(userId))
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, uniqueSuffix + ext)
  },
})

const upload = multer({
  storage: complianceStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ]
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('File type not allowed. Accepted: PDF, DOC, DOCX, JPEG, PNG'))
    }
  },
})

// ==========================================
// INLINE MIDDLEWARE: SAFEGUARDING ACCESS
// ==========================================

// Only welfare officers, club owners, and site admins can view incidents.
// Any club member can REPORT an incident (handled at the route level).
async function requireSafeguardingAccess(req, res, next) {
  try {
    const clubId = req.params.clubId || req.club?.id
    if (!clubId || !req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Site admins always have access
    if (req.user.is_admin) {
      req.safeguardingRole = 'admin'
      return next()
    }

    // Club owners have access
    if (req.clubRole === 'owner') {
      req.safeguardingRole = 'owner'
      return next()
    }

    // Check if user is a welfare officer for this club
    const welfareResult = await pool.query(
      `SELECT id, role_type FROM safeguarding_roles
       WHERE club_id = $1 AND user_id = $2 AND role_type = 'welfare_officer'`,
      [clubId, req.user.id]
    )

    if (welfareResult.rows.length > 0) {
      req.safeguardingRole = 'welfare_officer'
      return next()
    }

    return res.status(403).json({ error: 'Only welfare officers and club owners can access incident records' })
  } catch (error) {
    next(error)
  }
}

// ==========================================
// COMPLIANCE RECORDS
// ==========================================

// List all compliance records for a club
router.get('/:clubId/compliance', authenticateToken, loadClub, requireClubFeature('safeguarding'), requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const { search } = req.query

    let query = `
      SELECT cr.*, u.name as user_name, u.email as user_email
      FROM compliance_records cr
      LEFT JOIN users u ON cr.user_id = u.id
      WHERE cr.club_id = $1
    `
    const params = [clubId]
    let paramIdx = 2

    if (search) {
      query += ` AND u.name ILIKE $${paramIdx}`
      params.push(`%${search}%`)
      paramIdx++
    }

    query += ' ORDER BY cr.dbs_expiry_date ASC NULLS LAST, cr.created_at DESC'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Compliance overview / dashboard stats + alerts
router.get('/:clubId/compliance/overview', authenticateToken, loadClub, requireClubFeature('safeguarding'), requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Run all queries in parallel
    const [
      totalPeopleResult,
      dbsStatsResult,
      firstAidStatsResult,
      welfareOfficerResult,
      alertsResult,
    ] = await Promise.all([
      // Total people with compliance records
      pool.query(
        'SELECT COUNT(DISTINCT user_id) FROM compliance_records WHERE club_id = $1',
        [clubId]
      ),
      // DBS stats (uses dbs_expiry_date column)
      pool.query(
        `SELECT
          COUNT(*) FILTER (WHERE dbs_number IS NOT NULL AND (dbs_expiry_date IS NULL OR dbs_expiry_date > $2)) as valid,
          COUNT(*) FILTER (WHERE dbs_number IS NOT NULL AND dbs_expiry_date <= $2 AND dbs_expiry_date > $3) as expiring,
          COUNT(*) FILTER (WHERE dbs_number IS NOT NULL AND dbs_expiry_date <= $3) as expired
        FROM compliance_records WHERE club_id = $1`,
        [clubId, thirtyDaysFromNow, now]
      ),
      // First aid stats (uses first_aid_expiry column)
      pool.query(
        `SELECT
          COUNT(*) FILTER (WHERE first_aid_cert_type IS NOT NULL AND (first_aid_expiry IS NULL OR first_aid_expiry > $2)) as valid,
          COUNT(*) FILTER (WHERE first_aid_cert_type IS NOT NULL AND first_aid_expiry <= $2 AND first_aid_expiry > $3) as expiring,
          COUNT(*) FILTER (WHERE first_aid_cert_type IS NOT NULL AND first_aid_expiry <= $3) as expired
        FROM compliance_records WHERE club_id = $1`,
        [clubId, thirtyDaysFromNow, now]
      ),
      // Welfare officer assigned?
      pool.query(
        `SELECT COUNT(*) FROM safeguarding_roles
         WHERE club_id = $1 AND role_type = 'welfare_officer'`,
        [clubId]
      ),
      // Active alerts
      pool.query(
        `SELECT * FROM compliance_alerts
         WHERE club_id = $1 AND status = 'active'
         ORDER BY severity DESC, created_at DESC`,
        [clubId]
      ),
    ])

    const dbsStats = dbsStatsResult.rows[0]
    const firstAidStats = firstAidStatsResult.rows[0]

    res.json({
      total_people: parseInt(totalPeopleResult.rows[0].count),
      dbs: {
        valid: parseInt(dbsStats.valid),
        expiring: parseInt(dbsStats.expiring),
        expired: parseInt(dbsStats.expired),
      },
      first_aid: {
        valid: parseInt(firstAidStats.valid),
        expiring: parseInt(firstAidStats.expiring),
        expired: parseInt(firstAidStats.expired),
      },
      welfare_officer_assigned: parseInt(welfareOfficerResult.rows[0].count) > 0,
      active_alerts: alertsResult.rows,
    })
  } catch (error) {
    next(error)
  }
})

// Add a compliance record
router.post('/:clubId/compliance', authenticateToken, loadClub, requireClubFeature('safeguarding'), requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const {
      user_id, role_at_club,
      dbs_number, dbs_issue_date, dbs_expiry_date, dbs_status, dbs_update_service,
      first_aid_cert_type, first_aid_expiry,
      safeguarding_course, safeguarding_date, safeguarding_expiry,
      coaching_badges,
      emergency_contact_name, emergency_contact_phone,
      notes,
    } = req.body

    if (!user_id || !role_at_club) {
      return res.status(400).json({ error: 'user_id and role_at_club are required' })
    }

    const result = await pool.query(
      `INSERT INTO compliance_records (
        club_id, user_id, role_at_club,
        dbs_number, dbs_issue_date, dbs_expiry_date, dbs_status, dbs_update_service,
        first_aid_cert_type, first_aid_expiry,
        safeguarding_course, safeguarding_date, safeguarding_expiry,
        coaching_badges,
        emergency_contact_name, emergency_contact_phone,
        notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *`,
      [
        clubId, user_id, role_at_club,
        dbs_number || null, dbs_issue_date || null, dbs_expiry_date || null,
        dbs_status || 'pending', dbs_update_service || false,
        first_aid_cert_type || null, first_aid_expiry || null,
        safeguarding_course || null, safeguarding_date || null, safeguarding_expiry || null,
        coaching_badges ? JSON.stringify(coaching_badges) : '[]',
        emergency_contact_name || null, emergency_contact_phone || null,
        notes || null,
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Get a single compliance record
router.get('/:clubId/compliance/:id', authenticateToken, loadClub, requireClubFeature('safeguarding'), requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId, id } = req.params

    const result = await pool.query(
      `SELECT cr.*, u.name as user_name, u.email as user_email
       FROM compliance_records cr
       LEFT JOIN users u ON cr.user_id = u.id
       WHERE cr.id = $1 AND cr.club_id = $2`,
      [id, clubId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance record not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Update a compliance record
router.put('/:clubId/compliance/:id', authenticateToken, loadClub, requireClubFeature('safeguarding'), requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId, id } = req.params
    const {
      role_at_club, dbs_number, dbs_issue_date, dbs_expiry_date,
      dbs_status, dbs_update_service, first_aid_cert_type, first_aid_expiry,
      safeguarding_course, safeguarding_date, safeguarding_expiry,
      coaching_badges, emergency_contact_name, emergency_contact_phone, notes,
    } = req.body

    const result = await pool.query(
      `UPDATE compliance_records SET
        role_at_club = COALESCE($1, role_at_club),
        dbs_number = COALESCE($2, dbs_number),
        dbs_issue_date = COALESCE($3, dbs_issue_date),
        dbs_expiry_date = COALESCE($4, dbs_expiry_date),
        dbs_status = COALESCE($5, dbs_status),
        dbs_update_service = COALESCE($6, dbs_update_service),
        first_aid_cert_type = COALESCE($7, first_aid_cert_type),
        first_aid_expiry = COALESCE($8, first_aid_expiry),
        safeguarding_course = COALESCE($9, safeguarding_course),
        safeguarding_date = COALESCE($10, safeguarding_date),
        safeguarding_expiry = COALESCE($11, safeguarding_expiry),
        coaching_badges = COALESCE($12, coaching_badges),
        emergency_contact_name = COALESCE($13, emergency_contact_name),
        emergency_contact_phone = COALESCE($14, emergency_contact_phone),
        notes = COALESCE($15, notes),
        updated_at = NOW()
      WHERE id = $16 AND club_id = $17
      RETURNING *`,
      [role_at_club, dbs_number, dbs_issue_date, dbs_expiry_date,
       dbs_status, dbs_update_service, first_aid_cert_type, first_aid_expiry,
       safeguarding_course, safeguarding_date, safeguarding_expiry,
       coaching_badges, emergency_contact_name, emergency_contact_phone, notes,
       id, clubId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance record not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Upload document to a compliance record
router.post('/:clubId/compliance/:id/documents', authenticateToken, loadClub, requireClubFeature('safeguarding'), requireClubRole('owner', 'admin', 'secretary'), upload.single('document'), async (req, res, next) => {
  try {
    const { clubId, id } = req.params

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Verify the compliance record exists
    const record = await pool.query(
      'SELECT * FROM compliance_records WHERE id = $1 AND club_id = $2',
      [id, clubId]
    )

    if (record.rows.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path)
      return res.status(404).json({ error: 'Compliance record not found' })
    }

    const storageKey = `clubs/${clubId}/compliance/${record.rows[0].user_id}/${req.file.filename}`
    const fileUrl = await uploadFile(req.file.path, storageKey, { contentType: req.file.mimetype })

    const documentEntry = {
      filename: req.file.filename,
      original_name: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: fileUrl,
      uploaded_by: req.user.id,
      uploaded_at: new Date().toISOString(),
    }

    // Append to the documents JSONB array
    const result = await pool.query(
      `UPDATE compliance_records
       SET documents = COALESCE(documents, '[]'::jsonb) || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2 AND club_id = $3
       RETURNING *`,
      [JSON.stringify(documentEntry), id, clubId]
    )

    res.status(201).json({
      message: 'Document uploaded',
      document: documentEntry,
      record: result.rows[0],
    })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// SAFEGUARDING ROLES
// ==========================================

// List safeguarding roles for a club
router.get('/:clubId/safeguarding/roles', authenticateToken, loadClub, requireClubFeature('safeguarding'), requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId } = req.params

    const result = await pool.query(
      `SELECT sr.*, u.name as user_name, u.email as user_email
       FROM safeguarding_roles sr
       LEFT JOIN users u ON sr.user_id = u.id
       WHERE sr.club_id = $1
       ORDER BY sr.role_type, u.name`,
      [clubId]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Assign a safeguarding role
router.post('/:clubId/safeguarding/roles', authenticateToken, loadClub, requireClubFeature('safeguarding'), requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const { user_id, role_type, qualifications, dbs_number, dbs_expiry } = req.body

    if (!user_id || !role_type) {
      return res.status(400).json({ error: 'user_id and role_type are required' })
    }

    const validRoleTypes = ['welfare_officer', 'designated_safeguarding_lead', 'deputy_safeguarding_lead']
    if (!validRoleTypes.includes(role_type)) {
      return res.status(400).json({ error: `Invalid role_type. Must be one of: ${validRoleTypes.join(', ')}` })
    }

    // Verify the user is a club member
    const memberCheck = await pool.query(
      'SELECT id FROM club_members WHERE club_id = $1 AND user_id = $2 AND status = $3',
      [clubId, user_id, 'active']
    )

    if (memberCheck.rows.length === 0) {
      return res.status(400).json({ error: 'User must be an active club member' })
    }

    // Check for existing assignment of the same role type to same user
    const existing = await pool.query(
      'SELECT id FROM safeguarding_roles WHERE club_id = $1 AND user_id = $2 AND role_type = $3',
      [clubId, user_id, role_type]
    )

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'This user already holds this safeguarding role' })
    }

    const result = await pool.query(
      `INSERT INTO safeguarding_roles (
        club_id, user_id, role_type, qualifications, dbs_number, dbs_expiry, assigned_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [clubId, user_id, role_type, qualifications || null, dbs_number || null, dbs_expiry || null, req.user.id]
    )

    // Notify the assigned user
    if (isEmailEnabled()) {
      try {
        const userResult = await pool.query('SELECT email, name FROM users WHERE id = $1', [user_id])
        if (userResult.rows.length > 0) {
          const assignedUser = userResult.rows[0]
          const roleLabel = role_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          await sendNotificationEmail(assignedUser.email, {
            teamName: req.club.name,
            title: `Safeguarding Role Assigned: ${roleLabel}`,
            message: `You have been assigned the role of ${roleLabel} at ${req.club.name}. This is an important responsibility for the welfare of all members.`,
          })
        }
      } catch (emailErr) {
        console.error('Failed to send safeguarding role notification:', emailErr.message)
      }
    }

    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Remove a safeguarding role
router.delete('/:clubId/safeguarding/roles/:id', authenticateToken, loadClub, requireClubFeature('safeguarding'), requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId, id } = req.params

    const result = await pool.query(
      'DELETE FROM safeguarding_roles WHERE id = $1 AND club_id = $2 RETURNING *',
      [id, clubId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Safeguarding role not found' })
    }

    res.json({ message: 'Safeguarding role removed' })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// INCIDENT REPORTING
// ==========================================

// List incidents (welfare officers + owners only)
router.get('/:clubId/safeguarding/incidents', authenticateToken, loadClub, requireClubFeature('safeguarding'), requireClubRole('owner', 'admin', 'treasurer', 'secretary', 'coach'), requireSafeguardingAccess, async (req, res, next) => {
  try {
    const { clubId } = req.params
    const { status, severity } = req.query

    let query = `
      SELECT si.id, si.incident_date, si.severity, si.status, si.category,
             si.reported_by, si.created_at, si.updated_at,
             u.name as reported_by_name
      FROM safeguarding_incidents si
      LEFT JOIN users u ON si.reported_by = u.id
      WHERE si.club_id = $1
    `
    const params = [clubId]
    let paramIdx = 2

    if (status) {
      query += ` AND si.status = $${paramIdx}`
      params.push(status)
      paramIdx++
    }

    if (severity) {
      query += ` AND si.severity = $${paramIdx}`
      params.push(severity)
      paramIdx++
    }

    query += ' ORDER BY si.created_at DESC'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Report an incident (any club member can report)
router.post('/:clubId/safeguarding/incidents', authenticateToken, loadClub, requireClubFeature('safeguarding'), requireClubRole('owner', 'admin', 'treasurer', 'secretary', 'coach'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const {
      incident_date, description, severity, category,
      involved_parties, location, immediate_action_taken,
    } = req.body

    if (!description) {
      return res.status(400).json({ error: 'Description is required' })
    }

    const validSeverities = ['low', 'medium', 'high', 'critical']
    if (severity && !validSeverities.includes(severity)) {
      return res.status(400).json({ error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` })
    }

    const initialAccessLog = [
      {
        user_id: req.user.id,
        action: 'created',
        at: new Date().toISOString(),
      },
    ]

    const result = await pool.query(
      `INSERT INTO safeguarding_incidents (
        club_id, reported_by, incident_date, description, severity, category,
        involved_parties, location, immediate_action_taken,
        status, access_log
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open',$10)
      RETURNING *`,
      [
        clubId, req.user.id, incident_date || new Date(),
        description, severity || 'medium', category || 'general',
        involved_parties ? JSON.stringify(involved_parties) : null,
        location || null, immediate_action_taken || null,
        JSON.stringify(initialAccessLog),
      ]
    )

    // Notify welfare officers about the new incident
    if (isEmailEnabled()) {
      try {
        const welfareOfficers = await pool.query(
          `SELECT u.email, u.name FROM safeguarding_roles sr
           JOIN users u ON sr.user_id = u.id
           WHERE sr.club_id = $1 AND sr.role_type = 'welfare_officer'`,
          [clubId]
        )

        for (const officer of welfareOfficers.rows) {
          await sendNotificationEmail(officer.email, {
            teamName: req.club.name,
            title: 'New Safeguarding Incident Reported',
            message: `A new safeguarding incident (severity: ${severity || 'medium'}) has been reported at ${req.club.name}. Please review it as soon as possible.`,
          })
        }

        // Also notify club owner
        const owners = await pool.query(
          `SELECT u.email FROM club_members cm
           JOIN users u ON cm.user_id = u.id
           WHERE cm.club_id = $1 AND cm.role = 'owner' AND cm.status = 'active'`,
          [clubId]
        )

        for (const owner of owners.rows) {
          await sendNotificationEmail(owner.email, {
            teamName: req.club.name,
            title: 'New Safeguarding Incident Reported',
            message: `A new safeguarding incident (severity: ${severity || 'medium'}) has been reported at ${req.club.name}. Please review it as soon as possible.`,
          })
        }
      } catch (emailErr) {
        console.error('Failed to send incident notification:', emailErr.message)
      }
    }

    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// View a single incident (logs audit trail)
router.get('/:clubId/safeguarding/incidents/:id', authenticateToken, loadClub, requireClubFeature('safeguarding'), requireClubRole('owner', 'admin', 'treasurer', 'secretary', 'coach'), requireSafeguardingAccess, async (req, res, next) => {
  try {
    const { clubId, id } = req.params

    const result = await pool.query(
      `SELECT si.*, u.name as reported_by_name
       FROM safeguarding_incidents si
       LEFT JOIN users u ON si.reported_by = u.id
       WHERE si.id = $1 AND si.club_id = $2`,
      [id, clubId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' })
    }

    // Append "viewed" entry to access_log
    const viewEntry = {
      user_id: req.user.id,
      action: 'viewed',
      at: new Date().toISOString(),
    }

    await pool.query(
      `UPDATE safeguarding_incidents
       SET access_log = COALESCE(access_log, '[]'::jsonb) || $1::jsonb
       WHERE id = $2 AND club_id = $3`,
      [JSON.stringify(viewEntry), id, clubId]
    )

    // Return the incident with the updated access log
    const incident = result.rows[0]
    const currentLog = incident.access_log || []
    currentLog.push(viewEntry)
    incident.access_log = currentLog

    res.json(incident)
  } catch (error) {
    next(error)
  }
})

// Update an incident
router.put('/:clubId/safeguarding/incidents/:id', authenticateToken, loadClub, requireClubFeature('safeguarding'), requireClubRole('owner', 'admin', 'treasurer', 'secretary', 'coach'), requireSafeguardingAccess, async (req, res, next) => {
  try {
    const { clubId, id } = req.params
    const {
      description, severity, status, category,
      involved_parties, location, immediate_action_taken,
      resolution_notes, resolved_by,
    } = req.body

    // Verify incident exists
    const existing = await pool.query(
      'SELECT id FROM safeguarding_incidents WHERE id = $1 AND club_id = $2',
      [id, clubId]
    )

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' })
    }

    // Build the edit log entry
    const editEntry = {
      user_id: req.user.id,
      action: 'edited',
      at: new Date().toISOString(),
    }

    const result = await pool.query(
      `UPDATE safeguarding_incidents SET
        description = COALESCE($1, description),
        severity = COALESCE($2, severity),
        status = COALESCE($3, status),
        category = COALESCE($4, category),
        involved_parties = COALESCE($5, involved_parties),
        location = COALESCE($6, location),
        immediate_action_taken = COALESCE($7, immediate_action_taken),
        resolution_notes = COALESCE($8, resolution_notes),
        resolved_by = COALESCE($9, resolved_by),
        access_log = COALESCE(access_log, '[]'::jsonb) || $10::jsonb,
        updated_at = NOW()
      WHERE id = $11 AND club_id = $12
      RETURNING *`,
      [
        description, severity, status, category,
        involved_parties ? JSON.stringify(involved_parties) : null,
        location, immediate_action_taken,
        resolution_notes, resolved_by,
        JSON.stringify(editEntry), id, clubId,
      ]
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// ==========================================
// COMPLIANCE ALERTS
// ==========================================

// List active alerts
router.get('/:clubId/compliance/alerts', authenticateToken, loadClub, requireClubFeature('safeguarding'), requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const { status } = req.query

    let query = `
      SELECT ca.*, u.name as target_user_name
      FROM compliance_alerts ca
      LEFT JOIN users u ON ca.target_user_id = u.id
      WHERE ca.club_id = $1
    `
    const params = [clubId]
    let paramIdx = 2

    if (status) {
      query += ` AND ca.status = $${paramIdx}`
      params.push(status)
      paramIdx++
    } else {
      query += ` AND ca.status = 'active'`
    }

    query += ' ORDER BY ca.severity DESC, ca.created_at DESC'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Acknowledge or resolve an alert
router.put('/:clubId/compliance/alerts/:id', authenticateToken, loadClub, requireClubFeature('safeguarding'), requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId, id } = req.params
    const { status, notes } = req.body

    const validStatuses = ['acknowledged', 'resolved', 'dismissed']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` })
    }

    const result = await pool.query(
      `UPDATE compliance_alerts SET
        status = COALESCE($1, status),
        notes = COALESCE($2, notes),
        acknowledged_by = $3,
        acknowledged_at = NOW(),
        updated_at = NOW()
      WHERE id = $4 AND club_id = $5
      RETURNING *`,
      [status, notes, req.user.id, id, clubId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Manually trigger alert generation scan
router.post('/:clubId/compliance/alerts/generate', authenticateToken, loadClub, requireClubFeature('safeguarding'), requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const alertsCreated = []

    // Helper: create alert only if one doesn't already exist for this type + target
    async function createAlertIfNew(alertType, targetUserId, message, severity) {
      const existingQuery = targetUserId
        ? `SELECT id FROM compliance_alerts WHERE club_id = $1 AND alert_type = $2 AND target_user_id = $3 AND status = 'active'`
        : `SELECT id FROM compliance_alerts WHERE club_id = $1 AND alert_type = $2 AND target_user_id IS NULL AND status = 'active'`

      const existingParams = targetUserId
        ? [clubId, alertType, targetUserId]
        : [clubId, alertType]

      const existing = await pool.query(existingQuery, existingParams)
      if (existing.rows.length > 0) return null

      const insertResult = await pool.query(
        `INSERT INTO compliance_alerts (club_id, alert_type, target_user_id, message, severity, status)
         VALUES ($1,$2,$3,$4,$5,'active')
         RETURNING *`,
        [clubId, alertType, targetUserId || null, message, severity || 'medium']
      )

      return insertResult.rows[0]
    }

    // 1. DBS expiring within 30 days
    const dbsExpiring = await pool.query(
      `SELECT cr.user_id, u.name FROM compliance_records cr
       LEFT JOIN users u ON cr.user_id = u.id
       WHERE cr.club_id = $1 AND cr.record_type = 'dbs'
         AND cr.expiry_date > $2 AND cr.expiry_date <= $3`,
      [clubId, now, thirtyDaysFromNow]
    )
    for (const row of dbsExpiring.rows) {
      const alert = await createAlertIfNew(
        'dbs_expiring', row.user_id,
        `DBS check for ${row.name || 'Unknown'} is expiring within 30 days`,
        'medium'
      )
      if (alert) alertsCreated.push(alert)
    }

    // 2. DBS already expired
    const dbsExpired = await pool.query(
      `SELECT cr.user_id, u.name FROM compliance_records cr
       LEFT JOIN users u ON cr.user_id = u.id
       WHERE cr.club_id = $1 AND cr.record_type = 'dbs'
         AND cr.expiry_date <= $2`,
      [clubId, now]
    )
    for (const row of dbsExpired.rows) {
      const alert = await createAlertIfNew(
        'dbs_expired', row.user_id,
        `DBS check for ${row.name || 'Unknown'} has expired`,
        'high'
      )
      if (alert) alertsCreated.push(alert)
    }

    // 3. First aid expiring within 30 days
    const firstAidExpiring = await pool.query(
      `SELECT cr.user_id, u.name FROM compliance_records cr
       LEFT JOIN users u ON cr.user_id = u.id
       WHERE cr.club_id = $1 AND cr.record_type = 'first_aid'
         AND cr.expiry_date > $2 AND cr.expiry_date <= $3`,
      [clubId, now, thirtyDaysFromNow]
    )
    for (const row of firstAidExpiring.rows) {
      const alert = await createAlertIfNew(
        'first_aid_expiring', row.user_id,
        `First aid certification for ${row.name || 'Unknown'} is expiring within 30 days`,
        'medium'
      )
      if (alert) alertsCreated.push(alert)
    }

    // 4. Safeguarding training expiring within 30 days
    const trainingExpiring = await pool.query(
      `SELECT cr.user_id, u.name FROM compliance_records cr
       LEFT JOIN users u ON cr.user_id = u.id
       WHERE cr.club_id = $1 AND cr.record_type = 'safeguarding_training'
         AND cr.expiry_date > $2 AND cr.expiry_date <= $3`,
      [clubId, now, thirtyDaysFromNow]
    )
    for (const row of trainingExpiring.rows) {
      const alert = await createAlertIfNew(
        'safeguarding_training_expiring', row.user_id,
        `Safeguarding training for ${row.name || 'Unknown'} is expiring within 30 days`,
        'medium'
      )
      if (alert) alertsCreated.push(alert)
    }

    // 5. No welfare officer assigned
    const welfareCheck = await pool.query(
      `SELECT COUNT(*) FROM safeguarding_roles
       WHERE club_id = $1 AND role_type = 'welfare_officer'`,
      [clubId]
    )
    if (parseInt(welfareCheck.rows[0].count) === 0) {
      const alert = await createAlertIfNew(
        'no_welfare_officer', null,
        'No welfare officer is assigned to this club. This is a mandatory safeguarding requirement.',
        'high'
      )
      if (alert) alertsCreated.push(alert)
    }

    // 6. Coaches/managers without DBS on file
    const membersWithoutDbs = await pool.query(
      `SELECT cm.user_id, u.name FROM club_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.club_id = $1 AND cm.role IN ('coach', 'owner', 'admin') AND cm.status = 'active'
         AND cm.user_id NOT IN (
           SELECT cr.user_id FROM compliance_records cr
           WHERE cr.club_id = $1 AND cr.record_type = 'dbs'
         )`,
      [clubId]
    )
    for (const row of membersWithoutDbs.rows) {
      const alert = await createAlertIfNew(
        'no_dbs_on_file', row.user_id,
        `${row.name || 'Unknown'} does not have a DBS check on file`,
        'high'
      )
      if (alert) alertsCreated.push(alert)
    }

    res.json({
      message: 'Alert scan completed',
      alerts_created: alertsCreated.length,
      alerts: alertsCreated,
    })
  } catch (error) {
    next(error)
  }
})

export default router
