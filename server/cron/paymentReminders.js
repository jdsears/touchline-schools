import pool from '../config/database.js'
import { sendEmail, isEmailEnabled } from '../services/emailService.js'
import { getFrontendUrl } from '../utils/urlUtils.js'

/**
 * Daily payment reminder scanner.
 *
 * Sends automated emails to parents/guardians for:
 *
 *   1. Pending subscriptions — first payment never made (assigned but unpaid)
 *   2. Upcoming payments — next_payment_at is within 3 days
 *   3. Overdue payments — next_payment_at has passed, or status is overdue/past_due
 *
 * Uses player_subscriptions.payment_reminder_sent to avoid duplicate emails.
 * Reset to NULL on successful payment (in webhook handler).
 */
export async function scanPaymentReminders() {
  const startTime = Date.now()
  console.log('[PaymentReminders] Starting daily payment reminder scan...')

  if (!isEmailEnabled()) {
    console.log('[PaymentReminders] Email not configured, skipping.')
    return { emailsSent: 0, subscriptionsChecked: 0 }
  }

  const stats = { subscriptionsChecked: 0, emailsSent: 0 }

  try {
    // -------------------------------------------------------
    // 1. Upcoming payments — due within next 3 days, not yet reminded
    // -------------------------------------------------------
    const upcomingResult = await pool.query(`
      SELECT
        ps.id, ps.portal_token, ps.status, ps.next_payment_at, ps.payment_reminder_sent,
        pp.name AS plan_name, pp.amount AS plan_amount,
        p.name AS player_name,
        c.name AS club_name,
        g.email AS guardian_email, g.first_name AS guardian_name
      FROM player_subscriptions ps
      JOIN payment_plans pp ON ps.payment_plan_id = pp.id
      JOIN players p ON ps.player_id = p.id
      JOIN clubs c ON ps.club_id = c.id
      LEFT JOIN guardians g ON ps.guardian_id = g.id
      WHERE ps.status = 'active'
        AND ps.next_payment_at IS NOT NULL
        AND ps.next_payment_at > NOW()
        AND ps.next_payment_at <= NOW() + INTERVAL '3 days'
        AND (ps.payment_reminder_sent IS NULL OR ps.payment_reminder_sent != 'upcoming')
        AND g.email IS NOT NULL
        AND ps.portal_token IS NOT NULL
    `)

    console.log(`[PaymentReminders] Found ${upcomingResult.rows.length} upcoming payments to remind`)

    for (const sub of upcomingResult.rows) {
      await sendReminder(sub, 'paymentReminder', 'upcoming', stats)
      stats.subscriptionsChecked++
    }

    // -------------------------------------------------------
    // 2. Overdue / past_due — payment date has passed
    // -------------------------------------------------------
    const overdueResult = await pool.query(`
      SELECT
        ps.id, ps.portal_token, ps.status, ps.next_payment_at, ps.payment_reminder_sent,
        pp.name AS plan_name, pp.amount AS plan_amount,
        p.name AS player_name,
        c.name AS club_name,
        g.email AS guardian_email, g.first_name AS guardian_name
      FROM player_subscriptions ps
      JOIN payment_plans pp ON ps.payment_plan_id = pp.id
      JOIN players p ON ps.player_id = p.id
      JOIN clubs c ON ps.club_id = c.id
      LEFT JOIN guardians g ON ps.guardian_id = g.id
      WHERE ps.status IN ('overdue', 'past_due')
        AND (ps.payment_reminder_sent IS NULL OR ps.payment_reminder_sent != 'overdue')
        AND g.email IS NOT NULL
        AND ps.portal_token IS NOT NULL
    `)

    console.log(`[PaymentReminders] Found ${overdueResult.rows.length} overdue payments to remind`)

    for (const sub of overdueResult.rows) {
      await sendReminder(sub, 'paymentOverdue', 'overdue', stats)
      stats.subscriptionsChecked++
    }

    // -------------------------------------------------------
    // 3. Pending subscriptions — never paid, created > 2 days ago
    //    (give them 2 days before the first nudge)
    // -------------------------------------------------------
    const pendingResult = await pool.query(`
      SELECT
        ps.id, ps.portal_token, ps.status, ps.next_payment_at, ps.payment_reminder_sent,
        ps.created_at AS sub_created_at,
        pp.name AS plan_name, pp.amount AS plan_amount,
        p.name AS player_name,
        c.name AS club_name,
        g.email AS guardian_email, g.first_name AS guardian_name
      FROM player_subscriptions ps
      JOIN payment_plans pp ON ps.payment_plan_id = pp.id
      JOIN players p ON ps.player_id = p.id
      JOIN clubs c ON ps.club_id = c.id
      LEFT JOIN guardians g ON ps.guardian_id = g.id
      WHERE ps.status = 'pending'
        AND ps.created_at < NOW() - INTERVAL '2 days'
        AND ps.payment_reminder_sent IS NULL
        AND g.email IS NOT NULL
        AND ps.portal_token IS NOT NULL
    `)

    console.log(`[PaymentReminders] Found ${pendingResult.rows.length} pending subscriptions to remind`)

    for (const sub of pendingResult.rows) {
      await sendReminder(sub, 'paymentReminder', 'upcoming', stats)
      stats.subscriptionsChecked++
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(
      `[PaymentReminders] Scan complete in ${elapsed}s — ` +
      `${stats.subscriptionsChecked} subscriptions checked, ` +
      `${stats.emailsSent} emails sent`
    )

    return stats
  } catch (err) {
    console.error('[PaymentReminders] Fatal error:', err)
    throw err
  }
}

async function sendReminder(sub, templateName, reminderStage, stats) {
  const paymentLink = `${getFrontendUrl()}/pay/${sub.portal_token}`

  const dueDate = sub.next_payment_at
    ? new Date(sub.next_payment_at).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'as soon as possible'

  const amount = (sub.plan_amount / 100).toFixed(2)

  const result = await sendEmail(sub.guardian_email, templateName, {
    clubName: sub.club_name,
    guardianName: sub.guardian_name || 'there',
    playerName: sub.player_name,
    planName: sub.plan_name,
    amount,
    dueDate,
    paymentLink,
  })

  if (result.success) {
    await pool.query(
      'UPDATE player_subscriptions SET payment_reminder_sent = $1 WHERE id = $2',
      [reminderStage, sub.id]
    )
    stats.emailsSent++
    console.log(`[PaymentReminders] Sent ${templateName} to ${sub.guardian_email} for "${sub.player_name}" (${sub.plan_name})`)
  } else {
    console.warn(`[PaymentReminders] Failed to send ${templateName} to ${sub.guardian_email}: ${result.reason || result.error}`)
  }
}

// Standalone execution support
export function runIfMain(importMetaUrl) {
  const isMain = process.argv[1] &&
    (importMetaUrl === `file://${process.argv[1]}` || process.argv[1].includes('paymentReminders'))

  if (isMain) {
    console.log('[PaymentReminders] Running as standalone script...')
    scanPaymentReminders()
      .then((stats) => {
        console.log('[PaymentReminders] Finished:', stats)
        process.exit(0)
      })
      .catch((err) => {
        console.error('[PaymentReminders] Failed:', err)
        process.exit(1)
      })
  }
}

// Auto-run if this file is executed directly
runIfMain(import.meta.url)
