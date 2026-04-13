import Stripe from 'stripe'
import pool from '../config/database.js'
import { PLANS, LOOKUP_KEY_TO_PLAN, createSubscription, addDeepVideoCredits, addVideoCredits } from './billingService.js'

// Initialize Stripe with secret key from environment
// NEVER hardcode keys — use STRIPE_SECRET_KEY env var
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured() {
  return !!stripe
}

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateCustomer(userId, email, name) {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }

  // Check if user already has a Stripe customer ID
  const userResult = await pool.query(
    'SELECT stripe_customer_id FROM users WHERE id = $1',
    [userId]
  )

  if (userResult.rows[0]?.stripe_customer_id) {
    return userResult.rows[0].stripe_customer_id
  }

  // Create a new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId: userId.toString(),
    },
  })

  // Save customer ID to user
  await pool.query(
    'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
    [customer.id, userId]
  )

  console.log(`[Stripe] Created customer ${customer.id} for user ${userId}`)
  return customer.id
}

/**
 * Stripe Price resolution
 *
 * Each plan has a lookup_key (e.g. 'touchline_core', 'touchline_pro').
 * Prices should be created in the Stripe Dashboard with matching lookup_keys.
 * This function first tries lookup_key, then falls back to metadata search,
 * and finally creates the price if it doesn't exist.
 */
const stripePriceCache = {}

async function getOrCreatePrice(planId) {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }

  // Return cached price ID if available
  if (stripePriceCache[planId]) {
    return stripePriceCache[planId]
  }

  const plan = PLANS[planId]
  if (!plan || plan.isTrial) {
    throw new Error(`Invalid plan for Stripe: ${planId}`)
  }

  // 1. Try lookup_key first (preferred — matches Stripe Dashboard config)
  if (plan.lookupKey) {
    const lookupResult = await stripe.prices.list({
      lookup_keys: [plan.lookupKey],
      limit: 1,
    })
    if (lookupResult.data.length > 0) {
      stripePriceCache[planId] = lookupResult.data[0].id
      console.log(`[Stripe] Found price via lookup_key '${plan.lookupKey}': ${lookupResult.data[0].id}`)
      return lookupResult.data[0].id
    }
  }

  // 2. Fallback: search by plan_id metadata
  const existingPrices = await stripe.prices.search({
    query: `metadata["plan_id"]:"${planId}"`,
  })

  if (existingPrices.data.length > 0) {
    stripePriceCache[planId] = existingPrices.data[0].id
    return existingPrices.data[0].id
  }

  // 3. Create product + price if neither exists
  const product = await stripe.products.create({
    name: `${plan.name} (${plan.interval === 'year' ? 'Annual' : 'Monthly'})`,
    metadata: {
      plan_id: planId,
    },
  })

  const priceData = {
    product: product.id,
    unit_amount: plan.price,
    currency: 'gbp',
    recurring: {
      interval: plan.interval === 'year' ? 'year' : 'month',
    },
    metadata: {
      plan_id: planId,
    },
  }

  // Set lookup_key so prices can be found by key in future
  if (plan.lookupKey) {
    priceData.lookup_key = plan.lookupKey
  }

  const price = await stripe.prices.create(priceData)

  stripePriceCache[planId] = price.id
  console.log(`[Stripe] Created price ${price.id} for plan ${planId} (lookup_key: ${plan.lookupKey || 'none'})`)
  return price.id
}

/**
 * Create a Stripe Checkout session
 */
