import express from 'express'
import crypto from 'crypto'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

function icsEscape(s) { return (s || '').replace(/[\\;,\n]/g, c => c === '\n' ? '\\n' : `\\${c}`) }

function toICSDate(d, t) {
  const date = new Date(d)
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  if (!t) return `${yyyy}${mm}${dd}`
  const [hh, mi] = t.split(':')
  return `${yyyy}${mm}${dd}T${hh}${mi}00`
}

function buildVEvent(uid, dtstart, dtend, summary, location, description, status) {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    dtstart.length === 8 ? `DTSTART;VALUE=DATE:${dtstart}` : `DTSTART;TZID=Europe/London:${dtstart}`,
  ]
  if (dtend) lines.push(dtend.length === 8 ? `DTEND;VALUE=DATE:${dtend}` : `DTEND;TZID=Europe/London:${dtend}`)
  lines.push(`SUMMARY:${icsEscape(summary)}`)
  if (location) lines.push(`LOCATION:${icsEscape(location)}`)
  if (description) lines.push(`DESCRIPTION:${icsEscape(description)}`)
  lines.push(`STATUS:${status || 'CONFIRMED'}`)
  lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`)
  lines.push('END:VEVENT')
  return lines.join('\r\n')
}

function wrapCalendar(name, events) {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Touchline Schools//Calendar//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${icsEscape(name)}`,
    ...events, 'END:VCALENDAR',
  ].join('\r\n')
}

// --- Token management (authenticated) ---

router.get('/tokens', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, scope, scope_id, created_at FROM calendar_tokens WHERE user_id = $1 ORDER BY created_at`,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) { console.error('Calendar tokens error:', err); res.status(500).json({ error: 'Failed to load tokens' }) }
})

router.post('/tokens', authenticateToken, async (req, res) => {
  try {
    const { scope, scope_id } = req.body
    if (!['teacher_schedule', 'team_fixtures', 'school_fixtures', 'pupil_schedule'].includes(scope)) {
      return res.status(400).json({ error: 'Invalid scope' })
    }
    const token = crypto.randomBytes(32).toString('hex')
    const result = await pool.query(
      `INSERT INTO calendar_tokens (user_id, token, scope, scope_id) VALUES ($1, $2, $3, $4) RETURNING id, scope, scope_id, created_at`,
      [req.user.id, token, scope, scope_id || null]
    )
    res.json({ ...result.rows[0], token })
  } catch (err) { console.error('Create token error:', err); res.status(500).json({ error: 'Failed to create token' }) }
})

router.delete('/tokens/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(`DELETE FROM calendar_tokens WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id])
    res.json({ ok: true })
  } catch (err) { console.error('Delete token error:', err); res.status(500).json({ error: 'Failed to revoke token' }) }
})

// --- ICS feed (token-authenticated, no session required) ---

async function lookupToken(token) {
  const result = await pool.query(`SELECT * FROM calendar_tokens WHERE token = $1`, [token])
  return result.rows[0] || null
}

async function getTeacherScheduleEvents(userId) {
  const events = []
  const fixtures = await pool.query(
    `SELECT m.id, m.match_date, m.match_time, m.opponent, m.location, m.home_away, m.kit_type,
            m.score_for, m.score_against, t.name AS team_name, t.sport
     FROM matches m JOIN teams t ON t.id = m.team_id WHERE t.manager_id = $1 ORDER BY m.match_date`, [userId])
  for (const f of fixtures.rows) {
    const desc = [f.home_away === 'home' ? 'Home' : 'Away', f.kit_type ? `Kit: ${f.kit_type}` : ''].filter(Boolean).join('. ')
    events.push(buildVEvent(
      `fixture-${f.id}@touchline`, toICSDate(f.match_date, f.match_time),
      f.match_time ? toICSDate(f.match_date, `${parseInt(f.match_time) + 2}:00`) : null,
      `${f.sport}: ${f.team_name} vs ${f.opponent}`, f.location, desc,
      f.score_for != null ? 'CONFIRMED' : 'TENTATIVE'
    ))
  }
  const training = await pool.query(
    `SELECT ts.id, ts.date, ts.time, ts.location, ts.duration, t.name AS team_name, t.sport
     FROM training_sessions ts JOIN teams t ON t.id = ts.team_id WHERE t.manager_id = $1 ORDER BY ts.date`, [userId])
  for (const s of training.rows) {
    const dur = s.duration || 90
    events.push(buildVEvent(
      `training-${s.id}@touchline`, toICSDate(s.date, s.time),
      s.time ? toICSDate(s.date, `${parseInt(s.time) + Math.floor(dur / 60)}:${(parseInt(s.time?.split(':')[1] || 0) + dur % 60).toString().padStart(2, '0')}`) : null,
      `${s.team_name} training`, s.location, null, 'CONFIRMED'
    ))
  }
  return events
}

