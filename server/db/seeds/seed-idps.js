/**
 * Seed pupil_idp_goals across the Ashworth Park demo roster.
 *
 * Test personas carry specific goals (see SEED_* constants below).
 * Broader roster: ~50% of pupils get 1-3 goals, matching their active sports.
 * Status mix: most in_progress, some achieved, a few revised/abandoned.
 *
 * Idempotent, runnable standalone:  node server/db/seeds/seed-idps.js
 */

import pool from '../../config/database.js'
import dotenv from 'dotenv'

dotenv.config()

const DEMO_SCHOOL_SLUG = 'ashworth-park-demo'

function daysAhead(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
function daysAgoIso(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function deterministicInt(pupilId, mod) {
  let h = 0
  for (let i = 0; i < pupilId.length; i++) h = (h * 31 + pupilId.charCodeAt(i)) >>> 0
  return h % mod
}

// ── Persona goal sets (exact, from brief) ─────────────────────────────
const SEED_JAMIE = [
  { sport_key: 'football',   goal_description: 'Improve first touch under pressure', status: 'in_progress',
    target_date: daysAhead(70), self: 'My first touch sometimes bounces away when a defender is close. I want to keep it tight so I can turn.' },
  { sport_key: 'football',   goal_description: 'Learn to hold defensive shape in back four', status: 'in_progress',
    target_date: daysAhead(50), self: null },
  { sport_key: 'gymnastics', goal_description: 'Build confidence with apparatus routines', status: 'in_progress',
    target_date: daysAhead(40), self: 'I get nervous on the vault. Going to practice the run-up at lunchtime club.' },
]

const SEED_AMELIA = [
  { sport_key: 'netball',   goal_description: 'Increase shooting accuracy from mid-range', status: 'in_progress',
    target_date: daysAhead(80), self: 'Currently around 65% from the edge of the circle. Target 75% by end of term.' },
  { sport_key: 'netball',   goal_description: 'Develop defensive interception skills', status: 'achieved',
    target_date: daysAhead(-15), self: 'Achieved — Miss Sharma noted three clean intercepts in the Sacred Heart match.' },
  { sport_key: 'netball',   goal_description: 'Captaincy communication during games', status: 'in_progress',
    target_date: daysAhead(100), self: null },
  { sport_key: 'hockey',    goal_description: 'Improve reverse-stick elimination', status: 'in_progress',
    target_date: daysAhead(60), self: 'Transfer over from netball footwork is working; reverse-stick still inconsistent.' },
  { sport_key: 'athletics', goal_description: 'Sub-60 seconds in 400m', status: 'in_progress',
    target_date: daysAhead(120), self: null },
]

const SEED_TOBY = [
  { sport_key: 'rugby',   goal_description: 'Game management under pressure in the 10 shirt', status: 'in_progress',
    target_date: daysAhead(90), self: 'Focus on decision-making in the final 10 minutes when score is tight.' },
  { sport_key: 'rugby',   goal_description: 'Lineout calling accuracy above 80%', status: 'in_progress',
    target_date: daysAhead(55), self: 'Current accuracy ~72%. Reviewing calls with captain weekly.' },
  { sport_key: 'gcse_pe', goal_description: 'Complete practical portfolio submissions by March', status: 'achieved',
    target_date: daysAhead(-10), self: 'All three practical pieces submitted and moderated.' },
  { sport_key: 'rugby',   goal_description: 'Mentor a younger Year 9 player through the season', status: 'in_progress',
    target_date: daysAhead(75), self: null },
]

// ── Broader roster goal pool (shared) ─────────────────────────────────
const POOL = [
  { sport_key: 'football', goal: 'Improve weaker-foot passing accuracy' },
  { sport_key: 'football', goal: 'Maintain defensive shape under transition' },
  { sport_key: 'football', goal: 'Win more aerial duels in central midfield' },
  { sport_key: 'football', goal: 'Develop 1v1 finishing composure' },
  { sport_key: 'netball',  goal: 'Increase shooting conversion rate at GS' },
  { sport_key: 'netball',  goal: 'Quicker release on centre-pass receives' },
  { sport_key: 'netball',  goal: 'Use peripheral vision when driving into space' },
  { sport_key: 'hockey',   goal: 'Strengthen reverse-stick technique' },
  { sport_key: 'hockey',   goal: 'Improve penalty-corner striking accuracy' },
  { sport_key: 'hockey',   goal: 'Faster recovery runs after losing possession' },
  { sport_key: 'rugby',    goal: 'Lower body position in tackle' },
  { sport_key: 'rugby',    goal: 'Cleaner ball presentation at ruck' },
  { sport_key: 'rugby',    goal: 'Improve kicking out of hand for territory' },
  { sport_key: 'cricket',  goal: 'Develop straight-bat drives against spin' },
  { sport_key: 'cricket',  goal: 'Consistent line and length in medium pace' },
  { sport_key: 'athletics', goal: 'Improve 100m PB toward club standard' },
  { sport_key: 'athletics', goal: 'Long-jump approach consistency' },
  { sport_key: null,        goal: 'Commit to two lunchtime strength sessions per week' },
  { sport_key: null,        goal: 'Lead a warm-up for a PE lesson this term' },
]

const STATUS_MIX = [
  ['in_progress', 70], ['achieved', 18], ['revised', 8], ['abandoned', 4],
]
function pickStatus() {
  const total = STATUS_MIX.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [k, w] of STATUS_MIX) { r -= w; if (r <= 0) return k }
  return 'in_progress'
}

async function insertGoal(pupilId, goal, createdBy) {
  const targetOffset = goal.status === 'achieved' ? -(Math.floor(Math.random() * 45) + 5)
                     : Math.floor(Math.random() * 120) + 20
  await pool.query(`
    INSERT INTO pupil_idp_goals (
      pupil_id, sport_key, goal_description, target_date,
      self_assessment_notes, teacher_assessment_notes,
      status, created_by_user_id, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
  `, [
    pupilId,
    goal.sport_key !== undefined ? goal.sport_key : null,
    goal.goal_description,
    goal.target_date !== undefined ? goal.target_date : daysAhead(targetOffset),
    goal.self ?? null,
    goal.teacher ?? null,
    goal.status || 'in_progress',
    createdBy,
    daysAgoIso(Math.floor(Math.random() * 140) + 7),
  ])
}

function pickSportCreator(sportKey, staff) {
  if (sportKey === 'football' || sportKey === 'rugby') return staff.teacher1 || staff.hodPe
  if (sportKey === 'netball'  || sportKey === 'hockey') return staff.teacher2 || staff.hodPe
  return staff.hodPe
}

async function run() {
  const sr = await pool.query(`SELECT id FROM schools WHERE slug = $1`, [DEMO_SCHOOL_SLUG])
  if (sr.rows.length === 0) throw new Error('Demo school not found. Run seed:demo first.')
  const schoolId = sr.rows[0].id

  const staffRows = await pool.query(`
    SELECT u.id, u.email FROM users u JOIN school_members sm ON sm.user_id = u.id
    WHERE sm.school_id = $1`, [schoolId])
  const staff = {
    hodPe:   staffRows.rows.find(r => r.email?.startsWith('j.okonkwo'))?.id,
    teacher1: staffRows.rows.find(r => r.email?.startsWith('d.brennan'))?.id,
    teacher2: staffRows.rows.find(r => r.email?.startsWith('p.sharma'))?.id,
  }

  const pr = await pool.query(`
    SELECT DISTINCT p.id, u.email FROM pupils p
    LEFT JOIN users u ON u.id = p.user_id
    WHERE p.id IN (
      SELECT p2.id FROM pupils p2 JOIN teams t ON t.id = p2.team_id WHERE t.school_id = $1
      UNION
      SELECT tgp.pupil_id FROM teaching_group_pupils tgp
        JOIN teaching_groups tg ON tg.id = tgp.teaching_group_id WHERE tg.school_id = $1
    )`, [schoolId])
  const pupils = pr.rows
  console.log(`[seed-idps] ${pupils.length} pupils resolved`)

  await pool.query(
    `DELETE FROM pupil_idp_goals WHERE pupil_id = ANY($1::uuid[])`,
    [pupils.map(p => p.id)]
  )

  const jamie = pupils.find(p => p.email?.startsWith('jamie.okonkwo.test'))
  const amelia = pupils.find(p => p.email?.startsWith('amelia.whitehead.test'))
  const toby = pupils.find(p => p.email?.startsWith('toby.marsh.test'))

  let personaCount = 0, rosterCount = 0

  if (jamie)  for (const g of SEED_JAMIE)  { await insertGoal(jamie.id,  g, pickSportCreator(g.sport_key, staff)); personaCount++ }
  if (amelia) for (const g of SEED_AMELIA) { await insertGoal(amelia.id, g, pickSportCreator(g.sport_key, staff)); personaCount++ }
  if (toby)   for (const g of SEED_TOBY)   { await insertGoal(toby.id,   g, pickSportCreator(g.sport_key, staff)); personaCount++ }

  for (const p of pupils) {
    if ([jamie?.id, amelia?.id, toby?.id].includes(p.id)) continue
    if (deterministicInt(p.id, 100) >= 50) continue  // ~50%
    const count = (deterministicInt(p.id, 3)) + 1     // 1-3
    const startOffset = deterministicInt(p.id, POOL.length)
    for (let i = 0; i < count; i++) {
      const base = POOL[(startOffset + i) % POOL.length]
      const status = pickStatus()
      const selfNote = Math.random() < 0.3
        ? 'Self-reflection: working on this with my coach. Steady progress so far.'
        : null
      await insertGoal(p.id, {
        sport_key: base.sport_key,
        goal_description: base.goal,
        status,
        self: selfNote,
      }, pickSportCreator(base.sport_key, staff))
      rosterCount++
    }
  }

  console.log(`[seed-idps] Seeded ${personaCount} persona goals + ${rosterCount} roster goals.`)
}

if (process.argv[1]?.includes('seed-idps.js')) {
  run()
    .then(() => process.exit(0))
    .catch(err => { console.error('[seed-idps] Error:', err); process.exit(1) })
}

export { run as seedIdps }
