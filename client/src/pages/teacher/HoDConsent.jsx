import { useState, useEffect, useMemo } from 'react'
import { consentService } from '../../services/api'
import {
  ShieldCheck, AlertTriangle, Clock, CheckCircle, XCircle, Loader2, Sparkles, RefreshCw,
  Send, Search, Copy, Mail, MailX, X, ChevronDown, ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'

const REQUEST_STATUS = {
  sent: { label: 'Sent', cls: 'bg-brand-primary-tint text-brand-primary' },
  opened: { label: 'Opened', cls: 'bg-brand-accent-tint text-brand-accent' },
  completed: { label: 'Completed', cls: 'bg-status-success-tint text-status-success' },
  expired: { label: 'Expired', cls: 'bg-status-error-tint text-status-error' },
  cancelled: { label: 'Withdrawn', cls: 'bg-border-default text-secondary' },
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

async function copyLink(link) {
  try {
    await navigator.clipboard.writeText(link)
    toast.success('Link copied')
  } catch {
    window.prompt('Copy this link', link)
  }
}

export default function HoDConsent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [requests, setRequests] = useState([])
  const [showRequestPanel, setShowRequestPanel] = useState(false)
  const [showAllRequests, setShowAllRequests] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [overview, reqs] = await Promise.all([
        consentService.getOverview(),
        consentService.listRequests().catch(() => ({ data: [] })),
      ])
      setData(overview.data)
      setRequests(Array.isArray(reqs.data) ? reqs.data : [])
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

  async function resend(id) {
    try {
      const res = await consentService.resendRequest(id)
      toast.success(res.data.email_sent ? 'Request re-sent' : 'Link refreshed — email is not configured, copy the link instead')
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Could not resend') }
  }

  async function cancel(id) {
    try {
      await consentService.cancelRequest(id)
      toast.success('Request withdrawn')
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Could not withdraw') }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-secondary" /></div>

  const { types, summary, totalPupils } = data || {}
  const totalGranted = summary?.reduce((s, t) => s + parseInt(t.granted || 0), 0) || 0
  const totalPending = summary?.reduce((s, t) => s + parseInt(t.pending || 0), 0) || 0
  const totalExpiring = summary?.reduce((s, t) => s + parseInt(t.expiring_soon || 0), 0) || 0
  const totalExpired = summary?.reduce((s, t) => s + parseInt(t.expired || 0), 0) || 0
  const openRequests = requests.filter(r => ['sent', 'opened'].includes(r.status)).length
  const visibleRequests = showAllRequests ? requests : requests.slice(0, 8)

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-accent" /> Parental Consent
          </h1>
          <p className="text-sm text-secondary mt-0.5">{totalPupils} pupils across the school{openRequests ? ` · ${openRequests} request${openRequests === 1 ? '' : 's'} awaiting parents` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {(!types || types.length === 0) ? (
            <button onClick={seedDefaults} disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary hover:bg-brand-primary disabled:opacity-50 text-on-dark rounded-lg text-sm">
              {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Set up default consent types
            </button>
          ) : (
            <button onClick={() => setShowRequestPanel(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary hover:opacity-90 text-on-dark rounded-lg text-sm">
              <Send className="w-3.5 h-3.5" /> Request consent from parents
            </button>
          )}
        </div>
      </div>

      {showRequestPanel && types?.length > 0 && (
        <RequestPanel types={types} onClose={() => setShowRequestPanel(false)} onSent={load} />
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Active Consents" value={totalGranted} icon={CheckCircle} color="text-status-success bg-status-success-tint" />
        <SummaryCard label="Pending" value={totalPending} icon={Clock} color="text-brand-accent bg-brand-accent-tint" />
        <SummaryCard label="Expiring (30 days)" value={totalExpiring} icon={AlertTriangle} color="text-orange-400 bg-orange-500/10" />
        <SummaryCard label="Expired" value={totalExpired} icon={XCircle} color="text-status-error bg-status-error-tint" />
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
                const coverage = totalPupils > 0 ? Math.min(100, Math.round((granted / totalPupils) * 100)) : 0
                return (
                  <tr key={row.consent_type_id} className="border-b border-border-subtle hover:bg-subtle">
                    <td className="px-4 py-3 text-primary font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-center text-status-success">{row.granted || 0}</td>
                    <td className="px-4 py-3 text-center text-brand-accent">{row.pending || 0}</td>
                    <td className="px-4 py-3 text-center text-status-error">{row.refused || 0}</td>
                    <td className="px-4 py-3 text-center">
                      {parseInt(row.expiring_soon || 0) > 0
                        ? <span className="text-orange-400">{row.expiring_soon}</span>
                        : <span className="text-tertiary">0</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {parseInt(row.expired || 0) > 0
                        ? <span className="text-status-error">{row.expired}</span>
                        : <span className="text-tertiary">0</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-border-default rounded-full overflow-hidden">
                          <div className="h-full bg-brand-primary rounded-full" style={{ width: `${coverage}%` }} />
                        </div>
                        <span className={`text-xs ${coverage >= 80 ? 'text-status-success' : coverage >= 50 ? 'text-brand-accent' : 'text-status-error'}`}>
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
          <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-3" />
          <p className="text-secondary">No consent types configured yet.</p>
          <p className="text-sm text-tertiary mt-1">Click "Set up default consent types" to get started with standard UK school sport consents.</p>
        </div>
      )}

      {/* Requests sent to parents */}
      {types?.length > 0 && (
        <div className="bg-card border border-border-default rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-primary">Requests sent to parents</h3>
              <p className="text-xs text-secondary mt-0.5">Each link is personal to one pupil's parent and works for 30 days.</p>
            </div>
            {requests.length > 8 && (
              <button onClick={() => setShowAllRequests(v => !v)} className="text-xs font-semibold text-brand-primary flex items-center gap-1">
                {showAllRequests ? <>Show fewer <ChevronUp className="w-3 h-3" /></> : <>Show all {requests.length} <ChevronDown className="w-3 h-3" /></>}
              </button>
            )}
          </div>
          {requests.length === 0 ? (
            <p className="px-4 py-6 text-sm text-tertiary text-center">No requests sent yet. Use "Request consent from parents" to send the first batch.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default text-secondary text-xs uppercase tracking-wider">
                  <th className="px-4 py-2.5 text-left">Pupil</th>
                  <th className="px-4 py-2.5 text-left">Parent</th>
                  <th className="px-4 py-2.5 text-left w-28">Status</th>
                  <th className="px-4 py-2.5 text-left w-40">Sent / answered</th>
                  <th className="px-4 py-2.5 text-right w-44">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRequests.map(r => {
                  const meta = REQUEST_STATUS[r.status] || REQUEST_STATUS.sent
                  const live = ['sent', 'opened'].includes(r.status)
                  return (
                    <tr key={r.id} className="border-b border-border-subtle">
                      <td className="px-4 py-2.5 text-primary font-medium">{r.pupil_name}{r.year_group ? <span className="text-tertiary font-normal"> · Yr {r.year_group}</span> : null}</td>
                      <td className="px-4 py-2.5 text-secondary">
                        <span className="flex items-center gap-1.5">{r.email_sent ? <Mail className="w-3.5 h-3.5 text-status-success" /> : <MailX className="w-3.5 h-3.5 text-tertiary" title="Email not sent — copy the link" />}{r.parent_email}</span>
                      </td>
                      <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-xs font-medium ${meta.cls}`}>{meta.label}</span></td>
                      <td className="px-4 py-2.5 text-xs text-secondary">
                        {fmtDate(r.sent_at)}{r.completed_at ? ` → ${fmtDate(r.completed_at)}${r.responder_name ? ` by ${r.responder_name}` : ''}` : live ? ` · expires ${fmtDate(r.expires_at)}` : ''}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {live && <button onClick={() => copyLink(r.link)} className="px-2 py-1 rounded text-xs text-secondary hover:text-primary hover:bg-subtle flex items-center gap-1"><Copy className="w-3 h-3" /> Link</button>}
                          {r.status !== 'completed' && r.status !== 'cancelled' && <button onClick={() => resend(r.id)} className="px-2 py-1 rounded text-xs text-secondary hover:text-primary hover:bg-subtle">Resend</button>}
                          {live && <button onClick={() => cancel(r.id)} className="px-2 py-1 rounded text-xs text-tertiary hover:text-status-error hover:bg-subtle">Withdraw</button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-accent hover:bg-brand-accent text-on-dark rounded-lg text-sm shrink-0">
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
                className="px-4 py-2 bg-brand-accent hover:bg-brand-accent disabled:opacity-50 text-on-dark rounded-lg text-sm">
                {resetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Pick consent types and pupils, add emails where missing, send. Shows the
// personal links afterwards so they can be shared even when email is off.
function RequestPanel({ types, onClose, onSent }) {
  const [roster, setRoster] = useState(null)
  const [selectedTypes, setSelectedTypes] = useState(() => new Set(types.map(t => t.id)))
  const [selectedPupils, setSelectedPupils] = useState(() => new Set())
  const [emails, setEmails] = useState({})
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    consentService.listPupils()
      .then(res => setRoster(Array.isArray(res.data) ? res.data : []))
      .catch(() => { setRoster([]); toast.error('Could not load pupils') })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (roster || []).filter(p => !q || (p.name || '').toLowerCase().includes(q) || String(p.year_group || '').includes(q))
  }, [roster, search])

  const emailFor = (p) => (emails[p.id] ?? p.parent_email ?? '').trim()
  const toggleType = (id) => setSelectedTypes(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const togglePupil = (id) => setSelectedPupils(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectAllWithEmail = () => setSelectedPupils(new Set(filtered.filter(p => emailFor(p)).map(p => p.id)))

  async function send() {
    const pupilIds = [...selectedPupils]
    if (pupilIds.length === 0 || selectedTypes.size === 0) return
    setSending(true)
    try {
      const parentEmails = {}
      for (const id of pupilIds) if (emails[id]) parentEmails[id] = emails[id].trim()
      const res = await consentService.createRequests({
        pupil_ids: pupilIds, consent_type_ids: [...selectedTypes], message: message.trim() || undefined, parent_emails: parentEmails,
      })
      setResult(res.data)
      onSent?.()
      const n = res.data.created?.length || 0
      toast.success(n ? `${n} request${n === 1 ? '' : 's'} created${res.data.email_enabled ? ' and emailed' : ''}` : 'Nothing sent — check parent emails')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not send requests')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-card border border-brand-accent rounded-xl p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-primary">Request consent from parents</h2>
          <p className="text-xs text-secondary mt-0.5">Parents get a personal link by email — no account needed. Answers land here as granted or refused.</p>
        </div>
        <button onClick={onClose} className="p-1 text-tertiary hover:text-primary" aria-label="Close"><X className="w-4 h-4" /></button>
      </div>

      {result ? (
        <div className="space-y-3">
          {result.created?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-primary mb-2">
                {result.created.length} request{result.created.length === 1 ? '' : 's'} created{result.email_enabled ? '' : ' — email is not configured on this server, so share the links directly'}.
              </p>
              <ul className="divide-y divide-border-subtle border border-border-subtle rounded-lg">
                {result.created.map(c => (
                  <li key={c.request_id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="text-primary font-medium">{c.pupil_name}</span>
                      <span className="text-tertiary"> · {c.parent_email}</span>
                      {c.email_sent ? <span className="ml-2 text-xs text-status-success">emailed</span> : <span className="ml-2 text-xs text-tertiary">not emailed</span>}
                    </span>
                    <button onClick={() => copyLink(c.link)} className="shrink-0 px-2 py-1 rounded text-xs text-brand-primary hover:bg-subtle flex items-center gap-1"><Copy className="w-3 h-3" /> Copy link</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.skipped?.length > 0 && (
            <div className="text-sm">
              <p className="font-medium text-status-warning mb-1">{result.skipped.length} skipped</p>
              <ul className="text-secondary text-xs space-y-0.5">
                {result.skipped.map(s => <li key={s.pupil_id}>{s.pupil_name || s.pupil_id} — {s.reason}</li>)}
              </ul>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => { setResult(null); setSelectedPupils(new Set()) }} className="px-3 py-1.5 text-sm text-secondary hover:text-primary">Send more</button>
            <button onClick={onClose} className="px-3 py-1.5 bg-brand-primary text-on-dark rounded-lg text-sm">Done</button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">1. Consents to ask for</p>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {types.map(t => (
                <label key={t.id} className="flex items-start gap-2 text-sm text-primary cursor-pointer rounded-lg px-2 py-1.5 hover:bg-subtle">
                  <input type="checkbox" checked={selectedTypes.has(t.id)} onChange={() => toggleType(t.id)} className="mt-0.5" />
                  <span>{t.name}<span className="block text-xs text-tertiary">{t.is_per_term ? 'This term' : `${t.expiry_period_months || 12} months`}</span></span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide">2. Pupils ({selectedPupils.size} selected)</p>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tertiary" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or year"
                    className="pl-7 pr-2 py-1 bg-subtle border border-border-strong rounded-lg text-xs text-primary w-40" />
                </div>
                <button onClick={selectAllWithEmail} className="text-xs font-semibold text-brand-primary">Select all with an email</button>
                <button onClick={() => setSelectedPupils(new Set())} className="text-xs text-tertiary">Clear</button>
              </div>
            </div>
            {roster === null ? (
              <p className="text-sm text-tertiary py-3">Loading pupils…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-tertiary py-3">No pupils match.</p>
            ) : (
              <div className="max-h-72 overflow-y-auto border border-border-subtle rounded-lg divide-y divide-border-subtle">
                {filtered.map(p => {
                  const email = emailFor(p)
                  const checked = selectedPupils.has(p.id)
                  return (
                    <div key={p.id} className={`flex items-center gap-3 px-3 py-2 text-sm ${checked ? 'bg-brand-primary-tint/40' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => togglePupil(p.id)} />
                      <span className="w-40 shrink-0 truncate text-primary font-medium">{p.name}<span className="text-tertiary font-normal">{p.year_group ? ` · Yr ${p.year_group}` : ''}</span></span>
                      <input
                        value={emails[p.id] ?? p.parent_email ?? ''}
                        onChange={e => setEmails(m => ({ ...m, [p.id]: e.target.value }))}
                        placeholder="Parent email"
                        className={`flex-1 min-w-0 px-2 py-1 rounded border text-xs ${email ? 'bg-card border-border-subtle text-primary' : 'bg-status-warning-tint border-status-warning text-primary placeholder:text-status-warning'}`}
                      />
                      <span className="w-24 shrink-0 text-right text-xs text-tertiary">
                        {p.open_requests > 0 ? <span className="text-brand-accent">link open</span> : `${p.granted} granted`}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">3. Note to parents (optional)</p>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} maxLength={1000}
              placeholder="e.g. We need these in place before the away fixtures start on 3 October."
              className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-sm text-primary resize-none" />
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-tertiary">Pupils without an email are skipped — add one inline to include them.</p>
            <button onClick={send} disabled={sending || selectedPupils.size === 0 || selectedTypes.size === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-primary hover:opacity-90 text-on-dark rounded-lg text-sm disabled:opacity-50">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send to {selectedPupils.size} parent{selectedPupils.size === 1 ? '' : 's'}
            </button>
          </div>
        </>
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
