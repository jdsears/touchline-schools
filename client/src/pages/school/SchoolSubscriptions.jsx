import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { clubPaymentService, clubService } from '../../services/api'
import {
  Users, AlertTriangle, CreditCard, Send,
  ChevronDown, ChevronUp, Clock, CheckCircle, XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ClubSubscriptions() {
  const { school, myRole } = useOutletContext()
  const [subscriptions, setSubscriptions] = useState([])
  const [plans, setPlans] = useState([])
  const [pupils, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [showAssign, setShowAssign] = useState(false)
  const [assignForm, setAssignForm] = useState({ payment_plan_id: '', pupil_ids: [] })
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    if (school?.id) loadData()
  }, [school?.id, statusFilter, planFilter])

  async function loadData() {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (planFilter) params.plan_id = planFilter

      const [subsRes, plansRes, playersRes] = await Promise.all([
        clubPaymentService.getSubscriptions(school.id, params),
        clubPaymentService.getPaymentPlans(school.id),
        clubService.getPlayers(school.id),
      ])
      setSubscriptions(subsRes.data)
      setPlans(plansRes.data)
      setPlayers(playersRes.data)
    } catch (err) {
      toast.error('Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }

  async function handleBulkAssign(e) {
    e.preventDefault()
    if (!assignForm.payment_plan_id || !assignForm.pupil_ids.length) {
      return toast.error('Select a plan and at least one pupil')
    }
    setAssigning(true)
    try {
      const res = await clubPaymentService.bulkAssign(school.id, assignForm)
      toast.success(`${res.data.created} subscriptions created`)
      setShowAssign(false)
      setAssignForm({ payment_plan_id: '', pupil_ids: [] })
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign pupils')
    } finally {
      setAssigning(false)
    }
  }

  async function handleReminder(subscriptionId) {
    try {
      await clubPaymentService.sendReminder(school.id, subscriptionId)
      toast.success('Payment reminder sent')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reminder')
    }
  }

  const canManage = ['owner', 'admin', 'treasurer'].includes(myRole)
  const statuses = ['', 'pending', 'active', 'past_due', 'overdue', 'cancelled']

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Subscriptions</h1>
          <p className="text-secondary text-sm mt-1">{subscriptions.length} subscription{subscriptions.length !== 1 ? 's' : ''}</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAssign(!showAssign)}
            className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-on-dark rounded-lg text-sm transition-colors"
          >
            <Users className="w-4 h-4" />
            Assign Players
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
              statusFilter === s
                ? 'bg-pitch-600 text-on-dark'
                : 'bg-subtle text-secondary hover:text-primary'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
        {plans.length > 0 && (
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm bg-subtle text-secondary border-none"
          >
            <option value="">All plans</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Bulk assign form */}
      {showAssign && (
        <form onSubmit={handleBulkAssign} className="bg-card border border-border-default rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-primary">Assign Players to Plan</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-secondary mb-1">Payment Plan *</label>
              <select
                value={assignForm.payment_plan_id}
                onChange={(e) => setAssignForm(f => ({ ...f, payment_plan_id: e.target.value }))}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                required
              >
                <option value="">Select plan...</option>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>{p.name} - £{(p.amount / 100).toFixed(2)}/{p.interval}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">
                Players ({assignForm.pupil_ids.length} selected)
              </label>
              <div className="max-h-48 overflow-y-auto bg-subtle border border-border-strong rounded-lg p-2 space-y-1">
                {pupils.map(p => (
                  <label key={p.id} className="flex items-center gap-2 px-2 py-1 hover:bg-border-default rounded text-sm text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignForm.pupil_ids.includes(p.id)}
                      onChange={(e) => {
                        const ids = e.target.checked
                          ? [...assignForm.pupil_ids, p.id]
                          : assignForm.pupil_ids.filter(id => id !== p.id)
                        setAssignForm(f => ({ ...f, pupil_ids: ids }))
                      }}
                      className="rounded bg-border-default border-border-strong text-pitch-600 focus:ring-pitch-600"
                    />
                    {p.name}
                    {p.team_name && <span className="text-xs text-tertiary">({p.team_name})</span>}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowAssign(false)} className="px-4 py-2 text-sm text-secondary hover:text-primary">Cancel</button>
            <button type="submit" disabled={assigning} className="px-4 py-2 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-on-dark rounded-lg text-sm">
              {assigning ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </form>
      )}

      {/* Subscriptions list */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="spinner w-8 h-8" />
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="bg-card border border-border-default rounded-xl p-8 text-center">
          <CreditCard className="w-12 h-12 text-tertiary mx-auto mb-3" />
          <h3 className="text-lg font-medium text-primary mb-1">No subscriptions</h3>
          <p className="text-secondary text-sm">Assign pupils to payment plans to start tracking payments.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {subscriptions.map(sub => (
            <SubscriptionRow key={sub.id} sub={sub} canManage={canManage} onReminder={handleReminder} />
          ))}
        </div>
      )}
    </div>
  )
}

const statusIcons = {
  active: CheckCircle,
  pending: Clock,
  past_due: AlertTriangle,
  overdue: AlertTriangle,
  cancelled: XCircle,
}

const statusColors = {
  active: 'text-pitch-400',
  pending: 'text-amber-400',
  past_due: 'text-alert-400',
  overdue: 'text-alert-400',
  cancelled: 'text-tertiary',
}

function SubscriptionRow({ sub, canManage, onReminder }) {
  const [expanded, setExpanded] = useState(false)
  const StatusIcon = statusIcons[sub.status] || Clock

  return (
    <div className="bg-card border border-border-default rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-subtle transition-colors"
      >
        <div className="flex items-center gap-3">
          <StatusIcon className={`w-4 h-4 ${statusColors[sub.status]}`} />
          <div>
            <p className="text-sm font-medium text-primary">{sub.player_name}</p>
            <p className="text-xs text-secondary">{sub.plan_name} · {sub.team_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm text-primary">£{(sub.plan_amount / 100).toFixed(2)}</p>
            <p className="text-xs text-secondary capitalize">{sub.status}</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-secondary" /> : <ChevronDown className="w-4 h-4 text-secondary" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border-default space-y-3">
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-secondary">Guardian</p>
              <p className="text-primary">{sub.guardian_name || 'Not assigned'}</p>
              {sub.guardian_email && <p className="text-xs text-secondary">{sub.guardian_email}</p>}
            </div>
            <div>
              <p className="text-xs text-secondary">Amount Paid</p>
              <p className="text-primary">£{((sub.amount_paid || 0) / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-secondary">Next Payment</p>
              <p className="text-primary">
                {sub.next_payment_at ? new Date(sub.next_payment_at).toLocaleDateString('en-GB') : 'N/A'}
              </p>
            </div>
          </div>
          {canManage && ['pending', 'past_due', 'overdue'].includes(sub.status) && sub.guardian_email && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onReminder(sub.id)}
                className="flex items-center gap-2 px-3 py-1.5 bg-subtle hover:bg-border-default text-secondary hover:text-primary rounded-lg text-xs transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Send Reminder
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
