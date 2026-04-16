import express from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { v4 as uuidv4 } from 'uuid'

const router = express.Router()
router.use(authenticateToken)

// Helper to get the user's school_id
async function getUserSchoolId(userId) {
  const result = await pool.query(
    `SELECT school_id FROM school_members WHERE user_id = $1 ORDER BY joined_at ASC LIMIT 1`,
    [userId]
  )
  return result.rows[0]?.school_id || null
}

// GET / - List all pupils for the school with search and filters
router.get('/', async (req, res) => {
  try {
    const schoolId = await getUserSchoolId(req.user.id)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })

    const { search, year_group, house, sport, limit: lim, offset: off } = req.query
    const limit = Math.min(parseInt(lim) || 50, 200)
    const offset = parseInt(off) || 0

    // Derive first_name/last_name from the guaranteed 'name' column
    let query = `
      SELECT p.id,
             split_part(COALESCE(p.name, ''), ' ', 1) AS first_name,
             CASE WHEN position(' ' in COALESCE(p.name, '')) > 0
                  THEN substring(COALESCE(p.name, '') from position(' ' in COALESCE(p.name, '')) + 1)
                  ELSE '' END AS last_name,
             p.name,
             p.year_group, p.house,
             p.date_of_birth, p.is_active, p.created_at,
             t.name AS team_name, t.sport AS team_sport,
             (SELECT json_agg(DISTINCT su.sport)
              FROM teaching_group_pupils tgp
              JOIN teaching_groups tg ON tgp.teaching_group_id = tg.id
              JOIN sport_units su ON su.teaching_group_id = tg.id
              WHERE tgp.pupil_id = p.id) AS curriculum_sports,
             (SELECT COUNT(*) FROM pupil_assessments pa WHERE pa.pupil_id = p.id) AS assessment_count
      FROM pupils p
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE p.is_active = true
        AND (t.school_id = $1 OR p.id IN (
          SELECT tgp2.pupil_id FROM teaching_group_pupils tgp2
          JOIN teaching_groups tg2 ON tgp2.teaching_group_id = tg2.id
          WHERE tg2.school_id = $1
        ))`

    const params = [schoolId]
    let paramIndex = 2

    if (search) {
      query += ` AND p.name ILIKE $${paramIndex}`
      params.push(`%${search}%`)
      paramIndex++
    }

    if (year_group) {
      query += ` AND p.year_group = $${paramIndex}`
      params.push(parseInt(year_group))
      paramIndex++
    }

    if (house) {
      query += ` AND p.house ILIKE $${paramIndex}`
      params.push(house)
      paramIndex++
    }

    // Count total before pagination
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS _count`
    const countResult = await pool.query(countQuery, params)

    query += ` ORDER BY p.year_group ASC, p.name ASC`
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const result = await pool.query(query, params)

    res.json({
      pupils: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error listing pupils:', error)
    res.status(500).json({ error: 'Failed to load pupils' })
  }
})

// GET /stats - Pupil statistics for the school
router.get('/stats', async (req, res) => {
  try {
    const schoolId = await getUserSchoolId(req.user.id)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })

    const [totalResult, yearResult, houseResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FROM pupils p JOIN teams t ON p.team_id = t.id WHERE t.school_id = $1 AND p.is_active = true`,
        [schoolId]
      ),
      pool.query(
        `SELECT p.year_group, COUNT(*) as count
         FROM pupils p JOIN teams t ON p.team_id = t.id
         WHERE t.school_id = $1 AND p.is_active = true AND p.year_group IS NOT NULL
         GROUP BY p.year_group ORDER BY p.year_group ASC`,
        [schoolId]
      ),
      pool.query(
        `SELECT p.house, COUNT(*) as count
         FROM pupils p JOIN teams t ON p.team_id = t.id
         WHERE t.school_id = $1 AND p.is_active = true AND p.house IS NOT NULL AND p.house != ''
         GROUP BY p.house ORDER BY p.house ASC`,
        [schoolId]
      ),
    ])

    res.json({
      total: parseInt(totalResult.rows[0].count),
      by_year_group: yearResult.rows.map(r => ({ year_group: r.year_group, count: parseInt(r.count) })),
      by_house: houseResult.rows.map(r => ({ house: r.house, count: parseInt(r.count) })),
    })
  } catch (error) {
    console.error('Error loading pupil stats:', error)
    res.status(500).json({ error: 'Failed to load stats' })
  }
})

