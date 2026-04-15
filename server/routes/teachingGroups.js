import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

// GET / - List teaching groups for the current teacher
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tg.*,
        (SELECT COUNT(*) FROM teaching_group_pupils tgp WHERE tgp.teaching_group_id = tg.id) AS pupil_count,
        (SELECT COUNT(*) FROM sport_units su WHERE su.teaching_group_id = tg.id) AS unit_count,
        (SELECT json_agg(json_build_object('id', su.id, 'sport', su.sport, 'unit_name', su.unit_name, 'term', su.term))
         FROM sport_units su WHERE su.teaching_group_id = tg.id) AS units
       FROM teaching_groups tg
       WHERE tg.teacher_id = $1
       ORDER BY tg.year_group ASC, tg.name ASC`,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Error listing teaching groups:', error)
    res.status(500).json({ error: 'Failed to load teaching groups' })
  }
})

// POST / - Create a new teaching group
router.post('/', requireRole('manager', 'assistant', 'scout'), async (req, res) => {
  try {
    const { name, year_group, group_identifier, academic_year, key_stage, school_id } = req.body

    if (!name || !year_group || !academic_year) {
      return res.status(400).json({ error: 'Name, year group, and academic year are required' })
    }

    // Auto-derive key stage from year group if not provided
    let ks = key_stage
    if (!ks) {
      if (year_group >= 7 && year_group <= 9) ks = 'KS3'
      else if (year_group >= 10 && year_group <= 11) ks = 'KS4'
      else ks = 'KS5'
    }

    const result = await pool.query(
      `INSERT INTO teaching_groups (name, year_group, group_identifier, teacher_id, academic_year, key_stage, school_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, year_group, group_identifier || null, req.user.id, academic_year, ks, school_id || null]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating teaching group:', error)
    res.status(500).json({ error: 'Failed to create teaching group' })
  }
})

// GET /:id - Get a single teaching group with pupils and units
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const groupResult = await pool.query(
      'SELECT * FROM teaching_groups WHERE id = $1',
      [id]
    )

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Teaching group not found' })
    }

    const group = groupResult.rows[0]

    // Get pupils in this group
    const pupilsResult = await pool.query(
      `SELECT p.id, p.first_name, p.last_name, p.year_group, p.house,
              tgp.created_at AS joined_at
       FROM teaching_group_pupils tgp
       JOIN pupils p ON tgp.pupil_id = p.id
       WHERE tgp.teaching_group_id = $1
       ORDER BY p.last_name ASC, p.first_name ASC`,
      [id]
    )

    // Get sport units
    const unitsResult = await pool.query(
      `SELECT * FROM sport_units
       WHERE teaching_group_id = $1
       ORDER BY display_order ASC, start_date ASC`,
      [id]
    )

    res.json({
      ...group,
      pupils: pupilsResult.rows,
      units: unitsResult.rows,
    })
  } catch (error) {
    console.error('Error loading teaching group:', error)
    res.status(500).json({ error: 'Failed to load teaching group' })
  }
})

