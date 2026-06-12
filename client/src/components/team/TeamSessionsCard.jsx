import { useState, useEffect, useRef } from 'react'
import { trainingService } from '../../services/api'
import DrillDiagram from '../DrillDiagram'
import { printElement } from '../../lib/printUtils'
import { ASSISTANT_NAME } from '../../lib/assistant'
import {
  Calendar, Clock, Plus, X, Loader2, Printer, Trash2, Share2, Sparkles, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

const FOCUS_SUGGESTIONS = {
  football: ['passing', 'finishing', 'defending', 'pressing', 'possession', '1v1 skills'],
  rugby: ['handling', 'tackling technique', 'rucking', 'support play', 'evasion', 'kicking'],
  cricket: ['batting technique', 'bowling accuracy', 'fielding', 'catching', 'running between wickets'],
  hockey: ['close control', 'passing', 'shooting', 'tackling', 'penalty corners'],
  netball: ['shooting', 'footwork', 'movement off the ball', 'centre passes', 'defending'],
  basketball: ['ball handling', 'shooting form', 'lay-ups', 'man-to-man defence', 'rebounding'],
  volleyball: ['serving', 'digging', 'setting', 'spiking', 'rotation play'],
  athletics: ['sprint mechanics', 'relay changeovers', 'jumping technique', 'throwing technique', 'pacing'],
  swimming: ['stroke technique', 'starts and turns', 'breathing', 'pacing', 'relay takeovers'],
  tennis: ['groundstrokes', 'serving', 'net play', 'rally consistency', 'movement'],
  badminton: ['grip and serve', 'overhead clears', 'drop shots', 'net play', 'court movement'],
  rounders: ['batting', 'bowling', 'fielding', 'post play', 'tactical running'],
  gymnastics: ['shapes and balances', 'rolls', 'flight and landing', 'sequences'],
  dance: ['technique', 'musicality', 'composition', 'ensemble work'],
  'cross-country': ['pacing', 'hill technique', 'race starts', 'running form'],
}
const DEFAULT_FOCUS = ['technique', 'game play', 'fitness', 'teamwork']

const SECTION_ORDER = [
  ['warmUp', 'Warm-Up'],
  ['technical', 'Technical'],
  ['tactical', 'Tactical'],
  ['game', 'Game'],
  ['coolDown', 'Cool-Down'],
]

function parsePlan(plan) {
  if (!plan) return null
  if (typeof plan === 'string') {
    try { return JSON.parse(plan) } catch { return null }
  }
  return plan
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

const inputCls =
  'w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-primary text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none'

// ---------------------------------------------------------------------------
// Plan-a-session modal
// ---------------------------------------------------------------------------

function PlanSessionModal({ teamId, sport, pupilCount, onClose, onCreated }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '',
    duration: 60,
    level: 'core',
    venue_type: 'outdoor',
    constraints: '',
  })
  const [focusAreas, setFocusAreas] = useState([])
  const [focusInput, setFocusInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const suggestions = FOCUS_SUGGESTIONS[sport] || DEFAULT_FOCUS

  function toggleFocus(f) {
    setFocusAreas(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  }

  function addCustomFocus() {
    const f = focusInput.trim().toLowerCase()
    if (f && !focusAreas.includes(f)) setFocusAreas(prev => [...prev, f])
    setFocusInput('')
  }

  async function handleGenerate(e) {
    e.preventDefault()
    if (focusAreas.length === 0) return toast.error('Pick at least one focus area')
    setGenerating(true)
    try {
      const res = await trainingService.generateSession(teamId, {
        duration: Number(form.duration),
        focusAreas,
        pupils: pupilCount || 12,
        constraints: form.constraints || undefined,
        date: form.date,
        time: form.time || undefined,
        venue_type: form.venue_type,
        level: form.level,
        session_type: 'training',
      })
      toast.success('Session plan ready')
      onCreated(res.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate the session')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border-strong rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-default p-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary-tint">
              <Sparkles className="w-4 h-4 text-brand-primary" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-primary">Plan a session</h2>
              <p className="text-xs text-secondary">{ASSISTANT_NAME} drafts a full plan with drills and diagrams</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-secondary hover:text-primary transition-colors" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-secondary mb-1">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Time (optional)</label>
              <input type="time" value={form.time} onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Duration</label>
              <select value={form.duration} onChange={(e) => setForm(f => ({ ...f, duration: e.target.value }))} className={inputCls}>
                {[45, 60, 75, 90].map(d => <option key={d} value={d}>{d} minutes</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Level</label>
              <select value={form.level} onChange={(e) => setForm(f => ({ ...f, level: e.target.value }))} className={inputCls}>
                <option value="development">Development</option>
                <option value="core">Core</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-secondary mb-1">Venue</label>
              <select value={form.venue_type} onChange={(e) => setForm(f => ({ ...f, venue_type: e.target.value }))} className={inputCls}>
                <option value="outdoor">Outdoor</option>
                <option value="indoor">Indoor / sports hall</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-secondary mb-1.5">Focus areas</label>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFocus(f)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    focusAreas.includes(f)
                      ? 'bg-brand-primary text-on-dark'
                      : 'bg-subtle text-secondary border border-border-default hover:border-border-strong'
                  }`}
                >
                  {f}
                </button>
              ))}
              {focusAreas.filter(f => !suggestions.includes(f)).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFocus(f)}
                  className="rounded-full bg-brand-primary px-3 py-1.5 text-xs font-medium text-on-dark"
                >
                  {f} ✕
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={focusInput}
                onChange={(e) => setFocusInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomFocus() } }}
                placeholder="Add your own focus…"
                className={inputCls}
              />
              <button type="button" onClick={addCustomFocus} className="shrink-0 rounded-lg border border-border-default px-3 text-sm text-secondary hover:bg-subtle">
                Add
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-secondary mb-1">Anything {ASSISTANT_NAME} should know? (optional)</label>
            <textarea
              value={form.constraints}
              onChange={(e) => setForm(f => ({ ...f, constraints: e.target.value }))}
              rows={2}
              placeholder="e.g. half the usual space available, two pupils returning from injury"
              className={inputCls}
            />
          </div>

          <button
            type="submit"
            disabled={generating}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary py-3 text-sm font-semibold text-on-dark transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {ASSISTANT_NAME} is building your session… usually 15–30 seconds
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate session plan
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Session plan viewer
// ---------------------------------------------------------------------------

function SessionViewModal({ teamId, session, onClose, onChanged }) {
  const plan = parsePlan(session.plan)
  const printRef = useRef(null)
  const [sharing, setSharing] = useState(false)
  const shared = !!session.share_plan_with_players

  async function toggleShare() {
    setSharing(true)
    try {
      await trainingService.toggleSharePlan(teamId, session.id, !shared)
      onChanged({ ...session, share_plan_with_players: !shared })
      toast.success(!shared ? 'Plan shared with pupils' : 'Plan unshared')
    } catch {
      toast.error('Failed to update sharing')
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border-strong rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-default bg-card p-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-primary">Training session</h2>
            <p className="text-xs text-secondary">
              {fmtDate(session.date)}{session.time ? ` · ${String(session.time).slice(0, 5)}` : ''} · {session.duration} min
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleShare}
              disabled={sharing}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                shared
                  ? 'border-brand-primary bg-brand-primary-tint text-brand-primary'
                  : 'border-border-default text-secondary hover:bg-subtle'
              }`}
              title={shared ? 'Shared with pupils' : 'Share with pupils'}
            >
              <Share2 className="w-3.5 h-3.5" />
              {shared ? 'Shared' : 'Share'}
            </button>
            <button
              onClick={() => printElement(printRef.current, 'Training session — MoonBoots Sports')}
              className="flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:bg-subtle"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button onClick={onClose} className="p-2 text-secondary hover:text-primary transition-colors" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div ref={printRef} className="space-y-6 p-5">
          {(session.focus_areas || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {session.focus_areas.map(f => (
                <span key={f} className="rounded-full bg-brand-primary-tint px-2.5 py-1 text-xs font-medium text-brand-primary">{f}</span>
              ))}
            </div>
          )}

          {plan ? (
            SECTION_ORDER.map(([key, label]) => {
              const sec = plan[key]
              if (!sec) return null
              return (
                <div key={key}>
                  <div className="mb-2 flex items-baseline justify-between border-b border-border-default pb-2">
                    <h3 className="font-display font-semibold text-primary">
                      {label}{sec.name ? ` — ${sec.name}` : ''}
                    </h3>
                    {sec.duration && <span className="text-xs text-tertiary">{sec.duration}</span>}
                  </div>
                  {sec.description && <p className="text-sm leading-relaxed text-secondary">{sec.description}</p>}
                  {sec.setup && (
                    <p className="mt-2 text-sm text-secondary"><span className="font-semibold text-primary">Setup: </span>{sec.setup}</p>
                  )}
                  {Array.isArray(sec.coachingPoints) && sec.coachingPoints.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {sec.coachingPoints.map((cp, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-secondary">
                          <ChevronRight className="mt-0.5 w-3.5 h-3.5 shrink-0 text-brand-accent" />
                          {cp}
                        </li>
                      ))}
                    </ul>
                  )}
                  {sec.progression && (
                    <p className="mt-2 text-sm text-secondary"><span className="font-semibold text-primary">Progression: </span>{sec.progression}</p>
                  )}
                  {sec.diagram && (
                    <div className="mt-3">
                      <DrillDiagram diagram={sec.diagram} />
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <p className="text-sm text-tertiary">No plan attached to this session{plan === null && session.plan ? ' (could not read the plan data)' : ''}.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------------

export default function TeamSessionsCard({ teamId, sport, pupilCount }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPlan, setShowPlan] = useState(false)
  const [viewSession, setViewSession] = useState(null)

  useEffect(() => {
    let alive = true
    trainingService.getSessions(teamId)
      .then(res => { if (alive) setSessions(Array.isArray(res.data) ? res.data : []) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [teamId])

  async function handleDelete(session, e) {
    e.stopPropagation()
    if (!confirm('Delete this session and its plan?')) return
    try {
      await trainingService.deleteSession(session.id)
      setSessions(prev => prev.filter(s => s.id !== session.id))
      toast.success('Session deleted')
    } catch {
      toast.error('Failed to delete session')
    }
  }

  function handleCreated(session) {
    setSessions(prev => [session, ...prev])
    setShowPlan(false)
    setViewSession(session)
  }

  return (
    <div className="bg-card rounded-xl border border-border-default p-6 lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
          <Calendar className="w-5 h-5 text-brand-primary" />
          Training Sessions ({sessions.length})
        </h2>
        <button
          onClick={() => setShowPlan(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand-primary hover:opacity-90 text-on-dark rounded-lg font-medium transition-opacity"
        >
          <Sparkles className="w-3.5 h-3.5" /> Plan a session
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-tertiary" /></div>
      ) : sessions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[320px] overflow-y-auto">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setViewSession(s)}
              className="group flex items-center justify-between rounded-lg bg-subtle px-3 py-2.5 text-left transition-colors hover:bg-border-default/40"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm text-primary">
                  <span className="font-medium">{fmtDate(s.date)}</span>
                  {s.time && <span className="text-xs text-tertiary flex items-center gap-1"><Clock className="w-3 h-3" />{String(s.time).slice(0, 5)}</span>}
                  <span className="text-xs text-tertiary">{s.duration} min</span>
                  {s.share_plan_with_players && <Share2 className="w-3 h-3 text-brand-primary" title="Shared with pupils" />}
                </div>
                {(s.focus_areas || []).length > 0 && (
                  <p className="mt-0.5 truncate text-xs text-secondary">{s.focus_areas.join(' · ')}</p>
                )}
              </div>
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => handleDelete(s, e)}
                className="ml-2 shrink-0 p-1.5 text-tertiary opacity-0 transition-all hover:text-status-error group-hover:opacity-100"
                title="Delete session"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-tertiary text-sm">No sessions planned for this team yet.</p>
          <button
            onClick={() => setShowPlan(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-dashed border-border-strong px-4 py-2 text-xs text-secondary transition-colors hover:border-brand-primary hover:text-brand-primary"
          >
            <Plus className="w-3.5 h-3.5" /> Let {ASSISTANT_NAME} draft your first session
          </button>
        </div>
      )}

      {showPlan && (
        <PlanSessionModal
          teamId={teamId}
          sport={sport}
          pupilCount={pupilCount}
          onClose={() => setShowPlan(false)}
          onCreated={handleCreated}
        />
      )}
      {viewSession && (
        <SessionViewModal
          teamId={teamId}
          session={viewSession}
          onClose={() => setViewSession(null)}
          onChanged={(updated) => {
            setViewSession(updated)
            setSessions(prev => prev.map(s => (s.id === updated.id ? updated : s)))
          }}
        />
      )}
    </div>
  )
}
