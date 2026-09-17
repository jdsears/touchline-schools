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

const INVITABLE_ROLES = new Set(['teacher', 'coach', 'head_of_sport', 'head_of_pe'])
const LEADERSHIP_ROLES = new Set(['owner', 'school_admin', 'admin', 'head_of_pe', 'head_of_sport'])

// The wizard takes school_id from the request body, so every mutating step
// must prove the caller actually leads that school — otherwise any signed-in
// account could import pupils into, or invite itself into, any school.
async function requireSchoolLeadership(req, res, schoolId) {
  if (!schoolId) {
    res.status(400).json({ error: 'school_id is required' })
    return false
  }
  if (req.user.is_admin) return true
  const m = await pool.query(
    `SELECT COALESCE(school_role, role) AS role FROM school_members
     WHERE school_id = $1 AND user_id = $2 LIMIT 1`,
    [schoolId, req.user.id]
  )
  if (!m.rows[0] || !LEADERSHIP_ROLES.has(m.rows[0].role)) {
    res.status(403).json({ error: 'You must be a leader of this school to do that' })
    return false
  }
  return true
}

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
       primary_color || '#1a365d', secondary_color || '#C9A961']
    )

    const school = result.rows[0]

    // Add creator as owner. Only columns that exist on every deployment —
    // the club-era capability flags this used to insert don't exist on
    // freshly-bootstrapped databases and made school creation fail there.
    await pool.query(
      `INSERT INTO school_members (school_id, user_id, role, school_role,
         can_view_all_classes, can_view_all_teams, can_manage_curriculum,
         can_view_reports, can_manage_safeguarding, joined_at)
       VALUES ($1, $2, 'owner', 'owner', true, true, true, true, true, NOW())
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
    if (!(await requireSchoolLeadership(req, res, school_id))) return

    const schoolRes = await pool.query('SELECT name FROM schools WHERE id = $1', [school_id])
    const schoolName = schoolRes.rows[0]?.name || 'your school'
    const frontendUrl = getFrontendUrl()

    const invited = []
    for (const teacher of teachers) {
      if (!teacher.email) continue

      const email = teacher.email.trim().toLowerCase()
      const name = teacher.name?.trim() || email.split('@')[0]
      const role = INVITABLE_ROLES.has(teacher.role) ? teacher.role : 'teacher'

      // Check if user already exists
      let userId
      const existingUser = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [email])

      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id
      } else {
        // Placeholder account: no usable password until they follow the
        // invite link (magic sign-in) and set one from their profile.
        const tempPassword = await bcrypt.hash(uuidv4(), 10)
        const newUser = await pool.query(
          `INSERT INTO users (id, email, name, password_hash, role, has_completed_onboarding)
           VALUES ($1, $2, $3, $4, 'manager', true)
           RETURNING id`,
          [uuidv4(), email, name, tempPassword]
        )
        userId = newUser.rows[0].id
      }

      // A long-lived magic sign-in token doubles as the invite link, so the
      // teacher lands signed in with zero password friction.
      const inviteToken = uuidv4()
      await pool.query(
        `UPDATE users SET magic_link_token = $1, magic_link_expires = NOW() + INTERVAL '7 days' WHERE id = $2`,
        [inviteToken, userId]
      )
      const inviteLink = `${frontendUrl}/magic/${inviteToken}`

      // Add as school member (same safe column set as school creation)
      await pool.query(
        `INSERT INTO school_members (school_id, user_id, role, school_role, can_view_reports, joined_at)
         VALUES ($1, $2, $3, $3, true, NOW())
         ON CONFLICT (school_id, user_id) DO UPDATE SET role = EXCLUDED.role, school_role = EXCLUDED.school_role`,
        [school_id, userId, role]
      )

      let emailSent = false
      if (isEmailEnabled()) {
        const sent = await sendTeamInviteEmail(email, {
          teamName: schoolName,
          inviterName: req.user.name || 'A colleague',
          role,
          inviteLink,
        }).catch(() => ({ success: false }))
        emailSent = !!sent?.success
      }

      invited.push({ email, name, role, invite_link: inviteLink, email_sent: emailSent })
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
    if (!(await requireSchoolLeadership(req, res, school_id))) return

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

    // Existing roster for this school, so re-importing the same export (the
    // most common real-world action) skips rather than duplicates.
    const existingRes = await pool.query(
      `SELECT LOWER(p.name) AS name, p.year_group FROM pupils p
       LEFT JOIN teams t ON t.id = p.team_id
       WHERE p.is_active = true AND (t.school_id = $1 OR p.school_id = $1)`,
      [school_id]
    )
    const seen = new Set(existingRes.rows.map(r => `${r.name}|${r.year_group ?? ''}`))

    const created = []
    const skipped = []
    let duplicates = 0

    for (const row of rows) {
      const firstName = mapField(row, 'first_name', 'firstname', 'first', 'forename', 'given_name')
      const lastName = mapField(row, 'last_name', 'lastname', 'last', 'surname', 'family_name')
      // Whole-name column fallback ("name" / "pupil name" / "full name")
      const wholeName = mapField(row, 'name', 'pupil_name', 'full_name', 'student_name')

      let first = firstName
      let last = lastName
      if (!first && !last && wholeName) {
        const parts = wholeName.trim().split(/\s+/)
        first = parts[0]
        last = parts.slice(1).join(' ')
      }

      if (!first && !last) {
        skipped.push({ row, reason: 'No name found' })
        continue
      }

      // pupils.name is NOT NULL and is what every list/profile renders —
      // it must always be written alongside the split fields.
      const fullName = [first, last].filter(Boolean).join(' ').trim()
      const yearGroup = parseInt(mapField(row, 'year_group', 'year', 'yeargroup', 'form') || '0') || null

      const dedupeKey = `${fullName.toLowerCase()}|${yearGroup ?? ''}`
      if (seen.has(dedupeKey)) {
        duplicates++
        continue
      }
      seen.add(dedupeKey)

      const house = mapField(row, 'house', 'house_name')
      const dobRaw = mapField(row, 'dob', 'date_of_birth', 'dateofbirth', 'birthday')
      const dob = dobRaw && !Number.isNaN(Date.parse(dobRaw)) ? dobRaw : null

      try {
        const result = await pool.query(
          `INSERT INTO pupils (id, name, first_name, last_name, team_id, school_id, year_group, house, date_of_birth, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
           RETURNING id, first_name, last_name, year_group`,
          [uuidv4(), fullName, first || '', last || '', poolTeamId, school_id,
           yearGroup, house || null, dob]
        )
        created.push(result.rows[0])
      } catch (err) {
        skipped.push({ row: fullName, reason: err.message })
      }
    }

    res.status(201).json({
      total_rows: rows.length,
      created: created.length,
      duplicates,
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
    if (!(await requireSchoolLeadership(req, res, school_id))) return

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
