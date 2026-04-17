/**
 * Seed assessment data across all teaching groups for the demo school.
 *
 * Runs AFTER seedCurriculum and seedLessons so strands, groups, and
 * units already exist.
 */

import pool from '../../config/database.js'

async function getStrands(keyStage) {
  const r = await pool.query(
    `SELECT id, strand_name FROM curriculum_strands WHERE key_stage = $1 AND is_system_default = true ORDER BY display_order`,
    [keyStage]
  )
  return r.rows
}

async function getOrCreateCriteria(strandId, keyStage, label) {
  const r = await pool.query(`SELECT id FROM assessment_criteria WHERE strand_id = $1 LIMIT 1`, [strandId])
  if (r.rows[0]) return r.rows[0].id
  const c = await pool.query(
    `INSERT INTO assessment_criteria (strand_id, criterion, criterion_name, key_stage, display_order)
     VALUES ($1, $2, $2, $3, 1) RETURNING id`,
    [strandId, label, keyStage]
  )
  return c.rows[0].id
}

async function groupPupils(groupId) {
  const r = await pool.query(
    `SELECT p.id, p.name, u.email FROM teaching_group_pupils tgp
     JOIN pupils p ON p.id = tgp.pupil_id
     LEFT JOIN users u ON u.id = p.user_id
     WHERE tgp.teaching_group_id = $1`,
    [groupId]
  )
  return r.rows
}

async function findGroup(schoolId, name) {
  const r = await pool.query(
    `SELECT id, teacher_id FROM teaching_groups WHERE school_id = $1 AND name = $2 LIMIT 1`,
    [schoolId, name]
  )
  return r.rows[0] || null
}

async function findUnit(groupId, term) {
  const r = await pool.query(
    `SELECT id FROM sport_units WHERE teaching_group_id = $1 AND term = $2 LIMIT 1`,
    [groupId, term]
  )
  return r.rows[0]?.id || null
}

// Grade distribution: weighted random selection
const KS3_DIST = ['Sec', 'Dev', 'Sec', 'Exc', 'Dev', 'Sec', 'Sec', 'Beg', 'Dev', 'Sec']
const KS4_DIST = ['B', 'C', 'B', 'A', 'C', 'B', 'B', 'D', 'C', 'B']

const COMMENTS_KS3 = [
  'Demonstrates good understanding in practical contexts. Continues to improve.',
  'Works hard and shows steady progress. Could push further with more practice outside lessons.',
  'Strong practical skills. Needs to develop written evaluation ability.',
  'Excellent effort and attitude. Emerging understanding of tactical concepts.',
  'Consistent performer who contributes well to group activities.',
]

const COMMENTS_KS4 = [
  'Shows secure understanding of the theoretical content. Practical performance is a strength.',
  'Good analytical skills demonstrated in coursework. Needs to apply these in practical contexts.',
  'Strong practical performer with developing theoretical knowledge.',
  'Excellent across both practical and theoretical components. On track for top grades.',
  'Committed student who is making good progress. Theory revision would strengthen overall grade.',
]

// Persona-specific grade overrides
const PERSONA_GRADES = {
  'jamie.okonkwo': {
    ks3: { 'Physical Competence': 'Sec', 'Rules, Strategies and Tactics': 'Dev', 'Health and Fitness': 'Sec', 'Evaluation and Improvement': 'Dev' },
    comment: 'Jamie has made excellent progress since September. His football skills are secure and his confidence has grown. Gymnastics requires more work on body tension and sequence fluency.'
  },
  'amelia.whitehead': {
    ks3: { 'Physical Competence': 'Exc', 'Rules, Strategies and Tactics': 'Sec', 'Health and Fitness': 'Exc', 'Evaluation and Improvement': 'Sec' },
    comment: 'Amelia is a talented multi-sport athlete who excels in practical contexts. Her evaluation skills are developing well. A natural leader in group work.'
  },
  'toby.marsh': {
    ks4: { 'Practical Performance': 'A', 'Analysis and Evaluation': 'A', 'Anatomy and Physiology': 'B', 'Physical Training': 'A', 'Sport Psychology': 'B', 'Socio-cultural Influences': 'C' },
    comment: 'Toby is one of the strongest GCSE PE candidates in the cohort. His practical performance is outstanding. Theory work in socio-cultural influences needs more revision focus before the exam.'
  },
}

function personaKey(email) {
  if (!email) return null
  const match = email.match(/^([a-z]+\.[a-z]+)\.test@/)
  return match ? match[1] : null
}

async function assessGroup(schoolId, groupName, keyStage, term, assessedAt) {
  const group = await findGroup(schoolId, groupName)
  if (!group) return 0

  const unitId = await findUnit(group.id, term)
  const strands = await getStrands(keyStage)
  const pupils = await groupPupils(group.id)
  const teacherId = group.teacher_id
  const dist = keyStage === 'KS3' ? KS3_DIST : KS4_DIST
  const comments = keyStage === 'KS3' ? COMMENTS_KS3 : COMMENTS_KS4
  let count = 0

  for (const strand of strands) {
    const criteriaId = await getOrCreateCriteria(strand.id, keyStage, strand.strand_name)
    for (let i = 0; i < pupils.length; i++) {
      const p = pupils[i]
      const pKey = personaKey(p.email)
      const personaOverrides = pKey ? PERSONA_GRADES[pKey] : null

      let grade
      let comment = null
      if (personaOverrides) {
        const overrides = personaOverrides[keyStage.toLowerCase()]
        grade = overrides?.[strand.strand_name] || dist[i % dist.length]
        comment = personaOverrides.comment
      } else {
        grade = dist[(i + strands.indexOf(strand)) % dist.length]
        if (i < 5) comment = comments[i % comments.length]
      }

      const ins = await pool.query(`
        INSERT INTO pupil_assessments (
          pupil_id, unit_id, criteria_id, assessment_type,
          grade, teacher_notes, assessed_by, assessed_at, created_at
        ) VALUES ($1,$2,$3,'formative',$4,$5,$6,$7,NOW())
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [p.id, unitId, criteriaId, grade, comment, teacherId, assessedAt])
      if (ins.rowCount > 0) count++
    }
  }
  return count
}

export async function seedAssessments(schoolId) {
  let total = 0
  const autumnDate = '2025-12-06'
  const springDate = '2026-03-01'

  // Autumn term: fully assessed (all groups)
  total += await assessGroup(schoolId, '7A PE', 'KS3', 'autumn', autumnDate)
  total += await assessGroup(schoolId, '7B PE', 'KS3', 'autumn', autumnDate)
  total += await assessGroup(schoolId, '9A PE', 'KS3', 'autumn', autumnDate)
  total += await assessGroup(schoolId, '9B PE', 'KS3', 'autumn', autumnDate)
  total += await assessGroup(schoolId, '11 GCSE PE', 'KS4', 'autumn', autumnDate)

  // Spring term: partially assessed (only some groups, simulates in-progress)
  total += await assessGroup(schoolId, '7A PE', 'KS3', 'spring', springDate)
  total += await assessGroup(schoolId, '9B PE', 'KS3', 'spring', springDate)

  if (total === 0) {
    console.warn(`[demo-seed] WARNING: Assessments seeded 0 records - check teaching groups, strands, or schema drift`)
  } else {
    console.log(`[demo-seed] Assessments seeded: ${total} records`)
  }
}
