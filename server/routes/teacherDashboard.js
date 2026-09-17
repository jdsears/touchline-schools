import express from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { HOD_ROLES } from '../middleware/schoolAuth.js'

const router = express.Router()
router.use(authenticateToken)

// Teams this user runs: owned outright, or a staff membership on the team.
const MY_TEAMS_SQL = `
  SELECT t.id, t.name, t.sport
  FROM teams t
  WHERE t.owner_id = $1
     OR EXISTS (SELECT 1 FROM team_memberships tm
                WHERE tm.team_id = t.id AND tm.user_id = $1
                  AND tm.role IN ('manager', 'assistant', 'scout'))`

// Calendar date in the school's timezone. The server runs in UTC, so at
// 00:30 on a BST morning toISOString() would still say yesterday.
function londonToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

// Rows-or-empty: one missing table (older databases) must not blank the
// whole dashboard.
async function safeRows(label, sql, params) {
  try {
    const result = await pool.query(sql, params)
    return result.rows
  } catch (err) {
    console.warn(`Teacher dashboard query "${label}" failed:`, err.message)
    return []
  }
}

// GET /today - Teacher's schedule for today (lessons, classes, training, fixtures)
router.get('/today', async (req, res) => {
  try {
    const userId = req.user.id
    const today = londonToday()

    const [classes, lessons, training, fixtures] = await Promise.all([
      safeRows('classes',
        `SELECT su.id, su.sport, su.unit_name,
                tg.id AS group_id, tg.name AS class_name, tg.year_group,
                (SELECT COUNT(*) FROM teaching_group_pupils tgp WHERE tgp.teaching_group_id = tg.id) AS pupil_count
         FROM sport_units su
         JOIN teaching_groups tg ON tg.id = su.teaching_group_id
         WHERE tg.teacher_id = $1 AND su.start_date <= $2 AND su.end_date >= $2`,
        [userId, today]
      ),
      safeRows('lessons',
        `SELECT lp.id, lp.title, lp.lesson_date, lp.duration, lp.status,
                tg.id AS group_id, tg.name AS class_name, tg.year_group,
                su.sport, su.unit_name
         FROM lesson_plans lp
         LEFT JOIN teaching_groups tg ON tg.id = lp.teaching_group_id
         LEFT JOIN sport_units su ON su.id = lp.sport_unit_id
         WHERE lp.teacher_id = $1 AND lp.lesson_date = $2
         ORDER BY lp.created_at`,
        [userId, today]
      ),
      safeRows('training',
        `WITH my_teams AS (${MY_TEAMS_SQL})
         SELECT ts.id, ts.date, ts.time, ts.location, ts.session_type, ts.focus_areas,
                t.id AS team_id, t.name AS team_name, t.sport,
                (SELECT COUNT(*) FROM pupils p WHERE p.team_id = t.id AND p.is_active = true) AS pupil_count
         FROM training_sessions ts
         JOIN my_teams t ON t.id = ts.team_id
         WHERE ts.date = $2
         ORDER BY ts.time NULLS LAST`,
        [userId, today]
      ),
      safeRows('fixtures',
        `WITH my_teams AS (${MY_TEAMS_SQL})
         SELECT m.id, COALESCE(m.date, m.match_date) AS match_date, m.match_time, m.opponent,
                m.location, m.home_away, m.kit_type, m.squad_announced,
                t.id AS team_id, t.name AS team_name, t.sport,
                (SELECT COUNT(*) FROM pupils p WHERE p.team_id = t.id AND p.is_active = true) AS pupil_count
         FROM matches m
         JOIN my_teams t ON t.id = m.team_id
         WHERE COALESCE(m.date, m.match_date) = $2
         ORDER BY m.match_time NULLS LAST`,
        [userId, today]
      ),
    ])

    res.json({ date: today, classes, lessons, training, fixtures })
  } catch (error) {
    console.error('Teacher dashboard today error:', error)
    res.status(500).json({ error: 'Failed to load today schedule' })
  }
})

