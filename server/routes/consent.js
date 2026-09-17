import { Router } from 'express'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { getUserSchoolIds, isAllowed, hasNoTenantAccess } from '../middleware/tenancy.js'
import { getFrontendUrl } from '../utils/urlUtils.js'
import { sendEmail, isEmailEnabled } from '../services/emailService.js'

const router = Router()

// A pupil belongs to a school directly (schools product) or via their team
// (older club-era rows). Consent coverage counts must include both.
const PUPIL_SCHOOL = `COALESCE(p.school_id, (SELECT t.school_id FROM teams t WHERE t.id = p.team_id))`

async function getSchoolId(user) {
  if (user.active_school_id) return user.active_school_id
  const mem = await pool.query(
    `SELECT school_id FROM school_members WHERE user_id = $1 AND status = 'active' ORDER BY joined_at ASC NULLS LAST LIMIT 1`,
    [user.id]
  )
  if (mem.rows.length) return mem.rows[0].school_id
  if (user.is_admin) {
    const fallback = await pool.query('SELECT id FROM schools ORDER BY created_at ASC LIMIT 1')
    return fallback.rows[0]?.id || null
  }
  return null
}

const DEFAULT_CONSENT_TYPES = [
  { name: 'Photo and video usage in school marketing', description: 'Permission to use photos and videos of your child in school marketing materials, website, and social media.', expiryMonths: 12 },
  { name: 'Photo and video usage in match reports', description: 'Permission to use photos and videos of your child in published match reports.', expiryMonths: 12 },
  { name: 'Match attendance (away fixtures)', description: 'General consent for your child to attend away fixtures during term time.', isPerTerm: true, expiryMonths: 4 },
  { name: 'Travel by minibus', description: 'Consent for your child to travel by school minibus to away fixtures and events.', expiryMonths: 12 },
  { name: 'Travel by parent lifts', description: 'Consent for your child to travel with other parents to away fixtures.', expiryMonths: 12 },
  { name: 'Off-site activities', description: 'General consent for your child to participate in off-site sporting activities.', expiryMonths: 12 },
  { name: 'Medical treatment in emergency', description: 'Permission for staff to seek emergency medical treatment for your child if you cannot be reached.', expiryMonths: 12 },
  { name: 'Tour participation (general)', description: 'General consent for your child to participate in sports tours.', expiryMonths: 12 },
]

router.get('/types', authenticateToken, async (req, res, next) => {
  try {
    const schoolId = await getSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })
    const result = await pool.query(
      'SELECT * FROM consent_types WHERE school_id = $1 ORDER BY display_order, name',
      [schoolId]
    )
    res.json(result.rows)
  } catch (error) { next(error) }
})

router.post('/types/seed-defaults', authenticateToken, async (req, res, next) => {
  try {
    const schoolId = await getSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })
    let count = 0
    for (const ct of DEFAULT_CONSENT_TYPES) {
      const exists = await pool.query(
        'SELECT id FROM consent_types WHERE school_id = $1 AND name = $2', [schoolId, ct.name]
      )
      if (exists.rows.length) continue
      await pool.query(
        `INSERT INTO consent_types (school_id, name, description, is_per_term, expiry_period_months, display_order)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [schoolId, ct.name, ct.description, ct.isPerTerm || false, ct.expiryMonths || 12, count]
      )
      count++
    }
    res.json({ message: `${count} consent types seeded` })
  } catch (error) { next(error) }
})

router.post('/types', authenticateToken, async (req, res, next) => {
  try {
    const schoolId = await getSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })
    const { name, description, isPerTerm, isPerFixture, expiryPeriodMonths } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })
    const result = await pool.query(
      `INSERT INTO consent_types (school_id, name, description, is_per_term, is_per_fixture, expiry_period_months)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [schoolId, name, description, isPerTerm || false, isPerFixture || false, expiryPeriodMonths || 12]
    )
    res.status(201).json(result.rows[0])
  } catch (error) { next(error) }
})

