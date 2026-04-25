import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { sendChatMessage, sendPlayerChatMessage, sendPublicChatMessage, sendHelpChatMessage } from '../services/claudeService.js'
import { retrieveCoachingContext } from '../services/knowledgeBaseService.js'
import { checkAndIncrementUsage, getEntitlements } from '../services/billingService.js'

const router = Router()

// ==========================================
// Public Chat (Landing Page Assistant)
// ==========================================

// Simple rate limiting for public endpoint
const publicChatRateLimit = new Map()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10

function checkRateLimit(ip) {
  const now = Date.now()
  const record = publicChatRateLimit.get(ip)

  if (!record || now - record.firstRequest > RATE_LIMIT_WINDOW) {
    publicChatRateLimit.set(ip, { firstRequest: now, count: 1 })
    return true
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false
  }

  record.count++
  return true
}

// Public chat endpoint (no authentication required)
router.post('/public/message', async (req, res, next) => {
  try {
    const { message, history = [] } = req.body
    const clientIp = req.ip || req.connection.remoteAddress

    if (!message) {
      return res.status(400).json({ message: 'Message is required' })
    }

    // Rate limiting
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        message: 'Too many requests. Please wait a moment before sending another message.'
      })
    }

    // Limit message length
    if (message.length > 1000) {
      return res.status(400).json({ message: 'Message is too long' })
    }

    // Limit history to last 10 messages
    const recentHistory = history.slice(-10)

    const response = await sendPublicChatMessage(message, recentHistory)

    res.json({
      message: response.message,
    })
  } catch (error) {
    console.error('Public chat error:', error)
    res.status(500).json({
      message: 'Sorry, I encountered an error. Please try again.'
    })
  }
})

// ==========================================
// Help Guide Chat (App Usage Assistant)
// ==========================================

// Help chat endpoint (requires authentication)
router.post('/help/message', authenticateToken, async (req, res, next) => {
  try {
    const { message, history = [], userRole = 'coach' } = req.body

    if (!message) {
      return res.status(400).json({ message: 'Message is required' })
    }

    // Limit message length
    if (message.length > 1000) {
      return res.status(400).json({ message: 'Message is too long' })
    }

    // Limit history to last 10 messages
    const recentHistory = history.slice(-10)

    // Use the actual user role from auth, not the request body
    const actualRole = req.user.role || userRole

    const response = await sendHelpChatMessage(message, recentHistory, actualRole)

    res.json({
      message: response.message,
    })
  } catch (error) {
    console.error('Help chat error:', error)
    res.status(500).json({
      message: 'Sorry, I encountered an error. Please try again.'
    })
  }
})

// ==========================================
// The Gaffer - Parent Control Routes
// ==========================================

