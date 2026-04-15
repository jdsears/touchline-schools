/**
 * Nightly demo tenant reset.
 *
 * Runs at 03:00 UK time (Europe/London). Wipes and re-seeds the Greenfield Academy
 * demo tenant so it is always in a clean, consistent state for prospects.
 *
 * Also expires any prospect access that has passed its access_expires_at date.
 *
 * Only runs if DEMO_RESET_ENABLED=true in environment.
 */

import pool from '../config/database.js'
import { wipeDemoTenant } from '../db/demo-seed/index.js'
import { seedSchool } from '../db/demo-seed/school.js'
import { seedStaff } from '../db/demo-seed/staff.js'
import { seedPupils } from '../db/demo-seed/pupils.js'
import { seedTeams } from '../db/demo-seed/teams.js'
import { seedCurriculum } from '../db/demo-seed/curriculum.js'
import { seedFixtures } from '../db/demo-seed/fixtures.js'
import { seedSafeguarding } from '../db/demo-seed/safeguarding.js'
import { seedAuditLog } from '../db/demo-seed/auditLog.js'

const UK_RESET_HOUR = 3 // 03:00 Europe/London

/**
 * Calculate ms until the next 03:00 UK time.
 */
function msUntilNextReset() {
  const now = new Date()
  // Next reset in UK time
  const ukNow = new Date(now.toLocaleString('en-GB', { timeZone: 'Europe/London' }))
  const next = new Date(ukNow)
  next.setHours(UK_RESET_HOUR, 0, 0, 0)
  if (next <= ukNow) {
    next.setDate(next.getDate() + 1)
  }
  // Convert back to UTC delta
  const delta = next - ukNow
  return Math.max(delta, 60_000) // minimum 1 minute buffer
}

export async function resetDemoTenant() {
  if (process.env.DEMO_RESET_ENABLED !== 'true') {
    return
  }

  console.log('[DemoReset] Starting nightly demo tenant reset...')
  const start = Date.now()

  try {
    await wipeDemoTenant()

    const school = await seedSchool()
    const staff = await seedStaff(school.id)
    const pupils = await seedPupils(school.id)
    const teams = await seedTeams(school.id, staff, pupils)
    await seedCurriculum(school.id, staff, pupils)
    await seedFixtures(school.id, teams, staff, pupils)
    await seedSafeguarding(school.id, staff)
    await seedAuditLog(school.id, staff)

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`[DemoReset] Demo tenant reset complete in ${elapsed}s.`)
  } catch (err) {
    console.error('[DemoReset] Reset failed:', err)
  }
}

export async function expireProspectAccess() {
  try {
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
    const delay = msUntilNextReset()
    const resetAt = new Date(Date.now() + delay).toISOString()
    console.log(`[DemoReset] Next reset scheduled for ~${resetAt}`)

    setTimeout(async () => {
      await expireProspectAccess()
      await resetDemoTenant()
      scheduleNext()
    }, delay)
  }

  scheduleNext()
  console.log('[DemoReset] Nightly demo reset scheduler started.')
}
