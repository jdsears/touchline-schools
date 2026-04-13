import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import pool from '../config/database.js'
import {
  getEntitlements,
  getUsageCounter,
  getCurrentPeriodKey,
  canCreateTeam,
  canAddPlayer,
  getSubscription,
  createSubscription,
  startTrial,
  getAllPlans,
  getFreePlan,
  getPlan,
  formatPrice,
  getDeepVideoCredits,
  addDeepVideoCredits,
  deductDeepVideoCredit,
  getVideoCredits,
  addVideoCredits,
  PLANS,
  DEEP_VIDEO_PACKS,
  VIDEO_CREDIT_PACKS,
} from '../services/billingService.js'
import {
  isStripeConfigured,
  createCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
  handleWebhookEvent,
  syncSubscriptionFromStripe,
} from '../services/stripeService.js'

const router = Router()

// ==========================================
// PUBLIC ROUTES
// ==========================================

/**
 * GET /api/billing/config
 * Get billing configuration (Stripe status)
 */
router.get('/config', (req, res) => {
  res.json({
    stripeEnabled: isStripeConfigured(),
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
  })
})

/**
 * GET /api/billing/plans
 * Get all available plans for pricing page
 */
router.get('/plans', (req, res) => {
  const plans = getAllPlans()

  // Group plans by type for easier display
  const grouped = {
    team: plans.filter(p => p.id.startsWith('team_')),
    academy: plans.filter(p => p.id.startsWith('academy_')),
    club: plans.filter(p => p.id.startsWith('club_')),
  }

  // Format for display
  const formatted = plans.map(plan => ({
    id: plan.id,
    name: plan.name,
    lookupKey: plan.lookupKey,
    price: plan.price,
    priceFormatted: formatPrice(plan.price),
    interval: plan.interval,
    teamLimit: plan.teamLimit,
    playerLimitPerTeam: plan.playerLimitPerTeam,
    limits: plan.limits,
    flags: plan.flags,
  }))

  res.json({
    plans: formatted,
    grouped: {
      team: grouped.team.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        priceFormatted: formatPrice(p.price),
        interval: p.interval,
        teamLimit: p.teamLimit,
        playerLimitPerTeam: p.playerLimitPerTeam,
        limits: p.limits,
        flags: p.flags,
      })),
      academy: grouped.academy.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        priceFormatted: formatPrice(p.price),
        interval: p.interval,
        teamLimit: p.teamLimit,
        playerLimitPerTeam: p.playerLimitPerTeam,
        limits: p.limits,
        flags: p.flags,
      })),
      club: grouped.club.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        priceFormatted: formatPrice(p.price),
        interval: p.interval,
        teamLimit: p.teamLimit,
        playerLimitPerTeam: p.playerLimitPerTeam,
        limits: p.limits,
        flags: p.flags,
      })),
    },
  })
})

// ==========================================
// AUTHENTICATED ROUTES
// ==========================================

/**
 * GET /api/billing/entitlements
 * Get current entitlements for the user/team
 */
