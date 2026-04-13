import pool from '../config/database.js'

// ==========================================
// PLAN DEFINITIONS
// ==========================================

export const PLANS = {
  // Free (no Stripe product — handled entirely in database)
  free: {
    id: 'free',
    name: 'Free',
    lookupKey: null,
    price: 0,
    interval: null,
    teamLimit: 1,
    playerLimitPerTeam: 16,
    limits: {
      video: 1,          // 1 standard analysis per month
      deep_video: 0,     // Paid only (credit-based)
      chat: 20,          // 20 AI messages per month
      sessions: 3,       // 3 session plans per month
      ocr: 0,            // Paid feature
      email: 0,          // Paid feature
      idp: 0,            // Paid feature
    },
    flags: {
      aiChat: true,      // Enabled but limited to 20 msgs/month
      exportBranding: true, // "Powered by Touchline" on exports
    },
  },

  // Trial (legacy — existing trials continue, new signups go to free)
  trial_14d: {
    id: 'trial_14d',
    name: 'Trial',
    lookupKey: null,
    price: 0,
    interval: null,
    teamLimit: 1,
    playerLimitPerTeam: 25,
    limits: {
      video: 2,
      deep_video: 0,
      chat: Infinity,
      sessions: Infinity,
      ocr: 10,
      email: 100,
      idp: 0,
    },
    flags: {
      aiChat: true,
    },
    isTrial: true,
  },

  // Core — £9.99/mo, £7.99/mo billed annually
  team_core_monthly: {
    id: 'team_core_monthly',
    name: 'Core',
    lookupKey: 'touchline_core',
    price: 999,  // pence
    interval: 'month',
    teamLimit: 1,
    playerLimitPerTeam: 25,
    limits: {
      video: 5,
      deep_video: 0,  // Credit-based add-on
      chat: Infinity,
      sessions: 10,
      ocr: 25,
      email: 250,
      idp: Infinity,
    },
    flags: {
      aiChat: true,
    },
  },
  team_core_annual: {
    id: 'team_core_annual',
    name: 'Core',
    lookupKey: 'touchline_core_annual',
    price: 9588,  // £95.88/yr = £7.99/mo
    interval: 'year',
    teamLimit: 1,
    playerLimitPerTeam: 25,
    limits: {
      video: 5,
      deep_video: 0,
      chat: Infinity,
      sessions: 10,
      ocr: 25,
      email: 250,
      idp: Infinity,
    },
    flags: {
      aiChat: true,
    },
  },

  // Pro — £19.99/mo, £15.99/mo billed annually
  team_pro_monthly: {
    id: 'team_pro_monthly',
    name: 'Pro',
    lookupKey: 'touchline_pro',
    price: 1999,
    interval: 'month',
    teamLimit: 3,
    playerLimitPerTeam: 25,
    limits: {
      video: 10,
      deep_video: 0,  // Credit-based add-on
      chat: Infinity,
      sessions: Infinity,
      ocr: Infinity,
      email: 500,
      idp: Infinity,
    },
    flags: {
      aiChat: true,
      advancedExports: true,
      seasonalSummaries: true,
      priorityProcessing: true,
    },
  },
  team_pro_annual: {
    id: 'team_pro_annual',
    name: 'Pro',
    lookupKey: 'touchline_pro_annual',
    price: 19188,  // £191.88/yr = £15.99/mo
    interval: 'year',
    teamLimit: 3,
    playerLimitPerTeam: 25,
    limits: {
      video: 10,
      deep_video: 0,
      chat: Infinity,
      sessions: Infinity,
      ocr: Infinity,
      email: 500,
      idp: Infinity,
    },
    flags: {
      aiChat: true,
      advancedExports: true,
      seasonalSummaries: true,
      priorityProcessing: true,
    },
  },

  // Academy — £29.99/mo, £24.99/mo billed annually
  academy_monthly: {
    id: 'academy_monthly',
    name: 'Academy',
    lookupKey: 'touchline_academy',
    price: 2999,
    interval: 'month',
    teamLimit: 5,
    playerLimitPerTeam: 25,
    limits: {
      video: 15,
      deep_video: 0,  // Credit-based add-on
      chat: Infinity,
      sessions: Infinity,
      ocr: Infinity,
      email: 750,
      idp: Infinity,
    },
    flags: {
      aiChat: true,
      advancedExports: true,
      seasonalSummaries: true,
      priorityProcessing: true,
      brandingControls: true,
      advancedReporting: true,
      prioritySupport: true,
    },
  },
  academy_annual: {
    id: 'academy_annual',
    name: 'Academy',
    lookupKey: 'touchline_academy_annual',
    price: 29988,  // £299.88/yr = £24.99/mo
    interval: 'year',
    teamLimit: 5,
    playerLimitPerTeam: 25,
    limits: {
      video: 15,
      deep_video: 0,
      chat: Infinity,
      sessions: Infinity,
      ocr: Infinity,
      email: 750,
      idp: Infinity,
    },
    flags: {
      aiChat: true,
      advancedExports: true,
      seasonalSummaries: true,
      priorityProcessing: true,
      brandingControls: true,
      advancedReporting: true,
      prioritySupport: true,
    },
  },

  // Club Plans — monthly only, video pools shared across teams
  club_starter_monthly: {
    id: 'club_starter_monthly',
    name: 'Club Starter',
    lookupKey: 'touchline_club_starter',
    price: 9900,    // £99/mo
    interval: 'month',
    teamLimit: 8,
    playerLimitPerTeam: 25,
    limits: {
      video: 20,      // Pool shared across all teams
      deep_video: 0,  // Credit-based add-on
      chat: Infinity,
      sessions: Infinity,
      ocr: Infinity,
      email: 500,
      idp: Infinity,
    },
    flags: {
      aiChat: true,
      advancedExports: true,
      seasonalSummaries: true,
      priorityProcessing: true,
      brandingControls: true,
    },
    isClubPool: true,
  },
  club_growth_monthly: {
    id: 'club_growth_monthly',
    name: 'Club Growth',
    lookupKey: 'touchline_club_growth',
    price: 19900,   // £199/mo
    interval: 'month',
    teamLimit: 16,
    playerLimitPerTeam: 25,
    limits: {
      video: 40,      // Pool shared across all teams
      deep_video: 0,
      chat: Infinity,
      sessions: Infinity,
      ocr: Infinity,
      email: 750,
      idp: Infinity,
    },
    flags: {
      aiChat: true,
      advancedExports: true,
      seasonalSummaries: true,
      priorityProcessing: true,
      brandingControls: true,
      advancedReporting: true,
      whiteLabel: true,
    },
    isClubPool: true,
  },
  club_scale_monthly: {
    id: 'club_scale_monthly',
    name: 'Club Scale',
    lookupKey: 'touchline_club_scale',
    price: 34900,   // £349/mo
    interval: 'month',
    teamLimit: Infinity,
    playerLimitPerTeam: 25,
    limits: {
      video: 80,      // Pool shared across all teams
      deep_video: 0,
      chat: Infinity,
      sessions: Infinity,
      ocr: Infinity,
      email: Infinity,
      idp: Infinity,
    },
    flags: {
      aiChat: true,
      advancedExports: true,
      seasonalSummaries: true,
      priorityProcessing: true,
      brandingControls: true,
      advancedReporting: true,
      prioritySupport: true,
      whiteLabel: true,
    },
    isClubPool: true,
  },
}

