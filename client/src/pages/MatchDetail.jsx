// MatchDetail.jsx
import '@mux/mux-player'
import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  AlarmClock,
  Video,
  FileText,
  Sparkles,
  Loader2,
  X,
  Edit2,
  Save,
  Trash2,
  Trophy,
  Target,
  Users,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Home,
  Plane,
  UserCheck,
  Bell,
  Send,
  Check,
  HelpCircle,
  Upload,
  Link as LinkIcon,
  Play,
  Award,
  Star,
  Share2,
  EyeOff,
  Eye,
  Heart,
  Plus,
  Goal,
  Pencil,
  ArrowRightLeft,
} from 'lucide-react'
import api from '../services/api'
import { teamService, videoService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useTeam } from '../context/TeamContext'
import { useSportTaxonomy } from '../hooks/useSportTaxonomy'
import toast from 'react-hot-toast'
import AIMarkdown from '../components/AIMarkdown'
import FormationPitch, { formationsByFormat, defaultFormationByFormat } from '../components/FormationPitch'
import VideoUpload from '../components/VideoUpload'
import FixtureTravelPanel from '../components/FixtureTravelPanel'
import PublicReportPanel from '../components/PublicReportPanel'
import PlayingTimeCalculator from '../components/PlayingTimeCalculator'

const tabs = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'squad', label: 'Squad', icon: UserCheck },
  { id: 'prep', label: 'Match Prep', icon: Target },
  { id: 'report', label: 'Report', icon: Trophy },
  { id: 'video', label: 'Video', icon: Video },
]

// Common football formations (11-a-side)
const FORMATIONS_11 = [
  '4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '3-4-3', '4-1-4-1', '4-5-1',
  '5-3-2', '5-4-1', '4-4-2 Diamond', '4-3-2-1', '3-4-2-1', '4-1-2-1-2', '3-3-4', '2-3-5',
]

// 9-a-side formations
const FORMATIONS_9 = [
  '3-3-2', '3-2-3', '2-4-2', '3-1-3-1', '2-3-2-1', '2-3-3',
]

// 7-a-side formations
const FORMATIONS_7 = [
  '2-3-1', '3-2-1', '2-1-2-1', '1-2-1-2', '3-1-2',
]

// 5-a-side formations
const FORMATIONS_5 = [
  '2-1-1', '1-2-1', '2-2', '1-1-2', '3-1',
]

const FORMATIONS_BY_FORMAT = {
  11: FORMATIONS_11,
  9: FORMATIONS_9,
  7: FORMATIONS_7,
  5: FORMATIONS_5,
}

// Legacy alias
const FORMATIONS = FORMATIONS_11

const statusColors = {
  available: 'bg-green-500/20 text-green-400 border-green-500/30',
  unavailable: 'bg-red-500/20 text-red-400 border-red-500/30',
  maybe: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  pending: 'bg-border-default text-secondary border-border-strong'
}

const statusIcons = {
  available: Check,
  unavailable: X,
  maybe: HelpCircle,
  pending: AlertCircle
}

// Convert a naive datetime (from datetime-local input) to UTC ISO string,
// interpreting the input as being in the given IANA timezone.
function localToUtcIso(dateTimeStr, tz) {
  // dateTimeStr from datetime-local: "2026-04-19T10:00"
  const asUtc = new Date(dateTimeStr + (dateTimeStr.endsWith('Z') ? '' : ':00Z'))
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
  const p = fmt.formatToParts(asUtc)
  const g = t => p.find(x => x.type === t)?.value
  const tzLocal = new Date(`${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}:${g('second')}Z`)
  const offsetMs = tzLocal.getTime() - asUtc.getTime()
  return new Date(asUtc.getTime() - offsetMs).toISOString()
}

