import { useState, useEffect } from 'react'
import { reportingService } from '../../services/api'
import { FileBarChart, Plus, X, Check, Clock, Lock, Unlock } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_BADGES = {
  draft: { label: 'Draft', color: 'bg-navy-700 text-navy-300' },
  open: { label: 'Open', color: 'bg-pitch-600/20 text-pitch-400' },
  closed: { label: 'Closed', color: 'bg-amber-400/20 text-amber-400' },
  published: { label: 'Published', color: 'bg-blue-500/20 text-blue-400' },
}

const currentAcademicYear = () => {
  const now = new Date()
  const year = now.getFullYear()
  return now.getMonth() >= 8 ? `${year}-${(year + 1).toString().slice(2)}` : `${year - 1}-${year.toString().slice(2)}`
}

export default function HoDReporting() {
  const [windows, setWindows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '', academic_year: currentAcademicYear(), term: 'autumn',
  })

  useEffect(() => {
    loadWindows()
  }, [])

  async function loadWindows() {
    try {
      const res = await reportingService.getWindows()
      setWindows(res.data)
    } catch (err) {
      console.error('Failed to load reporting windows:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    setCreating(true)
    try {
      await reportingService.createWindow({
        name: form.name.trim(),
        academic_year: form.academic_year,
        term: form.term,
      })
      toast.success('Reporting window created')
      setShowCreate(false)
      setForm({ name: '', academic_year: currentAcademicYear(), term: 'autumn' })
      loadWindows()
    } catch (err) {
      toast.error('Failed to create')
    } finally {
      setCreating(false)
    }
  }

  async function updateStatus(windowId, newStatus) {
    try {
      await reportingService.updateWindow(windowId, { status: newStatus })
      toast.success(`Reporting window ${newStatus}`)
      loadWindows()
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="spinner w-8 h-8" /></div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Reporting</h1>
          <p className="text-navy-400 mt-1">Manage reporting windows for the school</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Reporting Window
        </button>
      </div>

      {windows.length > 0 ? (
        <div className="space-y-4">
          {windows.map(w => {
            const badge = STATUS_BADGES[w.status] || STATUS_BADGES.draft
            return (
              <div key={w.id} className="bg-navy-900 rounded-xl border border-navy-800 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-white">{w.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>{badge.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-navy-400">
                      <span>{w.academic_year}</span>
                      {w.term && <span className="capitalize">{w.term} term</span>}
                      <span>{w.report_count || 0} reports ({w.submitted_count || 0} submitted, {w.published_count || 0} published)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {w.status === 'draft' && (
                      <button
                        onClick={() => updateStatus(w.id, 'open')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm transition-colors"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        Open
                      </button>
                    )}
                    {w.status === 'open' && (
                      <button
                        onClick={() => updateStatus(w.id, 'closed')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm transition-colors"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Close
                      </button>
                    )}
                    {w.status === 'closed' && (
                      <button
                        onClick={() => updateStatus(w.id, 'published')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Publish
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
          <FileBarChart className="w-8 h-8 text-navy-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No reporting windows yet</h3>
          <p className="text-navy-400 text-sm max-w-md mx-auto">
            Create a reporting window for each term. Teachers will write reports for their classes when the window is open.
          </p>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-navy-900 rounded-xl border border-navy-700 w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">New Reporting Window</h2>
              <button onClick={() => setShowCreate(false)} className="text-navy-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-navy-300 mb-1">Name</label>
                <input type="text" placeholder="e.g., Autumn Term Reports 2025" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder:text-navy-500 focus:outline-none focus:border-pitch-500" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-navy-300 mb-1">Academic Year</label>
                  <input type="text" value={form.academic_year}
                    onChange={e => setForm({ ...form, academic_year: e.target.value })}
                    className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-pitch-500" />
                </div>
                <div>
                  <label className="block text-sm text-navy-300 mb-1">Term</label>
                  <select value={form.term} onChange={e => setForm({ ...form, term: e.target.value })}
                    className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-pitch-500">
                    <option value="autumn">Autumn</option>
                    <option value="spring">Spring</option>
                    <option value="summer">Summer</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2.5 bg-navy-800 hover:bg-navy-700 text-navy-300 rounded-lg text-sm transition-colors">Cancel</button>
                <button type="submit" disabled={creating}
                  className="flex-1 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