// GET /my-classes - Teacher's classes with current unit and assessment progress
router.get('/my-classes', async (req, res) => {
  try {
    const userId = req.user.id

    const result = await pool.query(
      `SELECT tg.id, tg.name, tg.year_group, tg.key_stage,
              (SELECT COUNT(*) FROM teaching_group_pupils tgp WHERE tgp.teaching_group_id = tg.id) AS pupil_count,
              (SELECT json_agg(json_build_object(
                 'id', su.id, 'sport', su.sport, 'unit_name', su.unit_name,
                 'start_date', su.start_date, 'end_date', su.end_date
               )) FROM sport_units su WHERE su.teaching_group_id = tg.id
                 AND su.start_date <= CURRENT_DATE AND su.end_date >= CURRENT_DATE
              ) AS current_units,
              (SELECT COUNT(*) FROM pupil_assessments pa
               JOIN sport_units su2 ON su2.id = pa.unit_id
               WHERE su2.teaching_group_id = tg.id
                 AND pa.assessed_at > NOW() - INTERVAL '3 months'
              ) AS assessments_this_term
       FROM teaching_groups tg
       WHERE tg.teacher_id = $1
       ORDER BY tg.year_group, tg.name`,
      [userId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Teacher dashboard my-classes error:', error)
    res.status(500).json({ error: 'Failed to load classes' })
  }
})

// GET /my-teams - Teacher's teams with last result, next fixture and next training
router.get('/my-teams', async (req, res) => {
  try {
    const userId = req.user.id

    const result = await pool.query(
      `SELECT t.id, t.name, t.sport, t.age_group,
              (SELECT COUNT(*) FROM pupils p WHERE p.team_id = t.id AND p.is_active = true) AS pupil_count,
              (SELECT json_build_object('id', m.id, 'opponent', m.opponent, 'date', COALESCE(m.date, m.match_date),
                       'score_for', m.score_for, 'score_against', m.score_against)
               FROM matches m WHERE m.team_id = t.id AND m.score_for IS NOT NULL
               ORDER BY COALESCE(m.date, m.match_date) DESC LIMIT 1
              ) AS last_result,
              (SELECT json_build_object('id', m2.id, 'opponent', m2.opponent, 'date', COALESCE(m2.date, m2.match_date),
                       'time', m2.match_time, 'home_away', m2.home_away, 'location', m2.location,
                       'squad_announced', m2.squad_announced,
                       'squad_size', (SELECT COUNT(*) FROM match_squads ms WHERE ms.match_id = m2.id))
               FROM matches m2 WHERE m2.team_id = t.id AND COALESCE(m2.date, m2.match_date) >= CURRENT_DATE AND m2.score_for IS NULL
               ORDER BY COALESCE(m2.date, m2.match_date) ASC, m2.match_time ASC NULLS LAST LIMIT 1
              ) AS next_fixture,
              (SELECT json_build_object('id', ts.id, 'date', ts.date, 'time', ts.time, 'location', ts.location)
               FROM training_sessions ts WHERE ts.team_id = t.id AND ts.date >= CURRENT_DATE
               ORDER BY ts.date ASC, ts.time ASC NULLS LAST LIMIT 1
              ) AS next_training
       FROM teams t
       WHERE (t.owner_id = $1 OR EXISTS (SELECT 1 FROM team_memberships tm WHERE tm.team_id = t.id AND tm.user_id = $1 AND tm.role IN ('manager', 'assistant', 'scout')))
       ORDER BY t.sport, t.name`,
      [userId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Teacher dashboard my-teams error:', error)
    res.status(500).json({ error: 'Failed to load teams' })
  }
})

// GET /development - pupils across the teacher's teams with their
// development footprint (observations, IDP goals, latest activity)
router.get('/development', async (req, res) => {
  try {
    const userId = req.user.id
    const goalCountSql = `(SELECT COUNT(*)::int FROM pupil_idp_goals g WHERE g.pupil_id = p.id)`
    const runQuery = (withGoals) => pool.query(
      `WITH my_teams AS (
         SELECT DISTINCT t.id, t.sport
         FROM teams t
         LEFT JOIN team_memberships tm ON tm.team_id = t.id AND tm.user_id = $1
         WHERE t.owner_id = $1 OR (tm.user_id = $1 AND tm.role IN ('manager', 'assistant', 'scout'))
       ),
       team_pupils AS (
         SELECT DISTINCT p.id AS pupil_id, mt.sport
         FROM my_teams mt
         JOIN pupils p ON p.team_id = mt.id
         UNION
         SELECT DISTINCT tm.pupil_id, mt.sport
         FROM my_teams mt
         JOIN team_memberships tm ON tm.team_id = mt.id AND tm.pupil_id IS NOT NULL
       )
       SELECT p.id,
              COALESCE(NULLIF(TRIM(p.name), ''), TRIM(CONCAT(p.first_name, ' ', p.last_name))) AS name,
              p.year_group,
              ARRAY_AGG(DISTINCT tp.sport) AS sports,
              (SELECT COUNT(*)::int FROM observations o WHERE o.pupil_id = p.id) AS observation_count,
              ${withGoals ? goalCountSql : '0'} AS goal_count,
              (SELECT MAX(o.created_at) FROM observations o WHERE o.pupil_id = p.id) AS last_observation_at
       FROM team_pupils tp
       JOIN pupils p ON p.id = tp.pupil_id
       GROUP BY p.id, p.name, p.first_name, p.last_name, p.year_group
       ORDER BY observation_count DESC, name ASC`,
      [userId]
    )

    let result
    try {
      result = await runQuery(true)
    } catch (err) {
      // 42P01 = undefined table; environments without the IDP goals
      // migration still get the roster, with goal counts at zero
      if (err.code === '42P01') {
        result = await runQuery(false)
      } else {
        throw err
      }
    }
    res.json(result.rows)
  } catch (error) {
    console.error('Teacher development roster error:', error)
    res.status(500).json({ message: 'Failed to load pupil development' })
  }
})

// ── Attention queue ─────────────────────────────────────────────────
// Every item is an action the signed-in user can take right now, with the
// page that completes it. Nothing here is inferred or invented: each row
// is backed by a record in a state that needs a human to move it on.

const URGENCY_RANK = { high: 0, medium: 1, low: 2 }

function daysBetween(fromIso, toDate) {
  const from = new Date(`${fromIso}T00:00:00Z`)
  const to = new Date(`${String(toDate).slice(0, 10)}T00:00:00Z`)
  return Math.round((to - from) / 86400000)
}

// Deadline-driven urgency: due/overdue today or tomorrow is high, this week
// is medium, anything further out is low.
function urgencyFor(today, dueDate) {
  if (!dueDate) return 'low'
  const days = daysBetween(today, dueDate)
  if (days <= 1) return 'high'
  if (days <= 3) return 'medium'
  return 'low'
}

function isoDateOnly(value) {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function hhmm(value) {
  return value ? String(value).slice(0, 5) : null
}

async function resolveHodSchool(req) {
  if (req.user.is_admin) {
    const rows = await safeRows('admin school',
      `SELECT s.id, s.slug FROM schools s ORDER BY s.created_at ASC LIMIT 1`, [])
    return rows[0] ? { schoolId: rows[0].id, slug: rows[0].slug, role: 'school_admin' } : null
  }
  const rows = await safeRows('hod school',
    `SELECT sm.school_id, COALESCE(sm.school_role, sm.role) AS role, s.slug
     FROM school_members sm
     JOIN schools s ON s.id = sm.school_id
     WHERE sm.user_id = $1 AND (sm.school_role = ANY($2) OR sm.role = ANY($2))
     ORDER BY sm.joined_at ASC
     LIMIT 1`,
    [req.user.id, HOD_ROLES]
  )
  return rows[0] ? { schoolId: rows[0].school_id, slug: rows[0].slug, role: rows[0].role } : null
}

// GET /attention - unified action queue for the dashboard
router.get('/attention', async (req, res) => {
  try {
    const userId = req.user.id
    const today = londonToday()
    const items = []

    const [squadRows, resultRows, voiceRows, flaggedRows, gradingRows, hod] = await Promise.all([
      // Fixtures this week whose squad is not yet selected or announced
      safeRows('squads',
        `WITH my_teams AS (${MY_TEAMS_SQL})
         SELECT m.id, m.opponent, m.home_away, COALESCE(m.date, m.match_date) AS match_date, m.match_time,
                t.name AS team_name,
                (SELECT COUNT(*) FROM match_squads ms WHERE ms.match_id = m.id)::int AS squad_size
         FROM matches m
         JOIN my_teams t ON t.id = m.team_id
         WHERE COALESCE(m.date, m.match_date) BETWEEN $2::date AND $2::date + 7
           AND m.score_for IS NULL
           AND m.squad_announced IS NOT TRUE
         ORDER BY COALESCE(m.date, m.match_date), m.match_time NULLS LAST`,
        [userId, today]
      ),
      // Fixtures already played with no result recorded
      safeRows('results',
        `WITH my_teams AS (${MY_TEAMS_SQL})
         SELECT m.id, m.opponent, m.home_away, COALESCE(m.date, m.match_date) AS match_date, m.match_time,
                t.name AS team_name
         FROM matches m
         JOIN my_teams t ON t.id = m.team_id
         WHERE COALESCE(m.date, m.match_date) BETWEEN $2::date - 14 AND $2::date - 1
           AND m.score_for IS NULL
         ORDER BY COALESCE(m.date, m.match_date) DESC`,
        [userId, today]
      ),
      // Voice notes whose extracted observations are still awaiting confirmation
      safeRows('voice',
        `SELECT a.id, a.created_at, COUNT(o.id)::int AS pending_count
         FROM audio_sources a
         JOIN observations o ON o.audio_source_id = a.id AND o.review_state = 'pending_review'
         WHERE a.teacher_id = $1
         GROUP BY a.id
         ORDER BY a.created_at DESC
         LIMIT 5`,
        [userId]
      ),
      // Concerns this user logged recently, one row per pupil
      safeRows('flagged',
        `SELECT DISTINCT ON (p.id) p.id AS pupil_id, p.name, o.type, o.created_at
         FROM observations o
         JOIN pupils p ON p.id = o.pupil_id
         WHERE o.observer_id = $1
           AND o.type IN ('concern', 'welfare', 'behaviour', 'safeguarding')
           AND COALESCE(o.review_state, 'confirmed') <> 'rejected'
           AND o.created_at > NOW() - INTERVAL '14 days'
         ORDER BY p.id, o.created_at DESC`,
        [userId]
      ),
      // Units finishing (or just finished) with pupils still ungraded
      safeRows('grading',
        `SELECT su.id AS unit_id, su.unit_name, su.sport, su.end_date,
                tg.id AS group_id, tg.name AS class_name,
                (SELECT COUNT(*) FROM teaching_group_pupils tgp WHERE tgp.teaching_group_id = tg.id)::int AS pupils,
                (SELECT COUNT(DISTINCT pa.pupil_id) FROM pupil_assessments pa WHERE pa.unit_id = su.id)::int AS assessed
         FROM sport_units su
         JOIN teaching_groups tg ON tg.id = su.teaching_group_id
         WHERE tg.teacher_id = $1
           AND su.end_date BETWEEN $2::date - 14 AND $2::date + 14
         ORDER BY su.end_date`,
        [userId, today]
      ),
      resolveHodSchool(req),
    ])

    for (const m of squadRows) {
      const dueDate = isoDateOnly(m.match_date)
      items.push({
        id: `squad:${m.id}`,
        role: 'teacherExtraCurricular',
        verb: m.squad_size > 0 ? 'Announce squad' : 'Confirm squad',
        subject: `${m.team_name} ${m.home_away === 'home' ? 'vs' : 'at'} ${m.opponent}`,
        due_date: dueDate,
        due_time: hhmm(m.match_time),
        urgency: urgencyFor(today, dueDate),
        href: `/teacher/match/${m.id}/squad`,
      })
    }

    for (const m of resultRows) {
      items.push({
        id: `result:${m.id}`,
        role: 'teacherExtraCurricular',
        verb: 'Record result',
        subject: `${m.team_name} ${m.home_away === 'home' ? 'vs' : 'at'} ${m.opponent}`,
        due_date: isoDateOnly(m.match_date),
        due_time: null,
        urgency: 'high',
        href: `/teacher/match/${m.id}`,
      })
    }

    for (const v of voiceRows) {
      items.push({
        id: `voice:${v.id}`,
        role: 'teacherCurriculum',
        verb: 'Review voice note',
        subject: `${v.pending_count} observation${v.pending_count === 1 ? '' : 's'} awaiting your confirmation`,
        since: v.created_at,
        urgency: 'medium',
        href: `/teacher/voice-review/${v.id}`,
      })
    }

    for (const f of flaggedRows.slice(0, 3)) {
      items.push({
        id: `flag:${f.pupil_id}`,
        role: 'teacherCurriculum',
        verb: 'Follow up',
        subject: `${f.name} — ${f.type} noted`,
        since: f.created_at,
        urgency: ['welfare', 'safeguarding'].includes(f.type) ? 'medium' : 'low',
        href: `/teacher/hod/pupils/${f.pupil_id}`,
      })
    }

    for (const g of gradingRows) {
      if (g.pupils === 0 || g.assessed >= g.pupils) continue
      const dueDate = isoDateOnly(g.end_date)
      items.push({
        id: `grade:${g.unit_id}`,
        role: 'teacherCurriculum',
        verb: 'Grade unit',
        subject: `${g.unit_name} · ${g.class_name}, ${g.assessed}/${g.pupils} assessed`,
        due_date: dueDate,
        urgency: urgencyFor(today, dueDate),
        href: `/teacher/assessment?unit=${g.unit_id}`,
      })
    }

    if (hod) {
      const hodRole = ['owner', 'school_admin', 'admin'].includes(hod.role) ? 'schoolAdmin' : 'hod'
      const [windows, incidents, consents] = await Promise.all([
        safeRows('windows',
          `SELECT rw.id, rw.name, rw.closes_at,
                  (SELECT COUNT(*) FROM pupil_reports pr WHERE pr.reporting_window_id = rw.id AND pr.status = 'submitted')::int AS submitted
           FROM reporting_windows rw
           WHERE rw.school_id = $1 AND rw.status IN ('open', 'draft')
           ORDER BY rw.closes_at ASC`,
          [hod.schoolId]
        ),
        safeRows('incidents',
          `SELECT si.id, COALESCE(si.category, si.incident_type) AS kind, si.severity, si.created_at
           FROM safeguarding_incidents si
           WHERE si.school_id = $1 AND si.status NOT IN ('closed', 'resolved')
           ORDER BY si.created_at DESC
           LIMIT 3`,
          [hod.schoolId]
        ),
        safeRows('consents',
          `SELECT COUNT(*)::int AS n, MIN(pc.expires_at) AS first_expiry
           FROM pupil_consents pc
           JOIN consent_types ct ON ct.id = pc.consent_type_id AND ct.school_id = $1
           WHERE pc.status = 'granted' AND pc.expires_at < NOW() + INTERVAL '30 days'`,
          [hod.schoolId]
        ),
      ])

      for (const w of windows) {
        if (w.submitted === 0) continue
        const dueDate = isoDateOnly(w.closes_at)
        items.push({
          id: `window:${w.id}`,
          role: hodRole,
          verb: 'Moderate reports',
          subject: `${w.name}, ${w.submitted} submitted for review`,
          due_date: dueDate,
          urgency: urgencyFor(today, dueDate),
          href: `/teacher/hod/reporting/windows/${w.id}`,
        })
      }

      for (const si of incidents) {
        items.push({
          id: `incident:${si.id}`,
          role: hodRole,
          verb: 'Review safeguarding incident',
          subject: [si.kind, si.severity].filter(Boolean).join(' · ') || 'Open incident',
          since: si.created_at,
          urgency: 'high',
          href: hod.slug ? `/school/${hod.slug}/safeguarding/incidents` : '/teacher/safeguarding',
        })
      }

      const consentCount = consents[0]?.n || 0
      if (consentCount > 0) {
        const dueDate = isoDateOnly(consents[0].first_expiry)
        items.push({
          id: 'consents',
          role: hodRole,
          verb: 'Renew consents',
          subject: `${consentCount} parental consent${consentCount === 1 ? '' : 's'} expiring within 30 days`,
          due_date: dueDate,
          urgency: urgencyFor(today, dueDate) === 'high' ? 'high' : 'medium',
          href: '/teacher/hod/consent',
        })
      }
    }

    items.sort((a, b) => {
      const byUrgency = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]
      if (byUrgency !== 0) return byUrgency
      if (a.due_date && b.due_date && a.due_date !== b.due_date) return a.due_date < b.due_date ? -1 : 1
      if (a.due_date && !b.due_date) return -1
      if (!a.due_date && b.due_date) return 1
      return new Date(b.since || 0) - new Date(a.since || 0)
    })

    res.json({ date: today, items })
  } catch (error) {
    console.error('Teacher dashboard attention error:', error)
    res.status(500).json({ error: 'Failed to load attention items' })
  }
})

export default router
