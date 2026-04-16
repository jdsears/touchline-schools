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

// Ensure required columns exist (in case seed runs before server startup)
async function ensureColumns() {
  const stmts = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_test_persona BOOLEAN DEFAULT false`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS protected_from_reset BOOLEAN DEFAULT false`,
    `ALTER TABLE pupils ADD COLUMN IF NOT EXISTS protected_from_reset BOOLEAN DEFAULT false`,
    `ALTER TABLE observations ADD COLUMN IF NOT EXISTS sport TEXT`,
    `ALTER TABLE observations ADD COLUMN IF NOT EXISTS teaching_group_id UUID`,
    `ALTER TABLE observations ADD COLUMN IF NOT EXISTS visible_to_pupil BOOLEAN NOT NULL DEFAULT FALSE`,
  ]
  for (const sql of stmts) {
    await pool.query(sql).catch(() => {})
  }
}

let _hash
async function getHash() {
  if (!_hash) _hash = await bcrypt.hash('pupil-demo-no-login', 10)
  return _hash
}

function dobForYear(yearGroup) {
  const baseYear = 2026 - yearGroup - 11
  const months = { 7: '03-14', 9: '08-22', 11: '11-05' }
  return `${baseYear}-${months[yearGroup] || '06-15'}`
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
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

async function findStaffByEmail(emailPrefix) {
  const r = await pool.query(
    `SELECT id FROM users WHERE email LIKE $1 AND is_demo_user = true LIMIT 1`,
    [`${emailPrefix}%`]
  )
  return r.rows[0]?.id || null
}

async function findSportUnit(groupId, sport) {
  if (!groupId) return null
  const r = await pool.query(
    `SELECT id FROM sport_units WHERE teaching_group_id = $1 AND sport = $2 LIMIT 1`,
    [groupId, sport]
  )
  return r.rows[0]?.id || null
}

async function findCriteria(unitId) {
  if (!unitId) return null
  const r = await pool.query(`
    SELECT ac.id FROM assessment_criteria ac
    JOIN curriculum_strands cs ON cs.id = ac.strand_id
    JOIN sport_units su ON su.teaching_group_id IN (
      SELECT teaching_group_id FROM sport_units WHERE id = $1
    )
    LIMIT 1
  `, [unitId])
  return r.rows[0]?.id || null
}

// ── Observation helpers ────────────────────────────────────────────
async function addObs(pupilId, observerId, { type, content, contextType, sport, source, createdAt, matchId, teachingGroupId }) {
  await pool.query(`
    INSERT INTO observations (
      pupil_id, observer_id, type, content,
      context_type, sport, source, review_state,
      match_id, teaching_group_id, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', $8, $9, $10)
  `, [
    pupilId, observerId, type, content,
    contextType || 'general', sport || null, source || 'typed',
    matchId || null, teachingGroupId || null, createdAt || daysAgo(3),
  ])
}

async function addAssessment(pupilId, unitId, criteriaId, teacherId, grade, comment) {
  if (!unitId || !criteriaId) return
  await pool.query(`
    INSERT INTO pupil_assessments (
      pupil_id, unit_id, criteria_id, assessment_type,
      grade, teacher_notes, assessed_by, assessed_at, created_at
    )
    VALUES ($1, $2, $3, 'formative', $4, $5, $6, NOW() - INTERVAL '2 weeks', NOW())
    ON CONFLICT DO NOTHING
  `, [pupilId, unitId, criteriaId, grade, comment, teacherId])
}

async function insertTestPersona(schoolId, { name, yearGroup, house, gender }) {
  const hash = await getHash()
  const email = `${name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '')}.test@ashworthpark.norfolk.sch.uk`

  const firstName = name.split(' ')[0]
  const lastName = name.split(' ').slice(1).join(' ')

  // Check if this persona already exists (survives reset via protected_from_reset)
  const existing = await pool.query(
    `SELECT u.id AS user_id, p.id, p.name, p.first_name, p.last_name,
            p.year_group, p.house, p.date_of_birth, p.is_active, p.protected_from_reset
     FROM users u
     JOIN pupils p ON p.user_id = u.id
     WHERE u.email = $1 AND u.is_test_persona = true`,
    [email]
  )

  let userId, pupil
  if (existing.rows.length > 0) {
    // Re-link existing protected persona to new school
    userId = existing.rows[0].user_id
    pupil = existing.rows[0]
    // Refresh expiry
    await pool.query(
      `UPDATE users SET demo_expires_at = NOW() + INTERVAL '7 days' WHERE id = $1`,
      [userId]
    )
  } else {
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
    userId = userRes.rows[0].id

    // Create pupil record
    const pupilRes = await pool.query(`
      INSERT INTO pupils (name, first_name, last_name,
                          year_group, house, date_of_birth,
                          is_active, protected_from_reset, user_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, true, true, $7, NOW())
      RETURNING *
    `, [name, firstName, lastName, yearGroup, house, dobForYear(yearGroup), userId])
    pupil = pupilRes.rows[0]
  }

  // (Re-)create school membership — may have been cascade-deleted with old school
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
// Y7 new starter, enthusiastic but raw. Football is his main sport.
// Narrative arc: nervous start → growing confidence → standout moment.
async function seedJamie(schoolId) {
  const jamie = await insertTestPersona(schoolId, {
    name: 'Jamie Okonkwo',
    yearGroup: 7,
    house: 'Elm',
    gender: 'male',
  })

  const footballId = await findTeam(schoolId, 'Year 7 Boys Football')
  await linkToTeam(jamie, footballId)

  const groupId = await findTeachingGroup(schoolId, '7A PE')
  await linkToTeachingGroup(jamie, groupId)

  // Look up staff
  const hodPeId = await findStaffByEmail('j.okonkwo.demo')
  const teacher1Id = await findStaffByEmail('d.brennan.demo')
  const observerId = teacher1Id || hodPeId

  // Observations — football development arc
  if (observerId) {
    await addObs(jamie.id, observerId, {
      type: 'lesson_observation', contextType: 'pe_lesson', sport: 'football', source: 'typed',
      content: 'First football lesson of the term. Jamie was quiet initially but showed good natural balance and a willingness to try new things. Needs to work on receiving the ball on the back foot.',
      createdAt: daysAgo(84), teachingGroupId: groupId,
    })
    await addObs(jamie.id, observerId, {
      type: 'training_note', contextType: 'training_session', sport: 'football', source: 'typed',
      content: 'After-school football — Jamie is starting to find his feet in the group. Played on the right side of a 3v3 and made several good runs into space. Still hesitant to shoot.',
      createdAt: daysAgo(63),
    })
    await addObs(jamie.id, observerId, {
      type: 'attitude_effort', contextType: 'pe_lesson', sport: 'football', source: 'voice',
      content: 'Jamie volunteered to demonstrate the turn-and-shoot drill in front of the class today. Huge step forward in confidence. Technique was decent — encouraged him to keep practising at break.',
      createdAt: daysAgo(42), teachingGroupId: groupId,
    })
    await addObs(jamie.id, observerId, {
      type: 'match_performance', contextType: 'match', sport: 'football', source: 'typed',
      content: 'First competitive fixture vs Northgate High (home, 4-0 win). Jamie came on at half-time and scored within 10 minutes — a tidy finish from the edge of the box. Looked composed under pressure for his first game.',
      createdAt: daysAgo(32),
    })
    await addObs(jamie.id, observerId, {
      type: 'technical_skill', contextType: 'training_session', sport: 'football', source: 'voice',
      content: 'Working on Jamie\'s weaker left foot in 1-to-1 session. He can strike cleanly with his right but the left is inconsistent. Set a target of 10 accurate left-foot passes per session. Good attitude — stayed behind to practise.',
      createdAt: daysAgo(18),
    })
    await addObs(jamie.id, hodPeId || observerId, {
      type: 'development', contextType: 'general', sport: 'football', source: 'typed',
      content: 'Mid-year review: Jamie has made excellent progress since September. From a shy, quiet starter to one of our most improved Year 7 pupils. Technically developing well; his confidence on the ball has grown noticeably. Recommend for district development programme trials in the spring.',
      createdAt: daysAgo(5),
    })

    // Gymnastics lesson observation (cross-curricular)
    await addObs(jamie.id, observerId, {
      type: 'lesson_observation', contextType: 'pe_lesson', sport: 'gymnastics', source: 'typed',
      content: 'Gymnastics unit: Jamie found the balance sequences challenging but persevered throughout. Good body tension on the forward roll. Slightly apprehensive on the vault approach — paired him with a confident partner for peer coaching.',
      createdAt: daysAgo(25), teachingGroupId: groupId,
    })
  }

  // Assessment — Y7A Football unit
  const unitId = await findSportUnit(groupId, 'football')
  const criteriaId = await findCriteria(unitId)
  if (hodPeId) {
    await addAssessment(jamie.id, unitId, criteriaId, hodPeId, 'Sec',
      'Jamie has shown secure understanding of basic invasion game principles. Strong progress from a below-expected baseline at the start of term. Movement off the ball is his best attribute.')
  }

  console.log(`[test-personas] Jamie Okonkwo (Y7) seeded with sporting content`)
  return jamie
}

// ── Amelia Whitehead ───────────────────────────────────────────────
// Y9 multi-sport athlete. Plays netball (GS/GA) and hockey (centre mid).
// Narrative arc: strong base → managing two sports → leadership emerging.
async function seedAmelia(schoolId) {
  const amelia = await insertTestPersona(schoolId, {
    name: 'Amelia Whitehead',
    yearGroup: 9,
    house: 'Oak',
    gender: 'female',
  })

  const netballId = await findTeam(schoolId, 'Year 9 Girls Netball')
  const hockeyId = await findTeam(schoolId, 'Year 9 Girls Hockey')
  await linkToTeam(amelia, netballId)
  await linkToTeam(amelia, hockeyId)

  const groupId = await findTeachingGroup(schoolId, '9B PE')
  await linkToTeachingGroup(amelia, groupId)

  // Look up staff
  const teacher2Id = await findStaffByEmail('p.sharma.demo')  // hockey/netball specialist
  const hodPeId = await findStaffByEmail('j.okonkwo.demo')
  const directorId = await findStaffByEmail('s.whitfield.demo')
  const observerId = teacher2Id || hodPeId

  if (observerId) {
    // ── Netball observations ──
    await addObs(amelia.id, observerId, {
      type: 'tactical_awareness', contextType: 'training_session', sport: 'netball', source: 'typed',
      content: 'Amelia reads the game exceptionally well for her age. In today\'s centre-pass drill she consistently timed her lead to create space at the top of the circle. Needs to strengthen her non-dominant hand for catching under pressure.',
      createdAt: daysAgo(70),
    })
    await addObs(amelia.id, observerId, {
      type: 'match_performance', contextType: 'match', sport: 'netball', source: 'typed',
      content: 'County Cup round 2 vs Sacred Heart (away, 32-29 win). Amelia played GA and was our top scorer with 14 goals. Her movement in the circle was outstanding — sharp changes of direction that the defence couldn\'t handle. Converted 14/17 attempts.',
      createdAt: daysAgo(56),
    })
    await addObs(amelia.id, observerId, {
      type: 'leadership', contextType: 'training_session', sport: 'netball', source: 'voice',
      content: 'Amelia took the initiative to organise warm-up when I was delayed setting up equipment. Led the group through a structured passing warm-up without being asked. Natural leader — considering her for vice-captain next season.',
      createdAt: daysAgo(35),
    })
    await addObs(amelia.id, observerId, {
      type: 'match_performance', contextType: 'match', sport: 'netball', source: 'typed',
      content: 'Disappointing result vs Thorpe St Andrew (home, 19-21 loss). Amelia worked hard but was frustrated by physical marking. Lost composure briefly in the third quarter — spoke to her about managing emotions in tight games. Bounced back well in Q4.',
      createdAt: daysAgo(14),
    })

    // ── Hockey observations ──
    await addObs(amelia.id, observerId, {
      type: 'technical_skill', contextType: 'pe_lesson', sport: 'hockey', source: 'typed',
      content: 'Hockey unit lesson 3: Amelia\'s stick handling is developing well. She transfers her netball footwork to hockey effectively — quick feet and good balance. The reverse-stick hit needs work; she tends to slice across the ball rather than striking through it.',
      createdAt: daysAgo(65), teachingGroupId: groupId,
    })
    await addObs(amelia.id, observerId, {
      type: 'match_performance', contextType: 'match', sport: 'hockey', source: 'voice',
      content: 'Friendly vs Hethersett Academy (away, 2-2 draw). Amelia played centre midfield and covered a huge amount of ground. Won several 50-50 challenges cleanly. Her distribution is improving — linked play well between defence and attack.',
      createdAt: daysAgo(40),
    })
    await addObs(amelia.id, observerId, {
      type: 'physical_development', contextType: 'training_session', sport: 'hockey', source: 'typed',
      content: 'Discussed managing training load with Amelia — she\'s training netball twice a week and hockey once, plus matches in both. She seems to be coping well physically but mentioned feeling tired on Fridays. Suggested she takes Thursday evening off to rest before Friday hockey.',
      createdAt: daysAgo(22),
    })

    // ── Cross-sport development ──
    await addObs(amelia.id, directorId || hodPeId || observerId, {
      type: 'development', contextType: 'general', source: 'typed',
      content: 'Multi-sport review: Amelia is one of our strongest Year 9 athletes across both netball and hockey. Her transferable skills (court/pitch awareness, composure, fitness) are evident in both sports. She has expressed interest in trying athletics in the summer term. Recommend for the Norfolk School Games netball squad selection.',
      createdAt: daysAgo(7),
    })
  }

  // Assessments — 9B PE hockey unit
  const hockeyUnitId = await findSportUnit(groupId, 'hockey')
  const hockeyCriteria = await findCriteria(hockeyUnitId)
  if (observerId) {
    await addAssessment(amelia.id, hockeyUnitId, hockeyCriteria, observerId, 'Exc',
      'Amelia is exceeding expectations in hockey. Excellent transferable skills from netball — spatial awareness, movement, and competitive drive. Reverse-stick technique is the main area for development.')
  }

  // Netball unit assessment (from 9B if exists)
  const netballUnitId = await findSportUnit(groupId, 'netball')
  const netballCriteria = await findCriteria(netballUnitId)
  if (observerId) {
    await addAssessment(amelia.id, netballUnitId, netballCriteria, observerId, 'Exc',
      'Outstanding practical ability and tactical understanding. Amelia reads the game at a level well above her peers. Strong shooter and an increasingly effective leader on court.')
  }

  console.log(`[test-personas] Amelia Whitehead (Y9) seeded with sporting content`)
  return amelia
}

// ── Toby Marsh ─────────────────────────────────────────────────────
// Y11 GCSE PE student. Football (CB/CDM) and rugby (blindside flanker).
// Narrative arc: established leader → GCSE pressure → county selection.
async function seedToby(schoolId) {
  const toby = await insertTestPersona(schoolId, {
    name: 'Toby Marsh',
    yearGroup: 11,
    house: 'Maple',
    gender: 'male',
  })

  const footballId = await findTeam(schoolId, 'Year 11 Boys Football')
  const rugbyId = await findTeam(schoolId, 'Year 11 Boys Rugby')
  await linkToTeam(toby, footballId)
  await linkToTeam(toby, rugbyId)

  const groupId = await findTeachingGroup(schoolId, '11 GCSE PE')
  await linkToTeachingGroup(toby, groupId)

  // Look up staff
  const hodPeId = await findStaffByEmail('j.okonkwo.demo')
  const teacher1Id = await findStaffByEmail('d.brennan.demo')  // football/rugby specialist
  const observerId = teacher1Id || hodPeId

  if (observerId) {
    // ── Football observations ──
    await addObs(toby.id, observerId, {
      type: 'tactical_awareness', contextType: 'training_session', sport: 'football', source: 'typed',
      content: 'Toby is reading the game superbly from centre-back. In today\'s 11v11 he intercepted three through-balls by anticipating the pass before it was played. His communication with the goalkeeper and full-backs is a real strength — organises the defensive line well.',
      createdAt: daysAgo(75),
    })
    await addObs(toby.id, observerId, {
      type: 'match_performance', contextType: 'match', sport: 'football', source: 'typed',
      content: 'District Cup semi-final vs Riverside Academy (away, 2-2 draw). Toby was captain and put in a commanding performance at CB. Won every aerial duel and made a crucial last-ditch tackle in the 70th minute. His composure on the ball allowed us to play out from the back effectively.',
      createdAt: daysAgo(50),
    })
    await addObs(toby.id, observerId, {
      type: 'leadership', contextType: 'match', sport: 'football', source: 'voice',
      content: 'Post-match debrief after the Wymondham away win (1-0). Toby led the huddle unprompted and gave specific, constructive feedback to younger players who had been called up. His leadership style is calm and encouraging — exactly what we want from a captain.',
      createdAt: daysAgo(30),
    })
    await addObs(toby.id, observerId, {
      type: 'technical_skill', contextType: 'training_session', sport: 'football', source: 'typed',
      content: 'Worked on Toby\'s distribution today. His short passing under pressure is excellent but his longer diagonal switches of play are inconsistent. Focused on body shape and follow-through for 40-yard passes. Improvement visible by end of session.',
      createdAt: daysAgo(15),
    })

    // ── Rugby observations ──
    await addObs(toby.id, teacher1Id || observerId, {
      type: 'physical_development', contextType: 'training_session', sport: 'rugby', source: 'typed',
      content: 'Toby\'s physicality is a major asset at blindside flanker. His tackle technique is textbook — low, driving through the legs, wrapping arms. He\'s added 3kg of muscle since September. Fitness testing shows he\'s one of the quickest in the squad over 10m despite his size.',
      createdAt: daysAgo(60),
    })
    await addObs(toby.id, teacher1Id || observerId, {
      type: 'match_performance', contextType: 'match', sport: 'rugby', source: 'voice',
      content: 'Norfolk Schools Cup vs Norwich School (away, 15-22 loss). A tough match — Norwich were very strong up front. Toby was our best player, making 14 tackles and carrying hard every time he got the ball. Unlucky not to score from a driving maul in the second half.',
      createdAt: daysAgo(45),
    })
    await addObs(toby.id, teacher1Id || observerId, {
      type: 'resilience', contextType: 'match', sport: 'rugby', source: 'typed',
      content: 'After the Norwich loss, Toby was visibly disappointed but handled it maturely. He asked for specific areas to improve and was first to training the following week. His determination to bounce back is exactly the attitude we want the younger players to see.',
      createdAt: daysAgo(40),
    })
    await addObs(toby.id, teacher1Id || observerId, {
      type: 'match_performance', contextType: 'match', sport: 'rugby', source: 'typed',
      content: 'Home fixture vs Sprowston Academy (34-7 win). Toby was outstanding — scored two tries, one from a turnover at the breakdown and one from a powerful 20m carry through three tacklers. His work rate at the breakdown was relentless.',
      createdAt: daysAgo(17),
    })

    // ── GCSE PE specific observations ──
    await addObs(toby.id, hodPeId || observerId, {
      type: 'assessment_note', contextType: 'pe_lesson', sport: 'football', source: 'typed',
      content: 'GCSE PE practical moderation: Toby demonstrated excellent isolated and conditioned practices in football. His controlled heading, volley technique, and 1v1 defending are all at the top end of the grade boundary. Predicted grade: A (7). Main improvement area is creative attacking play — he is very defence-minded.',
      createdAt: daysAgo(28), teachingGroupId: groupId,
    })
    await addObs(toby.id, hodPeId || observerId, {
      type: 'assessment_note', contextType: 'pe_lesson', source: 'typed',
      content: 'GCSE PE theory mock exam result: Toby scored 62/80 (78%). Strong in anatomy & physiology and training methods. Weaker on socio-cultural influences — needs to revise the impact of commercialisation and the role of national governing bodies. Revision targets set for Easter.',
      createdAt: daysAgo(12), teachingGroupId: groupId,
    })

    // ── Development summary ──
    await addObs(toby.id, hodPeId || observerId, {
      type: 'development', contextType: 'general', source: 'typed',
      content: 'Year 11 progress review: Toby is one of the most complete sportsmen in his year group. He captains both the football and rugby teams with distinction. His GCSE PE is on track for a grade 7+ with potential to push higher if theory revision is consistent. Selected for Norfolk County rugby trials in February. Strong candidate for Sports Personality of the Year award.',
      createdAt: daysAgo(3),
    })
  }

  // Assessments — GCSE PE Football unit (KS4)
  const unitId = await findSportUnit(groupId, 'football')
  const criteriaId = await findCriteria(unitId)
  if (hodPeId) {
    await addAssessment(toby.id, unitId, criteriaId, hodPeId, 'A',
      'Toby demonstrates high-level practical performance in football. Excellent reading of the game, strong in the tackle, and composed on the ball. His heading and aerial ability are particular strengths. Could improve creative passing and risk-taking in possession.')
  }

  console.log(`[test-personas] Toby Marsh (Y11) seeded with sporting content`)
  return toby
}

// ── Public entry point ─────────────────────────────────────────────
export async function seedTestPersonas(schoolId) {
  await ensureColumns()

  const jamie = await seedJamie(schoolId)
  const amelia = await seedAmelia(schoolId)
  const toby = await seedToby(schoolId)

  return { jamie, amelia, toby }
}
