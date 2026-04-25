import { useState, useEffect } from 'react'
import { settingsService } from '../../../services/api'
import { Loader2, Search } from 'lucide-react'

function formatAction(action) {
  return (action || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function AuditLogTab() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    settingsService.getAuditLog({ limit: 100 })
      .then(r => setEntries(r.data.entries || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = entries.filter(e =>
    !search ||
    e.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.action?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-secondary" />
    </div>
  )

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary">Audit Log</h2>
        <p className="text-sm text-secondary mt-1">
          Significant platform actions for governance and safeguarding review. Retained for 12 months.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by user or action..."
          className="w-full pl-9 pr-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-primary text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500"
        />
      </div>

      <div className="bg-card rounded-xl border border-border-default overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default">
              <th className="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wide">Date / Time</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wide">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-800">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-tertiary text-sm">
                  {search ? 'No matching entries.' : 'No audit log entries yet.'}
                </td>
              </tr>
            )}
            {filtered.map(e => (
              <tr key={e.id} className="hover:bg-subtle transition-colors">
                <td className="px-4 py-3 text-xs text-secondary whitespace-nowrap">
                  {new Date(e.created_at).toLocaleString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </td>
                <td className="px-4 py-3 text-primary">{e.user_name || 'System'}</td>
                <td className="px-4 py-3 text-secondary">{formatAction(e.action)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