router.get('/overview', authenticateToken, async (req, res, next) => {
  try {
    const schoolId = await getSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })

    const types = await pool.query('SELECT * FROM consent_types WHERE school_id = $1 ORDER BY display_order', [schoolId])

    const summary = await pool.query(
      `SELECT ct.id AS consent_type_id, ct.name,
        COUNT(DISTINCT pc.pupil_id) FILTER (WHERE pc.status = 'granted' AND (pc.expires_at IS NULL OR pc.expires_at > NOW())) AS granted,
        COUNT(DISTINCT pc.pupil_id) FILTER (WHERE pc.status = 'refused') AS refused,
        COUNT(DISTINCT pc.pupil_id) FILTER (WHERE pc.status = 'pending') AS pending,
        COUNT(DISTINCT pc.pupil_id) FILTER (WHERE pc.status = 'granted' AND pc.expires_at IS NOT NULL AND pc.expires_at <= NOW() + INTERVAL '30 days' AND pc.expires_at > NOW()) AS expiring_soon,
        COUNT(DISTINCT pc.pupil_id) FILTER (WHERE pc.status = 'granted' AND pc.expires_at IS NOT NULL AND pc.expires_at <= NOW()) AS expired
       FROM consent_types ct
       LEFT JOIN pupil_consents pc ON pc.consent_type_id = ct.id
       WHERE ct.school_id = $1
       GROUP BY ct.id, ct.name
       ORDER BY ct.display_order`,
      [schoolId]
    )

    const totalPupils = await pool.query(
      `SELECT COUNT(DISTINCT p.id) AS count FROM pupils p
       WHERE ${PUPIL_SCHOOL} = $1 AND p.is_active = true`,
      [schoolId]
    )

    res.json({
      types: types.rows,
      summary: summary.rows,
      totalPupils: parseInt(totalPupils.rows[0]?.count || 0),
    })
  } catch (error) { next(error) }
})

router.get('/pupil/:pupilId', authenticateToken, async (req, res, next) => {
  try {
    const schoolId = await getSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })
    const result = await pool.query(
      `SELECT pc.*, ct.name AS consent_type_name, ct.description AS consent_type_description
       FROM pupil_consents pc
       JOIN consent_types ct ON ct.id = pc.consent_type_id
       WHERE pc.pupil_id = $1 AND ct.school_id = $2
       ORDER BY ct.display_order`,
      [req.params.pupilId, schoolId]
    )
    res.json(result.rows)
  } catch (error) { next(error) }
})

router.post('/grant', authenticateToken, async (req, res, next) => {
  try {
    const { pupilId, consentTypeId, parentEmail, signatureText, consentTextVersion, ipAddress } = req.body
    const schools = await getUserSchoolIds(req.user)
    if (hasNoTenantAccess(schools)) return res.status(403).json({ error: 'No school access' })
    // The consent type is school-scoped; only allow granting against your own school's types
    const ct = await pool.query('SELECT school_id, expiry_period_months FROM consent_types WHERE id = $1', [consentTypeId])
    if (!ct.rows.length) return res.status(404).json({ error: 'Consent type not found' })
    if (!isAllowed(schools, ct.rows[0].school_id)) {
      return res.status(403).json({ error: 'Consent type is not in your school' })
    }
    const months = ct.rows[0]?.expiry_period_months || 12
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + months)

    const result = await pool.query(
      `INSERT INTO pupil_consents (pupil_id, consent_type_id, status, granted_at, granted_by_parent_email,
        expires_at, parent_signature_text, consent_text_version, ip_address)
       VALUES ($1,$2,'granted',NOW(),$3,$4,$5,$6,$7)
       ON CONFLICT (pupil_id, consent_type_id) DO UPDATE SET
        status = 'granted', granted_at = NOW(), granted_by_parent_email = $3,
        expires_at = $4, parent_signature_text = $5, consent_text_version = $6,
        ip_address = $7, updated_at = NOW()
       RETURNING *`,
      [pupilId, consentTypeId, parentEmail, expiresAt, signatureText, consentTextVersion, ipAddress || req.ip]
    )
    res.json(result.rows[0])
  } catch (error) { next(error) }
})

router.get('/expiring', authenticateToken, async (req, res, next) => {
  try {
    const schoolId = await getSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })
    const { days = 30 } = req.query
    const result = await pool.query(
      `SELECT pc.*, ct.name AS consent_type_name, p.name AS pupil_name, p.year_group
       FROM pupil_consents pc
       JOIN consent_types ct ON ct.id = pc.consent_type_id
       JOIN pupils p ON p.id = pc.pupil_id
       WHERE ct.school_id = $1 AND pc.status = 'granted'
         AND pc.expires_at IS NOT NULL AND pc.expires_at <= NOW() + ($2 || ' days')::INTERVAL
       ORDER BY pc.expires_at ASC`,
      [schoolId, days]
    )
    res.json(result.rows)
  } catch (error) { next(error) }
})

