import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { generatePlayerIDP, analyzePlayerAttributes, extractPlayerAttributes } from '../services/claudeService.js'
import { getQuoteForPupil } from '../services/motivationalQuoteService.js'
import { normalizePlayerPositions, normalizePositions } from '../utils/pupilUtils.js'
import { sendParentInviteEmail, sendAchievementEmail } from '../services/emailService.js'
import { getFrontendUrl } from '../utils/urlUtils.js'
import { checkAndIncrementUsage, getEntitlements } from '../services/billingService.js'

const router = Router()

// ============== PLAYER ACHIEVEMENTS/BADGES ==============
// NOTE: These routes MUST be defined BEFORE /:id routes to avoid path conflicts

// Predefined badge types for suggestions
const BADGE_TYPES = {
  potm: { title: 'Pupil of the Match', icon: '⭐', description: 'Outstanding match performance' },
  trainer_of_week: { title: 'Trainer of the Week', icon: '🏆', description: 'Best effort in training' },
  most_improved: { title: 'Most Improved', icon: '📈', description: 'Showing great progress' },
  team_player: { title: 'Team Pupil', icon: '🤝', description: 'Great teamwork and support' },
  golden_boot: { title: 'Golden Boot', icon: '👟', description: 'Top goalscorer' },
  clean_sheet: { title: 'Clean Sheet Hero', icon: '🧤', description: 'Kept a clean sheet' },
  assist_king: { title: 'Assist King', icon: '🎯', description: 'Great assists' },
  leadership: { title: 'Leadership Award', icon: '👑', description: 'Excellent leadership' },
  dedication: { title: 'Dedication Award', icon: '💪', description: 'Outstanding commitment' },
  sportsmanship: { title: 'Fair Play Award', icon: '🤝', description: 'Excellent sportsmanship' },
  breakthrough: { title: 'Breakthrough Performance', icon: '🚀', description: 'Exceptional breakthrough' },
  parents_pick: { title: "Parents' Pick", icon: '❤️', description: 'Voted by parents' },
}

// Get available badge types - MUST be before /:id route
router.get('/badge-types', authenticateToken, async (req, res) => {
  res.json(BADGE_TYPES)
})

// ── Pupil self-service (used by pupil portal) ──────────────────────

// GET /me - own profile: pupil record + sports + teams + teaching groups
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const pupilRes = await pool.query(
      `SELECT p.id, p.name, p.first_name, p.last_name, p.year_group, p.house, p.school_id,
              p.gcse_pe_candidate
       FROM pupils p WHERE p.user_id = $1 LIMIT 1`,
      [userId]
    )
    if (pupilRes.rows.length === 0) {
      return res.json({ pupil: null, sports: [], teams: [], teachingGroups: [] })
    }
    const pupil = pupilRes.rows[0]

    const teamsRes = await pool.query(
      `SELECT t.id, t.name, t.sport, t.gender, t.age_group
       FROM teams t
       JOIN team_memberships tm ON tm.team_id = t.id
       WHERE tm.pupil_id = $1
       ORDER BY t.sport, t.name`,
      [pupil.id]
    )
    const groupsRes = await pool.query(
      `SELECT tg.id, tg.name, tg.year_group, tg.key_stage
       FROM teaching_groups tg
       JOIN teaching_group_pupils tgp ON tgp.teaching_group_id = tg.id
       WHERE tgp.pupil_id = $1
       ORDER BY tg.name`,
      [pupil.id]
    )
    // Distinct sports from teams + observations
    const sportsRes = await pool.query(
      `SELECT DISTINCT sport FROM (
         SELECT t.sport FROM teams t
         JOIN team_memberships tm ON tm.team_id = t.id WHERE tm.pupil_id = $1 AND t.sport IS NOT NULL
         UNION
         SELECT sport FROM observations WHERE pupil_id = $1 AND sport IS NOT NULL
       ) s ORDER BY sport`,
      [pupil.id]
    )

    res.json({
      pupil,
      sports: sportsRes.rows.map(r => r.sport),
      teams: teamsRes.rows,
      teachingGroups: groupsRes.rows,
    })
  } catch (err) {
    console.error('Error in /pupils/me:', err)
    res.status(500).json({ error: 'Failed to load profile' })
  }
})

// GET /me/development - own confirmed observations (newest first)
router.get('/me/development', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const pupilRes = await pool.query(
      `SELECT id FROM pupils WHERE user_id = $1 LIMIT 1`,
      [userId]
    )
    if (pupilRes.rows.length === 0) return res.json([])
    const pupilId = pupilRes.rows[0].id

    const obsRes = await pool.query(
      `SELECT o.id, o.type, o.content, o.sport, o.context_type, o.created_at,
              u.name AS observer_name
       FROM observations o
       LEFT JOIN users u ON u.id = o.observer_id
       WHERE o.pupil_id = $1
         AND COALESCE(o.review_state, 'confirmed') = 'confirmed'
         AND o.visible_to_pupil = TRUE
       ORDER BY o.created_at DESC
       LIMIT 50`,
      [pupilId]
    )
    res.json(obsRes.rows)
  } catch (err) {
    console.error('Error in /pupils/me/development:', err)
    res.status(500).json({ error: 'Failed to load development data' })
  }
})

