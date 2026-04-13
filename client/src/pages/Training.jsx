// Training.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Plus,
  Sparkles,
  Clock,
  Users,
  Target,
  ChevronRight,
  Loader2,
  X,
  Play,
  Trash2,
  Edit2,
  Save,
  CheckCircle,
  AlertCircle,
  Dumbbell,
  MapPin,
  FileText,
  Send,
  Eye,
  EyeOff,
  Repeat,
  CalendarPlus,
  PenLine,
  ImagePlus,
  Trash,
  Check,
  HelpCircle,
  Bell,
  UserCheck,
} from 'lucide-react'
import { trainingService } from '../services/api'
import { useTeam } from '../context/TeamContext'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import AIMarkdown from '../components/AIMarkdown'
import DrillDiagram from '../components/DrillDiagram'

const focusAreaOptions = [
  { value: 'passing', label: 'Passing & Control' },
  { value: 'shooting', label: 'Shooting & Finishing' },
  { value: 'dribbling', label: 'Dribbling & 1v1' },
  { value: 'defending', label: 'Defending' },
  { value: 'heading', label: 'Heading' },
  { value: 'set-pieces', label: 'Set Pieces' },
  { value: 'possession', label: 'Possession Play' },
  { value: 'pressing', label: 'Pressing & Transitions' },
  { value: 'build-up', label: 'Build-up Play' },
  { value: 'fitness', label: 'Fitness & Conditioning' },
  { value: 'goalkeeping', label: 'Goalkeeping' },
  { value: 'teamwork', label: 'Team Shape & Movement' },
]

const trainingLevelOptions = [
  { value: 'development', label: 'Development', description: 'Building fundamentals, confidence and fun' },
  { value: 'core', label: 'Core', description: 'Age-appropriate standard level' },
  { value: 'advanced', label: 'Advanced', description: 'High-ability, increased tempo and complexity' },
]

const durationOptions = [
  { value: 45, label: '45 mins' },
  { value: 60, label: '60 mins' },
  { value: 75, label: '75 mins' },
  { value: 90, label: '90 mins' },
  { value: 120, label: '2 hours' },
]

