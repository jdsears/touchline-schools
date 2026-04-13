import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import rateLimit from 'express-rate-limit'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { loadClub, loadClubBySlug, requireClubRole, ROLE_PERMISSIONS } from '../middleware/clubAuth.js'
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

const registrationUploadsDir = path.join(__dirname, '../uploads/clubs')

const registrationStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const clubId = req.club?.id || 'unknown'
    const dir = path.join(registrationUploadsDir, clubId, 'registrations')
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

// Create club
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
      return res.status(400).json({ error: 'Club name is required' })
    }

    if (!dpa_accepted) {
      return res.status(400).json({ error: 'You must accept the Data Processing Agreement to create a club' })
    }

    // Generate unique slug
    let slug = slugify(name)
    const existing = await pool.query('SELECT id FROM clubs WHERE slug = $1', [slug])
    if (existing.rows.length > 0) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    const result = await pool.query(
      `INSERT INTO clubs (
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

    const club = result.rows[0]

    // Add creator as owner
    const perms = ROLE_PERMISSIONS.owner
    await pool.query(
      `INSERT INTO club_members (club_id, user_id, role, can_manage_payments, can_manage_players, can_view_financials, can_invite_members, joined_at)
       VALUES ($1, $2, 'owner', $3, $4, $5, $6, NOW())`,
      [club.id, req.user.id, perms.can_manage_payments, perms.can_manage_players, perms.can_view_financials, perms.can_invite_members]
    )

    // Record DPA acceptance
    try {
      await pool.query(
        `UPDATE clubs SET dpa_accepted_at = NOW(), dpa_accepted_by = $1, dpa_version = '1.0' WHERE id = $2`,
        [req.user.id, club.id]
      )
      const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip
      await pool.query(
        `INSERT INTO consent_records (user_id, email, consent_type, consent_version, consented, ip_address, user_agent, source)
         VALUES ($1, $2, 'data_processing_agreement', '1.0', true, $3, $4, 'club_creation')`,
        [req.user.id, req.user.email, ipAddress, req.headers['user-agent'] || null]
      )
    } catch { /* consent tables may not exist yet */ }

    res.status(201).json(club)
  } catch (error) {
    next(error)
  }
})

// Get club by slug (public info for registration page)
router.get('/by-slug/:slug', loadClubBySlug, (req, res) => {
  const club = req.club
  // Return only public-safe fields
  res.json({
    id: club.id,
    name: club.name,
    slug: club.slug,
    logo_url: club.logo_url,
    primary_color: club.primary_color,
    secondary_color: club.secondary_color,
    league: club.league,
    charter_standard: club.charter_standard,
  })
})

// Get club details (authenticated)
router.get('/:clubId', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer', 'secretary', 'coach'), async (req, res) => {
  res.json(req.club)
})

// Update club
router.put('/:clubId', authenticateToken, loadClub, requireClubRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const {
      name, contact_email, contact_phone, website,
      address_line1, address_line2, city, county, postcode,
      fa_affiliation_number, league, charter_standard,
      primary_color, secondary_color, logo_url,
      season_start_month, season_end_month, settings,
    } = req.body

    const result = await pool.query(
      `UPDATE clubs SET
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
        clubId,
      ]
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Club dashboard stats
router.get('/:clubId/dashboard', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer', 'secretary', 'coach'), async (req, res, next) => {
  try {
    const { clubId } = req.params

    // Run stats queries in parallel
    const [teamsResult, playersResult, guardiansResult, membersResult, pendingResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM teams WHERE club_id = $1', [clubId]),
      pool.query('SELECT COUNT(*) FROM players p JOIN teams t ON p.team_id = t.id WHERE t.club_id = $1 AND p.is_active = true', [clubId]),
      pool.query('SELECT COUNT(*) FROM guardians WHERE club_id = $1', [clubId]),
      pool.query('SELECT COUNT(*) FROM club_members WHERE club_id = $1 AND status = $2', [clubId, 'active']),
      pool.query("SELECT COUNT(*) FROM players p JOIN teams t ON p.team_id = t.id WHERE t.club_id = $1 AND p.registration_status = 'pending'", [clubId]),
    ])

    // Recent registrations
    const recentRegs = await pool.query(
      `SELECT p.id, p.name, p.registration_status, p.created_at, t.name as team_name
       FROM players p JOIN teams t ON p.team_id = t.id
       WHERE t.club_id = $1
       ORDER BY p.created_at DESC LIMIT 10`,
      [clubId]
    )

    // Teams overview
    const teams = await pool.query(
      `SELECT t.id, t.name, t.age_group, t.team_type, t.team_format,
              COUNT(p.id) as player_count
       FROM teams t
       LEFT JOIN players p ON p.team_id = t.id AND p.is_active = true
       WHERE t.club_id = $1
       GROUP BY t.id
       ORDER BY t.age_group, t.name`,
      [clubId]
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
      club: req.club,
    })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// CLUB MEMBERS & ROLES