// Video analysis credit packs (one-time top-ups beyond monthly plan allowance)
export const VIDEO_CREDIT_PACKS = {
  pack_3:  { credits: 3,  price: 349, lookupKey: 'touchline_video_credits_3' },   // £3.49
  pack_5:  { credits: 5,  price: 499, lookupKey: 'touchline_video_credits_5' },   // £4.99
  pack_10: { credits: 10, price: 799, lookupKey: 'touchline_video_credits_10' },  // £7.99
}

// Deep video credit packs (one-time Stripe Payment Intents, not subscriptions)
export const DEEP_VIDEO_PACKS = {
  pack_1: { credits: 1, price: 149, lookupKey: 'touchline_deep_video_1' },   // £1.49
  pack_5: { credits: 5, price: 599, lookupKey: 'touchline_deep_video_5' },   // £5.99
  pack_10: { credits: 10, price: 999, lookupKey: 'touchline_deep_video_10' }, // £9.99
}

// Tier ordering for feature-gating (lowest to highest)
export const TIER_ORDER = [
  'free',
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

// Map Stripe lookup_key back to plan ID
export const LOOKUP_KEY_TO_PLAN = Object.fromEntries(
  Object.values(PLANS)
    .filter(p => p.lookupKey)
    .map(p => [p.lookupKey, p.id])
)

// Default entitlements for users with no subscription (Free plan)
const FREE_ENTITLEMENTS = {
  planId: 'free',
  planName: 'Free',
  teamLimit: 1,
  playerLimitPerTeam: 16,
  limits: {
    video: 1,
    deep_video: 0,
    chat: 20,
    sessions: 3,
    ocr: 0,
    email: 0,
    idp: 0,
  },
  flags: {
    aiChat: true,
    exportBranding: true,
  },
  billingExempt: false,
  status: 'free',
}

// Exempt entitlements (equivalent to Club Scale + unlimited credits)
const EXEMPT_ENTITLEMENTS = {
  planId: 'billing_exempt',
  planName: 'Billing Exempt',
  teamLimit: Infinity,
  playerLimitPerTeam: 25,
  limits: {
    video: Infinity,
    deep_video: Infinity,
    chat: Infinity,
    sessions: Infinity,
    ocr: Infinity,
    email: Infinity,
    idp: Infinity,
  },
  flags: {
    aiChat: true,
    advancedExports: true,
    seasonalSummaries: true,
    priorityProcessing: true,
    brandingControls: true,
    advancedReporting: true,
    prioritySupport: true,
    whiteLabel: true,
  },
  billingExempt: true,
  status: 'active',
}

// ==========================================
// EXEMPT EMAIL ALLOWLIST
// ==========================================

function getExemptEmails() {
  const envEmails = process.env.TOUCHLINE_BILLING_EXEMPT_EMAILS || ''
  const emails = envEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  // Always include the hardcoded exempt email
  if (!emails.includes('john@moonbootscapital.io')) {
    emails.push('john@moonbootscapital.io')
  }
  return emails
}

export function isEmailExempt(email) {
  if (!email) return false
  const exemptEmails = getExemptEmails()
  return exemptEmails.includes(email.toLowerCase())
}

// ==========================================
// ENTITLEMENT RESOLUTION
// ==========================================

/**
 * Get entitlements for a user/team
 * Priority:
 * 1. If user email in exempt allowlist -> return exempt entitlements
 * 2. Active subscription for team
 * 3. Trial if within trial period
 * 4. No plan -> free state
 */
export async function getEntitlements({ userId, teamId, userEmail }) {
  try {
    // 1. Check if user is billing exempt
    if (userEmail && isEmailExempt(userEmail)) {
      console.log(`[Billing] User ${userEmail} is billing exempt`)
      return EXEMPT_ENTITLEMENTS
    }

    // Also check user's billing_exempt flag in database
    if (userId) {
      const userResult = await pool.query(
        'SELECT email, billing_exempt FROM users WHERE id = $1',
        [userId]
      )
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0]
        if (user.billing_exempt || isEmailExempt(user.email)) {
          console.log(`[Billing] User ${user.email} is billing exempt (db flag or allowlist)`)
          return EXEMPT_ENTITLEMENTS
        }
      }
    }

    // 2. Check for active subscription on team
    if (teamId) {
      const subResult = await pool.query(
        `SELECT * FROM subscriptions
         WHERE team_id = $1
         AND status IN ('active', 'trialing')
         ORDER BY created_at DESC
         LIMIT 1`,
        [teamId]
      )

      if (subResult.rows.length > 0) {
        const subscription = subResult.rows[0]

        // For trialing subscriptions, enforce the period end strictly
        // For active subscriptions, trust the status — period_end may be stale
        // if a Stripe renewal webhook was missed or delayed
        const periodExpired = subscription.current_period_end && new Date(subscription.current_period_end) < new Date()
        if (subscription.status === 'trialing' && periodExpired) {
          console.log(`[Billing] Trial expired for team ${teamId} (ended ${subscription.current_period_end})`)
          // Fall through to trial/free checks below
        } else {
          const plan = PLANS[subscription.plan_id]

          if (plan) {
            return {
              planId: plan.id,
              planName: plan.name,
              teamLimit: plan.teamLimit,
              playerLimitPerTeam: plan.playerLimitPerTeam,
              limits: { ...plan.limits },
              flags: { ...plan.flags },
              billingExempt: false,
              status: subscription.status,
              currentPeriodEnd: subscription.current_period_end,
              isTrial: plan.isTrial || false,
            }
          } else {
            console.warn(`[Billing] Subscription for team ${teamId} has unrecognized plan_id: '${subscription.plan_id}'`)
          }
        }
      }

      // 3. Check for trial on team
      const teamResult = await pool.query(
        'SELECT trial_ends_at, subscription_tier FROM teams WHERE id = $1',
        [teamId]
      )

      if (teamResult.rows.length > 0) {
        const team = teamResult.rows[0]
        const trialEndsAt = team.trial_ends_at ? new Date(team.trial_ends_at) : null

        if (trialEndsAt && trialEndsAt > new Date()) {
          const trialPlan = PLANS.trial_14d
          return {
            planId: trialPlan.id,
            planName: trialPlan.name,
            teamLimit: trialPlan.teamLimit,
            playerLimitPerTeam: trialPlan.playerLimitPerTeam,
            limits: { ...trialPlan.limits },
            flags: { ...trialPlan.flags },
            billingExempt: false,
            status: 'trialing',
            currentPeriodEnd: trialEndsAt,
            isTrial: true,
          }
        }
      }
    }

    // 4. No valid subscription or trial
    return FREE_ENTITLEMENTS
  } catch (error) {
    console.error('[Billing] Error getting entitlements:', error)
    return FREE_ENTITLEMENTS
  }
}

