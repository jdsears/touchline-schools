import { useState, useEffect } from 'react'
import { pupilProfileService } from '../../../services/api'
import {
  Target, Award, Loader2, CheckCircle2, RotateCcw, XCircle, Sparkles, Plus, X,
  ChevronDown, ChevronUp, Quote, Trash2, StickyNote,
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_META = {
  in_progress: { label: 'In progress', colour: 'bg-sky-500/20 text-sky-400', icon: Target },
  achieved:    { label: 'Achieved',    colour: 'bg-brand-primary-tint text-brand-primary', icon: CheckCircle2 },
  revised:     { label: 'Revised',     colour: 'bg-brand-accent-tint text-brand-accent', icon: RotateCcw },
  abandoned:   { label: 'Abandoned',   colour: 'bg-border-default text-secondary', icon: XCircle },
}

const SPORT_OPTIONS = ['general', 'football', 'rugby', 'hockey', 'netball', 'cricket', 'athletics', 'gymnastics', 'dance', 'tennis', 'badminton', 'basketball', 'rounders', 'swimming', 'gcse_pe']

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function weeksFromNow(weeks) {
  const d = new Date()
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

const EMPTY_FORM = { goal_description: '', success_criteria: '', sport_key: 'general', target_date: weeksFromNow(8) }

export default function DevelopmentTab({ pupilId, pupilName, canEdit = false, observationCount }) {
  const [goals, setGoals] = useState([])
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [suggesting, setSuggesting] = useState(false)
  const [suggestions, setSuggestions] = useState(null) // null = panel closed
  const [suggestionMeta, setSuggestionMeta] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      pupilProfileService.getIdpGoals(pupilId).then(r => setGoals(Array.isArray(r.data) ? r.data : [])).catch(() => setGoals([])),
      pupilProfileService.getAchievements(pupilId).then(r => setAchievements(r.data)).catch(() => setAchievements([])),
    ]).finally(() => setLoading(false))
  }, [pupilId])

  async function suggest() {
    setSuggesting(true)
    try {
      const res = await pupilProfileService.suggestIdpGoals(pupilId)
      const list = Array.isArray(res.data?.suggestions) ? res.data.suggestions : []
      setSuggestions(list.map((s, i) => ({ ...s, _key: `${Date.now()}-${i}` })))
      setSuggestionMeta({ observationCount: res.data?.observation_count || 0 })
      if (list.length === 0) toast('No new goals stood out from the observations.', { icon: 'ℹ️' })
    } catch (err) {
      const status = err.response?.status
      if (status === 503) toast.error('AI suggestions are not configured on this server.')
      else toast.error(err.response?.data?.error || 'Could not suggest goals')
    } finally {
      setSuggesting(false)
    }
  }

  async function createGoal(payload, onDone) {
    setSaving(true)
    try {
      const res = await pupilProfileService.createIdpGoal(pupilId, payload)
      setGoals(prev => [res.data, ...prev])
      onDone?.(res.data)
      toast.success('Goal added to the plan')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not save the goal')
    } finally {
      setSaving(false)
    }
  }

  async function updateGoal(goalId, patch, successMessage) {
    try {
      const res = await pupilProfileService.updateIdpGoal(pupilId, goalId, patch)
      setGoals(prev => prev.map(g => (g.id === goalId ? res.data : g)))
      if (successMessage) toast.success(successMessage)
      return true
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update the goal')
      return false
    }
  }

  async function removeGoal(goalId) {
    if (!window.confirm('Remove this goal from the plan? This cannot be undone.')) return
    try {
      await pupilProfileService.deleteIdpGoal(pupilId, goalId)
      setGoals(prev => prev.filter(g => g.id !== goalId))
      toast.success('Goal removed')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not remove the goal')
    }
  }

  function acceptSuggestion(s) {
    createGoal({
      goal_description: s.goal_description,
      success_criteria: s.success_criteria,
      rationale: s.rationale,
      sport_key: s.sport_key,
      target_date: s.target_date,
      source_observation_ids: s.evidence_ids,
      origin: 'ai_suggested',
    }, () => setSuggestions(prev => (prev || []).filter(x => x._key !== s._key)))
  }

  function submitManual(e) {
    e.preventDefault()
    if (!form.goal_description.trim()) return
    createGoal({ ...form, origin: 'teacher' }, () => { setForm({ ...EMPTY_FORM }); setShowAdd(false) })
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-secondary" /></div>
  }

  const active = goals.filter(g => g.status === 'in_progress')
  const historic = goals.filter(g => g.status !== 'in_progress')
  const firstName = (pupilName || '').split(' ')[0] || 'this pupil'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-card rounded-xl border border-border-default p-5">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
              <Target className="w-4 h-4 text-brand-primary" />
              IDP Goals ({goals.length})
            </h2>
            {canEdit && (
              <div className="flex items-center gap-2">
                <button onClick={suggest} disabled={suggesting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-brand-accent text-brand-primary hover:bg-brand-accent-tint transition-colors disabled:opacity-60">
                  {suggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-brand-accent" />}
                  {suggesting ? 'Reading observations…' : 'Suggest from observations'}
                </button>
                <button onClick={() => setShowAdd(v => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-primary text-on-dark hover:opacity-90 transition-opacity">
                  <Plus className="w-3.5 h-3.5" /> Add goal
                </button>
              </div>
            )}
          </div>

          {suggestions !== null && (
            <SuggestionsPanel
              suggestions={suggestions}
              meta={suggestionMeta}
              saving={saving}
              onAccept={acceptSuggestion}
              onDismiss={(key) => setSuggestions(prev => (prev || []).filter(x => x._key !== key))}
              onClose={() => setSuggestions(null)}
              onChange={(key, patch) => setSuggestions(prev => (prev || []).map(x => (x._key === key ? { ...x, ...patch } : x)))}
            />
          )}

          {showAdd && canEdit && (
            <form onSubmit={submitManual} className="mb-4 p-4 rounded-lg border border-border-default bg-subtle space-y-3">
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide">New goal</h3>
              <input
                value={form.goal_description}
                onChange={e => setForm(f => ({ ...f, goal_description: e.target.value }))}
                placeholder="What should the pupil be able to do? Start with a verb."
                maxLength={300}
                required
                className="w-full bg-card border border-border-strong rounded-lg px-3 py-2 text-sm text-primary"
              />
              <input
                value={form.success_criteria}
                onChange={e => setForm(f => ({ ...f, success_criteria: e.target.value }))}
                placeholder="Success looks like… (how you'll both know it's met)"
                maxLength={500}
                className="w-full bg-card border border-border-strong rounded-lg px-3 py-2 text-sm text-primary"
              />
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-secondary">
                  Sport
                  <select value={form.sport_key} onChange={e => setForm(f => ({ ...f, sport_key: e.target.value }))}
                    className="mt-1 w-full bg-card border border-border-strong rounded-lg px-3 py-2 text-sm text-primary capitalize">
                    {SPORT_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </label>
                <label className="text-xs text-secondary">
                  Target date
                  <input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
                    className="mt-1 w-full bg-card border border-border-strong rounded-lg px-3 py-2 text-sm text-primary" />
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setShowAdd(false); setForm({ ...EMPTY_FORM }) }} className="px-3 py-1.5 text-xs text-secondary hover:text-primary">Cancel</button>
                <button type="submit" disabled={saving || !form.goal_description.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-primary text-on-dark disabled:opacity-50">
                  {saving ? 'Saving…' : 'Add to plan'}
                </button>
              </div>
            </form>
          )}

          {goals.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-tertiary">No individual development plan goals recorded yet.</p>
              {canEdit && (
                <p className="text-xs text-tertiary mt-1">
                  {observationCount > 0
                    ? `Suggest goals from ${firstName}'s ${observationCount} observation${observationCount === 1 ? '' : 's'}, or add one yourself.`
                    : 'Log a few observations first, then suggest goals from them, or add one yourself.'}
                </p>
              )}
            </div>
          ) : (
            <>
              {active.length > 0 && (
                <div className="space-y-2 mb-4">
                  <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide">Active</h3>
                  {active.map(g => <GoalCard key={g.id} g={g} canEdit={canEdit} onUpdate={updateGoal} onRemove={removeGoal} />)}
                </div>
              )}
              {historic.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-tertiary uppercase tracking-wide">Historic</h3>
                  {historic.map(g => <GoalCard key={g.id} g={g} canEdit={canEdit} onUpdate={updateGoal} onRemove={removeGoal} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-card rounded-xl border border-border-default p-5">
          <h2 className="text-sm font-semibold text-primary flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-brand-accent" />
            Achievements ({achievements.length})
          </h2>
          {achievements.length === 0 ? (
            <p className="text-sm text-tertiary text-center py-6">No achievements awarded yet.</p>
          ) : (
            <div className="space-y-2">
              {achievements.map(a => (
                <div key={a.id} className="p-3 rounded-lg bg-subtle">
                  <div className="flex items-start gap-2">
                    <Award className="w-4 h-4 text-brand-accent mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-primary">{a.title}</div>
                      {a.description && <div className="text-xs text-secondary mt-0.5">{a.description}</div>}
                      <div className="text-xs text-tertiary mt-1 flex items-center gap-2 flex-wrap">
                        <span>{formatDate(a.earned_at)}</span>
                        {a.sport_key && <span className="capitalize">· {a.sport_key}</span>}
                        {a.match_opponent && <span>· vs {a.match_opponent}</span>}
                        {a.awarded_by_name && <span>· {a.awarded_by_name}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EvidenceList({ evidence }) {
  const [open, setOpen] = useState(false)
  if (!evidence?.length) return null
  return (
    <div className="mt-2">
      <button onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-primary hover:underline">
        <Quote className="w-3 h-3" /> {evidence.length} supporting observation{evidence.length === 1 ? '' : 's'}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1.5">
          {evidence.map(o => (
            <li key={o.id} className="text-xs text-secondary pl-2 border-l-2 border-brand-accent">
              <span className="text-tertiary">{formatDate(o.created_at)}{o.type ? ` · ${String(o.type).replace(/_/g, ' ')}` : ''}{o.sport ? ` · ${o.sport}` : ''}</span>
              <div className="text-primary mt-0.5">{o.content}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SuggestionsPanel({ suggestions, meta, saving, onAccept, onDismiss, onClose, onChange }) {
  return (
    <div className="mb-4 rounded-lg border border-brand-accent bg-brand-accent-tint/40 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-accent" /> Suggested goals
            <span className="text-[9.5px] font-bold px-1.5 py-px rounded-full bg-brand-primary text-brand-accent">AI</span>
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            Drafted from {meta?.observationCount || 0} confirmed observation{meta?.observationCount === 1 ? '' : 's'}. Edit anything, then add the ones you agree with — nothing is saved until you do.
          </p>
        </div>
        <button onClick={onClose} className="p-1 text-tertiary hover:text-primary" aria-label="Close suggestions"><X className="w-4 h-4" /></button>
      </div>
      {suggestions.length === 0 ? (
        <p className="text-sm text-tertiary">Nothing left to review.</p>
      ) : (
        <div className="space-y-3">
          {suggestions.map(s => (
            <div key={s._key} className="rounded-lg bg-card border border-border-default p-3 space-y-2">
              <textarea
                value={s.goal_description}
                onChange={e => onChange(s._key, { goal_description: e.target.value })}
                rows={2}
                maxLength={300}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-sm text-primary resize-none"
              />
              <input
                value={s.success_criteria || ''}
                onChange={e => onChange(s._key, { success_criteria: e.target.value })}
                placeholder="Success looks like…"
                maxLength={500}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-xs text-primary"
              />
              {s.rationale && <p className="text-xs text-secondary italic">{s.rationale}</p>}
              <div className="flex items-center gap-3 flex-wrap text-xs text-secondary">
                <label className="flex items-center gap-1.5">
                  Sport
                  <select value={s.sport_key || 'general'} onChange={e => onChange(s._key, { sport_key: e.target.value })}
                    className="bg-subtle border border-border-strong rounded-md px-2 py-1 text-xs text-primary capitalize">
                    {[...new Set([s.sport_key || 'general', ...SPORT_OPTIONS])].map(opt => <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-1.5">
                  Target
                  <input type="date" value={s.target_date || ''} onChange={e => onChange(s._key, { target_date: e.target.value })}
                    className="bg-subtle border border-border-strong rounded-md px-2 py-1 text-xs text-primary" />
                </label>
              </div>
              <EvidenceList evidence={(s.evidence_ids || []).map(id => s._evidence?.[id]).filter(Boolean)} />
              {s.evidence_ids?.length > 0 && !s._evidence && (
                <p className="text-[11px] text-tertiary flex items-center gap-1"><Quote className="w-3 h-3" /> Cites {s.evidence_ids.length} observation{s.evidence_ids.length === 1 ? '' : 's'} — shown on the goal once added.</p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => onDismiss(s._key)} className="px-3 py-1.5 text-xs text-secondary hover:text-primary">Dismiss</button>
                <button onClick={() => onAccept(s)} disabled={saving || !s.goal_description.trim()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-primary text-on-dark disabled:opacity-50">
                  <Plus className="w-3.5 h-3.5" /> Add to plan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GoalCard({ g, canEdit, onUpdate, onRemove }) {
  const meta = STATUS_META[g.status] || STATUS_META.in_progress
  const Icon = meta.icon
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState(g.teacher_assessment_notes || '')
  const [busy, setBusy] = useState(false)

  async function setStatus(status) {
    setBusy(true)
    await onUpdate(g.id, { status }, `Marked ${STATUS_META[status].label.toLowerCase()}`)
    setBusy(false)
  }

  async function saveNote() {
    setBusy(true)
    const ok = await onUpdate(g.id, { teacher_assessment_notes: note }, 'Note saved')
    setBusy(false)
    if (ok) setNoteOpen(false)
  }

  return (
    <div className="p-3 rounded-lg bg-subtle">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-primary">{g.goal_description}</div>
          {g.success_criteria && (
            <div className="text-xs text-secondary mt-1"><span className="font-semibold text-tertiary">Success looks like:</span> {g.success_criteria}</div>
          )}
          <div className="text-xs text-tertiary mt-1 flex items-center gap-2 flex-wrap">
            {g.sport_key && <span className="capitalize">{String(g.sport_key).replace(/_/g, ' ')}</span>}
            {g.target_date && <span>· Target {formatDate(g.target_date)}</span>}
            {g.created_by_name && <span>· {g.created_by_name}</span>}
            {g.origin === 'ai_suggested' && <span className="px-1.5 rounded-full bg-brand-primary text-brand-accent text-[9.5px] font-bold">AI-suggested</span>}
          </div>
          {g.rationale && <div className="text-xs text-secondary mt-1.5 italic">{g.rationale}</div>}
          <EvidenceList evidence={g.evidence} />
          {g.teacher_assessment_notes && !noteOpen && (
            <div className="text-xs text-secondary mt-2 italic flex items-start gap-1"><StickyNote className="w-3 h-3 mt-0.5 text-tertiary shrink-0" />"{g.teacher_assessment_notes}"</div>
          )}
          {noteOpen && (
            <div className="mt-2 space-y-2">
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={1000}
                placeholder="Teacher note — progress, what to try next…"
                className="w-full bg-card border border-border-strong rounded-lg px-3 py-2 text-xs text-primary resize-none" />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setNoteOpen(false); setNote(g.teacher_assessment_notes || '') }} className="px-2 py-1 text-xs text-secondary">Cancel</button>
                <button onClick={saveNote} disabled={busy} className="px-3 py-1 rounded-md text-xs font-semibold bg-brand-primary text-on-dark disabled:opacity-50">Save note</button>
              </div>
            </div>
          )}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1 shrink-0 ${meta.colour}`}>
          <Icon className="w-3 h-3" />{meta.label}
        </span>
      </div>
      {canEdit && (
        <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-border-default">
          {g.status === 'in_progress' ? (
            <>
              <ActionButton onClick={() => setStatus('achieved')} disabled={busy}>Mark achieved</ActionButton>
              <ActionButton onClick={() => setStatus('revised')} disabled={busy}>Revise</ActionButton>
              <ActionButton onClick={() => setStatus('abandoned')} disabled={busy}>Abandon</ActionButton>
            </>
          ) : (
            <ActionButton onClick={() => setStatus('in_progress')} disabled={busy}>Reopen</ActionButton>
          )}
          <ActionButton onClick={() => setNoteOpen(v => !v)} disabled={busy}>{g.teacher_assessment_notes ? 'Edit note' : 'Add note'}</ActionButton>
          <button onClick={() => onRemove(g.id)} disabled={busy} className="ml-auto p-1 text-tertiary hover:text-status-error" aria-label="Remove goal">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

function ActionButton({ children, ...props }) {
  return (
    <button {...props} className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-card border border-border-default text-secondary hover:text-primary hover:border-border-strong transition-colors disabled:opacity-50">
      {children}
    </button>
  )
}
