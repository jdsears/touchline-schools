import { useState, useEffect } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { CreditCard, Check, ExternalLink, Loader2, AlertCircle, Crown } from 'lucide-react'
import { createCheckoutSession, createPortalSession, getSubscription } from '../../services/billing'
import toast from 'react-hot-toast'

const CLUB_PLANS = [
  {
    id: 'club_starter_monthly',
    name: 'School Starter',
    price: 99,
    interval: 'month',
    teamLimit: 6,
    features: [
      'Up to 6 teams',
      '25 pupils per team',
      'Collect payments from parents',
      'Pupil registrations',
      'AI coaching tools',
      'Session exports',
    ],
  },
  {
    id: 'club_growth_monthly',
    name: 'School Growth',
    price: 199,
    interval: 'month',
    teamLimit: 15,
    popular: true,
    features: [
      'Up to 15 teams',
      '25 pupils per team',
      'Everything in Starter',
      'Priority processing',
      'Advanced reporting',
      'White-label branding',
    ],
  },
  {
    id: 'club_scale_monthly',
    name: 'School Scale',
    price: 349,
    interval: 'month',
    teamLimit: 40,
    features: [
      'Up to 40 teams',
      '25 pupils per team',
      'Everything in Growth',
      'Priority support',
      'Dedicated onboarding',
      'Custom integrations',
    ],
  },
]

export default function ClubBilling() {
  const { school, myRole } = useOutletContext()
  const [searchParams] = useSearchParams()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    loadSubscription()
  }, [school])

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Subscription activated! Welcome to Touchline.')
      // Reload to get updated status
      loadSubscription()
    }
    if (searchParams.get('canceled') === 'true') {
      toast('Checkout canceled — no charges were made.', { icon: 'ℹ️' })
    }
  }, [searchParams])

  async function loadSubscription() {
    try {
      // School subscriptions are tied to the first team linked to the school
      // We need to check the school's subscription_tier and subscription_status
      setSubscription({
        tier: school?.subscription_tier || 'free',
        status: school?.subscription_status || 'none',
      })
    } catch (err) {
      console.error('Failed to load subscription:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubscribe(planId) {
    setCheckoutLoading(planId)
    try {
      const currentUrl = window.location.href.split('?')[0]
      const result = await createCheckoutSession(
        planId,
        null, // teamId — backend will use the user's team
        `${currentUrl}?success=true`,
        `${currentUrl}?canceled=true`,
      )
      if (result.url) {
        window.location.href = result.url
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start checkout')
    } finally {
      setCheckoutLoading(null)
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true)
    try {
      const currentUrl = window.location.href.split('?')[0]
      const result = await createPortalSession(currentUrl)
      if (result.url) {
        window.location.href = result.url
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open billing portal')
    } finally {
      setPortalLoading(false)
    }
  }

  const isSubscribed = subscription && ['active', 'trialing'].includes(subscription.status)
  const currentPlanId = subscription?.tier

  // Find the current plan in our list
  const currentPlan = CLUB_PLANS.find(p => p.id === currentPlanId)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing & Subscription</h1>
        <p className="text-navy-400 text-sm mt-1">Manage your school's Touchline subscription</p>
      </div>

      {/* Current plan status */}
      {isSubscribed && currentPlan ? (
        <section className="bg-navy-900 border border-pitch-500/30 rounded-xl p-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pitch-500/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-pitch-400" />
              </div>
              <div>
                <p className="text-white font-semibold">{currentPlan.name}</p>
                <p className="text-sm text-navy-400">
                  £{currentPlan.price}/month · Up to {currentPlan.teamLimit} teams
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-pitch-500/20 text-pitch-400 capitalize">
                {subscription.status}
              </span>
              <button
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="flex items-center gap-2 px-4 py-2 bg-navy-800 hover:bg-navy-700 border border-navy-600 text-white rounded-lg text-sm transition-colors"
              >
                {portalLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Manage Billing
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-navy-900 border border-amber-500/30 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white font-semibold">No active subscription</p>
              <p className="text-sm text-navy-400 mt-1">
                Subscribe to a school plan to unlock payment collection, advanced features, and manage multiple teams.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {CLUB_PLANS.map((plan) => {
          const isCurrent = currentPlanId === plan.id && isSubscribed

          return (
            <div
              key={plan.id}
              className={`relative bg-navy-900 border rounded-xl p-5 flex flex-col ${
                plan.popular
                  ? 'border-pitch-500/50 ring-1 ring-pitch-500/20'
                  : 'border-navy-800'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-pitch-500 text-navy-950">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">£{plan.price}</span>
                  <span className="text-navy-400 text-sm">/month</span>
                </div>
                <p className="text-sm text-navy-400 mt-1">Up to {plan.teamLimit} teams</p>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-navy-300">
                    <Check className="w-4 h-4 text-pitch-400 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-lg text-sm font-medium bg-navy-800 text-navy-400 border border-navy-700 cursor-default"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={checkoutLoading !== null}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    plan.popular
                      ? 'bg-pitch-600 hover:bg-pitch-500 text-white'
                      : 'bg-navy-800 hover:bg-navy-700 text-white border border-navy-600'
                  } disabled:opacity-50`}
                >
                  {checkoutLoading === plan.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  {isSubscribed ? 'Switch Plan' : 'Subscribe'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* FAQ / Info */}
      <section className="bg-navy-900 border border-navy-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-3">Frequently Asked Questions</h2>
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-white font-medium">Can I change plans later?</p>
            <p className="text-navy-400 mt-1">Yes, you can upgrade or downgrade at any time. Changes take effect immediately and billing is prorated.</p>
          </div>
          <div>
            <p className="text-white font-medium">What payment methods are accepted?</p>
            <p className="text-navy-400 mt-1">We accept all major credit and debit cards via Stripe. All payments are secure and PCI compliant.</p>
          </div>
          <div>
            <p className="text-white font-medium">Can I cancel at any time?</p>
            <p className="text-navy-400 mt-1">Yes, you can cancel your subscription at any time from the billing portal. You'll retain access until the end of your billing period.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
