import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { loadSchool, requireSchoolRole, ADMIN_ROLES, HOD_ROLES, STAFF_ROLES } from '../middleware/schoolAuth.js'

const router = Router()

// Helper: get user's school membership
async function getUserSchool(userId) {
  const r = await pool.query(
    `SELECT sm.school_id, sm.school_role, s.*
     FROM school_members sm JOIN schools s ON sm.school_id = s.id
     WHERE sm.user_id = $1 ORDER BY sm.joined_at ASC LIMIT 1`,
    [userId]
  )
  return r.rows[0] || null
}

// Helper: check role tier
function isAdmin(role) { return ADMIN_ROLES.includes(role) }
function isHoD(role) { return HOD_ROLES.includes(role) }
function isStaff(role) { return STAFF_ROLES.includes(role) }

// ──────────────────────────────────────────
//  META: What tiers does this user see?
// ──────────────────────────────────────────
router.get('/tiers', authenticateToken, async (req, res) => {
  try {
    const membership = await getUserSchool(req.user.id)
    if (!membership) return res.json({ tiers: ['personal'] })

    const role = membership.school_role || 'teacher'
    const tiers = ['personal']
    if (isHoD(role) || isStaff(role)) tiers.unshift('department')
    if (isAdmin(role) || isHoD(role)) tiers.unshift('school')

    res.json({
      tiers,
      role,
      schoolId: membership.school_id,
      schoolName: membership.name,
      isAdmin: isAdmin(role),
      isHoD: isHoD(role),
    })
  } catch (err) {
    console.error('Settings tiers error:', err)
    res.status(500).json({ error: 'Failed to load settings access' })
  }
})

// ──────────────────────────────────────────
//  SCHOOL > Profile
// ──────────────────────────────────────────
router.get('/school/profile', authenticateToken, async (req, res) => {
  try {
    const m = await getUserSchool(req.user.id)
    if (!m) return res.status(403).json({ error: 'No school access' })
    if (!isAdmin(m.school_role) && !isHoD(m.school_role))
      return res.status(403).json({ error: 'Insufficient permissions' })

    res.json({
      id: m.school_id,
      name: m.name,
      school_type: m.school_type || 'secondary',
      urn: m.urn || '',
      contact_email: m.contact_email || '',
      contact_phone: m.contact_phone || '',
      website: m.website || '',
      address_line1: m.address_line1 || '',
      address_line2: m.address_line2 || '',
      city: m.city || '',
      county: m.county || '',
      postcode: m.postcode || '',
      head_teacher_name: m.head_teacher_name || '',
      head_teacher_email: m.head_teacher_email || '',
      safeguarding_lead_name: m.safeguarding_lead_name || '',
      safeguarding_lead_email: m.safeguarding_lead_email || '',
      dpo_name: m.dpo_name || '',
      dpo_email: m.dpo_email || '',
    })
  } catch (err) {
    console.error('School profile error:', err)
    res.status(500).json({ error: 'Failed to load school profile' })
  }
})

router.put('/school/profile', authenticateToken, async (req, res) => {
  try {
    const m = await getUserSchool(req.user.id)
    if (!m || !isAdmin(m.school_role))
      return res.status(403).json({ error: 'Only school administrators can edit the school profile' })

    const {
      school_type, urn, contact_email, contact_phone, website,
      address_line1, address_line2, city, county, postcode,
      head_teacher_name, head_teacher_email,
      safeguarding_lead_name, safeguarding_lead_email,
      dpo_name, dpo_email,
    } = req.body

    await pool.query(
      `UPDATE schools SET
        school_type = COALESCE($1, school_type),
        urn = COALESCE($2, urn),
        contact_email = COALESCE($3, contact_email),
        contact_phone = COALESCE($4, contact_phone),
        website = COALESCE($5, website),
        address_line1 = COALESCE($6, address_line1),
        address_line2 = COALESCE($7, address_line2),
        city = COALESCE($8, city),
        county = COALESCE($9, county),
        postcode = COALESCE($10, postcode),
        head_teacher_name = COALESCE($11, head_teacher_name),
        head_teacher_email = COALESCE($12, head_teacher_email),
        safeguarding_lead_name = COALESCE($13, safeguarding_lead_name),
        safeguarding_lead_email = COALESCE($14, safeguarding_lead_email),
        dpo_name = COALESCE($15, dpo_name),
        dpo_email = COALESCE($16, dpo_email),
        updated_at = NOW()
      WHERE id = $17`,
      [school_type, urn, contact_email, contact_phone, website,
       address_line1, address_line2, city, county, postcode,
       head_teacher_name, head_teacher_email,
       safeguarding_lead_name, safeguarding_lead_email,
       dpo_name, dpo_email, m.school_id]
    )

    // Audit
    try {
      await pool.query(
        `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, 'update_school_profile', 'school', $1, $3)`,
        [m.school_id, req.user.id, JSON.stringify({ fields: Object.keys(req.body) })]
      )
    } catch (_) {}

    res.json({ message: 'School profile updated' })
  } catch (err) {
    console.error('School profile update error:', err)
    res.status(500).json({ error: 'Failed to update school profile' })
  }
})

