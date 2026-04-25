import express from 'express'
import jwt from 'jsonwebtoken'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { HOD_ROLES } from '../middleware/schoolAuth.js'

const router = express.Router()

router.use(authenticateToken)

// Roles that grant HoD-level access to whole-school data
// HOD_ROLES = ['owner', 'school_admin', 'admin', 'head_of_pe']
const HOD_ROLE_LIST = HOD_ROLES.map(r => `'${r}'`).join(', ')

// Middleware: require HoD role (owner, school_admin, admin, or head_of_pe)
async function requireHoD(req, res, next) {
  try {
    // Site admins bypass
    if (req.user.is_admin) {
      const schoolResult = await pool.query('SELECT id FROM schools LIMIT 1')
      if (schoolResult.rows.length > 0) req.schoolId = schoolResult.rows[0].id
      return next()
    }

    // Check both school_role (new) and legacy role column
    const result = await pool.query(
      `SELECT sm.school_id, sm.role, sm.school_role
       FROM school_members sm
       WHERE sm.user_id = $1
         AND (sm.school_role = ANY($2) OR sm.role = ANY($2))
       ORDER BY sm.joined_at ASC
       LIMIT 1`,
      [req.user.id, HOD_ROLES]
    )

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Head of Department access required' })
    }

    req.schoolId = result.rows[0].school_id
    req.hodRole = result.rows[0].school_role || result.rows[0].role
    next()
  } catch (error) {
    console.error('HoD auth error:', error)
    res.status(500).json({ error: 'Authentication error' })
  }
}

// GET /check - Check if the current user has HoD access
router.get('/check', async (req, res) => {
  try {
    if (req.user.is_admin) {
      // Site admin: return the first school so HoD-only pages (e.g. Voice Settings)
      // can still load rather than sitting on their "no school" fallback.
      const schoolResult = await pool.query(
        `SELECT s.id, s.name, s.slug FROM school_members sm
         JOIN schools s ON sm.school_id = s.id
         WHERE sm.user_id = $1
         ORDER BY sm.joined_at ASC NULLS LAST
         LIMIT 1`,
        [req.user.id]
      )
      const fallback = schoolResult.rows[0] || (await pool.query('SELECT id, name, slug FROM schools ORDER BY created_at ASC LIMIT 1')).rows[0]
      return res.json({
        isHoD: true,
        role: 'school_admin',
        school_id: fallback?.id || null,
        school_name: fallback?.name || null,
        school_slug: fallback?.slug || null,
      })
    }

    const result = await pool.query(
      `SELECT sm.school_id, sm.role, sm.school_role, s.name AS school_name, s.slug AS school_slug
       FROM school_members sm
       JOIN schools s ON sm.school_id = s.id
       WHERE sm.user_id = $1
         AND (sm.school_role = ANY($2) OR sm.role = ANY($2))
       LIMIT 1`,
      [req.user.id, HOD_ROLES]
    )

    if (result.rows.length === 0) {
      return res.json({ isHoD: false })
    }

    const effectiveRole = result.rows[0].school_role || result.rows[0].role
    res.json({
      isHoD: true,
      role: effectiveRole,
      school_id: result.rows[0].school_id,
      school_name: result.rows[0].school_name,
      school_slug: result.rows[0].school_slug,
    })
  } catch (error) {
    console.error('HoD check error:', error)
    res.status(500).json({ error: 'Failed to check access' })
  }
})

