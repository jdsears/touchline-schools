import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom'
import { clubSafeguardingService, clubService } from '../../services/api'
import {
  Plus, Check, X, Minus, Clock, ChevronDown, ChevronUp,
  Edit, Save, Upload, ShieldCheck, ShieldX, ShieldAlert,
  UserPlus, ArrowLeft,
} from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY_FORM = {
  member_id: '',
  role: 'volunteer',
  dbs_number: '',
  dbs_issue_date: '',
  dbs_expiry: '',
  dbs_type: 'enhanced',
  first_aid_valid: false,
  first_aid_expiry: '',
  safeguarding_training_valid: false,
  safeguarding_training_date: '',
  safeguarding_training_provider: '',
  coaching_badges: '',
  notes: '',
}

export default function ClubSafeguardingPeople() {
  const { club, myRole } = useOutletContext()
  const navigate = useNavigate()
  const location = useLocation()
  const [records, setRecords] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [expandedId, setExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  const canManage = ['owner', 'admin'].includes(myRole)
  const basePath = location.pathname.replace(/\/safeguarding.*/, '/safeguarding')

  useEffect(() => {
    if (club?.id) loadData()
  }, [club?.id])

  async function loadData() {
    try {
      const [recordsRes, membersRes] = await Promise.all([
        clubSafeguardingService.getComplianceRecords(club.id),
        clubService.getMembers(club.id),
      ])
      setRecords(recordsRes.data)
      setMembers(membersRes.data)
    } catch (err) {
      toast.error('Failed to load compliance records')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await clubSafeguardingService.createComplianceRecord(club.id, form)
      toast.success('Compliance record created')
      setShowAdd(false)
      setForm({ ...EMPTY_FORM })
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create record')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(recordId) {
    setSaving(true)
    try {
      await clubSafeguardingService.updateComplianceRecord(club.id, recordId, editForm)
      toast.success('Record updated')
      setEditingId(null)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update record')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpload(recordId, file) {
    const formData = new FormData()
    formData.append('document', file)
    try {
      await clubSafeguardingService.uploadDocument(club.id, recordId, formData)
      toast.success('Document uploaded')
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload document')
    }
  }

  function startEdit(record) {
    setEditingId(record.id)
    setEditForm({
      dbs_number: record.dbs_number || '',
      dbs_issue_date: record.dbs_issue_date || '',
      dbs_expiry: record.dbs_expiry || '',
      dbs_type: record.dbs_type || 'enhanced',
      first_aid_valid: record.first_aid_valid || false,
      first_aid_expiry: record.first_aid_expiry || '',
      safeguarding_training_valid: record.safeguarding_training_valid || false,
      safeguarding_training_date: record.safeguarding_training_date || '',
      safeguarding_training_provider: record.safeguarding_training_provider || '',
      coaching_badges: record.coaching_badges || '',
      notes: record.notes || '',
      role: record.role || record.safeguarding_role || 'volunteer',
    })
    setExpandedId(record.id)
  }

  function getDbsStatus(record) {
    if (!record.dbs_number) return { label: 'None', color: 'text-navy-500', bg: 'bg-navy-800', Icon: Minus }
    if (!record.dbs_expiry) return { label: 'Pending', color: 'text-navy-400', bg: 'bg-navy-700', Icon: Clock }
    const now = new Date()
    const expiry = new Date(record.dbs_expiry)
    const daysUntil = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
    if (daysUntil < 0) return { label: 'Expired', color: 'text-red-400', bg: 'bg-red-500/20', Icon: ShieldX }
    if (daysUntil <= 30) return { label: `${daysUntil}d left`, color: 'text-amber-400', bg: 'bg-amber-500/20', Icon: ShieldAlert }
    return { label: 'Valid', color: 'text-pitch-400', bg: 'bg-pitch-600/20', Icon: ShieldCheck }
  }

  // Filter out members who already have records
  const existingMemberIds = records.map(r => r.member_id || r.user_id).filter(Boolean)
  const availableMembers = members.filter(m => !existingMemberIds.includes(m.id) && !existingMemberIds.includes(m.user_id))

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(basePath)}
            className="p-2 text-navy-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Compliance Records</h1>
            <p className="text-navy-400 text-sm mt-1">{records.length} record{records.length !== 1 ? 's' : ''} - DBS, training and certifications</p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Record
          </button>
        )}
      </div>

      {/* Add record form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-navy-900 border border-navy-800 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-semibold text-white">New Compliance Record</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-navy-400 mb-1">Club Member *</label>
              <select
                required
                value={form.member_id}
                onChange={(e) => setForm(f => ({ ...f, member_id: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              >
                <option value="">Select member...</option>
                {availableMembers.map(m => (
                  <option key={m.id} value={m.user_id || m.id}>{m.name || m.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Role *</label>
              <select
                value={form.role}
                onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              >
                <option value="volunteer">Volunteer</option>
                <option value="coach">Coach</option>
                <option value="assistant_coach">Assistant Coach</option>
                <option value="team_manager">Team Manager</option>
                <option value="committee">Committee Member</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">DBS Type</label>
              <select
                value={form.dbs_type}
                onChange={(e) => setForm(f => ({ ...f, dbs_type: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              >
                <option value="enhanced">Enhanced</option>
                <option value="standard">Standard</option>
                <option value="basic">Basic</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">DBS Number</label>
              <input
                type="text"
                value={form.dbs_number}
                onChange={(e) => setForm(f => ({ ...f, dbs_number: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                placeholder="e.g. 001234567890"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">DBS Issue Date</label>
              <input
                type="date"
                value={form.dbs_issue_date}
                onChange={(e) => setForm(f => ({ ...f, dbs_issue_date: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">DBS Expiry Date</label>
              <input
                type="date"
                value={form.dbs_expiry}
                onChange={(e) => setForm(f => ({ ...f, dbs_expiry: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="first_aid"
                checked={form.first_aid_valid}
                onChange={(e) => setForm(f => ({ ...f, first_aid_valid: e.target.checked }))}
                className="w-4 h-4 rounded border-navy-700 bg-navy-800 text-pitch-600 focus:ring-pitch-600"
              />
              <label htmlFor="first_aid" className="text-sm text-navy-300">First Aid Certified</label>
            </div>
            {form.first_aid_valid && (
              <div>
                <label className="block text-xs text-navy-400 mb-1">First Aid Expiry</label>
                <input
                  type="date"
                  value={form.first_aid_expiry}
                  onChange={(e) => setForm(f => ({ ...f, first_aid_expiry: e.target.value }))}
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                />
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="safeguarding_training"
                checked={form.safeguarding_training_valid}
                onChange={(e) => setForm(f => ({ ...f, safeguarding_training_valid: e.target.checked }))}
                className="w-4 h-4 rounded border-navy-700 bg-navy-800 text-pitch-600 focus:ring-pitch-600"
              />
              <label htmlFor="safeguarding_training" className="text-sm text-navy-300">Safeguarding Training Complete</label>
            </div>
            {form.safeguarding_training_valid && (
              <>
                <div>
                  <label className="block text-xs text-navy-400 mb-1">Training Date</label>
                  <input
                    type="date"
                    value={form.safeguarding_training_date}
                    onChange={(e) => setForm(f => ({ ...f, safeguarding_training_date: e.target.value }))}
                    className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-navy-400 mb-1">Training Provider</label>
                  <input
                    type="text"
                    value={form.safeguarding_training_provider}
                    onChange={(e) => setForm(f => ({ ...f, safeguarding_training_provider: e.target.value }))}
                    className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                    placeholder="e.g. FA, NSPCC"
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-xs text-navy-400 mb-1">Coaching Badges</label>
            <input
              type="text"
              value={form.coaching_badges}
              onChange={(e) => setForm(f => ({ ...f, coaching_badges: e.target.value }))}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              placeholder="e.g. FA Level 1, UEFA B"
            />
          </div>

          <div>
            <label className="block text-xs text-navy-400 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent resize-none"
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowAdd(false); setForm({ ...EMPTY_FORM }) }}
              className="px-4 py-2 text-sm text-navy-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Record'}
            </button>
          </div>
        </form>
      )}

      {/* Records list */}
      {records.length === 0 ? (
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-8 text-center">
          <ShieldCheck className="w-12 h-12 text-navy-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">No compliance records</h3>
          <p className="text-navy-400 text-sm">Add records for volunteers and coaches to track DBS checks and training.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => {
            const dbs = getDbsStatus(r)
            const DbsIcon = dbs.Icon
            const isExpanded = expandedId === r.id
            const isEditing = editingId === r.id

            return (
              <div key={r.id} className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
                {/* Row header */}
                <button
                  onClick={() => {
                    setExpandedId(isExpanded ? null : r.id)
                    if (isEditing && !isExpanded) setEditingId(null)
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-navy-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-navy-800 flex items-center justify-center text-sm font-medium text-navy-300 shrink-0">
                      {(r.member_name || r.name || '?').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{r.member_name || r.name}</p>
                      <p className="text-xs text-navy-400 capitalize">{r.safeguarding_role || r.role || 'volunteer'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${dbs.bg} ${dbs.color}`}>
                      <DbsIcon className="w-3 h-3" />
                      DBS: {dbs.label}
                    </span>
                    {r.first_aid_valid && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-pitch-600/20 text-pitch-400">
                        <Check className="w-3 h-3" /> First Aid
                      </span>
                    )}
                    {r.safeguarding_training_valid && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-pitch-600/20 text-pitch-400">
                        <Check className="w-3 h-3" /> Safeguarding
                      </span>
                    )}
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-navy-400" />
                      : <ChevronDown className="w-4 h-4 text-navy-400" />
                    }
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-navy-800 space-y-4">
                    {isEditing ? (
                      /* Edit mode */
                      <div className="space-y-4">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-navy-400 mb-1">Role</label>
                            <select
                              value={editForm.role}
                              onChange={(e) => setEditForm(f => ({ ...f, role: e.target.value }))}
                              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                            >
                              <option value="volunteer">Volunteer</option>
                              <option value="coach">Coach</option>
                              <option value="assistant_coach">Assistant Coach</option>
                              <option value="team_manager">Team Manager</option>
                              <option value="committee">Committee Member</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-navy-400 mb-1">DBS Number</label>
                            <input
                              type="text"
                              value={editForm.dbs_number}
                              onChange={(e) => setEditForm(f => ({ ...f, dbs_number: e.target.value }))}
                              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-navy-400 mb-1">DBS Type</label>
                            <select
                              value={editForm.dbs_type}
                              onChange={(e) => setEditForm(f => ({ ...f, dbs_type: e.target.value }))}
                              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                            >
                              <option value="enhanced">Enhanced</option>
                              <option value="standard">Standard</option>
                              <option value="basic">Basic</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-navy-400 mb-1">DBS Issue Date</label>
                            <input
                              type="date"
                              value={editForm.dbs_issue_date}
                              onChange={(e) => setEditForm(f => ({ ...f, dbs_issue_date: e.target.value }))}
                              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-navy-400 mb-1">DBS Expiry</label>
                            <input
                              type="date"
                              value={editForm.dbs_expiry}
                              onChange={(e) => setEditForm(f => ({ ...f, dbs_expiry: e.target.value }))}
                              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={`edit_first_aid_${r.id}`}
                              checked={editForm.first_aid_valid}
                              onChange={(e) => setEditForm(f => ({ ...f, first_aid_valid: e.target.checked }))}
                              className="w-4 h-4 rounded border-navy-700 bg-navy-800 text-pitch-600 focus:ring-pitch-600"
                            />
                            <label htmlFor={`edit_first_aid_${r.id}`} className="text-sm text-navy-300">First Aid Certified</label>
                          </div>
                          {editForm.first_aid_valid && (
                            <div>
                              <label className="block text-xs text-navy-400 mb-1">First Aid Expiry</label>
                              <input
                                type="date"
                                value={editForm.first_aid_expiry}
                                onChange={(e) => setEditForm(f => ({ ...f, first_aid_expiry: e.target.value }))}
                                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                              />
                            </div>
                          )}
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={`edit_safeguarding_${r.id}`}
                              checked={editForm.safeguarding_training_valid}
                              onChange={(e) => setEditForm(f => ({ ...f, safeguarding_training_valid: e.target.checked }))}
                              className="w-4 h-4 rounded border-navy-700 bg-navy-800 text-pitch-600 focus:ring-pitch-600"
                            />
                            <label htmlFor={`edit_safeguarding_${r.id}`} className="text-sm text-navy-300">Safeguarding Training</label>
                          </div>
                          {editForm.safeguarding_training_valid && (
                            <>
                              <div>
                                <label className="block text-xs text-navy-400 mb-1">Training Date</label>
                                <input
                                  type="date"
                                  value={editForm.safeguarding_training_date}
                                  onChange={(e) => setEditForm(f => ({ ...f, safeguarding_training_date: e.target.value }))}
                                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-navy-400 mb-1">Provider</label>
                                <input
                                  type="text"
                                  value={editForm.safeguarding_training_provider}
                                  onChange={(e) => setEditForm(f => ({ ...f, safeguarding_training_provider: e.target.value }))}
                                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                                />
                              </div>
                            </>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs text-navy-400 mb-1">Coaching Badges</label>
                          <input
                            type="text"
                            value={editForm.coaching_badges}
                            onChange={(e) => setEditForm(f => ({ ...f, coaching_badges: e.target.value }))}
                            className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                            placeholder="e.g. FA Level 1, UEFA B"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-navy-400 mb-1">Notes</label>
                          <textarea
                            value={editForm.notes}
                            onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                            rows={2}
                            className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent resize-none"
                          />
                        </div>

                        {/* Document upload */}
                        <div>
                          <label className="block text-xs text-navy-400 mb-2">Upload Document</label>
                          <label className="flex items-center gap-2 px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-navy-300 text-sm hover:bg-navy-700 hover:text-white cursor-pointer transition-colors w-fit">
                            <Upload className="w-4 h-4" />
                            Choose File
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => {
                                if (e.target.files[0]) handleUpload(r.id, e.target.files[0])
                              }}
                            />
                          </label>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-4 py-2 text-sm text-navy-400 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleUpdate(r.id)}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                          >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <div className="space-y-3">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-navy-400 mb-1">DBS Number</p>
                            <p className="text-navy-200">{r.dbs_number || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-navy-400 mb-1">DBS Type</p>
                            <p className="text-navy-200 capitalize">{r.dbs_type || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-navy-400 mb-1">DBS Issue Date</p>
                            <p className="text-navy-200">
                              {r.dbs_issue_date ? new Date(r.dbs_issue_date).toLocaleDateString('en-GB') : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-navy-400 mb-1">DBS Expiry</p>
                            <p className="text-navy-200">
                              {r.dbs_expiry ? new Date(r.dbs_expiry).toLocaleDateString('en-GB') : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-navy-400 mb-1">First Aid</p>
                            <p className="text-navy-200">
                              {r.first_aid_valid ? 'Valid' : 'None'}
                              {r.first_aid_expiry && ` (expires ${new Date(r.first_aid_expiry).toLocaleDateString('en-GB')})`}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-navy-400 mb-1">Safeguarding Training</p>
                            <p className="text-navy-200">
                              {r.safeguarding_training_valid ? 'Complete' : 'None'}
                              {r.safeguarding_training_provider && ` (${r.safeguarding_training_provider})`}
                            </p>
                          </div>
                        </div>

                        {r.coaching_badges && (
                          <div>
                            <p className="text-xs text-navy-400 mb-1">Coaching Badges</p>
                            <div className="flex flex-wrap gap-2">
                              {r.coaching_badges.split(',').map((badge, i) => (
                                <span key={i} className="text-xs bg-navy-800 text-navy-300 px-2 py-1 rounded-full">
                                  {badge.trim()}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {r.notes && (
                          <div>
                            <p className="text-xs text-navy-400 mb-1">Notes</p>
                            <p className="text-sm text-navy-300">{r.notes}</p>
                          </div>
                        )}

                        {r.documents && r.documents.length > 0 && (
                          <div>
                            <p className="text-xs text-navy-400 mb-2">Documents</p>
                            <div className="flex flex-wrap gap-2">
                              {r.documents.map((doc, i) => (
                                <a
                                  key={i}
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs bg-navy-800 text-pitch-400 hover:text-pitch-300 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  {doc.name || `Document ${i + 1}`}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {canManage && (
                          <div className="flex justify-end">
                            <button
                              onClick={() => startEdit(r)}
                              className="flex items-center gap-2 px-3 py-1.5 text-sm text-pitch-400 hover:text-pitch-300 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                              Edit Record
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