// Convert a UTC ISO string to a datetime-local value in the given timezone
function utcToLocalDatetime(isoStr, tz) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const p = fmt.formatToParts(d)
  const g = t => p.find(x => x.type === t)?.value
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`
}

export default function MatchDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { updateMatch, team, pupils, branding } = useTeam()
  const taxonomy = useSportTaxonomy(team?.sport)
  const sport = team?.sport || 'football'

  const isManager = user?.role === 'manager' || user?.role === 'assistant'

  // Combine standard formations with team's custom formations (based on team format)
  const teamFormat = team?.team_format || 11
  const allFormations = useMemo(() => {
    const baseFormations = FORMATIONS_BY_FORMAT[teamFormat] || FORMATIONS_11
    const customFormations = team?.custom_formations || []
    const customNames = customFormations.map(cf => cf.name)
    return [...baseFormations, ...customNames]
  }, [team?.custom_formations, teamFormat])

  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Availability & Squad
  const [availability, setAvailability] = useState([])
  const [squad, setSquad] = useState([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [loadingSquad, setLoadingSquad] = useState(false)
  const [showAnnounceModal, setShowAnnounceModal] = useState(false)
  const [announceData, setAnnounceData] = useState({ meetup_time: '', meetup_location: '' })
  const [announcing, setAnnouncing] = useState(false)

  // Edit states
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)

  // Result entry
  const [showResultModal, setShowResultModal] = useState(false)
  const [resultData, setResultData] = useState({ goalsFor: '', goalsAgainst: '' })
  const [savingResult, setSavingResult] = useState(false)

  // AI generation
  const [generatingPrep, setGeneratingPrep] = useState(false)
  const [prepContent, setPrepContent] = useState(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [publishingReport, setPublishingReport] = useState(false)
  const [editingReport, setEditingReport] = useState(false)
  const [editedReportContent, setEditedReportContent] = useState('')
  const [savingReport, setSavingReport] = useState(false)
  const [savingPrep, setSavingPrep] = useState(false)
  const [editingPrepManually, setEditingPrepManually] = useState(false)
  const [manualPrepContent, setManualPrepContent] = useState('')

  // Match formations
  const [matchFormations, setMatchFormations] = useState([])
  const [savingFormations, setSavingFormations] = useState(false)

  // Edit modal formations (separate state to allow cancel)
  const [editFormations, setEditFormations] = useState([])

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Video upload
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deletingVideo, setDeletingVideo] = useState(false)
  const [showVideoUploadModal, setShowVideoUploadModal] = useState(false)

  // Mux video for this match
  const [matchVideo, setMatchVideo] = useState(null)

  // Clips
  const [clips, setClips] = useState([])
  const [uploadingClips, setUploadingClips] = useState(false)
  const [clipUploadProgress, setClipUploadProgress] = useState(0)

  // Team notes
  const [teamNotes, setTeamNotes] = useState('')
  const [editingTeamNotes, setEditingTeamNotes] = useState(false)
  const [savingTeamNotes, setSavingTeamNotes] = useState(false)

  // Pupil of the Match
  const [showPotmModal, setShowPotmModal] = useState(false)
  const [potmData, setPotmData] = useState({ pupilId: '', reason: '' })
  const [savingPotm, setSavingPotm] = useState(false)
  const [parentVoteData, setParentVoteData] = useState(null)

  // Match Goals & Assists
  const [matchGoals, setMatchGoals] = useState([])
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [goalData, setGoalData] = useState({ scorer_pupil_id: '', assist_pupil_id: '', minute: '', goal_type: 'open_play', notes: '' })
  const [savingGoal, setSavingGoal] = useState(false)

  // Match Substitutions
  const [matchSubs, setMatchSubs] = useState([])
  const [showSubModal, setShowSubModal] = useState(false)
  const [subData, setSubData] = useState({ player_off_id: '', player_on_id: '', minute: '' })
  const [savingSub, setSavingSub] = useState(false)

  // Sport-specific match events
  const [matchEvents, setMatchEvents] = useState([])
  const [showEventModal, setShowEventModal] = useState(false)
  const [eventData, setEventData] = useState({ event_type: '', pupil_id: '', secondary_pupil_id: '', minute: '', notes: '' })
  const [savingEvent, setSavingEvent] = useState(false)

  // Pupil match stats
  const [pupilStats, setPupilStats] = useState([])
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [editingStats, setEditingStats] = useState({})
  const [savingStats, setSavingStats] = useState(false)

  useEffect(() => {
    loadMatch()
  }, [id])

  useEffect(() => {
    if (activeTab === 'squad' && match) {
      loadAvailability()
      loadSquad()
    }
    if (activeTab === 'video' && match) {
      // Load both clip sources and merge them
      loadAllMatchClips()
    }
  }, [activeTab, match?.id])

  // Combined function to load clips from both sources and merge them
  async function loadAllMatchClips() {
    try {
      // Load old-style clips from match_clips table
      const oldClipsResponse = await api.get(`/matches/${id}/clips`)
      const oldClips = oldClipsResponse.data || []

      // Load Mux videos for this match from videos table
      let muxClips = []
      let fullMatch = null
      if (team?.id) {
        const res = await videoService.getVideos(team.id)
        const videos = res.data || []
        const matchVideos = videos.filter(v => v.match_id === id)

        // Full match video = subtype is full_match, or linked via match.video_id
        fullMatch = matchVideos.find(v => v.subtype === 'full_match' || v.id === match?.video_id)

        // Mux clips = any other videos for this match
        muxClips = matchVideos.filter(v => v.id !== fullMatch?.id)
      }

      setMatchVideo(fullMatch || null)
      // Merge: old-style clips (no mux_playback_id) + Mux clips
      setClips([...oldClips, ...muxClips])
    } catch (error) {
      console.error('Failed to load match clips:', error)
    }
  }

  async function loadMatch() {
    setLoading(true)
    try {
      const response = await teamService.getMatch(id)
      setMatch(response.data)
      setEditData(response.data)

      // Load existing prep
      if (response.data.prep_notes) {
        setPrepContent({ generated: response.data.prep_notes, generatedAt: response.data.updated_at })
        setManualPrepContent(response.data.prep_notes)
      }
      // Load team notes
      if (response.data.team_notes) {
        setTeamNotes(response.data.team_notes)
      }
      // Load formations
      if (response.data.formations) {
        const formations = typeof response.data.formations === 'string'
          ? JSON.parse(response.data.formations)
          : response.data.formations
        setMatchFormations(formations || [])
      }
      // Load parent POTM votes if match has a result
      if (response.data.result) {
        try {
          const voteRes = await api.get(`/matches/${id}/parent-potm-votes`)
          setParentVoteData(voteRes.data)
        } catch { setParentVoteData(null) }
      }
      // Load match goals
      try {
        const goalsRes = await teamService.getMatchGoals(id)
        setMatchGoals(goalsRes.data || [])
      } catch { setMatchGoals([]) }
      // Load match substitutions
      try {
        const subsRes = await teamService.getMatchSubstitutions(id)
        setMatchSubs(subsRes.data || [])
      } catch { setMatchSubs([]) }
      // Load sport-specific match events
      try {
        const eventsRes = await teamService.getMatchEvents(id)
        setMatchEvents(eventsRes.data || [])
      } catch { setMatchEvents([]) }
      // Load pupil match stats
      try {
        const statsRes = await teamService.getMatchPupilStats(id)
        setPupilStats(statsRes.data || [])
      } catch { setPupilStats([]) }
    } catch (error) {
      console.error('Failed to load match:', error)
      toast.error('Failed to load match details')
    } finally {
      setLoading(false)
    }
  }

  async function loadMatchVideo() {
    try {
      if (!team?.id) return
      const res = await videoService.getVideos(team.id)
      const videos = res.data || []
      const matchVideos = videos.filter(v => v.match_id === id)

      // Full match video = subtype is full_match, or linked via match.video_id
      const fullMatch = matchVideos.find(v => v.subtype === 'full_match' || v.id === match?.video_id)
      setMatchVideo(fullMatch || null)

      // Mux clips = subtype is clip, or any small videos for this match
      const muxClips = matchVideos.filter(v => v.id !== fullMatch?.id)
      setClips(prev => {
        // Merge: keep old-style clips, add Mux clips
        const oldClips = prev.filter(c => !c.mux_playback_id)
        return [...oldClips, ...muxClips]
      })
    } catch {
      // No Mux video for this match
    }
  }

  async function loadClips() {
    try {
      const response = await api.get(`/matches/${id}/clips`)
      setClips(response.data || [])
    } catch (error) {
      console.error('Failed to load clips:', error)
    }
  }

  async function loadAvailability() {
    setLoadingAvailability(true)
    try {
      const response = await teamService.getMatchAvailability(id)
      setAvailability(response.data)
    } catch (error) {
      console.error('Failed to load availability:', error)
    } finally {
      setLoadingAvailability(false)
    }
  }

  async function loadSquad() {
    setLoadingSquad(true)
    try {
      const response = await teamService.getMatchSquad(id)
      setSquad(response.data)
    } catch (error) {
      console.error('Failed to load squad:', error)
    } finally {
      setLoadingSquad(false)
    }
  }

  async function handleAvailabilityUpdate(pupilId, status) {
    try {
      await teamService.updateAvailability(id, { pupil_id: pupilId, status })
      setAvailability(prev => prev.map(a =>
        a.pupil_id === pupilId ? { ...a, status } : a
      ))
      toast.success('Availability updated')
    } catch (error) {
      toast.error('Failed to update availability')
    }
  }

  async function handleToggleSquad(pupilId, isInSquad) {
    const newSquad = isInSquad
      ? squad.filter(s => s.pupil_id !== pupilId)
      : [...squad, { pupil_id: pupilId, is_starting: false }]

    try {
      await teamService.updateSquad(id, newSquad.map(s => ({
        pupil_id: s.pupil_id,
        is_starting: s.is_starting,
        position: s.position
      })))
      setSquad(newSquad)
    } catch (error) {
      toast.error('Failed to update squad')
    }
  }

  async function handleToggleStarting(pupilId, isStarting) {
    const newSquad = squad.map(s =>
      s.pupil_id === pupilId ? { ...s, is_starting: !isStarting } : s
    )

    try {
      await teamService.updateSquad(id, newSquad.map(s => ({
        pupil_id: s.pupil_id,
        is_starting: s.is_starting,
        position: s.position
      })))
      setSquad(newSquad)
    } catch (error) {
      toast.error('Failed to update squad')
    }
  }

  async function handlePositionChange(pupilId, position) {
    const newSquad = squad.map(s =>
      s.pupil_id === pupilId ? { ...s, position: position || null } : s
    )

    try {
      await teamService.updateSquad(id, newSquad.map(s => ({
        pupil_id: s.pupil_id,
        is_starting: s.is_starting,
        position: s.position
      })))
      setSquad(newSquad)
    } catch (error) {
      toast.error('Failed to update position')
    }
  }

  async function handleRequestAvailability(pendingOnly = false) {
    try {
      const deadline = new Date(match.date)
      deadline.setDate(deadline.getDate() - 2)
      const res = await teamService.requestAvailability(id, deadline.toISOString(), { pendingOnly })
      const count = res.data?.players_notified || 0
      if (pendingOnly) {
        toast.success(count > 0 ? `Reminder sent to ${count} pending pupil${count !== 1 ? 's' : ''}` : 'No pending pupils to remind')
      } else {
        toast.success('Availability request sent to all pupils')
      }
    } catch (error) {
      toast.error('Failed to send availability request')
    }
  }

  async function handleAnnounceSquad() {
    setAnnouncing(true)
    try {
      const isReannounce = match.squad_announced
      const { data: result } = await teamService.announceSquad(id, {
        meetup_time: announceData.meetup_time ? localToUtcIso(announceData.meetup_time, teamTz) : null,
        meetup_location: announceData.meetup_location || null,
        force: isReannounce ? true : undefined,
      })
      if (result?.duplicate) {
        toast.success('Squad already announced - no duplicate emails sent.')
        setShowAnnounceModal(false)
        loadMatch()
        return
      }
      const sent = result?.emails_sent || 0
      const total = result?.players_notified || 0
      if (result?.email_enabled === false) {
        toast.success(isReannounce ? 'Squad updated!' : 'Squad announced!')
        toast('Email notifications are not configured - pupils will only see in-app notifications.', { icon: '⚠️', duration: 5000 })
      } else if (sent === 0 && total > 0) {
        toast.success(isReannounce ? 'Squad updated!' : 'Squad announced!')
        toast(`No emails sent - none of the ${total} pupils have linked Pupil Lounge accounts.`, { icon: '⚠️', duration: 6000 })
      } else if (sent < total) {
        toast.success(`${isReannounce ? 'Squad updated' : 'Squad announced'}! ${sent}/${total} emails sent.`)
        toast(`${total - sent} pupil${total - sent > 1 ? 's don\'t' : ' doesn\'t'} have a linked Pupil Lounge account.`, { icon: '⚠️', duration: 6000 })
      } else {
        toast.success(`${isReannounce ? 'Squad updated' : 'Squad announced'}! All ${sent} pupils emailed.`)
      }
      setShowAnnounceModal(false)
      loadMatch() // Refresh to show announcement status
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Unknown error'
      toast.error(`Failed to announce squad: ${msg}`)
      console.error('Announce squad error:', error.response?.data || error)
    } finally {
      setAnnouncing(false)
    }
  }

  const teamTz = branding?.timezone || 'Europe/London'

  function formatDate(dateString) {
    if (!dateString) return 'TBC'
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: teamTz,
    })
  }

  function formatTime(dateString) {
    if (!dateString) return ''
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: teamTz,
    })
  }

  function isUpcoming() {
    if (!match?.date) return true
    return new Date(match.date) >= new Date(new Date().setHours(0, 0, 0, 0))
  }

  function getResultDisplay() {
    if (!match?.result) return null
    const parts = match.result.split('-').map(s => s.trim())
    if (parts.length !== 2) return match.result
    return {
      goalsFor: parseInt(parts[0]),
      goalsAgainst: parseInt(parts[1]),
      outcome: parseInt(parts[0]) > parseInt(parts[1]) ? 'win' : parseInt(parts[0]) < parseInt(parts[1]) ? 'loss' : 'draw'
    }
  }

  async function handleSave() {
    setSaving(true)
    // Get primary formation from editFormations for formationUsed field (backwards compat)
    const primaryFormation = editFormations.find(f => f.priority === 'primary')?.formation

    const result = await updateMatch(id, {
      opponent: editData.opponent,
      date: editData.date ? localToUtcIso(editData.date, teamTz) : editData.date,
      location: editData.location,
      isHome: editData.is_home,
      kitType: editData.kit_type,
      notes: editData.notes,
      formationUsed: primaryFormation || editData.formation_used,
      veoLink: editData.veo_link,
      formations: editFormations,
      meetTime: editData.meet_time || null,
    })

    if (result.success) {
      setMatch({ ...editData, formations: editFormations })
      setMatchFormations(editFormations)
      setEditing(false)
      toast.success('Match updated!')
    } else {
      toast.error(result.error || 'Failed to update match')
    }
    setSaving(false)
  }

  // Cycle formation priority in edit modal: none → primary → secondary → remove
  function cycleEditFormationPriority(formation) {
    setEditFormations(prev => {
      const currentFormations = getFormationsArray(prev)
      const existingIndex = currentFormations.findIndex(f => f.formation === formation)

      if (existingIndex === -1) {
        // Not selected - check if we can add
        if (currentFormations.length >= 2) {
          toast.error('Maximum 2 formations (primary & secondary)')
          return prev
        }
        // Determine next available priority
        const usedPriorities = currentFormations.map(f => f.priority)
        const newPriority = usedPriorities.includes('primary') ? 'secondary' : 'primary'
        return [...currentFormations, { formation, priority: newPriority }]
      }

      // Already selected - cycle priority or remove
      const currentPriority = currentFormations[existingIndex].priority
      const otherPriorities = currentFormations
        .filter((_, idx) => idx !== existingIndex)
        .map(f => f.priority)

      // If primary and secondary is available, switch to secondary
      if (currentPriority === 'primary' && !otherPriorities.includes('secondary')) {
        const updated = [...currentFormations]
        updated[existingIndex] = { ...updated[existingIndex], priority: 'secondary' }
        return updated
      }
      // If secondary and primary is available, switch to primary
      if (currentPriority === 'secondary' && !otherPriorities.includes('primary')) {
        const updated = [...currentFormations]
        updated[existingIndex] = { ...updated[existingIndex], priority: 'primary' }
        return updated
      }

      // No available priority after cycling - remove the formation
      return currentFormations.filter((_, idx) => idx !== existingIndex)
    })
  }

  async function handleSaveResult() {
    if (resultData.goalsFor === '' || resultData.goalsAgainst === '') {
      toast.error('Please enter the score')
      return
    }

    setSavingResult(true)
    const resultString = `${resultData.goalsFor} - ${resultData.goalsAgainst}`

    const result = await updateMatch(id, {
      result: resultString,
      goalsFor: parseInt(resultData.goalsFor, 10),
      goalsAgainst: parseInt(resultData.goalsAgainst, 10)
    })

    if (result.success) {
      setMatch(prev => ({
        ...prev,
        result: resultString,
        goals_for: parseInt(resultData.goalsFor, 10),
        goals_against: parseInt(resultData.goalsAgainst, 10),
      }))
      setShowResultModal(false)
      toast.success('Result saved!')
    } else {
      toast.error(result.error || 'Failed to save result')
    }
    setSavingResult(false)
  }

  async function handleSaveTeamNotes() {
    setSavingTeamNotes(true)
    try {
      await api.patch(`/matches/${id}`, { team_notes: teamNotes })
      setMatch(prev => ({ ...prev, team_notes: teamNotes }))
      setEditingTeamNotes(false)
      toast.success('Team notes saved!')
    } catch (error) {
      toast.error('Failed to save team notes')
    }
    setSavingTeamNotes(false)
  }

  async function handleSavePotm() {
    if (!potmData.pupilId) {
      toast.error('Please select a pupil')
      return
    }

    setSavingPotm(true)
    try {
      const response = await teamService.setPlayerOfMatch(id, potmData.pupilId, potmData.reason)
      setMatch(prev => ({
        ...prev,
        player_of_match_id: potmData.pupilId,
        player_of_match_reason: potmData.reason,
        player_of_match_name: response.data.player_name
      }))
      setShowPotmModal(false)
      setPotmData({ pupilId: '', reason: '' })
      toast.success('Pupil of the Match awarded!')
    } catch (error) {
      toast.error('Failed to set Pupil of the Match')
    }
    setSavingPotm(false)
  }

  async function handleAddGoal(e) {
    e.preventDefault()
    if (!goalData.scorer_pupil_id) {
      toast.error('Please select a goalscorer')
      return
    }
    setSavingGoal(true)
    try {
      const res = await teamService.addMatchGoal(id, {
        scorer_pupil_id: goalData.scorer_pupil_id,
        assist_pupil_id: goalData.assist_pupil_id || null,
        minute: goalData.minute ? parseInt(goalData.minute) : null,
        goal_type: goalData.goal_type,
        notes: goalData.notes || null,
      })
      setMatchGoals(prev => [...prev, res.data].sort((a, b) => (a.minute || 999) - (b.minute || 999)))
      setShowGoalModal(false)
      setGoalData({ scorer_pupil_id: '', assist_pupil_id: '', minute: '', goal_type: 'open_play', notes: '' })
      toast.success('Goal added!')
    } catch {
      toast.error('Failed to add goal')
    }
    setSavingGoal(false)
  }

  async function handleDeleteGoal(goalId) {
    try {
      await teamService.deleteMatchGoal(id, goalId)
      setMatchGoals(prev => prev.filter(g => g.id !== goalId))
      toast.success('Goal removed')
    } catch {
      toast.error('Failed to remove goal')
    }
  }

  async function handleAddSub(e) {
    e.preventDefault()
    if (!subData.player_off_id && !subData.player_on_id) {
      toast.error('Please select at least one pupil')
      return
    }
    setSavingSub(true)
    try {
      const res = await teamService.addMatchSubstitution(id, {
        player_off_id: subData.player_off_id || null,
        player_on_id: subData.player_on_id || null,
        minute: subData.minute ? parseInt(subData.minute) : null,
      })
      setMatchSubs(prev => [...prev, res.data].sort((a, b) => (a.minute || 999) - (b.minute || 999)))
      setShowSubModal(false)
      setSubData({ player_off_id: '', player_on_id: '', minute: '' })
      toast.success('Substitution added!')
    } catch {
      toast.error('Failed to add substitution')
    }
    setSavingSub(false)
  }

  async function handleDeleteSub(subId) {
    try {
      await teamService.deleteMatchSubstitution(id, subId)
      setMatchSubs(prev => prev.filter(s => s.id !== subId))
      toast.success('Substitution removed')
    } catch {
      toast.error('Failed to remove substitution')
    }
  }

  // Sport-specific match events
  async function handleAddEvent(e) {
    e.preventDefault()
    setSavingEvent(true)
    try {
      const eventType = taxonomy?.matchEventTypes?.find(t => t.key === eventData.event_type)
      await teamService.addMatchEvent(id, {
        event_type: eventData.event_type,
        pupil_id: eventData.pupil_id || null,
        secondary_pupil_id: eventData.secondary_pupil_id || null,
        minute: eventData.minute ? parseInt(eventData.minute) : null,
        value: eventType?.points ?? 1,
        notes: eventData.notes || null,
      })
      const eventsRes = await teamService.getMatchEvents(id)
      setMatchEvents(eventsRes.data || [])
      setShowEventModal(false)
      setEventData({ event_type: '', pupil_id: '', secondary_pupil_id: '', minute: '', notes: '' })
      toast.success('Event added')
    } catch {
      toast.error('Failed to add event')
    } finally {
      setSavingEvent(false)
    }
  }

  async function handleDeleteEvent(eventId) {
    try {
      await teamService.deleteMatchEvent(id, eventId)
      setMatchEvents(prev => prev.filter(e => e.id !== eventId))
      toast.success('Event removed')
    } catch {
      toast.error('Failed to remove event')
    }
  }

  async function handleSavePupilStats() {
    setSavingStats(true)
    try {
      const entries = Object.entries(editingStats).map(([pupilId, data]) => ({
        pupil_id: pupilId,
        stats: data.stats || {},
        rating: data.rating || null,
        notes: data.notes || null,
      }))
      await teamService.bulkUpdatePupilStats(id, entries)
      const statsRes = await teamService.getMatchPupilStats(id)
      setPupilStats(statsRes.data || [])
      setShowStatsModal(false)
      toast.success('Pupil stats saved')
    } catch {
      toast.error('Failed to save stats')
    } finally {
      setSavingStats(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await teamService.deleteMatch(id)
      toast.success('Match deleted')
      navigate('/matches')
    } catch (error) {
      toast.error('Failed to delete match')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  async function handleGeneratePrep() {
    setGeneratingPrep(true)
    try {
      const token = localStorage.getItem('fam_token')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      const response = await fetch(`${apiUrl}/matches/${id}/prep/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to generate')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let streamedText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let event
          try {
            event = JSON.parse(line.slice(6))
          } catch {
            continue // skip malformed JSON lines
          }
          if (event.type === 'text') {
            streamedText += event.text
            setPrepContent({ generated: streamedText, generatedAt: new Date().toISOString() })
            setManualPrepContent(streamedText)
          } else if (event.type === 'error') {
            throw new Error(event.message || 'Generation failed')
          }
        }
      }

      if (streamedText) {
        toast.success('Match prep generated!')
      } else {
        toast.error('No content was generated. Please try again.')
      }
    } catch (error) {
      console.error('Failed to generate prep:', error)
      toast.error('Failed to generate match prep')
    }
    setGeneratingPrep(false)
  }

  async function handleSavePrepToPlayers() {
    setSavingPrep(true)
    try {
      const content = editingPrepManually ? manualPrepContent : (prepContent?.generated || prepContent)
      if (!content) {
        toast.error('No match prep content to share')
        setSavingPrep(false)
        return
      }
      // Try dedicated endpoint first, fall back to PATCH
      try {
        await api.post(`/matches/${id}/prep/share`, { content })
      } catch (postErr) {
        console.warn('POST share failed, trying PATCH:', postErr?.response?.status)
        await api.patch(`/matches/${id}`, { prep_notes: content })
      }
      setMatch(prev => ({ ...prev, prep_notes: content }))
      setEditingPrepManually(false)
      toast.success('Match prep shared with pupils! They can now see it in their Pupil Zone.')
    } catch (error) {
      console.error('Failed to share prep:', error?.response?.status, error?.response?.data, error.message)
      toast.error('Failed to share match prep')
    }
    setSavingPrep(false)
  }

  async function handleSavePrepDraft() {
    setSavingPrep(true)
    try {
      setPrepContent({ generated: manualPrepContent, generatedAt: new Date().toISOString() })
      setEditingPrepManually(false)
      toast.success('Match prep draft saved locally')
    } catch (error) {
      console.error('Failed to save prep draft:', error)
      toast.error('Failed to save match prep')
    }
    setSavingPrep(false)
  }

  // Helper to get formations array (handles both old format and new format)
  function getFormationsArray(formData) {
    if (!formData) return []
    if (Array.isArray(formData)) {
      // Check if it's the new format (array of objects) or old format (array of strings)
      if (formData.length > 0 && typeof formData[0] === 'object') {
        return formData
      }
      // Convert old format to new format (first is primary, second is secondary)
      return formData.slice(0, 2).map((formation, idx) => ({
        formation,
        priority: idx === 0 ? 'primary' : 'secondary'
      }))
    }
    return []
  }

  // Cycle formation priority: none → primary → secondary → remove
  function cycleFormationPriority(formation) {
    setMatchFormations(prev => {
      const currentFormations = getFormationsArray(prev)
      const existingIndex = currentFormations.findIndex(f => f.formation === formation)

      if (existingIndex === -1) {
        // Not selected - check if we can add
        if (currentFormations.length >= 2) {
          toast.error('Maximum 2 formations (primary & secondary)')
          return prev
        }
        // Determine next available priority
        const usedPriorities = currentFormations.map(f => f.priority)
        const newPriority = usedPriorities.includes('primary') ? 'secondary' : 'primary'
        return [...currentFormations, { formation, priority: newPriority }]
      }

      // Already selected - cycle priority or remove
      const currentPriority = currentFormations[existingIndex].priority
      const otherPriorities = currentFormations
        .filter((_, idx) => idx !== existingIndex)
        .map(f => f.priority)

      // If primary and secondary is available, switch to secondary
      if (currentPriority === 'primary' && !otherPriorities.includes('secondary')) {
        const updated = [...currentFormations]
        updated[existingIndex] = { ...updated[existingIndex], priority: 'secondary' }
        return updated
      }
      // If secondary and primary is available, switch to primary
      if (currentPriority === 'secondary' && !otherPriorities.includes('primary')) {
        const updated = [...currentFormations]
        updated[existingIndex] = { ...updated[existingIndex], priority: 'primary' }
        return updated
      }

      // No available priority after cycling - remove the formation
      return currentFormations.filter((_, idx) => idx !== existingIndex)
    })
  }

  // Get sorted formations (primary first)
  function getSortedFormations(formData) {
    const formations = getFormationsArray(formData)
    return [...formations].sort((a, b) => (a.priority === 'primary' ? -1 : 1))
  }

  // Get primary formation for display
  function getPrimaryFormation(formData) {
    const formations = getFormationsArray(formData)
    return formations.find(f => f.priority === 'primary')?.formation || null
  }

  async function handleSaveFormations() {
    setSavingFormations(true)
    try {
      const formationsToSave = getFormationsArray(matchFormations)
      await api.patch(`/matches/${id}`, { formations: formationsToSave })
      setMatch(prev => ({ ...prev, formations: formationsToSave }))
      toast.success('Match formations updated!')
    } catch (error) {
      console.error('Failed to save formations:', error)
      toast.error('Failed to update formations')
    }
    setSavingFormations(false)
  }

  async function handleClearPrepFromPlayers() {
    setSavingPrep(true)
    try {
      await api.patch(`/matches/${id}`, { prep_notes: null })
      setMatch(prev => ({ ...prev, prep_notes: null }))
      toast.success('Match prep removed from pupil view')
    } catch (error) {
      toast.error('Failed to remove match prep')
    }
    setSavingPrep(false)
  }

  async function handleGenerateReport() {
    setGeneratingReport(true)
    try {
      const response = await teamService.generateMatchReport(id)
      setMatch(prev => ({
        ...prev,
        report: { generated: response.data.report, generatedAt: new Date().toISOString(), published: false }
      }))
      toast.success('Match report generated! Review it and share to Pupil Zone when ready.')
    } catch (error) {
      console.error('Failed to generate report:', error)
      toast.error('Failed to generate match report')
    }
    setGeneratingReport(false)
  }

  async function handlePublishReport(publish) {
    setPublishingReport(true)
    try {
      const response = await teamService.publishMatchReport(id, publish)
      setMatch(prev => ({
        ...prev,
        report: {
          ...prev.report,
          published: response.data.published,
          publishedAt: response.data.published ? new Date().toISOString() : null
        }
      }))
      toast.success(response.data.message)
    } catch (error) {
      console.error('Failed to publish report:', error)
      toast.error('Failed to update report visibility')
    }
    setPublishingReport(false)
  }

  function handleStartEditReport() {
    setEditedReportContent(match.report?.generated || '')
    setEditingReport(true)
  }

  async function handleSaveReport() {
    setSavingReport(true)
    try {
      await teamService.updateMatchReport(id, editedReportContent)
      setMatch(prev => ({
        ...prev,
        report: { ...prev.report, generated: editedReportContent, editedAt: new Date().toISOString() }
      }))
      setEditingReport(false)
      toast.success('Match report updated')
    } catch (error) {
      toast.error('Failed to save report')
    }
    setSavingReport(false)
  }

  function handleVideoUploadComplete(uploadedVideo) {
    setMatchVideo(uploadedVideo)
    setMatch({
      ...match,
      video_id: uploadedVideo.id
    })
    setShowVideoUploadModal(false)
  }

  async function handleDeleteVideo() {
    if (!confirm('Are you sure you want to delete this video?')) return

    setDeletingVideo(true)
    try {
      await api.delete(`/matches/${id}/video`)
      setMatch({ ...match, video_url: null })
      toast.success('Video deleted')
    } catch (error) {
      toast.error('Failed to delete video')
    } finally {
      setDeletingVideo(false)
    }
  }

  async function handleClipUpload(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validate total size (100MB per file max)
    const oversized = files.filter(f => f.size > 100 * 1024 * 1024)
    if (oversized.length > 0) {
      toast.error(`${oversized.length} file(s) exceed 100MB limit`)
      return
    }

    setUploadingClips(true)
    setClipUploadProgress(0)

    const formData = new FormData()
    files.forEach(file => formData.append('clips', file))

    try {
      const response = await api.post(`/matches/${id}/clips`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setClipUploadProgress(progress)
        }
      })
      setClips([...clips, ...response.data.clips])
      toast.success(response.data.message)
    } catch (error) {
      console.error('Clip upload failed:', error)
      toast.error(error.response?.data?.message || 'Failed to upload clips')
    } finally {
      setUploadingClips(false)
      setClipUploadProgress(0)
      e.target.value = '' // Reset input
    }
  }

  async function handleDeleteClip(clipId) {
    if (!confirm('Delete this clip?')) return

    try {
      await api.delete(`/matches/${id}/clips/${clipId}`)
      setClips(clips.filter(c => c.id !== clipId))
      toast.success('Clip deleted')
    } catch (error) {
      toast.error('Failed to delete clip')
    }
  }

  const resultDisplay = getResultDisplay()
  const upcoming = isUpcoming()

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-pitch-400" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <Link to="/matches" className="inline-flex items-center gap-2 text-secondary hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Matches
        </Link>
        <div className="card p-8 text-center">
          <AlertCircle className="w-12 h-12 text-tertiary mx-auto mb-4" />
          <h1 className="font-display text-xl font-bold text-white mb-2">Match Not Found</h1>
          <p className="text-secondary">This match may have been deleted or doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Back link */}
      <Link to="/matches" className="inline-flex items-center gap-2 text-secondary hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Matches
      </Link>

      {/* Match Header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          {/* Match Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {match.is_home ? (
                    <span className="badge-pitch flex items-center gap-1">
                      <Home className="w-3 h-3" /> Home
                    </span>
                  ) : (
                    <span className="badge-energy flex items-center gap-1">
                      <Plane className="w-3 h-3" /> Away
                    </span>
                  )}
                  {upcoming && (
                    <span className="badge-blue">Upcoming</span>
                  )}
                </div>
                <h1 className="font-display text-2xl lg:text-3xl font-bold text-white mb-2">
                  {match.is_home ? `${team?.name || 'Us'} vs ${match.opponent}` : `${match.opponent} vs ${team?.name || 'Us'}`}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-secondary">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {formatDate(match.date)}
                  </span>
                  {formatTime(match.date) && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {formatTime(match.date)}
                    </span>
                  )}
                  {match.meet_time && (
                    <span className="flex items-center gap-1.5">
                      <AlarmClock className="w-4 h-4" />
                      Meet {match.meet_time.slice(0, 5)}
                    </span>
                  )}
                  {match.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {match.location}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditFormations(getFormationsArray(matchFormations))
                    setEditing(true)
                  }}
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

            {/* Formation */}
            {match.formation_used && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-tertiary">Formation:</span>
                <span className="badge-navy">{match.formation_used}</span>
              </div>
            )}
          </div>

          {/* Result / Score */}
          <div className="lg:text-right">
            {resultDisplay ? (
              <div className={`
                inline-block p-4 rounded-xl relative group
                ${resultDisplay.outcome === 'win' ? 'bg-pitch-500/10 border border-pitch-500/20' :
                  resultDisplay.outcome === 'loss' ? 'bg-alert-500/10 border border-alert-500/20' :
                  'bg-subtle border border-border-strong'}
              `}>
                {isManager && (
                  <button
                    onClick={() => {
                      setResultData({ goalsFor: String(resultDisplay.goalsFor), goalsAgainst: String(resultDisplay.goalsAgainst) })
                      setShowResultModal(true)
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-subtle/80 text-secondary hover:text-white hover:bg-border-default transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit score"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                <p className="text-xs text-secondary uppercase mb-1">Final Score</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-white">{match.is_home ? resultDisplay.goalsFor : resultDisplay.goalsAgainst}</span>
                  <span className="text-xl text-tertiary">-</span>
                  <span className="text-3xl font-bold text-white">{match.is_home ? resultDisplay.goalsAgainst : resultDisplay.goalsFor}</span>
                </div>
                <p className={`text-sm font-medium mt-1 capitalize
                  ${resultDisplay.outcome === 'win' ? 'text-pitch-400' :
                    resultDisplay.outcome === 'loss' ? 'text-alert-400' :
                    'text-secondary'}
                `}>
                  {resultDisplay.outcome}
                </p>
              </div>
            ) : (
              <button
                onClick={() => setShowResultModal(true)}
                className="btn-primary"
              >
                <Trophy className="w-4 h-4" />
                Enter Result
              </button>
            )}
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
                  : 'bg-subtle text-secondary hover:text-white hover:bg-border-default'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
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
            {/* Notes */}
            {match.notes && (
              <div className="card p-6">
                <h2 className="font-display font-semibold text-white mb-3">Match Notes</h2>
                <p className="text-secondary whitespace-pre-wrap">{match.notes}</p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('prep')}
                className="card-hover p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-pitch-500/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-pitch-400" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-medium text-white">Match Prep</p>
                  <p className="text-sm text-secondary">AI tactical briefing</p>
                </div>
                <ChevronRight className="w-5 h-5 text-tertiary" />
              </button>

              <Link
                to={`/chat?q=Help me prepare for our match against ${match.opponent}`}
                className="card-hover p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-energy-500/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-energy-400" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-medium text-white">Ask AI</p>
                  <p className="text-sm text-secondary">Chat about this match</p>
                </div>
                <ChevronRight className="w-5 h-5 text-tertiary" />
              </Link>

              <button
                onClick={() => setActiveTab('video')}
                className="card-hover p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Video className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-medium text-white">Video Analysis</p>
                  <p className="text-sm text-secondary">{match.veo_link ? 'View footage' : 'Add video'}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-tertiary" />
              </button>
            </div>

            {/* Match Stats Placeholder */}
            <div className="card p-6">
              <h2 className="font-display font-semibold text-white mb-4">Match Information</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-subtle text-center">
                  <p className="text-2xl font-bold text-white">{match.is_home ? 'H' : 'A'}</p>
                  <p className="text-xs text-secondary uppercase mt-1">Home/Away</p>
                </div>
                <div className="p-4 rounded-lg bg-subtle text-center">
                  <p className="text-2xl font-bold text-white capitalize">{match.kit_type ? (match.kit_type === 'third' ? '3rd' : match.kit_type.charAt(0).toUpperCase() + match.kit_type.slice(1)) : (match.is_home ? 'Home' : 'Away')}</p>
                  <p className="text-xs text-secondary uppercase mt-1">Kit</p>
                </div>
                <div className="p-4 rounded-lg bg-subtle text-center">
                  <p className="text-2xl font-bold text-white">{match.formation_used || '-'}</p>
                  <p className="text-xs text-secondary uppercase mt-1">Formation</p>
                </div>
                <div className="p-4 rounded-lg bg-subtle text-center">
                  <p className="text-2xl font-bold text-white">{resultDisplay?.goalsFor ?? '-'}</p>
                  <p className="text-xs text-secondary uppercase mt-1">Goals For</p>
                </div>
                <div className="p-4 rounded-lg bg-subtle text-center">
                  <p className="text-2xl font-bold text-white">{resultDisplay?.goalsAgainst ?? '-'}</p>
                  <p className="text-xs text-secondary uppercase mt-1">Goals Against</p>
                </div>
              </div>
            </div>

            {/* Travel arrangements (away fixtures) */}
            <FixtureTravelPanel matchId={id} isAway={!match.is_home} />

            {/* Public match report (for completed matches) */}
            {resultDisplay && (
              <PublicReportPanel matchId={id} reportText={match.match_report_text} reportStatus={match.match_report_status} />
            )}

            {/* Goalscorers & Assists - Only show when match has a result */}
            {resultDisplay && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-semibold text-white flex items-center gap-2">
                    <Goal className="w-5 h-5 text-pitch-400" />
                    Goalscorers & Assists
                  </h2>
                  {isManager && (
                    <button
                      onClick={() => setShowGoalModal(true)}
                      className="btn-secondary text-sm"
                    >
                      <Plus className="w-4 h-4" /> Add Goal
                    </button>
                  )}
                </div>

                {matchGoals.length > 0 ? (
                  <div className="space-y-2">
                    {matchGoals.map(goal => (
                      <div key={goal.id} className="flex items-center justify-between p-3 rounded-lg bg-subtle border border-border-strong">
                        <div className="flex items-center gap-3">
                          {goal.minute && (
                            <span className="w-8 h-8 rounded-full bg-pitch-500/20 text-pitch-400 text-xs font-bold flex items-center justify-center shrink-0">
                              {goal.minute}'
                            </span>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white">
                                {goal.scorer_number && <span className="text-secondary mr-1">#{goal.scorer_number}</span>}
                                {goal.scorer_name || 'Unknown'}
                              </p>
                              {goal.goal_type && goal.goal_type !== 'open_play' && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-energy-500/20 text-energy-400">
                                  {goal.goal_type === 'penalty' ? 'Pen' : goal.goal_type === 'free_kick' ? 'FK' : goal.goal_type === 'own_goal' ? 'OG' : goal.goal_type === 'header' ? 'Header' : goal.goal_type}
                                </span>
                              )}
                            </div>
                            {goal.assist_name && (
                              <p className="text-xs text-secondary">
                                Assist: {goal.assist_number && `#${goal.assist_number} `}{goal.assist_name}
                              </p>
                            )}
                          </div>
                        </div>
                        {isManager && (
                          <button onClick={() => handleDeleteGoal(goal.id)} className="p-1 text-tertiary hover:text-alert-400 transition-colors" title="Remove goal">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-secondary">
                    <Goal className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No goalscorers recorded yet</p>
                    {isManager && (
                      <button onClick={() => setShowGoalModal(true)} className="btn-primary mt-4">
                        <Plus className="w-4 h-4" /> Add Goal
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Substitutions - Only show when match has a result */}
            {resultDisplay && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-semibold text-white flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-energy-400" />
                    Substitutions
                  </h2>
                  {isManager && (
                    <button
                      onClick={() => setShowSubModal(true)}
                      className="btn-secondary text-sm"
                    >
                      <Plus className="w-4 h-4" /> Add Sub
                    </button>
                  )}
                </div>

                {matchSubs.length > 0 ? (
                  <div className="space-y-2">
                    {matchSubs.map(sub => (
                      <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-subtle border border-border-strong">
                        <div className="flex items-center gap-3">
                          {sub.minute && (
                            <span className="w-8 h-8 rounded-full bg-energy-500/20 text-energy-400 text-xs font-bold flex items-center justify-center shrink-0">
                              {sub.minute}'
                            </span>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            {sub.player_off_name && (
                              <span className="text-alert-400">
                                <span className="text-secondary mr-1">#{sub.player_off_number}</span>
                                {sub.player_off_name}
                                <span className="ml-1 text-xs text-alert-500">OFF</span>
                              </span>
                            )}
                            <ArrowRightLeft className="w-3.5 h-3.5 text-tertiary" />
                            {sub.player_on_name && (
                              <span className="text-pitch-400">
                                <span className="text-secondary mr-1">#{sub.player_on_number}</span>
                                {sub.player_on_name}
                                <span className="ml-1 text-xs text-pitch-500">ON</span>
                              </span>
                            )}
                          </div>
                        </div>
                        {isManager && (
                          <button onClick={() => handleDeleteSub(sub.id)} className="p-1 text-tertiary hover:text-alert-400 transition-colors" title="Remove substitution">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-secondary">
                    <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No substitutions recorded yet</p>
                    {isManager && (
                      <button onClick={() => setShowSubModal(true)} className="btn-primary mt-4">
                        <Plus className="w-4 h-4" /> Add Substitution
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sport-specific Match Events - show for non-football or when taxonomy loaded */}
            {resultDisplay && taxonomy && sport !== 'football' && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-semibold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-pitch-400" />
                    Match Events
                  </h2>
                  {isManager && (
                    <button onClick={() => { setEventData({ event_type: taxonomy.matchEventTypes[0]?.key || '', pupil_id: '', secondary_pupil_id: '', minute: '', notes: '' }); setShowEventModal(true) }} className="btn-secondary text-sm">
                      <Plus className="w-4 h-4" /> Add Event
                    </button>
                  )}
                </div>

                {matchEvents.length > 0 ? (
                  <div className="space-y-2">
                    {matchEvents.map(evt => {
                      const evtType = taxonomy.matchEventTypes?.find(t => t.key === evt.event_type)
                      return (
                        <div key={evt.id} className="flex items-center justify-between p-3 rounded-lg bg-subtle border border-border-strong">
                          <div className="flex items-center gap-3">
                            {evt.minute != null && (
                              <span className="w-8 h-8 rounded-full bg-pitch-500/20 text-pitch-400 text-xs font-bold flex items-center justify-center shrink-0">
                                {evt.minute}'
                              </span>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-1.5 py-0.5 rounded bg-pitch-500/20 text-pitch-400 font-medium">
                                  {evtType?.label || evt.event_type}
                                </span>
                                {evt.pupil_name && (
                                  <p className="text-sm font-medium text-white">
                                    {evt.pupil_number && <span className="text-secondary mr-1">#{evt.pupil_number}</span>}
                                    {evt.pupil_name}
                                  </p>
                                )}
                              </div>
                              {evt.secondary_pupil_name && (
                                <p className="text-xs text-secondary">
                                  {evtType?.secondaryLabel || 'Assist'}: {evt.secondary_pupil_number && `#${evt.secondary_pupil_number} `}{evt.secondary_pupil_name}
                                </p>
                              )}
                              {evt.notes && <p className="text-xs text-tertiary mt-0.5">{evt.notes}</p>}
                            </div>
                          </div>
                          {isManager && (
                            <button onClick={() => handleDeleteEvent(evt.id)} className="p-1 text-tertiary hover:text-alert-400 transition-colors" title="Remove event">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-secondary">
                    <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No match events recorded yet</p>
                    {isManager && (
                      <button onClick={() => { setEventData({ event_type: taxonomy.matchEventTypes[0]?.key || '', pupil_id: '', secondary_pupil_id: '', minute: '', notes: '' }); setShowEventModal(true) }} className="btn-primary mt-4">
                        <Plus className="w-4 h-4" /> Add Event
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Pupil Match Stats - show when we have squad and result */}
            {resultDisplay && taxonomy && squad.length > 0 && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-semibold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-energy-400" />
                    Pupil Stats
                  </h2>
                  {isManager && (
                    <button
                      onClick={() => {
                        const initial = {}
                        squad.forEach(p => {
                          const existing = pupilStats.find(s => s.pupil_id === p.pupil_id)
                          initial[p.pupil_id] = {
                            stats: existing?.stats || {},
                            rating: existing?.rating || null,
                            notes: existing?.notes || '',
                            name: p.name,
                            squad_number: p.squad_number,
                          }
                        })
                        setEditingStats(initial)
                        setShowStatsModal(true)
                      }}
                      className="btn-secondary text-sm"
                    >
                      <Edit2 className="w-4 h-4" /> {pupilStats.length > 0 ? 'Edit Stats' : 'Add Stats'}
                    </button>
                  )}
                </div>

                {pupilStats.length > 0 ? (
                  <div className="space-y-2">
                    {pupilStats.map(ps => {
                      const statFields = taxonomy.pupilStatFields || []
                      const filledStats = statFields.filter(f => ps.stats?.[f.key] != null && ps.stats[f.key] !== '' && ps.stats[f.key] !== 0)
                      return (
                        <div key={ps.id} className="p-3 rounded-lg bg-subtle border border-border-strong">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-white">
                              {ps.squad_number && <span className="text-secondary mr-1">#{ps.squad_number}</span>}
                              {ps.pupil_name}
                            </p>
                            {ps.rating && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${ps.rating >= 8 ? 'bg-pitch-500/20 text-pitch-400' : ps.rating >= 6 ? 'bg-energy-500/20 text-energy-400' : 'bg-alert-500/20 text-alert-400'}`}>
                                {ps.rating}/10
                              </span>
                            )}
                          </div>
                          {filledStats.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {filledStats.map(f => (
                                <span key={f.key} className="text-xs text-secondary bg-border-default/50 px-2 py-0.5 rounded">
                                  {f.label}: <strong className="text-white">{ps.stats[f.key]}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                          {ps.notes && <p className="text-xs text-tertiary mt-1">{ps.notes}</p>}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-secondary">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No pupil stats recorded yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Pupil of the Match - Only show when match has a result */}
            {resultDisplay && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-semibold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-energy-400" />
                    Pupil of the Match
                  </h2>
                  {isManager && (
                    <button
                      onClick={() => {
                        setPotmData({
                          pupilId: match.player_of_match_id || '',
                          reason: match.player_of_match_reason || ''
                        })
                        setShowPotmModal(true)
                      }}
                      className="text-sm text-pitch-400 hover:text-pitch-300"
                    >
                      {match.player_of_match_id ? 'Change' : 'Select Pupil'}
                    </button>
                  )}
                </div>

                {match.player_of_match_id ? (
                  <div className="bg-gradient-to-r from-energy-500/10 to-caution-500/10 border border-energy-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-energy-500/20 flex items-center justify-center">
                        <Star className="w-7 h-7 text-energy-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white text-lg">
                          {match.player_of_match_name || pupils.find(p => p.id === match.player_of_match_id)?.name || 'Unknown Pupil'}
                        </p>
                        {match.player_of_match_reason && (
                          <p className="text-sm text-secondary mt-1 italic">
                            "{match.player_of_match_reason}"
                          </p>
                        )}
                      </div>
                      <Trophy className="w-8 h-8 text-energy-400" />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-secondary">
                    <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No Pupil of the Match selected yet</p>
                    {isManager && (
                      <button
                        onClick={() => setShowPotmModal(true)}
                        className="btn-primary mt-4"
                      >
                        <Star className="w-4 h-4" />
                        Select Pupil
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Parent POTM Voting Results - Only managers see the tally */}
            {resultDisplay && isManager && parentVoteData?.votes?.length > 0 && (
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-5 h-5 text-energy-400" />
                  <h2 className="font-display font-semibold text-white">Parents' Pupil of the Match</h2>
                  <span className="text-xs text-secondary ml-auto">{parentVoteData.total_votes} vote{parentVoteData.total_votes !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {parentVoteData.votes.map((v, idx) => (
                    <div key={v.pupil_id} className="flex items-center gap-3">
                      <span className="text-sm text-secondary w-5 text-right">{idx + 1}.</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${idx === 0 ? 'text-energy-400' : 'text-white'}`}>
                            {v.player_name}{v.squad_number ? ` #${v.squad_number}` : ''}
                          </span>
                          <span className="text-xs text-secondary">{v.vote_count} vote{v.vote_count !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-border-default">
                          <div
                            className={`h-full rounded-full ${idx === 0 ? 'bg-energy-400' : 'bg-energy-500/40'}`}
                            style={{ width: `${parentVoteData.total_votes ? (v.vote_count / parentVoteData.total_votes) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Match Formations - Only show for upcoming matches */}
            {!resultDisplay && (
              <div className="card p-6">
                <h2 className="font-display font-semibold text-white mb-2">Match Formations</h2>
                <p className="text-secondary text-sm mb-4">
                  Select primary and secondary formations. Click to add, click again to change priority, click again to remove.
                </p>

                {/* Formation selector buttons */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {allFormations.map((formation, idx) => {
                    const formationsArr = getFormationsArray(matchFormations)
                    const formData = formationsArr.find(f => f.formation === formation)
                    const isSelected = !!formData
                    const isDisabled = !isSelected && formationsArr.length >= 2
                    const priorityLabel = formData?.priority === 'primary' ? '1st' : formData?.priority === 'secondary' ? '2nd' : ''
                    const isCustom = idx >= FORMATIONS.length

                    return (
                      <button
                        key={formation}
                        type="button"
                        onClick={() => cycleFormationPriority(formation)}
                        disabled={isDisabled}
                        className={`
                          px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${isSelected
                            ? formData?.priority === 'primary'
                              ? 'bg-pitch-600 text-white'
                              : 'bg-pitch-600/60 text-white'
                            : isDisabled
                              ? 'bg-card text-tertiary cursor-not-allowed'
                              : isCustom
                                ? 'bg-energy-600/20 text-energy-400 hover:text-white hover:bg-energy-600/40 border border-energy-500/30'
                                : 'bg-subtle text-secondary hover:text-white hover:bg-border-default'
                          }
                        `}
                        title={isDisabled ? 'Maximum 2 formations' : isSelected ? `Click to change priority (${priorityLabel})` : isCustom ? `Custom: ${formation}` : formation}
                      >
                        {formation}
                        {isSelected && (
                          <span className="ml-1.5 text-xs opacity-75">({priorityLabel})</span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Selected summary */}
                {getFormationsArray(matchFormations).length > 0 && (
                  <div className="mb-4 text-sm text-secondary">
                    <span className="font-medium text-white">Selected:</span>{' '}
                    {getSortedFormations(matchFormations).map(({ formation, priority }, idx) => (
                      <span key={formation}>
                        {idx > 0 && ' → '}
                        <span className={priority === 'primary' ? 'text-pitch-400' : 'text-secondary'}>
                          {formation} ({priority === 'primary' ? 'Primary' : 'Secondary'})
                        </span>
                      </span>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleSaveFormations}
                  disabled={savingFormations}
                  className="btn-primary"
                >
                  {savingFormations ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Formations
                </button>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'squad' && (
          <motion.div
            key="squad"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Squad Announcement Status */}
            {match.squad_announced && (
              <div className="card p-4 bg-green-500/10 border-green-500/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div className="flex-1">
                    <p className="font-medium text-green-400">Squad Announced</p>
                    <p className="text-sm text-green-400/70">
                      Players were notified on {new Date(match.squad_announced_at).toLocaleDateString('en-GB')}
                    </p>
                    {(match.meetup_time || match.meetup_location) && (
                      <div className="mt-2 pt-2 border-t border-green-500/20 text-sm text-green-400/70">
                        {match.meetup_time && (
                          <p>Meet-up: {new Date(match.meetup_time).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: teamTz })}</p>
                        )}
                        {match.meetup_location && (
                          <p>Location: {match.meetup_location}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Selected Squad Summary & Announce - shown at top for visibility */}
            {isManager && squad.length > 0 && (
              <div className="card p-6 border-2 border-pitch-500/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-display font-semibold text-white">Selected Squad</h2>
                    <p className="text-sm text-secondary">
                      {squad.filter(s => s.is_starting).length} starting, {squad.filter(s => !s.is_starting).length} subs
                    </p>
                  </div>
                  {upcoming ? (
                    <button
                      onClick={() => {
                        setAnnounceData({
                          meetup_time: match.meetup_time ? utcToLocalDatetime(match.meetup_time, teamTz) : '',
                          meetup_location: match.meetup_location || '',
                        })
                        setShowAnnounceModal(true)
                      }}
                      className={match.squad_announced ? "btn-secondary" : "btn-primary"}
                    >
                      <Send className="w-4 h-4" />
                      {match.squad_announced ? 'Update & Re-notify' : 'Announce Squad'}
                    </button>
                  ) : (
                    <span className="text-xs text-tertiary">Squad saves automatically</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-pitch-400 mb-2">Starting Line Up</h3>
                    <div className="space-y-1">
                      {squad.filter(s => s.is_starting).sort((a, b) => {
                        const posOrder = { GK: 0, CB: 1, LB: 2, RB: 3, CDM: 4, CM: 5, LM: 6, RM: 7, CAM: 8, LW: 9, RW: 10, CF: 11, ST: 12 }
                        const orderA = posOrder[a.position] ?? 99
                        const orderB = posOrder[b.position] ?? 99
                        return orderA - orderB
                      }).map(s => {
                        const playerName = s.player_name || availability.find(a => a.pupil_id === s.pupil_id)?.player_name
                        const profilePositions = s.player_positions || availability.find(a => a.pupil_id === s.pupil_id)?.positions || []
                        return (
                          <div key={s.pupil_id} className="flex items-center justify-between text-sm text-white p-2 bg-pitch-500/10 rounded border border-pitch-500/20 gap-2">
                            <span className="truncate">{playerName}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <select
                                value={s.position || ''}
                                onChange={(e) => handlePositionChange(s.pupil_id, e.target.value)}
                                className="bg-subtle border border-border-strong text-xs text-secondary rounded px-1.5 py-0.5 focus:border-pitch-500 focus:outline-none"
                                title="Match-day position"
                              >
                                <option value="">Pos</option>
                                {profilePositions.length > 0 && profilePositions.map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                                {['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF']
                                  .filter(p => !profilePositions.includes(p))
                                  .map(p => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                              </select>
                              <button
                                onClick={() => handleToggleStarting(s.pupil_id, true)}
                                className="text-xs text-secondary hover:text-energy-400 transition-colors whitespace-nowrap"
                                title="Move to subs"
                              >
                                Move to Subs
                              </button>
                            </div>
                          </div>
                        )
                      })}
                      {squad.filter(s => s.is_starting).length === 0 && (
                        <p className="text-sm text-tertiary italic">No starters selected - use the pupil list below to set starting lineup</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-energy-400 mb-2">Substitutes</h3>
                    <div className="space-y-1">
                      {squad.filter(s => !s.is_starting).sort((a, b) => {
                        const posOrder = { GK: 0, CB: 1, LB: 2, RB: 3, CDM: 4, CM: 5, LM: 6, RM: 7, CAM: 8, LW: 9, RW: 10, CF: 11, ST: 12 }
                        const orderA = posOrder[a.position] ?? 99
                        const orderB = posOrder[b.position] ?? 99
                        return orderA - orderB
                      }).map(s => {
                        const playerName = s.player_name || availability.find(a => a.pupil_id === s.pupil_id)?.player_name
                        const profilePositions = s.player_positions || availability.find(a => a.pupil_id === s.pupil_id)?.positions || []
                        return (
                          <div key={s.pupil_id} className="flex items-center justify-between text-sm text-secondary p-2 bg-energy-500/10 rounded border border-energy-500/20 gap-2">
                            <span className="truncate">{playerName}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <select
                                value={s.position || ''}
                                onChange={(e) => handlePositionChange(s.pupil_id, e.target.value)}
                                className="bg-subtle border border-border-strong text-xs text-secondary rounded px-1.5 py-0.5 focus:border-energy-500 focus:outline-none"
                                title="Match-day position"
                              >
                                <option value="">Pos</option>
                                {profilePositions.length > 0 && profilePositions.map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                                {['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF']
                                  .filter(p => !profilePositions.includes(p))
                                  .map(p => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                              </select>
                              <button
                                onClick={() => handleToggleStarting(s.pupil_id, false)}
                                className="text-xs text-secondary hover:text-pitch-400 transition-colors whitespace-nowrap"
                                title="Move to starting"
                              >
                                Move to Starting
                              </button>
                            </div>
                          </div>
                        )
                      })}
                      {squad.filter(s => !s.is_starting).length === 0 && (
                        <p className="text-sm text-tertiary italic">No subs selected</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Availability Summary */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-white">Pupil Availability</h2>
                {isManager && (
                  <div className="flex gap-2">
                    {availability.filter(a => a.status === 'pending').length > 0 && (
                      <button
                        onClick={() => handleRequestAvailability(true)}
                        className="btn-primary text-sm"
                      >
                        <Bell className="w-4 h-4" />
                        Remind Pending ({availability.filter(a => a.status === 'pending').length})
                      </button>
                    )}
                    <button
                      onClick={() => handleRequestAvailability(false)}
                      className="btn-secondary text-sm"
                    >
                      <Bell className="w-4 h-4" />
                      Request All
                    </button>
                  </div>
                )}
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-2xl font-bold text-green-400">
                    {availability.filter(a => a.status === 'available').length}
                  </p>
                  <p className="text-xs text-green-400/70">Available</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-2xl font-bold text-yellow-400">
                    {availability.filter(a => a.status === 'maybe').length}
                  </p>
                  <p className="text-xs text-yellow-400/70">Maybe</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-2xl font-bold text-red-400">
                    {availability.filter(a => a.status === 'unavailable').length}
                  </p>
                  <p className="text-xs text-red-400/70">Unavailable</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-subtle border border-border-strong">
                  <p className="text-2xl font-bold text-secondary">
                    {availability.filter(a => a.status === 'pending').length}
                  </p>
                  <p className="text-xs text-tertiary">Pending</p>
                </div>
              </div>

              {/* Pupil List */}
              {loadingAvailability ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-pitch-500" />
                </div>
              ) : (
                <div className="space-y-2">
                  {availability.map(pupil => {
                    const StatusIcon = statusIcons[pupil.status]
                    const inSquad = squad.some(s => s.pupil_id === pupil.pupil_id)
                    const squadEntry = squad.find(s => s.pupil_id === pupil.pupil_id)

                    return (
                      <div
                        key={pupil.pupil_id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition ${
                          inSquad ? 'bg-pitch-500/10 border-pitch-500/30' : 'bg-subtle border-border-strong'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-border-default flex items-center justify-center text-sm font-medium text-white">
                            {pupil.squad_number || pupil.player_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{pupil.player_name}</p>
                            {pupil.positions?.length > 0 && (
                              <p className="text-xs text-secondary">{pupil.positions.join(', ')}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Availability Status */}
                          {isManager ? (
                            <div className="flex gap-1">
                              {['available', 'maybe', 'unavailable'].map(status => {
                                const Icon = statusIcons[status]
                                return (
                                  <button
                                    key={status}
                                    onClick={() => handleAvailabilityUpdate(pupil.pupil_id, status)}
                                    className={`p-1.5 rounded transition ${
                                      pupil.status === status
                                        ? statusColors[status]
                                        : 'text-tertiary hover:text-secondary hover:bg-border-default'
                                    }`}
                                    title={status}
                                  >
                                    <Icon className="w-4 h-4" />
                                  </button>
                                )
                              })}
                            </div>
                          ) : (
                            <span className={`px-2 py-1 rounded text-xs border ${statusColors[pupil.status]}`}>
                              <StatusIcon className="w-3 h-3 inline mr-1" />
                              {pupil.status}
                            </span>
                          )}

                          {/* Squad Toggle (Manager only) - show for available pupils, or any pupil already in squad */}
                          {isManager && (pupil.status === 'available' || inSquad || !upcoming) && (
                            <>
                              <div className="w-px h-6 bg-border-default mx-1" />
                              <button
                                onClick={() => handleToggleSquad(pupil.pupil_id, inSquad)}
                                className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                                  inSquad
                                    ? 'bg-pitch-500 text-white'
                                    : 'bg-border-default text-secondary hover:bg-navy-600 hover:text-white'
                                }`}
                              >
                                {inSquad ? 'In Squad' : 'Add'}
                              </button>
                              {inSquad && (
                                <button
                                  onClick={() => handleToggleStarting(pupil.pupil_id, squadEntry?.is_starting)}
                                  className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                                    squadEntry?.is_starting
                                      ? 'bg-energy-500 text-white'
                                      : 'bg-energy-500/20 text-energy-400 border border-energy-500/40 hover:bg-energy-500/30'
                                  }`}
                                >
                                  {squadEntry?.is_starting ? 'Starting' : 'Sub'}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Playing Time Calculator */}
            {squad.length > 0 && isManager && (
              <PlayingTimeCalculator
                squad={squad.map(s => ({ ...s, selected: true, name: s.player_name || availability.find(a => a.pupil_id === s.pupil_id)?.player_name || 'Pupil' }))}
                teamFormat={teamFormat}
                formation={getPrimaryFormation(matchFormations) || team?.formation || defaultFormationByFormat[teamFormat]}
                formationPositions={(() => {
                  const fm = getPrimaryFormation(matchFormations) || team?.formation || defaultFormationByFormat[teamFormat]
                  if (!fm) return null
                  const customFormation = (team?.custom_formations || []).find(cf => cf.name === fm)
                  if (customFormation?.positions) return customFormation.positions
                  const defaultFormations = formationsByFormat[teamFormat] || formationsByFormat[11]
                  return defaultFormations[fm] || null
                })()}
                teamName={team?.name}
                matchInfo={{ opponent: match?.opponent, date: match?.date }}
              />
            )}
          </motion.div>
        )}

        {activeTab === 'prep' && (
          <motion.div
            key="prep"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Shared Status Banner */}
            {match.prep_notes && (
              <div className="card p-4 bg-pitch-500/10 border-pitch-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-pitch-400" />
                    <div>
                      <p className="font-medium text-pitch-400">Match Prep Shared with Players</p>
                      <p className="text-sm text-pitch-400/70">Players can see this in their Pupil Zone</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClearPrepFromPlayers}
                    disabled={savingPrep}
                    className="btn-ghost text-sm text-alert-400 hover:bg-alert-500/10"
                  >
                    <X className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            )}

            {/* Header with Generate Button */}
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-white">
                Match Preparation
              </h2>
              <div className="flex gap-2">
                {!editingPrepManually && (
                  <button
                    onClick={() => {
                      setEditingPrepManually(true)
                      setManualPrepContent(prepContent?.generated || match.prep_notes || '')
                    }}
                    className="btn-secondary"
                  >
                    <Edit2 className="w-4 h-4" />
                    {prepContent?.generated || match.prep_notes ? 'Edit' : 'Write Manually'}
                  </button>
                )}
                <button
                  onClick={handleGeneratePrep}
                  disabled={generatingPrep}
                  className="btn-primary"
                >
                  {generatingPrep ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {prepContent?.generated ? 'Regenerate' : 'Generate with AI'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Manual Edit Mode */}
            {editingPrepManually && (
              <div className="card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-white">Edit Match Prep</h3>
                  <button
                    onClick={() => setEditingPrepManually(false)}
                    className="text-secondary hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-secondary">
                  Write or edit tactical notes, formation plans, and team instructions. This will be shown to pupils.
                </p>
                <textarea
                  value={manualPrepContent}
                  onChange={(e) => setManualPrepContent(e.target.value)}
                  className="input min-h-[300px] font-mono text-sm"
                  placeholder={`## Key Tactical Points

- Point 1: Description
- Point 2: Description

## Formation

Describe the formation and key positions...

## Set Pieces

Corners, free kicks, etc...`}
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setEditingPrepManually(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePrepDraft}
                    disabled={savingPrep || !manualPrepContent.trim()}
                    className="btn-secondary"
                  >
                    {savingPrep ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Draft
                  </button>
                  <button
                    onClick={handleSavePrepToPlayers}
                    disabled={savingPrep || !manualPrepContent.trim()}
                    className="btn-primary"
                  >
                    {savingPrep ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Share with Players
                  </button>
                </div>
              </div>
            )}

            {/* Generated Content Display */}
            {!editingPrepManually && prepContent?.generated ? (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-border-default">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-pitch-400" />
                    <div>
                      <p className="font-medium text-white">AI Match Prep Ready</p>
                      <p className="text-xs text-secondary">
                        Generated on {new Date(prepContent.generatedAt).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                  {!match.prep_notes && (
                    <button
                      onClick={handleSavePrepToPlayers}
                      disabled={savingPrep}
                      className="btn-primary"
                    >
                      {savingPrep ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Share with Players
                    </button>
                  )}
                </div>
                {/* Visual Formation Display */}
                {getSortedFormations(matchFormations).length > 0 && (
                  <div className="mb-6 p-4 bg-subtle rounded-xl">
                    <h3 className="text-sm font-medium text-secondary mb-3">Match Formations</h3>
                    <div className="flex gap-6 justify-center">
                      {getSortedFormations(matchFormations).map(({ formation, priority }) => (
                        <div key={formation} className="text-center">
                          <p className="text-xs text-secondary mb-2">
                            {priority === 'primary' ? 'Primary' : 'Secondary'}
                          </p>
                          <FormationPitch
                            formation={formation}
                            size="small"
                            showLabels={true}
                            customFormations={team?.custom_formations || []}
                            teamFormat={teamFormat}
                            teamFormation={team?.formation}
                            teamPositions={team?.positions}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <AIMarkdown>{prepContent.generated}</AIMarkdown>
              </div>
            ) : !editingPrepManually && match.prep_notes ? (
              // Show saved prep_notes if no newly generated content
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border-default">
                  <FileText className="w-5 h-5 text-pitch-400" />
                  <div>
                    <p className="font-medium text-white">Current Match Prep</p>
                    <p className="text-xs text-secondary">Visible to pupils</p>
                  </div>
                </div>
                {/* Visual Formation Display */}
                {getSortedFormations(matchFormations).length > 0 && (
                  <div className="mb-6 p-4 bg-subtle rounded-xl">
                    <h3 className="text-sm font-medium text-secondary mb-3">Match Formations</h3>
                    <div className="flex gap-6 justify-center">
                      {getSortedFormations(matchFormations).map(({ formation, priority }) => (
                        <div key={formation} className="text-center">
                          <p className="text-xs text-secondary mb-2">
                            {priority === 'primary' ? 'Primary' : 'Secondary'}
                          </p>
                          <FormationPitch
                            formation={formation}
                            size="small"
                            showLabels={true}
                            customFormations={team?.custom_formations || []}
                            teamFormat={teamFormat}
                            teamFormation={team?.formation}
                            teamPositions={team?.positions}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <AIMarkdown>{match.prep_notes}</AIMarkdown>
              </div>
            ) : !editingPrepManually && (
              <div className="card p-8 text-center">
                <Target className="w-12 h-12 text-tertiary mx-auto mb-4" />
                <h3 className="font-display text-lg font-semibold text-white mb-2">
                  No Match Prep Yet
                </h3>
                <p className="text-secondary mb-4 max-w-md mx-auto">
                  Generate an AI-powered match preparation briefing with tactical suggestions,
                  formation recommendations, and team talk themes - or write your own.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setEditingPrepManually(true)
                      setManualPrepContent('')
                    }}
                    className="btn-secondary"
                  >
                    <Edit2 className="w-4 h-4" />
                    Write Manually
                  </button>
                  <button
                    onClick={handleGeneratePrep}
                    disabled={generatingPrep}
                    className="btn-primary"
                  >
                    {generatingPrep ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate with AI
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'report' && (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Manager's Team Notes */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-semibold text-white">
                  Team Performance Notes
                </h2>
                {isManager && !editingTeamNotes && (
                  <button
                    onClick={() => setEditingTeamNotes(true)}
                    className="btn-ghost text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    {teamNotes ? 'Edit' : 'Add Notes'}
                  </button>
                )}
              </div>

              {editingTeamNotes ? (
                <div className="card p-4 space-y-4">
                  <p className="text-sm text-secondary">
                    Add your notes on overall team performance. These notes help the AI provide more personalized feedback to pupils.
                  </p>
                  <textarea
                    value={teamNotes}
                    onChange={(e) => setTeamNotes(e.target.value)}
                    className="input"
                    rows={6}
                    placeholder="How did the team perform overall? Note areas of strength, areas to improve, tactical observations, attitude, effort levels, etc."
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setTeamNotes(match.team_notes || '')
                        setEditingTeamNotes(false)
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveTeamNotes}
                      disabled={savingTeamNotes}
                      className="btn-primary"
                    >
                      {savingTeamNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Notes
                    </button>
                  </div>
                </div>
              ) : teamNotes ? (
                <div className="card p-4">
                  <p className="text-secondary whitespace-pre-wrap">{teamNotes}</p>
                </div>
              ) : (
                <div className="card p-6 text-center border-dashed border-2 border-border-strong">
                  <FileText className="w-8 h-8 text-tertiary mx-auto mb-2" />
                  <p className="text-secondary text-sm">
                    {isManager
                      ? 'Add notes about overall team performance to help personalize pupil feedback.'
                      : 'No team performance notes yet.'}
                  </p>
                </div>
              )}
            </div>

            {/* AI Match Report */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-semibold text-white">
                  Parent Match Report
                </h2>
                {resultDisplay && isManager && (
                  <button
                    onClick={handleGenerateReport}
                    disabled={generatingReport}
                    className="btn-primary"
                  >
                    {generatingReport ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {match.report?.generated ? 'Regenerate Report' : 'Generate Report'}
                      </>
                    )}
                  </button>
                )}
              </div>

              {match.report?.generated ? (
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-border-default">
                    <div className="flex items-center gap-3">
                      {match.report?.published ? (
                        <Eye className="w-5 h-5 text-pitch-400" />
                      ) : (
                        <EyeOff className="w-5 h-5 text-tertiary" />
                      )}
                      <div>
                        <p className="font-medium text-white">AI Match Report Ready</p>
                        <p className="text-xs text-secondary">
                          {match.report?.published
                            ? 'Visible to parents in the Pupil Zone'
                            : 'Not yet shared with parents'}
                          {match.report?.editedAt && ' (edited)'}
                        </p>
                      </div>
                    </div>
                    {isManager && (
                      <div className="flex items-center gap-2">
                        {editingReport ? (
                          <>
                            <button
                              onClick={() => setEditingReport(false)}
                              className="btn-secondary"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveReport}
                              disabled={savingReport}
                              className="btn-primary"
                            >
                              {savingReport ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              Save
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={handleStartEditReport}
                              className="btn-secondary"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => handlePublishReport(!match.report?.published)}
                              disabled={publishingReport}
                              className={match.report?.published ? 'btn-secondary' : 'btn-primary'}
                            >
                              {publishingReport ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : match.report?.published ? (
                                <>
                                  <EyeOff className="w-4 h-4" />
                                  Hide from Parents
                                </>
                              ) : (
                                <>
                                  <Share2 className="w-4 h-4" />
                                  Share to Pupil Zone
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {editingReport ? (
                    <textarea
                      value={editedReportContent}
                      onChange={(e) => setEditedReportContent(e.target.value)}
                      className="input w-full font-mono text-sm"
                      rows={20}
                      placeholder="Edit your match report (Markdown supported)..."
                    />
                  ) : (
                    <AIMarkdown>{match.report.generated}</AIMarkdown>
                  )}
                </div>
              ) : (
                <div className="card p-8 text-center">
                  <Trophy className="w-12 h-12 text-tertiary mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold text-white mb-2">
                    No Match Report Yet
                  </h3>
                  <p className="text-secondary mb-4 max-w-md mx-auto">
                    {!resultDisplay
                      ? 'Enter the match result first to generate a parent-friendly report.'
                      : 'Generate an AI-powered match report to share with parents. It will summarize the game in an engaging, family-friendly way.'
                    }
                  </p>
                  {!resultDisplay ? (
                    <button
                      onClick={() => setShowResultModal(true)}
                      className="btn-primary"
                    >
                      <Trophy className="w-4 h-4" />
                      Enter Result
                    </button>
                  ) : (
                    <button
                      onClick={handleGenerateReport}
                      disabled={generatingReport}
                      className="btn-primary"
                    >
                      {generatingReport ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate Report
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'video' && (
          <motion.div
            key="video"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <h2 className="font-display text-lg font-semibold text-white">
              Match Video
            </h2>

            {/* Mux Video Section */}
            {matchVideo?.mux_playback_id && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-white flex items-center gap-2">
                    <Video className="w-4 h-4 text-pitch-400" />
                    {matchVideo.title || 'Match Video'}
                  </h3>
                  {isManager && (
                    <button
                      onClick={async () => {
                        if (!confirm('Delete this video?')) return
                        try {
                          await videoService.deleteVideo(matchVideo.id)
                          setMatchVideo(null)
                          toast.success('Video deleted')
                        } catch { toast.error('Failed to delete video') }
                      }}
                      className="btn-ghost text-alert-400 hover:bg-alert-500/10 p-2"
                      title="Delete video"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="aspect-video bg-card rounded-lg overflow-hidden">
                  <mux-player
                    playback-id={matchVideo.mux_playback_id}
                    stream-type="on-demand"
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </div>
            )}

            {/* Processing Mux Video */}
            {matchVideo && !matchVideo.mux_playback_id && (matchVideo.status === 'processing' || matchVideo.status === 'waiting_upload') && (
              <div className="card p-4 flex items-center gap-4">
                <Loader2 className="w-6 h-6 text-caution-400 animate-spin" />
                <div>
                  <p className="text-white font-medium">Video processing</p>
                  <p className="text-sm text-secondary">Your video is being transcoded - check back shortly</p>
                </div>
              </div>
            )}

            {/* Legacy uploaded video (pre-Mux) */}
            {!matchVideo?.mux_playback_id && match.video_url && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-pitch-400" />
                    Uploaded Video
                  </h3>
                  {isManager && (
                    <button
                      onClick={handleDeleteVideo}
                      disabled={deletingVideo}
                      className="btn-ghost text-alert-400 hover:bg-alert-500/10 p-2"
                      title="Delete video"
                    >
                      {deletingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <div className="aspect-video bg-card rounded-lg overflow-hidden">
                  <video
                    src={match.video_url}
                    controls
                    className="w-full h-full"
                    controlsList="nodownload"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            )}

            {/* Video Link Section */}
            {match.veo_link && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-white flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-blue-400" />
                    Video Link
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditFormations(getFormationsArray(matchFormations))
                        setEditing(true)
                        setTimeout(() => {
                          document.getElementById('veo-link-input')?.focus()
                        }, 100)
                      }}
                      className="btn-ghost p-2"
                      title="Edit link"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <a
                      href={match.veo_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Video
                    </a>
                  </div>
                </div>
                <p className="text-sm text-secondary break-all bg-subtle p-3 rounded-lg">
                  {match.veo_link}
                </p>
              </div>
            )}

            {/* Add Video Options */}
            {isManager && (!matchVideo?.mux_playback_id && !match.video_url || !match.veo_link) && (
              <div className="card p-6">
                <h3 className="font-medium text-white mb-4">Add Match Video</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Upload Video */}
                  {!matchVideo?.mux_playback_id && !match.video_url && (
                    <button
                      onClick={() => setShowVideoUploadModal(true)}
                      className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border-strong rounded-xl hover:border-pitch-500 hover:bg-subtle transition-all"
                    >
                      <Upload className="w-8 h-8 text-secondary mb-2" />
                      <span className="text-sm font-medium text-white">Upload Video File</span>
                      <span className="text-xs text-tertiary mt-1">MP4, MOV, AVI up to 3GB</span>
                    </button>
                  )}

                  {/* Add Video Link */}
                  {!match.veo_link && (
                    <button
                      onClick={() => {
                        setEditFormations(getFormationsArray(matchFormations))
                        setEditing(true)
                        setTimeout(() => {
                          document.getElementById('veo-link-input')?.focus()
                        }, 100)
                      }}
                      className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border-strong rounded-xl hover:border-blue-500 hover:bg-subtle transition-all"
                    >
                      <LinkIcon className="w-8 h-8 text-secondary mb-2" />
                      <span className="text-sm font-medium text-white">Add Video Link</span>
                      <span className="text-xs text-tertiary mt-1">Link to match recording</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!matchVideo?.mux_playback_id && !match.video_url && !match.veo_link && !isManager && (
              <div className="card p-8 text-center">
                <Video className="w-12 h-12 text-tertiary mx-auto mb-4" />
                <h3 className="font-display text-lg font-semibold text-white mb-2">
                  No Video Added
                </h3>
                <p className="text-secondary">
                  The coach hasn't added any match footage yet.
                </p>
              </div>
            )}

            {/* AI Analysis Link - show if any video exists */}
            {(matchVideo?.mux_playback_id || match.video_url || match.veo_link) && (
              <Link
                to={`/matches/${id}/analysis`}
                className="card-hover p-4 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-pitch-500/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-pitch-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">AI Video Analysis</p>
                  <p className="text-sm text-secondary">
                    Get tactical insights and pupil performance notes
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-tertiary" />
              </Link>
            )}

            {/* Match Clips Section */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <Play className="w-4 h-4 text-energy-400" />
                  Match Clips ({clips.length})
                </h3>
                {isManager && (
                  <label className={`btn-secondary btn-sm cursor-pointer ${uploadingClips ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploadingClips ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {clipUploadProgress}%
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Add Clips
                      </>
                    )}
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,.mp4,.mov,.avi,.mkv,.webm"
                      multiple
                      onChange={handleClipUpload}
                      disabled={uploadingClips}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {clips.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {clips.map(clip => (
                    <div key={clip.id} className="bg-subtle rounded-lg overflow-hidden group">
                      <div className="aspect-video relative">
                        {clip.mux_playback_id ? (
                          <mux-player
                            playback-id={clip.mux_playback_id}
                            stream-type="on-demand"
                            style={{ width: '100%', height: '100%' }}
                          />
                        ) : clip.file_path ? (
                          <video
                            src={clip.file_path}
                            controls
                            className="w-full h-full object-cover"
                            preload="metadata"
                          />
                        ) : clip.thumbnail_url ? (
                          <img src={clip.thumbnail_url} alt={clip.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {clip.status === 'processing' || clip.status === 'waiting_upload' ? (
                              <Loader2 className="w-6 h-6 text-caution-400 animate-spin" />
                            ) : (
                              <Play className="w-8 h-8 text-tertiary" />
                            )}
                          </div>
                        )}
                        {isManager && (
                          <button
                            onClick={() => clip.mux_playback_id
                              ? videoService.deleteVideo(clip.id).then(() => {
                                  setClips(clips.filter(c => c.id !== clip.id))
                                  toast.success('Clip deleted')
                                }).catch(() => toast.error('Failed to delete'))
                              : handleDeleteClip(clip.id)
                            }
                            className="absolute top-2 right-2 p-1.5 bg-alert-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete clip"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-sm text-white truncate">{clip.title || clip.original_name}</p>
                        <div className="flex items-center gap-2">
                          {clip.duration_seconds && (
                            <p className="text-xs text-secondary">{Math.floor(clip.duration_seconds / 60)}:{String(Math.floor(clip.duration_seconds % 60)).padStart(2, '0')}</p>
                          )}
                          {clip.minute && (
                            <p className="text-xs text-secondary">{clip.minute}'</p>
                          )}
                          {clip.mux_playback_id && (
                            <Link to={`/videos/${clip.id}/analysis`} className="text-xs text-pitch-400 hover:text-pitch-300 ml-auto">
                              Analysis
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Play className="w-10 h-10 text-tertiary mx-auto mb-2" />
                  <p className="text-sm text-tertiary">
                    No clips added yet. Add highlights, goals, and key moments.
                  </p>
                </div>
              )}
            </div>
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
              className="modal-content max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border-default flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-white">Edit Match</h2>
                <button
                  onClick={() => setEditing(false)}
                  className="p-2 text-secondary hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="label">Opponent *</label>
                  <input
                    type="text"
                    value={editData.opponent || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, opponent: e.target.value }))}
                    className="input"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Date *</label>
                    <input
                      type="datetime-local"
                      value={utcToLocalDatetime(editData.date, teamTz)}
                      onChange={(e) => setEditData(prev => ({ ...prev, date: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Meet Time</label>
                    <input
                      type="time"
                      value={editData.meet_time || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, meet_time: e.target.value }))}
                      className="input"
                      placeholder="e.g. 09:00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Home/Away</label>
                    <select
                      value={editData.is_home ? 'home' : 'away'}
                      onChange={(e) => setEditData(prev => ({ ...prev, is_home: e.target.value === 'home' }))}
                      className="input"
                    >
                      <option value="home">Home</option>
                      <option value="away">Away</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Kit</label>
                    <select
                      value={editData.kit_type || (editData.is_home ? 'home' : 'away')}
                      onChange={(e) => setEditData(prev => ({ ...prev, kit_type: e.target.value }))}
                      className="input"
                    >
                      <option value="home">Home Kit</option>
                      <option value="away">Away Kit</option>
                      <option value="third">3rd Kit</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Location</label>
                  <input
                    type="text"
                    value={editData.location || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
                    className="input"
                    placeholder="Stadium / Ground name"
                  />
                </div>

                <div>
                  <label className="label">Match Formations</label>
                  <p className="text-xs text-secondary mb-2">
                    Click to add, click again to change priority, click again to remove
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {allFormations.map((formation, idx) => {
                      const formationsArr = getFormationsArray(editFormations)
                      const formData = formationsArr.find(f => f.formation === formation)
                      const isSelected = !!formData
                      const isDisabled = !isSelected && formationsArr.length >= 2
                      const priorityLabel = formData?.priority === 'primary' ? '1st' : formData?.priority === 'secondary' ? '2nd' : ''
                      const isCustom = idx >= FORMATIONS.length

                      return (
                        <button
                          key={formation}
                          type="button"
                          onClick={() => cycleEditFormationPriority(formation)}
                          disabled={isDisabled}
                          className={`
                            px-2 py-1 rounded text-xs font-medium transition-colors
                            ${isSelected
                              ? formData?.priority === 'primary'
                                ? 'bg-pitch-600 text-white'
                                : 'bg-pitch-600/60 text-white'
                              : isDisabled
                                ? 'bg-card text-tertiary cursor-not-allowed'
                                : isCustom
                                  ? 'bg-energy-600/20 text-energy-400 hover:text-white hover:bg-energy-600/40 border border-energy-500/30'
                                  : 'bg-subtle text-secondary hover:text-white hover:bg-border-default'
                            }
                          `}
                        >
                          {formation}
                          {isSelected && (
                            <span className="ml-1 opacity-75">({priorityLabel})</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {getFormationsArray(editFormations).length > 0 && (
                    <p className="text-xs text-secondary">
                      <span className="font-medium text-white">Selected:</span>{' '}
                      {getSortedFormations(editFormations).map(({ formation, priority }, idx) => (
                        <span key={formation}>
                          {idx > 0 && ' → '}
                          <span className={priority === 'primary' ? 'text-pitch-400' : 'text-secondary'}>
                            {formation} ({priority === 'primary' ? 'Primary' : 'Secondary'})
                          </span>
                        </span>
                      ))}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Video Link</label>
                  <input
                    id="veo-link-input"
                    type="url"
                    value={editData.veo_link || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, veo_link: e.target.value }))}
                    className="input"
                    placeholder="https://example.com/match-video..."
                  />
                </div>

                <div>
                  <label className="label">Notes</label>
                  <textarea
                    value={editData.notes || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                    className="input"
                    rows={3}
                    placeholder="Match notes, observations, etc."
                  />
                </div>
              </div>

              <div className="p-6 border-t border-border-default flex justify-end gap-3">
                <button onClick={() => setEditing(false)} className="btn-secondary">
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

      {/* Result Modal */}
      <AnimatePresence>
        {showResultModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowResultModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border-default">
                <h2 className="font-display text-xl font-semibold text-white text-center">
                  Enter Result
                </h2>
                <p className="text-sm text-secondary text-center mt-1">
                  {match.is_home ? `${team?.name || 'Us'} vs ${match.opponent}` : `${match.opponent} vs ${team?.name || 'Us'}`}
                </p>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <label className="block text-sm text-secondary mb-2">
                      {match.is_home ? team?.name || 'Us' : match.opponent}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={match.is_home ? resultData.goalsFor : resultData.goalsAgainst}
                      onChange={(e) => {
                        if (match.is_home) {
                          setResultData(prev => ({ ...prev, goalsFor: e.target.value }))
                        } else {
                          setResultData(prev => ({ ...prev, goalsAgainst: e.target.value }))
                        }
                      }}
                      className="input w-20 text-center text-2xl font-bold"
                    />
                  </div>
                  <span className="text-2xl text-tertiary font-bold">-</span>
                  <div className="text-center">
                    <label className="block text-sm text-secondary mb-2">
                      {match.is_home ? match.opponent : team?.name || 'Us'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={match.is_home ? resultData.goalsAgainst : resultData.goalsFor}
                      onChange={(e) => {
                        if (match.is_home) {
                          setResultData(prev => ({ ...prev, goalsAgainst: e.target.value }))
                        } else {
                          setResultData(prev => ({ ...prev, goalsFor: e.target.value }))
                        }
                      }}
                      className="input w-20 text-center text-2xl font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border-default flex gap-3">
                <button
                  onClick={() => setShowResultModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveResult}
                  disabled={savingResult}
                  className="btn-primary flex-1"
                >
                  {savingResult ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Result'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pupil of the Match Modal */}
      <AnimatePresence>
        {showPotmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowPotmModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border-default">
                <h2 className="font-display text-xl font-semibold text-white text-center flex items-center justify-center gap-2">
                  <Award className="w-6 h-6 text-energy-400" />
                  Pupil of the Match
                </h2>
                <p className="text-sm text-secondary text-center mt-1">
                  vs {match.opponent}
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Select Pupil
                  </label>
                  <select
                    value={potmData.pupilId}
                    onChange={(e) => setPotmData(prev => ({ ...prev, pupilId: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="">Choose a pupil...</option>
                    {pupils
                      .filter(p => p.is_active !== false)
                      .sort((a, b) => (a.squad_number || 999) - (b.squad_number || 999))
                      .map(pupil => (
                        <option key={pupil.id} value={pupil.id}>
                          {pupil.squad_number ? `#${pupil.squad_number} ` : ''}{pupil.name}
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Reason (optional)
                  </label>
                  <textarea
                    value={potmData.reason}
                    onChange={(e) => setPotmData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Outstanding performance, 2 goals and an assist..."
                    rows={3}
                    className="input w-full resize-none"
                  />
                  <p className="text-xs text-tertiary mt-1">
                    This will be shown to pupils and parents
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-border-default flex gap-3">
                <button
                  onClick={() => setShowPotmModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePotm}
                  disabled={savingPotm || !potmData.pupilId}
                  className="btn-primary flex-1"
                >
                  {savingPotm ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <Star className="w-4 h-4" />
                      Award POTM
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {showGoalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowGoalModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border-default">
                <h2 className="font-display text-xl font-semibold text-white text-center flex items-center justify-center gap-2">
                  <Goal className="w-6 h-6 text-pitch-400" />
                  Add Goal
                </h2>
              </div>

              <form onSubmit={handleAddGoal} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">Goalscorer *</label>
                  <select
                    value={goalData.scorer_pupil_id}
                    onChange={(e) => setGoalData(prev => ({ ...prev, scorer_pupil_id: e.target.value }))}
                    className="input w-full"
                    required
                  >
                    <option value="">Select pupil...</option>
                    {pupils
                      .filter(p => p.is_active !== false)
                      .sort((a, b) => (a.squad_number || 999) - (b.squad_number || 999))
                      .map(pupil => (
                        <option key={pupil.id} value={pupil.id}>
                          {pupil.squad_number ? `#${pupil.squad_number} ` : ''}{pupil.name}
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">Assist (optional)</label>
                  <select
                    value={goalData.assist_pupil_id}
                    onChange={(e) => setGoalData(prev => ({ ...prev, assist_pupil_id: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="">No assist / unknown</option>
                    {pupils
                      .filter(p => p.is_active !== false)
                      .sort((a, b) => (a.squad_number || 999) - (b.squad_number || 999))
                      .map(pupil => (
                        <option key={pupil.id} value={pupil.id}>
                          {pupil.squad_number ? `#${pupil.squad_number} ` : ''}{pupil.name}
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">Minute</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={goalData.minute}
                      onChange={(e) => setGoalData(prev => ({ ...prev, minute: e.target.value }))}
                      className="input w-full"
                      placeholder="e.g. 23"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">Type</label>
                    <select
                      value={goalData.goal_type}
                      onChange={(e) => setGoalData(prev => ({ ...prev, goal_type: e.target.value }))}
                      className="input w-full"
                    >
                      <option value="open_play">Open Play</option>
                      <option value="header">Header</option>
                      <option value="penalty">Penalty</option>
                      <option value="free_kick">Free Kick</option>
                      <option value="own_goal">Own Goal</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowGoalModal(false)} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={savingGoal || !goalData.scorer_pupil_id} className="btn-primary flex-1">
                    {savingGoal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Goal
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* Substitution Modal */}
        {showSubModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowSubModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border-default">
                <h2 className="font-display text-xl font-semibold text-white text-center flex items-center justify-center gap-2">
                  <ArrowRightLeft className="w-6 h-6 text-energy-400" />
                  Add Substitution
                </h2>
              </div>

              <form onSubmit={handleAddSub} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">Pupil Off</label>
                  <select
                    value={subData.player_off_id}
                    onChange={(e) => setSubData(prev => ({ ...prev, player_off_id: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="">Select pupil coming off...</option>
                    {pupils
                      .filter(p => p.is_active !== false)
                      .sort((a, b) => (a.squad_number || 999) - (b.squad_number || 999))
                      .map(pupil => (
                        <option key={pupil.id} value={pupil.id}>
                          {pupil.squad_number ? `#${pupil.squad_number} ` : ''}{pupil.name}
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">Pupil On</label>
                  <select
                    value={subData.player_on_id}
                    onChange={(e) => setSubData(prev => ({ ...prev, player_on_id: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="">Select pupil coming on...</option>
                    {pupils
                      .filter(p => p.is_active !== false)
                      .sort((a, b) => (a.squad_number || 999) - (b.squad_number || 999))
                      .map(pupil => (
                        <option key={pupil.id} value={pupil.id}>
                          {pupil.squad_number ? `#${pupil.squad_number} ` : ''}{pupil.name}
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">Minute</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={subData.minute}
                    onChange={(e) => setSubData(prev => ({ ...prev, minute: e.target.value }))}
                    className="input w-full"
                    placeholder="e.g. 45"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowSubModal(false)} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={savingSub || (!subData.player_off_id && !subData.player_on_id)} className="btn-primary flex-1">
                    {savingSub ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Sub
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Match Event Modal */}
      <AnimatePresence>
        {showEventModal && taxonomy && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="card max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 pb-0">
                <h3 className="text-lg font-semibold text-white">Add Match Event</h3>
                <button onClick={() => setShowEventModal(false)} className="text-tertiary hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleAddEvent} className="p-6 space-y-4">
                <div>
                  <label className="text-xs text-secondary mb-1 block">Event Type</label>
                  <select value={eventData.event_type} onChange={e => setEventData(prev => ({ ...prev, event_type: e.target.value }))} className="input w-full">
                    <option value="">Select event type</option>
                    {(taxonomy.matchEventTypes || []).map(t => (
                      <option key={t.key} value={t.key}>{t.label}{t.points > 0 ? ` (${t.points} pts)` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-secondary mb-1 block">Pupil</label>
                  <select value={eventData.pupil_id} onChange={e => setEventData(prev => ({ ...prev, pupil_id: e.target.value }))} className="input w-full">
                    <option value="">Select pupil</option>
                    {(pupils || []).map(p => (
                      <option key={p.id} value={p.id}>{p.squad_number ? `#${p.squad_number} ` : ''}{p.name}</option>
                    ))}
                  </select>
                </div>
                {taxonomy.matchEventTypes?.find(t => t.key === eventData.event_type)?.hasSecondary && (
                  <div>
                    <label className="text-xs text-secondary mb-1 block">{taxonomy.matchEventTypes.find(t => t.key === eventData.event_type)?.secondaryLabel || 'Assist'}</label>
                    <select value={eventData.secondary_pupil_id} onChange={e => setEventData(prev => ({ ...prev, secondary_pupil_id: e.target.value }))} className="input w-full">
                      <option value="">None</option>
                      {(pupils || []).filter(p => p.id !== eventData.pupil_id).map(p => (
                        <option key={p.id} value={p.id}>{p.squad_number ? `#${p.squad_number} ` : ''}{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs text-secondary mb-1 block">Minute</label>
                  <input type="number" min="1" max="120" value={eventData.minute} onChange={e => setEventData(prev => ({ ...prev, minute: e.target.value }))} className="input w-full" placeholder="e.g. 23" />
                </div>
                <div>
                  <label className="text-xs text-secondary mb-1 block">Notes (optional)</label>
                  <input type="text" value={eventData.notes} onChange={e => setEventData(prev => ({ ...prev, notes: e.target.value }))} className="input w-full" placeholder="Any details" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowEventModal(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={savingEvent || !eventData.event_type} className="btn-primary flex-1">
                    {savingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Event
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pupil Stats Modal */}
      <AnimatePresence>
        {showStatsModal && taxonomy && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 pb-0">
                <h3 className="text-lg font-semibold text-white">Pupil Match Stats</h3>
                <button onClick={() => setShowStatsModal(false)} className="text-tertiary hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                {Object.entries(editingStats).map(([pupilId, data]) => (
                  <div key={pupilId} className="p-4 rounded-lg bg-subtle border border-border-strong space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white">
                        {data.squad_number && <span className="text-secondary mr-1">#{data.squad_number}</span>}
                        {data.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-secondary">Rating</label>
                        <select
                          value={data.rating || ''}
                          onChange={e => setEditingStats(prev => ({ ...prev, [pupilId]: { ...prev[pupilId], rating: e.target.value ? parseInt(e.target.value) : null } }))}
                          className="input w-20 text-sm"
                        >
                          <option value="">-</option>
                          {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(taxonomy.pupilStatFields || []).map(field => (
                        <div key={field.key}>
                          <label className="text-xs text-tertiary block mb-0.5">{field.label}</label>
                          {field.type === 'select' ? (
                            <select
                              value={data.stats?.[field.key] || ''}
                              onChange={e => setEditingStats(prev => ({ ...prev, [pupilId]: { ...prev[pupilId], stats: { ...prev[pupilId].stats, [field.key]: e.target.value } } }))}
                              className="input w-full text-sm"
                            >
                              <option value="">-</option>
                              {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              step={field.step || 1}
                              value={data.stats?.[field.key] ?? ''}
                              onChange={e => setEditingStats(prev => ({ ...prev, [pupilId]: { ...prev[pupilId], stats: { ...prev[pupilId].stats, [field.key]: e.target.value ? parseFloat(e.target.value) : null } } }))}
                              className="input w-full text-sm"
                              placeholder="0"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowStatsModal(false)} className="btn-secondary flex-1">Cancel</button>
                  <button onClick={handleSavePupilStats} disabled={savingStats} className="btn-primary flex-1">
                    {savingStats ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Stats
                  </button>
                </div>
              </div>
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
                  Delete Match?
                </h2>
                <p className="text-secondary text-center mb-6">
                  Are you sure you want to delete the match vs <span className="text-white font-medium">{match.opponent}</span>?
                  This action cannot be undone.
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

      {/* Announce Squad Modal */}
      <AnimatePresence>
        {showAnnounceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowAnnounceModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border-default">
                <h2 className="font-display text-xl font-semibold text-white">
                  {match.squad_announced ? 'Update & Re-notify Squad' : 'Announce Squad'}
                </h2>
                <p className="text-sm text-secondary mt-1">
                  {match.squad_announced
                    ? `This will re-notify ${squad.length} pupils with the updated squad`
                    : `This will notify ${squad.length} pupils of their selection`}
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="label">Meet-up Time</label>
                  <input
                    type="datetime-local"
                    value={announceData.meetup_time}
                    onChange={(e) => setAnnounceData(prev => ({ ...prev, meetup_time: e.target.value }))}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Meet-up Location</label>
                  <input
                    type="text"
                    value={announceData.meetup_location}
                    onChange={(e) => setAnnounceData(prev => ({ ...prev, meetup_location: e.target.value }))}
                    className="input"
                    placeholder="e.g. School car park, main entrance"
                  />
                </div>

                <div className="bg-subtle rounded-lg p-4">
                  <p className="text-sm text-secondary">
                    <strong className="text-white">Squad Summary:</strong>
                  </p>
                  <p className="text-sm text-secondary mt-1">
                    {squad.filter(s => s.is_starting).length} starting pupils, {squad.filter(s => !s.is_starting).length} substitutes
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-border-default flex gap-3">
                <button
                  onClick={() => setShowAnnounceModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAnnounceSquad}
                  disabled={announcing}
                  className="btn-primary flex-1"
                >
                  {announcing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {match.squad_announced ? 'Re-notify Players' : 'Announce'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Video Upload Modal */}
        {showVideoUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowVideoUploadModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border-default flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-white">Upload Match Video</h2>
                <button
                  onClick={() => setShowVideoUploadModal(false)}
                  className="p-2 text-secondary hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <VideoUpload
                  teamId={team?.id}
                  matchId={id}
                  onUploadComplete={handleVideoUploadComplete}
                  onCancel={() => setShowVideoUploadModal(false)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
