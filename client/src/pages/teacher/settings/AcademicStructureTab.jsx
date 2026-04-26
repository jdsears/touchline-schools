import { useState, useEffect } from 'react'
import { settingsService } from '../../../services/api'
import { Save, Loader2, Check, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'

const ALL_YEAR_GROUPS = [2,3,4,5,6,7,8,9,10,11,12,13]
const TERMS = ['autumn', 'spring', 'summer']

export default function AcademicStructureTab({ access }) {
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [newHouse, setNewHouse] = useState('')
  const canEdit = access?.isAdmin

  useEffect(() => {
    settingsService.getAcademicStructure()
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load academic structure'))
      .finally(() => setLoading(false))
  }, [])

  function toggleYear(yr) {
    if (!canEdit) return
    setData(d => {
      const yrs = d.year_groups_offered || []
      return {
        ...d,
        year_groups_offered: yrs.includes(yr) ? yrs.filter(y => y !== yr) : [...yrs, yr].sort((a,b)=>a-b),
      }
    })
  }

  function addHouse() {
    const name = newHouse.trim()
    if (!name) return
    setData(d => ({
      ...d,
      house_system: { names: [...(d.house_system?.names || []), name] },
    }))
    setNewHouse('')
  }

  function removeHouse(name) {
    setData(d => ({
      ...d,
      house_system: { names: (d.house_system?.names || []).filter(h => h !== name) },
    }))
  }

  async function handleSave() {
    if (!canEdit) return
    setSaving(true)
    try {
      await settingsService.updateAcademicStructure(data)
      toast.success('Academic structure saved')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !data) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-secondary" />
    </div>
  )

  const yearGroups  = data.year_groups_offered || []
  const houseNames  = data.house_system?.names || []

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary">Academic Structure</h2>
        <p className="text-sm text-secondary mt-1">
          Year groups, house system, and term configuration for your school.
          {!canEdit && <span className="ml-2 text-amber-400">View only.</span>}
        </p>
      </div>

      {/* Year groups */}
      <div className="bg-card rounded-xl border border-border-default p-5">
        <h3 className="text-sm font-semibold text-primary mb-3">Year Groups Offered</h3>
        <div className="flex flex-wrap gap-2">
          {ALL_YEAR_GROUPS.map(yr => {
            const active = yearGroups.includes(yr)
            return (
              <button
                key={yr}
                type="button"
                onClick={() => toggleYear(yr)}
                disabled={!canEdit}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                  active
                    ? 'border-pitch-600/50 bg-pitch-600/10 text-pitch-400'
                    : 'border-border-strong bg-subtle text-tertiary'
                } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {active && <Check className="w-3 h-3" />}
                Year {yr}
              </button>
            )
          })}
        </div>
      </div>

      {/* House system */}
      <div className="bg-card rounded-xl border border-border-default p-5">
        <h3 className="text-sm font-semibold text-primary mb-3">House System</h3>
        {houseNames.length === 0 ? (
          <p className="text-sm text-tertiary mb-3">No house system configured.</p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-3">
            {houseNames.map(h => (
              <span key={h} className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-400/10 border border-amber-400/30 text-amber-400 rounded-lg text-sm">
                {h}
                {canEdit && (
                  <button onClick={() => removeHouse(h)} className="hover:text-red-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        {canEdit && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newHouse}
              onChange={e => setNewHouse(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addHouse())}
              placeholder="Add house name..."
              className="flex-1 px-3 py-2 bg-subtle border border-border-strong rounded-lg text-primary text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500"
            />
            <button
              type="button"
              onClick={addHouse}
              className="px-3 py-2 bg-pitch-600 hover:bg-pitch-700 text-on-dark rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Term dates placeholder */}
      <div className="bg-card rounded-xl border border-border-default p-5">
        <h3 className="text-sm font-semibold text-primary mb-1">Term Dates</h3>
        <p className="text-xs text-tertiary mb-3">Set start and end dates for each term.</p>
        <div className="space-y-3">
          {TERMS.map(term => {
            const td = (data.term_dates || []).find(t => t.term === term) || {}
            return (
              <div key={term} className="grid grid-cols-3 gap-3 items-center">
                <span className="text-sm text-primary capitalize">{term} term</span>
                <div>
                  <label className="text-xs text-tertiary mb-1 block">Start</label>
                  <input
                    type="date"
                    value={td.start || ''}
                    readOnly={!canEdit}
                    onChange={e => {
                      if (!canEdit) return
                      setData(d => {
                        const dates = [...(d.term_dates || [])]
                        const idx = dates.findIndex(t => t.term === term)
                        if (idx >= 0) dates[idx] = { ...dates[idx], start: e.target.value }
                        else dates.push({ term, start: e.target.value, end: '' })
                        return { ...d, term_dates: dates }
                      })
                    }}
                    className="w-full px-2 py-1.5 bg-subtle border border-border-strong rounded-lg text-primary text-xs focus:outline-none focus:border-pitch-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-tertiary mb-1 block">End</label>
                  <input
                    type="date"
                    value={td.end || ''}
                    readOnly={!canEdit}
                    onChange={e => {
                      if (!canEdit) return
                      setData(d => {
                        const dates = [...(d.term_dates || [])]
                        const idx = dates.findIndex(t => t.term === term)
                        if (idx >= 0) dates[idx] = { ...dates[idx], end: e.target.value }
                        else dates.push({ term, start: '', end: e.target.value })
                        return { ...d, term_dates: dates }
                      })
                    }}
                    className="w-full px-2 py-1.5 bg-subtle border border-border-strong rounded-lg text-primary text-xs focus:outline-none focus:border-pitch-500"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {canEdit && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-on-dark rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Academic Structure
        </button>
      )}
    </div>
  )
}
