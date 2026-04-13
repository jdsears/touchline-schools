import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'
import {
  Users,
  Shield,
  Ticket,
  TrendingUp,
  Building2,
  UserCheck,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  X,
  Loader2,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Percent,
  Gift,
  DollarSign,
  FileText,
  Sparkles,
  Eye,
  EyeOff,
  ExternalLink,
  Save,
  Upload,
  Image,
  Camera,
  Monitor,
  Settings,
  Calendar,
  CreditCard,
  ShieldCheck,
} from 'lucide-react'
import api, { blogService, SERVER_URL } from '../services/api'
import toast from 'react-hot-toast'

// Stat Card Component
function StatCard({ title, value, subtitle, icon: Icon, color = 'pitch' }) {
  const colors = {
    pitch: 'bg-pitch-500/20 text-pitch-400',
    blue: 'bg-blue-500/20 text-blue-400',
    amber: 'bg-amber-500/20 text-amber-400',
    purple: 'bg-purple-500/20 text-purple-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    orange: 'bg-orange-500/20 text-orange-400',
  }

  return (
    <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-navy-400 text-sm">{title}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subtitle && <div className="text-sm text-navy-400 mt-1">{subtitle}</div>}
    </div>
  )
}

// Promo Code Modal
function PromoCodeModal({ isOpen, onClose, onSave, editingCode }) {
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    max_uses: '',
    valid_until: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editingCode) {
      setFormData({
        code: editingCode.code || '',
        description: editingCode.description || '',
        discount_type: editingCode.discount_type || 'percentage',
        discount_value: editingCode.discount_value || 0,
        max_uses: editingCode.max_uses || '',
        valid_until: editingCode.valid_until ? editingCode.valid_until.split('T')[0] : '',
      })
    } else {
      setFormData({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 0,
        max_uses: '',
        valid_until: '',
      })
    }
  }, [editingCode, isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        discount_value: formData.discount_type === 'free' ? 100 : parseInt(formData.discount_value) || 0,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        valid_until: formData.valid_until || null,
      }

      await onSave(payload, editingCode?.id)
      onClose()
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-navy-900 border border-navy-700 rounded-xl w-full max-w-md"
      >
        <div className="flex items-center justify-between p-4 border-b border-navy-800">
          <h3 className="text-lg font-semibold text-white">
            {editingCode ? 'Edit Promo Code' : 'Create Promo Code'}
          </h3>
          <button onClick={onClose} className="text-navy-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-300 mb-1">
              Code {!editingCode && '(leave blank to auto-generate)'}
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. SUMMER20"
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-navy-500 focus:border-pitch-500 focus:outline-none"
              disabled={!!editingCode}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-300 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Summer promotion - 20% off"
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-navy-500 focus:border-pitch-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-300 mb-1">Discount Type</label>
            <select
              value={formData.discount_type}
              onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white focus:border-pitch-500 focus:outline-none"
            >
              <option value="percentage">Percentage Off</option>
              <option value="fixed">Fixed Amount Off (£)</option>
              <option value="free">Free / Fee Exempt (100%)</option>
            </select>
          </div>

          {formData.discount_type !== 'free' && (
            <div>
              <label className="block text-sm font-medium text-navy-300 mb-1">
                Discount Value {formData.discount_type === 'percentage' ? '(%)' : '(£)'}
              </label>
              <input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                min="0"
                max={formData.discount_type === 'percentage' ? 100 : 9999}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-navy-500 focus:border-pitch-500 focus:outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-300 mb-1">Max Total Uses</label>
              <input
                type="number"
                value={formData.max_uses}
                onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                placeholder="Unlimited"
                min="1"
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-navy-500 focus:border-pitch-500 focus:outline-none"
              />
              <p className="text-xs text-navy-500 mt-1">
                {formData.max_uses ? `Limited to ${formData.max_uses} total redemptions` : 'Leave blank for unlimited uses'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-300 mb-1">Expires</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white focus:border-pitch-500 focus:outline-none"
              />
              <p className="text-xs text-navy-500 mt-1">
                {formData.valid_until ? '' : 'Leave blank for no expiry'}
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-pitch-500 text-navy-950 rounded-lg hover:bg-pitch-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingCode ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// User Manage Modal
function UserManageModal({ isOpen, onClose, userId, onUpdated }) {
  const [userDetail, setUserDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [trialDays, setTrialDays] = useState(30)
  const [selectedPlan, setSelectedPlan] = useState('team_core_monthly')
  const [actionLoading, setActionLoading] = useState(null)
  const [allTeams, setAllTeams] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [teamPlayers, setTeamPlayers] = useState([])
  const [selectedPlayerId, setSelectedPlayerId] = useState('')

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetail()
      fetchAllTeams()
      setShowDeleteConfirm(false)
    }
  }, [isOpen, userId])

  const fetchUserDetail = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/users/${userId}`)
      setUserDetail(res.data)
      setSelectedTeamId(res.data.team_id || '')
      setSelectedPlayerId(res.data.player_id || '')
      if (res.data.team_id) {
        fetchTeamPlayers(res.data.team_id)
      }
    } catch (error) {
      toast.error('Failed to load user details')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const fetchAllTeams = async () => {
    try {
      const res = await api.get('/admin/teams')
      setAllTeams(res.data)
    } catch (error) {
      console.error('Failed to load teams:', error)
    }
  }

  const fetchTeamPlayers = async (teamId) => {
    try {
      const res = await api.get(`/admin/teams/${teamId}/players`)
      setTeamPlayers(res.data)
    } catch (error) {
      console.error('Failed to load team players:', error)
      setTeamPlayers([])
    }
  }

  const handleChangeRole = async (newRole) => {
    setActionLoading('role')
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole })
      toast.success(`Role changed to ${newRole}`)
      fetchUserDetail()
      onUpdated()
    } catch (error) {
      toast.error('Failed to change role')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleBillingExempt = async () => {
    setActionLoading('billing')
    try {
      await api.put(`/admin/users/${userId}/billing-exempt`, {
        billing_exempt: !userDetail.billing_exempt,
      })
      toast.success(
        userDetail.billing_exempt
          ? 'Billing exempt removed'
          : 'User is now billing exempt (full access)'
      )
      fetchUserDetail()
      onUpdated()
    } catch (error) {
      toast.error('Failed to update billing status')
    } finally {
      setActionLoading(null)
    }
  }

  const handleExtendTrial = async () => {
    setActionLoading('trial')
    try {
      const res = await api.post(`/admin/users/${userId}/extend-trial`, {
        days: trialDays,
      })
      toast.success(
        `Trial extended by ${trialDays} days (ends ${new Date(
          res.data.trial_ends_at
        ).toLocaleDateString()})`
      )
      fetchUserDetail()
      onUpdated()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to extend trial')
    } finally {
      setActionLoading(null)
    }
  }

  const handleGrantSubscription = async () => {
    setActionLoading('subscription')
    try {
      await api.post(`/admin/users/${userId}/grant-subscription`, {
        plan_id: selectedPlan,
      })
      toast.success('Subscription granted')
      fetchUserDetail()
      onUpdated()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to grant subscription')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReassignTeam = async () => {
    if (selectedTeamId === (userDetail.team_id || '')) return
    setActionLoading('team')
    try {
      await api.put(`/admin/users/${userId}/team`, {
        team_id: selectedTeamId || null,
      })
      const teamName = allTeams.find(t => t.id === selectedTeamId)?.name || 'None'
      toast.success(`User reassigned to ${selectedTeamId ? teamName : 'no team'}`)
      fetchUserDetail()
      onUpdated()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reassign team')
    } finally {
      setActionLoading(null)
    }
  }

  const handleLinkPlayer = async () => {
    if (selectedPlayerId === (userDetail.player_id || '')) return
    setActionLoading('player')
    try {
      await api.put(`/admin/users/${userId}/player`, {
        player_id: selectedPlayerId || null,
      })
      const playerName = teamPlayers.find(p => p.id === selectedPlayerId)?.name || 'None'
      toast.success(selectedPlayerId ? `Linked to ${playerName}` : 'Player link removed')
      fetchUserDetail()
      onUpdated()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to link player')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteUser = async () => {
    setActionLoading('delete')
    try {
      await api.delete(`/admin/users/${userId}`)
      toast.success('User account deleted')
      onUpdated()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete user')
    } finally {
      setActionLoading(null)
      setShowDeleteConfirm(false)
    }
  }

  if (!isOpen) return null

  const plans = [
    { id: 'team_core_monthly', name: 'Grassroots Core (Monthly)' },
    { id: 'team_core_annual', name: 'Grassroots Core (Annual)' },
    { id: 'team_pro_monthly', name: 'Grassroots Pro (Monthly)' },
    { id: 'team_pro_annual', name: 'Grassroots Pro (Annual)' },
    { id: 'academy_monthly', name: 'Academy (Monthly)' },
    { id: 'academy_annual', name: 'Academy (Annual)' },
    { id: 'club_starter_monthly', name: 'Club Starter (Monthly — 6 teams)' },
    { id: 'club_growth_monthly', name: 'Club Growth (Monthly — 15 teams)' },
    { id: 'club_scale_monthly', name: 'Club Scale (Monthly — 40 teams)' },
  ]

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-navy-900 border border-navy-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b border-navy-800 sticky top-0 bg-navy-900 z-10">
          <h3 className="text-lg font-semibold text-white">Manage User</h3>
          <button onClick={onClose} className="text-navy-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-pitch-500" />
          </div>
        ) : userDetail ? (
          <div className="p-4 space-y-5">
            {/* User Info */}
            <div className="bg-navy-800/50 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-pitch-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-pitch-400" />
                </div>
                <div>
                  <div className="text-white font-medium">{userDetail.name || 'No name'}</div>
                  <div className="text-sm text-navy-400">{userDetail.email}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-sm text-navy-400 capitalize">{userDetail.role}</div>
                  <div className="text-xs text-navy-500">
                    Joined {new Date(userDetail.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              {userDetail.team_name && (
                <div className="mt-2 pt-2 border-t border-navy-700 text-sm text-navy-400">
                  Team: <span className="text-white">{userDetail.team_name}</span>
                </div>
              )}
              <div className="mt-1 text-sm text-navy-400">
                Player Profile:{' '}
                {userDetail.player_id ? (
                  <span className="text-pitch-400">{userDetail.player_name || 'Linked'}</span>
                ) : (
                  <span className="text-red-400">Not linked</span>
                )}
              </div>
              {userDetail.subscription && (
                <div className="mt-1 text-sm text-navy-400">
                  Subscription:{' '}
                  <span className="text-white">{userDetail.subscription.plan_id}</span>
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                      userDetail.subscription.status === 'active'
                        ? 'bg-pitch-500/20 text-pitch-400'
                        : userDetail.subscription.status === 'trialing'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {userDetail.subscription.status}
                  </span>
                </div>
              )}
              {userDetail.subscription_tier && !['free', 'free_trial', ''].includes(userDetail.subscription_tier) && (
                <div className="mt-1 text-sm text-navy-400">
                  Plan:{' '}
                  <span className="text-pitch-400 capitalize">
                    {userDetail.subscription_tier.replace('team_', '').replace('_monthly', '').replace('_annual', '').replace(/_/g, ' ')}
                  </span>
                </div>
              )}
            </div>

            {/* Change Role */}
            <div className="bg-navy-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="text-white text-sm font-medium">Role</div>
                    <div className="text-xs text-navy-400">Current: <span className="capitalize text-white">{userDetail.role}</span></div>
                  </div>
                </div>
                <select
                  value={userDetail.role}
                  onChange={(e) => handleChangeRole(e.target.value)}
                  disabled={actionLoading === 'role'}
                  className="px-3 py-1.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:border-pitch-500 focus:outline-none"
                >
                  <option value="manager">Manager</option>
                  <option value="assistant">Assistant</option>
                  <option value="parent">Parent</option>
                  <option value="player">Player</option>
                </select>
              </div>
            </div>

            {/* Billing Exempt Toggle */}
            <div className="bg-navy-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-white text-sm font-medium">Billing Exempt</div>
                    <div className="text-xs text-navy-400">
                      Full access without payment (equivalent to top-tier plan)
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleToggleBillingExempt}
                  disabled={actionLoading === 'billing'}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    userDetail.billing_exempt
                      ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                      : 'bg-navy-700 text-navy-300 hover:bg-navy-600'
                  }`}
                >
                  {actionLoading === 'billing' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : userDetail.billing_exempt ? (
                    'Enabled'
                  ) : (
                    'Enable'
                  )}
                </button>
              </div>
            </div>

            {/* Grant Temporary Access */}
            {userDetail.team_id && (
              <div className="bg-navy-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-pitch-400" />
                  <div className="text-white text-sm font-medium">Grant Temporary Access</div>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="number"
                      value={trialDays}
                      onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                      min="1"
                      max="365"
                      className="w-20 px-3 py-1.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:border-pitch-500 focus:outline-none"
                    />
                    <span className="text-sm text-navy-400">days</span>
                  </div>
                  <button
                    onClick={handleExtendTrial}
                    disabled={actionLoading === 'trial' || trialDays < 1}
                    className="flex items-center gap-2 px-3 py-1.5 bg-pitch-500 text-navy-950 rounded-lg text-sm hover:bg-pitch-600 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === 'trial' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Add
                  </button>
                </div>
                <p className="text-xs text-navy-500 mt-2">
                  Grants temporary paid-tier access for the specified number of days.
                </p>
              </div>
            )}

            {/* Grant Subscription */}
            {userDetail.team_id && (
              <div className="bg-navy-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4 text-purple-400" />
                  <div className="text-white text-sm font-medium">Grant Subscription</div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:border-pitch-500 focus:outline-none"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleGrantSubscription}
                    disabled={actionLoading === 'subscription'}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === 'subscription' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Gift className="w-4 h-4" />
                    )}
                    Grant
                  </button>
                </div>
                <p className="text-xs text-navy-500 mt-2">
                  Creates a full subscription period. Cancels any existing subscription first.
                </p>
              </div>
            )}

            {!userDetail.team_id && (
              <div className="bg-navy-800/50 rounded-lg p-3 text-center text-navy-400 text-sm">
                This user has no team. Trial extension and subscription grants require a team.
              </div>
            )}

            {/* Reassign Team */}
            <div className="bg-navy-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                <div className="text-white text-sm font-medium">Reassign Team</div>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedTeamId}
                  onChange={(e) => {
                    setSelectedTeamId(e.target.value)
                    if (e.target.value) fetchTeamPlayers(e.target.value)
                    else setTeamPlayers([])
                  }}
                  className="flex-1 px-3 py-1.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:border-pitch-500 focus:outline-none"
                >
                  <option value="">No team</option>
                  {allTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.age_group ? ` (${t.age_group})` : ''}{t.owner_name ? ` — ${t.owner_name}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleReassignTeam}
                  disabled={actionLoading === 'team' || selectedTeamId === (userDetail.team_id || '')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'team' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Move
                </button>
              </div>
              <p className="text-xs text-navy-500 mt-2">
                Reassign this user to a different team. Their role stays the same.
              </p>
            </div>

            {/* Link Player Profile */}
            {userDetail.team_id && (
              <div className="bg-navy-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-orange-400" />
                  <div className="text-white text-sm font-medium">Link Player Profile</div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:border-pitch-500 focus:outline-none"
                  >
                    <option value="">No player linked</option>
                    {teamPlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.squad_number ? ` (#${p.squad_number})` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleLinkPlayer}
                    disabled={actionLoading === 'player' || selectedPlayerId === (userDetail.player_id || '')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === 'player' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Users className="w-4 h-4" />
                    )}
                    Link
                  </button>
                </div>
                <p className="text-xs text-navy-500 mt-2">
                  Link this account to a player profile so they can access the Player Lounge.
                </p>
              </div>
            )}

            {/* Delete User */}
            <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Trash2 className="w-4 h-4 text-red-400" />
                <div className="text-red-400 text-sm font-medium">Danger Zone</div>
              </div>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-3 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30 transition-colors border border-red-700/30"
                >
                  Delete User Account
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-red-300">
                    Permanently delete <strong>{userDetail.name || userDetail.email}</strong>? They will need to register again. This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteUser}
                      disabled={actionLoading === 'delete'}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === 'delete' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Confirm Delete
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-2 bg-navy-700 text-navy-300 rounded-lg text-sm hover:bg-navy-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  )
}

