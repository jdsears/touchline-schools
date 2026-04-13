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
      `SELECT u.id, u.email, u.name, u.role, u.team_id, u.pupil_id, u.is_admin, u.has_completed_onboarding
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

export function requireTeamAccess(req, res, next) {
  const teamId = req.params.teamId || req.params.id

  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  // Admins can access any team
  if (req.user.is_admin) {
    return next()
  }

  if (req.user.team_id !== teamId) {
    return res.status(403).json({ message: 'Access denied to this team' })
  }

  next()
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

/**
 * Feature-gating middleware: require a minimum subscription tier.
 *
 * Tier hierarchy (lowest → highest):
 *   free < team_core < team_pro < academy < club_starter < club_growth < club_scale
 *
 * Admins and billing-exempt users bypass tier checks.
 * Annual plans are treated as equivalent to their monthly counterpart.
 *
 * Usage:
 *   app.get('/api/video-analysis', authenticateToken, requireTier('team_core_monthly'), handler)
 *   app.get('/api/school/payments', authenticateToken, requireTier('club_starter_monthly'), handler)
 */
const TIER_HIERARCHY = [
  'free',
  'trial_14d',
  'team_core_monthly',
  'team_core_annual',
  'team_pro_monthly',
  'team_pro_annual',
  'academy_monthly',
  'academy_annual',
  'club_starter_monthly',
  'club_growth_monthly',
  'club_scale_monthly',
]

export function requireTier(minimumTier) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    // Admins bypass tier checks
    if (req.user.is_admin) {
      return next()
    }

    const userTier = req.user.subscription_tier || 'free'
    const userIndex = TIER_HIERARCHY.indexOf(userTier)
    const requiredIndex = TIER_HIERARCHY.indexOf(minimumTier)

    // If tier not found in hierarchy, treat as free
    const effectiveUserIndex = userIndex === -1 ? 0 : userIndex
    const effectiveRequiredIndex = requiredIndex === -1 ? 0 : requiredIndex

    if (effectiveUserIndex >= effectiveRequiredIndex) {
      return next()
    }

    return res.status(403).json({
      error: 'Upgrade required',
      code: 'TIER_UPGRADE_REQUIRED',
      required_tier: minimumTier,
      current_tier: userTier,
    })
  }
}
