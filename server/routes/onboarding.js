import express from 'express'
import multer from 'multer'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { sendTeamInviteEmail, isEmailEnabled } from '../services/emailService.js'
import { getFrontendUrl } from '../utils/urlUtils.js'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'

const router = express.Router()
router.use(authenticateToken)

// Multer for CSV upload (in-memory, 5MB limit)
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true)
    } else {
      cb(new Error('Only CSV files are accepted'))
    }
  },
})

// Simple CSV parser (handles quoted fields with commas)
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  function parseLine(line) {
    const fields = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    fields.push(current.trim())
    return fields
  }

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'))
  const rows = lines.slice(1).map(line => {
    const values = parseLine(line)
    const row = {}
    headers.forEach((h, i) => {
      row[h] = values[i] || ''
    })
    return row
  })

  return { headers, rows }
}

// POST /school - Create school during onboarding
router.post('/school', async (req, res) => {
  try {
    const {
      name, school_type, urn, contact_email, contact_phone,
      address_line1, address_line2, city, county, postcode,
      primary_color, secondary_color,
    } = req.body

    if (!name) {
      return res.status(400).json({ error: 'School name is required' })
    }

    // Generate slug
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const existing = await pool.query('SELECT id FROM schools WHERE slug = $1', [slug])
    if (existing.rows.length > 0) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    const result = await pool.query(
      `INSERT INTO schools (name, slug, school_type, urn, contact_email, contact_phone,
        address_line1, address_line2, city, county, postcode,
        primary_color, secondary_color, subscription_tier, subscription_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'enterprise', 'active')
       RETURNING *`,
      [name, slug, school_type || 'state', urn || null,
       contact_email || req.user.email, contact_phone || null,
       address_line1 || null, address_line2 || null, city || null, county || null, postcode || null,
       primary_color || '#1a365d', secondary_color || '#2ED573']
    )

    const school = result.rows[0]

    // Add creator as owner
    await pool.query(
      `INSERT INTO school_members (school_id, user_id, role, can_manage_payments, can_manage_players, can_view_financials, can_invite_members, joined_at)
       VALUES ($1, $2, 'owner', true, true, true, true, NOW())
       ON CONFLICT (school_id, user_id) DO NOTHING`,
      [school.id, req.user.id]
    )

    res.status(201).json(school)
  } catch (error) {
    console.error('Onboarding school creation error:', error)
    res.status(500).json({ error: 'Failed to create school' })
  }
})