// ==========================================
// USAGE TRACKING
// ==========================================

/**
 * Get current period key (YYYY-MM format)
 */
export function getCurrentPeriodKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Get or create usage counter for a team and period
 */
export async function getUsageCounter(teamId, periodKey = null) {
  const period = periodKey || getCurrentPeriodKey()

  try {
    // Try to get existing counter
    let result = await pool.query(
      'SELECT * FROM usage_counters WHERE team_id = $1 AND period_key = $2',
      [teamId, period]
    )

    if (result.rows.length === 0) {
      // Create new counter for this period
      result = await pool.query(
        `INSERT INTO usage_counters (team_id, period_key, video_count, ocr_count, email_count)
         VALUES ($1, $2, 0, 0, 0)
         ON CONFLICT (team_id, period_key) DO NOTHING
         RETURNING *`,
        [teamId, period]
      )

      // If insert returned nothing due to race condition, fetch it
      if (result.rows.length === 0) {
        result = await pool.query(
          'SELECT * FROM usage_counters WHERE team_id = $1 AND period_key = $2',
          [teamId, period]
        )
      }
    }

    return result.rows[0] || { video_count: 0, ocr_count: 0, email_count: 0 }
  } catch (error) {
    console.error('[Billing] Error getting usage counter:', error)
    return { video_count: 0, ocr_count: 0, email_count: 0 }
  }
}

