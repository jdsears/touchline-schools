/**
 * Supplement the base fixtures seed with additional matches and
 * training sessions so every team page looks populated.
 *
 * Runs AFTER seedFixtures to avoid duplicates (uses different opponents
 * and dates).
 */

import pool from '../../config/database.js'

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

async function findTeam(schoolId, name) {
  const r = await pool.query(
    `SELECT id FROM teams WHERE school_id = $1 AND name = $2 LIMIT 1`,
    [schoolId, name]
  )
  return r.rows[0]?.id || null
}

async function addMatch(teamId, opponent, date, homeAway, scoreFor, scoreAgainst, location, time) {
  await pool.query(`
    INSERT INTO matches (team_id, opponent, match_date, date, match_time, home_away, score_for, score_against, location, created_at)
    VALUES ($1,$2,$3,$3,$4,$5,$6,$7,$8,NOW())
  `, [teamId, opponent, date, time || '15:00', homeAway, scoreFor, scoreAgainst, location || 'Ashworth Park Academy'])
}

async function addTraining(teamId, date, focus, location, time) {
  await pool.query(`
    INSERT INTO training_sessions (team_id, date, time, meet_time, location, focus_areas, session_type, duration, created_at)
    VALUES ($1,$2,$3,$4,$5,ARRAY[$6]::VARCHAR(100)[],'training',75,NOW())
  `, [teamId, date, time || '16:00', time || '15:45', location || 'Ashworth Park Academy', focus])
}

