import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

async function getSchoolId(user) {
  const mem = await pool.query(
    `SELECT school_id FROM school_members WHERE user_id = $1 AND status = 'active' LIMIT 1`,
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
       JOIN school_members sm ON sm.user_id = p.user_id
       WHERE sm.school_id = $1 AND p.is_active = true`,
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
    const ct = await pool.query('SELECT expiry_period_months FROM consent_types WHERE id = $1', [consentTypeId])
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
       JOIN school_members sm ON sm.user_id = p.user_id AND sm.school_id = $1
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

export default router
