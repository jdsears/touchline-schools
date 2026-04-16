import { useState, useEffect } from 'react'
import { settingsService } from '../../../services/api'
import { Save, Loader2, Trash2, Plus, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const QUAL_TYPES = [
  { value: 'qts',          label: 'QTS / Teaching Qualification' },
  { value: 'coaching',     label: 'NGB Coaching Badge' },
  { value: 'safeguarding', label: 'Safeguarding Training' },
  { value: 'first_aid',   label: 'First Aid' },
  { value: 'dbs',          label: 'DBS Check' },
  { value: 'other',        label: 'Other' },
]

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
}

export default function QualificationsTab() {
  const [quals, setQuals]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]    = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState({
    qualification_type: 'coaching',
    qualification_name: '',
    issue_date: '',
    expiry_date: '',
    reference_number: '',
  })

  function loadQuals() {
    settingsService.getQualifications()
      .then(r => setQuals(r.data.qualifications || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadQuals() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.qualification_name.trim()) return toast.error('Name required')
    setSaving(true)
    try {
      await settingsService.addQualification(form)
      toast.success('Qualification added')
      setShowForm(false)
      setForm({ qualification_type: 'coaching', qualification_name: '', issue_date: '', expiry_date: '', reference_number: '' })
      loadQuals()
    } catch {
      toast.error('Failed to add')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this qualification?')) return
    setDeleting(id)
    try {
      await settingsService.removeQualification(id)
      setQuals(q => q.filter(x => x.id !== id))
      toast.success('Removed')
    } catch {
      toast.error('Failed to remove')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-navy-400" />
    </div>
  )

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Qualifications</h2>
          <p className="text-sm text-navy-400 mt-1">Your coaching badges, teaching qualifications, and compliance training.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-navy-900 rounded-xl border border-navy-800 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">New Qualification</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-navy-400 mb-1">Type</label>
              <select
                value={form.qualification_type}
                onChange={e => setForm(f => ({ ...f, qualification_type: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-pitch-500"
              >
                {QUAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Name / Course</label>
              <input
                value={form.qualification_name}
                onChange={e => setForm(f => ({ ...f, qualification_name: e.target.value }))}
                placeholder="e.g. FA UEFA C Licence"
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder:text-navy-500 focus:outline-none focus:border-pitch-500"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Issue Date</label>
              <input type="date" value={form.issue_date}
                onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-pitch-500" />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Expiry Date (if applicable)</label>
              <input type="date" value={form.expiry_date}
                onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-pitch-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-navy-400 mb-1">Reference Number (optional)</label>
            <input value={form.reference_number}
              onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-pitch-500" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-navy-300 rounded-lg text-sm transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {quals.length === 0 && !showForm && (
          <div className="bg-navy-900 rounded-xl border border-navy-800 p-6 text-center text-navy-500 text-sm">
            No qualifications recorded yet.
          </div>
        )}
        {quals.map(q => {
          const days = daysUntil(q.expiry_date)
          const expired = days !== null && days < 0
          const expiring = days !== null && days >= 0 && days < 60
          return (
            <div key={q.id} className="flex items-start justify-between bg-navy-900 rounded-xl border border-navy-800 p-4 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{q.qualification_name}</span>
                  {(expired || expiring) && (
                    <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${expired ? 'bg-red-500/20 text-red-400' : 'bg-amber-400/20 text-amber-400'}`}>
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {expired ? 'Expired' : `${days}d left`}
                    </span>
                  )}
                </div>
                <div className="text-xs text-navy-500 mt-0.5">
                  {QUAL_TYPES.find(t => t.value === q.qualification_type)?.label || q.qualification_type}
                  {q.issue_date && ` · Issued ${new Date(q.issue_date).toLocaleDateString('en-GB')}`}
                  {q.expiry_date && ` · Expires ${new Date(q.expiry_date).toLocaleDateString('en-GB')}`}
                </div>
              </div>
              <button
                onClick={() => handleDelete(q.id)}
                disabled={deleting === q.id}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-navy-600 hover:text-red-400 transition-all ml-3 flex-shrink-0"
              >
                {deleting === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
