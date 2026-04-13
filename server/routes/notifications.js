import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { VAPID_PUBLIC_KEY } from '../services/pushService.js'

const router = Router()

// Get VAPID public key (needed by client to subscribe)
router.get('/vapid-key', (req, res) => {
  res.json({ key: VAPID_PUBLIC_KEY || null })
})

// Get user notifications
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { limit = 50, unread_only = false } = req.query

    let query = `
      SELECT n.*, t.name as team_name
      FROM notifications n
      LEFT JOIN teams t ON n.team_id = t.id
      WHERE n.user_id = $1
    `
    const params = [req.user.id]

    if (unread_only === 'true') {
      query += ' AND n.is_read = false'
    }

    query += ' ORDER BY n.created_at DESC LIMIT $2'
    params.push(limit)

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Get unread count
router.get('/unread-count', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    )
    res.json({ count: parseInt(result.rows[0].count) })
  } catch (error) {
    next(error)
  }
})

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Mark all as read
router.put('/read-all', authenticateToken, async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    )
    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    next(error)
  }
})

// Delete notification
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' })
    }

    res.json({ message: 'Notification deleted' })
  } catch (error) {
    next(error)
  }
})

// Register push subscription
router.post('/push-subscription', authenticateToken, async (req, res, next) => {
  try {
    const { subscription } = req.body

    if (!subscription) {
      return res.status(400).json({ message: 'Subscription is required' })
    }

    await pool.query(
      'UPDATE users SET push_subscription = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(subscription), req.user.id]
    )

    res.json({ message: 'Push subscription registered' })
  } catch (error) {
    next(error)
  }
})

// Update notification preferences
router.put('/preferences', authenticateToken, async (req, res, next) => {
  try {
    const { preferences } = req.body

    await pool.query(
      'UPDATE users SET notification_preferences = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(preferences), req.user.id]
    )

    res.json({ message: 'Preferences updated' })
  } catch (error) {
    next(error)
  }
})

export default router
