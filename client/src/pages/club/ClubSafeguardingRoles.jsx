import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom'
import { clubSafeguardingService, clubService } from '../../services/api'
import {
  UserCheck, UserPlus, Trash2, Shield, ShieldCheck, ShieldAlert,
  ArrowLeft, Check, X, AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'

const SAFEGUARDING_ROLES = [
  {
    key: 'club_welfare_officer',
    title: 'Club Welfare Officer',
    description: 'Primary point of contact for all safeguarding matters. Must have completed Safeguarding Children training.',
    required: true,
  },
  {
    key: 'deputy_welfare_officer',
    title: 'Deputy Welfare Officer',
    description: 'Supports the CWO and acts in their absence. Should also hold safeguarding qualifications.',
    required: false,
  },
  {
    key: 'designated_safeguarding_lead',
    title: 'Designated Safeguarding Lead',
    description: 'Senior person responsible for safeguarding strategy and escalation. Often the club chair or secretary.',
    required: false,
  },
]

const ROLE_ICONS = {
  club_welfare_officer: Shield,
  deputy_welfare_officer: ShieldCheck,
  designated_safeguarding_lead: ShieldAlert,
}

export default function ClubSafeguardingRoles() {
  const { club, myRole } = useOutletContext()
  const navigate = useNavigate()
  const location = useLocation()
  const [roles, setRoles] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigningRole, setAssigningRole] = useState(null)
  const [selectedMember, setSelectedMember] = useState('')

  const canManage = ['owner', 'admin'].includes(myRole)
  const basePath = location.pathname.replace(/\/safeguarding.*/, '/safeguarding')

  useEffect(() => {
    if (club?.id) loadData()
  }, [club?.id])

  async function loadData() {
    try {
      const [rolesRes, membersRes] = await Promise.all([
        clubSafeguardingService.getRoles(club.id),
        clubService.getMembers(club.id),
      ])
      setRoles(rolesRes.data)
      setMembers(membersRes.data)
    } catch (err) {
      toast.error('Failed to load safeguarding roles')
    } finally {
      setLoading(false)
    }
  }

  async function handleAssign(roleKey) {
    if (!selectedMember) {
      toast.error('Please select a member')
      return
    }
    try {
      await clubSafeguardingService.assignRole(club.id, {
        member_id: selectedMember,
        role: roleKey,
      })
      toast.success('Role assigned successfully')
      setAssigningRole(null)
      setSelectedMember('')
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign role')
    }
  }

  async function handleRemove(roleId, roleName, memberName) {
    if (!confirm(`Remove ${memberName} from ${roleName}?`)) return
    try {
      await clubSafeguardingService.removeRole(club.id, roleId)
      toast.success('Role removed')
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove role')
    }
  }

  function getRoleAssignment(roleKey) {
    return roles.find(r => r.role === roleKey || r.role_type === roleKey)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(basePath)}
          className="p-2 text-navy-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Safeguarding Roles</h1>
          <p className="text-navy-400 text-sm mt-1">Manage welfare officer and safeguarding lead assignments</p>
        </div>
      </div>

      {/* Role cards */}
      <div className="space-y-4">
        {SAFEGUARDING_ROLES.map((roleDef) => {
          const assignment = getRoleAssignment(roleDef.key)
          const RoleIcon = ROLE_ICONS[roleDef.key] || Shield
          const isAssigning = assigningRole === roleDef.key

          return (
            <div key={roleDef.key} className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    assignment
                      ? 'bg-pitch-600/10 text-pitch-400'
                      : roleDef.required
                        ? 'bg-red-600/10 text-red-400'
                        : 'bg-navy-800 text-navy-400'
                  }`}>
                    <RoleIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-white">{roleDef.title}</h3>
                      {roleDef.required && !assignment && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                          <AlertTriangle className="w-3 h-3" />
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-navy-400 mt-1">{roleDef.description}</p>

                    {/* Current assignment */}
                    {assignment ? (
                      <div className="mt-4 flex items-center gap-3 bg-navy-800/50 rounded-lg p-3">
                        <div className="w-10 h-10 rounded-full bg-navy-700 flex items-center justify-center text-sm font-medium text-navy-300 shrink-0">
                          {(assignment.member_name || assignment.name || '?').charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{assignment.member_name || assignment.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {assignment.training_up_to_date !== undefined && (
                              <span className={`inline-flex items-center gap-1 text-xs ${
                                assignment.training_up_to_date
                                  ? 'text-pitch-400'
                                  : 'text-amber-400'
                              }`}>
                                {assignment.training_up_to_date
                                  ? <><Check className="w-3 h-3" /> Training up to date</>
                                  : <><AlertTriangle className="w-3 h-3" /> Training needs renewal</>
                                }
                              </span>
                            )}
                            {assignment.assigned_at && (
                              <span className="text-xs text-navy-500">
                                Assigned {new Date(assignment.assigned_at).toLocaleDateString('en-GB')}
                              </span>
                            )}
                          </div>
                        </div>
                        {canManage && (
                          <button
                            onClick={() => handleRemove(
                              assignment.id,
                              roleDef.title,
                              assignment.member_name || assignment.name
                            )}
                            className="p-2 text-navy-400 hover:text-red-400 transition-colors"
                            title="Remove from role"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4">
                        {isAssigning ? (
                          <div className="flex items-center gap-3">
                            <select
                              value={selectedMember}
                              onChange={(e) => setSelectedMember(e.target.value)}
                              className="flex-1 bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                            >
                              <option value="">Select a member...</option>
                              {members.map(m => (
                                <option key={m.id} value={m.user_id || m.id}>
                                  {m.name || m.email}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleAssign(roleDef.key)}
                              className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors"
                            >
                              <Check className="w-4 h-4" />
                              Assign
                            </button>
                            <button
                              onClick={() => { setAssigningRole(null); setSelectedMember('') }}
                              className="p-2 text-navy-400 hover:text-white transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          canManage && (
                            <button
                              onClick={() => setAssigningRole(roleDef.key)}
                              className="flex items-center gap-2 px-4 py-2 bg-navy-800 hover:bg-navy-700 text-navy-300 hover:text-white rounded-lg text-sm transition-colors"
                            >
                              <UserPlus className="w-4 h-4" />
                              Assign Member
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Additional assigned roles (custom or extra) */}
      {roles.filter(r => !SAFEGUARDING_ROLES.some(sr => sr.key === r.role || sr.key === r.role_type)).length > 0 && (
        <div className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-navy-800">
            <h3 className="font-semibold text-white">Additional Assignments</h3>
          </div>
          <div className="divide-y divide-navy-800">
            {roles
              .filter(r => !SAFEGUARDING_ROLES.some(sr => sr.key === r.role || sr.key === r.role_type))
              .map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-navy-800 flex items-center justify-center text-sm font-medium text-navy-300">
                      {(assignment.member_name || assignment.name || '?').charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{assignment.member_name || assignment.name}</p>
                      <p className="text-xs text-navy-400 capitalize">{(assignment.role || assignment.role_type || '').replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => handleRemove(
                        assignment.id,
                        assignment.role || assignment.role_type,
                        assignment.member_name || assignment.name
                      )}
                      className="p-2 text-navy-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="bg-navy-900 border border-navy-800 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-pitch-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-white mb-1">FA Safeguarding Requirements</h4>
            <p className="text-xs text-navy-400 leading-relaxed">
              All affiliated clubs must appoint a Club Welfare Officer. The CWO should hold an in-date
              FA Safeguarding Children Workshop qualification and an enhanced DBS check. It is recommended
              to also appoint a Deputy Welfare Officer to provide cover. For more information, visit the
              FA Safeguarding page.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
