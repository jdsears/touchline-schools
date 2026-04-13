import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// Get all suggestions for a team (coaches only)
router.get('/:teamId', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const { status, limit = 50 } = req.query

    // Only coaches can see all suggestions
    if (!['manager', 'assistant', 'scout'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only coaches can view team suggestions' })
    }

    let query = `
      SELECT s.*,
        u.name as submitted_by_name,
        u.email as submitted_by_email,
        p.name as player_name,
        r.name as responded_by_name
      FROM team_suggestions s
      LEFT JOIN users u ON s.submitted_by = u.id
      LEFT JOIN pupils p ON s.pupil_id = p.id
      LEFT JOIN users r ON s.responded_by = r.id
      WHERE s.team_id = $1
    `
    const params = [teamId]

    if (status) {
      query += ` AND s.status = $${params.length + 1}`
      params.push(status)
    }

    query += ` ORDER BY
      CASE s.status
        WHEN 'pending' THEN 1
        WHEN 'in_review' THEN 2
        ELSE 3
      END,
      s.created_at DESC
      LIMIT $${params.length + 1}`
    params.push(parseInt(limit))

    const result = await pool.query(query, params)

    // Handle anonymous suggestions - hide submitter info
    const suggestions = result.rows.map(s => {
      if (s.is_anonymous) {
        return {
          ...s,
          submitted_by: null,
          submitted_by_name: 'Anonymous',
          submitted_by_email: null,
          player_name: null
        }
      }
      return s
    })

    res.json(suggestions)
  } catch (error) {
    next(error)
  }
})

// Get suggestions submitted by current user (pupils/parents)
router.get('/:teamId/my-suggestions', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params

    const result = await pool.query(
      `SELECT s.*,
        r.name as responded_by_name
       FROM team_suggestions s
       LEFT JOIN users r ON s.responded_by = r.id
       WHERE s.team_id = $1 AND s.submitted_by = $2
       ORDER BY s.created_at DESC
       LIMIT 20`,
      [teamId, req.user.id]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Create a suggestion (pupils/parents only)
router.post('/:teamId', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const { category, title, content, is_anonymous } = req.body

    // Only pupils and parents can submit suggestions
    if (!['pupil', 'parent'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only pupils and parents can submit suggestions' })
    }

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' })
    }

    // Validate category
    const validCategories = ['general', 'training', 'communication', 'equipment', 'schedule', 'other']
    const finalCategory = validCategories.includes(category) ? category : 'general'

    const result = await pool.query(
      `INSERT INTO team_suggestions (team_id, submitted_by, pupil_id, category, title, content, is_anonymous)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        teamId,
        req.user.id,
        req.user.pupil_id || null,
        finalCategory,
        title.trim(),
        content.trim(),
        is_anonymous || false
      ]
    )

    const suggestion = result.rows[0]

    // Create notification for coaches
    const coachesResult = await pool.query(
      `SELECT id FROM users
       WHERE team_id = $1 AND role IN ('manager', 'assistant')`,
      [teamId]
    )

    for (const coach of coachesResult.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, team_id, type, title, message, data)
         VALUES ($1, $2, 'suggestion', $3, $4, $5)`,
        [
          coach.id,
          teamId,
          'New Team Suggestion',
          `${is_anonymous ? 'Anonymous' : req.user.name} submitted a suggestion: "${title}"`,
          JSON.stringify({ suggestion_id: suggestion.id, category: finalCategory })
        ]
      )
    }

    res.status(201).json(suggestion)
  } catch (error) {
    next(error)
  }
})

// Update suggestion status and add response (coaches only)
router.put('/:teamId/suggestions/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { status, coach_response } = req.body

    // Only managers and assistants can respond to suggestions
    if (!['manager', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only coaches can respond to suggestions' })
    }

    // Validate status
    const validStatuses = ['pending', 'in_review', 'acknowledged', 'implemented', 'declined']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    const result = await pool.query(
      `UPDATE team_suggestions SET
        status = COALESCE($1, status),
        coach_response = COALESCE($2, coach_response),
        responded_by = $3,
        responded_at = CASE WHEN $2 IS NOT NULL THEN NOW() ELSE responded_at END
       WHERE id = $4
       RETURNING *`,
      [status, coach_response, req.user.id, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Suggestion not found' })
    }

    const suggestion = result.rows[0]

    // Notify the submitter if there's a response
    if (coach_response && suggestion.submitted_by) {
      await pool.query(
        `INSERT INTO notifications (user_id, team_id, type, title, message, data)
         VALUES ($1, $2, 'suggestion_response', $3, $4, $5)`,
        [
          suggestion.submitted_by,
          suggestion.team_id,
          'Response to Your Suggestion',
          `A coach responded to your suggestion: "${suggestion.title}"`,
          JSON.stringify({ suggestion_id: suggestion.id })
        ]
      )
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Delete a suggestion (coaches or original submitter)
router.delete('/:teamId/suggestions/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    // Check if user is a coach or the original submitter
    const checkResult = await pool.query(
      'SELECT submitted_by FROM team_suggestions WHERE id = $1',
      [id]
    )

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Suggestion not found' })
    }

    const isCoach = ['manager', 'assistant'].includes(req.user.role)
    const isSubmitter = checkResult.rows[0].submitted_by === req.user.id

    if (!isCoach && !isSubmitter) {
      return res.status(403).json({ message: 'Not authorized to delete this suggestion' })
    }

    await pool.query('DELETE FROM team_suggestions WHERE id = $1', [id])

    res.json({ message: 'Suggestion deleted' })
  } catch (error) {
    next(error)
  }
})

// Get suggestion stats for a team (coaches only)
router.get('/:teamId/stats', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params

    if (!['manager', 'assistant', 'scout'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only coaches can view suggestion stats' })
    }

    const result = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'in_review') as in_review,
        COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged,
        COUNT(*) FILTER (WHERE status = 'implemented') as implemented,
        COUNT(*) FILTER (WHERE status = 'declined') as declined
       FROM team_suggestions
       WHERE team_id = $1`,
      [teamId]
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

export default router
