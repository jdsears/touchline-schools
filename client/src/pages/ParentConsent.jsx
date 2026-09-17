import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { consentService } from '../services/api'
import { ShieldCheck, CheckCircle2, XCircle, Loader2, Clock, AlertTriangle } from 'lucide-react'

// Public page a parent reaches from the consent-request email. No account:
// the token in the URL identifies the pupil and the consents being asked
// for. Answers are recorded per item; the page then shows what was agreed.

function fmtDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function Shell({ colour, children }) {
  return (
    <div className="min-h-screen bg-page">
      <div className="h-2" style={{ background: colour || 'var(--brand-primary)' }} />
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">{children}</div>
      <p className="text-center text-xs text-tertiary pb-8">Powered by MoonBoots Sports</p>
    </div>
  )
}

function Notice({ icon: Icon, title, children, tone = 'neutral' }) {
  const colours = {
    neutral: 'text-secondary',
    success: 'text-status-success',
    warning: 'text-status-warning',
    error: 'text-status-error',
  }
  return (
    <div className="bg-card border border-border-default rounded-2xl p-8 text-center">
      <Icon className={`w-10 h-10 mx-auto mb-3 ${colours[tone]}`} />
      <h1 className="text-xl font-bold text-primary mb-2">{title}</h1>
      <div className="text-sm text-secondary space-y-1">{children}</div>
    </div>
  )
}