async function getTeamFixtureEvents(teamId) {
  const fixtures = await pool.query(
    `SELECT m.id, m.match_date, m.match_time, m.opponent, m.location, m.home_away, m.kit_type,
            t.name AS team_name, t.sport
     FROM matches m JOIN teams t ON t.id = m.team_id WHERE m.team_id = $1 ORDER BY m.match_date`, [teamId])
  return fixtures.rows.map(f => buildVEvent(
    `fixture-${f.id}@touchline`, toICSDate(f.match_date, f.match_time), null,
    `${f.sport}: ${f.team_name} vs ${f.opponent}`, f.location,
    `${f.home_away === 'home' ? 'Home' : 'Away'}${f.kit_type ? `. Kit: ${f.kit_type}` : ''}`, 'CONFIRMED'
  ))
}

router.get('/feed/:token.ics', async (req, res) => {
  try {
    const ct = await lookupToken(req.params.token)
    if (!ct) return res.status(404).send('Invalid calendar token')

    let events = [], name = 'Touchline Calendar'
    if (ct.scope === 'teacher_schedule') {
      events = await getTeacherScheduleEvents(ct.user_id)
      name = 'My Teaching Schedule'
    } else if (ct.scope === 'team_fixtures') {
      events = await getTeamFixtureEvents(ct.scope_id)
      const team = await pool.query('SELECT name FROM teams WHERE id = $1', [ct.scope_id])
      name = `${team.rows[0]?.name || 'Team'} Fixtures`
    } else if (ct.scope === 'school_fixtures') {
      const teams = await pool.query('SELECT id FROM teams WHERE school_id = $1', [ct.scope_id])
      for (const t of teams.rows) events.push(...await getTeamFixtureEvents(t.id))
      name = 'School Fixtures'
    }

    res.set({ 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `inline; filename="${name}.ics"` })
    res.send(wrapCalendar(name, events))
  } catch (err) { console.error('ICS feed error:', err); res.status(500).send('Calendar feed error') }
})

// --- Single event download (authenticated) ---

router.get('/event/fixture/:id.ics', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT m.*, t.name AS team_name, t.sport FROM matches m JOIN teams t ON t.id = m.team_id WHERE m.id = $1`, [req.params.id])
    const f = r.rows[0]
    if (!f) return res.status(404).json({ error: 'Not found' })
    const ev = buildVEvent(
      `fixture-${f.id}@touchline`, toICSDate(f.match_date, f.match_time), null,
      `${f.sport}: ${f.team_name} vs ${f.opponent}`, f.location,
      `${f.home_away === 'home' ? 'Home' : 'Away'}${f.kit_type ? `. Kit: ${f.kit_type}` : ''}`, 'CONFIRMED'
    )
    res.set({ 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="fixture.ics"` })
    res.send(wrapCalendar(`${f.team_name} vs ${f.opponent}`, [ev]))
  } catch (err) { console.error('Single event error:', err); res.status(500).json({ error: 'Failed' }) }
})

export default router