// Get Gaffer status for a pupil (for parents)
router.get('/pupil/:pupilId/gaffer-status', authenticateToken, async (req, res, next) => {
  try {
    const { pupilId } = req.params

    // Verify user is a parent of this pupil
    if (req.user.role === 'parent' && req.user.pupil_id !== pupilId) {
      return res.status(403).json({ message: 'Not authorized for this pupil' })
    }

    const result = await pool.query(
      'SELECT gaffer_disabled FROM pupils WHERE id = $1',
      [pupilId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }

    res.json({
      disabled: result.rows[0].gaffer_disabled || false
    })
  } catch (error) {
    next(error)
  }
})

// Toggle Gaffer on/off for a pupil (parent only)
router.put('/pupil/:pupilId/gaffer-status', authenticateToken, async (req, res, next) => {
  try {
    const { pupilId } = req.params
    const { disabled } = req.body

    // Verify user is a parent of this pupil
    if (req.user.role !== 'parent' || req.user.pupil_id !== pupilId) {
      return res.status(403).json({ message: 'Only parents can control The Gaffer for their child' })
    }

    await pool.query(
      'UPDATE pupils SET gaffer_disabled = $1 WHERE id = $2',
      [disabled, pupilId]
    )

    res.json({
      success: true,
      disabled,
      message: disabled ? 'The Gaffer has been disabled' : 'The Gaffer has been enabled'
    })
  } catch (error) {
    next(error)
  }
})

// Send message to AI
router.post('/:teamId/message', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const { message, context = {} } = req.body
    
    if (!message) {
      return res.status(400).json({ message: 'Message is required' })
    }

    // Check AI chat usage limit
    const entitlements = await getEntitlements({ userId: req.user.id, teamId, userEmail: req.user.email })
    const usageCheck = await checkAndIncrementUsage(teamId, 'chat', entitlements)
    if (!usageCheck.allowed) {
      return res.status(429).json({
        message: usageCheck.limit === 0
          ? 'AI chat is not available on your current plan. Upgrade to Core or Pro to chat with The Gaffer.'
          : `You've used all ${usageCheck.limit} AI messages this month. Upgrade your plan for unlimited AI chat.`,
        code: 'CHAT_LIMIT_REACHED',
        usage: { current: usageCheck.current, limit: usageCheck.limit },
        upgradeRequired: true,
      })
    }

    // Get team context
    const teamResult = await pool.query(
      'SELECT * FROM teams WHERE id = $1',
      [teamId]
    )
    
    const team = teamResult.rows[0]
    
    // Get pupil count
    const playerResult = await pool.query(
      'SELECT COUNT(*) as count FROM pupils WHERE team_id = $1',
      [teamId]
    )
    
    // Get upcoming match, past match results, and recent video analyses in parallel
    const [matchResult, pastMatchesResult, videoAnalysisResult] = await Promise.all([
      pool.query(
        `SELECT opponent, COALESCE(date, match_date) AS date FROM matches
         WHERE team_id = $1 AND COALESCE(date, match_date) > NOW() AND score_for IS NULL
         ORDER BY COALESCE(date, match_date) LIMIT 1`,
        [teamId]
      ),
      pool.query(
        `SELECT opponent, COALESCE(date, match_date) AS date,
                (home_away = 'home') AS is_home,
                CASE WHEN score_for IS NOT NULL AND score_against IS NOT NULL
                  THEN score_for || ' - ' || score_against ELSE NULL END AS result,
                score_for AS goals_for, score_against AS goals_against,
                formations AS formation_used, team_notes, report
         FROM matches
         WHERE team_id = $1 AND score_for IS NOT NULL
         ORDER BY COALESCE(date, match_date) DESC LIMIT 10`,
        [teamId]
      ),
      pool.query(
        `SELECT va.summary, va.observations, va.recommendations, va.player_feedback, va.created_at,
                m.opponent, m.date AS match_date
         FROM video_ai_analysis va
         JOIN videos v ON v.id = va.video_id
         LEFT JOIN matches m ON v.match_id = m.id
         WHERE v.team_id = $1 AND va.approved = true AND va.status = 'complete'
         ORDER BY va.created_at DESC LIMIT 5`,
        [teamId]
      ),
    ])

    // Build context
    const fullContext = {
      ...context,
      team: team ? {
        name: team.name,
        ageGroup: team.age_group,
        formation: team.formation,
        gameModel: team.game_model,
        teamFormat: team.team_format || 11,
        coachingPhilosophy: team.coaching_philosophy,
      } : null,
      squadSize: parseInt(playerResult.rows[0]?.count || 0),
      upcomingMatch: matchResult.rows[0] || null,
      pastMatches: pastMatchesResult.rows.map(m => ({
        opponent: m.opponent,
        date: m.date,
        isHome: m.is_home,
        result: m.result,
        goalsFor: m.goals_for,
        goalsAgainst: m.goals_against,
        formationUsed: m.formation_used,
        teamNotes: m.team_notes,
        report: m.report?.generated ? m.report.generated.summary || m.report.generated : null,
      })),
      videoAnalyses: videoAnalysisResult.rows.map(va => ({
        opponent: va.opponent,
        matchDate: va.match_date,
        summary: va.summary,
        observations: va.observations,
        recommendations: va.recommendations,
        playerFeedback: va.player_feedback,
        analysedAt: va.created_at,
      })),
    }
    
    // Get recent conversation history
    const historyResult = await pool.query(
      `SELECT role, content FROM messages 
       WHERE team_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [teamId]
    )
    
    const conversationHistory = historyResult.rows.reverse()

    // Retrieve relevant knowledge base context
    let knowledgeBaseContext = null
    try {
      knowledgeBaseContext = await retrieveCoachingContext({
        teamId,
        message,
        ageGroup: team?.age_group,
      })
    } catch (kbError) {
      console.error('Knowledge base retrieval failed (non-blocking):', kbError.message)
    }

    // Send to Claude with knowledge base context
    const response = await sendChatMessage(message, fullContext, conversationHistory, knowledgeBaseContext)

    // Save messages to database
    await pool.query(
      `INSERT INTO messages (team_id, user_id, role, content, context) VALUES ($1, $2, 'user', $3, $4)`,
      [teamId, req.user.id, message, JSON.stringify(fullContext)]
    )
    
    await pool.query(
      `INSERT INTO messages (team_id, user_id, role, content) VALUES ($1, $2, 'assistant', $3)`,
      [teamId, req.user.id, response.message]
    )
    
    res.json({ 
      message: response.message,
      usage: response.usage,
    })
  } catch (error) {
    next(error)
  }
})

// Get chat history
router.get('/:teamId/history', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const { limit = 50 } = req.query

    const result = await pool.query(
      `SELECT id, role, content, created_at FROM messages
       WHERE team_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [teamId, limit]
    )

    res.json(result.rows.reverse())
  } catch (error) {
    next(error)
  }
})

