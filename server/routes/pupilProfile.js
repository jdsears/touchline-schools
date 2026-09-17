import express from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { HOD_ROLES } from '../middleware/schoolAuth.js'
import { suggestGoalsFromObservations } from '../services/idpService.js'
import { pupilPackPdf, pdfFilename } from '../services/reportPdf.js'

const router = express.Router()
router.use(authenticateToken)

const SAFEGUARDING_ROLES = ['owner', 'school_admin', 'admin', 'head_of_pe', 'dsl', 'deputy_dsl']
const MEDICAL_ROLES = [...HOD_ROLES, 'head_of_sport', 'teacher', 'coach']
// Staff who may write to a pupil's development plan.
const IDP_WRITE_ROLES = MEDICAL_ROLES

const GOAL_STATUSES = ['in_progress', 'achieved', 'revised', 'abandoned']
const GOAL_ORIGINS = ['teacher', 'ai_suggested', 'pupil']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Resolve the pupil's school (via team or teaching group) and the requester's
// effective role in that school. Returns { pupil, schoolId, role, isAdmin }.
export async function resolvePupilAccess(req, pupilId) {
  const r = await pool.query(
    `SELECT p.*,
            (SELECT t.school_id FROM teams t WHERE t.id = p.team_id) AS team_school_id,
            (SELECT tg.school_id FROM teaching_group_pupils tgp
               JOIN teaching_groups tg ON tg.id = tgp.teaching_group_id
               JOIN schools s ON s.id = tg.school_id
               WHERE tgp.pupil_id = p.id
               ORDER BY tgp.created_at DESC LIMIT 1) AS class_school_id
     FROM pupils p WHERE p.id = $1`,
    [pupilId]
  )
  if (r.rows.length === 0) return { error: 'not_found' }
  const pupil = r.rows[0]
  const schoolIds = [pupil.team_school_id, pupil.class_school_id].filter(Boolean)
  if (req.user.is_admin) return { pupil, schoolId: schoolIds[0] || null, role: 'admin', isAdmin: true }

  if (schoolIds.length === 0) return { error: 'forbidden' }
  const m = await pool.query(
    `SELECT COALESCE(sm.school_role, sm.role) AS role, sm.school_id
     FROM school_members sm
     WHERE sm.user_id = $1 AND sm.school_id = ANY($2::uuid[]) LIMIT 1`,
    [req.user.id, schoolIds]
  )
  if (m.rows.length === 0) return { error: 'forbidden' }
  return { pupil, schoolId: m.rows[0].school_id, role: m.rows[0].role, isAdmin: false }
}

export function gate(access, allowedRoles) {
  if (!access || access.error) return false
  if (access.isAdmin) return true
  return allowedRoles.includes(access.role)
}

export const STAFF_PROFILE_ROLES = MEDICAL_ROLES

async function logAccess(req, pupilId, schoolId, tab) {
  await pool.query(
    `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'pupil_profile_tab_viewed', 'pupil', $3, $4)`,
    [schoolId, req.user.id, pupilId, JSON.stringify({ tab })]
  ).catch(() => {})
}

