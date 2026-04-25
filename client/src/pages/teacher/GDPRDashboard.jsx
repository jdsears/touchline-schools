import { useState, useEffect } from 'react'
import { gdprService } from '../../services/api'
import {
  Shield, Download, Trash2, FileText, CheckCircle, Clock,
  AlertTriangle, Search, ChevronDown, ChevronUp, Eye, User,
  RefreshCw, X,
} from 'lucide-react'
import toast from 'react-hot-toast'

const CONSENT_LABELS = {
  data_processing: 'Data Processing',
  photo_video: 'Photo & Video',
  medical: 'Medical Information',
  ai_analysis: 'AI Analysis',
  voice_recording: 'Voice Recording',
  third_party_sharing: 'Third-Party Sharing',
}

const STATUS_STYLES = {
  pending: 'bg-amber-500/10 text-amber-400',
  processing: 'bg-blue-500/10 text-blue-400',
  ready: 'bg-pitch-500/10 text-pitch-400',
  downloaded: 'bg-border-default text-secondary',
  completed: 'bg-pitch-500/10 text-pitch-400',
  failed: 'bg-alert-500/10 text-alert-400',
}

export default function GDPRDashboard() {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadOverview()
  }, [])

  async function loadOverview() {
    try {
      const res = await gdprService.getOverview()
      setOverview(res.data)
    } catch (err) {
      console.error('Failed to load GDPR overview:', err)
      toast.error('Failed to load GDPR data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
          <Shield className="w-7 h-7 text-pitch-400" />
          Data & Privacy (GDPR)
        </h1>
        <p className="text-secondary mt-1">
          Manage pupil data rights, consent records, and data subject requests under UK GDPR
        </p>
      </div>

      {/* Legal notice */}
      <div className="bg-card rounded-xl border border-amber-400/20 p-5 mb-6">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-secondary space-y-1">
            <p className="font-medium text-amber-400">UK GDPR Obligations</p>
            <p>
              Under UK GDPR, data subjects have the right to access their personal data (Article 15),
              rectify inaccurate data (Article 16), and request erasure (Article 17). Schools as data
              controllers must respond to Subject Access Requests within <strong className="text-primary">one calendar month</strong>.
            </p>
            <p>
              All export downloads and deletion actions are permanently logged for your audit trail.
              Data exports expire after 7 days and must be downloaded securely.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-card rounded-xl p-1 border border-border-default">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'pupils', label: 'Pupil Data' },
          { id: 'requests', label: 'Requests' },
          { id: 'deletions', label: 'Deletion Log' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-pitch-600 text-primary'
                : 'text-secondary hover:text-link hover:bg-subtle'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab overview={overview} onRefresh={loadOverview} />}
      {activeTab === 'pupils' && <PupilsTab />}
      {activeTab === 'requests' && <RequestsTab />}
      {activeTab === 'deletions' && <DeletionLogTab />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------
function OverviewTab({ overview, onRefresh }) {
  if (!overview) return null

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={User}
          label="Total Pupils"
          value={overview.total_pupils}
          color="text-pitch-400"
        />
        <StatCard
          icon={Clock}
          label="Pending Requests"
          value={overview.pending_requests?.reduce((s, r) => s + parseInt(r.count), 0) || 0}
          color="text-amber-400"
          warn={overview.pending_requests?.length > 0}
        />
        <StatCard
          icon={Trash2}
          label="Deletions This Year"
          value={overview.recent_deletions?.length || 0}
          color="text-alert-400"
        />
      </div>

      {/* Recent requests */}
      {overview.recent_requests?.length > 0 && (
        <div className="bg-card rounded-xl border border-border-default p-5">
          <h3 className="text-base font-semibold text-primary mb-4">Recent Requests</h3>
          <div className="space-y-2">
            {overview.recent_requests.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-border-default last:border-0">
                <div>
                  <span className="text-sm text-primary capitalize">{r.request_type}</span>
                  <span className="text-xs text-tertiary ml-2">
                    {new Date(r.created_at).toLocaleDateString('en-GB')}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[r.status] || ''}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consent summary */}
      {overview.consent_summary?.length > 0 && (
        <div className="bg-card rounded-xl border border-border-default p-5">
          <h3 className="text-base font-semibold text-primary mb-4">Consent Summary</h3>
          <div className="space-y-3">
            {overview.consent_summary.map(c => {
              const total = parseInt(c.granted) + parseInt(c.not_granted)
              const pct = total > 0 ? Math.round((parseInt(c.granted) / total) * 100) : 0
              return (
                <div key={c.consent_type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-secondary">{CONSENT_LABELS[c.consent_type] || c.consent_type}</span>
                    <span className="text-secondary">{c.granted} granted ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-subtle rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pitch-600 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, warn }) {
  return (
    <div className={`bg-card rounded-xl border p-5 ${warn ? 'border-amber-400/30' : 'border-border-default'}`}>
      <div className="flex items-center gap-3">
        <Icon className={`w-6 h-6 ${color}`} />
        <div>
          <div className="text-2xl font-bold text-primary">{value}</div>
          <div className="text-xs text-secondary">{label}</div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pupils Tab - search, export, consent, delete
// ---------------------------------------------------------------------------
function PupilsTab() {
  const [pupils, setPupils] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedPupil, setExpandedPupil] = useState(null)
  const [exportLoading, setExportLoading] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { pupil }
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => load(), 300)
    return () => clearTimeout(t)
  }, [search])

  async function load() {
    setLoading(true)
    try {
      const res = await gdprService.getPupils({ search, limit: 100 })
      setPupils(res.data.pupils || [])
    } catch (err) {
      toast.error('Failed to load pupils')
    } finally {
      setLoading(false)
    }
  }

  async function handleExport(pupil) {
    setExportLoading(pupil.id)
    try {
      const res = await gdprService.requestExport(pupil.id, 'Subject Access Request')
      const token = res.data.download_token
      // Download immediately
      const blob = await gdprService.downloadExport(token)
      const url = URL.createObjectURL(blob.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `gdpr-export-${pupil.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Data export for ${pupil.name} downloaded`)
    } catch (err) {
      toast.error('Failed to export data')
    } finally {
      setExportLoading(null)
    }
  }

  async function handleDelete() {
    if (!deleteConfirm || !deleteReason.trim()) return
    setDeleteLoading(true)
    try {
      await gdprService.requestDeletion(deleteConfirm.pupil.id, deleteReason)
      toast.success(`All data for ${deleteConfirm.pupil.name} has been permanently deleted`)
      setDeleteConfirm(null)
      setDeleteReason('')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete data')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search pupils..."
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border-default rounded-lg text-primary text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="spinner w-6 h-6" /></div>
      ) : (
        <div className="space-y-2">
          {pupils.map(pupil => (
            <PupilGDPRRow
              key={pupil.id}
              pupil={pupil}
              expanded={expandedPupil === pupil.id}
              onToggle={() => setExpandedPupil(expandedPupil === pupil.id ? null : pupil.id)}
              onExport={() => handleExport(pupil)}
              exportLoading={exportLoading === pupil.id}
              onDelete={() => { setDeleteConfirm({ pupil }); setDeleteReason('') }}
            />
          ))}
          {pupils.length === 0 && (
            <div className="text-center py-12 text-tertiary">No pupils found</div>
          )}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-alert-600/40 p-6 w-full max-w-md">
            <div className="flex items-start gap-3 mb-4">
              <Trash2 className="w-6 h-6 text-alert-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-primary">Permanently Delete All Data</h3>
                <p className="text-sm text-secondary mt-1">
                  This will irreversibly delete all personal data held for{' '}
                  <strong className="text-primary">{deleteConfirm.pupil.name}</strong> across all tables,
                  including assessments, observations, match records, medical information, and any stored files.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-secondary mb-1">
                Reason for deletion <span className="text-alert-400">*</span>
              </label>
              <textarea
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                placeholder="e.g. Pupil has left the school and parent has submitted Right to Erasure request"
                rows={3}
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-primary text-sm placeholder:text-tertiary focus:outline-none focus:border-alert-500 resize-none"
              />
              <p className="text-xs text-tertiary mt-1">Required for audit log purposes.</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-border-strong text-secondary rounded-lg text-sm hover:bg-subtle transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!deleteReason.trim() || deleteLoading}
                className="flex-1 py-2.5 bg-alert-600 hover:bg-alert-700 text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteLoading ? <div className="spinner w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                Delete All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PupilGDPRRow({ pupil, expanded, onToggle, onExport, exportLoading, onDelete }) {
  const [consent, setConsent] = useState(null)
  const [consentLoading, setConsentLoading] = useState(false)

  async function loadConsent() {
    if (consent) return
    setConsentLoading(true)
    try {
      const res = await gdprService.getConsent(pupil.id)
      setConsent(res.data)
    } catch {
      setConsent([])
    } finally {
      setConsentLoading(false)
    }
  }

  function handleToggle() {
    if (!expanded) loadConsent()
    onToggle()
  }

  const consentStatus = pupil.consent_status || []
  const grantedCount = consentStatus.filter(c => c.granted && !c.withdrawn_at).length

  return (
    <div className="bg-card rounded-xl border border-border-default overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-subtle transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-border-default flex items-center justify-center">
            <span className="text-xs font-medium text-primary">{pupil.name?.charAt(0)}</span>
          </div>
          <div>
            <div className="text-sm font-medium text-primary">{pupil.name}</div>
            <div className="text-xs text-tertiary">Year {pupil.year_group || '?'}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-tertiary">
            {grantedCount}/{Object.keys(CONSENT_LABELS).length} consents
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-tertiary" /> : <ChevronDown className="w-4 h-4 text-tertiary" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border-default pt-4">
          {/* Actions */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={onExport}
              disabled={exportLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-subtle hover:bg-border-default text-secondary rounded-lg text-xs transition-colors disabled:opacity-50"
            >
              {exportLoading
                ? <div className="spinner w-3.5 h-3.5" />
                : <Download className="w-3.5 h-3.5" />
              }
              Export Data (SAR)
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-2 bg-alert-600/10 hover:bg-alert-600/20 text-alert-400 rounded-lg text-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete All Data
            </button>
          </div>

          {/* Consent records */}
          <div>
            <p className="text-xs text-tertiary font-medium uppercase tracking-wider mb-2">Consent Records</p>
            {consentLoading ? (
              <div className="spinner w-4 h-4" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(CONSENT_LABELS).map(([type, label]) => {
                  const record = consent?.find(c => c.consent_type === type)
                  const granted = record && record.granted && !record.withdrawn_at
                  return (
                    <div
                      key={type}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                        granted
                          ? 'bg-pitch-600/10 text-pitch-400'
                          : 'bg-subtle text-tertiary'
                      }`}
                    >
                      <CheckCircle className={`w-3 h-3 ${granted ? 'text-pitch-400' : 'text-tertiary'}`} />
                      {label}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Requests Tab - list of all export/deletion requests
// ---------------------------------------------------------------------------
function RequestsTab() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    gdprService.getRequests()
      .then(res => setRequests(res.data))
      .catch(() => toast.error('Failed to load requests'))
      .finally(() => setLoading(false))
  }, [])

  async function handleDownload(request) {
    try {
      const blob = await gdprService.downloadExport(request.download_token)
      const url = URL.createObjectURL(blob.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `gdpr-export-${request.pupil_name?.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'downloaded' } : r))
    } catch {
      toast.error('Failed to download - export may have expired')
    }
  }

  if (loading) return <div className="flex justify-center py-8"><div className="spinner w-6 h-6" /></div>

  return (
    <div>
      {requests.length === 0 ? (
        <div className="bg-card rounded-xl border border-border-default p-12 text-center">
          <FileText className="w-8 h-8 text-tertiary mx-auto mb-3" />
          <p className="text-secondary">No data requests yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <div key={r.id} className="bg-card rounded-xl border border-border-default p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {r.request_type === 'export'
                      ? <Download className="w-4 h-4 text-pitch-400" />
                      : <Trash2 className="w-4 h-4 text-alert-400" />
                    }
                    <span className="text-sm font-medium text-primary capitalize">{r.request_type}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_STYLES[r.status] || ''}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-sm text-secondary">{r.pupil_name}</p>
                  <p className="text-xs text-tertiary">
                    Requested by {r.requested_by_name} · {new Date(r.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                  {r.reason && <p className="text-xs text-tertiary mt-1">Reason: {r.reason}</p>}
                </div>

                {r.request_type === 'export' && r.status === 'ready' && (
                  <button
                    onClick={() => handleDownload(r)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-pitch-600 hover:bg-pitch-700 text-primary rounded-lg text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                )}
                {r.request_type === 'export' && r.status === 'downloaded' && (
                  <button
                    onClick={() => handleDownload(r)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-border-default hover:bg-navy-600 text-secondary rounded-lg text-xs"
                    title="Download again"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Re-download
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Deletion Log Tab
// ---------------------------------------------------------------------------
function DeletionLogTab() {
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    gdprService.getDeletionLog()
      .then(res => setLog(res.data))
      .catch(() => toast.error('Failed to load deletion log'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-8"><div className="spinner w-6 h-6" /></div>

  return (
    <div>
      <p className="text-xs text-tertiary mb-4">
        Permanent audit log of all data erasure operations. This record is retained indefinitely
        as evidence of GDPR compliance even though the personal data itself has been deleted.
      </p>

      {log.length === 0 ? (
        <div className="bg-card rounded-xl border border-border-default p-12 text-center">
          <CheckCircle className="w-8 h-8 text-tertiary mx-auto mb-3" />
          <p className="text-secondary">No deletions recorded</p>
        </div>
      ) : (
        <div className="space-y-3">
          {log.map(entry => (
            <div key={entry.id} className="bg-card rounded-xl border border-border-default p-4">
              <div className="flex items-start gap-3">
                <Trash2 className="w-4 h-4 text-alert-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">{entry.pupil_reference}</p>
                  <p className="text-xs text-secondary mt-0.5">
                    Deleted by {entry.deleted_by_name} · {new Date(entry.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                  {entry.reason && (
                    <p className="text-xs text-tertiary mt-1">Reason: {entry.reason}</p>
                  )}
                  {entry.tables_purged?.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-tertiary cursor-pointer hover:text-secondary">
                        {entry.tables_purged.length} table(s) purged
                      </summary>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {entry.tables_purged.map((t, i) => (
                          <span key={i} className="px-2 py-0.5 bg-subtle rounded text-xs text-secondary">{t}</span>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