export async function createCheckoutSession({ userId, email, name, planId, teamId, successUrl, cancelUrl }) {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }

  const plan = PLANS[planId]
  if (!plan || plan.isTrial) {
    throw new Error(`Invalid plan: ${planId}`)
  }

  // Get or create Stripe customer
  const customerId = await getOrCreateCustomer(userId, email, name)

  // Get or create Stripe price
  const priceId = await getOrCreatePrice(planId)

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl || `${process.env.FRONTEND_URL}/settings?tab=billing&success=true`,
    cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/pricing?canceled=true`,
    metadata: {
      userId: userId.toString(),
      teamId: teamId.toString(),
      planId,
    },
    subscription_data: {
      metadata: {
        userId: userId.toString(),
        teamId: teamId.toString(),
        planId,
      },
    },
  })

  console.log(`[Stripe] Created checkout session ${session.id} for user ${userId}, plan ${planId}`)
  return {
    sessionId: session.id,
    url: session.url,
  }
}

/**
 * Create a Customer Portal session for managing subscriptions
 */
export async function createPortalSession(userId, returnUrl) {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }

  // Get user's Stripe customer ID
  const userResult = await pool.query(
    'SELECT stripe_customer_id FROM users WHERE id = $1',
    [userId]
  )

  const customerId = userResult.rows[0]?.stripe_customer_id
  if (!customerId) {
    throw new Error('No Stripe customer found for user')
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || `${process.env.FRONTEND_URL}/settings?tab=billing`,
  })

  return {
    url: session.url,
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(event) {
  console.log(`[Stripe] Handling webhook event: ${event.type}`)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      await handleCheckoutComplete(session)
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object
      await handleSubscriptionUpdate(subscription)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      await handleSubscriptionCanceled(subscription)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object
      await handlePaymentFailed(invoice)
      break
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object
      // Handle video analysis credit purchases (safety net — client also credits immediately)
      if (paymentIntent.metadata?.type === 'video_credits') {
        const teamId = paymentIntent.metadata.teamId
        const credits = parseInt(paymentIntent.metadata.credits)
        if (teamId && credits > 0) {
          console.log(`[Stripe] Video credit payment confirmed: ${credits} credits for team ${teamId}`)
          try {
            await pool.query(
              `INSERT INTO credit_transactions (user_id, credits, payment_intent_id, created_at)
               VALUES ($1, $2, $3, NOW())
               ON CONFLICT (payment_intent_id) DO NOTHING`,
              [paymentIntent.metadata.userId, credits, paymentIntent.id]
            )
            const result = await pool.query(
              'SELECT 1 FROM credit_transactions WHERE payment_intent_id = $1 AND processed = false',
              [paymentIntent.id]
            )
            if (result.rows.length > 0) {
              await addVideoCredits(teamId, credits)
              await pool.query(
                'UPDATE credit_transactions SET processed = true WHERE payment_intent_id = $1',
                [paymentIntent.id]
              )
            }
          } catch (err) {
            console.log(`[Stripe] Credit transaction tracking not available, credits already added client-side`)
          }
        }
      }

      // Handle deep video credit purchases (safety net — client also credits immediately)
      if (paymentIntent.metadata?.type === 'deep_video_credits') {
        const userId = paymentIntent.metadata.userId
        const credits = parseInt(paymentIntent.metadata.credits)
        if (userId && credits > 0) {
          console.log(`[Stripe] Deep video credit payment confirmed: ${credits} credits for user ${userId}`)
          // Credits are already added client-side on confirmation, but this ensures consistency
          // We use an idempotency approach: only add if not already processed
          try {
            await pool.query(
              `INSERT INTO credit_transactions (user_id, credits, payment_intent_id, created_at)
               VALUES ($1, $2, $3, NOW())
               ON CONFLICT (payment_intent_id) DO NOTHING`,
              [userId, credits, paymentIntent.id]
            )
            // If insert succeeded (not a duplicate), add credits
            const result = await pool.query(
              'SELECT 1 FROM credit_transactions WHERE payment_intent_id = $1 AND processed = false',
              [paymentIntent.id]
            )
            if (result.rows.length > 0) {
              await addDeepVideoCredits(userId, credits)
              await pool.query(
                'UPDATE credit_transactions SET processed = true WHERE payment_intent_id = $1',
                [paymentIntent.id]
              )
            }
          } catch (err) {
            // If credit_transactions table doesn't exist yet, just log
            console.log(`[Stripe] Credit transaction tracking not available, credits already added client-side`)
          }
        }
      }
      break
    }

    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`)
  }
}

/**
 * Resolve the plan ID from a Stripe subscription's price lookup_key or metadata.
 * This maps Stripe data back to our internal plan IDs.
 */
