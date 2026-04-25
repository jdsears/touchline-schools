// Canonical matches table columns:
//   match_date (DATE), date (DATE, kept in sync), match_time (TIME),
//   home_away ('home'|'away'), score_for (INT), score_against (INT),
//   team_notes (TEXT), formations (JSONB), kit_type, meet_time, veo_link,
//   video_url, video_id, opponent, location, prep_notes, prep_draft, report.
// Legacy aliases (is_home, goals_for, goals_against, result, notes) are
// computed in SELECT for backward-compat with older frontend pages.

import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import pool from '../config/database.js'
import { authenticateToken, requireTeamAccess } from '../middleware/auth.js'
import { extractFixturesFromImage, extractPlayersFromImage, generateTrainingSession, generateTrainingSummary, generateSeasonFixtures } from '../services/claudeService.js'
import { normalizePlayerPositions, normalizePlayersPositions } from '../utils/pupilUtils.js'
import { sendTeamInviteEmail, sendNotificationEmail, isEmailEnabled, sendBatchEmails } from '../services/emailService.js'
import { sendPushToUser } from '../services/pushService.js'
import { getFrontendUrl } from '../utils/urlUtils.js'
import { canAddPlayer, checkAndIncrementUsage, getEntitlements } from '../services/billingService.js'
import { seedFAGuidelines } from '../services/knowledgeBaseService.js'

const router = Router()

// Configure multer for logo uploads
const uploadDir = './uploads/logos'
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

// Configure multer for training session plan images
const trainingImgDir = './uploads/training'
if (!fs.existsSync(trainingImgDir)) {
  fs.mkdirSync(trainingImgDir, { recursive: true })
}

const trainingImgStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, trainingImgDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  }
})

