import { useState, useEffect } from 'react'
import { settingsService } from '../../../services/api'
import { Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const NOTIFICATION_ITEMS = [
  { key: 'fixture_reminders',    label: 'Fixture reminders',          desc: 'Day before and morning of each fixture' },
  { key: 'assessment_deadlines', label: 'Assessment deadlines',       desc: 'When an assessment window is closing' },
  { key: 'report_due_dates',     label: 'Report due dates',           desc: 'When a reporting window closes' },
  { key: 'pupil_observations',   label: 'Pupil observations',         desc: 'Observations flagged to you' },
  { key: 'safeguarding_concerns',label: 'Safeguarding concerns',      desc: 'For DSLs and deputies only' },
  { key: 'weekly_digest',        label: 'Weekly digest',              desc: 'Summary of activity each Monday' },
  { key: 'monthly_summary',      label: 'Monthly school summary',     desc: 'School-wide overview (admins)' },
  { key: 'product_updates',      label: 'Product updates from MoonBoots', desc: 'New features and announcements (opt-in)' },
]

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${
        checked ? 'bg-pitch-600' : 'bg-navy-700'
      } ${disabled ? 'cursor-default opacity-50' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-0.5'
      }`} />
    </button>
  )
}

export default function NotificationsTab() {
  const [prefs, setPrefs]   = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    settingsService.getNotifications()
      .then(r => setPrefs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function toggle(key) {
    setPrefs(p => ({ ...p, [key]: !p[key] }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await settingsService.updateNotifications(prefs)
      toast.success('Notification preferences saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-navy-400" />
    </div>
  )

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Notifications</h2>
        <p className="text-sm text-navy-400 mt-1">Choose which events send you email notifications.</p>
      </div>

      <div className="bg-navy-900 rounded-xl border border-navy-800 divide-y divide-navy-800">
        {NOTIFICATION_ITEMS.map(item => (
          <div key={item.key} className="flex items-center justify-between px-5 py-4">
            <div className="flex-1 min-w-0 pr-4">
              <div className="text-sm text-white">{item.label}</div>
              <div className="text-xs text-navy-500 mt-0.5">{item.desc}</div>
            </div>
            <Toggle
              checked={!!prefs[item.key]}
              onChange={() => toggle(item.key)}
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Preferences
      </button>
    </div>
  )
}