// PUT /:id - Update a teaching group
router.put('/:id', requireRole('manager', 'assistant', 'scout'), async (req, res) => {
  try {
    const { id } = req.params
    const { name, year_group, group_identifier, key_stage } = req.body

    const result = await pool.query(
      `UPDATE teaching_groups
       SET name = COALESCE($1, name),
           year_group = COALESCE($2, year_group),
           group_identifier = COALESCE($3, group_identifier),
           key_stage = COALESCE($4, key_stage),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, year_group, group_identifier, key_stage, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teaching group not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating teaching group:', error)
    res.status(500).json({ error: 'Failed to update teaching group' })
  }
})

// DELETE /:id - Delete a teaching group
router.delete('/:id', requireRole('manager', 'assistant', 'scout'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM teaching_groups WHERE id = $1 RETURNING id',
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teaching group not found' })
    }

    res.json({ message: 'Teaching group deleted' })
  } catch (error) {
    console.error('Error deleting teaching group:', error)
    res.status(500).json({ error: 'Failed to delete teaching group' })
  }
})

// POST /:id/pupils - Add pupils to a teaching group
router.post('/:id/pupils', requireRole('manager', 'assistant', 'scout'), async (req, res) => {
  try {
    const { id } = req.params
    const { pupil_ids } = req.body

    if (!pupil_ids || !Array.isArray(pupil_ids) || pupil_ids.length === 0) {
      return res.status(400).json({ error: 'pupil_ids array is required' })
    }

    const added = []
    for (const pupilId of pupil_ids) {
      try {
        const result = await pool.query(
          `INSERT INTO teaching_group_pupils (teaching_group_id, pupil_id)
           VALUES ($1, $2)
           ON CONFLICT (teaching_group_id, pupil_id) DO NOTHING
           RETURNING *`,
          [id, pupilId]
        )
        if (result.rows.length > 0) added.push(result.rows[0])
      } catch (e) {
        // Skip individual failures (e.g., invalid pupil_id)
        console.warn(`Failed to add pupil ${pupilId} to group ${id}:`, e.message)
      }
    }

    res.status(201).json({ added: added.length, total_requested: pupil_ids.length })
  } catch (error) {
    console.error('Error adding pupils to group:', error)
    res.status(500).json({ error: 'Failed to add pupils' })
  }
})

// DELETE /:id/pupils/:pupilId - Remove a pupil from a teaching group
router.delete('/:id/pupils/:pupilId', requireRole('manager', 'assistant', 'scout'), async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM teaching_group_pupils WHERE teaching_group_id = $1 AND pupil_id = $2',
      [req.params.id, req.params.pupilId]
    )
    res.json({ message: 'Pupil removed from group' })
  } catch (error) {
    console.error('Error removing pupil from group:', error)
    res.status(500).json({ error: 'Failed to remove pupil' })
  }
})

// POST /:id/units - Add a sport unit to a teaching group
router.post('/:id/units', requireRole('manager', 'assistant', 'scout'), async (req, res) => {
  try {
    const { id } = req.params
    const { sport, unit_name, curriculum_area, start_date, end_date, term, lesson_count } = req.body

    if (!sport || !unit_name || !curriculum_area) {
      return res.status(400).json({ error: 'Sport, unit name, and curriculum area are required' })
    }

    // Get next display order
    const orderResult = await pool.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM sport_units WHERE teaching_group_id = $1',
      [id]
    )

    const result = await pool.query(
      `INSERT INTO sport_units (teaching_group_id, sport, unit_name, curriculum_area, start_date, end_date, term, lesson_count, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, sport, unit_name, curriculum_area, start_date || null, end_date || null, term || null, lesson_count || null, orderResult.rows[0].next_order]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error adding sport unit:', error)
    res.status(500).json({ error: 'Failed to add sport unit' })
  }
})

// PUT /:id/units/:unitId - Update a sport unit
router.put('/:id/units/:unitId', requireRole('manager', 'assistant', 'scout'), async (req, res) => {
  try {
    const { unitId } = req.params
    const { sport, unit_name, curriculum_area, start_date, end_date, term, lesson_count } = req.body

    const result = await pool.query(
      `UPDATE sport_units
       SET sport = COALESCE($1, sport),
           unit_name = COALESCE($2, unit_name),
           curriculum_area = COALESCE($3, curriculum_area),
           start_date = COALESCE($4, start_date),
           end_date = COALESCE($5, end_date),
           term = COALESCE($6, term),
           lesson_count = COALESCE($7, lesson_count),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [sport, unit_name, curriculum_area, start_date, end_date, term, lesson_count, unitId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sport unit not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating sport unit:', error)
    res.status(500).json({ error: 'Failed to update sport unit' })
  }
})

// DELETE /:id/units/:unitId - Delete a sport unit
router.delete('/:id/units/:unitId', requireRole('manager', 'assistant', 'scout'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM sport_units WHERE id = $1 AND teaching_group_id = $2 RETURNING id',
      [req.params.unitId, req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sport unit not found' })
    }

    res.json({ message: 'Sport unit deleted' })
  } catch (error) {
    console.error('Error deleting sport unit:', error)
    res.status(500).json({ error: 'Failed to delete sport unit' })
  }
})

export default router
