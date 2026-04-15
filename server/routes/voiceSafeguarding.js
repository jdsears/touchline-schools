import express from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticateToken)

// Middleware: require DSL or HoD role
async function requireDSLAccess(req, res, next) {
  try {
    if (req.user.is_admin) return next()

    const result = await pool.query(
      `SELECT sm.role FROM school_members sm
       WHERE sm.user_id = $1 AND sm.role IN ('owner', 'admin')
       LIMIT 1`,
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'DSL or Head of Department access required' })
    }

    next()
  } catch (error) {
    next(error)
  }
}

// GET /flagged - List all safeguarding-flagged voice observations
router.get('/flagged', requireDSLAccess, async (req, res) => {
  try {
    // Get school ID
    const schoolResult = await pool.query(
      `SELECT school_id FROM school_members WHERE user_id = $1 LIMIT 1`,
      [req.user.id]
    )
    const schoolId = schoolResult.rows[0]?.school_id

    if (!schoolId) return res.status(403).json({ error: 'No school access' })

    // Find audit log entries for safeguarding flags within transcript retention window
    const result = await pool.query(
      `SELECT al.id AS log_id, al.action, al.entity_id AS observation_id, al.details, al.created_at,
              u.name AS teacher_name,
              o.content AS observation_content, o.review_state, o.type AS observation_type,
              o.transcript_fragment,
              a.context_type, a.transcript, a.duration_seconds, a.created_at AS recorded_at,
              p.first_name AS pupil_first_name, p.last_name AS pupil_last_name
       FROM audit_log al
       JOIN users u ON al.user_id = u.id
       LEFT JOIN observations o ON al.entity_id = o.id AND al.entity_type = 'observation'
       LEFT JOIN audio_sources a ON o.audio_source_id = a.id
       LEFT JOIN pupils p ON o.pupil_id = p.id
       WHERE al.school_id = $1
         AND al.action = 'voice_safeguarding_flagged'
         AND al.created_at > NOW() - INTERVAL '30 days'
       ORDER BY al.created_at DESC`,
      [schoolId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error loading flagged observations:', error)
    res.status(500).json({ error: 'Failed to load flagged observations' })
  }
})

// POST /flagged/:observationId/review - DSL reviews a flagged observation
router.post('/flagged/:observationId/review', requireDSLAccess, async (req, res) => {
  try {
    const { action, notes } = req.body // action: 'dismiss', 'escalate'

    if (!action || !['dismiss', 'escalate'].includes(action)) {
      return res.status(400).json({ error: 'Action must be dismiss or escalate' })
    }

    const schoolResult = await pool.query(
      `SELECT school_id FROM school_members WHERE user_id = $1 LIMIT 1`,
      [req.user.id]
    )
    const schoolId = schoolResult.rows[0]?.school_id

    // Log the DSL review
    await pool.query(
      `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'voice_safeguarding_reviewed', 'observation', $3, $4)`,
      [schoolId, req.user.id, req.params.observationId,
       JSON.stringify({ action, notes: notes || null })]
    )

    if (action === 'dismiss') {
      // Mark observation as confirmed (it was reviewed and deemed not a safeguarding concern)
      await pool.query(
        `UPDATE observations SET review_state = 'confirmed' WHERE id = $1`,
        [req.params.observationId]
      )
    }

    // If escalate, the observation stays in pending_review and the DSL
    // should create a formal safeguarding incident through the existing incident system

    res.json({ message: `Observation ${action === 'dismiss' ? 'dismissed' : 'escalated'}` })
  } catch (error) {
    console.error('Error reviewing flagged observation:', error)
    res.status(500).json({ error: 'Failed to review observation' })
  }
})

export default router
