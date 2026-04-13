import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom'
import { clubSafeguardingService } from '../../services/api'
import {
  Plus, ChevronDown, ChevronUp, ArrowLeft, ShieldAlert,
  Clock, CheckCircle, XCircle, AlertTriangle, FileText,
  Lock, Send, Calendar, MapPin,
} from 'lucide-react'
import toast from 'react-hot-toast'

const INCIDENT_TYPES = [
  { value: 'concern', label: 'Concern' },
  { value: 'allegation', label: 'Allegation' },
  { value: 'disclosure', label: 'Disclosure' },
  { value: 'observation', label: 'Observation' },
  { value: 'other', label: 'Other' },
]

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const SEVERITY_STYLES = {
  low: 'bg-blue-500/20 text-blue-400',
  medium: 'bg-amber-500/20 text-amber-400',
  high: 'bg-orange-500/20 text-orange-400',
  critical: 'bg-red-500/20 text-red-400',
}

const STATUS_STYLES = {
  open: 'bg-amber-500/20 text-amber-400',
  investigating: 'bg-blue-500/20 text-blue-400',
  referred: 'bg-purple-500/20 text-purple-400',
  resolved: 'bg-pitch-600/20 text-pitch-400',
  closed: 'bg-navy-700 text-navy-400',
}

const STATUS_ICONS = {
  open: AlertTriangle,
  investigating: Clock,
  referred: Send,
  resolved: CheckCircle,
  closed: XCircle,
}

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  type: 'concern',
  severity: 'medium',
  people_involved: '',
  description: '',
  location: '',
}