async function resolvePlanFromSubscription(subscription) {
  try {
    const priceId = subscription.items?.data?.[0]?.price?.id
    if (!priceId) return null

    const price = await stripe.prices.retrieve(priceId)

    // Try lookup_key first
    if (price.lookup_key && LOOKUP_KEY_TO_PLAN[price.lookup_key]) {
      return LOOKUP_KEY_TO_PLAN[price.lookup_key]
    }

    // Fallback to metadata
    if (price.metadata?.plan_id) {
      return price.metadata.plan_id
    }

    return null
  } catch (error) {
    console.error('[Stripe] Error resolving plan from subscription:', error.message)
    return null
  }
}

/**
 * Handle successful checkout completion
 */
async function handleCheckoutComplete(session) {
  const { userId, teamId, planId } = session.metadata

  if (!userId || !teamId || !planId) {
    console.error('[Stripe] Missing metadata in checkout session:', session.id)
    return
  }

  // Get subscription ID from the session
  const subscriptionId = session.subscription

  // Create subscription in our database
  await createSubscription(parseInt(teamId), planId, {
    provider: 'stripe',
    providerCustomerId: session.customer,
    providerSubscriptionId: subscriptionId,
  })

  // Update user's subscription_tier for quick access
  await pool.query(
    'UPDATE users SET subscription_tier = $1 WHERE id = $2',
    [planId, parseInt(userId)]
  )

  console.log(`[Stripe] Subscription created for team ${teamId}, user ${userId}: ${planId}`)
}

/**
 * Handle subscription updates (plan changes, upgrades/downgrades, renewals)
 */
async function handleSubscriptionUpdate(subscription) {
  const { teamId, userId } = subscription.metadata

  if (!teamId) {
    console.log('[Stripe] No teamId in subscription metadata, skipping update')
    return
  }

  // Resolve the current plan from the subscription's price lookup_key
  const resolvedPlanId = await resolvePlanFromSubscription(subscription)
  const planId = resolvedPlanId || subscription.metadata.planId

  // Map Stripe status to our status
  const status = subscription.status === 'active' ? 'active'
    : subscription.status === 'trialing' ? 'trialing'
    : subscription.status === 'past_due' ? 'past_due'
    : 'canceled'

  // Update subscription record
  await pool.query(
    `UPDATE subscriptions
     SET status = $1,
         plan_id = COALESCE($2, plan_id),
         current_period_start = to_timestamp($3),
         current_period_end = to_timestamp($4),
         updated_at = NOW()
     WHERE provider_subscription_id = $5`,
    [
      status,
      planId,
      subscription.current_period_start,
      subscription.current_period_end,
      subscription.id,
    ]
  )

  // Update team's subscription_tier for quick access
  if (planId) {
    await pool.query(
      'UPDATE teams SET subscription_tier = $1 WHERE id = $2',
      [planId, parseInt(teamId)]
    )
  }

  // Update user's subscription_tier if userId available
  if (userId && planId) {
    await pool.query(
      'UPDATE users SET subscription_tier = $1 WHERE id = $2',
      [planId, parseInt(userId)]
    )
  }

  console.log(`[Stripe] Subscription ${subscription.id} updated: ${status}, plan: ${planId || 'unchanged'}`)
}

/**
 * Handle subscription cancellation — revoke paid features
 */
async function handleSubscriptionCanceled(subscription) {
  const { teamId, userId } = subscription.metadata

  await pool.query(
    `UPDATE subscriptions
     SET status = 'canceled', updated_at = NOW()
     WHERE provider_subscription_id = $1`,
    [subscription.id]
  )

  // Reset team tier to free
  if (teamId) {
    await pool.query(
      "UPDATE teams SET subscription_tier = 'free' WHERE id = $1",
      [parseInt(teamId)]
    )
  }

  // Reset user tier to free
  if (userId) {
    await pool.query(
      "UPDATE users SET subscription_tier = 'free' WHERE id = $1",
      [parseInt(userId)]
    )
  }

  console.log(`[Stripe] Subscription ${subscription.id} canceled, team ${teamId || 'unknown'} reverted to free`)
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
  const subscriptionId = invoice.subscription

  if (subscriptionId) {
    await pool.query(
      `UPDATE subscriptions
       SET status = 'past_due', updated_at = NOW()
       WHERE provider_subscription_id = $1`,
      [subscriptionId]
    )

    console.log(`[Stripe] Payment failed for subscription ${subscriptionId}`)
  }
}

