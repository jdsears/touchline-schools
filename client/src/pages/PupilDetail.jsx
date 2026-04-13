// PupilDetail.jsx
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  User,
  Calendar,
  Phone,
  Edit2,
  Trash2,
  Save,
  X,
  Plus,
  Sparkles,
  Loader2,
  ChevronRight,
  Target,
  Brain,
  Zap,
  Heart,
  FileText,
  MessageSquare,
  TrendingUp,
  Clock,
  Mail,
  UserPlus,
  Copy,
  Check,
  AlertCircle,
  Trophy,
  Activity,
  Circle,
  Link2,
  Dumbbell,
  Lock,
  Award,
  Star,
} from 'lucide-react'
import { teamService, trainingService } from '../services/api'
import { useTeam } from '../context/TeamContext'
import toast from 'react-hot-toast'
import AIMarkdown from '../components/AIMarkdown'
import PlayerRadarChart from '../components/PupilRadarChart'

const positions = {
  GK: { label: 'Goalkeeper', color: 'caution' },
  CB: { label: 'Centre Back', color: 'blue' },
  LB: { label: 'Left Back', color: 'blue' },
  RB: { label: 'Right Back', color: 'blue' },
  CDM: { label: 'Defensive Mid', color: 'pitch' },
  CM: { label: 'Central Mid', color: 'pitch' },
  CAM: { label: 'Attacking Mid', color: 'pitch' },
  LM: { label: 'Left Mid', color: 'pitch' },
  RM: { label: 'Right Mid', color: 'pitch' },
  LW: { label: 'Left Wing', color: 'alert' },
  RW: { label: 'Right Wing', color: 'alert' },
  ST: { label: 'Striker', color: 'alert' },
  CF: { label: 'Centre Forward', color: 'alert' },
}

const observationTypes = [
  { value: 'technical', label: 'Technical', icon: Target, color: 'pitch' },
  { value: 'tactical', label: 'Tactical', icon: Brain, color: 'blue' },
  { value: 'physical', label: 'Physical', icon: Zap, color: 'energy' },
  { value: 'mental', label: 'Mental/Character', icon: Heart, color: 'alert' },
  { value: 's&c', label: 'S&C', icon: Dumbbell, color: 'caution' },
]

const tabs = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'observations', label: 'Observations', icon: FileText },
  { id: 'development', label: 'Development', icon: TrendingUp },
]

// Helper to parse and format parent contacts
function parseParentContacts(contactData) {
  if (!contactData) return []

  // If it's already an array, use it
  if (Array.isArray(contactData)) return contactData

  // If it's a string, try to parse as JSON
  if (typeof contactData === 'string') {
    // Check if it looks like JSON array
    if (contactData.trim().startsWith('[')) {
      try {
        return JSON.parse(contactData)
      } catch {
        // If parsing fails, treat as simple string
        return [{ name: '', email: '', phone: contactData }]
      }
    }
    // Simple string - treat as phone/email
    return [{ name: '', email: '', phone: contactData }]
  }

  // If it's a single object
  if (typeof contactData === 'object') {
    return [contactData]
  }

  return []
}

