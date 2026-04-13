import { Router } from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { loadClub, requireClubRole, requireClubFeature } from '../middleware/clubAuth.js'
import { sendEmail, isEmailEnabled } from '../services/emailService.js'

const router = Router()

// ==========================================
// HELPER: Load team and its club context
// ==========================================

async function loadTeamAndClub(req, res, next) {
  try {
    const { teamId } = req.params
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID required' })
    }

    const result = await pool.query(
      `SELECT t.*, c.id AS club_id, c.name AS club_name, c.subscription_tier,
              c.stripe_account_id, c.settings AS club_settings
       FROM teams t
       LEFT JOIN clubs c ON t.club_id = c.id
       WHERE t.id = $1`,
      [teamId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' })
    }

    const team = result.rows[0]
    req.team = team

    // Set club context for middleware compatibility
    if (team.club_id) {
      req.club = {
        id: team.club_id,
        name: team.club_name,
        subscription_tier: team.subscription_tier,
        stripe_account_id: team.stripe_account_id,
        settings: team.club_settings,
      }
      req.params.clubId = team.club_id
    }

    next()
  } catch (error) {
    next(error)
  }
}

// ==========================================
// HELPER: Generate recurring sessions
// ==========================================

function generateRecurringSessions(baseSession, recurrenceRule, weeksCount = 8) {
  // Parse recurrence rule like 'WEEKLY:TUE' or 'WEEKLY:MON,WED'
  const sessions = []
  const [frequency, daysStr] = recurrenceRule.split(':')

  if (frequency !== 'WEEKLY' || !daysStr) {
    return sessions
  }

  const dayMap = {
    SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
  }

  const targetDays = daysStr.split(',').map(d => dayMap[d.trim().toUpperCase()]).filter(d => d !== undefined)

  if (targetDays.length === 0) {
    return sessions
  }

  const startDate = new Date(baseSession.date)

  for (let week = 0; week < weeksCount; week++) {
    for (const targetDay of targetDays) {
      const sessionDate = new Date(startDate)
      sessionDate.setDate(startDate.getDate() + (week * 7))

      // Adjust to correct day of week
      const currentDay = sessionDate.getDay()
      const diff = targetDay - currentDay
      sessionDate.setDate(sessionDate.getDate() + diff)

      // Skip if this date is before the start date
      if (sessionDate < startDate) continue

      // Skip the first instance if it's the same as the parent (week 0, same day)
      if (week === 0 && diff === 0) continue

      sessions.push({
        ...baseSession,
        date: sessionDate.toISOString().split('T')[0],
      })
    }
  }

  return sessions
}

// ==========================================
// TEAM SCHEDULE ROUTES
// ==========================================

