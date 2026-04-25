import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

router.get('/:matchId', authenticateToken, async (req, res, next) => {
  try {
    const { matchId } = req.params
    const travel = await pool.query('SELECT * FROM fixture_travel WHERE match_id = $1', [matchId])
    const assignments = await pool.query(
      `SELECT ta.*, p.name AS pupil_name
       FROM travel_assignments ta
       JOIN pupils p ON p.id = ta.pupil_id
       WHERE ta.match_id = $1 ORDER BY p.name`,
      [matchId]
    )
    res.json({
      travel: travel.rows[0] || null,
      assignments: assignments.rows,
    })
  } catch (error) { next(error) }
})

router.put('/:matchId', authenticateToken, async (req, res, next) => {
  try {
    const { matchId } = req.params
    const { transportMode, departureLocation, departureTime, returnTime,
            contactPhone, specialInstructions, coordinatorNotes, parentLiftsRequested } = req.body

    const result = await pool.query(
      `INSERT INTO fixture_travel (match_id, transport_mode, departure_location, departure_time,
        return_time, contact_phone, special_instructions, coordinator_notes, parent_lifts_requested)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (match_id) DO UPDATE SET
        transport_mode = COALESCE($2, fixture_travel.transport_mode),
        departure_location = $3, departure_time = $4, return_time = $5,
        contact_phone = $6, special_instructions = $7, coordinator_notes = $8,
        parent_lifts_requested = COALESCE($9, fixture_travel.parent_lifts_requested),
        updated_at = NOW()
       RETURNING *`,
      [matchId, transportMode || 'school_coach', departureLocation, departureTime,
       returnTime, contactPhone, specialInstructions, coordinatorNotes, parentLiftsRequested || false]
    )
    res.json(result.rows[0])
  } catch (error) { next(error) }
})

router.put('/:matchId/assignments', authenticateToken, async (req, res, next) => {
  try {
    const { matchId } = req.params
    const { assignments } = req.body
    if (!Array.isArray(assignments)) return res.status(400).json({ error: 'assignments array required' })

    await pool.query('DELETE FROM travel_assignments WHERE match_id = $1', [matchId])
    for (const a of assignments) {
      await pool.query(
        `INSERT INTO travel_assignments (match_id, pupil_id, transport_mode, driver_name, driver_capacity, notes)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (match_id, pupil_id) DO NOTHING`,
        [matchId, a.pupilId, a.transportMode || 'team', a.driverName, a.driverCapacity, a.notes]
      )
    }
    const result = await pool.query(
      `SELECT ta.*, p.name AS pupil_name FROM travel_assignments ta
       JOIN pupils p ON p.id = ta.pupil_id WHERE ta.match_id = $1 ORDER BY p.name`,
      [matchId]
    )
    res.json(result.rows)
  } catch (error) { next(error) }
})

export default router