// GET /me/schedule - unified schedule: fixtures, training, lessons for a date range
router.get('/me/schedule', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const pupilRes = await pool.query(
      `SELECT id FROM pupils WHERE user_id = $1 LIMIT 1`,
      [userId]
    )
    if (pupilRes.rows.length === 0) return res.json([])
    const pupilId = pupilRes.rows[0].id

    const from = req.query.from || new Date().toISOString().split('T')[0]
    const to = req.query.to || (() => {
      const d = new Date()
      d.setDate(d.getDate() + 14)
      return d.toISOString().split('T')[0]
    })()

    // 1. Fixtures: pupil is on a team that has matches in the date range
    const fixturesRes = await pool.query(`
      SELECT m.id, 'fixture' AS type,
        COALESCE(m.opponent, 'TBC') AS title,
        COALESCE(m.date, m.match_date) AS date,
        m.match_time AS start_time,
        NULL::TIME AS end_time,
        m.location AS venue,
        jsonb_build_object(
          'opponent', m.opponent,
          'home_away', m.home_away,
          'kit_type', m.kit_type,
          'meet_time', m.meet_time,
          'team_name', t.name,
          'team_id', t.id,
          'sport', t.sport,
          'score_for', m.score_for,
          'score_against', m.score_against
        ) AS extra
      FROM matches m
      JOIN teams t ON t.id = m.team_id
      JOIN team_memberships tm ON tm.team_id = t.id AND tm.pupil_id = $1
      WHERE COALESCE(m.date, m.match_date) BETWEEN $2 AND $3
      ORDER BY COALESCE(m.date, m.match_date), m.match_time NULLS LAST
    `, [pupilId, from, to])

    // 2. Training: pupil is on a team that has training sessions
    const trainingRes = await pool.query(`
      SELECT ts.id, 'training' AS type,
        COALESCE(ts.focus_areas, ts.focus, 'Training') AS title,
        ts.date,
        ts.time AS start_time,
        NULL::TIME AS end_time,
        ts.location AS venue,
        jsonb_build_object(
          'session_type', ts.session_type,
          'duration', ts.duration,
          'meet_time', ts.meet_time,
          'team_name', t.name,
          'team_id', t.id,
          'sport', t.sport,
          'share_plan', COALESCE(ts.share_plan_with_players, false)
        ) AS extra
      FROM training_sessions ts
      JOIN teams t ON t.id = ts.team_id
      JOIN team_memberships tm ON tm.team_id = t.id AND tm.pupil_id = $1
      WHERE ts.date BETWEEN $2 AND $3
      ORDER BY ts.date, ts.time NULLS LAST
    `, [pupilId, from, to])

    // 3. Lessons: pupil is in a teaching group that has lesson plans scheduled
    const lessonsRes = await pool.query(`
      SELECT lp.id, 'lesson' AS type,
        lp.title,
        lp.lesson_date AS date,
        NULL::TIME AS start_time,
        NULL::TIME AS end_time,
        NULL AS venue,
        jsonb_build_object(
          'duration', lp.duration,
          'status', lp.status,
          'group_name', tg.name,
          'group_id', tg.id,
          'sport', su.sport,
          'unit_name', su.unit_name
        ) AS extra
      FROM lesson_plans lp
      JOIN teaching_groups tg ON tg.id = lp.teaching_group_id
      JOIN teaching_group_pupils tgp ON tgp.teaching_group_id = tg.id AND tgp.pupil_id = $1
      LEFT JOIN sport_units su ON su.id = lp.sport_unit_id
      WHERE lp.lesson_date BETWEEN $2 AND $3
      ORDER BY lp.lesson_date
    `, [pupilId, from, to])

    // Merge and sort chronologically
    const events = [
      ...fixturesRes.rows,
      ...trainingRes.rows,
      ...lessonsRes.rows,
    ].sort((a, b) => {
      const dateComp = (a.date || '').localeCompare(b.date || '')
      if (dateComp !== 0) return dateComp
      return (a.start_time || '').localeCompare(b.start_time || '')
    })

    res.json(events)
  } catch (err) {
    console.error('Error in /pupils/me/schedule:', err)
    res.status(500).json({ error: 'Failed to load schedule' })
  }
})

// GET /me/quote - daily motivational quote based on year group
router.get('/me/quote', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const pupilRes = await pool.query(
      `SELECT id, year_group FROM pupils WHERE user_id = $1 LIMIT 1`,
      [userId]
    )
    if (pupilRes.rows.length === 0) {
      return res.json({ text: '', attribution: '' })
    }
    const { id, year_group } = pupilRes.rows[0]
    const today = new Date().toISOString().split('T')[0]
    const quote = getQuoteForPupil(id, today, year_group || 8)
    res.json(quote)
  } catch (err) {
    console.error('Error in /pupils/me/quote:', err)
    res.status(500).json({ error: 'Failed to load quote' })
  }
})

// GET /me/assessments - own assessment grades grouped by sport/strand
router.get('/me/assessments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const pupilRes = await pool.query(
      `SELECT id FROM pupils WHERE user_id = $1 LIMIT 1`,
      [userId]
    )
    if (pupilRes.rows.length === 0) return res.json([])
    const pupilId = pupilRes.rows[0].id

    const result = await pool.query(`
      SELECT pa.id, pa.grade, pa.score, pa.teacher_notes, pa.assessed_at,
             pa.assessment_type,
             su.sport, su.unit_name,
             cs.strand_name,
             ac.criterion_name
      FROM pupil_assessments pa
      LEFT JOIN sport_units su ON su.id = pa.unit_id
      LEFT JOIN assessment_criteria ac ON ac.id = pa.criteria_id
      LEFT JOIN curriculum_strands cs ON cs.id = ac.strand_id
      WHERE pa.pupil_id = $1
      ORDER BY pa.assessed_at DESC NULLS LAST
      LIMIT 50
    `, [pupilId])

    res.json(result.rows)
  } catch (err) {
    console.error('Error in /pupils/me/assessments:', err)
    res.status(500).json({ error: 'Failed to load assessments' })
  }
})

// Get pupil
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await pool.query('SELECT * FROM pupils WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }

    // Verify the pupil belongs to the user's team (managers/assistants)
    // or the user is linked to this pupil (parents/pupils)
    const pupil = result.rows[0]
    if (pupil.team_id !== req.user.team_id && pupil.id !== req.user.pupil_id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' })
    }

    // Normalize positions from JSONB format to simple string array
    res.json(normalizePlayerPositions(pupil))
  } catch (error) {
    next(error)
  }
})

