import express from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { HOD_ROLES } from '../middleware/schoolAuth.js'

const router = express.Router()
router.use(authenticateToken)

const SAFEGUARDING_ROLES = ['owner', 'school_admin', 'admin', 'head_of_pe', 'dsl', 'deputy_dsl']
const MEDICAL_ROLES = [...HOD_ROLES, 'head_of_sport', 'teacher', 'coach']

// Resolve the pupil's school (via team or teaching group) and the requester's
// effective role in that school. Returns { pupil, schoolId, role, isAdmin }.
async function resolvePupilAccess(req, pupilId) {
  const r = await pool.query(
    `SELECT p.*,
            (SELECT t.school_id FROM teams t WHERE t.id = p.team_id) AS team_school_id,
            (SELECT tg.school_id FROM teaching_group_pupils tgp
               JOIN teaching_groups tg ON tg.id = tgp.teaching_group_id
               WHERE tgp.pupil_id = p.id LIMIT 1) AS class_school_id
     FROM players p WHERE p.id = $1`,
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

function gate(access, allowedRoles) {
  if (!access || access.error) return false
  if (access.isAdmin) return true
  return allowedRoles.includes(access.role)
}

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

    const [stats, activeFlags] = await Promise.all([
      pool.query(
        `SELECT
          (SELECT COUNT(*) FROM observations o WHERE o.pupil_id = $1)::int AS observations,
          (SELECT COUNT(*) FROM pupil_assessments pa WHERE pa.pupil_id = $1)::int AS assessments,
          (SELECT COUNT(*) FROM team_memberships tm WHERE tm.pupil_id = $1)::int AS teams,
          (SELECT COUNT(*) FROM teaching_group_pupils tgp WHERE tgp.pupil_id = $1)::int AS classes,
          (SELECT COUNT(*) FROM pupil_idp_goals g WHERE g.pupil_id = $1 AND g.status = 'in_progress')::int AS active_goals,
          (SELECT COUNT(*) FROM player_achievements a WHERE a.player_id = $1)::int AS achievements`,
        [req.params.id]
      ),
      pool.query(
        `SELECT
          (SELECT COUNT(*) FROM pupil_medical_notes WHERE pupil_id = $1)::int > 0 AS has_medical,
          (SELECT COUNT(*) FROM pupil_send_notes WHERE pupil_id = $1)::int > 0 AS has_send,
          (SELECT COUNT(*) FROM pupil_safeguarding_notes WHERE pupil_id = $1 AND resolved_at IS NULL)::int > 0 AS has_open_safeguarding`,
        [req.params.id]
      ),
    ])

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
      stats: stats.rows[0],
      flags: activeFlags.rows[0],
      viewer_role: access.role,
      school_id: schoolId,
    })
  } catch (e) { console.error('pupilProfile/:id', e); res.status(500).json({ error: 'Failed to load profile' }) }
})

// GET /:id/idp-goals
router.get('/:id/idp-goals', async (req, res) => {
  const access = await resolvePupilAccess(req, req.params.id)
  if (access.error) return res.status(access.error === 'not_found' ? 404 : 403).json({ error: access.error })
  const r = await pool.query(
    `SELECT g.*, u.name AS created_by_name FROM pupil_idp_goals g
     LEFT JOIN users u ON u.id = g.created_by_user_id
     WHERE g.pupil_id = $1 ORDER BY g.status, g.created_at DESC`,
    [req.params.id]
  )
  res.json(r.rows)
})

// GET /:id/achievements
router.get('/:id/achievements', async (req, res) => {
  const access = await resolvePupilAccess(req, req.params.id)
  if (access.error) return res.status(access.error === 'not_found' ? 404 : 403).json({ error: access.error })
  const r = await pool.query(
    `SELECT a.*, u.name AS awarded_by_name, m.opponent AS match_opponent
     FROM player_achievements a
     LEFT JOIN users u ON u.id = a.awarded_by
     LEFT JOIN matches m ON m.id = a.match_id
     WHERE a.player_id = $1 ORDER BY a.earned_at DESC`,
    [req.params.id]
  )
  res.json(r.rows)
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
