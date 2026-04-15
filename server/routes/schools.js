import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import rateLimit from 'express-rate-limit'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { loadSchool, loadSchoolBySlug, requireSchoolRole, ROLE_PERMISSIONS } from '../middleware/schoolAuth.js'
import { sendNotificationEmail } from '../services/emailService.js'
import { getFrontendUrl } from '../utils/urlUtils.js'
import { uploadFile } from '../services/storageService.js'

// Rate limiter for public registration submissions
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration submissions, please try again later' },
})

const router = Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ==========================================
// MULTER CONFIG FOR REGISTRATION UPLOADS
// ==========================================

const registrationUploadsDir = path.join(__dirname, '../uploads/schools')

const registrationStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const schoolId = req.school?.id || 'unknown'
    const dir = path.join(registrationUploadsDir, schoolId, 'registrations')
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

const registrationUpload = multer({
  storage: registrationStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|pdf|heic|webp)$/i
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true)
    } else {
      cb(new Error('Only image and PDF files are allowed'))
    }
  },
})

// Helper: generate URL-safe slug
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// ==========================================
// CLUB CRUD
// ==========================================

// Create school
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const {
      name, contact_email, contact_phone, website,
      address_line1, address_line2, city, county, postcode,
      fa_affiliation_number, league, charter_standard,
      primary_color, secondary_color,
      season_start_month, season_end_month,
      dpa_accepted,
    } = req.body

    if (!name) {
      return res.status(400).json({ error: 'School name is required' })
    }

    if (!dpa_accepted) {
      return res.status(400).json({ error: 'You must accept the Data Processing Agreement to create a school' })
    }

    // Generate unique slug
    let slug = slugify(name)
    const existing = await pool.query('SELECT id FROM schools WHERE slug = $1', [slug])
    if (existing.rows.length > 0) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    const result = await pool.query(
      `INSERT INTO schools (
        name, slug, contact_email, contact_phone, website,
        address_line1, address_line2, city, county, postcode,
        fa_affiliation_number, league, charter_standard,
        primary_color, secondary_color,
        season_start_month, season_end_month
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *`,
      [
        name, slug, contact_email || req.user.email, contact_phone, website,
        address_line1, address_line2, city, county, postcode,
        fa_affiliation_number, league, charter_standard,
        primary_color || '#1a365d', secondary_color || '#38a169',
        season_start_month || 9, season_end_month || 6,
      ]
    )

    const school = result.rows[0]

    // Add creator as owner
    const perms = ROLE_PERMISSIONS.owner
    await pool.query(
      `INSERT INTO school_members (school_id, user_id, role, can_manage_payments, can_manage_players, can_view_financials, can_invite_members, joined_at)
       VALUES ($1, $2, 'owner', $3, $4, $5, $6, NOW())`,
      [school.id, req.user.id, perms.can_manage_payments, perms.can_manage_players, perms.can_view_financials, perms.can_invite_members]
    )

    // Record DPA acceptance
    try {
      await pool.query(
        `UPDATE schools SET dpa_accepted_at = NOW(), dpa_accepted_by = $1, dpa_version = '1.0' WHERE id = $2`,
        [req.user.id, school.id]
      )
      const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip
      await pool.query(
        `INSERT INTO consent_records (user_id, email, consent_type, consent_version, consented, ip_address, user_agent, source)
         VALUES ($1, $2, 'data_processing_agreement', '1.0', true, $3, $4, 'club_creation')`,
        [req.user.id, req.user.email, ipAddress, req.headers['user-agent'] || null]
      )
    } catch { /* consent tables may not exist yet */ }

    res.status(201).json(school)
  } catch (error) {
    next(error)
  }
})

// Get school by slug (public info for registration page)
router.get('/by-slug/:slug', loadSchoolBySlug, (req, res) => {
  const school = req.school
  // Return only public-safe fields
  res.json({
    id: school.id,
    name: school.name,
    slug: school.slug,
    logo_url: school.logo_url,
    primary_color: school.primary_color,
    secondary_color: school.secondary_color,
    league: school.league,
    charter_standard: school.charter_standard,
  })
})

