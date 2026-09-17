import pool from '../config/database.js'

/**
 * Tenant-isolation helpers.
 *
 * Many routes operate on a resource by raw id (e.g. /:id). Authenticating the
 * caller is not enough — we must also confirm the resource belongs to a school
 * or team the caller is a member of. These helpers return the set of tenant ids
 * the caller may access, with the sentinel '*' meaning "site admin: all tenants"
 * so existing cross-school admin behaviour is preserved.
 *
 * Usage:
 *   const schools = await getUserSchoolIds(req.user)
 *   if (!isAllowed(schools, resource.school_id)) return res.status(404).json(...)
 */

// All school_ids the user can access, or '*' for site admins.
export async function getUserSchoolIds(user) {
  if (!user) return []
  if (user.is_admin) return '*'
  const r = await pool.query(
    `SELECT school_id FROM school_members WHERE user_id = $1 AND status = 'active'`,
    [user.id]
  )
  return r.rows.map((row) => row.school_id).filter(Boolean)
}

// All team_ids the user belongs to, or '*' for site admins.
// Includes the legacy users.team_id so single-team accounts are not locked out.
export async function getUserTeamIds(user) {
  if (!user) return []
  if (user.is_admin) return '*'
  const r = await pool.query(
    `SELECT team_id FROM team_memberships WHERE user_id = $1`,
    [user.id]
  )
  const ids = r.rows.map((row) => row.team_id).filter(Boolean)
  if (user.team_id && !ids.includes(user.team_id)) ids.push(user.team_id)
  return ids
}

// True if the caller's scope ('*' or an array) permits the target id.
export function isAllowed(scope, target) {
  if (scope === '*') return true
  if (target == null) return false
  return Array.isArray(scope) && scope.includes(target)
}

// True when the caller has no tenant access at all (and is not an admin).
export function hasNoTenantAccess(scope) {
  return scope !== '*' && (!Array.isArray(scope) || scope.length === 0)
}