const trainingImgUpload = multer({
  storage: trainingImgStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per image
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.heic']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

// Get all teams the current user coaches (for Teacher Hub cross-team views)
router.get('/mine', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id

    if (req.user.is_admin) {
      const fallback = await pool.query('SELECT id FROM schools ORDER BY created_at ASC LIMIT 1')
      const schoolId = fallback.rows[0]?.id
      if (schoolId) {
        const result = await pool.query(
          `SELECT t.*,
            (SELECT COUNT(*) FROM pupils p WHERE p.team_id = t.id AND p.is_active = true) AS pupil_count,
            (SELECT COUNT(*) FROM matches m WHERE m.team_id = t.id) AS match_count
           FROM teams t
           WHERE t.school_id = $1
           ORDER BY t.sport ASC, t.name ASC`,
          [schoolId]
        )
        return res.json(result.rows)
      }
    }

    // Teams where user is owner OR has a team_membership with a coaching role
    const result = await pool.query(
      `SELECT DISTINCT t.*,
        (SELECT COUNT(*) FROM pupils p WHERE p.team_id = t.id AND p.is_active = true) AS pupil_count,
        (SELECT COUNT(*) FROM matches m WHERE m.team_id = t.id) AS match_count
       FROM teams t
       LEFT JOIN team_memberships tm ON tm.team_id = t.id AND tm.user_id = $1
       WHERE t.owner_id = $1 OR (tm.user_id = $1 AND tm.role IN ('manager', 'assistant', 'scout'))
       ORDER BY t.sport ASC, t.name ASC`,
      [userId]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Get upcoming fixtures across all teams the current user coaches
router.get('/mine/fixtures', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id

    const result = await pool.query(
      `SELECT m.*, COALESCE(m.date, m.match_date) AS date, t.name AS team_name, t.sport, t.age_group, t.gender,
              t.primary_color AS team_color
       FROM matches m
       JOIN teams t ON m.team_id = t.id
       LEFT JOIN team_memberships tm ON tm.team_id = t.id AND tm.user_id = $1
       WHERE (t.owner_id = $1 OR (tm.user_id = $1 AND tm.role IN ('manager', 'assistant', 'scout')))
       ORDER BY COALESCE(m.date, m.match_date) DESC
       LIMIT 50`,
      [userId]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Get upcoming training sessions across all teams the current user coaches
router.get('/mine/sessions', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id

    const result = await pool.query(
      `SELECT ts.*, ts.focus AS focus_areas, t.name AS team_name, t.sport, t.age_group, t.gender,
              t.primary_color AS team_color
       FROM training_sessions ts
       JOIN teams t ON ts.team_id = t.id
       LEFT JOIN team_memberships tm ON tm.team_id = t.id AND tm.user_id = $1
       WHERE (t.owner_id = $1 OR (tm.user_id = $1 AND tm.role IN ('manager', 'assistant', 'scout')))
       ORDER BY ts.session_date DESC
       LIMIT 50`,
      [userId]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Get team
router.get('/:id', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await pool.query('SELECT * FROM teams WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Update team
router.put('/:id', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id } = req.params
    const {
      name,
      age_group,
      team_format, // 11, 9, 7, or 5 a-side
      formation,
      formations, // New: up to 3 formations the team plays
      game_model,
      positions,
      planned_subs,
      custom_formations,
      bench_players,
      // White-label branding
      hub_name,
      primary_color,
      secondary_color,
      accent_color,
      logo_url,
      fa_fulltime_url,
      // Coaching philosophy
      coaching_philosophy,
      // Timezone
      timezone,
    } = req.body

    let result
    try {
      result = await pool.query(
        `UPDATE teams SET
          name = COALESCE($1, name),
          age_group = COALESCE($2, age_group),
          formation = COALESCE($3, formation),
          game_model = COALESCE($4, game_model),
          positions = COALESCE($5, positions),
          hub_name = COALESCE($6, hub_name),
          primary_color = COALESCE($7, primary_color),
          secondary_color = COALESCE($8, secondary_color),
          accent_color = COALESCE($9, accent_color),
          logo_url = COALESCE($10, logo_url),
          fa_fulltime_url = COALESCE($11, fa_fulltime_url),
          formations = COALESCE($12, formations),
          planned_subs = COALESCE($13, planned_subs),
          custom_formations = COALESCE($14, custom_formations),
          team_format = COALESCE($15, team_format),
          bench_players = COALESCE($16, bench_players),
          coaching_philosophy = COALESCE($17, coaching_philosophy),
          timezone = COALESCE($18, timezone),
          updated_at = NOW()
         WHERE id = $19 RETURNING *`,
        [
          name, age_group, formation,
          game_model ? JSON.stringify(game_model) : null,
          positions ? JSON.stringify(positions) : null,
          hub_name, primary_color, secondary_color, accent_color, logo_url, fa_fulltime_url,
          formations ? JSON.stringify(formations) : null,
          planned_subs ? JSON.stringify(planned_subs) : null,
          custom_formations ? JSON.stringify(custom_formations) : null,
          team_format,
          bench_players ? JSON.stringify(bench_players) : null,
          coaching_philosophy !== undefined ? coaching_philosophy : null,
          timezone || null,
          id
        ]
      )
    } catch (queryError) {
      // coaching_philosophy column may not exist yet if migration hasn't run
      if (queryError.message.includes('coaching_philosophy')) {
        result = await pool.query(
          `UPDATE teams SET
            name = COALESCE($1, name),
            age_group = COALESCE($2, age_group),
            formation = COALESCE($3, formation),
            game_model = COALESCE($4, game_model),
            positions = COALESCE($5, positions),
            hub_name = COALESCE($6, hub_name),
            primary_color = COALESCE($7, primary_color),
            secondary_color = COALESCE($8, secondary_color),
            accent_color = COALESCE($9, accent_color),
            logo_url = COALESCE($10, logo_url),
            fa_fulltime_url = COALESCE($11, fa_fulltime_url),
            formations = COALESCE($12, formations),
            planned_subs = COALESCE($13, planned_subs),
            custom_formations = COALESCE($14, custom_formations),
            team_format = COALESCE($15, team_format),
            bench_players = COALESCE($16, bench_players),
            updated_at = NOW()
           WHERE id = $17 RETURNING *`,
          [
            name, age_group, formation,
            game_model ? JSON.stringify(game_model) : null,
            positions ? JSON.stringify(positions) : null,
            hub_name, primary_color, secondary_color, accent_color, logo_url, fa_fulltime_url,
            formations ? JSON.stringify(formations) : null,
            planned_subs ? JSON.stringify(planned_subs) : null,
            custom_formations ? JSON.stringify(custom_formations) : null,
            team_format,
            bench_players ? JSON.stringify(bench_players) : null,
            id
          ]
        )
      } else {
        throw queryError
      }
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' })
    }

    // If age group changed, re-seed FA development guidelines (non-blocking)
    if (age_group) {
      const updatedTeam = result.rows[0]
      seedFAGuidelines(updatedTeam.id, updatedTeam.age_group).catch(err =>
        console.error('FA guidelines re-seed failed (non-critical):', err.message)
      )
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Get team members
router.get('/:id/members', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id } = req.params
    
    const result = await pool.query(
      'SELECT id, email, name, role, created_at FROM users WHERE team_id = $1 ORDER BY role, name',
      [id]
    )
    
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Get pending invites
router.get('/:id/invites', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `SELECT id, email, role, token, created_at, expires_at
       FROM invites
       WHERE team_id = $1 AND expires_at > NOW() AND accepted_at IS NULL
       ORDER BY created_at DESC`,
      [id]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Invite member
router.post('/:id/invite', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id } = req.params
    const { email, role } = req.body

    if (!email || !role) {
      return res.status(400).json({ message: 'Email and role required' })
    }

    // Check if already a member
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND team_id = $2',
      [email, id]
    )

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'User is already a team member' })
    }

    // Check if already invited
    const existingInvite = await pool.query(
      'SELECT id FROM invites WHERE email = $1 AND team_id = $2 AND expires_at > NOW()',
      [email, id]
    )

    if (existingInvite.rows.length > 0) {
      return res.status(400).json({ message: 'User already has a pending invite' })
    }

    // Get team name and inviter name for email
    const teamResult = await pool.query('SELECT name FROM teams WHERE id = $1', [id])
    const teamName = teamResult.rows[0]?.name || 'the team'

    const token = uuidv4()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const result = await pool.query(
      `INSERT INTO invites (team_id, email, role, token, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role, created_at, expires_at`,
      [id, email, role, token, expiresAt]
    )

    // Generate invite link (always return it for manual sharing)
    const inviteLink = `${getFrontendUrl()}/invite/${token}`
    console.log(`Invite link for ${email}: ${inviteLink}`)

    // Send invite email
    const emailResult = await sendTeamInviteEmail(email, {
      teamName,
      inviterName: req.user.name,
      role,
      inviteLink,
    })

    res.json({
      message: 'Invite created successfully',
      invite: result.rows[0],
      inviteLink: inviteLink, // Always return for copying
      emailSent: emailResult.success,
    })
  } catch (error) {
    next(error)
  }
})

// Cancel invite
router.delete('/:id/invites/:inviteId', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id, inviteId } = req.params

    const result = await pool.query(
      'DELETE FROM invites WHERE id = $1 AND team_id = $2 RETURNING id',
      [inviteId, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Invite not found' })
    }

    res.json({ message: 'Invite cancelled' })
  } catch (error) {
    next(error)
  }
})

// Remove team member
router.delete('/:id/members/:userId', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id, userId } = req.params

    // Prevent removing yourself
    if (req.user.id === userId) {
      return res.status(400).json({ message: 'You cannot remove yourself from the team' })
    }

    // Check if user is a manager (only managers can remove members)
    if (req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Only managers can remove team members' })
    }

    const result = await pool.query(
      'UPDATE users SET team_id = NULL WHERE id = $1 AND team_id = $2 RETURNING id',
      [userId, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Team member not found' })
    }

    res.json({ message: 'Team member removed' })
  } catch (error) {
    next(error)
  }
})

// Get pupils
router.get('/:id/pupils', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      'SELECT * FROM pupils WHERE team_id = $1 ORDER BY squad_number NULLS LAST, name',
      [id]
    )

    // Normalize positions from JSONB format to simple string array for client compatibility
    const pupils = result.rows.map(normalizePlayerPositions)
    res.json(pupils)
  } catch (error) {
    next(error)
  }
})