/**
 * Construct and verify webhook event
 */
export function constructWebhookEvent(payload, signature) {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('Stripe webhook secret not configured')
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId) {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }

  const subscription = await stripe.subscriptions.cancel(subscriptionId)
  console.log(`[Stripe] Subscription ${subscriptionId} canceled`)
  return subscription
}

/**
 * Sync subscription from Stripe for a user/team.
 * Used as a safety net when the checkout.session.completed webhook was missed.
 * Looks up the user's Stripe customer, finds active subscriptions, and
 * creates/updates the local subscription record if missing.
 */
export async function syncSubscriptionFromStripe(userId, teamId) {
  if (!stripe) {
    return { synced: false, reason: 'Stripe not configured' }
  }

  // Get user's Stripe customer ID
  const userResult = await pool.query(
    'SELECT stripe_customer_id, email FROM users WHERE id = $1',
    [userId]
  )

  let customerId = userResult.rows[0]?.stripe_customer_id

  // If no customer ID stored, try to find by email
  if (!customerId && userResult.rows[0]?.email) {
    const customers = await stripe.customers.list({
      email: userResult.rows[0].email,
      limit: 1,
    })
    if (customers.data.length > 0) {
      customerId = customers.data[0].id
      await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, userId])
    }
  }

  if (!customerId) {
    return { synced: false, reason: 'No Stripe customer found' }
  }

  // Get active subscriptions from Stripe
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  })

  if (subscriptions.data.length === 0) {
    // Also check for trialing
    const trialSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: 'trialing',
      limit: 1,
    })
    if (trialSubs.data.length === 0) {
      return { synced: false, reason: 'No active Stripe subscription found' }
    }
    subscriptions.data = trialSubs.data
  }

  const stripeSub = subscriptions.data[0]

  // Resolve the plan from the subscription price
  const priceId = stripeSub.items?.data?.[0]?.price?.id
  let planId = null

  if (priceId) {
    const price = await stripe.prices.retrieve(priceId)
    if (price.lookup_key && LOOKUP_KEY_TO_PLAN[price.lookup_key]) {
      planId = LOOKUP_KEY_TO_PLAN[price.lookup_key]
    } else if (price.metadata?.plan_id) {
      planId = price.metadata.plan_id
    }
  }

  // Also check subscription metadata
  if (!planId && stripeSub.metadata?.planId) {
    planId = stripeSub.metadata.planId
  }

  if (!planId) {
    return { synced: false, reason: 'Could not resolve plan from Stripe subscription' }
  }

  // Check if we already have this subscription locally
  const existingSub = await pool.query(
    'SELECT id FROM subscriptions WHERE provider_subscription_id = $1',
    [stripeSub.id]
  )

  if (existingSub.rows.length > 0) {
    // Update existing record with fresh data from Stripe
    await pool.query(
      `UPDATE subscriptions
       SET status = $1, plan_id = $2,
           current_period_start = to_timestamp($3),
           current_period_end = to_timestamp($4),
           updated_at = NOW()
       WHERE provider_subscription_id = $5`,
      [
        stripeSub.status,
        planId,
        stripeSub.current_period_start,
        stripeSub.current_period_end,
        stripeSub.id,
      ]
    )
    console.log(`[Stripe Sync] Updated existing subscription ${stripeSub.id} for team ${teamId}: ${planId}`)
    return { synced: true, action: 'updated', planId }
  }

  // Create the missing subscription locally
  await createSubscription(teamId, planId, {
    provider: 'stripe',
    providerCustomerId: customerId,
    providerSubscriptionId: stripeSub.id,
  })

  // Update user's subscription_tier
  await pool.query(
    'UPDATE users SET subscription_tier = $1 WHERE id = $2',
    [planId, userId]
  )

  console.log(`[Stripe Sync] Created missing subscription for team ${teamId}, user ${userId}: ${planId}`)
  return { synced: true, action: 'created', planId }
}
