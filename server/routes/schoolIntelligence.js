import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { loadSchool, requireSchoolRole, requireSchoolFeature } from '../middleware/schoolAuth.js'
import {
  generateParentMatchReport,
  generateAttendanceInsights,
  generateSeasonSummary,
  generateGrantDraft,
  generateComplianceAnalysis,
  generateCoachDevelopment,
} from '../services/claudeService.js'
import { sendNotificationEmail, isEmailEnabled, sendEmail } from '../services/emailService.js'

const router = Router()

// =============================================
// HELPERS
// =============================================

// Monthly AI usage caps per tier (in GBP)
const TIER_MONTHLY_CAPS = {
  club_starter: 5.0,
  club_growth: 15.0,
  club_scale: 30.0,
}

// Rough cost estimation: Sonnet pricing ($3/M input, $15/M output)
// Convert USD to GBP with approximate rate
const USD_TO_GBP = 0.79
const INPUT_COST_PER_TOKEN = (3 / 1_000_000) * USD_TO_GBP
const OUTPUT_COST_PER_TOKEN = (15 / 1_000_000) * USD_TO_GBP

function estimateCostGBP(inputTokens, outputTokens) {
  return (inputTokens * INPUT_COST_PER_TOKEN) + (outputTokens * OUTPUT_COST_PER_TOKEN)
}

