import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { teamService, teacherService } from '../../services/api'
import { Plus, Trash2, Copy, Upload, Save, AlertTriangle, Loader2, ArrowLeft, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY_ROW = { date: '', time: '15:00', opponent: '', location: '', isHome: true, kitType: 'home', competition: '', meetTime: '' }

function newRow(defaults = {}) {
  return { ...EMPTY_ROW, ...defaults, _key: crypto.randomUUID() }
}

export default function BlockFixtureCreation() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const fileRef = useRef()
  const [team, setTeam] = useState(null)
  const [rows, setRows] = useState(() => Array.from({ length: 4 }, () => newRow()))
  const [warnings, setWarnings] = useState([])
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [defaults, setDefaults] = useState({ competition: '', kitType: 'home', time: '15:00' })

  useEffect(() => {
    teamService.getTeam(teamId)
      .then(res => { setTeam(res.data); setLoading(false) })
      .catch(() => { toast.error('Team not found'); navigate(-1) })
  }, [teamId])

  function updateRow(idx, field, value) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  function addRow() {
    setRows(prev => [...prev, newRow({ competition: defaults.competition, kitType: defaults.kitType, time: defaults.time })])
  }

  function removeRow(idx) {
    setRows(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx))
  }

  function duplicateRow(idx) {
    setRows(prev => {
      const copy = { ...prev[idx], _key: crypto.randomUUID() }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
  }

  function applyDefault(field) {
    if (!defaults[field]) return
    setRows(prev => prev.map(r => ({ ...r, [field]: defaults[field] })))
    toast.success(`Applied "${defaults[field]}" to all rows`)
  }

  function handleCSV(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const lines = evt.target.result.split('\n').filter(l => l.trim())
      const header = lines[0].toLowerCase()
      const hasHeader = header.includes('date') || header.includes('opponent')
      const dataLines = hasHeader ? lines.slice(1) : lines
      const parsed = dataLines.map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
        return newRow({
          date: cols[0] || '', time: cols[1] || '15:00', opponent: cols[2] || '',
          location: cols[3] || '', isHome: (cols[4] || 'home').toLowerCase() !== 'away',
          kitType: cols[5] || 'home', competition: cols[6] || defaults.competition,
        })
      }).filter(r => r.date || r.opponent)
      if (parsed.length) {
        setRows(parsed)
        toast.success(`Imported ${parsed.length} fixtures from CSV`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function aiGenerate() {
    setGenerating(true)
    try {
      const res = await teamService.generateSeasonFixtures(teamId)
      const fixtures = res.data.fixtures || []
      if (!fixtures.length) { toast.error('AI returned no fixtures'); return }
      const generated = fixtures.map(f => newRow({
        date: f.date || '', time: f.time || '15:00', opponent: f.opponent || '',
        location: f.location || '', isHome: f.isHome !== false,
        kitType: f.kitType || (f.isHome !== false ? 'home' : 'away'),
        competition: f.competition || defaults.competition,
        _assumption: f.assumptions || null,
      }))
      setRows(generated)
      toast.success(`AI drafted ${generated.length} fixtures - review and edit before saving`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI generation failed')
    } finally { setGenerating(false) }
  }

  async function validate() {
    const valid = rows.filter(r => r.date && r.opponent)
    if (!valid.length) { toast.error('Add at least one fixture with date and opponent'); return null }
    try {
      const res = await teamService.validateMatches(teamId, valid.map(r => ({
        date: r.date, time: r.time, opponent: r.opponent, location: r.location,
        isHome: r.isHome, kitType: r.kitType,
      })))
      setWarnings(res.data.warnings || [])
      return valid
    } catch { return valid }
  }

  async function handleSave() {
    const valid = await validate()
    if (!valid) return
    setSaving(true)
    try {
      const payload = valid.map(r => ({
        date: r.date, time: r.time || null, opponent: r.opponent,
        location: r.location || null, isHome: r.isHome,
        kitType: r.kitType, meetTime: r.meetTime || null,
        competition: r.competition || null,
      }))
      const res = await teamService.bulkAddMatches(teamId, payload)
      toast.success(`${res.data.matches?.length || payload.length} fixtures created`)
      navigate(`/teacher/teams/${teamId}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create fixtures')
    } finally { setSaving(false) }
  }

  function warningsForRow(idx) {
    return warnings.filter(w => w.row === idx)
  }

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-6 h-6 animate-spin text-secondary" /></div>

  const validCount = rows.filter(r => r.date && r.opponent).length

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 text-secondary hover:text-link"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-bold text-primary">Block Fixture Creation</h1>
          <p className="text-sm text-secondary">{team?.name} - Add multiple fixtures at once</p>
        </div>
      </div>

      {/* Defaults bar */}
      <div className="bg-card border border-border-default rounded-xl p-3 flex flex-wrap items-end gap-3">
        <span className="text-xs text-tertiary font-medium uppercase tracking-wider self-center">Defaults:</span>
        <label className="text-xs text-secondary">
          Kick-off
          <input type="time" value={defaults.time} onChange={e => setDefaults(d => ({ ...d, time: e.target.value }))}
            className="block mt-1 bg-subtle border border-border-strong rounded px-2 py-1 text-sm text-primary w-24" />
        </label>
        <label className="text-xs text-secondary">
          Competition
          <input value={defaults.competition} onChange={e => setDefaults(d => ({ ...d, competition: e.target.value }))}
            placeholder="e.g. League" className="block mt-1 bg-subtle border border-border-strong rounded px-2 py-1 text-sm text-primary w-28" />
        </label>
        <button onClick={() => applyDefault('competition')} className="text-xs text-pitch-400 hover:text-pitch-300 mb-0.5">Apply to all</button>
        <label className="text-xs text-secondary">
          Kit
          <select value={defaults.kitType} onChange={e => setDefaults(d => ({ ...d, kitType: e.target.value }))}
            className="block mt-1 bg-subtle border border-border-strong rounded px-2 py-1 text-sm text-primary">
            <option value="home">Home</option><option value="away">Away</option><option value="third">3rd</option>
          </select>
        </label>
        <div className="ml-auto flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-subtle hover:bg-border-default text-secondary rounded-lg border border-border-strong">
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </button>
          <button onClick={aiGenerate} disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-primary rounded-lg">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {generating ? 'Generating...' : 'AI Assist'}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-card border border-border-default rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default text-secondary text-xs uppercase tracking-wider">
              <th className="px-2 py-2 text-left w-8">#</th>
              <th className="px-2 py-2 text-left">Date *</th>
              <th className="px-2 py-2 text-left w-20">Time</th>
              <th className="px-2 py-2 text-left">Opponent *</th>
              <th className="px-2 py-2 text-left">Venue</th>
              <th className="px-2 py-2 text-center w-16">H/A</th>
              <th className="px-2 py-2 text-center w-16">Kit</th>
              <th className="px-2 py-2 text-left w-24">Competition</th>
              <th className="px-2 py-2 text-left w-20">Meet</th>
              <th className="px-2 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const rw = warningsForRow(idx)
              return (
                <tr key={row._key} className={`border-b border-border-subtle ${rw.length ? 'bg-amber-500/5' : ''}`}>
                  <td className="px-2 py-1.5 text-tertiary">{idx + 1}</td>
                  <td className="px-2 py-1.5">
                    <input type="date" value={row.date} onChange={e => updateRow(idx, 'date', e.target.value)}
                      className="bg-subtle border border-border-strong rounded px-1.5 py-1 text-primary w-full" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="time" value={row.time} onChange={e => updateRow(idx, 'time', e.target.value)}
                      className="bg-subtle border border-border-strong rounded px-1.5 py-1 text-primary w-full" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={row.opponent} onChange={e => updateRow(idx, 'opponent', e.target.value)}
                      placeholder="Team name" className="bg-subtle border border-border-strong rounded px-1.5 py-1 text-primary w-full" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={row.location} onChange={e => updateRow(idx, 'location', e.target.value)}
                      placeholder="Venue" className="bg-subtle border border-border-strong rounded px-1.5 py-1 text-primary w-full" />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button onClick={() => updateRow(idx, 'isHome', !row.isHome)}
                      className={`px-2 py-1 rounded text-xs font-medium ${row.isHome ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {row.isHome ? 'H' : 'A'}
                    </button>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <select value={row.kitType} onChange={e => updateRow(idx, 'kitType', e.target.value)}
                      className="bg-subtle border border-border-strong rounded px-1 py-1 text-primary text-xs w-full">
                      <option value="home">H</option><option value="away">A</option><option value="third">3rd</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={row.competition} onChange={e => updateRow(idx, 'competition', e.target.value)}
                      placeholder="" className="bg-subtle border border-border-strong rounded px-1.5 py-1 text-primary w-full text-xs" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="time" value={row.meetTime} onChange={e => updateRow(idx, 'meetTime', e.target.value)}
                      className="bg-subtle border border-border-strong rounded px-1.5 py-1 text-primary w-full" />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex gap-1">
                      <button onClick={() => duplicateRow(idx)} title="Duplicate" className="p-1 text-tertiary hover:text-secondary"><Copy className="w-3.5 h-3.5" /></button>
                      <button onClick={() => removeRow(idx)} title="Remove" className="p-1 text-tertiary hover:text-alert-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    {row._assumption && (
                      <div className="text-[10px] text-purple-400 mt-0.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 shrink-0" />{row._assumption}
                      </div>
                    )}
                    {rw.map((w, wi) => (
                      <div key={wi} className="flex items-center gap-1 text-[10px] text-amber-400 mt-0.5">
                        <AlertTriangle className="w-3 h-3 shrink-0" />{w.message}
                      </div>
                    ))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button onClick={addRow}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-secondary hover:text-link bg-subtle hover:bg-border-default rounded-lg border border-border-strong">
          <Plus className="w-4 h-4" /> Add row
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-secondary">{validCount} fixture{validCount !== 1 ? 's' : ''} ready</span>
          <button onClick={handleSave} disabled={saving || validCount === 0}
            className="flex items-center gap-2 px-5 py-2 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-primary rounded-lg font-medium text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Creating...' : `Create ${validCount} fixture${validCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
