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

const RTP_STAGES = [
  { stage: 1, name: 'Rest & observation', minDays: 1 },
  { stage: 2, name: 'Light aerobic exercise', minDays: 1 },
  { stage: 3, name: 'Sport-specific exercise', minDays: 1 },
  { stage: 4, name: 'Non-contact training', minDays: 1 },
  { stage: 5, name: 'Full contact practice', minDays: 1 },
  { stage: 6, name: 'Return to competition', minDays: 0 },
]

router.get('/pupil/:pupilId', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ci.*, u.name AS reported_by_name,
              m.opponent AS match_opponent, COALESCE(m.date, m.match_date) AS match_date
       FROM concussion_incidents ci
       LEFT JOIN users u ON u.id = ci.reported_by_user_id
       LEFT JOIN matches m ON m.id = ci.match_id
       WHERE ci.pupil_id = $1
       ORDER BY ci.occurred_at DESC`,
      [req.params.pupilId]
    )
    res.json(result.rows)
  } catch (error) { next(error) }
})

router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const incident = await pool.query(
      `SELECT ci.*, p.name AS pupil_name, u.name AS reported_by_name,
              m.opponent AS match_opponent
       FROM concussion_incidents ci
       JOIN pupils p ON p.id = ci.pupil_id
       LEFT JOIN users u ON u.id = ci.reported_by_user_id
       LEFT JOIN matches m ON m.id = ci.match_id
       WHERE ci.id = $1`, [req.params.id]
    )
    if (!incident.rows.length) return res.status(404).json({ error: 'Incident not found' })
    const followups = await pool.query(
      `SELECT cf.*, u.name AS completed_by_name
       FROM concussion_followups cf
       LEFT JOIN users u ON u.id = cf.completed_by_user_id
       WHERE cf.incident_id = $1 ORDER BY cf.stage`,
      [req.params.id]
    )
    res.json({ incident: incident.rows[0], followups: followups.rows, stages: RTP_STAGES })
  } catch (error) { next(error) }
})

router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const schoolId = await getSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })
    const { pupilId, matchId, severity, symptomsObserved, immediateActionTaken,
            doctorAssessmentRequired, notes } = req.body
    if (!pupilId) return res.status(400).json({ error: 'Pupil ID required' })

    const result = await pool.query(
      `INSERT INTO concussion_incidents (pupil_id, match_id, school_id, reported_by_user_id,
        severity, symptoms_observed, immediate_action_taken, doctor_assessment_required, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [pupilId, matchId || null, schoolId, req.user.id,
       severity || 'awaiting_assessment', JSON.stringify(symptomsObserved || []),
       immediateActionTaken, doctorAssessmentRequired !== false, notes]
    )

    const incident = result.rows[0]
    const today = new Date()
    for (const stage of RTP_STAGES) {
      const followupDate = new Date(today)
      followupDate.setDate(followupDate.getDate() + stage.stage)
      await pool.query(
        `INSERT INTO concussion_followups (incident_id, stage, followup_date) VALUES ($1,$2,$3)`,
        [incident.id, stage.stage, followupDate.toISOString().split('T')[0]]
      )
    }

    await pool.query(
      `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, details, created_at)
       VALUES ($1,$2,'concussion_reported','concussion_incident',$3,$4,NOW())`,
      [schoolId, req.user.id, incident.id, JSON.stringify({ pupilId, severity })]
    )

    res.status(201).json(incident)
  } catch (error) { next(error) }
})

router.post('/:id/followup/:stage/complete', authenticateToken, async (req, res, next) => {
  try {
    const { id, stage } = req.params
    const { notes } = req.body
    await pool.query(
      `UPDATE concussion_followups SET completed_at = NOW(), completed_by_user_id = $1, notes = $2
       WHERE incident_id = $3 AND stage = $4`,
      [req.user.id, notes, id, stage]
    )
    if (parseInt(stage) === 6) {
      await pool.query(
        `UPDATE concussion_incidents SET return_to_play_status = 'fully_cleared', fully_cleared_at = NOW(), updated_at = NOW()
         WHERE id = $1`, [id]
      )
    } else if (parseInt(stage) === 1) {
      await pool.query(
        `UPDATE concussion_incidents SET return_to_play_status = 'graduated_return',
          return_to_play_protocol_started_at = NOW(), updated_at = NOW()
         WHERE id = $1`, [id]
      )
    }
    res.json({ message: 'Stage completed' })
  } catch (error) { next(error) }
})

router.get('/school/active', authenticateToken, async (req, res, next) => {
  try {
    const schoolId = await getSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })
    const result = await pool.query(
      `SELECT ci.*, p.name AS pupil_name, p.year_group
       FROM concussion_incidents ci
       JOIN pupils p ON p.id = ci.pupil_id
       WHERE ci.school_id = $1 AND ci.return_to_play_status != 'fully_cleared'
       ORDER BY ci.occurred_at DESC`,
      [schoolId]
    )
    res.json(result.rows)
  } catch (error) { next(error) }
})

export default router
