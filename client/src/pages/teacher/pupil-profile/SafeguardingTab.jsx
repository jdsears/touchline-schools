import { useState, useEffect } from 'react'
import { pupilProfileService } from '../../../services/api'
import { Shield, Loader2, AlertTriangle, CheckCircle2, Eye } from 'lucide-react'

const FLAG_META = {
  monitoring: { colour: 'bg-amber-500/20 text-amber-400', label: 'Monitoring' },
  concern:    { colour: 'bg-orange-500/20 text-orange-400', label: 'Concern' },
  incident:   { colour: 'bg-red-500/20 text-red-400', label: 'Incident' },
  resolved:   { colour: 'bg-border-default text-secondary', label: 'Resolved' },
}

function formatDateTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function SafeguardingTab({ pupilId }) {
  const [notes, setNotes] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    pupilProfileService.getSafeguarding(pupilId)
      .then(r => setNotes(r.data))
      .catch(err => {
        if (err.response?.status === 403) setError('forbidden')
        else setError('load_failed')
      })
      .finally(() => setLoading(false))
  }, [pupilId])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-secondary" /></div>

  if (error === 'forbidden') {
    return (
      <div className="bg-card rounded-xl border border-border-default p-8 text-center">
        <Shield className="w-6 h-6 text-tertiary mx-auto mb-2" />
        <p className="text-sm text-secondary">Safeguarding records require DSL or Head of Department access.</p>
      </div>
    )
  }

  const open = (notes || []).filter(n => !n.resolved_at)
  const resolved = (notes || []).filter(n => n.resolved_at)

  return (
    <div className="space-y-4">
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-2">
        <Eye className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-300">
          Every view of this tab is recorded in the school audit log. Share the contents with authorised colleagues only.
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border-default p-5">
        <h2 className="text-sm font-semibold text-primary flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-red-400" />Open flags ({open.length})
        </h2>
        {open.length === 0 ? (
          <p className="text-sm text-tertiary text-center py-4">No open safeguarding flags.</p>
        ) : (
          <div className="space-y-3">{open.map(n => <FlagCard key={n.id} n={n} />)}</div>
        )}
      </div>

      {resolved.length > 0 && (
        <div className="bg-card rounded-xl border border-border-default p-5">
          <h2 className="text-sm font-semibold text-secondary flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-pitch-400" />Resolved ({resolved.length})
          </h2>
          <div className="space-y-3">{resolved.map(n => <FlagCard key={n.id} n={n} />)}</div>
        </div>
      )}
    </div>
  )
}

function FlagCard({ n }) {
  const meta = FLAG_META[n.flag_type] || FLAG_META.monitoring
  return (
    <div className="p-3 rounded-lg bg-subtle">
      <div className="flex items-center justify-between mb-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${meta.colour}`}>{meta.label}</span>
        <span className="text-xs text-tertiary">{formatDateTime(n.added_at)}</span>
      </div>
      {n.note && <p className="text-sm text-primary leading-relaxed">{n.note}</p>}
      <div className="text-xs text-tertiary mt-2 flex items-center gap-2 flex-wrap">
        {n.added_by_name && <span>Added by {n.added_by_name}</span>}
        {n.resolved_at && <span>· Resolved {formatDateTime(n.resolved_at)}</span>}
      </div>
    </div>
  )
}
