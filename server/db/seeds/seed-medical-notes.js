/**
 * Seed pupil_medical_notes across the Ashworth Park demo roster.
 *
 * Idempotent: deletes any existing medical notes for the demo pupils before
 * re-inserting, so re-running does not duplicate.
 *
 * Runnable standalone:  node server/db/seeds/seed-medical-notes.js
 *                       (or npm run seed:medical-notes from server/)
 *
 * Distribution across broader roster: ~15% of pupils carry a medical note.
 *   60% asthma   | 15% food allergy | 10% previous injury
 *   10% hayfever | 5% diabetes/epilepsy
 *
 * Emergency phone numbers use 07700 900000–999 (officially reserved for fiction).
 */

import pool from '../../config/database.js'
import dotenv from 'dotenv'

dotenv.config()

const DEMO_SCHOOL_SLUG = 'ashworth-park-demo'

function fictionalPhone() {
  return `07700 9${String(Math.floor(Math.random() * 90000) + 10000)}`
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

// ── Template library ──────────────────────────────────────────────────
const TEMPLATES = {
  asthma: () => ({
    condition: 'Mild asthma',
    medication: 'Salbutamol (blue) inhaler — 2 puffs before strenuous exercise',
    allergies: null,
    dietary_requirements: null,
    physical_limitations_note: 'Inhaler must be accessible pitchside. Pause activity if wheezy.',
  }),
  peanut: () => ({
    condition: 'Severe peanut allergy',
    medication: 'EpiPen (adrenaline auto-injector) — carried at all times',
    allergies: 'Peanuts, tree nuts',
    dietary_requirements: 'No peanut or tree nut products. Verify pre-match snack labels.',
    physical_limitations_note: null,
  }),
  dairy: () => ({
    condition: 'Dairy allergy',
    medication: null,
    allergies: 'Dairy (milk, cheese, yoghurt)',
    dietary_requirements: 'Dairy-free for all school meals and snacks.',
    physical_limitations_note: null,
  }),
  knee: () => ({
    condition: 'Previous knee injury (ACL strain, 2024 — resolved)',
    medication: null, allergies: null, dietary_requirements: null,
    physical_limitations_note: 'Cleared for full participation. Warm up thoroughly.',
  }),
  ankle: () => ({
    condition: 'Recurrent ankle sprain (right)',
    medication: null, allergies: null, dietary_requirements: null,
    physical_limitations_note: 'Ankle support worn for contact sport. Avoid uneven surfaces where possible.',
  }),
  wrist: () => ({
    condition: 'Wrist fracture, 2023 (healed)',
    medication: null, allergies: null, dietary_requirements: null,
    physical_limitations_note: 'No restrictions. Pupil may prefer to avoid weight-bearing gymnastics.',
  }),
  concussion: () => ({
    condition: 'Concussion history (March 2024)',
    medication: null, allergies: null, dietary_requirements: null,
    physical_limitations_note: 'Graduated return to contact completed. Watch for any head-strike symptoms.',
  }),
  hayfever: () => ({
    condition: 'Seasonal hayfever',
    medication: 'Cetirizine 10mg daily in summer term',
    allergies: 'Grass pollen',
    dietary_requirements: null,
    physical_limitations_note: 'May be affected on high-pollen days during outdoor PE.',
  }),
  diabetes: () => ({
    condition: 'Type 1 diabetes',
    medication: 'Insulin pump. Blood glucose check before and after PE.',
    allergies: null,
    dietary_requirements: 'Snacks available pitchside. Alert staff if low/high symptoms.',
    physical_limitations_note: 'Full participation. Staff must know location of glucose tablets.',
  }),
  epilepsy: () => ({
    condition: 'Well-controlled epilepsy (tonic-clonic, last seizure 2022)',
    medication: 'Levetiracetam (daily, administered at home)',
    allergies: null,
    dietary_requirements: null,
    physical_limitations_note: 'No swimming without 1:1 supervision. Otherwise full participation.',
  }),
}

const TEMPLATE_WEIGHTS = [
  ['asthma', 60],
  ['peanut', 8], ['dairy', 7],
  ['knee', 3], ['ankle', 3], ['wrist', 2], ['concussion', 2],
  ['hayfever', 10],
  ['diabetes', 3], ['epilepsy', 2],
]

function pickTemplate() {
  const total = TEMPLATE_WEIGHTS.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [k, w] of TEMPLATE_WEIGHTS) { r -= w; if (r <= 0) return k }
  return 'asthma'
}

// Deterministic hash so the same pupil always (or never) has a medical note
function shouldHaveNote(pupilId, pct) {
  let h = 0
  for (let i = 0; i < pupilId.length; i++) h = (h * 31 + pupilId.charCodeAt(i)) >>> 0
  return (h % 100) < pct
}

