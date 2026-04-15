/**
 * Seed curriculum data for Greenfield Academy:
 * - Teaching groups (timetabled PE classes)
 * - Sport units per group
 * - Sample pupil assessments
 * - A reporting window with some submitted reports
 */

import pool from '../../config/database.js'

// Returns assessment_scale id for this school (or null if none)
async function getOrCreateScale(schoolId, keyStage) {
  const existing = await pool.query(
    `SELECT id FROM assessment_scales WHERE school_id = $1 AND key_stage = $2 LIMIT 1`,
    [schoolId, keyStage]
  )
  if (existing.rows.length > 0) return existing.rows[0].id

  const grades = keyStage === 'KS3'
    ? [
        { value: 'Exc', label: 'Exceeding', numeric: 4 },
        { value: 'Sec', label: 'Secure',    numeric: 3 },
        { value: 'Dev', label: 'Developing',numeric: 2 },
        { value: 'Beg', label: 'Beginning', numeric: 1 },
      ]
    : [
        { value: 'A*', label: 'A*', numeric: 8 },
        { value: 'A',  label: 'A',  numeric: 7 },
        { value: 'B',  label: 'B',  numeric: 6 },
        { value: 'C',  label: 'C',  numeric: 5 },
        { value: 'D',  label: 'D',  numeric: 4 },
      ]

  const result = await pool.query(`
    INSERT INTO assessment_scales (school_id, name, key_stage, scale_type, grades, is_default)
    VALUES ($1, $2, $3, 'descriptive', $4, true)
    RETURNING id
  `, [schoolId, `${keyStage} Standard Scale`, keyStage, JSON.stringify(grades)])
  return result.rows[0].id
}

async function getSystemStrands(keyStage) {
  const result = await pool.query(
    `SELECT id, strand_name FROM curriculum_strands WHERE key_stage = $1 AND is_system_default = true ORDER BY display_order`,
    [keyStage]
  )
  return result.rows
}

async function createTeachingGroup(schoolId, teacherId, name, yearGroup, keyStage, academicYear) {
  const result = await pool.query(`
    INSERT INTO teaching_groups (school_id, teacher_id, name, year_group, group_identifier, academic_year, key_stage, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING *
  `, [schoolId, teacherId, name, yearGroup, name.replace(/\s+/g, '').slice(0, 10), academicYear, keyStage])
  return result.rows[0]
}

async function addPupilsToGroup(groupId, pupils) {
  for (const pupil of pupils) {
    await pool.query(`
      INSERT INTO teaching_group_pupils (teaching_group_id, pupil_id, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT DO NOTHING
    `, [groupId, pupil.id])
  }
}

async function createSportUnit(groupId, sport, unitName, curriculumArea, term, startDate, endDate, lessonCount) {
  const result = await pool.query(`
    INSERT INTO sport_units (teaching_group_id, sport, unit_name, curriculum_area, term, start_date, end_date, lesson_count, display_order, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, NOW())
    RETURNING *
  `, [groupId, sport, unitName, curriculumArea, term, startDate, endDate, lessonCount])
  return result.rows[0]
}

async function seedAssessments(pupils, unitId, strandId, teacherId) {
  const grades = ['Exc', 'Sec', 'Sec', 'Dev', 'Sec', 'Dev', 'Beg', 'Sec']
  const comments = [
    'Shows excellent understanding of positional play and demonstrates skill under pressure.',
    'Consistently applies techniques learned in class. Good teamwork.',
    'Good progress this term. Positioning has improved significantly.',
    'Developing well. More practice with ball control needed.',
    'Solid technique. Contributes positively to group work.',
    'Effort is commendable. Needs to develop tactical awareness.',
    'Beginning to understand core principles. Encourage at home.',
    'Reliable performer. Leadership qualities evident.',
  ]

  // Get or create criteria
  const criteriaResult = await pool.query(`
    SELECT id FROM assessment_criteria WHERE strand_id = $1 LIMIT 1
  `, [strandId])
  let criteriaId = criteriaResult.rows[0]?.id
  if (!criteriaId) {
    const c = await pool.query(`
      INSERT INTO assessment_criteria (strand_id, criterion, key_stage, display_order)
      VALUES ($1, 'Practical performance in context', 'KS3', 1)
      RETURNING id
    `, [strandId])
    criteriaId = c.rows[0].id
  }

  for (let i = 0; i < pupils.length; i++) {
    const grade = grades[i % grades.length]
    const comment = comments[i % comments.length]
    await pool.query(`
      INSERT INTO pupil_assessments (
        pupil_id, unit_id, criteria_id, assessment_type,
        grade, teacher_notes, assessed_by, assessed_at, created_at
      )
      VALUES ($1, $2, $3, 'formative', $4, $5, $6, NOW() - INTERVAL '2 weeks', NOW())
      ON CONFLICT DO NOTHING
    `, [pupils[i].id, unitId, criteriaId, grade, comment, teacherId])
  }
}

