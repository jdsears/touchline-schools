/**
 * Seed a small number of safeguarding flags on fictional demo pupils.
 *
 * Constraints:
 *   - Test personas (Jamie, Amelia, Toby) MUST NOT carry safeguarding flags.
 *     They are the pupils John demos to prospects.
 *   - Flags are educational / illustrative only — not simulating real cases.
 *   - Three flags total: monitoring, concern, resolved (one each).
 *   - Audit log is emitted at READ time by the route; this seed does not
 *     bypass that. Seeding itself is recorded as a pupil_profile_admin action.
 *
 * Idempotent, runnable standalone: node server/db/seeds/seed-safeguarding-flags.js
 */

import pool from '../../config/database.js'
import dotenv from 'dotenv'

dotenv.config()

const DEMO_SCHOOL_SLUG = 'ashworth-park-demo'

function daysAgoIso(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

async function run() {
  const sr = await pool.query(`SELECT id FROM schools WHERE slug = $1`, [DEMO_SCHOOL_SLUG])
  if (sr.rows.length === 0) throw new Error('Demo school not found. Run seed:demo first.')
  const schoolId = sr.rows[0].id

  // Staff: prefer a DSL-permissioned HoD as the flag author
  const staffRows = await pool.query(`
    SELECT u.id, u.email FROM users u JOIN school_members sm ON sm.user_id = u.id
    WHERE sm.school_id = $1`, [schoolId])
  const hodPe    = staffRows.rows.find(r => r.email?.startsWith('j.okonkwo'))?.id
  const director = staffRows.rows.find(r => r.email?.startsWith('s.whitfield'))?.id
  const pastoral = director || hodPe
  if (!pastoral) throw new Error('No pastoral lead found to author flags.')

  // All demo pupils, excluding the three test personas
  const pr = await pool.query(`
    SELECT p.id, p.name, u.email FROM pupils p LEFT JOIN users u ON u.id = p.user_id
    WHERE p.id IN (
      SELECT p2.id FROM pupils p2 JOIN teams t ON t.id = p2.team_id WHERE t.school_id = $1
      UNION
      SELECT tgp.pupil_id FROM teaching_group_pupils tgp
        JOIN teaching_groups tg ON tg.id = tgp.teaching_group_id WHERE tg.school_id = $1
    )
    AND COALESCE(u.email, '') NOT LIKE '%.test@%'
    ORDER BY p.name
  `, [schoolId])
  const candidates = pr.rows
  if (candidates.length < 3) throw new Error('Not enough non-persona pupils to seed safeguarding flags.')
  console.log(`[seed-safeguarding] ${candidates.length} non-persona pupils available`)

  // Wipe existing flags on ALL demo pupils (idempotency — include personas so
  // a previous buggy seed doesn't leave flags on them).
  const allIds = await pool.query(`
    SELECT p.id FROM pupils p
    WHERE p.id IN (
      SELECT p2.id FROM pupils p2 JOIN teams t ON t.id = p2.team_id WHERE t.school_id = $1
      UNION
      SELECT tgp.pupil_id FROM teaching_group_pupils tgp
        JOIN teaching_groups tg ON tg.id = tgp.teaching_group_id WHERE tg.school_id = $1
    )`, [schoolId])
  await pool.query(
    `DELETE FROM pupil_safeguarding_notes WHERE pupil_id = ANY($1::uuid[])`,
    [allIds.rows.map(r => r.id)]
  )

  // Deterministic-but-demo-varied pick: spread across year groups
  const a = candidates[Math.floor(candidates.length * 0.17)]  // ~Y7
  const b = candidates[Math.floor(candidates.length * 0.48)]  // ~Y9
  const c = candidates[Math.floor(candidates.length * 0.76)]  // ~Y11

  const flags = [
    {
      pupil_id: a.id,
      flag_type: 'monitoring',
      note: 'Pupil mentioned feeling tired during Monday PE and skipped the cool-down. Class teacher to monitor wellbeing over next two weeks and check in privately. No immediate concern; logging for pattern awareness.',
      added_at: daysAgoIso(5),
      resolved_at: null,
      visible_to_roles: ['hod', 'dsl', 'deputy_dsl', 'head_of_pe'],
    },
    {
      pupil_id: b.id,
      flag_type: 'concern',
      note: 'Pupil arrived for Year 9 netball training without kit on three consecutive weeks and was noticeably withdrawn. Pastoral lead to follow up with parent and check for wider pattern. Flagged to DSL for awareness.',
      added_at: daysAgoIso(12),
      resolved_at: null,
      visible_to_roles: ['hod', 'dsl', 'deputy_dsl'],
    },
    {
      pupil_id: c.id,
      flag_type: 'resolved',
      note: 'Concern raised in October about reluctance to swim and visible anxiety around changing rooms. Conversation with parent clarified medical history (minor skin condition) and appropriate accommodations put in place. Pupil now participating fully. Closing flag.',
      added_at: daysAgoIso(180),
      resolved_at: daysAgoIso(110),
      visible_to_roles: ['hod', 'dsl', 'deputy_dsl'],
    },
  ]

  for (const f of flags) {
    await pool.query(`
      INSERT INTO pupil_safeguarding_notes (
        pupil_id, flag_type, note,
        added_by_user_id, added_at, resolved_at, visible_to_roles
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `, [f.pupil_id, f.flag_type, f.note, pastoral,
        f.added_at, f.resolved_at, JSON.stringify(f.visible_to_roles)])
  }

  // Log the seed event itself for transparency
  await pool.query(`
    INSERT INTO audit_log (school_id, user_id, action, entity_type, entity_id, details)
    VALUES ($1, $2, 'safeguarding_flags_seeded', 'school', $1, $3)
  `, [schoolId, pastoral, JSON.stringify({
    count: flags.length, demo: true, pupils: flags.map(f => f.pupil_id),
  })]).catch(() => {})

  console.log(`[seed-safeguarding] Seeded 3 flags on non-persona pupils: ${a.name}, ${b.name}, ${c.name}`)
}

if (process.argv[1]?.includes('seed-safeguarding-flags.js')) {
  run()
    .then(() => process.exit(0))
    .catch(err => { console.error('[seed-safeguarding] Error:', err); process.exit(1) })
}

export { run as seedSafeguardingFlags }
