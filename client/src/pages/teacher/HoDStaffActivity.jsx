import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { hodService } from '../../services/api'
import { UserCog, Download, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react'

const ROLE_LABELS = {
  owner: 'Owner', school_admin: 'School Admin', admin: 'School Admin',
  head_of_pe: 'Head of PE', head_of_sport: 'Head of Sport',
  teacher: 'Teacher', coach: 'Coach',
}

const PERIODS = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'term', label: 'Last 90 days' },
]

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function toCSV(data) {
  const headers = ['Name', 'Email', 'Role', 'Observations', 'Reports', 'Classes', 'Sports']
  const rows = data.staff.map(s => [
    s.name, s.email, ROLE_LABELS[s.role] || s.role,
    s.observations_logged, s.reports_updated, s.classes_taught,
    (s.sports || []).join('; '),
  ])
  return [headers, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
}

export default function HoDStaffActivity() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('week')
  const [sort, setSort] = useState('observations_logged')

  useEffect(() => {
    setLoading(true)
    setError(null)
    hodService.getStaffActivityReport({ period })
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load staff activity report'))
      .finally(() => setLoading(false))
  }, [period])

  function downloadCSV() {
    if (!data) return
    const csv = toCSV(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `staff-activity-${data.start}-to-${data.end}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sortedStaff = [...(data?.staff || [])].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name)
    return (b[sort] || 0) - (a[sort] || 0)
  })

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <Link to="/teacher/hod" className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-link transition-colors">
        <ArrowLeft className="w-4 h-4" />Back to School Overview
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-primary flex items-center gap-3">
            <UserCog className="w-6 h-6 text-amber-400" />
            Staff Activity Report
          </h1>
          {data && (
            <p className="text-secondary text-sm mt-0.5">{formatDate(data.start)} – {formatDate(data.end)}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-border-strong">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-xs transition-colors ${
                  period === p.value ? 'bg-pitch-600 text-on-dark' : 'bg-subtle hover:bg-border-default text-secondary'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={downloadCSV}
            disabled={!data}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-subtle hover:bg-border-default text-primary text-xs rounded-lg border border-border-strong transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />Export CSV
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-pitch-400 animate-spin" />
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mb-3" />
          <p className="text-secondary text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Staff tracked" value={data.total_staff} />
            <Stat label="Active staff" value={data.totals.active_staff} />
            <Stat label="Observations" value={data.totals.observations_logged} />
            <Stat label="Reports updated" value={data.totals.reports_updated} />
          </div>

          <div className="bg-card rounded-xl border border-border-default overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-subtle text-secondary text-xs uppercase tracking-wide">
                  <tr>
                    <Th label="Name" col="name" sort={sort} setSort={setSort} />
                    <th className="px-4 py-3 text-left">Role</th>
                    <Th label="Obs" col="observations_logged" sort={sort} setSort={setSort} align="right" />
                    <Th label="Reports" col="reports_updated" sort={sort} setSort={setSort} align="right" />
                    <Th label="Classes" col="classes_taught" sort={sort} setSort={setSort} align="right" />
                    <th className="px-4 py-3 text-left">Sports</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStaff.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-tertiary">No staff to display</td></tr>
                  ) : sortedStaff.map(s => (
                    <tr key={s.id} className="border-t border-border-default hover:bg-subtle transition-colors">
                      <td className="px-4 py-3 text-primary">{s.name}<div className="text-xs text-tertiary">{s.email}</div></td>
                      <td className="px-4 py-3 text-secondary text-xs">{ROLE_LABELS[s.role] || s.role}</td>
                      <td className={`px-4 py-3 text-right font-mono ${s.observations_logged > 0 ? 'text-pitch-400' : 'text-tertiary'}`}>{s.observations_logged}</td>
                      <td className={`px-4 py-3 text-right font-mono ${s.reports_updated > 0 ? 'text-pitch-400' : 'text-tertiary'}`}>{s.reports_updated}</td>
                      <td className="px-4 py-3 text-right font-mono text-secondary">{s.classes_taught}</td>
                      <td className="px-4 py-3 text-xs text-secondary capitalize">{(s.sports || []).join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-card rounded-xl border border-border-default p-4">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-xs text-secondary mt-1">{label}</div>
    </div>
  )
}

function Th({ label, col, sort, setSort, align = 'left' }) {
  const active = sort === col
  return (
    <th className={`px-4 py-3 text-${align}`}>
      <button onClick={() => setSort(col)} className={`hover:text-link transition-colors ${active ? 'text-primary' : ''}`}>
        {label}{active ? ' ↓' : ''}
      </button>
    </th>
  )
}
