/**
 * Weekly department activity snapshots.
 *
 * The HoD dashboard used to show hardcoded trend chips ("↑ 14"); they were
 * removed rather than fake real metrics. This service makes honest ones
 * possible: one row per school per ISO week, captured by a daily sweep (and
 * opportunistically whenever the weekly summary is viewed), so "this week vs
 * last week" always compares against a frozen prior snapshot.
 */

import pool from '../config/database.js'

// Monday of the week containing d (local time). getDay() is 0 on Sunday,
// which the naive `- getDay() + 1` form pushed into NEXT week.
export function weekStartOf(d = new Date()) {
  const out = new Date(d)
  const day = out.getDay() || 7
  out.setDate(out.getDate() - day + 1)
  out.setHours(0, 0, 0, 0)
  return out
}

export function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

// Compute the live numbers for one school over one week. Definitions match
// the weekly-summary endpoint so the dashboard and its history agree.
export async function computeWeekStats(schoolId, ws, we) {
  const [participation, fixtures, activity] = await Promise.all([
    pool.query(
      `SELECT COUNT(DISTINCT t.sport) AS sports_active,
              COUNT(DISTINCT p.id) AS unique_pupils
       FROM matches m
       JOIN teams t ON t.id = m.team_id
       JOIN pupils p ON p.team_id = t.id AND p.is_active = true
       WHERE t.school_id = $1 AND m.match_date BETWEEN $2 AND $3`,
      [schoolId, ws, we]
    ),
    pool.query(
      `SELECT COUNT(*) AS n FROM matches m
       JOIN teams t ON t.id = m.team_id
       WHERE t.school_id = $1 AND m.match_date BETWEEN $2 AND $3`,
      [schoolId, ws, we]
    ),
    pool.query(
      `SELECT COUNT(*) AS observations,
              COUNT(DISTINCT o.observer_id) AS active_staff
       FROM observations o
       JOIN school_members sm ON sm.user_id = o.observer_id AND sm.school_id = $1
       WHERE o.created_at >= $2::date AND o.created_at < ($3::date + 1)`,
      [schoolId, ws, we]
    ),
  ])
  return {
    sports_active: parseInt(participation.rows[0]?.sports_active || 0, 10),
    unique_pupils: parseInt(participation.rows[0]?.unique_pupils || 0, 10),
    fixtures_count: parseInt(fixtures.rows[0]?.n || 0, 10),
    observations_logged: parseInt(activity.rows[0]?.observations || 0, 10),
    active_staff: parseInt(activity.rows[0]?.active_staff || 0, 10),
  }
}

export async function upsertWeekStats(schoolId, weekStartDate, stats) {
  await pool.query(
    `INSERT INTO school_weekly_stats
       (school_id, week_start, sports_active, unique_pupils, fixtures_count, observations_logged, active_staff, captured_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (school_id, week_start) DO UPDATE SET
       sports_active = EXCLUDED.sports_active,
       unique_pupils = EXCLUDED.unique_pupils,
       fixtures_count = EXCLUDED.fixtures_count,
       observations_logged = EXCLUDED.observations_logged,
       active_staff = EXCLUDED.active_staff,
       captured_at = NOW()`,
    [schoolId, weekStartDate, stats.sports_active, stats.unique_pupils,
     stats.fixtures_count, stats.observations_logged, stats.active_staff]
  )
}

// Snapshot the CURRENT week for one school (or all schools when id omitted).
// Re-running within the same week refreshes the row; once the week rolls
// over, the old row freezes and becomes "last week".
export async function captureWeeklyStats(schoolId = null) {
  const monday = weekStartOf()
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const ws = isoDate(monday)
  const we = isoDate(sunday)

  const schools = schoolId
    ? [{ id: schoolId }]
    : (await pool.query(`SELECT id FROM schools`)).rows

  let captured = 0
  for (const school of schools) {
    try {
      const stats = await computeWeekStats(school.id, ws, we)
      await upsertWeekStats(school.id, ws, stats)
      captured++
    } catch (err) {
      console.error(`[WeeklyStats] Capture failed for school ${school.id}:`, err.message)
    }
  }
  return captured
}

// Last week's frozen snapshot for a school, or null when no history exists.
export async function previousWeekStats(schoolId) {
  const monday = weekStartOf()
  const prevMonday = new Date(monday)
  prevMonday.setDate(prevMonday.getDate() - 7)
  const r = await pool.query(
    `SELECT sports_active, unique_pupils, fixtures_count, observations_logged, active_staff
     FROM school_weekly_stats WHERE school_id = $1 AND week_start = $2`,
    [schoolId, isoDate(prevMonday)]
  ).catch(() => ({ rows: [] })) // table not migrated yet
  return r.rows[0] || null
}
