import { useState, useEffect } from 'react'
import { useOutletContext, useSearchParams, Link } from 'react-router-dom'
import { clubPaymentService } from '../../services/api'
import {
  CreditCard, TrendingUp, AlertTriangle, Users,
  ExternalLink, CheckCircle, XCircle, Link2,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ClubPayments() {
  const { club, myRole } = useOutletContext()
  const [searchParams] = useSearchParams()
  const [overview, setOverview] = useState(null)
  const [stripeAccount, setStripeAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (club?.id) loadData()
  }, [club?.id])

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Stripe account connected successfully!')
    }
    if (searchParams.get('refresh') === 'true') {
      toast('Stripe onboarding needs to be completed', { icon: '🔄' })
    }
  }, [searchParams])

  async function loadData() {
    try {
      const [overviewRes, stripeRes] = await Promise.all([
        clubPaymentService.getPaymentsOverview(club.id),
        clubPaymentService.getStripeAccount(club.id),
      ])
      setOverview(overviewRes.data)
      setStripeAccount(stripeRes.data)
    } catch (err) {
      toast.error('Failed to load payment data')
    } finally {
      setLoading(false)
    }
  }

  async function handleConnectStripe() {
    setConnecting(true)
    try {
      const res = await clubPaymentService.startStripeConnect(club.id)
      window.location.href = res.data.url
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to start Stripe setup')
      setConnecting(false)
    }
  }

  async function openStripeDashboard() {
    try {
      const res = await clubPaymentService.getStripeDashboardLink(club.id)
      window.open(res.data.url, '_blank')
    } catch (err) {
      toast.error('Failed to open Stripe dashboard')
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  const stripeReady = stripeAccount?.charges_enabled && stripeAccount?.payouts_enabled

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Payments</h1>
        <p className="text-navy-400 text-sm mt-1">Manage payment plans, subscriptions and finances</p>
      </div>

      {/* Stripe Connect status */}
      {!stripeReady && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-300">Set up payment processing</h3>
              <p className="text-sm text-amber-400/80 mt-1">
                Connect your Stripe account to start collecting payments from parents.
                Stripe handles all payment processing securely — you control your own money.
              </p>
              {stripeAccount?.details_submitted && !stripeAccount?.charges_enabled && (
                <p className="text-xs text-amber-400/60 mt-2">
                  Your account is being reviewed by Stripe. This usually takes a few minutes.
                </p>
              )}
              <button
                onClick={handleConnectStripe}
                disabled={connecting}
                className="mt-3 flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-navy-950 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Link2 className="w-4 h-4" />
                {connecting ? 'Redirecting...' : stripeAccount?.account_id ? 'Complete Setup' : 'Connect Stripe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {stripeReady && (
        <div className="bg-pitch-600/10 border border-pitch-600/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-pitch-400" />
            <div>
              <p className="text-sm font-medium text-white">Stripe connected</p>
              <p className="text-xs text-navy-400">Payments and payouts enabled</p>
            </div>
          </div>
          <button
            onClick={openStripeDashboard}
            className="flex items-center gap-2 px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-navy-300 hover:text-white rounded-lg text-xs transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Stripe Dashboard
          </button>
        </div>
      )}

      {/* Overview stats */}
      {overview && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Plans"
            value={overview.active_plans}
            icon={CreditCard}
            color="pitch"
          />
          <StatCard
            label="Active Subscriptions"
            value={overview.active_subscriptions}
            icon={Users}
            color="blue"
          />
          <StatCard
            label="Overdue"
            value={overview.overdue_subscriptions}
            icon={AlertTriangle}
            color={overview.overdue_subscriptions > 0 ? 'amber' : 'navy'}
          />
          <StatCard
            label="This Month"
            value={`£${(overview.month_revenue / 100).toFixed(0)}`}
            icon={TrendingUp}
            color="pitch"
          />
        </div>
      )}

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickLink
          to={`/club/${club.slug}/payment-plans`}
          title="Payment Plans"
          description="Create and manage subscription and one-time payment plans"
          icon={CreditCard}
        />
        <QuickLink
          to={`/club/${club.slug}/subscriptions`}
          title="Subscriptions"
          description="View and manage player payment assignments"
          icon={Users}
        />
        <QuickLink
          to={`/club/${club.slug}/finance`}
          title="Finance"
          description="Revenue reports, transaction history and exports"
          icon={TrendingUp}
        />
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    pitch: 'text-pitch-400 bg-pitch-600/10',
    blue: 'text-blue-400 bg-blue-600/10',
    amber: 'text-amber-400 bg-amber-600/10',
    navy: 'text-navy-400 bg-navy-800',
  }
  return (
    <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-navy-400">{label}</p>
        </div>
      </div>
    </div>
  )
}

function QuickLink({ to, title, description, icon: Icon }) {
  return (
    <Link
      to={to}
      className="bg-navy-900 border border-navy-800 rounded-xl p-5 hover:border-navy-700 transition-colors block"
    >
      <Icon className="w-6 h-6 text-pitch-400 mb-3" />
      <h3 className="font-semibold text-white text-sm">{title}</h3>
      <p className="text-xs text-navy-400 mt-1">{description}</p>
    </Link>
  )
}
