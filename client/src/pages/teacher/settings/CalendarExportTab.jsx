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
        <h2 className="text-lg font-semibold text-white mb-1">Calendar Export</h2>
        <p className="text-sm text-navy-400">Subscribe to your schedule in Outlook, Google Calendar, or Apple Calendar.</p>
      </div>

      {/* Quick setup */}
      {!hasSchedule && (
        <div className="bg-navy-800/50 border border-navy-700 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-pitch-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-white mb-1">Get started</h3>
              <p className="text-xs text-navy-400 mb-3">
                Generate a subscription URL to see all your classes, fixtures, and training sessions in your personal calendar.
              </p>
              <button onClick={() => createToken('teacher_schedule')} className="flex items-center gap-2 px-3 py-2 bg-pitch-600 hover:bg-pitch-700 text-white text-sm rounded-lg transition-colors">
                <Plus className="w-4 h-4" />Generate my schedule URL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active subscriptions */}
      {tokens.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-navy-300">Active subscriptions</h3>
          {tokens.map(t => (
            <div key={t.id} className="bg-navy-900 border border-navy-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{SCOPE_LABELS[t.scope] || t.scope}</span>
                <button onClick={() => revokeToken(t.id)} className="p-1.5 text-navy-500 hover:text-red-400 transition-colors" title="Revoke">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {t.token && (
                <div className="flex items-center gap-2">
                  <input readOnly value={feedUrl(t.token)} className="flex-1 bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-xs text-navy-300 font-mono truncate" />
                  <button onClick={() => copyUrl(t.token, t.id)} className="p-2 bg-navy-800 hover:bg-navy-700 border border-navy-700 rounded-lg transition-colors" title="Copy">
                    {copied === t.id ? <Check className="w-4 h-4 text-pitch-400" /> : <Copy className="w-4 h-4 text-navy-400" />}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-navy-800/30 border border-navy-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">How to subscribe</h3>
        <div className="space-y-3 text-xs text-navy-400">
          <div><span className="text-navy-300 font-medium">Google Calendar:</span> Settings &gt; Add other calendars &gt; From URL &gt; paste the subscription URL</div>
          <div><span className="text-navy-300 font-medium">Outlook:</span> Add calendar &gt; Subscribe from web &gt; paste the subscription URL</div>
          <div><span className="text-navy-300 font-medium">Apple Calendar:</span> File &gt; New Calendar Subscription &gt; paste the subscription URL</div>
        </div>
        <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-xs text-amber-400">Keep your subscription URL private. Anyone with the URL can view your schedule. If it's compromised, revoke it and generate a new one.</p>
        </div>
      </div>

      {/* Additional scope buttons */}
      {hasSchedule && (
        <div className="flex flex-wrap gap-2">
          {!tokens.some(t => t.scope === 'school_fixtures') && (
            <button onClick={() => createToken('school_fixtures')} className="flex items-center gap-2 px-3 py-2 bg-navy-800 hover:bg-navy-700 text-navy-300 text-xs rounded-lg border border-navy-700 transition-colors">
              <Plus className="w-3.5 h-3.5" />School fixtures feed
            </button>
          )}
        </div>
      )}
    </div>
  )
}