/**
 * Increment usage counter for a specific type
 */
export async function incrementUsage(teamId, type) {
  const period = getCurrentPeriodKey()
  const column = `${type}_count`

  if (!['video', 'deep_video', 'ocr', 'email', 'chat', 'sessions', 'idp'].includes(type)) {
    throw new Error(`Invalid usage type: ${type}`)
  }

  try {
    // Upsert the counter and increment
    const result = await pool.query(
      `INSERT INTO usage_counters (team_id, period_key, ${column})
       VALUES ($1, $2, 1)
       ON CONFLICT (team_id, period_key)
       DO UPDATE SET ${column} = usage_counters.${column} + 1, updated_at = NOW()
       RETURNING *`,
      [teamId, period]
    )

    console.log(`[Billing] Incremented ${type} usage for team ${teamId}: ${result.rows[0]?.[column]}`)
    return result.rows[0]
  } catch (error) {
    console.error('[Billing] Error incrementing usage:', error)
    throw error
  }
}

/**
 * Check if a usage type is within limits
 */
export async function checkUsageLimit(teamId, type, entitlements = null) {
  if (!entitlements) {
    entitlements = await getEntitlements({ teamId })
  }

  // Exempt users have no limits
  if (entitlements.billingExempt) {
    return { allowed: true, current: 0, limit: Infinity }
  }

  const usage = await getUsageCounter(teamId)
  const current = usage[`${type}_count`] || 0
  const limit = entitlements.limits[type] || 0

  return {
    allowed: current < limit,
    current,
    limit,
    remaining: Math.max(0, limit - current),
  }
}

