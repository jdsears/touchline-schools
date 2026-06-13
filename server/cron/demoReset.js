/**
 * Nightly demo tenant reset.
 *
 * Runs at 03:00 UK time (Europe/London). Wipes and re-seeds the Ashworth Park Academy
 * demo tenant so it is always in a clean, consistent state for prospects.
 *
 * Also expires any prospect access that has passed its access_expires_at date.
 *
 * Only runs if DEMO_RESET_ENABLED=true in environment.
 */

import pool from '../config/database.js'
import { runDemoSeed } from '../db/demo-seed/index.js'

const UK_RESET_HOUR = 3 // 03:00 Europe/London

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * Calculate ms until the next 03:00 Europe/London.
 *
 * Reads the current London wall-clock via Intl parts and counts forward to the
 * next 03:00. The previous implementation did `new Date(date.toLocaleString())`,
 * which parses a locale string (`DD/MM/YYYY, …`) that V8 can return as an
 * Invalid Date — yielding NaN and crashing the scheduler. This avoids string
 * parsing entirely and always returns a finite, positive number.
 */
function msUntilNextReset() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const get = (t) => parseInt(parts.find((p) => p.type === t)?.value ?? 'NaN', 10)
  const h = get('hour') % 24 // Intl can emit "24" at midnight
  const m = get('minute')
  const s = get('second')
  if ([h, m, s].some(Number.isNaN)) return ONE_DAY_MS // never return NaN

  const secsNow = h * 3600 + m * 60 + s
  const target = UK_RESET_HOUR * 3600
  let deltaSec = target - secsNow
  if (deltaSec <= 0) deltaSec += 24 * 3600
  return Math.max(deltaSec * 1000, 60_000) // minimum 1 minute buffer
}

export async function resetDemoTenant() {
  if (process.env.DEMO_RESET_ENABLED !== 'true') {
    return
  }

  console.log('[DemoReset] Starting nightly demo tenant reset...')
  const start = Date.now()

  try {
    // Single source of truth: run exactly the same full seed as the
    // manual Admin -> Reseed Demo action (lessons, assessments, reports,
    // IDPs, medical/SEND notes, achievements included). The nightly path
    // previously ran a stale subset and produced a thinner demo.
    await runDemoSeed({ onLog: (msg) => console.log(msg) })

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`[DemoReset] Demo tenant reset complete in ${elapsed}s.`)
  } catch (err) {
    console.error('[DemoReset] Reset failed:', err)
  }
}

export async function expireProspectAccess() {
  try {
    // Prospect tables only exist on prospect-enabled deployments; skip quietly otherwise.
    const present = await pool.query(`SELECT to_regclass('public.demo_prospects') AS t`)
    if (!present.rows[0].t) return

    const result = await pool.query(`
      UPDATE demo_prospects
      SET is_active = false
      WHERE access_expires_at < NOW() AND is_active = true
      RETURNING id, email
    `)
    if (result.rowCount > 0) {
      console.log(`[DemoReset] Expired ${result.rowCount} prospect access(es):`,
        result.rows.map(r => r.email).join(', '))
    }

    // Also expire associated demo user accounts
    await pool.query(`
      UPDATE users u
      SET is_demo_user = false
      FROM demo_prospect_credentials dpc
      JOIN demo_prospects dp ON dp.id = dpc.prospect_id
      WHERE dpc.user_id = u.id
        AND dp.is_active = false
        AND u.demo_expires_at < NOW()
    `)
  } catch (err) {
    console.error('[DemoReset] Prospect expiry error:', err)
  }
}

/**
 * Schedule the nightly reset at 03:00 UK time.
 * Call this once during server startup.
 */
export function scheduleDemoReset() {
  if (process.env.DEMO_RESET_ENABLED !== 'true') {
    return
  }

  const scheduleNext = () => {
    let delay
    try {
      delay = msUntilNextReset()
    } catch (e) {
      console.error('[DemoReset] Failed to compute next reset; defaulting to 24h:', e.message)
      delay = ONE_DAY_MS
    }
    if (!Number.isFinite(delay) || delay <= 0) delay = ONE_DAY_MS

    let resetAt = `in ~${Math.round(delay / 3_600_000)}h`
    try { resetAt = new Date(Date.now() + delay).toISOString() } catch { /* keep relative label */ }
    console.log(`[DemoReset] Next reset scheduled for ~${resetAt}`)

    // The callback must never throw uncaught — an unhandled rejection here would
    // crash the whole server process and put it in a restart loop.
    setTimeout(() => {
      ;(async () => {
        try {
          await expireProspectAccess()
          await resetDemoTenant()
        } catch (e) {
          console.error('[DemoReset] Reset cycle error:', e)
        } finally {
          scheduleNext()
        }
      })()
    }, delay)
  }

  scheduleNext()
  console.log('[DemoReset] Nightly demo reset scheduler started.')
}