export default function PupilDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { updatePlayer, deletePlayer, pupils: teamPlayers } = useTeam()

  const [pupil, setPlayer] = useState(null)
  const [observations, setObservations] = useState([])
  const [idp, setIdp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Edit states
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)

  // Observation modal
  const [showObsModal, setShowObsModal] = useState(false)
  const [newObs, setNewObs] = useState({ type: 'technical', content: '', context: '', contextType: 'general', matchId: null, trainingSessionId: null })
  const [addingObs, setAddingObs] = useState(false)
  const [recentMatches, setRecentMatches] = useState([])
  const [recentTrainingSessions, setRecentTrainingSessions] = useState([])

  // Edit observation modal
  const [editingObs, setEditingObs] = useState(null)
  const [editObsData, setEditObsData] = useState({ type: 'technical', content: '', context: '', contextType: 'general', matchId: null, trainingSessionId: null })
  const [updatingObs, setUpdatingObs] = useState(false)

  // Delete observation confirmation
  const [deletingObsId, setDeletingObsId] = useState(null)
  const [confirmDeleteObs, setConfirmDeleteObs] = useState(false)

  // IDP generation
  const [generatingIdp, setGeneratingIdp] = useState(false)
  const [idpReviewWeeks, setIdpReviewWeeks] = useState(6)
  const [idpAutoReview, setIdpAutoReview] = useState(false)

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Parent invite modal
  const [showInviteParentModal, setShowInviteParentModal] = useState(false)
  const [parentInviteEmail, setParentInviteEmail] = useState('')
  const [invitingParent, setInvitingParent] = useState(false)
  const [parentInviteError, setParentInviteError] = useState('')
  const [parentInviteSuccess, setParentInviteSuccess] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [parentInvites, setParentInvites] = useState([])

  // Achievements/badges
  const [achievements, setAchievements] = useState([])
  const [showAwardModal, setShowAwardModal] = useState(false)
  const [awardData, setAwardData] = useState({ achievement_type: '', title: '', description: '', icon: '' })
  const [awardingBadge, setAwardingBadge] = useState(false)
  const [badgeTypes, setBadgeTypes] = useState({})

  // Attribute analysis
  const [showAttributeAnalysis, setShowAttributeAnalysis] = useState(false)
  const [attributeAnalysis, setAttributeAnalysis] = useState(null)
  const [analyzingAttributes, setAnalyzingAttributes] = useState(false)

  useEffect(() => {
    loadPlayerData()
  }, [id])

  async function loadPlayerData() {
    setLoading(true)
    try {
      const [playerRes, obsRes, idpRes, invitesRes, achievementsRes, badgeTypesRes] = await Promise.all([
        teamService.getPlayer(id),
        teamService.getObservations(id).catch(() => ({ data: [] })),
        teamService.getIDP(id).catch(() => ({ data: null })),
        teamService.getPlayerInvites(id).catch(() => ({ data: [] })),
        teamService.getAchievements(id).catch((err) => {
          console.error('Failed to load achievements:', err)
          return { data: [] }
        }),
        teamService.getBadgeTypes().catch(() => ({ data: {} })),
      ])

      if (!playerRes.data) {
        throw new Error('Pupil not found')
      }

      setPlayer(playerRes.data)
      setObservations(obsRes.data || [])
      setIdp(idpRes.data)
      if (idpRes.data?.review_weeks != null) setIdpReviewWeeks(idpRes.data.review_weeks)
      if (idpRes.data?.auto_review != null) setIdpAutoReview(idpRes.data.auto_review)
      setEditData(playerRes.data)
      setParentInvites(invitesRes.data || [])
      setAchievements(achievementsRes.data || [])
      setBadgeTypes(badgeTypesRes.data || {})

      // Load saved attribute analysis if exists
      if (playerRes.data.attribute_analysis) {
        setAttributeAnalysis({
          analysis: playerRes.data.attribute_analysis,
          generated_at: playerRes.data.attribute_analysis_at,
        })
      }

      // Load recent matches and training sessions for observation context (non-blocking)
      if (playerRes.data.team_id) {
        try {
          const [matchesRes, trainingRes] = await Promise.all([
            teamService.getMatches(playerRes.data.team_id).catch(() => ({ data: [] })),
            trainingService.getSessions(playerRes.data.team_id).catch(() => ({ data: [] })),
          ])
          const now = new Date()
          setRecentMatches((matchesRes.data || []).filter(m => new Date(m.date) <= now).slice(0, 10))
          setRecentTrainingSessions((trainingRes.data || []).slice(0, 10))
        } catch (err) {
          console.error('Failed to load matches/training for observation context:', err)
        }
      }
    } catch (error) {
      console.error('Failed to load pupil:', error)
      toast.error('Failed to load pupil data')
    } finally {
      setLoading(false)
    }
  }

  function calculateAge(dob) {
    if (!dob) return null
    const today = new Date()
    const birthDate = new Date(dob)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  async function handleSave() {
    setSaving(true)
    const result = await updatePlayer(id, editData)

    if (result.success) {
      // Use server response (normalized positions) to keep state consistent
      setPlayer(result.pupil || editData)
      setEditData(result.pupil || editData)
      setEditing(false)
      toast.success('Pupil updated!')
    } else {
      toast.error(result.error || 'Failed to update pupil')
    }
    setSaving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deletePlayer(id)

    if (result.success) {
      toast.success('Pupil deleted')
      navigate('/pupils')
    } else {
      toast.error(result.error || 'Failed to delete pupil')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  async function handleAddObservation(e) {
    e.preventDefault()
    setAddingObs(true)

    try {
      const response = await teamService.addObservation(id, newObs)
      setObservations(prev => [response.data, ...prev])
      setShowObsModal(false)
      setNewObs({ type: 'technical', content: '', context: '', contextType: 'general', matchId: null, trainingSessionId: null })
      toast.success('Observation added!')
    } catch (error) {
      toast.error('Failed to add observation')
    }

    setAddingObs(false)
  }

  function openEditObsModal(obs) {
    setEditingObs(obs)
    setEditObsData({
      type: obs.type,
      content: obs.content,
      context: obs.context || '',
      contextType: obs.context_type || 'general',
      matchId: obs.match_id || null,
      trainingSessionId: obs.training_session_id || null,
    })
  }

  async function handleUpdateObservation(e) {
    e.preventDefault()
    setUpdatingObs(true)

    try {
      const response = await teamService.updateObservation(id, editingObs.id, editObsData)
      setObservations(prev => prev.map(obs => obs.id === editingObs.id ? response.data : obs))
      setEditingObs(null)
      toast.success('Observation updated!')
    } catch (error) {
      toast.error('Failed to update observation')
    }

    setUpdatingObs(false)
  }

  async function handleDeleteObservation() {
    if (!deletingObsId) return

    try {
      await teamService.deleteObservation(id, deletingObsId)
      setObservations(prev => prev.filter(obs => obs.id !== deletingObsId))
      setConfirmDeleteObs(false)
      setDeletingObsId(null)
      toast.success('Observation deleted!')
    } catch (error) {
      toast.error('Failed to delete observation')
    }
  }

  async function handleAwardBadge() {
    if (!awardData.achievement_type || !awardData.title) {
      toast.error('Please select a badge type')
      return
    }

    setAwardingBadge(true)
    try {
      const response = await teamService.awardAchievement(id, awardData)
      setAchievements(prev => [response.data, ...prev])
      setShowAwardModal(false)
      setAwardData({ achievement_type: '', title: '', description: '', icon: '' })
      toast.success('Badge awarded! Pupil will be notified.')
    } catch (error) {
      toast.error('Failed to award badge')
    }
    setAwardingBadge(false)
  }

  async function handleDeleteAchievement(achievementId) {
    try {
      await teamService.deleteAchievement(id, achievementId)
      setAchievements(prev => prev.filter(a => a.id !== achievementId))
      toast.success('Badge removed')
    } catch (error) {
      toast.error('Failed to remove badge')
    }
  }

  async function handleAnalyzeAttributes() {
    setAnalyzingAttributes(true)
    setShowAttributeAnalysis(true)

    try {
      const response = await teamService.analyzeAttributes(id)
      setAttributeAnalysis(response.data)

      // Immediately update pupil with extracted attributes from the response
      // so the radar chart shows without waiting for a second API call
      if (response.data.attributes) {
        const attrs = response.data.attributes
        setPlayer(prev => ({
          ...prev,
          ...(attrs.physical_attributes && Object.keys(attrs.physical_attributes).length > 0 && { physical_attributes: attrs.physical_attributes }),
          ...(attrs.technical_skills && Object.keys(attrs.technical_skills).length > 0 && { technical_skills: attrs.technical_skills }),
          ...(attrs.tactical_understanding && Object.keys(attrs.tactical_understanding).length > 0 && { tactical_understanding: attrs.tactical_understanding }),
          ...(attrs.mental_traits && Object.keys(attrs.mental_traits).length > 0 && { mental_traits: attrs.mental_traits }),
          ...(attrs.core_capabilities && Object.keys(attrs.core_capabilities).length > 0 && { core_capabilities: attrs.core_capabilities }),
          attribute_analysis: response.data.analysis,
          attribute_analysis_at: response.data.generated_at,
        }))
      }

      // Also refresh from database for full consistency
      try {
        const playerRes = await teamService.getPlayer(id)
        if (playerRes.data) {
          setPlayer(playerRes.data)
          setEditData(playerRes.data)
        }
      } catch (refreshErr) {
        console.error('Pupil refresh after analysis failed (non-fatal):', refreshErr)
      }

      toast.success('Attributes analyzed and saved')
    } catch (error) {
      toast.error('Failed to analyze attributes')
      setShowAttributeAnalysis(false)
    }

    setAnalyzingAttributes(false)
  }

  function selectBadgeType(type) {
    const badge = badgeTypes[type]
    if (badge) {
      setAwardData({
        achievement_type: type,
        title: badge.title,
        description: badge.description,
        icon: badge.icon
      })
    }
  }

  function handleReviewWeeksChange(weeks) {
    setIdpReviewWeeks(weeks)
    if (idp) {
      teamService.updateIDPSettings(id, { review_weeks: weeks }).then(res => {
        setIdp(prev => ({ ...prev, review_weeks: res.data.review_weeks, next_review_at: res.data.next_review_at }))
      }).catch(() => {})
    }
  }

  function handleAutoReviewChange(enabled) {
    setIdpAutoReview(enabled)
    if (idp) {
      teamService.updateIDPSettings(id, { auto_review: enabled }).then(res => {
        setIdp(prev => ({ ...prev, auto_review: res.data.auto_review }))
      }).catch(() => {})
    }
  }

  async function handleGenerateIdp() {
    setGeneratingIdp(true)

    try {
      const token = localStorage.getItem('fam_token')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      const response = await fetch(`${apiUrl}/pupils/${id}/idp/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          review_weeks: idpReviewWeeks,
          auto_review: idpAutoReview,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to generate')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let streamedText = ''

      // Show a temporary IDP object so the card renders while streaming
      setIdp(prev => prev || { notes: '', generated_content: '' })

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'text') {
              streamedText += event.text
              setIdp(prev => ({ ...prev, generated_content: streamedText }))
            } else if (event.type === 'done' && event.idp) {
              setIdp(event.idp)
            } else if (event.type === 'error') {
              throw new Error(event.message)
            }
          } catch (e) {
            if (e.message !== 'Generation failed' && !e.message?.includes('No content')) {
              // JSON parse error — ignore partial chunks
            } else {
              throw e
            }
          }
        }
      }

      toast.success('Development plan generated!')
    } catch (error) {
      toast.error(error.message || 'Failed to generate development plan')
    }

    setGeneratingIdp(false)
  }

  async function handleInviteParent(e) {
    e.preventDefault()
    setParentInviteError('')
    setParentInviteSuccess(null)
    setInvitingParent(true)

    try {
      const response = await teamService.inviteParent(id, parentInviteEmail)
      setParentInviteSuccess(response.data)
      setParentInvites([response.data.invite, ...parentInvites])
      setParentInviteEmail('')
      toast.success('Parent invite sent!')
    } catch (error) {
      setParentInviteError(error.response?.data?.message || 'Failed to send invite')
    } finally {
      setInvitingParent(false)
    }
  }

  function copyInviteLink() {
    if (parentInviteSuccess?.inviteLink) {
      navigator.clipboard.writeText(parentInviteSuccess.inviteLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  // Helper to get positions array (handles both old format and new format)
  function getPositionsArray(posData) {
    if (!posData) return []
    if (Array.isArray(posData)) {
      // Check if it's the new format (array of objects) or old format (array of strings)
      if (posData.length > 0 && typeof posData[0] === 'object') {
        return posData
      }
      // Convert old format to new format (first position is primary, etc.)
      return posData.map((pos, idx) => ({
        position: pos,
        priority: idx === 0 ? 'primary' : idx === 1 ? 'secondary' : 'tertiary'
      }))
    }
    return []
  }

  // Cycle through position priorities: none → primary → secondary → tertiary → none
  function cyclePositionPriority(pos) {
    setEditData(prev => {
      const currentPositions = getPositionsArray(prev.positions)
      const existingIndex = currentPositions.findIndex(p => p.position === pos)

      if (existingIndex === -1) {
        // Not selected - check if we can add
        if (currentPositions.length >= 3) {
          toast.error('Maximum 3 positions allowed')
          return prev
        }
        // Determine next available priority
        const usedPriorities = currentPositions.map(p => p.priority)
        let newPriority = 'primary'
        if (usedPriorities.includes('primary')) {
          newPriority = usedPriorities.includes('secondary') ? 'tertiary' : 'secondary'
        }
        return { ...prev, positions: [...currentPositions, { position: pos, priority: newPriority }] }
      }

      // Already selected - cycle priority or remove
      const currentPriority = currentPositions[existingIndex].priority
      const priorities = ['primary', 'secondary', 'tertiary']
      const currentPriorityIndex = priorities.indexOf(currentPriority)

      // Get what priorities are used by OTHER positions
      const otherPriorities = currentPositions
        .filter((_, idx) => idx !== existingIndex)
        .map(p => p.priority)

      // Try to find next available priority (must be different from current)
      for (let i = 1; i <= 3; i++) {
        const nextPriorityIndex = (currentPriorityIndex + i) % 3
        const nextPriority = priorities[nextPriorityIndex]
        // Skip if same as current priority or already used by another position
        if (nextPriority !== currentPriority && !otherPriorities.includes(nextPriority)) {
          // Found an available priority - use it
          const updated = [...currentPositions]
          updated[existingIndex] = { ...updated[existingIndex], priority: nextPriority }
          return { ...prev, positions: updated }
        }
      }

      // No available priority after cycling - remove the position
      return { ...prev, positions: currentPositions.filter((_, idx) => idx !== existingIndex) }
    })
  }

  // Get display positions sorted by priority
  function getSortedPositions(posData) {
    const positions = getPositionsArray(posData)
    const priorityOrder = { primary: 0, secondary: 1, tertiary: 2 }
    return [...positions].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  }

  // Get primary position for display
  function getPrimaryPosition(posData) {
    const positions = getPositionsArray(posData)
    return positions.find(p => p.priority === 'primary')?.position || null
  }

  function getPositionBadgeClass(pos) {
    const config = positions[pos]
    if (!config) return 'badge-navy'
    return `badge-${config.color}`
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-pitch-400" />
      </div>
    )
  }

  if (!pupil) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <Link to="/pupils" className="inline-flex items-center gap-2 text-navy-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Players
        </Link>
        <div className="card p-8 text-center">
          <User className="w-12 h-12 text-navy-600 mx-auto mb-4" />
          <h1 className="font-display text-xl font-bold text-white mb-2">Pupil Not Found</h1>
          <p className="text-navy-400">This pupil may have been deleted or doesn't exist.</p>
        </div>
      </div>
    )
  }

  const age = calculateAge(pupil.dob)

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Back link */}
      <Link to="/pupils" className="inline-flex items-center gap-2 text-navy-400 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Players
      </Link>

      {/* Pupil Header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-pitch-500 to-pitch-700 flex items-center justify-center text-3xl font-bold text-white shrink-0">
            {pupil.squad_number || pupil.name.charAt(0)}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h1 className="font-display text-2xl lg:text-3xl font-bold text-white mb-1">
                  {pupil.name}
                </h1>
                <div className="flex flex-wrap gap-2">
                  {getSortedPositions(pupil.positions).map(({ position: pos, priority }) => (
                    <span
                      key={pos}
                      className={`${getPositionBadgeClass(pos)} ${priority !== 'primary' ? 'opacity-70' : ''}`}
                      title={`${priority.charAt(0).toUpperCase() + priority.slice(1)} position`}
                    >
                      {positions[pos]?.label || pos}
                      {priority === 'primary' && <span className="ml-1 text-xs opacity-75">(1st)</span>}
                      {priority === 'secondary' && <span className="ml-1 text-xs opacity-75">(2nd)</span>}
                      {priority === 'tertiary' && <span className="ml-1 text-xs opacity-75">(3rd)</span>}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowInviteParentModal(true)}
                  className="btn-ghost"
                  title="Invite Parent"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="btn-ghost"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn-ghost text-alert-400 hover:text-alert-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-navy-400">
              {age && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {age} years old
                </span>
              )}
              {pupil.dob && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  DOB: {formatDate(pupil.dob)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors
                ${activeTab === tab.id
                  ? 'bg-pitch-600 text-white'
                  : 'bg-navy-800 text-navy-400 hover:text-white hover:bg-navy-700'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'observations' && observations.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-navy-900">
                  {observations.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Parent/Guardian Contacts */}
            {pupil.parent_contact && parseParentContacts(pupil.parent_contact).length > 0 && (
              <div className="card p-6">
                <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-pitch-400" />
                  Parent/Guardian Contacts
                </h2>
                <div className="grid gap-3">
                  {parseParentContacts(pupil.parent_contact).map((contact, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 bg-navy-800/50 rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-full bg-navy-700 flex items-center justify-center text-navy-300 text-sm font-medium shrink-0">
                        {contact.name ? contact.name.charAt(0).toUpperCase() : 'P'}
                      </div>
                      <div className="flex-1 min-w-0">
                        {contact.name && (
                          <p className="font-medium text-white">{contact.name}</p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              className="text-sm text-navy-400 hover:text-pitch-400 flex items-center gap-1.5"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              {contact.email}
                            </a>
                          )}
                          {contact.phone && (
                            <a
                              href={`tel:${contact.phone}`}
                              className="text-sm text-navy-400 hover:text-pitch-400 flex items-center gap-1.5"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              {contact.phone}
                            </a>
                          )}
                        </div>
                        {!contact.name && !contact.email && !contact.phone && (
                          <p className="text-sm text-navy-500">No contact details</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {pupil.notes && (
              <div className="card p-6">
                <h2 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-pitch-400" />
                  Notes
                </h2>
                <p className="text-navy-300 whitespace-pre-wrap">{pupil.notes}</p>
              </div>
            )}

            {/* Discreet Notes - Private coach notes about pupil psychology/communication */}
            {pupil.discreet_notes && (
              <div className="card p-6 border border-navy-600 bg-navy-900/50">
                <h2 className="font-display font-semibold text-white mb-2 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-caution-400" />
                  Discreet Notes
                  <span className="text-xs font-normal text-caution-400 bg-caution-500/10 px-2 py-0.5 rounded-full">
                    Coach Only
                  </span>
                </h2>
                <p className="text-xs text-navy-500 mb-3">
                  Private notes about pupil psychology and communication. Never shared with AI or the pupil/parent portal.
                </p>
                <p className="text-navy-300 whitespace-pre-wrap">{pupil.discreet_notes}</p>
              </div>
            )}

            {/* Achievements/Badges */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-energy-400" />
                  Achievements & Badges
                </h2>
                <button
                  onClick={() => setShowAwardModal(true)}
                  className="text-sm text-pitch-400 hover:text-pitch-300 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Award Badge
                </button>
              </div>

              {achievements.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {achievements.map(achievement => (
                    <div
                      key={achievement.id}
                      className="relative group bg-gradient-to-br from-navy-800 to-navy-900 rounded-xl p-4 text-center border border-navy-700 hover:border-energy-500/30 transition-all"
                    >
                      <button
                        onClick={() => handleDeleteAchievement(achievement.id)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-navy-700 text-navy-400 hover:text-alert-400 hover:bg-alert-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove badge"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="text-3xl mb-2">{achievement.icon || '🏅'}</div>
                      <p className="font-medium text-white text-sm">{achievement.title}</p>
                      {achievement.match_opponent && (
                        <p className="text-xs text-navy-400 mt-1">vs {achievement.match_opponent}</p>
                      )}
                      {achievement.description && (
                        <p className="text-xs text-navy-500 mt-1 line-clamp-2">{achievement.description}</p>
                      )}
                      <p className="text-xs text-navy-600 mt-2">
                        {new Date(achievement.earned_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-navy-400">
                  <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No badges earned yet</p>
                  <p className="text-sm text-navy-500 mt-1">Award badges to recognize great performances</p>
                </div>
              )}
            </div>

            {/* Pupil Attributes Radar Chart */}
            <PupilRadarChart pupil={pupil} teamPlayers={teamPlayers} />

            {/* Analyze Attributes Button */}
            <div className="flex justify-center">
              <button
                onClick={handleAnalyzeAttributes}
                disabled={analyzingAttributes}
                className="btn-primary flex items-center gap-2"
              >
                {analyzingAttributes ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Analyze Attributes with AI
                  </>
                )}
              </button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => {
                  setActiveTab('observations')
                  setShowObsModal(true)
                }}
                className="card-hover p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-pitch-500/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-pitch-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-white">Add Observation</p>
                  <p className="text-sm text-navy-400">Log a training or match note</p>
                </div>
                <ChevronRight className="w-5 h-5 text-navy-600 ml-auto" />
              </button>

              <Link
                to={`/pupils/${id}/assistant`}
                className="card-hover p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pitch-500/20 to-energy-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-pitch-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-white">Pupil AI Coach</p>
                  <p className="text-sm text-navy-400">Personal assistant for {pupil.name?.split(' ')[0]}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-navy-600 ml-auto" />
              </Link>

              <Link
                to={`/chat?q=Give me training recommendations for ${pupil.name}`}
                className="card-hover p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-energy-500/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-energy-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-white">Coach AI</p>
                  <p className="text-sm text-navy-400">Get development advice</p>
                </div>
                <ChevronRight className="w-5 h-5 text-navy-600 ml-auto" />
              </Link>
            </div>
          </motion.div>
        )}

        {activeTab === 'observations' && (
          <motion.div
            key="observations"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-white">
                Observations ({observations.length})
              </h2>
              <button onClick={() => setShowObsModal(true)} className="btn-primary">
                <Plus className="w-4 h-4" />
                Add Observation
              </button>
            </div>

            {observations.length === 0 ? (
              <div className="card p-8 text-center">
                <FileText className="w-12 h-12 text-navy-600 mx-auto mb-4" />
                <h3 className="font-display text-lg font-semibold text-white mb-2">
                  No observations yet
                </h3>
                <p className="text-navy-400 mb-4">
                  Start logging observations from training and matches to track development.
                </p>
                <button onClick={() => setShowObsModal(true)} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  Add First Observation
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {observations.map((obs, index) => {
                  const typeConfig = observationTypes.find(t => t.value === obs.type)
                  const TypeIcon = typeConfig?.icon || FileText
                  return (
                    <motion.div
                      key={obs.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="card p-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl bg-${typeConfig?.color || 'navy'}-500/10 flex items-center justify-center shrink-0`}>
                          <TypeIcon className={`w-5 h-5 text-${typeConfig?.color || 'navy'}-400`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`badge-${typeConfig?.color || 'navy'}`}>
                              {typeConfig?.label || obs.type}
                            </span>
                            {obs.context_type === 'match' && obs.match_opponent && (
                              <span className="inline-flex items-center gap-1 text-xs bg-energy-500/10 text-energy-400 px-2 py-0.5 rounded-full">
                                <Trophy className="w-3 h-3" />
                                vs {obs.match_opponent}
                              </span>
                            )}
                            {obs.context_type === 'training' && obs.training_date && (
                              <span className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                                <Activity className="w-3 h-3" />
                                Training {new Date(obs.training_date).toLocaleDateString()}
                              </span>
                            )}
                            {obs.context && (
                              <span className="text-xs text-navy-500">{obs.context}</span>
                            )}
                          </div>
                          <p className="text-navy-300 whitespace-pre-wrap">{obs.content}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-3 text-xs text-navy-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(obs.created_at)}
                              </span>
                              {obs.observer_name && (
                                <span>by {obs.observer_name}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditObsModal(obs)}
                                className="p-1.5 text-navy-500 hover:text-white hover:bg-navy-700 rounded-lg transition-colors"
                                title="Edit observation"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingObsId(obs.id)
                                  setConfirmDeleteObs(true)
                                }}
                                className="p-1.5 text-navy-500 hover:text-alert-400 hover:bg-alert-500/10 rounded-lg transition-colors"
                                title="Delete observation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'development' && (
          <motion.div
            key="development"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-white">
                Individual Development Plan
              </h2>
              <button
                onClick={handleGenerateIdp}
                disabled={generatingIdp}
                className="btn-primary"
              >
                {generatingIdp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {idp ? 'Regenerate IDP' : 'Generate IDP'}
                  </>
                )}
              </button>
            </div>

            {/* Review period settings */}
            <div className="card p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-2 flex-1">
                <label className="text-sm text-navy-300 whitespace-nowrap">Review period:</label>
                <select
                  value={idpReviewWeeks}
                  onChange={(e) => handleReviewWeeksChange(Number(e.target.value))}
                  className="input-field py-1.5 px-2 w-auto text-sm"
                >
                  {[2, 3, 4, 5, 6, 8, 10, 12].map(w => (
                    <option key={w} value={w}>{w} weeks</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={idpAutoReview}
                    onChange={(e) => handleAutoReviewChange(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-9 h-5 rounded-full transition-colors ${idpAutoReview ? 'bg-pitch-500' : 'bg-navy-700'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${idpAutoReview ? 'translate-x-4.5 ml-[18px]' : 'translate-x-0.5 ml-[2px]'}`} />
                  </div>
                </div>
                <span className="text-sm text-navy-300">Auto-generate after review period</span>
              </label>
            </div>

            {idp ? (
              <div className="card p-6">
                {idp.generated_content || idp.notes ? (
                  <AIMarkdown>
                    {idp.generated_content || idp.notes}
                  </AIMarkdown>
                ) : (
                  <div className="space-y-6">
                    {/* Strengths */}
                    {idp.strengths && idp.strengths.length > 0 && (
                      <div>
                        <h3 className="font-display font-semibold text-white mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-pitch-500" />
                          Strengths
                        </h3>
                        <ul className="space-y-1 text-navy-300">
                          {idp.strengths.map((s, i) => (
                            <li key={i}>• {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Areas to Improve */}
                    {idp.areas_to_improve && idp.areas_to_improve.length > 0 && (
                      <div>
                        <h3 className="font-display font-semibold text-white mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-energy-500" />
                          Areas to Improve
                        </h3>
                        <ul className="space-y-1 text-navy-300">
                          {idp.areas_to_improve.map((a, i) => (
                            <li key={i}>• {a}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Goals */}
                    {idp.goals && idp.goals.length > 0 && (
                      <div>
                        <h3 className="font-display font-semibold text-white mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          Development Goals
                        </h3>
                        <ul className="space-y-1 text-navy-300">
                          {idp.goals.map((g, i) => (
                            <li key={i}>• {g}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-navy-800 text-xs text-navy-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>Generated on {formatDate(idp.created_at)}</span>
                  {idp.next_review_at && (
                    <span>
                      Next review: {formatDate(idp.next_review_at)}
                      {idp.auto_review && ' (auto)'}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="card p-8 text-center">
                <TrendingUp className="w-12 h-12 text-navy-600 mx-auto mb-4" />
                <h3 className="font-display text-lg font-semibold text-white mb-2">
                  No Development Plan Yet
                </h3>
                <p className="text-navy-400 mb-4 max-w-md mx-auto">
                  Generate an AI-powered Individual Development Plan based on observations and pupil data.
                  {observations.length === 0 && (
                    <span className="block mt-2 text-caution-400">
                      Tip: Add some observations first for a more detailed plan.
                    </span>
                  )}
                </p>
                <button
                  onClick={handleGenerateIdp}
                  disabled={generatingIdp}
                  className="btn-primary"
                >
                  {generatingIdp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Development Plan
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setEditing(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-navy-800 flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-white">Edit Pupil</h2>
                <button
                  onClick={() => setEditing(false)}
                  className="p-2 text-navy-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="label">Pupil Name *</label>
                    <input
                      type="text"
                      value={editData.name || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Squad #</label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={editData.squad_number || editData.squadNumber || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, squadNumber: e.target.value ? parseInt(e.target.value) : null, squad_number: e.target.value ? parseInt(e.target.value) : null }))}
                      className="input text-center"
                      placeholder="7"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Date of Birth</label>
                  <input
                    type="date"
                    value={editData.dob?.split('T')[0] || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, dob: e.target.value }))}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Positions ({getPositionsArray(editData.positions).length}/3)</label>
                  <p className="text-xs text-navy-500 mb-2">
                    Click to add position, click again to cycle priority (1st → 2nd → 3rd → remove)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(positions).map(([key, { label }]) => {
                      const positionsArr = getPositionsArray(editData.positions)
                      const posData = positionsArr.find(p => p.position === key)
                      const isSelected = !!posData
                      const isDisabled = !isSelected && positionsArr.length >= 3
                      const priorityLabel = posData?.priority === 'primary' ? '1st' :
                                           posData?.priority === 'secondary' ? '2nd' :
                                           posData?.priority === 'tertiary' ? '3rd' : ''
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => cyclePositionPriority(key)}
                          disabled={isDisabled}
                          className={`
                            px-3 py-1.5 rounded-lg text-sm font-medium transition-colors relative
                            ${isSelected
                              ? posData?.priority === 'primary'
                                ? 'bg-pitch-600 text-white'
                                : posData?.priority === 'secondary'
                                  ? 'bg-pitch-600/70 text-white'
                                  : 'bg-pitch-600/50 text-white'
                              : isDisabled
                                ? 'bg-navy-900 text-navy-600 cursor-not-allowed'
                                : 'bg-navy-800 text-navy-400 hover:text-white'
                            }
                          `}
                          title={isDisabled ? 'Maximum 3 positions' : isSelected ? `Click to change priority (${priorityLabel})` : label}
                        >
                          {key}
                          {isSelected && (
                            <span className="ml-1 text-xs opacity-75">({priorityLabel})</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {getPositionsArray(editData.positions).length > 0 && (
                    <div className="mt-3 text-xs text-navy-400">
                      <span className="font-medium text-white">Selected:</span>{' '}
                      {getSortedPositions(editData.positions).map(({ position: pos, priority }, idx) => (
                        <span key={pos}>
                          {idx > 0 && ' → '}
                          <span className={priority === 'primary' ? 'text-pitch-400' : 'text-navy-300'}>
                            {positions[pos]?.label} ({priority === 'primary' ? '1st' : priority === 'secondary' ? '2nd' : '3rd'})
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="label">Parent/Guardian Contacts</label>
                  <div className="space-y-3">
                    {parseParentContacts(editData.parent_contact).map((contact, index) => (
                      <div key={index} className="p-3 bg-navy-800/50 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-navy-400 font-medium">Contact {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const contacts = parseParentContacts(editData.parent_contact)
                              const updated = contacts.filter((_, i) => i !== index)
                              setEditData(prev => ({
                                ...prev,
                                parent_contact: updated.length > 0 ? JSON.stringify(updated) : null
                              }))
                            }}
                            className="p-1 text-navy-500 hover:text-alert-400 hover:bg-alert-500/10 rounded transition-colors"
                            title="Remove contact"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={contact.name || ''}
                            onChange={(e) => {
                              const contacts = parseParentContacts(editData.parent_contact)
                              contacts[index] = { ...contacts[index], name: e.target.value }
                              setEditData(prev => ({ ...prev, parent_contact: JSON.stringify(contacts) }))
                            }}
                            className="input text-sm"
                            placeholder="Name"
                          />
                          <input
                            type="email"
                            value={contact.email || ''}
                            onChange={(e) => {
                              const contacts = parseParentContacts(editData.parent_contact)
                              contacts[index] = { ...contacts[index], email: e.target.value }
                              setEditData(prev => ({ ...prev, parent_contact: JSON.stringify(contacts) }))
                            }}
                            className="input text-sm"
                            placeholder="Email"
                          />
                          <input
                            type="tel"
                            value={contact.phone || ''}
                            onChange={(e) => {
                              const contacts = parseParentContacts(editData.parent_contact)
                              contacts[index] = { ...contacts[index], phone: e.target.value }
                              setEditData(prev => ({ ...prev, parent_contact: JSON.stringify(contacts) }))
                            }}
                            className="input text-sm"
                            placeholder="Phone"
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const contacts = parseParentContacts(editData.parent_contact)
                        const updated = [...contacts, { name: '', email: '', phone: '' }]
                        setEditData(prev => ({ ...prev, parent_contact: JSON.stringify(updated) }))
                      }}
                      className="w-full p-2 border border-dashed border-navy-600 rounded-lg text-sm text-navy-400 hover:text-pitch-400 hover:border-pitch-500 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Contact
                    </button>
                  </div>
                  <p className="text-xs text-navy-500 mt-2">
                    To give a parent login access, use the "Invite Parent" button after saving.
                  </p>
                </div>

                <div>
                  <label className="label">Notes</label>
                  <textarea
                    value={editData.notes || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                    className="input"
                    rows={4}
                    placeholder="Any additional notes about this pupil..."
                  />
                </div>

                <div className="p-4 bg-navy-800/50 rounded-lg border border-navy-600">
                  <label className="label flex items-center gap-2">
                    <Lock className="w-4 h-4 text-caution-400" />
                    Discreet Notes
                    <span className="text-xs font-normal text-caution-400 bg-caution-500/10 px-2 py-0.5 rounded-full">
                      Private
                    </span>
                  </label>
                  <p className="text-xs text-navy-500 mb-2">
                    Private notes about pupil psychology, communication style, or sensitive context. These notes are never shared with the AI assistant or visible to pupils/parents.
                  </p>
                  <textarea
                    value={editData.discreet_notes || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, discreet_notes: e.target.value }))}
                    className="input"
                    rows={4}
                    placeholder="E.g., Responds well to positive reinforcement. Sensitive about mistakes - needs encouragement. Parents going through divorce - be aware of emotional state..."
                  />
                </div>
              </div>

              <div className="p-6 border-t border-navy-800 flex justify-end gap-3">
                <button
                  onClick={() => setEditing(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Observation Modal */}
      <AnimatePresence>
        {showObsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowObsModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-navy-800 flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-white">Add Observation</h2>
                <button
                  onClick={() => setShowObsModal(false)}
                  className="p-2 text-navy-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddObservation} className="p-6 space-y-4">
                <div>
                  <label className="label">Observation Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {observationTypes.map(type => {
                      const Icon = type.icon
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setNewObs(prev => ({ ...prev, type: type.value }))}
                          className={`
                            p-3 rounded-lg flex items-center gap-2 transition-colors
                            ${newObs.type === type.value
                              ? `bg-${type.color}-500/20 border border-${type.color}-500 text-white`
                              : 'bg-navy-800 border border-navy-700 text-navy-400 hover:text-white'
                            }
                          `}
                        >
                          <Icon className="w-4 h-4" />
                          {type.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="label">Context</label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { value: 'match', label: 'Match', icon: Trophy },
                      { value: 'training', label: 'Training', icon: Activity },
                      { value: 'general', label: 'General', icon: Circle },
                    ].map(ctx => {
                      const Icon = ctx.icon
                      return (
                        <button
                          key={ctx.value}
                          type="button"
                          onClick={() => setNewObs(prev => ({
                            ...prev,
                            contextType: ctx.value,
                            matchId: ctx.value !== 'match' ? null : prev.matchId,
                            trainingSessionId: ctx.value !== 'training' ? null : prev.trainingSessionId,
                          }))}
                          className={`
                            p-2.5 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors
                            ${newObs.contextType === ctx.value
                              ? 'bg-pitch-500/20 border border-pitch-500 text-white'
                              : 'bg-navy-800 border border-navy-700 text-navy-400 hover:text-white'
                            }
                          `}
                        >
                          <Icon className="w-4 h-4" />
                          {ctx.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Match selector */}
                  {newObs.contextType === 'match' && (
                    <select
                      value={newObs.matchId || ''}
                      onChange={(e) => setNewObs(prev => ({ ...prev, matchId: e.target.value || null }))}
                      className="input mb-3"
                    >
                      <option value="">Select a match...</option>
                      {recentMatches.map(match => (
                        <option key={match.id} value={match.id}>
                          {match.is_home ? 'vs' : '@'} {match.opponent} - {new Date(match.date).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Training session selector */}
                  {newObs.contextType === 'training' && (
                    <select
                      value={newObs.trainingSessionId || ''}
                      onChange={(e) => setNewObs(prev => ({ ...prev, trainingSessionId: e.target.value || null }))}
                      className="input mb-3"
                    >
                      <option value="">Select a training session...</option>
                      {recentTrainingSessions.map(session => (
                        <option key={session.id} value={session.id}>
                          {new Date(session.date).toLocaleDateString()} - {(session.focus_areas || []).join(', ') || 'General'}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Additional context note */}
                  <input
                    type="text"
                    value={newObs.context}
                    onChange={(e) => setNewObs(prev => ({ ...prev, context: e.target.value }))}
                    className="input"
                    placeholder="Additional notes (e.g., 'First half', 'Shooting drill')"
                  />
                </div>

                <div>
                  <label className="label">Observation *</label>
                  <textarea
                    value={newObs.content}
                    onChange={(e) => setNewObs(prev => ({ ...prev, content: e.target.value }))}
                    className="input"
                    rows={4}
                    placeholder="What did you observe about this pupil?"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowObsModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={addingObs} className="btn-primary">
                    {addingObs ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add Observation'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-alert-500/10 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-alert-400" />
                </div>
                <h2 className="font-display text-xl font-semibold text-white text-center mb-2">
                  Delete Pupil?
                </h2>
                <p className="text-navy-400 text-center mb-6">
                  Are you sure you want to delete <span className="text-white font-medium">{pupil.name}</span>?
                  This action cannot be undone and will remove all associated observations.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="btn-primary bg-alert-600 hover:bg-alert-500 flex-1"
                  >
                    {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Parent Modal */}
      <AnimatePresence>
        {showInviteParentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => {
              setShowInviteParentModal(false)
              setParentInviteError('')
              setParentInviteSuccess(null)
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-navy-800 flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-white">
                  Invite Parent for {pupil.name}
                </h2>
                <button
                  onClick={() => {
                    setShowInviteParentModal(false)
                    setParentInviteError('')
                    setParentInviteSuccess(null)
                  }}
                  className="p-2 text-navy-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                {parentInviteSuccess ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-pitch-500/10 border border-pitch-500/30 rounded-lg">
                      <Check className="w-5 h-5 text-pitch-400" />
                      <p className="text-pitch-400">
                        Invite link generated for {parentInviteSuccess.invite?.email}
                      </p>
                    </div>

                    {parentInviteSuccess.inviteLink && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-white mb-2">Share this invite link:</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={parentInviteSuccess.inviteLink}
                              className="input text-sm font-mono"
                            />
                            <button
                              onClick={copyInviteLink}
                              className="btn-primary btn-sm"
                            >
                              {copiedLink ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-navy-500">
                          Send this link to the parent via WhatsApp, text, or email. The link expires in 30 days.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setParentInviteSuccess(null)}
                        className="btn-secondary flex-1"
                      >
                        Create Another
                      </button>
                      <button
                        onClick={() => {
                          setShowInviteParentModal(false)
                          setParentInviteSuccess(null)
                        }}
                        className="btn-primary flex-1"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleInviteParent} className="space-y-4">
                    <p className="text-navy-400 text-sm">
                      Generate an invite link for {pupil.name}'s parent or guardian. They'll be able to view
                      the pupil's profile, development plan, and upcoming matches.
                    </p>

                    {parentInviteError && (
                      <div className="flex items-center gap-2 p-3 bg-alert-500/10 border border-alert-500/30 rounded-lg text-alert-400 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {parentInviteError}
                      </div>
                    )}

                    <div>
                      <label className="label">Parent Email Address</label>
                      <input
                        type="email"
                        required
                        value={parentInviteEmail}
                        onChange={(e) => setParentInviteEmail(e.target.value)}
                        placeholder="parent@example.com"
                        className="input"
                      />
                      <p className="text-xs text-navy-500 mt-1">Used to identify them when they sign up</p>
                    </div>

                    {/* Show pending invites */}
                    {parentInvites.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs text-navy-400 mb-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Pending Invites
                        </p>
                        <div className="space-y-2">
                          {parentInvites.map(invite => (
                            <div key={invite.id} className="flex items-center gap-2 p-2 bg-navy-800/30 rounded-lg text-sm">
                              <Mail className="w-4 h-4 text-navy-500" />
                              <span className="text-navy-300 truncate flex-1">{invite.email}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowInviteParentModal(false)}
                        className="btn-secondary flex-1"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={invitingParent}
                        className="btn-primary flex-1"
                      >
                        {invitingParent ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Link2 className="w-4 h-4" />
                            Generate Invite Link
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Observation Modal */}
      <AnimatePresence>
        {editingObs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setEditingObs(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-navy-800 flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-white">Edit Observation</h2>
                <button
                  onClick={() => setEditingObs(null)}
                  className="p-2 text-navy-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateObservation} className="p-6 space-y-4">
                <div>
                  <label className="label">Observation Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {observationTypes.map(type => {
                      const Icon = type.icon
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setEditObsData(prev => ({ ...prev, type: type.value }))}
                          className={`
                            p-3 rounded-lg flex items-center gap-2 transition-colors
                            ${editObsData.type === type.value
                              ? `bg-${type.color}-500/20 border border-${type.color}-500 text-white`
                              : 'bg-navy-800 border border-navy-700 text-navy-400 hover:text-white'
                            }
                          `}
                        >
                          <Icon className="w-4 h-4" />
                          {type.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="label">Context</label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { value: 'match', label: 'Match', icon: Trophy },
                      { value: 'training', label: 'Training', icon: Activity },
                      { value: 'general', label: 'General', icon: Circle },
                    ].map(ctx => {
                      const Icon = ctx.icon
                      return (
                        <button
                          key={ctx.value}
                          type="button"
                          onClick={() => setEditObsData(prev => ({
                            ...prev,
                            contextType: ctx.value,
                            matchId: ctx.value !== 'match' ? null : prev.matchId,
                            trainingSessionId: ctx.value !== 'training' ? null : prev.trainingSessionId,
                          }))}
                          className={`
                            p-2.5 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors
                            ${editObsData.contextType === ctx.value
                              ? 'bg-pitch-500/20 border border-pitch-500 text-white'
                              : 'bg-navy-800 border border-navy-700 text-navy-400 hover:text-white'
                            }
                          `}
                        >
                          <Icon className="w-4 h-4" />
                          {ctx.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Match selector */}
                  {editObsData.contextType === 'match' && (
                    <select
                      value={editObsData.matchId || ''}
                      onChange={(e) => setEditObsData(prev => ({ ...prev, matchId: e.target.value || null }))}
                      className="input mb-3"
                    >
                      <option value="">Select a match...</option>
                      {recentMatches.map(match => (
                        <option key={match.id} value={match.id}>
                          {match.is_home ? 'vs' : '@'} {match.opponent} - {new Date(match.date).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Training session selector */}
                  {editObsData.contextType === 'training' && (
                    <select
                      value={editObsData.trainingSessionId || ''}
                      onChange={(e) => setEditObsData(prev => ({ ...prev, trainingSessionId: e.target.value || null }))}
                      className="input mb-3"
                    >
                      <option value="">Select a training session...</option>
                      {recentTrainingSessions.map(session => (
                        <option key={session.id} value={session.id}>
                          {new Date(session.date).toLocaleDateString()} - {(session.focus_areas || []).join(', ') || 'General'}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Additional context note */}
                  <input
                    type="text"
                    value={editObsData.context}
                    onChange={(e) => setEditObsData(prev => ({ ...prev, context: e.target.value }))}
                    className="input"
                    placeholder="Additional notes (e.g., 'First half', 'Shooting drill')"
                  />
                </div>

                <div>
                  <label className="label">Observation *</label>
                  <textarea
                    value={editObsData.content}
                    onChange={(e) => setEditObsData(prev => ({ ...prev, content: e.target.value }))}
                    className="input"
                    rows={4}
                    placeholder="What did you observe about this pupil?"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingObs(null)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={updatingObs} className="btn-primary">
                    {updatingObs ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Award Badge Modal */}
      <AnimatePresence>
        {showAwardModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowAwardModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-navy-800 flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-white flex items-center gap-2">
                  <Award className="w-6 h-6 text-energy-400" />
                  Award Badge to {pupil.name}
                </h2>
                <button
                  onClick={() => setShowAwardModal(false)}
                  className="p-2 text-navy-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="label">Select Badge Type</label>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {Object.entries(badgeTypes).map(([key, badge]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => selectBadgeType(key)}
                        className={`
                          p-3 rounded-lg flex items-center gap-3 transition-colors text-left
                          ${awardData.achievement_type === key
                            ? 'bg-energy-500/20 border border-energy-500 text-white'
                            : 'bg-navy-800 border border-navy-700 text-navy-400 hover:text-white hover:border-navy-600'
                          }
                        `}
                      >
                        <span className="text-2xl">{badge.icon}</span>
                        <div>
                          <p className="font-medium text-sm">{badge.title}</p>
                          <p className="text-xs text-navy-500">{badge.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {awardData.achievement_type && (
                  <>
                    <div>
                      <label className="label">Custom Message (optional)</label>
                      <textarea
                        value={awardData.description}
                        onChange={(e) => setAwardData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Add a personal message for this award..."
                        rows={2}
                        className="input resize-none"
                      />
                      <p className="text-xs text-navy-500 mt-1">
                        This message will be shown to the pupil and parents
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="p-6 border-t border-navy-800 flex gap-3">
                <button
                  onClick={() => setShowAwardModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAwardBadge}
                  disabled={awardingBadge || !awardData.achievement_type}
                  className="btn-primary flex-1"
                >
                  {awardingBadge ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Star className="w-4 h-4" />
                      Award Badge
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Observation Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteObs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => {
              setConfirmDeleteObs(false)
              setDeletingObsId(null)
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-alert-500/10 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-alert-400" />
                </div>
                <h2 className="font-display text-xl font-semibold text-white text-center mb-2">
                  Delete Observation?
                </h2>
                <p className="text-navy-400 text-center mb-6">
                  Are you sure you want to delete this observation? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setConfirmDeleteObs(false)
                      setDeletingObsId(null)
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteObservation}
                    className="btn-primary bg-alert-600 hover:bg-alert-500 flex-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attribute Analysis Modal */}
      <AnimatePresence>
        {showAttributeAnalysis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowAttributeAnalysis(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-navy-800 flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-pitch-400" />
                  Attribute Analysis for {pupil.name}
                </h2>
                <button
                  onClick={() => setShowAttributeAnalysis(false)}
                  className="p-2 text-navy-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {analyzingAttributes ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-pitch-400 mb-4" />
                    <p className="text-navy-400">Analyzing pupil attributes...</p>
                    <p className="text-sm text-navy-500 mt-1">This may take a few seconds</p>
                  </div>
                ) : attributeAnalysis ? (
                  <div>
                    <AIMarkdown>
                      {attributeAnalysis.analysis}
                    </AIMarkdown>
                    {attributeAnalysis.generated_at && (
                      <div className="mt-6 pt-4 border-t border-navy-800 text-xs text-navy-500">
                        Generated on {new Date(attributeAnalysis.generated_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-navy-400">
                    No analysis available
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-navy-800 flex justify-end gap-3">
                <button
                  onClick={() => setShowAttributeAnalysis(false)}
                  className="btn-secondary"
                >
                  Close
                </button>
                <button
                  onClick={handleAnalyzeAttributes}
                  disabled={analyzingAttributes}
                  className="btn-primary"
                >
                  {analyzingAttributes ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Regenerate
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Attribute Card Component
function AttributeCard({ title, icon: Icon, iconColor, attributes, placeholder }) {
  const hasAttributes = attributes && Object.keys(attributes).length > 0

  return (
    <div className="card p-4">
      <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
        <Icon className={`w-5 h-5 text-${iconColor}-400`} />
        {title}
      </h3>
      {hasAttributes ? (
        <div className="space-y-2">
          {Object.entries(attributes).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="text-navy-400 capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="text-navy-200">{value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-navy-500">{placeholder}</p>
      )}
    </div>
  )
}
