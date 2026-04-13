import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { checkAndIncrementUsage, getEntitlements } from '../services/billingService.js'

const router = Router()

// ==========================================
// SEASON DEVELOPMENT DASHBOARD
// ==========================================

// Get season development overview for a team
// Aggregates: attribute snapshots, training attendance + effort, observations, achievements, POTM
router.get('/:teamId/season-development', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const { season_start } = req.query

    // Default season start: previous September 1st (or current if we're past Sept)
    const now = new Date()
    let seasonStart
    if (season_start) {
      seasonStart = new Date(season_start)
    } else {
      const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
      seasonStart = new Date(year, 8, 1) // Sept 1
    }

    // Verify team access
    const teamCheck = await pool.query('SELECT id, name FROM teams WHERE id = $1', [teamId])
    if (teamCheck.rows.length === 0) return res.status(404).json({ error: 'Team not found' })

    // Get all active pupils for this team
    const playersResult = await pool.query(
      `SELECT *
       FROM pupils
       WHERE team_id = $1 AND (is_active IS NULL OR is_active = true)
       ORDER BY name`,
      [teamId]
    )
    const pupils = playersResult.rows
    const pupilIds = pupils.map(p => p.id)

    if (pupilIds.length === 0) {
      return res.json({
        team: teamCheck.rows[0],
        season_start: seasonStart,
        pupils: [],
        squad_summary: { total: 0 },
      })
    }

    // Helper: run a query, returning empty rows on failure (table may not exist yet)
    const safeQuery = (sql, params) => pool.query(sql, params).catch(() => ({ rows: [] }))

    // Run all queries in parallel for performance
    const [
      trainingStatsResult,
      observationStatsResult,
      achievementStatsResult,
      potmResult,
      snapshotsResult,
      matchAppearancesResult,
    ] = await Promise.all([

      // 1. Training attendance + effort per pupil this season
      safeQuery(
        `SELECT
           ta.pupil_id,
           COUNT(*) FILTER (WHERE ta.attended = true) as sessions_attended,
           COUNT(*) as sessions_total,
           ROUND(AVG(ta.effort_rating) FILTER (WHERE ta.effort_rating IS NOT NULL), 1) as avg_effort,
           COUNT(ta.effort_rating) FILTER (WHERE ta.effort_rating IS NOT NULL) as effort_ratings_count
         FROM training_attendance ta
         JOIN training_sessions ts ON ts.id = ta.session_id
         WHERE ta.pupil_id = ANY($1)
           AND ts.team_id = $2
           AND ts.date >= $3
         GROUP BY ta.pupil_id`,
        [pupilIds, teamId, seasonStart]
      ),

      // 2. Observation counts by type per pupil this season
      safeQuery(
        `SELECT
           pupil_id,
           COUNT(*) as total_observations,
           COUNT(*) FILTER (WHERE type = 'technical') as technical_count,
           COUNT(*) FILTER (WHERE type = 'tactical') as tactical_count,
           COUNT(*) FILTER (WHERE type = 'physical') as physical_count,
           COUNT(*) FILTER (WHERE type = 'mental') as mental_count
         FROM observations
         WHERE pupil_id = ANY($1) AND created_at >= $2
         GROUP BY pupil_id`,
        [pupilIds, seasonStart]
      ),

      // 3. Achievements per pupil this season
      safeQuery(
        `SELECT
           pupil_id,
           COUNT(*) as total_achievements,
           jsonb_agg(jsonb_build_object(
             'type', achievement_type, 'title', title, 'icon', icon, 'earned_at', earned_at
           ) ORDER BY earned_at DESC) as achievements
         FROM pupil_achievements
         WHERE pupil_id = ANY($1) AND earned_at >= $2
         GROUP BY pupil_id`,
        [pupilIds, seasonStart]
      ),

      // 4. Pupil of the Match awards this season
      safeQuery(
        `SELECT
           player_of_match_id as pupil_id,
           COUNT(*) as potm_count
         FROM matches
         WHERE team_id = $1
           AND match_date >= $2
           AND player_of_match_id IS NOT NULL
         GROUP BY player_of_match_id`,
        [teamId, seasonStart]
      ),

      // 5. Attribute snapshots this season (earliest + latest per pupil for comparison)
      safeQuery(
        `SELECT DISTINCT ON (pupil_id, rank_order)
           pupil_id,
           physical_attributes, technical_skills, tactical_understanding,
           mental_traits, core_capabilities,
           created_at,
           rank_order
         FROM (
           SELECT *,
             ROW_NUMBER() OVER (PARTITION BY pupil_id ORDER BY created_at ASC) as asc_rank,
             ROW_NUMBER() OVER (PARTITION BY pupil_id ORDER BY created_at DESC) as desc_rank,
             CASE
               WHEN ROW_NUMBER() OVER (PARTITION BY pupil_id ORDER BY created_at ASC) = 1 THEN 'earliest'
               WHEN ROW_NUMBER() OVER (PARTITION BY pupil_id ORDER BY created_at DESC) = 1 THEN 'latest'
             END as rank_order
           FROM attribute_snapshots
           WHERE pupil_id = ANY($1) AND team_id = $2 AND created_at >= $3
         ) sub
         WHERE rank_order IS NOT NULL
         ORDER BY pupil_id, rank_order`,
        [pupilIds, teamId, seasonStart]
      ),

      // 6. Match appearances (squad selections) this season
      safeQuery(
        `SELECT
           ms.pupil_id,
           COUNT(*) as appearances,
           COUNT(*) FILTER (WHERE ms.is_starting = true) as starts
         FROM match_squads ms
         JOIN matches m ON m.id = ms.match_id
         WHERE ms.pupil_id = ANY($1)
           AND m.team_id = $2
           AND m.match_date >= $3
         GROUP BY ms.pupil_id`,
        [pupilIds, teamId, seasonStart]
      ),
    ])

    // Index results by pupil_id for fast lookup
    const trainingByPlayer = Object.fromEntries(trainingStatsResult.rows.map(r => [r.pupil_id, r]))
    const obsByPlayer = Object.fromEntries(observationStatsResult.rows.map(r => [r.pupil_id, r]))
    const achieveByPlayer = Object.fromEntries(achievementStatsResult.rows.map(r => [r.pupil_id, r]))
    const potmByPlayer = Object.fromEntries(potmResult.rows.map(r => [r.pupil_id, r]))
    const matchesByPlayer = Object.fromEntries(matchAppearancesResult.rows.map(r => [r.pupil_id, r]))

    // Group snapshots by pupil
    const snapshotsByPlayer = {}
    for (const snap of snapshotsResult.rows) {
      if (!snapshotsByPlayer[snap.pupil_id]) snapshotsByPlayer[snap.pupil_id] = {}
      snapshotsByPlayer[snap.pupil_id][snap.rank_order] = snap
    }

    // Build per-pupil development data
    const playerDevelopment = pupils.map(pupil => {
      const training = trainingByPlayer[pupil.id]
      const obs = obsByPlayer[pupil.id]
      const achieve = achieveByPlayer[pupil.id]
      const potm = potmByPlayer[pupil.id]
      const matches = matchesByPlayer[pupil.id]
      const snapshots = snapshotsByPlayer[pupil.id] || {}

      // Calculate attribute improvement score
      const improvementScore = calculateImprovementScore(snapshots.earliest, snapshots.latest)

      const attendanceRate = training
        ? Math.round((parseInt(training.sessions_attended) / parseInt(training.sessions_total)) * 100)
        : null

      return {
        id: pupil.id,
        name: pupil.name,
        position: pupil.position,
        positions: pupil.positions,
        squad_number: pupil.squad_number,
        date_of_birth: pupil.date_of_birth,

        // Training
        training: {
          sessions_attended: parseInt(training?.sessions_attended || 0),
          sessions_total: parseInt(training?.sessions_total || 0),
          attendance_rate: attendanceRate,
          avg_effort: training?.avg_effort ? parseFloat(training.avg_effort) : null,
          effort_ratings_count: parseInt(training?.effort_ratings_count || 0),
        },

        // Observations
        observations: {
          total: parseInt(obs?.total_observations || 0),
          technical: parseInt(obs?.technical_count || 0),
          tactical: parseInt(obs?.tactical_count || 0),
          physical: parseInt(obs?.physical_count || 0),
          mental: parseInt(obs?.mental_count || 0),
        },

        // Achievements
        achievements: {
          total: parseInt(achieve?.total_achievements || 0),
          list: achieve?.achievements || [],
        },

        // Match
        match: {
          appearances: parseInt(matches?.appearances || 0),
          starts: parseInt(matches?.starts || 0),
          potm_awards: parseInt(potm?.potm_count || 0),
        },

        // Development (attribute comparison)
        development: {
          has_snapshots: !!(snapshots.earliest && snapshots.latest),
          snapshot_count: snapshots.earliest && snapshots.latest && snapshots.earliest.created_at !== snapshots.latest.created_at ? 2 : (snapshots.earliest ? 1 : 0),
          improvement_score: improvementScore,
          earliest_snapshot_at: snapshots.earliest?.created_at || null,
          latest_snapshot_at: snapshots.latest?.created_at || null,
          current_attributes: {
            physical: pupil.physical_attributes,
            technical: pupil.technical_skills,
            tactical: pupil.tactical_understanding,
            mental: pupil.mental_traits,
          },
        },
      }
    })

    // Calculate squad summary
    const withTraining = playerDevelopment.filter(p => p.training.sessions_total > 0)
    const withObservations = playerDevelopment.filter(p => p.observations.total > 0)
    const withEffort = playerDevelopment.filter(p => p.training.avg_effort != null)

    const squadSummary = {
      total: pupils.length,
      with_training_data: withTraining.length,
      with_observations: withObservations.length,
      with_snapshots: playerDevelopment.filter(p => p.development.has_snapshots).length,
      avg_attendance_rate: withTraining.length > 0
        ? Math.round(withTraining.reduce((sum, p) => sum + (p.training.attendance_rate || 0), 0) / withTraining.length)
        : null,
      avg_effort: withEffort.length > 0
        ? (withEffort.reduce((sum, p) => sum + p.training.avg_effort, 0) / withEffort.length).toFixed(1)
        : null,
      total_sessions: Math.max(...playerDevelopment.map(p => p.training.sessions_total), 0),
      total_observations: playerDevelopment.reduce((sum, p) => sum + p.observations.total, 0),
      total_achievements: playerDevelopment.reduce((sum, p) => sum + p.achievements.total, 0),
      total_potm: playerDevelopment.reduce((sum, p) => sum + p.match.potm_awards, 0),
    }

    res.json({
      team: teamCheck.rows[0],
      season_start: seasonStart,
      pupils: playerDevelopment,
      squad_summary: squadSummary,
    })
  } catch (error) {
    next(error)
  }
})