router.post('/expire-overdue', authenticateToken, async (req, res, next) => {
  try {
    const schoolId = await getSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })
    const result = await pool.query(
      `UPDATE pupil_consents SET status = 'expired', updated_at = NOW()
       WHERE consent_type_id IN (SELECT id FROM consent_types WHERE school_id = $1)
         AND status = 'granted' AND expires_at IS NOT NULL AND expires_at <= NOW()
       RETURNING id`,
      [schoolId]
    )
    res.json({ expired: result.rowCount })
  } catch (error) { next(error) }
})

router.post('/bulk-reset', authenticateToken, async (req, res, next) => {
  try {
    const schoolId = await getSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })
    const result = await pool.query(
      `UPDATE pupil_consents SET status = 'expired', updated_at = NOW()
       WHERE consent_type_id IN (
         SELECT id FROM consent_types WHERE school_id = $1 AND is_per_term = false
       ) AND status = 'granted'
       RETURNING id`,
      [schoolId]
    )
    await pool.query(
      `INSERT INTO audit_log (school_id, user_id, action, entity_type, details, created_at)
       VALUES ($1, $2, 'consent_bulk_reset', 'consent', $3, NOW())`,
      [schoolId, req.user.id, JSON.stringify({ expired_count: result.rowCount })]
    )
    res.json({ expired: result.rowCount, message: `${result.rowCount} annual consents expired. Parents will need to re-consent.` })
  } catch (error) { next(error) }
})

// ==========================================
// PARENT SELF-SERVE
// ==========================================
// Staff pick pupils and consent types; each parent gets a personal link
// (no account) that shows the school's wording and records their answers
// against pupil_consents. Links expire after REQUEST_TTL_DAYS.

const REQUEST_TTL_DAYS = 30
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const publicConsentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again in a few minutes' },
})

function maskEmail(email) {
  const [user, domain] = String(email || '').split('@')
  if (!domain) return ''
  return `${user.slice(0, 2)}…@${domain}`
}

function firstName(row) {
  return row.first_name || String(row.pupil_name || row.name || '').split(' ')[0] || 'your child'
}

// Version stamp for the wording a parent agreed to, so a later edit to the
// consent type's description is distinguishable from what was accepted.
function consentTextVersion(type) {
  return crypto.createHash('sha1').update(`${type.name}\n${type.description || ''}`).digest('hex').slice(0, 12)
}

function requestLink(token) {
  return `${getFrontendUrl()}/consent/${token}`
}

async function loadRequestByToken(token) {
  const r = await pool.query(
    `SELECT cr.*, p.first_name, p.last_name, p.name AS pupil_name, p.year_group,
            s.name AS school_name, s.primary_color, s.accent_color
     FROM consent_requests cr
     JOIN pupils p ON p.id = cr.pupil_id
     JOIN schools s ON s.id = cr.school_id
     WHERE cr.token = $1`,
    [token]
  )
  return r.rows[0] || null
}

// Closed states answer 410 with enough for a friendly page.
function closedState(r) {
  if (r.status === 'completed') return { state: 'completed', completed_at: r.completed_at }
  if (r.status === 'cancelled') return { state: 'cancelled' }
  if (r.status === 'expired' || new Date(r.expires_at) < new Date()) return { state: 'expired', expires_at: r.expires_at }
  return null
}

async function emailRequest(request, { schoolName, pupilName, parentName, consentNames, message }) {
  if (!isEmailEnabled() || !EMAIL_RE.test(request.parent_email)) return false
  try {
    await sendEmail(request.parent_email, 'consentRequest', {
      schoolName, pupilName, parentName, consentNames, message,
      link: requestLink(request.token), expiresDays: REQUEST_TTL_DAYS,
    })
    await pool.query('UPDATE consent_requests SET email_sent = true WHERE id = $1', [request.id])
    return true
  } catch (err) {
    console.error('[consent] request email failed:', err.message)
    return false
  }
}

// GET /pupils - roster with parent email and consent coverage, for the request panel
router.get('/pupils', authenticateToken, async (req, res, next) => {
  try {
    const schoolId = await getSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })
    const result = await pool.query(
      `SELECT p.id, p.name, p.first_name, p.last_name, p.year_group, p.parent_email, p.parent_name,
              (SELECT COUNT(*) FROM pupil_consents pc JOIN consent_types ct ON ct.id = pc.consent_type_id
                WHERE pc.pupil_id = p.id AND ct.school_id = $1 AND pc.status = 'granted'
                  AND (pc.expires_at IS NULL OR pc.expires_at > NOW()))::int AS granted,
              (SELECT COUNT(*) FROM consent_requests cr
                WHERE cr.pupil_id = p.id AND cr.status IN ('sent', 'opened') AND cr.expires_at > NOW())::int AS open_requests
       FROM pupils p
       WHERE ${PUPIL_SCHOOL} = $1 AND p.is_active = true
       ORDER BY p.year_group NULLS LAST, p.last_name NULLS LAST, p.name`,
      [schoolId]
    )
    res.json(result.rows)
  } catch (error) { next(error) }
})

