import pool from '../config/database.js'
import { sendEmail, isEmailEnabled } from '../services/emailService.js'

const EXPIRY_WINDOW_DAYS = 30
const CRITICAL_THRESHOLD_DAYS = 14

/**
 * Daily compliance scanner.
 *
 * Scans every school with an active subscription for:
 *   - DBS checks expiring / expired
 *   - First aid certs expiring
 *   - Safeguarding training expiring
 *   - Coaching badges expiring
 *   - Coaches / team-managers without any DBS on file
 *   - Missing school welfare officer role
 *
 * Deduplicates alerts and auto-resolves stale ones.
 * Sends a daily digest email to school owners and welfare officers
 * for any school that has critical-severity alerts.
 */
export async function scanCompliance() {
  const startTime = Date.now()
  console.log('[ComplianceScanner] Starting daily compliance scan...')

  const stats = {
    clubsScanned: 0,
    alertsCreated: 0,
    alertsResolved: 0,
    emailsSent: 0,
  }

  try {
    // -------------------------------------------------------
    // 1. Fetch all schools with active subscriptions
    // -------------------------------------------------------
    const clubsResult = await pool.query(
      `SELECT id, name, slug, contact_email
       FROM schools
       WHERE subscription_status IN ('active', 'trial')`
    )
    const schools = clubsResult.rows

    console.log(`[ComplianceScanner] Found ${schools.length} active schools to scan`)

    for (const school of schools) {
      try {
        await scanClub(school, stats)
        stats.clubsScanned++
      } catch (err) {
        console.error(`[ComplianceScanner] Error scanning school ${school.id} (${school.name}):`, err)
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(
      `[ComplianceScanner] Scan complete in ${elapsed}s - ` +
      `${stats.clubsScanned} schools scanned, ` +
      `${stats.alertsCreated} alerts created, ` +
      `${stats.alertsResolved} alerts resolved, ` +
      `${stats.emailsSent} emails sent`
    )

    return stats
  } catch (err) {
    console.error('[ComplianceScanner] Fatal error:', err)
    throw err
  }
}

// ----------------------------------------------------------
// Per-school scanning logic
// ----------------------------------------------------------

async function scanClub(school, stats) {
  const schoolId = school.id
  const newAlerts = []

  // Fetch compliance records for the school
  const recordsResult = await pool.query(
    `SELECT cr.*, u.name AS user_name, u.email AS user_email
     FROM compliance_records cr
     JOIN users u ON u.id = cr.user_id
     WHERE cr.school_id = $1`,
    [schoolId]
  )
  const records = recordsResult.rows

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const windowDate = new Date(today)
  windowDate.setDate(windowDate.getDate() + EXPIRY_WINDOW_DAYS)

  // --------------------------------------------------
  // 2. Scan each compliance record
  // --------------------------------------------------
  for (const rec of records) {
    // --- DBS checks ---
    if (rec.dbs_expiry_date) {
      const expiryDate = new Date(rec.dbs_expiry_date)
      expiryDate.setHours(0, 0, 0, 0)

      if (expiryDate < today) {
        // Already expired
        newAlerts.push({
          school_id: schoolId,
          alert_type: 'dbs_expired',
          target_user_id: rec.user_id,
          severity: 'critical',
          message: `DBS check for ${rec.user_name} expired on ${formatDate(expiryDate)}.`,
          due_date: rec.dbs_expiry_date,
        })
      } else if (expiryDate <= windowDate) {
        // Expiring within 30 days
        const daysUntil = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
        const severity = daysUntil < CRITICAL_THRESHOLD_DAYS ? 'critical' : 'warning'
        newAlerts.push({
          school_id: schoolId,
          alert_type: 'dbs_expiring',
          target_user_id: rec.user_id,
          severity,
          message: `DBS check for ${rec.user_name} expires in ${daysUntil} day${daysUntil === 1 ? '' : 's'} (${formatDate(expiryDate)}).`,
          due_date: rec.dbs_expiry_date,
        })
      }
    }

    // --- First aid cert ---
    if (rec.first_aid_expiry) {
      const expiryDate = new Date(rec.first_aid_expiry)
      expiryDate.setHours(0, 0, 0, 0)

      if (expiryDate < today) {
        newAlerts.push({
          school_id: schoolId,
          alert_type: 'first_aid_expiring',
          target_user_id: rec.user_id,
          severity: 'critical',
          message: `First aid certificate for ${rec.user_name} expired on ${formatDate(expiryDate)}.`,
          due_date: rec.first_aid_expiry,
        })
      } else if (expiryDate <= windowDate) {
        const daysUntil = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
        newAlerts.push({
          school_id: schoolId,
          alert_type: 'first_aid_expiring',
          target_user_id: rec.user_id,
          severity: daysUntil < CRITICAL_THRESHOLD_DAYS ? 'critical' : 'warning',
          message: `First aid certificate for ${rec.user_name} expires in ${daysUntil} day${daysUntil === 1 ? '' : 's'} (${formatDate(expiryDate)}).`,
          due_date: rec.first_aid_expiry,
        })
      }
    }

    // --- Safeguarding training ---
    if (rec.safeguarding_expiry) {
      const expiryDate = new Date(rec.safeguarding_expiry)
      expiryDate.setHours(0, 0, 0, 0)

      if (expiryDate < today) {
        newAlerts.push({
          school_id: schoolId,
          alert_type: 'safeguarding_expiring',
          target_user_id: rec.user_id,
          severity: 'critical',
          message: `Safeguarding training for ${rec.user_name} expired on ${formatDate(expiryDate)}.`,
          due_date: rec.safeguarding_expiry,
        })
      } else if (expiryDate <= windowDate) {
        const daysUntil = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
        newAlerts.push({
          school_id: schoolId,
          alert_type: 'safeguarding_expiring',
          target_user_id: rec.user_id,
          severity: daysUntil < CRITICAL_THRESHOLD_DAYS ? 'critical' : 'warning',
          message: `Safeguarding training for ${rec.user_name} expires in ${daysUntil} day${daysUntil === 1 ? '' : 's'} (${formatDate(expiryDate)}).`,
          due_date: rec.safeguarding_expiry,
        })
      }
    }

    // --- Coaching badges ---
    const badges = Array.isArray(rec.coaching_badges) ? rec.coaching_badges : []
    for (const badge of badges) {
      if (!badge.expiry_date) continue
      const expiryDate = new Date(badge.expiry_date)
      expiryDate.setHours(0, 0, 0, 0)

      if (expiryDate < today) {
        newAlerts.push({
          school_id: schoolId,
          alert_type: 'coaching_badge_expiring',
          target_user_id: rec.user_id,
          severity: 'critical',
          message: `Coaching badge "${badge.name || 'Unknown'}" for ${rec.user_name} expired on ${formatDate(expiryDate)}.`,
          due_date: badge.expiry_date,
        })
      } else if (expiryDate <= windowDate) {
        const daysUntil = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
        newAlerts.push({
          school_id: schoolId,
          alert_type: 'coaching_badge_expiring',
          target_user_id: rec.user_id,
          severity: daysUntil < CRITICAL_THRESHOLD_DAYS ? 'critical' : 'warning',
          message: `Coaching badge "${badge.name || 'Unknown'}" for ${rec.user_name} expires in ${daysUntil} day${daysUntil === 1 ? '' : 's'} (${formatDate(expiryDate)}).`,
          due_date: badge.expiry_date,
        })
      }
    }

    // --- Missing DBS for coaches / team managers ---
    const roleLower = (rec.role_at_club || '').toLowerCase()
    if (
      (roleLower.includes('coach') || roleLower.includes('manager')) &&
      !rec.dbs_number &&
      !rec.dbs_expiry_date
    ) {
      newAlerts.push({
        school_id: schoolId,
        alert_type: 'missing_dbs',
        target_user_id: rec.user_id,
        severity: 'critical',
        message: `${rec.user_name} (${rec.role_at_club}) has no DBS check on file.`,
        due_date: null,
      })
    }
  }

  // --------------------------------------------------
  // 3. Check safeguarding roles - welfare officer
  // --------------------------------------------------
  const welfareResult = await pool.query(
    `SELECT id FROM safeguarding_roles
     WHERE school_id = $1 AND safeguarding_role = 'club_welfare_officer'`,
    [schoolId]
  )

  if (welfareResult.rows.length === 0) {
    newAlerts.push({
      school_id: schoolId,
      alert_type: 'no_welfare_officer',
      target_user_id: null,
      severity: 'critical',
      message: 'No school welfare officer has been assigned. This is a mandatory safeguarding requirement.',
      due_date: null,
    })
  }

  // --------------------------------------------------
  // 4. Deduplication - skip if matching active alert exists
  // --------------------------------------------------
  const alertsToCreate = []
  for (const alert of newAlerts) {
    const existing = await pool.query(
      `SELECT id FROM compliance_alerts
       WHERE school_id = $1
         AND alert_type = $2
         AND status = 'active'
         AND (target_user_id = $3 OR (target_user_id IS NULL AND $3::uuid IS NULL))`,
      [alert.school_id, alert.alert_type, alert.target_user_id]
    )
    if (existing.rows.length === 0) {
      alertsToCreate.push(alert)
    }
  }

  // --------------------------------------------------
  // 5. Auto-resolve - mark stale active alerts as resolved
  // --------------------------------------------------
  // Build a lookup of (alert_type, target_user_id) from the new scan
  const activeConditionKeys = new Set(
    newAlerts.map((a) => `${a.alert_type}::${a.target_user_id || 'null'}`)
  )

  const existingActiveResult = await pool.query(
    `SELECT id, alert_type, target_user_id FROM compliance_alerts
     WHERE school_id = $1 AND status = 'active'`,
    [schoolId]
  )

  for (const existing of existingActiveResult.rows) {
    const key = `${existing.alert_type}::${existing.target_user_id || 'null'}`
    if (!activeConditionKeys.has(key)) {
      await pool.query(
        `UPDATE compliance_alerts
         SET status = 'resolved', resolved_at = NOW()
         WHERE id = $1`,
        [existing.id]
      )
      stats.alertsResolved++
    }
  }

  // --------------------------------------------------
  // Insert new alerts
  // --------------------------------------------------
  for (const alert of alertsToCreate) {
    await pool.query(
      `INSERT INTO compliance_alerts (school_id, alert_type, target_user_id, message, severity, status, due_date)
       VALUES ($1, $2, $3, $4, $5, 'active', $6)`,
      [alert.school_id, alert.alert_type, alert.target_user_id, alert.message, alert.severity, alert.due_date]
    )
    stats.alertsCreated++
  }

  // --------------------------------------------------
  // 6. Send daily digest email for critical alerts
  // --------------------------------------------------
  const criticalAlerts = await pool.query(
    `SELECT * FROM compliance_alerts
     WHERE school_id = $1 AND status = 'active' AND severity = 'critical'
     ORDER BY created_at DESC`,
    [schoolId]
  )

  if (criticalAlerts.rows.length > 0 && isEmailEnabled()) {
    await sendSchoolDigestEmail(school, criticalAlerts.rows, stats)
  }
}

// ----------------------------------------------------------
// Digest email to school owners & welfare officers
// ----------------------------------------------------------

async function sendSchoolDigestEmail(school, criticalAlerts, stats) {
  // Find school owners
  const ownersResult = await pool.query(
    `SELECT u.email FROM club_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.school_id = $1 AND cm.role = 'owner' AND cm.status = 'active'`,
    [school.id]
  )

  // Find welfare officers
  const welfareResult = await pool.query(
    `SELECT u.email FROM safeguarding_roles sr
     JOIN users u ON u.id = sr.user_id
     WHERE sr.school_id = $1 AND sr.safeguarding_role = 'club_welfare_officer'`,
    [school.id]
  )

  // Collect unique recipients
  const recipients = new Set()
  for (const row of ownersResult.rows) {
    if (row.email) recipients.add(row.email)
  }
  for (const row of welfareResult.rows) {
    if (row.email) recipients.add(row.email)
  }

  // Fallback to school contact email
  if (recipients.size === 0 && school.contact_email) {
    recipients.add(school.contact_email)
  }

  if (recipients.size === 0) return

  // Build digest data
  const alertsByType = {}
  for (const alert of criticalAlerts) {
    if (!alertsByType[alert.alert_type]) {
      alertsByType[alert.alert_type] = []
    }
    alertsByType[alert.alert_type].push(alert)
  }

  const digestData = {
    clubName: school.name,
    alertCount: criticalAlerts.length,
    alertsByType,
    alerts: criticalAlerts,
    scanDate: new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  }

  for (const email of recipients) {
    try {
      await sendEmail(email, 'complianceDigest', digestData)
      stats.emailsSent++
    } catch (err) {
      console.error(`[ComplianceScanner] Failed to send digest to ${email}:`, err)
    }
  }
}

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ----------------------------------------------------------
// Alert type display names (for email templates)
// ----------------------------------------------------------
export const ALERT_TYPE_LABELS = {
  dbs_expiring: 'DBS Expiring Soon',
  dbs_expired: 'DBS Expired',
  first_aid_expiring: 'First Aid Expiring',
  safeguarding_expiring: 'Safeguarding Expiring',
  coaching_badge_expiring: 'Coaching Badge Expiring',
  missing_dbs: 'Missing DBS Check',
  no_welfare_officer: 'No Welfare Officer',
}

// ----------------------------------------------------------
// Standalone execution support
// ----------------------------------------------------------
export function runIfMain(importMetaUrl) {
  const isMain = process.argv[1] &&
    (importMetaUrl === `file://${process.argv[1]}` || process.argv[1].includes('complianceScanner'))

  if (isMain) {
    console.log('[ComplianceScanner] Running as standalone script...')
    scanCompliance()
      .then((stats) => {
        console.log('[ComplianceScanner] Finished:', stats)
        process.exit(0)
      })
      .catch((err) => {
        console.error('[ComplianceScanner] Failed:', err)
        process.exit(1)
      })
  }
}

// Auto-run if this file is executed directly
runIfMain(import.meta.url)
