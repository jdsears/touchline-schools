/**
 * Weekly HoD digest + day-before fixture reminders.
 *
 * Both run inside the existing daily sweep. Sends are gated three ways:
 * Resend must be configured, the recipient's notification preference must
 * allow it (digest is opt-in, reminders are opt-out, matching the
 * notification_preferences defaults), and a log table dedupes so a send can
 * never repeat for the same (recipient, week) or (recipient, match) even
 * across restarts.
 */

import pool from '../config/database.js'
import {
  isEmailEnabled,
  sendHodWeeklyDigestEmail,
  sendFixtureReminderEmail,
} from '../services/emailService.js'
import { weekStartOf, isoDate, computeWeekStats, previousWeekStats } from '../services/weeklyStats.js'
import { getFrontendUrl } from '../utils/urlUtils.js'

const DIGEST_ROLES = ['owner', 'school_admin', 'admin', 'head_of_pe', 'head_of_sport']

function londonWeekday(d = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'long' }).format(d)
}

function londonDatePlusDays(days) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date(Date.now() + days * 86_400_000))
  return parts // en-CA gives YYYY-MM-DD
}

// ── Digest content ──────────────────────────────────────────────────
export async function buildHodDigestData(schoolId, recipientName = 'there') {
  const monday = weekStartOf()
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const ws = isoDate(monday)
  const we = isoDate(sunday)

  const [school, fixtures, current, prev, voice, consents, windows] = await Promise.all([
    pool.query(`SELECT name FROM schools WHERE id = $1`, [schoolId]),
    pool.query(
      `SELECT COALESCE(m.date, m.match_date) AS date, m.match_time, m.opponent, m.home_away,
              t.name AS team_name, t.sport
       FROM matches m JOIN teams t ON t.id = m.team_id
       WHERE t.school_id = $1 AND COALESCE(m.date, m.match_date) BETWEEN $2 AND $3
       ORDER BY COALESCE(m.date, m.match_date), m.match_time NULLS LAST`,
      [schoolId, ws, we]
    ),
    computeWeekStats(schoolId, ws, we),
    previousWeekStats(schoolId),
    pool.query(
      `SELECT COUNT(*) AS n FROM observations o
       JOIN school_members sm ON sm.user_id = o.observer_id AND sm.school_id = $1
       WHERE o.review_state = 'pending_review'`,
      [schoolId]
    ).catch(() => ({ rows: [{ n: 0 }] })),
    pool.query(
      `SELECT COUNT(*) AS n FROM pupil_consents pc
       JOIN consent_types ct ON ct.id = pc.consent_type_id AND ct.school_id = $1
       WHERE pc.status = 'granted' AND pc.expires_at < NOW() + INTERVAL '30 days'`,
      [schoolId]
    ).catch(() => ({ rows: [{ n: 0 }] })),
    pool.query(
      `SELECT rw.name,
              (SELECT COUNT(*) FROM pupil_reports pr WHERE pr.reporting_window_id = rw.id AND pr.status IN ('submitted', 'published')) AS submitted,
              (SELECT COUNT(*) FROM pupil_reports pr WHERE pr.reporting_window_id = rw.id) AS total
       FROM reporting_windows rw
       WHERE rw.school_id = $1 AND rw.status = 'open' LIMIT 3`,
      [schoolId]
    ).catch(() => ({ rows: [] })),
  ])

  const dayName = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  const trends = prev ? {
    sports_active: { previous: prev.sports_active, delta: current.sports_active - prev.sports_active },
    unique_pupils: { previous: prev.unique_pupils, delta: current.unique_pupils - prev.unique_pupils },
    fixtures_count: { previous: prev.fixtures_count, delta: current.fixtures_count - prev.fixtures_count },
    active_staff: { previous: prev.active_staff, delta: current.active_staff - prev.active_staff },
  } : null

  return {
    recipientName,
    schoolName: school.rows[0]?.name || 'Your school',
    weekLabel: `w/c ${monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
    fixtures: fixtures.rows.map(f => ({
      day: dayName(f.date),
      teamName: f.team_name,
      sport: f.sport,
      opponent: f.opponent,
      homeAway: f.home_away,
      time: f.match_time ? String(f.match_time).slice(0, 5) : null,
    })),
    trends,
    pendingVoiceReviews: parseInt(voice.rows[0]?.n || 0, 10),
    consentsExpiring: parseInt(consents.rows[0]?.n || 0, 10),
    openWindows: windows.rows.map(w => ({
      name: w.name,
      submitted: parseInt(w.submitted, 10),
      total: parseInt(w.total, 10),
    })),
    dashboardUrl: `${getFrontendUrl()}/teacher/hod`,
  }
}

// ── Dispatch ────────────────────────────────────────────────────────
async function sendWeeklyDigests() {
  if (londonWeekday() !== 'Monday') return 0
  const weekStart = isoDate(weekStartOf())

  const recipients = await pool.query(
    `SELECT DISTINCT u.id, u.name, u.email, sm.school_id
     FROM school_members sm
     JOIN users u ON u.id = sm.user_id
     JOIN notification_preferences np ON np.user_id = u.id AND np.weekly_digest = true
     WHERE COALESCE(sm.school_role, sm.role) = ANY($1)`,
    [DIGEST_ROLES]
  )

  let sent = 0
  for (const r of recipients.rows) {
    try {
      const dedupe = await pool.query(
        `INSERT INTO email_digest_log (user_id, week_start) VALUES ($1, $2)
         ON CONFLICT (user_id, week_start) DO NOTHING RETURNING user_id`,
        [r.id, weekStart]
      )
      if (dedupe.rows.length === 0) continue // already sent this week

      const data = await buildHodDigestData(r.school_id, (r.name || '').split(' ')[0] || 'there')
      const result = await sendHodWeeklyDigestEmail(r.email, data)
      if (result?.success) sent++
    } catch (err) {
      console.error(`[EmailLifecycle] Digest failed for ${r.email}:`, err.message)
    }
  }
  if (sent > 0) console.log(`[EmailLifecycle] Weekly digests sent: ${sent}`)
  return sent
}

async function sendFixtureReminders() {
  const tomorrow = londonDatePlusDays(1)

  const rows = await pool.query(
    `SELECT m.id AS match_id, COALESCE(m.date, m.match_date) AS date, m.match_time, m.opponent,
            m.home_away, m.location, t.name AS team_name, t.sport,
            u.id AS user_id, u.name AS user_name, u.email
     FROM matches m
     JOIN teams t ON t.id = m.team_id
     JOIN LATERAL (
       SELECT owner.id, owner.name, owner.email FROM users owner WHERE owner.id = t.owner_id
       UNION
       SELECT stf.id, stf.name, stf.email FROM team_memberships tm
       JOIN users stf ON stf.id = tm.user_id
       WHERE tm.team_id = t.id AND tm.role IN ('manager', 'assistant')
     ) u ON true
     LEFT JOIN notification_preferences np ON np.user_id = u.id
     WHERE COALESCE(m.date, m.match_date) = $1
       AND COALESCE(np.fixture_reminders, true) = true`,
    [tomorrow]
  )

  let sent = 0
  for (const r of rows.rows) {
    try {
      const dedupe = await pool.query(
        `INSERT INTO email_fixture_reminder_log (match_id, user_id) VALUES ($1, $2)
         ON CONFLICT (match_id, user_id) DO NOTHING RETURNING match_id`,
        [r.match_id, r.user_id]
      )
      if (dedupe.rows.length === 0) continue

      const result = await sendFixtureReminderEmail(r.email, {
        recipientName: (r.user_name || '').split(' ')[0] || 'coach',
        teamName: r.team_name,
        sport: r.sport,
        opponent: r.opponent,
        homeAway: r.home_away,
        matchDate: new Date(r.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
        matchTime: r.match_time ? String(r.match_time).slice(0, 5) : null,
        location: r.location,
        fixtureUrl: `${getFrontendUrl()}/teacher/match/${r.match_id}/prep`,
      })
      if (result?.success) sent++
    } catch (err) {
      console.error(`[EmailLifecycle] Reminder failed for ${r.email}:`, err.message)
    }
  }
  if (sent > 0) console.log(`[EmailLifecycle] Fixture reminders sent: ${sent}`)
  return sent
}

export async function runEmailLifecycle() {
  if (!isEmailEnabled()) return // nothing to do without Resend configured
  await sendWeeklyDigests()
  await sendFixtureReminders()
}
