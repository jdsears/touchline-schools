/**
 * Seed fixtures (matches) and training sessions for Ashworth Park Academy teams.
 * Includes past fixtures with results and upcoming scheduled fixtures.
 * Also seeds a selection of voice observations.
 */

import pool from '../../config/database.js'

const OPPONENTS = {
  football: [
    'Riverside Academy', 'St. Peter\'s School', 'Northgate High',
    'Manor Park Academy', 'The Broads School', 'Wymondham College',
    'Thorpe St Andrew',
  ],
  rugby: [
    'Norwich School', 'Hellesdon High', 'Sprowston Academy',
    'Aylsham High', 'Dereham Neatherd',
  ],
  netball: [
    'Notre Dame High', 'Sacred Heart School', 'Thorpe St Andrew',
    'Hellesdon High', 'City Academy Norwich',
  ],
  hockey: [
    'Notre Dame High', 'Hethersett Academy', 'Sprowston Academy',
    'Hewett School', 'Aylsham High',
  ],
}

function pastDate(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

function futureDate(daysAhead) {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().split('T')[0]
}

async function insertMatch(teamId, opponent, matchDate, homeAway, scoreFor, scoreAgainst, location) {
  const result = await pool.query(`
    INSERT INTO matches (team_id, opponent, match_date, date, match_time, home_away, score_for, score_against, location, created_at)
    VALUES ($1, $2, $3, $3, '14:00', $4, $5, $6, $7, NOW())
    RETURNING *
  `, [teamId, opponent, matchDate, homeAway, scoreFor, scoreAgainst, location || 'Ashworth Park Academy Sports Ground'])
  return result.rows[0]
}

async function insertTrainingSession(teamId, sessionDate, focus, location) {
  const result = await pool.query(`
    INSERT INTO training_sessions (team_id, date, time, location, focus_areas, created_at)
    VALUES ($1, $2, '15:30', $3, $4, NOW())
    RETURNING *
  `, [teamId, sessionDate, location || 'Ashworth Park Academy Sports Ground', [focus]])
  return result.rows[0]
}

async function insertObservation(schoolId, pupilId, teacherId, text, source = 'typed') {
  await pool.query(`
    INSERT INTO observations (pupil_id, observer_id, type, content, context_type, source, review_state, created_at)
    VALUES ($1, $2, 'development', $3, 'general', $4, 'confirmed', NOW() - INTERVAL '3 days')
  `, [pupilId, teacherId, text, source])
}

export async function seedFixtures(schoolId, teams, staff, pupils) {
  const { hodPe, directorOfSport, teacher1, teacher2 } = staff

  const getTeam = (name) => teams.find(t => t.name === name)
  const byYear = (y) => pupils.filter(p => p.year_group === y)
  const year9 = byYear(9)
  const year11 = byYear(11)

  // --- Year 7 Boys Football ---
  const y7Football = getTeam('Year 7 Boys Football')
  if (y7Football) {
    await insertMatch(y7Football.id, OPPONENTS.football[0], pastDate(60), 'home', 3, 1, null)
    await insertMatch(y7Football.id, OPPONENTS.football[1], pastDate(46), 'away', 1, 2, 'Riverside Academy')
    await insertMatch(y7Football.id, OPPONENTS.football[2], pastDate(32), 'home', 4, 0, null)
    await insertMatch(y7Football.id, OPPONENTS.football[3], pastDate(18), 'away', 2, 2, 'Manor Park Academy')
    await insertMatch(y7Football.id, OPPONENTS.football[4], futureDate(7), 'home', null, null, null)
    await insertMatch(y7Football.id, OPPONENTS.football[5], futureDate(21), 'away', null, null, 'Wymondham College')

    await insertTrainingSession(y7Football.id, pastDate(5), 'Possession and pressing triggers', null)
    await insertTrainingSession(y7Football.id, pastDate(12), 'Set pieces: corner routines', null)
    await insertTrainingSession(y7Football.id, futureDate(2), 'Pre-match preparation: shape and transitions', null)
  }

  // --- Year 9 Boys Football ---
  const y9Football = getTeam('Year 9 Boys Football')
  if (y9Football) {
    await insertMatch(y9Football.id, OPPONENTS.football[0], pastDate(55), 'home', 2, 0, null)
    await insertMatch(y9Football.id, OPPONENTS.football[1], pastDate(41), 'away', 0, 3, 'Riverside Academy')
    await insertMatch(y9Football.id, OPPONENTS.football[2], pastDate(27), 'home', 1, 1, null)
    await insertMatch(y9Football.id, OPPONENTS.football[4], pastDate(13), 'away', 3, 1, 'The Broads School')
    await insertMatch(y9Football.id, OPPONENTS.football[5], futureDate(14), 'home', null, null, null)
    await insertMatch(y9Football.id, OPPONENTS.football[6], futureDate(28), 'away', null, null, 'Thorpe St Andrew')

    await insertTrainingSession(y9Football.id, pastDate(4), 'Defending shape - high press vs low block', null)
    await insertTrainingSession(y9Football.id, pastDate(11), 'Finishing: 1v1 situations', null)
  }

  // --- Year 11 Boys Football ---
  const y11Football = getTeam('Year 11 Boys Football')
  if (y11Football) {
    await insertMatch(y11Football.id, OPPONENTS.football[0], pastDate(50), 'home', 4, 2, null)
    await insertMatch(y11Football.id, OPPONENTS.football[1], pastDate(36), 'away', 2, 2, 'Riverside Academy')
    await insertMatch(y11Football.id, OPPONENTS.football[3], pastDate(22), 'home', 5, 1, null)
    await insertMatch(y11Football.id, OPPONENTS.football[5], pastDate(8), 'away', 1, 0, 'Wymondham College')
    await insertMatch(y11Football.id, OPPONENTS.football[6], futureDate(10), 'home', null, null, null)

    await insertTrainingSession(y11Football.id, pastDate(3), 'Tactical: 4-3-3 attack transitions', null)
    await insertTrainingSession(y11Football.id, futureDate(4), 'Set pieces and dead ball', null)
  }

  // --- Year 9 Boys Rugby ---
  const y9Rugby = getTeam('Year 9 Boys Rugby')
  if (y9Rugby) {
    await insertMatch(y9Rugby.id, OPPONENTS.rugby[0], pastDate(45), 'home', 28, 12, null)
    await insertMatch(y9Rugby.id, OPPONENTS.rugby[1], pastDate(31), 'away', 15, 22, 'Norwich School')
    await insertMatch(y9Rugby.id, OPPONENTS.rugby[2], pastDate(17), 'home', 34, 7, null)
    await insertMatch(y9Rugby.id, OPPONENTS.rugby[3], futureDate(12), 'away', null, null, 'Aylsham High')

    await insertTrainingSession(y9Rugby.id, pastDate(6), 'Lineout calls and scrum technique', null)
  }

  // --- Year 9 Girls Netball ---
  const y9Netball = getTeam('Year 9 Girls Netball')
  if (y9Netball) {
    await insertMatch(y9Netball.id, OPPONENTS.netball[0], pastDate(42), 'home', 24, 18, null)
    await insertMatch(y9Netball.id, OPPONENTS.netball[1], pastDate(28), 'away', 32, 29, 'Sacred Heart School')
    await insertMatch(y9Netball.id, OPPONENTS.netball[2], pastDate(14), 'home', 19, 21, null)
    await insertMatch(y9Netball.id, OPPONENTS.netball[3], futureDate(9), 'away', null, null, 'Hellesdon High')

    await insertTrainingSession(y9Netball.id, pastDate(7), 'Centre pass patterns and defensive press', null)
    await insertTrainingSession(y9Netball.id, futureDate(2), 'Shooting technique under pressure', null)
  }

  // --- Year 9 Girls Hockey ---
  const y9Hockey = getTeam('Year 9 Girls Hockey')
  if (y9Hockey) {
    await insertMatch(y9Hockey.id, OPPONENTS.hockey[0], pastDate(40), 'home', 3, 1, null)
    await insertMatch(y9Hockey.id, OPPONENTS.hockey[1], pastDate(26), 'away', 2, 2, 'Hethersett Academy')
    await insertMatch(y9Hockey.id, OPPONENTS.hockey[2], pastDate(12), 'home', 4, 0, null)
    await insertMatch(y9Hockey.id, OPPONENTS.hockey[3], futureDate(16), 'away', null, null, 'Hewett School')
  }

  // --- Voice observations for some pupils ---
  if (year9.length > 0) {
    await insertObservation(
      null, year9[0].id, teacher1.id,
      `${year9[0].name.split(' ')[0]} showed excellent spatial awareness in today's session. Consistently found pockets of space between the lines and used the ball quickly. Ready to take on more responsibility in the team.`,
      'voice'
    )
    await insertObservation(
      schoolId, year9[1].id, teacher1.id,
      `${year9[1].name.split(' ')[0]} is making good progress with first touch. Still needs to work on decision-making when pressed high - tendency to play backwards rather than take players on.`,
      'voice'
    )
    await insertObservation(
      schoolId, year9[2].id, hodPe.id,
      `Strong leadership from ${year9[2].name.split(' ')[0]} during the small-sided games. Organised teammates effectively and communicated well. Potential captain material.`,
      'typed'
    )
  }

  if (year11.length > 0) {
    await insertObservation(
      schoolId, year11[0].id, hodPe.id,
      `${year11[0].name.split(' ')[0]} delivered an outstanding performance in the county trials. Technical ability is clearly above average for this age group. Recommend for county squad selection.`,
      'typed'
    )
    await insertObservation(
      schoolId, year11[1].id, hodPe.id,
      `Post-match discussion with ${year11[1].name.split(' ')[0]} - they articulated tactical awareness very well. Discussed potential for GCSE practical assessment and recommended additional coaching sessions.`,
      'voice'
    )
    await insertObservation(
      schoolId, year11[2].id, teacher1.id,
      `${year11[2].name.split(' ')[0]} was distracted and disengaged in training today. Will follow up in next session to check for any pastoral concerns. No issues noted previously.`,
      'typed'
    )
  }
}
