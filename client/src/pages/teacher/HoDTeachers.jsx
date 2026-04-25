import { useState, useEffect } from 'react'
import { hodService } from '../../services/api'
import { UserCog, Plus, X, Shield, GraduationCap, ChevronDown, Edit2, Check } from 'lucide-react'
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

// School-level roles available for assignment
const SCHOOL_ROLES = [
  { value: 'owner', label: 'Owner', description: 'Full account access, billing, all settings', restricted: true },
  { value: 'school_admin', label: 'School Admin', description: 'Manage staff, settings, and school data' },
  { value: 'head_of_pe', label: 'Head of PE/Sport', description: 'Full HoD view - all classes, teams, reporting' },
  { value: 'head_of_sport', label: 'Head of Sport', description: 'Cross-team oversight for assigned sport(s)' },
  { value: 'teacher', label: 'Teacher', description: 'Access to own classes, teams, and pupil data' },
  { value: 'read_only', label: 'Read Only', description: 'View data only - no edits or deletions' },
]

// Map role to display label
const ROLE_LABELS = {
  owner: 'Owner',
  school_admin: 'School Admin',
  head_of_pe: 'Head of PE/Sport',
  head_of_sport: 'Head of Sport',
  teacher: 'Teacher',
  read_only: 'Read Only',
  admin: 'School Admin',
  coach: 'Teacher',
  parent: 'Parent',
  manager: 'Teacher',
  assistant: 'Assistant',
}

const ROLE_BADGE_COLORS = {
  owner: 'bg-pitch-600/20 text-pitch-400',
  school_admin: 'bg-amber-500/20 text-amber-400',
  head_of_pe: 'bg-amber-500/20 text-amber-400',
  head_of_sport: 'bg-blue-500/20 text-blue-400',
  teacher: 'bg-border-default text-secondary',
  read_only: 'bg-subtle text-tertiary',
  admin: 'bg-amber-500/20 text-amber-400',
  coach: 'bg-border-default text-secondary',
}

