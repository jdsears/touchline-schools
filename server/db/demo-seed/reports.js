/**
 * Seed reporting windows and published pupil reports for the demo school.
 *
 * Creates:
 *   1. Last term's window (closed, every report published)
 *   2. This term's window (open, part-complete, deadline ahead of today)
 *   3. Two flagged observations for the "Attention needed" panel
 *
 * Which terms those are comes from academicCalendar.js, so the demo is
 * current whenever it is reseeded.
 */

import pool from '../../config/database.js'
import { demoCalendar, addDays } from './academicCalendar.js'

async function findGroup(schoolId, name) {
  const r = await pool.query(
    `SELECT id, teacher_id FROM teaching_groups WHERE school_id = $1 AND name = $2 LIMIT 1`,
    [schoolId, name]
  )
  return r.rows[0] || null
}

async function groupPupils(groupId) {
  const r = await pool.query(
    `SELECT p.id, p.name, p.first_name, u.email FROM teaching_group_pupils tgp
     JOIN pupils p ON p.id = tgp.pupil_id
     LEFT JOIN users u ON u.id = p.user_id
     WHERE tgp.teaching_group_id = $1`,
    [groupId]
  )
  return r.rows
}

async function findUnit(groupId, term) {
  const r = await pool.query(
    `SELECT id, sport FROM sport_units WHERE teaching_group_id = $1 AND term = $2 LIMIT 1`,
    [groupId, term]
  )
  return r.rows[0] || null
}

const AUTUMN_GRADES = ['Sec', 'Dev', 'Exc', 'Sec', 'Dev', 'Sec', 'Beg', 'Sec', 'Dev', 'Sec', 'Sec', 'Dev', 'Exc', 'Sec', 'Dev']
const EFFORT_GRADES = ['4', '3', '5', '4', '3', '4', '3', '5', '3', '4', '4', '3', '5', '4', '3']

function generateComment(pupil, sport, grade, termLabel, nextTermLabel) {
  const first = pupil.first_name || pupil.name?.split(' ')[0] || 'This pupil'
  const gradeText = { Exc: 'excelling', Sec: 'secure', Dev: 'developing', Beg: 'at an early stage' }
  const level = gradeText[grade] || 'progressing'
  const term = termLabel.toLowerCase()
  const nextTerm = nextTermLabel.toLowerCase()

  const openers = [
    `${first} has had a productive ${term} term in ${sport}.`,
    `${first} has shown consistent effort throughout the ${sport} unit this term.`,
    `It has been a positive ${term} term for ${first} in ${sport}.`,
  ]
  const middles = [
    `Performance is ${level} across the key assessment criteria.`,
    `Practical skills are ${level} and ${first} contributes positively to group activities.`,
    `Understanding of tactics and rules is ${level}, with particular strength in teamwork.`,
  ]
  const closers = [
    `${first} should continue to practise core skills regularly to maintain momentum.`,
    `Encouragement to participate in extra-curricular sport would benefit progress further.`,
    `A strong foundation has been built for the ${nextTerm} term units.`,
    `Setting personal targets for technique improvement would be a good next step.`,
  ]

  const hash = (pupil.name || '').length + (sport || '').length
  return `${openers[hash % openers.length]} ${middles[(hash + 1) % middles.length]} ${closers[(hash + 2) % closers.length]}`
}

const PERSONA_COMMENTS = {
  'jamie.okonkwo': 'Jamie has made outstanding progress this term. From a quiet start, he has grown in confidence across the football unit. His willingness to demonstrate skills in front of the class shows real character. Technically, his right-foot striking is developing well. Areas of focus for next term: left-foot confidence and spatial awareness in small-sided games.',
  'amelia.whitehead': 'Amelia continues to be one of the most talented athletes in Year 9. Her hockey skills are developing rapidly, with particularly strong stick handling and court awareness that transfers from her netball experience. She has taken on a leadership role within the group, often supporting less confident peers. Target for next term: develop reverse-stick technique and written evaluation skills.',
  'toby.marsh': 'Toby has delivered an exceptional term across his GCSE PE programme. His practical football performance is at the top of the grade boundary, with excellent decision-making under pressure and outstanding fitness levels. Theory mock results (78%) show strong anatomy and training knowledge, with socio-cultural influences as the main area for revision. Selected for Norfolk County rugby trials. A thoroughly deserving candidate for the Sports Personality award.',
}

