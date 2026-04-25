import { useState, useEffect } from 'react'
import { consentService } from '../../services/api'
import { ShieldCheck, Users, AlertTriangle, Clock, CheckCircle, XCircle, Loader2, Plus, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

export default function HoDConsent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-navy-400" /></div>

  const { types, summary, totalPupils } = data || {}
  const totalGranted = summary?.reduce((s, t) => s + parseInt(t.granted || 0), 0) || 0
  const totalPending = summary?.reduce((s, t) => s + parseInt(t.pending || 0), 0) || 0
  const totalExpiring = summary?.reduce((s, t) => s + parseInt(t.expiring_soon || 0), 0) || 0
  const totalExpired = summary?.reduce((s, t) => s + parseInt(t.expired || 0), 0) || 0

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" /> Parental Consent
          </h1>
          <p className="text-sm text-navy-400 mt-0.5">{totalPupils} pupils across the school</p>
        </div>
        {(!types || types.length === 0) && (
          <button onClick={seedDefaults} disabled={seeding}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-white rounded-lg text-sm">
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
        <div className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-800 text-navy-400 text-xs uppercase tracking-wider">
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
                  <tr key={row.consent_type_id} className="border-b border-navy-800/50 hover:bg-navy-800/30">
                    <td className="px-4 py-3 text-white font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-center text-green-400">{row.granted || 0}</td>
                    <td className="px-4 py-3 text-center text-amber-400">{row.pending || 0}</td>
                    <td className="px-4 py-3 text-center text-red-400">{row.refused || 0}</td>
                    <td className="px-4 py-3 text-center">
                      {parseInt(row.expiring_soon || 0) > 0
                        ? <span className="text-orange-400">{row.expiring_soon}</span>
                        : <span className="text-navy-500">0</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {parseInt(row.expired || 0) > 0
                        ? <span className="text-red-400">{row.expired}</span>
                        : <span className="text-navy-500">0</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-navy-700 rounded-full overflow-hidden">
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
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-navy-700 mx-auto mb-3" />
          <p className="text-navy-400">No consent types configured yet.</p>
          <p className="text-sm text-navy-500 mt-1">Click "Set up default consent types" to get started with standard UK school sport consents.</p>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-navy-400 mt-0.5">{label}</p>
    </div>
  )
}
