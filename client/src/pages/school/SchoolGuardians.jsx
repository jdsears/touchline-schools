import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { clubService, clubCommsService } from '../../services/api'
import { UserPlus, Search, ChevronDown, ChevronUp, Mail, Phone, MapPin, Trash2, Send, Link2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ClubGuardians() {
  const { school, myRole } = useOutletContext()
  const [guardians, setGuardians] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    relationship: 'parent', address_line1: '', city: '', postcode: '',
  })

  useEffect(() => {
    if (school?.id) loadGuardians()
  }, [school?.id])

  async function loadGuardians() {
    try {
      const res = await clubService.getGuardians(school.id, search || undefined)
      setGuardians(res.data)
    } catch (err) {
      toast.error('Failed to load guardians')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (school?.id) {
      const t = setTimeout(loadGuardians, 300)
      return () => clearTimeout(t)
    }
  }, [search])

  async function handleAdd(e) {
    e.preventDefault()
    try {
      await clubService.addGuardian(school.id, form)
      toast.success('Guardian added')
      setShowAdd(false)
      setForm({ first_name: '', last_name: '', email: '', phone: '', relationship: 'parent', address_line1: '', city: '', postcode: '' })
      loadGuardians()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add guardian')
    }
  }

  async function handleDelete(guardianId, name) {
    if (!confirm(`Remove ${name}? This will unlink them from their children.`)) return
    try {
      await clubService.removeGuardian(school.id, guardianId)
      toast.success('Guardian removed')
      loadGuardians()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove guardian')
    }
  }

  async function handleInviteGuardian(guardianId) {
    try {
      await clubCommsService.inviteGuardian(school.id, guardianId)
      toast.success('Invite sent!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send invite')
    }
  }

  async function handleInviteAll() {
    if (!confirm('Send parent account invites to all guardians who don\'t have linked accounts yet?')) return
    try {
      const res = await clubCommsService.inviteAllGuardians(school.id)
      toast.success(`Sent ${res.data.sent} invites out of ${res.data.total} unlinked guardians`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send invites')
    }
  }

  const canManage = ['owner', 'admin', 'secretary'].includes(myRole)

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Guardians</h1>
          <p className="text-secondary text-sm mt-1">{guardians.length} guardian{guardians.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-subtle border border-border-strong rounded-lg text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent w-48"
            />
          </div>
          {canManage && (
            <>
              <button
                onClick={handleInviteAll}
                className="flex items-center gap-2 px-3 py-2 bg-subtle hover:bg-border-default text-secondary hover:text-primary rounded-lg text-sm transition-colors"
                title="Send parent account invites to all unlinked guardians"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Invite All</span>
              </button>
              <button
                onClick={() => setShowAdd(!showAdd)}
                className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-on-dark rounded-lg text-sm transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Add
              </button>
            </>
          )}
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-card border border-border-default rounded-xl p-4 space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-secondary mb-1">First Name *</label>
              <input
                type="text" required value={form.first_name}
                onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Last Name *</label>
              <input
                type="text" required value={form.last_name}
                onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Email *</label>
              <input
                type="email" required value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Phone</label>
              <input
                type="tel" value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-secondary hover:text-primary">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-on-dark rounded-lg text-sm">Add Guardian</button>
          </div>
        </form>
      )}

      {/* Guardians list */}
      {guardians.length === 0 ? (
        <div className="bg-card border border-border-default rounded-xl p-8 text-center">
          <UserPlus className="w-12 h-12 text-tertiary mx-auto mb-3" />
          <h3 className="text-lg font-medium text-primary mb-1">No guardians yet</h3>
          <p className="text-secondary text-sm">Guardians will appear here when parents register their children.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {guardians.map((g) => (
            <div key={g.id} className="bg-card border border-border-default rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-subtle transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-subtle flex items-center justify-center text-sm font-medium text-secondary shrink-0">
                    {g.first_name?.charAt(0)}{g.last_name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary">{g.first_name} {g.last_name}</p>
                    <p className="text-xs text-secondary truncate">{g.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {g.children && (
                    <span className="text-xs bg-subtle text-secondary px-2 py-1 rounded-full">
                      {g.children.length} child{g.children.length !== 1 ? 'ren' : ''}
                    </span>
                  )}
                  {expandedId === g.id ? <ChevronUp className="w-4 h-4 text-secondary" /> : <ChevronDown className="w-4 h-4 text-secondary" />}
                </div>
              </button>

              {expandedId === g.id && (
                <div className="px-4 pb-4 pt-2 border-t border-border-default space-y-3">
                  <div className="grid sm:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-secondary">
                      <Mail className="w-4 h-4 text-tertiary" />
                      <a href={`mailto:${g.email}`} className="hover:text-primary">{g.email}</a>
                    </div>
                    {g.phone && (
                      <div className="flex items-center gap-2 text-secondary">
                        <Phone className="w-4 h-4 text-tertiary" />
                        <a href={`tel:${g.phone}`} className="hover:text-primary">{g.phone}</a>
                      </div>
                    )}
                    {g.city && (
                      <div className="flex items-center gap-2 text-secondary">
                        <MapPin className="w-4 h-4 text-tertiary" />
                        <span>{g.city}{g.postcode ? `, ${g.postcode}` : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Consent badges */}
                  <div className="flex gap-2 flex-wrap">
                    {g.photo_consent && <span className="text-xs bg-pitch-600/20 text-pitch-400 px-2 py-1 rounded-full">Photo consent</span>}
                    {g.data_consent && <span className="text-xs bg-pitch-600/20 text-pitch-400 px-2 py-1 rounded-full">Data consent</span>}
                    {g.medical_consent && <span className="text-xs bg-pitch-600/20 text-pitch-400 px-2 py-1 rounded-full">Medical consent</span>}
                  </div>

                  {/* Children */}
                  {g.children && g.children.length > 0 && (
                    <div>
                      <p className="text-xs text-secondary mb-2">Children</p>
                      <div className="space-y-1">
                        {g.children.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="text-primary">{c.player_name}</span>
                            <span className="text-tertiary">&middot;</span>
                            <span className="text-secondary">{c.team_name}</span>
                            <span className="text-xs text-tertiary capitalize">({c.relationship})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {canManage && (
                    <div className="flex justify-end gap-3">
                      {!g.user_id && (
                        <button
                          onClick={() => handleInviteGuardian(g.id)}
                          className="flex items-center gap-1 text-xs text-pitch-400 hover:text-pitch-300 transition-colors"
                        >
                          <Link2 className="w-3 h-3" />
                          Send Account Invite
                        </button>
                      )}
                      {g.user_id && (
                        <span className="flex items-center gap-1 text-xs text-pitch-400">
                          <Link2 className="w-3 h-3" />
                          Account linked
                        </span>
                      )}
                      <button
                        onClick={() => handleDelete(g.id, `${g.first_name} ${g.last_name}`)}
                        className="flex items-center gap-1 text-xs text-alert-400 hover:text-alert-300 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