// Get attribute snapshot history for a single pupil
router.get('/:teamId/pupils/:pupilId/snapshots', authenticateToken, async (req, res, next) => {
  try {
    const { teamId, pupilId } = req.params

    const result = await pool.query(
      `SELECT id, physical_attributes, technical_skills, tactical_understanding,
              mental_traits, core_capabilities, snapshot_type, observation_count, created_at
       FROM attribute_snapshots
       WHERE pupil_id = $1 AND team_id = $2
       ORDER BY created_at ASC`,
      [pupilId, teamId]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// ==========================================
// AI SEASON REVIEW (squad-wide analysis)
// ==========================================

router.post('/:teamId/season-review', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.params

    // Check billing
    const teamResult = await pool.query('SELECT * FROM teams WHERE id = $1', [teamId])
    if (teamResult.rows.length === 0) return res.status(404).json({ error: 'Team not found' })
    const team = teamResult.rows[0]

    const entitlements = await getEntitlements({ teamId })
    const usageCheck = await checkAndIncrementUsage(teamId, 'ai_analysis', entitlements)
    if (!usageCheck.allowed) {
      return res.status(429).json({ error: 'Monthly AI usage limit reached', usage: usageCheck })
    }

    // Fetch the same development data internally
    const now = new Date()
    const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
    const seasonStart = new Date(year, 8, 1)

    const playersResult = await pool.query(
      `SELECT id, name, position, positions, date_of_birth
       FROM pupils
       WHERE team_id = $1 AND (is_active IS NULL OR is_active = true)
       ORDER BY name`,
      [teamId]
    )
    const pupils = playersResult.rows
    const pupilIds = pupils.map(p => p.id)

    if (pupilIds.length === 0) {
      return res.json({ review: 'No active pupils found for this team.' })
    }

    // Gather summary data
    const [trainingResult, obsResult, achieveResult, potmResult] = await Promise.all([
      pool.query(
        `SELECT ta.pupil_id, p.name,
           COUNT(*) FILTER (WHERE ta.attended) as attended,
           COUNT(*) as total,
           ROUND(AVG(ta.effort_rating) FILTER (WHERE ta.effort_rating IS NOT NULL), 1) as avg_effort
         FROM training_attendance ta
         JOIN training_sessions ts ON ts.id = ta.session_id
         JOIN pupils p ON p.id = ta.pupil_id
         WHERE ta.pupil_id = ANY($1) AND ts.team_id = $2 AND ts.date >= $3
         GROUP BY ta.pupil_id, p.name
         ORDER BY p.name`,
        [pupilIds, teamId, seasonStart]
      ),
      pool.query(
        `SELECT o.pupil_id, p.name, COUNT(*) as count,
           string_agg(DISTINCT o.type, ', ') as types,
           (array_agg(o.content ORDER BY o.created_at DESC))[1:3] as recent_observations
         FROM observations o
         JOIN pupils p ON p.id = o.pupil_id
         WHERE o.pupil_id = ANY($1) AND o.created_at >= $2
         GROUP BY o.pupil_id, p.name`,
        [pupilIds, seasonStart]
      ),
      pool.query(
        `SELECT pupil_id, p.name,
           COUNT(*) as count,
           array_agg(DISTINCT achievement_type) as types
         FROM pupil_achievements
         JOIN pupils p ON p.id = pupil_id
         WHERE pupil_id = ANY($1) AND earned_at >= $2
         GROUP BY pupil_id, p.name`,
        [pupilIds, seasonStart]
      ),
      pool.query(
        `SELECT player_of_match_id as pupil_id, p.name, COUNT(*) as count
         FROM matches
         JOIN pupils p ON p.id = player_of_match_id
         WHERE team_id = $1 AND match_date >= $2 AND player_of_match_id IS NOT NULL
         GROUP BY player_of_match_id, p.name`,
        [teamId, seasonStart]
      ),
    ])

    // Also get attribute snapshots for improvement tracking
    const snapshotsResult = await pool.query(
      `SELECT pupil_id, p.name,
         MIN(created_at) as first_snapshot,
         MAX(created_at) as last_snapshot,
         COUNT(*) as snapshot_count
       FROM attribute_snapshots
       JOIN pupils p ON p.id = pupil_id
       WHERE pupil_id = ANY($1) AND team_id = $2 AND created_at >= $3
       GROUP BY pupil_id, p.name`,
      [pupilIds, teamId, seasonStart]
    )

    // Build context for Claude
    const trainingData = trainingResult.rows.map(r =>
      `${r.name}: ${r.attended}/${r.total} sessions (${Math.round(r.attended/r.total*100)}%)${r.avg_effort ? `, avg effort ${r.avg_effort}/5` : ''}`
    ).join('\n')

    const observationData = obsResult.rows.map(r =>
      `${r.name}: ${r.count} observations (${r.types}). Recent: ${r.recent_observations?.join(' | ') || 'none'}`
    ).join('\n')

    const achievementData = achieveResult.rows.map(r =>
      `${r.name}: ${r.count} badges (${r.types?.join(', ')})`
    ).join('\n')

    const potmData = potmResult.rows.map(r =>
      `${r.name}: ${r.count} POTM awards`
    ).join('\n')

    const playerList = pupils.map(p =>
      `${p.name} (${p.position || 'position not set'}${p.date_of_birth ? `, DOB: ${p.date_of_birth}` : ''})`
    ).join('\n')

    // Import Claude service dynamically to avoid circular dependency
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are a grassroots football development analyst for ${team.name} (${team.age_group || 'youth'} team).

Analyse the following season data and write a Season Development Review answering these 4 questions with specific pupil names:

1. **Most Improved Players** — Who has shown the most growth this season? Consider observation trends, attribute snapshots, and awards.
2. **Hardest Trainers** — Who consistently shows up and puts in effort? Use attendance rates and effort ratings.
3. **Breakthrough Candidates** — Who might break through next season? Look for rising indicators: increasing observations, recent awards, high effort but fewer match starts.
4. **Players Needing Support** — Who might need extra coaching attention? Low attendance, few observations, no recent awards, or declining engagement.

Also provide:
5. **Squad Development Score** — An overall 1-10 rating for the squad's development progress this season with a brief justification.

## Squad
${playerList}

## Training Attendance & Effort (this season)
${trainingData || 'No training data recorded yet'}

## Coach Observations (this season)
${observationData || 'No observations recorded yet'}

## Achievements & Badges
${achievementData || 'No achievements awarded yet'}

## Pupil of the Match Awards
${potmData || 'No POTM awards yet'}

Keep it practical and encouraging — this is grassroots youth football. Use pupil first names where possible. Be specific (cite data points) not vague. If data is limited for a category, say so honestly and suggest what the coach should start tracking. Format with markdown headers matching the 5 sections above.`
      }],
    })

    const reviewText = message.content[0]?.text || 'Unable to generate review.'

    res.json({
      review: reviewText,
      generated_at: new Date().toISOString(),
      season_start: seasonStart.toISOString(),
      player_count: pupils.length,
    })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// HELPERS
// ==========================================

const RATING_VALUES = {
  'Excellent': 5,
  'Very Good': 4,
  'Good': 3,
  'Developing': 2,
  'Needs Work': 1,
}

/**
 * Calculate an improvement score by comparing earliest and latest attribute snapshots.
 * Returns a number: positive = improved, negative = declined, 0 = no change or no data.
 */
function calculateImprovementScore(earliest, latest) {
  if (!earliest || !latest) return 0
  if (earliest.created_at === latest.created_at) return 0

  let totalChange = 0
  let attributeCount = 0

  const categories = ['physical_attributes', 'technical_skills', 'tactical_understanding', 'mental_traits']

  for (const cat of categories) {
    const oldAttrs = earliest[cat] || {}
    const newAttrs = latest[cat] || {}

    for (const [key, newVal] of Object.entries(newAttrs)) {
      const oldVal = oldAttrs[key]
      if (!oldVal || !newVal) continue
      const oldNum = RATING_VALUES[oldVal]
      const newNum = RATING_VALUES[newVal]
      if (oldNum !== undefined && newNum !== undefined) {
        totalChange += (newNum - oldNum)
        attributeCount++
      }
    }
  }

  if (attributeCount === 0) return 0
  // Return as a percentage-like score: improvement per attribute, scaled to -100 to +100
  return Math.round((totalChange / attributeCount) * 25)
}

export default router
