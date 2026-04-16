import { useState, useEffect } from 'react'
import { settingsService } from '../../../services/api'
import { Save, Loader2, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SportsConfigTab({ access }) {
  const [sports, setSports] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const canEdit = access?.isAdmin

  useEffect(() => {
    settingsService.getSportsConfig()
      .then(r => setSports(r.data.sports || []))
      .catch(() => toast.error('Failed to load sports configuration'))
      .finally(() => setLoading(false))
  }, [])

  function toggleSport(key) {
    if (!canEdit) return
    setSports(prev => prev.map(s => s.key === key ? { ...s, active: !s.active } : s))
  }

  async function handleSave() {
    if (!canEdit) return
    setSaving(true)
    try {
      await settingsService.updateSportsConfig(sports)
      toast.success('Sports configuration saved')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-navy-400" />
    </div>
  )

  const activeSports = sports.filter(s => s.active)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Sports Configuration</h2>
        <p className="text-sm text-navy-400 mt-1">
          Select which sports your school offers. Active sports are available for teams, curriculum units, and NGB framework alignment.
          {!canEdit && <span className="ml-2 text-amber-400">View only.</span>}
        </p>
      </div>

      <div className="bg-navy-900 rounded-xl border border-navy-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Active Sports</h3>
          <span className="text-xs text-navy-400">{activeSports.length} of {sports.length} active</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {sports.map(sport => (
            <button
              key={sport.key}
              type="button"
              onClick={() => toggleSport(sport.key)}
              disabled={!canEdit}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                sport.active
                  ? 'border-pitch-600/50 bg-pitch-600/10'
                  : 'border-navy-700 bg-navy-800/30 opacity-60'
              } ${canEdit ? 'cursor-pointer hover:border-pitch-500' : 'cursor-default'}`}
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                sport.active ? 'bg-pitch-600' : 'bg-navy-700'
              }`}>
                {sport.active && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="min-w-0">
                <div className="text-sm text-white font-medium truncate">{sport.label}</div>
                {sport.ngb && (
                  <div className="text-xs text-navy-500 truncate">{sport.ngb}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {canEdit && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Sports Configuration
        </button>
      )}
    </div>
  )
}
