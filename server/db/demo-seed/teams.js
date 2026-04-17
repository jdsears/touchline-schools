/**
 * Seed teams for Ashworth Park Academy.
 * 12 teams covering football, rugby, cricket, hockey, netball across year groups.
 */

import pool from '../../config/database.js'

// UK school year → age grade (U-number) at start of academic year.
// Year 7 = age 11 at start of year, U12 in governing-body terms.
// Year 12+ treated as Adult.
function yearGroupToAgeGrade(yearGroup) {
  const m = String(yearGroup || '').match(/Year\s*(\d+)/i)
  if (!m) return 'Adult'
  const year = parseInt(m[1], 10)
  if (year >= 12) return 'Adult'
  return `U${year + 5}`
}

// Age-appropriate team format per sport (mirrors client sport configs).
// Football: FA youth format progression.
// Rugby: RFU age-grade law.
// Hockey: England Hockey In2Hockey pathway.
// Netball: England Netball (High 5 for primary → 7-a-side from Y5/U10).
// Cricket: 11-a-side across the board.
const AGE_FORMAT_MAP = {
  football: {
    U7: 5, U8: 5, U9: 7, U10: 7, U11: 9, U12: 9,
    U13: 11, U14: 11, U15: 11, U16: 11, U17: 11, U18: 11, Adult: 11,
  },
  rugby: {
    U7: 7, U8: 7, U9: 7, U10: 10, U11: 10, U12: 12, U13: 12,
    U14: 15, U15: 15, U16: 15, U17: 15, U18: 15, Adult: 15,
  },
  hockey: {
    U7: 7, U8: 7, U9: 7, U10: 7, U11: 7,
    U12: 11, U13: 11, U14: 11, U15: 11, U16: 11, U17: 11, U18: 11, Adult: 11,
  },
  netball: {
    U7: 5, U8: 5, U9: 5,
    U10: 7, U11: 7, U12: 7, U13: 7, U14: 7, U15: 7, U16: 7, U17: 7, U18: 7, Adult: 7,
  },
  cricket: {
    U7: 11, U8: 11, U9: 11, U10: 11, U11: 11, U12: 11, U13: 11,
    U14: 11, U15: 11, U16: 11, U17: 11, U18: 11, Adult: 11,
  },
}

// Age-appropriate default formation per sport × format.
const DEFAULT_FORMATION = {
  football: { 11: '4-3-3', 9: '3-3-2', 7: '2-3-1', 5: '2-1-1' },
  rugby:    { 15: 'Drift Defence', 12: 'Standard 12s', 10: 'Standard 10s', 7: 'Standard 7s Attack' },
  hockey:   { 11: '4-3-3', 7: '3-3' },
  netball:  { 7: 'standard', 5: 'modified-5' },
  cricket:  { 11: 'Attack' },
}

// Default tactics per sport (formation + game model flavour)
const SPORT_TACTICS = {
  football: {
    formation: '4-3-3',
    team_format: 11,
    game_model: {
      style: 'Possession-based',
      buildUp: 'Short passing from back',
      pressing: 'High press',
      inPossession: 'Patient build-up, exploit wide areas',
      outOfPossession: 'Press high, win ball in final third',
      transitions: 'Quick vertical counter when winning ball',
      setPieceTakers: { corners_left: '', corners_right: '', free_kicks: '', penalties: '', throw_ins_long: '' },
      tacticalSettings: { defensiveLine: 65, compactness: 60, attackingWidth: 70, defensiveWidth: 50, pressingIntensity: 70, pressingTriggerZone: 'high', showZones: false, showThirds: false, showMovements: false, showPressingZones: false },
    },
  },
  rugby: {
    formation: 'Drift Defence',
    team_format: 15,
    game_model: {
      style: 'Wide expansive',
      buildUp: 'Set piece dominance',
      pressing: 'Defensive line speed',
      inPossession: 'Exploit width, offload in contact',
      outOfPossession: 'Drift defence, deny space outside',
      transitions: 'Recycle quickly after turnover',
      setPieceTakers: { lineout_caller: '', lineout_jumper: '', penalties_kick: '', conversions: '', restarts: '', dropouts: '' },
      tacticalSettings: { defensiveLine: 55, compactness: 50, attackingWidth: 75, defensiveWidth: 55, pressingIntensity: 60, pressingTriggerZone: 'mid', showZones: false, showThirds: false, showMovements: false, showPressingZones: false },
    },
  },
  netball: {
    formation: '2-3-2',
    team_format: 7,
    game_model: {
      style: 'Fast-paced transition',
      buildUp: 'Centre court control',
      pressing: 'Tight man-to-man',
      inPossession: 'Drive through centre, feed shooters early',
      outOfPossession: 'Intercept at source, block passing lanes',
      transitions: 'Quick centre pass after goal',
      setPieceTakers: { centre_pass: '', throw_ins: '' },
    },
  },
  hockey: {
    formation: '4-3-3',
    team_format: 11,
    game_model: {
      style: 'Counter-attacking',
      buildUp: 'Through the middle',
      pressing: 'Mid-block',
      inPossession: 'Quick one-twos, penetrate D early',
      outOfPossession: 'Compact mid-block, force wide',
      transitions: 'Fast break on turnover',
      setPieceTakers: { penalty_corners: '', penalty_corner_hit: '', short_corners: '', free_hits: '' },
    },
  },
  cricket: {
    formation: 'Attack',
    team_format: 11,
    game_model: {
      style: 'Aggressive batting',
      buildUp: 'Front-foot batting',
      pressing: 'Attacking field placements',
      inPossession: 'Build partnerships, rotate strike',
      outOfPossession: 'Move fielders to pressure zone',
      transitions: 'Reset field after wicket',
      setPieceTakers: { opening_bowlers: '', wicket_keeper: '', captain: '' },
    },
  },
}