// GET /overview - Whole-school overview stats
router.get('/overview', requireHoD, async (req, res) => {
  try {
    const schoolId = req.schoolId

    // Parallel queries for stats
    const [
      teachersResult,
      teamsResult,
      pupilsResult,
      classesResult,
      fixturesResult,
      assessmentsResult,
      sportBreakdownResult,
    ] = await Promise.all([
      // Total teachers (school members with coaching roles)
      pool.query(
        `SELECT COUNT(DISTINCT sm.user_id) FROM school_members sm WHERE sm.school_id = $1 AND sm.role IN ('owner', 'admin', 'coach')`,
        [schoolId]
      ),
      // Total teams
      pool.query(
        `SELECT COUNT(*) FROM teams WHERE school_id = $1`,
        [schoolId]
      ),
      // Total pupils (across all teams linked to school)
      pool.query(
        `SELECT COUNT(DISTINCT p.id) FROM pupils p
         JOIN teams t ON p.team_id = t.id
         WHERE t.school_id = $1 AND p.is_active = true`,
        [schoolId]
      ),
      // Total teaching groups
      pool.query(
        `SELECT COUNT(*) FROM teaching_groups tg
         JOIN school_members sm ON tg.teacher_id = sm.user_id AND sm.school_id = $1`,
        [schoolId]
      ),
      // Fixtures this term (last 3 months)
      pool.query(
        `SELECT COUNT(*) FROM matches m
         JOIN teams t ON m.team_id = t.id
         WHERE t.school_id = $1 AND COALESCE(m.date, m.match_date) > NOW() - INTERVAL '3 months'`,
        [schoolId]
      ),
      // Assessments this term
      pool.query(
        `SELECT COUNT(*) FROM pupil_assessments pa
         WHERE pa.assessed_at > NOW() - INTERVAL '3 months'
         AND pa.assessed_by IN (SELECT user_id FROM school_members WHERE school_id = $1)`,
        [schoolId]
      ),
      // Teams by sport
      pool.query(
        `SELECT sport, COUNT(*) AS team_count,
                SUM((SELECT COUNT(*) FROM pupils p WHERE p.team_id = t.id AND p.is_active = true)) AS pupil_count
         FROM teams t
         WHERE t.school_id = $1
         GROUP BY sport
         ORDER BY team_count DESC`,
        [schoolId]
      ),
    ])

    res.json({
      stats: {
        teachers: parseInt(teachersResult.rows[0].count),
        teams: parseInt(teamsResult.rows[0].count),
        pupils: parseInt(pupilsResult.rows[0].count),
        classes: parseInt(classesResult.rows[0].count),
        fixtures_this_term: parseInt(fixturesResult.rows[0].count),
        assessments_this_term: parseInt(assessmentsResult.rows[0].count),
      },
      sport_breakdown: sportBreakdownResult.rows.map(r => ({
        sport: r.sport,
        team_count: parseInt(r.team_count),
        pupil_count: parseInt(r.pupil_count || 0),
      })),
    })
  } catch (error) {
    console.error('HoD overview error:', error)
    res.status(500).json({ error: 'Failed to load overview' })
  }
})