// POST /requests - create a personal link per pupil and email the parent
router.post('/requests', authenticateToken, async (req, res, next) => {
  try {
    const schoolId = await getSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })
    const { pupil_ids, consent_type_ids, message, parent_emails } = req.body || {}
    if (!Array.isArray(pupil_ids) || pupil_ids.length === 0 || pupil_ids.length > 200) {
      return res.status(400).json({ error: 'Choose between 1 and 200 pupils' })
    }
    if (!Array.isArray(consent_type_ids) || consent_type_ids.length === 0) {
      return res.status(400).json({ error: 'Choose at least one consent type' })
    }

    const types = (await pool.query(
      `SELECT id, name FROM consent_types WHERE school_id = $1 AND id = ANY($2::uuid[]) ORDER BY display_order`,
      [schoolId, consent_type_ids]
    )).rows
    if (types.length === 0) return res.status(400).json({ error: 'Those consent types are not in your school' })

    const school = (await pool.query('SELECT name FROM schools WHERE id = $1', [schoolId])).rows[0]
    const pupils = (await pool.query(
      `SELECT p.id, p.name, p.first_name, p.last_name, p.parent_email, p.parent_name
       FROM pupils p WHERE ${PUPIL_SCHOOL} = $1 AND p.id = ANY($2::uuid[])`,
      [schoolId, pupil_ids]
    )).rows

    const created = []
    const skipped = []
    const overrides = parent_emails && typeof parent_emails === 'object' ? parent_emails : {}
    const note = message ? String(message).trim().slice(0, 1000) : null

    for (const p of pupils) {
      const email = String(overrides[p.id] || p.parent_email || '').trim().toLowerCase()
      const pupilName = p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim()
      if (!EMAIL_RE.test(email)) {
        skipped.push({ pupil_id: p.id, pupil_name: pupilName, reason: 'No parent email on file' })
        continue
      }
      if (email !== (p.parent_email || '').toLowerCase()) {
        await pool.query('UPDATE pupils SET parent_email = $1 WHERE id = $2', [email, p.id])
      }
      // One live link per pupil: a new request supersedes anything still open.
      await pool.query(
        `UPDATE consent_requests SET status = 'cancelled' WHERE pupil_id = $1 AND status IN ('sent', 'opened')`,
        [p.id]
      )
      const token = crypto.randomBytes(24).toString('base64url')
      const inserted = await pool.query(
        `INSERT INTO consent_requests (school_id, pupil_id, token, parent_email, parent_name, consent_type_ids, message, sent_by, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6::uuid[], $7, $8, NOW() + ($9 || ' days')::INTERVAL)
         RETURNING *`,
        [schoolId, p.id, token, email, p.parent_name || null, types.map(t => t.id), note, req.user.id, String(REQUEST_TTL_DAYS)]
      )
      const request = inserted.rows[0]
      const emailSent = await emailRequest(request, {
        schoolName: school?.name || 'Your school', pupilName: firstName(p), parentName: p.parent_name,
        consentNames: types.map(t => t.name), message: note,
      })
      created.push({ request_id: request.id, pupil_id: p.id, pupil_name: pupilName, parent_email: email, link: requestLink(token), email_sent: emailSent, expires_at: request.expires_at })
    }

    for (const id of pupil_ids) {
      if (!pupils.some(p => p.id === id)) skipped.push({ pupil_id: id, pupil_name: null, reason: 'Not a pupil at your school' })
    }

    await pool.query(
      `INSERT INTO audit_log (school_id, user_id, action, entity_type, details, created_at)
       VALUES ($1, $2, 'consent_requests_sent', 'consent', $3, NOW())`,
      [schoolId, req.user.id, JSON.stringify({ created: created.length, skipped: skipped.length, consent_types: types.map(t => t.name) })]
    ).catch(() => {})

    res.status(201).json({ created, skipped, email_enabled: isEmailEnabled() })
  } catch (error) { next(error) }
})

