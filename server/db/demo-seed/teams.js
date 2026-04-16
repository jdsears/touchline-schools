/**
 * Seed teams for Ashworth Park Academy.
 * 12 teams covering football, rugby, cricket, hockey, netball across year groups.
 */

import pool from '../../config/database.js'

async function createTeam(schoolId, data) {
  const result = await pool.query(`
    INSERT INTO teams (
      name, school_id, sport, gender, age_group, season_type,
      primary_color, secondary_color,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    RETURNING *
  `, [
    data.name, schoolId, data.sport, data.gender, data.ageGroup, data.seasonType,
    data.primaryColor || '#1B4332',
    data.secondaryColor || '#D97706',
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
