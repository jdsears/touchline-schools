import pool from '../config/database.js'

// School tier feature definitions
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
  school_pro: {
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
    safeguarding: true,
    incident_reporting: true,
    compliance_alerts: true,
    events: true,
    availability_tracking: true,
    attendance_tracking: true,
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
// Schools product roles (preferred) alongside legacy club roles
const ROLE_HIERARCHY = {
  // Schools product roles
  owner: 7,
  school_admin: 6,
  head_of_pe: 5,
  head_of_sport: 4,
  teacher: 2,
  read_only: 1,
  // Legacy club roles (backwards compat)
  admin: 6,
  treasurer: 3,
  secretary: 3,
  coach: 2,
  parent: 1,
}

// Human-readable display labels for school roles
export const ROLE_LABELS = {
  owner: 'Owner',
  school_admin: 'School Admin',
  head_of_pe: 'Head of PE/Sport',
  head_of_sport: 'Head of Sport',
  teacher: 'Teacher',
  read_only: 'Read Only',
  // Legacy
  admin: 'Admin',
  coach: 'Teacher',
  parent: 'Parent',
  treasurer: 'Treasurer',
  secretary: 'Secretary',
}

// Roles that are considered "admin-level" (can manage school settings, staff, billing)
export const ADMIN_ROLES = ['owner', 'school_admin', 'admin']

// Roles that have HoD-level access (can see whole-school PE/sport data)
export const HOD_ROLES = ['owner', 'school_admin', 'admin', 'head_of_pe']

// Roles that have any teaching/coaching staff access (not read-only/parent)
export const STAFF_ROLES = ['owner', 'school_admin', 'admin', 'head_of_pe', 'head_of_sport', 'teacher', 'coach', 'secretary', 'treasurer']

// Default permissions per role
const ROLE_PERMISSIONS = {
  // Schools product roles
  owner: {
    can_manage_payments: true, can_manage_players: true, can_view_financials: true,
    can_invite_members: true, can_view_all_classes: true, can_view_all_teams: true,
    can_manage_curriculum: true, can_view_reports: true, can_manage_safeguarding: true,
  },
  school_admin: {
    can_manage_payments: true, can_manage_players: true, can_view_financials: true,
    can_invite_members: true, can_view_all_classes: true, can_view_all_teams: true,
    can_manage_curriculum: true, can_view_reports: true, can_manage_safeguarding: true,
  },
  head_of_pe: {
    can_manage_payments: false, can_manage_players: true, can_view_financials: false,
    can_invite_members: true, can_view_all_classes: true, can_view_all_teams: true,
    can_manage_curriculum: true, can_view_reports: true, can_manage_safeguarding: true,
  },
  head_of_sport: {
    can_manage_payments: false, can_manage_players: true, can_view_financials: false,
    can_invite_members: false, can_view_all_classes: false, can_view_all_teams: true,
    can_manage_curriculum: false, can_view_reports: true, can_manage_safeguarding: false,
  },
  teacher: {
    can_manage_payments: false, can_manage_players: false, can_view_financials: false,
    can_invite_members: false, can_view_all_classes: false, can_view_all_teams: false,
    can_manage_curriculum: false, can_view_reports: true, can_manage_safeguarding: false,
  },
  read_only: {
    can_manage_payments: false, can_manage_players: false, can_view_financials: false,
    can_invite_members: false, can_view_all_classes: true, can_view_all_teams: true,
    can_manage_curriculum: false, can_view_reports: true, can_manage_safeguarding: false,
  },
  // Legacy club roles (backwards compat)
  admin: {
    can_manage_payments: true, can_manage_players: true, can_view_financials: true,
    can_invite_members: true, can_view_all_classes: true, can_view_all_teams: true,
    can_manage_curriculum: true, can_view_reports: true, can_manage_safeguarding: true,
  },
  treasurer: { can_manage_payments: true, can_manage_players: false, can_view_financials: true, can_invite_members: false },
  secretary: { can_manage_payments: false, can_manage_players: true, can_view_financials: false, can_invite_members: true },
  coach: { can_manage_payments: false, can_manage_players: false, can_view_financials: false, can_invite_members: false, can_view_reports: true },
  parent: { can_manage_payments: false, can_manage_players: false, can_view_financials: false, can_invite_members: false },
}

export { ROLE_PERMISSIONS }

// Load school by ID and attach to req
export async function loadSchool(req, res, next) {
  try {
    const { schoolId } = req.params
    if (!schoolId) {
      return res.status(400).json({ error: 'School ID required' })
    }

    const result = await pool.query('SELECT * FROM schools WHERE id = $1', [schoolId])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' })
    }

    req.school = result.rows[0]
    next()
  } catch (error) {
    next(error)
  }
}

// Load school by slug and attach to req
export async function loadSchoolBySlug(req, res, next) {
  try {
    const { slug } = req.params
    if (!slug) {
      return res.status(400).json({ error: 'School slug required' })
    }

    const result = await pool.query('SELECT * FROM schools WHERE slug = $1', [slug])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' })
    }

    req.school = result.rows[0]
    req.params.schoolId = result.rows[0].id
    next()
  } catch (error) {
    next(error)
  }
}

// Require user to have one of the specified school roles
// Checks school_role first (new schools product roles), falls back to legacy role column.
export function requireSchoolRole(...roles) {
  return async (req, res, next) => {
    try {
      const schoolId = req.params.schoolId || req.school?.id
      if (!schoolId || !req.user) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      // Site admins bypass school role checks
      if (req.user.is_admin) {
        const ownerPerms = ROLE_PERMISSIONS['owner']
        req.clubRole = 'owner'
        req.schoolRole = 'owner'
        req.clubMembership = { role: 'owner', school_role: 'owner', ...ownerPerms }
        return next()
      }

      const result = await pool.query(
        'SELECT * FROM school_members WHERE school_id = $1 AND user_id = $2 AND status = $3',
        [schoolId, req.user.id, 'active']
      )

      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'You are not a member of this school' })
      }

      const membership = result.rows[0]
      // Use school_role (new) if set, fall back to legacy role
      const effectiveRole = membership.school_role || membership.role

      if (!roles.includes(effectiveRole) && !roles.includes(membership.role)) {
        return res.status(403).json({ error: 'Insufficient permissions for this action' })
      }

      req.clubRole = effectiveRole
      req.schoolRole = effectiveRole
      req.clubMembership = membership
      next()
    } catch (error) {
      next(error)
    }
  }
}

// Utility: get the effective role for a membership row
export function getEffectiveRole(membership) {
  return membership.school_role || membership.role || 'teacher'
}

// Require specific school feature based on tier
export function requireSchoolFeature(feature) {
  return (req, res, next) => {
    const school = req.school
    if (!school) {
      return res.status(400).json({ error: 'School context required' })
    }

    const tierFeatures = CLUB_TIER_FEATURES[school.subscription_tier]
    if (!tierFeatures || !tierFeatures[feature]) {
      return res.status(403).json({
        error: 'Feature not available on your current plan',
        feature,
        current_tier: school.subscription_tier,
      })
    }

    next()
  }
}