export async function seedCurriculum(schoolId, staff, pupils) {
  const { hodPe, directorOfSport, teacher1, teacher2 } = staff
  const ACADEMIC_YEAR = '2025-26'

  const byYear = (y) => pupils.filter(p => p.year_group === y)
  const year7 = byYear(7)
  const year9 = byYear(9)
  const year11 = byYear(11)
  const year13 = byYear(13)

  const ks3Strands = await getSystemStrands('KS3')
  const ks4Strands = await getSystemStrands('KS4')
  const physicalStrandKs3 = ks3Strands[0] // 'Physical Competence'
  const physicalStrandKs4 = ks4Strands[0] // 'Practical Performance'

  // Year 7 groups
  const y7a = await createTeachingGroup(schoolId, hodPe.id, '7A PE', 7, 'KS3', ACADEMIC_YEAR)
  const y7b = await createTeachingGroup(schoolId, teacher1.id, '7B PE', 7, 'KS3', ACADEMIC_YEAR)
  await addPupilsToGroup(y7a.id, year7.slice(0, 8))
  await addPupilsToGroup(y7b.id, year7.slice(8))

  // Year 9 groups
  const y9a = await createTeachingGroup(schoolId, teacher1.id, '9A PE', 9, 'KS3', ACADEMIC_YEAR)
  const y9b = await createTeachingGroup(schoolId, teacher2.id, '9B PE', 9, 'KS3', ACADEMIC_YEAR)
  await addPupilsToGroup(y9a.id, year9.slice(0, 8))
  await addPupilsToGroup(y9b.id, year9.slice(8))

  // Year 11 group (KS4)
  const y11a = await createTeachingGroup(schoolId, hodPe.id, '11 GCSE PE', 11, 'KS4', ACADEMIC_YEAR)
  await addPupilsToGroup(y11a.id, year11)

  // Year 13 group (KS5)
  const y13a = await createTeachingGroup(schoolId, directorOfSport.id, '13 A-Level PE', 13, 'KS5', ACADEMIC_YEAR)
  await addPupilsToGroup(y13a.id, year13)

  // Sport units for Year 7A
  const unit7aFootball = await createSportUnit(
    y7a.id, 'football', 'Invasion Games: Football', 'invasion_games',
    'autumn', '2025-09-08', '2025-10-24', 6
  )
  const unit7aGymnastics = await createSportUnit(
    y7a.id, 'gymnastics', 'Gymnastics: Sequences', 'gymnastics',
    'spring', '2026-01-07', '2026-02-13', 6
  )

  // Sport units for Year 9A
  const unit9aRugby = await createSportUnit(
    y9a.id, 'rugby', 'Invasion Games: Rugby Union', 'invasion_games',
    'autumn', '2025-09-08', '2025-11-28', 10
  )
  const unit9aAthletics = await createSportUnit(
    y9a.id, 'athletics', 'Athletics: Track & Field', 'athletics',
    'summer', '2026-04-27', '2026-06-19', 6
  )

  // Sport units for Year 9B
  await createSportUnit(
    y9b.id, 'hockey', 'Net/Wall & Striking: Hockey', 'invasion_games',
    'autumn', '2025-09-08', '2025-11-28', 10
  )
  await createSportUnit(
    y9b.id, 'netball', 'Invasion Games: Netball', 'invasion_games',
    'spring', '2026-01-07', '2026-03-27', 10
  )

  // Sport units for Year 11 GCSE
  const unit11Football = await createSportUnit(
    y11a.id, 'football', 'GCSE Practical: Football (Invasion Games)', 'invasion_games',
    'autumn', '2025-09-08', '2025-11-28', 10
  )

  // Year 13 A-Level
  await createSportUnit(
    y13a.id, 'football', 'A-Level: Performance Analysis', 'invasion_games',
    'autumn', '2025-09-08', '2025-12-12', 12
  )

  // Seed some assessments for Year 7A football unit
  if (physicalStrandKs3) {
    await seedAssessments(year7.slice(0, 8), unit7aFootball.id, physicalStrandKs3.id, hodPe.id)
  }

  // Seed some assessments for Year 9A rugby unit
  if (physicalStrandKs3) {
    await seedAssessments(year9.slice(0, 8), unit9aRugby.id, physicalStrandKs3.id, teacher1.id)
  }

  // Seed KS4 assessments for Year 11
  if (physicalStrandKs4) {
    await seedAssessments(year11, unit11Football.id, physicalStrandKs4.id, hodPe.id)
  }

  // Reporting window (spring term, partially completed)
  const windowResult = await pool.query(`
    INSERT INTO reporting_windows (school_id, name, academic_year, term, year_groups, status, opens_at, closes_at, created_at)
    VALUES ($1, 'Spring Report 2026', '2025-26', 'spring', $2, 'open',
            '2026-02-01', '2026-03-31', NOW())
    RETURNING *
  `, [schoolId, [7, 9, 11]])
  const window = windowResult.rows[0]

  // A few submitted pupil reports
  const reportPupils = year7.slice(0, 4)
  for (const pupil of reportPupils) {
    await pool.query(`
      INSERT INTO pupil_reports (
        pupil_id, reporting_window_id, unit_id, sport,
        attainment_grade, effort_grade, teacher_comment, status,
        generated_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, 'football', 'Sec', '4',
              $4, 'submitted', $5, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [
      pupil.id, window.id, unit7aFootball.id,
      `${pupil.name} has worked well this term, showing good understanding of basic football principles. ${pupil.name.split(' ')[0]} is encouraged to continue practising at home.`,
      hodPe.id,
    ])
  }
}
