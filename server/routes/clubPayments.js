import { Router } from 'express'
import Stripe from 'stripe'
import crypto from 'crypto'
import pool from '../config/database.js'
import { authenticateToken, requireTier } from '../middleware/auth.js'
import { loadClub, requireClubRole } from '../middleware/clubAuth.js'
import { sendNotificationEmail } from '../services/emailService.js'
import { getFrontendUrl } from '../utils/urlUtils.js'
import { createGiftAidRecord, generateReceiptPDF, getTaxYear, calculateGiftAid } from '../services/giftAidService.js'

const router = Router()

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

const PLATFORM_FEE_PERCENT = 0.5 // 0.5% platform fee

// ==========================================
// STRIPE CONNECT ONBOARDING
// ==========================================

// Start Stripe Connect onboarding
router.post('/:clubId/stripe/connect', authenticateToken, requireTier('club_starter_monthly'), loadClub, requireClubRole('owner', 'admin'), async (req, res, next) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe is not configured' })

    const club = req.club

    let accountId = club.stripe_account_id

    if (!accountId) {
      // Use club email, fall back to the authenticated user's email
      const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id])
      const accountEmail = club.contact_email || userResult.rows[0]?.email

      // Create a Standard Connect account
      const accountParams = {
        type: 'standard',
        country: 'GB',
        metadata: { club_id: club.id, club_name: club.name },
      }
      if (accountEmail) accountParams.email = accountEmail

      const account = await stripe.accounts.create(accountParams)
      accountId = account.id

      await pool.query('UPDATE clubs SET stripe_account_id = $1 WHERE id = $2', [accountId, club.id])
    }

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${getFrontendUrl()}/club/${club.slug}/payments?refresh=true`,
      return_url: `${getFrontendUrl()}/club/${club.slug}/payments?success=true`,
      type: 'account_onboarding',
    })

    res.json({ url: accountLink.url, account_id: accountId })
  } catch (error) {
    console.error('Stripe Connect error:', error.type || error.code, error.message)
    // Return Stripe-specific error details so the frontend can display them
    const status = error.statusCode || error.status || 500
    const message = error.type === 'StripeAuthenticationError'
      ? 'Stripe API key is invalid or expired. Please check your configuration.'
      : error.type === 'StripeConnectionError'
      ? 'Could not connect to Stripe. Please try again.'
      : error.message || 'Failed to start Stripe setup'
    res.status(status).json({ error: message })
  }
})

// Get connected account status
router.get('/:clubId/stripe/account', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer'), async (req, res, next) => {
  try {
    if (!stripe) return res.json({ enabled: false, reason: 'stripe_not_configured' })

    const club = req.club
    if (!club.stripe_account_id) {
      return res.json({ enabled: false, reason: 'not_connected' })
    }

    const account = await stripe.accounts.retrieve(club.stripe_account_id)

    res.json({
      enabled: true,
      account_id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      business_profile: account.business_profile,
      requirements: account.requirements,
    })
  } catch (error) {
    if (error.code === 'account_invalid') {
      return res.json({ enabled: false, reason: 'account_invalid' })
    }
    next(error)
  }
})

// Generate Stripe Express dashboard link
router.post('/:clubId/stripe/dashboard-link', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer'), async (req, res, next) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe is not configured' })
    if (!req.club.stripe_account_id) return res.status(400).json({ error: 'Stripe not connected' })

    const loginLink = await stripe.accounts.createLoginLink(req.club.stripe_account_id)
    res.json({ url: loginLink.url })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// PAYMENT PLANS CRUD
// ==========================================

// List payment plans
router.get('/:clubId/payment-plans', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer', 'secretary', 'coach'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const { include_archived } = req.query

    let query = 'SELECT * FROM payment_plans WHERE club_id = $1'
    if (!include_archived) query += ' AND is_active = true'
    query += ' ORDER BY created_at DESC'

    const result = await pool.query(query, [clubId])

    // Add subscriber counts
    const plans = await Promise.all(result.rows.map(async (plan) => {
      const countResult = await pool.query(
        "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active FROM player_subscriptions WHERE payment_plan_id = $1",
        [plan.id]
      )
      return {
        ...plan,
        subscriber_count: parseInt(countResult.rows[0].total),
        active_subscriber_count: parseInt(countResult.rows[0].active),
      }
    }))

    res.json(plans)
  } catch (error) {
    next(error)
  }
})

// Create payment plan
router.post('/:clubId/payment-plans', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const club = req.club
    const {
      name, description, plan_type, amount, currency,
      interval, interval_count, team_ids, applies_to_all_teams,
      term_start, term_end, available_for_registration,
    } = req.body

    if (!name || !amount) {
      return res.status(400).json({ error: 'Name and amount are required' })
    }

    const amountInPence = Math.round(amount * 100)

    // Create Stripe product/price on connected account if Stripe is connected
    let stripeProductId = null
    let stripePriceId = null

    if (stripe && club.stripe_account_id) {
      try {
        const product = await stripe.products.create({
          name: `${club.name} - ${name}`,
          metadata: { club_id: clubId, plan_name: name },
        }, { stripeAccount: club.stripe_account_id })

        stripeProductId = product.id

        const priceParams = {
          product: product.id,
          currency: currency || 'gbp',
          unit_amount: amountInPence,
          metadata: { club_id: clubId },
        }

        if (plan_type === 'subscription' || plan_type === 'recurring') {
          priceParams.recurring = {
            interval: interval || 'month',
            interval_count: interval_count || 1,
          }
        }

        const price = await stripe.prices.create(priceParams, { stripeAccount: club.stripe_account_id })
        stripePriceId = price.id
      } catch (stripeErr) {
        console.error('Stripe product/price creation failed:', stripeErr.message)
        // Continue without Stripe IDs — can retry later
      }
    }

    const result = await pool.query(
      `INSERT INTO payment_plans (
        club_id, name, description, plan_type, amount, currency,
        interval, interval_count, stripe_product_id, stripe_price_id,
        team_ids, applies_to_all_teams, created_by,
        term_start, term_end, available_for_registration
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *`,
      [
        clubId, name, description, plan_type || 'subscription',
        amountInPence, currency || 'gbp',
        interval || 'month', interval_count || 1,
        stripeProductId, stripePriceId,
        team_ids || '{}', applies_to_all_teams !== false,
        req.user.id,
        term_start || null, term_end || null, available_for_registration || false,
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Update payment plan
router.put('/:clubId/payment-plans/:planId', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer'), async (req, res, next) => {
  try {
    const { clubId, planId } = req.params
    const { name, description, team_ids, applies_to_all_teams, is_active } = req.body

    const result = await pool.query(
      `UPDATE payment_plans SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        team_ids = COALESCE($3, team_ids),
        applies_to_all_teams = COALESCE($4, applies_to_all_teams),
        is_active = COALESCE($5, is_active),
        archived_at = CASE WHEN $5 = false THEN NOW() ELSE archived_at END,
        updated_at = NOW()
       WHERE id = $6 AND club_id = $7 RETURNING *`,
      [name, description, team_ids, applies_to_all_teams, is_active, planId, clubId]
    )

    if (result.rows.length === 0) return res.status(404).json({ error: 'Plan not found' })
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Archive payment plan
router.delete('/:clubId/payment-plans/:planId', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer'), async (req, res, next) => {
  try {
    const { clubId, planId } = req.params
    await pool.query(
      'UPDATE payment_plans SET is_active = false, archived_at = NOW() WHERE id = $1 AND club_id = $2',
      [planId, clubId]
    )
    res.json({ message: 'Plan archived' })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// PLAYER SUBSCRIPTIONS
// ==========================================

// List all subscriptions for a club
router.get('/:clubId/subscriptions', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer', 'secretary'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const { status, team_id, plan_id } = req.query

    let query = `
      SELECT ps.*, pp.name as plan_name, pp.amount as plan_amount, pp.interval as plan_interval,
             p.name as player_name, t.name as team_name,
             g.first_name || ' ' || g.last_name as guardian_name, g.email as guardian_email
      FROM player_subscriptions ps
      JOIN payment_plans pp ON ps.payment_plan_id = pp.id
      JOIN players p ON ps.player_id = p.id
      LEFT JOIN teams t ON p.team_id = t.id
      LEFT JOIN guardians g ON ps.guardian_id = g.id
      WHERE ps.club_id = $1
    `
    const params = [clubId]
    let idx = 2

    if (status) { query += ` AND ps.status = $${idx}`; params.push(status); idx++ }
    if (team_id) { query += ` AND p.team_id = $${idx}`; params.push(team_id); idx++ }
    if (plan_id) { query += ` AND ps.payment_plan_id = $${idx}`; params.push(plan_id); idx++ }

    query += ' ORDER BY ps.created_at DESC'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Get overdue subscriptions
router.get('/:clubId/subscriptions/overdue', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const result = await pool.query(
      `SELECT ps.*, pp.name as plan_name, pp.amount as plan_amount,
              p.name as player_name, t.name as team_name,
              g.first_name || ' ' || g.last_name as guardian_name, g.email as guardian_email
       FROM player_subscriptions ps
       JOIN payment_plans pp ON ps.payment_plan_id = pp.id
       JOIN players p ON ps.player_id = p.id
       LEFT JOIN teams t ON p.team_id = t.id
       LEFT JOIN guardians g ON ps.guardian_id = g.id
       WHERE ps.club_id = $1 AND ps.status IN ('overdue', 'past_due')
       ORDER BY ps.next_payment_at ASC`,
      [clubId]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

// Create subscription (assign player to plan)
router.post('/:clubId/subscriptions', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer', 'secretary'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const { payment_plan_id, player_id, guardian_id } = req.body

    if (!payment_plan_id || !player_id) {
      return res.status(400).json({ error: 'Payment plan and player are required' })
    }

    // Generate portal token
    const portalToken = crypto.randomBytes(32).toString('hex')

    const plan = await pool.query('SELECT * FROM payment_plans WHERE id = $1 AND club_id = $2', [payment_plan_id, clubId])
    if (plan.rows.length === 0) return res.status(404).json({ error: 'Plan not found' })

    const result = await pool.query(
      `INSERT INTO player_subscriptions (
        club_id, payment_plan_id, player_id, guardian_id,
        status, amount_due, portal_token
      ) VALUES ($1,$2,$3,$4,'pending',$5,$6)
      RETURNING *`,
      [clubId, payment_plan_id, player_id, guardian_id, plan.rows[0].amount, portalToken]
    )

    // Send payment link to guardian if we have one
    if (guardian_id) {
      try {
        const guardian = await pool.query('SELECT * FROM guardians WHERE id = $1', [guardian_id])
        if (guardian.rows[0]) {
          const paymentUrl = `${getFrontendUrl()}/pay/${portalToken}`
          await sendNotificationEmail(guardian.rows[0].email, {
            teamName: req.club.name,
            title: `Payment Required - ${plan.rows[0].name}`,
            message: `A payment of £${(plan.rows[0].amount / 100).toFixed(2)} is due for ${plan.rows[0].name}. Click below to make your payment securely online.`,
            actionLink: paymentUrl,
            actionText: 'Make Payment',
          })
        }
      } catch (emailErr) {
        console.error('Failed to send payment email:', emailErr)
      }
    }

    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// Bulk assign players to a plan
router.post('/:clubId/subscriptions/bulk', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const { payment_plan_id, player_ids } = req.body

    if (!payment_plan_id || !player_ids?.length) {
      return res.status(400).json({ error: 'Payment plan and player IDs required' })
    }

    const plan = await pool.query('SELECT * FROM payment_plans WHERE id = $1 AND club_id = $2', [payment_plan_id, clubId])
    if (plan.rows.length === 0) return res.status(404).json({ error: 'Plan not found' })

    const created = []
    for (const playerId of player_ids) {
      // Check if already subscribed
      const existing = await pool.query(
        'SELECT id FROM player_subscriptions WHERE payment_plan_id = $1 AND player_id = $2',
        [payment_plan_id, playerId]
      )
      if (existing.rows.length > 0) continue

      const portalToken = crypto.randomBytes(32).toString('hex')

      // Find guardian for this player
      const guardianResult = await pool.query(
        'SELECT g.id FROM player_guardians pg JOIN guardians g ON g.id = pg.guardian_id WHERE pg.player_id = $1 AND pg.is_primary = true LIMIT 1',
        [playerId]
      )
      const guardianId = guardianResult.rows[0]?.id || null

      const result = await pool.query(
        `INSERT INTO player_subscriptions (club_id, payment_plan_id, player_id, guardian_id, status, amount_due, portal_token)
         VALUES ($1,$2,$3,$4,'pending',$5,$6)
         RETURNING *`,
        [clubId, payment_plan_id, playerId, guardianId, plan.rows[0].amount, portalToken]
      )
      created.push(result.rows[0])
    }

    res.status(201).json({ created: created.length, subscriptions: created })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// PARENT PAYMENT PORTAL (token-based, no auth)
// ==========================================

// Get portal info
router.get('/portal/:token', async (req, res, next) => {
  try {
    const { token } = req.params

    const result = await pool.query(
      `SELECT ps.*, pp.name as plan_name, pp.amount as plan_amount, pp.description as plan_description,
              pp.interval as plan_interval, pp.plan_type,
              p.name as player_name, t.name as team_name,
              c.name as club_name, c.slug as club_slug, c.primary_color as club_color,
              c.stripe_account_id,
              g.first_name as guardian_first_name, g.last_name as guardian_last_name, g.email as guardian_email
       FROM player_subscriptions ps
       JOIN payment_plans pp ON ps.payment_plan_id = pp.id
       JOIN players p ON ps.player_id = p.id
       LEFT JOIN teams t ON p.team_id = t.id
       JOIN clubs c ON ps.club_id = c.id
       LEFT JOIN guardians g ON ps.guardian_id = g.id
       WHERE ps.portal_token = $1`,
      [token]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment link not found or expired' })
    }

    const sub = result.rows[0]

    // Get payment history
    const transactions = await pool.query(
      'SELECT * FROM club_transactions WHERE player_subscription_id = $1 ORDER BY created_at DESC',
      [sub.id]
    )

    // Check if club has Gift Aid enabled and if guardian has user_id with an active declaration
    let giftAidInfo = { enabled: false, declaration: null }
    try {
      const charitySettings = await pool.query(
        'SELECT gift_aid_enabled FROM club_charity_settings WHERE club_id = $1',
        [sub.club_id]
      )
      if (charitySettings.rows[0]?.gift_aid_enabled) {
        giftAidInfo.enabled = true
        // Check if guardian's user has an active declaration
        if (sub.guardian_id) {
          const guardianUser = await pool.query(
            'SELECT user_id FROM guardians WHERE id = $1', [sub.guardian_id]
          )
          if (guardianUser.rows[0]?.user_id) {
            const decl = await pool.query(
              `SELECT gift_aid_opted_in, gift_aid_percentage FROM parent_gift_aid_declarations
               WHERE user_id = $1 AND club_id = $2 AND is_active = true AND gift_aid_opted_in = true LIMIT 1`,
              [guardianUser.rows[0].user_id, sub.club_id]
            )
            if (decl.rows[0]) {
              giftAidInfo.declaration = decl.rows[0]
            }
          }
        }
      }
    } catch (e) {
      // Gift Aid info is optional — don't fail the portal load
      console.warn('Gift Aid lookup error:', e.message)
    }

    res.json({
      subscription: {
        id: sub.id,
        status: sub.status,
        amount_due: sub.amount_due,
        amount_paid: sub.amount_paid,
        plan_name: sub.plan_name,
        plan_amount: sub.plan_amount,
        plan_description: sub.plan_description,
        plan_interval: sub.plan_interval,
        plan_type: sub.plan_type,
        player_name: sub.player_name,
        team_name: sub.team_name,
        next_payment_at: sub.next_payment_at,
      },
      club: {
        name: sub.club_name,
        slug: sub.club_slug,
        color: sub.club_color,
      },
      guardian: {
        first_name: sub.guardian_first_name,
        last_name: sub.guardian_last_name,
        email: sub.guardian_email,
      },
      gift_aid: giftAidInfo,
      transactions: transactions.rows,
      can_pay: !!sub.stripe_account_id && sub.status !== 'cancelled',
    })
  } catch (error) {
    next(error)
  }
})

// Create checkout session for parent payment
router.post('/portal/:token/pay', async (req, res, next) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Payments not configured' })

    const { token } = req.params
    const { gift_aid_percentage } = req.body || {}

    const result = await pool.query(
      `SELECT ps.*, pp.name as plan_name, pp.amount as plan_amount, pp.stripe_price_id, pp.plan_type,
              pp.interval as plan_interval,
              p.name as player_name,
              c.name as club_name, c.stripe_account_id,
              g.email as guardian_email, g.first_name as guardian_name, g.user_id as guardian_user_id
       FROM player_subscriptions ps
       JOIN payment_plans pp ON ps.payment_plan_id = pp.id
       JOIN players p ON ps.player_id = p.id
       JOIN clubs c ON ps.club_id = c.id
       LEFT JOIN guardians g ON ps.guardian_id = g.id
       WHERE ps.portal_token = $1`,
      [token]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment link not found' })
    }

    const sub = result.rows[0]
    if (!sub.stripe_account_id) {
      return res.status(400).json({ error: 'Club has not set up payment processing' })
    }

    // Calculate Gift Aid donation if applicable
    let giftAidDonationPence = 0
    let effectiveGiftAidPercentage = 0
    if (gift_aid_percentage && gift_aid_percentage > 0 && gift_aid_percentage <= 100) {
      // Verify the parent has an active declaration
      if (sub.guardian_user_id) {
        const decl = await pool.query(
          `SELECT id FROM parent_gift_aid_declarations
           WHERE user_id = $1 AND club_id = $2 AND is_active = true AND gift_aid_opted_in = true LIMIT 1`,
          [sub.guardian_user_id, sub.club_id]
        )
        if (decl.rows.length > 0) {
          giftAidDonationPence = Math.round(sub.plan_amount * (gift_aid_percentage / 100))
          effectiveGiftAidPercentage = gift_aid_percentage
        }
      }
    }

    const totalAmount = sub.plan_amount + giftAidDonationPence
    const platformFee = Math.round(totalAmount * PLATFORM_FEE_PERCENT / 100)

    const lineItems = [{
      price_data: {
        currency: 'gbp',
        unit_amount: sub.plan_amount,
        product_data: {
          name: `${sub.club_name} - ${sub.plan_name}`,
          description: `Payment for ${sub.player_name}`,
        },
        ...(sub.plan_type === 'subscription' ? {
          recurring: { interval: sub.plan_interval || 'month' },
        } : {}),
      },
      quantity: 1,
    }]

    // Add Gift Aid donation as a separate line item
    if (giftAidDonationPence > 0) {
      lineItems.push({
        price_data: {
          currency: 'gbp',
          unit_amount: giftAidDonationPence,
          product_data: {
            name: `Gift Aid Donation (${effectiveGiftAidPercentage}%)`,
            description: `Voluntary Gift Aid donation to ${sub.club_name}`,
          },
          ...(sub.plan_type === 'subscription' ? {
            recurring: { interval: sub.plan_interval || 'month' },
          } : {}),
        },
        quantity: 1,
      })
    }

    const sessionParams = {
      mode: sub.plan_type === 'subscription' ? 'subscription' : 'payment',
      line_items: lineItems,
      payment_intent_data: sub.plan_type !== 'subscription' ? {
        application_fee_amount: platformFee,
      } : undefined,
      subscription_data: sub.plan_type === 'subscription' ? {
        application_fee_percent: PLATFORM_FEE_PERCENT,
      } : undefined,
      customer_email: sub.guardian_email,
      metadata: {
        player_subscription_id: sub.id,
        club_id: sub.club_id,
        player_id: sub.player_id,
        portal_token: token,
        // Gift Aid metadata
        gift_aid_opted_in: giftAidDonationPence > 0 ? 'true' : 'false',
        gift_aid_percentage: String(effectiveGiftAidPercentage),
        gift_aid_donation_pence: String(giftAidDonationPence),
        base_fee_pence: String(sub.plan_amount),
        guardian_user_id: sub.guardian_user_id || '',
      },
      success_url: `${getFrontendUrl()}/pay/${token}?success=true`,
      cancel_url: `${getFrontendUrl()}/pay/${token}?canceled=true`,
    }

    const session = await stripe.checkout.sessions.create(sessionParams, {
      stripeAccount: sub.stripe_account_id,
    })

    res.json({ url: session.url })
  } catch (error) {
    next(error)
  }
})

// Payment history for portal
router.get('/portal/:token/history', async (req, res, next) => {
  try {
    const { token } = req.params

    const sub = await pool.query('SELECT id FROM player_subscriptions WHERE portal_token = $1', [token])
    if (sub.rows.length === 0) return res.status(404).json({ error: 'Not found' })

    const transactions = await pool.query(
      'SELECT * FROM club_transactions WHERE player_subscription_id = $1 ORDER BY created_at DESC',
      [sub.rows[0].id]
    )

    res.json(transactions.rows)
  } catch (error) {
    next(error)
  }
})

// ==========================================
// FINANCIAL REPORTING
// ==========================================

// Finance summary
router.get('/:clubId/finance/summary', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer'), async (req, res, next) => {
  try {
    const { clubId } = req.params

    // This month
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalResult, monthResult, activeSubsResult, overdueResult] = await Promise.all([
      pool.query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM club_transactions WHERE club_id = $1 AND status = 'succeeded'",
        [clubId]
      ),
      pool.query(
        "SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM club_transactions WHERE club_id = $1 AND status = 'succeeded' AND created_at >= $2",
        [clubId, monthStart]
      ),
      pool.query(
        "SELECT COUNT(*) FROM player_subscriptions WHERE club_id = $1 AND status = 'active'",
        [clubId]
      ),
      pool.query(
        "SELECT COUNT(*) FROM player_subscriptions WHERE club_id = $1 AND status IN ('overdue', 'past_due')",
        [clubId]
      ),
    ])

    // Monthly breakdown (last 6 months)
    const monthlyResult = await pool.query(
      `SELECT
         TO_CHAR(created_at, 'YYYY-MM') as month,
         COALESCE(SUM(amount), 0) as revenue,
         COUNT(*) as transaction_count
       FROM club_transactions
       WHERE club_id = $1 AND status = 'succeeded' AND created_at >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(created_at, 'YYYY-MM')
       ORDER BY month DESC`,
      [clubId]
    )

    res.json({
      total_revenue: parseInt(totalResult.rows[0].total),
      this_month: {
        revenue: parseInt(monthResult.rows[0].total),
        transactions: parseInt(monthResult.rows[0].count),
      },
      active_subscriptions: parseInt(activeSubsResult.rows[0].count),
      overdue_subscriptions: parseInt(overdueResult.rows[0].count),
      monthly_breakdown: monthlyResult.rows,
    })
  } catch (error) {
    next(error)
  }
})

// Transaction history
router.get('/:clubId/finance/transactions', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer'), async (req, res, next) => {
  try {
    const { clubId } = req.params
    const { limit = 50, offset = 0 } = req.query

    const result = await pool.query(
      `SELECT ct.*, p.name as player_name, g.first_name || ' ' || g.last_name as guardian_name,
              pp.name as plan_name
       FROM club_transactions ct
       LEFT JOIN players p ON ct.player_id = p.id
       LEFT JOIN guardians g ON ct.guardian_id = g.id
       LEFT JOIN player_subscriptions ps ON ct.player_subscription_id = ps.id
       LEFT JOIN payment_plans pp ON ps.payment_plan_id = pp.id
       WHERE ct.club_id = $1
       ORDER BY ct.created_at DESC
       LIMIT $2 OFFSET $3`,
      [clubId, parseInt(limit), parseInt(offset)]
    )

    const countResult = await pool.query('SELECT COUNT(*) FROM club_transactions WHERE club_id = $1', [clubId])

    res.json({
      transactions: result.rows,
      total: parseInt(countResult.rows[0].count),
    })
  } catch (error) {
    next(error)
  }
})

// CSV export
router.get('/:clubId/finance/export', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer'), async (req, res, next) => {
  try {
    const { clubId } = req.params

    const result = await pool.query(
      `SELECT ct.created_at, ct.amount, ct.currency, ct.platform_fee, ct.net_amount,
              ct.type, ct.status, ct.description,
              p.name as player_name, g.first_name || ' ' || g.last_name as guardian_name,
              pp.name as plan_name
       FROM club_transactions ct
       LEFT JOIN players p ON ct.player_id = p.id
       LEFT JOIN guardians g ON ct.guardian_id = g.id
       LEFT JOIN player_subscriptions ps ON ct.player_subscription_id = ps.id
       LEFT JOIN payment_plans pp ON ps.payment_plan_id = pp.id
       WHERE ct.club_id = $1
       ORDER BY ct.created_at DESC`,
      [clubId]
    )

    let csv = 'Date,Player,Guardian,Plan,Amount,Platform Fee,Net Amount,Type,Status,Description\n'
    for (const row of result.rows) {
      csv += [
        new Date(row.created_at).toISOString().split('T')[0],
        `"${row.player_name || ''}"`,
        `"${row.guardian_name || ''}"`,
        `"${row.plan_name || ''}"`,
        (row.amount / 100).toFixed(2),
        (row.platform_fee / 100).toFixed(2),
        (row.net_amount / 100).toFixed(2),
        row.type,
        row.status,
        `"${row.description || ''}"`,
      ].join(',') + '\n'
    }

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${req.club.name.replace(/[^a-z0-9]/gi, '_')}_transactions.csv"`)
    res.send(csv)
  } catch (error) {
    next(error)
  }
})

