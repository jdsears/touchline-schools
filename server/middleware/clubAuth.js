import pool from '../config/database.js'

// Club tier feature definitions
const CLUB_TIER_FEATURES = {
  club_starter: {
    max_teams: 6,
    emails_per_team: 250,
    player_crm: true,
    guardian_management: true,
    online_registration: true,
    payment_collection: true,
    financial_dashboard: 'basic',
    payment_reminders: true,
    csv_export: false,
    white_label: false,
    revenue_forecasting: false,
    advanced_reporting: false,
    dedicated_support: false,
    // Phase 4: Safeguarding
    safeguarding: true,
    incident_reporting: true,
    compliance_alerts: true,
    // Phase 5: Events & Availability
    events: true,
    availability_tracking: true,
    attendance_tracking: true,
    // Phase 6: AI Intelligence
    ai_match_reports: true,
    ai_attendance_insights: true,
    ai_compliance_analysis: true,
    ai_coach_development: true,
    ai_season_report: false,
    ai_grant_helper: false,
  },
  club_growth: {
    max_teams: 15,
    emails_per_team: 500,
    player_crm: true,
    guardian_management: true,
    online_registration: true,
    payment_collection: true,
    financial_dashboard: 'full',
    payment_reminders: true,
    csv_export: true,
    white_label: true,
    revenue_forecasting: true,
    advanced_reporting: true,
    dedicated_support: false,
    // Phase 4: Safeguarding
    safeguarding: true,
    incident_reporting: true,
    compliance_alerts: true,
    // Phase 5: Events & Availability
    events: true,
    availability_tracking: true,
    attendance_tracking: true,
    // Phase 6: AI Intelligence
    ai_match_reports: true,
    ai_attendance_insights: true,
    ai_compliance_analysis: true,
    ai_coach_development: true,
    ai_season_report: true,
    ai_grant_helper: true,
  },
  club_scale: {
    max_teams: 40,
    emails_per_team: 1000,
    player_crm: true,
    guardian_management: true,
    online_registration: true,
    payment_collection: true,
    financial_dashboard: 'full',
    payment_reminders: true,
    csv_export: true,
    white_label: true,
    revenue_forecasting: true,
    advanced_reporting: true,
    dedicated_support: true,
    // Phase 4: Safeguarding
    safeguarding: true,
    incident_reporting: true,
    compliance_alerts: true,
    // Phase 5: Events & Availability
    events: true,
    availability_tracking: true,
    attendance_tracking: true,
    // Phase 6: AI Intelligence
    ai_match_reports: true,
    ai_attendance_insights: true,
    ai_compliance_analysis: true,
    ai_coach_development: true,
    ai_season_report: true,
    ai_grant_helper: true,
  },
}

export { CLUB_TIER_FEATURES }

// Role hierarchy for permission checks
const ROLE_HIERARCHY = {
  owner: 6,
  admin: 5,
  treasurer: 4,
  secretary: 3,
  coach: 2,
  parent: 1,
}

// Default permissions per role
const ROLE_PERMISSIONS = {
  owner: { can_manage_payments: true, can_manage_players: true, can_view_financials: true, can_invite_members: true },
  admin: { can_manage_payments: true, can_manage_players: true, can_view_financials: true, can_invite_members: true },
  treasurer: { can_manage_payments: true, can_manage_players: false, can_view_financials: true, can_invite_members: false },
  secretary: { can_manage_payments: false, can_manage_players: true, can_view_financials: false, can_invite_members: true },
  coach: { can_manage_payments: false, can_manage_players: false, can_view_financials: false, can_invite_members: false },
  parent: { can_manage_payments: false, can_manage_players: false, can_view_financials: false, can_invite_members: false },
}

export { ROLE_PERMISSIONS }

// Load club by ID and attach to req
export async function loadClub(req, res, next) {
  try {
    const { clubId } = req.params
    if (!clubId) {
      return res.status(400).json({ error: 'Club ID required' })
    }

    const result = await pool.query('SELECT * FROM clubs WHERE id = $1', [clubId])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Club not found' })
    }

    req.club = result.rows[0]
    next()
  } catch (error) {
    next(error)
  }
}

// Load club by slug and attach to req
export async function loadClubBySlug(req, res, next) {
  try {
    const { slug } = req.params
    if (!slug) {
      return res.status(400).json({ error: 'Club slug required' })
    }

    const result = await pool.query('SELECT * FROM clubs WHERE slug = $1', [slug])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Club not found' })
    }

    req.club = result.rows[0]
    req.params.clubId = result.rows[0].id
    next()
  } catch (error) {
    next(error)
  }
}

// Require user to have one of the specified club roles
export function requireClubRole(...roles) {
  return async (req, res, next) => {
    try {
      const clubId = req.params.clubId || req.club?.id
      if (!clubId || !req.user) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      // Site admins bypass club role checks
      if (req.user.is_admin) {
        req.clubRole = 'owner'
        req.clubMembership = { role: 'owner', can_manage_payments: true, can_manage_players: true, can_view_financials: true, can_invite_members: true }
        return next()
      }

      const result = await pool.query(
        'SELECT * FROM club_members WHERE club_id = $1 AND user_id = $2 AND status = $3',
        [clubId, req.user.id, 'active']
      )

      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'You are not a member of this club' })
      }

      const membership = result.rows[0]
      if (!roles.includes(membership.role)) {
        return res.status(403).json({ error: 'Insufficient permissions for this action' })
      }

      req.clubRole = membership.role
      req.clubMembership = membership
      next()
    } catch (error) {
      next(error)
    }
  }
}

// Require specific club feature based on tier
export function requireClubFeature(feature) {
  return (req, res, next) => {
    const club = req.club
    if (!club) {
      return res.status(400).json({ error: 'Club context required' })
    }

    const tierFeatures = CLUB_TIER_FEATURES[club.subscription_tier]
    if (!tierFeatures || !tierFeatures[feature]) {
      return res.status(403).json({
        error: 'Feature not available on your current plan',
        feature,
        current_tier: club.subscription_tier,
      })
    }

    next()
  }
}
