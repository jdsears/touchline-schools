import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { generateTrainingSession } from '../services/claudeService.js'
import { checkAndIncrementUsage, getEntitlements } from '../services/billingService.js'

const router = Router()

// Get session
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT * FROM training_sessions WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Update session
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { date, duration, focusAreas, plan, notes } = req.body
    
    const result = await pool.query(
      `UPDATE training_sessions SET
        date = COALESCE($1, date),
        duration = COALESCE($2, duration),
        focus_areas = COALESCE($3, focus_areas),
        plan = COALESCE($4, plan),
        notes = COALESCE($5, notes),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [date, duration, focusAreas, plan ? JSON.stringify(plan) : null, notes, id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Delete session
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM training_sessions WHERE id = $1 RETURNING id', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }
    res.json({ message: 'Session deleted' })
  } catch (error) {
    next(error)
  }
})

// Generate training session using AI (team route)
router.post('/generate', authenticateToken, async (req, res, next) => {
  try {
    const { teamId, duration, focusAreas, pupils, constraints } = req.body

    if (!duration || !focusAreas || focusAreas.length === 0) {
      return res.status(400).json({ message: 'Duration and focus areas are required' })
    }

    // Check session generation usage limit
    if (teamId) {
      const entitlements = await getEntitlements({ userId: req.user.id, teamId, userEmail: req.user.email })
      const usageCheck = await checkAndIncrementUsage(teamId, 'sessions', entitlements)
      if (!usageCheck.allowed) {
        return res.status(429).json({
          message: usageCheck.limit === 0
            ? 'AI session planning is not available on your current plan. Upgrade to Core or Pro to generate training sessions.'
            : `You've used all ${usageCheck.limit} AI-generated sessions this month. Upgrade to Pro for unlimited session planning.`,
          code: 'SESSION_LIMIT_REACHED',
          usage: { current: usageCheck.current, limit: usageCheck.limit },
          upgradeRequired: true,
        })
      }
    }

    // Get team format and age group if teamId provided
    let teamFormat = 11
    let ageGroup = null
    if (teamId) {
      const teamResult = await pool.query('SELECT team_format, age_group FROM teams WHERE id = $1', [teamId])
      if (teamResult.rows[0]) {
        teamFormat = teamResult.rows[0].team_format || 11
        ageGroup = teamResult.rows[0].age_group
      }
    }

    const session = await generateTrainingSession({
      duration,
      focusAreas,
      pupils,
      constraints,
      teamFormat,
      ageGroup,
    })
    
    // Optionally save the session
    if (teamId) {
      const result = await pool.query(
        `INSERT INTO training_sessions (team_id, date, duration, focus_areas, plan)
         VALUES ($1, CURRENT_DATE, $2, $3, $4) RETURNING *`,
        [teamId, duration, focusAreas, JSON.stringify(session)]
      )
      return res.json(result.rows[0])
    }
    
    res.json({ plan: session })
  } catch (error) {
    next(error)
  }
})

export default router