// Update pupil
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    // Verify the pupil belongs to the user's team
    const playerCheck = await pool.query('SELECT team_id FROM pupils WHERE id = $1', [id])
    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }
    if (playerCheck.rows[0].team_id !== req.user.team_id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' })
    }
    const { name, dob, positions, physicalAttributes, technicalSkills,
            tacticalUnderstanding, mentalTraits, parentContact, parent_contact, notes, squadNumber, squad_number,
            discreetNotes, discreet_notes } = req.body

    // Accept both camelCase and snake_case for these fields
    const discreetNotesValue = discreetNotes !== undefined ? discreetNotes : discreet_notes
    const parentContactValue = parentContact !== undefined ? parentContact : parent_contact
    const squadNumberValue = squadNumber !== undefined ? squadNumber : squad_number

    const result = await pool.query(
      `UPDATE pupils SET
        name = COALESCE($1, name),
        dob = COALESCE($2, dob),
        positions = COALESCE($3::jsonb, positions),
        physical_attributes = COALESCE($4::jsonb, physical_attributes),
        technical_skills = COALESCE($5::jsonb, technical_skills),
        tactical_understanding = COALESCE($6::jsonb, tactical_understanding),
        mental_traits = COALESCE($7::jsonb, mental_traits),
        parent_contact = COALESCE($8, parent_contact),
        notes = COALESCE($9, notes),
        squad_number = COALESCE($10, squad_number),
        discreet_notes = COALESCE($11, discreet_notes),
        updated_at = NOW()
       WHERE id = $12 RETURNING *`,
      [name, dob, positions ? JSON.stringify(positions) : null,
       physicalAttributes ? JSON.stringify(physicalAttributes) : null,
       technicalSkills ? JSON.stringify(technicalSkills) : null,
       tacticalUnderstanding ? JSON.stringify(tacticalUnderstanding) : null,
       mentalTraits ? JSON.stringify(mentalTraits) : null,
       parentContactValue, notes, squadNumberValue !== undefined ? squadNumberValue : null, discreetNotesValue !== undefined ? discreetNotesValue : null, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }

    // Normalize positions from JSONB format to simple string array
    res.json(normalizePlayerPositions(result.rows[0]))
  } catch (error) {
    next(error)
  }
})

// Delete pupil
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    // Verify the pupil belongs to the user's team
    const playerCheck = await pool.query('SELECT team_id FROM pupils WHERE id = $1', [id])
    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }
    if (playerCheck.rows[0].team_id !== req.user.team_id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' })
    }

    await pool.query('DELETE FROM pupils WHERE id = $1', [id])

    res.json({ message: 'Pupil deleted' })
  } catch (error) {
    next(error)
  }
})