/**
 * Check and increment usage in one operation
 * Returns { allowed, current, limit } - if allowed is false, increment was not performed
 */
export async function checkAndIncrementUsage(teamId, type, entitlements = null) {
  if (!entitlements) {
    entitlements = await getEntitlements({ teamId })
  }

  // Exempt users have no limits
  if (entitlements.billingExempt) {
    await incrementUsage(teamId, type)
    return { allowed: true, current: 0, limit: Infinity }
  }

  const check = await checkUsageLimit(teamId, type, entitlements)

  if (!check.allowed) {
    // If standard video analysis limit reached, try using a purchased credit
    if (type === 'video') {
      const deduction = await deductVideoCredit(teamId)
      if (deduction.success) {
        await incrementUsage(teamId, type)
        return {
          allowed: true,
          current: check.current + 1,
          limit: check.limit,
          remaining: 0,
          usedCredit: true,
          creditBalance: deduction.balance,
        }
      }
      // No purchased credits either — return with purchasable flag
      const creditBalance = await getVideoCredits(teamId)
      return { ...check, creditsAvailable: creditBalance, canPurchase: true }
    }
    return check
  }

  await incrementUsage(teamId, type)
  return {
    allowed: true,
    current: check.current + 1,
    limit: check.limit,
    remaining: check.remaining - 1,
  }
}

// ==========================================
// TEAM/PLAYER LIMIT CHECKS
// ==========================================

/**
 * Check if user can create another team
 */
export async function canCreateTeam(userId, userEmail) {
  const entitlements = await getEntitlements({ userId, userEmail })

  if (entitlements.billingExempt) {
    return { allowed: true, current: 0, limit: entitlements.teamLimit }
  }

  // Count teams owned by this user
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM teams WHERE owner_id = $1`,
    [userId]
  )
  const currentTeams = parseInt(result.rows[0]?.count || 0)

  return {
    allowed: currentTeams < entitlements.teamLimit,
    current: currentTeams,
    limit: entitlements.teamLimit,
  }
}

/**
 * Check if team can add another player
 */
export async function canAddPlayer(teamId) {
  const entitlements = await getEntitlements({ teamId })

  // Count current players
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM players WHERE team_id = $1',
    [teamId]
  )
  const currentPlayers = parseInt(result.rows[0]?.count || 0)

  return {
    allowed: currentPlayers < entitlements.playerLimitPerTeam,
    current: currentPlayers,
    limit: entitlements.playerLimitPerTeam,
  }
}

// ==========================================
// SUBSCRIPTION MANAGEMENT
// ==========================================

/**
 * Create or update a subscription for a team
 */
export async function createSubscription(teamId, planId, options = {}) {
  const plan = PLANS[planId]
  if (!plan) {
    throw new Error(`Invalid plan: ${planId}`)
  }

  const now = new Date()
  let periodEnd = new Date(now)

  if (plan.isTrial) {
    periodEnd.setDate(periodEnd.getDate() + 14)
  } else if (plan.interval === 'month') {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  } else if (plan.interval === 'year') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  }

  const result = await pool.query(
    `INSERT INTO subscriptions (team_id, plan_id, status, current_period_start, current_period_end, provider, provider_customer_id, provider_subscription_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      teamId,
      planId,
      plan.isTrial ? 'trialing' : 'active',
      now,
      periodEnd,
      options.provider || 'manual',
      options.providerCustomerId || null,
      options.providerSubscriptionId || null,
    ]
  )

  // Also update the team's subscription_tier for backwards compatibility
  await pool.query(
    'UPDATE teams SET subscription_tier = $1, trial_ends_at = $2 WHERE id = $3',
    [planId, plan.isTrial ? periodEnd : null, teamId]
  )

  console.log(`[Billing] Created subscription for team ${teamId}: ${planId}`)
  return result.rows[0]
}

/**
 * Start a trial for a team
 */
export async function startTrial(teamId) {
  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + 14)

  await pool.query(
    'UPDATE teams SET trial_ends_at = $1, subscription_tier = $2 WHERE id = $3',
    [trialEnd, 'trial_14d', teamId]
  )

  console.log(`[Billing] Started trial for team ${teamId}, ends ${trialEnd.toISOString()}`)
  return { trialEndsAt: trialEnd }
}