// Track AI usage after every call
async function trackAIUsage(schoolId, feature, model, inputTokens, outputTokens) {
  try {
    const costGBP = estimateCostGBP(inputTokens, outputTokens)
    await pool.query(
      `INSERT INTO ai_usage (school_id, feature, model, input_tokens, output_tokens, estimated_cost_gbp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [schoolId, feature, model, inputTokens, outputTokens, costGBP]
    )
    return costGBP
  } catch (error) {
    console.error('Failed to track AI usage:', error)
    // Don't throw - tracking failure shouldn't block the response
  }
}

// Check monthly usage cap before making AI calls
async function checkMonthlyUsageCap(schoolId, tier) {
  const cap = TIER_MONTHLY_CAPS[tier]
  if (!cap) return { allowed: true, used: 0, cap: 999 }

  const result = await pool.query(
    `SELECT COALESCE(SUM(estimated_cost_gbp), 0) as total_cost
     FROM ai_usage
     WHERE school_id = $1
       AND created_at >= date_trunc('month', NOW())`,
    [schoolId]
  )

  const used = parseFloat(result.rows[0].total_cost)
  return {
    allowed: used < cap,
    used: Math.round(used * 100) / 100,
    cap,
    remaining: Math.round((cap - used) * 100) / 100,
  }
}

// Middleware to check AI usage cap
function checkAICap(req, res, next) {
  const originalJson = res.json.bind(res)
  // We'll check cap in the route handlers directly for clarity
  next()
}

// =============================================
// MATCH REPORTS
// =============================================

// POST /:schoolId/matches/:matchId/generate-report - Generate AI match report
router.post(
  '/:schoolId/matches/:matchId/generate-report',
  authenticateToken,
  loadSchool,
  requireSchoolRole('owner', 'admin', 'coach'),
  requireSchoolFeature('ai_match_reports'),
  async (req, res) => {
    try {
      const { schoolId, matchId } = req.params
      const school = req.school

      // Check monthly cap
      const capCheck = await checkMonthlyUsageCap(schoolId, school.subscription_tier)
      if (!capCheck.allowed) {
        return res.status(429).json({
          error: 'Monthly AI usage limit reached',
          used: capCheck.used,
          cap: capCheck.cap,
          message: `Your school has used £${capCheck.used} of your £${capCheck.cap} monthly AI budget. Upgrade your plan for more.`,
        })
      }

      // Fetch match data
      const matchResult = await pool.query(
        `SELECT m.*, t.name as team_name, t.age_group, t.id as team_id
         FROM matches m
         JOIN teams t ON t.id = m.team_id
         WHERE m.id = $1 AND t.school_id = $2`,
        [matchId, schoolId]
      )

      if (matchResult.rows.length === 0) {
        return res.status(404).json({ error: 'Match not found' })
      }

      const match = matchResult.rows[0]

      // Determine result text
      let resultText = 'Match not yet played'
      if (match.score_for !== null && match.score_against !== null) {
        const gf = parseInt(match.score_for)
        const ga = parseInt(match.score_against)
        if (gf > ga) resultText = 'Win'
        else if (gf < ga) resultText = 'Loss'
        else resultText = 'Draw'
      } else if (match.goals_for !== null && match.goals_against !== null) {
        const gf = parseInt(match.goals_for)
        const ga = parseInt(match.goals_against)
        if (gf > ga) resultText = 'Win'
        else if (gf < ga) resultText = 'Loss'
        else resultText = 'Draw'
      }

      const scoreFor = match.score_for ?? match.goals_for ?? 0
      const scoreAgainst = match.score_against ?? match.goals_against ?? 0

      // Generate report
      const aiResult = await generateParentMatchReport({
        teamName: match.team_name,
        opponent: match.opponent,
        scoreFor,
        scoreAgainst,
        result: resultText,
        date: new Date(match.match_date || match.date).toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        competition: match.competition,
        ageGroup: match.age_group,
        observations: match.team_notes || req.body.observations || null,
      })

      // Track usage
      const totalTokens = (aiResult.usage.input_tokens || 0) + (aiResult.usage.output_tokens || 0)
      await trackAIUsage(
        schoolId,
        'match_report',
        'claude-sonnet-4-6',
        aiResult.usage.input_tokens,
        aiResult.usage.output_tokens
      )

      // Save report to database
      const insertResult = await pool.query(
        `INSERT INTO match_reports (school_id, team_id, match_id, report_text, status, model_used, generation_cost_tokens)
         VALUES ($1, $2, $3, $4, 'draft', 'claude-sonnet-4-6', $5)
         RETURNING *`,
        [schoolId, match.team_id, matchId, aiResult.text, totalTokens]
      )

      res.json({
        report: insertResult.rows[0],
        usage: aiResult.usage,
      })
    } catch (error) {
      console.error('Generate match report error:', error)
      res.status(500).json({ error: error.message || 'Failed to generate match report' })
    }
  }
)

// PUT /:schoolId/matches/:matchId/report - Edit/approve report
router.put(
  '/:schoolId/matches/:matchId/report',
  authenticateToken,
  loadSchool,
  requireSchoolRole('owner', 'admin', 'coach'),
  async (req, res) => {
    try {
      const { schoolId, matchId } = req.params
      const { report_text, status } = req.body

      const updates = []
      const values = []
      let idx = 1

      if (report_text !== undefined) {
        updates.push(`report_text = $${idx++}`)
        values.push(report_text)
      }
      if (status !== undefined) {
        updates.push(`status = $${idx++}`)
        values.push(status)
        if (status === 'approved') {
          updates.push(`approved_by = $${idx++}`)
          values.push(req.user.id)
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No updates provided' })
      }

      values.push(matchId, schoolId)
      const result = await pool.query(
        `UPDATE match_reports
         SET ${updates.join(', ')}
         WHERE match_id = $${idx++} AND school_id = $${idx++}
         RETURNING *`,
        values
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Report not found' })
      }

      res.json({ report: result.rows[0] })
    } catch (error) {
      console.error('Update match report error:', error)
      res.status(500).json({ error: 'Failed to update match report' })
    }
  }
)

// POST /:schoolId/matches/:matchId/report/send - Send report to parents
router.post(
  '/:schoolId/matches/:matchId/report/send',
  authenticateToken,
  loadSchool,
  requireSchoolRole('owner', 'admin', 'coach'),
  requireSchoolFeature('ai_match_reports'),
  async (req, res) => {
    try {
      const { schoolId, matchId } = req.params

      // Get the report
      const reportResult = await pool.query(
        `SELECT mr.*, m.opponent, t.name as team_name, t.id as team_id
         FROM match_reports mr
         JOIN matches m ON m.id = mr.match_id
         JOIN teams t ON t.id = mr.team_id
         WHERE mr.match_id = $1 AND mr.school_id = $2
         ORDER BY mr.created_at DESC LIMIT 1`,
        [matchId, schoolId]
      )

      if (reportResult.rows.length === 0) {
        return res.status(404).json({ error: 'No report found for this match. Generate one first.' })
      }

      const report = reportResult.rows[0]

      // Get guardians linked to pupils in this team
      const guardiansResult = await pool.query(
        `SELECT DISTINCT g.email, g.first_name, g.last_name
         FROM guardians g
         JOIN pupil_guardians pg ON pg.guardian_id = g.id
         JOIN pupils p ON p.id = pg.pupil_id
         WHERE p.team_id = $1 AND g.school_id = $2 AND g.email IS NOT NULL`,
        [report.team_id, schoolId]
      )

      const guardians = guardiansResult.rows
      let sentCount = 0

      if (isEmailEnabled() && guardians.length > 0) {
        const subject = `Match Report: ${report.team_name} vs ${report.opponent}`
        const emailPromises = guardians.map(async (guardian) => {
          try {
            await sendNotificationEmail(guardian.email, {
              teamName: report.team_name,
              title: subject,
              message: report.report_text,
              actionLink: null,
              actionText: null,
            })
            sentCount++
          } catch (emailError) {
            console.error(`Failed to send report to ${guardian.email}:`, emailError)
          }
        })

        await Promise.allSettled(emailPromises)
      }

      // Mark as sent
      await pool.query(
        `UPDATE match_reports SET sent_at = NOW(), status = 'sent'
         WHERE id = $1`,
        [report.id]
      )

      res.json({
        success: true,
        sent_count: sentCount,
        total_guardians: guardians.length,
        message: sentCount > 0
          ? `Report sent to ${sentCount} parent${sentCount !== 1 ? 's' : ''}`
          : 'Report marked as sent. Email sending may not be configured.',
      })
    } catch (error) {
      console.error('Send match report error:', error)
      res.status(500).json({ error: 'Failed to send match report' })
    }
  }
)

// =============================================
// AI INSIGHTS
// =============================================

// GET /:schoolId/insights - All insights (paginated)
router.get(
  '/:schoolId/insights',
  authenticateToken,
  loadSchool,
  requireSchoolRole('owner', 'admin', 'coach', 'secretary'),
  async (req, res) => {
    try {
      const { schoolId } = req.params
      const page = parseInt(req.query.page) || 1
      const limit = Math.min(parseInt(req.query.limit) || 20, 100)
      const offset = (page - 1) * limit

      const [insightsResult, countResult] = await Promise.all([
        pool.query(
          `SELECT * FROM ai_insights
           WHERE school_id = $1
           ORDER BY created_at DESC
           LIMIT $2 OFFSET $3`,
          [schoolId, limit, offset]
        ),
        pool.query(
          `SELECT COUNT(*) FROM ai_insights WHERE school_id = $1`,
          [schoolId]
        ),
      ])

      res.json({
        insights: insightsResult.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
        },
      })
    } catch (error) {
      console.error('Get insights error:', error)
      res.status(500).json({ error: 'Failed to fetch insights' })
    }
  }
)

// GET /:schoolId/teams/:teamId/insights - Team-specific insights
router.get(
  '/:schoolId/teams/:teamId/insights',
  authenticateToken,
  loadSchool,
  requireSchoolRole('owner', 'admin', 'coach'),
  async (req, res) => {
    try {
      const { schoolId, teamId } = req.params
      const page = parseInt(req.query.page) || 1
      const limit = Math.min(parseInt(req.query.limit) || 20, 100)
      const offset = (page - 1) * limit

      const [insightsResult, countResult] = await Promise.all([
        pool.query(
          `SELECT * FROM ai_insights
           WHERE school_id = $1 AND (team_id = $2 OR team_id IS NULL)
           ORDER BY created_at DESC
           LIMIT $3 OFFSET $4`,
          [schoolId, teamId, limit, offset]
        ),
        pool.query(
          `SELECT COUNT(*) FROM ai_insights
           WHERE school_id = $1 AND (team_id = $2 OR team_id IS NULL)`,
          [schoolId, teamId]
        ),
      ])

      res.json({
        insights: insightsResult.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
        },
      })
    } catch (error) {
      console.error('Get team insights error:', error)
      res.status(500).json({ error: 'Failed to fetch team insights' })
    }
  }
)

// PUT /:schoolId/insights/:id - Mark insight as seen/actioned
router.put(
  '/:schoolId/insights/:id',
  authenticateToken,
  loadSchool,
  requireSchoolRole('owner', 'admin', 'coach', 'secretary'),
  async (req, res) => {
    try {
      const { schoolId, id } = req.params
      const { actioned } = req.body
      const userId = req.user.id

      // Add user to seen_by array if not already there
      const updateResult = await pool.query(
        `UPDATE ai_insights
         SET seen_by = CASE
           WHEN NOT (seen_by @> $1::jsonb)
           THEN seen_by || $1::jsonb
           ELSE seen_by
         END,
         actioned = COALESCE($2, actioned)
         WHERE id = $3 AND school_id = $4
         RETURNING *`,
        [JSON.stringify([userId]), actioned, id, schoolId]
      )

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Insight not found' })
      }

      res.json({ insight: updateResult.rows[0] })
    } catch (error) {
      console.error('Update insight error:', error)
      res.status(500).json({ error: 'Failed to update insight' })
    }
  }
)

// =============================================
// SEASON REPORT
// =============================================

// POST /:schoolId/reports/season-summary - Generate season report
router.post(
  '/:schoolId/reports/season-summary',
  authenticateToken,
  loadSchool,
  requireSchoolRole('owner', 'admin'),
  requireSchoolFeature('ai_season_report'),
  async (req, res) => {
    try {
      const { schoolId } = req.params
      const school = req.school

      // Check monthly cap
      const capCheck = await checkMonthlyUsageCap(schoolId, school.subscription_tier)
      if (!capCheck.allowed) {
        return res.status(429).json({
          error: 'Monthly AI usage limit reached',
          used: capCheck.used,
          cap: capCheck.cap,
        })
      }

      // Gather school data for the report
      // Membership data
      const membershipResult = await pool.query(
        `SELECT
           COUNT(DISTINCT p.id) as total_players,
           COUNT(DISTINCT t.id) as total_teams,
           COUNT(DISTINCT g.id) as total_guardians,
           COUNT(DISTINCT cm.user_id) FILTER (WHERE cm.role IN ('coach', 'admin', 'owner')) as total_volunteers
         FROM teams t
         LEFT JOIN pupils p ON p.team_id = t.id AND p.is_active = true
         LEFT JOIN guardians g ON g.school_id = $1
         LEFT JOIN school_members cm ON cm.school_id = $1
         WHERE t.school_id = $1`,
        [schoolId]
      )

      // Match data (current season)
      const matchResult = await pool.query(
        `SELECT
           COUNT(*) as total_matches,
           COUNT(*) FILTER (WHERE m.score_for > m.score_against OR m.goals_for > m.goals_against) as wins,
           COUNT(*) FILTER (WHERE m.score_for = m.score_against OR m.goals_for = m.goals_against) as draws,
           COUNT(*) FILTER (WHERE m.score_for < m.score_against OR m.goals_for < m.goals_against) as losses
         FROM matches m
         JOIN teams t ON t.id = m.team_id
         WHERE t.school_id = $1
           AND (m.match_date >= NOW() - INTERVAL '12 months' OR m.date >= NOW() - INTERVAL '12 months')`,
        [schoolId]
      )

      // Financial data
      let financialData = null
      try {
        const finResult = await pool.query(
          `SELECT
             COALESCE(SUM(amount), 0) as total_revenue,
             COUNT(*) as total_transactions
           FROM club_transactions
           WHERE school_id = $1 AND created_at >= NOW() - INTERVAL '12 months'`,
          [schoolId]
        )
        financialData = finResult.rows[0]
      } catch {
        // Financial tables may not exist yet
      }

      // Compliance data
      let complianceData = null
      try {
        const compResult = await pool.query(
          `SELECT
             COUNT(*) as total_records,
             COUNT(*) FILTER (WHERE dbs_status = 'valid') as valid_dbs,
             COUNT(*) FILTER (WHERE dbs_expiry_date < NOW()) as expired_dbs,
             COUNT(*) FILTER (WHERE first_aid_expiry > NOW()) as valid_first_aid
           FROM compliance_records
           WHERE school_id = $1`,
          [schoolId]
        )
        complianceData = compResult.rows[0]
      } catch {
        // Compliance tables may not exist
      }

      const aiResult = await generateSeasonSummary({
        clubName: school.name,
        financialData,
        membershipData: membershipResult.rows[0],
        matchData: matchResult.rows[0],
        attendanceData: req.body.attendanceData || null,
        complianceData,
      })

      // Track usage
      await trackAIUsage(
        schoolId,
        'season_summary',
        'claude-sonnet-4-6',
        aiResult.usage.input_tokens,
        aiResult.usage.output_tokens
      )

      // Store as an insight
      await pool.query(
        `INSERT INTO ai_insights (school_id, insight_type, title, content, data_snapshot, priority, model_used)
         VALUES ($1, 'season_summary', 'Season Summary Report', $2, $3, 'normal', 'claude-sonnet-4-6')`,
        [schoolId, JSON.stringify(aiResult.text), JSON.stringify({
          membership: membershipResult.rows[0],
          matches: matchResult.rows[0],
          financial: financialData,
          compliance: complianceData,
        })]
      )

      res.json({
        report: aiResult.text,
        usage: aiResult.usage,
      })
    } catch (error) {
      console.error('Generate season summary error:', error)
      res.status(500).json({ error: error.message || 'Failed to generate season summary' })
    }
  }
)

// GET /:schoolId/reports/season-summary/latest - Get latest report
router.get(
  '/:schoolId/reports/season-summary/latest',
  authenticateToken,
  loadSchool,
  requireSchoolRole('owner', 'admin', 'coach', 'secretary'),
  async (req, res) => {
    try {
      const { schoolId } = req.params

      const result = await pool.query(
        `SELECT * FROM ai_insights
         WHERE school_id = $1 AND insight_type = 'season_summary'
         ORDER BY created_at DESC LIMIT 1`,
        [schoolId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No season summary found. Generate one first.' })
      }

      const insight = result.rows[0]
      let parsedContent
      try {
        parsedContent = JSON.parse(insight.content)
      } catch {
        parsedContent = insight.content
      }

      res.json({
        report: parsedContent,
        data_snapshot: insight.data_snapshot,
        created_at: insight.created_at,
      })
    } catch (error) {
      console.error('Get season summary error:', error)
      res.status(500).json({ error: 'Failed to fetch season summary' })
    }
  }
)

// =============================================
// GRANT HELPER
// =============================================

// POST /:schoolId/grants/draft - Generate grant draft
router.post(
  '/:schoolId/grants/draft',
  authenticateToken,
  loadSchool,
  requireSchoolRole('owner', 'admin', 'secretary'),
  requireSchoolFeature('ai_grant_helper'),
  async (req, res) => {
    try {
      const { schoolId } = req.params
      const school = req.school
      const { grant_type, description, estimated_cost } = req.body

      if (!grant_type || !description) {
        return res.status(400).json({ error: 'grant_type and description are required' })
      }

      // Check monthly cap
      const capCheck = await checkMonthlyUsageCap(schoolId, school.subscription_tier)
      if (!capCheck.allowed) {
        return res.status(429).json({
          error: 'Monthly AI usage limit reached',
          used: capCheck.used,
          cap: capCheck.cap,
        })
      }

      // Gather school stats for the application
      const statsResult = await pool.query(
        `SELECT
           COUNT(DISTINCT t.id) as team_count,
           COUNT(DISTINCT p.id) as player_count,
           array_agg(DISTINCT t.age_group) FILTER (WHERE t.age_group IS NOT NULL) as age_groups
         FROM teams t
         LEFT JOIN pupils p ON p.team_id = t.id AND p.is_active = true
         WHERE t.school_id = $1`,
        [schoolId]
      )

      const stats = statsResult.rows[0]

      const aiResult = await generateGrantDraft({
        clubName: school.name,
        location: school.city || school.county || school.postcode,
        faAffiliation: school.fa_affiliation_number,
        charterStandard: school.charter_standard,
        teams: stats.team_count,
        totalPlayers: stats.player_count,
        ageGroups: stats.age_groups,
        growthPercent: req.body.growth_percent || null,
        grantType: grant_type,
        description,
        estimatedCost: estimated_cost,
      })

      // Track usage
      await trackAIUsage(
        schoolId,
        'grant_draft',
        'claude-sonnet-4-6',
        aiResult.usage.input_tokens,
        aiResult.usage.output_tokens
      )

      // Save draft
      const draftResult = await pool.query(
        `INSERT INTO grant_drafts (school_id, grant_type, description, estimated_cost, draft_text, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [schoolId, grant_type, description, estimated_cost || null, aiResult.text, req.user.id]
      )

      res.json({
        draft: draftResult.rows[0],
        usage: aiResult.usage,
      })
    } catch (error) {
      console.error('Generate grant draft error:', error)
      res.status(500).json({ error: error.message || 'Failed to generate grant draft' })
    }
  }
)

