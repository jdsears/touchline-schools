import { useState, useEffect } from 'react'
import { settingsService } from '../../../services/api'
import { Loader2, UserPlus, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLE_LABELS = {
  owner: 'Owner', school_admin: 'School Admin', head_of_pe: 'Head of PE',
  head_of_sport: 'Head of Sport', teacher: 'Teacher', coach: 'Teacher',
  admin: 'Admin', read_only: 'Read Only',
}

function expiryStatus(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  const days = Math.ceil((d - now) / 86400000)
  if (days < 0) return { label: 'Expired', color: 'text-red-400' }
  if (days < 60) return { label: `Expires in ${days}d`, color: 'text-amber-400' }
  return null
}

export default function StaffDirectoryTab({ access }) {
  const [staff, setStaff]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    settingsService.getStaffDirectory()
      .then(r => setStaff(r.data.staff || []))
      .catch(() => toast.error('Failed to load staff directory'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = staff.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-navy-400" />
    </div>
  )

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Staff Directory</h2>
          <p className="text-sm text-navy-400 mt-1">{staff.length} staff members in your school.</p>
        </div>
        {access?.isAdmin && (
          <button
            className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm transition-colors"
            onClick={() => toast('Invite flow coming soon')}
          >
            <UserPlus className="w-4 h-4" />
            Invite Staff
          </button>
        )}
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or email..."
        className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder:text-navy-500 focus:outline-none focus:border-pitch-500"
      />

      <div className="bg-navy-900 rounded-xl border border-navy-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-800">
              <th className="text-left px-4 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wide">Qualifications</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-800">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-navy-500 text-sm">
                  {search ? 'No staff matching your search.' : 'No staff found.'}
                </td>
              </tr>
            )}
            {filtered.map(s => {
              const quals = s.qualifications?.filter(Boolean) || []
              const expiring = quals.filter(q => expiryStatus(q.expiry))
              return (
                <tr key={s.id} className="hover:bg-navy-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{s.name}</div>
                    <div className="text-xs text-navy-500">{s.email}</div>
                  </td>
                  <td className="px-4 py-3 text-navy-300">
                    {ROLE_LABELS[s.school_role] || s.school_role || 'Teacher'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      s.status === 'active' ? 'bg-pitch-600/20 text-pitch-400' : 'bg-navy-700 text-navy-400'
                    }`}>
                      {s.status || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {expiring.length > 0 ? (
                      <div className="flex items-center gap-1 text-amber-400">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-xs">{expiring.length} expiring</span>
                      </div>
                    ) : (
                      <span className="text-xs text-navy-500">
                        {quals.length > 0 ? `${quals.length} recorded` : 'None recorded'}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