export default function HoDTeachers() {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [assignModal, setAssignModal] = useState(null) // { userId, name } - sport assign
  const [roleModal, setRoleModal] = useState(null)     // { memberId, userId, name, currentRole, schoolId }
  const [assignSport, setAssignSport] = useState('football')
  const [assignRole, setAssignRole] = useState('coach')
  const [newRole, setNewRole] = useState('')
  const [roleLoading, setRoleLoading] = useState(false)

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

  async function handleRoleChange() {
    if (!roleModal || !newRole) return
    setRoleLoading(true)
    try {
      await hodService.updateTeacherRole(roleModal.schoolId, roleModal.memberId, newRole)
      toast.success(`${roleModal.name}'s role updated to ${ROLE_LABELS[newRole] || newRole}`)
      setRoleModal(null)
      loadTeachers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update role')
    } finally {
      setRoleLoading(false)
    }
  }

  function openRoleModal(teacher) {
    const effectiveRole = teacher.school_role || teacher.role || 'teacher'
    setNewRole(effectiveRole)
    setRoleModal({
      memberId: teacher.member_id,
      userId: teacher.id,
      name: teacher.name,
      currentRole: effectiveRole,
      schoolId: teacher.school_id,
    })
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
        <h1 className="text-2xl font-bold text-primary">Staff & Roles</h1>
        <p className="text-secondary mt-1">Manage staff roles and their sport assignments</p>
      </div>

      {/* Role reference */}
      <div className="bg-card rounded-xl border border-border-default p-4 mb-6">
        <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-3">Role Permissions</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SCHOOL_ROLES.filter(r => !r.restricted).map(r => (
            <div key={r.value} className="flex items-start gap-2 text-xs">
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${ROLE_BADGE_COLORS[r.value] || 'bg-border-default text-secondary'}`}>
                {r.label}
              </span>
              <span className="text-tertiary">{r.description}</span>
            </div>
          ))}
        </div>
      </div>

      {teachers.length > 0 ? (
        <div className="space-y-4">
          {teachers.map(teacher => {
            const effectiveRole = teacher.school_role || teacher.role || 'teacher'
            return (
              <div key={teacher.id} className="bg-card rounded-xl border border-border-default p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-border-default flex items-center justify-center">
                      <span className="text-lg font-medium text-primary">
                        {teacher.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-primary">{teacher.name}</h3>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-secondary">{teacher.email}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGE_COLORS[effectiveRole] || 'bg-border-default text-secondary'}`}>
                          {ROLE_LABELS[effectiveRole] || effectiveRole}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openRoleModal(teacher)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-subtle hover:bg-border-default text-secondary rounded-lg text-xs transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Role
                    </button>
                    <button
                      onClick={() => setAssignModal({ userId: teacher.id, name: teacher.name })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-subtle hover:bg-border-default text-secondary rounded-lg text-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Sport
                    </button>
                  </div>
                </div>

                {/* Sport assignments */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {teacher.sports && teacher.sports.filter(Boolean).length > 0 ? (
                    teacher.sports.filter(Boolean).map(s => (
                      <div key={s.sport} className="flex items-center gap-2 px-3 py-1.5 bg-subtle rounded-lg">
                        <span>{SPORT_ICONS[s.sport] || ''}</span>
                        <span className="text-sm text-primary capitalize">{s.sport}</span>
                        <span className="text-xs text-secondary">({s.role?.replace(/_/g, ' ')})</span>
                        <button
                          onClick={() => handleRemoveSport(teacher.id, s.sport, teacher.name)}
                          className="ml-1 text-tertiary hover:text-alert-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-tertiary">No sport assignments</span>
                  )}

                  {teacher.teams && teacher.teams.filter(Boolean).length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-secondary">
                      <Shield className="w-3.5 h-3.5" />
                      {teacher.teams.filter(Boolean).length} team{teacher.teams.filter(Boolean).length !== 1 ? 's' : ''}
                    </div>
                  )}

                  {teacher.class_count > 0 && (
                    <div className="flex items-center gap-1 text-xs text-secondary">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {teacher.class_count} class{teacher.class_count !== 1 ? 'es' : ''}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border-default p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-subtle flex items-center justify-center mx-auto mb-4">
            <UserCog className="w-8 h-8 text-tertiary" />
          </div>
          <h3 className="text-lg font-semibold text-primary mb-2">No teachers found</h3>
          <p className="text-secondary text-sm max-w-md mx-auto">
            Invite teachers to the school to get started. They will appear here once they join.
          </p>
        </div>
      )}

      {/* Assign Sport Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card rounded-xl border border-border-strong w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-primary">Assign to Sport</h2>
              <button onClick={() => setAssignModal(null)} className="text-secondary hover:text-link">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-secondary mb-4">Assign <strong className="text-primary">{assignModal.name}</strong> to a sport:</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-secondary mb-1">Sport</label>
                <select
                  value={assignSport}
                  onChange={e => setAssignSport(e.target.value)}
                  className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-primary text-sm focus:outline-none focus:border-pitch-500"
                >
                  {SPORTS.map(s => (
                    <option key={s} value={s}>{SPORT_ICONS[s]} {s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-secondary mb-1">Role</label>
                <select
                  value={assignRole}
                  onChange={e => setAssignRole(e.target.value)}
                  className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-primary text-sm focus:outline-none focus:border-pitch-500"
                >
                  {SPORT_ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setAssignModal(null)}
                  className="flex-1 px-4 py-2.5 bg-subtle hover:bg-border-default text-secondary rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  className="flex-1 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-primary rounded-lg text-sm font-medium transition-colors"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change School Role Modal */}
      {roleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-xl border border-border-strong w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-primary">Change School Role</h2>
              <button onClick={() => setRoleModal(null)} className="text-secondary hover:text-link">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-secondary mb-4">
              Set the school role for <strong className="text-primary">{roleModal.name}</strong>.
              This controls what they can see and do across the whole school.
            </p>

            <div className="space-y-2 mb-5">
              {SCHOOL_ROLES.filter(r => !r.restricted || roleModal.currentRole === 'owner').map(r => (
                <button
                  key={r.value}
                  onClick={() => setNewRole(r.value)}
                  className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                    newRole === r.value
                      ? 'border-pitch-500 bg-pitch-600/10'
                      : 'border-border-strong hover:border-border-strong hover:bg-subtle'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    newRole === r.value ? 'border-pitch-500 bg-pitch-500' : 'border-border-strong'
                  }`}>
                    {newRole === r.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <span className={`text-sm font-medium ${newRole === r.value ? 'text-primary' : 'text-secondary'}`}>
                      {r.label}
                    </span>
                    <p className="text-xs text-tertiary mt-0.5">{r.description}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRoleModal(null)}
                className="flex-1 py-2.5 border border-border-strong text-secondary rounded-lg text-sm hover:bg-subtle transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChange}
                disabled={roleLoading || newRole === roleModal.currentRole}
                className="flex-1 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {roleLoading ? <div className="spinner w-4 h-4" /> : <Check className="w-4 h-4" />}
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
