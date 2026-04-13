import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = Router()

// In-memory rate limiting by email
const rateLimitMap = new Map()
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const MAX_REQUESTS = 5

function checkRateLimit(email) {
  const key = email.toLowerCase()
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now - record.start > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(key, { start: now, count: 1 })
    return true
  }
  if (record.count >= MAX_REQUESTS) return false
  record.count++
  return true
}

// Clean up rate limit map periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitMap) {
    if (now - record.start > RATE_LIMIT_WINDOW) rateLimitMap.delete(key)
  }
}, 10 * 60 * 1000)

const VALID_SUBJECTS = ['Bug Report', 'Feature Request', 'Account Issue', 'General Question']

// --- Public endpoint (no auth required) ---

router.post('/', async (req, res, next) => {
  try {
    const { email, subject, message, userId, page } = req.body

    // Validate required fields
    if (!email || !subject || !message) {
      return res.status(400).json({ error: 'Email, subject, and message are required' })
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' })
    }

    // Validate subject
    if (!VALID_SUBJECTS.includes(subject)) {
      return res.status(400).json({ error: `Subject must be one of: ${VALID_SUBJECTS.join(', ')}` })
    }

    // Validate message length
    if (message.length > 5000) {
      return res.status(400).json({ error: 'Message must be under 5000 characters' })
    }

    // Rate limit
    if (!checkRateLimit(email)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' })
    }

    const result = await pool.query(
      `INSERT INTO support_tickets (email, user_id, subject, message, page)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [email.trim(), userId || null, subject, message.trim(), page || null]
    )

    res.status(201).json({
      ticketId: result.rows[0].id,
      message: "We've received your request and will get back to you soon.",
    })
  } catch (error) {
    next(error)
  }
})

// Check ticket status (public, verified by email)
router.get('/:ticketId', async (req, res, next) => {
  try {
    const { ticketId } = req.params
    const { email } = req.query

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const result = await pool.query(
      `SELECT id, subject, status, priority, created_at, responded_at
       FROM support_tickets WHERE id = $1 AND email = $2`,
      [ticketId, email.toLowerCase().trim()]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// --- Admin endpoints ---

router.get('/admin/tickets', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query
    let query = 'SELECT * FROM support_tickets'
    const params = []

    if (status) {
      query += ' WHERE status = $1'
      params.push(status)
    }
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2)
    params.push(limit, offset)

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

router.put('/admin/tickets/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const { status, priority, admin_response } = req.body

    const fields = []
    const params = []
    let idx = 1

    if (status) { fields.push(`status = $${idx++}`); params.push(status) }
    if (priority) { fields.push(`priority = $${idx++}`); params.push(priority) }
    if (admin_response) {
      fields.push(`admin_response = $${idx++}`)
      params.push(admin_response)
      fields.push(`responded_at = NOW()`)
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    params.push(id)
    const result = await pool.query(
      `UPDATE support_tickets SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

export default router