// Clear chat history
router.delete('/:teamId/history', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params

    await pool.query(
      'DELETE FROM messages WHERE team_id = $1',
      [teamId]
    )

    res.json({ success: true, message: 'Chat history cleared' })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// Pupil Assistant Chat (for pupils/parents)
// ==========================================

// Send message to pupil assistant
router.post('/pupil/:pupilId/message', authenticateToken, async (req, res, next) => {
  try {
    const { pupilId } = req.params
    const { message } = req.body

    if (!message) {
      return res.status(400).json({ message: 'Message is required' })
    }

    // Get pupil info with age calculation
    const playerResult = await pool.query(
      `SELECT p.*, t.name as team_name, t.age_group, t.formation, t.team_format
       FROM pupils p
       JOIN teams t ON p.team_id = t.id
       WHERE p.id = $1`,
      [pupilId]
    )

    if (playerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }

    // Check if The Gaffer is disabled for this pupil
    if (playerResult.rows[0].gaffer_disabled) {
      return res.status(403).json({ message: 'The Gaffer has been disabled by a parent for this pupil' })
    }

    const pupil = playerResult.rows[0]

    // Check AI chat usage limit against team's plan
    const entitlements = await getEntitlements({ userId: req.user.id, teamId: pupil.team_id, userEmail: req.user.email })
    const chatUsageCheck = await checkAndIncrementUsage(pupil.team_id, 'chat', entitlements)
    if (!chatUsageCheck.allowed) {
      return res.status(429).json({
        message: chatUsageCheck.limit === 0
          ? 'AI chat is not available on the current plan. Ask your coach to upgrade to keep chatting with The Gaffer.'
          : `Monthly AI chat limit reached (${chatUsageCheck.limit} messages). Ask your coach to upgrade for unlimited chat.`,
        code: 'CHAT_LIMIT_REACHED',
        usage: { current: chatUsageCheck.current, limit: chatUsageCheck.limit },
        upgradeRequired: true,
      })
    }

    // Calculate age
    if (pupil.dob) {
      const today = new Date()
      const birth = new Date(pupil.dob)
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      pupil.age = age
    }

    // Helper to run context queries without failing the whole request
    const safeQuery = async (label, query, params) => {
      try {
        return await pool.query(query, params)
      } catch (err) {
        console.error(`Pupil chat context query failed (${label}):`, err.message)
        return { rows: [] }
      }
    }

    // Run all context queries in parallel for better performance
    const [obsResult, idpResult, matchesResult, recentMatchesResult, trainingResult, playerVideoResult] = await Promise.all([
      safeQuery('observations',
        `SELECT o.type, o.content, o.context, o.context_type, o.created_at,
                m.opponent as match_opponent, m.date as match_date, m.result as match_result,
                ts.date as training_date, ts.focus_areas as training_focus
         FROM observations o
         LEFT JOIN matches m ON o.match_id = m.id
         LEFT JOIN training_sessions ts ON o.training_session_id = ts.id
         WHERE o.pupil_id = $1
         ORDER BY o.created_at DESC
         LIMIT 20`,
        [pupilId]
      ),
      safeQuery('idp',
        `SELECT * FROM development_plans
         WHERE pupil_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [pupilId]
      ),
      safeQuery('upcoming_matches',
        `SELECT opponent, COALESCE(date, match_date) AS date, (home_away = 'home') AS is_home
         FROM matches
         WHERE team_id = $1 AND COALESCE(date, match_date) > NOW()
         ORDER BY COALESCE(date, match_date)
         LIMIT 5`,
        [pupil.team_id]
      ),
      safeQuery('recent_matches',
        `SELECT opponent, COALESCE(date, match_date) AS date,
                CASE WHEN score_for IS NOT NULL AND score_against IS NOT NULL
                  THEN score_for || ' - ' || score_against ELSE NULL END AS result,
                team_notes
         FROM matches
         WHERE team_id = $1 AND COALESCE(date, match_date) < NOW() AND (score_for IS NOT NULL OR team_notes IS NOT NULL)
         ORDER BY COALESCE(date, match_date) DESC
         LIMIT 5`,
        [pupil.team_id]
      ),
      safeQuery('training',
        `SELECT date, time, location, session_type, focus_areas, notes
         FROM training_sessions
         WHERE team_id = $1 AND date >= CURRENT_DATE
         ORDER BY date, time
         LIMIT 5`,
        [pupil.team_id]
      ),
      safeQuery('player_video_analysis',
        `SELECT va.player_feedback, va.summary, va.created_at,
                m.opponent, m.date AS match_date
         FROM video_ai_analysis va
         JOIN videos v ON v.id = va.video_id
         LEFT JOIN matches m ON v.match_id = m.id
         WHERE v.team_id = $1 AND va.approved = true AND va.player_feedback IS NOT NULL
         ORDER BY va.created_at DESC LIMIT 5`,
        [pupil.team_id]
      ),
    ])

    // Build pupil context with enhanced observation data
    const playerContext = {
      pupil: {
        name: pupil.name,
        age: pupil.age,
        positions: pupil.positions,
        squad_number: pupil.squad_number,
      },
      team: {
        name: pupil.team_name,
        age_group: pupil.age_group,
        formation: pupil.formation,
        team_format: pupil.team_format || 11,
      },
      observations: obsResult.rows.map(obs => ({
        type: obs.type,
        content: obs.content,
        context: obs.context,
        contextType: obs.context_type,
        date: obs.created_at,
        // Include match context if observation is from a match
        matchContext: obs.context_type === 'match' && obs.match_opponent ? {
          opponent: obs.match_opponent,
          date: obs.match_date,
          result: obs.match_result
        } : null,
        // Include training context if observation is from training
        trainingContext: obs.context_type === 'training' && obs.training_date ? {
          date: obs.training_date,
          focus: obs.training_focus
        } : null
      })),
      idp: idpResult.rows[0] || null,
      upcomingMatches: matchesResult.rows,
      recentMatchPerformance: recentMatchesResult.rows.filter(m => m.team_notes).map(m => ({
        opponent: m.opponent,
        date: m.date,
        result: m.result,
        teamNotes: m.team_notes
      })),
      upcomingTraining: trainingResult.rows.map(t => ({
        date: t.date,
        time: t.time,
        location: t.location,
        type: t.session_type,
        focus: Array.isArray(t.focus_areas) ? t.focus_areas.join(', ') : t.focus_areas,
        notes: t.notes
      })),
      videoAnalysisFeedback: (() => {
        const feedback = []
        for (const va of playerVideoResult.rows) {
          if (Array.isArray(va.player_feedback)) {
            const playerNotes = va.player_feedback.filter(f =>
              f.name?.toLowerCase() === pupil.name?.toLowerCase() ||
              (pupil.squad_number && Number(f.squad_number) === Number(pupil.squad_number))
            )
            for (const note of playerNotes) {
              feedback.push({
                opponent: va.opponent,
                matchDate: va.match_date,
                feedback: note.feedback,
                rating: note.rating,
                capabilities: note.capabilities,
              })
            }
          }
        }
        return feedback
      })()
    }

    // Get conversation history for this pupil
    const historyResult = await pool.query(
      `SELECT role, content FROM pupil_messages
       WHERE pupil_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [pupilId]
    )

    const conversationHistory = historyResult.rows.reverse()

    // Send to Claude
    const response = await sendPlayerChatMessage(message, playerContext, conversationHistory)

    // Save messages
    await pool.query(
      `INSERT INTO pupil_messages (pupil_id, user_id, role, content)
       VALUES ($1, $2, 'user', $3)`,
      [pupilId, req.user.id, message]
    )

    await pool.query(
      `INSERT INTO pupil_messages (pupil_id, user_id, role, content)
       VALUES ($1, $2, 'assistant', $3)`,
      [pupilId, req.user.id, response.message]
    )

    res.json({
      message: response.message,
      usage: response.usage,
    })
  } catch (error) {
    console.error('Pupil chat error:', error.message, error.stack)
    next(error)
  }
})

// Get pupil chat history
router.get('/pupil/:pupilId/history', authenticateToken, async (req, res, next) => {
  try {
    const { pupilId } = req.params
    const { limit = 50 } = req.query

    const result = await pool.query(
      `SELECT id, role, content, created_at
       FROM pupil_messages
       WHERE pupil_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [pupilId, limit]
    )

    res.json(result.rows.reverse())
  } catch (error) {
    next(error)
  }
})

// Clear pupil chat history
router.delete('/pupil/:pupilId/history', authenticateToken, async (req, res, next) => {
  try {
    const { pupilId } = req.params

    await pool.query(
      'DELETE FROM pupil_messages WHERE pupil_id = $1',
      [pupilId]
    )

    res.json({ success: true, message: 'Chat history cleared' })
  } catch (error) {
    next(error)
  }
})

export default router