// Revenue forecast
router.get('/:clubId/finance/forecast', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer'), async (req, res, next) => {
  try {
    const { clubId } = req.params

    // Calculate projected monthly from active subscriptions
    const result = await pool.query(
      `SELECT pp.amount, pp.interval, pp.interval_count, COUNT(ps.id) as subscriber_count
       FROM player_subscriptions ps
       JOIN payment_plans pp ON ps.payment_plan_id = pp.id
       WHERE ps.club_id = $1 AND ps.status = 'active'
       GROUP BY pp.id`,
      [clubId]
    )

    let monthlyProjected = 0
    const planBreakdown = []

    for (const row of result.rows) {
      let monthlyAmount = row.amount
      if (row.interval === 'year') monthlyAmount = Math.round(row.amount / 12)
      else if (row.interval === 'week') monthlyAmount = row.amount * 4
      else if (row.interval_count > 1) monthlyAmount = Math.round(row.amount / row.interval_count)

      const total = monthlyAmount * parseInt(row.subscriber_count)
      monthlyProjected += total
      planBreakdown.push({
        amount: row.amount,
        interval: row.interval,
        subscribers: parseInt(row.subscriber_count),
        monthly_projected: total,
      })
    }

    res.json({
      monthly_projected: monthlyProjected,
      annual_projected: monthlyProjected * 12,
      plan_breakdown: planBreakdown,
    })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// PAYMENT OVERVIEW (dashboard stats)
// ==========================================

router.get('/:clubId/payments/overview', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer'), async (req, res, next) => {
  try {
    const { clubId } = req.params

    const [plans, activeSubs, overdueSubs, monthRevenue, stripeAccount] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM payment_plans WHERE club_id = $1 AND is_active = true', [clubId]),
      pool.query("SELECT COUNT(*) FROM player_subscriptions WHERE club_id = $1 AND status = 'active'", [clubId]),
      pool.query("SELECT COUNT(*) FROM player_subscriptions WHERE club_id = $1 AND status IN ('overdue', 'past_due')", [clubId]),
      pool.query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM club_transactions WHERE club_id = $1 AND status = 'succeeded' AND created_at >= date_trunc('month', NOW())",
        [clubId]
      ),
      pool.query('SELECT stripe_account_id FROM clubs WHERE id = $1', [clubId]),
    ])

    res.json({
      active_plans: parseInt(plans.rows[0].count),
      active_subscriptions: parseInt(activeSubs.rows[0].count),
      overdue_subscriptions: parseInt(overdueSubs.rows[0].count),
      month_revenue: parseInt(monthRevenue.rows[0].total),
      stripe_connected: !!stripeAccount.rows[0]?.stripe_account_id,
    })
  } catch (error) {
    next(error)
  }
})