// ──────────────────────────────────────────
//  SCHOOL > Branding (read-only for school users)
// ──────────────────────────────────────────
router.get('/school/branding', authenticateToken, async (req, res) => {
  try {
    const m = await getUserSchool(req.user.id)
    if (!m) return res.status(403).json({ error: 'No school access' })

    res.json({
      logo_url: m.logo_url || null,
      primary_color: m.primary_color || '#1a365d',
      secondary_color: m.secondary_color || '#38a169',
      accent_color: m.accent_color || '#F97316',
      name: m.name,
      slug: m.slug,
    })
  } catch (err) {
    console.error('Branding fetch error:', err)
    res.status(500).json({ error: 'Failed to load branding' })
  }
})

// ──────────────────────────────────────────
//  SCHOOL > Sports Configuration
// ──────────────────────────────────────────
const ALL_SPORTS = [
  { key: 'football', label: 'Football', ngb: 'FA' },
  { key: 'rugby', label: 'Rugby', ngb: 'RFU' },
  { key: 'cricket', label: 'Cricket', ngb: 'ECB' },
  { key: 'hockey', label: 'Hockey', ngb: 'England Hockey' },
  { key: 'netball', label: 'Netball', ngb: 'England Netball' },
  { key: 'basketball', label: 'Basketball', ngb: 'Basketball England' },
  { key: 'handball', label: 'Handball', ngb: 'England Handball' },
  { key: 'badminton', label: 'Badminton', ngb: 'Badminton England' },
  { key: 'tennis', label: 'Tennis', ngb: 'LTA' },
  { key: 'table_tennis', label: 'Table Tennis', ngb: 'Table Tennis England' },
  { key: 'athletics', label: 'Athletics', ngb: 'England Athletics' },
  { key: 'gymnastics', label: 'Gymnastics', ngb: 'British Gymnastics' },
  { key: 'dance', label: 'Dance', ngb: null },
  { key: 'swimming', label: 'Swimming', ngb: 'Swim England' },
  { key: 'fitness', label: 'Fitness', ngb: null },
  { key: 'rounders', label: 'Rounders', ngb: 'Rounders England' },
  { key: 'outdoor_adventurous', label: 'Outdoor & Adventurous', ngb: null },
]

router.get('/school/sports', authenticateToken, async (req, res) => {
  try {
    const m = await getUserSchool(req.user.id)
    if (!m) return res.status(403).json({ error: 'No school access' })
    if (!isAdmin(m.school_role) && !isHoD(m.school_role))
      return res.status(403).json({ error: 'Insufficient permissions' })

    const result = await pool.query(
      `SELECT * FROM school_sports_configuration WHERE school_id = $1`,
      [m.school_id]
    )

    // If none configured, return all sports as active defaults
    if (result.rows.length === 0) {
      return res.json({
        sports: ALL_SPORTS.map(s => ({ ...s, active: true, ngb_framework_key: s.ngb })),
        allSports: ALL_SPORTS,
      })
    }

    const configured = {}
    for (const row of result.rows) configured[row.sport_key] = row

    res.json({
      sports: ALL_SPORTS.map(s => ({
        ...s,
        active: configured[s.key]?.active ?? true,
        ngb_framework_key: configured[s.key]?.ngb_framework_key || s.ngb,
      })),
      allSports: ALL_SPORTS,
    })
  } catch (err) {
    console.error('Sports config error:', err)
    res.status(500).json({ error: 'Failed to load sports configuration' })
  }
})