// POST /teachers - Invite teachers to the school
router.post('/teachers', async (req, res) => {
  try {
    const { school_id, teachers } = req.body

    if (!school_id || !teachers || !Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({ error: 'school_id and teachers array are required' })
    }

    const invited = []
    for (const teacher of teachers) {
      if (!teacher.email) continue

      const email = teacher.email.trim().toLowerCase()
      const name = teacher.name?.trim() || email.split('@')[0]
      const role = teacher.role || 'coach'

      // Check if user already exists
      let userId
      const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email])

      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id
      } else {
        // Create a placeholder user account (they will set password on first login)
        const tempPassword = await bcrypt.hash(uuidv4(), 10)
        const newUser = await pool.query(
          `INSERT INTO users (id, email, name, password, role, has_completed_onboarding)
           VALUES ($1, $2, $3, $4, 'manager', false)
           RETURNING id`,
          [uuidv4(), email, name, tempPassword]
        )
        userId = newUser.rows[0].id
      }

      // Add as school member
      await pool.query(
        `INSERT INTO school_members (school_id, user_id, role, can_manage_players, can_invite_members, invited_at, joined_at)
         VALUES ($1, $2, $3, true, false, NOW(), NOW())
         ON CONFLICT (school_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [school_id, userId, role]
      )

      invited.push({ email, name, role })
    }

    res.status(201).json({ invited: invited.length, teachers: invited })
  } catch (error) {
    console.error('Onboarding teacher invite error:', error)
    res.status(500).json({ error: 'Failed to invite teachers' })
  }
})

// POST /pupils/csv - Import pupils from CSV
router.post('/pupils/csv', csvUpload.single('file'), async (req, res) => {
  try {
    const { school_id } = req.body

    if (!school_id) {
      return res.status(400).json({ error: 'school_id is required' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' })
    }

    const csvText = req.file.buffer.toString('utf-8')
    const { headers, rows } = parseCSV(csvText)

    if (rows.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty' })
    }

    // Map headers to pupil fields (flexible header naming)
    function mapField(row, ...possibleNames) {
      for (const name of possibleNames) {
        if (row[name] !== undefined && row[name] !== '') return row[name]
      }
      return null
    }

    // We need a team to attach pupils to. Find or create a "School Pool" team.
    let poolTeamResult = await pool.query(
      `SELECT id FROM teams WHERE school_id = $1 AND name = 'School Pool'`,
      [school_id]
    )

    let poolTeamId
    if (poolTeamResult.rows.length > 0) {
      poolTeamId = poolTeamResult.rows[0].id
    } else {
      const newTeam = await pool.query(
        `INSERT INTO teams (id, name, school_id, sport, age_group, owner_id)
         VALUES ($1, 'School Pool', $2, 'football', 'All', $3)
         RETURNING id`,
        [uuidv4(), school_id, req.user.id]
      )
      poolTeamId = newTeam.rows[0].id
    }

    const created = []
    const skipped = []

    for (const row of rows) {
      const firstName = mapField(row, 'first_name', 'firstname', 'first', 'forename', 'given_name')
      const lastName = mapField(row, 'last_name', 'lastname', 'last', 'surname', 'family_name')

      if (!firstName && !lastName) {
        skipped.push({ row, reason: 'No name found' })
        continue
      }

      const yearGroup = parseInt(mapField(row, 'year_group', 'year', 'yeargroup', 'form') || '0') || null
      const house = mapField(row, 'house', 'house_name')
      const dob = mapField(row, 'dob', 'date_of_birth', 'dateofbirth', 'birthday')
      const gender = mapField(row, 'gender', 'sex')

      try {
        const result = await pool.query(
          `INSERT INTO pupils (id, first_name, last_name, team_id, year_group, house, date_of_birth, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true)
           RETURNING id, first_name, last_name, year_group`,
          [uuidv4(), firstName, lastName || '', poolTeamId,
           yearGroup, house || null, dob || null]
        )
        created.push(result.rows[0])
      } catch (err) {
        skipped.push({ row: `${firstName} ${lastName}`, reason: err.message })
      }
    }

    res.status(201).json({
      total_rows: rows.length,
      created: created.length,
      skipped: skipped.length,
      skipped_details: skipped.slice(0, 10),
      headers_found: headers,
    })
  } catch (error) {
    console.error('CSV import error:', error)
    res.status(500).json({ error: 'Failed to import pupils' })
  }
})

// POST /teams - Create an extra-curricular team during onboarding
router.post('/teams', async (req, res) => {
  try {
    const { school_id, name, sport, age_group, gender, season_type } = req.body

    if (!school_id || !name || !sport) {
      return res.status(400).json({ error: 'school_id, name, and sport are required' })
    }

    const result = await pool.query(
      `INSERT INTO teams (id, name, school_id, sport, age_group, gender, season_type, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [uuidv4(), name, school_id, sport, age_group || null,
       gender || 'mixed', season_type || 'year_round', req.user.id]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Onboarding team creation error:', error)
    res.status(500).json({ error: 'Failed to create team' })
  }
})

// GET /status - Check onboarding status for the current user
router.get('/status', async (req, res) => {
  try {
    // Check if user has a school
    const schoolResult = await pool.query(
      `SELECT s.id, s.name, s.slug
       FROM school_members sm
       JOIN schools s ON sm.school_id = s.id
       WHERE sm.user_id = $1
       ORDER BY sm.joined_at ASC
       LIMIT 1`,
      [req.user.id]
    )

    if (schoolResult.rows.length === 0) {
      return res.json({ hasSchool: false, step: 'school' })
    }

    const school = schoolResult.rows[0]

    // Check if school has teachers (besides the creator)
    const teacherCount = await pool.query(
      `SELECT COUNT(*) FROM school_members WHERE school_id = $1 AND user_id != $2`,
      [school.id, req.user.id]
    )

    // Check if school has pupils
    const pupilCount = await pool.query(
      `SELECT COUNT(*) FROM pupils p JOIN teams t ON p.team_id = t.id WHERE t.school_id = $1`,
      [school.id]
    )

    // Check if school has teams (besides School Pool)
    const teamCount = await pool.query(
      `SELECT COUNT(*) FROM teams WHERE school_id = $1 AND name != 'School Pool'`,
      [school.id]
    )

    res.json({
      hasSchool: true,
      school,
      teachers: parseInt(teacherCount.rows[0].count),
      pupils: parseInt(pupilCount.rows[0].count),
      teams: parseInt(teamCount.rows[0].count),
      complete: parseInt(pupilCount.rows[0].count) > 0,
    })
  } catch (error) {
    console.error('Onboarding status error:', error)
    res.status(500).json({ error: 'Failed to check status' })
  }
})

export default router