// GET /:id — core profile + identity flags + quick stats
router.get('/:id', async (req, res) => {
  try {
    const access = await resolvePupilAccess(req, req.params.id)
    if (access.error === 'not_found') return res.status(404).json({ error: 'Pupil not found' })
    if (access.error === 'forbidden') return res.status(403).json({ error: 'Access denied' })
    const { pupil, schoolId } = access

    // Each sub-query is individually guarded so a missing table does not crash
    // the whole response. Tables from Phase 21 may not exist yet on older DBs.
    const stats = { observations: 0, assessments: 0, teams: 0, classes: 0, active_goals: 0, achievements: 0 }
    const flags = { has_medical: false, has_send: false, has_open_safeguarding: false }

    try {
      const r = await pool.query(
        `SELECT
          (SELECT COUNT(*) FROM observations o WHERE o.pupil_id = $1)::int AS observations,
          (SELECT COUNT(*) FROM pupil_assessments pa WHERE pa.pupil_id = $1)::int AS assessments,
          (SELECT COUNT(*) FROM team_memberships tm WHERE tm.pupil_id = $1)::int AS teams,
          (SELECT COUNT(*) FROM teaching_group_pupils tgp WHERE tgp.pupil_id = $1)::int AS classes`,
        [req.params.id]
      )
      Object.assign(stats, r.rows[0])
    } catch (e) { console.warn('pupilProfile stats (core):', e.message) }

    try {
      const r = await pool.query(
        `SELECT (SELECT COUNT(*) FROM pupil_idp_goals g WHERE g.pupil_id = $1 AND g.status = 'in_progress')::int AS active_goals`,
        [req.params.id]
      )
      stats.active_goals = r.rows[0].active_goals
    } catch (e) { /* pupil_idp_goals may not exist */ }

    try {
      const r = await pool.query(
        `SELECT (SELECT COUNT(*) FROM pupil_achievements a WHERE a.player_id = $1)::int AS achievements`,
        [req.params.id]
      )
      stats.achievements = r.rows[0].achievements
    } catch (e) { /* pupil_achievements may not exist or may still be named player_achievements */ }

    try {
      const r = await pool.query(
        `SELECT
          (SELECT COUNT(*) FROM pupil_medical_notes WHERE pupil_id = $1)::int > 0 AS has_medical,
          (SELECT COUNT(*) FROM pupil_send_notes WHERE pupil_id = $1)::int > 0 AS has_send,
          (SELECT COUNT(*) FROM pupil_safeguarding_notes WHERE pupil_id = $1 AND resolved_at IS NULL)::int > 0 AS has_open_safeguarding`,
        [req.params.id]
      )
      Object.assign(flags, r.rows[0])
    } catch (e) { /* Phase 21 tables may not exist yet */ }

    res.json({
      pupil: {
        id: pupil.id, name: pupil.name,
        first_name: pupil.first_name, last_name: pupil.last_name,
        preferred_name: pupil.preferred_name, pronouns: pupil.pronouns,
        year_group: pupil.year_group, house: pupil.house, house_id: pupil.house_id,
        photo_url: pupil.photo_url, date_of_birth: pupil.date_of_birth,
        parent_email: pupil.parent_email, parent_phone: pupil.parent_phone,
        admission_date: pupil.admission_date, estimated_leaving_date: pupil.estimated_leaving_date,
        tutor_user_id: pupil.tutor_user_id,
        gcse_pe_candidate: pupil.gcse_pe_candidate,
        talent_pathway_flag: pupil.talent_pathway_flag,
      },
      stats,
      flags,
      viewer_role: access.role,
      school_id: schoolId,
    })
  } catch (e) { console.error('pupilProfile/:id', e); res.status(500).json({ error: 'Failed to load profile' }) }
})

// ── IDP goals ───────────────────────────────────────────────────────
// Goals live in pupil_idp_goals. Each one can cite the observations it
// rests on (source_observation_ids); the responses inline those as
// `evidence` so the Development tab can show the teacher why a goal exists.

const GOAL_SELECT = `SELECT g.*, u.name AS created_by_name FROM pupil_idp_goals g
  LEFT JOIN users u ON u.id = g.created_by_user_id`

async function attachEvidence(goals) {
  const ids = [...new Set(goals.flatMap(g => g.source_observation_ids || []))]
  if (ids.length === 0) return goals.map(g => ({ ...g, evidence: [] }))
  try {
    const r = await pool.query(
      `SELECT id, type, sport, context_type, created_at, LEFT(content, 240) AS content
       FROM observations WHERE id = ANY($1::uuid[])`,
      [ids]
    )
    const byId = new Map(r.rows.map(o => [o.id, o]))
    return goals.map(g => ({ ...g, evidence: (g.source_observation_ids || []).map(id => byId.get(id)).filter(Boolean) }))
  } catch (e) {
    console.warn('pupilProfile idp evidence:', e.message)
    return goals.map(g => ({ ...g, evidence: [] }))
  }
}

