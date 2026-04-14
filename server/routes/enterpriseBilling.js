import express from 'express'
import pool from '../config/database.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticateToken)
router.use(requireAdmin) // Site admins only

// GET /schools - List all schools with subscription status
router.get('/schools', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.name, s.slug, s.school_type, s.subscription_tier, s.subscription_status,
              s.created_at,
              (SELECT COUNT(*) FROM school_members sm WHERE sm.school_id = s.id) AS member_count,
              (SELECT COUNT(*) FROM teams t WHERE t.school_id = s.id) AS team_count,
              (SELECT COUNT(*) FROM pupils p JOIN teams t ON p.team_id = t.id WHERE t.school_id = s.id AND p.is_active = true) AS pupil_count
       FROM schools s
       ORDER BY s.created_at DESC`
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Error listing schools:', error)
    res.status(500).json({ error: 'Failed to load schools' })
  }
})

// PUT /schools/:id/status - Update a school's subscription status
router.put('/schools/:id/status', async (req, res) => {
  try {
    const { subscription_status, subscription_tier, notes } = req.body

    if (!subscription_status) {
      return res.status(400).json({ error: 'subscription_status is required' })
    }

    const validStatuses = ['active', 'trial', 'suspended', 'cancelled']
    if (!validStatuses.includes(subscription_status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` })
    }

    const result = await pool.query(
      `UPDATE schools SET
        subscription_status = $1,
        subscription_tier = COALESCE($2, subscription_tier),
        updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, subscription_status, subscription_tier`,
      [subscription_status, subscription_tier, req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' })
    }

    // Log the action in audit_log
    await pool.query(
      `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'subscription_status_change', 'school', $1, $3)`,
      [req.params.id, req.user.id, JSON.stringify({ new_status: subscription_status, notes: notes || null })]
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating school status:', error)
    res.status(500).json({ error: 'Failed to update status' })
  }
})

export default router
