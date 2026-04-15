import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { clubService } from '../../services/api'
import { UserPlus, Shield, Trash2, Edit, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLES = ['owner', 'admin', 'treasurer', 'secretary', 'coach']
const ROLE_COLORS = {
  owner: 'bg-amber-500/20 text-amber-400',
  admin: 'bg-purple-500/20 text-purple-400',
  treasurer: 'bg-blue-500/20 text-blue-400',
  secretary: 'bg-pitch-600/20 text-pitch-400',
  coach: 'bg-navy-600/20 text-navy-300',
  parent: 'bg-navy-700/20 text-navy-400',
}

export default function ClubMembers() {
  const { school, myRole } = useOutletContext()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'coach' })
  const [editingId, setEditingId] = useState(null)
  const [editRole, setEditRole] = useState('')

  useEffect(() => {
    if (school?.id) loadMembers()
  }, [school?.id])

  async function loadMembers() {
    try {
      const res = await clubService.getMembers(school.id)
      setMembers(res.data)
    } catch (err) {
      toast.error('Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite(e) {
    e.preventDefault()
    try {
      await clubService.inviteMember(school.id, inviteForm)
      toast.success(`Invite sent to ${inviteForm.email}`)
      setShowInvite(false)
      setInviteForm({ email: '', name: '', role: 'coach' })
      loadMembers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send invite')
    }
  }

  async function handleUpdateRole(memberId) {
    try {
      await clubService.updateMember(school.id, memberId, { role: editRole })
      toast.success('Role updated')
      setEditingId(null)
      loadMembers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update role')
    }
  }

  async function handleRemove(memberId, name) {
    if (!confirm(`Remove ${name} from the school?`)) return
    try {
      await clubService.removeMember(school.id, memberId)
      toast.success('Member removed')
      loadMembers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove member')
    }
  }

  const canManage = ['owner', 'admin'].includes(myRole)

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">School Members</h1>
          <p className="text-navy-400 text-sm mt-1">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invite Member
          </button>
        )}
      </div>

      {/* Invite form */}
      {showInvite && (
        <form onSubmit={handleInvite} className="bg-navy-900 border border-navy-800 rounded-xl p-4 space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-navy-400 mb-1">Email *</label>
              <input
                type="email"
                required
                value={inviteForm.email}
                onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                placeholder="coach@example.com"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Name</label>
              <input
                type="text"
                value={inviteForm.name}
                onChange={(e) => setInviteForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Role *</label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm(f => ({ ...f, role: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              >
                <option value="admin">Admin</option>
                <option value="treasurer">Treasurer</option>
                <option value="secretary">Secretary</option>
                <option value="coach">Coach</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className="px-4 py-2 text-sm text-navy-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors"
            >
              Send Invite
            </button>
          </div>
        </form>
      )}

      {/* Members list */}
      <div className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-navy-400 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-navy-400 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-navy-400 uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-navy-400 uppercase">Status</th>
                {canManage && <th className="text-right px-4 py-3 text-xs font-medium text-navy-400 uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-navy-800/50 last:border-0">
                  <td className="px-4 py-3 text-sm text-white font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-sm text-navy-300">{m.email}</td>
                  <td className="px-4 py-3">
                    {editingId === m.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="bg-navy-800 border border-navy-700 rounded px-2 py-1 text-white text-xs"
                        >
                          {ROLES.filter(r => r !== 'owner' || myRole === 'owner').map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <button onClick={() => handleUpdateRole(m.id)} className="text-pitch-400 hover:text-pitch-300">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-navy-400 hover:text-white">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded-full capitalize ${ROLE_COLORS[m.role] || ROLE_COLORS.coach}`}>
                        {m.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      m.status === 'active' ? 'bg-pitch-600/20 text-pitch-400' :
                      m.status === 'invited' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-navy-700 text-navy-400'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {m.role !== 'owner' && (
                          <>
                            <button
                              onClick={() => { setEditingId(m.id); setEditRole(m.role) }}
                              className="p-1.5 text-navy-400 hover:text-white transition-colors"
                              title="Edit role"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemove(m.id, m.name)}
                              className="p-1.5 text-navy-400 hover:text-alert-400 transition-colors"
                              title="Remove member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
