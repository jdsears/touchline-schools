// TeacherLounge.jsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTeam } from '../context/TeamContext'
import { teamService, documentService, suggestionService } from '../services/api'
import {
  Users, FileText, MessageSquare, UserPlus, X,
  Mail, Clock, Trash2, Copy, Check, AlertCircle,
  Upload, Download, Eye, EyeOff, File, Loader2,
  FileImage, FileSpreadsheet, FileType, Lightbulb,
  Send, ChevronRight, ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'

// Helper to get file icon based on type
function getFileIcon(fileType) {
  if (!fileType) return File
  if (fileType.startsWith('image/')) return FileImage
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) return FileSpreadsheet
  if (fileType.includes('pdf')) return FileType
  return File
}

// Helper to format file size
function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function TeacherLounge() {
  const { user } = useAuth()
  const { team, pupils } = useTeam()

  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'assistant' })
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedInviteId, setCopiedInviteId] = useState(null)

  // Document upload state
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadVisibleToParents, setUploadVisibleToParents] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  // Suggestions state
  const [suggestions, setSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestionStats, setSuggestionStats] = useState(null)
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(null)
  const [responseText, setResponseText] = useState('')
  const [respondingTo, setRespondingTo] = useState(null)

  useEffect(() => {
    if (user?.team_id) {
      loadData()
    }
  }, [user?.team_id])

  async function loadData() {
    try {
      setLoading(true)
      const [membersRes, invitesRes, docsRes, suggestionsRes, statsRes] = await Promise.all([
        teamService.getMembers(user.team_id),
        teamService.getInvites(user.team_id),
        documentService.getDocuments(user.team_id),
        suggestionService.getSuggestions(user.team_id),
        suggestionService.getStats(user.team_id),
      ])
      setMembers(membersRes.data)
      setInvites(invitesRes.data)
      setDocuments(docsRes.data)
      setSuggestions(suggestionsRes.data)
      setSuggestionStats(statsRes.data)
    } catch (error) {
      console.error('Failed to load coach data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRespondToSuggestion(suggestionId, status, response) {
    setRespondingTo(suggestionId)
    try {
      const data = {}
      if (status) data.status = status
      if (response) data.coach_response = response

      await suggestionService.updateSuggestion(user.team_id, suggestionId, data)

      // Update local state
      setSuggestions(suggestions.map(s =>
        s.id === suggestionId
          ? { ...s, status: status || s.status, coach_response: response || s.coach_response, responded_by_name: user.name }
          : s
      ))

      // Update stats
      const statsRes = await suggestionService.getStats(user.team_id)
      setSuggestionStats(statsRes.data)

      toast.success(response ? 'Response sent!' : 'Status updated!')
      setSelectedSuggestion(null)
      setResponseText('')
    } catch (error) {
      toast.error('Failed to update suggestion')
      console.error(error)
    } finally {
      setRespondingTo(null)
    }
  }

  async function handleDeleteSuggestion(suggestionId) {
    if (!confirm('Are you sure you want to delete this suggestion?')) return

    try {
      await suggestionService.deleteSuggestion(user.team_id, suggestionId)
      setSuggestions(suggestions.filter(s => s.id !== suggestionId))
      const statsRes = await suggestionService.getStats(user.team_id)
      setSuggestionStats(statsRes.data)
      toast.success('Suggestion deleted')
      setSelectedSuggestion(null)
    } catch (error) {
      toast.error('Failed to delete suggestion')
      console.error(error)
    }
  }

  async function handleInvite(e) {
    e.preventDefault()
    setInviteError('')
    setInviteSuccess(null)
    setSubmitting(true)

    try {
      const response = await teamService.inviteMember(user.team_id, inviteForm)
      setInviteSuccess(response.data)
      setInvites([response.data.invite, ...invites])
      setInviteForm({ email: '', role: 'assistant' })
    } catch (error) {
      setInviteError(error.response?.data?.message || 'Failed to send invite')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancelInvite(inviteId) {
    try {
      await teamService.cancelInvite(user.team_id, inviteId)
      setInvites(invites.filter(inv => inv.id !== inviteId))
    } catch (error) {
      console.error('Failed to cancel invite:', error)
    }
  }

  async function handleRemoveMember(memberId) {
    if (!confirm('Are you sure you want to remove this team member?')) return

    try {
      await teamService.removeMember(user.team_id, memberId)
      setMembers(members.filter(m => m.id !== memberId))
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to remove team member')
    }
  }

  function copyInviteLink() {
    if (inviteSuccess?.inviteLink) {
      navigator.clipboard.writeText(inviteSuccess.inviteLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  function copyPendingInviteLink(invite) {
    const link = `${window.location.origin}/invite/${invite.token}`
    navigator.clipboard.writeText(link)
    setCopiedInviteId(invite.id)
    toast.success('Invite link copied!')
    setTimeout(() => setCopiedInviteId(null), 2000)
  }

  function getRoleBadgeClass(role) {
    switch (role) {
      case 'manager': return 'badge-primary'
      case 'assistant': return 'badge-blue'
      case 'scout': return 'badge-accent'
      default: return 'badge-navy'
    }
  }

  // Document handlers
  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB')
        return
      }
      setUploadFile(file)
    }
  }

  async function handleUploadDocument(e) {
    e.preventDefault()
    if (!uploadFile) {
      toast.error('Please select a file')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('description', uploadDescription)
      formData.append('visibleToParents', uploadVisibleToParents)

      const response = await documentService.uploadDocument(user.team_id, formData)
      setDocuments([response.data, ...documents])
      setShowUploadModal(false)
      setUploadFile(null)
      setUploadDescription('')
      setUploadVisibleToParents(false)
      toast.success('Document uploaded!')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  async function handleToggleVisibility(doc) {
    try {
      const response = await documentService.updateDocument(user.team_id, doc.id, {
        visibleToParents: !doc.visible_to_parents
      })
      setDocuments(documents.map(d =>
        d.id === doc.id ? { ...d, visible_to_parents: response.data.visible_to_parents } : d
      ))
      toast.success(response.data.visible_to_parents
        ? 'Document now visible to parents'
        : 'Document hidden from parents'
      )
    } catch (error) {
      toast.error('Failed to update visibility')
    }
  }

  async function handleDeleteDocument(docId) {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      await documentService.deleteDocument(user.team_id, docId)
      setDocuments(documents.filter(d => d.id !== docId))
      toast.success('Document deleted')
    } catch (error) {
      toast.error('Failed to delete document')
    }
  }

  const coachCount = members.filter(m => ['manager', 'assistant', 'scout'].includes(m.role)).length

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-white mb-1">Coaches Lounge</h1>
        <p className="text-navy-400">Team resources and collaboration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Coaching Staff Card */}
        <div className="card p-6">
          <Users className="w-8 h-8 text-brand-primary mb-4" />
          <h3 className="font-display font-semibold text-white mb-2">Coaching Staff</h3>
          <p className="text-sm text-navy-400 mb-4">Manage your coaching team</p>

          {loading ? (
            <div className="py-4 text-center">
              <div className="spinner w-6 h-6 mx-auto" />
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {members.filter(m => ['manager', 'assistant', 'scout'].includes(m.role)).map(member => (
                <div key={member.id} className="flex items-center gap-3 p-2 bg-navy-800/50 rounded-lg group">
                  <div className="w-8 h-8 rounded-full bg-brand-primary/60 flex items-center justify-center text-sm font-medium text-white">
                    {member.name?.charAt(0) || member.email?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{member.name || member.email}</p>
                    <span className={`${getRoleBadgeClass(member.role)} text-xs`}>
                      {member.role}
                    </span>
                  </div>
                  {user?.role === 'manager' && member.id !== user.id && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-navy-400 hover:text-alert-400 transition-all"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pending Invites */}
          {invites.length > 0 && (
            <div className="mt-4 pt-4 border-t border-navy-700">
              <p className="text-xs text-navy-400 mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Pending Invites
              </p>
              <div className="space-y-2">
                {invites.map(invite => (
                  <div key={invite.id} className="flex items-center gap-2 p-2 bg-navy-800/30 rounded-lg text-sm">
                    <Mail className="w-4 h-4 text-navy-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-navy-300 truncate">{invite.email}</p>
                      <span className="text-xs text-navy-500 capitalize">{invite.role}</span>
                    </div>
                    <button
                      onClick={() => copyPendingInviteLink(invite)}
                      className="p-1 text-navy-400 hover:text-pitch-400"
                      title="Copy invite link"
                    >
                      {copiedInviteId === invite.id ? <Check className="w-4 h-4 text-pitch-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleCancelInvite(invite.id)}
                      className="p-1 text-navy-400 hover:text-alert-400"
                      title="Cancel invite"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowInviteModal(true)}
            className="btn-secondary btn-sm w-full mt-4"
          >
            <UserPlus className="w-4 h-4" />
            Invite Coach
          </button>
        </div>

        {/* Team Documents Card */}
        <div className="card p-6">
          <FileText className="w-8 h-8 text-brand-accent mb-4" />
          <h3 className="font-display font-semibold text-white mb-2">Team Documents</h3>
          <p className="text-sm text-navy-400 mb-4">Shared resources and files</p>

          {loading ? (
            <div className="py-4 text-center">
              <div className="spinner w-6 h-6 mx-auto" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-navy-500 text-sm">No documents yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {documents.map(doc => {
                const FileIcon = getFileIcon(doc.file_type)
                return (
                  <div key={doc.id} className="flex items-center gap-3 p-2 bg-navy-800/50 rounded-lg group">
                    <div className="w-8 h-8 rounded bg-navy-700 flex items-center justify-center">
                      <FileIcon className="w-4 h-4 text-navy-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate" title={doc.original_name}>
                        {doc.original_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-navy-500">
                        <span>{formatFileSize(doc.file_size)}</span>
                        {doc.visible_to_parents && (
                          <span className="flex items-center gap-1 text-pitch-400">
                            <Eye className="w-3 h-3" />
                            Parents
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={doc.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-navy-400 hover:text-pitch-400"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleToggleVisibility(doc)}
                        className={`p-1 ${doc.visible_to_parents ? 'text-pitch-400' : 'text-navy-400'} hover:text-pitch-400`}
                        title={doc.visible_to_parents ? 'Hide from parents' : 'Show to parents'}
                      >
                        {doc.visible_to_parents ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1 text-navy-400 hover:text-alert-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-secondary btn-sm w-full mt-4"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>

        {/* Team Suggestions Card */}
        <div className="card p-6">
          <Lightbulb className="w-8 h-8 text-blue-400 mb-4" />
          <h3 className="font-display font-semibold text-white mb-2">Team Suggestions</h3>
          <p className="text-sm text-navy-400 mb-4">Ideas from pupils and parents</p>

          {loading ? (
            <div className="py-4 text-center">
              <div className="spinner w-6 h-6 mx-auto" />
            </div>
          ) : (
            <>
              {/* Stats */}
              {suggestionStats && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-caution-500/10 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-caution-400">{suggestionStats.pending || 0}</p>
                    <p className="text-xs text-navy-500">Pending</p>
                  </div>
                  <div className="bg-blue-500/10 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-blue-400">{suggestionStats.in_review || 0}</p>
                    <p className="text-xs text-navy-500">In Review</p>
                  </div>
                  <div className="bg-pitch-500/10 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-pitch-400">{suggestionStats.implemented || 0}</p>
                    <p className="text-xs text-navy-500">Done</p>
                  </div>
                </div>
              )}

              {/* Recent Suggestions Preview */}
              {suggestions.filter(s => s.status === 'pending').length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto mb-4">
                  {suggestions.filter(s => s.status === 'pending').slice(0, 3).map(suggestion => (
                    <div
                      key={suggestion.id}
                      className="flex items-center gap-2 p-2 bg-navy-800/50 rounded-lg cursor-pointer hover:bg-navy-800"
                      onClick={() => {
                        setSelectedSuggestion(suggestion)
                        setShowSuggestionsModal(true)
                      }}
                    >
                      <div className="w-6 h-6 rounded-full bg-caution-500/20 flex items-center justify-center flex-shrink-0">
                        <Lightbulb className="w-3 h-3 text-caution-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{suggestion.title}</p>
                        <p className="text-xs text-navy-500">{suggestion.submitted_by_name}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-navy-500" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2 mb-4">
                  <p className="text-navy-500 text-sm">No pending suggestions</p>
                </div>
              )}
            </>
          )}

          <button
            onClick={() => setShowSuggestionsModal(true)}
            className="btn-secondary btn-sm w-full"
          >
            <Eye className="w-4 h-4" />
            View All Suggestions
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-8">
        <h2 className="font-display text-xl font-semibold text-white mb-4">Team Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <p className="text-3xl font-display font-bold text-white">{pupils.length}</p>
            <p className="text-sm text-navy-400">Players</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-display font-bold text-white">{coachCount}</p>
            <p className="text-sm text-navy-400">Coaches</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-display font-bold text-brand-primary">{team?.formation || '4-3-3'}</p>
            <p className="text-sm text-navy-400">Formation</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-display font-bold text-white">{team?.age_group}</p>
            <p className="text-sm text-navy-400">Age Group</p>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-semibold text-white">Invite Coach</h2>
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteError('')
                  setInviteSuccess(null)
                }}
                className="p-1 text-navy-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-pitch-500/10 border border-pitch-500/30 rounded-lg">
                  <Check className="w-5 h-5 text-pitch-400" />
                  <p className="text-pitch-400">Invite sent to {inviteSuccess.invite?.email}</p>
                </div>

                {inviteSuccess.inviteLink && (
                  <div>
                    <p className="text-sm text-navy-400 mb-2">Share this link with the coach:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteSuccess.inviteLink}
                        className="input text-sm"
                      />
                      <button
                        onClick={copyInviteLink}
                        className="btn-secondary btn-sm"
                      >
                        {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setInviteSuccess(null)}
                    className="btn-secondary flex-1"
                  >
                    Invite Another
                  </button>
                  <button
                    onClick={() => {
                      setShowInviteModal(false)
                      setInviteSuccess(null)
                    }}
                    className="btn-primary flex-1"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                {inviteError && (
                  <div className="flex items-center gap-2 p-3 bg-alert-500/10 border border-alert-500/30 rounded-lg text-alert-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {inviteError}
                  </div>
                )}

                <div>
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="coach@example.com"
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Role</label>
                  <select
                    value={inviteForm.role}
                    onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="input"
                  >
                    <option value="assistant">Assistant Coach</option>
                    <option value="scout">Scout</option>
                  </select>
                  <p className="text-xs text-navy-500 mt-1">
                    {inviteForm.role === 'assistant'
                      ? 'Can view and edit team data, manage pupils and matches'
                      : 'Can view team data and add observations'
                    }
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary flex-1"
                  >
                    {submitting ? (
                      <span className="spinner w-5 h-5" />
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send Invite
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-semibold text-white">Upload Document</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadFile(null)
                  setUploadDescription('')
                  setUploadVisibleToParents(false)
                }}
                className="p-1 text-navy-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="space-y-4">
              {/* File input */}
              <div>
                <label className="label">File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.csv"
                />
                {uploadFile ? (
                  <div className="flex items-center gap-3 p-3 bg-navy-800 rounded-lg">
                    <File className="w-5 h-5 text-navy-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{uploadFile.name}</p>
                      <p className="text-xs text-navy-500">{formatFileSize(uploadFile.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadFile(null)}
                      className="p-1 text-navy-400 hover:text-alert-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-6 border-2 border-dashed border-navy-700 rounded-lg hover:border-navy-500 transition-colors text-center"
                  >
                    <Upload className="w-8 h-8 text-navy-500 mx-auto mb-2" />
                    <p className="text-sm text-navy-400">Click to select a file</p>
                    <p className="text-xs text-navy-500 mt-1">Max 10MB · PDF, Word, Excel, Images</p>
                  </button>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="label">Description (optional)</label>
                <input
                  type="text"
                  value={uploadDescription}
                  onChange={e => setUploadDescription(e.target.value)}
                  placeholder="Brief description of the document"
                  className="input"
                />
              </div>

              {/* Visibility toggle */}
              <div className="flex items-center justify-between p-4 bg-navy-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {uploadVisibleToParents ? (
                    <Eye className="w-5 h-5 text-pitch-400" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-navy-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">Visible to Parents</p>
                    <p className="text-xs text-navy-500">
                      {uploadVisibleToParents
                        ? 'Parents can see this in Players Lounge'
                        : 'Only visible to coaches'
                      }
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadVisibleToParents(!uploadVisibleToParents)}
                  className={`
                    relative w-12 h-6 rounded-full transition-colors
                    ${uploadVisibleToParents ? 'bg-pitch-500' : 'bg-navy-600'}
                  `}
                >
                  <span
                    className={`
                      absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                      ${uploadVisibleToParents ? 'left-7' : 'left-1'}
                    `}
                  />
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="btn-primary flex-1"
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suggestions Modal */}
      {showSuggestionsModal && (
        <div className="modal-overlay" onClick={() => {
          setShowSuggestionsModal(false)
          setSelectedSuggestion(null)
          setResponseText('')
        }}>
          <div className="modal-content p-6 max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-semibold text-white flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-blue-400" />
                Team Suggestions
              </h2>
              <button
                onClick={() => {
                  setShowSuggestionsModal(false)
                  setSelectedSuggestion(null)
                  setResponseText('')
                }}
                className="p-1 text-navy-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedSuggestion ? (
              /* Suggestion Detail View */
              <div className="flex-1 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedSuggestion(null)
                    setResponseText('')
                  }}
                  className="text-sm text-navy-400 hover:text-white mb-4 flex items-center gap-1"
                >
                  ← Back to list
                </button>

                <div className="bg-navy-800/50 rounded-lg p-4 mb-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="font-semibold text-white text-lg">{selectedSuggestion.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          selectedSuggestion.category === 'training' ? 'bg-pitch-500/20 text-pitch-400' :
                          selectedSuggestion.category === 'communication' ? 'bg-blue-500/20 text-blue-400' :
                          selectedSuggestion.category === 'equipment' ? 'bg-energy-500/20 text-energy-400' :
                          selectedSuggestion.category === 'schedule' ? 'bg-caution-500/20 text-caution-400' :
                          'bg-navy-600 text-navy-400'
                        }`}>
                          {selectedSuggestion.category}
                        </span>
                        <span className="text-xs text-navy-500">
                          {new Date(selectedSuggestion.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      selectedSuggestion.status === 'pending' ? 'bg-caution-500/20 text-caution-400' :
                      selectedSuggestion.status === 'in_review' ? 'bg-blue-500/20 text-blue-400' :
                      selectedSuggestion.status === 'acknowledged' ? 'bg-pitch-500/20 text-pitch-400' :
                      selectedSuggestion.status === 'implemented' ? 'bg-energy-500/20 text-energy-400' :
                      'bg-alert-500/20 text-alert-400'
                    }`}>
                      {selectedSuggestion.status === 'in_review' ? 'In Review' :
                       selectedSuggestion.status.charAt(0).toUpperCase() + selectedSuggestion.status.slice(1)}
                    </span>
                  </div>

                  <p className="text-navy-300 text-sm mb-3">{selectedSuggestion.content}</p>

                  <div className="text-xs text-navy-500">
                    From: {selectedSuggestion.submitted_by_name}
                    {selectedSuggestion.player_name && ` (${selectedSuggestion.player_name})`}
                  </div>
                </div>

                {/* Previous Response */}
                {selectedSuggestion.coach_response && (
                  <div className="bg-pitch-500/10 border border-pitch-500/30 rounded-lg p-4 mb-4">
                    <p className="text-xs text-pitch-400 mb-1">Previous Response:</p>
                    <p className="text-navy-300 text-sm">{selectedSuggestion.coach_response}</p>
                    <p className="text-xs text-navy-500 mt-2">
                      - {selectedSuggestion.responded_by_name}
                    </p>
                  </div>
                )}

                {/* Status Buttons */}
                <div className="mb-4">
                  <p className="text-sm text-navy-400 mb-2">Update Status:</p>
                  <div className="flex flex-wrap gap-2">
                    {['pending', 'in_review', 'acknowledged', 'implemented', 'declined'].map(status => (
                      <button
                        key={status}
                        onClick={() => handleRespondToSuggestion(selectedSuggestion.id, status)}
                        disabled={respondingTo === selectedSuggestion.id}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedSuggestion.status === status
                            ? 'bg-white/10 text-white ring-1 ring-white/30'
                            : 'bg-navy-800 text-navy-400 hover:bg-navy-700 hover:text-white'
                        }`}
                      >
                        {status === 'in_review' ? 'In Review' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Response Form */}
                <div>
                  <label className="label">Add Response</label>
                  <textarea
                    value={responseText}
                    onChange={e => setResponseText(e.target.value)}
                    placeholder="Thank the submitter and let them know how you plan to address their suggestion..."
                    rows={3}
                    className="input resize-none"
                  />
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => handleDeleteSuggestion(selectedSuggestion.id)}
                      className="btn-secondary text-alert-400 hover:bg-alert-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                    <button
                      onClick={() => handleRespondToSuggestion(selectedSuggestion.id, null, responseText)}
                      disabled={!responseText.trim() || respondingTo === selectedSuggestion.id}
                      className="btn-primary flex-1"
                    >
                      {respondingTo === selectedSuggestion.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Response
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Suggestions List View */
              <div className="flex-1 overflow-y-auto">
                {suggestions.length === 0 ? (
                  <div className="text-center py-12">
                    <Lightbulb className="w-12 h-12 text-navy-600 mx-auto mb-3" />
                    <p className="text-navy-400">No suggestions yet</p>
                    <p className="text-sm text-navy-500 mt-1">
                      Players and parents can submit suggestions from their lounge
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {suggestions.map(suggestion => (
                      <div
                        key={suggestion.id}
                        onClick={() => setSelectedSuggestion(suggestion)}
                        className="flex items-center gap-3 p-3 bg-navy-800/50 rounded-lg cursor-pointer hover:bg-navy-800 transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          suggestion.status === 'pending' ? 'bg-caution-500/20' :
                          suggestion.status === 'in_review' ? 'bg-blue-500/20' :
                          suggestion.status === 'acknowledged' ? 'bg-pitch-500/20' :
                          suggestion.status === 'implemented' ? 'bg-energy-500/20' :
                          'bg-navy-700'
                        }`}>
                          <Lightbulb className={`w-4 h-4 ${
                            suggestion.status === 'pending' ? 'text-caution-400' :
                            suggestion.status === 'in_review' ? 'text-blue-400' :
                            suggestion.status === 'acknowledged' ? 'text-pitch-400' :
                            suggestion.status === 'implemented' ? 'text-energy-400' :
                            'text-navy-500'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{suggestion.title}</p>
                          <div className="flex items-center gap-2 text-xs text-navy-500">
                            <span>{suggestion.submitted_by_name}</span>
                            <span>·</span>
                            <span>{suggestion.category}</span>
                            <span>·</span>
                            <span>{new Date(suggestion.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                          suggestion.status === 'pending' ? 'bg-caution-500/20 text-caution-400' :
                          suggestion.status === 'in_review' ? 'bg-blue-500/20 text-blue-400' :
                          suggestion.status === 'acknowledged' ? 'bg-pitch-500/20 text-pitch-400' :
                          suggestion.status === 'implemented' ? 'bg-energy-500/20 text-energy-400' :
                          'bg-alert-500/20 text-alert-400'
                        }`}>
                          {suggestion.status === 'in_review' ? 'In Review' :
                           suggestion.status.charAt(0).toUpperCase() + suggestion.status.slice(1)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-navy-500 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