// Add pupil
router.post('/:id/pupils', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, dob, positions, parentContact, notes, squadNumber } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Pupil name is required' })
    }

    // Check pupil limit
    const playerLimit = await canAddPlayer(id)
    if (!playerLimit.allowed) {
      return res.status(403).json({
        message: `Team limit reached (${playerLimit.limit} pupils). Upgrade your plan to add more pupils.`,
        code: 'PLAYER_LIMIT_REACHED',
        current: playerLimit.current,
        limit: playerLimit.limit,
      })
    }

    const result = await pool.query(
      `INSERT INTO pupils (team_id, name, dob, positions, parent_contact, notes, squad_number)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7) RETURNING *`,
      [id, name, dob || null, JSON.stringify(positions || []), parentContact || null, notes || null, squadNumber || null]
    )

    // Normalize positions for client compatibility
    res.status(201).json(normalizePlayerPositions(result.rows[0]))
  } catch (error) {
    next(error)
  }
})

// Extract pupils from image using AI
router.post('/:id/pupils/extract-from-image', authenticateToken, requireTeamAccess, upload.single('image'), async (req, res, next) => {
  try {
    const { id } = req.params

    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' })
    }

    // Check OCR usage limit
    const usageCheck = await checkAndIncrementUsage(id, 'ocr')
    if (!usageCheck.allowed) {
      // Clean up file
      if (req.file?.path) {
        try { fs.unlinkSync(req.file.path) } catch {}
      }
      return res.status(429).json({
        message: usageCheck.limit === 0
          ? 'Image import is not available on your current plan. Upgrade to Core or Pro to import pupils from images.'
          : `Monthly import limit reached (${usageCheck.limit}). Upgrade your plan for more imports.`,
        code: 'OCR_LIMIT_REACHED',
        usage: { current: usageCheck.current, limit: usageCheck.limit },
        upgradeRequired: true,
      })
    }

    // Read the image file and convert to base64
    const imageBuffer = fs.readFileSync(req.file.path)
    const imageBase64 = imageBuffer.toString('base64')
    const mediaType = req.file.mimetype || 'image/png'

    // Extract pupils using Claude
    const pupils = await extractPlayersFromImage(imageBase64, mediaType)

    // Clean up uploaded file
    fs.unlinkSync(req.file.path)

    res.json({
      pupils,
      count: pupils.length,
    })
  } catch (error) {
    // Clean up file on error
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path) } catch {}
    }
    next(error)
  }
})

// Bulk import pupils
router.post('/:id/pupils/bulk', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id } = req.params
    const { pupils } = req.body

    if (!pupils || !Array.isArray(pupils) || pupils.length === 0) {
      return res.status(400).json({ message: 'Players array is required' })
    }

    // Check if team can add all these pupils
    const playerLimit = await canAddPlayer(id)
    const availableSlots = playerLimit.limit - playerLimit.current
    if (pupils.length > availableSlots) {
      return res.status(403).json({
        message: `Cannot add ${pupils.length} pupils. Team has ${availableSlots} slots remaining (${playerLimit.limit} max).`,
        code: 'PLAYER_LIMIT_REACHED',
        current: playerLimit.current,
        limit: playerLimit.limit,
        requested: pupils.length,
        available: availableSlots,
      })
    }

    // Build all pupil data first, then batch insert
    const playerData = pupils.map(pupil => {
      let parentContact = null
      if (pupil.parentName || pupil.parentEmail) {
        const contacts = []
        if (pupil.parentName) {
          contacts.push({
            name: pupil.parentName,
            email: pupil.parentEmail || null,
            phone: pupil.parentPhone || null,
          })
        }
        if (pupil.secondaryParentName) {
          contacts.push({
            name: pupil.secondaryParentName,
            email: pupil.secondaryParentEmail || null,
            phone: null,
          })
        }
        parentContact = JSON.stringify(contacts)
      }
      return {
        name: pupil.name,
        dob: pupil.dateOfBirth || null,
        positions: pupil.positions || [],
        parentContact,
        notes: pupil.registrationId ? `Registration ID: ${pupil.registrationId}` : null,
      }
    })

    // Batch insert all pupils in a single query
    const values = []
    const params = []
    let paramIdx = 1
    for (const p of playerData) {
      values.push(`($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4}, $${paramIdx+5})`)
      params.push(id, p.name, p.dob, JSON.stringify(p.positions), p.parentContact, p.notes)
      paramIdx += 6
    }
    const batchResult = await pool.query(
      `INSERT INTO pupils (team_id, name, dob, positions, parent_contact, notes)
       VALUES ${values.join(', ')} RETURNING *`,
      params
    )
    const results = batchResult.rows

    // Normalize positions for client compatibility
    res.status(201).json({
      pupils: normalizePlayersPositions(results),
      count: results.length,
    })
  } catch (error) {
    next(error)
  }
})

