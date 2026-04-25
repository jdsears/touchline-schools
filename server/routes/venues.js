import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

async function getSchoolId(user) {
  const mem = await pool.query(
    `SELECT school_id FROM school_members WHERE user_id = $1 AND status = 'active' LIMIT 1`,
    [user.id]
  )
  if (mem.rows.length) return mem.rows[0].school_id
  if (user.is_admin) {
    const fallback = await pool.query('SELECT id FROM schools ORDER BY created_at ASC LIMIT 1')
    return fallback.rows[0]?.id || null
  }
  return null
}

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const schoolId = await getSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })
    const { includeArchived } = req.query
    const filter = includeArchived ? '' : 'AND v.archived_at IS NULL'
    const result = await pool.query(
      `SELECT v.*, (SELECT COUNT(*) FROM matches m WHERE m.venue_id = v.id) AS fixture_count
       FROM venues v WHERE v.school_id = $1 ${filter} ORDER BY v.is_school_venue DESC, v.name`,
      [schoolId]
    )
    res.json(result.rows)
  } catch (error) { next(error) }
})

router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const schoolId = await getSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })
    const { name, address, postcode, latitude, longitude, parkingNotes,
            changingRoomNotes, pitchLayoutNotes, contactName, contactPhone,
            accessibilityNotes, isSchoolVenue } = req.body
    if (!name) return res.status(400).json({ error: 'Venue name is required' })
    const result = await pool.query(
      `INSERT INTO venues (school_id, name, address, postcode, latitude, longitude,
        parking_notes, changing_room_notes, pitch_layout_notes, contact_name, contact_phone,
        accessibility_notes, is_school_venue)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [schoolId, name, address, postcode, latitude, longitude, parkingNotes,
       changingRoomNotes, pitchLayoutNotes, contactName, contactPhone,
       accessibilityNotes, isSchoolVenue || false]
    )
    res.status(201).json(result.rows[0])
  } catch (error) { next(error) }
})

router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, address, postcode, latitude, longitude, parkingNotes,
            changingRoomNotes, pitchLayoutNotes, contactName, contactPhone,
            accessibilityNotes, isSchoolVenue } = req.body
    const result = await pool.query(
      `UPDATE venues SET name=COALESCE($1,name), address=COALESCE($2,address),
        postcode=COALESCE($3,postcode), latitude=COALESCE($4,latitude),
        longitude=COALESCE($5,longitude), parking_notes=COALESCE($6,parking_notes),
        changing_room_notes=COALESCE($7,changing_room_notes),
        pitch_layout_notes=COALESCE($8,pitch_layout_notes),
        contact_name=COALESCE($9,contact_name), contact_phone=COALESCE($10,contact_phone),
        accessibility_notes=COALESCE($11,accessibility_notes),
        is_school_venue=COALESCE($12,is_school_venue), updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [name, address, postcode, latitude, longitude, parkingNotes,
       changingRoomNotes, pitchLayoutNotes, contactName, contactPhone,
       accessibilityNotes, isSchoolVenue, id]
    )
    if (!result.rows.length) return res.status(404).json({ error: 'Venue not found' })
    res.json(result.rows[0])
  } catch (error) { next(error) }
})

router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE venues SET archived_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    )
    if (!result.rows.length) return res.status(404).json({ error: 'Venue not found' })
    res.json({ message: 'Venue archived' })
  } catch (error) { next(error) }
})

export default router