// Get observations
router.get('/:id/observations', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    const playerCheck = await pool.query('SELECT team_id FROM pupils WHERE id = $1', [id])
    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }

    // Allow: admin, same team, or school member with HoD access
    const isOwnTeam = playerCheck.rows[0].team_id === req.user.team_id
    let hasSchoolAccess = false
    if (!isOwnTeam && !req.user.is_admin) {
      const schoolCheck = await pool.query(
        `SELECT 1 FROM school_members sm
         JOIN teams t ON t.school_id = sm.school_id
         WHERE sm.user_id = $1 AND t.id = $2 LIMIT 1`,
        [req.user.id, playerCheck.rows[0].team_id]
      )
      hasSchoolAccess = schoolCheck.rows.length > 0
    }
    if (!isOwnTeam && !req.user.is_admin && !hasSchoolAccess) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const result = await pool.query(
      `SELECT o.*, u.name as observer_name,
              m.opponent as match_opponent, COALESCE(m.date, m.match_date) as match_date,
              ts.session_date as training_date, ts.focus as training_focus,
              tg.name as teaching_group_name
       FROM observations o
       JOIN users u ON o.observer_id = u.id
       LEFT JOIN matches m ON o.match_id = m.id
       LEFT JOIN training_sessions ts ON o.training_session_id = ts.id
       LEFT JOIN teaching_groups tg ON o.teaching_group_id = tg.id
       WHERE o.pupil_id = $1 ORDER BY o.created_at DESC`,
      [id]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Add observation
router.post('/:id/observations', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    const playerCheck = await pool.query('SELECT team_id FROM pupils WHERE id = $1', [id])
    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }
    const isOwnTeam = playerCheck.rows[0].team_id === req.user.team_id
    if (!isOwnTeam && !req.user.is_admin) {
      const schoolCheck = await pool.query(
        `SELECT 1 FROM school_members sm JOIN teams t ON t.school_id = sm.school_id WHERE sm.user_id = $1 AND t.id = $2 LIMIT 1`,
        [req.user.id, playerCheck.rows[0].team_id]
      )
      if (schoolCheck.rows.length === 0) return res.status(403).json({ message: 'Access denied' })
    }

    const { type, content, context, contextType, matchId, trainingSessionId, sport, teachingGroupId, visibleToPupil } = req.body

    if (!type || !content) {
      return res.status(400).json({ message: 'Type and content are required' })
    }

    const result = await pool.query(
      `INSERT INTO observations (pupil_id, observer_id, type, content, context, context_type, match_id, training_session_id, sport, teaching_group_id, visible_to_pupil)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [id, req.user.id, type, content, context || null, contextType || 'general', matchId || null, trainingSessionId || null, sport || null, teachingGroupId || null, visibleToPupil === true]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Update observation
router.put('/:id/observations/:obsId', authenticateToken, async (req, res, next) => {
  try {
    const { id, obsId } = req.params

    // Verify the pupil belongs to the user's team
    const playerCheck = await pool.query('SELECT team_id FROM pupils WHERE id = $1', [id])
    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }
    if (playerCheck.rows[0].team_id !== req.user.team_id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const { type, content, context, contextType, matchId, trainingSessionId, visibleToPupil } = req.body

    if (!type || !content) {
      return res.status(400).json({ message: 'Type and content are required' })
    }

    // Verify the observation belongs to this pupil
    const existing = await pool.query(
      'SELECT * FROM observations WHERE id = $1 AND pupil_id = $2',
      [obsId, id]
    )

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Observation not found' })
    }

    const result = await pool.query(
      `UPDATE observations SET
        type = $1,
        content = $2,
        context = $3,
        context_type = $4,
        match_id = $5,
        training_session_id = $6,
        visible_to_pupil = $7
       WHERE id = $8 AND pupil_id = $9 RETURNING *`,
      [type, content, context || null, contextType || 'general', matchId || null, trainingSessionId || null, visibleToPupil === true, obsId, id]
    )

    // Fetch the updated observation with observer name and context info
    const fullResult = await pool.query(
      `SELECT o.*, u.name as observer_name,
              m.opponent as match_opponent, m.date as match_date,
              ts.date as training_date, ts.focus_areas as training_focus
       FROM observations o
       JOIN users u ON o.observer_id = u.id
       LEFT JOIN matches m ON o.match_id = m.id
       LEFT JOIN training_sessions ts ON o.training_session_id = ts.id
       WHERE o.id = $1`,
      [obsId]
    )

    res.json(fullResult.rows[0])
  } catch (error) {
    next(error)
  }
})

// Delete observation
router.delete('/:id/observations/:obsId', authenticateToken, async (req, res, next) => {
  try {
    const { id, obsId } = req.params

    // Verify the pupil belongs to the user's team
    const playerCheck = await pool.query('SELECT team_id FROM pupils WHERE id = $1', [id])
    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }
    if (playerCheck.rows[0].team_id !== req.user.team_id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const result = await pool.query(
      'DELETE FROM observations WHERE id = $1 AND pupil_id = $2 RETURNING id',
      [obsId, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Observation not found' })
    }

    res.json({ message: 'Observation deleted' })
  } catch (error) {
    next(error)
  }
})

// Get IDP
router.get('/:id/idp', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    // Verify the pupil belongs to the user's team or is the user's linked pupil
    const playerCheck = await pool.query('SELECT team_id FROM pupils WHERE id = $1', [id])
    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }
    if (playerCheck.rows[0].team_id !== req.user.team_id && id !== req.user.pupil_id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const result = await pool.query(
      'SELECT * FROM development_plans WHERE pupil_id = $1 ORDER BY created_at DESC LIMIT 1',
      [id]
    )

    res.json(result.rows[0] || null)
  } catch (error) {
    next(error)
  }
})

// Update IDP settings (review period, auto-review) without regenerating
router.patch('/:id/idp/settings', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    // Verify the pupil belongs to the user's team
    const playerCheck = await pool.query('SELECT team_id FROM pupils WHERE id = $1', [id])
    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }
    if (playerCheck.rows[0].team_id !== req.user.team_id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const { review_weeks, auto_review } = req.body || {}

    // Find the latest IDP for this pupil
    const existing = await pool.query(
      'SELECT id, created_at FROM development_plans WHERE pupil_id = $1 ORDER BY created_at DESC LIMIT 1',
      [id]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'No development plan found for this pupil' })
    }

    const idpId = existing.rows[0].id
    const updates = []
    const values = []
    let paramIdx = 1

    if (review_weeks !== undefined) {
      const weeks = Math.max(1, Math.min(52, parseInt(review_weeks) || 6))
      updates.push(`review_weeks = $${paramIdx++}`)
      values.push(weeks)

      // Recalculate next_review_at from the IDP creation date + new review period
      const createdAt = new Date(existing.rows[0].created_at)
      const nextReviewAt = new Date(createdAt)
      nextReviewAt.setDate(nextReviewAt.getDate() + weeks * 7)
      updates.push(`next_review_at = $${paramIdx++}`)
      values.push(nextReviewAt)
    }

    if (auto_review !== undefined) {
      updates.push(`auto_review = $${paramIdx++}`)
      values.push(!!auto_review)
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No settings to update' })
    }

    updates.push(`updated_at = NOW()`)
    values.push(idpId)

    const result = await pool.query(
      `UPDATE development_plans SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Generate IDP using AI (streamed via SSE)
router.post('/:id/idp/generate', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { review_weeks = 6, auto_review = false } = req.body || {}

    // Get pupil with team age group
    const playerResult = await pool.query(
      'SELECT p.*, t.age_group FROM pupils p LEFT JOIN teams t ON p.team_id = t.id WHERE p.id = $1',
      [id]
    )
    if (playerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }
    const pupil = playerResult.rows[0]

    // Verify the pupil belongs to the user's team
    if (pupil.team_id !== req.user.team_id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' })
    }

    // Check IDP usage limit
    const entitlements = await getEntitlements({ userId: req.user.id, teamId: pupil.team_id, userEmail: req.user.email })
    const idpUsageCheck = await checkAndIncrementUsage(pupil.team_id, 'idp', entitlements)
    if (!idpUsageCheck.allowed) {
      return res.status(429).json({
        message: idpUsageCheck.limit === 0
          ? 'Individual Development Plans are not available on your current plan. Upgrade to Core or Pro to generate IDPs for your pupils.'
          : `Monthly IDP generation limit reached (${idpUsageCheck.limit}). Upgrade your plan to generate more development plans.`,
        code: 'IDP_LIMIT_REACHED',
        usage: { current: idpUsageCheck.current, limit: idpUsageCheck.limit },
        upgradeRequired: true,
      })
    }

    // Get observations
    const obsResult = await pool.query(
      'SELECT type, content FROM observations WHERE pupil_id = $1 ORDER BY created_at DESC LIMIT 20',
      [id]
    )

    const weeks = Math.max(1, Math.min(52, parseInt(review_weeks) || 6))

    // Stream IDP generation via SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const stream = await generatePlayerIDP(pupil, obsResult.rows, weeks)
    let fullText = ''

    stream.on('text', (text) => {
      fullText += text
      res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`)
    })

    try {
      await stream.finalMessage()
    } catch (streamErr) {
      console.error('IDP stream finalization warning:', streamErr.message)
    }

    if (fullText) {
      // Save completed IDP to database
      const nextReviewAt = new Date()
      nextReviewAt.setDate(nextReviewAt.getDate() + weeks * 7)

      const result = await pool.query(
        `INSERT INTO development_plans (pupil_id, goals, strengths, areas_to_improve, notes, review_weeks, next_review_at, auto_review)
         VALUES ($1, '[]', '[]', '[]', $2, $3, $4, $5) RETURNING *`,
        [id, fullText, weeks, nextReviewAt, !!auto_review]
      )

      res.write(`data: ${JSON.stringify({ type: 'done', idp: { ...result.rows[0], generated_content: fullText } })}\n\n`)
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'No content generated' })}\n\n`)
    }
    res.end()
  } catch (error) {
    console.error('IDP generation error:', error)
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'Generation failed' })}\n\n`)
      res.end()
    } else {
      next(error)
    }
  }
})

// Analyze pupil attributes using AI
router.post('/:id/attributes/analyze', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    // Get pupil
    const playerResult = await pool.query('SELECT * FROM pupils WHERE id = $1', [id])
    if (playerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }
    const pupil = playerResult.rows[0]

    // Verify the pupil belongs to the user's team
    if (pupil.team_id !== req.user.team_id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' })
    }

    // Get recent observations for context (includes approved video analysis)
    const obsResult = await pool.query(
      'SELECT type, content, context FROM observations WHERE pupil_id = $1 ORDER BY created_at DESC LIMIT 20',
      [id]
    )

    // Also get video clip feedback tagged to this pupil
    let clipObservations = []
    try {
      const clipResult = await pool.query(
        `SELECT t.feedback, t.rating, c.clip_type, c.title
         FROM clip_player_tags t
         JOIN video_clips c ON c.id = t.clip_id
         WHERE t.pupil_id = $1 AND t.feedback IS NOT NULL
         ORDER BY c.created_at DESC LIMIT 15`,
        [id]
      )
      clipObservations = clipResult.rows.map(clip => ({
        type: 'match',
        content: `[Video Clip${clip.clip_type && clip.clip_type !== 'general' ? ` - ${clip.clip_type}` : ''}${clip.title ? `: ${clip.title}` : ''}] ${clip.feedback}${clip.rating ? ` (rating: ${clip.rating}/5)` : ''}`,
      }))
    } catch (clipErr) {
      console.log('[Attributes] clip feedback query failed (non-fatal):', clipErr.message)
    }

    const allObservations = [...obsResult.rows, ...clipObservations]

    // Run both extractions in parallel for efficiency
    const [extractedAttributes, analysisText] = await Promise.all([
      extractPlayerAttributes(pupil, allObservations),
      analyzePlayerAttributes(pupil, allObservations),
    ])

    const generatedAt = new Date()

    // Save extracted attributes AND analysis text to database
    // Use NULLIF to avoid overwriting existing data with empty objects
    const toJsonbOrNull = (obj) => obj && Object.keys(obj).length > 0 ? JSON.stringify(obj) : null

    // Try saving all attributes including core_capabilities in one query
    try {
      await pool.query(
        `UPDATE pupils SET
          physical_attributes = COALESCE($1::jsonb, physical_attributes),
          technical_skills = COALESCE($2::jsonb, technical_skills),
          tactical_understanding = COALESCE($3::jsonb, tactical_understanding),
          mental_traits = COALESCE($4::jsonb, mental_traits),
          core_capabilities = COALESCE($5::jsonb, core_capabilities),
          attribute_analysis = $6,
          attribute_analysis_at = $7,
          updated_at = NOW()
        WHERE id = $8`,
        [
          toJsonbOrNull(extractedAttributes.physical_attributes),
          toJsonbOrNull(extractedAttributes.technical_skills),
          toJsonbOrNull(extractedAttributes.tactical_understanding),
          toJsonbOrNull(extractedAttributes.mental_traits),
          toJsonbOrNull(extractedAttributes.core_capabilities),
          analysisText,
          generatedAt,
          id
        ]
      )
    } catch (saveErr) {
      // Fallback: core_capabilities column may not exist on older schemas
      if (saveErr.message?.includes('core_capabilities')) {
        console.log('[Attributes] core_capabilities column not available, saving without it')
        await pool.query(
          `UPDATE pupils SET
            physical_attributes = COALESCE($1::jsonb, physical_attributes),
            technical_skills = COALESCE($2::jsonb, technical_skills),
            tactical_understanding = COALESCE($3::jsonb, tactical_understanding),
            mental_traits = COALESCE($4::jsonb, mental_traits),
            attribute_analysis = $5,
            attribute_analysis_at = $6,
            updated_at = NOW()
          WHERE id = $7`,
          [
            toJsonbOrNull(extractedAttributes.physical_attributes),
            toJsonbOrNull(extractedAttributes.technical_skills),
            toJsonbOrNull(extractedAttributes.tactical_understanding),
            toJsonbOrNull(extractedAttributes.mental_traits),
            analysisText,
            generatedAt,
            id
          ]
        )
      } else {
        throw saveErr
      }
    }

    // Save attribute snapshot for development tracking over time
    try {
      await pool.query(
        `INSERT INTO attribute_snapshots (
          pupil_id, team_id,
          physical_attributes, technical_skills, tactical_understanding,
          mental_traits, core_capabilities,
          snapshot_type, analysis_text, observation_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ai_analysis', $8, $9)`,
        [
          id,
          pupil.team_id,
          toJsonbOrNull(extractedAttributes.physical_attributes),
          toJsonbOrNull(extractedAttributes.technical_skills),
          toJsonbOrNull(extractedAttributes.tactical_understanding),
          toJsonbOrNull(extractedAttributes.mental_traits),
          toJsonbOrNull(extractedAttributes.core_capabilities),
          analysisText,
          allObservations.length,
        ]
      )
    } catch (snapErr) {
      console.warn('Attribute snapshot save failed (non-fatal):', snapErr.message)
    }

    res.json({
      analysis: analysisText,
      generated_at: generatedAt.toISOString(),
      attributes: extractedAttributes,
    })
  } catch (error) {
    next(error)
  }
})