// Get team schedule (with date range filters)
router.get('/:teamId/schedule', authenticateToken, loadTeamAndClub, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const { from, to, session_type, status } = req.query

    let query = `
      SELECT ss.*,
        (SELECT COUNT(*) FROM availability_responses ar WHERE ar.session_id = ss.id AND ar.response = 'available') AS available_count,
        (SELECT COUNT(*) FROM availability_responses ar WHERE ar.session_id = ss.id AND ar.response = 'unavailable') AS unavailable_count,
        (SELECT COUNT(*) FROM availability_responses ar WHERE ar.session_id = ss.id AND ar.response = 'maybe') AS maybe_count,
        (SELECT COUNT(*) FROM availability_responses ar WHERE ar.session_id = ss.id) AS total_responses
      FROM session_schedule ss
      WHERE ss.team_id = $1
    `
    const params = [teamId]
    let paramIdx = 2

    if (from) {
      query += ` AND ss.date >= $${paramIdx}`
      params.push(from)
      paramIdx++
    }

    if (to) {
      query += ` AND ss.date <= $${paramIdx}`
      params.push(to)
      paramIdx++
    }

    if (session_type) {
      query += ` AND ss.session_type = $${paramIdx}`
      params.push(session_type)
      paramIdx++
    }

    if (status) {
      query += ` AND ss.status = $${paramIdx}`
      params.push(status)
      paramIdx++
    } else {
      // By default exclude cancelled sessions
      query += ` AND ss.status != 'cancelled'`
    }

    query += ' ORDER BY ss.date ASC, ss.start_time ASC'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Create session (single or recurring)
router.post('/:teamId/schedule', authenticateToken, loadTeamAndClub, async (req, res, next) => {
  try {
    const { teamId } = req.params
    const team = req.team
    const clubId = team.club_id

    const {
      session_type, title, date, start_time, end_time,
      venue_name, venue_address, meet_time,
      opponent, is_home, match_id,
      is_recurring, recurrence_rule,
      kit_colour, coach_notes,
    } = req.body

    if (!session_type || !date || !start_time) {
      return res.status(400).json({ error: 'session_type, date, and start_time are required' })
    }

    const validTypes = ['training', 'match', 'friendly', 'tournament', 'social', 'other']
    if (!validTypes.includes(session_type)) {
      return res.status(400).json({ error: `Invalid session_type. Must be one of: ${validTypes.join(', ')}` })
    }

    // Create the parent session
    const parentResult = await pool.query(
      `INSERT INTO session_schedule (
        club_id, team_id, session_type, title, date, start_time, end_time,
        venue_name, venue_address, meet_time,
        opponent, is_home, match_id,
        is_recurring, recurrence_rule,
        kit_colour, coach_notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        clubId, teamId, session_type, title || null, date, start_time, end_time || null,
        venue_name || null, venue_address || null, meet_time || null,
        opponent || null, is_home !== undefined ? is_home : null, match_id || null,
        is_recurring || false, recurrence_rule || null,
        kit_colour || null, coach_notes || null, req.user.id,
      ]
    )

    const parentSession = parentResult.rows[0]
    const allSessions = [parentSession]

    // Generate recurring sessions if requested
    if (is_recurring && recurrence_rule) {
      const recurringDates = generateRecurringSessions({
        date,
        club_id: clubId,
        team_id: teamId,
        session_type,
        title: title || null,
        start_time,
        end_time: end_time || null,
        venue_name: venue_name || null,
        venue_address: venue_address || null,
        meet_time: meet_time || null,
        kit_colour: kit_colour || null,
        coach_notes: coach_notes || null,
      }, recurrence_rule, 8)

      for (const sess of recurringDates) {
        const childResult = await pool.query(
          `INSERT INTO session_schedule (
            club_id, team_id, session_type, title, date, start_time, end_time,
            venue_name, venue_address, meet_time,
            is_recurring, recurrence_rule, recurrence_parent_id,
            kit_colour, coach_notes, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING *`,
          [
            clubId, teamId, session_type, sess.title, sess.date, start_time, sess.end_time,
            sess.venue_name, sess.venue_address, sess.meet_time,
            true, recurrence_rule, parentSession.id,
            sess.kit_colour, sess.coach_notes, req.user.id,
          ]
        )
        allSessions.push(childResult.rows[0])
      }
    }

    // Send notification email to team parents about new session
    if (isEmailEnabled() && clubId) {
      try {
        // Get all guardians linked to players on this team
        const guardiansResult = await pool.query(
          `SELECT DISTINCT g.email, g.first_name
           FROM guardians g
           JOIN player_guardians pg ON pg.guardian_id = g.id
           JOIN players p ON pg.player_id = p.id
           WHERE p.team_id = $1 AND p.is_active = true AND g.email IS NOT NULL`,
          [teamId]
        )

        const sessionTitle = title || session_type.charAt(0).toUpperCase() + session_type.slice(1)
        const teamName = team.name

        for (const guardian of guardiansResult.rows) {
          await sendEmail(guardian.email, 'sessionCreated', {
            clubName: req.club?.name || teamName,
            teamName,
            sessionTitle,
            sessionType: session_type,
            sessionDate: new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
            sessionTime: start_time,
            venueName: venue_name || 'TBC',
            recipientName: guardian.first_name || 'there',
            isRecurring: is_recurring || false,
            sessionCount: allSessions.length,
          })
        }
      } catch (emailErr) {
        console.error('Failed to send session created notifications:', emailErr.message)
      }
    }

    res.status(201).json({
      parent: parentSession,
      all_sessions: allSessions,
      total_created: allSessions.length,
    })
  } catch (error) {
    next(error)
  }
})

// Update a session
router.put('/:teamId/schedule/:id', authenticateToken, loadTeamAndClub, async (req, res, next) => {
  try {
    const { teamId, id } = req.params
    const {
      session_type, title, date, start_time, end_time,
      venue_name, venue_address, meet_time,
      opponent, is_home, match_id,
      kit_colour, coach_notes, status, cancellation_reason,
    } = req.body

    const result = await pool.query(
      `UPDATE session_schedule SET
        session_type = COALESCE($1, session_type),
        title = COALESCE($2, title),
        date = COALESCE($3, date),
        start_time = COALESCE($4, start_time),
        end_time = COALESCE($5, end_time),
        venue_name = COALESCE($6, venue_name),
        venue_address = COALESCE($7, venue_address),
        meet_time = COALESCE($8, meet_time),
        opponent = COALESCE($9, opponent),
        is_home = COALESCE($10, is_home),
        match_id = COALESCE($11, match_id),
        kit_colour = COALESCE($12, kit_colour),
        coach_notes = COALESCE($13, coach_notes),
        status = COALESCE($14, status),
        cancellation_reason = COALESCE($15, cancellation_reason),
        updated_at = NOW()
      WHERE id = $16 AND team_id = $17
      RETURNING *`,
      [
        session_type, title, date, start_time, end_time,
        venue_name, venue_address, meet_time,
        opponent, is_home, match_id,
        kit_colour, coach_notes, status, cancellation_reason,
        id, teamId,
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Cancel a session
router.delete('/:teamId/schedule/:id', authenticateToken, loadTeamAndClub, async (req, res, next) => {
  try {
    const { teamId, id } = req.params
    const { cancellation_reason } = req.body || {}

    const result = await pool.query(
      `UPDATE session_schedule SET
        status = 'cancelled',
        cancellation_reason = $1,
        updated_at = NOW()
      WHERE id = $2 AND team_id = $3
      RETURNING *`,
      [cancellation_reason || null, id, teamId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const session = result.rows[0]

    // Send cancellation email to guardians of players who responded
    if (isEmailEnabled() && req.team.club_id) {
      try {
        const respondersResult = await pool.query(
          `SELECT DISTINCT g.email, g.first_name
           FROM availability_responses ar
           JOIN players p ON ar.player_id = p.id
           JOIN player_guardians pg ON pg.player_id = p.id
           JOIN guardians g ON pg.guardian_id = g.id
           WHERE ar.session_id = $1 AND g.email IS NOT NULL`,
          [id]
        )

        // Also get all team guardians who haven't responded
        const allGuardiansResult = await pool.query(
          `SELECT DISTINCT g.email, g.first_name
           FROM guardians g
           JOIN player_guardians pg ON pg.guardian_id = g.id
           JOIN players p ON pg.player_id = p.id
           WHERE p.team_id = $1 AND p.is_active = true AND g.email IS NOT NULL`,
          [teamId]
        )

        const emailSet = new Set()
        const allGuardians = [...respondersResult.rows, ...allGuardiansResult.rows].filter(g => {
          if (emailSet.has(g.email)) return false
          emailSet.add(g.email)
          return true
        })

        const sessionTitle = session.title || session.session_type.charAt(0).toUpperCase() + session.session_type.slice(1)

        for (const guardian of allGuardians) {
          await sendEmail(guardian.email, 'sessionCancelled', {
            clubName: req.club?.name || req.team.name,
            teamName: req.team.name,
            sessionTitle,
            sessionDate: new Date(session.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
            sessionTime: session.start_time,
            cancellationReason: cancellation_reason || 'No reason provided',
            recipientName: guardian.first_name || 'there',
          })
        }
      } catch (emailErr) {
        console.error('Failed to send session cancellation emails:', emailErr.message)
      }
    }

    res.json({ message: 'Session cancelled', session })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// AVAILABILITY
// ==========================================

// Get availability responses for a session
router.get('/:teamId/schedule/:id/availability', authenticateToken, loadTeamAndClub, async (req, res, next) => {
  try {
    const { teamId, id } = req.params

    // Verify session belongs to team
    const sessionCheck = await pool.query(
      'SELECT id FROM session_schedule WHERE id = $1 AND team_id = $2',
      [id, teamId]
    )
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Get all players on the team with their availability responses
    const result = await pool.query(
      `SELECT p.id AS player_id, p.name AS player_name,
        ar.id AS response_id, ar.response, ar.reason,
        ar.responded_at, ar.attended,
        u.name AS responded_by_name
      FROM players p
      LEFT JOIN availability_responses ar ON ar.player_id = p.id AND ar.session_id = $1
      LEFT JOIN users u ON ar.responded_by = u.id
      WHERE p.team_id = $2 AND p.is_active = true
      ORDER BY p.name ASC`,
      [id, teamId]
    )

    // Split into categories
    const available = result.rows.filter(r => r.response === 'available')
    const unavailable = result.rows.filter(r => r.response === 'unavailable')
    const maybe = result.rows.filter(r => r.response === 'maybe')
    const noResponse = result.rows.filter(r => !r.response)

    res.json({
      players: result.rows,
      summary: {
        available: available.length,
        unavailable: unavailable.length,
        maybe: maybe.length,
        no_response: noResponse.length,
        total: result.rows.length,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Submit availability response
router.post('/:teamId/schedule/:id/availability', authenticateToken, loadTeamAndClub, async (req, res, next) => {
  try {
    const { teamId, id } = req.params
    const { player_id, response, reason } = req.body

    if (!player_id || !response) {
      return res.status(400).json({ error: 'player_id and response are required' })
    }

    const validResponses = ['available', 'unavailable', 'maybe']
    if (!validResponses.includes(response)) {
      return res.status(400).json({ error: `Invalid response. Must be one of: ${validResponses.join(', ')}` })
    }

    // Verify session belongs to team
    const sessionCheck = await pool.query(
      'SELECT id FROM session_schedule WHERE id = $1 AND team_id = $2',
      [id, teamId]
    )
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Verify player belongs to team
    const playerCheck = await pool.query(
      'SELECT id FROM players WHERE id = $1 AND team_id = $2',
      [player_id, teamId]
    )
    if (playerCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Player not found on this team' })
    }

    // Upsert availability response
    const result = await pool.query(
      `INSERT INTO availability_responses (session_id, player_id, response, reason, responded_by, responded_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (session_id, player_id)
       DO UPDATE SET response = $3, reason = $4, responded_by = $5, responded_at = NOW()
       RETURNING *`,
      [id, player_id, response, reason || null, req.user.id]
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Bulk mark attendance for a session
router.put('/:teamId/schedule/:id/attendance', authenticateToken, loadTeamAndClub, async (req, res, next) => {
  try {
    const { teamId, id } = req.params
    const { attendance } = req.body

    // attendance should be an array of { player_id, attended }
    if (!Array.isArray(attendance)) {
      return res.status(400).json({ error: 'attendance must be an array of { player_id, attended }' })
    }

    // Verify session belongs to team
    const sessionCheck = await pool.query(
      'SELECT id FROM session_schedule WHERE id = $1 AND team_id = $2',
      [id, teamId]
    )
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const updated = []
    for (const entry of attendance) {
      // Upsert: if no availability response exists, create one with 'available' + attended
      const result = await pool.query(
        `INSERT INTO availability_responses (session_id, player_id, response, responded_by, responded_at, attended)
         VALUES ($1, $2, 'available', $3, NOW(), $4)
         ON CONFLICT (session_id, player_id)
         DO UPDATE SET attended = $4
         RETURNING id, player_id, attended`,
        [id, entry.player_id, req.user.id, entry.attended]
      )
      if (result.rows.length > 0) {
        updated.push(result.rows[0])
      }
    }

    res.json({ message: 'Attendance updated', updated_count: updated.length, updated })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// CLUB-WIDE ATTENDANCE STATS
// ==========================================

// Attendance trends across teams for a club
router.get('/clubs/:clubId/attendance/stats', authenticateToken, loadClub, requireClubFeature('attendance_tracking'), requireClubRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const { from, to, team_id } = req.query

    // Default to last 3 months if no date range specified
    const dateFrom = from || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const dateTo = to || new Date().toISOString().split('T')[0]

    // Overall attendance rate per team
    let teamQuery = `
      SELECT t.id AS team_id, t.name AS team_name,
        COUNT(ar.id) AS total_responses,
        COUNT(ar.id) FILTER (WHERE ar.attended = true) AS attended_count,
        COUNT(ar.id) FILTER (WHERE ar.attended = false) AS absent_count,
        COUNT(DISTINCT ss.id) AS total_sessions,
        CASE WHEN COUNT(ar.id) FILTER (WHERE ar.attended IS NOT NULL) > 0
          THEN ROUND(
            (COUNT(ar.id) FILTER (WHERE ar.attended = true)::DECIMAL /
             COUNT(ar.id) FILTER (WHERE ar.attended IS NOT NULL)) * 100, 1
          )
          ELSE 0
        END AS attendance_rate
      FROM teams t
      JOIN session_schedule ss ON ss.team_id = t.id
      LEFT JOIN availability_responses ar ON ar.session_id = ss.id
      WHERE t.club_id = $1
        AND ss.date >= $2 AND ss.date <= $3
        AND ss.status != 'cancelled'
    `
    const teamParams = [clubId, dateFrom, dateTo]
    let teamParamIdx = 4

    if (team_id) {
      teamQuery += ` AND t.id = $${teamParamIdx}`
      teamParams.push(team_id)
      teamParamIdx++
    }

    teamQuery += ' GROUP BY t.id, t.name ORDER BY t.name ASC'

    const teamStats = await pool.query(teamQuery, teamParams)

    // Weekly trend (attendance rate by week)
    const trendResult = await pool.query(
      `SELECT
        DATE_TRUNC('week', ss.date) AS week_start,
        COUNT(ar.id) FILTER (WHERE ar.attended = true) AS attended,
        COUNT(ar.id) FILTER (WHERE ar.attended IS NOT NULL) AS total_marked,
        CASE WHEN COUNT(ar.id) FILTER (WHERE ar.attended IS NOT NULL) > 0
          THEN ROUND(
            (COUNT(ar.id) FILTER (WHERE ar.attended = true)::DECIMAL /
             COUNT(ar.id) FILTER (WHERE ar.attended IS NOT NULL)) * 100, 1
          )
          ELSE 0
        END AS attendance_rate
      FROM session_schedule ss
      LEFT JOIN availability_responses ar ON ar.session_id = ss.id
      WHERE ss.club_id = $1
        AND ss.date >= $2 AND ss.date <= $3
        AND ss.status != 'cancelled'
      GROUP BY DATE_TRUNC('week', ss.date)
      ORDER BY week_start ASC`,
      [clubId, dateFrom, dateTo]
    )

    // Top absentees (players with lowest attendance rates)
    const absenteesResult = await pool.query(
      `SELECT p.id AS player_id, p.name AS player_name, t.name AS team_name,
        COUNT(ar.id) FILTER (WHERE ar.attended = true) AS sessions_attended,
        COUNT(ar.id) FILTER (WHERE ar.attended IS NOT NULL) AS sessions_tracked,
        CASE WHEN COUNT(ar.id) FILTER (WHERE ar.attended IS NOT NULL) > 0
          THEN ROUND(
            (COUNT(ar.id) FILTER (WHERE ar.attended = true)::DECIMAL /
             COUNT(ar.id) FILTER (WHERE ar.attended IS NOT NULL)) * 100, 1
          )
          ELSE 0
        END AS attendance_rate
      FROM players p
      JOIN teams t ON p.team_id = t.id
      JOIN availability_responses ar ON ar.player_id = p.id
      JOIN session_schedule ss ON ar.session_id = ss.id
      WHERE t.club_id = $1
        AND ss.date >= $2 AND ss.date <= $3
        AND ss.status != 'cancelled'
        AND p.is_active = true
      GROUP BY p.id, p.name, t.name
      HAVING COUNT(ar.id) FILTER (WHERE ar.attended IS NOT NULL) >= 3
      ORDER BY attendance_rate ASC
      LIMIT 20`,
      [clubId, dateFrom, dateTo]
    )

    // Availability response rates
    const responseRateResult = await pool.query(
      `SELECT
        COUNT(DISTINCT ss.id) AS total_sessions,
        (SELECT COUNT(DISTINCT p.id) FROM players p JOIN teams t ON p.team_id = t.id WHERE t.club_id = $1 AND p.is_active = true) AS total_players,
        COUNT(ar.id) AS total_responses,
        COUNT(ar.id) FILTER (WHERE ar.response = 'available') AS available_responses,
        COUNT(ar.id) FILTER (WHERE ar.response = 'unavailable') AS unavailable_responses,
        COUNT(ar.id) FILTER (WHERE ar.response = 'maybe') AS maybe_responses
      FROM session_schedule ss
      LEFT JOIN availability_responses ar ON ar.session_id = ss.id
      WHERE ss.club_id = $1
        AND ss.date >= $2 AND ss.date <= $3
        AND ss.status != 'cancelled'`,
      [clubId, dateFrom, dateTo]
    )

    res.json({
      date_range: { from: dateFrom, to: dateTo },
      team_stats: teamStats.rows,
      weekly_trend: trendResult.rows,
      low_attendance_players: absenteesResult.rows,
      response_summary: responseRateResult.rows[0] || {},
    })
  } catch (error) {
    next(error)
  }
})

export default router
