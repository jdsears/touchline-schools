import PDFDocument from 'pdfkit'
import pool from '../config/database.js'

/**
 * Get the UK tax year string for a given date.
 * Tax year runs 6 April to 5 April.
 * e.g. 2026-03-28 => "2025-26", 2026-04-10 => "2026-27"
 */
export function getTaxYear(date = new Date()) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = d.getMonth() + 1 // 1-indexed
  const day = d.getDate()

  // Before 6 April => previous tax year
  if (month < 4 || (month === 4 && day < 6)) {
    return `${year - 1}-${String(year).slice(2)}`
  }
  return `${year}-${String(year + 1).slice(2)}`
}

/**
 * Generate the next receipt number for a club.
 * Format: GA-[CLUBCODE]-[TAXYEAR_SHORT]-[SEQUENCE]
 * e.g. GA-MYFC-2526-0042
 */
export async function generateReceiptNumber(clubId, taxYear) {
  // Get club code (first 4 chars of name, uppercased, alphanumeric only)
  const clubResult = await pool.query('SELECT name FROM clubs WHERE id = $1', [clubId])
  const clubName = clubResult.rows[0]?.name || 'CLUB'
  const clubCode = clubName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) || 'CLUB'

  // Tax year short: "2025-26" => "2526"
  const taxYearShort = taxYear.replace('-', '').slice(2)

  // Atomic increment of receipt sequence
  const seqResult = await pool.query(
    `INSERT INTO gift_aid_receipt_sequences (club_id, next_val)
     VALUES ($1, 2)
     ON CONFLICT (club_id) DO UPDATE SET next_val = gift_aid_receipt_sequences.next_val + 1
     RETURNING next_val - 1 as current_val`,
    [clubId]
  )

  const seq = seqResult.rows[0].current_val
  const paddedSeq = String(seq).padStart(4, '0')

  return `GA-${clubCode}-${taxYearShort}-${paddedSeq}`
}

/**
 * Calculate Gift Aid amounts from base fee and percentage.
 * All amounts in pence (integers).
 */
export function calculateGiftAid(baseFeeInPence, giftAidPercentage) {
  const donationInPence = Math.round(baseFeeInPence * (giftAidPercentage / 100))
  const totalChargeInPence = baseFeeInPence + donationInPence
  const hmrcReclaimInPence = Math.round(donationInPence * 0.25)

  return {
    baseFeeInPence,
    donationInPence,
    totalChargeInPence,
    hmrcReclaimInPence,
    giftAidPercentage,
  }
}

/**
 * Generate a Gift Aid receipt PDF and return it as a Buffer.
 */
