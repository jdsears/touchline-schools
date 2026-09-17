import express from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { v4 as uuidv4 } from 'uuid'
import { windowReportsPdf, pdfFilename } from '../services/reportPdf.js'

const router = express.Router()
router.use(authenticateToken)

// Load a reporting window with its school, refusing other schools' windows.
async function loadWindowForUser(req, windowId) {
  const r = await pool.query(
    `SELECT rw.*, s.name AS school_name, s.primary_color, s.accent_color
     FROM reporting_windows rw JOIN schools s ON s.id = rw.school_id WHERE rw.id = $1`,
    [windowId]
  )
  const window = r.rows[0]
  if (!window) return { error: 404 }
  if (!req.user.is_admin) {
    const schoolId = await getUserSchoolId(req.user)
    if (!schoolId || schoolId !== window.school_id) return { error: 403 }
  }
  return { window }
}

const REPORT_ROWS_SQL = `
  SELECT pr.*, p.name, p.first_name, p.last_name, p.year_group, p.house,
         su.sport AS unit_sport, su.unit_name,
         u.name AS teacher_name,
         COALESCE(tg.name, tg2.name) AS class_name
  FROM pupil_reports pr
  JOIN pupils p ON pr.pupil_id = p.id
  LEFT JOIN sport_units su ON pr.unit_id = su.id
  LEFT JOIN users u ON u.id = COALESCE(pr.teacher_id, pr.generated_by)
  LEFT JOIN teaching_groups tg ON tg.id = pr.teaching_group_id
  LEFT JOIN teaching_groups tg2 ON tg2.id = su.teaching_group_id`

// Helper to get the user's school_id — checks school_members first, then
// falls back to teaching_groups (covers teachers not yet fully onboarded).
// Site admins (is_admin = true) resolve to the first school so demo/admin
// views behave the same way as the HoD School Overview dashboard.
async function getUserSchoolId(user) {
  const userId = typeof user === 'object' ? user.id : user
  const isAdmin = typeof user === 'object' ? user.is_admin : false
  if (typeof user === 'object' && user.active_school_id) return user.active_school_id

  const direct = await pool.query(
    `SELECT school_id FROM school_members WHERE user_id = $1 ORDER BY joined_at DESC NULLS LAST LIMIT 1`,
    [userId]
  )
  if (direct.rows[0]?.school_id) return direct.rows[0].school_id

  const via = await pool.query(
    `SELECT school_id FROM teaching_groups WHERE teacher_id = $1 LIMIT 1`,
    [userId]
  )
  if (via.rows[0]?.school_id) return via.rows[0].school_id

  if (isAdmin) {
    const fallback = await pool.query('SELECT id FROM schools ORDER BY created_at ASC LIMIT 1')
    return fallback.rows[0]?.id || null
  }

  return null
}

// ==========================================
// REPORTING WINDOWS (HoD manages these)
// ==========================================

// GET /windows - List reporting windows for the school
router.get('/windows', async (req, res) => {
  try {
    const schoolId = await getUserSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })

    const result = await pool.query(
      `SELECT rw.*,
        (SELECT COUNT(*) FROM pupil_reports pr WHERE pr.reporting_window_id = rw.id) AS report_count,
        (SELECT COUNT(*) FROM pupil_reports pr WHERE pr.reporting_window_id = rw.id AND pr.status = 'submitted') AS submitted_count,
        (SELECT COUNT(*) FROM pupil_reports pr WHERE pr.reporting_window_id = rw.id AND pr.status = 'published') AS published_count
       FROM reporting_windows rw
       WHERE rw.school_id = $1
       ORDER BY rw.created_at DESC`,
      [schoolId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error listing reporting windows:', error)
    res.status(500).json({ error: 'Failed to load reporting windows' })
  }
})