// GET /:schoolId/grants/drafts - List saved drafts
router.get(
  '/:schoolId/grants/drafts',
  authenticateToken,
  loadSchool,
  requireSchoolRole('owner', 'admin', 'secretary'),
  async (req, res) => {
    try {
      const { schoolId } = req.params

      const result = await pool.query(
        `SELECT gd.*, u.name as created_by_name
         FROM grant_drafts gd
         LEFT JOIN users u ON u.id = gd.created_by
         WHERE gd.school_id = $1
         ORDER BY gd.created_at DESC`,
        [schoolId]
      )

      res.json({ drafts: result.rows })
    } catch (error) {
      console.error('Get grant drafts error:', error)
      res.status(500).json({ error: 'Failed to fetch grant drafts' })
    }
  }
)

// PUT /:schoolId/grants/drafts/:id - Update draft
router.put(
  '/:schoolId/grants/drafts/:id',
  authenticateToken,
  loadSchool,
  requireSchoolRole('owner', 'admin', 'secretary'),
  async (req, res) => {
    try {
      const { schoolId, id } = req.params
      const { draft_text, status } = req.body

      const updates = []
      const values = []
      let idx = 1

      if (draft_text !== undefined) {
        updates.push(`draft_text = $${idx++}`)
        values.push(draft_text)
      }
      if (status !== undefined) {
        updates.push(`status = $${idx++}`)
        values.push(status)
      }
      updates.push(`updated_at = NOW()`)

      if (updates.length <= 1) {
        return res.status(400).json({ error: 'No updates provided' })
      }

      values.push(id, schoolId)
      const result = await pool.query(
        `UPDATE grant_drafts
         SET ${updates.join(', ')}
         WHERE id = $${idx++} AND school_id = $${idx++}
         RETURNING *`,
        values
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Draft not found' })
      }

      res.json({ draft: result.rows[0] })
    } catch (error) {
      console.error('Update grant draft error:', error)
      res.status(500).json({ error: 'Failed to update grant draft' })
    }
  }
)