router.put('/school/sports', authenticateToken, async (req, res) => {
  try {
    const m = await getUserSchool(req.user.id)
    if (!m || !isAdmin(m.school_role))
      return res.status(403).json({ error: 'Only school administrators can update sports configuration' })

    const { sports } = req.body
    if (!Array.isArray(sports)) return res.status(400).json({ error: 'Sports array required' })

    for (const s of sports) {
      await pool.query(
        `INSERT INTO school_sports_configuration (school_id, sport_key, active, ngb_framework_key)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (school_id, sport_key) DO UPDATE SET active = $3, ngb_framework_key = $4`,
        [m.school_id, s.key, s.active ?? true, s.ngb_framework_key || null]
      )
    }

    try {
      await pool.query(
        `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id) VALUES ($1, $2, 'update_sports_config', 'school', $1)`,
        [m.school_id, req.user.id]
      )
    } catch (_) {}

    res.json({ message: 'Sports configuration updated' })
  } catch (err) {
    console.error('Sports config update error:', err)
    res.status(500).json({ error: 'Failed to update sports configuration' })
  }
})

// ──────────────────────────────────────────
//  SCHOOL > Academic Structure
// ──────────────────────────────────────────
router.get('/school/academic', authenticateToken, async (req, res) => {
  try {
    const m = await getUserSchool(req.user.id)
    if (!m) return res.status(403).json({ error: 'No school access' })
    if (!isAdmin(m.school_role) && !isHoD(m.school_role))
      return res.status(403).json({ error: 'Insufficient permissions' })

    const result = await pool.query(
      `SELECT * FROM school_academic_structure WHERE school_id = $1`, [m.school_id]
    )

    if (result.rows.length === 0) {
      // Default structure based on school type
      const isSecondary = (m.school_type || 'secondary') !== 'primary'
      return res.json({
        year_groups_offered: isSecondary ? [7,8,9,10,11,12,13] : [2,3,4,5,6],
        house_system: null,
        term_dates: [],
        assessment_windows: [],
        reporting_windows_config: [],
      })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error('Academic structure error:', err)
    res.status(500).json({ error: 'Failed to load academic structure' })
  }
})

router.put('/school/academic', authenticateToken, async (req, res) => {
  try {
    const m = await getUserSchool(req.user.id)
    if (!m || !isAdmin(m.school_role))
      return res.status(403).json({ error: 'Only school administrators can edit academic structure' })

    const { year_groups_offered, house_system, term_dates, assessment_windows, reporting_windows_config } = req.body

    await pool.query(
      `INSERT INTO school_academic_structure (school_id, year_groups_offered, house_system, term_dates, assessment_windows, reporting_windows_config, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (school_id) DO UPDATE SET
         year_groups_offered = COALESCE($2, school_academic_structure.year_groups_offered),
         house_system = COALESCE($3, school_academic_structure.house_system),
         term_dates = COALESCE($4, school_academic_structure.term_dates),
         assessment_windows = COALESCE($5, school_academic_structure.assessment_windows),
         reporting_windows_config = COALESCE($6, school_academic_structure.reporting_windows_config),
         updated_at = NOW()`,
      [m.school_id,
       JSON.stringify(year_groups_offered || []),
       house_system ? JSON.stringify(house_system) : null,
       JSON.stringify(term_dates || []),
       JSON.stringify(assessment_windows || []),
       JSON.stringify(reporting_windows_config || [])]
    )

    try {
      await pool.query(
        `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id) VALUES ($1, $2, 'update_academic_structure', 'school', $1)`,
        [m.school_id, req.user.id]
      )
    } catch (_) {}

    res.json({ message: 'Academic structure updated' })
  } catch (err) {
    console.error('Academic structure update error:', err)
    res.status(500).json({ error: 'Failed to update academic structure' })
  }
})

// ──────────────────────────────────────────
//  SCHOOL > Staff Directory
// ──────────────────────────────────────────
router.get('/school/staff', authenticateToken, async (req, res) => {
  try {
    const m = await getUserSchool(req.user.id)
    if (!m) return res.status(403).json({ error: 'No school access' })
    if (!isAdmin(m.school_role) && !isHoD(m.school_role))
      return res.status(403).json({ error: 'Insufficient permissions' })

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, sm.school_role, sm.status, sm.joined_at,
              (SELECT json_agg(DISTINCT ts.sport) FROM teacher_sports ts WHERE ts.teacher_id = u.id) AS sports,
              (SELECT json_agg(json_build_object('type', sq.qualification_type, 'name', sq.qualification_name, 'expiry', sq.expiry_date))
               FROM staff_qualifications sq WHERE sq.user_id = u.id AND sq.school_id = $1) AS qualifications
       FROM school_members sm
       JOIN users u ON sm.user_id = u.id
       WHERE sm.school_id = $1
       ORDER BY u.name ASC`,
      [m.school_id]
    )

    res.json({ staff: result.rows })
  } catch (err) {
    console.error('Staff directory error:', err)
    res.status(500).json({ error: 'Failed to load staff directory' })
  }
})

// ──────────────────────────────────────────
//  SCHOOL > Licence (read-only)
// ──────────────────────────────────────────
router.get('/school/licence', authenticateToken, async (req, res) => {
  try {
    const m = await getUserSchool(req.user.id)
    if (!m) return res.status(403).json({ error: 'No school access' })
    if (!isAdmin(m.school_role))
      return res.status(403).json({ error: 'Insufficient permissions' })

    const result = await pool.query(
      `SELECT * FROM school_licence WHERE school_id = $1`, [m.school_id]
    )

    if (result.rows.length === 0) {
      return res.json({
        term_start: null,
        term_end: null,
        seat_count: 0,
        sport_count: 0,
        commercial_contact_name: '',
        commercial_contact_email: 'accounts@moonbootssports.com',
        notes: '',
      })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error('Licence error:', err)
    res.status(500).json({ error: 'Failed to load licence' })
  }
})

// ──────────────────────────────────────────
//  SCHOOL > Audit Log
// ──────────────────────────────────────────
router.get('/school/audit', authenticateToken, async (req, res) => {
  try {
    const m = await getUserSchool(req.user.id)
    if (!m) return res.status(403).json({ error: 'No school access' })
    if (!isAdmin(m.school_role))
      return res.status(403).json({ error: 'Insufficient permissions' })

    const { limit: lim, offset: off, user_id, action, start_date, end_date } = req.query
    const limit = Math.min(parseInt(lim) || 50, 200)
    const offset = parseInt(off) || 0

    let query = `SELECT al.*, u.name as user_name FROM audit_log al LEFT JOIN users u ON al.user_id = u.id WHERE al.school_id = $1`
    const params = [m.school_id]
    let idx = 2

    if (user_id) { query += ` AND al.user_id = $${idx}`; params.push(user_id); idx++ }
    if (action) { query += ` AND al.action = $${idx}`; params.push(action); idx++ }
    if (start_date) { query += ` AND al.created_at >= $${idx}`; params.push(start_date); idx++ }
    if (end_date) { query += ` AND al.created_at <= $${idx}`; params.push(end_date); idx++ }

    query += ` ORDER BY al.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`
    params.push(limit, offset)

    const result = await pool.query(query, params)
    res.json({ entries: result.rows, limit, offset })
  } catch (err) {
    console.error('Audit log error:', err)
    res.status(500).json({ error: 'Failed to load audit log' })
  }
})

// ──────────────────────────────────────────
//  DEPARTMENT > Fixture Defaults
// ──────────────────────────────────────────
router.get('/department/fixture-defaults', authenticateToken, async (req, res) => {
  try {
    const m = await getUserSchool(req.user.id)
    if (!m) return res.status(403).json({ error: 'No school access' })

    const result = await pool.query(
      `SELECT * FROM fixture_defaults WHERE school_id = $1 ORDER BY sport_key, age_group`, [m.school_id]
    )
    res.json({ defaults: result.rows })
  } catch (err) {
    res.status(500).json({ error: 'Failed to load fixture defaults' })
  }
})

router.put('/department/fixture-defaults', authenticateToken, async (req, res) => {
  try {
    const m = await getUserSchool(req.user.id)
    if (!m || (!isAdmin(m.school_role) && !isHoD(m.school_role)))
      return res.status(403).json({ error: 'Only administrators or heads of department can edit fixture defaults' })

    const { sport_key, age_group, match_duration_minutes, default_home_ground_address, default_travel_arrangement, default_kit_config } = req.body

    await pool.query(
      `INSERT INTO fixture_defaults (school_id, sport_key, age_group, match_duration_minutes, default_home_ground_address, default_travel_arrangement, default_kit_config, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (school_id, sport_key, age_group) DO UPDATE SET
         match_duration_minutes = COALESCE($4, fixture_defaults.match_duration_minutes),
         default_home_ground_address = COALESCE($5, fixture_defaults.default_home_ground_address),
         default_travel_arrangement = COALESCE($6, fixture_defaults.default_travel_arrangement),
         default_kit_config = COALESCE($7, fixture_defaults.default_kit_config),
         updated_at = NOW()`,
      [m.school_id, sport_key, age_group || 'all', match_duration_minutes || null, default_home_ground_address || null, default_travel_arrangement || null, default_kit_config ? JSON.stringify(default_kit_config) : '{}']
    )

    res.json({ message: 'Fixture defaults updated' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update fixture defaults' })
  }
})

// ──────────────────────────────────────────
//  DEPARTMENT > Reporting Templates
// ──────────────────────────────────────────
router.get('/department/reporting-templates', authenticateToken, async (req, res) => {
  try {
    const m = await getUserSchool(req.user.id)
    if (!m) return res.status(403).json({ error: 'No school access' })

    const result = await pool.query(
      `SELECT * FROM reporting_templates WHERE school_id = $1 ORDER BY name`, [m.school_id]
    )
    res.json({ templates: result.rows })
  } catch (err) {
    res.status(500).json({ error: 'Failed to load reporting templates' })
  }
})

router.post('/department/reporting-templates', authenticateToken, async (req, res) => {
  try {
    const m = await getUserSchool(req.user.id)
    if (!m || (!isAdmin(m.school_role) && !isHoD(m.school_role)))
      return res.status(403).json({ error: 'Insufficient permissions' })

    const { template_type, name, structure, tone_guidance, is_default } = req.body
    const result = await pool.query(
      `INSERT INTO reporting_templates (school_id, template_type, name, structure, tone_guidance, is_default)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [m.school_id, template_type, name, JSON.stringify(structure || {}), tone_guidance || '', is_default || false]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Failed to create reporting template' })
  }
})

// ──────────────────────────────────────────
//  PERSONAL > Notifications
// ──────────────────────────────────────────
router.get('/personal/notifications', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notification_preferences WHERE user_id = $1`, [req.user.id]
    )
    if (result.rows.length === 0) {
      return res.json({
        fixture_reminders: true, assessment_deadlines: true, report_due_dates: true,
        pupil_observations: true, safeguarding_concerns: true, weekly_digest: false,
        monthly_summary: false, product_updates: false, email_enabled: true, push_enabled: false,
      })
    }
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Failed to load notification preferences' })
  }
})

router.put('/personal/notifications', authenticateToken, async (req, res) => {
  try {
    const fields = req.body
    await pool.query(
      `INSERT INTO notification_preferences (user_id, fixture_reminders, assessment_deadlines, report_due_dates, pupil_observations, safeguarding_concerns, weekly_digest, monthly_summary, product_updates, email_enabled, push_enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         fixture_reminders = $2, assessment_deadlines = $3, report_due_dates = $4,
         pupil_observations = $5, safeguarding_concerns = $6, weekly_digest = $7,
         monthly_summary = $8, product_updates = $9, email_enabled = $10, push_enabled = $11,
         updated_at = NOW()`,
      [req.user.id,
       fields.fixture_reminders ?? true, fields.assessment_deadlines ?? true,
       fields.report_due_dates ?? true, fields.pupil_observations ?? true,
       fields.safeguarding_concerns ?? true, fields.weekly_digest ?? false,
       fields.monthly_summary ?? false, fields.product_updates ?? false,
       fields.email_enabled ?? true, fields.push_enabled ?? false]
    )
    res.json({ message: 'Notification preferences updated' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification preferences' })
  }
})

// ──────────────────────────────────────────
//  PERSONAL > Accessibility
// ──────────────────────────────────────────
router.get('/personal/accessibility', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM user_accessibility WHERE user_id = $1`, [req.user.id]
    )
    if (result.rows.length === 0) {
      return res.json({ font_size: 'medium', reduced_motion: false, high_contrast: false, screen_reader_optimised: false })
    }
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Failed to load accessibility settings' })
  }
})