// GET /requests - recent requests for the school, with copyable links
router.get('/requests', authenticateToken, async (req, res, next) => {
  try {
    const schoolId = await getSchoolId(req.user)
    if (!schoolId) return res.status(403).json({ error: 'No school access' })
    const result = await pool.query(
      `SELECT cr.id, cr.pupil_id, cr.parent_email, cr.parent_name, cr.status, cr.email_sent, cr.sent_at, cr.opened_at,
              cr.completed_at, cr.expires_at, cr.responder_name, cr.token, cr.consent_type_ids,
              p.name AS pupil_name, p.year_group, u.name AS sent_by_name
       FROM consent_requests cr
       JOIN pupils p ON p.id = cr.pupil_id
       LEFT JOIN users u ON u.id = cr.sent_by
       WHERE cr.school_id = $1
       ORDER BY cr.sent_at DESC
       LIMIT 200`,
      [schoolId]
    )
    res.json(result.rows.map(({ token, ...row }) => ({ ...row, link: requestLink(token), type_count: (row.consent_type_ids || []).length })))
  } catch (error) { next(error) }
})

async function loadOwnRequest(req, res) {
  const schoolId = await getSchoolId(req.user)
  if (!schoolId) { res.status(403).json({ error: 'No school access' }); return null }
  const r = await pool.query(`SELECT * FROM consent_requests WHERE id = $1 AND school_id = $2`, [req.params.id, schoolId])
  if (!r.rows[0]) { res.status(404).json({ error: 'Request not found' }); return null }
  return { schoolId, request: r.rows[0] }
}

// POST /requests/:id/resend - fresh expiry, email again
router.post('/requests/:id/resend', authenticateToken, async (req, res, next) => {
  try {
    const own = await loadOwnRequest(req, res)
    if (!own) return
    const { schoolId, request } = own
    if (request.status === 'completed') return res.status(409).json({ error: 'This request has already been completed' })
    const updated = (await pool.query(
      `UPDATE consent_requests SET status = 'sent', expires_at = NOW() + ($2 || ' days')::INTERVAL, sent_at = NOW(), sent_by = $3
       WHERE id = $1 RETURNING *`,
      [request.id, String(REQUEST_TTL_DAYS), req.user.id]
    )).rows[0]
    const [school, pupil, types] = await Promise.all([
      pool.query('SELECT name FROM schools WHERE id = $1', [schoolId]).then(r => r.rows[0]),
      pool.query('SELECT name, first_name, parent_name FROM pupils WHERE id = $1', [updated.pupil_id]).then(r => r.rows[0]),
      pool.query('SELECT name FROM consent_types WHERE id = ANY($1::uuid[]) ORDER BY display_order', [updated.consent_type_ids]).then(r => r.rows),
    ])
    const emailSent = await emailRequest(updated, {
      schoolName: school?.name, pupilName: firstName(pupil || {}), parentName: pupil?.parent_name,
      consentNames: types.map(t => t.name), message: updated.message,
    })
    res.json({ link: requestLink(updated.token), email_sent: emailSent, expires_at: updated.expires_at, status: updated.status })
  } catch (error) { next(error) }
})

// POST /requests/:id/cancel
router.post('/requests/:id/cancel', authenticateToken, async (req, res, next) => {
  try {
    const own = await loadOwnRequest(req, res)
    if (!own) return
    if (own.request.status === 'completed') return res.status(409).json({ error: 'This request has already been completed' })
    await pool.query(`UPDATE consent_requests SET status = 'cancelled' WHERE id = $1`, [own.request.id])
    res.json({ ok: true })
  } catch (error) { next(error) }
})

// ── Public (no account) ─────────────────────────────────────────────

// GET /public/:token - what the parent sees
router.get('/public/:token', publicConsentLimiter, async (req, res, next) => {
  try {
    const r = await loadRequestByToken(req.params.token)
    if (!r) return res.status(404).json({ error: 'This consent link is not valid.' })
    const closed = closedState(r)
    if (closed) {
      if (closed.state === 'expired' && r.status !== 'expired') {
        await pool.query(`UPDATE consent_requests SET status = 'expired' WHERE id = $1`, [r.id])
      }
      return res.status(410).json({ ...closed, school_name: r.school_name, pupil_first_name: firstName(r) })
    }
    if (r.status === 'sent') {
      await pool.query(`UPDATE consent_requests SET status = 'opened', opened_at = NOW() WHERE id = $1`, [r.id])
    }
    const items = (await pool.query(
      `SELECT ct.id, ct.name, ct.description, ct.expiry_period_months, ct.is_per_term,
              pc.status AS current_status, pc.expires_at AS current_expires_at
       FROM consent_types ct
       LEFT JOIN pupil_consents pc ON pc.consent_type_id = ct.id AND pc.pupil_id = $2
       WHERE ct.id = ANY($1::uuid[])
       ORDER BY ct.display_order, ct.name`,
      [r.consent_type_ids, r.pupil_id]
    )).rows
    res.json({
      state: 'open',
      school: { name: r.school_name, primary_color: r.primary_color, accent_color: r.accent_color },
      pupil: { first_name: firstName(r), year_group: r.year_group },
      parent_email_masked: maskEmail(r.parent_email),
      parent_name: r.parent_name,
      message: r.message,
      expires_at: r.expires_at,
      items,
    })
  } catch (error) { next(error) }
})