async function seedPreviousTermReports(schoolId, cal) {
  // Last term's window: closed a week before the term ended, every report published.
  const term = cal.previous
  const opensAt = addDays(term.end, -35)
  const closesAt = addDays(term.end, -7)
  const publishedAt = addDays(closesAt, -2)
  const wRes = await pool.query(`
    INSERT INTO reporting_windows (school_id, name, academic_year, term, year_groups, status, opens_at, closes_at, created_at)
    VALUES ($1, $2, $3, $4, $5, 'closed', $6, $7, $6)
    RETURNING id
  `, [schoolId, term.windowName, term.academicYear, term.key, [7, 9, 11], opensAt, closesAt])
  const windowId = wRes.rows[0].id

  const groups = [
    { name: '7A PE', ks: 'KS3' },
    { name: '7B PE', ks: 'KS3' },
    { name: '9A PE', ks: 'KS3' },
    { name: '9B PE', ks: 'KS3' },
    { name: '11 GCSE PE', ks: 'KS4' },
  ]

  let count = 0
  for (const g of groups) {
    const group = await findGroup(schoolId, g.name)
    if (!group) continue
    const unit = await findUnit(group.id, term.key)
    const pupils = await groupPupils(group.id)

    for (let i = 0; i < pupils.length; i++) {
      const p = pupils[i]
      const grade = AUTUMN_GRADES[i % AUTUMN_GRADES.length]
      const effort = EFFORT_GRADES[i % EFFORT_GRADES.length]
      const sport = unit?.sport || 'PE'

      // Check for persona-specific comments
      const emailKey = p.email?.match(/^([a-z]+\.[a-z]+)\.test@/)?.[1]
      const comment = PERSONA_COMMENTS[emailKey] || generateComment(p, sport, grade, term.label, cal.current.label)

      // Some reports have an AI draft that was edited (showing human-in-the-loop)
      const aiDraft = (i < 2)
        ? comment.replace(/outstanding|exceptional|excellent/gi, 'good').replace(/one of the most talented/g, 'a talented')
        : null

      await pool.query(`
        INSERT INTO pupil_reports (
          pupil_id, reporting_window_id, teaching_group_id, teacher_id,
          unit_id, sport, attainment_grade, effort_grade,
          teacher_comment, ai_draft, status,
          created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'published',$11,$11)
        ON CONFLICT DO NOTHING
      `, [
        p.id, windowId, group.id, group.teacher_id,
        unit?.id || null, sport, grade, effort,
        comment, aiDraft, publishedAt,
      ])
      count++
    }
  }

  return count
}

