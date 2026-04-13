import { useState, useEffect, useId } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, X, Users, Zap, Shield, Crown, Building2, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { createCheckoutSession } from '../services/billing'
import SEO from '../components/common/SEO'

// Touchline logo mark component
function TouchlineMark({ className = "w-10 h-8" }) {
  const id = useId()
  const gradId = `tl-arc-${id}`
  return (
    <svg viewBox="0 10 64 38" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2ED573"/>
          <stop offset="100%" stopColor="#F5A623"/>
        </linearGradient>
      </defs>
      <g fill="none">
        <path d="M12 44 C18 12, 46 12, 52 44"
              stroke={`url(#${gradId})`}
              strokeWidth="4.5"
              strokeLinecap="round"/>
        <line x1="8" y1="44" x2="56" y2="44"
              stroke="#2ED573"
              strokeWidth="3.5"
              strokeLinecap="round"/>
        <circle cx="32" cy="44" r="5" fill="#2ED573"/>
      </g>
    </svg>
  )
}

// Plan card component
function PlanCard({ plan, isPopular, billingInterval, onSelect, isLoading }) {
  const price = billingInterval === 'year'
    ? plan.annualPrice
    : plan.monthlyPrice

  const priceDisplay = price === 0 ? 'Free' : `£${(price / 100).toFixed(2)}`
  const intervalDisplay = price === 0 ? '' : billingInterval === 'year' ? '/year' : '/month'

  const savings = billingInterval === 'year' && plan.monthlyPrice > 0
    ? Math.round((1 - plan.annualPrice / (plan.monthlyPrice * 12)) * 100)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative rounded-2xl p-6 flex flex-col
        ${isPopular
          ? 'bg-gradient-to-b from-pitch-900/50 to-navy-800 border-2 border-pitch-500 shadow-lg shadow-pitch-500/20'
          : 'bg-navy-800/50 border border-navy-700'
        }
      `}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-pitch-500 text-navy-950 text-xs font-bold rounded-full">
          MOST POPULAR
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          {plan.icon}
          <h3 className="font-display text-xl font-bold text-white">{plan.name}</h3>
        </div>
        <p className="text-navy-400 text-sm">{plan.description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-white">{priceDisplay}</span>
          <span className="text-navy-400">{intervalDisplay}</span>
        </div>
        {savings > 0 && (
          <span className="text-pitch-400 text-sm">Save {savings}% annually</span>
        )}
      </div>

      <div className="flex-1 mb-6">
        <div className="space-y-3">
          {plan.features.map((feature, i) => (
            <div key={i} className="flex items-start gap-2">
              {feature.included ? (
                <Check className="w-5 h-5 text-pitch-400 flex-shrink-0 mt-0.5" />
              ) : (
                <X className="w-5 h-5 text-navy-600 flex-shrink-0 mt-0.5" />
              )}
              <span className={feature.included ? 'text-navy-200' : 'text-navy-500'}>
                {feature.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => onSelect(plan, billingInterval)}
        disabled={isLoading}
        className={`
          w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2
          ${isPopular
            ? 'bg-pitch-500 text-navy-950 hover:bg-pitch-400 disabled:bg-pitch-500/50'
            : 'bg-navy-700 text-white hover:bg-navy-600 disabled:bg-navy-700/50'
          }
          disabled:cursor-not-allowed
        `}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            {plan.cta}
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </motion.div>
  )
}

// Club plan card (larger format)
function ClubPlanCard({ plan, billingInterval, onSelect, isLoading }) {
  const price = `£${(plan.monthlyPrice / 100).toFixed(0)}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-navy-800/50 border border-navy-700 rounded-xl p-5 flex flex-col"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-display font-bold text-white">{plan.name}</h4>
          <p className="text-sm text-navy-400">{plan.teamLimit === 'Unlimited' ? 'Unlimited teams' : `Up to ${plan.teamLimit} teams`}</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-white">{price}</span>
          <span className="text-navy-400 text-sm">/mo</span>
        </div>
      </div>
      <div className="flex-1 mb-4">
        <div className="flex flex-wrap gap-2">
          {plan.highlights.map((h, i) => (
            <span key={i} className="text-xs px-2 py-1 bg-navy-700/50 text-navy-300 rounded">
              {h}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={() => onSelect(plan, billingInterval)}
        disabled={isLoading}
        className="w-full py-2 px-4 rounded-lg font-medium bg-amber-500 text-navy-950 hover:bg-amber-400 transition-all text-sm text-center flex items-center justify-center gap-2 disabled:bg-amber-500/50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Get Started
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </motion.div>
  )
}

export default function Pricing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [billingInterval, setBillingInterval] = useState('month')
  const [loading, setLoading] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [error, setError] = useState(null)

  // Check for canceled checkout
  const canceled = searchParams.get('canceled')

  const handleSelectPlan = async (plan, interval) => {
    // Free plan — just go to register or dashboard
    if (plan.isFree) {
      navigate(user ? '/dashboard' : '/register')
      return
    }

    if (!user) {
      // Redirect to register with plan info
      navigate(`/register?plan=${plan.id}&interval=${interval}`)
      return
    }

    // Build plan ID with interval (club plans already include _monthly suffix convention)
    const planId = plan.id.startsWith('club_')
      ? `${plan.id}_monthly`
      : `${plan.id}_${interval === 'year' ? 'annual' : 'monthly'}`

    setLoadingPlan(plan.id)
    setError(null)

    try {
      // Create Stripe checkout session
      const result = await createCheckoutSession(
        planId,
        user.team_id,
        `${window.location.origin}/settings?tab=billing&success=true`,
        `${window.location.origin}/pricing?canceled=true`
      )

      if (result.url) {
        // Redirect to Stripe Checkout
        window.location.href = result.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setError(err.response?.data?.message || 'Failed to start checkout. Please try again.')
      setLoadingPlan(null)
    }
  }

  // Team plans (Free + paid)
  const teamPlans = [
    {
      id: 'free',
      name: 'Free',
      description: 'For coaches just getting started',
      monthlyPrice: 0,
      annualPrice: 0,
      icon: <Users className="w-5 h-5 text-pitch-400" />,
      cta: user ? 'Current Plan' : 'Get Started Free',
      isFree: true,
      features: [
        { text: '1 team, up to 16 players', included: true },
        { text: '1 video analysis/month', included: true },
        { text: '20 AI chat messages/month', included: true },
        { text: '3 session plans/month', included: true },
        { text: 'Tactics board', included: true },
        { text: 'OCR imports', included: false },
        { text: 'Individual Development Plans', included: false },
        { text: 'No credit card required', included: true },
      ],
    },
    {
      id: 'team_core',
      name: 'Core',
      description: 'For committed grassroots coaches',
      monthlyPrice: 999,
      annualPrice: 9588,
      icon: <Zap className="w-5 h-5 text-pitch-400" />,
      cta: 'Get Started',
      features: [
        { text: '1 team, 25 players', included: true },
        { text: '5 video analyses/month', included: true },
        { text: 'Unlimited AI coaching chat', included: true },
        { text: '10 session plans/month', included: true },
        { text: '25 OCR imports/month', included: true },
        { text: 'Individual Development Plans', included: true },
        { text: 'Email notifications', included: true },
        { text: 'Parent portal', included: true },
      ],
    },
    {
      id: 'team_pro',
      name: 'Pro',
      description: 'Advanced features for ambitious coaches',
      monthlyPrice: 1999,
      annualPrice: 19188,
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      cta: 'Upgrade to Pro',
      features: [
        { text: 'Up to 3 teams, 25 players each', included: true },
        { text: '10 video analyses/month', included: true },
        { text: 'Unlimited AI coaching chat', included: true },
        { text: 'Unlimited session plans', included: true },
        { text: 'Unlimited OCR imports', included: true },
        { text: 'Advanced exports', included: true },
        { text: 'Priority processing', included: true },
        { text: 'Individual Development Plans', included: true },
      ],
    },
    {
      id: 'academy',
      name: 'Academy',
      description: 'Multi-team management for academies',
      monthlyPrice: 2999,
      annualPrice: 29988,
      icon: <Shield className="w-5 h-5 text-pitch-400" />,
      cta: 'Start Academy Plan',
      features: [
        { text: 'Up to 5 teams, 25 players each', included: true },
        { text: '15 video analyses/month', included: true },
        { text: 'Unlimited AI coaching chat', included: true },
        { text: 'Full analytics suite', included: true },
        { text: 'Branding controls', included: true },
        { text: 'Advanced reporting', included: true },
        { text: 'Priority support', included: true },
        { text: 'Individual Development Plans', included: true },
      ],
    },
  ]

  // Club plans
  const clubPlans = [
    {
      id: 'club_starter',
      name: 'Club Starter',
      teamLimit: 8,
      monthlyPrice: 9900,
      videoPool: 20,
      highlights: ['20 video analyses/mo (shared pool)', 'Player & guardian CRM', 'Online registration', 'Payment collection (0.5% fee)', 'Safeguarding & DBS tracking', 'Events & camp management', 'Training schedule & attendance', 'AI match reports & insights', 'Parent portal & announcements', 'Finance dashboard'],
    },
    {
      id: 'club_growth',
      name: 'Club Growth',
      teamLimit: 16,
      monthlyPrice: 19900,
      videoPool: 40,
      highlights: ['40 video analyses/mo (shared pool)', 'Everything in Starter', 'AI season summaries', 'AI grant application helper', 'White label branding', 'Revenue forecasting', 'Incident reporting & audit trails', 'Bulk parent communications', '500 emails/team'],
    },
    {
      id: 'club_scale',
      name: 'Club Scale',
      teamLimit: 'Unlimited',
      monthlyPrice: 34900,
      videoPool: 80,
      highlights: ['80 video analyses/mo (shared pool)', 'Everything in Growth', 'AI coach development suggestions', 'AI compliance gap analysis', 'Dedicated support', 'Advanced reporting', '1000 emails/team', 'Priority features', 'Multi-site management'],
    },
  ]

  return (
    <div className="min-h-screen bg-navy-950">
      <SEO
        title="Pricing"
        path="/pricing"
        description="Touchline pricing for grassroots football coaches and clubs. Free plan with AI coaching tools, tactics board, and player management. Paid plans from £9.99/month."
      />
      {/* Header */}
      <header className="border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <TouchlineMark className="w-10 h-6" />
              <span className="font-display font-semibold text-white text-xl">Touchline</span>
            </Link>
            <div className="flex items-center gap-4">
              {user ? (
                <Link to="/dashboard" className="btn-secondary text-sm">
                  Back to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-navy-300 hover:text-white transition-colors">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn-primary text-sm">
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 text-center">
        <div className="max-w-3xl mx-auto px-4">
          {/* Canceled checkout message */}
          {canceled && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <span className="text-amber-200">Checkout was canceled. Feel free to try again when you're ready.</span>
            </motion.div>
          )}

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-200">{error}</span>
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl md:text-5xl font-bold text-white mb-4"
          >
            Plans for every grassroots team
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-navy-400 mb-8"
          >
            Start free. Upgrade when you're ready.
          </motion.p>

          {/* Billing toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 p-1 bg-navy-800 rounded-lg"
          >
            <button
              onClick={() => setBillingInterval('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingInterval === 'month'
                  ? 'bg-pitch-500 text-navy-950'
                  : 'text-navy-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingInterval === 'year'
                  ? 'bg-pitch-500 text-navy-950'
                  : 'text-navy-400 hover:text-white'
              }`}
            >
              Annual
              <span className="ml-1 text-xs opacity-75">(Save up to 25%)</span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Team Plans */}
      <section className="pb-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamPlans.map((plan, i) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isPopular={plan.id === 'team_core'}
                billingInterval={billingInterval}
                onSelect={handleSelectPlan}
                isLoading={loadingPlan === plan.id}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Club Plans */}
      <section className="py-16 bg-navy-900/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <Building2 className="w-6 h-6 text-amber-400" />
              <h2 className="font-display text-2xl font-bold text-white">Club Plans</h2>
            </div>
            <p className="text-navy-400 max-w-2xl mx-auto">
              For clubs managing multiple age groups. All plans include safeguarding &amp; DBS tracking,
              event management, training schedules, AI intelligence, payment collection, CRM,
              and role-based access for your committee.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-pitch-500/10 border border-pitch-500/20 rounded-lg">
              <Check className="w-4 h-4 text-pitch-400" />
              <span className="text-pitch-300 text-sm font-medium">Just 0.5% platform fee on payments — the lowest in grassroots football</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {clubPlans.map((plan) => (
              <ClubPlanCard
                key={plan.id}
                plan={plan}
                billingInterval={billingInterval}
                onSelect={handleSelectPlan}
                isLoading={loadingPlan === plan.id}
              />
            ))}
          </div>

          {/* Enterprise / custom needs */}
          <div className="mt-8 text-center">
            <p className="text-navy-400 text-sm">
              Need more than 80 teams or custom requirements?{' '}
              <a
                href="mailto:sophie@touchline.xyz?subject=Enterprise Club Plan Enquiry"
                className="text-amber-400 hover:text-amber-300 underline"
              >
                Contact Sales
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Deep Video Credits */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-gradient-to-r from-navy-800/80 to-navy-800/40 border border-navy-700 rounded-2xl p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-1">
                <h3 className="font-display text-xl font-bold text-white mb-2">
                  Deep Video Analysis Credits
                </h3>
                <p className="text-navy-400 mb-4">
                  Go deeper on the matches that matter. Deep video analysis uses advanced AI to provide
                  detailed tactical breakdowns, player-specific insights, and formation analysis.
                  Available as pay-as-you-go credits on any paid plan.
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="text-center px-4 py-2 bg-navy-700/50 rounded-lg">
                    <div className="text-lg font-bold text-white">£1.49</div>
                    <div className="text-xs text-navy-400">per analysis</div>
                  </div>
                  <div className="text-center px-4 py-2 bg-navy-700/50 rounded-lg">
                    <div className="text-lg font-bold text-white">5 for £5.99</div>
                    <div className="text-xs text-pitch-400">Save 20%</div>
                  </div>
                  <div className="text-center px-4 py-2 bg-navy-700/50 rounded-lg">
                    <div className="text-lg font-bold text-white">10 for £9.99</div>
                    <div className="text-xs text-pitch-400">Save 33%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-display text-2xl font-bold text-white text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: 'Is the free plan really free?',
                a: 'Yes! The free plan includes 1 video analysis per month, 20 AI chat messages, 3 session plans, a tactics board, and player management for up to 16 players. No credit card required — sign up and start coaching.',
              },
              {
                q: 'Can I change plans later?',
                a: 'Yes! You can upgrade or downgrade at any time. Changes take effect immediately, and we\'ll prorate any payments.',
              },
              {
                q: 'What counts as a video analysis?',
                a: 'Each time you use AI to analyze match footage or generate tactical insights from video, it counts as one video analysis. Your monthly allowance resets on your billing date.',
              },
              {
                q: 'What is deep video analysis?',
                a: 'Deep video analysis is our premium AI feature that provides detailed tactical breakdowns, player-specific insights, and formation analysis. Credits are purchased separately at £1.49 each (or in packs for a discount) and are available on any paid plan.',
              },
              {
                q: 'What are OCR imports?',
                a: 'OCR imports are when you use AI to extract data from images — like importing player rosters from registration screenshots or fixture lists from league websites.',
              },
              {
                q: 'Is there a limit on AI chat?',
                a: 'The free plan includes 20 AI chat messages per month. Core and above get unlimited AI coaching chat.',
              },
              {
                q: 'What do Club plans include that team plans don\'t?',
                a: 'Club plans include a central dashboard for all your teams, safeguarding & DBS tracking with automatic expiry alerts, event and camp management with online payments, training schedule and attendance tracking, AI-powered club intelligence (match reports, attendance insights, season summaries), guardian and player CRM, online registration, payment collection via Stripe, role-based access (treasurer, secretary, welfare officer, coach), incident reporting, and financial reporting. Every team in your club also gets full access to all coaching tools.',
              },
              {
                q: 'How does payment collection work?',
                a: 'Club plans use Stripe Connect so parents can pay match fees, subscriptions, and kit costs online. You set up payment plans, parents receive payment links, and all transactions are tracked in your finance dashboard. Touchline takes a small 0.5% platform fee on top of Stripe\'s standard processing fees.',
              },
              {
                q: 'Can parents register players online?',
                a: 'Yes! You get a branded registration link (e.g. touchline.xyz/club/your-club/register) that you can share. Parents fill in their details, child information, medical info, and consent forms. You review and approve registrations from your club dashboard.',
              },
              {
                q: 'What is the parent portal?',
                a: 'The parent portal gives guardians their own login where they can view their children\'s schedules, see match details, pay subscriptions, and read club announcements. You can invite guardians to create accounts directly from your club dashboard.',
              },
              {
                q: 'Why is Touchline\'s payment fee so low?',
                a: 'We believe grassroots clubs shouldn\'t be paying 2-5% to collect match fees. Our 0.5% platform fee just covers infrastructure costs. Parents pay Stripe\'s standard processing fee (1.5% + 20p for UK cards), and your money goes straight to your Stripe account — we never hold your funds.',
              },
            ].map((faq, i) => (
              <div key={i} className="bg-navy-800/50 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-navy-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-b from-pitch-900/20 to-navy-950">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-display text-3xl font-bold text-white mb-4">
            Ready to elevate your coaching?
          </h2>
          <p className="text-navy-400 mb-8">
            Join hundreds of grassroots coaches using AI-powered tools.
          </p>
          <Link to="/register" className="btn-primary text-lg px-8 py-4">
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-800 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-navy-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Touchline. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <Link to="/terms" className="hover:text-navy-300">Terms</Link>
            <span>&bull;</span>
            <Link to="/terms" className="hover:text-navy-300">Privacy</Link>
          </div>
          <p className="text-navy-600 text-xs mt-3">
            Built by <a href="https://moonbootsconsultancy.net" target="_blank" rel="noopener noreferrer" className="hover:text-navy-400 transition-colors underline">MoonBoots Consultancy</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