// Get matches
router.get('/:id/matches', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id } = req.params
    
    const result = await pool.query(
      `SELECT m.*,
        (m.home_away = 'home') AS is_home,
        m.score_for AS goals_for,
        m.score_against AS goals_against,
        m.team_notes AS notes,
        CASE WHEN m.score_for IS NOT NULL AND m.score_against IS NOT NULL
          THEN m.score_for || ' - ' || m.score_against ELSE NULL END AS result,
        (SELECT COUNT(*) FROM match_availability ma WHERE ma.match_id = m.id AND ma.status = 'available') as available_count,
        (SELECT COUNT(*) FROM match_availability ma WHERE ma.match_id = m.id AND ma.status = 'unavailable') as unavailable_count,
        (SELECT COUNT(*) FROM match_availability ma WHERE ma.match_id = m.id AND ma.status = 'maybe') as maybe_count
      FROM matches m WHERE m.team_id = $1 ORDER BY COALESCE(m.date, m.match_date) DESC`,
      [id]
    )
    
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Add match
router.post('/:id/matches', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id } = req.params
    const { opponent, date, location, isHome, veoLink, result: matchResult, kitType, meetTime } = req.body

    if (!opponent || !date) {
      return res.status(400).json({ message: 'Opponent and date are required' })
    }

    const homeAway = isHome !== false ? 'home' : 'away'
    const dbResult = await pool.query(
      `INSERT INTO matches (team_id, opponent, match_date, date, location, home_away, veo_link, kit_type, meet_time)
       VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8) RETURNING *,
         (home_away = 'home') AS is_home, score_for AS goals_for, score_against AS goals_against`,
      [id, opponent, date, location || null, homeAway, veoLink || null, kitType || homeAway, meetTime || null]
    )

    res.status(201).json(dbResult.rows[0])
  } catch (error) {
    next(error)
  }
})

// Extract fixtures from image using AI
router.post('/:id/matches/extract-from-image', authenticateToken, requireTeamAccess, upload.single('image'), async (req, res, next) => {
  try {
    const { id } = req.params

    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' })
    }

    // Get team name
    const teamResult = await pool.query('SELECT name FROM teams WHERE id = $1', [id])
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' })
    }
    const teamName = teamResult.rows[0].name

    // Read the image and convert to base64
    const imageBuffer = fs.readFileSync(req.file.path)
    const imageBase64 = imageBuffer.toString('base64')

    // Determine media type
    const ext = path.extname(req.file.originalname).toLowerCase()
    const mediaTypeMap = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    }
    const mediaType = mediaTypeMap[ext] || 'image/png'

    // Extract fixtures using AI
    const fixtures = await extractFixturesFromImage(imageBase64, teamName, mediaType)

    // Clean up uploaded file
    fs.unlinkSync(req.file.path)

    res.json({
      teamName,
      fixtures,
      count: fixtures.length,
    })
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path) } catch (e) {}
    }
    next(error)
  }
})

// Bulk add matches (for importing extracted fixtures)
router.post('/:id/matches/bulk', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id } = req.params
    const { matches } = req.body

    if (!matches || !Array.isArray(matches) || matches.length === 0) {
      return res.status(400).json({ message: 'No matches provided' })
    }

    const inserted = []
    for (const match of matches) {
      // Parse result string to extract goals_for and goals_against
      let goalsFor = null
      let goalsAgainst = null
      let resultStr = match.result || null

      if (resultStr) {
        const parts = resultStr.split('-').map(s => parseInt(s.trim(), 10))
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          goalsFor = parts[0]
          goalsAgainst = parts[1]
        }
      }

      // Ensure result string is set when we have goals (for consistency)
      if (goalsFor !== null && goalsAgainst !== null && !resultStr) {
        resultStr = `${goalsFor}-${goalsAgainst}`
      }

      const matchDate = match.date + (match.time ? `T${match.time}:00` : 'T00:00:00')
      const homeAway = match.isHome !== false ? 'home' : 'away'
      const result = await pool.query(
        `INSERT INTO matches (team_id, opponent, match_date, date, match_time, location, home_away,
          score_for, score_against, team_notes, kit_type, meet_time)
         VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT DO NOTHING
         RETURNING *`,
        [
          id,
          match.opponent,
          matchDate,
          match.time || null,
          match.location || null,
          homeAway,
          goalsFor,
          goalsAgainst,
          match.competition ? `Competition: ${match.competition}` : null,
          match.kitType || homeAway,
          match.meetTime || null
        ]
      )
      if (result.rows.length > 0) {
        inserted.push(result.rows[0])
      }
    }

    res.status(201).json({
      message: `${inserted.length} matches imported`,
      matches: inserted,
    })
  } catch (error) {
    next(error)
  }
})

// AI-assisted season fixture generation
router.post('/:id/matches/generate-season', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id } = req.params

    const teamRes = await pool.query('SELECT name, sport, age_group, gender FROM teams WHERE id = $1', [id])
    if (!teamRes.rows.length) return res.status(404).json({ message: 'Team not found' })
    const team = teamRes.rows[0]

    const pastRes = await pool.query(
      `SELECT DISTINCT opponent FROM matches WHERE team_id = $1 AND opponent IS NOT NULL ORDER BY opponent`,
      [id]
    )
    const pastOpponents = pastRes.rows.map(r => r.opponent)

    const fixtures = await generateSeasonFixtures({
      teamName: team.name,
      sport: team.sport,
      ageGroup: team.age_group,
      gender: team.gender,
      pastOpponents,
    })

    res.json({ fixtures })
  } catch (error) {
    console.error('AI season generation failed:', error)
    res.status(500).json({ message: error.message || 'Failed to generate season fixtures' })
  }
})