// Get school details (authenticated)
router.get('/:schoolId', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin', 'treasurer', 'secretary', 'coach'), async (req, res) => {
  res.json(req.school)
})

// Update school
router.put('/:schoolId', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { schoolId } = req.params
    const {
      name, contact_email, contact_phone, website,
      address_line1, address_line2, city, county, postcode,
      fa_affiliation_number, league, charter_standard,
      primary_color, secondary_color, logo_url,
      season_start_month, season_end_month, settings,
    } = req.body

    const result = await pool.query(
      `UPDATE schools SET
        name = COALESCE($1, name),
        contact_email = COALESCE($2, contact_email),
        contact_phone = COALESCE($3, contact_phone),
        website = COALESCE($4, website),
        address_line1 = COALESCE($5, address_line1),
        address_line2 = COALESCE($6, address_line2),
        city = COALESCE($7, city),
        county = COALESCE($8, county),
        postcode = COALESCE($9, postcode),
        fa_affiliation_number = COALESCE($10, fa_affiliation_number),
        league = COALESCE($11, league),
        charter_standard = COALESCE($12, charter_standard),
        primary_color = COALESCE($13, primary_color),
        secondary_color = COALESCE($14, secondary_color),
        logo_url = COALESCE($15, logo_url),
        season_start_month = COALESCE($16, season_start_month),
        season_end_month = COALESCE($17, season_end_month),
        settings = COALESCE($18, settings),
        updated_at = NOW()
      WHERE id = $19 RETURNING *`,
      [
        name, contact_email, contact_phone, website,
        address_line1, address_line2, city, county, postcode,
        fa_affiliation_number, league, charter_standard,
        primary_color, secondary_color, logo_url,
        season_start_month, season_end_month, settings ? JSON.stringify(settings) : null,
        schoolId,
      ]
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// School dashboard stats
router.get('/:schoolId/dashboard', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin', 'treasurer', 'secretary', 'coach'), async (req, res, next) => {
  try {
    const { schoolId } = req.params

    // Run stats queries in parallel
    const [teamsResult, playersResult, guardiansResult, membersResult, pendingResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM teams WHERE school_id = $1', [schoolId]),
      pool.query('SELECT COUNT(*) FROM pupils p JOIN teams t ON p.team_id = t.id WHERE t.school_id = $1 AND p.is_active = true', [schoolId]),
      pool.query('SELECT COUNT(*) FROM guardians WHERE school_id = $1', [schoolId]),
      pool.query('SELECT COUNT(*) FROM school_members WHERE school_id = $1 AND status = $2', [schoolId, 'active']),
      pool.query("SELECT COUNT(*) FROM pupils p JOIN teams t ON p.team_id = t.id WHERE t.school_id = $1 AND p.registration_status = 'pending'", [schoolId]),
    ])

    // Recent registrations
    const recentRegs = await pool.query(
      `SELECT p.id, p.name, p.registration_status, p.created_at, t.name as team_name
       FROM pupils p JOIN teams t ON p.team_id = t.id
       WHERE t.school_id = $1
       ORDER BY p.created_at DESC LIMIT 10`,
      [schoolId]
    )

    // Teams overview
    const teams = await pool.query(
      `SELECT t.id, t.name, t.age_group, t.team_type, t.team_format,
              COUNT(p.id) as player_count
       FROM teams t
       LEFT JOIN pupils p ON p.team_id = t.id AND p.is_active = true
       WHERE t.school_id = $1
       GROUP BY t.id
       ORDER BY t.age_group, t.name`,
      [schoolId]
    )

    res.json({
      stats: {
        total_teams: parseInt(teamsResult.rows[0].count),
        total_players: parseInt(playersResult.rows[0].count),
        total_guardians: parseInt(guardiansResult.rows[0].count),
        total_members: parseInt(membersResult.rows[0].count),
        pending_registrations: parseInt(pendingResult.rows[0].count),
      },
      recent_registrations: recentRegs.rows,
      teams: teams.rows,
      school: req.school,
    })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// CLUB MEMBERS & ROLES
// ==========================================

// List all school members
router.get('/:schoolId/members', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin', 'secretary', 'coach'), async (req, res, next) => {
  try {
    const { schoolId } = req.params
    const result = await pool.query(
      `SELECT cm.*, u.name, u.email
       FROM school_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.school_id = $1
       ORDER BY
         CASE cm.role
           WHEN 'owner' THEN 1
           WHEN 'admin' THEN 2
           WHEN 'treasurer' THEN 3
           WHEN 'secretary' THEN 4
           WHEN 'coach' THEN 5
           WHEN 'parent' THEN 6
         END, u.name`,
      [schoolId]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Invite member to school
router.post('/:schoolId/members/invite', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { schoolId } = req.params
    const { email, role, name } = req.body

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' })
    }

    const validRoles = ['admin', 'treasurer', 'secretary', 'coach']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` })
    }

    // Check if user exists
    let userResult = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email.toLowerCase()])
    let userId = userResult.rows[0]?.id

    if (!userId) {
      // Create a placeholder user that will be completed when they accept
      const pwHash = '$2b$10$placeholder_not_a_real_hash_will_be_set_on_accept'
      userResult = await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [name || email.split('@')[0], email.toLowerCase(), pwHash, 'manager']
      )
      userId = userResult.rows[0].id
    }

    // Check existing membership
    const existingMember = await pool.query(
      'SELECT id FROM school_members WHERE school_id = $1 AND user_id = $2',
      [schoolId, userId]
    )

    if (existingMember.rows.length > 0) {
      return res.status(409).json({ error: 'User is already a member of this school' })
    }

    // Create membership
    const perms = ROLE_PERMISSIONS[role] || {}
    const result = await pool.query(
      `INSERT INTO school_members (school_id, user_id, role, can_manage_payments, can_manage_players, can_view_financials, can_invite_members, status, invited_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'invited', NOW())
       RETURNING *`,
      [schoolId, userId, role, perms.can_manage_payments || false, perms.can_manage_players || false, perms.can_view_financials || false, perms.can_invite_members || false]
    )

    // Send invite email
    try {
      const school = req.school
      await sendNotificationEmail(email, {
        teamName: school.name,
        title: `You've been invited to ${school.name}`,
        message: `You've been invited to join ${school.name} as a ${role}. Log in to Touchline to access your school dashboard.`,
        actionLink: `${getFrontendUrl()}/login`,
        actionText: 'Log in to Touchline',
      })
    } catch (emailErr) {
      console.error('Failed to send school invite email:', emailErr)
    }

    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Update member role/permissions
router.put('/:schoolId/members/:memberId', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { schoolId, memberId } = req.params
    const { role, can_manage_payments, can_manage_players, can_view_financials, can_invite_members } = req.body

    // Can't change owner role unless you're the owner
    const member = await pool.query('SELECT * FROM school_members WHERE id = $1 AND school_id = $2', [memberId, schoolId])
    if (member.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' })
    }

    if (member.rows[0].role === 'owner' && req.clubRole !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can modify owner permissions' })
    }

    const result = await pool.query(
      `UPDATE school_members SET
        role = COALESCE($1, role),
        can_manage_payments = COALESCE($2, can_manage_payments),
        can_manage_players = COALESCE($3, can_manage_players),
        can_view_financials = COALESCE($4, can_view_financials),
        can_invite_members = COALESCE($5, can_invite_members),
        status = CASE WHEN status = 'invited' THEN 'active' ELSE status END
       WHERE id = $6 AND school_id = $7
       RETURNING *`,
      [role, can_manage_payments, can_manage_players, can_view_financials, can_invite_members, memberId, schoolId]
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Remove member
router.delete('/:schoolId/members/:memberId', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { schoolId, memberId } = req.params

    const member = await pool.query('SELECT * FROM school_members WHERE id = $1 AND school_id = $2', [memberId, schoolId])
    if (member.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' })
    }

    if (member.rows[0].role === 'owner') {
      return res.status(403).json({ error: 'Cannot remove the school owner' })
    }

    await pool.query('DELETE FROM school_members WHERE id = $1 AND school_id = $2', [memberId, schoolId])
    res.json({ message: 'Member removed' })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// TEAMS WITHIN A CLUB
// ==========================================

// List all teams in school
router.get('/:schoolId/teams', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin', 'treasurer', 'secretary', 'coach'), async (req, res, next) => {
  try {
    const { schoolId } = req.params
    const result = await pool.query(
      `SELECT t.*, COUNT(p.id) as player_count
       FROM teams t
       LEFT JOIN pupils p ON p.team_id = t.id AND p.is_active = true
       WHERE t.school_id = $1
       GROUP BY t.id
       ORDER BY t.age_group, t.name`,
      [schoolId]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Create team within school
router.post('/:schoolId/teams', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { schoolId } = req.params
    const { name, age_group, team_type, team_format } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' })
    }

    const result = await pool.query(
      `INSERT INTO teams (name, school_id, age_group, team_type, team_format, primary_color, secondary_color)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, schoolId, age_group, team_type || 'boys', team_format || 11, req.school.primary_color, req.school.secondary_color]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Link existing team to school
router.put('/:schoolId/teams/:teamId', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { schoolId, teamId } = req.params
    const { age_group, team_type } = req.body

    const result = await pool.query(
      `UPDATE teams SET school_id = $1, age_group = COALESCE($2, age_group), team_type = COALESCE($3, team_type)
       WHERE id = $4 RETURNING *`,
      [schoolId, age_group, team_type, teamId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// ==========================================
// GUARDIANS (Parent CRM)
// ==========================================

// List all guardians
router.get('/:schoolId/guardians', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin', 'secretary', 'coach'), async (req, res, next) => {
  try {
    const { schoolId } = req.params
    const { search } = req.query

    let query = `
      SELECT g.*,
        json_agg(
          json_build_object(
            'pupil_id', pg.pupil_id,
            'player_name', p.name,
            'team_name', t.name,
            'relationship', pg.relationship
          )
        ) FILTER (WHERE pg.pupil_id IS NOT NULL) as children
      FROM guardians g
      LEFT JOIN pupil_guardians pg ON pg.guardian_id = g.id
      LEFT JOIN pupils p ON p.id = pg.pupil_id
      LEFT JOIN teams t ON t.id = p.team_id
      WHERE g.school_id = $1
    `
    const params = [schoolId]

    if (search) {
      query += ` AND (g.first_name ILIKE $2 OR g.last_name ILIKE $2 OR g.email ILIKE $2)`
      params.push(`%${search}%`)
    }

    query += ` GROUP BY g.id ORDER BY g.last_name, g.first_name`

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Add guardian
router.post('/:schoolId/guardians', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { schoolId } = req.params
    const {
      first_name, last_name, email, phone,
      relationship, is_primary_contact, is_emergency_contact,
      address_line1, address_line2, city, county, postcode,
      photo_consent, data_consent, medical_consent,
      pupil_ids,
    } = req.body

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' })
    }

    const result = await pool.query(
      `INSERT INTO guardians (
        school_id, first_name, last_name, email, phone,
        relationship, is_primary_contact, is_emergency_contact,
        address_line1, address_line2, city, county, postcode,
        photo_consent, data_consent, medical_consent,
        consent_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *`,
      [
        schoolId, first_name, last_name, email.toLowerCase(), phone,
        relationship || 'parent', is_primary_contact !== false, is_emergency_contact !== false,
        address_line1, address_line2, city, county, postcode,
        photo_consent || false, data_consent || false, medical_consent || false,
        (photo_consent || data_consent || medical_consent) ? new Date() : null,
      ]
    )

    const guardian = result.rows[0]

    // Link to pupils if specified
    if (pupil_ids && Array.isArray(pupil_ids)) {
      for (const pupilId of pupil_ids) {
        await pool.query(
          'INSERT INTO pupil_guardians (pupil_id, guardian_id, relationship) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [pupilId, guardian.id, relationship || 'parent']
        )
      }
    }

    res.status(201).json(guardian)
  } catch (error) {
    next(error)
  }
})

// Get guardian with their children
router.get('/:schoolId/guardians/:guardianId', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin', 'secretary', 'coach'), async (req, res, next) => {
  try {
    const { schoolId, guardianId } = req.params

    const guardian = await pool.query('SELECT * FROM guardians WHERE id = $1 AND school_id = $2', [guardianId, schoolId])
    if (guardian.rows.length === 0) {
      return res.status(404).json({ error: 'Guardian not found' })
    }

    const children = await pool.query(
      `SELECT p.*, t.name as team_name, pg.relationship, pg.is_primary
       FROM pupil_guardians pg
       JOIN pupils p ON p.id = pg.pupil_id
       LEFT JOIN teams t ON t.id = p.team_id
       WHERE pg.guardian_id = $1
       ORDER BY p.name`,
      [guardianId]
    )

    res.json({
      ...guardian.rows[0],
      children: children.rows,
    })
  } catch (error) {
    next(error)
  }
})

// Update guardian
router.put('/:schoolId/guardians/:guardianId', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { schoolId, guardianId } = req.params
    const {
      first_name, last_name, email, phone,
      relationship, is_primary_contact, is_emergency_contact,
      address_line1, address_line2, city, county, postcode,
      photo_consent, data_consent, medical_consent,
    } = req.body

    const result = await pool.query(
      `UPDATE guardians SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        relationship = COALESCE($5, relationship),
        is_primary_contact = COALESCE($6, is_primary_contact),
        is_emergency_contact = COALESCE($7, is_emergency_contact),
        address_line1 = COALESCE($8, address_line1),
        address_line2 = COALESCE($9, address_line2),
        city = COALESCE($10, city),
        county = COALESCE($11, county),
        postcode = COALESCE($12, postcode),
        photo_consent = COALESCE($13, photo_consent),
        data_consent = COALESCE($14, data_consent),
        medical_consent = COALESCE($15, medical_consent),
        updated_at = NOW()
       WHERE id = $16 AND school_id = $17
       RETURNING *`,
      [
        first_name, last_name, email?.toLowerCase(), phone,
        relationship, is_primary_contact, is_emergency_contact,
        address_line1, address_line2, city, county, postcode,
        photo_consent, data_consent, medical_consent,
        guardianId, schoolId,
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Guardian not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Delete guardian
router.delete('/:schoolId/guardians/:guardianId', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { schoolId, guardianId } = req.params

    const result = await pool.query('DELETE FROM guardians WHERE id = $1 AND school_id = $2 RETURNING id', [guardianId, schoolId])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Guardian not found' })
    }

    res.json({ message: 'Guardian removed' })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// PUPIL DIRECTORY (cross-team)
// ==========================================

router.get('/:schoolId/pupils', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin', 'secretary', 'coach'), async (req, res, next) => {
  try {
    const { schoolId } = req.params
    const { search, team_id, registration_status } = req.query

    let query = `
      SELECT p.*, t.name as team_name, t.age_group,
        json_agg(
          json_build_object(
            'guardian_id', g.id,
            'name', g.first_name || ' ' || g.last_name,
            'email', g.email,
            'phone', g.phone,
            'relationship', pg.relationship
          )
        ) FILTER (WHERE g.id IS NOT NULL) as guardians
      FROM pupils p
      JOIN teams t ON p.team_id = t.id
      LEFT JOIN pupil_guardians pg ON pg.pupil_id = p.id
      LEFT JOIN guardians g ON g.id = pg.guardian_id
      WHERE t.school_id = $1
    `
    const params = [schoolId]
    let paramIdx = 2

    if (search) {
      query += ` AND p.name ILIKE $${paramIdx}`
      params.push(`%${search}%`)
      paramIdx++
    }

    if (team_id) {
      query += ` AND p.team_id = $${paramIdx}`
      params.push(team_id)
      paramIdx++
    }

    if (registration_status) {
      query += ` AND p.registration_status = $${paramIdx}`
      params.push(registration_status)
      paramIdx++
    }

    query += ` GROUP BY p.id, t.name, t.age_group ORDER BY t.age_group, p.name`

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// ==========================================
// PUBLIC REGISTRATION
// ==========================================

// Public: get school info + available teams for registration form
router.get('/by-slug/:slug/register', loadSchoolBySlug, async (req, res, next) => {
  try {
    const school = req.school
    const teams = await pool.query(
      `SELECT id, name, age_group, team_type, team_format
       FROM teams WHERE school_id = $1
       ORDER BY age_group, name`,
      [school.id]
    )

    // Try to fetch payment plans with term columns; fall back if columns don't exist yet
    let paymentPlans = { rows: [] }
    try {
      paymentPlans = await pool.query(
        `SELECT id, name, description, amount, currency, interval, interval_count,
                plan_type, term_start, term_end, team_ids, applies_to_all_teams
         FROM payment_plans
         WHERE school_id = $1 AND is_active = true AND available_for_registration = true
         ORDER BY amount ASC`,
        [school.id]
      )
    } catch {
      // available_for_registration column may not exist yet — return no plans
    }

    res.json({
      school: {
        id: school.id,
        name: school.name,
        slug: school.slug,
        logo_url: school.logo_url,
        primary_color: school.primary_color,
        secondary_color: school.secondary_color,
      },
      teams: teams.rows,
      paymentPlans: paymentPlans.rows,
    })
  } catch (error) {
    next(error)
  }
})

// Public: submit registration (with optional file uploads)
router.post('/by-slug/:slug/register', registrationLimiter, loadSchoolBySlug, registrationUpload.fields([
  { name: 'player_photo_0', maxCount: 1 }, { name: 'player_photo_1', maxCount: 1 },
  { name: 'player_photo_2', maxCount: 1 }, { name: 'player_photo_3', maxCount: 1 },
  { name: 'pupil_id_doc_0', maxCount: 1 }, { name: 'pupil_id_doc_1', maxCount: 1 },
  { name: 'pupil_id_doc_2', maxCount: 1 }, { name: 'pupil_id_doc_3', maxCount: 1 },
]), async (req, res, next) => {
  try {
    const school = req.school
    const {
      // Guardian info
      guardian_first_name, guardian_last_name, guardian_email, guardian_phone,
      guardian_address_line1, guardian_address_line2, guardian_city, guardian_county, guardian_postcode,
      guardian_relationship,
      // Consents
      photo_consent, data_consent, medical_consent,
      // Payment plan selection
      payment_plan_id,
    } = req.body

    // Players come as JSON string when using multipart form
    let playersList = req.body.pupils
    if (typeof playersList === 'string') {
      try { playersList = JSON.parse(playersList) } catch { playersList = [] }
    }

    if (!guardian_first_name || !guardian_last_name || !guardian_email) {
      return res.status(400).json({ error: 'Guardian name and email are required' })
    }

    if (!guardian_address_line1 || !guardian_city || !guardian_postcode) {
      return res.status(400).json({ error: 'Guardian address, city and postcode are required' })
    }

    if (!playersList || !Array.isArray(playersList) || playersList.length === 0) {
      return res.status(400).json({ error: 'At least one pupil is required' })
    }

    // Create guardian
    const guardianResult = await pool.query(
      `INSERT INTO guardians (
        school_id, first_name, last_name, email, phone,
        relationship, address_line1, address_line2, city, county, postcode,
        photo_consent, data_consent, medical_consent, consent_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
      RETURNING *`,
      [
        school.id, guardian_first_name, guardian_last_name, guardian_email.toLowerCase(), guardian_phone,
        guardian_relationship || 'parent',
        guardian_address_line1, guardian_address_line2, guardian_city, guardian_county, guardian_postcode,
        photo_consent === 'true' || photo_consent === true || false,
        data_consent === 'true' || data_consent === true || false,
        medical_consent === 'true' || medical_consent === true || false,
      ]
    )

    const guardian = guardianResult.rows[0]

    // Record consent audit trail
    const consentTypes = [
      { type: 'data_processing', consented: data_consent === 'true' || data_consent === true },
      { type: 'photo_media', consented: photo_consent === 'true' || photo_consent === true },
      { type: 'medical_first_aid', consented: medical_consent === 'true' || medical_consent === true },
    ]
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip
    const userAgent = req.headers['user-agent'] || null
    for (const consent of consentTypes) {
      try {
        await pool.query(
          `INSERT INTO consent_records (guardian_id, email, consent_type, consent_version, consented, ip_address, user_agent, source)
           VALUES ($1, $2, $3, '1.0', $4, $5, $6, 'club_registration')`,
          [guardian.id, guardian.email, consent.type, consent.consented, ipAddress, userAgent]
        )
      } catch { /* consent table may not exist yet */ }
    }

    const createdPlayers = []

    // Create each pupil
    for (let i = 0; i < playersList.length; i++) {
      const playerData = playersList[i]
      const { name, date_of_birth, team_id, medical_info, allergies, medications, kit_size,
              emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
              id_document_type } = playerData

      if (!name || !team_id) continue

      // Get file URLs if uploaded
      const photoFile = req.files?.[`player_photo_${i}`]?.[0]
      const idDocFile = req.files?.[`pupil_id_doc_${i}`]?.[0]
      const photoUrl = photoFile ? await uploadFile(photoFile.path, `schools/${school.id}/registrations/${photoFile.filename}`, { contentType: photoFile.mimetype }) : null
      const idDocUrl = idDocFile ? await uploadFile(idDocFile.path, `schools/${school.id}/registrations/${idDocFile.filename}`, { contentType: idDocFile.mimetype }) : null

      const playerResult = await pool.query(
        `INSERT INTO pupils (
          name, team_id, date_of_birth, medical_info, allergies, medications, kit_size,
          emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
          photo_url, id_document_url, id_document_type,
          registration_status, registration_date, is_active
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending',NOW(),true)
        RETURNING *`,
        [
          name, team_id, date_of_birth || null,
          medical_info ? JSON.stringify(medical_info) : '{}', allergies || null, medications || null, kit_size || null,
          emergency_contact_name || null, emergency_contact_phone || null, emergency_contact_relationship || null,
          photoUrl, idDocUrl, id_document_type || null,
        ]
      )

      const pupil = playerResult.rows[0]
      createdPlayers.push(pupil)

      // Link guardian to pupil
      await pool.query(
        'INSERT INTO pupil_guardians (pupil_id, guardian_id, relationship) VALUES ($1, $2, $3)',
        [pupil.id, guardian.id, guardian_relationship || 'parent']
      )
    }

    // Auto-create subscriptions if a payment plan was selected
    const subscriptionTokens = []
    if (payment_plan_id) {
      const plan = await pool.query(
        'SELECT * FROM payment_plans WHERE id = $1 AND school_id = $2 AND is_active = true',
        [payment_plan_id, school.id]
      )
      if (plan.rows.length > 0) {
        for (const pupil of createdPlayers) {
          const portalToken = crypto.randomBytes(32).toString('hex')
          await pool.query(
            `INSERT INTO player_subscriptions (
              school_id, payment_plan_id, pupil_id, guardian_id,
              status, amount_due, portal_token
            ) VALUES ($1,$2,$3,$4,'pending',$5,$6)`,
            [school.id, payment_plan_id, pupil.id, guardian.id, plan.rows[0].amount, portalToken]
          )
          subscriptionTokens.push(portalToken)
        }
      }
    }

    // Send confirmation email to guardian (with payment link if applicable)
    try {
      const paymentLink = subscriptionTokens.length > 0
        ? `${getFrontendUrl()}/pay/${subscriptionTokens[0]}`
        : null

      await sendNotificationEmail(guardian.email, {
        teamName: school.name,
        title: 'Registration Received',
        message: paymentLink
          ? `Thank you for registering with ${school.name}. We've received your registration for ${createdPlayers.map(p => p.name).join(', ')}. Please complete your membership payment to finalise registration.`
          : `Thank you for registering with ${school.name}. We've received your registration for ${createdPlayers.map(p => p.name).join(', ')}. The school admin will review and approve your registration shortly.`,
        ...(paymentLink ? { actionLink: paymentLink, actionText: 'Complete Payment' } : {}),
      })
    } catch (emailErr) {
      console.error('Failed to send registration confirmation:', emailErr)
    }

    // Notify school admins
    try {
      const admins = await pool.query(
        `SELECT u.email FROM school_members cm JOIN users u ON cm.user_id = u.id
         WHERE cm.school_id = $1 AND cm.role IN ('owner', 'admin', 'secretary') AND cm.status = 'active'`,
        [school.id]
      )
      for (const admin of admins.rows) {
        await sendNotificationEmail(admin.email, {
          teamName: school.name,
          title: 'New Registration',
          message: `${guardian_first_name} ${guardian_last_name} has registered ${createdPlayers.length} pupil(s) for ${school.name}. Review and approve from your school dashboard.`,
          actionLink: `${getFrontendUrl()}/school/${school.slug}/registrations`,
          actionText: 'Review Registrations',
        })
      }
    } catch (emailErr) {
      console.error('Failed to send admin notification:', emailErr)
    }

    res.status(201).json({
      message: 'Registration submitted successfully',
      guardian: { id: guardian.id, first_name: guardian.first_name, last_name: guardian.last_name },
      pupils: createdPlayers.map(p => ({ id: p.id, name: p.name, registration_status: p.registration_status })),
      paymentToken: subscriptionTokens.length > 0 ? subscriptionTokens[0] : null,
    })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// REGISTRATION REVIEW (admin)
// ==========================================

// List pending registrations
router.get('/:schoolId/registrations', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { schoolId } = req.params
    const { status } = req.query

    const regStatus = status || 'pending'

    const result = await pool.query(
      `SELECT p.id, p.name, p.dob, p.registration_status, p.registration_date, p.medical_info, p.allergies, p.medications, p.kit_size,
              t.name as team_name, t.age_group,
              json_agg(
                json_build_object(
                  'guardian_id', g.id,
                  'name', g.first_name || ' ' || g.last_name,
                  'email', g.email,
                  'phone', g.phone,
                  'relationship', pg.relationship
                )
              ) FILTER (WHERE g.id IS NOT NULL) as guardians
       FROM pupils p
       JOIN teams t ON p.team_id = t.id
       LEFT JOIN pupil_guardians pg ON pg.pupil_id = p.id
       LEFT JOIN guardians g ON g.id = pg.guardian_id
       WHERE t.school_id = $1 AND p.registration_status = $2
       GROUP BY p.id, t.name, t.age_group
       ORDER BY p.registration_date DESC`,
      [schoolId, regStatus]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Approve/reject registration
router.put('/:schoolId/registrations/:pupilId', authenticateToken, loadSchool, requireSchoolRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { schoolId, pupilId } = req.params
    const { status } = req.body // 'registered' or 'rejected'

    if (!['registered', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "registered" or "rejected"' })
    }

    // Verify pupil belongs to this school
    const playerCheck = await pool.query(
      'SELECT p.*, t.name as team_name FROM pupils p JOIN teams t ON p.team_id = t.id WHERE p.id = $1 AND t.school_id = $2',
      [pupilId, schoolId]
    )

    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Pupil not found in this school' })
    }

    const result = await pool.query(
      'UPDATE pupils SET registration_status = $1 WHERE id = $2 RETURNING *',
      [status, pupilId]
    )

    // Notify guardian
    try {
      const guardians = await pool.query(
        `SELECT g.email, g.first_name FROM pupil_guardians pg
         JOIN guardians g ON g.id = pg.guardian_id
         WHERE pg.pupil_id = $1`,
        [pupilId]
      )

      const pupil = playerCheck.rows[0]
      for (const g of guardians.rows) {
        const title = status === 'registered'
          ? `Registration Approved - ${pupil.name}`
          : `Registration Update - ${pupil.name}`
        const message = status === 'registered'
          ? `Great news! ${pupil.name}'s registration with ${pupil.team_name} has been approved. They're now part of the squad!`
          : `${pupil.name}'s registration with ${pupil.team_name} was not approved at this time. Please contact the school for more details.`

        await sendNotificationEmail(g.email, { teamName: pupil.team_name, title, message })
      }
    } catch (emailErr) {
      console.error('Failed to send registration status email:', emailErr)
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// ==========================================
// MY CLUBS (for current user)
// ==========================================

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.*, cm.role as my_role
       FROM schools c
       JOIN school_members cm ON cm.school_id = c.id
       WHERE cm.user_id = $1 AND cm.status = 'active'
       ORDER BY c.name`,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

export default router