// Invite parent for a pupil
router.post('/:id/invite-parent', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ message: 'Email is required' })
    }

    // Get pupil to verify it exists and get team_id
    const playerResult = await pool.query(
      'SELECT p.id, p.name, p.team_id, t.name as team_name FROM pupils p JOIN teams t ON p.team_id = t.id WHERE p.id = $1',
      [id]
    )

    if (playerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }

    const pupil = playerResult.rows[0]

    // Verify the pupil belongs to the user's team
    if (pupil.team_id !== req.user.team_id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' })
    }

    // Check if already a member
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND team_id = $2',
      [email, pupil.team_id]
    )

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'User is already a team member' })
    }

    // Check if already invited
    const existingInvite = await pool.query(
      'SELECT id FROM invites WHERE email = $1 AND team_id = $2 AND expires_at > NOW() AND accepted_at IS NULL',
      [email, pupil.team_id]
    )

    if (existingInvite.rows.length > 0) {
      return res.status(400).json({ message: 'User already has a pending invite' })
    }

    const token = uuidv4()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days for parent invites

    const result = await pool.query(
      `INSERT INTO invites (team_id, email, role, token, expires_at, pupil_id)
       VALUES ($1, $2, 'parent', $3, $4, $5) RETURNING id, email, role, created_at, expires_at, pupil_id`,
      [pupil.team_id, email, token, expiresAt, id]
    )

    // Generate invite link (always return it for manual sharing)
    const inviteLink = `${getFrontendUrl()}/invite/${token}`
    console.log(`Parent invite link for ${email} (pupil: ${pupil.name}): ${inviteLink}`)

    // Send parent invite email
    const emailResult = await sendParentInviteEmail(email, {
      teamName: pupil.team_name,
      playerName: pupil.name,
      inviteLink,
    })

    res.json({
      message: 'Invite created successfully',
      invite: result.rows[0],
      playerName: pupil.name,
      inviteLink: inviteLink, // Always return the link for copying
      emailSent: emailResult.success,
    })
  } catch (error) {
    next(error)
  }
})