router.put('/personal/accessibility', authenticateToken, async (req, res) => {
  try {
    const { font_size, reduced_motion, high_contrast, screen_reader_optimised } = req.body
    await pool.query(
      `INSERT INTO user_accessibility (user_id, font_size, reduced_motion, high_contrast, screen_reader_optimised, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         font_size = $2, reduced_motion = $3, high_contrast = $4, screen_reader_optimised = $5, updated_at = NOW()`,
      [req.user.id, font_size || 'medium', reduced_motion ?? false, high_contrast ?? false, screen_reader_optimised ?? false]
    )
    res.json({ message: 'Accessibility settings updated' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update accessibility settings' })
  }
})

// ──────────────────────────────────────────
//  PERSONAL > Qualifications (staff_qualifications table)
// ──────────────────────────────────────────
router.get('/personal/qualifications', authenticateToken, async (req, res) => {
  try {
    const m = await getUserSchool(req.user.id)
    const result = await pool.query(
      `SELECT * FROM staff_qualifications WHERE user_id = $1 AND (school_id = $2 OR school_id IS NULL) ORDER BY qualification_type, issue_date DESC`,
      [req.user.id, m?.school_id || null]
    )
    res.json({ qualifications: result.rows })
  } catch (err) {
    res.status(500).json({ error: 'Failed to load qualifications' })
  }
})

router.post('/personal/qualifications', authenticateToken, async (req, res) => {
  try {
    const m = await getUserSchool(req.user.id)
    const { qualification_type, qualification_name, issue_date, expiry_date, reference_number } = req.body

    const result = await pool.query(
      `INSERT INTO staff_qualifications (user_id, school_id, qualification_type, qualification_name, issue_date, expiry_date, reference_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, m?.school_id || null, qualification_type, qualification_name, issue_date || null, expiry_date || null, reference_number || null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Failed to add qualification' })
  }
})

router.delete('/personal/qualifications/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM staff_qualifications WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]
    )
    res.json({ message: 'Qualification removed' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove qualification' })
  }
})

// ──────────────────────────────────────────
//  ADMIN > Branding (MoonBoots staff only)
// ──────────────────────────────────────────
router.put('/admin/branding/:schoolId', authenticateToken, async (req, res) => {
  try {
    // Only allow users flagged as admin or MoonBoots staff
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'MoonBoots admin access required' })
    }

    const { primary_color, secondary_color, accent_color, logo_url } = req.body
    await pool.query(
      `UPDATE schools SET
        primary_color = COALESCE($1, primary_color),
        secondary_color = COALESCE($2, secondary_color),
        accent_color = COALESCE($3, accent_color),
        logo_url = COALESCE($4, logo_url),
        updated_at = NOW()
      WHERE id = $5`,
      [primary_color, secondary_color, accent_color, logo_url, req.params.schoolId]
    )

    try {
      await pool.query(
        `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, 'update_branding', 'school', $1, $3)`,
        [req.params.schoolId, req.user.id, JSON.stringify({ primary_color, secondary_color, accent_color })]
      )
    } catch (_) {}

    res.json({ message: 'Branding updated' })
  } catch (err) {
    console.error('Admin branding update error:', err)
    res.status(500).json({ error: 'Failed to update branding' })
  }
})

export default router
