import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.use(authenticateToken)

// GET /strands - Get curriculum strands for a key stage
router.get('/strands', async (req, res) => {
  try {
    const { key_stage } = req.query
    const ks = key_stage || 'KS3'

    const result = await pool.query(
      `SELECT * FROM curriculum_strands
       WHERE (school_id IS NULL OR school_id = $1) AND key_stage = $2
       ORDER BY display_order ASC`,
      [req.user.school_id || null, ks]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error loading curriculum strands:', error)
    res.status(500).json({ error: 'Failed to load curriculum strands' })
  }
})

// GET /criteria/:strandId - Get assessment criteria for a strand
router.get('/criteria/:strandId', async (req, res) => {
  try {
    const { sport } = req.query

    let query = 'SELECT * FROM assessment_criteria WHERE strand_id = $1'
    const params = [req.params.strandId]

    if (sport) {
      query += ' AND (sport IS NULL OR sport = $2)'
      params.push(sport)
    }

    query += ' ORDER BY display_order ASC'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Error loading assessment criteria:', error)
    res.status(500).json({ error: 'Failed to load criteria' })
  }
})

// GET /unit/:unitId - Get all assessments for a sport unit (grid view)
router.get('/unit/:unitId', async (req, res) => {
  try {
    const { unitId } = req.params

    // Get the unit and its teaching group
    const unitResult = await pool.query(
      `SELECT su.*, tg.key_stage, tg.year_group
       FROM sport_units su
       JOIN teaching_groups tg ON su.teaching_group_id = tg.id
       WHERE su.id = $1`,
      [unitId]
    )

    if (unitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sport unit not found' })
    }

    const unit = unitResult.rows[0]

    // Get pupils in this teaching group
    const pupilsResult = await pool.query(
      `SELECT p.id, p.first_name, p.last_name
       FROM teaching_group_pupils tgp
       JOIN pupils p ON tgp.pupil_id = p.id
       WHERE tgp.teaching_group_id = $1
       ORDER BY p.last_name ASC, p.first_name ASC`,
      [unit.teaching_group_id]
    )

    // Get curriculum strands for this key stage
    const strandsResult = await pool.query(
      `SELECT * FROM curriculum_strands
       WHERE (school_id IS NULL) AND key_stage = $1
       ORDER BY display_order ASC`,
      [unit.key_stage]
    )

    // Get existing assessments for this unit
    const assessmentsResult = await pool.query(
      `SELECT pa.*, cs.strand_name
       FROM pupil_assessments pa
       LEFT JOIN assessment_criteria ac ON pa.criteria_id = ac.id
       LEFT JOIN curriculum_strands cs ON ac.strand_id = cs.id
       WHERE pa.unit_id = $1
       ORDER BY pa.pupil_id, pa.assessed_at DESC`,
      [unitId]
    )

    res.json({
      unit,
      pupils: pupilsResult.rows,
      strands: strandsResult.rows,
      assessments: assessmentsResult.rows,
    })
  } catch (error) {
    console.error('Error loading unit assessments:', error)
    res.status(500).json({ error: 'Failed to load assessments' })
  }
})

// POST / - Record an assessment (single pupil, single strand/criteria)
router.post('/', requireRole('manager', 'assistant', 'scout'), async (req, res) => {
  try {
    const { pupil_id, unit_id, criteria_id, assessment_type, grade, score, teacher_notes } = req.body

    if (!pupil_id || !unit_id) {
      return res.status(400).json({ error: 'pupil_id and unit_id are required' })
    }

    const result = await pool.query(
      `INSERT INTO pupil_assessments (pupil_id, unit_id, criteria_id, assessment_type, grade, score, teacher_notes, assessed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [pupil_id, unit_id, criteria_id || null, assessment_type || 'formative', grade || null, score || null, teacher_notes || null, req.user.id]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error recording assessment:', error)
    res.status(500).json({ error: 'Failed to record assessment' })
  }
})

// POST /batch - Record assessments for multiple pupils at once
router.post('/batch', requireRole('manager', 'assistant', 'scout'), async (req, res) => {
  try {
    const { assessments } = req.body

    if (!assessments || !Array.isArray(assessments) || assessments.length === 0) {
      return res.status(400).json({ error: 'assessments array is required' })
    }

    const results = []
    for (const a of assessments) {
      const result = await pool.query(
        `INSERT INTO pupil_assessments (pupil_id, unit_id, criteria_id, assessment_type, grade, score, teacher_notes, assessed_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [a.pupil_id, a.unit_id, a.criteria_id || null, a.assessment_type || 'formative', a.grade || null, a.score || null, a.teacher_notes || null, req.user.id]
      )
      results.push(result.rows[0])
    }

    res.status(201).json({ recorded: results.length, assessments: results })
  } catch (error) {
    console.error('Error recording batch assessments:', error)
    res.status(500).json({ error: 'Failed to record assessments' })
  }
})

// PUT /:id - Update an assessment
router.put('/:id', requireRole('manager', 'assistant', 'scout'), async (req, res) => {
  try {
    const { grade, score, teacher_notes } = req.body

    const result = await pool.query(
      `UPDATE pupil_assessments
       SET grade = COALESCE($1, grade),
           score = COALESCE($2, score),
           teacher_notes = COALESCE($3, teacher_notes),
           assessed_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [grade, score, teacher_notes, req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating assessment:', error)
    res.status(500).json({ error: 'Failed to update assessment' })
  }
})

// GET /pupil/:pupilId - Get all assessments for a pupil (cross-sport view)
router.get('/pupil/:pupilId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pa.*, su.sport, su.unit_name, su.curriculum_area,
              cs.strand_name, tg.name AS class_name, tg.year_group
       FROM pupil_assessments pa
       JOIN sport_units su ON pa.unit_id = su.id
       JOIN teaching_groups tg ON su.teaching_group_id = tg.id
       LEFT JOIN assessment_criteria ac ON pa.criteria_id = ac.id
       LEFT JOIN curriculum_strands cs ON ac.strand_id = cs.id
       WHERE pa.pupil_id = $1
       ORDER BY pa.assessed_at DESC`,
      [req.params.pupilId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error loading pupil assessments:', error)
    res.status(500).json({ error: 'Failed to load assessments' })
  }
})

// GET /dashboard - Teacher dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const teacherId = req.user.id

    // Count teaching groups
    const classesResult = await pool.query(
      'SELECT COUNT(*) FROM teaching_groups WHERE teacher_id = $1',
      [teacherId]
    )

    // Count total pupils across all teaching groups
    const pupilsResult = await pool.query(
      `SELECT COUNT(DISTINCT tgp.pupil_id)
       FROM teaching_group_pupils tgp
       JOIN teaching_groups tg ON tgp.teaching_group_id = tg.id
       WHERE tg.teacher_id = $1`,
      [teacherId]
    )

    // Count sport units
    const unitsResult = await pool.query(
      `SELECT COUNT(*)
       FROM sport_units su
       JOIN teaching_groups tg ON su.teaching_group_id = tg.id
       WHERE tg.teacher_id = $1`,
      [teacherId]
    )

    // Count assessments recorded this term
    const assessmentsResult = await pool.query(
      `SELECT COUNT(*)
       FROM pupil_assessments pa
       WHERE pa.assessed_by = $1
         AND pa.assessed_at > NOW() - INTERVAL '3 months'`,
      [teacherId]
    )

    // Recent teaching groups with their current units
    const recentGroupsResult = await pool.query(
      `SELECT tg.*,
        (SELECT COUNT(*) FROM teaching_group_pupils tgp WHERE tgp.teaching_group_id = tg.id) AS pupil_count,
        (SELECT json_agg(json_build_object('id', su.id, 'sport', su.sport, 'unit_name', su.unit_name, 'term', su.term))
         FROM sport_units su WHERE su.teaching_group_id = tg.id) AS units
       FROM teaching_groups tg
       WHERE tg.teacher_id = $1
       ORDER BY tg.updated_at DESC
       LIMIT 5`,
      [teacherId]
    )

    res.json({
      stats: {
        classes: parseInt(classesResult.rows[0].count),
        pupils: parseInt(pupilsResult.rows[0].count),
        units: parseInt(unitsResult.rows[0].count),
        assessments_this_term: parseInt(assessmentsResult.rows[0].count),
      },
      recent_groups: recentGroupsResult.rows,
    })
  } catch (error) {
    console.error('Error loading dashboard:', error)
    res.status(500).json({ error: 'Failed to load dashboard' })
  }
})

