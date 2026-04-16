/**
 * Seed reporting windows and published pupil reports for the demo school.
 *
 * Creates:
 *   1. Autumn Report 2025 (closed, all reports published)
 *   2. Updates the Spring Report 2026 (already created by seedCurriculum)
 */

import pool from '../../config/database.js'

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

function generateComment(pupil, sport, grade) {
  const first = pupil.first_name || pupil.name?.split(' ')[0] || 'This pupil'
  const gradeText = { Exc: 'excelling', Sec: 'secure', Dev: 'developing', Beg: 'at an early stage' }
  const level = gradeText[grade] || 'progressing'

  const openers = [
    `${first} has had a productive autumn term in ${sport}.`,
    `${first} has shown consistent effort throughout the ${sport} unit this term.`,
    `It has been a positive start to the year for ${first} in ${sport}.`,
  ]
  const middles = [
    `Performance is ${level} across the key assessment criteria.`,
    `Practical skills are ${level} and ${first} contributes positively to group activities.`,
    `Understanding of tactics and rules is ${level}, with particular strength in teamwork.`,
  ]
  const closers = [
    `${first} should continue to practise core skills regularly to maintain momentum.`,
    `Encouragement to participate in extra-curricular sport would benefit progress further.`,
    `A strong foundation has been built for the spring term units.`,
    `Setting personal targets for technique improvement would be a good next step.`,
  ]

  const hash = (pupil.name || '').length + (sport || '').length
  return `${openers[hash % openers.length]} ${middles[(hash + 1) % middles.length]} ${closers[(hash + 2) % closers.length]}`
}

const PERSONA_COMMENTS = {
  'jamie.okonkwo': 'Jamie has made outstanding progress in his first term. From a quiet start in September, he has grown in confidence across the football unit. His willingness to demonstrate skills in front of the class shows real character. Technically, his right-foot striking is developing well. Areas for spring term focus: left-foot confidence and spatial awareness in small-sided games.',
  'amelia.whitehead': 'Amelia continues to be one of the most talented athletes in Year 9. Her hockey skills are developing rapidly, with particularly strong stick handling and court awareness that transfers from her netball experience. She has taken on a leadership role within the group, often supporting less confident peers. Target for spring: develop reverse-stick technique and written evaluation skills.',
  'toby.marsh': 'Toby has delivered an exceptional autumn term across his GCSE PE programme. His practical football performance is at the top of the grade boundary, with excellent decision-making under pressure and outstanding fitness levels. Theory mock results (78%) show strong anatomy and training knowledge, with socio-cultural influences as the main area for revision. Selected for Norfolk County rugby trials. A thoroughly deserving candidate for the Sports Personality award.',
}

async function seedAutumnReports(schoolId) {
  // Create the Autumn 2025 reporting window (closed)
  const wRes = await pool.query(`
    INSERT INTO reporting_windows (school_id, name, academic_year, term, year_groups, status, opens_at, closes_at, created_at)
    VALUES ($1, 'Autumn Report 2025', '2025-26', 'autumn', $2, 'closed', '2025-11-15', '2025-12-12', NOW())
    RETURNING id
  `, [schoolId, JSON.stringify([7, 9, 11])])
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
    const unit = await findUnit(group.id, 'autumn')
    const pupils = await groupPupils(group.id)

    for (let i = 0; i < pupils.length; i++) {
      const p = pupils[i]
      const grade = AUTUMN_GRADES[i % AUTUMN_GRADES.length]
      const effort = EFFORT_GRADES[i % EFFORT_GRADES.length]
      const sport = unit?.sport || 'PE'

      // Check for persona-specific comments
      const emailKey = p.email?.match(/^([a-z]+\.[a-z]+)\.test@/)?.[1]
      const comment = PERSONA_COMMENTS[emailKey] || generateComment(p, sport, grade)

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
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'published',NOW(),NOW())
        ON CONFLICT DO NOTHING
      `, [
        p.id, windowId, group.id, group.teacher_id,
        unit?.id || null, sport, grade, effort,
        comment, aiDraft,
      ])
      count++
    }
  }

  return count
}

export async function seedReports(schoolId) {
  const autumnCount = await seedAutumnReports(schoolId)
  console.log(`[demo-seed] Reports seeded: ${autumnCount} autumn reports published`)
}
