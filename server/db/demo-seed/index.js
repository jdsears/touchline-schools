/**
 * Demo seed orchestrator for Ashworth Park Academy prospect demo instance.
 *
 * Usage:
 *   node server/db/demo-seed/index.js          # seed (idempotent - wipes first)
 *   node server/db/demo-seed/index.js --wipe   # wipe only, no re-seed
 *
 * IMPORTANT: Before using "Ashworth Park Academy" as the school name, verify no
 * real UK school uses this name in a relevant catchment area. A web search
 * is required before this goes into production.
 */

import pool from '../../config/database.js'
import dotenv from 'dotenv'
import { seedSchool } from './school.js'
import { seedStaff } from './staff.js'
import { seedPupils } from './pupils.js'
import { seedTeams } from './teams.js'
import { seedCurriculum } from './curriculum.js'
import { seedFixtures } from './fixtures.js'
import { seedSafeguarding } from './safeguarding.js'
import { seedAuditLog } from './auditLog.js'
import { seedTestPersonas } from './test-personas.js'
import { seedLessons } from './lessons.js'
import { seedAssessments } from './assessments.js'
import { seedReports } from './reports.js'
import { seedFixturesExtra } from './fixturesExtra.js'
import { seedMedicalNotes } from '../seeds/seed-medical-notes.js'
import { seedSendNotes } from '../seeds/seed-send-notes.js'
import { seedIdps } from '../seeds/seed-idps.js'
import { seedAchievements } from '../seeds/seed-achievements.js'

dotenv.config()

const DEMO_SCHOOL_SLUG = 'ashworth-park-demo'

export async function wipeDemoTenant() {
  const schoolResult = await pool.query(
    `SELECT id FROM schools WHERE slug = $1`,
    [DEMO_SCHOOL_SLUG]
  )
  if (schoolResult.rows.length === 0) {
    console.log('[demo-seed] No demo tenant found to wipe.')
    return
  }
  const schoolId = schoolResult.rows[0].id

  // Get demo user IDs before deleting the school (to clean up users table too)
  // Exclude protected_from_reset users — they survive wipes
  const userResult = await pool.query(
    `SELECT u.id FROM users u
     JOIN school_members sm ON sm.user_id = u.id
     WHERE sm.school_id = $1 AND u.is_demo_user = true
       AND COALESCE(u.protected_from_reset, false) = false`,
    [schoolId]
  )
  const demoUserIds = userResult.rows.map(r => r.id)

  // Also detach protected pupils from teams (team_id) before cascade deletes them
  await pool.query(`
    UPDATE pupils SET team_id = NULL
    WHERE COALESCE(protected_from_reset, false) = true
      AND team_id IN (SELECT id FROM teams WHERE school_id = $1)
  `, [schoolId])

  console.log(`[demo-seed] Wiping demo tenant ${schoolId} (${demoUserIds.length} wipeable users, protected users kept)...`)

  // Cascading delete via school removes most records.
  // Teams cascade from school_id; matches from team_id; etc.
  await pool.query(`DELETE FROM demo_telemetry_events WHERE prospect_id IN (
    SELECT id FROM demo_prospects WHERE created_by IN (SELECT id FROM users WHERE is_admin = true)
    UNION
    SELECT id FROM demo_prospects WHERE id IS NOT NULL
  )`)
  await pool.query(`DELETE FROM demo_prospect_credentials WHERE user_id = ANY($1::uuid[])`, [demoUserIds])
  await pool.query(`DELETE FROM demo_prospects WHERE id IN (
    SELECT prospect_id FROM demo_prospect_credentials WHERE user_id = ANY($1::uuid[])
  )`, [demoUserIds])

  // Delete the school (cascades to school_members, teams, teaching_groups, etc.)
  await pool.query(`DELETE FROM schools WHERE id = $1`, [schoolId])

  // Delete demo users (after school cascade)
  if (demoUserIds.length > 0) {
    await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [demoUserIds])
  }

  console.log('[demo-seed] Demo tenant wiped.')
}

async function runSeed() {
  const wipeOnly = process.argv.includes('--wipe')

  try {
    await wipeDemoTenant()

    if (wipeOnly) {
      console.log('[demo-seed] Wipe-only mode. Done.')
      process.exit(0)
    }

    console.log('[demo-seed] Seeding Ashworth Park Academy...')

    const school = await seedSchool()
    console.log(`[demo-seed] School: ${school.id}`)

    const staff = await seedStaff(school.id)
    console.log(`[demo-seed] Staff: ${Object.keys(staff).join(', ')}`)

    const pupils = await seedPupils(school.id)
    console.log(`[demo-seed] Pupils: ${pupils.length}`)

    const teams = await seedTeams(school.id, staff, pupils)
    console.log(`[demo-seed] Teams: ${teams.length}`)

    await seedCurriculum(school.id, staff, pupils)
    console.log('[demo-seed] Curriculum seeded')

    await seedLessons(school.id, staff)
    console.log('[demo-seed] Lessons seeded')

    await seedAssessments(school.id)
    console.log('[demo-seed] Assessments seeded')

    await seedReports(school.id)
    console.log('[demo-seed] Reports seeded')

    await seedFixtures(school.id, teams, staff, pupils)
    console.log('[demo-seed] Fixtures seeded')

    await seedFixturesExtra(school.id)
    console.log('[demo-seed] Extra fixtures seeded')

    await seedSafeguarding(school.id, staff)
    console.log('[demo-seed] Safeguarding seeded')

    await seedAuditLog(school.id, staff)
    console.log('[demo-seed] Audit log seeded')

    const testPersonas = await seedTestPersonas(school.id)
    console.log(`[demo-seed] Test personas: ${Object.keys(testPersonas).join(', ')}`)

    await seedMedicalNotes().catch(e => console.error('[demo-seed] Medical notes failed:', e.message))
    console.log('[demo-seed] Medical notes seeded')

    await seedSendNotes().catch(e => console.error('[demo-seed] SEND notes failed:', e.message))
    console.log('[demo-seed] SEND notes seeded')

    await seedIdps().catch(e => console.error('[demo-seed] IDP goals failed:', e.message))
    console.log('[demo-seed] IDP goals seeded')

    await seedAchievements().catch(e => console.error('[demo-seed] Achievements failed:', e.message))
    console.log('[demo-seed] Achievements seeded')

    console.log('[demo-seed] Ashworth Park Academy demo tenant is ready.')
    process.exit(0)
  } catch (err) {
    console.error('[demo-seed] Error:', err)
    process.exit(1)
  }
}

// Run if called directly
if (process.argv[1]?.includes('demo-seed/index.js')) {
  runSeed()
}
