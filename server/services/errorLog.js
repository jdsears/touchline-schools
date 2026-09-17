// Persistent server-side error log.
//
// For months, real failures hid behind silent catch blocks and surfaced only
// as empty pages that had to be debugged from screenshots. Everything that
// reaches here is (a) printed to the console and (b) best-effort written to
// server_error_log so an admin can read recent failures from the API without
// shelling into the host. Writes are rate-capped so an error storm cannot
// itself take the database down, and this module must never throw.
import pool from '../config/database.js'

let recentWrites = []
const MAX_WRITES_PER_MINUTE = 20

export function logServerError(kind, err, req = null) {
  const message = (err?.message || String(err) || 'unknown').slice(0, 2000)
  const stack = (err?.stack || '').slice(0, 8000)
  console.error(`[${kind}]`, message)

  const now = Date.now()
  recentWrites = recentWrites.filter((t) => now - t < 60_000)
  if (recentWrites.length >= MAX_WRITES_PER_MINUTE) return
  recentWrites.push(now)

  pool.query(
    `INSERT INTO server_error_log (kind, message, stack, path, method, user_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      kind,
      message,
      stack,
      req?.originalUrl?.slice(0, 500) || null,
      req?.method || null,
      req?.user?.id || null,
    ]
  ).catch(() => { /* the error log must never become an error source */ })
}