// GET /teachers - List all teachers/staff with their sport/team assignments
router.get('/teachers', requireHoD, async (req, res) => {
  try {
    const schoolId = req.schoolId

    const result = await pool.query(
      `SELECT u.id, u.name, u.email,
              sm.id AS member_id,
              sm.school_id,
              sm.role,
              COALESCE(sm.school_role, sm.role) AS effective_role,
              sm.school_role,
              sm.joined_at,
              (SELECT json_agg(json_build_object('sport', ts.sport, 'role', ts.role))
               FROM teacher_sports ts WHERE ts.teacher_id = u.id) AS sports,
              (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'sport', t.sport, 'age_group', t.age_group))
               FROM teams t WHERE t.owner_id = u.id AND t.school_id = $1) AS teams,
              (SELECT COUNT(*)
               FROM teaching_groups tg WHERE tg.teacher_id = u.id) AS class_count
       FROM school_members sm
       JOIN users u ON sm.user_id = u.id
       WHERE sm.school_id = $1
         AND (sm.school_role NOT IN ('parent', 'read_only') OR sm.role NOT IN ('parent'))
         AND sm.status IN ('active', 'invited')
       ORDER BY
         CASE COALESCE(sm.school_role, sm.role)
           WHEN 'owner' THEN 1
           WHEN 'school_admin' THEN 2
           WHEN 'head_of_pe' THEN 3
           WHEN 'head_of_sport' THEN 4
           WHEN 'admin' THEN 2
           ELSE 5
         END, u.name ASC`,
      [schoolId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('HoD teachers error:', error)
    res.status(500).json({ error: 'Failed to load teachers' })
  }
})

// GET /teams - List all teams across the school
router.get('/teams', requireHoD, async (req, res) => {
  try {
    const schoolId = req.schoolId
    const { sport } = req.query

    let query = `
      SELECT t.*,
        u.name AS coach_name,
        (SELECT COUNT(*) FROM pupils p WHERE p.team_id = t.id AND p.is_active = true) AS pupil_count,
        (SELECT COUNT(*) FROM matches m WHERE m.team_id = t.id) AS match_count
      FROM teams t
      LEFT JOIN users u ON t.owner_id = u.id
      WHERE t.school_id = $1`
    const params = [schoolId]

    if (sport) {
      query += ` AND t.sport = $2`
      params.push(sport)
    }

    query += ` ORDER BY t.sport ASC, t.name ASC`

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('HoD teams error:', error)
    res.status(500).json({ error: 'Failed to load teams' })
  }
})

// GET /classes - List all teaching groups across the school
router.get('/classes', requireHoD, async (req, res) => {
  try {
    const schoolId = req.schoolId

    const result = await pool.query(
      `SELECT tg.*,
        u.name AS teacher_name,
        (SELECT COUNT(*) FROM teaching_group_pupils tgp WHERE tgp.teaching_group_id = tg.id) AS pupil_count,
        (SELECT COUNT(*) FROM sport_units su WHERE su.teaching_group_id = tg.id) AS unit_count,
        (SELECT json_agg(json_build_object('id', su.id, 'sport', su.sport, 'unit_name', su.unit_name, 'term', su.term))
         FROM sport_units su WHERE su.teaching_group_id = tg.id) AS units
       FROM teaching_groups tg
       JOIN users u ON tg.teacher_id = u.id
       WHERE tg.teacher_id IN (SELECT user_id FROM school_members WHERE school_id = $1)
       ORDER BY tg.year_group ASC, tg.name ASC`,
      [schoolId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('HoD classes error:', error)
    res.status(500).json({ error: 'Failed to load classes' })
  }
})

// POST /teachers/:userId/sports - Assign a teacher to a sport
router.post('/teachers/:userId/sports', requireHoD, async (req, res) => {
  try {
    const { userId } = req.params
    const { sport, role } = req.body

    if (!sport) {
      return res.status(400).json({ error: 'Sport is required' })
    }

    const result = await pool.query(
      `INSERT INTO teacher_sports (teacher_id, sport, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (teacher_id, sport) DO UPDATE SET role = EXCLUDED.role
       RETURNING *`,
      [userId, sport, role || 'coach']
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error assigning teacher to sport:', error)
    res.status(500).json({ error: 'Failed to assign teacher' })
  }
})

// DELETE /teachers/:userId/sports/:sport - Remove a teacher from a sport
router.delete('/teachers/:userId/sports/:sport', requireHoD, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM teacher_sports WHERE teacher_id = $1 AND sport = $2',
      [req.params.userId, req.params.sport]
    )
    res.json({ message: 'Teacher removed from sport' })
  } catch (error) {
    console.error('Error removing teacher from sport:', error)
    res.status(500).json({ error: 'Failed to remove teacher from sport' })
  }
})

// ── Test Personas (HoD-level) ──────────────────────────────────────

// POST /test-personas/:pupilId/impersonate - Generate a short-lived pupil portal token
router.post('/test-personas/:pupilId/impersonate', requireHoD, async (req, res) => {
  try {
    // Only allow impersonation of test personas
    const pupilResult = await pool.query(`
      SELECT p.id, p.name, p.user_id, u.is_test_persona, u.email
      FROM pupils p
      JOIN users u ON u.id = p.user_id
      WHERE p.id = $1 AND u.is_test_persona = true
    `, [req.params.pupilId])

    if (pupilResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test persona not found' })
    }

    const persona = pupilResult.rows[0]

    // Get the persona's first team membership for team context
    const teamResult = await pool.query(`
      SELECT tm.team_id FROM team_memberships tm
      WHERE tm.user_id = $1 LIMIT 1
    `, [persona.user_id])

    const teamId = teamResult.rows[0]?.team_id || null

    // Generate a short-lived token (1 hour) for the pupil portal
    const JWT_SECRET = process.env.JWT_SECRET
    const token = jwt.sign(
      { userId: persona.user_id, teamId, impersonatedBy: req.user.id },
      JWT_SECRET,
      { expiresIn: '1h' }
    )

    // Audit log the impersonation
    try {
      await pool.query(`
        INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, details, created_at)
        VALUES ($1, $2, 'impersonate_test_persona', 'pupil', $3, $4, NOW())
      `, [
        req.schoolId, req.user.id, persona.id,
        JSON.stringify({ persona_name: persona.name, persona_email: persona.email }),
      ])
    } catch (auditErr) {
      // Non-critical — don't fail the impersonation if audit logging fails
      console.error('Audit log failed:', auditErr.message)
    }

    res.json({
      token,
      user: {
        id: persona.user_id,
        name: persona.name,
        email: persona.email,
        role: 'player',
        team_id: teamId,
        pupil_id: persona.id,
        is_admin: false,
        hasFullAccess: true,
        subscriptionStatus: 'free',
      },
      expiresIn: 3600,
    })
  } catch (error) {
    console.error('Error impersonating test persona:', error)
    res.status(500).json({ error: 'Failed to impersonate' })
  }
})

// GET /test-personas - List test persona pupils with summary data
router.get('/test-personas', requireHoD, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id, p.name, p.first_name, p.last_name,
        p.year_group, p.house, p.date_of_birth,
        p.is_active, p.protected_from_reset,
        u.id AS user_id, u.email, u.is_test_persona,
        (SELECT COUNT(*) FROM observations o WHERE o.pupil_id = p.id) AS observation_count,
        (SELECT COUNT(*) FROM team_memberships tm WHERE tm.pupil_id = p.id) AS team_count,
        (SELECT COUNT(*) FROM teaching_group_pupils tgp WHERE tgp.pupil_id = p.id) AS class_count,
        (SELECT COUNT(*) FROM pupil_assessments pa WHERE pa.pupil_id = p.id) AS assessment_count,
        (SELECT string_agg(DISTINCT t.sport, ', ' ORDER BY t.sport)
         FROM team_memberships tm2 JOIN teams t ON t.id = tm2.team_id
         WHERE tm2.pupil_id = p.id) AS sports
      FROM pupils p
      JOIN users u ON u.id = p.user_id
      WHERE u.is_test_persona = true
      ORDER BY p.year_group, p.name
    `)

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching test personas:', error)
    res.status(500).json({ error: 'Failed to fetch test personas' })
  }
})

// GET /school-overview/today - Today's lessons, training sessions, and fixtures across the department
router.get('/school-overview/today', requireHoD, async (req, res) => {
  try {
    const schoolId = req.schoolId
    const today = new Date().toISOString().slice(0, 10)

    const [fixtures, training, lessons] = await Promise.all([
      pool.query(
        `SELECT m.id, m.match_date, m.match_time, m.opponent, m.location, m.home_away,
                t.name AS team_name, t.sport, t.age_group,
                u.name AS coach_name,
                (SELECT COUNT(*) FROM pupils p WHERE p.team_id = t.id AND p.is_active = true) AS pupil_count
         FROM matches m
         JOIN teams t ON t.id = m.team_id
         LEFT JOIN school_members sm ON sm.school_id = t.school_id AND sm.role IN ('owner','admin','coach')
         LEFT JOIN users u ON u.id = sm.user_id
         WHERE t.school_id = $1 AND m.match_date = $2
         ORDER BY m.match_time NULLS LAST`,
        [schoolId, today]
      ),
      pool.query(
        `SELECT ts.id, ts.date, ts.time, ts.location, ts.session_type, ts.focus_areas,
                t.name AS team_name, t.sport,
                u.name AS coach_name,
                (SELECT COUNT(*) FROM pupils p WHERE p.team_id = t.id AND p.is_active = true) AS pupil_count
         FROM training_sessions ts
         JOIN teams t ON t.id = ts.team_id
         LEFT JOIN school_members sm ON sm.school_id = t.school_id AND sm.role IN ('owner','admin','coach')
         LEFT JOIN users u ON u.id = sm.user_id
         WHERE t.school_id = $1 AND ts.date = $2
         ORDER BY ts.time NULLS LAST`,
        [schoolId, today]
      ),
      pool.query(
        `SELECT su.id, su.sport, su.unit_name,
                tg.name AS class_name, tg.year_group,
                u.name AS teacher_name,
                (SELECT COUNT(*) FROM teaching_group_pupils tgp WHERE tgp.teaching_group_id = tg.id) AS pupil_count
         FROM sport_units su
         JOIN teaching_groups tg ON tg.id = su.teaching_group_id
         JOIN users u ON u.id = tg.teacher_id
         JOIN school_members sm ON sm.user_id = tg.teacher_id AND sm.school_id = $1
         WHERE su.start_date <= $2 AND su.end_date >= $2`,
        [schoolId, today]
      ),
    ])

    res.json({
      date: today,
      fixtures: fixtures.rows,
      training: training.rows,
      lessons: lessons.rows,
    })
  } catch (error) {
    console.error('School overview today error:', error)
    res.status(500).json({ error: 'Failed to load today data' })
  }
})

// GET /school-overview/attention - Items needing HoD attention
router.get('/school-overview/attention', requireHoD, async (req, res) => {
  try {
    const schoolId = req.schoolId

    const schoolRes = await pool.query('SELECT slug FROM schools WHERE id = $1', [schoolId])
    const schoolSlug = schoolRes.rows[0]?.slug || null

    const [reportingWindows, recentObservations, safeguardingOpen] = await Promise.all([
      pool.query(
        `SELECT rw.id, rw.name, rw.status, rw.closes_at,
                (SELECT COUNT(*) FROM pupil_reports pr WHERE pr.reporting_window_id = rw.id AND pr.status = 'submitted') AS submitted,
                (SELECT COUNT(*) FROM pupil_reports pr WHERE pr.reporting_window_id = rw.id) AS total
         FROM reporting_windows rw
         WHERE rw.school_id = $1 AND rw.status IN ('open', 'draft')
         ORDER BY rw.closes_at ASC`,
        [schoolId]
      ),
      pool.query(
        `SELECT o.id, o.type, o.content, o.created_at,
                p.name AS pupil_name, p.id AS pupil_id, p.year_group,
                u.name AS observer_name
         FROM observations o
         JOIN pupils p ON p.id = o.pupil_id
         JOIN users u ON u.id = o.observer_id
         JOIN teams t ON t.id = p.team_id
         WHERE t.school_id = $1 AND o.type IN ('concern', 'welfare', 'safeguarding', 'behaviour')
           AND o.created_at > NOW() - INTERVAL '14 days'
         ORDER BY o.created_at DESC
         LIMIT 10`,
        [schoolId]
      ),
      pool.query(
        `SELECT si.id, si.incident_type, si.severity, si.status, si.created_at,
                si.description
         FROM safeguarding_incidents si
         WHERE si.school_id = $1 AND si.status NOT IN ('closed', 'resolved')
         ORDER BY si.created_at DESC
         LIMIT 5`,
        [schoolId]
      ),
    ])

    res.json({
      school_slug: schoolSlug,
      reporting_windows: reportingWindows.rows,
      flagged_observations: recentObservations.rows,
      open_safeguarding: safeguardingOpen.rows,
    })
  } catch (error) {
    console.error('School overview attention error:', error)
    res.status(500).json({ error: 'Failed to load attention data' })
  }
})

// GET /school-overview/weekly-summary - Department activity this week
router.get('/school-overview/weekly-summary', requireHoD, async (req, res) => {
  try {
    const schoolId = req.schoolId
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const ws = weekStart.toISOString().slice(0, 10)
    const we = weekEnd.toISOString().slice(0, 10)

    const [fixtures, staffActivity, participation] = await Promise.all([
      pool.query(
        `SELECT m.id, m.match_date, m.match_time, m.opponent, m.location,
                m.home_away, m.score_for, m.score_against,
                t.name AS team_name, t.sport, t.age_group
         FROM matches m
         JOIN teams t ON t.id = m.team_id
         WHERE t.school_id = $1 AND m.match_date BETWEEN $2 AND $3
         ORDER BY m.match_date, m.match_time NULLS LAST`,
        [schoolId, ws, we]
      ),
      pool.query(
        `SELECT u.id, u.name,
                (SELECT COUNT(*) FROM observations o WHERE o.observer_id = u.id AND o.created_at >= $2::date AND o.created_at < ($3::date + 1)) AS observations_logged,
                (SELECT COUNT(*) FROM pupil_reports pr WHERE pr.generated_by = u.id AND pr.updated_at >= $2::date AND pr.updated_at < ($3::date + 1)) AS reports_updated
         FROM school_members sm
         JOIN users u ON u.id = sm.user_id
         WHERE sm.school_id = $1 AND sm.role IN ('owner', 'admin', 'coach', 'teacher')
         ORDER BY u.name`,
        [schoolId, ws, we]
      ),
      pool.query(
        `SELECT COUNT(DISTINCT t.sport) AS sports_active,
                COUNT(DISTINCT p.id) AS unique_pupils
         FROM matches m
         JOIN teams t ON t.id = m.team_id
         JOIN pupils p ON p.team_id = t.id AND p.is_active = true
         WHERE t.school_id = $1 AND m.match_date BETWEEN $2 AND $3`,
        [schoolId, ws, we]
      ),
    ])

    res.json({
      week_start: ws,
      week_end: we,
      fixtures: fixtures.rows,
      staff_activity: staffActivity.rows,
      participation: participation.rows[0] || { sports_active: 0, unique_pupils: 0 },
    })
  } catch (error) {
    console.error('School overview weekly error:', error)
    res.status(500).json({ error: 'Failed to load weekly summary' })
  }
})

// GET /staff-activity-report - Per-staff breakdown over a date range
router.get('/staff-activity-report', requireHoD, async (req, res) => {
  try {
    const schoolId = req.schoolId
    const today = new Date()
    let start, end

    const { period = 'week', start: startParam, end: endParam } = req.query
    if (period === 'custom' && startParam && endParam) {
      start = startParam
      end = endParam
    } else if (period === 'month') {
      const s = new Date(today); s.setDate(1)
      const e = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      start = s.toISOString().slice(0, 10)
      end = e.toISOString().slice(0, 10)
    } else if (period === 'term') {
      const s = new Date(today); s.setDate(today.getDate() - 90)
      start = s.toISOString().slice(0, 10)
      end = today.toISOString().slice(0, 10)
    } else {
      const s = new Date(today); s.setDate(today.getDate() - today.getDay() + 1)
      const e = new Date(s); e.setDate(e.getDate() + 6)
      start = s.toISOString().slice(0, 10)
      end = e.toISOString().slice(0, 10)
    }

    const result = await pool.query(
      `SELECT
        u.id, u.name, u.email,
        COALESCE(sm.school_role, sm.role) AS role,
        (SELECT COUNT(*) FROM observations o
           WHERE o.observer_id = u.id
             AND o.created_at >= $2::date AND o.created_at < ($3::date + 1))::int AS observations_logged,
        (SELECT COUNT(*) FROM pupil_reports pr
           WHERE pr.generated_by = u.id
             AND pr.updated_at >= $2::date AND pr.updated_at < ($3::date + 1))::int AS reports_updated,
        (SELECT COUNT(*) FROM teaching_groups tg
           WHERE tg.teacher_id = u.id AND tg.school_id = $1)::int AS classes_taught,
        (SELECT COUNT(DISTINCT ts.sport) FROM teacher_sports ts
           WHERE ts.teacher_id = u.id)::int AS sports_assigned,
        (SELECT COALESCE(json_agg(DISTINCT ts.sport), '[]'::json) FROM teacher_sports ts
           WHERE ts.teacher_id = u.id) AS sports
       FROM school_members sm
       JOIN users u ON u.id = sm.user_id
       WHERE sm.school_id = $1
         AND COALESCE(sm.school_role, sm.role) IN ('owner', 'school_admin', 'admin', 'head_of_pe', 'head_of_sport', 'teacher', 'coach')
       ORDER BY u.name`,
      [schoolId, start, end]
    )

    const rows = result.rows
    const totals = rows.reduce((t, r) => ({
      observations_logged: t.observations_logged + r.observations_logged,
      reports_updated: t.reports_updated + r.reports_updated,
      active_staff: t.active_staff + (r.observations_logged > 0 || r.reports_updated > 0 ? 1 : 0),
    }), { observations_logged: 0, reports_updated: 0, active_staff: 0 })

    res.json({
      period,
      start,
      end,
      total_staff: rows.length,
      totals,
      staff: rows,
    })
  } catch (error) {
    console.error('Staff activity report error:', error)
    res.status(500).json({ error: 'Failed to load staff activity report' })
  }
})

// GET /assessments/heatmap - Cross-year assessment heatmap data
router.get('/assessments/heatmap', requireHoD, async (req, res) => {
  try {
    const schoolId = req.schoolId
    const { term } = req.query

    const termFilter = term ? 'AND su.term = $2' : ''
    const params = term ? [schoolId, term] : [schoolId]

    // Grade distribution per year_group × strand
    const result = await pool.query(`
      SELECT
        tg.year_group,
        tg.key_stage,
        COALESCE(cs.strand_name, 'General') AS strand_name,
        pa.grade,
        COUNT(*)::int AS count
      FROM pupil_assessments pa
      JOIN sport_units su ON su.id = pa.unit_id
      JOIN teaching_groups tg ON tg.id = su.teaching_group_id
      LEFT JOIN assessment_criteria ac ON ac.id = pa.criteria_id
      LEFT JOIN curriculum_strands cs ON cs.id = ac.strand_id
      WHERE tg.school_id = $1
        AND pa.grade IS NOT NULL
        ${termFilter}
      GROUP BY tg.year_group, tg.key_stage, cs.strand_name, pa.grade
      ORDER BY tg.year_group, cs.strand_name, pa.grade
    `, params)

    // Pupil coverage: how many pupils have at least one assessment per year group
    const coverage = await pool.query(`
      SELECT
        tg.year_group,
        COUNT(DISTINCT tgp.pupil_id)::int AS total_pupils,
        COUNT(DISTINCT pa.pupil_id)::int AS assessed_pupils
      FROM teaching_groups tg
      JOIN teaching_group_pupils tgp ON tgp.teaching_group_id = tg.id
      LEFT JOIN sport_units su ON su.teaching_group_id = tg.id
      LEFT JOIN pupil_assessments pa ON pa.unit_id = su.id AND pa.pupil_id = tgp.pupil_id AND pa.grade IS NOT NULL
      WHERE tg.school_id = $1
      GROUP BY tg.year_group
      ORDER BY tg.year_group
    `, [schoolId])

    // Collect unique strands and year groups
    const strands = [...new Set(result.rows.map(r => r.strand_name))].sort()
    const yearGroups = [...new Set(result.rows.map(r => r.year_group))].sort((a, b) => a - b)

    // Build heatmap cells: { [yearGroup]: { [strand]: { grades, total, average } } }
    const GRADE_NUMERIC = { Beg: 1, Dev: 2, Sec: 3, Exc: 4, D: 4, C: 5, B: 6, A: 7, 'A*': 8 }
    const cells = {}
    for (const row of result.rows) {
      if (!cells[row.year_group]) cells[row.year_group] = {}
      if (!cells[row.year_group][row.strand_name]) {
        cells[row.year_group][row.strand_name] = { grades: {}, total: 0, weighted_sum: 0, key_stage: row.key_stage }
      }
      const cell = cells[row.year_group][row.strand_name]
      cell.grades[row.grade] = row.count
      cell.total += row.count
      cell.weighted_sum += (GRADE_NUMERIC[row.grade] || 0) * row.count
    }

    // Compute averages
    for (const yg of Object.keys(cells)) {
      for (const s of Object.keys(cells[yg])) {
        const cell = cells[yg][s]
        cell.average = cell.total > 0 ? +(cell.weighted_sum / cell.total).toFixed(2) : null
        delete cell.weighted_sum
      }
    }

    res.json({
      year_groups: yearGroups,
      strands,
      cells,
      coverage: coverage.rows,
    })
  } catch (error) {
    console.error('Assessment heatmap error:', error)
    res.status(500).json({ error: 'Failed to load assessment heatmap' })
  }
})

export default router