async function createTeam(schoolId, data) {
  const tactics = SPORT_TACTICS[data.sport] || SPORT_TACTICS.football
  const ageGrade = yearGroupToAgeGrade(data.ageGroup)
  const sportMap = AGE_FORMAT_MAP[data.sport] || {}
  const teamFormat = sportMap[ageGrade] || tactics.team_format
  const formationMap = DEFAULT_FORMATION[data.sport] || {}
  const formation = formationMap[teamFormat] || tactics.formation

  const result = await pool.query(`
    INSERT INTO teams (
      name, school_id, sport, gender, age_group, season_type,
      primary_color, secondary_color,
      formation, team_format, game_model,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    RETURNING *
  `, [
    data.name, schoolId, data.sport, data.gender, data.ageGroup, data.seasonType,
    data.primaryColor || '#1B4332',
    data.secondaryColor || '#D97706',
    formation,
    teamFormat,
    JSON.stringify(tactics.game_model),
  ])
  return result.rows[0]
}

async function addTeamMemberships(team, pupils) {
  for (const pupil of pupils) {
    // Link pupil record to team (sets pupils.team_id for queries that use it)
    await pool.query(
      `UPDATE pupils SET team_id = $1 WHERE id = $2 AND team_id IS NULL`,
      [team.id, pupil.id]
    )
    if (!pupil.user_id) continue
    await pool.query(`
      INSERT INTO team_memberships (team_id, user_id, pupil_id, role, is_primary, created_at)
      VALUES ($1, $2, $3, 'parent', true, NOW())
      ON CONFLICT (user_id, team_id) DO NOTHING
    `, [team.id, pupil.user_id, pupil.id])
  }
}

export async function seedTeams(schoolId, staff, pupils) {
  const { hodPe, directorOfSport, teacher1, teacher2, nonSpec1 } = staff

  const byYear = (y) => pupils.filter(p => p.year_group === y)
  const year7 = byYear(7)
  const year9 = byYear(9)
  const year11 = byYear(11)
  const year13 = byYear(13)

  // Split roughly by likely sport participation
  const boysY7  = year7.filter((_, i) => i % 2 === 0)
  const girlsY7 = year7.filter((_, i) => i % 2 !== 0)
  const boysY9  = year9.filter((_, i) => i % 2 === 0)
  const girlsY9 = year9.filter((_, i) => i % 2 !== 0)
  const boysY11 = year11.filter((_, i) => i % 2 === 0)
  const girlsY11= year11.filter((_, i) => i % 2 !== 0)
  const allY13  = year13

  const teamDefs = [
    // Football
    { name: 'Year 7 Boys Football',  sport: 'football', gender: 'boys', ageGroup: 'Year 7',  seasonType: 'autumn', pupils: boysY7  },
    { name: 'Year 9 Boys Football',  sport: 'football', gender: 'boys', ageGroup: 'Year 9',  seasonType: 'autumn', pupils: boysY9  },
    { name: 'Year 11 Boys Football', sport: 'football', gender: 'boys', ageGroup: 'Year 11', seasonType: 'autumn', pupils: boysY11 },
    // Rugby
    { name: 'Year 9 Boys Rugby',     sport: 'rugby',    gender: 'boys', ageGroup: 'Year 9',  seasonType: 'autumn', pupils: boysY9  },
    { name: 'Year 11 Boys Rugby',    sport: 'rugby',    gender: 'boys', ageGroup: 'Year 11', seasonType: 'autumn', pupils: boysY11 },
    // Netball
    { name: 'Year 7 Girls Netball',  sport: 'netball',  gender: 'girls', ageGroup: 'Year 7',  seasonType: 'spring', pupils: girlsY7  },
    { name: 'Year 9 Girls Netball',  sport: 'netball',  gender: 'girls', ageGroup: 'Year 9',  seasonType: 'spring', pupils: girlsY9  },
    { name: 'Year 11 Girls Netball', sport: 'netball',  gender: 'girls', ageGroup: 'Year 11', seasonType: 'spring', pupils: girlsY11 },
    // Hockey
    { name: 'Year 9 Girls Hockey',   sport: 'hockey',   gender: 'girls', ageGroup: 'Year 9',  seasonType: 'autumn', pupils: girlsY9  },
    { name: 'Year 11 Girls Hockey',  sport: 'hockey',   gender: 'girls', ageGroup: 'Year 11', seasonType: 'autumn', pupils: girlsY11 },
    // Cricket (summer)
    { name: 'Year 9 Boys Cricket',   sport: 'cricket',  gender: 'boys', ageGroup: 'Year 9',  seasonType: 'summer', pupils: boysY9   },
    // Sixth form mixed team
    { name: 'Sixth Form Football',   sport: 'football', gender: 'mixed', ageGroup: 'Year 13', seasonType: 'autumn', pupils: allY13  },
  ]

  const teams = []
  for (const def of teamDefs) {
    const team = await createTeam(schoolId, def)
    await addTeamMemberships(team, def.pupils)
    teams.push(team)
  }

  return teams
}