// Validate fixtures for clashes before bulk creation
router.post('/:id/matches/validate', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id } = req.params
    const { matches: proposed } = req.body
    if (!proposed?.length) return res.json({ warnings: [] })

    const team = await pool.query('SELECT school_id FROM teams WHERE id = $1', [id])
    const schoolId = team.rows[0]?.school_id
    const warnings = []

    for (let i = 0; i < proposed.length; i++) {
      const m = proposed[i]
      if (!m.date) continue
      const d = m.date

      // Venue clash: another fixture at the same school on the same date at the same home venue
      if (m.isHome !== false && schoolId) {
        const venueClash = await pool.query(
          `SELECT t.name AS team_name, m2.opponent
           FROM matches m2 JOIN teams t ON t.id = m2.team_id
           WHERE t.school_id = $1 AND m2.team_id != $2
             AND m2.match_date::date = $3::date AND m2.home_away = 'home'
           LIMIT 1`,
          [schoolId, id, d]
        )
        if (venueClash.rows.length > 0) {
          const c = venueClash.rows[0]
          warnings.push({ row: i, type: 'venue', message: `Home venue clash: ${c.team_name} vs ${c.opponent} on the same date` })
        }
      }

      // Date warning: Sunday fixture
      const dow = new Date(d).getDay()
      if (dow === 0) {
        warnings.push({ row: i, type: 'date', message: 'Sunday fixture - verify this is intentional' })
      }
    }

    res.json({ warnings })
  } catch (error) {
    next(error)
  }
})

// Delete all matches for a team
router.delete('/:id/matches/all', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id } = req.params
    const { type } = req.query // 'upcoming', 'results', or 'all' (default)

    let query = 'DELETE FROM matches WHERE team_id = $1'
    const params = [id]

    if (type === 'upcoming') {
      query += ' AND COALESCE(date, match_date) > NOW() AND score_for IS NULL'
    } else if (type === 'results') {
      query += ' AND (COALESCE(date, match_date) < NOW() OR score_for IS NOT NULL)'
    }
    query += ' RETURNING id'

    const result = await pool.query(query, params)

    res.json({
      message: `${result.rowCount} matches deleted`,
      count: result.rowCount
    })
  } catch (error) {
    next(error)
  }
})

// Chat history
router.get('/:id/chat/history', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id } = req.params
    const { limit = 50 } = req.query

    const result = await pool.query(
      `SELECT * FROM messages WHERE team_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [id, limit]
    )

    res.json(result.rows.reverse())
  } catch (error) {
    next(error)
  }
})

// Upload team logo
router.post('/:id/logo', authenticateToken, requireTeamAccess, upload.single('logo'), async (req, res, next) => {
  try {
    const { id } = req.params

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`

    // Update team with new logo URL
    const result = await pool.query(
      'UPDATE teams SET logo_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [logoUrl, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' })
    }

    res.json({ logoUrl, team: result.rows[0] })
  } catch (error) {
    next(error)
  }
})

// Upload logo during registration (no auth required, returns temp URL)
router.post('/upload-logo', upload.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`
    res.json({ logoUrl })
  } catch (error) {
    next(error)
  }
})

// ============== TRAINING ==============

// Get training sessions for team
router.get('/:id/training', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      `SELECT ts.*,
        (SELECT COUNT(*) FROM training_availability ta WHERE ta.session_id = ts.id AND ta.status = 'available') as available_count,
        (SELECT COUNT(*) FROM training_availability ta WHERE ta.session_id = ts.id AND ta.status = 'unavailable') as unavailable_count,
        (SELECT COUNT(*) FROM training_availability ta WHERE ta.session_id = ts.id AND ta.status = 'maybe') as maybe_count
      FROM training_sessions ts WHERE ts.team_id = $1 ORDER BY ts.date DESC`,
      [id]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Generate training session using AI
router.post('/:id/training/generate', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id } = req.params
    const { duration, focusAreas, pupils, constraints, coachDrills, date, time, meet_time, venue_type, existingSessionId, location, session_type, level } = req.body

    // For existing sessions (e.g. scheduled sessions), allow empty focus areas with a sensible default
    const resolvedFocusAreas = (focusAreas && focusAreas.length > 0)
      ? focusAreas
      : existingSessionId
        ? ['passing', 'teamwork']
        : null

    if (!duration || !resolvedFocusAreas) {
      return res.status(400).json({ message: 'Duration and focus areas are required' })
    }

    // Check manager role
    if (req.user.role !== 'manager' && req.user.role !== 'assistant') {
      return res.status(403).json({ message: 'Only managers can generate training sessions' })
    }

    // Get team format, age group, and coaching philosophy
    const teamResult = await pool.query('SELECT * FROM teams WHERE id = $1', [id])
    const teamFormat = teamResult.rows[0]?.team_format || 11
    const ageGroup = teamResult.rows[0]?.age_group
    const coachingPhilosophy = teamResult.rows[0]?.coaching_philosophy

    // Generate the session plan using AI
    const sessionPlan = await generateTrainingSession({
      duration,
      focusAreas: resolvedFocusAreas,
      pupils: pupils || 14,
      constraints,
      coachDrills,
      teamFormat,
      ageGroup,
      level,
      coachingPhilosophy,
    })

    let result
    if (existingSessionId) {
      // Update existing session with the generated plan and focus areas
      result = await pool.query(
        `UPDATE training_sessions SET plan = $1, focus_areas = COALESCE($4, focus_areas) WHERE id = $2 AND team_id = $3 RETURNING *`,
        [JSON.stringify(sessionPlan), existingSessionId, id, resolvedFocusAreas]
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Session not found' })
      }
    } else {
      // Save as a new session
      result = await pool.query(
        `INSERT INTO training_sessions (team_id, date, time, meet_time, duration, focus_areas, plan, notes, venue_type, location, session_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          id,
          date || new Date().toISOString().split('T')[0],
          time || null,
          meet_time || null,
          duration,
          resolvedFocusAreas,
          JSON.stringify(sessionPlan),
          constraints || null,
          venue_type || 'outdoor',
          location || null,
          session_type || 'training'
        ]
      )
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Training generation error:', error)
    next(error)
  }
})