// POST /windows - Create a reporting window
router.post('/windows', async (req, res) => {
  try {
    const schoolId = await getUserSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })

    const { name, academic_year, term, opens_at, closes_at, year_groups } = req.body

    if (!name || !academic_year) {
      return res.status(400).json({ error: 'Name and academic year are required' })
    }

    const result = await pool.query(
      `INSERT INTO reporting_windows (school_id, name, academic_year, term, opens_at, closes_at, year_groups, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')
       RETURNING *`,
      [schoolId, name, academic_year, term || null, opens_at || null, closes_at || null, year_groups || null]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating reporting window:', error)
    res.status(500).json({ error: 'Failed to create reporting window' })
  }
})

// PUT /windows/:id - Update a reporting window (change status, dates, etc.)
router.put('/windows/:id', async (req, res) => {
  try {
    const { name, status, opens_at, closes_at, year_groups } = req.body

    const result = await pool.query(
      `UPDATE reporting_windows SET
        name = COALESCE($1, name),
        status = COALESCE($2, status),
        opens_at = COALESCE($3, opens_at),
        closes_at = COALESCE($4, closes_at),
        year_groups = COALESCE($5, year_groups)
       WHERE id = $6
       RETURNING *`,
      [name, status, opens_at, closes_at, year_groups, req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reporting window not found' })
    }

    // Audit log for consequential status changes (publish / close)
    if (status === 'published' || status === 'closed') {
      const w = result.rows[0]
      const countRes = await pool.query(
        `SELECT COUNT(*) FROM pupil_reports WHERE reporting_window_id = $1 AND status = 'submitted'`,
        [w.id]
      )
      await pool.query(
        `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, metadata, created_at)
         VALUES ($1, $2, $3, 'reporting_window', $4, $5, NOW())`,
        [
          w.school_id, req.user.id,
          status === 'published' ? 'window_published' : 'window_closed',
          w.id,
          JSON.stringify({ window_name: w.name, report_count: parseInt(countRes.rows[0].count), status }),
        ]
      ).catch(() => {}) // audit failures are non-fatal

    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating reporting window:', error)
    res.status(500).json({ error: 'Failed to update reporting window' })
  }
})

// ==========================================
// PUPIL REPORTS (teachers write these)
// ==========================================

// GET /windows/:windowId/reports - Get all reports for a reporting window
router.get('/windows/:windowId/reports', async (req, res) => {
  try {
    const { windowId } = req.params
    const loaded = await loadWindowForUser(req, windowId)
    if (loaded.error) return res.status(loaded.error).json({ error: loaded.error === 404 ? 'Reporting window not found' : 'Access denied' })

    const result = await pool.query(
      `${REPORT_ROWS_SQL}
       WHERE pr.reporting_window_id = $1
       ORDER BY p.year_group ASC, p.last_name ASC, p.first_name ASC`,
      [windowId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error loading reports:', error)
    res.status(500).json({ error: 'Failed to load reports' })
  }
})

// GET /windows/:windowId/pdf — every report in the window as one PDF
// (cover + contents, one page per report). ?class_name= and ?status=
// narrow it to what the list on screen is showing.
router.get('/windows/:windowId/pdf', async (req, res) => {
  try {
    const { windowId } = req.params
    const loaded = await loadWindowForUser(req, windowId)
    if (loaded.error) return res.status(loaded.error).json({ error: loaded.error === 404 ? 'Reporting window not found' : 'Access denied' })
    const { window } = loaded
    const filters = {
      class_name: req.query.class_name ? String(req.query.class_name) : null,
      status: ['draft', 'submitted', 'published'].includes(req.query.status) ? req.query.status : null,
    }
    const params = [windowId]
    let where = 'WHERE pr.reporting_window_id = $1'
    if (filters.class_name) { params.push(filters.class_name); where += ` AND COALESCE(tg.name, tg2.name) = $${params.length}` }
    if (filters.status) { params.push(filters.status); where += ` AND pr.status = $${params.length}` }
    const result = await pool.query(`${REPORT_ROWS_SQL} ${where} ORDER BY p.year_group ASC, p.last_name ASC, p.first_name ASC`, params)

    const pdf = await windowReportsPdf({
      school: { name: window.school_name, primary_color: window.primary_color, accent_color: window.accent_color },
      window, reports: result.rows, filters, generatedBy: req.user.name || null,
    })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename(window.name, filters.class_name, 'reports')}"`)
    res.send(pdf)
  } catch (error) {
    console.error('Error building window PDF:', error)
    res.status(500).json({ error: 'Failed to build the PDF' })
  }
})

// GET /reports/:id/pdf — a single report as a PDF
router.get('/reports/:id/pdf', async (req, res) => {
  try {
    const result = await pool.query(`${REPORT_ROWS_SQL} WHERE pr.id = $1`, [req.params.id])
    const report = result.rows[0]
    if (!report) return res.status(404).json({ error: 'Report not found' })
    const loaded = await loadWindowForUser(req, report.reporting_window_id)
    if (loaded.error) return res.status(loaded.error).json({ error: loaded.error === 404 ? 'Reporting window not found' : 'Access denied' })
    const { window } = loaded
    const pdf = await windowReportsPdf({
      school: { name: window.school_name, primary_color: window.primary_color, accent_color: window.accent_color },
      window, reports: [report], generatedBy: req.user.name || null,
    })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename(report.name || `${report.first_name}-${report.last_name}`, window.name)}"`)
    res.send(pdf)
  } catch (error) {
    console.error('Error building report PDF:', error)
    res.status(500).json({ error: 'Failed to build the PDF' })
  }
})

// GET /my-reports - Get reports the current teacher needs to write
router.get('/my-reports', async (req, res) => {
  try {
    const schoolId = await getUserSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })

    // Find open reporting windows
    const windowsResult = await pool.query(
      `SELECT * FROM reporting_windows WHERE school_id = $1 AND status = 'open' ORDER BY closes_at ASC`,
      [schoolId]
    )

    if (windowsResult.rows.length === 0) {
      return res.json({ windows: [], pupils_to_report: [], existing_reports: {} })
    }

    // Get pupils in the teacher's teaching groups (scoped to this school)
    const pupilsResult = await pool.query(
      `SELECT DISTINCT p.id, p.first_name, p.last_name, p.year_group,
              tg.id AS teaching_group_id,
              tg.name AS class_name,
              (SELECT json_agg(json_build_object('id', su.id, 'sport', su.sport, 'unit_name', su.unit_name))
               FROM sport_units su WHERE su.teaching_group_id = tg.id) AS units
       FROM teaching_group_pupils tgp
       JOIN pupils p ON tgp.pupil_id = p.id
       JOIN teaching_groups tg ON tgp.teaching_group_id = tg.id
       WHERE tg.teacher_id = $1 AND tg.school_id = $2
       ORDER BY p.year_group ASC, p.last_name ASC`,
      [req.user.id, schoolId]
    )

    // Get existing reports for any window (by anyone) for these pupils in open windows
    const windowIds = windowsResult.rows.map(w => w.id)
    const pupilIds = pupilsResult.rows.map(p => p.id)

    const existingResult = pupilIds.length > 0 ? await pool.query(
      `SELECT pr.id, pr.pupil_id, pr.reporting_window_id, pr.status,
              pr.attainment_grade, pr.effort_grade,
              pr.teacher_comment, pr.generated_by
       FROM pupil_reports pr
       WHERE pr.reporting_window_id = ANY($1)
         AND pr.pupil_id = ANY($2)`,
      [windowIds, pupilIds]
    ) : { rows: [] }

    const existingMap = {}
    for (const r of existingResult.rows) {
      existingMap[`${r.pupil_id}_${r.reporting_window_id}`] = r
    }

    res.json({
      windows: windowsResult.rows,
      pupils_to_report: pupilsResult.rows,
      existing_reports: existingMap,
    })
  } catch (error) {
    console.error('Error loading my reports:', error)
    res.status(500).json({ error: 'Failed to load reports' })
  }
})

