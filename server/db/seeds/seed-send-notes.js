/**
 * Seed pupil_send_notes across the Ashworth Park demo roster.
 *
 * Distribution: ~8% of pupils carry a SEND note.
 *   35% SpLD (dyslexia, dyscalculia, dyspraxia)
 *   25% ASD / autism spectrum
 *   15% ADHD
 *   10% SEMH
 *   15% physical / sensory / medical-linked
 * Of pupils with SEND, ~30% have EHCP, ~70% SEN Support.
 *
 * Idempotent: wipes existing notes for demo pupils before re-inserting.
 * Runnable standalone:  node server/db/seeds/seed-send-notes.js
 */

import pool from '../../config/database.js'
import dotenv from 'dotenv'

dotenv.config()

const DEMO_SCHOOL_SLUG = 'ashworth-park-demo'

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const TEMPLATES = {
  dyslexia: {
    send_category: 'SpLD — Dyslexia',
    adaptations_required_in_pe: 'No PE adaptations needed. Relevant for written assessment feedback only — use verbal feedback where possible and allow extra time on any written PE tasks.',
    sendco_comment: 'Strong verbal reasoner. Written feedback should be concise and use bullet points.',
  },
  dyscalculia: {
    send_category: 'SpLD — Dyscalculia',
    adaptations_required_in_pe: 'Minimal impact on PE. Support may be needed when interpreting timing/scoring data in GCSE PE theory.',
    sendco_comment: 'Number-based sports data requires scaffolding. Visual representations help.',
  },
  dyspraxia: {
    send_category: 'SpLD — Dyspraxia (DCD)',
    adaptations_required_in_pe: 'Extra practice time on coordination-heavy drills. Pair with patient partner for ball skills. Celebrate progress in process over outcome.',
    sendco_comment: 'Fine and gross motor coordination challenges. Huge effort — emphasise resilience narrative.',
  },
  asd_high: {
    send_category: 'Autism spectrum (ASC)',
    adaptations_required_in_pe: 'Prefers familiar routines; introduce new activities with advance warning. Sensory considerations: may struggle with whistles and loud echoing indoor environments. Offer quiet warm-up option.',
    sendco_comment: 'Communicate changes to lesson plans a day ahead where possible. Literal language interpretation.',
  },
  asd_pda: {
    send_category: 'Autism spectrum (PDA profile)',
    adaptations_required_in_pe: 'Avoid direct commands where possible; frame instructions as choices. Build rapport before pushing technique work.',
    sendco_comment: 'Demand-avoidance profile. Works best when given autonomy within clear structure.',
  },
  adhd: {
    send_category: 'ADHD',
    adaptations_required_in_pe: 'Benefits from high-activity lessons. Short instructions broken into steps. Movement breaks during longer explanations.',
    sendco_comment: 'PE is often the best part of the school day. Channel energy into leadership opportunities.',
  },
  semh: {
    send_category: 'SEMH',
    adaptations_required_in_pe: 'Monitor engagement closely. Sensitive to perceived criticism — private feedback preferred. Allow brief cool-down if distressed.',
    sendco_comment: 'Pastoral plan in place. Report any significant behaviour change to pastoral lead.',
  },
  vi: {
    send_category: 'Sensory — Visual impairment',
    adaptations_required_in_pe: 'High-contrast equipment (yellow/orange balls preferred). Verbal cueing during team games. Partner system for new environments.',
    sendco_comment: 'Low vision, compensates well. Avoid shiny surfaces and strong backlighting.',
  },
  hi: {
    send_category: 'Sensory — Hearing impairment',
    adaptations_required_in_pe: 'Visual hand signals for whistle calls. Ensure pupil can see teacher\'s face during instructions. Position away from loud ambient sources.',
    sendco_comment: 'Uses hearing aids. Spare batteries in medical room.',
  },
  physical: {
    send_category: 'Physical — Mild hemiplegia',
    adaptations_required_in_pe: 'Left-side weakness — favour activities that do not require symmetrical power. Celebrate adapted participation.',
    sendco_comment: 'Physiotherapy input three times a year. Seek PT advice before introducing contact sport.',
  },
}

const WEIGHTS = [
  ['dyslexia', 18], ['dyscalculia', 8], ['dyspraxia', 9],   // 35% SpLD
  ['asd_high', 18], ['asd_pda', 7],                         // 25% ASD
  ['adhd', 15],                                             // 15% ADHD
  ['semh', 10],                                             // 10% SEMH
  ['vi', 5], ['hi', 5], ['physical', 5],                    // 15% physical/sensory
]

function pickTemplate() {
  const total = WEIGHTS.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [k, w] of WEIGHTS) { r -= w; if (r <= 0) return k }
  return 'dyslexia'
}

function shouldHaveNote(pupilId, pct) {
  let h = 0
  for (let i = 0; i < pupilId.length; i++) h = (h * 37 + pupilId.charCodeAt(i)) >>> 0
  return (h % 100) < pct
}

function hasEhcp(pupilId) {
  let h = 0
  for (let i = 0; i < pupilId.length; i++) h = (h * 41 + pupilId.charCodeAt(i)) >>> 0
  return (h % 100) < 30  // ~30% EHCP, ~70% SEN Support
}

let ehcpCounter = 1
function generateEhcpNumber() {
  return `EHCP-NFK-${String(2000 + ehcpCounter++).padStart(5, '0')}`
}

async function insert(pupilId, tpl, ehcp) {
  await pool.query(`
    INSERT INTO pupil_send_notes (
      pupil_id, ehcp_status, ehcp_number,
      send_category, adaptations_required_in_pe, sendco_comment,
      last_reviewed_date
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    pupilId, ehcp, ehcp ? generateEhcpNumber() : null,
    tpl.send_category, tpl.adaptations_required_in_pe, tpl.sendco_comment,
    daysAgo(Math.floor(Math.random() * 270) + 30),
  ])
}

async function run() {
  const sr = await pool.query(`SELECT id FROM schools WHERE slug = $1`, [DEMO_SCHOOL_SLUG])
  if (sr.rows.length === 0) throw new Error('Demo school not found. Run seed:demo first.')
  const schoolId = sr.rows[0].id

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
  console.log(`[seed-send] ${pupils.length} pupils resolved`)

  await pool.query(
    `DELETE FROM pupil_send_notes WHERE pupil_id = ANY($1::uuid[])`,
    [pupils.map(p => p.id)]
  )

  const jamie = pupils.find(p => p.email?.startsWith('jamie.okonkwo.test'))
  const amelia = pupils.find(p => p.email?.startsWith('amelia.whitehead.test'))
  const toby = pupils.find(p => p.email?.startsWith('toby.marsh.test'))

  let personasSeeded = 0, rosterSeeded = 0

  // Jamie: dyslexia, SEN Support (no EHCP), no PE adaptations
  if (jamie) {
    await insert(jamie.id, TEMPLATES.dyslexia, false)
    personasSeeded++
  }
  // Amelia and Toby have no SEND note.

  for (const p of pupils) {
    if ([jamie?.id, amelia?.id, toby?.id].includes(p.id)) continue
    if (!shouldHaveNote(p.id, 8)) continue
    await insert(p.id, TEMPLATES[pickTemplate()], hasEhcp(p.id))
    rosterSeeded++
  }

  console.log(`[seed-send] Seeded ${personasSeeded} persona notes + ${rosterSeeded} roster notes.`)
}

if (process.argv[1]?.includes('seed-send-notes.js')) {
  run()
    .then(() => process.exit(0))
    .catch(err => { console.error('[seed-send] Error:', err); process.exit(1) })
}

export { run as seedSendNotes }