router.get('/entitlements', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.query
    const entitlements = await getEntitlements({
      userId: req.user.id,
      teamId: teamId || req.user.team_id,
      userEmail: req.user.email,
    })

    res.json(entitlements)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/billing/usage
 * Get usage counters for a team
 */
router.get('/usage', authenticateToken, async (req, res, next) => {
  try {
    const { teamId, period } = req.query
    const targetTeamId = teamId || req.user.team_id

    if (!targetTeamId) {
      return res.status(400).json({ message: 'Team ID required' })
    }

    const periodKey = period || getCurrentPeriodKey()
    const usage = await getUsageCounter(targetTeamId, periodKey)
    const entitlements = await getEntitlements({
      userId: req.user.id,
      teamId: targetTeamId,
      userEmail: req.user.email,
    })

    res.json({
      period: periodKey,
      usage: {
        video: {
          current: usage.video_count || 0,
          limit: entitlements.limits.video,
          remaining: Math.max(0, entitlements.limits.video - (usage.video_count || 0)),
        },
        ocr: {
          current: usage.ocr_count || 0,
          limit: entitlements.limits.ocr,
          remaining: Math.max(0, entitlements.limits.ocr - (usage.ocr_count || 0)),
        },
        email: {
          current: usage.email_count || 0,
          limit: entitlements.limits.email,
          remaining: Math.max(0, entitlements.limits.email - (usage.email_count || 0)),
        },
        deep_video: {
          current: usage.deep_video_count || 0,
          limit: entitlements.limits.deep_video || 0,
          remaining: Math.max(0, (entitlements.limits.deep_video || 0) - (usage.deep_video_count || 0)),
        },
      },
      billingExempt: entitlements.billingExempt,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/billing/subscription
 * Get current subscription details
 */
router.get('/subscription', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.query
    const targetTeamId = teamId || req.user.team_id

    if (!targetTeamId) {
      return res.status(400).json({ message: 'Team ID required' })
    }

    const subscription = await getSubscription(targetTeamId)
    const entitlements = await getEntitlements({
      userId: req.user.id,
      teamId: targetTeamId,
      userEmail: req.user.email,
    })

    const plan = subscription ? getPlan(subscription.plan_id) : null

    res.json({
      subscription: subscription ? {
        id: subscription.id,
        planId: subscription.plan_id,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        provider: subscription.provider,
      } : null,
      plan: plan ? {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        priceFormatted: formatPrice(plan.price),
        interval: plan.interval,
      } : null,
      entitlements,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/billing/limits/team
 * Check if user can create another team
 */
router.get('/limits/team', authenticateToken, async (req, res, next) => {
  try {
    const result = await canCreateTeam(req.user.id, req.user.email)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/billing/limits/player
 * Check if team can add another player
 */
router.get('/limits/player', authenticateToken, async (req, res, next) => {
  try {
    const { teamId } = req.query
    const targetTeamId = teamId || req.user.team_id

    if (!targetTeamId) {
      return res.status(400).json({ message: 'Team ID required' })
    }

    const result = await canAddPlayer(targetTeamId)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/billing/trial/start
 * Start a trial for the current team
 */
router.post('/trial/start', authenticateToken, async (req, res, next) => {
  try {
    const teamId = req.user.team_id

    if (!teamId) {
      return res.status(400).json({ message: 'No team associated with user' })
    }

    // Check if already has active subscription or trial
    const entitlements = await getEntitlements({ teamId })
    if (entitlements.status === 'active' || entitlements.status === 'trialing') {
      return res.status(400).json({ message: 'Team already has an active subscription or trial' })
    }

    const result = await startTrial(teamId)
    res.json({
      success: true,
      trialEndsAt: result.trialEndsAt,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/billing/upgrade
 * Upgrade to a new plan (manual for now, or redirect to Stripe)
 */
router.post('/upgrade', authenticateToken, async (req, res, next) => {
  try {
    const { planId, teamId } = req.body
    const targetTeamId = teamId || req.user.team_id

    if (!targetTeamId) {
      return res.status(400).json({ message: 'Team ID required' })
    }

    if (!planId) {
      return res.status(400).json({ message: 'Plan ID required' })
    }

    const plan = getPlan(planId)
    if (!plan) {
      return res.status(400).json({ message: 'Invalid plan' })
    }

    // If Stripe is configured, redirect to checkout
    if (isStripeConfigured()) {
      return res.json({
        success: true,
        requiresPayment: true,
        message: 'Use /api/billing/create-checkout-session for payment',
      })
    }

    // Fallback: create a manual subscription (for testing without Stripe)
    const subscription = await createSubscription(targetTeamId, planId, {
      provider: 'manual',
    })

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        planId: subscription.plan_id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/billing/create-checkout-session
 * Create a Stripe Checkout session for subscription
 */
router.post('/create-checkout-session', authenticateToken, async (req, res, next) => {
  try {
    const { planId, teamId, successUrl, cancelUrl } = req.body
    const targetTeamId = teamId || req.user.team_id

    if (!targetTeamId) {
      return res.status(400).json({ message: 'Team ID required' })
    }

    if (!planId) {
      return res.status(400).json({ message: 'Plan ID required' })
    }

    const plan = getPlan(planId)
    if (!plan) {
      return res.status(400).json({ message: 'Invalid plan' })
    }

    if (!isStripeConfigured()) {
      return res.status(503).json({ message: 'Payment processing is not configured' })
    }

    const session = await createCheckoutSession({
      userId: req.user.id,
      email: req.user.email,
      name: req.user.name,
      planId,
      teamId: targetTeamId,
      successUrl,
      cancelUrl,
    })

    res.json({
      success: true,
      sessionId: session.sessionId,
      url: session.url,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/billing/portal
 * Create a Stripe Customer Portal session
 */
router.post('/portal', authenticateToken, async (req, res, next) => {
  try {
    const { returnUrl } = req.body

    if (!isStripeConfigured()) {
      return res.status(503).json({ message: 'Payment processing is not configured' })
    }

    const session = await createPortalSession(req.user.id, returnUrl)

    res.json({
      success: true,
      url: session.url,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/billing/validate-promo
 * Validate a promo code (public endpoint for checkout flow)
 */
router.post('/validate-promo', async (req, res, next) => {
  try {
    const { code, plan_id } = req.body

    if (!code) {
      return res.status(400).json({ valid: false, message: 'Promo code required' })
    }

    const result = await pool.query(
      `SELECT * FROM promo_codes
       WHERE UPPER(code) = UPPER($1)
       AND is_active = true
       AND (valid_from IS NULL OR valid_from <= NOW())
       AND (valid_until IS NULL OR valid_until > NOW())
       AND (max_uses IS NULL OR current_uses < max_uses)`,
      [code]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ valid: false, message: 'Invalid or expired promo code' })
    }

    const promo = result.rows[0]

    // Check if applicable to plan
    if (promo.applicable_plans && promo.applicable_plans.length > 0 && plan_id) {
      if (!promo.applicable_plans.includes(plan_id)) {
        return res.status(400).json({ valid: false, message: 'Code not valid for this plan' })
      }
    }

    res.json({
      valid: true,
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      description: promo.description
    })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// VIDEO ANALYSIS CREDITS (team-level top-ups)
// ==========================================

/**
 * GET /api/billing/video-credits
 * Get current video credit balance for team
 */
router.get('/video-credits', authenticateToken, async (req, res) => {
  try {
    const teamId = req.user.team_id || req.query.teamId
    if (!teamId) return res.status(400).json({ message: 'Team ID required' })
    const balance = await getVideoCredits(teamId)
    res.json({ balance, packs: VIDEO_CREDIT_PACKS })
  } catch (error) {
    res.status(500).json({ message: 'Failed to get credit balance' })
  }
})

/**
 * POST /api/billing/video-credits/purchase
 * Purchase video analysis credits (creates Stripe Payment Intent)
 */
router.post('/video-credits/purchase', authenticateToken, async (req, res, next) => {
  try {
    const { packId } = req.body
    const pack = VIDEO_CREDIT_PACKS[packId]
    if (!pack) {
      return res.status(400).json({ message: 'Invalid credit pack' })
    }

    const teamId = req.user.team_id
    if (!teamId) return res.status(400).json({ message: 'No team associated' })

    // Check user is on a paid plan
    const entitlements = await getEntitlements({
      userId: req.user.id,
      teamId,
      userEmail: req.user.email,
    })
    if (entitlements.planId === 'free') {
      return res.status(403).json({
        message: 'Video credits are available on paid plans. Upgrade to Core or above to purchase.',
        upgradeRequired: true,
      })
    }

    if (!isStripeConfigured()) {
      // In dev/test mode, just grant the credits directly
      const balance = await addVideoCredits(teamId, pack.credits)
      return res.json({ success: true, balance, credits: pack.credits })
    }

    // Create Stripe Payment Intent
    const stripe = (await import('../services/stripeService.js')).default
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pack.price,
      currency: 'gbp',
      metadata: {
        userId: req.user.id,
        teamId,
        packId,
        credits: pack.credits.toString(),
        type: 'video_credits',
      },
    })

    res.json({
      clientSecret: paymentIntent.client_secret,
      credits: pack.credits,
      amount: pack.price,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/billing/video-credits/confirm
 * Confirm credit purchase after successful payment
 */
router.post('/video-credits/confirm', authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId, credits } = req.body
    const teamId = req.user.team_id
    if (!paymentIntentId || !credits || !teamId) {
      return res.status(400).json({ message: 'Missing payment details' })
    }

    const balance = await addVideoCredits(teamId, parseInt(credits))
    res.json({ success: true, balance })
  } catch (error) {
    res.status(500).json({ message: 'Failed to confirm credit purchase' })
  }
})

// ==========================================
// DEEP VIDEO CREDITS
// ==========================================

/**
 * GET /api/billing/deep-video-credits
 * Get current deep video credit balance
 */
router.get('/deep-video-credits', authenticateToken, async (req, res) => {
  try {
    const balance = await getDeepVideoCredits(req.user.id)
    res.json({ balance, packs: DEEP_VIDEO_PACKS })
  } catch (error) {
    res.status(500).json({ message: 'Failed to get credit balance' })
  }
})

/**
 * POST /api/billing/deep-video-credits/purchase
 * Purchase deep video credits (creates Stripe Payment Intent)
 */
router.post('/deep-video-credits/purchase', authenticateToken, async (req, res, next) => {
  try {
    const { packId } = req.body
    const pack = DEEP_VIDEO_PACKS[packId]
    if (!pack) {
      return res.status(400).json({ message: 'Invalid credit pack' })
    }

    // Check user is on a paid plan (free users can't purchase deep video)
    const entitlements = await getEntitlements({
      userId: req.user.id,
      teamId: req.user.currentTeamId,
      userEmail: req.user.email,
    })
    if (entitlements.planId === 'free') {
      return res.status(403).json({
        message: 'Deep video analysis is available on paid plans. Upgrade to Core or above to purchase credits.',
        upgradeRequired: true,
      })
    }

    if (!isStripeConfigured()) {
      // In dev/test mode, just grant the credits directly
      const balance = await addDeepVideoCredits(req.user.id, pack.credits)
      return res.json({ success: true, balance, credits: pack.credits })
    }

    // Create Stripe Payment Intent
    const stripe = (await import('../services/stripeService.js')).default
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pack.price,
      currency: 'gbp',
      metadata: {
        userId: req.user.id,
        packId,
        credits: pack.credits.toString(),
        type: 'deep_video_credits',
      },
    })

    res.json({
      clientSecret: paymentIntent.client_secret,
      credits: pack.credits,
      amount: pack.price,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/billing/deep-video-credits/confirm
 * Confirm credit purchase after successful payment (client-side confirmation)
 */
router.post('/deep-video-credits/confirm', authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId, credits } = req.body
    if (!paymentIntentId || !credits) {
      return res.status(400).json({ message: 'Missing payment details' })
    }

    // Add credits immediately on client confirmation (webhook is safety net)
    const balance = await addDeepVideoCredits(req.user.id, parseInt(credits))
    res.json({ success: true, balance })
  } catch (error) {
    res.status(500).json({ message: 'Failed to confirm credit purchase' })
  }
})

/**
 * POST /api/billing/sync
 * Sync subscription from Stripe — safety net for missed webhooks.
 * Checks if the user has an active Stripe subscription and creates/updates
 * the local record if it's missing or stale.
 */
router.post('/sync', authenticateToken, async (req, res, next) => {
  try {
    const teamId = req.body.teamId || req.user.team_id
    if (!teamId) {
      return res.status(400).json({ message: 'Team ID required' })
    }

    const result = await syncSubscriptionFromStripe(req.user.id, teamId)

    if (result.synced) {
      // Re-fetch entitlements to return updated data
      const entitlements = await getEntitlements({
        userId: req.user.id,
        teamId,
        userEmail: req.user.email,
      })
      return res.json({ synced: true, action: result.action, planId: result.planId, entitlements })
    }

    res.json({ synced: false, reason: result.reason })
  } catch (error) {
    console.error('[Billing Sync] Error:', error.message)
    next(error)
  }
})

/**
 * POST /api/billing/webhook
 * Handle Stripe webhook events
 * Note: This endpoint needs raw body - configured in index.js
 */
router.post('/webhook', async (req, res) => {
  const signature = req.headers['stripe-signature']

  if (!signature) {
    console.error('[Stripe Webhook] No signature provided')
    return res.status(400).json({ message: 'No signature' })
  }

  try {
    const event = constructWebhookEvent(req.body, signature)
    await handleWebhookEvent(event)
    res.json({ received: true })
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error.message)
    res.status(400).json({ message: error.message })
  }
})

export default router