// GET /:id/profile - Get full pupil profile with cross-sport data
router.get('/:id/profile', async (req, res) => {
  try {
    const { id } = req.params

    // Pupil details
    const pupilResult = await pool.query(
      `SELECT p.*,
              split_part(COALESCE(p.name, ''), ' ', 1) AS first_name,
              CASE WHEN position(' ' in COALESCE(p.name, '')) > 0
                   THEN substring(COALESCE(p.name, '') from position(' ' in COALESCE(p.name, '')) + 1)
                   ELSE '' END AS last_name,
              t.name AS team_name, t.sport AS team_sport
       FROM pupils p
       LEFT JOIN teams t ON p.team_id = t.id
       WHERE p.id = $1`,
      [id]
    )

    if (pupilResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pupil not found' })
    }

    const pupil = pupilResult.rows[0]

    // Each sub-query wrapped so one failure doesn't break the whole profile
    let classes = [], assessments = [], teams = [], sports = []

    try {
      const r = await pool.query(
        `SELECT tg.id, tg.name, tg.year_group, tg.key_stage,
                u.name AS teacher_name,
                (SELECT json_agg(json_build_object('id', su.id, 'sport', su.sport, 'unit_name', su.unit_name, 'term', su.term))
                 FROM sport_units su WHERE su.teaching_group_id = tg.id) AS units
         FROM teaching_group_pupils tgp
         JOIN teaching_groups tg ON tgp.teaching_group_id = tg.id
         LEFT JOIN users u ON tg.teacher_id = u.id
         WHERE tgp.pupil_id = $1
         ORDER BY tg.year_group ASC`, [id])
      classes = r.rows
    } catch (e) { console.warn('Profile classes query failed:', e.message) }

    try {
      const r = await pool.query(
        `SELECT pa.*, su.sport, su.unit_name, su.curriculum_area
         FROM pupil_assessments pa
         JOIN sport_units su ON pa.unit_id = su.id
         WHERE pa.pupil_id = $1
         ORDER BY pa.assessed_at DESC LIMIT 30`, [id])
      assessments = r.rows
    } catch (e) { console.warn('Profile assessments query failed:', e.message) }

    try {
      const r = await pool.query(
        `SELECT t.id, t.name, t.sport, t.age_group, t.gender
         FROM team_memberships tm
         JOIN teams t ON tm.team_id = t.id
         WHERE tm.pupil_id = $1`, [id])
      teams = r.rows
    } catch (e) { console.warn('Profile teams query failed:', e.message) }

    try {
      const r = await pool.query(`SELECT * FROM pupil_sports WHERE pupil_id = $1`, [id])
      sports = r.rows
    } catch (e) { /* pupil_sports table may not exist - not critical */ }

    res.json({ pupil, classes, assessments, teams, sports })
  } catch (error) {
    console.error('Error loading pupil profile:', error)
    res.status(500).json({ error: 'Failed to load profile' })
  }
})

// PUT /:id - Update a pupil's details
router.put('/:id', async (req, res) => {
  try {
    const { first_name, last_name, year_group, house, date_of_birth, nicknames } = req.body

    const result = await pool.query(
      `UPDATE pupils SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        year_group = COALESCE($3, year_group),
        house = COALESCE($4, house),
        date_of_birth = COALESCE($5, date_of_birth),
        nicknames = COALESCE($6, nicknames)
       WHERE id = $7
       RETURNING *`,
      [first_name, last_name, year_group, house, date_of_birth, nicknames || null, req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pupil not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating pupil:', error)
    res.status(500).json({ error: 'Failed to update pupil' })
  }
})

// POST / - Create a single pupil
router.post('/', async (req, res) => {
  try {
    const schoolId = await getUserSchoolId(req.user.id)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })

    const { first_name, last_name, year_group, house, date_of_birth } = req.body

    if (!first_name) {
      return res.status(400).json({ error: 'First name is required' })
    }

    // Find the School Pool team
    let poolResult = await pool.query(
      `SELECT id FROM teams WHERE school_id = $1 AND name = 'School Pool'`,
      [schoolId]
    )

    let teamId
    if (poolResult.rows.length > 0) {
      teamId = poolResult.rows[0].id
    } else {
      const newTeam = await pool.query(
        `INSERT INTO teams (id, name, school_id, sport, age_group, owner_id)
         VALUES ($1, 'School Pool', $2, 'football', 'All', $3) RETURNING id`,
        [uuidv4(), schoolId, req.user.id]
      )
      teamId = newTeam.rows[0].id
    }

    const result = await pool.query(
      `INSERT INTO pupils (id, first_name, last_name, team_id, year_group, house, date_of_birth, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING *`,
      [uuidv4(), first_name, last_name || '', teamId, year_group || null, house || null, date_of_birth || null]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating pupil:', error)
    res.status(500).json({ error: 'Failed to create pupil' })
  }
})

export default router