// Get pending parent invites for a pupil
router.get('/:id/invites', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    // Verify the pupil belongs to the user's team
    const playerCheck = await pool.query('SELECT team_id FROM pupils WHERE id = $1', [id])
    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }
    if (playerCheck.rows[0].team_id !== req.user.team_id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const result = await pool.query(
      `SELECT id, email, role, created_at, expires_at
       FROM invites
       WHERE pupil_id = $1 AND expires_at > NOW() AND accepted_at IS NULL
       ORDER BY created_at DESC`,
      [id]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// ==========================================
// Pupil Zone API (for pupils/parents)
// ==========================================

// Get all pupil zone data in one call
router.get('/:id/zone', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    // Get pupil info
    const playerResult = await pool.query(
      `SELECT p.*, t.name as team_name, t.age_group, t.formation
       FROM pupils p
       JOIN teams t ON p.team_id = t.id
       WHERE p.id = $1`,
      [id]
    )

    if (playerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }

    const pupil = playerResult.rows[0]

    // Verify user has access (team member, linked pupil, or admin)
    if (pupil.team_id !== req.user.team_id && id !== req.user.pupil_id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' })
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

    // Get upcoming matches (include prep_notes for pupil match prep view)
    const upcomingMatchesResult = await pool.query(
      `SELECT id, opponent, date, is_home, location, notes, meetup_time, meetup_location, prep_notes,
              kit_type, squad_announced,
              (SELECT status FROM match_availability WHERE match_id = matches.id AND pupil_id = $2) as my_availability
       FROM matches
       WHERE team_id = $1 AND date >= CURRENT_DATE
       ORDER BY date`,
      [pupil.team_id, id]
    )

    // Get recent matches (include report, videos, notes for pupil view)
    const recentMatchesResult = await pool.query(
      `SELECT id, opponent, date, is_home, location, result, goals_for, goals_against,
              report, notes, veo_link, video_url, player_of_match_id, squad_announced
       FROM matches
       WHERE team_id = $1 AND date < CURRENT_DATE AND result IS NOT NULL
       ORDER BY date DESC
       LIMIT 5`,
      [pupil.team_id]
    )

    // Get upcoming training sessions (include time, location, session_type, and plan if shared)
    const trainingResult = await pool.query(
      `SELECT id, date, time, focus_areas, duration, notes, location, session_type, meet_time,
              CASE WHEN share_plan_with_players = true THEN plan ELSE NULL END as plan,
              share_plan_with_players,
              (SELECT status FROM training_availability WHERE session_id = training_sessions.id AND pupil_id = $2) as my_availability
       FROM training_sessions
       WHERE team_id = $1 AND date >= CURRENT_DATE
       ORDER BY date, time
       LIMIT 10`,
      [pupil.team_id, id]
    )

    // Get observations (only match/training context - NOT general observations as those are for AI context only)
    const observationsResult = await pool.query(
      `SELECT o.type, o.content, o.context, o.context_type, o.created_at,
              m.opponent as match_opponent, m.date as match_date,
              ts.date as training_date, ts.session_type as training_session_type
       FROM observations o
       LEFT JOIN matches m ON o.match_id = m.id
       LEFT JOIN training_sessions ts ON o.training_session_id = ts.id
       WHERE o.pupil_id = $1 AND o.context_type IN ('match', 'training')
       ORDER BY o.created_at DESC
       LIMIT 10`,
      [id]
    )

    // Get IDP
    const idpResult = await pool.query(
      `SELECT * FROM development_plans
       WHERE pupil_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [id]
    )

    // Get team videos visible to pupils
    const videosResult = await pool.query(
      `SELECT v.id, v.title, v.description, v.thumbnail_url, v.created_at
       FROM videos v
       WHERE v.team_id = $1 AND v.visibility IN ('team', 'public')
       ORDER BY v.created_at DESC
       LIMIT 10`,
      [pupil.team_id]
    ).catch(() => ({ rows: [] }))

    // Get team documents visible to parents
    const documentsResult = await pool.query(
      `SELECT id, original_name, description, created_at
       FROM team_documents
       WHERE team_id = $1 AND visible_to_parents = true
       ORDER BY created_at DESC
       LIMIT 10`,
      [pupil.team_id]
    ).catch(() => ({ rows: [] }))

    // Get team announcements
    const contentResult = await pool.query(
      `SELECT id, title, content, priority, is_pinned, created_at
       FROM team_announcements
       WHERE team_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY is_pinned DESC, created_at DESC
       LIMIT 10`,
      [pupil.team_id]
    ).catch(() => ({ rows: [] }))

    // Get Pupil of the Match awards
    const potmResult = await pool.query(
      `SELECT m.id, m.opponent, m.date, m.player_of_match_reason as reason
       FROM matches m
       WHERE m.player_of_match_id = $1
       ORDER BY m.date DESC`,
      [id]
    ).catch(() => ({ rows: [] }))

    // Get pupil achievements/badges
    let achievementsResult = { rows: [] }
    try {
      achievementsResult = await pool.query(
        `SELECT pa.id, pa.achievement_type, pa.title, pa.description, pa.icon, pa.earned_at,
                m.opponent as match_opponent, m.date as match_date,
                ts.date as training_date, ts.session_type as training_session_type
         FROM pupil_achievements pa
         LEFT JOIN matches m ON pa.match_id = m.id
         LEFT JOIN training_sessions ts ON pa.training_session_id = ts.id
         WHERE pa.pupil_id = $1
         ORDER BY pa.earned_at DESC`,
        [id]
      )
    } catch (err) {
      console.error('Failed to load pupil achievements:', err.message)
    }

    // Build response
    res.json({
      pupil: {
        id: pupil.id,
        name: pupil.name,
        age: pupil.age,
        dob: pupil.dob,
        positions: normalizePositions(pupil.positions),
        squad_number: pupil.squad_number,
      },
      team: {
        id: pupil.team_id,
        name: pupil.team_name,
        age_group: pupil.age_group,
        formation: pupil.formation,
      },
      upcomingMatches: upcomingMatchesResult.rows,
      recentMatches: recentMatchesResult.rows,
      upcomingTraining: trainingResult.rows,
      observations: observationsResult.rows,
      developmentPlan: idpResult.rows[0] || null,
      videos: videosResult.rows,
      documents: documentsResult.rows,
      announcements: contentResult.rows,
      potmAwards: potmResult.rows,
      achievements: achievementsResult.rows,
    })
  } catch (error) {
    next(error)
  }
})

// Update match availability (for pupil/parent)
router.post('/:id/availability/:matchId', authenticateToken, async (req, res, next) => {
  try {
    const { id, matchId } = req.params

    // Verify user has access (team member, linked pupil, or admin)
    const playerCheck = await pool.query('SELECT team_id FROM pupils WHERE id = $1', [id])
    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }
    if (playerCheck.rows[0].team_id !== req.user.team_id && id !== req.user.pupil_id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const { availability, notes } = req.body

    if (!['available', 'unavailable', 'maybe'].includes(availability)) {
      return res.status(400).json({ message: 'Invalid availability status' })
    }

    // Upsert availability (column is 'status' in the table)
    const result = await pool.query(
      `INSERT INTO match_availability (match_id, pupil_id, status, notes, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (match_id, pupil_id)
       DO UPDATE SET status = $3, notes = $4, updated_at = NOW()
       RETURNING *`,
      [matchId, id, availability, notes || null]
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Update training availability (for pupil/parent)
router.post('/:id/training-availability/:sessionId', authenticateToken, async (req, res, next) => {
  try {
    const { id, sessionId } = req.params

    // Verify user has access (team member, linked pupil, or admin)
    const playerCheck = await pool.query('SELECT team_id FROM pupils WHERE id = $1', [id])
    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }
    if (playerCheck.rows[0].team_id !== req.user.team_id && id !== req.user.pupil_id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const { availability, notes } = req.body

    if (!['available', 'unavailable', 'maybe'].includes(availability)) {
      return res.status(400).json({ message: 'Invalid availability status' })
    }

    const result = await pool.query(
      `INSERT INTO training_availability (session_id, pupil_id, status, notes, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (session_id, pupil_id)
       DO UPDATE SET status = $3, notes = $4, updated_at = NOW()
       RETURNING *`,
      [sessionId, id, availability, notes || null]
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Get pupil achievements
router.get('/:id/achievements', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params

    // Verify user has access (team member, linked pupil, or admin)
    const playerCheck = await pool.query('SELECT team_id FROM pupils WHERE id = $1', [id])
    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }
    if (playerCheck.rows[0].team_id !== req.user.team_id && id !== req.user.pupil_id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const result = await pool.query(
      `SELECT pa.*,
        m.opponent as match_opponent, m.date as match_date,
        ts.session_type as training_session_type, ts.date as training_date,
        u.name as awarded_by_name
       FROM pupil_achievements pa
       LEFT JOIN matches m ON pa.match_id = m.id
       LEFT JOIN training_sessions ts ON pa.training_session_id = ts.id
       LEFT JOIN users u ON pa.awarded_by = u.id
       WHERE pa.pupil_id = $1
       ORDER BY pa.earned_at DESC`,
      [id]
    )

    console.log(`[Achievements] Loaded ${result.rows.length} achievements for pupil ${id}`)
    res.json(result.rows)
  } catch (error) {
    // If table doesn't exist, return empty array instead of crashing
    if (error.code === '42P01') {
      console.error('[Achievements] pupil_achievements table does not exist - run migrations')
      return res.json([])
    }
    console.error('[Achievements] Error loading achievements:', error.message)
    next(error)
  }
})

// Award achievement to pupil
router.post('/:id/achievements', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params
    const { achievement_type, title, description, icon, match_id, training_session_id } = req.body

    // Check manager role
    if (!['manager', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only managers can award achievements' })
    }

    if (!achievement_type || !title) {
      return res.status(400).json({ message: 'achievement_type and title are required' })
    }

    // Get pupil info for notification
    const playerResult = await pool.query(
      'SELECT p.*, t.name as team_name FROM pupils p JOIN teams t ON p.team_id = t.id WHERE p.id = $1',
      [id]
    )
    if (playerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }
    const pupil = playerResult.rows[0]

    // Verify the pupil belongs to the user's team
    if (pupil.team_id !== req.user.team_id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' })
    }

    // Create achievement
    const result = await pool.query(
      `INSERT INTO pupil_achievements (pupil_id, achievement_type, title, description, icon, match_id, training_session_id, awarded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, achievement_type, title, description || null, icon || BADGE_TYPES[achievement_type]?.icon || '🏅',
       match_id || null, training_session_id || null, req.user.id]
    )

    const achievement = result.rows[0]
    console.log(`[Achievements] Created achievement ${achievement.id} for pupil ${id}: ${title}`)

    // Create notification for pupil (if they have a user account)
    if (pupil.user_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, team_id, type, title, message, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          pupil.user_id,
          pupil.team_id,
          'achievement',
          `🎉 You earned: ${title}!`,
          description || `Congratulations! You've been awarded the "${title}" badge.`,
          JSON.stringify({
            achievement_id: achievement.id,
            achievement_type,
            icon: achievement.icon,
            match_id,
            training_session_id
          })
        ]
      )
    }

    // Also notify parent if they have a linked account
    const parentContacts = []
    if (pupil.parent_contact) {
      try {
        const contacts = typeof pupil.parent_contact === 'string'
          ? JSON.parse(pupil.parent_contact)
          : pupil.parent_contact
        if (Array.isArray(contacts)) {
          parentContacts.push(...contacts.filter(c => c.email))
        }
      } catch {}
    }

    // Batch lookup all parent users in one query instead of N+1
    if (parentContacts.length > 0) {
      const contactEmails = parentContacts.map(c => c.email)
      const parentUsersResult = await pool.query(
        'SELECT id, email FROM users WHERE email = ANY($1) AND role = $2',
        [contactEmails, 'parent']
      )
      const parentUserMap = new Map(parentUsersResult.rows.map(r => [r.email, r.id]))

      // Batch insert notifications for all found parents
      const notifValues = []
      const notifParams = []
      let paramIdx = 1
      for (const contact of parentContacts) {
        const userId = parentUserMap.get(contact.email)
        if (userId) {
          notifValues.push(`($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4}, $${paramIdx+5})`)
          notifParams.push(
            userId,
            pupil.team_id,
            'achievement',
            `🎉 ${pupil.name} earned: ${title}!`,
            description || `${pupil.name} has been awarded the "${title}" badge.`,
            JSON.stringify({
              achievement_id: achievement.id,
              achievement_type,
              icon: achievement.icon,
              pupil_id: id,
              player_name: pupil.name
            })
          )
          paramIdx += 6
        }
      }
      if (notifValues.length > 0) {
        await pool.query(
          `INSERT INTO notifications (user_id, team_id, type, title, message, data)
           VALUES ${notifValues.join(', ')}`,
          notifParams
        )
      }

      // Send achievement emails in parallel
      const awardDate = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      await Promise.allSettled(parentContacts.map(contact =>
        sendAchievementEmail(contact.email, {
          teamName: pupil.team_name,
          playerName: pupil.name,
          badgeTitle: title,
          badgeIcon: achievement.icon,
          badgeDescription: BADGE_TYPES[achievement_type]?.description || description || '',
          reason: description,
          awardedBy: req.user.name,
          awardDate,
        })
      ))
    }

    res.json(achievement)
  } catch (error) {
    // If table doesn't exist, return helpful error
    if (error.code === '42P01') {
      console.error('pupil_achievements table does not exist - run migrations')
      return res.status(500).json({ message: 'Database not fully initialized. Please restart the server.' })
    }
    next(error)
  }
})

// Delete achievement
router.delete('/:id/achievements/:achievementId', authenticateToken, async (req, res, next) => {
  try {
    const { id, achievementId } = req.params

    // Check manager role
    if (!['manager', 'assistant'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only managers can delete achievements' })
    }

    // Verify the pupil belongs to the user's team
    const playerCheck = await pool.query('SELECT team_id FROM pupils WHERE id = $1', [id])
    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Pupil not found' })
    }
    if (playerCheck.rows[0].team_id !== req.user.team_id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const result = await pool.query(
      'DELETE FROM pupil_achievements WHERE id = $1 AND pupil_id = $2 RETURNING id',
      [achievementId, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Achievement not found' })
    }

    res.json({ message: 'Achievement deleted' })
  } catch (error) {
    // If table doesn't exist, return helpful error
    if (error.code === '42P01') {
      console.error('pupil_achievements table does not exist - run migrations')
      return res.status(500).json({ message: 'Database not fully initialized. Please restart the server.' })
    }
    next(error)
  }
})

export default router