// Create manual training session (supports recurring weekly)
router.post('/:id/training', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id } = req.params
    const { date, time, meet_time, duration, focusAreas, plan, notes, location, session_type, venue_type, recurring, recurring_end_date } = req.body

    // Recurring: create one session per week from date to recurring_end_date
    if (recurring && recurring_end_date) {
      const startDate = new Date(date + 'T12:00:00')
      const endDate = new Date(recurring_end_date + 'T12:00:00')

      if (endDate <= startDate) {
        return res.status(400).json({ message: 'End date must be after start date' })
      }

      // Cap at 52 weeks (1 year)
      const maxWeeks = 52
      const rows = []
      let current = new Date(startDate)
      let count = 0

      while (current <= endDate && count < maxWeeks) {
        const dateStr = current.toISOString().split('T')[0]
        const result = await pool.query(
          `INSERT INTO training_sessions (team_id, date, time, meet_time, duration, focus_areas, plan, notes, location, session_type, venue_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
          [id, dateStr, time || null, meet_time || null, duration, focusAreas, plan ? JSON.stringify(plan) : null, notes, location || null, session_type || 'training', venue_type || 'outdoor']
        )
        rows.push(result.rows[0])
        current.setDate(current.getDate() + 7)
        count++
      }

      return res.json(rows)
    }

    // Single session
    const result = await pool.query(
      `INSERT INTO training_sessions (team_id, date, time, meet_time, duration, focus_areas, plan, notes, location, session_type, venue_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [id, date, time || null, meet_time || null, duration, focusAreas, plan ? JSON.stringify(plan) : null, notes, location || null, session_type || 'training', venue_type || 'outdoor']
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('Training session create error:', error.message, 'code:', error.code, 'detail:', error.detail || '', 'column:', error.column || '')
    next(error)
  }
})

// Update training session
router.put('/:id/training/:sessionId', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { sessionId } = req.params
    const { date, time, meet_time, duration, focusAreas, notes, location, session_type, share_plan_with_players, plan } = req.body

    const result = await pool.query(
      `UPDATE training_sessions
       SET date = COALESCE($1, date),
           time = $2,
           meet_time = $3,
           duration = COALESCE($4, duration),
           focus_areas = COALESCE($5, focus_areas),
           notes = $6,
           location = $7,
           session_type = COALESCE($8, session_type),
           share_plan_with_players = COALESCE($9, share_plan_with_players),
           plan = COALESCE($11, plan)
       WHERE id = $10
       RETURNING *`,
      [date, time || null, meet_time || null, duration, focusAreas, notes, location || null, session_type, share_plan_with_players, sessionId, plan ? JSON.stringify(plan) : null]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Toggle share plan with pupils
router.put('/:id/training/:sessionId/share', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { sessionId } = req.params
    const { share_plan_with_players } = req.body

    const result = await pool.query(
      `UPDATE training_sessions
       SET share_plan_with_players = $1
       WHERE id = $2
       RETURNING *`,
      [share_plan_with_players, sessionId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Save custom (coach-written) plan for a training session
router.put('/:id/training/:sessionId/custom-plan', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { sessionId } = req.params
    const { custom_plan } = req.body

    const result = await pool.query(
      `UPDATE training_sessions
       SET custom_plan = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [custom_plan || null, sessionId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Upload images to a training session plan
router.post('/:id/training/:sessionId/images', authenticateToken, requireTeamAccess, trainingImgUpload.array('images', 10), async (req, res, next) => {
  try {
    const { sessionId } = req.params

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' })
    }

    // Get existing images
    const existing = await pool.query(
      'SELECT plan_images FROM training_sessions WHERE id = $1',
      [sessionId]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    const currentImages = existing.rows[0].plan_images || []
    const newImages = req.files.map(file => ({
      id: uuidv4(),
      url: `/uploads/training/${file.filename}`,
      filename: file.originalname,
      uploaded_at: new Date().toISOString(),
    }))

    const allImages = [...currentImages, ...newImages]

    const result = await pool.query(
      `UPDATE training_sessions
       SET plan_images = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(allImages), sessionId]
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Delete an image from a training session plan
router.delete('/:id/training/:sessionId/images/:imageId', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { sessionId, imageId } = req.params

    const existing = await pool.query(
      'SELECT plan_images FROM training_sessions WHERE id = $1',
      [sessionId]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    const currentImages = existing.rows[0].plan_images || []
    const imageToDelete = currentImages.find(img => img.id === imageId)

    // Delete file from disk
    if (imageToDelete) {
      const filePath = path.join('.', imageToDelete.url)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }

    const updatedImages = currentImages.filter(img => img.id !== imageId)

    const result = await pool.query(
      `UPDATE training_sessions
       SET plan_images = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(updatedImages), sessionId]
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Generate AI training summary for parents
router.post('/:id/training/:sessionId/summary', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id, sessionId } = req.params

    // Get training session
    const sessionResult = await pool.query('SELECT * FROM training_sessions WHERE id = $1 AND team_id = $2', [sessionId, id])
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'Training session not found' })
    }
    const session = sessionResult.rows[0]

    // Get team
    const teamResult = await pool.query('SELECT * FROM teams WHERE id = $1', [id])
    const team = teamResult.rows[0]

    // Generate summary
    const summary = await generateTrainingSummary(session, team)

    // Save the summary
    await pool.query(
      'UPDATE training_sessions SET summary = $1 WHERE id = $2',
      [summary, sessionId]
    )

    res.json({ summary })
  } catch (error) {
    console.error('Training summary generation error:', error)
    next(error)
  }
})

// ============== TRAINING ATTENDANCE ==============

// Get attendance for a training session
router.get('/:id/training/:sessionId/attendance', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id, sessionId } = req.params

    // First ensure training_attendance table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS training_attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
        pupil_id UUID NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
        attended BOOLEAN NOT NULL DEFAULT false,
        notes TEXT,
        recorded_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(session_id, pupil_id)
      )
    `)

    const result = await pool.query(
      `SELECT
        p.id as pupil_id,
        p.name as player_name,
        COALESCE(ta.attended, false) as attended,
        ta.notes,
        ta.effort_rating
       FROM pupils p
       LEFT JOIN training_attendance ta ON ta.pupil_id = p.id AND ta.session_id = $1
       WHERE p.team_id = $2 AND (p.is_active IS NULL OR p.is_active = true)
       ORDER BY p.name`,
      [sessionId, id]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Attendance load error:', error.message, error.code, error.detail || '')
    next(error)
  }
})

// Save attendance for a training session (bulk)
router.put('/:id/training/:sessionId/attendance', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { sessionId } = req.params
    const { attendance } = req.body // Array of { pupil_id, attended, notes? }

    if (!Array.isArray(attendance)) {
      return res.status(400).json({ message: 'attendance must be an array' })
    }

    const results = []
    for (const record of attendance) {
      const { pupil_id, attended, notes, effort_rating } = record
      // effort_rating is optional (1-5) - only set if provided
      const effortVal = effort_rating && effort_rating >= 1 && effort_rating <= 5 ? effort_rating : null
      const result = await pool.query(
        `INSERT INTO training_attendance (session_id, pupil_id, attended, notes, recorded_by, effort_rating)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (session_id, pupil_id)
         DO UPDATE SET attended = $3, notes = $4, recorded_by = $5,
           effort_rating = COALESCE($6, training_attendance.effort_rating),
           updated_at = NOW()
         RETURNING *`,
        [sessionId, pupil_id, attended, notes || null, req.user.id, effortVal]
      )
      results.push(result.rows[0])
    }

    res.json(results)
  } catch (error) {
    next(error)
  }
})

// ============== TRAINING AVAILABILITY ==============

// Get training session availability for all pupils
router.get('/:id/training/:sessionId/availability', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id, sessionId } = req.params

    const result = await pool.query(
      `SELECT
        p.id as pupil_id,
        p.name as player_name,
        p.squad_number,
        COALESCE(ta.status, 'pending') as status,
        ta.notes,
        ta.responded_at,
        ta.user_id
       FROM pupils p
       LEFT JOIN training_availability ta ON ta.pupil_id = p.id AND ta.session_id = $1
       WHERE p.team_id = $2 AND (p.is_active IS NULL OR p.is_active = true)
       ORDER BY p.name`,
      [sessionId, id]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Update training availability for a pupil
router.post('/:id/training/:sessionId/availability', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { sessionId } = req.params
    const { pupil_id, status, notes } = req.body

    if (!pupil_id || !status) {
      return res.status(400).json({ message: 'pupil_id and status are required' })
    }

    if (!['available', 'unavailable', 'maybe', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    const result = await pool.query(
      `INSERT INTO training_availability (session_id, pupil_id, user_id, status, notes, responded_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (session_id, pupil_id)
       DO UPDATE SET status = $4, notes = $5, user_id = $3, responded_at = NOW(), updated_at = NOW()
       RETURNING *`,
      [sessionId, pupil_id, req.user.id, status, notes || null]
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Bulk update training availability
router.post('/:id/training/:sessionId/availability/bulk', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { sessionId } = req.params
    const { availabilities } = req.body

    if (!Array.isArray(availabilities)) {
      return res.status(400).json({ message: 'availabilities must be an array' })
    }

    const results = []
    for (const avail of availabilities) {
      const { pupil_id, status, notes } = avail
      const result = await pool.query(
        `INSERT INTO training_availability (session_id, pupil_id, user_id, status, notes, responded_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (session_id, pupil_id)
         DO UPDATE SET status = $4, notes = $5, user_id = $3, responded_at = NOW(), updated_at = NOW()
         RETURNING *`,
        [sessionId, pupil_id, req.user.id, status, notes || null]
      )
      results.push(result.rows[0])
    }

    res.json(results)
  } catch (error) {
    next(error)
  }
})

// Request training availability (send notifications)
router.post('/:id/training/:sessionId/availability/request', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id, sessionId } = req.params
    const { pendingOnly } = req.body

    if (req.user.role !== 'manager' && req.user.role !== 'assistant') {
      return res.status(403).json({ message: 'Only managers can request availability' })
    }

    // Get session details
    const sessionResult = await pool.query('SELECT * FROM training_sessions WHERE id = $1 AND team_id = $2', [sessionId, id])
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: 'Training session not found' })
    }
    const session = sessionResult.rows[0]

    // Get team name
    const teamResult = await pool.query('SELECT name, school_id FROM teams WHERE id = $1', [id])
    const teamName = teamResult.rows[0]?.name || 'Your Team'
    const schoolId = teamResult.rows[0]?.school_id

    const sessionType = session.session_type === 's&c' ? 'S&C' : 'Training'
    const sessionDate = new Date(session.date).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
    const sessionTime = session.time ? ` at ${session.time.slice(0, 5)}` : ''

    // Get pupils - optionally filter to only those who haven't responded
    const playersResult = await pool.query(
      `SELECT p.*, u.id as user_id, u.email as user_email
       FROM pupils p
       LEFT JOIN users u ON u.pupil_id = p.id
       ${pendingOnly ? 'LEFT JOIN training_availability ta ON ta.pupil_id = p.id AND ta.session_id = $2' : ''}
       WHERE p.team_id = $1 AND (p.is_active IS NULL OR p.is_active = true)
       ${pendingOnly ? 'AND ta.id IS NULL' : ''}`,
      pendingOnly ? [id, sessionId] : [id]
    )

    // Batch insert notifications
    const playersWithAccounts = playersResult.rows.filter(p => p.user_id)
    let notified = playersWithAccounts.length
    if (playersWithAccounts.length > 0) {
      const notifValues = []
      const notifParams = []
      let paramIdx = 1
      const notifTitle = `${sessionType} Availability: ${sessionDate}`
      const notifMessage = `Please confirm your availability for ${sessionType.toLowerCase()} on ${sessionDate}${sessionTime}.`
      const notifData = JSON.stringify({ session_id: sessionId })

      for (const pupil of playersWithAccounts) {
        notifValues.push(`($${paramIdx}, $${paramIdx+1}, 'availability_request', $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4})`)
        notifParams.push(pupil.user_id, id, notifTitle, notifMessage, notifData)
        paramIdx += 5
      }
      await pool.query(
        `INSERT INTO notifications (user_id, team_id, type, title, message, data)
         VALUES ${notifValues.join(', ')}`,
        notifParams
      )
    }

    // Build batch emails
    const sessionInfo = `${sessionType} session`
    const responseLink = `${getFrontendUrl()}/training`
    const batchEmails = []
    const emailledAddresses = new Set()

    for (const pupil of playersWithAccounts) {
      if (!pupil.user_email) continue
      emailledAddresses.add(pupil.user_email.toLowerCase())
      batchEmails.push({
        to: pupil.user_email,
        template: 'availabilityRequest',
        data: { teamName, playerName: pupil.name, matchInfo: sessionInfo, matchDate: `${sessionDate}${sessionTime}`, responseLink }
      })
    }

    // Add linked guardians/parents
    if (schoolId) {
      const guardiansResult = await pool.query(
        `SELECT DISTINCT g.email, g.first_name, g.notification_preferences, p.name as player_name
         FROM guardians g
         JOIN pupil_guardians pg ON pg.guardian_id = g.id
         JOIN pupils p ON pg.pupil_id = p.id
         ${pendingOnly ? 'LEFT JOIN training_availability ta ON ta.pupil_id = p.id AND ta.session_id = $3' : ''}
         WHERE g.school_id = $1 AND p.team_id = $2 AND (p.is_active IS NULL OR p.is_active = true)
         AND g.email IS NOT NULL
         ${pendingOnly ? 'AND ta.id IS NULL' : ''}`,
        pendingOnly ? [schoolId, id, sessionId] : [schoolId, id]
      )
      for (const guardian of guardiansResult.rows) {
        const prefs = guardian.notification_preferences || {}
        if (prefs.availability === false) continue
        if (emailledAddresses.has(guardian.email.toLowerCase())) continue
        emailledAddresses.add(guardian.email.toLowerCase())
        batchEmails.push({
          to: guardian.email,
          template: 'availabilityRequest',
          data: { teamName, playerName: guardian.player_name, matchInfo: sessionInfo, matchDate: `${sessionDate}${sessionTime}`, responseLink }
        })
      }
    }

    const { sent: emailsSent } = await sendBatchEmails(batchEmails)

    // Send push notifications
    for (const pupil of playersWithAccounts) {
      sendPushToUser(pupil.user_id, {
        title: `📋 ${sessionType} Availability`,
        body: `Please confirm availability for ${sessionDate}`,
        tag: `training-availability-${sessionId}`,
        url: `/training`,
      })
    }

    res.json({
      message: 'Availability request sent',
      players_notified: notified,
      total_players: playersResult.rows.length,
      emails_sent: emailsSent,
      email_enabled: isEmailEnabled()
    })
  } catch (error) {
    next(error)
  }
})

// ============== TEAM ANNOUNCEMENTS ==============

// Send announcement email to all team parents
router.post('/:id/announce', authenticateToken, requireTeamAccess, async (req, res, next) => {
  try {
    const { id } = req.params
    const { title, message, actionLink, actionText } = req.body

    // Check manager role
    if (req.user.role !== 'manager' && req.user.role !== 'assistant') {
      return res.status(403).json({ message: 'Only managers can send team announcements' })
    }

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' })
    }

    // Get team
    const teamResult = await pool.query('SELECT name FROM teams WHERE id = $1', [id])
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' })
    }
    const teamName = teamResult.rows[0].name

    // Get all active pupils with parent emails
    const playersResult = await pool.query(
      `SELECT id, name, parent_email, parent_contact
       FROM pupils
       WHERE team_id = $1 AND is_active = true`,
      [id]
    )

    // Collect all unique parent emails
    const allParentEmails = new Set()
    for (const pupil of playersResult.rows) {
      if (pupil.parent_email) {
        allParentEmails.add(pupil.parent_email)
      }
      if (pupil.parent_contact) {
        try {
          const contacts = typeof pupil.parent_contact === 'string'
            ? JSON.parse(pupil.parent_contact)
            : pupil.parent_contact
          if (Array.isArray(contacts)) {
            contacts.filter(c => c.email).forEach(c => allParentEmails.add(c.email))
          }
        } catch {}
      }
    }

    // Send emails
    let emailsSent = 0
    for (const email of allParentEmails) {
      await sendNotificationEmail(email, {
        teamName,
        title,
        message,
        actionLink: actionLink || null,
        actionText: actionText || null
      })
      emailsSent++
    }

    // Also create in-app notifications for all team members
    const usersResult = await pool.query(
      'SELECT id FROM users WHERE team_id = $1',
      [id]
    )

    for (const user of usersResult.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, team_id, type, title, message, data)
         VALUES ($1, $2, 'announcement', $3, $4, $5)`,
        [
          user.id,
          id,
          title,
          message,
          JSON.stringify({ action_link: actionLink, action_text: actionText })
        ]
      )
    }

    console.log(`Announcement sent for team ${id}: ${emailsSent} emails, ${usersResult.rows.length} in-app notifications`)

    res.json({
      message: 'Announcement sent successfully',
      emails_sent: emailsSent,
      notifications_created: usersResult.rows.length
    })
  } catch (error) {
    console.error('Team announcement error:', error)
    next(error)
  }
})

export default router
