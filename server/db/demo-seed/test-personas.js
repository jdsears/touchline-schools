/**
 * Seed three test personas for Ashworth Park Academy.
 *
 * These are special pupils with is_test_persona=true and protected_from_reset=true,
 * meaning they survive demo tenant resets and carry richer data for QA / demos.
 *
 * Personas:
 *   1. Jamie Okonkwo   – Year 7, Elm House   (boys football)
 *   2. Amelia Whitehead – Year 9, Oak House   (girls netball + hockey)
 *   3. Toby Marsh       – Year 11, Maple House (boys football + rugby, GCSE PE)
 *
 * Run AFTER seedPupils, seedTeams and seedCurriculum so we can look up
 * existing teams and teaching groups by name.
 */

import pool from '../../config/database.js'
import bcrypt from 'bcryptjs'

let _hash
async function getHash() {
  if (!_hash) _hash = await bcrypt.hash('pupil-demo-no-login', 10)
  return _hash
}

function dobForYear(yearGroup) {
  const baseYear = 2026 - yearGroup - 11
  // deterministic dates so data is stable across re-seeds
  const months = { 7: '03-14', 9: '08-22', 11: '11-05' }
  return `${baseYear}-${months[yearGroup] || '06-15'}`
}

async function findTeam(schoolId, name) {
  const r = await pool.query(
    `SELECT id FROM teams WHERE school_id = $1 AND name = $2 LIMIT 1`,
    [schoolId, name]
  )
  return r.rows[0]?.id || null
}

async function findTeachingGroup(schoolId, name) {
  const r = await pool.query(
    `SELECT id FROM teaching_groups WHERE school_id = $1 AND name = $2 LIMIT 1`,
    [schoolId, name]
  )
  return r.rows[0]?.id || null
}

async function insertTestPersona(schoolId, { name, yearGroup, house, gender }) {
  const hash = await getHash()
  const email = `${name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '')}.test@ashworthpark.norfolk.sch.uk`

  const firstName = name.split(' ')[0]
  const lastName = name.split(' ').slice(1).join(' ')

  // Create user account
  const userRes = await pool.query(`
    INSERT INTO users (name, email, password_hash, role,
                       is_demo_user, is_test_persona, protected_from_reset,
                       demo_expires_at, created_at)
    VALUES ($1, $2, $3, 'manager',
            true, true, true,
            NOW() + INTERVAL '7 days', NOW())
    RETURNING id
  `, [name, email, hash])
  const userId = userRes.rows[0].id

  // Create pupil record
  const pupilRes = await pool.query(`
    INSERT INTO pupils (name, first_name, last_name,
                        year_group, house, date_of_birth,
                        is_active, protected_from_reset, user_id, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, true, true, $7, NOW())
    RETURNING *
  `, [name, firstName, lastName, yearGroup, house, dobForYear(yearGroup), userId])
  const pupil = pupilRes.rows[0]

  // School membership (read-only portal role)
  await pool.query(`
    INSERT INTO school_members (school_id, user_id, role, school_role, can_view_reports, joined_at)
    VALUES ($1, $2, 'parent', 'read_only', false, NOW())
    ON CONFLICT (school_id, user_id) DO NOTHING
  `, [schoolId, userId])

  return { ...pupil, user_id: userId }
}

async function linkToTeam(pupil, teamId) {
  if (!teamId) return
  // Set team_id on pupil (only if not already set — first team wins)
  await pool.query(
    `UPDATE pupils SET team_id = $1 WHERE id = $2 AND team_id IS NULL`,
    [teamId, pupil.id]
  )
  await pool.query(`
    INSERT INTO team_memberships (team_id, user_id, pupil_id, role, is_primary, created_at)
    VALUES ($1, $2, $3, 'parent', true, NOW())
    ON CONFLICT (user_id, team_id) DO NOTHING
  `, [teamId, pupil.user_id, pupil.id])
}

async function linkToTeachingGroup(pupil, groupId) {
  if (!groupId) return
  await pool.query(`
    INSERT INTO teaching_group_pupils (teaching_group_id, pupil_id, created_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT DO NOTHING
  `, [groupId, pupil.id])
}

// ── Jamie Okonkwo ──────────────────────────────────────────────────
async function seedJamie(schoolId) {
  const jamie = await insertTestPersona(schoolId, {
    name: 'Jamie Okonkwo',
    yearGroup: 7,
    house: 'Elm',
    gender: 'male',
  })

  // Teams: Year 7 Boys Football
  const footballId = await findTeam(schoolId, 'Year 7 Boys Football')
  await linkToTeam(jamie, footballId)

  // Teaching group: 7A PE
  const groupId = await findTeachingGroup(schoolId, '7A PE')
  await linkToTeachingGroup(jamie, groupId)

  console.log(`[test-personas] Jamie Okonkwo (Y7) → pupil ${jamie.id}`)
  return jamie
}

// ── Amelia Whitehead ───────────────────────────────────────────────
async function seedAmelia(schoolId) {
  const amelia = await insertTestPersona(schoolId, {
    name: 'Amelia Whitehead',
    yearGroup: 9,
    house: 'Oak',
    gender: 'female',
  })

  // Teams: Year 9 Girls Netball + Year 9 Girls Hockey
  const netballId = await findTeam(schoolId, 'Year 9 Girls Netball')
  const hockeyId = await findTeam(schoolId, 'Year 9 Girls Hockey')
  await linkToTeam(amelia, netballId)
  await linkToTeam(amelia, hockeyId)

  // Teaching group: 9B PE (teacher2 — hockey/netball specialist)
  const groupId = await findTeachingGroup(schoolId, '9B PE')
  await linkToTeachingGroup(amelia, groupId)

  console.log(`[test-personas] Amelia Whitehead (Y9) → pupil ${amelia.id}`)
  return amelia
}

// ── Toby Marsh ─────────────────────────────────────────────────────
async function seedToby(schoolId) {
  const toby = await insertTestPersona(schoolId, {
    name: 'Toby Marsh',
    yearGroup: 11,
    house: 'Maple',
    gender: 'male',
  })

  // Teams: Year 11 Boys Football + Year 11 Boys Rugby
  const footballId = await findTeam(schoolId, 'Year 11 Boys Football')
  const rugbyId = await findTeam(schoolId, 'Year 11 Boys Rugby')
  await linkToTeam(toby, footballId)
  await linkToTeam(toby, rugbyId)

  // Teaching group: 11 GCSE PE
  const groupId = await findTeachingGroup(schoolId, '11 GCSE PE')
  await linkToTeachingGroup(toby, groupId)

  console.log(`[test-personas] Toby Marsh (Y11) → pupil ${toby.id}`)
  return toby
}

// ── Public entry point ─────────────────────────────────────────────
export async function seedTestPersonas(schoolId) {
  const jamie = await seedJamie(schoolId)
  const amelia = await seedAmelia(schoolId)
  const toby = await seedToby(schoolId)

  return { jamie, amelia, toby }
}