// POST /reports - Create or update a pupil report
router.post('/reports', async (req, res) => {
  try {
    const { pupil_id, reporting_window_id, unit_id, sport, attainment_grade, effort_grade, teacher_comment, status } = req.body

    if (!pupil_id || !reporting_window_id) {
      return res.status(400).json({ error: 'pupil_id and reporting_window_id are required' })
    }

    // Check if report already exists
    const existing = await pool.query(
      `SELECT id FROM pupil_reports WHERE pupil_id = $1 AND reporting_window_id = $2 AND generated_by = $3`,
      [pupil_id, reporting_window_id, req.user.id]
    )

    let result
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE pupil_reports SET
          unit_id = COALESCE($1, unit_id),
          sport = COALESCE($2, sport),
          attainment_grade = COALESCE($3, attainment_grade),
          effort_grade = COALESCE($4, effort_grade),
          teacher_comment = COALESCE($5, teacher_comment),
          status = COALESCE($6, status),
          updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [unit_id, sport, attainment_grade, effort_grade, teacher_comment, status || 'draft', existing.rows[0].id]
      )
    } else {
      result = await pool.query(
        `INSERT INTO pupil_reports (pupil_id, reporting_window_id, unit_id, sport, attainment_grade, effort_grade, teacher_comment, generated_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [pupil_id, reporting_window_id, unit_id || null, sport || null, attainment_grade || null, effort_grade || null, teacher_comment || null, req.user.id, status || 'draft']
      )
    }

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error saving report:', error)
    res.status(500).json({ error: 'Failed to save report' })
  }
})

// GET /reports/:id - Get a single pupil report with pupil and unit details
router.get('/reports/:id', async (req, res) => {
  try {
    const result = await pool.query(`${REPORT_ROWS_SQL} WHERE pr.id = $1`, [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' })
    const loaded = await loadWindowForUser(req, result.rows[0].reporting_window_id)
    if (loaded.error) return res.status(loaded.error).json({ error: loaded.error === 404 ? 'Reporting window not found' : 'Access denied' })
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error loading report:', error)
    res.status(500).json({ error: 'Failed to load report' })
  }
})

// POST /reports/ai-draft - Generate an AI draft comment for a pupil
router.post('/reports/ai-draft', async (req, res) => {
  try {
    const { pupil_id, sport, unit_name, attainment_grade, effort_grade } = req.body

    // Get pupil info
    const pupilResult = await pool.query(
      'SELECT first_name, last_name, year_group FROM pupils WHERE id = $1',
      [pupil_id]
    )

    if (pupilResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pupil not found' })
    }

    const pupil = pupilResult.rows[0]

    // Get recent assessments for this pupil in this sport
    const assessmentsResult = await pool.query(
      `SELECT pa.grade, pa.teacher_notes, su.unit_name, su.curriculum_area
       FROM pupil_assessments pa
       JOIN sport_units su ON pa.unit_id = su.id
       WHERE pa.pupil_id = $1 AND su.sport = $2
       ORDER BY pa.assessed_at DESC
       LIMIT 10`,
      [pupil_id, sport || 'football']
    )

    // Build a simple prompt for the AI draft
    const assessmentContext = assessmentsResult.rows.length > 0
      ? assessmentsResult.rows.map(a => `${a.unit_name}: ${a.grade}${a.teacher_notes ? ` (${a.teacher_notes})` : ''}`).join('; ')
      : 'No formal assessments recorded yet'

    const draft = `${pupil.first_name} has ${
      attainment_grade === 'excelling' ? 'demonstrated excellent ability' :
      attainment_grade === 'secure' ? 'shown a solid understanding' :
      attainment_grade === 'developing' ? 'made good progress' :
      'been working to develop skills'
    } in ${unit_name || sport || 'PE'} this term. ${
      effort_grade === 'excelling' || effort_grade === 'secure'
        ? `${pupil.first_name} consistently shows strong effort and a positive attitude in lessons.`
        : `${pupil.first_name} is encouraged to continue building confidence and putting full effort into activities.`
    } ${
      assessmentsResult.rows.length > 0
        ? `Assessment data shows: ${assessmentContext}.`
        : ''
    }`

    res.json({ draft: draft.trim() })
  } catch (error) {
    console.error('Error generating AI draft:', error)
    res.status(500).json({ error: 'Failed to generate draft' })
  }
})

export default router