// ==========================================

// List all club members
router.get('/:clubId/members', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'secretary', 'coach'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const result = await pool.query(
      `SELECT cm.*, u.name, u.email
       FROM club_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.club_id = $1
       ORDER BY
         CASE cm.role
           WHEN 'owner' THEN 1
           WHEN 'admin' THEN 2
           WHEN 'treasurer' THEN 3
           WHEN 'secretary' THEN 4
           WHEN 'coach' THEN 5
           WHEN 'parent' THEN 6
         END, u.name`,
      [clubId]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Invite member to club
router.post('/:clubId/members/invite', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId } = req.params
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
      'SELECT id FROM club_members WHERE club_id = $1 AND user_id = $2',
      [clubId, userId]
    )

    if (existingMember.rows.length > 0) {
      return res.status(409).json({ error: 'User is already a member of this club' })
    }

    // Create membership
    const perms = ROLE_PERMISSIONS[role] || {}
    const result = await pool.query(
      `INSERT INTO club_members (club_id, user_id, role, can_manage_payments, can_manage_players, can_view_financials, can_invite_members, status, invited_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'invited', NOW())
       RETURNING *`,
      [clubId, userId, role, perms.can_manage_payments || false, perms.can_manage_players || false, perms.can_view_financials || false, perms.can_invite_members || false]
    )

    // Send invite email
    try {
      const club = req.club
      await sendNotificationEmail(email, {
        teamName: club.name,
        title: `You've been invited to ${club.name}`,
        message: `You've been invited to join ${club.name} as a ${role}. Log in to Touchline to access your club dashboard.`,
        actionLink: `${getFrontendUrl()}/login`,
        actionText: 'Log in to Touchline',
      })
    } catch (emailErr) {
      console.error('Failed to send club invite email:', emailErr)
    }

    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Update member role/permissions
router.put('/:clubId/members/:memberId', authenticateToken, loadClub, requireClubRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { clubId, memberId } = req.params
    const { role, can_manage_payments, can_manage_players, can_view_financials, can_invite_members } = req.body

    // Can't change owner role unless you're the owner
    const member = await pool.query('SELECT * FROM club_members WHERE id = $1 AND club_id = $2', [memberId, clubId])
    if (member.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' })
    }

    if (member.rows[0].role === 'owner' && req.clubRole !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can modify owner permissions' })
    }

    const result = await pool.query(
      `UPDATE club_members SET
        role = COALESCE($1, role),
        can_manage_payments = COALESCE($2, can_manage_payments),
        can_manage_players = COALESCE($3, can_manage_players),
        can_view_financials = COALESCE($4, can_view_financials),
        can_invite_members = COALESCE($5, can_invite_members),
        status = CASE WHEN status = 'invited' THEN 'active' ELSE status END
       WHERE id = $6 AND club_id = $7
       RETURNING *`,
      [role, can_manage_payments, can_manage_players, can_view_financials, can_invite_members, memberId, clubId]
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Remove member
router.delete('/:clubId/members/:memberId', authenticateToken, loadClub, requireClubRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { clubId, memberId } = req.params

    const member = await pool.query('SELECT * FROM club_members WHERE id = $1 AND club_id = $2', [memberId, clubId])
    if (member.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' })
    }

    if (member.rows[0].role === 'owner') {
      return res.status(403).json({ error: 'Cannot remove the club owner' })
    }

    await pool.query('DELETE FROM club_members WHERE id = $1 AND club_id = $2', [memberId, clubId])
    res.json({ message: 'Member removed' })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// TEAMS WITHIN A CLUB
// ==========================================

// List all teams in club
router.get('/:clubId/teams', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer', 'secretary', 'coach'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const result = await pool.query(
      `SELECT t.*, COUNT(p.id) as player_count
       FROM teams t
       LEFT JOIN players p ON p.team_id = t.id AND p.is_active = true
       WHERE t.club_id = $1
       GROUP BY t.id
       ORDER BY t.age_group, t.name`,
      [clubId]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Create team within club
router.post('/:clubId/teams', authenticateToken, loadClub, requireClubRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const { name, age_group, team_type, team_format } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' })
    }

    const result = await pool.query(
      `INSERT INTO teams (name, club_id, age_group, team_type, team_format, primary_color, secondary_color)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, clubId, age_group, team_type || 'boys', team_format || 11, req.club.primary_color, req.club.secondary_color]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Link existing team to club
router.put('/:clubId/teams/:teamId', authenticateToken, loadClub, requireClubRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { clubId, teamId } = req.params
    const { age_group, team_type } = req.body

    const result = await pool.query(
      `UPDATE teams SET club_id = $1, age_group = COALESCE($2, age_group), team_type = COALESCE($3, team_type)
       WHERE id = $4 RETURNING *`,
      [clubId, age_group, team_type, teamId]
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
router.get('/:clubId/guardians', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'secretary', 'coach'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const { search } = req.query

    let query = `
      SELECT g.*,
        json_agg(
          json_build_object(
            'player_id', pg.player_id,
            'player_name', p.name,
            'team_name', t.name,
            'relationship', pg.relationship
          )
        ) FILTER (WHERE pg.player_id IS NOT NULL) as children
      FROM guardians g
      LEFT JOIN player_guardians pg ON pg.guardian_id = g.id
      LEFT JOIN players p ON p.id = pg.player_id
      LEFT JOIN teams t ON t.id = p.team_id
      WHERE g.club_id = $1
    `
    const params = [clubId]

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
router.post('/:clubId/guardians', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const {
      first_name, last_name, email, phone,
      relationship, is_primary_contact, is_emergency_contact,
      address_line1, address_line2, city, county, postcode,
      photo_consent, data_consent, medical_consent,
      player_ids,
    } = req.body

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' })
    }

    const result = await pool.query(
      `INSERT INTO guardians (
        club_id, first_name, last_name, email, phone,
        relationship, is_primary_contact, is_emergency_contact,
        address_line1, address_line2, city, county, postcode,
        photo_consent, data_consent, medical_consent,
        consent_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *`,
      [
        clubId, first_name, last_name, email.toLowerCase(), phone,
        relationship || 'parent', is_primary_contact !== false, is_emergency_contact !== false,
        address_line1, address_line2, city, county, postcode,
        photo_consent || false, data_consent || false, medical_consent || false,
        (photo_consent || data_consent || medical_consent) ? new Date() : null,
      ]
    )

    const guardian = result.rows[0]

    // Link to players if specified
    if (player_ids && Array.isArray(player_ids)) {
      for (const playerId of player_ids) {
        await pool.query(
          'INSERT INTO player_guardians (player_id, guardian_id, relationship) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [playerId, guardian.id, relationship || 'parent']
        )
      }
    }

    res.status(201).json(guardian)
  } catch (error) {
    next(error)
  }
})

// Get guardian with their children
router.get('/:clubId/guardians/:guardianId', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'secretary', 'coach'), async (req, res, next) => {
  try {
    const { clubId, guardianId } = req.params

    const guardian = await pool.query('SELECT * FROM guardians WHERE id = $1 AND club_id = $2', [guardianId, clubId])
    if (guardian.rows.length === 0) {
      return res.status(404).json({ error: 'Guardian not found' })
    }

    const children = await pool.query(
      `SELECT p.*, t.name as team_name, pg.relationship, pg.is_primary
       FROM player_guardians pg
       JOIN players p ON p.id = pg.player_id
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
router.put('/:clubId/guardians/:guardianId', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId, guardianId } = req.params
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
       WHERE id = $16 AND club_id = $17
       RETURNING *`,
      [
        first_name, last_name, email?.toLowerCase(), phone,
        relationship, is_primary_contact, is_emergency_contact,
        address_line1, address_line2, city, county, postcode,
        photo_consent, data_consent, medical_consent,
        guardianId, clubId,
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
router.delete('/:clubId/guardians/:guardianId', authenticateToken, loadClub, requireClubRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { clubId, guardianId } = req.params

    const result = await pool.query('DELETE FROM guardians WHERE id = $1 AND club_id = $2 RETURNING id', [guardianId, clubId])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Guardian not found' })
    }

    res.json({ message: 'Guardian removed' })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// PLAYER DIRECTORY (cross-team)
// ==========================================

router.get('/:clubId/players', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'secretary', 'coach'), async (req, res, next) => {
  try {
    const { clubId } = req.params
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
      FROM players p
      JOIN teams t ON p.team_id = t.id
      LEFT JOIN player_guardians pg ON pg.player_id = p.id
      LEFT JOIN guardians g ON g.id = pg.guardian_id
      WHERE t.club_id = $1
    `
    const params = [clubId]
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

// Public: get club info + available teams for registration form
router.get('/by-slug/:slug/register', loadClubBySlug, async (req, res, next) => {
  try {
    const club = req.club
    const teams = await pool.query(
      `SELECT id, name, age_group, team_type, team_format
       FROM teams WHERE club_id = $1
       ORDER BY age_group, name`,
      [club.id]
    )

    // Try to fetch payment plans with term columns; fall back if columns don't exist yet
    let paymentPlans = { rows: [] }
    try {
      paymentPlans = await pool.query(
        `SELECT id, name, description, amount, currency, interval, interval_count,
                plan_type, term_start, term_end, team_ids, applies_to_all_teams
         FROM payment_plans
         WHERE club_id = $1 AND is_active = true AND available_for_registration = true
         ORDER BY amount ASC`,
        [club.id]
      )
    } catch {
      // available_for_registration column may not exist yet — return no plans
    }

    res.json({
      club: {
        id: club.id,
        name: club.name,
        slug: club.slug,
        logo_url: club.logo_url,
        primary_color: club.primary_color,
        secondary_color: club.secondary_color,
      },
      teams: teams.rows,
      paymentPlans: paymentPlans.rows,
    })
  } catch (error) {
    next(error)
  }
})

// Public: submit registration (with optional file uploads)
router.post('/by-slug/:slug/register', registrationLimiter, loadClubBySlug, registrationUpload.fields([
  { name: 'player_photo_0', maxCount: 1 }, { name: 'player_photo_1', maxCount: 1 },
  { name: 'player_photo_2', maxCount: 1 }, { name: 'player_photo_3', maxCount: 1 },
  { name: 'player_id_doc_0', maxCount: 1 }, { name: 'player_id_doc_1', maxCount: 1 },
  { name: 'player_id_doc_2', maxCount: 1 }, { name: 'player_id_doc_3', maxCount: 1 },
]), async (req, res, next) => {
  try {
    const club = req.club
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
    let playersList = req.body.players
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
      return res.status(400).json({ error: 'At least one player is required' })
    }

    // Create guardian
    const guardianResult = await pool.query(
      `INSERT INTO guardians (
        club_id, first_name, last_name, email, phone,
        relationship, address_line1, address_line2, city, county, postcode,
        photo_consent, data_consent, medical_consent, consent_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
      RETURNING *`,
      [
        club.id, guardian_first_name, guardian_last_name, guardian_email.toLowerCase(), guardian_phone,
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

    // Create each player
    for (let i = 0; i < playersList.length; i++) {
      const playerData = playersList[i]
      const { name, date_of_birth, team_id, medical_info, allergies, medications, kit_size,
              emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
              id_document_type } = playerData

      if (!name || !team_id) continue

      // Get file URLs if uploaded
      const photoFile = req.files?.[`player_photo_${i}`]?.[0]
      const idDocFile = req.files?.[`player_id_doc_${i}`]?.[0]
      const photoUrl = photoFile ? await uploadFile(photoFile.path, `clubs/${club.id}/registrations/${photoFile.filename}`, { contentType: photoFile.mimetype }) : null
      const idDocUrl = idDocFile ? await uploadFile(idDocFile.path, `clubs/${club.id}/registrations/${idDocFile.filename}`, { contentType: idDocFile.mimetype }) : null

      const playerResult = await pool.query(
        `INSERT INTO players (
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

      const player = playerResult.rows[0]
      createdPlayers.push(player)

      // Link guardian to player
      await pool.query(
        'INSERT INTO player_guardians (player_id, guardian_id, relationship) VALUES ($1, $2, $3)',
        [player.id, guardian.id, guardian_relationship || 'parent']
      )
    }

    // Auto-create subscriptions if a payment plan was selected
    const subscriptionTokens = []
    if (payment_plan_id) {
      const plan = await pool.query(
        'SELECT * FROM payment_plans WHERE id = $1 AND club_id = $2 AND is_active = true',
        [payment_plan_id, club.id]
      )
      if (plan.rows.length > 0) {
        for (const player of createdPlayers) {
          const portalToken = crypto.randomBytes(32).toString('hex')
          await pool.query(
            `INSERT INTO player_subscriptions (
              club_id, payment_plan_id, player_id, guardian_id,
              status, amount_due, portal_token
            ) VALUES ($1,$2,$3,$4,'pending',$5,$6)`,
            [club.id, payment_plan_id, player.id, guardian.id, plan.rows[0].amount, portalToken]
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
        teamName: club.name,
        title: 'Registration Received',
        message: paymentLink
          ? `Thank you for registering with ${club.name}. We've received your registration for ${createdPlayers.map(p => p.name).join(', ')}. Please complete your membership payment to finalise registration.`
          : `Thank you for registering with ${club.name}. We've received your registration for ${createdPlayers.map(p => p.name).join(', ')}. The club admin will review and approve your registration shortly.`,
        ...(paymentLink ? { actionLink: paymentLink, actionText: 'Complete Payment' } : {}),
      })
    } catch (emailErr) {
      console.error('Failed to send registration confirmation:', emailErr)
    }

    // Notify club admins
    try {
      const admins = await pool.query(
        `SELECT u.email FROM club_members cm JOIN users u ON cm.user_id = u.id
         WHERE cm.club_id = $1 AND cm.role IN ('owner', 'admin', 'secretary') AND cm.status = 'active'`,
        [club.id]
      )
      for (const admin of admins.rows) {
        await sendNotificationEmail(admin.email, {
          teamName: club.name,
          title: 'New Registration',
          message: `${guardian_first_name} ${guardian_last_name} has registered ${createdPlayers.length} player(s) for ${club.name}. Review and approve from your club dashboard.`,
          actionLink: `${getFrontendUrl()}/club/${club.slug}/registrations`,
          actionText: 'Review Registrations',
        })
      }
    } catch (emailErr) {
      console.error('Failed to send admin notification:', emailErr)
    }

    res.status(201).json({
      message: 'Registration submitted successfully',
      guardian: { id: guardian.id, first_name: guardian.first_name, last_name: guardian.last_name },
      players: createdPlayers.map(p => ({ id: p.id, name: p.name, registration_status: p.registration_status })),
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
router.get('/:clubId/registrations', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId } = req.params
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
       FROM players p
       JOIN teams t ON p.team_id = t.id
       LEFT JOIN player_guardians pg ON pg.player_id = p.id
       LEFT JOIN guardians g ON g.id = pg.guardian_id
       WHERE t.club_id = $1 AND p.registration_status = $2
       GROUP BY p.id, t.name, t.age_group
       ORDER BY p.registration_date DESC`,
      [clubId, regStatus]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Approve/reject registration
router.put('/:clubId/registrations/:playerId', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'secretary'), async (req, res, next) => {
  try {
    const { clubId, playerId } = req.params
    const { status } = req.body // 'registered' or 'rejected'

    if (!['registered', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "registered" or "rejected"' })
    }

    // Verify player belongs to this club
    const playerCheck = await pool.query(
      'SELECT p.*, t.name as team_name FROM players p JOIN teams t ON p.team_id = t.id WHERE p.id = $1 AND t.club_id = $2',
      [playerId, clubId]
    )

    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found in this club' })
    }

    const result = await pool.query(
      'UPDATE players SET registration_status = $1 WHERE id = $2 RETURNING *',
      [status, playerId]
    )

    // Notify guardian
    try {
      const guardians = await pool.query(
        `SELECT g.email, g.first_name FROM player_guardians pg
         JOIN guardians g ON g.id = pg.guardian_id
         WHERE pg.player_id = $1`,
        [playerId]
      )

      const player = playerCheck.rows[0]
      for (const g of guardians.rows) {
        const title = status === 'registered'
          ? `Registration Approved - ${player.name}`
          : `Registration Update - ${player.name}`
        const message = status === 'registered'
          ? `Great news! ${player.name}'s registration with ${player.team_name} has been approved. They're now part of the squad!`
          : `${player.name}'s registration with ${player.team_name} was not approved at this time. Please contact the club for more details.`

        await sendNotificationEmail(g.email, { teamName: player.team_name, title, message })
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
       FROM clubs c
       JOIN club_members cm ON cm.club_id = c.id
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
