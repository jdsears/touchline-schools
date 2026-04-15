import pool from '../config/database.js'
import { sendEmail, isEmailEnabled } from '../services/emailService.js'

const APP_URL = process.env.FRONTEND_URL || 'https://app.moonbootssports.com'

/**
 * Daily trial lifecycle scanner.
 *
 * Checks every team with an active trial and sends reminder emails
 * at key milestones before (and on) the trial expiry date:
 *
 *   - 3 days before expiry  → trialEndingWarning
 *   - 1 day before expiry   → trialEndingSoon
 *   - On expiry day         → trialEnded
 *
 * Uses teams.trial_reminder_sent to avoid duplicate emails.
 * Only sends to the team owner (the user who created the team).
 */
export async function scanTrialLifecycle() {
  const startTime = Date.now()
  console.log('[TrialLifecycle] Starting daily trial lifecycle scan...')

  if (!isEmailEnabled()) {
    console.log('[TrialLifecycle] Email not configured, skipping.')
    return { emailsSent: 0, teamsChecked: 0 }
  }

  const stats = { teamsChecked: 0, emailsSent: 0 }

  try {
    // Find all teams that:
    //   1. Have a trial_ends_at set
    //   2. Have NOT already converted to a paid subscription
    //   3. trial_ends_at is within the next 3 days OR has just expired (within last 24h)
    const result = await pool.query(`
      SELECT t.id, t.name, t.trial_ends_at, t.trial_reminder_sent, t.owner_id
      FROM teams t
      WHERE t.trial_ends_at IS NOT NULL
        AND t.subscription_tier = 'trial_14d'
        AND t.trial_ends_at >= NOW() - INTERVAL '1 day'
        AND t.trial_ends_at <= NOW() + INTERVAL '4 days'
        AND NOT EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.team_id = t.id
            AND s.status IN ('active', 'trialing')
            AND s.current_period_end > NOW()
        )
    `)

    console.log(`[TrialLifecycle] Found ${result.rows.length} teams to check`)

    for (const team of result.rows) {
      try {
        await processTeam(team, stats)
        stats.teamsChecked++
      } catch (err) {
        console.error(`[TrialLifecycle] Error processing team ${team.id} (${team.name}):`, err)
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(
      `[TrialLifecycle] Scan complete in ${elapsed}s — ` +
      `${stats.teamsChecked} teams checked, ` +
      `${stats.emailsSent} emails sent`
    )

    return stats
  } catch (err) {
    console.error('[TrialLifecycle] Fatal error:', err)
    throw err
  }
}

async function processTeam(team, stats) {
  const now = new Date()
  const trialEnd = new Date(team.trial_ends_at)
  const msRemaining = trialEnd - now
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24))
  const alreadySent = team.trial_reminder_sent

  // Determine which email to send (most urgent first)
  let templateName = null
  let reminderStage = null

  if (daysRemaining <= 0 && alreadySent !== 'expired') {
    templateName = 'trialEnded'
    reminderStage = 'expired'
  } else if (daysRemaining === 1 && alreadySent !== '1day' && alreadySent !== 'expired') {
    templateName = 'trialEndingSoon'
    reminderStage = '1day'
  } else if (daysRemaining <= 3 && daysRemaining > 1 && !alreadySent) {
    templateName = 'trialEndingWarning'
    reminderStage = '3day'
  }

  if (!templateName) return

  // Find the team owner's email and name
  const ownerInfo = await getTeamOwner(team)
  if (!ownerInfo) {
    console.log(`[TrialLifecycle] No owner found for team ${team.id} (${team.name}), skipping`)
    return
  }

  const trialEndDate = trialEnd.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const pricingLink = `${APP_URL}/pricing`

  const emailData = {
    teamName: team.name,
    ownerName: ownerInfo.name.split(' ')[0], // First name only
    daysRemaining,
    trialEndDate,
    pricingLink,
  }

  const result = await sendEmail(ownerInfo.email, templateName, emailData)

  if (result.success) {
    // Mark which reminder stage we've sent
    await pool.query(
      'UPDATE teams SET trial_reminder_sent = $1 WHERE id = $2',
      [reminderStage, team.id]
    )
    stats.emailsSent++
    console.log(`[TrialLifecycle] Sent ${templateName} to ${ownerInfo.email} for team "${team.name}"`)
  } else {
    console.warn(`[TrialLifecycle] Failed to send ${templateName} to ${ownerInfo.email}: ${result.reason || result.error}`)
  }
}

async function getTeamOwner(team) {
  // Try owner_id first
  if (team.owner_id) {
    const result = await pool.query(
      'SELECT name, email FROM users WHERE id = $1',
      [team.owner_id]
    )
    if (result.rows.length > 0) return result.rows[0]
  }

  // Fallback: find the manager/coach of the team
  const result = await pool.query(
    `SELECT name, email FROM users
     WHERE team_id = $1 AND role IN ('manager', 'coach')
     ORDER BY created_at ASC LIMIT 1`,
    [team.id]
  )

  return result.rows[0] || null
}

// Standalone execution support
export function runIfMain(importMetaUrl) {
  const isMain = process.argv[1] &&
    (importMetaUrl === `file://${process.argv[1]}` || process.argv[1].includes('trialLifecycle'))

  if (isMain) {
    console.log('[TrialLifecycle] Running as standalone script...')
    scanTrialLifecycle()
      .then((stats) => {
        console.log('[TrialLifecycle] Finished:', stats)
        process.exit(0)
      })
      .catch((err) => {
        console.error('[TrialLifecycle] Failed:', err)
        process.exit(1)
      })
  }
}

// Auto-run if this file is executed directly
runIfMain(import.meta.url)