async function loadGoal(pupilId, goalId) {
  const r = await pool.query(`${GOAL_SELECT} WHERE g.id = $1 AND g.pupil_id = $2`, [goalId, pupilId])
  return r.rows[0] || null
}

function logGoalAction(req, pupilId, schoolId, action, details) {
  return pool.query(
    `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, 'pupil', $4, $5)`,
    [schoolId, req.user.id, action, pupilId, JSON.stringify(details || {})]
  ).catch(() => {})
}

function isoDateOrNull(value) {
  if (!value) return null
  const s = String(value).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

// Observation ids the client sent, kept only when they belong to this pupil.
async function ownedObservationIds(pupilId, ids) {
  const wanted = (Array.isArray(ids) ? ids : []).filter(id => UUID_RE.test(String(id)))
  if (wanted.length === 0) return []
  const r = await pool.query(`SELECT id FROM observations WHERE pupil_id = $1 AND id = ANY($2::uuid[])`, [pupilId, wanted])
  return r.rows.map(o => o.id)
}

// GET /:id/idp-goals
router.get('/:id/idp-goals', async (req, res) => {
  try {
    const access = await resolvePupilAccess(req, req.params.id)
    if (access.error) return res.status(access.error === 'not_found' ? 404 : 403).json({ error: access.error })
    const r = await pool.query(
      `${GOAL_SELECT} WHERE g.pupil_id = $1 ORDER BY g.status, g.created_at DESC`,
      [req.params.id]
    )
    res.json(await attachEvidence(r.rows))
  } catch (e) {
    if (e.code === '42P01') return res.json([]) // table not migrated yet
    console.error('pupilProfile idp-goals:', e.message)
    res.status(500).json({ error: 'Failed to load IDP goals' })
  }
})

// POST /:id/idp-goals/suggest — Claude proposes goals from confirmed observations
router.post('/:id/idp-goals/suggest', async (req, res, next) => {
  try {
    const access = await resolvePupilAccess(req, req.params.id)
    if (access.error) return res.status(access.error === 'not_found' ? 404 : 403).json({ error: access.error })
    if (!gate(access, IDP_WRITE_ROLES)) return res.status(403).json({ error: 'Access denied' })
    const pupilId = req.params.id

    const [obs, goals, sports, assessments] = await Promise.all([
      pool.query(
        `SELECT id, type, sport, context_type, content, created_at
         FROM observations
         WHERE pupil_id = $1 AND COALESCE(review_state, 'confirmed') IN ('confirmed', 'edited')
         ORDER BY created_at DESC LIMIT 30`,
        [pupilId]
      ),
      pool.query(
        `SELECT goal_description, sport_key, status, target_date FROM pupil_idp_goals
         WHERE pupil_id = $1 ORDER BY created_at DESC LIMIT 12`,
        [pupilId]
      ).catch(() => ({ rows: [] })),
      pool.query(
        `SELECT DISTINCT LOWER(sport) AS sport FROM (
           SELECT t.sport FROM teams t JOIN pupils p ON p.team_id = t.id WHERE p.id = $1
           UNION SELECT t.sport FROM team_memberships tm JOIN teams t ON t.id = tm.team_id WHERE tm.pupil_id = $1
           UNION SELECT su.sport FROM teaching_group_pupils tgp
             JOIN sport_units su ON su.teaching_group_id = tgp.teaching_group_id
             WHERE tgp.pupil_id = $1 AND su.end_date >= CURRENT_DATE - 120
         ) s WHERE sport IS NOT NULL`,
        [pupilId]
      ).catch(() => ({ rows: [] })),
      pool.query(
        `SELECT pa.grade, pa.assessment_type, su.unit_name, su.sport
         FROM pupil_assessments pa LEFT JOIN sport_units su ON su.id = pa.unit_id
         WHERE pa.pupil_id = $1 AND pa.grade IS NOT NULL
         ORDER BY pa.assessed_at DESC LIMIT 6`,
        [pupilId]
      ).catch(() => ({ rows: [] })),
    ])

    if (obs.rows.length === 0) {
      return res.status(422).json({ error: 'No confirmed observations to work from yet. Log a few observations first.' })
    }

    const suggestions = await suggestGoalsFromObservations({
      pupil: access.pupil,
      sports: sports.rows.map(r => r.sport),
      observations: obs.rows,
      existingGoals: goals.rows,
      assessments: assessments.rows,
    })

    await logGoalAction(req, pupilId, access.schoolId, 'idp_goals_suggested', { count: suggestions.length, observations: obs.rows.length })
    res.json({ suggestions, observation_count: obs.rows.length })
  } catch (e) {
    if (e.code === 'AI_NOT_CONFIGURED') return next(e)
    console.error('pupilProfile idp suggest:', e)
    res.status(500).json({ error: e.message?.includes('JSON') ? 'The suggestion could not be read. Please try again.' : 'Failed to suggest goals' })
  }
})

// POST /:id/idp-goals — create a goal (written by the teacher or accepted from a suggestion)
router.post('/:id/idp-goals', async (req, res) => {
  try {
    const access = await resolvePupilAccess(req, req.params.id)
    if (access.error) return res.status(access.error === 'not_found' ? 404 : 403).json({ error: access.error })
    if (!gate(access, IDP_WRITE_ROLES)) return res.status(403).json({ error: 'Access denied' })
    const pupilId = req.params.id
    const body = req.body || {}

    const description = String(body.goal_description || '').replace(/\s+/g, ' ').trim()
    if (!description) return res.status(400).json({ error: 'A goal description is required' })
    if (description.length > 300) return res.status(400).json({ error: 'Keep the goal under 300 characters' })

    const origin = GOAL_ORIGINS.includes(body.origin) ? body.origin : 'teacher'
    let targetDate = isoDateOrNull(body.target_date)
    if (!targetDate && body.target_weeks) {
      const weeks = Math.min(52, Math.max(1, parseInt(body.target_weeks, 10) || 8))
      const d = new Date(); d.setDate(d.getDate() + weeks * 7)
      targetDate = d.toISOString().slice(0, 10)
    }
    const sportKey = body.sport_key ? String(body.sport_key).toLowerCase().trim().slice(0, 40) : null
    const evidenceIds = await ownedObservationIds(pupilId, body.source_observation_ids)

    const r = await pool.query(
      `INSERT INTO pupil_idp_goals
         (pupil_id, sport_key, goal_description, success_criteria, rationale, target_date,
          status, origin, source_observation_ids, teacher_assessment_notes, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'in_progress', $7, $8::uuid[], $9, $10)
       RETURNING *`,
      [
        pupilId, sportKey, description,
        body.success_criteria ? String(body.success_criteria).trim().slice(0, 500) : null,
        body.rationale ? String(body.rationale).trim().slice(0, 800) : null,
        targetDate, origin, evidenceIds,
        body.teacher_assessment_notes ? String(body.teacher_assessment_notes).trim().slice(0, 1000) : null,
        req.user.id,
      ]
    )
    await logGoalAction(req, pupilId, access.schoolId, 'idp_goal_created', { goal_id: r.rows[0].id, origin, evidence: evidenceIds.length })
    const [goal] = await attachEvidence([{ ...r.rows[0], created_by_name: req.user.name || null }])
    res.status(201).json(goal)
  } catch (e) {
    console.error('pupilProfile idp create:', e.message)
    res.status(500).json({ error: 'Failed to save the goal' })
  }
})

// PATCH /:id/idp-goals/:goalId — status, notes, wording, target
router.patch('/:id/idp-goals/:goalId', async (req, res) => {
  try {
    const access = await resolvePupilAccess(req, req.params.id)
    if (access.error) return res.status(access.error === 'not_found' ? 404 : 403).json({ error: access.error })
    if (!gate(access, IDP_WRITE_ROLES)) return res.status(403).json({ error: 'Access denied' })
    const { id: pupilId, goalId } = req.params
    if (!UUID_RE.test(goalId)) return res.status(400).json({ error: 'Invalid goal id' })
    const existing = await loadGoal(pupilId, goalId)
    if (!existing) return res.status(404).json({ error: 'Goal not found' })

    const body = req.body || {}
    const updates = []
    const values = []
    const set = (column, value) => { values.push(value); updates.push(`${column} = $${values.length}`) }

    if (body.status !== undefined) {
      if (!GOAL_STATUSES.includes(body.status)) return res.status(400).json({ error: `Status must be one of ${GOAL_STATUSES.join(', ')}` })
      set('status', body.status)
    }
    if (body.goal_description !== undefined) {
      const description = String(body.goal_description).replace(/\s+/g, ' ').trim()
      if (!description || description.length > 300) return res.status(400).json({ error: 'Goal must be 1-300 characters' })
      set('goal_description', description)
    }
    if (body.success_criteria !== undefined) set('success_criteria', body.success_criteria ? String(body.success_criteria).trim().slice(0, 500) : null)
    if (body.teacher_assessment_notes !== undefined) set('teacher_assessment_notes', body.teacher_assessment_notes ? String(body.teacher_assessment_notes).trim().slice(0, 1000) : null)
    if (body.sport_key !== undefined) set('sport_key', body.sport_key ? String(body.sport_key).toLowerCase().trim().slice(0, 40) : null)
    if (body.target_date !== undefined) set('target_date', isoDateOrNull(body.target_date))
    if (body.source_observation_ids !== undefined) {
      values.push(await ownedObservationIds(pupilId, body.source_observation_ids))
      updates.push(`source_observation_ids = $${values.length}::uuid[]`)
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' })

    values.push(goalId)
    await pool.query(`UPDATE pupil_idp_goals SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length}`, values)
    await logGoalAction(req, pupilId, access.schoolId, 'idp_goal_updated', { goal_id: goalId, fields: Object.keys(body) })
    const [goal] = await attachEvidence([await loadGoal(pupilId, goalId)])
    res.json(goal)
  } catch (e) {
    console.error('pupilProfile idp update:', e.message)
    res.status(500).json({ error: 'Failed to update the goal' })
  }
})

// DELETE /:id/idp-goals/:goalId — remove a goal added by mistake
router.delete('/:id/idp-goals/:goalId', async (req, res) => {
  try {
    const access = await resolvePupilAccess(req, req.params.id)
    if (access.error) return res.status(access.error === 'not_found' ? 404 : 403).json({ error: access.error })
    if (!gate(access, IDP_WRITE_ROLES)) return res.status(403).json({ error: 'Access denied' })
    const { id: pupilId, goalId } = req.params
    if (!UUID_RE.test(goalId)) return res.status(400).json({ error: 'Invalid goal id' })
    const existing = await loadGoal(pupilId, goalId)
    if (!existing) return res.status(404).json({ error: 'Goal not found' })
    const isOwner = existing.created_by_user_id === req.user.id
    if (!isOwner && !gate(access, HOD_ROLES)) return res.status(403).json({ error: 'Only the goal author or a Head of Department can remove it' })
    await pool.query(`DELETE FROM pupil_idp_goals WHERE id = $1 AND pupil_id = $2`, [goalId, pupilId])
    await logGoalAction(req, pupilId, access.schoolId, 'idp_goal_deleted', { goal_id: goalId })
    res.status(204).end()
  } catch (e) {
    console.error('pupilProfile idp delete:', e.message)
    res.status(500).json({ error: 'Failed to remove the goal' })
  }
})

// GET /:id/parents-evening-pack — one PDF a teacher can hand to parents:
// written reports, curriculum grades, development plan, awards and
// participation. Staff notes and observations are deliberately not
// reproduced; only their count is.
router.get('/:id/parents-evening-pack', async (req, res) => {
  try {
    const access = await resolvePupilAccess(req, req.params.id)
    if (access.error) return res.status(access.error === 'not_found' ? 404 : 403).json({ error: access.error })
    if (!gate(access, STAFF_PROFILE_ROLES)) return res.status(403).json({ error: 'Access denied' })
    const pupilId = req.params.id
    const rows = async (sql, params) => pool.query(sql, params).then(r => r.rows).catch(e => { console.warn('parents pack query:', e.message); return [] })

    const [school, classes, teams, reports, assessments, goals, achievements, participation] = await Promise.all([
      rows(`SELECT name, primary_color, accent_color FROM schools WHERE id = $1`, [access.schoolId]).then(r => r[0] || null),
      rows(`SELECT tg.name, tg.year_group FROM teaching_group_pupils tgp JOIN teaching_groups tg ON tg.id = tgp.teaching_group_id WHERE tgp.pupil_id = $1 ORDER BY tg.name`, [pupilId]),
      rows(`SELECT DISTINCT t.name, t.sport FROM teams t
            WHERE t.id = (SELECT team_id FROM pupils WHERE id = $1)
               OR t.id IN (SELECT team_id FROM team_memberships WHERE pupil_id = $1)
            ORDER BY t.name`, [pupilId]),
      rows(`SELECT pr.*, rw.name AS window_name, rw.term, rw.academic_year, rw.closes_at,
                   su.unit_name, su.sport AS unit_sport, u.name AS teacher_name
            FROM pupil_reports pr
            JOIN reporting_windows rw ON rw.id = pr.reporting_window_id
            LEFT JOIN sport_units su ON su.id = pr.unit_id
            LEFT JOIN users u ON u.id = COALESCE(pr.teacher_id, pr.generated_by)
            WHERE pr.pupil_id = $1 AND pr.status IN ('submitted', 'published')
            ORDER BY rw.closes_at DESC NULLS LAST, pr.updated_at DESC`, [pupilId]),
      rows(`SELECT pa.grade, pa.assessment_type, pa.assessed_at, su.unit_name, su.sport,
                   ac.criterion, ac.criterion_name, cs.strand_name
            FROM pupil_assessments pa
            LEFT JOIN sport_units su ON su.id = pa.unit_id
            LEFT JOIN assessment_criteria ac ON ac.id = pa.criteria_id
            LEFT JOIN curriculum_strands cs ON cs.id = ac.strand_id
            WHERE pa.pupil_id = $1 AND pa.grade IS NOT NULL
            ORDER BY pa.assessed_at DESC LIMIT 12`, [pupilId]),
      rows(`SELECT * FROM pupil_idp_goals WHERE pupil_id = $1 ORDER BY status, created_at DESC`, [pupilId]),
      rows(`SELECT title, description, earned_at, sport_key FROM pupil_achievements WHERE player_id = $1 ORDER BY earned_at DESC`, [pupilId]),
      rows(`SELECT (SELECT COUNT(*) FROM match_squads ms WHERE ms.pupil_id = $1)::int AS fixtures,
                   (SELECT COUNT(*) FROM observations o WHERE o.pupil_id = $1 AND o.created_at > NOW() - INTERVAL '365 days')::int AS observations`, [pupilId]).then(r => r[0] || {}),
    ])

    const pdf = await pupilPackPdf({
      school, pupil: access.pupil, classes, teams, reports, assessments, goals, achievements, participation,
      generatedBy: req.user.name || null,
    })
    await logAccess(req, pupilId, access.schoolId, 'parents_evening_pack')
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename(access.pupil.name || `${access.pupil.first_name}-${access.pupil.last_name}`, 'progress-report')}"`)
    res.send(pdf)
  } catch (e) {
    console.error('pupilProfile parents pack:', e)
    res.status(500).json({ error: 'Failed to build the PDF' })
  }
})

// GET /:id/achievements
router.get('/:id/achievements', async (req, res) => {
  try {
    const access = await resolvePupilAccess(req, req.params.id)
    if (access.error) return res.status(access.error === 'not_found' ? 404 : 403).json({ error: access.error })
    // Older databases may still have the pre-rename player_achievements table.
    const achievementsSql = (table) =>
      `SELECT a.*, u.name AS awarded_by_name, m.opponent AS match_opponent
       FROM ${table} a
       LEFT JOIN users u ON u.id = a.awarded_by
       LEFT JOIN matches m ON m.id = a.match_id
       WHERE a.player_id = $1 ORDER BY a.earned_at DESC`
    let r
    try {
      r = await pool.query(achievementsSql('pupil_achievements'), [req.params.id])
    } catch (e) {
      if (e.code !== '42P01') throw e
      r = await pool.query(achievementsSql('player_achievements'), [req.params.id])
    }
    res.json(r.rows)
  } catch (e) {
    if (e.code === '42P01') return res.json([]) // neither table exists yet
    console.error('pupilProfile achievements:', e.message)
    res.status(500).json({ error: 'Failed to load achievements' })
  }
})

// GET /:id/medical — HoD & PE teachers; access-logged
router.get('/:id/medical', async (req, res) => {
  const access = await resolvePupilAccess(req, req.params.id)
  if (access.error) return res.status(access.error === 'not_found' ? 404 : 403).json({ error: access.error })
  if (!gate(access, MEDICAL_ROLES)) return res.status(403).json({ error: 'Access denied' })
  await logAccess(req, req.params.id, access.schoolId, 'medical')
  const r = await pool.query(
    `SELECT m.*, u.name AS last_reviewed_by_name FROM pupil_medical_notes m
     LEFT JOIN users u ON u.id = m.last_reviewed_by_user_id
     WHERE m.pupil_id = $1 ORDER BY m.created_at DESC`,
    [req.params.id]
  )
  res.json(r.rows)
})

// GET /:id/send — HoD & PE teachers
router.get('/:id/send', async (req, res) => {
  const access = await resolvePupilAccess(req, req.params.id)
  if (access.error) return res.status(access.error === 'not_found' ? 404 : 403).json({ error: access.error })
  if (!gate(access, MEDICAL_ROLES)) return res.status(403).json({ error: 'Access denied' })
  await logAccess(req, req.params.id, access.schoolId, 'send')
  const r = await pool.query(
    `SELECT * FROM pupil_send_notes WHERE pupil_id = $1 ORDER BY created_at DESC`,
    [req.params.id]
  )
  res.json(r.rows)
})

// GET /:id/safeguarding — strict: HoD, DSL, deputy DSL only; ALWAYS access-logged
router.get('/:id/safeguarding', async (req, res) => {
  const access = await resolvePupilAccess(req, req.params.id)
  if (access.error) return res.status(access.error === 'not_found' ? 404 : 403).json({ error: access.error })
  if (!gate(access, SAFEGUARDING_ROLES)) return res.status(403).json({ error: 'Access denied' })
  await logAccess(req, req.params.id, access.schoolId, 'safeguarding')
  const r = await pool.query(
    `SELECT s.*, u.name AS added_by_name FROM pupil_safeguarding_notes s
     LEFT JOIN users u ON u.id = s.added_by_user_id
     WHERE s.pupil_id = $1 ORDER BY s.resolved_at IS NULL DESC, s.added_at DESC`,
    [req.params.id]
  )
  res.json(r.rows)
})

export default router