// ==========================================
// STRIPE CONNECT WEBHOOK
// ==========================================

router.post('/webhook', async (req, res) => {
  if (!stripe) return res.status(503).send('Stripe not configured')

  const sig = req.headers['stripe-signature']
  const endpointSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET

  if (!endpointSecret) {
    console.warn('STRIPE_CONNECT_WEBHOOK_SECRET not set, skipping webhook')
    return res.status(200).send('ok')
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // This is a Connect event — stripeAccount is the connected account ID
  const connectedAccountId = event.account

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const { player_subscription_id, club_id, player_id, portal_token } = session.metadata || {}

        if (player_subscription_id) {
          // Update subscription status
          await pool.query(
            `UPDATE player_subscriptions SET
              status = 'active',
              stripe_subscription_id = $1,
              stripe_customer_id = $2,
              amount_paid = COALESCE(amount_paid, 0) + $3,
              last_payment_at = NOW(),
              next_payment_at = CASE
                WHEN $4 = 'subscription' THEN NOW() + INTERVAL '1 month'
                ELSE next_payment_at
              END,
              started_at = COALESCE(started_at, NOW()),
              payment_reminder_sent = NULL
            WHERE id = $5`,
            [
              session.subscription || null,
              session.customer || null,
              session.amount_total || 0,
              session.mode,
              player_subscription_id,
            ]
          )

          // Record transaction
          const platformFee = Math.round((session.amount_total || 0) * PLATFORM_FEE_PERCENT / 100)
          const txnResult = await pool.query(
            `INSERT INTO club_transactions (
              club_id, player_subscription_id, player_id, amount, currency,
              platform_fee, net_amount, type, status, description,
              stripe_payment_intent_id, stripe_checkout_session_id
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'succeeded',$9,$10,$11)
            RETURNING id`,
            [
              club_id,
              player_subscription_id,
              player_id,
              session.amount_total || 0,
              session.currency || 'gbp',
              platformFee,
              (session.amount_total || 0) - platformFee,
              session.mode === 'subscription' ? 'subscription' : 'one_time',
              `Payment for ${session.metadata?.plan_name || 'plan'}`,
              session.payment_intent || null,
              session.id,
            ]
          )

          // Create Gift Aid record if applicable
          const meta = session.metadata || {}
          if (meta.gift_aid_opted_in === 'true' && meta.guardian_user_id) {
            try {
              const gaRecord = await createGiftAidRecord({
                transactionId: txnResult.rows[0].id,
                clubId: club_id,
                userId: meta.guardian_user_id,
                baseFeeInPence: parseInt(meta.base_fee_pence) || 0,
                giftAidPercentage: parseFloat(meta.gift_aid_percentage) || 0,
                paymentDate: new Date(),
                paymentType: session.mode === 'subscription' ? 'membership' : 'registration',
                paymentDescription: `${session.metadata?.plan_name || 'Payment'}`,
              })

              if (gaRecord) {
                // Create in-app notification
                try {
                  await pool.query(
                    `INSERT INTO notifications (user_id, type, title, message, data)
                     VALUES ($1, 'gift_aid_receipt', 'Gift Aid receipt issued',
                       $2, $3)`,
                    [
                      meta.guardian_user_id,
                      `Your Gift Aid receipt for ${meta.plan_name || 'payment'} has been sent. You added £${(gaRecord.gift_aid_donation / 100).toFixed(2)} to support the club.`,
                      JSON.stringify({ receipt_id: gaRecord.id, receipt_number: gaRecord.receipt_number }),
                    ]
                  )
                } catch (notifErr) {
                  console.error('Gift Aid notification error:', notifErr.message)
                }

                // Send receipt email
                try {
                  const guardianResult = await pool.query(
                    'SELECT email, first_name FROM guardians WHERE user_id = $1 AND club_id = $2 LIMIT 1',
                    [meta.guardian_user_id, club_id]
                  )
                  const clubResult = await pool.query('SELECT name FROM clubs WHERE id = $1', [club_id])
                  if (guardianResult.rows[0]) {
                    await sendNotificationEmail(guardianResult.rows[0].email, {
                      teamName: clubResult.rows[0]?.name || 'Club',
                      title: `Gift Aid Receipt — ${meta.plan_name || 'Payment'}`,
                      message: `Thank you for your payment. You opted to add a Gift Aid donation.\n\nBase fee: £${(gaRecord.base_amount / 100).toFixed(2)}\nGift Aid donation: £${(gaRecord.gift_aid_donation / 100).toFixed(2)}\nTotal paid: £${(gaRecord.total_charged / 100).toFixed(2)}\nClub's HMRC reclaim: £${(gaRecord.hmrc_reclaim_amount / 100).toFixed(2)}\n\nReceipt: ${gaRecord.receipt_number}`,
                    })
                    await pool.query(
                      'UPDATE gift_aid_records SET receipt_email_sent = true, receipt_sent_at = NOW() WHERE id = $1',
                      [gaRecord.id]
                    )
                  }
                } catch (emailErr) {
                  console.error('Gift Aid receipt email error:', emailErr.message)
                }
              }
            } catch (gaErr) {
              console.error('Gift Aid record creation error:', gaErr.message)
            }
          }
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object
        // For recurring subscription payments
        if (invoice.subscription) {
          const sub = await pool.query(
            'SELECT * FROM player_subscriptions WHERE stripe_subscription_id = $1',
            [invoice.subscription]
          )
          if (sub.rows.length > 0) {
            const subscription = sub.rows[0]
            await pool.query(
              `UPDATE player_subscriptions SET
                status = 'active',
                amount_paid = COALESCE(amount_paid, 0) + $1,
                last_payment_at = NOW(),
                next_payment_at = NOW() + INTERVAL '1 month',
                payment_reminder_sent = NULL
              WHERE id = $2`,
              [invoice.amount_paid, subscription.id]
            )

            const platformFee = Math.round(invoice.amount_paid * PLATFORM_FEE_PERCENT / 100)
            const txnResult = await pool.query(
              `INSERT INTO club_transactions (
                club_id, player_subscription_id, player_id, amount, currency,
                platform_fee, net_amount, type, status, description,
                stripe_payment_intent_id
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,'subscription','succeeded',$8,$9)
              RETURNING id`,
              [
                subscription.club_id,
                subscription.id,
                subscription.player_id,
                invoice.amount_paid,
                invoice.currency || 'gbp',
                platformFee,
                invoice.amount_paid - platformFee,
                `Recurring payment - ${invoice.lines?.data?.[0]?.description || 'subscription'}`,
                invoice.payment_intent,
              ]
            )

            // Check for Gift Aid on recurring payments via subscription metadata
            const invoiceMeta = invoice.subscription_details?.metadata || invoice.metadata || {}
            if (invoiceMeta.gift_aid_opted_in === 'true' && invoiceMeta.guardian_user_id) {
              try {
                await createGiftAidRecord({
                  transactionId: txnResult.rows[0].id,
                  clubId: subscription.club_id,
                  userId: invoiceMeta.guardian_user_id,
                  baseFeeInPence: parseInt(invoiceMeta.base_fee_pence) || 0,
                  giftAidPercentage: parseFloat(invoiceMeta.gift_aid_percentage) || 0,
                  paymentDate: new Date(),
                  paymentType: 'membership',
                  paymentDescription: `Recurring - ${invoice.lines?.data?.[0]?.description || 'subscription'}`,
                })
              } catch (gaErr) {
                console.error('Gift Aid record creation error (invoice):', gaErr.message)
              }
            }
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const failedInvoice = event.data.object
        if (failedInvoice.subscription) {
          await pool.query(
            "UPDATE player_subscriptions SET status = 'past_due' WHERE stripe_subscription_id = $1",
            [failedInvoice.subscription]
          )
        }
        break
      }

      case 'customer.subscription.deleted': {
        const deletedSub = event.data.object
        await pool.query(
          "UPDATE player_subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE stripe_subscription_id = $1",
          [deletedSub.id]
        )
        break
      }

      case 'account.updated': {
        // Connected account status changed
        const account = event.data.object
        if (account.charges_enabled && account.details_submitted) {
          await pool.query(
            'UPDATE clubs SET stripe_onboarding_complete = true WHERE stripe_account_id = $1',
            [account.id]
          )
        }
        break
      }

      default:
        // Unhandled event type
        break
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err)
  }

  res.json({ received: true })
})

// ==========================================
// SEND PAYMENT REMINDERS
// ==========================================

router.post('/:clubId/subscriptions/:subscriptionId/remind', authenticateToken, loadClub, requireClubRole('owner', 'admin', 'treasurer'), async (req, res, next) => {
  try {
    const { subscriptionId } = req.params

    const result = await pool.query(
      `SELECT ps.*, pp.name as plan_name, pp.amount as plan_amount,
              p.name as player_name,
              g.email as guardian_email, g.first_name as guardian_name
       FROM player_subscriptions ps
       JOIN payment_plans pp ON ps.payment_plan_id = pp.id
       JOIN players p ON ps.player_id = p.id
       LEFT JOIN guardians g ON ps.guardian_id = g.id
       WHERE ps.id = $1 AND ps.club_id = $2`,
      [subscriptionId, req.params.clubId]
    )

    if (result.rows.length === 0) return res.status(404).json({ error: 'Subscription not found' })

    const sub = result.rows[0]
    if (!sub.guardian_email) return res.status(400).json({ error: 'No guardian email for this subscription' })

    const paymentUrl = `${getFrontendUrl()}/pay/${sub.portal_token}`
    await sendNotificationEmail(sub.guardian_email, {
      teamName: req.club.name,
      title: `Payment Reminder - ${sub.plan_name}`,
      message: `This is a reminder that a payment of £${(sub.plan_amount / 100).toFixed(2)} is due for ${sub.player_name}. Please click below to complete your payment.`,
      actionLink: paymentUrl,
      actionText: 'Make Payment',
    })

    res.json({ message: 'Reminder sent' })
  } catch (error) {
    next(error)
  }
})

export default router