/**
 * Get subscription for a team
 */
export async function getSubscription(teamId) {
  const result = await pool.query(
    `SELECT * FROM subscriptions
     WHERE team_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [teamId]
  )
  return result.rows[0] || null
}

// ==========================================
// PRICING DISPLAY HELPERS
// ==========================================

/**
 * Get all plans for display
 */
export function getAllPlans() {
  return Object.values(PLANS).filter(p => !p.isTrial && p.id !== 'free')
}

export function getFreePlan() {
  return PLANS.free
}

/**
 * Get plan by ID
 */
export function getPlan(planId) {
  return PLANS[planId] || null
}

/**
 * Format price for display
 */
export function formatPrice(pence) {
  return `£${(pence / 100).toFixed(2)}`
}

// ==========================================
// VIDEO ANALYSIS CREDITS (team-level top-ups)
// ==========================================

/**
 * Get video credit balance for a team
 */
export async function getVideoCredits(teamId) {
  try {
    const result = await pool.query(
      'SELECT video_credits FROM teams WHERE id = $1',
      [teamId]
    )
    return result.rows[0]?.video_credits || 0
  } catch (error) {
    console.error('[Billing] Error getting video credits:', error)
    return 0
  }
}

/**
 * Add video credits to a team
 */
export async function addVideoCredits(teamId, credits) {
  try {
    const result = await pool.query(
      `UPDATE teams SET video_credits = COALESCE(video_credits, 0) + $1 WHERE id = $2
       RETURNING video_credits`,
      [credits, teamId]
    )
    console.log(`[Billing] Added ${credits} video credits for team ${teamId}, new balance: ${result.rows[0]?.video_credits}`)
    return result.rows[0]?.video_credits || 0
  } catch (error) {
    console.error('[Billing] Error adding video credits:', error)
    throw error
  }
}

/**
 * Deduct one video credit from a team. Returns false if insufficient balance.
 */
export async function deductVideoCredit(teamId) {
  try {
    const result = await pool.query(
      `UPDATE teams SET video_credits = video_credits - 1
       WHERE id = $1 AND video_credits > 0
       RETURNING video_credits`,
      [teamId]
    )
    if (result.rows.length === 0) {
      return { success: false, balance: 0 }
    }
    return { success: true, balance: result.rows[0].video_credits }
  } catch (error) {
    console.error('[Billing] Error deducting video credit:', error)
    throw error
  }
}

// ==========================================
// DEEP VIDEO CREDITS
// ==========================================

/**
 * Get deep video credit balance for a user
 */
export async function getDeepVideoCredits(userId) {
  try {
    const result = await pool.query(
      'SELECT deep_video_credits FROM users WHERE id = $1',
      [userId]
    )
    return result.rows[0]?.deep_video_credits || 0
  } catch (error) {
    console.error('[Billing] Error getting deep video credits:', error)
    return 0
  }
}

/**
 * Add deep video credits to a user account
 */
export async function addDeepVideoCredits(userId, credits) {
  try {
    const result = await pool.query(
      `UPDATE users SET deep_video_credits = COALESCE(deep_video_credits, 0) + $1 WHERE id = $2
       RETURNING deep_video_credits`,
      [credits, userId]
    )
    console.log(`[Billing] Added ${credits} deep video credits for user ${userId}, new balance: ${result.rows[0]?.deep_video_credits}`)
    return result.rows[0]?.deep_video_credits || 0
  } catch (error) {
    console.error('[Billing] Error adding deep video credits:', error)
    throw error
  }
}

/**
 * Deduct one deep video credit. Returns false if insufficient balance.
 */
export async function deductDeepVideoCredit(userId) {
  try {
    const result = await pool.query(
      `UPDATE users SET deep_video_credits = deep_video_credits - 1
       WHERE id = $1 AND deep_video_credits > 0
       RETURNING deep_video_credits`,
      [userId]
    )
    if (result.rows.length === 0) {
      return { success: false, balance: 0 }
    }
    return { success: true, balance: result.rows[0].deep_video_credits }
  } catch (error) {
    console.error('[Billing] Error deducting deep video credit:', error)
    throw error
  }
}
