import { useState, useEffect } from 'react'
import { settingsService } from '../../../services/api'
import { Save, Loader2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

const SPORTS = ['football','rugby','cricket','hockey','netball','basketball','athletics','swimming']
const TRAVEL = ['Coach','Minibus','Parent lifts','Public transport','Walking distance']

export default function FixtureDefaultsTab({ access }) {
  const [defaults, setDefaults] = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(null)
  const [form, setForm] = useState({
    sport_key: 'football', age_group: 'all',
    match_duration_minutes: 90, default_home_ground_address: '',
    default_travel_arrangement: 'Minibus',
  })
  const canEdit = access?.isAdmin || access?.isHoD

  useEffect(() => {
    settingsService.getFixtureDefaults()
      .then(r => setDefaults(r.data.defaults || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    if (!canEdit) return
    setSaving(true)
    try {
      await settingsService.updateFixtureDefaults(form)
      toast.success('Fixture defaults saved')
      settingsService.getFixtureDefaults().then(r => setDefaults(r.data.defaults || []))
    } catch (err) {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-secondary" />
    </div>
  )

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary">Fixture Defaults</h2>
        <p className="text-sm text-secondary mt-1">
          Default settings applied when creating new fixtures.
          {!canEdit && <span className="ml-2 text-amber-400">View only.</span>}
        </p>
      </div>

      {canEdit && (
        <form onSubmit={handleSave} className="bg-card rounded-xl border border-border-default p-5 space-y-4">
          <h3 className="text-sm font-semibold text-primary">Add / Update Default</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-secondary mb-1">Sport</label>
              <select
                value={form.sport_key}
                onChange={e => setForm(f => ({ ...f, sport_key: e.target.value }))}
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-primary text-sm focus:outline-none focus:border-pitch-500 capitalize"
              >
                {SPORTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Match Duration (mins)</label>
              <input
                type="number"
                value={form.match_duration_minutes}
                onChange={e => setForm(f => ({ ...f, match_duration_minutes: parseInt(e.target.value) || 90 }))}
                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-primary text-sm focus:outline-none focus:border-pitch-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">Home Ground Address</label>
            <input
              type="text"
              value={form.default_home_ground_address}
              onChange={e => setForm(f => ({ ...f, default_home_ground_address: e.target.value }))}
              placeholder="e.g. School playing fields, High Street, Town"
              className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-primary text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500"
            />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">Default Travel</label>
            <select
              value={form.default_travel_arrangement}
              onChange={e => setForm(f => ({ ...f, default_travel_arrangement: e.target.value }))}
              className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-primary text-sm focus:outline-none focus:border-pitch-500"
            >
              {TRAVEL.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={!!saving}
            className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-700 text-on-dark rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Default
          </button>
        </form>
      )}

      {defaults.length > 0 && (
        <div className="bg-card rounded-xl border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th className="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase">Sport</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase">Travel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800">
              {defaults.map(d => (
                <tr key={d.id}>
                  <td className="px-4 py-3 text-primary capitalize">{d.sport_key}</td>
                  <td className="px-4 py-3 text-secondary">{d.match_duration_minutes} min</td>
                  <td className="px-4 py-3 text-secondary">{d.default_travel_arrangement || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
