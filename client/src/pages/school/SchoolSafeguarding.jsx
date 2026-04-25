import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom'
import { clubSafeguardingService } from '../../services/api'
import {
  ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, Clock,
  UserCheck, Plus, RefreshCw, FileWarning, Check, X, Minus,
  ChevronRight, Users, BookOpen, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

const SEVERITY_STYLES = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

const SEVERITY_ICONS = {
  critical: ShieldX,
  warning: AlertTriangle,
  info: AlertCircle,
}

const DBS_STATUS_DISPLAY = {
  valid: { icon: Check, color: 'text-pitch-400', bg: 'bg-pitch-600/20' },
  expiring: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  expired: { icon: X, color: 'text-red-400', bg: 'bg-red-500/20' },
  pending: { icon: Minus, color: 'text-secondary', bg: 'bg-border-default' },
  none: { icon: Minus, color: 'text-tertiary', bg: 'bg-subtle' },
}

export default function ClubSafeguarding() {
  const { school, myRole } = useOutletContext()
  const navigate = useNavigate()
  const location = useLocation()
  const [overview, setOverview] = useState(null)
  const [records, setRecords] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const canManage = ['owner', 'admin'].includes(myRole)
  const basePath = location.pathname.replace(/\/safeguarding.*/, '/safeguarding')

  useEffect(() => {
    if (school?.id) loadData()
  }, [school?.id])

  async function loadData() {
    try {
      const [overviewRes, recordsRes, alertsRes] = await Promise.all([
        clubSafeguardingService.getOverview(school.id),
        clubSafeguardingService.getComplianceRecords(school.id),
        clubSafeguardingService.getAlerts(school.id),
      ])
      setOverview(overviewRes.data)
      setRecords(recordsRes.data)
      setAlerts(alertsRes.data)
    } catch (err) {
      toast.error('Failed to load safeguarding data')
    } finally {
      setLoading(false)
    }
  }

  async function handleScan() {
    setScanning(true)
    try {
      const res = await clubSafeguardingService.generateAlerts(school.id)
      setAlerts(res.data.alerts || res.data)
      toast.success('Compliance scan complete')
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to run scan')
    } finally {
      setScanning(false)
    }
  }

  function getDbsDisplay(record) {
    if (!record.dbs_number) return DBS_STATUS_DISPLAY.none
    if (!record.dbs_expiry) return DBS_STATUS_DISPLAY.pending
    const now = new Date()
    const expiry = new Date(record.dbs_expiry)
    const daysUntil = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
    if (daysUntil < 0) return { ...DBS_STATUS_DISPLAY.expired, days: daysUntil }
    if (daysUntil <= 30) return { ...DBS_STATUS_DISPLAY.expiring, days: daysUntil }
    return { ...DBS_STATUS_DISPLAY.valid, days: daysUntil }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'people', label: 'People' },
    { id: 'roles', label: 'Roles' },
    ...(canManage ? [{ id: 'incidents', label: 'Incidents' }] : []),
  ]

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Safeguarding</h1>
          <p className="text-secondary text-sm mt-1">DBS compliance, welfare roles and incident management</p>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex gap-1 bg-card border border-border-default rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'overview') {
                setActiveTab('overview')
              } else if (tab.id === 'people') {
                navigate(basePath + '/people')
              } else if (tab.id === 'roles') {
                navigate(basePath + '/roles')
              } else if (tab.id === 'incidents') {
                navigate(basePath + '/incidents')
              }
            }}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-pitch-600/20 text-pitch-400'
                : 'text-secondary hover:text-primary hover:bg-subtle'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview stats cards */}
      {overview && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border-default rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-pitch-600/10 text-pitch-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{overview.dbs_valid || 0}</p>
                <p className="text-xs text-secondary">DBS Valid</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border-default rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                (overview.dbs_expiring || 0) > 0 ? 'bg-amber-600/10 text-amber-400' : 'bg-subtle text-secondary'
              }`}>
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{overview.dbs_expiring || 0}</p>
                <p className="text-xs text-secondary">Expiring (&lt;30 days)</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border-default rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                (overview.dbs_expired || 0) > 0 ? 'bg-red-600/10 text-red-400' : 'bg-subtle text-secondary'
              }`}>
                <ShieldX className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{overview.dbs_expired || 0}</p>
                <p className="text-xs text-secondary">Expired</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border-default rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                overview.welfare_officer ? 'bg-pitch-600/10 text-pitch-400' : 'bg-red-600/10 text-red-400'
              }`}>
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {overview.welfare_officer ? 'Assigned' : 'None'}
                </p>
                <p className="text-xs text-secondary">Welfare Officer</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-primary">Active Alerts</h2>
          {alerts.map((alert, i) => {
            const severity = alert.severity || 'info'
            const SevIcon = SEVERITY_ICONS[severity] || AlertCircle
            return (
              <div
                key={alert.id || i}
                className={`flex items-start gap-3 p-4 rounded-xl border ${SEVERITY_STYLES[severity]}`}
              >
                <SevIcon className="w-5 h-5 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{alert.title || alert.message}</p>
                  {alert.description && (
                    <p className="text-xs mt-1 opacity-80">{alert.description}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${SEVERITY_STYLES[severity]}`}>
                  {severity}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick actions */}
      {canManage && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => navigate(basePath + '/people')}
            className="flex items-center gap-3 p-4 bg-card border border-border-default rounded-xl hover:bg-subtle/70 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-pitch-600/10 text-pitch-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">Add Record</p>
              <p className="text-xs text-secondary">New compliance record</p>
            </div>
          </button>
          <button
            onClick={() => navigate(basePath + '/roles')}
            className="flex items-center gap-3 p-4 bg-card border border-border-default rounded-xl hover:bg-subtle/70 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600/10 text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">Assign Welfare Officer</p>
              <p className="text-xs text-secondary">Manage safeguarding roles</p>
            </div>
          </button>
          <button
            onClick={() => navigate(basePath + '/incidents')}
            className="flex items-center gap-3 p-4 bg-card border border-border-default rounded-xl hover:bg-subtle/70 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-600/10 text-amber-400">
              <FileWarning className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">Report Incident</p>
              <p className="text-xs text-secondary">Log a safeguarding concern</p>
            </div>
          </button>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-3 p-4 bg-card border border-border-default rounded-xl hover:bg-subtle/70 transition-colors text-left disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-600/10 text-purple-400">
              <RefreshCw className={`w-5 h-5 ${scanning ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">Run Compliance Scan</p>
              <p className="text-xs text-secondary">Check all records</p>
            </div>
          </button>
        </div>
      )}

      {/* People table */}
      <div className="bg-card border border-border-default rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-default flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-primary">People</h3>
            <p className="text-xs text-secondary mt-0.5">{records.length} record{records.length !== 1 ? 's' : ''}</p>
          </div>
          {canManage && (
            <button
              onClick={() => navigate(basePath + '/people')}
              className="flex items-center gap-1 text-sm text-pitch-400 hover:text-pitch-300 transition-colors"
            >
              Manage <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        {records.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-tertiary mx-auto mb-3" />
            <h3 className="text-lg font-medium text-primary mb-1">No compliance records</h3>
            <p className="text-secondary text-sm">Add volunteers and coaches to track their DBS and training status.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-left px-4 py-3 text-xs font-medium text-secondary uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-secondary uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-secondary uppercase">DBS Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-secondary uppercase">First Aid</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-secondary uppercase">Safeguarding</th>
                  {canManage && (
                    <th className="text-right px-4 py-3 text-xs font-medium text-secondary uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const dbsDisplay = getDbsDisplay(r)
                  const DbsIcon = dbsDisplay.icon
                  return (
                    <tr key={r.id} className="border-b border-border-subtle last:border-0">
                      <td className="px-4 py-3 text-sm text-primary font-medium">{r.member_name || r.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-subtle text-secondary capitalize">
                          {r.safeguarding_role || r.role || 'volunteer'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${dbsDisplay.bg} ${dbsDisplay.color}`}>
                            <DbsIcon className="w-3 h-3" />
                            {!r.dbs_number ? 'None' :
                             !r.dbs_expiry ? 'Pending' :
                             dbsDisplay.days < 0 ? 'Expired' :
                             dbsDisplay.days <= 30 ? `${dbsDisplay.days}d left` :
                             'Valid'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {r.first_aid_valid ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-pitch-600/20 text-pitch-400">
                            <Check className="w-3 h-3" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-subtle text-tertiary">
                            <Minus className="w-3 h-3" /> None
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.safeguarding_training_valid ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-pitch-600/20 text-pitch-400">
                            <Check className="w-3 h-3" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-subtle text-tertiary">
                            <Minus className="w-3 h-3" /> None
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => navigate(basePath + '/people')}
                            className="p-1.5 text-secondary hover:text-primary transition-colors"
                            title="View details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
