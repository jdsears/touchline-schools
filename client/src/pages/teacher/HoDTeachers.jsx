import { useState, useEffect } from 'react'
import { hodService } from '../../services/api'
import { UserCog, Plus, X, Shield, GraduationCap, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

const SPORTS = ['football', 'rugby', 'cricket', 'hockey', 'netball']
const SPORT_ICONS = {
  football: '\u26BD', rugby: '\uD83C\uDFC9', cricket: '\uD83C\uDFCF',
  hockey: '\uD83C\uDFD1', netball: '\uD83E\uDD3E',
}
const SPORT_ROLES = [
  { value: 'head_of_sport', label: 'Head of Sport' },
  { value: 'coach', label: 'Coach' },
  { value: 'assistant', label: 'Assistant' },
]

export default function HoDTeachers() {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [assignModal, setAssignModal] = useState(null) // { userId, name }
  const [assignSport, setAssignSport] = useState('football')
  const [assignRole, setAssignRole] = useState('coach')

  useEffect(() => {
    loadTeachers()
  }, [])

  async function loadTeachers() {
    try {
      const res = await hodService.getTeachers()
      setTeachers(res.data)
    } catch (err) {
      console.error('Failed to load teachers:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAssign() {
    if (!assignModal) return
    try {
      await hodService.assignTeacherSport(assignModal.userId, assignSport, assignRole)
      toast.success(`${assignModal.name} assigned to ${assignSport}`)
      setAssignModal(null)
      loadTeachers()
    } catch (err) {
      toast.error('Failed to assign teacher')
    }
  }

  async function handleRemoveSport(userId, sport, name) {
    if (!confirm(`Remove ${name} from ${sport}?`)) return
    try {
      await hodService.removeTeacherSport(userId, sport)
      toast.success(`${name} removed from ${sport}`)
      loadTeachers()
    } catch (err) {
      toast.error('Failed to remove assignment')
    }
  }

  const roleLabel = (role) => {
    const labels = { owner: 'School Admin', admin: 'Head of PE', coach: 'Teacher' }
    return labels[role] || role
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Teachers</h1>
        <p className="text-navy-400 mt-1">Manage staff and their sport assignments</p>
      </div>

      {teachers.length > 0 ? (
        <div className="space-y-4">
          {teachers.map(teacher => (
            <div key={teacher.id} className="bg-navy-900 rounded-xl border border-navy-800 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-navy-700 flex items-center justify-center">
                    <span className="text-lg font-medium text-white">
                      {teacher.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">{teacher.name}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-navy-400">{teacher.email}</span>
                      <span className="px-2 py-0.5 bg-amber-400/20 text-amber-400 rounded text-xs">
                        {roleLabel(teacher.role)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setAssignModal({ userId: teacher.id, name: teacher.name })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-navy-300 rounded-lg text-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Assign Sport
                </button>
              </div>

              {/* Sport assignments */}
              <div className="mt-4 flex flex-wrap gap-4">
                {/* Sports */}
                {teacher.sports && teacher.sports.filter(Boolean).length > 0 ? (
                  teacher.sports.filter(Boolean).map(s => (
                    <div key={s.sport} className="flex items-center gap-2 px-3 py-1.5 bg-navy-800 rounded-lg">
                      <span>{SPORT_ICONS[s.sport] || ''}</span>
                      <span className="text-sm text-white capitalize">{s.sport}</span>
                      <span className="text-xs text-navy-400 capitalize">({s.role?.replace('_', ' ')})</span>
                      <button
                        onClick={() => handleRemoveSport(teacher.id, s.sport, teacher.name)}
                        className="ml-1 text-navy-500 hover:text-alert-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-navy-500">No sport assignments</span>
                )}

                {/* Teams */}
                {teacher.teams && teacher.teams.filter(Boolean).length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-navy-400">
                    <Shield className="w-3.5 h-3.5" />
                    {teacher.teams.filter(Boolean).length} team{teacher.teams.filter(Boolean).length !== 1 ? 's' : ''}
                  </div>
                )}

                {/* Classes */}
                {teacher.class_count > 0 && (
                  <div className="flex items-center gap-1 text-xs text-navy-400">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {teacher.class_count} class{teacher.class_count !== 1 ? 'es' : ''}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
            <UserCog className="w-8 h-8 text-navy-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No teachers found</h3>
          <p className="text-navy-400 text-sm max-w-md mx-auto">
            Invite teachers to the school to get started. They will appear here once they join.
          </p>
        </div>
      )}

      {/* Assign Sport Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-navy-900 rounded-xl border border-navy-700 w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Assign to Sport</h2>
              <button onClick={() => setAssignModal(null)} className="text-navy-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-navy-300 mb-4">Assign <strong className="text-white">{assignModal.name}</strong> to a sport:</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-navy-300 mb-1">Sport</label>
                <select
                  value={assignSport}
                  onChange={e => setAssignSport(e.target.value)}
                  className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-pitch-500"
                >
                  {SPORTS.map(s => (
                    <option key={s} value={s}>{SPORT_ICONS[s]} {s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-navy-300 mb-1">Role</label>
                <select
                  value={assignRole}
                  onChange={e => setAssignRole(e.target.value)}
                  className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-pitch-500"
                >
                  {SPORT_ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setAssignModal(null)}
                  className="flex-1 px-4 py-2.5 bg-navy-800 hover:bg-navy-700 text-navy-300 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  className="flex-1 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
