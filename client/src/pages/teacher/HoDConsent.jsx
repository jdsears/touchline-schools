import { useState, useEffect } from 'react'
import { consentService } from '../../services/api'
import { ShieldCheck, Users, AlertTriangle, Clock, CheckCircle, XCircle, Loader2, Plus, Sparkles, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function HoDConsent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await consentService.getOverview()
      setData(res.data)
    } catch { toast.error('Failed to load consent data') }
    finally { setLoading(false) }
  }

  async function seedDefaults() {
    setSeeding(true)
    try {
      const res = await consentService.seedDefaults()
      toast.success(res.data.message)
      load()
    } catch { toast.error('Failed to seed defaults') }
    finally { setSeeding(false) }
  }

  async function bulkReset() {
    setResetting(true)
    try {
      const res = await consentService.bulkReset()
      toast.success(res.data.message)
      setShowResetConfirm(false)
      load()
    } catch { toast.error('Failed to reset consents') }
    finally { setResetting(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-secondary" /></div>

  const { types, summary, totalPupils } = data || {}
  const totalGranted = summary?.reduce((s, t) => s + parseInt(t.granted || 0), 0) || 0
  const totalPending = summary?.reduce((s, t) => s + parseInt(t.pending || 0), 0) || 0
  const totalExpiring = summary?.reduce((s, t) => s + parseInt(t.expiring_soon || 0), 0) || 0
  const totalExpired = summary?.reduce((s, t) => s + parseInt(t.expired || 0), 0) || 0

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" /> Parental Consent
          </h1>
          <p className="text-sm text-secondary mt-0.5">{totalPupils} pupils across the school</p>
        </div>
        {(!types || types.length === 0) && (
          <button onClick={seedDefaults} disabled={seeding}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-primary rounded-lg text-sm">
            {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Set up default consent types
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Active Consents" value={totalGranted} icon={CheckCircle} color="text-green-400 bg-green-500/10" />
        <SummaryCard label="Pending" value={totalPending} icon={Clock} color="text-amber-400 bg-amber-500/10" />
        <SummaryCard label="Expiring (30 days)" value={totalExpiring} icon={AlertTriangle} color="text-orange-400 bg-orange-500/10" />
        <SummaryCard label="Expired" value={totalExpired} icon={XCircle} color="text-red-400 bg-red-500/10" />
      </div>

      {/* Per-type breakdown */}
      {summary && summary.length > 0 ? (
        <div className="bg-card border border-border-default rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default text-secondary text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Consent Type</th>
                <th className="px-4 py-3 text-center w-20">Granted</th>
                <th className="px-4 py-3 text-center w-20">Pending</th>
                <th className="px-4 py-3 text-center w-20">Refused</th>
                <th className="px-4 py-3 text-center w-24">Expiring</th>
                <th className="px-4 py-3 text-center w-20">Expired</th>
                <th className="px-4 py-3 text-right w-28">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {summary.map(row => {
                const granted = parseInt(row.granted || 0)
                const coverage = totalPupils > 0 ? Math.round((granted / totalPupils) * 100) : 0
                return (
                  <tr key={row.consent_type_id} className="border-b border-border-subtle hover:bg-subtle">
                    <td className="px-4 py-3 text-primary font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-center text-green-400">{row.granted || 0}</td>
                    <td className="px-4 py-3 text-center text-amber-400">{row.pending || 0}</td>
                    <td className="px-4 py-3 text-center text-red-400">{row.refused || 0}</td>
                    <td className="px-4 py-3 text-center">
                      {parseInt(row.expiring_soon || 0) > 0
                        ? <span className="text-orange-400">{row.expiring_soon}</span>
                        : <span className="text-tertiary">0</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {parseInt(row.expired || 0) > 0
                        ? <span className="text-red-400">{row.expired}</span>
                        : <span className="text-tertiary">0</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-border-default rounded-full overflow-hidden">
                          <div className="h-full bg-pitch-500 rounded-full" style={{ width: `${coverage}%` }} />
                        </div>
                        <span className={`text-xs ${coverage >= 80 ? 'text-green-400' : coverage >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                          {coverage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-card border border-border-default rounded-xl p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-navy-700 mx-auto mb-3" />
          <p className="text-secondary">No consent types configured yet.</p>
          <p className="text-sm text-tertiary mt-1">Click "Set up default consent types" to get started with standard UK school sport consents.</p>
        </div>
      )}

      {/* Academic year reset */}
      {types && types.length > 0 && (
        <div className="bg-card border border-border-default rounded-xl p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-primary">New Academic Year Reset</h3>
            <p className="text-xs text-secondary mt-0.5">Expire all annual consents and require fresh parent confirmation for the new year.</p>
          </div>
          <button onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-primary rounded-lg text-sm shrink-0">
            <RefreshCw className="w-3.5 h-3.5" /> Start of Year Reset
          </button>
        </div>
      )}

      {/* Reset confirmation modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowResetConfirm(false)}>
          <div className="bg-card border border-border-default rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-primary mb-2">Confirm Academic Year Reset</h3>
            <p className="text-sm text-secondary mb-4">
              This will expire all annual consents for {totalPupils} pupils. Parents will need to re-consent.
              Per-term consents are not affected.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 text-sm text-secondary hover:text-link">Cancel</button>
              <button onClick={bulkReset} disabled={resetting}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-primary rounded-lg text-sm">
                {resetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-card border border-border-default rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="text-xs text-secondary mt-0.5">{label}</p>
    </div>
  )
}
