import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { reportingService } from '../../services/api'
import { FileBarChart, Plus, X, Check, Lock, Unlock, ChevronRight, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_BADGES = {
  draft: { label: 'Draft', color: 'bg-border-default text-secondary' },
  open: { label: 'Open', color: 'bg-pitch-600/20 text-pitch-400' },
  closed: { label: 'Closed', color: 'bg-amber-400/20 text-amber-400' },
  published: { label: 'Published', color: 'bg-blue-500/20 text-blue-400' },
}

const currentAcademicYear = () => {
  const now = new Date()
  const year = now.getFullYear()
  return now.getMonth() >= 8 ? `${year}-${(year + 1).toString().slice(2)}` : `${year - 1}-${year.toString().slice(2)}`
}

// Confirmation modal for destructive/consequential actions
function ConfirmModal({ title, body, warning, confirmLabel, confirmClass, onConfirm, onCancel }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card rounded-xl border border-border-strong w-full max-w-md mx-4 p-6 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <h2 className="text-lg font-semibold text-primary">{title}</h2>
        </div>
        <div className="text-sm text-secondary space-y-2 mb-4">{body}</div>
        {warning && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-amber-300 mb-5">{warning}</div>
        )}
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 bg-subtle hover:bg-border-default text-secondary rounded-lg text-sm transition-colors">Cancel</button>
          <button onClick={onConfirm} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${confirmClass}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

export default function HoDReporting() {
  const navigate = useNavigate()
  const [windows, setWindows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', academic_year: currentAcademicYear(), term: 'autumn' })
  const [confirm, setConfirm] = useState(null) // { window, action: 'publish'|'close' }

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
      setConfirm(null)
      loadWindows()
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  function requestAction(w, action) {
    setConfirm({ window: w, action })
  }

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="spinner w-8 h-8" /></div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary">Reporting</h1>
          <p className="text-secondary mt-1">Manage reporting windows for the school</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-on-dark rounded-lg text-sm transition-colors"
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
              <div key={w.id} className="bg-card rounded-xl border border-border-default p-5">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigate(`/teacher/hod/reporting/windows/${w.id}`)}
                    className="flex-1 text-left hover:opacity-80 transition-opacity min-w-0 mr-4"
                  >
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-primary">{w.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>{badge.label}</span>
                      <ChevronRight className="w-4 h-4 text-tertiary ml-auto" />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-secondary">
                      <span>{w.academic_year}</span>
                      {w.term && <span className="capitalize">{w.term} term</span>}
                      <span>{w.report_count || 0} reports ({w.submitted_count || 0} submitted, {w.published_count || 0} published)</span>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {w.status === 'draft' && (
                      <button
                        onClick={() => updateStatus(w.id, 'open')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-pitch-600 hover:bg-pitch-700 text-on-dark rounded-lg text-sm transition-colors"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        Open
                      </button>
                    )}
                    {w.status === 'open' && (
                      <button
                        onClick={() => requestAction(w, 'close')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-on-dark rounded-lg text-sm transition-colors"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Close
                      </button>
                    )}
                    {w.status === 'closed' && (
                      <button
                        onClick={() => requestAction(w, 'publish')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-on-dark rounded-lg text-sm transition-colors"
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
        <div className="bg-card rounded-xl border border-border-default p-12 text-center">
          <FileBarChart className="w-8 h-8 text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">No reporting windows yet</h3>
          <p className="text-secondary text-sm max-w-md mx-auto">
            Create a reporting window for each term. Teachers will write reports for their classes when the window is open.
          </p>
        </div>
      )}

      {/* Publish / Close confirmation modals */}
      {confirm?.action === 'publish' && (() => {
        const w = confirm.window
        const total = parseInt(w.submitted_count || 0)
        const drafts = parseInt(w.report_count || 0) - total - parseInt(w.published_count || 0)
        return (
          <ConfirmModal
            title={`Publish "${w.name}"?`}
            body={
              <>
                <p>You are about to publish <strong className="text-primary">{total} report{total !== 1 ? 's' : ''}</strong> to parents and pupils.</p>
                <p>Published reports cannot be recalled. Any future edits would need to be communicated separately.</p>
                <p className="text-secondary text-xs mt-2">{total} reports across this reporting window.</p>
              </>
            }
            warning={drafts > 0 ? `${drafts} report${drafts !== 1 ? 's are' : ' is'} still in draft and will not be included. Continue without them?` : null}
            confirmLabel={`Publish ${total} report${total !== 1 ? 's' : ''}`}
            confirmClass="bg-blue-600 hover:bg-blue-700 text-on-dark"
            onConfirm={() => updateStatus(w.id, 'published')}
            onCancel={() => setConfirm(null)}
          />
        )
      })()}

      {confirm?.action === 'close' && (() => {
        const w = confirm.window
        return (
          <ConfirmModal
            title={`Close "${w.name}"?`}
            body={
              <p>Closing this window prevents further report submissions. This can be reopened later if needed.</p>
            }
            warning={null}
            confirmLabel="Close window"
            confirmClass="bg-amber-500 hover:bg-amber-600 text-on-dark"
            onConfirm={() => updateStatus(w.id, 'closed')}
            onCancel={() => setConfirm(null)}
          />
        )
      })()}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card rounded-xl border border-border-strong w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-primary">New Reporting Window</h2>
              <button onClick={() => setShowCreate(false)} className="text-secondary hover:text-link"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-secondary mb-1">Name</label>
                <input type="text" placeholder="e.g., Autumn Term Reports 2025" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-primary text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-secondary mb-1">Academic Year</label>
                  <input type="text" value={form.academic_year}
                    onChange={e => setForm({ ...form, academic_year: e.target.value })}
                    className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-primary text-sm focus:outline-none focus:border-pitch-500" />
                </div>
                <div>
                  <label className="block text-sm text-secondary mb-1">Term</label>
                  <select value={form.term} onChange={e => setForm({ ...form, term: e.target.value })}
                    className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-primary text-sm focus:outline-none focus:border-pitch-500">
                    <option value="autumn">Autumn</option>
                    <option value="spring">Spring</option>
                    <option value="summer">Summer</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2.5 bg-subtle hover:bg-border-default text-secondary rounded-lg text-sm transition-colors">Cancel</button>
                <button type="submit" disabled={creating}
                  className="flex-1 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-on-dark rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
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
