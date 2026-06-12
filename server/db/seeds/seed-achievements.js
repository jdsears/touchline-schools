/**
 * Seed pupil_achievements across the Ashworth Park demo roster.
 *
 * Test personas: exact achievements from the brief.
 * Broader roster: ~30% of pupils get 1-2 achievements, weighted toward
 * pupils who are active in teams and teaching groups.
 *
 * Idempotent, runnable standalone:  node server/db/seeds/seed-achievements.js
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

function deterministicInt(pupilId, mod) {
  let h = 0
  for (let i = 0; i < pupilId.length; i++) h = (h * 31 + pupilId.charCodeAt(i)) >>> 0
  return h % mod
}

// ── Achievement pool (broader roster) ────────────────────────────────
const POOL = [
  { type: 'award',       icon: 'trophy', title: 'Most Improved Player', sport_key: 'football' },
  { type: 'award',       icon: 'trophy', title: 'Most Improved Player', sport_key: 'netball' },
  { type: 'award',       icon: 'trophy', title: 'Most Improved Player', sport_key: 'hockey' },
  { type: 'award',       icon: 'trophy', title: 'Most Improved Player', sport_key: 'rugby' },
  { type: 'match',       icon: 'star',   title: 'Player of the Match vs Norwich School',       sport_key: 'rugby' },
  { type: 'match',       icon: 'star',   title: 'Player of the Match vs Sacred Heart',         sport_key: 'netball' },
  { type: 'match',       icon: 'star',   title: 'Player of the Match vs Thorpe St Andrew',     sport_key: 'football' },
  { type: 'match',       icon: 'star',   title: 'Player of the Match vs Hethersett Academy',   sport_key: 'hockey' },
  { type: 'match',       icon: 'star',   title: 'Player of the Match vs Riverside Academy',    sport_key: 'football' },
  { type: 'award',       icon: 'medal',  title: "Captain's Award",                     sport_key: 'netball' },
  { type: 'award',       icon: 'medal',  title: "Captain's Award",                     sport_key: 'rugby' },
  { type: 'award',       icon: 'medal',  title: 'Coach\'s Award',                      sport_key: 'football' },
  { type: 'award',       icon: 'medal',  title: 'Coach\'s Award',                      sport_key: 'hockey' },
  { type: 'recognition', icon: 'flag',   title: 'House Contribution',                  sport_key: null },
  { type: 'recognition', icon: 'flag',   title: 'Commitment Award, Autumn Term',       sport_key: null },
  { type: 'recognition', icon: 'heart',  title: 'Sportsmanship Award',                 sport_key: null },
  { type: 'recognition', icon: 'star',   title: 'Team of the Term: attendance & effort', sport_key: null },
  { type: 'milestone',   icon: 'zap',    title: '50 training sessions attended',       sport_key: null },
]

function pickFromPool(seed, sportHint) {
  // Prefer pool entries matching any of the pupil's active sports
  const matching = sportHint && sportHint.length > 0
    ? POOL.filter(p => p.sport_key === null || sportHint.includes(p.sport_key))
    : POOL
  return matching[seed % matching.length]
}

// The achievements table is pupil_achievements on migrated databases but may
// still be player_achievements on older ones (the migration renames in place,
// it never creates the new name). Resolve whichever exists; create if neither.
let ACH_TABLE = 'pupil_achievements'
async function resolveTable() {
  const r = await pool.query(
    `SELECT to_regclass('public.pupil_achievements') AS new, to_regclass('public.player_achievements') AS old`
  )
  if (r.rows[0].new) { ACH_TABLE = 'pupil_achievements'; }
  else if (r.rows[0].old) { ACH_TABLE = 'player_achievements'; }
  else {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pupil_achievements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID REFERENCES pupils(id) ON DELETE CASCADE,
        achievement_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
        training_session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
        awarded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        sport_key TEXT
      )
    `)
    ACH_TABLE = 'pupil_achievements'
  }
  await pool.query(`ALTER TABLE ${ACH_TABLE} ADD COLUMN IF NOT EXISTS sport_key TEXT`).catch(() => {})
}

let FAILED = 0
let FIRST_ERROR = null
async function insertAchievement(pupilId, entry, awardedBy, createdAtIso, matchId = null) {
  try {
    await pool.query(`
      INSERT INTO ${ACH_TABLE} (
        player_id, achievement_type, title, description, icon,
        earned_at, match_id, awarded_by, sport_key
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      pupilId, entry.type, entry.title, entry.description || null, entry.icon,
      createdAtIso, matchId, awardedBy, entry.sport_key,
    ])
    return true
  } catch (e) {
    FAILED++
    if (!FIRST_ERROR) FIRST_ERROR = e.message
    return false
  }
}

async function run() {
  await resolveTable()

  const sr = await pool.query(`SELECT id FROM schools WHERE slug = $1`, [DEMO_SCHOOL_SLUG])
  if (sr.rows.length === 0) throw new Error('Demo school not found. Run seed:demo first.')
  const schoolId = sr.rows[0].id

  const staffRows = await pool.query(`
    SELECT u.id, u.email FROM users u JOIN school_members sm ON sm.user_id = u.id
    WHERE sm.school_id = $1`, [schoolId])
  const hodPe    = staffRows.rows.find(r => r.email?.startsWith('j.okonkwo'))?.id
  const teacher1 = staffRows.rows.find(r => r.email?.startsWith('d.brennan'))?.id
  const teacher2 = staffRows.rows.find(r => r.email?.startsWith('p.sharma'))?.id
  const director = staffRows.rows.find(r => r.email?.startsWith('s.whitfield'))?.id

  // Pupils + their active sports (for targeted achievement picks)
  const pr = await pool.query(`
    SELECT p.id, u.email,
      ARRAY(
        SELECT DISTINCT t.sport FROM team_memberships tm
        JOIN teams t ON t.id = tm.team_id
        WHERE tm.pupil_id = p.id AND t.school_id = $1
      ) AS sports
    FROM pupils p LEFT JOIN users u ON u.id = p.user_id
    WHERE p.id IN (
      SELECT p2.id FROM pupils p2 JOIN teams t ON t.id = p2.team_id WHERE t.school_id = $1
      UNION
      SELECT tgp.pupil_id FROM teaching_group_pupils tgp
        JOIN teaching_groups tg ON tg.id = tgp.teaching_group_id WHERE tg.school_id = $1
    )`, [schoolId])
  const pupils = pr.rows
  console.log(`[seed-achievements] ${pupils.length} pupils resolved`)

  await pool.query(
    `DELETE FROM ${ACH_TABLE} WHERE player_id = ANY($1::uuid[])`,
    [pupils.map(p => p.id)]
  )

  const jamie  = pupils.find(p => p.email?.startsWith('jamie.okonkwo.test'))
  const amelia = pupils.find(p => p.email?.startsWith('amelia.whitehead.test'))
  const toby   = pupils.find(p => p.email?.startsWith('toby.marsh.test'))

  let personaCount = 0, rosterCount = 0

  // ── Persona achievements (exact, from brief) ──
  if (jamie) {
    if (await insertAchievement(jamie.id,
      { type: 'award', icon: 'trophy', title: 'Most Improved Player', description: 'Awarded for outstanding progress over the autumn term.', sport_key: 'football' },
      teacher1 || hodPe, daysAgoIso(40))) personaCount++
    if (await insertAchievement(jamie.id,
      { type: 'recognition', icon: 'flag', title: 'House Points Champion, Year 7', description: 'Top contributor to Elm House across the term.', sport_key: null },
      hodPe, daysAgoIso(25))) personaCount++
  }
  if (amelia) {
    if (await insertAchievement(amelia.id,
      { type: 'award', icon: 'medal', title: "Captain's Award", description: 'Recognising leadership on the Year 9 netball squad.', sport_key: 'netball' },
      teacher2 || hodPe, daysAgoIso(45))) personaCount++
    if (await insertAchievement(amelia.id,
      { type: 'match', icon: 'star', title: 'Player of the Match vs Oakfield Grammar', description: '14 goals from 17 attempts in the County Cup quarter-final.', sport_key: 'netball' },
      teacher2 || hodPe, daysAgoIso(18))) personaCount++
    if (await insertAchievement(amelia.id,
      { type: 'recognition', icon: 'star', title: 'Department Sports Leader', description: 'Selected by HoD PE for demonstrable leadership across both sports.', sport_key: null },
      hodPe, daysAgoIso(7))) personaCount++
  }
  if (toby) {
    if (await insertAchievement(toby.id,
      { type: 'award', icon: 'medal', title: '1st XV Commitment Award', description: 'End-of-term rugby award for attendance, effort, and leadership.', sport_key: 'rugby' },
      teacher1 || hodPe, daysAgoIso(35))) personaCount++
    if (await insertAchievement(toby.id,
      { type: 'milestone', icon: 'trophy', title: 'GCSE PE Practical Distinction predicted', description: 'On track for a distinction-level practical grade at GCSE.', sport_key: null },
      hodPe, daysAgoIso(20))) personaCount++
  }

  // ── Broader roster (~30%) ──
  for (const p of pupils) {
    if ([jamie?.id, amelia?.id, toby?.id].includes(p.id)) continue
    if (deterministicInt(p.id + 'ach', 100) >= 30) continue
    const count = (deterministicInt(p.id, 2)) + 1  // 1-2
    for (let i = 0; i < count; i++) {
      const entry = pickFromPool(deterministicInt(p.id + 'e' + i, 9999), p.sports)
      let awarder = hodPe
      if (entry.sport_key === 'football' || entry.sport_key === 'rugby') awarder = teacher1 || hodPe
      else if (entry.sport_key === 'netball' || entry.sport_key === 'hockey') awarder = teacher2 || hodPe
      else if (entry.type === 'recognition' && entry.title.includes('Sports Leader')) awarder = director || hodPe
      if (await insertAchievement(p.id, entry, awarder, daysAgoIso(Math.floor(Math.random() * 180) + 5))) rosterCount++
    }
  }

  console.log(`[seed-achievements] Seeded ${personaCount} persona achievements + ${rosterCount} roster achievements.${FAILED ? ` ${FAILED} failed (first: ${FIRST_ERROR})` : ''}`)
  if (personaCount + rosterCount === 0 && FIRST_ERROR) {
    throw new Error(`No achievements seeded — ${FIRST_ERROR}`)
  }
}

if (process.argv[1]?.includes('seed-achievements.js')) {
  run()
    .then(() => process.exit(0))
    .catch(err => { console.error('[seed-achievements] Error:', err); process.exit(1) })
}

export { run as seedAchievements }