async function seedCurrentTermWindow(schoolId, cal) {
  // Open reporting window straddling today, partially completed so the
  // "Attention needed" panel shows a progress bar and a deadline ahead.
  const term = cal.current
  const opensAt = addDays(cal.today, -10)
  const closesAt = addDays(cal.today, 11)
  const wRes = await pool.query(`
    INSERT INTO reporting_windows (school_id, name, academic_year, term, year_groups, status, opens_at, closes_at, created_at)
    VALUES ($1, $2, $3, $4, $5, 'open', $6, $7, $6)
    RETURNING id
  `, [schoolId, term.windowName, term.academicYear, term.key, [7, 9, 11], opensAt, closesAt])
  const windowId = wRes.rows[0].id

  const groups = [
    { name: '7A PE', ks: 'KS3' },
    { name: '9B PE', ks: 'KS3' },
    { name: '11 GCSE PE', ks: 'KS4' },
  ]

  let submitted = 0
  let total = 0
  for (const g of groups) {
    const group = await findGroup(schoolId, g.name)
    if (!group) continue
    const unit = await findUnit(group.id, term.key)
    const pupils = await groupPupils(group.id)

    for (let i = 0; i < pupils.length; i++) {
      const p = pupils[i]
      const grade = AUTUMN_GRADES[i % AUTUMN_GRADES.length]
      const effort = EFFORT_GRADES[i % EFFORT_GRADES.length]
      const sport = unit?.sport || 'PE'
      const comment = generateComment(p, sport, grade, term.label, cal.next.label)

      // First ~40% of each group submitted, rest in draft
      const status = i < Math.ceil(pupils.length * 0.4) ? 'submitted' : 'draft'

      await pool.query(`
        INSERT INTO pupil_reports (
          pupil_id, reporting_window_id, teaching_group_id, teacher_id,
          unit_id, sport, attainment_grade, effort_grade,
          teacher_comment, status, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
        ON CONFLICT DO NOTHING
      `, [
        p.id, windowId, group.id, group.teacher_id,
        unit?.id || null, sport, grade, effort,
        status === 'submitted' ? comment : null, status,
      ])
      total++
      if (status === 'submitted') submitted++
    }
  }

  return { submitted, total }
}

async function seedFlaggedObservations(schoolId) {
  // Recent concern/welfare observations that show up in "Attention needed".
  // Targets pupils who have a team_id (the attention query JOINs through teams).
  const staffRes = await pool.query(
    `SELECT u.id FROM users u JOIN school_members sm ON sm.user_id = u.id
     WHERE sm.school_id = $1 AND u.is_demo_user = true
     ORDER BY u.name LIMIT 2`,
    [schoolId]
  )
  if (staffRes.rows.length === 0) return 0

  const pupilRes = await pool.query(
    `SELECT p.id FROM pupils p
     JOIN school_members sm ON sm.user_id = p.user_id AND sm.school_id = $1
     WHERE p.team_id IS NOT NULL AND p.is_active = true
     ORDER BY p.year_group DESC LIMIT 3`,
    [schoolId]
  )
  if (pupilRes.rows.length === 0) return 0

  const flags = [
    {
      pupilId: pupilRes.rows[0]?.id,
      observerId: staffRes.rows[0]?.id,
      type: 'welfare',
      content: 'Appeared quiet and disengaged during today\'s session. Did not participate in the warm-up and asked to sit out. This is unusual — normally one of the most enthusiastic in the group. Worth monitoring over the next few sessions.',
      daysAgo: 3,
    },
    {
      pupilId: pupilRes.rows[1]?.id || pupilRes.rows[0]?.id,
      observerId: staffRes.rows[1]?.id || staffRes.rows[0]?.id,
      type: 'concern',
      content: 'Noticed bruising on right forearm during hockey lesson. Pupil said it was from a fall at home over the weekend. Seemed comfortable discussing it but logging for awareness as per school policy.',
      daysAgo: 1,
    },
  ]

  let count = 0
  for (const f of flags) {
    if (!f.pupilId || !f.observerId) continue
    await pool.query(`
      INSERT INTO observations (pupil_id, observer_id, type, content, context_type, source, review_state, created_at)
      VALUES ($1, $2, $3, $4, 'pe_lesson', 'typed', 'confirmed', NOW() - INTERVAL '${f.daysAgo} days')
    `, [f.pupilId, f.observerId, f.type, f.content])
    count++
  }
  return count
}

export async function seedReports(schoolId) {
  const cal = demoCalendar()
  const previousCount = await seedPreviousTermReports(schoolId, cal)
  const current = await seedCurrentTermWindow(schoolId, cal)
  const flagCount = await seedFlaggedObservations(schoolId)
  console.log(`[demo-seed] Reports seeded: ${previousCount} published in ${cal.previous.windowName}, ${cal.current.windowName} open (${current.submitted}/${current.total}), ${flagCount} flagged observations`)
}