// =============================================
// COMPLIANCE ANALYSIS
// =============================================

// POST /:schoolId/compliance/ai-analysis - Run AI gap analysis
router.post(
  '/:schoolId/compliance/ai-analysis',
  authenticateToken,
  loadSchool,
  requireSchoolRole('owner', 'admin'),
  requireSchoolFeature('ai_compliance_analysis'),
  async (req, res) => {
    try {
      const { schoolId } = req.params
      const school = req.school

      // Check monthly cap
      const capCheck = await checkMonthlyUsageCap(schoolId, school.subscription_tier)
      if (!capCheck.allowed) {
        return res.status(429).json({
          error: 'Monthly AI usage limit reached',
          used: capCheck.used,
          cap: capCheck.cap,
        })
      }

      // Gather compliance data
      const volunteersResult = await pool.query(
        `SELECT cr.*, u.name as volunteer_name
         FROM compliance_records cr
         JOIN users u ON u.id = cr.user_id
         WHERE cr.school_id = $1`,
        [schoolId]
      )

      const rolesResult = await pool.query(
        `SELECT sr.*, u.name as person_name
         FROM safeguarding_roles sr
         JOIN users u ON u.id = sr.user_id
         WHERE sr.school_id = $1`,
        [schoolId]
      )

      // Teams without a first aid qualified person
      const firstAidResult = await pool.query(
        `SELECT t.id, t.name
         FROM teams t
         WHERE t.school_id = $1
           AND t.id NOT IN (
             SELECT DISTINCT tm.team_id
             FROM team_memberships tm
             JOIN compliance_records cr ON cr.user_id = tm.user_id AND cr.school_id = $1
             WHERE cr.first_aid_expiry > NOW()
             AND tm.team_id IS NOT NULL
           )`,
        [schoolId]
      )

      const volunteers = volunteersResult.rows.map(v => ({
        name: v.volunteer_name,
        role: v.role_at_club,
        dbs_status: v.dbs_status,
        dbs_expiry: v.dbs_expiry_date,
        first_aid_expiry: v.first_aid_expiry,
        safeguarding_expiry: v.safeguarding_expiry,
        coaching_badges: v.coaching_badges,
      }))

      const roles = rolesResult.rows.map(r => ({
        person: r.person_name,
        role: r.safeguarding_role,
        training_current: r.training_up_to_date,
      }))

      const teamsWithoutFirstAid = firstAidResult.rows.map(t => t.name)

      const aiResult = await generateComplianceAnalysis({
        clubName: school.name,
        charterStandard: school.charter_standard,
        volunteers,
        roles,
        teamsWithoutFirstAid,
      })

      // Track usage
      await trackAIUsage(
        schoolId,
        'compliance_analysis',
        'claude-sonnet-4-6',
        aiResult.usage.input_tokens,
        aiResult.usage.output_tokens
      )

      // Store as insight
      await pool.query(
        `INSERT INTO ai_insights (school_id, insight_type, title, content, data_snapshot, priority, model_used)
         VALUES ($1, 'compliance_analysis', 'Compliance Gap Analysis', $2, $3, 'high', 'claude-sonnet-4-6')`,
        [schoolId, JSON.stringify(aiResult.text), JSON.stringify({
          volunteer_count: volunteers.length,
          roles_filled: roles.length,
          teams_without_first_aid: teamsWithoutFirstAid,
        })]
      )

      res.json({
        analysis: aiResult.text,
        usage: aiResult.usage,
      })
    } catch (error) {
      console.error('Compliance analysis error:', error)
      res.status(500).json({ error: error.message || 'Failed to generate compliance analysis' })
    }
  }
)

