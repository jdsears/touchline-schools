import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { clubCommsService, clubService } from '../../services/api'
import {
  Megaphone, Plus, Send, Mail, Pin, Trash2,
  ChevronDown, ChevronUp, Users, Clock, CheckCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ClubAnnouncements() {
  const { school, myRole } = useOutletContext()
  const [announcements, setAnnouncements] = useState([])
  const [teams, setTeams] = useState([])
  const [commsLog, setCommsLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showBulkEmail, setShowBulkEmail] = useState(false)
  const [showCommsLog, setShowCommsLog] = useState(false)
  const [form, setForm] = useState({
    title: '', content: '', priority: 'normal', is_pinned: false,
    target_type: 'all_parents', target_team_ids: [],
    send_email: false,
  })
  const [emailForm, setEmailForm] = useState({
    subject: '', message: '',
    target_type: 'all_parents', target_team_ids: [],
  })
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (school?.id) loadData()
  }, [school?.id])

  async function loadData() {
    try {
      const [announcementsRes, teamsRes] = await Promise.all([
        clubCommsService.getAnnouncements(school.id, { include_expired: true }),
        clubService.getTeams(school.id),
      ])
      setAnnouncements(announcementsRes.data)
      setTeams(teamsRes.data)
    } catch (err) {
      toast.error('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  async function loadCommsLog() {
    try {
      const res = await clubCommsService.getCommsLog(school.id)
      setCommsLog(res.data)
      setShowCommsLog(true)
    } catch (err) {
      toast.error('Failed to load communication history')
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.title || !form.content) return toast.error('Title and content required')
    setSaving(true)
    try {
      await clubCommsService.createAnnouncement(school.id, {
        ...form,
        target_team_ids: form.target_type === 'specific_teams' ? form.target_team_ids : [],
      })
      toast.success(form.send_email ? 'Announcement created and emails sent' : 'Announcement created')
      setShowCreate(false)
      setForm({
        title: '', content: '', priority: 'normal', is_pinned: false,
        target_type: 'all_parents', target_team_ids: [],
        send_email: false,
      })
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create announcement')
    } finally {
      setSaving(false)
    }
  }

  async function handleBulkEmail(e) {
    e.preventDefault()
    if (!emailForm.subject || !emailForm.message) return toast.error('Subject and message required')
    setSending(true)
    try {
      const res = await clubCommsService.sendToParents(school.id, {
        ...emailForm,
        target_team_ids: emailForm.target_type === 'specific_teams' ? emailForm.target_team_ids : [],
      })
      toast.success(`Email sent to ${res.data.sent} parents`)
      setShowBulkEmail(false)
      setEmailForm({ subject: '', message: '', target_type: 'all_parents', target_team_ids: [] })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send emails')
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(announcementId) {
    if (!confirm('Delete this announcement?')) return
    try {
      await clubCommsService.deleteAnnouncement(school.id, announcementId)
      toast.success('Deleted')
      loadData()
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  async function handleTogglePin(announcement) {
    try {
      await clubCommsService.updateAnnouncement(school.id, announcement.id, {
        is_pinned: !announcement.is_pinned,
      })
      loadData()
    } catch (err) {
      toast.error('Failed to update')
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
          <h1 className="text-2xl font-bold text-white">Announcements & Comms</h1>
          <p className="text-navy-400 text-sm mt-1">Send announcements and communicate with parents</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadCommsLog}
              className="flex items-center gap-2 px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-navy-300 hover:text-white rounded-lg text-sm transition-colors"
            >
              <Clock className="w-4 h-4" />
              History
            </button>
            <button
              onClick={() => setShowBulkEmail(!showBulkEmail)}
              className="flex items-center gap-2 px-3 py-2 bg-navy-800 hover:bg-navy-700 text-navy-300 hover:text-white rounded-lg text-sm transition-colors"
            >
              <Mail className="w-4 h-4" />
              Email Parents
            </button>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Announcement
            </button>
          </div>
        )}
      </div>

      {/* Bulk email form */}
      {showBulkEmail && (
        <form onSubmit={handleBulkEmail} className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-400" />
            Email Parents
          </h3>
          <TargetSelector
            targetType={emailForm.target_type}
            targetTeamIds={emailForm.target_team_ids}
            teams={teams}
            onChange={(updates) => setEmailForm(f => ({ ...f, ...updates }))}
          />
          <div>
            <label className="block text-xs text-navy-400 mb-1">Subject *</label>
            <input
              type="text" required value={emailForm.subject}
              onChange={(e) => setEmailForm(f => ({ ...f, subject: e.target.value }))}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              placeholder="Email subject line"
            />
          </div>
          <div>
            <label className="block text-xs text-navy-400 mb-1">Message *</label>
            <textarea
              required value={emailForm.message} rows={4}
              onChange={(e) => setEmailForm(f => ({ ...f, message: e.target.value }))}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent resize-none"
              placeholder="Write your message to parents..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowBulkEmail(false)} className="px-4 py-2 text-sm text-navy-400 hover:text-white">Cancel</button>
            <button type="submit" disabled={sending} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm">
              <Send className="w-4 h-4" />
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </form>
      )}

      {/* Create announcement form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-pitch-400" />
            New Announcement
          </h3>
          <TargetSelector
            targetType={form.target_type}
            targetTeamIds={form.target_team_ids}
            teams={teams}
            onChange={(updates) => setForm(f => ({ ...f, ...updates }))}
          />
          <div>
            <label className="block text-xs text-navy-400 mb-1">Title *</label>
            <input
              type="text" required value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              placeholder="Announcement title"
            />
          </div>
          <div>
            <label className="block text-xs text-navy-400 mb-1">Content *</label>
            <textarea
              required value={form.content} rows={4}
              onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent resize-none"
              placeholder="Write your announcement..."
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-navy-400 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              >
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="space-y-2 pt-5">
              <label className="flex items-center gap-2 text-sm text-navy-300 cursor-pointer">
                <input
                  type="checkbox" checked={form.is_pinned}
                  onChange={(e) => setForm(f => ({ ...f, is_pinned: e.target.checked }))}
                  className="rounded bg-navy-800 border-navy-700 text-pitch-600 focus:ring-pitch-600"
                />
                Pin to top
              </label>
              <label className="flex items-center gap-2 text-sm text-navy-300 cursor-pointer">
                <input
                  type="checkbox" checked={form.send_email}
                  onChange={(e) => setForm(f => ({ ...f, send_email: e.target.checked }))}
                  className="rounded bg-navy-800 border-navy-700 text-pitch-600 focus:ring-pitch-600"
                />
                Also send as email
              </label>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-navy-400 hover:text-white">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-white rounded-lg text-sm">
              {saving ? 'Creating...' : 'Create Announcement'}
            </button>
          </div>
        </form>
      )}

      {/* Comms log */}
      {showCommsLog && commsLog.length > 0 && (
        <div className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-navy-800 flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">Communication History</h3>
            <button onClick={() => setShowCommsLog(false)} className="text-xs text-navy-400 hover:text-white">Close</button>
          </div>
          <div className="divide-y divide-navy-800/50">
            {commsLog.map(log => (
              <div key={log.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{log.subject || log.type}</p>
                  <p className="text-xs text-navy-400">
                    {log.sent_by_name} · {new Date(log.created_at).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-navy-800 text-navy-300 px-2 py-0.5 rounded capitalize">{log.type.replace('_', ' ')}</span>
                  <span className="text-xs text-navy-400">{log.recipient_count} sent</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Announcements list */}
      {announcements.length === 0 ? (
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-8 text-center">
          <Megaphone className="w-12 h-12 text-navy-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">No announcements yet</h3>
          <p className="text-navy-400 text-sm">Create your first announcement to communicate with parents.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(ann => (
            <AnnouncementCard
              key={ann.id}
              announcement={ann}
              canManage={canManage}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TargetSelector({ targetType, targetTeamIds, teams, onChange }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs text-navy-400">Send to</label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange({ target_type: 'all_parents', target_team_ids: [] })}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            targetType === 'all_parents' ? 'bg-pitch-600 text-white' : 'bg-navy-800 text-navy-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5 inline mr-1" />
          All Parents
        </button>
        <button
          type="button"
          onClick={() => onChange({ target_type: 'specific_teams' })}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            targetType === 'specific_teams' ? 'bg-pitch-600 text-white' : 'bg-navy-800 text-navy-400 hover:text-white'
          }`}
        >
          Specific Teams
        </button>
      </div>
      {targetType === 'specific_teams' && teams.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {teams.map(team => (
            <label key={team.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 rounded-lg text-sm text-navy-300 cursor-pointer hover:bg-navy-700">
              <input
                type="checkbox"
                checked={targetTeamIds.includes(team.id)}
                onChange={(e) => {
                  const ids = e.target.checked
                    ? [...targetTeamIds, team.id]
                    : targetTeamIds.filter(id => id !== team.id)
                  onChange({ target_team_ids: ids })
                }}
                className="rounded bg-navy-700 border-navy-600 text-pitch-600 focus:ring-pitch-600"
              />
              {team.name}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function AnnouncementCard({ announcement, canManage, onDelete, onTogglePin }) {
  const [expanded, setExpanded] = useState(false)
  const priorityColors = {
    normal: 'border-navy-800',
    important: 'border-amber-600/30',
    urgent: 'border-alert-600/30',
  }

  return (
    <div className={`bg-navy-900 border rounded-xl overflow-hidden ${priorityColors[announcement.priority] || priorityColors.normal}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-navy-800/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {announcement.is_pinned && <Pin className="w-4 h-4 text-amber-400 shrink-0" />}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-white truncate">{announcement.title}</p>
              {announcement.priority === 'urgent' && (
                <span className="text-xs bg-alert-600/20 text-alert-400 px-2 py-0.5 rounded">Urgent</span>
              )}
              {announcement.priority === 'important' && (
                <span className="text-xs bg-amber-600/20 text-amber-400 px-2 py-0.5 rounded">Important</span>
              )}
            </div>
            <p className="text-xs text-navy-400 mt-0.5">
              {announcement.created_by_name} · {new Date(announcement.created_at).toLocaleDateString('en-GB')}
              {announcement.email_sent && (
                <span className="ml-2 text-pitch-400">
                  <Mail className="w-3 h-3 inline" /> {announcement.email_count} sent
                </span>
              )}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-navy-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-navy-400 shrink-0" />}
      </button>
      {expanded && (
        <div className="px-5 pb-4 pt-1 border-t border-navy-800">
          <p className="text-sm text-navy-300 whitespace-pre-wrap">{announcement.content}</p>
          <div className="flex items-center gap-3 mt-3 text-xs text-navy-500">
            <span className="capitalize">{announcement.target_type?.replace('_', ' ')}</span>
            {announcement.expires_at && (
              <span>Expires {new Date(announcement.expires_at).toLocaleDateString('en-GB')}</span>
            )}
          </div>
          {canManage && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onTogglePin(announcement)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-navy-400 hover:text-white rounded-lg text-xs transition-colors"
              >
                <Pin className="w-3.5 h-3.5" />
                {announcement.is_pinned ? 'Unpin' : 'Pin'}
              </button>
              <button
                onClick={() => onDelete(announcement.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 hover:bg-alert-600/20 text-navy-400 hover:text-alert-400 rounded-lg text-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