export async function seedFixturesExtra(schoolId) {
  // -- Year 7 Boys Football (Jamie's team) --
  // Base seed has 6 matches (4 played, 2 upcoming) and 3 training sessions
  // Add 2 more matches and 7 more training sessions to reach 8/10
  const y7fb = await findTeam(schoolId, 'Year 7 Boys Football')
  if (y7fb) {
    await addMatch(y7fb, 'Oakfield Grammar', pastDate(74), 'away', 1, 3, 'Oakfield Grammar', '14:00')
    await addMatch(y7fb, 'Westbury Park School', futureDate(35), 'home', null, null, null, '14:00')

    await addTraining(y7fb, pastDate(70), 'Introduction to formation: 4-3-3 shape', null)
    await addTraining(y7fb, pastDate(56), 'Passing patterns: triangles and diamond', null)
    await addTraining(y7fb, pastDate(42), 'Defending: 1v1 jockeying and recovery runs', null)
    await addTraining(y7fb, pastDate(28), 'Attacking width: overlapping full-backs', null)
    await addTraining(y7fb, pastDate(19), 'Game management: playing out from the back', null)
    await addTraining(y7fb, futureDate(9), 'Counter-attacking: transition speed', null)
    await addTraining(y7fb, futureDate(16), 'Match preparation: set pieces', null)
  }

  // -- Year 9 Girls Netball (Amelia's team, captain) --
  // Base seed has 4 matches, 2 training. Add 6 matches, 10 training -> 10/12
  const y9nb = await findTeam(schoolId, 'Year 9 Girls Netball')
  if (y9nb) {
    await addMatch(y9nb, 'Oakfield Grammar', pastDate(70), 'away', 28, 16, 'Oakfield Grammar', '15:30')
    await addMatch(y9nb, 'Westbury Park School', pastDate(56), 'home', 31, 22, null, '15:30')
    await addMatch(y9nb, 'City Academy Norwich', pastDate(35), 'away', 26, 26, 'City Academy Norwich', '15:30')
    await addMatch(y9nb, 'Riverside College', pastDate(7), 'home', 33, 19, null, '15:30')
    await addMatch(y9nb, 'Oakfield Grammar', futureDate(16), 'home', null, null, null, '15:30')
    await addMatch(y9nb, 'Sacred Heart School', futureDate(30), 'away', null, null, 'Sacred Heart School', '15:30')

    await addTraining(y9nb, pastDate(67), 'Pre-season fitness testing and goal-setting', null)
    await addTraining(y9nb, pastDate(53), 'Defensive zone: intercepting the through-court pass', null)
    await addTraining(y9nb, pastDate(46), 'Attacking circle movement: timing leads', null)
    await addTraining(y9nb, pastDate(39), 'Transition play: turnover to attack', null)
    await addTraining(y9nb, pastDate(32), 'Shooting technique: distance and angle work', null)
    await addTraining(y9nb, pastDate(25), 'Match analysis: reviewing Sacred Heart footage', null)
    await addTraining(y9nb, pastDate(18), 'Set plays: centre pass and sideline throw-in', null)
    await addTraining(y9nb, pastDate(11), 'Defending the circle: 1v1 marking drill', null)
    await addTraining(y9nb, futureDate(5), 'Pre-match preparation: Oakfield gameplan', null)
    await addTraining(y9nb, futureDate(12), 'Positional rotation: flexibility drill', null)
  }

  // -- Year 9 Girls Hockey (Amelia's second team) --
  // Base seed has 4 matches, 0 training. Add 4 matches, 8 training -> 8/8
  const y9hk = await findTeam(schoolId, 'Year 9 Girls Hockey')
  if (y9hk) {
    await addMatch(y9hk, 'Oakfield Grammar', pastDate(54), 'home', 5, 0, null, '14:30')
    await addMatch(y9hk, 'Riverside College', pastDate(33), 'away', 1, 2, 'Riverside College', '14:30')
    await addMatch(y9hk, 'Westbury Park School', pastDate(19), 'home', 3, 1, null, '14:30')
    await addMatch(y9hk, 'Oakfield Grammar', futureDate(23), 'away', null, null, 'Oakfield Grammar', '14:30')

    await addTraining(y9hk, pastDate(61), 'Stick skills: Indian dribble and 3D skills', null)
    await addTraining(y9hk, pastDate(47), 'Short corners: injection and deflection', null)
    await addTraining(y9hk, pastDate(40), 'Pressing as a unit: high and low triggers', null)
    await addTraining(y9hk, pastDate(33), 'Aerial skills: receiving and distributing', null)
    await addTraining(y9hk, pastDate(26), 'Counterattack: 3v2 and 4v3 overloads', null)
    await addTraining(y9hk, pastDate(19), 'Match review: Riverside analysis and corrections', null)
    await addTraining(y9hk, futureDate(3), 'Pre-match shape: defensive structure', null)
    await addTraining(y9hk, futureDate(10), 'Penalty corners: variations for tournament', null)
  }

  // -- Year 11 Boys Rugby (Toby's team) --
  // Base seed has 0 for this team. Add full season: 12 matches, 15 training
  const y11rg = await findTeam(schoolId, 'Year 11 Boys Rugby')
  if (y11rg) {
    await addMatch(y11rg, 'Norwich School', pastDate(90), 'home', 22, 10, null, '14:00')
    await addMatch(y11rg, 'Hellesdon High', pastDate(83), 'away', 34, 5, 'Hellesdon High', '14:00')
    await addMatch(y11rg, 'Sprowston Academy', pastDate(76), 'home', 28, 14, null, '14:00')
    await addMatch(y11rg, 'Oakfield Grammar', pastDate(69), 'away', 15, 15, 'Oakfield Grammar', '14:00')
    await addMatch(y11rg, 'Aylsham High', pastDate(55), 'home', 41, 7, null, '14:00')
    await addMatch(y11rg, 'Norwich School', pastDate(45), 'away', 15, 22, 'Norwich School', '14:00')
    await addMatch(y11rg, 'Dereham Neatherd', pastDate(38), 'home', 29, 10, null, '14:00')
    await addMatch(y11rg, 'Sprowston Academy', pastDate(24), 'home', 34, 7, null, '14:00')
    await addMatch(y11rg, 'Riverside College', pastDate(17), 'away', 19, 12, 'Riverside College', '14:00')
    await addMatch(y11rg, 'Westbury Park School', pastDate(10), 'home', 27, 17, null, '14:00')
    await addMatch(y11rg, 'Aylsham High', futureDate(7), 'away', null, null, 'Aylsham High', '14:00')
    await addMatch(y11rg, 'Norwich School', futureDate(21), 'home', null, null, null, '14:00')

    await addTraining(y11rg, pastDate(88), 'Pre-season fitness: shuttle runs and tackles', null)
    await addTraining(y11rg, pastDate(81), 'Lineout calls and lifting technique', null)
    await addTraining(y11rg, pastDate(74), 'Scrum technique: engage sequence', null)
    await addTraining(y11rg, pastDate(67), 'Defensive system: drift vs rush', null)
    await addTraining(y11rg, pastDate(60), 'Phase play: 3-phase attack patterns', null)
    await addTraining(y11rg, pastDate(53), 'Breakdown: jackal and counter-ruck', null)
    await addTraining(y11rg, pastDate(48), 'Kicking strategy: contestable and exit kicks', null)
    await addTraining(y11rg, pastDate(41), 'Contact conditioning: tackle and carry circuits', null)
    await addTraining(y11rg, pastDate(34), 'Backs moves: miss-pass, loop, switch', null)
    await addTraining(y11rg, pastDate(27), 'Match review: Norwich loss analysis', null)
    await addTraining(y11rg, pastDate(20), 'Restarts: kickoff reception and chase', null)
    await addTraining(y11rg, pastDate(13), 'Captain run: match prep for Riverside', null)
    await addTraining(y11rg, futureDate(4), 'Lineout variations: new calls for Aylsham', null)
    await addTraining(y11rg, futureDate(11), 'Game simulation: 15v15 match intensity', null)
    await addTraining(y11rg, futureDate(18), 'Season review and individual feedback', null)
  }

  // -- Year 9 Boys Cricket (pre-season) --
  const y9ck = await findTeam(schoolId, 'Year 9 Boys Cricket')
  if (y9ck) {
    await addMatch(y9ck, 'Norwich School', futureDate(45), 'home', null, null, null, '13:30')
    await addMatch(y9ck, 'Oakfield Grammar', futureDate(52), 'away', null, null, 'Oakfield Grammar', '13:30')
    await addMatch(y9ck, 'Sprowston Academy', futureDate(59), 'home', null, null, null, '13:30')
    await addMatch(y9ck, 'Riverside College', futureDate(66), 'away', null, null, 'Riverside College', '13:30')
    await addMatch(y9ck, 'Hellesdon High', futureDate(73), 'home', null, null, null, '13:30')
    await addMatch(y9ck, 'Westbury Park School', futureDate(80), 'away', null, null, 'Westbury Park School', '13:30')

    await addTraining(y9ck, pastDate(14), 'Pre-season nets: batting technique', 'Ashworth Park Academy Sports Hall')
    await addTraining(y9ck, pastDate(7), 'Pre-season nets: bowling accuracy', 'Ashworth Park Academy Sports Hall')
    await addTraining(y9ck, futureDate(1), 'Pre-season nets: fielding drills', 'Ashworth Park Academy Sports Hall')
  }

  console.log('[demo-seed] Extra fixtures and training sessions seeded')
}
