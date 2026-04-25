/**
 * Seed curriculum PE lessons for the demo school.
 *
 * Runs AFTER seedCurriculum() to add:
 *   1. Y11 Core PE teaching group (missing from base seed)
 *   2. Spring 2026 sport units where missing
 *   3. 6 lesson plans per active teaching group for the current term
 */

import pool from '../../config/database.js'

async function findGroup(schoolId, name) {
  const r = await pool.query(
    `SELECT id, teacher_id FROM teaching_groups WHERE school_id = $1 AND name = $2 LIMIT 1`,
    [schoolId, name]
  )
  return r.rows[0] || null
}

async function findUnit(groupId, term) {
  const r = await pool.query(
    `SELECT id, sport, unit_name FROM sport_units WHERE teaching_group_id = $1 AND term = $2 LIMIT 1`,
    [groupId, term]
  )
  return r.rows[0] || null
}

async function createUnit(groupId, sport, unitName, area, term, start, end, count) {
  const r = await pool.query(`
    INSERT INTO sport_units (teaching_group_id, sport, unit_name, curriculum_area, term, start_date, end_date, lesson_count, display_order, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,NOW()) RETURNING id, sport, unit_name
  `, [groupId, sport, unitName, area, term, start, end, count])
  return r.rows[0]
}

function springDate(weekOffset) {
  const base = new Date('2026-01-12')
  base.setDate(base.getDate() + weekOffset * 7)
  return base.toISOString().split('T')[0]
}

const LESSON_TEMPLATES = {
  gymnastics: [
    { title: 'Introduction to Sequences', obj: 'Create and perform a simple 3-move floor sequence', act: 'Warm-up, demo basic rolls, partner sequence work, cool-down stretches', eq: 'Mats, benches' },
    { title: 'Balance and Body Tension', obj: 'Hold balances for 3 seconds with good body tension', act: 'Balance circuit, peer coaching in pairs, group balances', eq: 'Mats, balance beams' },
    { title: 'Linking Movements', obj: 'Use transitions to link balances and rolls smoothly', act: 'Transition drills, sequence building, peer feedback', eq: 'Mats, benches, music speaker' },
    { title: 'Flight and Rotation', obj: 'Perform a cartwheel or round-off with control', act: 'Progressive lead-up drills, spotting technique, practice stations', eq: 'Mats, crash mats' },
    { title: 'Apparatus Work', obj: 'Adapt floor sequences to include apparatus', act: 'Station rotation on apparatus, sequence adaptation, filming for review', eq: 'Full apparatus set, tablets for filming' },
    { title: 'Performance and Assessment', obj: 'Perform polished sequence to an audience', act: 'Final rehearsal, peer performance, class assessment, self-evaluation', eq: 'Mats, assessment sheets' },
  ],
  hockey: [
    { title: 'Grip, Dribble and Control', obj: 'Demonstrate correct grip and close dribble', act: 'Grip correction drills, cone dribble relay, 3v1 keep-ball', eq: 'Sticks, balls, cones, bibs' },
    { title: 'Push Pass and Receiving', obj: 'Execute an accurate push pass over 10m', act: 'Passing pairs, triangle passing, conditioned 4v4', eq: 'Sticks, balls, cones, goals' },
    { title: 'Tackling and Defending', obj: 'Perform a channelling jab tackle safely', act: '1v1 channel drill, 2v2 defending scenarios, small-sided game', eq: 'Sticks, balls, cones, bibs' },
    { title: 'Attacking Play', obj: 'Use width and depth in attack to create scoring chances', act: 'Overlap drill, 3v2 attack, conditioned game with target zones', eq: 'Sticks, balls, cones, goals, bibs' },
    { title: 'Set Pieces and Short Corners', obj: 'Execute a short corner routine with roles', act: 'Short corner walkthrough, injection practice, match with set pieces', eq: 'Sticks, balls, goals, cones' },
    { title: 'Match Play and Review', obj: 'Apply skills in competitive match context', act: 'Warm-up, full match with umpiring roles, tactical debrief', eq: 'Sticks, balls, goals, bibs, scoreboard' },
  ],
  netball: [
    { title: 'Footwork and Landing', obj: 'Land correctly and pivot without travelling', act: 'Footwork ladder, pivot drills, 3v3 passing game', eq: 'Balls, bibs, cones' },
    { title: 'Chest and Bounce Pass', obj: 'Select appropriate pass type for game situation', act: 'Passing technique stations, conditioned game (no lob pass)', eq: 'Balls, bibs, cones' },
    { title: 'Shooting Technique', obj: 'Shoot with correct technique from 3m', act: 'Progressive shooting drill, shooting under pressure, mini match', eq: 'Balls, posts, bibs' },
    { title: 'Centre Pass and Positioning', obj: 'Understand positional responsibilities at centre pass', act: 'Centre pass walkthrough, positional rotation game, match play', eq: 'Balls, bibs, posts' },
    { title: 'Defending and Interceptions', obj: 'Mark an opponent and attempt interceptions', act: '1v1 marking drill, 3v3 interception game, conditioned match', eq: 'Balls, bibs, posts' },
    { title: 'Full Game and Assessment', obj: 'Apply all skills in a full game context', act: 'Warm-up, full 7v7 match, umpiring, self-assessment', eq: 'Balls, posts, bibs, assessment sheets' },
  ],
  basketball: [
    { title: 'Ball Handling and Dribbling', obj: 'Dribble with either hand while changing direction', act: 'Dribble circuits, crossover drills, 1v1 dribble challenge', eq: 'Basketballs, cones' },
    { title: 'Passing in Transition', obj: 'Execute chest and bounce passes at speed', act: 'Fast break 3v2, outlet passing drill, conditioned game', eq: 'Basketballs, bibs, cones' },
    { title: 'Shooting: Lay-ups', obj: 'Perform a right-hand lay-up from the dribble', act: 'Lay-up lines, Mikan drill, 3v3 half-court', eq: 'Basketballs, cones' },
    { title: 'Man-to-Man Defence', obj: 'Stay with your player and contest shots', act: 'Closeout drill, shell defence, 4v4 game', eq: 'Basketballs, bibs' },
    { title: 'Offensive Plays', obj: 'Run a give-and-go and a pick-and-roll', act: 'Set play walkthrough, 3v3 with plays, full game', eq: 'Basketballs, bibs, whiteboard' },
    { title: 'Tournament and Assessment', obj: 'Compete in a round-robin with fair play', act: 'Round-robin tournament, peer officiating, assessment', eq: 'Basketballs, bibs, scoreboard' },
  ],
  rugby: [
    { title: 'Handling and Passing', obj: 'Pass accurately off both hands over 5m', act: 'Passing grids, miss-pass drill, 4v2 overload game', eq: 'Rugby balls, cones, bibs, tag belts' },
    { title: 'Evasion and Running Lines', obj: 'Use a sidestep or dummy to beat a defender', act: '1v1 channel, 2v1 attack, small-sided tag game', eq: 'Rugby balls, cones, bibs, tag belts' },
    { title: 'Contact: Tackling Safely', obj: 'Demonstrate a safe side-on tackle', act: 'Progressive tackle practice (knees, crouch, standing), 3v3 contact', eq: 'Rugby balls, tackle shields, cones' },
    { title: 'Ruck and Ball Presentation', obj: 'Present the ball correctly after contact', act: 'Ball presentation drill, 2-man ruck practice, conditioned game', eq: 'Rugby balls, contact pads, cones' },
    { title: 'Kicking Game', obj: 'Execute a punt and a grubber kick with accuracy', act: 'Kicking technique stations, kick-tennis, match with kicking zones', eq: 'Rugby balls, cones, kicking tees' },
    { title: 'Match Play and Analysis', obj: 'Apply skills in a full 15-a-side or conditioned match', act: 'Warm-up, full match, video review of key passages', eq: 'Rugby balls, bibs, cones, tablet' },
  ],
}