const FAKE_PARENT_NAMES = [
  'Mrs Adeola Osei', 'Mr Ifeanyi Chukwu', 'Ms Sarah Thornton', 'Mr Rajesh Patel',
  'Mrs Adaeze Okafor', 'Ms Charlotte Hughes', 'Mr Kofi Mensah', 'Mrs Bisi Adewale',
  'Mr Michael Fletcher', 'Ms Grace Njoku', 'Mr Stephen Barker', 'Mrs Harpreet Kaur',
  'Mr David Whitehead', 'Mrs Linda Marsh',
]

function pickParentName(pupilId) {
  let h = 0
  for (let i = 0; i < pupilId.length; i++) h = (h * 17 + pupilId.charCodeAt(i)) >>> 0
  return FAKE_PARENT_NAMES[h % FAKE_PARENT_NAMES.length]
}

async function insert(pupilId, tpl, reviewerId) {
  const data = tpl()
  await pool.query(`
    INSERT INTO pupil_medical_notes (
      pupil_id, condition, medication, dietary_requirements, allergies,
      physical_limitations_note, emergency_contact_name, emergency_contact_phone,
      last_reviewed_date, last_reviewed_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    pupilId, data.condition, data.medication, data.dietary_requirements,
    data.allergies, data.physical_limitations_note,
    pickParentName(pupilId), fictionalPhone(),
    daysAgo(Math.floor(Math.random() * 330) + 20), reviewerId,
  ])
}

async function run() {
  const sr = await pool.query(`SELECT id FROM schools WHERE slug = $1`, [DEMO_SCHOOL_SLUG])
  if (sr.rows.length === 0) {
    throw new Error('Demo school not found. Run seed:demo first.')
  }
  const schoolId = sr.rows[0].id

  // Reviewer = Head of PE (school nurse proxy — primary clinical lead for PE)
  const reviewer = await pool.query(
    `SELECT u.id FROM users u JOIN school_members sm ON sm.user_id = u.id
     WHERE sm.school_id = $1 AND u.email LIKE 'j.okonkwo%' LIMIT 1`, [schoolId]
  )
  const reviewerId = reviewer.rows[0]?.id || null

  // All pupils on this school via team or teaching-group link
  const pr = await pool.query(`
    SELECT DISTINCT p.id, p.name, u.email
    FROM pupils p
    LEFT JOIN users u ON u.id = p.user_id
    WHERE p.id IN (
      SELECT p2.id FROM pupils p2 JOIN teams t ON t.id = p2.team_id WHERE t.school_id = $1
      UNION
      SELECT tgp.pupil_id FROM teaching_group_pupils tgp
        JOIN teaching_groups tg ON tg.id = tgp.teaching_group_id WHERE tg.school_id = $1
    )`, [schoolId])
  const pupils = pr.rows
  console.log(`[seed-medical] ${pupils.length} pupils resolved for ${DEMO_SCHOOL_SLUG}`)

  // Wipe existing notes for these pupils (idempotency)
  await pool.query(
    `DELETE FROM pupil_medical_notes WHERE pupil_id = ANY($1::uuid[])`,
    [pupils.map(p => p.id)]
  )

  let seeded = 0, personasSeeded = 0

  // ── Test personas (named overrides) ──
  const jamie = pupils.find(p => p.email?.startsWith('jamie.okonkwo.test'))
  const amelia = pupils.find(p => p.email?.startsWith('amelia.whitehead.test'))
  const toby = pupils.find(p => p.email?.startsWith('toby.marsh.test'))

  if (jamie) { await insert(jamie.id, TEMPLATES.asthma, reviewerId); personasSeeded++ }
  if (toby) {
    await insert(toby.id, () => ({
      condition: 'Previous shoulder injury (left, 2024 — fully resolved)',
      medication: null, allergies: null, dietary_requirements: null,
      physical_limitations_note: 'Cleared for full-contact sport. Continue pre-match shoulder mobility.',
    }), reviewerId)
    personasSeeded++
  }
  // Amelia intentionally has no medical note.

  // ── Broader roster (~15%, excluding personas) ──
  for (const p of pupils) {
    if ([jamie?.id, amelia?.id, toby?.id].includes(p.id)) continue
    if (!shouldHaveNote(p.id, 15)) continue
    const key = pickTemplate()
    await insert(p.id, TEMPLATES[key], reviewerId)
    seeded++
  }

  console.log(`[seed-medical] Seeded ${personasSeeded} persona notes + ${seeded} roster notes.`)
}

if (process.argv[1]?.includes('seed-medical-notes.js')) {
  run()
    .then(() => process.exit(0))
    .catch(err => { console.error('[seed-medical] Error:', err); process.exit(1) })
}

export { run as seedMedicalNotes }