// GET /pupil-dictionary - Teacher-scoped pupil name dictionary for AI context
// Returns all pupils the teacher has access to (via teaching groups and teams)
// with first name, last name, and nicknames for name matching.
router.get('/pupil-dictionary', async (req, res) => {
  try {
    const teacherId = req.user.id

    // Pupils from teaching groups
    const classResult = await pool.query(
      `SELECT DISTINCT p.id, p.first_name, p.last_name, p.nicknames, p.year_group,
              tg.name AS group_name
       FROM teaching_group_pupils tgp
       JOIN pupils p ON tgp.pupil_id = p.id
       JOIN teaching_groups tg ON tgp.teaching_group_id = tg.id
       WHERE tg.teacher_id = $1 AND p.is_active = true`,
      [teacherId]
    )

    // Pupils from teams the teacher coaches
    const teamResult = await pool.query(
      `SELECT DISTINCT p.id, p.first_name, p.last_name, p.nicknames, p.year_group,
              t.name AS team_name
       FROM pupils p
       JOIN teams t ON p.team_id = t.id
       LEFT JOIN team_memberships tm ON tm.team_id = t.id AND tm.user_id = $1
       WHERE (t.owner_id = $1 OR (tm.user_id = $1 AND tm.role IN ('manager', 'assistant', 'scout')))
         AND p.is_active = true`,
      [teacherId]
    )

    // Merge and deduplicate by pupil ID
    const pupilMap = new Map()
    for (const p of [...classResult.rows, ...teamResult.rows]) {
      if (!pupilMap.has(p.id)) {
        pupilMap.set(p.id, {
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          nicknames: p.nicknames || [],
          year_group: p.year_group,
          contexts: [],
        })
      }
      const entry = pupilMap.get(p.id)
      if (p.group_name && !entry.contexts.includes(p.group_name)) entry.contexts.push(p.group_name)
      if (p.team_name && !entry.contexts.includes(p.team_name)) entry.contexts.push(p.team_name)
    }

    res.json({
      teacher_id: teacherId,
      pupil_count: pupilMap.size,
      pupils: Array.from(pupilMap.values()),
    })
  } catch (error) {
    console.error('Error loading pupil dictionary:', error)
    res.status(500).json({ error: 'Failed to load pupil dictionary' })
  }
})

export default router