export default function Training() {
  const { user } = useAuth()
  const { pupils } = useTeam()
  const isManager = user?.role === 'manager' || user?.role === 'assistant'

  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list') // 'list', 'weekly'

  // Create/Generate modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState(null)
  const [createForm, setCreateForm] = useState({
    date: new Date().toISOString().split('T')[0],
    meet_time: '',
    time: '',
    duration: 60,
    focusAreas: [],
    playerCount: pupils.length || 14,
    constraints: '',
    coachDrills: '',
    location: '',
    session_type: 'training', // 'training' or 's&c'
    venue_type: 'outdoor', // 'outdoor' or 'indoor'
    level: 'core', // 'development', 'core', or 'advanced'
    recurring: false,
    recurring_end_date: '',
  })

  // Session detail modal
  const [selectedSession, setSelectedSession] = useState(null)
  const [editingSession, setEditingSession] = useState(false)
  const [savingSession, setSavingSession] = useState(false)
  const [deletingSession, setDeletingSession] = useState(false)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [togglingShare, setTogglingShare] = useState(false)
  const [generatingPlanForSession, setGeneratingPlanForSession] = useState(false)
  const [sessionPlanLevel, setSessionPlanLevel] = useState('core')
  const [sessionPlanFocusAreas, setSessionPlanFocusAreas] = useState([])

  // Custom plan editing
  const [editingCustomPlan, setEditingCustomPlan] = useState(false)
  const [customPlanText, setCustomPlanText] = useState('')
  const [savingCustomPlan, setSavingCustomPlan] = useState(false)

  // AI plan inline editing
  const [editingPlanSection, setEditingPlanSection] = useState(null) // e.g. 'warmUp', 'technical'
  const [editedSectionData, setEditedSectionData] = useState(null)
  const [savingPlanEdit, setSavingPlanEdit] = useState(false)

  // Plan image uploads
  const [uploadingImages, setUploadingImages] = useState(false)
  const [deletingImageId, setDeletingImageId] = useState(null)

  // Attendance
  const [attendance, setAttendance] = useState([])
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [savingAttendance, setSavingAttendance] = useState(false)
  const [showAttendance, setShowAttendance] = useState(false)

  // Availability
  const [availability, setAvailability] = useState([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [showAvailability, setShowAvailability] = useState(false)

  useEffect(() => {
    loadSessions()
  }, [user?.team_id])

  useEffect(() => {
    if (selectedSession?.focus_areas?.length > 0) {
      setSessionPlanFocusAreas(selectedSession.focus_areas)
    } else {
      setSessionPlanFocusAreas([])
    }
    setSessionPlanLevel('core')
  }, [selectedSession?.id])

  async function loadSessions() {
    if (!user?.team_id) return

    setLoading(true)
    try {
      const response = await trainingService.getSessions(user.team_id)
      setSessions(response.data)
    } catch (error) {
      console.error('Failed to load sessions:', error)
      toast.error('Failed to load training sessions')
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }

  function formatTime(minutes) {
    if (minutes < 60) return `${minutes} mins`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`
  }

  function toggleFocusArea(area) {
    setCreateForm(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(area)
        ? prev.focusAreas.filter(a => a !== area)
        : [...prev.focusAreas, area]
    }))
  }

  // Save S&C or manual session directly without AI generation
  async function handleSaveDirectSession() {
    if (createForm.recurring && !createForm.recurring_end_date) {
      toast.error('Please set an end date for recurring sessions')
      return
    }
    setGenerating(true)
    try {
      const payload = {
        date: createForm.date,
        meet_time: createForm.meet_time || null,
        time: createForm.time || null,
        duration: createForm.duration,
        focusAreas: createForm.session_type === 's&c' ? ['S&C'] : createForm.focusAreas,
        notes: createForm.constraints || null,
        location: createForm.location || null,
        session_type: createForm.session_type,
        venue_type: createForm.venue_type,
      }
      if (createForm.recurring && createForm.recurring_end_date) {
        payload.recurring = true
        payload.recurring_end_date = createForm.recurring_end_date
      }
      const response = await trainingService.createSession(user.team_id, payload)
      setShowCreateModal(false)
      resetCreateForm()
      await loadSessions()
      const count = Array.isArray(response.data) ? response.data.length : 1
      toast.success(
        count > 1
          ? `${count} weekly sessions created!`
          : createForm.session_type === 's&c' ? 'S&C session added!' : 'Session scheduled! You can add a plan later.'
      )
    } catch (error) {
      console.error('Failed to save session:', error)
      const msg = error.response?.data?.message || 'Failed to save session'
      toast.error(msg)
    }
    setGenerating(false)
  }

  async function handleGenerate() {
    // For S&C sessions, just save directly without generating
    if (createForm.session_type === 's&c') {
      await handleSaveDirectSession()
      return
    }

    if (createForm.focusAreas.length === 0) {
      toast.error('Please select at least one focus area')
      return
    }

    if (createForm.recurring && !createForm.recurring_end_date) {
      toast.error('Please set an end date for recurring sessions')
      return
    }

    // For recurring training sessions, create the schedule first (no AI generation for batch)
    if (createForm.recurring && createForm.recurring_end_date) {
      setGenerating(true)
      try {
        const payload = {
          date: createForm.date,
          meet_time: createForm.meet_time || null,
          time: createForm.time || null,
          duration: createForm.duration,
          focusAreas: createForm.focusAreas,
          notes: createForm.constraints || null,
          location: createForm.location || null,
          session_type: createForm.session_type,
          venue_type: createForm.venue_type,
          recurring: true,
          recurring_end_date: createForm.recurring_end_date,
        }
        const response = await trainingService.createSession(user.team_id, payload)
        setShowCreateModal(false)
        resetCreateForm()
        await loadSessions()
        const count = Array.isArray(response.data) ? response.data.length : 1
        toast.success(`${count} weekly sessions created! You can generate AI plans for each one individually.`)
      } catch (error) {
        console.error('Failed to create recurring sessions:', error)
        toast.error(error.response?.data?.message || 'Failed to create recurring sessions')
      }
      setGenerating(false)
      return
    }

    setGenerating(true)
    try {
      const response = await trainingService.generateSession(user.team_id, {
        date: createForm.date,
        meet_time: createForm.meet_time || undefined,
        time: createForm.time || undefined,
        duration: createForm.duration,
        focusAreas: createForm.focusAreas,
        pupils: createForm.playerCount,
        constraints: createForm.constraints || undefined,
        coachDrills: createForm.coachDrills || undefined,
        location: createForm.location || undefined,
        session_type: createForm.session_type,
        venue_type: createForm.venue_type,
        level: createForm.level,
      })

      setGeneratedPlan(response.data)
      toast.success('Training session generated!')
    } catch (error) {
      console.error('Failed to generate session:', error)
      toast.error(error.response?.data?.message || 'Failed to generate session')
    }
    setGenerating(false)
  }

  function resetCreateForm() {
    setCreateForm({
      date: new Date().toISOString().split('T')[0],
      meet_time: '',
      time: '',
      duration: 60,
      focusAreas: [],
      playerCount: pupils.length || 14,
      constraints: '',
      coachDrills: '',
      location: '',
      session_type: 'training',
      venue_type: 'outdoor',
      level: 'core',
      recurring: false,
      recurring_end_date: '',
    })
    setGeneratedPlan(null)
  }

  async function handleSaveSession() {
    setSavingSession(true)
    try {
      // If we have a generated plan, it was already saved by the generate endpoint
      // Just close the modal and refresh
      setShowCreateModal(false)
      resetCreateForm()
      await loadSessions()
      toast.success('Session saved!')
    } catch (error) {
      toast.error('Failed to save session')
    }
    setSavingSession(false)
  }

  async function handleDeleteSession(sessionId) {
    setDeletingSession(true)
    try {
      await trainingService.deleteSession(sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      closeSessionDetail()
      toast.success('Session deleted')
    } catch (error) {
      toast.error('Failed to delete session')
    }
    setDeletingSession(false)
  }

  async function handleGenerateSummary(session) {
    setGeneratingSummary(true)
    try {
      const response = await trainingService.generateSummary(user.team_id, session.id)
      // Update the session with the new summary
      const updatedSession = { ...session, summary: response.data.summary }
      setSelectedSession(updatedSession)
      setSessions(prev => prev.map(s => s.id === session.id ? updatedSession : s))
      toast.success('Summary generated! Parents can now see this in their Pupil Zone.')
    } catch (error) {
      console.error('Failed to generate summary:', error)
      toast.error('Failed to generate summary')
    }
    setGeneratingSummary(false)
  }

  async function handleToggleSharePlan(session) {
    setTogglingShare(true)
    try {
      const newShareValue = !session.share_plan_with_players
      await trainingService.toggleSharePlan(user.team_id, session.id, newShareValue)
      // Update the session with the new share setting
      const updatedSession = { ...session, share_plan_with_players: newShareValue }
      setSelectedSession(updatedSession)
      setSessions(prev => prev.map(s => s.id === session.id ? updatedSession : s))
      toast.success(newShareValue
        ? 'Training plan is now visible to pupils in their Pupil Zone!'
        : 'Training plan hidden from pupils.')
    } catch (error) {
      console.error('Failed to toggle share setting:', error)
      toast.error('Failed to update sharing setting')
    }
    setTogglingShare(false)
  }

  async function handleGeneratePlanForSession(session) {
    setGeneratingPlanForSession(true)
    try {
      const focusAreas = sessionPlanFocusAreas.length > 0
        ? sessionPlanFocusAreas
        : session.focus_areas || []
      const response = await trainingService.generateSession(user.team_id, {
        date: session.date,
        meet_time: session.meet_time || undefined,
        time: session.time || undefined,
        duration: session.duration,
        focusAreas,
        pupils: pupils.length || 14,
        constraints: session.notes || undefined,
        location: session.location || undefined,
        session_type: session.session_type || 'training',
        venue_type: session.venue_type || 'outdoor',
        existingSessionId: session.id,
        level: sessionPlanLevel,
      })
      const updatedSession = response.data
      setSelectedSession(updatedSession)
      setSessions(prev => prev.map(s => s.id === session.id ? updatedSession : s))
      toast.success('Training plan generated!')
    } catch (error) {
      console.error('Failed to generate plan:', error)
      toast.error(error.response?.data?.message || 'Failed to generate plan')
    }
    setGeneratingPlanForSession(false)
  }

  function handleStartEditSection(sectionKey, content) {
    setEditingPlanSection(sectionKey)
    setEditedSectionData({ ...content })
  }

  async function handleSavePlanSection(session) {
    if (!editingPlanSection || !editedSectionData) return
    setSavingPlanEdit(true)
    try {
      const updatedPlan = { ...selectedSession.plan, [editingPlanSection]: editedSectionData }
      const response = await trainingService.updateSession(user.team_id, session.id, { plan: updatedPlan })
      const updatedSession = response.data
      setSelectedSession(updatedSession)
      setSessions(prev => prev.map(s => s.id === session.id ? updatedSession : s))
      setEditingPlanSection(null)
      setEditedSectionData(null)
      toast.success('Drill updated!')
    } catch (error) {
      console.error('Failed to save plan edit:', error)
      toast.error('Failed to save changes')
    }
    setSavingPlanEdit(false)
  }

  async function handleSaveCustomPlan(session) {
    setSavingCustomPlan(true)
    try {
      const response = await trainingService.saveCustomPlan(user.team_id, session.id, customPlanText)
      const updatedSession = response.data
      setSelectedSession(updatedSession)
      setSessions(prev => prev.map(s => s.id === session.id ? updatedSession : s))
      setEditingCustomPlan(false)
      toast.success('Session plan saved!')
    } catch (error) {
      console.error('Failed to save custom plan:', error)
      toast.error('Failed to save plan')
    }
    setSavingCustomPlan(false)
  }

  async function handleUploadImages(session, files) {
    if (!files || files.length === 0) return
    setUploadingImages(true)
    try {
      const formData = new FormData()
      for (const file of files) {
        formData.append('images', file)
      }
      const response = await trainingService.uploadPlanImages(user.team_id, session.id, formData)
      const updatedSession = response.data
      setSelectedSession(updatedSession)
      setSessions(prev => prev.map(s => s.id === session.id ? updatedSession : s))
      toast.success(`${files.length} image${files.length > 1 ? 's' : ''} uploaded!`)
    } catch (error) {
      console.error('Failed to upload images:', error)
      toast.error('Failed to upload images')
    }
    setUploadingImages(false)
  }

  async function handleDeleteImage(session, imageId) {
    setDeletingImageId(imageId)
    try {
      const response = await trainingService.deletePlanImage(user.team_id, session.id, imageId)
      const updatedSession = response.data
      setSelectedSession(updatedSession)
      setSessions(prev => prev.map(s => s.id === session.id ? updatedSession : s))
      toast.success('Image removed')
    } catch (error) {
      console.error('Failed to delete image:', error)
      toast.error('Failed to remove image')
    }
    setDeletingImageId(null)
  }

  function closeSessionDetail() {
    setSelectedSession(null)
    setEditingCustomPlan(false)
    setCustomPlanText('')
    setShowAttendance(false)
    setShowAvailability(false)
  }

  async function loadAttendance(sessionId) {
    setLoadingAttendance(true)
    try {
      const response = await trainingService.getAttendance(user.team_id, sessionId)
      setAttendance(response.data)
    } catch (error) {
      console.error('Failed to load attendance:', error)
      toast.error('Failed to load attendance')
    }
    setLoadingAttendance(false)
  }

  function togglePlayerAttendance(pupilId) {
    setAttendance(prev => prev.map(p =>
      p.pupil_id === pupilId ? { ...p, attended: !p.attended } : p
    ))
  }

  function setPlayerEffort(pupilId, rating) {
    setAttendance(prev => prev.map(p =>
      p.pupil_id === pupilId ? { ...p, effort_rating: rating } : p
    ))
  }

  function markAllPresent() {
    setAttendance(prev => prev.map(p => ({ ...p, attended: true })))
  }

  async function handleSaveAttendance(sessionId) {
    setSavingAttendance(true)
    try {
      const records = attendance.map(p => ({
        pupil_id: p.pupil_id,
        attended: p.attended,
        effort_rating: p.effort_rating || null,
      }))
      await trainingService.saveAttendance(user.team_id, sessionId, records)
      toast.success('Attendance saved')
    } catch (error) {
      console.error('Failed to save attendance:', error)
      toast.error('Failed to save attendance')
    }
    setSavingAttendance(false)
  }

  // Availability functions
  async function loadAvailability(sessionId) {
    setLoadingAvailability(true)
    try {
      const response = await trainingService.getAvailability(user.team_id, sessionId)
      setAvailability(response.data)
    } catch (error) {
      console.error('Failed to load availability:', error)
      toast.error('Failed to load availability')
    }
    setLoadingAvailability(false)
  }

  async function handleAvailabilityUpdate(sessionId, pupilId, status) {
    try {
      await trainingService.updateAvailability(user.team_id, sessionId, {
        pupil_id: pupilId,
        status,
      })
      setAvailability(prev => prev.map(p =>
        p.pupil_id === pupilId ? { ...p, status } : p
      ))
    } catch (error) {
      toast.error('Failed to update availability')
    }
  }

  async function handleRequestAvailability(sessionId, pendingOnly = false) {
    try {
      await trainingService.requestAvailability(user.team_id, sessionId, { pendingOnly })
      const msg = pendingOnly ? 'Reminder sent to pending pupils' : 'Availability request sent to all pupils'
      toast.success(msg)
    } catch (error) {
      toast.error('Failed to send availability request')
    }
  }

  function getAvailabilitySummary() {
    return {
      available: availability.filter(a => a.status === 'available').length,
      unavailable: availability.filter(a => a.status === 'unavailable').length,
      maybe: availability.filter(a => a.status === 'maybe').length,
      pending: availability.filter(a => a.status === 'pending').length,
      total: availability.length,
    }
  }

  // Group sessions by week for weekly view
  function getWeeklySessions() {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + 1) // Monday
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6) // Sunday
    endOfWeek.setHours(23, 59, 59, 999)

    const weekDays = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      weekDays.push({
        date: day,
        dayName: day.toLocaleDateString('en-GB', { weekday: 'short' }),
        dayNum: day.getDate(),
        sessions: sessions.filter(s => {
          const sessionDate = new Date(s.date)
          return sessionDate.toDateString() === day.toDateString()
        })
      })
    }

    return weekDays
  }

  // Get upcoming sessions
  const upcomingSessions = sessions
    .filter(s => new Date(s.date) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5)

  // Get past sessions
  const pastSessions = sessions
    .filter(s => new Date(s.date) < new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-white mb-1">Training</h1>
          <p className="text-navy-400">Plan and generate AI-powered training sessions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus className="w-5 h-5" />
          New Session
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-pitch-500/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-pitch-400" />
            </div>
            <h2 className="font-display text-lg font-semibold text-white">AI Session Generator</h2>
          </div>
          <p className="text-navy-400 mb-4">
            Describe your time, pupils, and focus areas - get a complete session plan with drills, coaching points, and progressions.
          </p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary w-full">
            <Sparkles className="w-4 h-4" />
            Generate Session
          </button>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-energy-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-energy-400" />
            </div>
            <h2 className="font-display text-lg font-semibold text-white">Weekly Planner</h2>
          </div>
          <p className="text-navy-400 mb-4">
            View your training week at a glance. Plan sessions around matches and track what you've covered.
          </p>
          <button
            onClick={() => setView(view === 'weekly' ? 'list' : 'weekly')}
            className="btn-secondary w-full"
          >
            <Calendar className="w-4 h-4" />
            {view === 'weekly' ? 'Show List View' : 'Show Weekly View'}
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setView('list')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            view === 'list' ? 'bg-pitch-600 text-white' : 'bg-navy-800 text-navy-400 hover:text-white'
          }`}
        >
          List View
        </button>
        <button
          onClick={() => setView('weekly')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            view === 'weekly' ? 'bg-pitch-600 text-white' : 'bg-navy-800 text-navy-400 hover:text-white'
          }`}
        >
          Weekly View
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-pitch-400" />
        </div>
      ) : view === 'weekly' ? (
        /* Weekly View */
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-navy-800">
            {getWeeklySessions().map((day, idx) => (
              <div
                key={idx}
                className={`p-3 text-center border-r border-navy-800 last:border-r-0 ${
                  day.date.toDateString() === new Date().toDateString()
                    ? 'bg-pitch-500/10'
                    : ''
                }`}
              >
                <p className="text-xs text-navy-500 uppercase">{day.dayName}</p>
                <p className={`text-lg font-semibold ${
                  day.date.toDateString() === new Date().toDateString()
                    ? 'text-pitch-400'
                    : 'text-white'
                }`}>
                  {day.dayNum}
                </p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 min-h-[300px]">
            {getWeeklySessions().map((day, idx) => (
              <div
                key={idx}
                className={`p-2 border-r border-navy-800 last:border-r-0 ${
                  day.date.toDateString() === new Date().toDateString()
                    ? 'bg-pitch-500/5'
                    : ''
                }`}
              >
                {day.sessions.length > 0 ? (
                  <div className="space-y-2">
                    {day.sessions.map(session => (
                      <button
                        key={session.id}
                        onClick={() => setSelectedSession(session)}
                        className="w-full p-2 rounded-lg bg-pitch-500/20 border border-pitch-500/30 text-left hover:bg-pitch-500/30 transition-colors"
                      >
                        <p className="text-xs font-medium text-pitch-400 truncate">
                          {session.focus_areas?.join(', ') || 'Training'}
                        </p>
                        <p className="text-xs text-navy-400">
                          {formatTime(session.duration)}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setCreateForm(prev => ({
                        ...prev,
                        date: day.date.toISOString().split('T')[0]
                      }))
                      setShowCreateModal(true)
                    }}
                    className="w-full h-full min-h-[60px] rounded-lg border-2 border-dashed border-navy-700 hover:border-navy-600 flex items-center justify-center text-navy-600 hover:text-navy-500 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-8">
          {/* Upcoming Sessions */}
          <div>
            <h2 className="font-display text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pitch-500" />
              Upcoming Sessions
            </h2>
            {upcomingSessions.length > 0 ? (
              <div className="space-y-3">
                {upcomingSessions.map((session, index) => {
                  const isSC = session.session_type === 's&c'
                  return (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="card-hover p-4 w-full flex items-center gap-4 text-left"
                      >
                        <div className={`w-12 h-12 rounded-xl ${isSC ? 'bg-energy-500/10' : 'bg-pitch-500/10'} flex flex-col items-center justify-center shrink-0`}>
                          <span className={`text-xs ${isSC ? 'text-energy-400' : 'text-pitch-400'} uppercase`}>
                            {new Date(session.date).toLocaleDateString('en-GB', { weekday: 'short' })}
                          </span>
                          <span className="text-lg font-bold text-white">
                            {new Date(session.date).getDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-2 mb-1">
                            {isSC ? (
                              <span className="badge-energy text-xs flex items-center gap-1">
                                <Dumbbell className="w-3 h-3" />
                                S&C Session
                              </span>
                            ) : (
                              session.focus_areas?.slice(0, 3).map(area => (
                                <span key={area} className="badge-pitch text-xs">
                                  {focusAreaOptions.find(f => f.value === area)?.label || area}
                                </span>
                              ))
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-navy-400">
                            {session.meet_time && (
                              <span className="flex items-center gap-1" title="Meet time">
                                <Users className="w-3.5 h-3.5" />
                                {session.meet_time.slice(0, 5)}
                              </span>
                            )}
                            {session.time && (
                              <span className="flex items-center gap-1" title="Session start">
                                <Clock className="w-3.5 h-3.5" />
                                {session.time.slice(0, 5)}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {formatTime(session.duration)}
                            </span>
                            {session.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {session.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right mr-2">
                          <p className="text-xs text-navy-500">Availability</p>
                          <p className="text-sm font-medium text-pitch-400">
                            {parseInt(session.available_count) || 0} ready
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-navy-600" />
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="card p-8 text-center">
                <Calendar className="w-12 h-12 text-navy-600 mx-auto mb-4" />
                <h3 className="font-display text-lg font-semibold text-white mb-2">
                  No upcoming sessions
                </h3>
                <p className="text-navy-400 mb-4">
                  Create your next training session with AI assistance.
                </p>
                <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  Create Session
                </button>
              </div>
            )}
          </div>

          {/* Past Sessions */}
          {pastSessions.length > 0 && (
            <div>
              <h2 className="font-display text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-navy-500" />
                Past Sessions
              </h2>
              <div className="space-y-3">
                {pastSessions.slice(0, 10).map((session, index) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <button
                      onClick={() => setSelectedSession(session)}
                      className="card p-4 w-full flex items-center gap-4 text-left opacity-75 hover:opacity-100 transition-opacity"
                    >
                      <div className="w-12 h-12 rounded-xl bg-navy-800 flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs text-navy-500 uppercase">
                          {new Date(session.date).toLocaleDateString('en-GB', { weekday: 'short' })}
                        </span>
                        <span className="text-lg font-bold text-navy-400">
                          {new Date(session.date).getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2 mb-1">
                          {session.focus_areas?.slice(0, 3).map(area => (
                            <span key={area} className="badge-navy text-xs">
                              {focusAreaOptions.find(f => f.value === area)?.label || area}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-navy-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTime(session.duration)}
                          </span>
                          <span>{formatDate(session.date)}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-navy-600" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Generate Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => {
              if (!generating) {
                setShowCreateModal(false)
                setGeneratedPlan(null)
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-navy-800 flex items-center justify-between shrink-0">
                <h2 className="font-display text-xl font-semibold text-white">
                  {generatedPlan ? 'Generated Session Plan' : 'New Training Session'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setGeneratedPlan(null)
                  }}
                  disabled={generating}
                  className="p-2 text-navy-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {!generatedPlan ? (
                  <div className="space-y-6">
                    {/* Session Type */}
                    <div>
                      <label className="label">Session Type</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCreateForm(prev => ({ ...prev, session_type: 'training' }))}
                          className={`flex-1 p-3 rounded-lg font-medium transition-colors ${
                            createForm.session_type === 'training'
                              ? 'bg-pitch-600 text-white'
                              : 'bg-navy-800 text-navy-400 hover:text-white'
                          }`}
                        >
                          <Target className="w-5 h-5 mx-auto mb-1" />
                          Training
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreateForm(prev => ({ ...prev, session_type: 's&c' }))}
                          className={`flex-1 p-3 rounded-lg font-medium transition-colors ${
                            createForm.session_type === 's&c'
                              ? 'bg-energy-600 text-white'
                              : 'bg-navy-800 text-navy-400 hover:text-white'
                          }`}
                        >
                          <Dumbbell className="w-5 h-5 mx-auto mb-1" />
                          S&C
                        </button>
                      </div>
                    </div>

                    {/* Date & Duration */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Date</label>
                        <input
                          type="date"
                          value={createForm.date}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, date: e.target.value }))}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">Duration</label>
                        <select
                          value={createForm.duration}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                          className="input"
                        >
                          {durationOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Meet Time & Session Start Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Meet Time</label>
                        <input
                          type="time"
                          value={createForm.meet_time}
                          onChange={(e) => {
                            const meetTime = e.target.value
                            setCreateForm(prev => {
                              const updated = { ...prev, meet_time: meetTime }
                              // Auto-suggest session start 15 mins after meet time if start is empty
                              if (meetTime && !prev.time) {
                                const [h, m] = meetTime.split(':').map(Number)
                                const totalMins = h * 60 + m + 15
                                const newH = Math.floor(totalMins / 60) % 24
                                const newM = totalMins % 60
                                updated.time = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
                              }
                              return updated
                            })
                          }}
                          className="input"
                          placeholder="17:45"
                        />
                        <p className="text-xs text-navy-500 mt-1">When pupils arrive</p>
                      </div>
                      <div>
                        <label className="label">Session Start</label>
                        <input
                          type="time"
                          value={createForm.time}
                          onChange={(e) => {
                            const startTime = e.target.value
                            setCreateForm(prev => {
                              const updated = { ...prev, time: startTime }
                              // Auto-suggest meet time 15 mins before if meet is empty
                              if (startTime && !prev.meet_time) {
                                const [h, m] = startTime.split(':').map(Number)
                                const totalMins = h * 60 + m - 15
                                const adjMins = totalMins < 0 ? totalMins + 1440 : totalMins
                                const newH = Math.floor(adjMins / 60) % 24
                                const newM = adjMins % 60
                                updated.meet_time = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
                              }
                              return updated
                            })
                          }}
                          className="input"
                          placeholder="18:00"
                        />
                        <p className="text-xs text-navy-500 mt-1">When coaching begins</p>
                      </div>
                    </div>

                    {/* Location/Venue */}
                    <div>
                      <label className="label">Location / Venue</label>
                      <input
                        type="text"
                        value={createForm.location}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, location: e.target.value }))}
                        className="input"
                        placeholder="e.g., Main pitch, School gym, Astro turf..."
                      />
                    </div>

                    {/* Venue Type */}
                    <div>
                      <label className="label">Venue Type</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCreateForm(prev => ({ ...prev, venue_type: 'outdoor' }))}
                          className={`flex-1 p-3 rounded-lg font-medium transition-colors ${
                            createForm.venue_type === 'outdoor'
                              ? 'bg-pitch-600 text-white'
                              : 'bg-navy-800 text-navy-400 hover:text-white'
                          }`}
                        >
                          Outdoor
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreateForm(prev => ({ ...prev, venue_type: 'indoor' }))}
                          className={`flex-1 p-3 rounded-lg font-medium transition-colors ${
                            createForm.venue_type === 'indoor'
                              ? 'bg-energy-600 text-white'
                              : 'bg-navy-800 text-navy-400 hover:text-white'
                          }`}
                        >
                          Indoor
                        </button>
                      </div>
                    </div>

                    {/* Recurring Weekly */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="label mb-0 flex items-center gap-2">
                          <Repeat className="w-4 h-4 text-navy-400" />
                          Recurring Weekly
                        </label>
                        <button
                          type="button"
                          onClick={() => setCreateForm(prev => ({ ...prev, recurring: !prev.recurring, recurring_end_date: '' }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            createForm.recurring ? 'bg-pitch-500' : 'bg-navy-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              createForm.recurring ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      {createForm.recurring && (
                        <div className="mt-3 p-4 rounded-lg bg-navy-800/50 border border-navy-700 space-y-3">
                          <p className="text-sm text-navy-300">
                            A session will be created every <strong className="text-white">{new Date(createForm.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long' })}</strong> from{' '}
                            <strong className="text-white">{new Date(createForm.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</strong> until the end date below.
                            Each session can be edited independently.
                          </p>
                          <div>
                            <label className="label text-sm">End Date</label>
                            <input
                              type="date"
                              value={createForm.recurring_end_date}
                              min={createForm.date}
                              onChange={(e) => setCreateForm(prev => ({ ...prev, recurring_end_date: e.target.value }))}
                              className="input"
                            />
                            {createForm.recurring_end_date && createForm.date && (() => {
                              const start = new Date(createForm.date + 'T12:00:00')
                              const end = new Date(createForm.recurring_end_date + 'T12:00:00')
                              const weeks = Math.floor((end - start) / (7 * 24 * 60 * 60 * 1000)) + 1
                              return weeks > 0 ? (
                                <p className="text-xs text-navy-400 mt-2">
                                  This will create <strong className="text-pitch-400">{weeks} session{weeks !== 1 ? 's' : ''}</strong>
                                </p>
                              ) : null
                            })()}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Training-specific fields */}
                    {createForm.session_type === 'training' && (
                      <>
                        {/* Pupil Count */}
                        <div>
                          <label className="label">Expected Players</label>
                          <input
                            type="number"
                            min="6"
                            max="30"
                            value={createForm.playerCount}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, playerCount: parseInt(e.target.value) || 14 }))}
                            className="input"
                          />
                        </div>

                        {/* Focus Areas */}
                        <div>
                          <label className="label">Focus Areas (select 1-3)</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {focusAreaOptions.map(area => (
                              <button
                                key={area.value}
                                type="button"
                                onClick={() => toggleFocusArea(area.value)}
                                disabled={!createForm.focusAreas.includes(area.value) && createForm.focusAreas.length >= 3}
                                className={`
                                  p-2 rounded-lg text-sm font-medium transition-colors text-left
                                  ${createForm.focusAreas.includes(area.value)
                                    ? 'bg-pitch-600 text-white'
                                    : 'bg-navy-800 text-navy-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                                  }
                                `}
                              >
                                {area.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Training Level */}
                        <div>
                          <label className="label">Training Level</label>
                          <div className="grid grid-cols-3 gap-2">
                            {trainingLevelOptions.map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setCreateForm(prev => ({ ...prev, level: opt.value }))}
                                className={`
                                  p-3 rounded-lg text-sm font-medium transition-colors text-center
                                  ${createForm.level === opt.value
                                    ? 'bg-pitch-600 text-white ring-2 ring-pitch-400'
                                    : 'bg-navy-800 text-navy-400 hover:text-white'
                                  }
                                `}
                              >
                                <div className="font-semibold">{opt.label}</div>
                                <div className={`text-xs mt-1 ${createForm.level === opt.value ? 'text-pitch-200' : 'text-navy-500'}`}>
                                  {opt.description}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Coach's own drills/ideas */}
                    {createForm.session_type === 'training' && (
                      <div>
                        <label className="label">Your Drills / Ideas (optional)</label>
                        <textarea
                          value={createForm.coachDrills}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, coachDrills: e.target.value }))}
                          className="input"
                          rows={3}
                          placeholder="e.g., I want to use a 4v2 rondo for warm-up, and a crossing & finishing drill where wingers deliver into the box..."
                        />
                        <p className="text-xs text-navy-500 mt-1">
                          Describe drills you'd like included — the AI will build on your ideas and fit them into the session structure.
                        </p>
                      </div>
                    )}

                    {/* Notes (for both session types) */}
                    <div>
                      <label className="label">{createForm.session_type === 's&c' ? 'Session Notes' : 'Constraints / Notes'} (optional)</label>
                      <textarea
                        value={createForm.constraints}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, constraints: e.target.value }))}
                        className="input"
                        rows={2}
                        placeholder={createForm.session_type === 's&c'
                          ? "e.g., Focus on core strength, recovery session, agility work..."
                          : "e.g., Limited space, no cones available, indoors this week..."
                        }
                      />
                    </div>
                  </div>
                ) : (
                  /* Generated Plan Display */
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-pitch-500/10 border border-pitch-500/20">
                      <CheckCircle className="w-8 h-8 text-pitch-400 shrink-0" />
                      <div>
                        <p className="font-medium text-white">Session Generated!</p>
                        <p className="text-sm text-navy-400">
                          {formatTime(generatedPlan.duration || createForm.duration)} session focusing on{' '}
                          {createForm.focusAreas.map(a => focusAreaOptions.find(f => f.value === a)?.label).join(', ')}
                        </p>
                      </div>
                    </div>

                    {/* Plan Content */}
                    {generatedPlan.plan ? (
                      <div>
                        {typeof generatedPlan.plan === 'string' ? (
                          <AIMarkdown>{generatedPlan.plan}</AIMarkdown>
                        ) : (
                          <div className="space-y-6">
                            {/* Warm-up */}
                            {generatedPlan.plan.warmUp && (
                              <SessionSection
                                title="Warm-up"
                                duration={generatedPlan.plan.warmUp.duration}
                                content={generatedPlan.plan.warmUp}
                              />
                            )}

                            {/* Technical */}
                            {generatedPlan.plan.technical && (
                              <SessionSection
                                title="Technical Drill"
                                duration={generatedPlan.plan.technical.duration}
                                content={generatedPlan.plan.technical}
                              />
                            )}

                            {/* Tactical */}
                            {generatedPlan.plan.tactical && (
                              <SessionSection
                                title="Tactical Exercise"
                                duration={generatedPlan.plan.tactical.duration}
                                content={generatedPlan.plan.tactical}
                              />
                            )}

                            {/* Game */}
                            {generatedPlan.plan.game && (
                              <SessionSection
                                title="Match-Related Practice"
                                duration={generatedPlan.plan.game.duration}
                                content={generatedPlan.plan.game}
                              />
                            )}

                            {/* Cool-down */}
                            {generatedPlan.plan.coolDown && (
                              <SessionSection
                                title="Cool-down"
                                duration={generatedPlan.plan.coolDown.duration}
                                content={generatedPlan.plan.coolDown}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-navy-400">Session plan generated and saved.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-navy-800 shrink-0">
                {!generatedPlan ? (
                  <div className="space-y-3">
                    {createForm.session_type === 'training' && (
                      <button
                        onClick={handleSaveDirectSession}
                        disabled={generating}
                        className="btn-secondary w-full"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Scheduling...
                          </>
                        ) : (
                          <>
                            <CalendarPlus className="w-4 h-4" />
                            Schedule Session
                            <span className="text-xs text-navy-500 ml-1">(add plan later)</span>
                          </>
                        )}
                      </button>
                    )}
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setShowCreateModal(false)}
                        disabled={generating}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleGenerate}
                        disabled={generating || (createForm.session_type === 'training' && createForm.focusAreas.length === 0)}
                        className="btn-primary"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {createForm.session_type === 's&c' ? 'Saving...' : 'Generating...'}
                          </>
                        ) : createForm.session_type === 's&c' ? (
                          <>
                            <Dumbbell className="w-4 h-4" />
                            Add S&C Session
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Generate Session
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setGeneratedPlan(null)}
                      className="btn-secondary"
                    >
                      Generate Another
                    </button>
                    <button
                      onClick={handleSaveSession}
                      disabled={savingSession}
                      className="btn-primary"
                    >
                      {savingSession ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Done
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Detail Modal */}
      <AnimatePresence>
        {selectedSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={closeSessionDetail}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-navy-800 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="font-display text-xl font-semibold text-white">
                    Training Session
                  </h2>
                  <p className="text-sm text-navy-400">{formatDate(selectedSession.date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteSession(selectedSession.id)}
                    disabled={deletingSession}
                    className="btn-ghost text-alert-400 hover:text-alert-300"
                  >
                    {deletingSession ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={closeSessionDetail}
                    className="p-2 text-navy-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {/* Session Info */}
                <div className="flex flex-wrap gap-4 mb-6">
                  {selectedSession.meet_time && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-navy-800">
                      <Users className="w-4 h-4 text-navy-400" />
                      <span className="text-sm text-white">Meet {selectedSession.meet_time.slice(0, 5)}</span>
                    </div>
                  )}
                  {selectedSession.time && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-navy-800">
                      <Play className="w-4 h-4 text-navy-400" />
                      <span className="text-sm text-white">Start {selectedSession.time.slice(0, 5)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-navy-800">
                    <Clock className="w-4 h-4 text-navy-400" />
                    <span className="text-sm text-white">{formatTime(selectedSession.duration)}</span>
                  </div>
                  {selectedSession.location && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-navy-800">
                      <MapPin className="w-4 h-4 text-navy-400" />
                      <span className="text-sm text-white">{selectedSession.location}</span>
                    </div>
                  )}
                  {selectedSession.focus_areas?.map(area => (
                    <span key={area} className="badge-pitch">
                      {focusAreaOptions.find(f => f.value === area)?.label || area}
                    </span>
                  ))}
                </div>

                {/* Session Plan (AI-generated) */}
                {selectedSession.plan && Object.keys(selectedSession.plan).length > 0 && (
                  <div>
                    <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-pitch-400" />
                      AI Session Plan
                    </h3>
                    {typeof selectedSession.plan === 'string' ? (
                      <AIMarkdown>{selectedSession.plan}</AIMarkdown>
                    ) : (
                      <div className="space-y-6">
                        {selectedSession.plan.warmUp && (
                          <SessionSection
                            title="Warm-up"
                            duration={editingPlanSection === 'warmUp' ? editedSectionData?.duration : selectedSession.plan.warmUp.duration}
                            content={selectedSession.plan.warmUp}
                            editing={editingPlanSection === 'warmUp'}
                            editData={editingPlanSection === 'warmUp' ? editedSectionData : null}
                            onEdit={() => handleStartEditSection('warmUp', selectedSession.plan.warmUp)}
                            onSave={() => handleSavePlanSection(selectedSession)}
                            onCancel={() => { setEditingPlanSection(null); setEditedSectionData(null) }}
                            onChange={setEditedSectionData}
                            saving={savingPlanEdit}
                          />
                        )}
                        {selectedSession.plan.technical && (
                          <SessionSection
                            title="Technical Drill"
                            duration={editingPlanSection === 'technical' ? editedSectionData?.duration : selectedSession.plan.technical.duration}
                            content={selectedSession.plan.technical}
                            editing={editingPlanSection === 'technical'}
                            editData={editingPlanSection === 'technical' ? editedSectionData : null}
                            onEdit={() => handleStartEditSection('technical', selectedSession.plan.technical)}
                            onSave={() => handleSavePlanSection(selectedSession)}
                            onCancel={() => { setEditingPlanSection(null); setEditedSectionData(null) }}
                            onChange={setEditedSectionData}
                            saving={savingPlanEdit}
                          />
                        )}
                        {selectedSession.plan.tactical && (
                          <SessionSection
                            title="Tactical Exercise"
                            duration={editingPlanSection === 'tactical' ? editedSectionData?.duration : selectedSession.plan.tactical.duration}
                            content={selectedSession.plan.tactical}
                            editing={editingPlanSection === 'tactical'}
                            editData={editingPlanSection === 'tactical' ? editedSectionData : null}
                            onEdit={() => handleStartEditSection('tactical', selectedSession.plan.tactical)}
                            onSave={() => handleSavePlanSection(selectedSession)}
                            onCancel={() => { setEditingPlanSection(null); setEditedSectionData(null) }}
                            onChange={setEditedSectionData}
                            saving={savingPlanEdit}
                          />
                        )}
                        {selectedSession.plan.game && (
                          <SessionSection
                            title="Match-Related Practice"
                            duration={editingPlanSection === 'game' ? editedSectionData?.duration : selectedSession.plan.game.duration}
                            content={selectedSession.plan.game}
                            editing={editingPlanSection === 'game'}
                            editData={editingPlanSection === 'game' ? editedSectionData : null}
                            onEdit={() => handleStartEditSection('game', selectedSession.plan.game)}
                            onSave={() => handleSavePlanSection(selectedSession)}
                            onCancel={() => { setEditingPlanSection(null); setEditedSectionData(null) }}
                            onChange={setEditedSectionData}
                            saving={savingPlanEdit}
                          />
                        )}
                        {selectedSession.plan.coolDown && (
                          <SessionSection
                            title="Cool-down"
                            duration={editingPlanSection === 'coolDown' ? editedSectionData?.duration : selectedSession.plan.coolDown.duration}
                            content={selectedSession.plan.coolDown}
                            editing={editingPlanSection === 'coolDown'}
                            editData={editingPlanSection === 'coolDown' ? editedSectionData : null}
                            onEdit={() => handleStartEditSection('coolDown', selectedSession.plan.coolDown)}
                            onSave={() => handleSavePlanSection(selectedSession)}
                            onCancel={() => { setEditingPlanSection(null); setEditedSectionData(null) }}
                            onChange={setEditedSectionData}
                            saving={savingPlanEdit}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Coach's Own Plan */}
                <div className={`${selectedSession.plan && Object.keys(selectedSession.plan).length > 0 ? 'mt-6 pt-6 border-t border-navy-800' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-semibold text-white flex items-center gap-2">
                      <PenLine className="w-4 h-4 text-energy-400" />
                      My Session Plan
                    </h3>
                    {!editingCustomPlan && (
                      <button
                        onClick={() => {
                          setCustomPlanText(selectedSession.custom_plan || '')
                          setEditingCustomPlan(true)
                        }}
                        className="btn-ghost text-sm text-navy-400 hover:text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        {selectedSession.custom_plan ? 'Edit' : 'Write Plan'}
                      </button>
                    )}
                  </div>

                  {editingCustomPlan ? (
                    <div className="space-y-3">
                      <textarea
                        value={customPlanText}
                        onChange={(e) => setCustomPlanText(e.target.value)}
                        className="input w-full text-sm"
                        rows={10}
                        placeholder="Write your session plan here... e.g.&#10;&#10;Warm-up (10 mins):&#10;- Passing in pairs, gradually increase distance&#10;- Dynamic stretches&#10;&#10;Main session (30 mins):&#10;- 4v4 possession game in 20x20 area&#10;- Focus on receiving on the back foot&#10;&#10;Cool-down (5 mins):&#10;- Light jog and stretches"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingCustomPlan(false)}
                          className="btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveCustomPlan(selectedSession)}
                          disabled={savingCustomPlan}
                          className="btn-primary btn-sm"
                        >
                          {savingCustomPlan ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>
                          ) : (
                            <><Save className="w-3 h-3" /> Save Plan</>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : selectedSession.custom_plan ? (
                    <div className="p-4 rounded-lg bg-navy-800/50 border border-navy-700">
                      <p className="text-sm text-navy-300 whitespace-pre-wrap">{selectedSession.custom_plan}</p>
                    </div>
                  ) : (
                    <p className="text-navy-500 text-sm">No custom plan written yet. Click "Write Plan" to add your own session notes and drills.</p>
                  )}
                </div>

                {/* Plan Images */}
                <div className="mt-6 pt-6 border-t border-navy-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-semibold text-white flex items-center gap-2">
                      <ImagePlus className="w-4 h-4 text-pitch-400" />
                      Session Images
                    </h3>
                    <label className={`btn-ghost text-sm text-navy-400 hover:text-white cursor-pointer ${uploadingImages ? 'opacity-50 pointer-events-none' : ''}`}>
                      {uploadingImages ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
                      ) : (
                        <><ImagePlus className="w-3.5 h-3.5" /> Add Images</>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.length > 0) {
                            handleUploadImages(selectedSession, Array.from(e.target.files))
                            e.target.value = ''
                          }
                        }}
                      />
                    </label>
                  </div>

                  {selectedSession.plan_images && selectedSession.plan_images.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {selectedSession.plan_images.map(img => (
                        <div key={img.id} className="relative group rounded-lg overflow-hidden border border-navy-700">
                          <img
                            src={img.url}
                            alt={img.filename || 'Session plan image'}
                            className="w-full h-48 object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={() => handleDeleteImage(selectedSession, img.id)}
                              disabled={deletingImageId === img.id}
                              className="p-2 bg-alert-500/80 rounded-lg text-white hover:bg-alert-500 transition-colors"
                            >
                              {deletingImageId === img.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          {img.filename && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                              <p className="text-xs text-white truncate">{img.filename}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-navy-500 text-sm">No images yet. Upload photos of whiteboard plans, drill diagrams, or session setups.</p>
                  )}
                </div>

                {/* Generate AI Plan - shown when no AI plan exists */}
                {(!selectedSession.plan || Object.keys(selectedSession.plan).length === 0) && selectedSession.session_type !== 's&c' && (
                  <div className="mt-6 pt-6 border-t border-navy-800">
                    <div className="text-center py-4">
                      <p className="text-navy-400 text-sm mb-3">Want an AI-generated session plan?</p>

                      {/* Focus Areas Selector */}
                      <div className="mb-4 max-w-md mx-auto text-left">
                        <label className="label text-sm">Focus Areas (select 1-3)</label>
                        <div className="grid grid-cols-3 gap-2">
                          {focusAreaOptions.map(area => (
                            <button
                              key={area.value}
                              type="button"
                              onClick={() => setSessionPlanFocusAreas(prev =>
                                prev.includes(area.value)
                                  ? prev.filter(a => a !== area.value)
                                  : [...prev, area.value]
                              )}
                              disabled={generatingPlanForSession || (!sessionPlanFocusAreas.includes(area.value) && sessionPlanFocusAreas.length >= 3)}
                              className={`
                                p-2 rounded-lg text-xs font-medium transition-colors text-center
                                ${sessionPlanFocusAreas.includes(area.value)
                                  ? 'bg-pitch-600 text-white ring-2 ring-pitch-400'
                                  : 'bg-navy-800 text-navy-400 hover:text-white'
                                }
                                disabled:opacity-50
                              `}
                            >
                              {area.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Training Level Selector */}
                      <div className="mb-4 max-w-md mx-auto">
                        <label className="label text-sm text-center">Training Level</label>
                        <div className="grid grid-cols-3 gap-2">
                          {trainingLevelOptions.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setSessionPlanLevel(opt.value)}
                              disabled={generatingPlanForSession}
                              className={`
                                p-2 rounded-lg text-xs font-medium transition-colors text-center
                                ${sessionPlanLevel === opt.value
                                  ? 'bg-pitch-600 text-white ring-2 ring-pitch-400'
                                  : 'bg-navy-800 text-navy-400 hover:text-white'
                                }
                                disabled:opacity-50
                              `}
                            >
                              <div className="font-semibold">{opt.label}</div>
                              <div className={`text-[10px] mt-0.5 ${sessionPlanLevel === opt.value ? 'text-pitch-200' : 'text-navy-500'}`}>
                                {opt.description}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => handleGeneratePlanForSession(selectedSession)}
                        disabled={generatingPlanForSession || (sessionPlanFocusAreas.length === 0 && (!selectedSession.focus_areas || selectedSession.focus_areas.length === 0))}
                        className="btn-primary"
                      >
                        {generatingPlanForSession ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating Plan...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Generate AI Plan
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Share Plan with Players Toggle */}
                {(selectedSession.plan || selectedSession.custom_plan) && (
                  <div className="mt-6 pt-6 border-t border-navy-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {selectedSession.share_plan_with_players ? (
                          <Eye className="w-5 h-5 text-pitch-400" />
                        ) : (
                          <EyeOff className="w-5 h-5 text-navy-500" />
                        )}
                        <div>
                          <h3 className="font-display font-semibold text-white">
                            Share Plan with Players
                          </h3>
                          <p className="text-sm text-navy-400">
                            {selectedSession.share_plan_with_players
                              ? 'Players can see this training plan in their Pupil Zone'
                              : 'Training plan is hidden from pupils'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleSharePlan(selectedSession)}
                        disabled={togglingShare}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          selectedSession.share_plan_with_players
                            ? 'bg-pitch-500'
                            : 'bg-navy-700'
                        }`}
                      >
                        {togglingShare ? (
                          <Loader2 className="w-4 h-4 animate-spin absolute left-1/2 -translate-x-1/2 text-white" />
                        ) : (
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              selectedSession.share_plan_with_players ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Parent Summary Section */}
                <div className="mt-6 pt-6 border-t border-navy-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-semibold text-white flex items-center gap-2">
                      <Send className="w-4 h-4 text-pitch-400" />
                      Parent Summary
                    </h3>
                    {new Date(selectedSession.date) < new Date() && !selectedSession.summary && (
                      <button
                        onClick={() => handleGenerateSummary(selectedSession)}
                        disabled={generatingSummary}
                        className="btn-primary btn-sm"
                      >
                        {generatingSummary ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Generate Summary
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {selectedSession.summary ? (
                    <div className="p-4 rounded-lg bg-pitch-500/10 border border-pitch-500/20">
                      <AIMarkdown>{selectedSession.summary}</AIMarkdown>
                      <p className="text-xs text-navy-500 mt-3 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-pitch-400" />
                        This summary is visible to parents in the Pupil Zone
                      </p>
                    </div>
                  ) : (
                    <p className="text-navy-400 text-sm">
                      {new Date(selectedSession.date) < new Date()
                        ? 'Generate a parent-friendly summary of this session to share with families.'
                        : 'You can generate a summary after the session is complete.'}
                    </p>
                  )}
                </div>

                {/* Notes */}
                {selectedSession.notes && (
                  <div className="mt-6 pt-6 border-t border-navy-800">
                    <h3 className="font-display font-semibold text-white mb-2">Notes</h3>
                    <p className="text-navy-300 whitespace-pre-wrap">{selectedSession.notes}</p>
                  </div>
                )}

                {/* Availability */}
                <div className="mt-6 pt-6 border-t border-navy-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-semibold text-white flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-pitch-400" />
                      Availability
                    </h3>
                    {!showAvailability ? (
                      <button
                        onClick={() => {
                          setShowAvailability(true)
                          loadAvailability(selectedSession.id)
                        }}
                        className="btn-secondary btn-sm"
                      >
                        View Availability
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        {isManager && (
                          <>
                            {(() => {
                              const pending = availability.filter(a => a.status === 'pending').length
                              return pending > 0 ? (
                                <button
                                  onClick={() => handleRequestAvailability(selectedSession.id, true)}
                                  className="btn-primary btn-sm"
                                >
                                  <Bell className="w-3 h-3" />
                                  Remind Pending ({pending})
                                </button>
                              ) : null
                            })()}
                            <button
                              onClick={() => handleRequestAvailability(selectedSession.id)}
                              className="btn-secondary btn-sm"
                            >
                              <Bell className="w-3 h-3" />
                              Request All
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {showAvailability && (
                    loadingAvailability ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-navy-400" />
                      </div>
                    ) : (
                      <div>
                        {/* Summary */}
                        {(() => {
                          const summary = getAvailabilitySummary()
                          return (
                            <div className="grid grid-cols-4 gap-2 mb-3">
                              <div className="text-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                                <p className="text-lg font-bold text-green-400">{summary.available}</p>
                                <p className="text-xs text-green-400/70">Yes</p>
                              </div>
                              <div className="text-center p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                <p className="text-lg font-bold text-yellow-400">{summary.maybe}</p>
                                <p className="text-xs text-yellow-400/70">Maybe</p>
                              </div>
                              <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                <p className="text-lg font-bold text-red-400">{summary.unavailable}</p>
                                <p className="text-xs text-red-400/70">No</p>
                              </div>
                              <div className="text-center p-2 rounded-lg bg-navy-700/50 border border-navy-600">
                                <p className="text-lg font-bold text-navy-400">{summary.pending}</p>
                                <p className="text-xs text-navy-500">Waiting</p>
                              </div>
                            </div>
                          )
                        })()}

                        {/* Pupil list */}
                        <div className="space-y-1">
                          {availability.map(pupil => (
                            <div
                              key={pupil.pupil_id}
                              className="flex items-center justify-between px-3 py-2 rounded-lg bg-navy-800/50 border border-navy-700"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-navy-700 flex items-center justify-center text-xs font-medium text-white">
                                  {pupil.squad_number || pupil.player_name?.charAt(0)}
                                </div>
                                <span className="text-sm text-white">{pupil.player_name}</span>
                              </div>

                              {isManager ? (
                                <div className="flex gap-1">
                                  {['available', 'maybe', 'unavailable'].map(status => {
                                    const Icon = status === 'available' ? Check : status === 'maybe' ? HelpCircle : X
                                    const colors = status === 'available'
                                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                      : status === 'maybe'
                                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                                    return (
                                      <button
                                        key={status}
                                        onClick={() => handleAvailabilityUpdate(selectedSession.id, pupil.pupil_id, status)}
                                        className={`p-1.5 rounded transition ${
                                          pupil.status === status ? colors : 'text-navy-500 hover:text-navy-300'
                                        }`}
                                      >
                                        <Icon className="w-4 h-4" />
                                      </button>
                                    )
                                  })}
                                </div>
                              ) : (
                                <span className={`px-2 py-1 rounded text-xs border ${
                                  pupil.status === 'available' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                  pupil.status === 'maybe' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                  pupil.status === 'unavailable' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                  'bg-navy-700 text-navy-400 border-navy-600'
                                }`}>
                                  {pupil.status}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Attendance */}
                <div className="mt-6 pt-6 border-t border-navy-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-semibold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-pitch-400" />
                      Attendance
                    </h3>
                    {!showAttendance ? (
                      <button
                        onClick={() => {
                          setShowAttendance(true)
                          loadAttendance(selectedSession.id)
                        }}
                        className="btn-secondary btn-sm"
                      >
                        Record Attendance
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={markAllPresent} className="btn-ghost text-xs text-navy-400">
                          All Present
                        </button>
                        <button
                          onClick={() => handleSaveAttendance(selectedSession.id)}
                          disabled={savingAttendance}
                          className="btn-primary btn-sm"
                        >
                          {savingAttendance ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>
                          ) : (
                            <><Save className="w-3 h-3" /> Save</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {showAttendance && (
                    loadingAttendance ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-navy-400" />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-xs text-navy-500 mb-2">
                          {attendance.filter(p => p.attended).length} / {attendance.length} present
                        </div>
                        {attendance.map(pupil => (
                          <div key={pupil.pupil_id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition text-sm ${
                            pupil.attended
                              ? 'bg-pitch-500/10 border-pitch-500/30 text-white'
                              : 'bg-navy-800/50 border-navy-700 text-navy-400'
                          }`}>
                            <button
                              onClick={() => togglePlayerAttendance(pupil.pupil_id)}
                              className="flex items-center justify-between flex-1 min-w-0"
                            >
                              <span className="truncate">{pupil.player_name}</span>
                              {pupil.attended ? (
                                <CheckCircle className="w-4 h-4 text-pitch-400 shrink-0" />
                              ) : (
                                <X className="w-4 h-4 text-navy-600 shrink-0" />
                              )}
                            </button>
                            {pupil.attended && (
                              <div className="flex gap-0.5 shrink-0" title="Effort rating">
                                {[1,2,3,4,5].map(star => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setPlayerEffort(pupil.pupil_id, star)}
                                    className={`w-5 h-5 text-xs rounded transition ${
                                      pupil.effort_rating >= star
                                        ? 'bg-energy-500/20 text-energy-400'
                                        : 'bg-navy-800 text-navy-600 hover:text-navy-400'
                                    }`}
                                  >
                                    {pupil.effort_rating >= star ? '\u2605' : '\u2606'}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Session Section Component for structured plans
function SessionSection({ title, duration, content, editing, editData, onEdit, onSave, onCancel, onChange, saving }) {
  if (editing && editData) {
    return (
      <div className="p-4 rounded-lg bg-navy-800/50 border border-pitch-500/30">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display font-semibold text-white">{title}</h4>
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="text-xs text-navy-400 hover:text-white transition-colors px-2 py-1">Cancel</button>
            <button onClick={onSave} disabled={saving} className="flex items-center gap-1 text-xs bg-pitch-500 text-white px-3 py-1 rounded-lg hover:bg-pitch-600 transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save
            </button>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-navy-500 uppercase mb-1 block">Drill Name</label>
            <input value={editData.name || ''} onChange={e => onChange({ ...editData, name: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm focus:border-pitch-500 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-navy-500 uppercase mb-1 block">Duration (mins)</label>
              <input value={editData.duration || ''} onChange={e => onChange({ ...editData, duration: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm focus:border-pitch-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-navy-500 uppercase mb-1 block">Description</label>
            <textarea value={editData.description || ''} onChange={e => onChange({ ...editData, description: e.target.value })} rows={3} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm focus:border-pitch-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-navy-500 uppercase mb-1 block">Setup</label>
            <textarea value={editData.setup || ''} onChange={e => onChange({ ...editData, setup: e.target.value })} rows={2} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm focus:border-pitch-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-navy-500 uppercase mb-1 block">Coaching Points (one per line)</label>
            <textarea
              value={(editData.coachingPoints || []).join('\n')}
              onChange={e => onChange({ ...editData, coachingPoints: e.target.value.split('\n') })}
              rows={4}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm focus:border-pitch-500 focus:outline-none"
            />
          </div>
          {editData.progression !== undefined && (
            <div>
              <label className="text-xs text-navy-500 uppercase mb-1 block">Progression</label>
              <textarea value={editData.progression || ''} onChange={e => onChange({ ...editData, progression: e.target.value })} rows={2} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm focus:border-pitch-500 focus:outline-none" />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-lg bg-navy-800/50 border border-navy-700 group">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-display font-semibold text-white">{title}</h4>
        <div className="flex items-center gap-2">
          {duration && (
            <span className="text-xs text-navy-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {duration} mins
            </span>
          )}
          {onEdit && (
            <button onClick={onEdit} className="opacity-0 group-hover:opacity-100 transition-opacity text-navy-400 hover:text-pitch-400 p-1" title="Edit drill">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {content.name && (
        <p className="font-medium text-pitch-400 mb-2">{content.name}</p>
      )}

      {content.description && (
        <p className="text-sm text-navy-300 mb-3">{content.description}</p>
      )}

      {/* Drill Diagram */}
      {content.diagram && (content.diagram.pupils?.length > 0 || content.diagram.cones?.length > 0) && (
        <div className="mb-3">
          <p className="text-xs text-navy-500 uppercase mb-2">Drill Setup</p>
          <DrillDiagram diagram={content.diagram} />
        </div>
      )}

      {content.setup && (
        <div className="mb-3">
          <p className="text-xs text-navy-500 uppercase mb-1">Setup</p>
          <p className="text-sm text-navy-300">{content.setup}</p>
        </div>
      )}

      {content.coachingPoints && content.coachingPoints.length > 0 && (
        <div>
          <p className="text-xs text-navy-500 uppercase mb-1">Coaching Points</p>
          <ul className="space-y-1">
            {content.coachingPoints.map((point, i) => (
              <li key={i} className="text-sm text-navy-300 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-pitch-500 mt-1.5 shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {content.progression && (
        <div className="mt-3 pt-3 border-t border-navy-700">
          <p className="text-xs text-navy-500 uppercase mb-1">Progression</p>
          <p className="text-sm text-navy-300">{content.progression}</p>
        </div>
      )}
    </div>
  )
}