export function generateReceiptPDF(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('GIFT AID DONATION RECEIPT', { align: 'center' })
    doc.moveDown(1.5)

    // Receipt details
    doc.fontSize(10).font('Helvetica')
    const leftCol = 50
    const rightCol = 300

    function addRow(label, value) {
      if (!value) return
      doc.font('Helvetica-Bold').text(label, leftCol, doc.y, { continued: true, width: 200 })
      doc.font('Helvetica').text(value, rightCol, doc.y, { width: 250 })
      doc.moveDown(0.3)
    }

    addRow('Receipt Number:', data.receiptNumber)
    addRow('Date:', new Date(data.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))
    addRow('Tax Year:', data.taxYear)

    doc.moveDown(0.5)
    doc.moveTo(leftCol, doc.y).lineTo(545, doc.y).stroke('#cccccc')
    doc.moveDown(0.5)

    // Organisation details
    doc.fontSize(12).font('Helvetica-Bold').text('Organisation')
    doc.moveDown(0.3)
    doc.fontSize(10).font('Helvetica')
    addRow('Name:', data.organisationName)
    if (data.charityNumber) addRow('Charity Number:', data.charityNumber)
    if (data.cascNumber) addRow('CASC Number:', data.cascNumber)
    if (data.hmrcReference) addRow('HMRC Reference:', data.hmrcReference)
    if (data.authorisedOfficialName) {
      addRow('Authorised by:', `${data.authorisedOfficialName}${data.authorisedOfficialPosition ? `, ${data.authorisedOfficialPosition}` : ''}`)
    }
    if (data.organisationAddress) addRow('Address:', `${data.organisationAddress}${data.organisationPostcode ? `, ${data.organisationPostcode}` : ''}`)

    doc.moveDown(0.5)
    doc.moveTo(leftCol, doc.y).lineTo(545, doc.y).stroke('#cccccc')
    doc.moveDown(0.5)

    // Donor details
    doc.fontSize(12).font('Helvetica-Bold').text('Donor')
    doc.moveDown(0.3)
    doc.fontSize(10).font('Helvetica')
    addRow('Name:', data.donorName)
    addRow('Address:', data.donorAddress)
    addRow('Postcode:', data.donorPostcode)

    doc.moveDown(0.5)
    doc.moveTo(leftCol, doc.y).lineTo(545, doc.y).stroke('#cccccc')
    doc.moveDown(0.5)

    // Payment details
    doc.fontSize(12).font('Helvetica-Bold').text('Payment Details')
    doc.moveDown(0.3)
    doc.fontSize(10).font('Helvetica')
    addRow('Description:', data.paymentDescription)
    addRow('Base Fee:', `£${(data.baseAmount / 100).toFixed(2)}`)
    addRow('Gift Aid Donation:', `£${(data.giftAidDonation / 100).toFixed(2)}  (${data.giftAidPercentage}% added on top)`)
    addRow('Total Paid:', `£${(data.totalCharged / 100).toFixed(2)}`)

    doc.moveDown(0.3)
    doc.font('Helvetica-Bold')
    addRow('HMRC Reclaim (25%):', `£${(data.hmrcReclaimAmount / 100).toFixed(2)}`)
    doc.font('Helvetica')

    if (data.declarationDate) {
      doc.moveDown(0.3)
      addRow('Declaration confirmed:', new Date(data.declarationDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))
    }

    doc.moveDown(1)
    doc.moveTo(leftCol, doc.y).lineTo(545, doc.y).stroke('#cccccc')
    doc.moveDown(0.5)

    // Footer text
    doc.fontSize(9).font('Helvetica')
      .text(
        `This receipt confirms a Gift Aid donation was made as part of the above payment. ${data.organisationName} will use this to reclaim Gift Aid from HMRC. The donor has confirmed they are a UK taxpayer paying sufficient Income Tax or Capital Gains Tax to cover the amount reclaimed.`,
        leftCol, doc.y, { width: 495, align: 'left' }
      )

    doc.moveDown(1)
    doc.fontSize(10).font('Helvetica-Bold')
      .text(`Thank you for supporting ${data.organisationName}.`, { align: 'center' })

    doc.end()
  })
}

/**
 * Create a Gift Aid record after a successful payment.
 * Returns the created record or null if no active declaration exists.
 */
export async function createGiftAidRecord({
  transactionId,
  clubId,
  userId,
  baseFeeInPence,
  giftAidPercentage,
  paymentDate,
  paymentType,
  paymentDescription,
}) {
  // Get active declaration
  const declResult = await pool.query(
    `SELECT * FROM parent_gift_aid_declarations
     WHERE user_id = $1 AND club_id = $2 AND is_active = true AND gift_aid_opted_in = true
     LIMIT 1`,
    [userId, clubId]
  )

  if (declResult.rows.length === 0) return null

  const declaration = declResult.rows[0]
  const percentage = giftAidPercentage || parseFloat(declaration.gift_aid_percentage)

  if (!percentage || percentage <= 0) return null

  const { donationInPence, totalChargeInPence, hmrcReclaimInPence } = calculateGiftAid(baseFeeInPence, percentage)

  const taxYear = getTaxYear(paymentDate)
  const receiptNumber = await generateReceiptNumber(clubId, taxYear)

  const result = await pool.query(
    `INSERT INTO gift_aid_records (
      transaction_id, club_id, user_id, declaration_id,
      base_amount, gift_aid_percentage, gift_aid_donation, total_charged, hmrc_reclaim_amount,
      tax_year, payment_date, payment_type, payment_description,
      receipt_number
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING *`,
    [
      transactionId, clubId, userId, declaration.id,
      baseFeeInPence, percentage, donationInPence, totalChargeInPence, hmrcReclaimInPence,
      taxYear, paymentDate, paymentType, paymentDescription,
      receiptNumber,
    ]
  )

  return result.rows[0]
}
