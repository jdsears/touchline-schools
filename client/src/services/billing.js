import api from './api'

// Get billing configuration (Stripe status)
export async function getBillingConfig() {
  const response = await api.get('/billing/config')
  return response.data
}

// Get all available plans
export async function getPlans() {
  const response = await api.get('/billing/plans')
  return response.data
}

// Get entitlements for current user/team
export async function getEntitlements(teamId) {
  const response = await api.get('/billing/entitlements', {
    params: teamId ? { teamId } : {},
  })
  return response.data
}

// Get usage for current period
export async function getUsage(teamId, period) {
  const response = await api.get('/billing/usage', {
    params: { teamId, period },
  })
  return response.data
}

// Get current subscription
export async function getSubscription(teamId) {
  const response = await api.get('/billing/subscription', {
    params: teamId ? { teamId } : {},
  })
  return response.data
}

// Check team creation limit
export async function checkTeamLimit() {
  const response = await api.get('/billing/limits/team')
  return response.data
}

// Check player limit for a team
export async function checkPlayerLimit(teamId) {
  const response = await api.get('/billing/limits/player', {
    params: teamId ? { teamId } : {},
  })
  return response.data
}

// Start a trial
export async function startTrial() {
  const response = await api.post('/billing/trial/start')
  return response.data
}

// Upgrade to a plan (for manual/testing or redirect check)
export async function upgradePlan(planId, teamId) {
  const response = await api.post('/billing/upgrade', { planId, teamId })
  return response.data
}

// Create a Stripe checkout session
export async function createCheckoutSession(planId, teamId, successUrl, cancelUrl) {
  const response = await api.post('/billing/create-checkout-session', {
    planId,
    teamId,
    successUrl,
    cancelUrl,
  })
  return response.data
}

// Get video credit balance and packs
export async function getVideoCredits(teamId) {
  const response = await api.get('/billing/video-credits', {
    params: teamId ? { teamId } : {},
  })
  return response.data
}

// Purchase video credits
export async function purchaseVideoCredits(packId) {
  const response = await api.post('/billing/video-credits/purchase', { packId })
  return response.data
}

// Confirm video credit purchase
export async function confirmVideoCredits(paymentIntentId, credits) {
  const response = await api.post('/billing/video-credits/confirm', { paymentIntentId, credits })
  return response.data
}

// Create a Stripe customer portal session
export async function createPortalSession(returnUrl) {
  const response = await api.post('/billing/portal', { returnUrl })
  return response.data
}

export async function syncSubscription(teamId) {
  const response = await api.post('/billing/sync', { teamId })
  return response.data
}
