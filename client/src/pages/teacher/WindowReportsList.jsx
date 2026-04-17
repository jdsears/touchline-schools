import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { reportingService } from '../../services/api'
import { ArrowLeft, Search, Download } from 'lucide-react'

const STATUS_BADGE = {
  draft: 'bg-navy-700 text-navy-300',
  submitted: 'bg-amber-400/20 text-amber-400',
  published: 'bg-blue-500/20 text-blue-400',
}

const WINDOW_STATUS_BADGE = {
  draft: 'bg-navy-700 text-navy-300',
  open: 'bg-pitch-600/20 text-pitch-400',
  closed: 'bg-amber-400/20 text-amber-400',
  published: 'bg-blue-500/20 text-blue-400',
}

function exportCSV(reports) {
  const header = ['Pupil Name', 'Year Group', 'Class', 'Sport', 'Attainment', 'Effort', 'Status', 'Last Modified', 'Comment']
  const rows = reports.map(r => [
    `${r.first_name} ${r.last_name}`,
    r.year_group,
    r.class_name || '',
    r.unit_name || r.sport || '',
    r.attainment_grade || '',
    r.effort_grade || '',
    r.status,
    r.updated_at ? new Date(r.updated_at).toLocaleDateString('en-GB') : '',
    (r.teacher_comment || '').replace(/"/g, '""'),
  ])
  const csv = [header, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'reports.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function WindowReportsList() {
  const { windowId } = useParams()
  const navigate = useNavigate()
  const [window_, setWindow_] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    Promise.all([
      reportingService.getWindows(),
      reportingService.getWindowReports(windowId),
    ]).then(([wRes, rRes]) => {
      setWindow_((wRes.data || []).find(w => w.id === windowId) || null)
      setReports(rRes.data || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [windowId])

  const groups = useMemo(() => [...new Set(reports.map(r => r.class_name).filter(Boolean))].sort(), [reports])
  const [groupFilter, setGroupFilter] = useState('all')

  const filtered = useMemo(() => reports.filter(r => {
    const name = `${r.first_name} ${r.last_name}`.toLowerCase()
    if (search && !name.includes(search.toLowerCase())) return false
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (groupFilter !== 'all' && r.class_name !== groupFilter) return false
    return true
  }), [reports, search, statusFilter, groupFilter])

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="spinner w-8 h-8" /></div>

  const wb = window_ ? (WINDOW_STATUS_BADGE[window_.status] || '') : ''

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <button onClick={() => navigate('/teacher/hod/reporting')} className="flex items-center gap-1.5 text-navy-400 hover:text-white text-sm mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Reporting Windows
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{window_?.name || 'Reports'}</h1>
            {window_ && <span className={`px-2 py-0.5 rounded text-xs font-medium ${wb}`}>{window_.status}</span>}
          </div>
          <p className="text-navy-400 text-sm mt-1">
            {window_?.academic_year} {window_?.term && `· ${window_.term} term`} · {reports.length} reports
          </p>
        </div>
        <button onClick={() => exportCSV(filtered)} className="flex items-center gap-2 px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-lg text-sm transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by pupil name…" className="input pl-9 w-full" />
        </div>
        <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)} className="input w-44">
          <option value="all">All groups</option>
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-36">
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="published">Published</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-10 text-center text-navy-400">No reports match your filters.</div>
      ) : (
        <div className="bg-navy-900 rounded-xl border border-navy-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-800 text-left text-xs text-navy-500 uppercase tracking-wide">
                <th className="px-4 py-3">Pupil</th>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Sport / Unit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Modified</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/teacher/hod/reporting/windows/${windowId}/reports/${r.id}`)}
                  className="border-b border-navy-800/60 hover:bg-navy-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-white">{r.first_name} {r.last_name}</td>
                  <td className="px-4 py-3 text-navy-400">Yr {r.year_group}</td>
                  <td className="px-4 py-3 text-navy-400">{r.class_name || '—'}</td>
                  <td className="px-4 py-3 text-navy-400">{r.unit_name || r.sport || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_BADGE[r.status] || ''}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-navy-400">{r.updated_at ? new Date(r.updated_at).toLocaleDateString('en-GB') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
