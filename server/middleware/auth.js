import jwt from 'jsonwebtoken'
import pool from '../config/database.js'

// Admin emails from environment (comma-separated)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Get base user data
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, u.team_id, u.pupil_id, u.is_admin, u.is_demo_user, u.has_completed_onboarding
       FROM users u
       WHERE u.id = $1`,
      [decoded.userId]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' })
    }

    const user = result.rows[0]

    // If JWT contains a teamId, use that team's context (for multi-team users)
    if (decoded.teamId) {
      // Look up the user's membership for this specific team
      const membershipResult = await pool.query(
        `SELECT tm.role, tm.pupil_id, t.subscription_tier, t.trial_ends_at
         FROM team_memberships tm
         JOIN teams t ON tm.team_id = t.id
         WHERE tm.user_id = $1 AND tm.team_id = $2`,
        [decoded.userId, decoded.teamId]
      )

      if (membershipResult.rows.length > 0) {
        const membership = membershipResult.rows[0]
        user.team_id = decoded.teamId
        user.role = membership.role
        user.pupil_id = membership.pupil_id
        user.subscription_tier = membership.subscription_tier
        user.trial_ends_at = membership.trial_ends_at
      } else {
        // Fallback: check if user.team_id matches the JWT teamId (legacy support)
        if (user.team_id === decoded.teamId) {
          // Use existing user data
          const teamResult = await pool.query(
            'SELECT subscription_tier, trial_ends_at FROM teams WHERE id = $1',
            [decoded.teamId]
          )
          if (teamResult.rows.length > 0) {
            user.subscription_tier = teamResult.rows[0].subscription_tier
            user.trial_ends_at = teamResult.rows[0].trial_ends_at
          }
        }
      }
    } else if (user.team_id) {
      // Legacy: No teamId in JWT, use user.team_id
      const teamResult = await pool.query(
        'SELECT subscription_tier, trial_ends_at FROM teams WHERE id = $1',
        [user.team_id]
      )
      if (teamResult.rows.length > 0) {
        user.subscription_tier = teamResult.rows[0].subscription_tier
        user.trial_ends_at = teamResult.rows[0].trial_ends_at
      }
    }

    // All users have full access (free app)
    user.hasFullAccess = true
    user.subscriptionStatus = user.is_admin ? 'admin' : 'free'

    req.user = user
    next()
  } catch (error) {
    console.error('Auth error:', error.name || error.message)
    // JWT errors (expired, malformed, invalid) are authentication failures → 401
    // This ensures the client interceptor properly cleans up stale tokens
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'NotBeforeError') {
      return res.status(401).json({ message: 'Invalid or expired token' })
    }
    // Other errors (DB errors etc.) are server issues → 500
    return res.status(500).json({ message: 'Authentication error' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' })
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' })
    }
    
    next()
  }
}

export async function requireTeamAccess(req, res, next) {
  const teamId = req.params.teamId || req.params.id

  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  // Admins can access any team
  if (req.user.is_admin) {
    return next()
  }

  // Legacy single-team path (pupils, parents, single-team coaches)
  if (req.user.team_id === teamId) {
    return next()
  }

  // Schools model: staff manage multiple teams via ownership or
  // team_memberships - the legacy users.team_id check alone locked
  // multi-team teachers out of every team but their primary.
  // School oversight roles (HoD, Director of Sport, school admins/owner) and
  // anyone explicitly flagged can_view_all_teams may access ANY team in their
  // own school - a Head of PE oversees the whole department, not just the
  // teams they personally coach.
  try {
    const access = await pool.query(
      `SELECT 1
       FROM teams t
       LEFT JOIN team_memberships tm
         ON tm.team_id = t.id AND tm.user_id = $2
       LEFT JOIN school_members sm
         ON sm.school_id = t.school_id AND sm.user_id = $2
       WHERE t.id = $1
         AND (
           t.owner_id = $2
           OR tm.role IN ('manager', 'assistant', 'scout')
           OR sm.can_view_all_teams = true
           OR COALESCE(sm.school_role, sm.role) IN
              ('owner', 'school_admin', 'admin', 'head_of_pe', 'head_of_sport')
         )
       LIMIT 1`,
      [teamId, req.user.id]
    )
    if (access.rows.length > 0) {
      return next()
    }
  } catch (err) {
    console.error('requireTeamAccess membership check failed:', err.message)
  }

  return res.status(403).json({ message: 'Access denied to this team' })
}

// Middleware to require full access (admin or valid subscription)
export function requireFullAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  if (!req.user.hasFullAccess) {
    return res.status(403).json({
      message: 'This feature requires an active subscription',
      code: 'SUBSCRIPTION_REQUIRED',
      subscriptionStatus: req.user.subscriptionStatus
    })
  }

  next()
}

// Middleware to require admin role
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  if (!req.user.is_admin) {
    return res.status(403).json({ message: 'Admin access required' })
  }

  next()
}