export async function seedLessons(schoolId, staff) {
  const { hodPe, teacher1, teacher2 } = staff

  // Ensure Y11 Core PE group exists
  let coreGroup = await findGroup(schoolId, 'Y11 Core PE')
  if (!coreGroup) {
    const r = await pool.query(`
      INSERT INTO teaching_groups (school_id, teacher_id, name, year_group, group_identifier, academic_year, key_stage, created_at)
      VALUES ($1, $2, 'Y11 Core PE', 11, 'Y11CorePE', '2025-26', 'KS4', NOW())
      RETURNING id, teacher_id
    `, [schoolId, teacher1.id])
    coreGroup = r.rows[0]

    // Add Y11 pupils who are NOT in GCSE PE
    const y11Pupils = await pool.query(`
      SELECT p.id FROM pupils p
      JOIN school_members sm ON sm.user_id = p.user_id AND sm.school_id = $1
      WHERE p.year_group = 11
        AND p.id NOT IN (
          SELECT tgp.pupil_id FROM teaching_group_pupils tgp
          JOIN teaching_groups tg ON tg.id = tgp.teaching_group_id
          WHERE tg.name = '11 GCSE PE'
        )
      LIMIT 12
    `, [schoolId])
    for (const p of y11Pupils.rows) {
      await pool.query(
        `INSERT INTO teaching_group_pupils (teaching_group_id, pupil_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [coreGroup.id, p.id]
      )
    }
  }

  // Ensure spring sport units exist for each group
  const groupUnits = [
    { name: '7A PE', sport: 'gymnastics', unit: 'Gymnastics: Sequences', area: 'gymnastics' },
    { name: '7B PE', sport: 'gymnastics', unit: 'Gymnastics: Movement Composition', area: 'gymnastics' },
    { name: '9A PE', sport: 'hockey', unit: 'Invasion Games: Hockey', area: 'invasion_games' },
    { name: '9B PE', sport: 'netball', unit: 'Invasion Games: Netball', area: 'invasion_games' },
    { name: '11 GCSE PE', sport: 'hockey', unit: 'GCSE Practical: Hockey', area: 'invasion_games' },
    { name: 'Y11 Core PE', sport: 'basketball', unit: 'Invasion Games: Basketball', area: 'invasion_games' },
  ]

  for (const gu of groupUnits) {
    const group = await findGroup(schoolId, gu.name)
    if (!group) continue

    let unit = await findUnit(group.id, 'spring')
    if (!unit) {
      unit = await createUnit(group.id, gu.sport, gu.unit, gu.area, 'spring', '2026-01-07', '2026-03-27', 6)
    }

    const templates = LESSON_TEMPLATES[gu.sport]
    if (!templates) continue

    const teacherId = group.teacher_id || hodPe.id

    for (let i = 0; i < Math.min(6, templates.length); i++) {
      const t = templates[i]
      const lessonDate = springDate(i * 2)
      await pool.query(`
        INSERT INTO lesson_plans (
          teaching_group_id, sport_unit_id, teacher_id,
          title, lesson_date, duration,
          learning_objectives, activities, equipment,
          status, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,60,$6,$7,$8,'published',NOW(),NOW())
        ON CONFLICT DO NOTHING
      `, [
        group.id, unit.id, teacherId,
        t.title, lessonDate,
        t.obj, t.act, t.eq,
      ])
    }
  }

  console.log('[demo-seed] Lessons seeded for 6 teaching groups')
}
