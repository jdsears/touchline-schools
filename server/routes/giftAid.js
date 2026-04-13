import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { loadClub, requireClubRole } from '../middleware/clubAuth.js'
import { sendNotificationEmail } from '../services/emailService.js'
import { getFrontendUrl } from '../utils/urlUtils.js'
import {
  getTaxYear,
  calculateGiftAid,
  generateReceiptPDF,
  createGiftAidRecord,
  generateReceiptNumber,
} from '../services/giftAidService.js'

const router = Router()

// ==========================================
// CLUB CHARITY SETTINGS
// ==========================================

// Get charity settings for a club
router.get('/:clubId/charity-settings', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const result = await pool.query(
      'SELECT * FROM club_charity_settings WHERE club_id = $1',
      [clubId]
    )
    res.json(result.rows[0] || null)
  } catch (error) {
    next(error)
  }
})

// Create or update charity settings
router.put('/:clubId/charity-settings', authenticateToken, loadClub, requireClubRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const {
      organisation_name, charity_number, casc_number, hmrc_reference,
      authorised_official_name, authorised_official_position,
      organisation_address, organisation_postcode, gift_aid_enabled,
    } = req.body

    if (!organisation_name) {
      return res.status(400).json({ error: 'Organisation name is required' })
    }

    const result = await pool.query(
      `INSERT INTO club_charity_settings (
        club_id, organisation_name, charity_number, casc_number, hmrc_reference,
        authorised_official_name, authorised_official_position,
        organisation_address, organisation_postcode, gift_aid_enabled
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (club_id) DO UPDATE SET
        organisation_name = EXCLUDED.organisation_name,
        charity_number = EXCLUDED.charity_number,
        casc_number = EXCLUDED.casc_number,
        hmrc_reference = EXCLUDED.hmrc_reference,
        authorised_official_name = EXCLUDED.authorised_official_name,
        authorised_official_position = EXCLUDED.authorised_official_position,
        organisation_address = EXCLUDED.organisation_address,
        organisation_postcode = EXCLUDED.organisation_postcode,
        gift_aid_enabled = EXCLUDED.gift_aid_enabled,
        updated_at = NOW()
      RETURNING *`,
      [
        clubId, organisation_name, charity_number || null, casc_number || null,
        hmrc_reference || null, authorised_official_name || null,
        authorised_official_position || null, organisation_address || null,
        organisation_postcode || null, gift_aid_enabled || false,
      ]
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// ==========================================
// PARENT GIFT AID DECLARATIONS
// ==========================================

// Get my active declaration for a club
router.get('/:clubId/declaration', authenticateToken, async (req, res, next) => {
  try {
    const { clubId } = req.params
    const userId = req.user.id

    // Check if club has Gift Aid enabled
    const settings = await pool.query(
      'SELECT gift_aid_enabled FROM club_charity_settings WHERE club_id = $1',
      [clubId]
    )

    const result = await pool.query(
      `SELECT * FROM parent_gift_aid_declarations
       WHERE user_id = $1 AND club_id = $2 AND is_active = true
       LIMIT 1`,
      [userId, clubId]
    )

    res.json({
      gift_aid_enabled: settings.rows[0]?.gift_aid_enabled || false,
      declaration: result.rows[0] || null,
    })
  } catch (error) {
    next(error)
  }
})

// Create or update Gift Aid declaration
router.post('/:clubId/declaration', authenticateToken, async (req, res, next) => {
  try {
    const { clubId } = req.params
    const userId = req.user.id
    const {
      gift_aid_opted_in, gift_aid_percentage,
      full_name, home_address, postcode,
      declaration_confirmed,
    } = req.body

    // Validation
    if (gift_aid_opted_in) {
      if (!full_name || !home_address || !postcode) {
        return res.status(400).json({ error: 'Full name, home address and postcode are required for Gift Aid declaration' })
      }
      if (!declaration_confirmed) {
        return res.status(400).json({ error: 'You must confirm the Gift Aid declaration' })
      }
      if (!gift_aid_percentage || gift_aid_percentage < 1 || gift_aid_percentage > 100) {
        return res.status(400).json({ error: 'Gift Aid percentage must be between 1 and 100' })
      }
    }

    // Capture IP server-side
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null

    // Deactivate existing declaration (preserve audit trail)
    await pool.query(
      `UPDATE parent_gift_aid_declarations
       SET is_active = false, declaration_updated_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND club_id = $2 AND is_active = true`,
      [userId, clubId]
    )

    // Drop the deferred unique constraint temporarily by inserting a new row
    const result = await pool.query(
      `INSERT INTO parent_gift_aid_declarations (
        user_id, club_id, gift_aid_opted_in, gift_aid_percentage,
        declaration_confirmed_at, declaration_ip_address,
        full_name, home_address, postcode, is_active
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
      RETURNING *`,
      [
        userId, clubId, gift_aid_opted_in || false,
        gift_aid_opted_in ? gift_aid_percentage : null,
        gift_aid_opted_in && declaration_confirmed ? new Date() : null,
        ipAddress,
        full_name || '', home_address || '', postcode || '',
      ]
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Get all my declarations across clubs
router.get('/my-declarations', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id

    const result = await pool.query(
      `SELECT d.*, c.name as club_name
       FROM parent_gift_aid_declarations d
       JOIN clubs c ON d.club_id = c.id
       WHERE d.user_id = $1 AND d.is_active = true
       ORDER BY d.created_at DESC`,
      [userId]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// ==========================================
// GIFT AID RECORDS & RECEIPTS (Parent view)
// ==========================================

// Get my Gift Aid receipts
router.get('/my-receipts', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id

    const result = await pool.query(
      `SELECT r.*, c.name as club_name
       FROM gift_aid_records r
       JOIN clubs c ON r.club_id = c.id
       WHERE r.user_id = $1
       ORDER BY r.payment_date DESC`,
      [userId]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Download a Gift Aid receipt PDF
router.get('/receipts/:receiptId/pdf', authenticateToken, async (req, res, next) => {
  try {
    const { receiptId } = req.params
    const userId = req.user.id

    // Get the record (allow club admins too)
    const record = await pool.query(
      `SELECT r.*, c.name as club_name,
              cs.organisation_name, cs.charity_number, cs.casc_number,
              cs.hmrc_reference, cs.authorised_official_name, cs.authorised_official_position,
              cs.organisation_address, cs.organisation_postcode,
              d.full_name as donor_name, d.home_address as donor_address,
              d.postcode as donor_postcode, d.declaration_confirmed_at
       FROM gift_aid_records r
       JOIN clubs c ON r.club_id = c.id
       LEFT JOIN club_charity_settings cs ON cs.club_id = r.club_id
       JOIN parent_gift_aid_declarations d ON r.declaration_id = d.id
       WHERE r.id = $1 AND (r.user_id = $2 OR EXISTS (
         SELECT 1 FROM club_members cm WHERE cm.club_id = r.club_id AND cm.user_id = $2
           AND cm.role IN ('owner', 'admin', 'treasurer')
       ))`,
      [receiptId, userId]
    )

    if (record.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' })
    }

    const r = record.rows[0]

    const pdfBuffer = await generateReceiptPDF({
      receiptNumber: r.receipt_number,
      paymentDate: r.payment_date,
      taxYear: r.tax_year,
      organisationName: r.organisation_name || r.club_name,
      charityNumber: r.charity_number,
      cascNumber: r.casc_number,
      hmrcReference: r.hmrc_reference,
      authorisedOfficialName: r.authorised_official_name,
      authorisedOfficialPosition: r.authorised_official_position,
      organisationAddress: r.organisation_address,
      organisationPostcode: r.organisation_postcode,
      donorName: r.donor_name,
      donorAddress: r.donor_address,
      donorPostcode: r.donor_postcode,
      paymentDescription: r.payment_description,
      baseAmount: r.base_amount,
      giftAidDonation: r.gift_aid_donation,
      giftAidPercentage: parseFloat(r.gift_aid_percentage),
      totalCharged: r.total_charged,
      hmrcReclaimAmount: r.hmrc_reclaim_amount,
      declarationDate: r.declaration_confirmed_at,
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${r.receipt_number}.pdf"`)
    res.send(pdfBuffer)
  } catch (error) {
    next(error)
  }
})

// ==========================================
// CLUB GIFT AID DASHBOARD (Club Intelligence)
// ==========================================

// Gift Aid summary for a club
router.get('/:clubId/dashboard', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const { tax_year } = req.query
    const targetTaxYear = tax_year || getTaxYear()

    const [summaryResult, contributingResult, paymentsResult, declarationsResult] = await Promise.all([
      // Summary totals
      pool.query(
        `SELECT
           COALESCE(SUM(gift_aid_donation), 0) as total_donations,
           COALESCE(SUM(hmrc_reclaim_amount), 0) as total_hmrc_reclaim,
           COUNT(*) FILTER (WHERE NOT is_refunded) as payment_count
         FROM gift_aid_records
         WHERE club_id = $1 AND tax_year = $2 AND NOT is_refunded`,
        [clubId, targetTaxYear]
      ),
      // Contributing parents count
      pool.query(
        'SELECT COUNT(DISTINCT user_id) as count FROM gift_aid_records WHERE club_id = $1 AND tax_year = $2 AND NOT is_refunded',
        [clubId, targetTaxYear]
      ),
      // Recent payments with Gift Aid
      pool.query(
        `SELECT r.*, u.name as parent_name
         FROM gift_aid_records r
         JOIN users u ON r.user_id = u.id
         WHERE r.club_id = $1 AND r.tax_year = $2
         ORDER BY r.payment_date DESC
         LIMIT 100`,
        [clubId, targetTaxYear]
      ),
      // Active declarations
      pool.query(
        `SELECT d.full_name, d.gift_aid_percentage, d.declaration_confirmed_at,
                d.home_address, d.postcode, u.name as user_name
         FROM parent_gift_aid_declarations d
         JOIN users u ON d.user_id = u.id
         WHERE d.club_id = $1 AND d.is_active = true AND d.gift_aid_opted_in = true
         ORDER BY d.declaration_confirmed_at DESC`,
        [clubId]
      ),
    ])

    // Available tax years for selector
    const taxYearsResult = await pool.query(
      'SELECT DISTINCT tax_year FROM gift_aid_records WHERE club_id = $1 ORDER BY tax_year DESC',
      [clubId]
    )

    res.json({
      tax_year: targetTaxYear,
      available_tax_years: taxYearsResult.rows.map(r => r.tax_year),
      summary: {
        total_donations: parseInt(summaryResult.rows[0].total_donations),
        total_hmrc_reclaim: parseInt(summaryResult.rows[0].total_hmrc_reclaim),
        contributing_parents: parseInt(contributingResult.rows[0].count),
        payment_count: parseInt(summaryResult.rows[0].payment_count),
      },
      records: paymentsResult.rows,
      declarations: declarationsResult.rows,
    })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// HMRC EXPORTS
// ==========================================

// Export 1: HMRC Charities Online CSV (aggregated per donor per tax year)
router.get('/:clubId/export/hmrc', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const { tax_year } = req.query
    const targetTaxYear = tax_year || getTaxYear()

    const result = await pool.query(
      `SELECT
         d.full_name, d.home_address, d.postcode,
         SUM(r.gift_aid_donation) as total_donation
       FROM gift_aid_records r
       JOIN parent_gift_aid_declarations d ON r.declaration_id = d.id
       WHERE r.club_id = $1 AND r.tax_year = $2 AND NOT r.is_refunded
         AND d.declaration_confirmed_at IS NOT NULL
         AND d.declaration_confirmed_at <= r.payment_date
       GROUP BY d.id, d.full_name, d.home_address, d.postcode
       ORDER BY d.full_name`,
      [clubId, targetTaxYear]
    )

    // Parse names into title/first/last
    let csv = 'Title,First Name,Last Name,House Name or Number,Postcode,Aggregated donations,Sponsored event,Amount\n'
    for (const row of result.rows) {
      const nameParts = row.full_name.trim().split(/\s+/)
      let title = ''
      let firstName = nameParts[0] || ''
      let lastName = nameParts.slice(1).join(' ') || ''

      // Check if first part is a title
      const titles = ['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'rev']
      if (nameParts.length > 2 && titles.includes(nameParts[0].toLowerCase().replace('.', ''))) {
        title = nameParts[0]
        firstName = nameParts[1]
        lastName = nameParts.slice(2).join(' ')
      }

      // Extract house number/name from address (first line)
      const addressLine1 = (row.home_address || '').split('\n')[0].trim()

      csv += [
        `"${title}"`,
        `"${firstName}"`,
        `"${lastName}"`,
        `"${addressLine1}"`,
        `"${row.postcode || ''}"`,
        'Yes', // Aggregated donations
        'No',  // Sponsored event
        (parseInt(row.total_donation) / 100).toFixed(2),
      ].join(',') + '\n'
    }

    const clubName = req.club.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="touchline-giftaid-hmrc-${clubName}-${targetTaxYear}.csv"`)
    res.send(csv)
  } catch (error) {
    next(error)
  }
})

// Export 2: Full audit trail CSV (one row per payment)
router.get('/:clubId/export/audit', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const { tax_year } = req.query
    const targetTaxYear = tax_year || getTaxYear()

    const result = await pool.query(
      `SELECT r.*,
              d.full_name as parent_name, d.home_address, d.postcode as parent_postcode,
              d.declaration_confirmed_at
       FROM gift_aid_records r
       JOIN parent_gift_aid_declarations d ON r.declaration_id = d.id
       WHERE r.club_id = $1 AND r.tax_year = $2
       ORDER BY r.payment_date DESC`,
      [clubId, targetTaxYear]
    )

    let csv = 'Receipt No.,Date,Tax Year,Parent Name,Address,Postcode,Payment Type,Description,Base Fee,GA%,GA Donation,HMRC Reclaim,Declaration Date,Payment Status\n'
    for (const row of result.rows) {
      csv += [
        `"${row.receipt_number}"`,
        new Date(row.payment_date).toLocaleDateString('en-GB'),
        row.tax_year,
        `"${row.parent_name}"`,
        `"${(row.home_address || '').replace(/\n/g, ', ')}"`,
        `"${row.parent_postcode || ''}"`,
        row.payment_type || '',
        `"${row.payment_description || ''}"`,
        (row.base_amount / 100).toFixed(2),
        parseFloat(row.gift_aid_percentage).toFixed(1),
        (row.gift_aid_donation / 100).toFixed(2),
        (row.hmrc_reclaim_amount / 100).toFixed(2),
        row.declaration_confirmed_at ? new Date(row.declaration_confirmed_at).toLocaleDateString('en-GB') : '',
        row.is_refunded ? 'Refunded' : 'Paid',
      ].join(',') + '\n'
    }

    const clubName = req.club.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="touchline-giftaid-audit-${clubName}-${targetTaxYear}.csv"`)
    res.send(csv)
  } catch (error) {
    next(error)
  }
})

export default router