export default function Admin() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [promoCodes, setPromoCodes] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showModal, setShowModal] = useState(false)
  const [editingCode, setEditingCode] = useState(null)
  const [copiedCode, setCopiedCode] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [userTotal, setUserTotal] = useState(0)
  const [managingUserId, setManagingUserId] = useState(null)

  // Blog state
  const [blogPosts, setBlogPosts] = useState([])
  const [blogLoading, setBlogLoading] = useState(false)
  const [editingPost, setEditingPost] = useState(null) // null = list view, object = editing
  const [generatingPost, setGeneratingPost] = useState(false)
  const [generateTopic, setGenerateTopic] = useState('')
  const [savingPost, setSavingPost] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // Feature screenshots state
  const [screenshots, setScreenshots] = useState([])
  const [uploadingSlot, setUploadingSlot] = useState(null)
  const [dragOverSlot, setDragOverSlot] = useState(null)

  // Finance state
  const [finance, setFinance] = useState(null)
  const [financeLoading, setFinanceLoading] = useState(false)

  // Redirect non-admins
  if (!user?.is_admin) {
    return <Navigate to="/dashboard" replace />
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers()
    }
    if (activeTab === 'blog') {
      fetchBlogPosts()
    }
    if (activeTab === 'screenshots') {
      fetchScreenshots()
    }
    if (activeTab === 'finance') {
      fetchFinance()
    }
  }, [activeTab, userPage, searchQuery])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [statsRes, codesRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/promo-codes'),
      ])
      setStats(statsRes.data)
      setPromoCodes(codesRes.data)
    } catch (error) {
      console.error('Failed to fetch admin data:', error)
      toast.error('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users', {
        params: { page: userPage, limit: 20, search: searchQuery }
      })
      setUsers(res.data.users)
      setUserTotal(res.data.total)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const handleSavePromoCode = async (data, id) => {
    try {
      if (id) {
        await api.put(`/admin/promo-codes/${id}`, data)
        toast.success('Promo code updated')
      } else {
        await api.post('/admin/promo-codes', data)
        toast.success('Promo code created')
      }
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save promo code')
      throw error
    }
  }

  const handleDeleteCode = async (id) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return

    try {
      await api.delete(`/admin/promo-codes/${id}`)
      toast.success('Promo code deleted')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete promo code')
    }
  }

  const handleToggleActive = async (code) => {
    try {
      await api.put(`/admin/promo-codes/${code.id}`, { is_active: !code.is_active })
      toast.success(`Promo code ${code.is_active ? 'deactivated' : 'activated'}`)
      fetchData()
    } catch (error) {
      toast.error('Failed to update promo code')
    }
  }

  const fetchBlogPosts = async () => {
    setBlogLoading(true)
    try {
      const res = await blogService.getAdminPosts()
      setBlogPosts(res.data)
    } catch (error) {
      console.error('Failed to fetch blog posts:', error)
      toast.error('Failed to load blog posts')
    } finally {
      setBlogLoading(false)
    }
  }

  // Feature screenshots
  const FEATURE_PAGES = [
    { slug: 'session-planner', title: 'Session Planner' },
    { slug: 'player-development', title: 'Player Development' },
    { slug: 'video-analysis', title: 'Video Analysis' },
    { slug: 'tactical-advisor', title: 'Tactical Advisor' },
    { slug: 'tactics-board', title: 'Tactics Board' },
    { slug: 'match-prep', title: 'Match Prep & Analysis' },
    { slug: 'live-streaming', title: 'Live Streaming' },
    { slug: 'parent-portal', title: 'Parent Portal' },
  ]
  const SLOTS = ['hero', 'step_1', 'step_2', 'step_3']
  const slotLabels = { hero: 'Hero', step_1: 'Step 1', step_2: 'Step 2', step_3: 'Step 3' }

  const fetchFinance = async () => {
    setFinanceLoading(true)
    try {
      const res = await api.get('/admin/finance')
      setFinance(res.data)
    } catch (error) {
      console.error('Failed to fetch finance data:', error)
      toast.error('Failed to load finance data')
    } finally {
      setFinanceLoading(false)
    }
  }

  const fetchScreenshots = async () => {
    try {
      const res = await api.get('/admin/feature-screenshots')
      setScreenshots(res.data)
    } catch (error) {
      console.error('Failed to fetch screenshots:', error)
    }
  }

  const handleScreenshotUpload = async (slug, slot, file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Check file size (max 10MB before resize)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large. Maximum 10MB allowed.')
      return
    }

    setUploadingSlot(`${slug}-${slot}`)
    try {
      // Resize image before upload
      const resizedFile = await resizeImage(file, 1920, 0.85)
      console.log(`Resized ${file.name}: ${(file.size / 1024).toFixed(0)}KB -> ${(resizedFile.size / 1024).toFixed(0)}KB`)

      const formData = new FormData()
      formData.append('image', resizedFile)

      await api.post(`/admin/feature-screenshots/${slug}/${slot}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      toast.success('Screenshot uploaded')
      fetchScreenshots()
    } catch (error) {
      console.error('Screenshot upload error:', error)
      const message = error.response?.data?.error || error.message || 'Failed to upload screenshot'
      toast.error(message)
    } finally {
      setUploadingSlot(null)
    }
  }

  const handleScreenshotDelete = async (slug, slot) => {
    if (!confirm('Remove this screenshot?')) return
    try {
      await api.delete(`/admin/feature-screenshots/${slug}/${slot}`)
      toast.success('Screenshot removed')
      fetchScreenshots()
    } catch (error) {
      toast.error('Failed to delete screenshot')
    }
  }

  const getScreenshot = (slug, slot) => screenshots.find(s => s.feature_slug === slug && s.slot === slot)

  // Resize image before upload (max 1920px width, JPEG quality 0.85)
  const resizeImage = (file, maxWidth = 1920, quality = 0.85) => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      img.onload = () => {
        let { width, height } = img

        // Only resize if larger than maxWidth
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Create a new File from the blob
              const resizedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(resizedFile)
            } else {
              reject(new Error('Failed to resize image'))
            }
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  const handleScreenshotDrop = async (e, slug, slot) => {
    e.preventDefault()
    setDragOverSlot(null)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      await handleScreenshotUpload(slug, slot, file)
    } else {
      toast.error('Please drop an image file')
    }
  }

  const handleNewPost = () => {
    setEditingPost({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      cover_image_url: '',
      status: 'draft',
      tags: [],
      meta_title: '',
      meta_description: '',
    })
  }

  const handleEditPost = async (id) => {
    try {
      const res = await blogService.getAdminPost(id)
      setEditingPost(res.data)
    } catch (error) {
      toast.error('Failed to load post')
    }
  }

  const handleSavePost = async () => {
    if (!editingPost.title || !editingPost.content) {
      toast.error('Title and content are required')
      return
    }
    setSavingPost(true)
    try {
      if (editingPost.id) {
        await blogService.updatePost(editingPost.id, editingPost)
        toast.success('Post updated')
      } else {
        await blogService.createPost(editingPost)
        toast.success('Post created')
      }
      setEditingPost(null)
      fetchBlogPosts()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save post')
    } finally {
      setSavingPost(false)
    }
  }

  const handleDeletePost = async (id) => {
    if (!confirm('Delete this blog post?')) return
    try {
      await blogService.deletePost(id)
      toast.success('Post deleted')
      fetchBlogPosts()
    } catch (error) {
      toast.error('Failed to delete post')
    }
  }

  const handleGeneratePost = async () => {
    if (!generateTopic.trim()) {
      toast.error('Enter a topic first')
      return
    }
    setGeneratingPost(true)
    try {
      const res = await blogService.generatePost({ topic: generateTopic })
      setEditingPost(res.data)
      setGenerateTopic('')
      toast.success('Post generated! Review and edit before publishing.')
    } catch (error) {
      toast.error('Failed to generate post')
    } finally {
      setGeneratingPost(false)
    }
  }

  const handlePublishToggle = async (post) => {
    try {
      const newStatus = post.status === 'published' ? 'draft' : 'published'
      await blogService.updatePost(post.id, { status: newStatus })
      toast.success(newStatus === 'published' ? 'Post published' : 'Post unpublished')
      fetchBlogPosts()
    } catch (error) {
      toast.error('Failed to update post status')
    }
  }

  const handleImageUpload = async (file) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }
    setUploadingImage(true)
    try {
      const res = await blogService.uploadImage(file)
      setEditingPost(prev => ({ ...prev, cover_image_url: res.data.url }))
      toast.success('Image uploaded')
    } catch (error) {
      toast.error('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file)
    } else {
      toast.error('Please drop an image file')
    }
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
    toast.success('Code copied!')
  }

  const getDiscountDisplay = (code) => {
    if (code.discount_type === 'free') return 'FREE'
    if (code.discount_type === 'percentage') return `${code.discount_value}%`
    return `£${code.discount_value}`
  }

  const getDiscountIcon = (type) => {
    if (type === 'free') return Gift
    if (type === 'percentage') return Percent
    return DollarSign
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pitch-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-navy-400">Manage users, promo codes, and view analytics</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 bg-navy-800 text-navy-300 rounded-lg hover:bg-navy-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-navy-800 pb-2">
        {['overview', 'finance', 'promo-codes', 'users', 'blog', 'screenshots'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab
                ? 'bg-pitch-500 text-navy-950'
                : 'text-navy-400 hover:text-white hover:bg-navy-800'
            }`}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'finance' && 'Finance'}
            {tab === 'promo-codes' && 'Promo Codes'}
            {tab === 'users' && 'Users'}
            {tab === 'blog' && 'Blog'}
            {tab === 'screenshots' && 'Screenshots'}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              title="Total Users"
              value={stats.users.total_users}
              subtitle={`+${stats.users.new_users_7d} this week`}
              icon={Users}
              color="pitch"
            />
            <StatCard
              title="Clubs"
              value={stats.clubs?.total_clubs || 0}
              subtitle={`+${stats.clubs?.new_clubs_7d || 0} this week`}
              icon={Building2}
              color="cyan"
            />
            <StatCard
              title="Teams"
              value={stats.teams.total_teams}
              subtitle={`+${stats.teams.new_teams_7d} this week`}
              icon={Shield}
              color="blue"
            />
            <StatCard
              title="Players"
              value={stats.players?.total_players || 0}
              subtitle={`${stats.players?.active_players || 0} active`}
              icon={UserCheck}
              color="orange"
            />
            <StatCard
              title="Promo Codes"
              value={stats.promoCodes.active_codes}
              subtitle={`${stats.promoCodes.total_redemptions} redemptions`}
              icon={Ticket}
              color="amber"
            />
            <StatCard
              title="Paid Subscriptions"
              value={stats.subscriptions.paid}
              subtitle={`${stats.subscriptions.free} free`}
              icon={TrendingUp}
              color="purple"
            />
          </div>

          {/* Breakdowns */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-4">User Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-navy-400">Coaches</span>
                  <span className="text-white font-medium">{stats.users.coaches}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-navy-400">Players</span>
                  <span className="text-white font-medium">{stats.users.players}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-navy-400">Parents</span>
                  <span className="text-white font-medium">{stats.users.parents}</span>
                </div>
              </div>
            </div>

            <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-4">Team Subscriptions</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-navy-400">Free</span>
                  <span className="text-white font-medium">{stats.subscriptions?.free || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-navy-400">Core</span>
                  <span className="text-white font-medium">{stats.subscriptions?.core || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-navy-400">Pro</span>
                  <span className="text-white font-medium">{stats.subscriptions?.pro || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-navy-400">Academy</span>
                  <span className="text-white font-medium">{stats.subscriptions?.academy || 0}</span>
                </div>
                {parseInt(stats.subscriptions?.legacy_trials || 0) > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-navy-800">
                    <span className="text-navy-500 text-sm">Legacy trials</span>
                    <span className="text-navy-500 font-medium text-sm">{stats.subscriptions.legacy_trials}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-4">Team Formats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-navy-400">11-a-side</span>
                  <span className="text-white font-medium">{stats.teams.teams_11}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-navy-400">9-a-side</span>
                  <span className="text-white font-medium">{stats.teams.teams_9}</span>
                </div>
              </div>
            </div>

            <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-4">Club Tiers</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-navy-400">Starter (6 teams)</span>
                  <span className="text-white font-medium">{stats.clubs?.starter || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-navy-400">Growth (15 teams)</span>
                  <span className="text-white font-medium">{stats.clubs?.growth || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-navy-400">Scale (40 teams)</span>
                  <span className="text-white font-medium">{stats.clubs?.scale || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-4">Recent Signups</h3>
              <div className="space-y-2">
                {stats.recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-2 border-b border-navy-800 last:border-0">
                    <div>
                      <div className="text-white">{u.name || u.email}</div>
                      <div className="text-sm text-navy-400">{u.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-navy-400 capitalize">{u.role}</div>
                      <div className="text-xs text-navy-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-4">Recent Clubs</h3>
              {stats.recentClubs?.length > 0 ? (
                <div className="space-y-2">
                  {stats.recentClubs.map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b border-navy-800 last:border-0">
                      <div>
                        <div className="text-white">{c.name}</div>
                        <div className="text-sm text-navy-400">
                          {c.team_count} {c.team_count === 1 ? 'team' : 'teams'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-navy-400 capitalize">
                          {(c.subscription_tier || 'starter').replace('club_', '')}
                        </div>
                        <div className="text-xs text-navy-500">
                          {new Date(c.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-navy-500 text-sm text-center py-4">No clubs registered yet</div>
              )}
            </div>
          </div>

          {/* Top Managers by Team Count */}
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-4">Top Accounts by Teams</h3>
            {stats.topManagers?.length > 0 ? (
              <div className="space-y-2">
                {stats.topManagers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-navy-800 last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="text-white">{m.name || m.email}</div>
                      <div className="text-sm text-navy-400">{m.email}</div>
                      <div className="text-xs text-navy-500 mt-1 truncate">
                        {m.team_names?.join(', ')}
                      </div>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <div className="text-white font-semibold">{m.team_count} {parseInt(m.team_count) === 1 ? 'team' : 'teams'}</div>
                      <div className="text-xs text-navy-500 capitalize">
                        {m.tiers?.map(t => {
                          const tier = t || 'free'
                          if (tier === 'free_trial' || tier === 'free') return 'Free'
                          if (tier === 'trial_14d') return 'Trial'
                          return tier.replace('team_', '').replace('_monthly', '').replace('_annual', '')
                        }).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-navy-500 text-sm text-center py-4">No manager data available</div>
            )}
          </div>
        </motion.div>
      )}

      {/* Finance Tab */}
      {activeTab === 'finance' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {financeLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-pitch-400" /></div>
          ) : finance ? (
            <>
              {/* Revenue KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="MRR" value={`£${(finance.mrr / 100).toFixed(2)}`} subtitle="Monthly recurring" icon={TrendingUp} color="pitch" />
                <StatCard title="ARR" value={`£${(finance.arr / 100).toFixed(2)}`} subtitle="Annual projected" icon={DollarSign} color="blue" />
                <StatCard title="Active Subs" value={finance.subscriptionActivity?.active || 0} subtitle={`${finance.subscriptionActivity?.new_30d || 0} new this month`} icon={CreditCard} color="purple" />
                <StatCard title="Churn (30d)" value={finance.subscriptionActivity?.churned_30d || 0} subtitle={`${finance.subscriptionActivity?.past_due || 0} past due`} icon={TrendingUp} color="amber" />
              </div>

              {/* Tier Breakdown & Credits */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Subscription Tiers */}
                <div className="card p-5">
                  <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-pitch-400" /> Revenue by Tier</h3>
                  <div className="space-y-3">
                    {finance.tierBreakdown?.length > 0 ? finance.tierBreakdown.map(tier => {
                      const tierPrices = {
                        team_core_monthly: 999, team_core_annual: 799,
                        team_pro_monthly: 1999, team_pro_annual: 1599,
                        academy_monthly: 2999, academy_annual: 2499,
                        club_starter_monthly: 9900, club_starter_annual: 8900,
                        club_growth_monthly: 19900, club_growth_annual: 17900,
                        club_scale_monthly: 34900, club_scale_annual: 31900,
                      }
                      const monthlyRevenue = (tierPrices[tier.subscription_tier] || 0) * parseInt(tier.count)
                      return (
                        <div key={tier.subscription_tier} className="flex items-center justify-between py-2 border-b border-navy-800 last:border-0">
                          <div>
                            <span className="text-white font-medium">{tier.tier_group}</span>
                            <span className="text-navy-500 text-xs ml-2">{tier.subscription_tier.includes('annual') ? '(annual)' : '(monthly)'}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-pitch-400 font-semibold">£{(monthlyRevenue / 100).toFixed(2)}</span>
                            <span className="text-navy-500 text-xs ml-1">/mo</span>
                            <span className="text-navy-400 text-sm ml-3">{tier.count} {parseInt(tier.count) === 1 ? 'team' : 'teams'}</span>
                          </div>
                        </div>
                      )
                    }) : <p className="text-navy-500 text-sm">No paid subscriptions yet</p>}
                  </div>
                </div>

                {/* Credit Purchases */}
                <div className="card p-5">
                  <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-energy-400" /> Credit Purchases</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50">
                      <div>
                        <p className="text-white font-medium">Video Analysis Credits</p>
                        <p className="text-navy-400 text-xs">Team-level top-ups</p>
                      </div>
                      <span className="text-pitch-400 font-semibold">{finance.videoCredits?.totalRemaining || 0} remaining</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50">
                      <div>
                        <p className="text-white font-medium">Deep Video Credits</p>
                        <p className="text-navy-400 text-xs">{finance.deepVideoCredits?.usersWithCredits || 0} users with credits</p>
                      </div>
                      <span className="text-energy-400 font-semibold">{finance.deepVideoCredits?.totalRemaining || 0} remaining</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50">
                      <div>
                        <p className="text-white font-medium">Total Credit Purchases</p>
                        <p className="text-navy-400 text-xs">All-time processed transactions</p>
                      </div>
                      <span className="text-white font-semibold">{finance.creditRevenue?.total_purchases || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Growth */}
              <div className="card p-5">
                <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-pitch-400" /> Monthly Growth (Last 6 Months)</h3>
                {finance.monthlyTeams?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-navy-400 border-b border-navy-800">
                          <th className="text-left py-2 font-medium">Month</th>
                          <th className="text-right py-2 font-medium">New Teams</th>
                          <th className="text-right py-2 font-medium">Paid Teams</th>
                          <th className="text-right py-2 font-medium">New Subs</th>
                          <th className="text-right py-2 font-medium">Conversion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {finance.monthlyTeams.map((month, i) => {
                          const subData = finance.monthlyGrowth?.find(g => g.month === month.month)
                          const conversion = parseInt(month.new_teams) > 0
                            ? Math.round((parseInt(month.paid_teams) / parseInt(month.new_teams)) * 100)
                            : 0
                          return (
                            <tr key={month.month} className="border-b border-navy-800/50">
                              <td className="py-2 text-white font-medium">{new Date(month.month + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</td>
                              <td className="py-2 text-right text-navy-300">{month.new_teams}</td>
                              <td className="py-2 text-right text-pitch-400">{month.paid_teams}</td>
                              <td className="py-2 text-right text-navy-300">{subData?.new_subscriptions || 0}</td>
                              <td className="py-2 text-right">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  conversion >= 30 ? 'bg-pitch-500/20 text-pitch-400' :
                                  conversion >= 10 ? 'bg-energy-500/20 text-energy-400' :
                                  'bg-navy-700 text-navy-400'
                                }`}>{conversion}%</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-navy-500 text-sm">No data yet</p>}
              </div>

              {/* Forecast */}
              <div className="card p-5">
                <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-400" /> Revenue Forecast</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-navy-800/50 text-center">
                    <p className="text-navy-400 text-xs mb-1">Next Month</p>
                    <p className="text-white text-xl font-bold">£{(finance.mrr / 100).toFixed(0)}</p>
                    <p className="text-navy-500 text-xs">Based on current MRR</p>
                  </div>
                  <div className="p-4 rounded-lg bg-navy-800/50 text-center">
                    <p className="text-navy-400 text-xs mb-1">Next Quarter</p>
                    <p className="text-white text-xl font-bold">£{(finance.mrr * 3 / 100).toFixed(0)}</p>
                    <p className="text-navy-500 text-xs">3 months projected</p>
                  </div>
                  <div className="p-4 rounded-lg bg-navy-800/50 text-center">
                    <p className="text-navy-400 text-xs mb-1">Annual Run Rate</p>
                    <p className="text-pitch-400 text-xl font-bold">£{(finance.arr / 100).toFixed(0)}</p>
                    <p className="text-navy-500 text-xs">12 months projected</p>
                  </div>
                </div>
              </div>

              {/* Recent Subscription Activity */}
              <div className="card p-5">
                <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-purple-400" /> Recent Subscription Activity</h3>
                {finance.recentSubscriptions?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-navy-400 border-b border-navy-800">
                          <th className="text-left py-2 font-medium">Team</th>
                          <th className="text-left py-2 font-medium">Plan</th>
                          <th className="text-left py-2 font-medium">Status</th>
                          <th className="text-left py-2 font-medium">Provider</th>
                          <th className="text-right py-2 font-medium">Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {finance.recentSubscriptions.map(sub => (
                          <tr key={sub.id} className="border-b border-navy-800/50">
                            <td className="py-2 text-white">{sub.team_name || '—'} <span className="text-navy-500 text-xs">{sub.age_group}</span></td>
                            <td className="py-2 text-navy-300">{sub.plan_id?.replace(/_/g, ' ')}</td>
                            <td className="py-2">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                sub.status === 'active' ? 'bg-pitch-500/20 text-pitch-400' :
                                sub.status === 'trialing' ? 'bg-blue-500/20 text-blue-400' :
                                sub.status === 'past_due' ? 'bg-energy-500/20 text-energy-400' :
                                'bg-alert-500/20 text-alert-400'
                              }`}>{sub.status}</span>
                            </td>
                            <td className="py-2 text-navy-400">{sub.provider}</td>
                            <td className="py-2 text-right text-navy-400">{new Date(sub.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-navy-500 text-sm">No subscription activity yet</p>}
              </div>
            </>
          ) : null}
        </motion.div>
      )}

      {/* Promo Codes Tab */}
      {activeTab === 'promo-codes' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-white">Promo Codes</h3>
            <button
              onClick={() => {
                setEditingCode(null)
                setShowModal(true)
              }}
              className="flex items-center gap-2 px-3 py-2 bg-pitch-500 text-navy-950 rounded-lg hover:bg-pitch-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Code
            </button>
          </div>

          <div className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-navy-800/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-navy-400">Code</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-navy-400">Discount</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-navy-400 hidden md:table-cell">Description</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-navy-400">Uses</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-navy-400">Status</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-navy-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800">
                {promoCodes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-navy-400">
                      No promo codes yet. Create your first one!
                    </td>
                  </tr>
                ) : (
                  promoCodes.map((code) => {
                    const DiscountIcon = getDiscountIcon(code.discount_type)
                    return (
                      <tr key={code.id} className="hover:bg-navy-800/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-white">{code.code}</span>
                            <button
                              onClick={() => copyCode(code.code)}
                              className="text-navy-400 hover:text-white"
                            >
                              {copiedCode === code.code ? (
                                <Check className="w-4 h-4 text-pitch-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <DiscountIcon className="w-4 h-4 text-pitch-400" />
                            <span className="text-white">{getDiscountDisplay(code)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-navy-400 hidden md:table-cell">
                          {code.description || '-'}
                        </td>
                        <td className="px-4 py-3 text-navy-400">
                          <span className="text-white">{code.current_uses}</span>
                          {code.max_uses ? (
                            <span> / {code.max_uses}</span>
                          ) : (
                            <span className="text-navy-500 text-xs ml-1">/ &infin;</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleActive(code)}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              code.is_active
                                ? 'bg-pitch-500/20 text-pitch-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {code.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingCode(code)
                                setShowModal(true)
                              }}
                              className="p-1.5 text-navy-400 hover:text-white hover:bg-navy-700 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCode(code.id)}
                              className="p-1.5 text-navy-400 hover:text-red-400 hover:bg-navy-700 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setUserPage(1)
                }}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 bg-navy-900 border border-navy-800 rounded-lg text-white placeholder-navy-500 focus:border-pitch-500 focus:outline-none"
              />
            </div>
            <div className="text-sm text-navy-400">
              {userTotal} total users
            </div>
          </div>

          <div className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-navy-800/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-navy-400">User</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-navy-400">Role</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-navy-400 hidden md:table-cell">Team</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-navy-400 hidden md:table-cell">Status</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-navy-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-navy-800/30">
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-white flex items-center gap-2">
                          {u.name || 'No name'}
                          {u.is_admin && (
                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                              Admin
                            </span>
                          )}
                          {u.billing_exempt && (
                            <span className="px-1.5 py-0.5 bg-pitch-500/20 text-pitch-400 text-xs rounded">
                              Exempt
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-navy-400">{u.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-navy-400 capitalize">{u.role}</td>
                    <td className="px-4 py-3 text-navy-400 hidden md:table-cell">
                      {u.team_name || '-'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {u.billing_exempt ? (
                        <span className="text-xs text-pitch-400">Full access</span>
                      ) : (u.role === 'parent' || u.role === 'player') && u.team_name ? (
                        <span className="text-xs text-blue-400">Team member</span>
                      ) : u.subscription_tier && !['free', 'free_trial', 'trial_14d', ''].includes(u.subscription_tier) ? (
                        <span className="text-xs text-pitch-400 capitalize">
                          {u.subscription_tier.replace('team_', '').replace('_monthly', '').replace('_annual', '').replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-xs text-navy-500">Free</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setManagingUserId(u.id)}
                        className="p-1.5 text-navy-400 hover:text-white hover:bg-navy-700 rounded"
                        title="Manage user"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {userTotal > 20 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                disabled={userPage === 1}
                className="px-3 py-1 bg-navy-800 text-white rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-navy-400">
                Page {userPage} of {Math.ceil(userTotal / 20)}
              </span>
              <button
                onClick={() => setUserPage((p) => p + 1)}
                disabled={userPage >= Math.ceil(userTotal / 20)}
                className="px-3 py-1 bg-navy-800 text-white rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Blog Tab */}
      {activeTab === 'blog' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {editingPost ? (
            /* Blog Editor */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setEditingPost(null)}
                  className="text-navy-400 hover:text-white flex items-center gap-1"
                >
                  ← Back to posts
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handleSavePost}
                    disabled={savingPost}
                    className="flex items-center gap-2 px-4 py-2 bg-pitch-500 text-navy-950 rounded-lg hover:bg-pitch-600 transition-colors disabled:opacity-50"
                  >
                    {savingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              </div>

              <div className="bg-navy-900 border border-navy-800 rounded-xl p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1">Title</label>
                  <input
                    type="text"
                    value={editingPost.title}
                    onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                    placeholder="Post title"
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-navy-500 focus:border-pitch-500 focus:outline-none"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-300 mb-1">Slug</label>
                    <input
                      type="text"
                      value={editingPost.slug || ''}
                      onChange={(e) => setEditingPost({ ...editingPost, slug: e.target.value })}
                      placeholder="auto-generated-from-title"
                      className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-navy-500 focus:border-pitch-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-300 mb-1">Status</label>
                    <select
                      value={editingPost.status}
                      onChange={(e) => setEditingPost({ ...editingPost, status: e.target.value })}
                      className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white focus:border-pitch-500 focus:outline-none"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1">
                    Cover Image
                    <span className="text-navy-500 font-normal ml-2">Recommended: 1200 x 630px (1.9:1 ratio)</span>
                  </label>
                  {editingPost.cover_image_url ? (
                    <div className="relative group">
                      <img
                        src={editingPost.cover_image_url.startsWith('http') ? editingPost.cover_image_url : `${SERVER_URL}${editingPost.cover_image_url}`}
                        alt=""
                        className="w-full max-h-56 object-cover rounded-lg border border-navy-700"
                        onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.querySelector('.cover-image-error').style.display = 'flex' }}
                      />
                      <div className="cover-image-error hidden flex-col items-center justify-center gap-3 p-6 rounded-lg border border-navy-700 bg-navy-800/50 text-navy-400 text-sm">
                        <p>Image failed to load</p>
                        <div className="flex gap-3">
                          <label className="cursor-pointer px-3 py-1.5 bg-pitch-600 text-white rounded-lg text-sm hover:bg-pitch-500 flex items-center gap-1.5">
                            <Upload className="w-4 h-4" />
                            Upload New
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(e.target.files[0])}
                            />
                          </label>
                          <button
                            onClick={() => setEditingPost({ ...editingPost, cover_image_url: '' })}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 flex items-center gap-1.5"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
                        <label className="cursor-pointer px-3 py-1.5 bg-navy-800 text-white rounded-lg text-sm hover:bg-navy-700 flex items-center gap-1.5">
                          <Upload className="w-4 h-4" />
                          Replace
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e.target.files[0])}
                          />
                        </label>
                        <button
                          onClick={() => setEditingPost({ ...editingPost, cover_image_url: '' })}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 flex items-center gap-1.5"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                        dragOver ? 'border-pitch-500 bg-pitch-500/10' : 'border-navy-700 hover:border-navy-600'
                      }`}
                      onClick={() => document.getElementById('blog-cover-upload').click()}
                    >
                      {uploadingImage ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 animate-spin text-pitch-500" />
                          <p className="text-navy-400 text-sm">Uploading...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Image className="w-8 h-8 text-navy-500" />
                          <p className="text-navy-400 text-sm">
                            Drag & drop an image here, or <span className="text-pitch-400">click to browse</span>
                          </p>
                          <p className="text-navy-600 text-xs">PNG, JPG, WebP up to 5MB · Best at 1200 x 630px</p>
                        </div>
                      )}
                      <input
                        id="blog-cover-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e.target.files[0])}
                      />
                    </div>
                  )}
                  <input
                    type="text"
                    value={editingPost.cover_image_url || ''}
                    onChange={(e) => setEditingPost({ ...editingPost, cover_image_url: e.target.value })}
                    placeholder="Or paste an image URL..."
                    className="w-full mt-2 px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder-navy-500 focus:border-pitch-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1">Excerpt</label>
                  <textarea
                    value={editingPost.excerpt || ''}
                    onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })}
                    placeholder="Short summary for previews..."
                    rows={2}
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-navy-500 focus:border-pitch-500 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1">Content (Markdown)</label>
                  <textarea
                    value={editingPost.content}
                    onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                    placeholder="Write your blog post in markdown..."
                    rows={16}
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-navy-500 focus:border-pitch-500 focus:outline-none resize-y font-mono text-sm"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-300 mb-1">Meta Title</label>
                    <input
                      type="text"
                      value={editingPost.meta_title || ''}
                      onChange={(e) => setEditingPost({ ...editingPost, meta_title: e.target.value })}
                      placeholder="SEO title (defaults to title)"
                      className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-navy-500 focus:border-pitch-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-300 mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={(editingPost.tags || []).join(', ')}
                      onChange={(e) => setEditingPost({ ...editingPost, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                      placeholder="coaching, training, tactics"
                      className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-navy-500 focus:border-pitch-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1">Meta Description</label>
                  <textarea
                    value={editingPost.meta_description || ''}
                    onChange={(e) => setEditingPost({ ...editingPost, meta_description: e.target.value })}
                    placeholder="SEO description (defaults to excerpt)"
                    rows={2}
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-navy-500 focus:border-pitch-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Blog List */
            <>
              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pitch-400" />
                    <input
                      type="text"
                      value={generateTopic}
                      onChange={(e) => setGenerateTopic(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleGeneratePost()}
                      placeholder="Enter topic to AI generate..."
                      className="w-full pl-10 pr-4 py-2 bg-navy-900 border border-navy-800 rounded-lg text-white placeholder-navy-500 focus:border-pitch-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleGeneratePost}
                    disabled={generatingPost}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {generatingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Generate
                  </button>
                </div>
                <button
                  onClick={handleNewPost}
                  className="flex items-center gap-2 px-3 py-2 bg-pitch-500 text-navy-950 rounded-lg hover:bg-pitch-600 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  New Post
                </button>
              </div>

              {blogLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-pitch-500" />
                </div>
              ) : blogPosts.length === 0 ? (
                <div className="bg-navy-900 border border-navy-800 rounded-xl p-8 text-center text-navy-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No blog posts yet. Create one or use AI to generate content.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {blogPosts.map((post) => (
                    <div key={post.id} className="bg-navy-900 border border-navy-800 rounded-xl p-4 flex items-center gap-4">
                      {post.cover_image_url && (
                        <img src={post.cover_image_url.startsWith('http') ? post.cover_image_url : `${SERVER_URL}${post.cover_image_url}`} alt="" className="w-16 h-16 rounded-lg object-cover hidden sm:block" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-white font-medium truncate">{post.title}</h4>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                            post.status === 'published' ? 'bg-pitch-500/20 text-pitch-400' :
                            post.status === 'archived' ? 'bg-navy-700 text-navy-400' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                            {post.status}
                          </span>
                        </div>
                        <p className="text-sm text-navy-400 truncate">{post.excerpt || 'No excerpt'}</p>
                        <div className="text-xs text-navy-500 mt-1">
                          {post.published_at ? `Published ${new Date(post.published_at).toLocaleDateString()}` : `Updated ${new Date(post.updated_at).toLocaleDateString()}`}
                          {post.tags?.length > 0 && ` · ${post.tags.join(', ')}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handlePublishToggle(post)}
                          className="p-2 text-navy-400 hover:text-white hover:bg-navy-800 rounded-lg"
                          title={post.status === 'published' ? 'Unpublish' : 'Publish'}
                        >
                          {post.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleEditPost(post.id)}
                          className="p-2 text-navy-400 hover:text-white hover:bg-navy-800 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-2 text-navy-400 hover:text-red-400 hover:bg-navy-800 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* Screenshots Tab */}
      {activeTab === 'screenshots' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Monitor className="w-5 h-5 text-pitch-400" /> Feature Page Screenshots
          </h2>
          <p className="text-navy-400 text-sm">Upload screenshots for each feature page. Each page has 4 slots: a hero image and 3 step images. Recommended size: 1280x720px (16:9).</p>

          {FEATURE_PAGES.map(feature => (
            <div key={feature.slug} className="bg-navy-900 border border-navy-800 rounded-xl p-5">
              <h3 className="font-display font-semibold text-white mb-4">{feature.title}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {SLOTS.map(slot => {
                  const existing = getScreenshot(feature.slug, slot)
                  const isUploading = uploadingSlot === `${feature.slug}-${slot}`
                  const isDragOver = dragOverSlot === `${feature.slug}-${slot}`
                  return (
                    <div key={slot} className="space-y-2">
                      <p className="text-xs text-navy-400 font-medium">{slotLabels[slot]}</p>
                      {existing ? (
                        <div
                          className={`relative group aspect-video rounded-lg overflow-hidden border transition-colors ${
                            isDragOver ? 'border-pitch-500 ring-2 ring-pitch-500/30' : 'border-navy-700'
                          }`}
                          onDragOver={(e) => { e.preventDefault(); setDragOverSlot(`${feature.slug}-${slot}`) }}
                          onDragLeave={() => setDragOverSlot(null)}
                          onDrop={(e) => handleScreenshotDrop(e, feature.slug, slot)}
                        >
                          <img
                            src={existing.dataUrl}
                            alt={`${feature.title} ${slot}`}
                            className="w-full h-full object-cover"
                          />
                          {isUploading ? (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                              <Loader2 className="w-8 h-8 text-pitch-500 animate-spin" />
                            </div>
                          ) : isDragOver ? (
                            <div className="absolute inset-0 bg-pitch-500/30 flex items-center justify-center">
                              <div className="text-center">
                                <Upload className="w-8 h-8 text-pitch-400 mx-auto mb-1" />
                                <span className="text-sm text-pitch-300 font-medium">Drop to replace</span>
                              </div>
                            </div>
                          ) : (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <label className="cursor-pointer p-2 bg-pitch-500 rounded-lg hover:bg-pitch-600 transition-colors">
                                <Upload className="w-4 h-4 text-navy-950" />
                                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleScreenshotUpload(feature.slug, slot, e.target.files[0])} />
                              </label>
                              <button onClick={() => handleScreenshotDelete(feature.slug, slot)} className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors">
                                <Trash2 className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <label
                          className={`cursor-pointer flex flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed transition-all ${
                            isDragOver
                              ? 'border-pitch-500 bg-pitch-500/10 ring-2 ring-pitch-500/30'
                              : 'border-navy-700 hover:border-pitch-500/50 bg-navy-800/30'
                          }`}
                          onDragOver={(e) => { e.preventDefault(); setDragOverSlot(`${feature.slug}-${slot}`) }}
                          onDragLeave={() => setDragOverSlot(null)}
                          onDrop={(e) => handleScreenshotDrop(e, feature.slug, slot)}
                        >
                          {isUploading ? (
                            <Loader2 className="w-6 h-6 text-pitch-500 animate-spin" />
                          ) : isDragOver ? (
                            <>
                              <Upload className="w-6 h-6 text-pitch-400 mb-1" />
                              <span className="text-xs text-pitch-400 font-medium">Drop image</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-6 h-6 text-navy-500 mb-1" />
                              <span className="text-xs text-navy-500">Drop or click</span>
                            </>
                          )}
                          <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={e => e.target.files[0] && handleScreenshotUpload(feature.slug, slot, e.target.files[0])} />
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Promo Code Modal */}
      <PromoCodeModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingCode(null)
        }}
        onSave={handleSavePromoCode}
        editingCode={editingCode}
      />

      {/* User Manage Modal */}
      <UserManageModal
        isOpen={!!managingUserId}
        onClose={() => setManagingUserId(null)}
        userId={managingUserId}
        onUpdated={fetchUsers}
      />
    </div>
  )
}