// POST /public/:token - record the parent's answers
router.post('/public/:token', publicConsentLimiter, async (req, res, next) => {
  try {
    const r = await loadRequestByToken(req.params.token)
    if (!r) return res.status(404).json({ error: 'This consent link is not valid.' })
    const closed = closedState(r)
    if (closed) return res.status(410).json({ ...closed, school_name: r.school_name, pupil_first_name: firstName(r) })

    const { decisions, responder_name, confirmed } = req.body || {}
    const name = String(responder_name || '').trim()
    if (name.length < 2 || name.length > 120) return res.status(400).json({ error: 'Please enter your full name' })
    if (confirmed !== true) return res.status(400).json({ error: 'Please confirm you are the parent or carer' })

    const types = (await pool.query(
      `SELECT id, name, description, expiry_period_months FROM consent_types WHERE id = ANY($1::uuid[])`,
      [r.consent_type_ids]
    )).rows
    for (const t of types) {
      if (!['granted', 'refused'].includes(decisions?.[t.id])) {
        return res.status(400).json({ error: `Please answer "${t.name}"` })
      }
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
    let granted = 0, refused = 0
    for (const t of types) {
      const decision = decisions[t.id]
      const version = consentTextVersion(t)
      if (decision === 'granted') {
        const expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + (t.expiry_period_months || 12))
        await pool.query(
          `INSERT INTO pupil_consents (pupil_id, consent_type_id, status, granted_at, granted_by_parent_email, expires_at,
                                       parent_signature_text, consent_text_version, ip_address, consent_request_id, responded_at)
           VALUES ($1, $2, 'granted', NOW(), $3, $4, $5, $6, $7, $8, NOW())
           ON CONFLICT (pupil_id, consent_type_id) DO UPDATE SET
             status = 'granted', granted_at = NOW(), granted_by_parent_email = $3, expires_at = $4,
             parent_signature_text = $5, consent_text_version = $6, ip_address = $7,
             consent_request_id = $8, responded_at = NOW(), updated_at = NOW()`,
          [r.pupil_id, t.id, r.parent_email, expiresAt, name, version, ip, r.id]
        )
        granted++
      } else {
        await pool.query(
          `INSERT INTO pupil_consents (pupil_id, consent_type_id, status, granted_at, granted_by_parent_email, expires_at,
                                       parent_signature_text, consent_text_version, ip_address, consent_request_id, responded_at)
           VALUES ($1, $2, 'refused', NULL, $3, NULL, $4, $5, $6, $7, NOW())
           ON CONFLICT (pupil_id, consent_type_id) DO UPDATE SET
             status = 'refused', granted_at = NULL, granted_by_parent_email = $3, expires_at = NULL,
             parent_signature_text = $4, consent_text_version = $5, ip_address = $6,
             consent_request_id = $7, responded_at = NOW(), updated_at = NOW()`,
          [r.pupil_id, t.id, r.parent_email, name, version, ip, r.id]
        )
        refused++
      }
    }

    await pool.query(
      `UPDATE consent_requests SET status = 'completed', completed_at = NOW(), responder_name = $2, responder_ip = $3 WHERE id = $1`,
      [r.id, name, ip]
    )
    await pool.query(
      `INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, details, created_at)
       VALUES ($1, $2, 'consent_self_serve_completed', 'pupil', $3, $4, NOW())`,
      [r.school_id, r.sent_by, r.pupil_id, JSON.stringify({ request_id: r.id, responder: 'parent', responder_name: name, granted, refused })]
    ).catch(() => {})

    res.json({ ok: true, granted, refused, pupil_first_name: firstName(r), school_name: r.school_name })
  } catch (error) { next(error) }
})

export default router