export default function ClubSafeguardingIncidents() {
  const { club, myRole } = useOutletContext()
  const navigate = useNavigate()
  const location = useLocation()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [expandedId, setExpandedId] = useState(null)
  const [expandedDetail, setExpandedDetail] = useState(null)
  const [actionText, setActionText] = useState('')
  const [saving, setSaving] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(null)

  const canManage = ['owner', 'admin'].includes(myRole)
  const basePath = location.pathname.replace(/\/safeguarding.*/, '/safeguarding')

  // Check if user has access (welfare officer, owner, or admin)
  const hasAccess = canManage

  useEffect(() => {
    if (club?.id && hasAccess) loadIncidents()
    else setLoading(false)
  }, [club?.id])

  async function loadIncidents() {
    try {
      const res = await clubSafeguardingService.getIncidents(club.id)
      setIncidents(res.data)
    } catch (err) {
      toast.error('Failed to load incidents')
    } finally {
      setLoading(false)
    }
  }

  async function loadIncidentDetail(incidentId) {
    try {
      const res = await clubSafeguardingService.getIncident(club.id, incidentId)
      setExpandedDetail(res.data)
    } catch (err) {
      toast.error('Failed to load incident details')
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await clubSafeguardingService.createIncident(club.id, form)
      toast.success('Incident reported')
      setShowForm(false)
      setForm({ ...EMPTY_FORM })
      loadIncidents()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to report incident')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddAction(incidentId) {
    if (!actionText.trim()) return
    setSaving(true)
    try {
      const incident = expandedDetail || incidents.find(i => i.id === incidentId)
      const actions = incident?.actions_taken || []
      await clubSafeguardingService.updateIncident(club.id, incidentId, {
        actions_taken: [...actions, {
          text: actionText.trim(),
          date: new Date().toISOString(),
          by: 'Current User',
        }],
      })
      toast.success('Action recorded')
      setActionText('')
      loadIncidentDetail(incidentId)
      loadIncidents()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add action')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusUpdate(incidentId, newStatus) {
    setUpdatingStatus(incidentId)
    try {
      await clubSafeguardingService.updateIncident(club.id, incidentId, {
        status: newStatus,
      })
      toast.success(`Status updated to ${newStatus}`)
      loadIncidentDetail(incidentId)
      loadIncidents()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status')
    } finally {
      setUpdatingStatus(null)
    }
  }

  async function handleExpand(incidentId) {
    if (expandedId === incidentId) {
      setExpandedId(null)
      setExpandedDetail(null)
    } else {
      setExpandedId(incidentId)
      loadIncidentDetail(incidentId)
    }
  }

  // Access restricted view
  if (!hasAccess) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(basePath)}
            className="p-2 text-navy-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Incident Reports</h1>
          </div>
        </div>
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-8 text-center">
          <Lock className="w-12 h-12 text-navy-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">Access Restricted</h3>
          <p className="text-navy-400 text-sm max-w-md mx-auto">
            Incident reports are only accessible to club owners, administrators, and designated welfare officers.
            If you need to report a safeguarding concern, please contact your Club Welfare Officer directly.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(basePath)}
            className="p-2 text-navy-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Incident Reports</h1>
            <p className="text-navy-400 text-sm mt-1">{incidents.length} incident{incidents.length !== 1 ? 's' : ''} recorded</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Report New Incident
        </button>
      </div>

      {/* Confidentiality notice */}
      <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <Lock className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-400">Confidential Records</p>
          <p className="text-xs text-amber-400/80 mt-1">
            These records are confidential and must be handled in accordance with your club's safeguarding policy
            and data protection requirements. Do not share incident details outside of authorised personnel.
          </p>
        </div>
      </div>

      {/* Report form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-navy-900 border border-navy-800 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-semibold text-white">Report New Incident</h3>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-navy-400 mb-1">Date *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Type *</label>
              <select
                required
                value={form.type}
                onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              >
                {INCIDENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Severity *</label>
              <select
                required
                value={form.severity}
                onChange={(e) => setForm(f => ({ ...f, severity: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              >
                {SEVERITY_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-navy-400 mb-1">People Involved</label>
              <input
                type="text"
                value={form.people_involved}
                onChange={(e) => setForm(f => ({ ...f, people_involved: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                placeholder="Names of people involved"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                placeholder="Where did this occur?"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-navy-400 mb-1">Description *</label>
            <textarea
              required
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent resize-none"
              placeholder="Describe the incident in detail. Include what happened, who was involved, and any immediate actions taken..."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }) }}
              className="px-4 py-2 text-sm text-navy-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {saving ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      )}

      {/* Incidents list */}
      {incidents.length === 0 ? (
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-8 text-center">
          <FileText className="w-12 h-12 text-navy-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">No incidents recorded</h3>
          <p className="text-navy-400 text-sm">Incident reports will appear here when they are filed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => {
            const isExpanded = expandedId === incident.id
            const StatusIcon = STATUS_ICONS[incident.status] || AlertTriangle
            const detail = isExpanded ? (expandedDetail || incident) : incident

            return (
              <div key={incident.id} className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
                {/* Row header */}
                <button
                  onClick={() => handleExpand(incident.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-navy-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      SEVERITY_STYLES[incident.severity] || SEVERITY_STYLES.medium
                    }`}>
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-white capitalize">
                          {incident.type}
                        </p>
                        <span className="text-xs text-navy-500">
                          {new Date(incident.date).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <p className="text-xs text-navy-400 truncate max-w-md mt-0.5">
                        {incident.description?.substring(0, 100)}{incident.description?.length > 100 ? '...' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      SEVERITY_STYLES[incident.severity] || SEVERITY_STYLES.medium
                    }`}>
                      {incident.severity}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      STATUS_STYLES[incident.status] || STATUS_STYLES.open
                    }`}>
                      <StatusIcon className="w-3 h-3" />
                      {incident.status}
                    </span>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-navy-400" />
                      : <ChevronDown className="w-4 h-4 text-navy-400" />
                    }
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-navy-800 space-y-4">
                    {/* Full details */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-navy-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-navy-400">Date</p>
                          <p className="text-navy-200">{new Date(detail.date).toLocaleDateString('en-GB')}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-navy-400">Type</p>
                        <p className="text-navy-200 capitalize">{detail.type}</p>
                      </div>
                      {detail.location && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-navy-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-navy-400">Location</p>
                            <p className="text-navy-200">{detail.location}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {detail.people_involved && (
                      <div>
                        <p className="text-xs text-navy-400 mb-1">People Involved</p>
                        <p className="text-sm text-navy-200">{detail.people_involved}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-navy-400 mb-1">Description</p>
                      <p className="text-sm text-navy-200 whitespace-pre-wrap">{detail.description}</p>
                    </div>

                    {detail.referral_info && (
                      <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <p className="text-xs text-purple-400 font-medium mb-1">Referral Information</p>
                        <p className="text-sm text-purple-300">{detail.referral_info}</p>
                      </div>
                    )}

                    {/* Actions taken timeline */}
                    <div>
                      <p className="text-xs text-navy-400 mb-2">Actions Taken</p>
                      {detail.actions_taken && detail.actions_taken.length > 0 ? (
                        <div className="space-y-2 mb-3">
                          {detail.actions_taken.map((action, i) => (
                            <div key={i} className="flex items-start gap-3 pl-3 border-l-2 border-navy-700">
                              <div className="flex-1">
                                <p className="text-sm text-navy-200">{action.text}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {action.date && (
                                    <span className="text-xs text-navy-500">
                                      {new Date(action.date).toLocaleDateString('en-GB')}
                                    </span>
                                  )}
                                  {action.by && (
                                    <span className="text-xs text-navy-500">{action.by}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-navy-500 mb-3">No actions recorded yet.</p>
                      )}

                      {/* Add action form */}
                      {canManage && detail.status !== 'closed' && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={actionText}
                            onChange={(e) => setActionText(e.target.value)}
                            className="flex-1 bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                            placeholder="Record an action taken..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleAddAction(incident.id)
                              }
                            }}
                          />
                          <button
                            onClick={() => handleAddAction(incident.id)}
                            disabled={saving || !actionText.trim()}
                            className="px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                          >
                            Add
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Status update */}
                    {canManage && (
                      <div className="flex items-center gap-3 pt-2 border-t border-navy-800">
                        <span className="text-xs text-navy-400">Update status:</span>
                        <div className="flex gap-2 flex-wrap">
                          {['open', 'investigating', 'referred', 'resolved', 'closed'].map(status => (
                            <button
                              key={status}
                              onClick={() => handleStatusUpdate(incident.id, status)}
                              disabled={updatingStatus === incident.id || incident.status === status}
                              className={`text-xs px-3 py-1.5 rounded-lg transition-colors capitalize ${
                                incident.status === status
                                  ? 'bg-navy-700 text-white cursor-default'
                                  : 'bg-navy-800 text-navy-400 hover:text-white hover:bg-navy-700 disabled:opacity-50'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
