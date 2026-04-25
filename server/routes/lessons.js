import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { generateLessonPlan } from '../services/claudeService.js'

const router = express.Router()

router.use(authenticateToken)

// POST /generate - AI-assisted lesson plan generation
router.post('/generate', requireRole('manager', 'assistant', 'scout'), async (req, res) => {
  try {
    const { teaching_group_id, sport_unit_id, title, duration, learning_objectives, equipment } = req.body

    // Look up context from teaching group and sport unit
    let sport = null, unitName = null, curriculumArea = null
    let yearGroup = null, keyStage = null, pupilCount = null

    if (teaching_group_id) {
      const groupRes = await pool.query(
        `SELECT tg.year_group, tg.key_stage,
                (SELECT COUNT(*) FROM teaching_group_pupils tgp WHERE tgp.teaching_group_id = tg.id) AS pupil_count
         FROM teaching_groups tg WHERE tg.id = $1`,
        [teaching_group_id]
      )
      if (groupRes.rows[0]) {
        yearGroup = groupRes.rows[0].year_group
        keyStage = groupRes.rows[0].key_stage
        pupilCount = groupRes.rows[0].pupil_count
      }
    }

    if (sport_unit_id) {
      const unitRes = await pool.query(
        `SELECT sport, unit_name, curriculum_area FROM sport_units WHERE id = $1`,
        [sport_unit_id]
      )
      if (unitRes.rows[0]) {
        sport = unitRes.rows[0].sport
        unitName = unitRes.rows[0].unit_name
        curriculumArea = unitRes.rows[0].curriculum_area
      }
    }

    const result = await generateLessonPlan({
      sport, unitName, curriculumArea,
      yearGroup, keyStage,
      duration: duration || 60,
      title: title || null,
      learningObjectives: learning_objectives || null,
      pupilCount: pupilCount || null,
      equipmentAvailable: equipment || null,
    })

    res.json(result)
  } catch (error) {
    console.error('Error generating lesson plan:', error)
    res.status(500).json({ error: error.message || 'Failed to generate lesson plan' })
  }
})

// GET / - List lesson plans for the current teacher
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT lp.*,
        tg.name AS teaching_group_name, tg.year_group,
        su.sport, su.unit_name
       FROM lesson_plans lp
       LEFT JOIN teaching_groups tg ON lp.teaching_group_id = tg.id
       LEFT JOIN sport_units su ON lp.sport_unit_id = su.id
       WHERE lp.teacher_id = $1
       ORDER BY lp.lesson_date DESC NULLS LAST, lp.created_at DESC`,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Error listing lesson plans:', error)
    res.status(500).json({ error: 'Failed to load lesson plans' })
  }
})

// POST / - Create a new lesson plan
router.post('/', requireRole('manager', 'assistant', 'scout'), async (req, res) => {
  try {
    const {
      teaching_group_id, sport_unit_id,
      title, lesson_date, duration,
      learning_objectives, activities, equipment,
      differentiation, homework, status,
    } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' })
    }

    const result = await pool.query(
      `INSERT INTO lesson_plans (
        teaching_group_id, sport_unit_id, teacher_id,
        title, lesson_date, duration,
        learning_objectives, activities, equipment,
        differentiation, homework, status,
        created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
       RETURNING *`,
      [
        teaching_group_id || null,
        sport_unit_id || null,
        req.user.id,
        title.trim(),
        lesson_date || null,
        duration || 60,
        learning_objectives || null,
        activities || null,
        equipment || null,
        differentiation || null,
        homework || null,
        status || 'draft',
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating lesson plan:', error)
    res.status(500).json({ error: 'Failed to create lesson plan' })
  }
})

// PUT /:id - Update a lesson plan
router.put('/:id', requireRole('manager', 'assistant', 'scout'), async (req, res) => {
  try {
    const { id } = req.params
    const {
      title, lesson_date, duration,
      learning_objectives, activities, equipment,
      differentiation, homework, status,
      teaching_group_id, sport_unit_id,
    } = req.body

    const result = await pool.query(
      `UPDATE lesson_plans
       SET title = COALESCE($1, title),
           lesson_date = COALESCE($2, lesson_date),
           duration = COALESCE($3, duration),
           learning_objectives = $4,
           activities = $5,
           equipment = $6,
           differentiation = $7,
           homework = $8,
           status = COALESCE($9, status),
           teaching_group_id = COALESCE($10, teaching_group_id),
           sport_unit_id = COALESCE($11, sport_unit_id),
           updated_at = NOW()
       WHERE id = $12 AND teacher_id = $13
       RETURNING *`,
      [
        title || null,
        lesson_date || null,
        duration || null,
        learning_objectives || null,
        activities || null,
        equipment || null,
        differentiation || null,
        homework || null,
        status || null,
        teaching_group_id || null,
        sport_unit_id || null,
        id,
        req.user.id,
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson plan not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating lesson plan:', error)
    res.status(500).json({ error: 'Failed to update lesson plan' })
  }
})

// DELETE /:id - Delete a lesson plan
router.delete('/:id', requireRole('manager', 'assistant', 'scout'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM lesson_plans WHERE id = $1 AND teacher_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson plan not found' })
    }

    res.json({ message: 'Lesson plan deleted' })
  } catch (error) {
    console.error('Error deleting lesson plan:', error)
    res.status(500).json({ error: 'Failed to delete lesson plan' })
  }
})

export default router
