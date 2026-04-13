import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { clubPaymentService } from '../../services/api'
import {
  CreditCard, CheckCircle, Clock, AlertTriangle,
  XCircle, Shield, ChevronDown, ChevronUp,
} from 'lucide-react'

export default function PaymentPortal() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [paying, setPaying] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    loadPortal()
  }, [token])

  async function loadPortal() {
    try {
      const res = await clubPaymentService.getPortalInfo(token)
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Payment link not found or expired')
    } finally {
      setLoading(false)
    }
  }

  async function handlePay() {
    setPaying(true)
    try {
      const res = await clubPaymentService.createPortalPayment(token)
      window.location.href = res.data.url
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start payment')
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <XCircle className="w-12 h-12 text-alert-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Payment Link Invalid</h1>
          <p className="text-navy-400">{error}</p>
        </div>
      </div>
    )
  }

  const { subscription, club, guardian, transactions, can_pay } = data
  const success = searchParams.get('success') === 'true'
  const canceled = searchParams.get('canceled') === 'true'

  const statusConfig = {
    active: { icon: CheckCircle, color: 'text-pitch-400', bg: 'bg-pitch-600/10', label: 'Active' },
    pending: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-600/10', label: 'Payment Due' },
    past_due: { icon: AlertTriangle, color: 'text-alert-400', bg: 'bg-alert-600/10', label: 'Overdue' },
    overdue: { icon: AlertTriangle, color: 'text-alert-400', bg: 'bg-alert-600/10', label: 'Overdue' },
    cancelled: { icon: XCircle, color: 'text-navy-500', bg: 'bg-navy-800', label: 'Cancelled' },
  }
  const status = statusConfig[subscription.status] || statusConfig.pending
  const StatusIcon = status.icon

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Club header */}
        <div className="text-center">
          <div
            className="w-14 h-14 rounded-xl mx-auto flex items-center justify-center text-white font-bold text-xl mb-3"
            style={{ backgroundColor: club.color || '#1a365d' }}
          >
            {club.name?.charAt(0)}
          </div>
          <h1 className="text-xl font-bold text-white">{club.name}</h1>
          <p className="text-sm text-navy-400 mt-1">Payment Portal</p>
        </div>

        {/* Success/cancel messages */}
        {success && (
          <div className="bg-pitch-600/10 border border-pitch-600/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-pitch-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-pitch-300">Payment successful!</p>
              <p className="text-xs text-pitch-400/70">Thank you for your payment. You'll receive a confirmation email shortly.</p>
            </div>
          </div>
        )}

        {canceled && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-400">Payment was cancelled. You can try again when you're ready.</p>
          </div>
        )}

        {/* Payment card */}
        <div className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
          <div className="p-5 space-y-4">
            {/* Status badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${status.bg}`}>
              <StatusIcon className={`w-4 h-4 ${status.color}`} />
              <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
            </div>

            {/* Plan info */}
            <div>
              <h2 className="text-lg font-semibold text-white">{subscription.plan_name}</h2>
              {subscription.plan_description && (
                <p className="text-sm text-navy-400 mt-1">{subscription.plan_description}</p>
              )}
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-navy-400">Player</p>
                <p className="text-navy-200">{subscription.player_name}</p>
              </div>
              {subscription.team_name && (
                <div>
                  <p className="text-xs text-navy-400">Team</p>
                  <p className="text-navy-200">{subscription.team_name}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-navy-400">Amount</p>
                <p className="text-lg font-bold text-white">
                  £{(subscription.plan_amount / 100).toFixed(2)}
                  {subscription.plan_type === 'subscription' && (
                    <span className="text-sm text-navy-400 font-normal">/{subscription.plan_interval}</span>
                  )}
                </p>
              </div>
              {subscription.next_payment_at && (
                <div>
                  <p className="text-xs text-navy-400">Next Due</p>
                  <p className="text-navy-200">{new Date(subscription.next_payment_at).toLocaleDateString('en-GB')}</p>
                </div>
              )}
            </div>

            {/* Pay button */}
            {can_pay && subscription.status !== 'active' && subscription.status !== 'cancelled' && (
              <button
                onClick={handlePay}
                disabled={paying}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                <CreditCard className="w-5 h-5" />
                {paying ? 'Redirecting to payment...' : `Pay £${(subscription.plan_amount / 100).toFixed(2)}`}
              </button>
            )}

            {!can_pay && subscription.status !== 'active' && subscription.status !== 'cancelled' && (
              <div className="bg-navy-800 rounded-lg p-3 text-center">
                <p className="text-sm text-navy-400">Online payment is not yet available. Please contact the club directly.</p>
              </div>
            )}
          </div>

          {/* Payment history */}
          {transactions.length > 0 && (
            <div className="border-t border-navy-800">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between px-5 py-3 text-sm text-navy-400 hover:text-white transition-colors"
              >
                <span>Payment History ({transactions.length})</span>
                {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showHistory && (
                <div className="px-5 pb-4 space-y-2">
                  {transactions.map(txn => (
                    <div key={txn.id} className="flex items-center justify-between py-2 border-b border-navy-800/50 last:border-0">
                      <div>
                        <p className="text-sm text-navy-200">£{(txn.amount / 100).toFixed(2)}</p>
                        <p className="text-xs text-navy-500">{new Date(txn.created_at).toLocaleDateString('en-GB')}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        txn.status === 'succeeded' ? 'bg-pitch-600/20 text-pitch-400' : 'bg-navy-800 text-navy-400'
                      }`}>
                        {txn.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Security note */}
        <div className="flex items-center justify-center gap-2 text-xs text-navy-500">
          <Shield className="w-3.5 h-3.5" />
          <span>Payments processed securely by Stripe</span>
        </div>

        {/* Guardian info */}
        {guardian.first_name && (
          <p className="text-center text-xs text-navy-500">
            Logged in as {guardian.first_name} {guardian.last_name}
          </p>
        )}
      </div>
    </div>
  )
}