export default function ParentConsent() {
  const { token } = useParams()
  const [state, setState] = useState({ loading: true })
  const [decisions, setDecisions] = useState({})
  const [name, setName] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  useEffect(() => {
    let cancelled = false
    consentService.getPublicRequest(token)
      .then(res => { if (!cancelled) setState({ loading: false, data: res.data }) })
      .catch(err => {
        if (cancelled) return
        const body = err.response?.data
        setState({ loading: false, closed: body?.state ? body : null, invalid: !body?.state })
      })
    return () => { cancelled = true }
  }, [token])

  if (state.loading) {
    return <Shell><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-secondary" /></div></Shell>
  }

  if (state.invalid) {
    return (
      <Shell>
        <Notice icon={AlertTriangle} title="This link isn't valid" tone="error">
          <p>Check the link in your email, or ask the school to send a new one.</p>
        </Notice>
      </Shell>
    )
  }

  if (state.closed) {
    const c = state.closed
    return (
      <Shell>
        {c.state === 'completed' && (
          <Notice icon={CheckCircle2} title="Already answered" tone="success">
            <p>Your responses for {c.pupil_first_name} were recorded on {fmtDate(c.completed_at)}.</p>
            <p>If anything has changed, ask {c.school_name} to send a new request.</p>
          </Notice>
        )}
        {c.state === 'expired' && (
          <Notice icon={Clock} title="This link has expired" tone="warning">
            <p>Consent links are valid for 30 days. Ask {c.school_name} to send a new one for {c.pupil_first_name}.</p>
          </Notice>
        )}
        {c.state === 'cancelled' && (
          <Notice icon={XCircle} title="This request was withdrawn">
            <p>{c.school_name} has replaced or cancelled this request. If you were expecting one, check for a newer email.</p>
          </Notice>
        )}
      </Shell>
    )
  }

  if (done) {
    return (
      <Shell colour={state.data.school?.primary_color}>
        <Notice icon={CheckCircle2} title="Thank you" tone="success">
          <p>Your answers for {done.pupil_first_name} have been recorded with {done.school_name}.</p>
          <p>{done.granted} consent{done.granted === 1 ? '' : 's'} given{done.refused ? `, ${done.refused} declined` : ''}. You can close this page.</p>
        </Notice>
      </Shell>
    )
  }

  const { school, pupil, items, parent_email_masked, message, expires_at } = state.data
  const allAnswered = items.every(i => decisions[i.id])
  const canSubmit = allAnswered && name.trim().length >= 2 && confirmed && !submitting

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await consentService.submitPublicRequest(token, { decisions, responder_name: name.trim(), confirmed: true })
      setDone(res.data)
    } catch (err) {
      const body = err.response?.data
      if (body?.state) setState({ loading: false, closed: body })
      else setError(body?.error || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Shell colour={school?.primary_color}>
      <div className="bg-card border border-border-default rounded-2xl overflow-hidden">
        <div className="px-6 sm:px-8 pt-8 pb-6 border-b border-border-subtle">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-tertiary mb-2">
            <ShieldCheck className="w-4 h-4" style={{ color: school?.accent_color || 'var(--brand-accent)' }} /> {school?.name}
          </div>
          <h1 className="text-2xl font-bold text-primary">Consent for {pupil.first_name}{pupil.year_group ? ` (Year ${pupil.year_group})` : ''}</h1>
          <p className="text-sm text-secondary mt-2">
            The PE department has asked for your permission on the items below. Answer each one, then sign with your name.
            This link was sent to {parent_email_masked} and expires on {fmtDate(expires_at)}.
          </p>
          {message && (
            <blockquote className="mt-3 text-sm text-secondary italic border-l-2 pl-3" style={{ borderColor: school?.accent_color || 'var(--brand-accent)' }}>{message}</blockquote>
          )}
        </div>

        <form onSubmit={submit}>
          <div className="divide-y divide-border-subtle">
            {items.map(item => {
              const value = decisions[item.id]
              return (
                <fieldset key={item.id} className="px-6 sm:px-8 py-5">
                  <legend className="text-base font-semibold text-primary">{item.name}</legend>
                  {item.description && <p className="text-sm text-secondary mt-1">{item.description}</p>}
                  <p className="text-xs text-tertiary mt-1">
                    {item.is_per_term ? 'Covers this term.' : `Valid for ${item.expiry_period_months || 12} months.`}
                    {item.current_status === 'granted' && item.current_expires_at && ` Currently given until ${fmtDate(item.current_expires_at)}.`}
                    {item.current_status === 'refused' && ' Currently declined.'}
                  </p>
                  <div className="flex gap-2 mt-3">
                    {[['granted', 'Yes, I give consent', CheckCircle2], ['refused', 'No, I do not', XCircle]].map(([v, label, Icon]) => (
                      <label key={v}
                        className={`flex-1 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                          value === v
                            ? v === 'granted' ? 'border-status-success bg-status-success-tint text-status-success' : 'border-status-error bg-status-error-tint text-status-error'
                            : 'border-border-default text-secondary hover:border-border-strong'
                        }`}>
                        <input type="radio" name={`decision-${item.id}`} value={v} checked={value === v}
                          onChange={() => setDecisions(d => ({ ...d, [item.id]: v }))} className="sr-only" />
                        <Icon className="w-4 h-4" /> {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )
            })}
          </div>

          <div className="px-6 sm:px-8 py-6 bg-subtle border-t border-border-subtle space-y-4">
            <label className="block text-sm">
              <span className="font-medium text-primary">Your full name (as signature)</span>
              <input value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={120}
                placeholder="e.g. Priya Marsh"
                className="mt-1 w-full bg-card border border-border-strong rounded-lg px-3 py-2 text-primary" />
            </label>
            <label className="flex items-start gap-2 text-sm text-secondary">
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1" />
              <span>I confirm I am the parent or carer of {pupil.first_name} and am authorised to give or decline these consents. My name, the date and my answers will be stored by {school?.name}.</span>
            </label>
            {error && <p className="text-sm text-status-error">{error}</p>}
            <button type="submit" disabled={!canSubmit}
              className="w-full py-3 rounded-xl text-sm font-semibold text-on-dark disabled:opacity-50"
              style={{ background: school?.primary_color || 'var(--brand-primary)' }}>
              {submitting ? 'Saving…' : allAnswered ? 'Submit my answers' : `Answer all ${items.length} items to continue`}
            </button>
          </div>
        </form>
      </div>
    </Shell>
  )
}
