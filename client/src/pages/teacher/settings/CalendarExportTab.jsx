import { useState, useEffect } from 'react'
import { calendarService } from '../../../services/api'
import { Calendar, Copy, RefreshCw, Trash2, Plus, Check, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const SCOPE_LABELS = {
  teacher_schedule: 'My full schedule (classes, fixtures, training)',
  team_fixtures: 'Team fixtures',
  school_fixtures: 'All school fixtures',
}

function feedUrl(token) {
  return `${window.location.origin}/api/calendar/feed/${token}.ics`
}

export default function CalendarExportTab() {
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    calendarService.getTokens()
      .then(r => setTokens(r.data))
      .catch(() => toast.error('Failed to load calendar tokens'))
      .finally(() => setLoading(false))
  }, [])

  async function createToken(scope) {
    try {
      const res = await calendarService.createToken(scope)
      setTokens(prev => [...prev, { ...res.data }])
      toast.success('Calendar subscription created')
    } catch { toast.error('Failed to create token') }
  }

  async function revokeToken(id) {
    try {
      await calendarService.revokeToken(id)
      setTokens(prev => prev.filter(t => t.id !== id))
      toast.success('Subscription revoked')
    } catch { toast.error('Failed to revoke') }
  }

  function copyUrl(token, id) {
    navigator.clipboard.writeText(feedUrl(token)).then(() => {
      setCopied(id)
      toast.success('URL copied to clipboard')
      setTimeout(() => setCopied(null), 2000)
    })
  }

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-6 h-6" /></div>

  const hasSchedule = tokens.some(t => t.scope === 'teacher_schedule')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-primary mb-1">Calendar Export</h2>
        <p className="text-sm text-secondary">Subscribe to your schedule in Outlook, Google Calendar, or Apple Calendar.</p>
      </div>

      {/* Quick setup */}
      {!hasSchedule && (
        <div className="bg-subtle border border-border-strong rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-pitch-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-primary mb-1">Get started</h3>
              <p className="text-xs text-secondary mb-3">
                Generate a subscription URL to see all your classes, fixtures, and training sessions in your personal calendar.
              </p>
              <button onClick={() => createToken('teacher_schedule')} className="flex items-center gap-2 px-3 py-2 bg-pitch-600 hover:bg-pitch-700 text-on-dark text-sm rounded-lg transition-colors">
                <Plus className="w-4 h-4" />Generate my schedule URL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active subscriptions */}
      {tokens.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-secondary">Active subscriptions</h3>
          {tokens.map(t => (
            <div key={t.id} className="bg-card border border-border-default rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-primary">{SCOPE_LABELS[t.scope] || t.scope}</span>
                <button onClick={() => revokeToken(t.id)} className="p-1.5 text-tertiary hover:text-red-400 transition-colors" title="Revoke">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {t.token && (
                <div className="flex items-center gap-2">
                  <input readOnly value={feedUrl(t.token)} className="flex-1 bg-subtle border border-border-strong rounded-lg px-3 py-2 text-xs text-secondary font-mono truncate" />
                  <button onClick={() => copyUrl(t.token, t.id)} className="p-2 bg-subtle hover:bg-border-default border border-border-strong rounded-lg transition-colors" title="Copy">
                    {copied === t.id ? <Check className="w-4 h-4 text-pitch-400" /> : <Copy className="w-4 h-4 text-secondary" />}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-subtle border border-border-default rounded-xl p-5">
        <h3 className="text-sm font-semibold text-primary mb-3">How to subscribe</h3>
        <div className="space-y-3 text-xs text-secondary">
          <div><span className="text-secondary font-medium">Google Calendar:</span> Settings &gt; Add other calendars &gt; From URL &gt; paste the subscription URL</div>
          <div><span className="text-secondary font-medium">Outlook:</span> Add calendar &gt; Subscribe from web &gt; paste the subscription URL</div>
          <div><span className="text-secondary font-medium">Apple Calendar:</span> File &gt; New Calendar Subscription &gt; paste the subscription URL</div>
        </div>
        <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-xs text-amber-400">Keep your subscription URL private. Anyone with the URL can view your schedule. If it's compromised, revoke it and generate a new one.</p>
        </div>
      </div>

      {/* Additional scope buttons */}
      {hasSchedule && (
        <div className="flex flex-wrap gap-2">
          {!tokens.some(t => t.scope === 'school_fixtures') && (
            <button onClick={() => createToken('school_fixtures')} className="flex items-center gap-2 px-3 py-2 bg-subtle hover:bg-border-default text-secondary text-xs rounded-lg border border-border-strong transition-colors">
              <Plus className="w-3.5 h-3.5" />School fixtures feed
            </button>
          )}
        </div>
      )}
    </div>
  )
}
