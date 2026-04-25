import { useState, useEffect } from 'react'
import { concussionService } from '../services/api'
import { AlertTriangle, Shield, CheckCircle, Clock, Loader2, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

const SYMPTOMS = [
  'Headache', 'Dizziness', 'Nausea', 'Confusion', 'Memory loss',
  'Balance problems', 'Blurred vision', 'Sensitivity to light',
  'Sensitivity to noise', 'Feeling slowed down', 'Difficulty concentrating',
  'Drowsiness', 'Emotional changes', 'Loss of consciousness',
]

const SEVERITY_OPTS = [
  { value: 'mild', label: 'Mild', cls: 'bg-amber-500/20 text-amber-400' },
  { value: 'moderate', label: 'Moderate', cls: 'bg-orange-500/20 text-orange-400' },
  { value: 'severe', label: 'Severe', cls: 'bg-red-500/20 text-red-400' },
  { value: 'awaiting_assessment', label: 'Awaiting Assessment', cls: 'bg-navy-700 text-navy-300' },
]

const STATUS_LABELS = {
  excluded: { label: 'Excluded from contact sport', cls: 'bg-red-500/20 text-red-400' },
  graduated_return: { label: 'Graduated return in progress', cls: 'bg-amber-500/20 text-amber-400' },
  fully_cleared: { label: 'Fully cleared', cls: 'bg-green-500/20 text-green-400' },
}

export default function ConcussionPanel({ pupilId, matchId }) {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState({ severity: 'awaiting_assessment', symptoms: [], immediateAction: '', notes: '', doctorRequired: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [pupilId])

  async function load() {
    try {
      const res = await concussionService.getPupilIncidents(pupilId)
      setIncidents(res.data)
    } catch {} finally { setLoading(false) }
  }

  async function loadDetail(id) {
    if (expandedId === id) { setExpandedId(null); return }
    try {
      const res = await concussionService.getIncident(id)
      setDetail(res.data)
      setExpandedId(id)
    } catch { toast.error('Failed to load details') }
  }

  async function handleCreate() {
    setSaving(true)
    try {
      await concussionService.create({
        pupilId, matchId: matchId || null,
        severity: form.severity, symptomsObserved: form.symptoms,
        immediateActionTaken: form.immediateAction,
        doctorAssessmentRequired: form.doctorRequired, notes: form.notes,
      })
      toast.success('Concussion incident logged. Pupil excluded from contact sport.')
      setShowForm(false)
      setForm({ severity: 'awaiting_assessment', symptoms: [], immediateAction: '', notes: '', doctorRequired: true })
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to log incident') }
    finally { setSaving(false) }
  }

  async function completeStage(incidentId, stage, notes = '') {
    try {
      await concussionService.completeStage(incidentId, stage, notes)
      toast.success(stage === 6 ? 'Pupil fully cleared for return to play' : `Stage ${stage} completed`)
      loadDetail(incidentId)
      load()
    } catch { toast.error('Failed to update stage') }
  }

  if (loading) return <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-navy-400" /></div>

  const activeIncident = incidents.find(i => i.return_to_play_status !== 'fully_cleared')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-400" /> Concussion History
        </h3>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs">
            <Plus className="w-3 h-3" /> Log Incident
          </button>
        )}
      </div>

      {activeIncident && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">Active concussion protocol - do not select for contact sport</span>
        </div>
      )}

      {/* Quick log form */}
      {showForm && (
        <div className="bg-navy-800/50 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {SEVERITY_OPTS.map(s => (
              <button key={s.value} onClick={() => setForm(f => ({ ...f, severity: s.value }))}
                className={`px-2.5 py-1 rounded text-xs ${form.severity === s.value ? s.cls + ' ring-1 ring-current' : 'bg-navy-700 text-navy-400'}`}>
                {s.label}
              </button>
            ))}
          </div>
          <div>
            <p className="text-[11px] text-navy-500 mb-1">Symptoms (select all observed)</p>
            <div className="flex flex-wrap gap-1">
              {SYMPTOMS.map(s => (
                <button key={s} onClick={() => setForm(f => ({ ...f, symptoms: f.symptoms.includes(s) ? f.symptoms.filter(x => x !== s) : [...f.symptoms, s] }))}
                  className={`px-2 py-0.5 rounded text-[11px] ${form.symptoms.includes(s) ? 'bg-red-500/20 text-red-400' : 'bg-navy-700 text-navy-400'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <input value={form.immediateAction} onChange={e => setForm(f => ({ ...f, immediateAction: e.target.value }))}
            placeholder="Immediate action taken" className="w-full bg-navy-800 border border-navy-700 rounded px-2.5 py-1.5 text-sm text-white" />
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Additional notes" rows={2} className="w-full bg-navy-800 border border-navy-700 rounded px-2.5 py-1.5 text-sm text-white resize-none" />
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 text-xs text-navy-300">
              <input type="checkbox" checked={form.doctorRequired} onChange={e => setForm(f => ({ ...f, doctorRequired: e.target.checked }))}
                className="rounded border-navy-700 bg-navy-800 text-red-500" />
              Doctor assessment required
            </label>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-navy-400">Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded text-xs">
                {saving ? 'Logging...' : 'Log Incident'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incident list */}
      {incidents.map(inc => {
        const st = STATUS_LABELS[inc.return_to_play_status] || STATUS_LABELS.excluded
        const expanded = expandedId === inc.id
        return (
          <div key={inc.id} className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
            <button onClick={() => loadDetail(inc.id)} className="w-full p-3 flex items-center gap-3 text-left">
              <div className={`px-2 py-0.5 rounded text-[10px] ${st.cls}`}>{st.label}</div>
              <span className="text-sm text-navy-300">{new Date(inc.occurred_at).toLocaleDateString('en-GB')}</span>
              {inc.match_opponent && <span className="text-xs text-navy-500">vs {inc.match_opponent}</span>}
              <div className="ml-auto">{expanded ? <ChevronUp className="w-4 h-4 text-navy-500" /> : <ChevronDown className="w-4 h-4 text-navy-500" />}</div>
            </button>
            {expanded && detail && (
              <div className="px-3 pb-3 space-y-2 border-t border-navy-800">
                {detail.incident.symptoms_observed?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(Array.isArray(detail.incident.symptoms_observed) ? detail.incident.symptoms_observed : JSON.parse(detail.incident.symptoms_observed || '[]')).map(s => (
                      <span key={s} className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                )}
                {detail.incident.notes && <p className="text-xs text-navy-400">{detail.incident.notes}</p>}
                <div className="space-y-1 mt-2">
                  <p className="text-[11px] text-navy-500 font-medium uppercase tracking-wider">Return-to-Play Protocol</p>
                  {detail.followups.map(f => {
                    const stageDef = detail.stages.find(s => s.stage === f.stage)
                    return (
                      <div key={f.stage} className="flex items-center gap-2 text-xs py-1">
                        {f.completed_at
                          ? <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                          : <Clock className="w-3.5 h-3.5 text-navy-500 shrink-0" />}
                        <span className={f.completed_at ? 'text-navy-300' : 'text-navy-500'}>
                          Stage {f.stage}: {stageDef?.name}
                        </span>
                        {!f.completed_at && f.stage <= (detail.followups.filter(x => x.completed_at).length + 1) && (
                          <button onClick={() => completeStage(inc.id, f.stage)}
                            className="ml-auto px-2 py-0.5 bg-pitch-600 hover:bg-pitch-500 text-white rounded text-[10px]">
                            Complete
                          </button>
                        )}
                        {f.completed_at && <span className="ml-auto text-[10px] text-navy-500">{new Date(f.completed_at).toLocaleDateString('en-GB')}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {incidents.length === 0 && !showForm && (
        <p className="text-xs text-navy-500 text-center py-2">No concussion incidents recorded.</p>
      )}
    </div>
  )
}