// GET /:schoolId/compliance/ai-analysis/latest - Most recent analysis
router.get(
  '/:schoolId/compliance/ai-analysis/latest',
  authenticateToken,
  loadSchool,
  requireSchoolRole('owner', 'admin'),
  async (req, res) => {
    try {
      const { schoolId } = req.params

      const result = await pool.query(
        `SELECT * FROM ai_insights
         WHERE school_id = $1 AND insight_type = 'compliance_analysis'
         ORDER BY created_at DESC LIMIT 1`,
        [schoolId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No compliance analysis found. Run one first.' })
      }

      const insight = result.rows[0]
      let parsedContent
      try {
        parsedContent = JSON.parse(insight.content)
      } catch {
        parsedContent = insight.content
      }

      res.json({
        analysis: parsedContent,
        data_snapshot: insight.data_snapshot,
        created_at: insight.created_at,
      })
    } catch (error) {
      console.error('Get compliance analysis error:', error)
      res.status(500).json({ error: 'Failed to fetch compliance analysis' })
    }
  }
)

// =============================================
// COACH DEVELOPMENT
// =============================================

// GET /:schoolId/coaches/:userId/development-suggestions - AI suggestions
router.get(
  '/:schoolId/coaches/:userId/development-suggestions',
  authenticateToken,
  loadSchool,
  requireSchoolRole('owner', 'admin', 'coach'),
  requireSchoolFeature('ai_coach_development'),
  async (req, res) => {
    try {
      const { schoolId, userId } = req.params
      const school = req.school

      // Only allow coaches to view their own, or admins/owners to view anyone
      const isOwnProfile = req.user.id === userId
      const isAdminOrOwner = ['owner', 'admin'].includes(req.clubRole)
      if (!isOwnProfile && !isAdminOrOwner) {
        return res.status(403).json({ error: 'You can only view your own development suggestions' })
      }

      // Check monthly cap
      const capCheck = await checkMonthlyUsageCap(schoolId, school.subscription_tier)
      if (!capCheck.allowed) {
        return res.status(429).json({
          error: 'Monthly AI usage limit reached',
          used: capCheck.used,
          cap: capCheck.cap,
        })
      }

      // Get coach info
      const coachResult = await pool.query(
        `SELECT u.name, cr.coaching_badges
         FROM users u
         LEFT JOIN compliance_records cr ON cr.user_id = u.id AND cr.school_id = $1
         WHERE u.id = $2`,
        [schoolId, userId]
      )

      if (coachResult.rows.length === 0) {
        return res.status(404).json({ error: 'Coach not found' })
      }

      const coach = coachResult.rows[0]

      // Get coach activity stats
      const [sessionResult, videoResult, observationResult, themesResult] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) as count FROM training_sessions ts
           JOIN teams t ON t.id = ts.team_id
           WHERE t.school_id = $1 AND ts.date >= NOW() - INTERVAL '12 months'`,
          [schoolId]
        ),
        pool.query(
          `SELECT COUNT(*) as count FROM video_ai_analysis va
           JOIN videos v ON v.id = va.video_id
           JOIN teams t ON t.id = v.team_id
           WHERE t.school_id = $1 AND va.created_at >= NOW() - INTERVAL '12 months'`,
          [schoolId]
        ),
        pool.query(
          `SELECT COUNT(*) as count FROM observations o
           WHERE o.observer_id = $1 AND o.created_at >= NOW() - INTERVAL '12 months'`,
          [userId]
        ),
        pool.query(
          `SELECT ts.focus_areas as theme, COUNT(*) as count
           FROM training_sessions ts
           JOIN teams t ON t.id = ts.team_id
           WHERE t.school_id = $1 AND ts.focus_areas IS NOT NULL AND ts.date >= NOW() - INTERVAL '6 months'
           GROUP BY ts.focus_areas ORDER BY count DESC LIMIT 5`,
          [schoolId]
        ),
      ])

      const aiResult = await generateCoachDevelopment({
        coachName: coach.name,
        badges: coach.coaching_badges,
        sessionCount: parseInt(sessionResult.rows[0].count),
        videoCount: parseInt(videoResult.rows[0].count),
        observationCount: parseInt(observationResult.rows[0].count),
        sessionThemes: themesResult.rows.map(r => r.theme),
      })

      // Track usage
      await trackAIUsage(
        schoolId,
        'coach_development',
        'claude-sonnet-4-6',
        aiResult.usage.input_tokens,
        aiResult.usage.output_tokens
      )

      res.json({
        suggestions: aiResult.text,
        coach: {
          name: coach.name,
          badges: coach.coaching_badges,
          sessions_delivered: parseInt(sessionResult.rows[0].count),
          videos_analysed: parseInt(videoResult.rows[0].count),
          observations_recorded: parseInt(observationResult.rows[0].count),
        },
        usage: aiResult.usage,
      })
    } catch (error) {
      console.error('Coach development suggestions error:', error)
      res.status(500).json({ error: error.message || 'Failed to generate coach development suggestions' })
    }
  }
)

// =============================================
// AI USAGE STATS (for school dashboard)
// =============================================

// GET /:schoolId/ai-usage - Get current month's AI usage
router.get(
  '/:schoolId/ai-usage',
  authenticateToken,
  loadSchool,
  requireSchoolRole('owner', 'admin'),
  async (req, res) => {
    try {
      const { schoolId } = req.params
      const school = req.school

      const [usageResult, breakdownResult] = await Promise.all([
        pool.query(
          `SELECT
             COALESCE(SUM(estimated_cost_gbp), 0) as total_cost,
             COALESCE(SUM(input_tokens), 0) as total_input_tokens,
             COALESCE(SUM(output_tokens), 0) as total_output_tokens,
             COUNT(*) as total_calls
           FROM ai_usage
           WHERE school_id = $1
             AND created_at >= date_trunc('month', NOW())`,
          [schoolId]
        ),
        pool.query(
          `SELECT
             feature,
             COALESCE(SUM(estimated_cost_gbp), 0) as cost,
             COUNT(*) as calls
           FROM ai_usage
           WHERE school_id = $1
             AND created_at >= date_trunc('month', NOW())
           GROUP BY feature
           ORDER BY cost DESC`,
          [schoolId]
        ),
      ])

      const usage = usageResult.rows[0]
      const cap = TIER_MONTHLY_CAPS[school.subscription_tier] || 999

      res.json({
        current_month: {
          total_cost_gbp: Math.round(parseFloat(usage.total_cost) * 100) / 100,
          total_input_tokens: parseInt(usage.total_input_tokens),
          total_output_tokens: parseInt(usage.total_output_tokens),
          total_calls: parseInt(usage.total_calls),
          cap_gbp: cap,
          usage_percent: Math.round((parseFloat(usage.total_cost) / cap) * 100),
        },
        breakdown: breakdownResult.rows.map(r => ({
          feature: r.feature,
          cost_gbp: Math.round(parseFloat(r.cost) * 100) / 100,
          calls: parseInt(r.calls),
        })),
        tier: school.subscription_tier,
      })
    } catch (error) {
      console.error('Get AI usage error:', error)
      res.status(500).json({ error: 'Failed to fetch AI usage' })
    }
  }
)

// =============================================
// ATTENDANCE INSIGHTS
// =============================================

// POST /:schoolId/teams/:teamId/attendance-insights - Generate AI attendance insights
router.post(
  '/:schoolId/teams/:teamId/attendance-insights',
  authenticateToken,
  loadSchool,
  requireSchoolRole('owner', 'admin', 'coach'),
  requireSchoolFeature('ai_attendance_insights'),
  async (req, res) => {
    try {
      const { schoolId, teamId } = req.params
      const school = req.school

      // Check monthly cap
      const capCheck = await checkMonthlyUsageCap(schoolId, school.subscription_tier)
      if (!capCheck.allowed) {
        return res.status(429).json({
          error: 'Monthly AI usage limit reached',
          used: capCheck.used,
          cap: capCheck.cap,
        })
      }

      // Fetch team info
      const teamResult = await pool.query(
        'SELECT name, age_group FROM teams WHERE id = $1 AND school_id = $2',
        [teamId, schoolId]
      )
      if (teamResult.rows.length === 0) {
        return res.status(404).json({ error: 'Team not found' })
      }
      const team = teamResult.rows[0]

      // Fetch session attendance data (last 12 weeks)
      const [sessionsResult, playerPatternsResult] = await Promise.all([
        pool.query(
          `SELECT
            ts.id, ts.date, ts.session_type,
            COUNT(ta.id) FILTER (WHERE ta.attended = true) as players_present,
            COUNT(DISTINCT p.id) as players_invited
           FROM training_sessions ts
           CROSS JOIN pupils p
           LEFT JOIN training_attendance ta ON ta.session_id = ts.id AND ta.pupil_id = p.id
           WHERE ts.team_id = $1
             AND p.team_id = $1
             AND p.is_active = true
             AND ts.date >= NOW() - INTERVAL '12 weeks'
           GROUP BY ts.id, ts.date, ts.session_type
           ORDER BY ts.date DESC`,
          [teamId]
        ),
        pool.query(
          `SELECT
            p.name as pupil,
            COUNT(DISTINCT ts.id) as total_sessions,
            COUNT(ta.id) FILTER (WHERE ta.attended = true) as attended,
            CASE
              WHEN COUNT(DISTINCT ts.id) > 0
              THEN ROUND(COUNT(ta.id) FILTER (WHERE ta.attended = true)::numeric / COUNT(DISTINCT ts.id) * 100)
              ELSE 0
            END as attendance_percent
           FROM pupils p
           CROSS JOIN training_sessions ts
           LEFT JOIN training_attendance ta ON ta.session_id = ts.id AND ta.pupil_id = p.id
           WHERE p.team_id = $1
             AND ts.team_id = $1
             AND p.is_active = true
             AND ts.date >= NOW() - INTERVAL '12 weeks'
           GROUP BY p.id, p.name
           ORDER BY attendance_percent ASC`,
          [teamId]
        ),
      ])

      if (sessionsResult.rows.length === 0) {
        return res.status(400).json({
          error: 'Not enough data',
          message: 'Record attendance for a few training sessions first, then come back for insights.',
        })
      }

      const sessions = sessionsResult.rows.map(r => ({
        date: r.date,
        session_type: r.session_type || 'training',
        players_present: parseInt(r.players_present),
        players_invited: parseInt(r.players_invited),
      }))

      const playerPatterns = playerPatternsResult.rows.map(r => ({
        pupil: r.pupil,
        total_sessions: parseInt(r.total_sessions),
        attended: parseInt(r.attended),
        attendance_percent: parseInt(r.attendance_percent),
      }))

      // Generate AI insights
      const aiResult = await generateAttendanceInsights({
        teamName: team.name,
        ageGroup: team.age_group,
        sessions,
        playerPatterns,
      })

      // Track usage
      if (aiResult.usage) {
        await trackAIUsage(
          schoolId,
          'attendance_insights',
          'claude-sonnet-4-5-20250929',
          aiResult.usage.input_tokens || 0,
          aiResult.usage.output_tokens || 0
        )
      }

      // Save as insight
      const insights = typeof aiResult === 'string' ? aiResult : (aiResult.content || aiResult)
      await pool.query(
        `INSERT INTO ai_insights (school_id, team_id, insight_type, title, content, data_snapshot, priority)
         VALUES ($1, $2, 'attendance', $3, $4, $5, 'normal')`,
        [
          schoolId,
          teamId,
          `Attendance Insights - ${team.name}`,
          typeof insights === 'string' ? insights : JSON.stringify(insights),
          JSON.stringify({ sessions, playerPatterns, generated_at: new Date() }),
        ]
      )

      res.json({
        insights,
        sessions_analysed: sessions.length,
        players_analysed: playerPatterns.length,
        usage: capCheck,
      })
    } catch (error) {
      console.error('Attendance insights error:', error)
      res.status(500).json({ error: 'Failed to generate attendance insights' })
    }
  }
)

export default router
