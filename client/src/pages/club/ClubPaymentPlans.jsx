import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { clubPaymentService, clubService } from '../../services/api'
import { Plus, CreditCard, Users, Archive, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ClubPaymentPlans() {
  const { club, myRole } = useOutletContext()
  const [plans, setPlans] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', plan_type: 'subscription',
    amount: '', currency: 'gbp', interval: 'month', interval_count: 1,
    applies_to_all_teams: true, team_ids: [],
    term_start: '', term_end: '', available_for_registration: false,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (club?.id) loadData()
  }, [club?.id, showArchived])

  async function loadData() {
    try {
      const [plansRes, teamsRes] = await Promise.all([
        clubPaymentService.getPaymentPlans(club.id, showArchived),
        clubService.getTeams(club.id),
      ])
      setPlans(plansRes.data)
      setTeams(teamsRes.data)
    } catch (err) {
      toast.error('Failed to load payment plans')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name || !form.amount) return toast.error('Name and amount are required')
    setSaving(true)
    try {
      await clubPaymentService.createPaymentPlan(club.id, {
        ...form,
        amount: parseFloat(form.amount),
        team_ids: form.applies_to_all_teams ? [] : form.team_ids,
      })
      toast.success('Payment plan created')
      setShowCreate(false)
      setForm({
        name: '', description: '', plan_type: 'subscription',
        amount: '', currency: 'gbp', interval: 'month', interval_count: 1,
        applies_to_all_teams: true, team_ids: [],
        term_start: '', term_end: '', available_for_registration: false,
      })
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create plan')
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive(planId) {
    if (!confirm('Archive this payment plan? It will no longer be available for new assignments.')) return
    try {
      await clubPaymentService.archivePaymentPlan(club.id, planId)
      toast.success('Plan archived')
      loadData()
    } catch (err) {
      toast.error('Failed to archive plan')
    }
  }

  const canManage = ['owner', 'admin', 'treasurer'].includes(myRole)

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Plans</h1>
          <p className="text-navy-400 text-sm mt-1">Create subscription and one-time payment plans</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              showArchived ? 'bg-navy-700 text-white' : 'bg-navy-800 text-navy-400 hover:text-white'
            }`}
          >
            <Archive className="w-4 h-4 inline mr-1" />
            {showArchived ? 'Hide archived' : 'Show archived'}
          </button>
          {canManage && (
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Plan
            </button>
          )}
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-white">Create Payment Plan</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-navy-400 mb-1">Plan Name *</label>
              <input
                type="text" required value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                placeholder="e.g. Monthly Subscription, Annual Fee, Kit Payment"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-navy-400 mb-1">Description</label>
              <input
                type="text" value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                placeholder="Optional description shown to parents"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Type</label>
              <select
                value={form.plan_type}
                onChange={(e) => setForm(f => ({ ...f, plan_type: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              >
                <option value="subscription">Recurring Subscription</option>
                <option value="one_time">One-time Payment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Amount (£) *</label>
              <input
                type="number" step="0.01" min="0.50" required value={form.amount}
                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                placeholder="25.00"
              />
            </div>
            {form.plan_type === 'subscription' && (
              <>
                <div>
                  <label className="block text-xs text-navy-400 mb-1">Billing Interval</label>
                  <select
                    value={form.interval}
                    onChange={(e) => setForm(f => ({ ...f, interval: e.target.value }))}
                    className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                  >
                    <option value="week">Weekly</option>
                    <option value="month">Monthly</option>
                    <option value="year">Annually</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-navy-400 mb-1">Every N intervals</label>
                  <input
                    type="number" min="1" max="12" value={form.interval_count}
                    onChange={(e) => setForm(f => ({ ...f, interval_count: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                  />
                </div>
              </>
            )}
            {form.plan_type === 'subscription' && (
              <>
                <div>
                  <label className="block text-xs text-navy-400 mb-1">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Term Start (e.g. 1st Sept)
                  </label>
                  <input
                    type="date" value={form.term_start}
                    onChange={(e) => setForm(f => ({ ...f, term_start: e.target.value }))}
                    className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-navy-400 mb-1">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Term End (e.g. 1st May)
                  </label>
                  <input
                    type="date" value={form.term_end}
                    onChange={(e) => setForm(f => ({ ...f, term_end: e.target.value }))}
                    className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                  />
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-navy-500 mt-1">
                    Payments are taken on the 1st of each month between start and end dates. Players joining mid-term pick up from the next billing date.
                  </p>
                </div>
              </>
            )}
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-navy-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.available_for_registration}
                  onChange={(e) => setForm(f => ({ ...f, available_for_registration: e.target.checked }))}
                  className="rounded bg-navy-800 border-navy-700 text-pitch-600 focus:ring-pitch-600"
                />
                Show on registration form (parents select this plan when registering)
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-navy-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.applies_to_all_teams}
                  onChange={(e) => setForm(f => ({ ...f, applies_to_all_teams: e.target.checked }))}
                  className="rounded bg-navy-800 border-navy-700 text-pitch-600 focus:ring-pitch-600"
                />
                Applies to all teams
              </label>
            </div>
            {!form.applies_to_all_teams && teams.length > 0 && (
              <div className="sm:col-span-2">
                <label className="block text-xs text-navy-400 mb-1">Select Teams</label>
                <div className="flex flex-wrap gap-2">
                  {teams.map(team => (
                    <label key={team.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 rounded-lg text-sm text-navy-300 cursor-pointer hover:bg-navy-700">
                      <input
                        type="checkbox"
                        checked={form.team_ids.includes(team.id)}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...form.team_ids, team.id]
                            : form.team_ids.filter(id => id !== team.id)
                          setForm(f => ({ ...f, team_ids: ids }))
                        }}
                        className="rounded bg-navy-700 border-navy-600 text-pitch-600 focus:ring-pitch-600"
                      />
                      {team.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-navy-400 hover:text-white">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-white rounded-lg text-sm">
              {saving ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      )}

      {/* Plans list */}
      {plans.length === 0 ? (
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-8 text-center">
          <CreditCard className="w-12 h-12 text-navy-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">No payment plans yet</h3>
          <p className="text-navy-400 text-sm">Create your first payment plan to start collecting payments from parents.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => (
            <PlanCard key={plan.id} plan={plan} canManage={canManage} onArchive={handleArchive} clubSlug={club.slug} />
          ))}
        </div>
      )}
    </div>
  )
}

function PlanCard({ plan, canManage, onArchive, clubSlug }) {
  const [expanded, setExpanded] = useState(false)
  const amountDisplay = `£${(plan.amount / 100).toFixed(2)}`
  const intervalDisplay = plan.plan_type === 'subscription'
    ? `/${plan.interval_count > 1 ? `${plan.interval_count} ` : ''}${plan.interval}${plan.interval_count > 1 ? 's' : ''}`
    : ' one-time'

  return (
    <div className={`bg-navy-900 border rounded-xl overflow-hidden ${plan.is_active ? 'border-navy-800' : 'border-navy-800/50 opacity-60'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-navy-800/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${plan.plan_type === 'subscription' ? 'bg-blue-600/10 text-blue-400' : 'bg-pitch-600/10 text-pitch-400'}`}>
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-white">{plan.name}</p>
              {!plan.is_active && <span className="text-xs bg-navy-700 text-navy-400 px-2 py-0.5 rounded">Archived</span>}
            </div>
            <p className="text-sm text-navy-400">
              {amountDisplay}{intervalDisplay}
              {plan.description && ` · ${plan.description}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-white">{plan.active_subscriber_count || 0}</p>
            <p className="text-xs text-navy-400">active</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-navy-400" /> : <ChevronDown className="w-4 h-4 text-navy-400" />}
        </div>
      </button>
      {expanded && (
        <div className="px-5 pb-4 pt-2 border-t border-navy-800 space-y-3">
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-navy-400">Type</p>
              <p className="text-navy-200 capitalize">{plan.plan_type === 'subscription' ? 'Recurring' : 'One-time'}</p>
            </div>
            <div>
              <p className="text-xs text-navy-400">Total Subscribers</p>
              <p className="text-navy-200">{plan.subscriber_count || 0}</p>
            </div>
            <div>
              <p className="text-xs text-navy-400">Applies to</p>
              <p className="text-navy-200">{plan.applies_to_all_teams ? 'All teams' : 'Selected teams'}</p>
            </div>
            {plan.term_start && (
              <div>
                <p className="text-xs text-navy-400">Term</p>
                <p className="text-navy-200">
                  {new Date(plan.term_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' — '}
                  {plan.term_end ? new Date(plan.term_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Ongoing'}
                </p>
              </div>
            )}
            {plan.available_for_registration && (
              <div>
                <p className="text-xs text-navy-400">Registration</p>
                <p className="text-pitch-400 text-xs">Shown on registration form</p>
              </div>
            )}
          </div>
          {canManage && plan.is_active && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => onArchive(plan.id)}
                className="flex items-center gap-2 px-3 py-1.5 bg-navy-800 hover:bg-alert-600/20 text-navy-400 hover:text-alert-400 rounded-lg text-xs transition-colors"
              >
                <Archive className="w-3.5 h-3.5" />
                Archive
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
