import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import api, { playerZoneService, playerChatService, announcementService, matchMediaService, teamService, leagueService, notificationService, suggestionService, streamingService, libraryService, SERVER_URL } from '../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Video, Target, Bell, LogOut, ChevronRight, Play, Star,
  Calendar, MapPin, Clock, Trophy, TrendingUp, MessageSquare, Send,
  Loader2, CheckCircle, XCircle, HelpCircle, User, Shield, FileText,
  Home, Users, Zap, Brain, Heart, AlertCircle, Dumbbell, Megaphone,
  Camera, Upload, Image, X, Pin, Flame, Award, CalendarDays, ChevronLeft,
  Download, Table2, Minus, Settings, ToggleLeft, ToggleRight, Lightbulb, Eye, EyeOff,
  Radio, WifiOff, Share2, Copy, Check, Scissors, UserCheck, MonitorPlay
} from 'lucide-react'
import '@mux/mux-player'
import HelpChatWidget from '../components/HelpChatWidget'
import PlayerClips from '../components/PupilClips'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, parseISO } from 'date-fns'
import { exportMatchToCalendar, exportFullScheduleToCalendar } from '../utils/calendarExport'
import toast from 'react-hot-toast'
import AIMarkdown from '../components/AIMarkdown'
import DrillDiagram from '../components/DrillDiagram'

// Motivational quotes for pupils - sport & self-improvement focused
const motivationalQuotes = [
  { quote: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { quote: "The more you sweat in training, the less you bleed in combat.", author: "Richard Marcinko" },
  { quote: "Success is no accident. It is hard work, perseverance, learning, and sacrifice.", author: "Pelé" },
  { quote: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { quote: "The only way to prove you're a good sport is to lose.", author: "Ernie Banks" },
  { quote: "Champions keep playing until they get it right.", author: "Billie Jean King" },
  { quote: "It's not whether you get knocked down, it's whether you get up.", author: "Vince Lombardi" },
  { quote: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
  { quote: "Believe in yourself and all that you are. Know that there is something inside you greater than any obstacle.", author: "Christian D. Larson" },
  { quote: "Every champion was once a contender that refused to give up.", author: "Rocky Balboa" },
  { quote: "Your attitude determines your direction.", author: "Unknown" },
  { quote: "Football is a simple game. Twenty-two men chase a ball for 90 minutes and in the end, the Germans always win.", author: "Gary Lineker" },
  { quote: "Some people think football is a matter of life and death. I assure you, it's much more important than that.", author: "Bill Shankly" },
  { quote: "The best revenge is massive success.", author: "Frank Sinatra" },
  { quote: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { quote: "The harder the battle, the sweeter the victory.", author: "Les Brown" },
  { quote: "I am not what happened to me. I am what I choose to become.", author: "Carl Jung" },
  { quote: "A winner is someone who recognizes their talents, works hard to develop them, and uses them to accomplish their goals.", author: "Larry Bird" },
  { quote: "You have to expect things of yourself before you can do them.", author: "Michael Jordan" },
  { quote: "Ability is what you're capable of doing. Motivation determines what you do. Attitude determines how well you do it.", author: "Lou Holtz" },
  { quote: "The only place where success comes before work is in the dictionary.", author: "Vidal Sassoon" },
  { quote: "Dreams don't work unless you do.", author: "John C. Maxwell" },
  { quote: "It's not about being the best. It's about being better than you were yesterday.", author: "Unknown" },
  { quote: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
  { quote: "The pain you feel today will be the strength you feel tomorrow.", author: "Unknown" },
  { quote: "Work hard in silence. Let success make the noise.", author: "Unknown" },
  { quote: "Be so good they can't ignore you.", author: "Steve Martin" },
  { quote: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { quote: "Excellence is not a singular act, but a habit. You are what you repeatedly do.", author: "Shaquille O'Neal" },
  { quote: "Set your goals high, and don't stop till you get there.", author: "Bo Jackson" },
]

// Get a consistent quote for today
function getDailyQuote() {
  const today = new Date()
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000)
  const index = dayOfYear % motivationalQuotes.length
  return motivationalQuotes[index]
}

const baseTabs = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'film-room', label: 'Film Room', icon: MonitorPlay },
  { id: 'league', label: 'League Table', icon: Table2 },
  { id: 'development', label: 'My Progress', icon: TrendingUp },
]

const observationTypeConfig = {
  technical: { label: 'Technical', icon: Target, color: 'pitch' },
  tactical: { label: 'Tactical', icon: Brain, color: 'blue' },
  physical: { label: 'Physical', icon: Zap, color: 'energy' },
  mental: { label: 'Mental', icon: Heart, color: 'alert' },
  's&c': { label: 'S&C', icon: Dumbbell, color: 'caution' },
}

// Helper to get primary position from positions array (supports both old and new format)
function getPrimaryPosition(positions) {
  if (!positions || !Array.isArray(positions) || positions.length === 0) return null
  // New format: array of objects with position and priority
  if (typeof positions[0] === 'object' && positions[0].position) {
    const primary = positions.find(p => p.priority === 'primary')
    return primary ? primary.position : positions[0].position
  }
  // Old format: array of strings (first one is primary)
  return positions[0]
}

export default function PupilLounge() {
  const { user, logout, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState('home')
  const [loading, setLoading] = useState(true)
  const [zoneData, setZoneData] = useState(null)
  const [error, setError] = useState(null)

  // Chat state
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [loadingChat, setLoadingChat] = useState(false)
  const chatEndRef = useRef(null)

  // Availability state
  const [updatingAvailability, setUpdatingAvailability] = useState(null)
  const [updatingTrainingAvailability, setUpdatingTrainingAvailability] = useState(null)

  // Announcements state
  const [announcements, setAnnouncements] = useState([])

  // Media upload state
  const [showMediaUpload, setShowMediaUpload] = useState(null) // match id
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [matchMedia, setMatchMedia] = useState({}) // { matchId: [media] }
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const fileInputRef = useRef(null)

  // Pep talk state
  const [pepTalk, setPepTalk] = useState(null)
  const [loadingPepTalk, setLoadingPepTalk] = useState(false)
  const [showPepTalk, setShowPepTalk] = useState(false)

  // Chat modal state
  const [showChatModal, setShowChatModal] = useState(false)

  // Gaffer disabled status (parent control)
  const [gafferDisabled, setGafferDisabled] = useState(false)

  // Notifications state
  const [showNotifications, setShowNotifications] = useState(false)
  const [squadNotifications, setSquadNotifications] = useState([])
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)

  // Settings modal state (for parents)
  const [showSettings, setShowSettings] = useState(false)
  const [togglingGaffer, setTogglingGaffer] = useState(false)

  // Suggestions state
  const [showSuggestionModal, setShowSuggestionModal] = useState(false)
  const [mySuggestions, setMySuggestions] = useState([])
  const [suggestionForm, setSuggestionForm] = useState({ category: 'general', title: '', content: '', is_anonymous: false })
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  // Match detail modal state
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [selectedMatchMedia, setSelectedMatchMedia] = useState([])
  const [loadingMatchMedia, setLoadingMatchMedia] = useState(false)
  const [matchSquad, setMatchSquad] = useState([])
  const [loadingMatchSquad, setLoadingMatchSquad] = useState(false)

  // Parent POTM voting state
  const [parentVoteData, setParentVoteData] = useState(null)
  const [votingPlayerId, setVotingPlayerId] = useState(null)
  const [submittingVote, setSubmittingVote] = useState(false)
  const [teamSquad, setTeamSquad] = useState([])

  // Next match POTM voting state (separate from modal)
  const [nextMatchVoteData, setNextMatchVoteData] = useState(null)
  const [nextMatchVotingPlayerId, setNextMatchVotingPlayerId] = useState(null)
  const [nextMatchSubmittingVote, setNextMatchSubmittingVote] = useState(false)
  const [nextMatchSquad, setNextMatchSquad] = useState([])

  // Training session modal state
  const [selectedSession, setSelectedSession] = useState(null)

  // Badge detail modal state
  const [showBadgesModal, setShowBadgesModal] = useState(false)

  // Daily quote
  const dailyQuote = getDailyQuote()

  // Current time state
  const [currentTime, setCurrentTime] = useState(new Date())

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [showCalendar, setShowCalendar] = useState(false)

  // League table state
  const [leagueSettings, setLeagueSettings] = useState(null)
  const [leagueTable, setLeagueTable] = useState([])
  const [loadingLeague, setLoadingLeague] = useState(false)

  // Live streaming state
  const [streamCredentials, setStreamCredentials] = useState(null)
  const [loadingStream, setLoadingStream] = useState(false)
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [copiedShareLink, setCopiedShareLink] = useState(false)

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Silently refresh data when app resumes (visibility change)
  const lastRefreshRef = useRef(Date.now())
  const refreshAllData = useCallback(() => {
    if (!user?.pupil_id) return
    lastRefreshRef.current = Date.now()
    loadZoneData()
    loadAnnouncements()
    loadLeagueData()
    loadNotifications()
  }, [user?.pupil_id, user?.team_id])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only refresh if at least 60s since last refresh
        if (Date.now() - lastRefreshRef.current > 60_000) {
          refreshAllData()
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [refreshAllData])

  // Pull-to-refresh for PWA standalone mode
  const [pullRefreshing, setPullRefreshing] = useState(false)
  const pullStartY = useRef(null)
  const pullIndicatorRef = useRef(null)

  useEffect(() => {
    // Only enable in standalone PWA mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    if (!isStandalone) return

    const onTouchStart = (e) => {
      // Only trigger when scrolled to top
      if (window.scrollY === 0) {
        pullStartY.current = e.touches[0].clientY
      }
    }

    const onTouchMove = (e) => {
      if (pullStartY.current === null) return
      const dy = e.touches[0].clientY - pullStartY.current
      if (dy > 0 && dy < 150 && window.scrollY === 0) {
        if (pullIndicatorRef.current) {
          const progress = Math.min(dy / 80, 1)
          pullIndicatorRef.current.style.transform = `translateY(${Math.min(dy * 0.5, 60)}px)`
          pullIndicatorRef.current.style.opacity = progress
        }
      }
    }

    const onTouchEnd = () => {
      if (pullStartY.current === null) return
      // Check final position via indicator
      if (pullIndicatorRef.current) {
        const currentTransform = pullIndicatorRef.current.style.transform
        const match = currentTransform.match(/translateY\((\d+\.?\d*)px\)/)
        const dy = match ? parseFloat(match[1]) : 0
        if (dy >= 40) {
          setPullRefreshing(true)
          refreshAllData()
          setTimeout(() => setPullRefreshing(false), 1500)
        }
        pullIndicatorRef.current.style.transform = 'translateY(0px)'
        pullIndicatorRef.current.style.opacity = '0'
      }
      pullStartY.current = null
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [refreshAllData])

  useEffect(() => {
    // Wait for auth to finish loading before checking pupil_id
    if (authLoading) {
      console.log('PupilLounge: Auth still loading...')
      return
    }

    console.log('PupilLounge: Auth loaded. User object:', JSON.stringify(user, null, 2))
    console.log('PupilLounge: pupil_id =', user?.pupil_id)
    console.log('PupilLounge: role =', user?.role)
    console.log('PupilLounge: team_id =', user?.team_id)

    if (user?.pupil_id) {
      console.log('PupilLounge: Found pupil_id, loading zone data...')
      loadZoneData()
      loadAnnouncements()
      loadLeagueData()
      loadGafferStatus()
      loadNotifications()
    } else if (user) {
      // User is loaded but has no pupil_id
      console.error('PupilLounge: User has no pupil_id. Full user:', user)
      setError({
        type: 'no_player_link',
        message: 'Your account is not linked to a pupil profile.',
        details: `Your account (${user.email}) has role "${user.role}" but no pupil profile is linked.`,
        suggestion: user.role === 'parent'
          ? 'Please ask your coach to send you a new parent invite link for your child.'
          : 'Please contact your team manager to set up your pupil profile.'
      })
      setLoading(false)
    } else {
      // No user at all (shouldn't happen if routes are protected)
      console.error('PupilLounge: No user found after auth loaded')
      setError({
        type: 'no_user',
        message: 'Please log in to access this page',
        details: 'No authenticated user found.',
        suggestion: 'Try logging out and logging back in.'
      })
      setLoading(false)
    }
  }, [authLoading, user])

  async function loadAnnouncements() {
    if (!user?.team_id) return
    try {
      const response = await announcementService.getAnnouncements(user.team_id, 5)
      setAnnouncements(response.data || [])
    } catch (err) {
      console.error('Failed to load announcements:', err)
    }
  }

  async function loadMySuggestions() {
    if (!user?.team_id) return
    setLoadingSuggestions(true)
    try {
      const response = await suggestionService.getMySuggestions(user.team_id)
      setMySuggestions(response.data || [])
    } catch (err) {
      console.error('Failed to load suggestions:', err)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  async function handleSubmitSuggestion(e) {
    e.preventDefault()
    if (!suggestionForm.title.trim() || !suggestionForm.content.trim()) {
      toast.error('Please fill in all fields')
      return
    }
    setSubmittingSuggestion(true)
    try {
      await suggestionService.createSuggestion(user.team_id, suggestionForm)
      toast.success('Suggestion submitted! Your coaches will review it.')
      setSuggestionForm({ category: 'general', title: '', content: '', is_anonymous: false })
      setShowSuggestionModal(false)
      loadMySuggestions()
    } catch (err) {
      toast.error('Failed to submit suggestion')
      console.error(err)
    } finally {
      setSubmittingSuggestion(false)
    }
  }

  async function loadNotifications() {
    try {
      const [notificationsRes, countRes] = await Promise.all([
        notificationService.getNotifications(20, false),
        notificationService.getUnreadCount()
      ])
      // Filter for relevant pupil notifications (announcements, achievements, potm)
      const relevantTypes = ['squad_announcement', 'achievement', 'potm', 'announcement']
      let squadNotifs = (notificationsRes.data || []).filter(n => relevantTypes.includes(n.type))
      // Deduplicate squad announcements: keep only the latest per match
      const seenMatches = new Set()
      squadNotifs = squadNotifs.filter(n => {
        if (n.type !== 'squad_announcement') return true
        const matchId = n.data?.match_id
        if (!matchId || seenMatches.has(matchId)) return false
        seenMatches.add(matchId)
        return true
      })
      setSquadNotifications(squadNotifs)
      setUnreadNotificationCount(countRes.data?.count || 0)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    }
  }

  async function markNotificationAsRead(notificationId) {
    try {
      await notificationService.markAsRead(notificationId)
      setSquadNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      setUnreadNotificationCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  async function loadLeagueData() {
    if (!user?.team_id) return
    setLoadingLeague(true)
    try {
      const [settingsRes, tableRes] = await Promise.all([
        leagueService.getSettings(user.team_id),
        leagueService.getTable(user.team_id)
      ])
      setLeagueSettings(settingsRes.data)
      setLeagueTable(tableRes.data || [])
    } catch (err) {
      console.error('Failed to load league data:', err)
    } finally {
      setLoadingLeague(false)
    }
  }

  async function loadStreamCredentials() {
    if (!user?.team_id) return
    setLoadingStream(true)
    try {
      const response = await streamingService.getCredentials(user.team_id)
      if (response.data.hasCredentials) {
        setStreamCredentials(response.data.credentials)
      } else {
        setStreamCredentials(null)
      }
    } catch (err) {
      console.error('Failed to load stream credentials:', err)
      setStreamCredentials(null)
    } finally {
      setLoadingStream(false)
    }
  }

  // Load stream credentials on mount (to determine if Live Stream tab should show)
  // and when switching to live tab
  useEffect(() => {
    if (user?.team_id) {
      loadStreamCredentials()
    }
  }, [user?.team_id])

  useEffect(() => {
    if (activeTab === 'live' && user?.team_id) {
      loadStreamCredentials()
    }
  }, [activeTab])

  // Dynamic tabs: show Live Stream (replacing Film Room) when a stream is active,
  // otherwise show Film Room. Keeps bottom nav at 5 tabs max.
  // Dynamic tabs: show Live Stream (replacing Film Room) when a stream is active,
  // otherwise show Film Room. Keeps bottom nav at 5 tabs max.
  const isStreamLive = streamCredentials?.status === 'active'
  const tabs = useMemo(() => {
    if (isStreamLive) {
      return baseTabs.map(t => t.id === 'film-room'
        ? { id: 'live', label: 'Live', icon: Radio }
        : t
      )
    }
    return baseTabs
  }, [isStreamLive])

  // If stream ends while on live tab, switch to film-room
  useEffect(() => {
    if (activeTab === 'live' && !isStreamLive) {
      setActiveTab('film-room')
    }
  }, [isStreamLive, activeTab])

  // Auto-poll for stream status when on live tab and stream is not active
  useEffect(() => {
    if (activeTab !== 'live' || !streamCredentials || streamCredentials.status === 'active') {
      return
    }

    // Poll every 10 seconds when stream is idle
    const pollInterval = setInterval(() => {
      loadStreamCredentials()
    }, 10000)

    return () => clearInterval(pollInterval)
  }, [activeTab, streamCredentials?.status])

  function getStreamShareUrl() {
    if (!streamCredentials?.shareCode) return ''
    return `${window.location.origin}/watch/${streamCredentials.shareCode}`
  }

  function handleCopyShareLink() {
    const url = getStreamShareUrl()
    if (!url) return
    navigator.clipboard.writeText(url)
    setCopiedShareLink(true)
    toast.success('Share link copied!')
    setTimeout(() => setCopiedShareLink(false), 2000)
  }

  function handleShare() {
    const url = getStreamShareUrl()
    if (!url) return

    const pin = streamCredentials?.guestPin
    const shareText = pin
      ? `Watch our team live!\n\nLink: ${url}\nPIN: ${pin}`
      : `Watch our team live!\n\n${url}`

    if (navigator.share) {
      navigator.share({
        title: streamCredentials?.streamName || 'Live Stream',
        text: shareText,
      }).catch(() => {
        // User cancelled or share failed, show the share modal instead
        setShowShareOptions(true)
      })
    } else {
      setShowShareOptions(true)
    }
  }

  async function loadGafferStatus() {
    if (!user?.pupil_id) return
    try {
      const response = await playerChatService.getGafferStatus(user.pupil_id)
      setGafferDisabled(response.data.disabled || false)
    } catch (err) {
      console.error('Failed to load Gaffer status:', err)
    }
  }

  async function toggleGafferStatus() {
    if (!user?.pupil_id || user?.role !== 'parent') return
    setTogglingGaffer(true)
    try {
      const newStatus = !gafferDisabled
      await playerChatService.setGafferStatus(user.pupil_id, newStatus)
      setGafferDisabled(newStatus)
      toast.success(newStatus ? 'The Gaffer has been disabled' : 'The Gaffer has been enabled')
    } catch (err) {
      console.error('Failed to toggle Gaffer status:', err)
      toast.error('Failed to update setting')
    } finally {
      setTogglingGaffer(false)
    }
  }

  async function handleParentPotmVote(matchId, pupilId) {
    setSubmittingVote(true)
    try {
      const res = await api.post(`/matches/${matchId}/parent-potm-vote`, { pupil_id: pupilId })
      toast.success(`Vote cast for ${res.data.player_name}`)
      // Refresh vote data
      const voteRes = await api.get(`/matches/${matchId}/parent-potm-votes`)
      setParentVoteData(voteRes.data)
      setVotingPlayerId(voteRes.data.my_vote || null)
      // Sync next match card if same match
      const nextMatch = zoneData?.upcomingMatches?.[0]
      if (nextMatch && String(nextMatch.id) === String(matchId)) {
        setNextMatchVoteData(voteRes.data)
        setNextMatchVotingPlayerId(voteRes.data.my_vote || null)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cast vote')
    } finally {
      setSubmittingVote(false)
    }
  }

  async function handleNextMatchPotmVote(matchId, pupilId) {
    setNextMatchSubmittingVote(true)
    try {
      const res = await api.post(`/matches/${matchId}/parent-potm-vote`, { pupil_id: pupilId })
      toast.success(`Vote cast for ${res.data.player_name}`)
      const voteRes = await api.get(`/matches/${matchId}/parent-potm-votes`)
      setNextMatchVoteData(voteRes.data)
      setNextMatchVotingPlayerId(voteRes.data.my_vote || null)
      // Sync modal state if same match is open
      if (selectedMatch && String(selectedMatch.id) === String(matchId)) {
        setParentVoteData(voteRes.data)
        setVotingPlayerId(voteRes.data.my_vote || null)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cast vote')
    } finally {
      setNextMatchSubmittingVote(false)
    }
  }

  async function handleShareMedia(matchMedia, matchOpponent) {
    const urls = matchMedia.map(m => {
      const u = m.file_path || m.file_url || m.url
      return u?.startsWith('http') ? u : `${SERVER_URL}${u}`
    })
    const shareText = `Match photos${matchOpponent ? ` - v ${matchOpponent}` : ''}`
    if (navigator.share) {
      try {
        await navigator.share({ title: shareText, text: `${shareText}\n${urls.join('\n')}` })
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(urls.join('\n'))
      toast.success('Photo links copied to clipboard!')
    }
  }

  async function handleMediaUpload(matchId, files) {
    if (!files || files.length === 0) return

    setUploadingMedia(true)
    try {
      const formData = new FormData()
      for (const file of files) {
        formData.append('media', file)
      }
      formData.append('pupil_id', user.pupil_id)

      await matchMediaService.uploadMedia(matchId, formData)
      toast.success(`${files.length} file(s) uploaded!`)
      setShowMediaUpload(null)

      // Refresh media for this match
      const response = await matchMediaService.getMedia(matchId)
      setMatchMedia(prev => ({ ...prev, [matchId]: response.data }))
      setSelectedMatchMedia(response.data || [])
    } catch (err) {
      toast.error('Failed to upload media')
      console.error(err)
    } finally {
      setUploadingMedia(false)
    }
  }

  async function handleDeleteMedia(matchId, mediaId) {
    if (!confirm('Delete this photo?')) return
    try {
      await matchMediaService.deleteMedia(matchId, mediaId)
      setSelectedMatchMedia(prev => prev.filter(m => m.id !== mediaId))
      toast.success('Photo deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete')
    }
  }

  async function handleGetPepTalk(matchId) {
    setLoadingPepTalk(true)
    try {
      const response = await teamService.getPepTalk(matchId, user.pupil_id)
      setPepTalk(response.data.pepTalk)
      setShowPepTalk(true)
    } catch (err) {
      toast.error('Failed to generate pep talk')
      console.error(err)
    } finally {
      setLoadingPepTalk(false)
    }
  }

  // Chat history is loaded when the chat modal is opened via the "Ask the Gaffer" button

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Fetch media (and parent POTM votes for past matches) when a match is selected
  useEffect(() => {
    async function fetchMatchData() {
      if (!selectedMatch?.id) {
        setSelectedMatchMedia([])
        setParentVoteData(null)
        setMatchSquad([])
        return
      }
      // Fetch match squad if announced
      if (selectedMatch.squad_announced) {
        setLoadingMatchSquad(true)
        try {
          const squadRes = await teamService.getMatchSquad(selectedMatch.id)
          setMatchSquad(squadRes.data || [])
        } catch {
          setMatchSquad([])
        } finally {
          setLoadingMatchSquad(false)
        }
      } else {
        setMatchSquad([])
      }
      // Always fetch media for any selected match
      setLoadingMatchMedia(true)
      try {
        const response = await matchMediaService.getMedia(selectedMatch.id)
        setSelectedMatchMedia(response.data || [])
      } catch (err) {
        console.error('Failed to load match media:', err)
        setSelectedMatchMedia([])
      } finally {
        setLoadingMatchMedia(false)
      }
      // Fetch POTM votes for past matches (with results) or upcoming matches on match day
      const hasPastResult = selectedMatch.goals_for !== null && selectedMatch.goals_for !== undefined
      const matchDate = new Date(selectedMatch.date)
      const today = new Date()
      const isMatchDay = matchDate.getFullYear() === today.getFullYear() &&
        matchDate.getMonth() === today.getMonth() &&
        matchDate.getDate() === today.getDate()

      if (hasPastResult || isMatchDay) {
        try {
          const voteRes = await api.get(`/matches/${selectedMatch.id}/parent-potm-votes`)
          setParentVoteData(voteRes.data)
          setVotingPlayerId(voteRes.data.my_vote || null)
        } catch {
          setParentVoteData(null)
        }
        // Fetch team squad for voting options
        if (team?.id) {
          try {
            const squadRes = await teamService.getPlayers(team.id)
            setTeamSquad(squadRes.data?.filter(p => p.is_active !== false) || [])
          } catch {
            setTeamSquad([])
          }
        }
      } else {
        setParentVoteData(null)
      }
    }
    fetchMatchData()
  }, [selectedMatch?.id])

  // Fetch POTM vote data for next match on match day
  useEffect(() => {
    async function fetchNextMatchVotes() {
      const nextMatch = zoneData?.upcomingMatches?.[0]
      const teamId = zoneData?.team?.id
      if (!nextMatch?.id || !teamId) return

      // Only show voting on match day
      const matchDate = new Date(nextMatch.date)
      const today = new Date()
      const isMatchDay = matchDate.getFullYear() === today.getFullYear() &&
        matchDate.getMonth() === today.getMonth() &&
        matchDate.getDate() === today.getDate()

      if (!isMatchDay) {
        setNextMatchVoteData(null)
        return
      }

      try {
        const [voteRes, squadRes] = await Promise.all([
          api.get(`/matches/${nextMatch.id}/parent-potm-votes`),
          teamService.getPlayers(teamId)
        ])
        setNextMatchVoteData(voteRes.data)
        setNextMatchVotingPlayerId(voteRes.data.my_vote || null)
        setNextMatchSquad(squadRes.data?.filter(p => p.is_active !== false) || [])
      } catch {
        setNextMatchVoteData(null)
      }
    }
    fetchNextMatchVotes()
  }, [zoneData?.upcomingMatches?.[0]?.id, zoneData?.team?.id])

  async function loadZoneData() {
    try {
      setLoading(true)
      console.log('PupilLounge: Fetching zone data for pupil_id:', user.pupil_id)
      const response = await playerZoneService.getZoneData(user.pupil_id)
      console.log('PupilLounge: Zone data received:', response.data)
      setZoneData(response.data)
    } catch (err) {
      console.error('Failed to load pupil zone:', err)
      console.error('Error details:', err.response?.data || err.message)
      setError({
        type: 'load_failed',
        message: 'Failed to load your data',
        details: err.response?.data?.message || err.message,
        suggestion: 'Please try refreshing the page. If the problem persists, contact your coach.'
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadChatHistory() {
    try {
      setLoadingChat(true)
      const response = await playerChatService.getHistory(user.pupil_id)
      setChatMessages(response.data || [])
    } catch (err) {
      console.error('Failed to load chat history:', err)
    } finally {
      setLoadingChat(false)
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault()
    if (!chatInput.trim() || sendingMessage) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setSendingMessage(true)

    // Add user message immediately
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])

    try {
      const response = await playerChatService.sendMessage(user.pupil_id, userMessage)
      setChatMessages(prev => [...prev, { role: 'assistant', content: response.data.message }])
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to send message'
      console.error('Gaffer chat error:', errorMsg)
      toast.error(errorMsg)
      setChatMessages(prev => prev.slice(0, -1)) // Remove the user message
      setChatInput(userMessage) // Restore input
    } finally {
      setSendingMessage(false)
    }
  }

  async function handleAvailabilityUpdate(matchId, availability) {
    setUpdatingAvailability(matchId)
    try {
      await playerZoneService.updateAvailability(user.pupil_id, matchId, { availability })
      setZoneData(prev => ({
        ...prev,
        upcomingMatches: prev.upcomingMatches.map(m =>
          m.id === matchId ? { ...m, my_availability: availability } : m
        )
      }))
      toast.success('Availability updated')
    } catch (err) {
      toast.error('Failed to update availability')
    } finally {
      setUpdatingAvailability(null)
    }
  }

  async function handleTrainingAvailabilityUpdate(sessionId, availability) {
    setUpdatingTrainingAvailability(sessionId)
    try {
      await playerZoneService.updateTrainingAvailability(user.pupil_id, sessionId, { availability })
      setZoneData(prev => ({
        ...prev,
        upcomingTraining: prev.upcomingTraining.map(s =>
          s.id === sessionId ? { ...s, my_availability: availability } : s
        )
      }))
      toast.success('Availability updated')
    } catch (err) {
      toast.error('Failed to update availability')
    } finally {
      setUpdatingTrainingAvailability(null)
    }
  }

  function formatDate(dateString) {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }

  function formatTime(timeString) {
    if (!timeString) return ''
    return timeString.slice(0, 5)
  }

  function getKickOffTime(dateString) {
    if (!dateString) return null
    const d = new Date(dateString)
    const hours = d.getHours()
    const minutes = d.getMinutes()
    if (hours === 0 && minutes === 0) return null
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-page flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-pitch-400" />
        <p className="text-secondary text-sm">Loading your Pupil Zone...</p>
      </div>
    )
  }

  if (error) {
    const errorObj = typeof error === 'string' ? { message: error } : error
    return (
      <div className="min-h-screen bg-page flex items-center justify-center p-4">
        <div className="card p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-alert-400 mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold text-white mb-2">
            {errorObj.type === 'no_player_link' ? 'Account Not Linked' : 'Oops!'}
          </h2>
          <p className="text-white mb-2">{errorObj.message}</p>
          {errorObj.details && (
            <p className="text-secondary text-sm mb-2">{errorObj.details}</p>
          )}
          {errorObj.suggestion && (
            <p className="text-pitch-400 text-sm mb-4">{errorObj.suggestion}</p>
          )}
          <div className="flex gap-2 justify-center">
            <button onClick={() => window.location.reload()} className="btn-primary">
              Retry
            </button>
            <button onClick={logout} className="btn-secondary">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
          {/* Debug info for troubleshooting */}
          {user && (
            <details className="mt-4 text-left">
              <summary className="text-xs text-tertiary cursor-pointer">Debug Info</summary>
              <pre className="text-xs text-tertiary mt-2 bg-card p-2 rounded overflow-auto">
{JSON.stringify({
  id: user.id,
  email: user.email,
  role: user.role,
  team_id: user.team_id,
  pupil_id: user.pupil_id,
}, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }

  const { pupil, team, upcomingMatches, upcomingTraining, recentMatches, observations, developmentPlan, videos, potmAwards, achievements } = zoneData || {}

  return (
    <div className="min-h-screen bg-page pb-20">
      {/* Pull-to-refresh indicator (PWA) */}
      <div
        ref={pullIndicatorRef}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-3 pointer-events-none"
        style={{ opacity: 0, transform: 'translateY(0px)', transition: pullRefreshing ? 'transform 0.3s ease, opacity 0.3s ease' : 'none' }}
      >
        <div className="bg-subtle rounded-full px-4 py-2 flex items-center gap-2 shadow-lg border border-border-strong">
          <Loader2 className={`w-4 h-4 text-pitch-400 ${pullRefreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm text-secondary">{pullRefreshing ? 'Refreshing...' : 'Pull to refresh'}</span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border-default">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {/* Date & Time Row */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-pitch-400" />
              <span className="text-sm text-white font-medium">
                {format(currentTime, 'EEEE, d MMMM')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-energy-400" />
              <span className="text-sm text-energy-400 font-bold">
                {format(currentTime, 'HH:mm')}
              </span>
            </div>
          </div>

          {/* Pupil Info Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pitch-500 to-pitch-700 flex items-center justify-center text-lg font-bold text-white">
                {pupil?.squad_number || pupil?.name?.charAt(0) || '?'}
              </div>
              <div>
                <h1 className="font-display font-bold text-white">{pupil?.name}</h1>
                <p className="text-xs text-secondary">{team?.name} • {team?.age_group}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-secondary hover:text-white relative"
              >
                <Bell className="w-5 h-5" />
                {(upcomingMatches?.length > 0 || announcements?.length > 0 || unreadNotificationCount > 0) && (
                  <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${unreadNotificationCount > 0 ? 'bg-energy-500 animate-pulse' : 'bg-pitch-500'}`} />
                )}
              </button>
              {user?.role === 'parent' && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 text-secondary hover:text-white"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}
              <button onClick={logout} className="p-2 text-secondary hover:text-white">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* HOME TAB */}
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Daily Motivation */}
              <div className="card p-3 bg-gradient-to-br from-energy-900/30 via-pitch-900/20 to-navy-900 border-energy-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-energy-500/20 flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 text-energy-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-energy-400 font-medium">💪 Daily Motivation</p>
                    <p className="text-white text-sm font-medium italic">"{dailyQuote.quote}"</p>
                    <p className="text-secondary text-xs">- {dailyQuote.author}</p>
                  </div>
                </div>
              </div>

              {/* Announcements */}
              {announcements.length > 0 && (
                <div className="card p-4">
                  <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-alert-400" />
                    Team Announcements
                  </h3>
                  <div className="space-y-3">
                    {announcements.slice(0, 3).map(announcement => (
                      <div
                        key={announcement.id}
                        className={`p-3 rounded-lg ${
                          announcement.priority === 'high' ? 'bg-alert-500/10 border border-alert-500/30' :
                          announcement.priority === 'urgent' ? 'bg-alert-500/20 border border-alert-500/50' :
                          'bg-subtle'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {announcement.is_pinned && <Pin className="w-3 h-3 text-pitch-400 shrink-0 mt-1" />}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white text-sm">{announcement.title}</p>
                            <p className="text-secondary text-sm mt-1 line-clamp-2">{announcement.content}</p>
                            <p className="text-xs text-tertiary mt-1">
                              {new Date(announcement.created_at).toLocaleDateString('en-GB', {
                                day: 'numeric', month: 'short'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gaffer AI Assistant - Prominent (hidden if disabled by parent) */}
              {!gafferDisabled && (
                <button
                  onClick={() => {
                    setShowChatModal(true)
                    if (chatMessages.length === 0) loadChatHistory()
                  }}
                  className="card p-5 w-full text-left hover:scale-[1.02] transition-all duration-200 bg-gradient-to-r from-pitch-900/60 via-energy-900/40 to-pitch-900/60 border-pitch-500/30 hover:border-pitch-500/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pitch-500 to-energy-500 flex items-center justify-center shadow-lg shadow-pitch-500/30">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-lg font-bold text-white">Ask the Gaffer</h3>
                        <span className="px-2 py-0.5 bg-pitch-500/20 text-pitch-400 text-xs rounded-full font-medium">AI</span>
                      </div>
                      <p className="text-sm text-secondary mt-1">Get tips, ask questions, and level up your game</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-pitch-400 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          Chat now
                        </span>
                        <ChevronRight className="w-4 h-4 text-pitch-400" />
                      </div>
                    </div>
                  </div>
                </button>
              )}

              {/* Quick Stats Row */}
              <div className="grid grid-cols-4 gap-2">
                <div className="card p-3 text-center">
                  <div className="text-xl font-bold text-pitch-400">{pupil?.squad_number || '-'}</div>
                  <div className="text-xs text-secondary">Squad #</div>
                </div>
                <div className="card p-3 text-center">
                  <div className="text-xl font-bold text-white">{getPrimaryPosition(pupil?.positions) || '-'}</div>
                  <div className="text-xs text-secondary">Position</div>
                </div>
                <div className="card p-3 text-center">
                  <div className="text-xl font-bold text-energy-400">{potmAwards?.length || 0}</div>
                  <div className="text-xs text-secondary flex items-center justify-center gap-1">
                    <Award className="w-3 h-3" /> POTM
                  </div>
                </div>
                <div className="card p-3 text-center">
                  <div className="text-xl font-bold text-blue-400">{observations?.length || 0}</div>
                  <div className="text-xs text-secondary">Notes</div>
                </div>
              </div>

              {/* Pupil of the Match Award Banner */}
              {potmAwards?.length > 0 && (
                <div className="card p-4 bg-gradient-to-r from-energy-900/40 via-caution-900/30 to-energy-900/40 border-energy-500/30">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-energy-500/20 flex items-center justify-center">
                      <Award className="w-6 h-6 text-energy-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-display font-bold text-white">
                        🏆 {potmAwards.length}x Pupil of the Match!
                      </p>
                      <p className="text-sm text-secondary">
                        Last: vs {potmAwards[0].opponent}
                        {potmAwards[0].reason && ` - "${potmAwards[0].reason}"`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Next Match - Enhanced Match Day Experience */}
              {upcomingMatches?.length > 0 && (
                <div className="card overflow-hidden">
                  {/* Clickable Header */}
                  <button
                    onClick={() => setSelectedMatch(upcomingMatches[0])}
                    className="w-full p-4 bg-gradient-to-r from-energy-900/30 to-navy-900 border-b border-border-default text-left hover:from-energy-900/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-semibold text-white flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-energy-400" />
                        Next Match
                      </h3>
                      <div className="flex items-center gap-2">
                        <MatchCountdown date={upcomingMatches[0].date} />
                        <ChevronRight className="w-5 h-5 text-tertiary" />
                      </div>
                    </div>
                  </button>
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <button
                          onClick={() => setSelectedMatch(upcomingMatches[0])}
                          className="font-bold text-lg text-white hover:text-pitch-400 transition-colors text-left"
                        >
                          V {upcomingMatches[0].opponent}
                        </button>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-secondary mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(upcomingMatches[0].date)}
                          </span>
                          {getKickOffTime(upcomingMatches[0].date) && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              KO {getKickOffTime(upcomingMatches[0].date)}
                            </span>
                          )}
                          {upcomingMatches[0].is_home !== undefined && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              upcomingMatches[0].is_home
                                ? 'bg-pitch-500/20 text-pitch-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {upcomingMatches[0].is_home ? '🏠 HOME KIT' : '👕 AWAY KIT'}
                            </span>
                          )}
                        </div>
                        {upcomingMatches[0].location && (
                          <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(upcomingMatches[0].location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-sm text-pitch-400 hover:text-pitch-300 mt-2"
                          >
                            <MapPin className="w-4 h-4" />
                            {upcomingMatches[0].location}
                            <ChevronRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <AvailabilityButtons
                          match={upcomingMatches[0]}
                          onUpdate={handleAvailabilityUpdate}
                          updating={updatingAvailability === upcomingMatches[0].id}
                        />
                      </div>
                    </div>

                    {/* Match Prep Preview - Click to see full */}
                    {upcomingMatches[0].prep_notes && typeof upcomingMatches[0].prep_notes === 'string' ? (
                      <button
                        onClick={() => setSelectedMatch(upcomingMatches[0])}
                        className="w-full mt-4 pt-4 border-t border-border-default text-left"
                      >
                        <div className="p-4 bg-pitch-500/10 border border-pitch-500/30 rounded-xl hover:bg-pitch-500/15 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-pitch-400" />
                              <h4 className="font-display font-semibold text-pitch-400">Match Prep & Tactics</h4>
                            </div>
                            <span className="text-xs text-pitch-400 flex items-center gap-1">
                              Tap to view full prep
                              <ChevronRight className="w-4 h-4" />
                            </span>
                          </div>
                          <p className="text-sm text-secondary line-clamp-3">
                            {String(upcomingMatches[0].prep_notes).replace(/[#*_`]/g, '').substring(0, 150)}...
                          </p>
                        </div>
                      </button>
                    ) : (
                      <div className="mt-4 pt-4 border-t border-border-default">
                        <div className="p-3 bg-subtle rounded-lg text-center">
                          <p className="text-sm text-secondary">
                            No match prep shared yet - check back closer to match day!
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Pep Talk & Media Buttons */}
                    <div className="mt-4 pt-4 border-t border-border-default flex flex-col gap-3">
                      {/* Pep Talk Button - only on match day */}
                      {(() => {
                        const matchDate = new Date(upcomingMatches[0].date)
                        const today = new Date()
                        const isMatchDay = matchDate.getFullYear() === today.getFullYear() &&
                          matchDate.getMonth() === today.getMonth() &&
                          matchDate.getDate() === today.getDate()
                        return isMatchDay ? (
                          <button
                            onClick={() => handleGetPepTalk(upcomingMatches[0].id)}
                            disabled={loadingPepTalk}
                            className="w-full btn-primary bg-gradient-to-r from-energy-600 to-alert-600 hover:from-energy-500 hover:to-alert-500 py-3"
                          >
                            {loadingPepTalk ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Flame className="w-5 h-5" />
                            )}
                            {loadingPepTalk ? 'Getting Your Pep Talk...' : '🔥 Get Pumped for the Match!'}
                          </button>
                        ) : null
                      })()}

                      {/* Add to Calendar & Media */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <button
                          onClick={() => exportMatchToCalendar(upcomingMatches[0], team?.name)}
                          className="btn-ghost btn-sm text-energy-400"
                        >
                          <Download className="w-4 h-4" />
                          Add to Calendar
                        </button>
                        <button
                          onClick={() => setShowMediaUpload(upcomingMatches[0].id)}
                          className="btn-ghost btn-sm text-pitch-400"
                        >
                          <Camera className="w-4 h-4" />
                          Add Media
                        </button>
                      </div>
                    </div>

                    {/* Match Day POTM Voting */}
                    {nextMatchVoteData && nextMatchSquad.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border-default">
                        <div className="p-4 bg-gradient-to-br from-energy-900/30 to-navy-800/50 rounded-xl border border-energy-500/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Heart className="w-5 h-5 text-energy-400" />
                            <h4 className="font-display font-semibold text-white">Parents' Pupil of the Match</h4>
                          </div>
                          {nextMatchVoteData.my_vote ? (
                            <div className="space-y-3">
                              <p className="text-sm text-secondary">
                                You voted for <span className="text-energy-400 font-medium">
                                  {nextMatchSquad.find(p => p.id === nextMatchVoteData.my_vote)?.name || 'a pupil'}
                                </span>
                              </p>
                              <p className="text-xs text-tertiary">{nextMatchVoteData.total_votes} vote{nextMatchVoteData.total_votes !== 1 ? 's' : ''} cast so far</p>
                              <button
                                onClick={() => {
                                  setNextMatchVoteData(prev => prev ? { ...prev, my_vote: null } : null)
                                  setNextMatchVotingPlayerId(null)
                                }}
                                className="text-xs text-secondary hover:text-energy-400 transition-colors"
                              >
                                Change vote
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm text-secondary mb-2">Who stood out today? Cast your vote!</p>
                              <select
                                value={nextMatchVotingPlayerId || ''}
                                onChange={(e) => setNextMatchVotingPlayerId(e.target.value)}
                                className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-white text-sm focus:border-energy-500 focus:outline-none"
                              >
                                <option value="">Select a pupil...</option>
                                {nextMatchSquad
                                  .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                                  .map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}{p.squad_number ? ` (#${p.squad_number})` : ''}
                                    </option>
                                  ))
                                }
                              </select>
                              <button
                                onClick={() => nextMatchVotingPlayerId && handleNextMatchPotmVote(upcomingMatches[0].id, nextMatchVotingPlayerId)}
                                disabled={!nextMatchVotingPlayerId || nextMatchSubmittingVote}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-energy-500 text-navy-950 rounded-lg text-sm font-medium hover:bg-energy-600 transition-colors disabled:opacity-50"
                              >
                                {nextMatchSubmittingVote ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Heart className="w-4 h-4" />
                                )}
                                Cast Vote
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Achievements/Badges Section */}
              {achievements?.length > 0 && (
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-semibold text-white flex items-center gap-2">
                      <Star className="w-5 h-5 text-energy-400" />
                      My Badges
                    </h3>
                    <button
                      onClick={() => setShowBadgesModal(true)}
                      className="text-sm text-pitch-400 hover:text-pitch-300 flex items-center gap-1"
                    >
                      View All
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {achievements.slice(0, 4).map(achievement => (
                      <button
                        key={achievement.id}
                        onClick={() => setShowBadgesModal(true)}
                        className="bg-gradient-to-br from-navy-800 to-navy-900 rounded-xl p-3 text-center border border-border-strong hover:border-energy-500/30 transition-all"
                      >
                        <div className="text-2xl mb-1">{achievement.icon}</div>
                        <p className="text-xs font-medium text-white truncate">{achievement.title}</p>
                        {achievement.match_opponent && (
                          <p className="text-[10px] text-secondary truncate">vs {achievement.match_opponent}</p>
                        )}
                        {achievement.training_date && (
                          <p className="text-[10px] text-secondary">{new Date(achievement.training_date).toLocaleDateString()}</p>
                        )}
                      </button>
                    ))}
                  </div>
                  {achievements.length > 4 && (
                    <button
                      onClick={() => setShowBadgesModal(true)}
                      className="w-full mt-3 text-sm text-secondary hover:text-white text-center py-2 border border-border-strong rounded-lg hover:border-border-strong transition-colors"
                    >
                      +{achievements.length - 4} more badges
                    </button>
                  )}
                </div>
              )}

              {/* Make a Suggestion Button */}
              <button
                onClick={() => {
                  setShowSuggestionModal(true)
                  if (mySuggestions.length === 0) loadMySuggestions()
                }}
                className="card p-4 w-full text-left hover:scale-[1.01] transition-all duration-200 bg-gradient-to-r from-blue-900/40 via-navy-900 to-blue-900/40 border-blue-500/20 hover:border-blue-500/40"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Lightbulb className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-white">Make a Suggestion</h3>
                    <p className="text-sm text-secondary">Share ideas with your coaches</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-tertiary" />
                </div>
              </button>

              {/* Upcoming Training */}
              {upcomingTraining?.length > 0 && (
                <div className="card p-4">
                  <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5 text-pitch-400" />
                    Upcoming Sessions
                  </h3>
                  <div className="space-y-3">
                    {upcomingTraining.slice(0, 3).map(session => {
                      const isSC = session.session_type === 's&c'
                      const SessionIcon = isSC ? Dumbbell : Target
                      const hasPlan = session.plan && Object.keys(session.plan).length > 0
                      return (
                        <div
                          key={session.id}
                          onClick={() => setSelectedSession(session)}
                          className="w-full flex items-center gap-3 p-3 bg-subtle rounded-lg hover:bg-subtle/70 transition-colors text-left cursor-pointer"
                        >
                          <div className={`w-10 h-10 rounded-lg ${isSC ? 'bg-energy-500/10' : 'bg-pitch-500/10'} flex items-center justify-center shrink-0`}>
                            <SessionIcon className={`w-5 h-5 ${isSC ? 'text-energy-400' : 'text-pitch-400'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">
                                {isSC ? 'S&C Session' : (session.focus_areas?.join(', ') || 'Training')}
                              </span>
                              {isSC && <span className="badge-energy text-xs">S&C</span>}
                              {hasPlan && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-pitch-500/20 text-pitch-300 rounded text-xs">
                                  <FileText className="w-3 h-3" />
                                  Plan
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-secondary mt-0.5">
                              <span>{formatDate(session.date)}</span>
                              {session.meet_time && <span>• Meet {session.meet_time.slice(0, 5)}</span>}
                              {session.time && <span>• Start {session.time.slice(0, 5)}</span>}
                              {session.duration && <span>• {session.duration} mins</span>}
                            </div>
                            {session.location && (
                              <div className="flex items-center gap-1 text-xs text-tertiary mt-0.5">
                                <MapPin className="w-3 h-3" />
                                {session.location}
                              </div>
                            )}
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <AvailabilityButtons
                              match={session}
                              onUpdate={(id, status) => handleTrainingAvailabilityUpdate(id, status)}
                              updating={updatingTrainingAvailability === session.id}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Recent Results */}
              {recentMatches?.length > 0 && (
                <div className="card p-4">
                  <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-secondary" />
                    Recent Results
                  </h3>
                  <div className="space-y-2">
                    {recentMatches.slice(0, 3).map(match => (
                      <button
                        key={match.id}
                        onClick={() => setSelectedMatch(match)}
                        className="w-full flex items-center gap-3 p-2 bg-subtle rounded-lg hover:bg-subtle transition-colors text-left"
                      >
                        <ResultBadge goalsFor={match.goals_for} goalsAgainst={match.goals_against} />
                        <div className="flex-1 text-sm">
                          <span className="text-white">V {match.opponent}</span>
                          <span className="text-tertiary ml-2">
                            {match.goals_for}-{match.goals_against}
                          </span>
                        </div>
                        <span className="text-xs text-tertiary">{formatDate(match.date)}</span>
                        <ChevronRight className="w-4 h-4 text-tertiary" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* SCHEDULE TAB */}
          {activeTab === 'schedule' && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Toggle between Calendar and List view */}
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-white">Schedule</h2>
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className={`btn-sm ${showCalendar ? 'btn-primary' : 'btn-secondary'}`}
                >
                  <CalendarDays className="w-4 h-4" />
                  {showCalendar ? 'List View' : 'Calendar'}
                </button>
              </div>

              {/* Calendar View */}
              {showCalendar && (
                <div className="card p-4">
                  <ScheduleCalendar
                    currentMonth={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    matches={upcomingMatches || []}
                    recentMatches={recentMatches || []}
                    training={upcomingTraining || []}
                    onSelectMatch={setSelectedMatch}
                    teamName={team?.name}
                  />
                </div>
              )}

              {/* List View */}
              {!showCalendar && (
                <>
                  {/* Matches */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-secondary flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      Matches
                    </h3>
                    {upcomingMatches?.length > 0 ? (
                      upcomingMatches.map(match => (
                        <button
                          key={match.id}
                          onClick={() => setSelectedMatch(match)}
                          className="card p-4 w-full text-left hover:bg-subtle/80 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="font-bold text-white flex items-center gap-2">
                                V {match.opponent}
                                <ChevronRight className="w-4 h-4 text-tertiary" />
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-secondary mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(match.date)}
                                </span>
                              </div>
                              {match.location && (
                                <div className="flex items-center gap-1 text-sm text-tertiary mt-1">
                                  <MapPin className="w-3 h-3" />
                                  {match.location}
                                </div>
                              )}
                            </div>
                            <div onClick={(e) => e.stopPropagation()}>
                              <AvailabilityButtons
                                match={match}
                                onUpdate={handleAvailabilityUpdate}
                                updating={updatingAvailability === match.id}
                              />
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="card p-6 text-center">
                        <Trophy className="w-10 h-10 text-tertiary mx-auto mb-2" />
                        <p className="text-secondary">No upcoming matches scheduled</p>
                      </div>
                    )}
                  </div>

                  {/* Training Sessions */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-secondary flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Training & S&C Sessions
                    </h3>
                    {upcomingTraining?.length > 0 ? (
                      upcomingTraining.map(session => {
                        const isSC = session.session_type === 's&c'
                        const SessionIcon = isSC ? Dumbbell : Target
                        const hasPlan = session.plan && Object.keys(session.plan).length > 0
                        return (
                          <div
                            key={session.id}
                            onClick={() => setSelectedSession(session)}
                            className="card p-4 w-full text-left hover:border-pitch-500/30 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <SessionIcon className={`w-5 h-5 ${isSC ? 'text-energy-400' : 'text-pitch-400'}`} />
                                <span className="font-medium text-white">
                                  {isSC ? 'S&C Session' : (session.focus_areas?.length > 0 ? session.focus_areas.join(', ') : 'Training')}
                                </span>
                                {isSC && <span className="badge-energy text-xs">S&C</span>}
                                {hasPlan && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-pitch-500/20 text-pitch-300 rounded text-xs">
                                    <FileText className="w-3 h-3" />
                                    Plan
                                  </span>
                                )}
                              </div>
                              <div onClick={(e) => e.stopPropagation()}>
                                <AvailabilityButtons
                                  match={session}
                                  onUpdate={(id, status) => handleTrainingAvailabilityUpdate(id, status)}
                                  updating={updatingTrainingAvailability === session.id}
                                />
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-secondary mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(session.date)}
                              </span>
                              {session.meet_time && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  Meet {session.meet_time.slice(0, 5)}
                                </span>
                              )}
                              {session.time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  Start {session.time.slice(0, 5)}
                                </span>
                              )}
                              {session.duration && (
                                <span className="text-tertiary">• {session.duration} mins</span>
                              )}
                            </div>
                            {session.location && (
                              <div className="flex items-center gap-1 text-sm text-tertiary mt-1">
                                <MapPin className="w-3 h-3" />
                                {session.location}
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div className="card p-6 text-center">
                        <Target className="w-10 h-10 text-tertiary mx-auto mb-2" />
                        <p className="text-secondary">No training sessions scheduled</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* FILM ROOM TAB */}
          {activeTab === 'film-room' && (
            <motion.div
              key="film-room"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <PlayerFilmRoom userId={user?.id} />
            </motion.div>
          )}

          {/* LIVE STREAM TAB */}
          {activeTab === 'live' && (
            <motion.div
              key="live"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Live Stream Header */}
              <div className="card p-4 bg-gradient-to-r from-alert-900/50 via-energy-900/30 to-navy-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                      streamCredentials?.status === 'active'
                        ? 'bg-gradient-to-br from-alert-500 to-energy-500 shadow-alert-500/20 animate-pulse'
                        : 'bg-gradient-to-br from-navy-600 to-navy-700'
                    }`}>
                      <Radio className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-white">
                        {streamCredentials?.streamName || 'Live Stream'}
                      </h2>
                      <p className="text-xs text-secondary">
                        {streamCredentials?.status === 'active' ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-alert-500 animate-pulse" />
                            <span className="text-alert-400">LIVE NOW</span>
                          </span>
                        ) : 'Watch live training and matches'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {streamCredentials?.shareCode && (
                      <button
                        onClick={handleShare}
                        className="btn-primary btn-sm bg-pitch-500 hover:bg-pitch-600"
                      >
                        <Share2 className="w-4 h-4" />
                        Share
                      </button>
                    )}
                    <button
                      onClick={loadStreamCredentials}
                      disabled={loadingStream}
                      className="p-2 text-secondary hover:text-white transition-colors"
                      title="Refresh"
                    >
                      <Loader2 className={`w-5 h-5 ${loadingStream ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Stream Content */}
              {loadingStream ? (
                <div className="card p-12 text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-pitch-400 mx-auto" />
                  <p className="text-secondary mt-3">Checking stream status...</p>
                </div>
              ) : !streamCredentials ? (
                <div className="card p-8 text-center">
                  <WifiOff className="w-16 h-16 text-tertiary mx-auto mb-4" />
                  <h3 className="font-display font-semibold text-white text-lg mb-2">Streaming Not Set Up</h3>
                  <p className="text-secondary text-sm max-w-sm mx-auto">
                    Your coach hasn't set up live streaming yet. Once configured, you'll be able to watch live training sessions and matches here.
                  </p>
                </div>
              ) : streamCredentials.status === 'active' ? (
                <div className="card overflow-hidden">
                  <div className="aspect-video bg-black">
                    <mux-player
                      playback-id={streamCredentials.playbackId}
                      stream-type="live"
                      autoplay
                      muted
                      default-show-remaining-time
                      style={{ width: '100%', height: '100%', '--controls': 'flex' }}
                    />
                  </div>
                  <div className="p-3 bg-subtle border-t border-border-strong">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-alert-500 animate-pulse" />
                        <span className="text-sm text-alert-400 font-medium">Live</span>
                        <span className="text-sm text-secondary">• {streamCredentials.streamName}</span>
                      </div>
                      {streamCredentials.shareCode && (
                        <button
                          onClick={handleShare}
                          className="btn-primary btn-sm bg-pitch-500 hover:bg-pitch-600"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-subtle flex items-center justify-center mx-auto mb-4">
                    <Radio className="w-10 h-10 text-tertiary" />
                  </div>
                  <h3 className="font-display font-semibold text-white text-lg mb-2">No Live Stream</h3>
                  <p className="text-secondary text-sm max-w-sm mx-auto mb-4">
                    There's no live stream right now. Check back when your team has a training session or match.
                  </p>
                  <p className="text-xs text-tertiary">
                    Stream will appear automatically when your coach goes live
                  </p>
                </div>
              )}

              {/* Pupil Clip Library */}
              {pupil?.id && (
                <div className="card p-6">
                  <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-pitch-400" />
                    My Clips
                  </h3>
                  <PupilClips pupilId={pupil.id} />
                </div>
              )}

              {/* Match Videos */}
              {recentMatches && recentMatches.filter(m => m.veo_link || m.video_url).length > 0 && (
                <div className="card p-6">
                  <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                    <Video className="w-5 h-5 text-energy-400" />
                    Match Videos
                  </h3>
                  <div className="space-y-2">
                    {recentMatches.filter(m => m.veo_link || m.video_url).map(match => (
                      <div key={match.id}>
                        <p className="text-xs text-secondary mb-1">
                          vs {match.opponent} • {new Date(match.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </p>
                        {match.veo_link && (
                          <a
                            href={match.veo_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-subtle rounded-lg hover:bg-subtle transition-colors mb-1"
                          >
                            <div className="w-10 h-10 bg-pitch-500/20 rounded-lg flex items-center justify-center">
                              <Play className="w-5 h-5 text-pitch-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-white font-medium text-sm">Match Video</p>
                              <p className="text-xs text-secondary">Watch the full match</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-tertiary" />
                          </a>
                        )}
                        {match.video_url && (
                          <a
                            href={match.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-subtle rounded-lg hover:bg-subtle transition-colors"
                          >
                            <div className="w-10 h-10 bg-energy-500/20 rounded-lg flex items-center justify-center">
                              <Video className="w-5 h-5 text-energy-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-white font-medium text-sm">Match Video</p>
                              <p className="text-xs text-secondary">Coach uploaded video</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-tertiary" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Share Modal */}
              {showShareOptions && streamCredentials?.shareCode && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
                  onClick={() => setShowShareOptions(false)}
                >
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="card p-6 max-w-sm w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display font-semibold text-white">Share Stream</h3>
                      <button
                        onClick={() => setShowShareOptions(false)}
                        className="p-1 text-secondary hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <p className="text-secondary text-sm mb-4">
                      Share this with friends & family so they can watch the live stream.
                    </p>

                    {/* Share Link */}
                    <div className="mb-4">
                      <label className="text-xs text-secondary mb-1 block">Link</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={getStreamShareUrl()}
                          className="input text-sm flex-1 font-mono"
                        />
                        <button
                          onClick={handleCopyShareLink}
                          className="btn-secondary btn-sm"
                        >
                          {copiedShareLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* PIN */}
                    {streamCredentials.guestPin && (
                      <div className="mb-4">
                        <label className="text-xs text-secondary mb-1 block">PIN to share</label>
                        <div className="flex items-center gap-3 p-3 bg-subtle rounded-lg">
                          <div className="text-2xl font-mono font-bold text-white tracking-widest">
                            {streamCredentials.guestPin}
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(streamCredentials.guestPin)
                              toast.success('PIN copied!')
                            }}
                            className="btn-ghost btn-sm text-secondary"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {!streamCredentials.guestPin && (
                      <div className="p-3 bg-caution-500/10 border border-caution-500/30 rounded-lg mb-4">
                        <p className="text-caution-400 text-sm">
                          No PIN set. Ask your coach to set one in Settings.
                        </p>
                      </div>
                    )}

                    <button
                      onClick={() => setShowShareOptions(false)}
                      className="btn-primary w-full"
                    >
                      Done
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* LEAGUE TABLE TAB */}
          {activeTab === 'league' && (
            <motion.div
              key="league"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* League Header */}
              <div className="card p-4 bg-gradient-to-r from-pitch-900/50 via-energy-900/30 to-navy-900">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pitch-500 to-energy-500 flex items-center justify-center shadow-lg shadow-pitch-500/20">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-white">
                      {leagueSettings?.league_name || 'League Table'}
                    </h2>
                    {leagueSettings?.season && (
                      <p className="text-xs text-secondary">Season {leagueSettings.season}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* League Table */}
              {loadingLeague ? (
                <div className="card p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-pitch-400 mx-auto" />
                  <p className="text-secondary mt-2">Loading league table...</p>
                </div>
              ) : leagueTable.length === 0 ? (
                <div className="card p-8 text-center">
                  <Table2 className="w-12 h-12 text-tertiary mx-auto mb-3" />
                  <h3 className="font-display font-semibold text-white mb-2">No League Data</h3>
                  <p className="text-secondary text-sm">
                    Your coach hasn't set up the league table yet.
                  </p>
                </div>
              ) : (
                <div className="card overflow-hidden">
                  {/* Mobile-friendly table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-subtle text-secondary text-xs uppercase">
                          <th className="px-3 py-3 text-left">#</th>
                          <th className="px-3 py-3 text-left">Team</th>
                          <th className="px-3 py-3 text-center">P</th>
                          <th className="px-3 py-3 text-center">W</th>
                          <th className="px-3 py-3 text-center">D</th>
                          <th className="px-3 py-3 text-center">L</th>
                          <th className="px-3 py-3 text-center hidden sm:table-cell">GF</th>
                          <th className="px-3 py-3 text-center hidden sm:table-cell">GA</th>
                          <th className="px-3 py-3 text-center">GD</th>
                          <th className="px-3 py-3 text-center font-bold">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...leagueTable]
                          .sort((a, b) => {
                            if (b.points !== a.points) return b.points - a.points
                            if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
                            return b.goals_for - a.goals_for
                          })
                          .map((team, index) => (
                            <tr
                              key={team.id}
                              className={`border-t border-border-default ${
                                team.is_own_team
                                  ? 'bg-pitch-500/10 font-medium'
                                  : index % 2 === 0 ? 'bg-card/30' : ''
                              }`}
                            >
                              <td className="px-3 py-3 text-secondary">{index + 1}</td>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2">
                                  {team.is_own_team && (
                                    <div className="w-2 h-2 rounded-full bg-pitch-500" />
                                  )}
                                  <span className={team.is_own_team ? 'text-pitch-300' : 'text-white'}>
                                    {team.team_name}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center text-secondary">{team.played}</td>
                              <td className="px-3 py-3 text-center text-pitch-400">{team.won}</td>
                              <td className="px-3 py-3 text-center text-secondary">{team.drawn}</td>
                              <td className="px-3 py-3 text-center text-alert-400">{team.lost}</td>
                              <td className="px-3 py-3 text-center text-secondary hidden sm:table-cell">{team.goals_for}</td>
                              <td className="px-3 py-3 text-center text-secondary hidden sm:table-cell">{team.goals_against}</td>
                              <td className="px-3 py-3 text-center">
                                <span className={
                                  team.goal_difference > 0 ? 'text-pitch-400' :
                                  team.goal_difference < 0 ? 'text-alert-400' : 'text-secondary'
                                }>
                                  {team.goal_difference > 0 ? '+' : ''}{team.goal_difference}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center font-bold text-white">{team.points}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Legend */}
                  <div className="px-4 py-3 bg-subtle border-t border-border-default text-xs text-tertiary">
                    <span className="inline-flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-pitch-500" />
                      Your team
                    </span>
                    <span className="ml-4">P: Played | W: Won | D: Drawn | L: Lost | GD: Goal Difference | Pts: Points</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* DEVELOPMENT TAB */}
          {activeTab === 'development' && (
            <motion.div
              key="development"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <h2 className="font-display text-xl font-bold text-white">My Progress</h2>

              {/* Development Plan */}
              {developmentPlan ? (
                <div className="card p-5">
                  <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-pitch-400" />
                    My Development Plan
                  </h3>
                  {developmentPlan.generated_content || developmentPlan.notes ? (
                    <AIMarkdown>{developmentPlan.generated_content || developmentPlan.notes}</AIMarkdown>
                  ) : (
                    <div className="space-y-4">
                      {developmentPlan.strengths?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-pitch-400 mb-2 flex items-center gap-1">
                            <Star className="w-4 h-4" /> My Strengths
                          </h4>
                          <ul className="space-y-1">
                            {developmentPlan.strengths.map((s, i) => (
                              <li key={i} className="text-sm text-secondary flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-pitch-500 shrink-0 mt-0.5" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {developmentPlan.areas_to_improve?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-energy-400 mb-2 flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" /> Areas to Work On
                          </h4>
                          <ul className="space-y-1">
                            {developmentPlan.areas_to_improve.map((a, i) => (
                              <li key={i} className="text-sm text-secondary flex items-start gap-2">
                                <Target className="w-4 h-4 text-energy-500 shrink-0 mt-0.5" />
                                {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {developmentPlan.goals?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-1">
                            <Trophy className="w-4 h-4" /> Goals
                          </h4>
                          <ul className="space-y-1">
                            {developmentPlan.goals.map((g, i) => (
                              <li key={i} className="text-sm text-secondary flex items-start gap-2">
                                <Circle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                {g}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="card p-6 text-center">
                  <Target className="w-10 h-10 text-tertiary mx-auto mb-3" />
                  <h3 className="font-display font-semibold text-white mb-2">Development Plan Coming Soon</h3>
                  <p className="text-secondary text-sm">
                    Your coach is working on your personalized development plan.
                  </p>
                </div>
              )}

              {/* Coach Observations */}
              <div className="space-y-3">
                <h3 className="font-display font-semibold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-secondary" />
                  Coach Feedback ({observations?.length || 0})
                </h3>
                {observations?.length > 0 ? (
                  observations.map((obs, i) => {
                    const config = observationTypeConfig[obs.type] || { label: obs.type, icon: FileText, color: 'navy' }
                    const Icon = config.icon
                    return (
                      <div key={i} className="card p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-${config.color}-500/10 flex items-center justify-center shrink-0`}>
                            <Icon className={`w-4 h-4 text-${config.color}-400`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`badge-${config.color} text-xs`}>{config.label}</span>
                              {obs.match_opponent && (
                                <span className="text-xs text-tertiary">vs {obs.match_opponent}</span>
                              )}
                            </div>
                            <p className="text-sm text-secondary">{obs.content}</p>
                            <p className="text-xs text-tertiary mt-2">
                              {new Date(obs.created_at).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="card p-6 text-center">
                    <FileText className="w-10 h-10 text-tertiary mx-auto mb-2" />
                    <p className="text-secondary">No feedback yet. Keep working hard!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border-default z-40">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-around py-2">
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors ${
                    isActive ? 'text-pitch-400' : 'text-tertiary hover:text-secondary'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-pitch-400' : ''}`} />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Photo Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 z-10"
          >
            <X className="w-5 h-5" />
          </button>
          {/\.(mp4|webm|mov|avi|mkv)/i.test(lightboxUrl) ? (
            <video
              src={lightboxUrl}
              controls
              autoPlay
              className="max-w-full max-h-[90vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={lightboxUrl}
              alt="Match photo"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}

      {/* Media Upload Modal */}
      {showMediaUpload && (
        <MediaUploadModal
          matchId={showMediaUpload}
          onClose={() => setShowMediaUpload(null)}
          onUpload={handleMediaUpload}
          uploading={uploadingMedia}
        />
      )}

      {/* Pep Talk Modal */}
      {showPepTalk && pepTalk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto bg-gradient-to-br from-energy-900/50 via-navy-900 to-alert-900/30"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-xl text-white flex items-center gap-2">
                <Flame className="w-6 h-6 text-energy-400" />
                Pre-Match Pep Talk
              </h3>
              <button onClick={() => setShowPepTalk(false)} className="text-secondary hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <AIMarkdown>{pepTalk}</AIMarkdown>

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowPepTalk(false)}
                className="btn-primary bg-gradient-to-r from-energy-600 to-pitch-600"
              >
                💪 Let's Go!
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Notification Panel */}
      <AnimatePresence>
        {showNotifications && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowNotifications(false)}
            />
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="fixed top-16 right-4 z-50 w-96 max-h-[80vh] overflow-y-auto card bg-card border border-border-strong shadow-xl"
            >
              <div className="p-4 border-b border-border-default">
                <h3 className="font-display font-semibold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-pitch-400" />
                  Notifications
                </h3>
              </div>
              <div className="p-2">
                {/* Next Match Focus - highlighted section */}
                {upcomingMatches?.[0] && (
                  <div className="mb-3">
                    <div className="p-3 rounded-lg bg-gradient-to-r from-energy-500/10 to-pitch-500/10 border border-energy-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-energy-400" />
                        <span className="text-xs font-semibold text-energy-400 uppercase tracking-wide">Next Match</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedMatch(upcomingMatches[0])
                          setShowNotifications(false)
                        }}
                        className="w-full text-left"
                      >
                        <p className="text-white font-semibold">
                          V {upcomingMatches[0].opponent}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-secondary mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(upcomingMatches[0].date)}
                          </span>
                          {upcomingMatches[0].time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(upcomingMatches[0].time)}
                            </span>
                          )}
                          {upcomingMatches[0].location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {upcomingMatches[0].location}
                            </span>
                          )}
                        </div>
                      </button>
                      {/* Match Prep Notes */}
                      {upcomingMatches[0].prep_notes && (
                        <div className="mt-3 pt-3 border-t border-border-strong/50">
                          <p className="text-xs font-medium text-pitch-400 mb-1 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Match Prep
                          </p>
                          <p className="text-xs text-secondary line-clamp-3">{String(upcomingMatches[0].prep_notes).replace(/[#*_`]/g, '').substring(0, 200)}</p>
                        </div>
                      )}
                      {/* Team Notes */}
                      {upcomingMatches[0].team_notes && (
                        <div className="mt-2 pt-2 border-t border-border-strong/50">
                          <p className="text-xs font-medium text-energy-400 mb-1 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            Team Notes
                          </p>
                          <p className="text-xs text-secondary line-clamp-2">{upcomingMatches[0].team_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Achievement & POTM Notifications */}
                {squadNotifications?.filter(n => n.type === 'achievement' || n.type === 'potm').length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-energy-400 px-2 py-1 font-semibold flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      ACHIEVEMENTS
                    </p>
                    {squadNotifications.filter(n => n.type === 'achievement' || n.type === 'potm').slice(0, 3).map(notification => {
                      const data = notification.data || {}
                      const isPotm = notification.type === 'potm'
                      return (
                        <div
                          key={notification.id}
                          onClick={() => markNotificationAsRead(notification.id)}
                          className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                            notification.is_read
                              ? 'bg-subtle hover:bg-subtle'
                              : 'bg-energy-500/10 border border-energy-500/20 hover:bg-energy-500/20'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-energy-500/20 flex items-center justify-center flex-shrink-0">
                              {data.icon ? (
                                <span className="text-lg">{data.icon}</span>
                              ) : isPotm ? (
                                <Award className="w-4 h-4 text-energy-400" />
                              ) : (
                                <Star className="w-4 h-4 text-energy-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-white font-medium">{notification.title}</p>
                                {!notification.is_read && (
                                  <span className="w-2 h-2 rounded-full bg-energy-400 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-secondary mt-0.5">{notification.message}</p>
                              <p className="text-xs text-tertiary mt-1">
                                {new Date(notification.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Squad Selection Announcements */}
                {squadNotifications?.filter(n => n.type === 'squad_announcement').length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-pitch-400 px-2 py-1 font-semibold flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      SQUAD SELECTION
                    </p>
                    {squadNotifications.filter(n => n.type === 'squad_announcement').slice(0, 3).map(notification => {
                      const data = notification.data || {}
                      const isStarting = data.is_starting
                      return (
                        <div
                          key={notification.id}
                          onClick={() => markNotificationAsRead(notification.id)}
                          className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                            notification.is_read
                              ? 'bg-subtle hover:bg-subtle'
                              : 'bg-pitch-500/10 border border-pitch-500/20 hover:bg-pitch-500/20'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isStarting ? 'bg-pitch-500/20' : 'bg-energy-500/20'
                            }`}>
                              <Users className={`w-4 h-4 ${isStarting ? 'text-pitch-400' : 'text-energy-400'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-white font-medium">{notification.title}</p>
                                {!notification.is_read && (
                                  <span className="w-2 h-2 rounded-full bg-pitch-400 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-secondary mt-0.5">{notification.message}</p>
                              {data.meetup_time && (
                                <p className="text-xs text-energy-400 mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Meet: {new Date(data.meetup_time).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  {data.meetup_location && ` at ${data.meetup_location}`}
                                </p>
                              )}
                              <p className="text-xs text-tertiary mt-1">
                                {new Date(notification.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Urgent Announcements */}
                {announcements?.filter(a => a.priority === 'urgent' || a.priority === 'high').length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-alert-400 px-2 py-1 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      IMPORTANT
                    </p>
                    {announcements.filter(a => a.priority === 'urgent' || a.priority === 'high').slice(0, 2).map(announcement => (
                      <div
                        key={announcement.id}
                        className="p-3 rounded-lg bg-alert-500/10 border border-alert-500/20 mb-2"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-alert-500/20 flex items-center justify-center flex-shrink-0">
                            <Megaphone className="w-4 h-4 text-alert-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium">{announcement.title}</p>
                            <p className="text-xs text-secondary line-clamp-2 mt-0.5">{announcement.content}</p>
                            <p className="text-xs text-tertiary mt-1">
                              {new Date(announcement.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upcoming Training Sessions */}
                {upcomingTraining?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-tertiary px-2 py-1 font-medium flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      UPCOMING SESSIONS
                    </p>
                    {upcomingTraining.slice(0, 3).map(session => {
                      const isSC = session.session_type === 's&c'
                      const SessionIcon = isSC ? Dumbbell : Target
                      const hasPlan = session.plan && Object.keys(session.plan).length > 0
                      return (
                        <button
                          key={session.id}
                          onClick={() => {
                            setSelectedSession(session)
                            setShowNotifications(false)
                          }}
                          className="w-full p-3 rounded-lg hover:bg-subtle text-left transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${isSC ? 'bg-energy-500/20' : 'bg-pitch-500/20'} flex items-center justify-center`}>
                              <SessionIcon className={`w-4 h-4 ${isSC ? 'text-energy-400' : 'text-pitch-400'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-white font-medium">
                                  {isSC ? 'S&C Session' : (session.focus_areas?.join(', ') || 'Training')}
                                </p>
                                {hasPlan && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-pitch-500/20 text-pitch-300 rounded text-xs">
                                    <FileText className="w-3 h-3" />
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-secondary mt-0.5">
                                <span>{formatDate(session.date)}</span>
                                {session.meet_time && <span>• Meet {session.meet_time.slice(0, 5)}</span>}
                                {session.time && <span>• Start {session.time.slice(0, 5)}</span>}
                              </div>
                              {session.location && (
                                <p className="text-xs text-tertiary flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3" />
                                  {session.location}
                                </p>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-tertiary" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Upcoming Matches */}
                {upcomingMatches?.length > 1 && (
                  <div className="mb-3">
                    <p className="text-xs text-tertiary px-2 py-1 font-medium flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      MORE FIXTURES
                    </p>
                    {upcomingMatches.slice(1, 4).map(match => (
                      <button
                        key={match.id}
                        onClick={() => {
                          setSelectedMatch(match)
                          setShowNotifications(false)
                        }}
                        className="w-full p-3 rounded-lg hover:bg-subtle text-left transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-energy-500/20 flex items-center justify-center">
                            <Trophy className="w-4 h-4 text-energy-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">
                              V {match.opponent}
                            </p>
                            <p className="text-xs text-secondary">{formatDate(match.date)}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-tertiary" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Regular Announcements */}
                {announcements?.filter(a => a.priority !== 'urgent' && a.priority !== 'high').length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-tertiary px-2 py-1 font-medium flex items-center gap-1">
                      <Megaphone className="w-3 h-3" />
                      ANNOUNCEMENTS
                    </p>
                    {announcements.filter(a => a.priority !== 'urgent' && a.priority !== 'high').slice(0, 3).map(announcement => (
                      <div
                        key={announcement.id}
                        className="p-3 rounded-lg hover:bg-subtle transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-pitch-500/20 flex items-center justify-center flex-shrink-0">
                            <Megaphone className="w-4 h-4 text-pitch-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium">{announcement.title}</p>
                            <p className="text-xs text-secondary line-clamp-2 mt-0.5">{announcement.content}</p>
                            <p className="text-xs text-tertiary mt-1">
                              {new Date(announcement.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {(!upcomingMatches || upcomingMatches.length === 0) &&
                 (!upcomingTraining || upcomingTraining.length === 0) &&
                 (!announcements || announcements.length === 0) &&
                 (!squadNotifications || squadNotifications.length === 0) && (
                  <div className="p-6 text-center">
                    <Bell className="w-8 h-8 text-tertiary mx-auto mb-2" />
                    <p className="text-sm text-secondary">No new notifications</p>
                    <p className="text-xs text-tertiary mt-1">You're all caught up!</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Match Detail Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card p-6 max-w-md w-full max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-xl text-white">
                {selectedMatch.goals_for !== null && selectedMatch.goals_for !== undefined ? 'Match Recap' : 'Match Details'}
              </h3>
              <button onClick={() => setSelectedMatch(null)} className="text-secondary hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Match Info */}
            <div className="space-y-4">
              {/* PAST MATCH VIEW */}
              {selectedMatch.goals_for !== null && selectedMatch.goals_for !== undefined ? (
                <>
                  {/* Result Header */}
                  <div className={`text-center p-4 rounded-xl ${
                    selectedMatch.goals_for > selectedMatch.goals_against ? 'bg-pitch-500/20 border border-pitch-500/30' :
                    selectedMatch.goals_for < selectedMatch.goals_against ? 'bg-alert-500/20 border border-alert-500/30' :
                    'bg-caution-500/20 border border-caution-500/30'
                  }`}>
                    <p className="text-sm text-secondary mb-1">
                      {selectedMatch.is_home ? 'HOME' : 'AWAY'} • {formatDate(selectedMatch.date)}
                    </p>
                    <h4 className="font-display text-xl font-bold text-white mb-2">
                      V {selectedMatch.opponent}
                    </h4>
                    <div className="flex items-center justify-center gap-4 my-3">
                      <span className="text-4xl font-display font-bold text-white">
                        {selectedMatch.goals_for}
                      </span>
                      <span className="text-2xl text-tertiary">-</span>
                      <span className="text-4xl font-display font-bold text-white">
                        {selectedMatch.goals_against}
                      </span>
                    </div>
                    <p className={`text-sm font-semibold ${
                      selectedMatch.goals_for > selectedMatch.goals_against ? 'text-pitch-400' :
                      selectedMatch.goals_for < selectedMatch.goals_against ? 'text-alert-400' : 'text-caution-400'
                    }`}>
                      {selectedMatch.goals_for > selectedMatch.goals_against ? '🏆 Victory!' :
                       selectedMatch.goals_for < selectedMatch.goals_against ? 'Defeat' : 'Draw'}
                    </p>
                  </div>

                  {/* Match Videos */}
                  {(selectedMatch.veo_link || selectedMatch.video_url) && (
                    <div className="space-y-2">
                      <p className="text-sm text-secondary font-medium flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        Match Video
                      </p>
                      {selectedMatch.veo_link && (
                        <a
                          href={selectedMatch.veo_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-subtle rounded-lg hover:bg-subtle transition-colors"
                        >
                          <div className="w-10 h-10 bg-pitch-500/20 rounded-lg flex items-center justify-center">
                            <Play className="w-5 h-5 text-pitch-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium">Match Video</p>
                            <p className="text-xs text-secondary">Watch the full match</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-tertiary" />
                        </a>
                      )}
                      {selectedMatch.video_url && (
                        <a
                          href={selectedMatch.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-subtle rounded-lg hover:bg-subtle transition-colors"
                        >
                          <div className="w-10 h-10 bg-energy-500/20 rounded-lg flex items-center justify-center">
                            <Video className="w-5 h-5 text-energy-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium">Match Video</p>
                            <p className="text-xs text-secondary">Coach uploaded video</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-tertiary" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Match Photos */}
                  {loadingMatchMedia ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-secondary" />
                    </div>
                  ) : selectedMatchMedia.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-secondary font-medium flex items-center gap-2">
                          <Camera className="w-4 h-4" />
                          Photos & Media ({selectedMatchMedia.length})
                        </p>
                        <button
                          onClick={() => handleShareMedia(selectedMatchMedia, selectedMatch.opponent)}
                          className="text-xs text-pitch-400 hover:text-pitch-300 flex items-center gap-1"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          Share
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedMatchMedia.slice(0, 6).map((media, idx) => {
                          const mediaUrl = (() => { const u = media.file_path || media.file_url || media.url; return u?.startsWith('http') ? u : `${SERVER_URL}${u}`; })()
                          const isOwn = media.uploaded_by === user?.id
                          return (
                            <div key={media.id || idx} className="relative aspect-square rounded-lg overflow-hidden bg-subtle group">
                              <button onClick={() => setLightboxUrl(mediaUrl)} className="block w-full h-full hover:opacity-80 transition-opacity text-left">
                                {media.media_type === 'video' ? (
                                  <div className="relative w-full h-full bg-subtle">
                                    <video src={`${mediaUrl}#t=0.5`} preload="metadata" muted className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                                        <Play className="w-5 h-5 text-white ml-0.5" />
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <img src={mediaUrl} alt={media.caption || 'Match photo'} className="w-full h-full object-cover" />
                                )}
                              </button>
                              {isOwn && (
                                <button
                                  onClick={() => handleDeleteMedia(selectedMatch.id, media.id)}
                                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-alert-600"
                                >
                                  <X className="w-3.5 h-3.5 text-white" />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      {selectedMatchMedia.length > 6 && (
                        <p className="text-xs text-tertiary text-center mt-2">
                          +{selectedMatchMedia.length - 6} more
                        </p>
                      )}
                    </div>
                  )}

                  {/* Coach Notes */}
                  {selectedMatch.notes && (
                    <div className="p-3 bg-subtle rounded-lg">
                      <p className="text-sm text-secondary mb-1 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Coach's Notes
                      </p>
                      <p className="text-white">{selectedMatch.notes}</p>
                    </div>
                  )}

                  {/* Match Squad */}
                  {loadingMatchSquad ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-secondary" />
                    </div>
                  ) : matchSquad.length > 0 && (
                    <div className="p-4 bg-gradient-to-br from-pitch-900/20 to-navy-800/50 rounded-xl border border-pitch-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-5 h-5 text-pitch-400" />
                        <h4 className="font-display font-semibold text-white">Match Squad</h4>
                      </div>

                      {/* Starting XI */}
                      {matchSquad.filter(p => p.is_starting).length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-pitch-400 uppercase tracking-wider mb-2">Starting XI</p>
                          <div className="space-y-1">
                            {matchSquad.filter(p => p.is_starting).map(p => (
                              <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 bg-subtle/40 rounded-lg">
                                {p.squad_number && (
                                  <span className="w-6 h-6 flex items-center justify-center bg-pitch-500/20 text-pitch-400 text-xs font-bold rounded-full">
                                    {p.squad_number}
                                  </span>
                                )}
                                <span className="text-white text-sm font-medium flex-1">{p.player_name}</span>
                                {p.position && (
                                  <span className="text-xs text-secondary bg-subtle/60 px-2 py-0.5 rounded">{p.position}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Substitutes */}
                      {matchSquad.filter(p => !p.is_starting).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Substitutes</p>
                          <div className="space-y-1">
                            {matchSquad.filter(p => !p.is_starting).map(p => (
                              <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 bg-subtle/20 rounded-lg">
                                {p.squad_number && (
                                  <span className="w-6 h-6 flex items-center justify-center bg-border-default/50 text-secondary text-xs font-bold rounded-full">
                                    {p.squad_number}
                                  </span>
                                )}
                                <span className="text-secondary text-sm font-medium flex-1">{p.player_name}</span>
                                {p.position && (
                                  <span className="text-xs text-tertiary bg-subtle/60 px-2 py-0.5 rounded">{p.position}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Match Report (only show if published by coach) */}
                  {selectedMatch.report?.generated && selectedMatch.report?.published && (
                    <div className="p-5 bg-subtle rounded-xl">
                      <div className="flex items-center gap-2 mb-4">
                        <FileText className="w-6 h-6 text-pitch-400" />
                        <p className="font-display font-bold text-lg text-white">Match Report</p>
                      </div>
                      <AIMarkdown>{selectedMatch.report.generated}</AIMarkdown>
                    </div>
                  )}

                  {/* Parent POTM Voting */}
                  {teamSquad.length > 0 && (
                    <div className="p-4 bg-gradient-to-br from-energy-900/30 to-navy-800/50 rounded-xl border border-energy-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Heart className="w-5 h-5 text-energy-400" />
                        <h4 className="font-display font-semibold text-white">Parents' Pupil of the Match</h4>
                      </div>
                      {parentVoteData?.my_vote ? (
                        <div className="space-y-3">
                          <p className="text-sm text-secondary">
                            You voted for <span className="text-energy-400 font-medium">
                              {teamSquad.find(p => p.id === parentVoteData.my_vote)?.name || 'a pupil'}
                            </span>
                          </p>
                          <p className="text-xs text-tertiary">{parentVoteData.total_votes} vote{parentVoteData.total_votes !== 1 ? 's' : ''} cast so far</p>
                          <button
                            onClick={() => {
                              setParentVoteData(prev => prev ? { ...prev, my_vote: null } : null)
                              setVotingPlayerId(null)
                            }}
                            className="text-xs text-secondary hover:text-energy-400 transition-colors"
                          >
                            Change vote
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-secondary mb-2">Who stood out today? Cast your vote!</p>
                          <select
                            value={votingPlayerId || ''}
                            onChange={(e) => setVotingPlayerId(e.target.value)}
                            className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-white text-sm focus:border-energy-500 focus:outline-none"
                          >
                            <option value="">Select a pupil...</option>
                            {teamSquad
                              .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                              .map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name}{p.squad_number ? ` (#${p.squad_number})` : ''}
                                </option>
                              ))
                            }
                          </select>
                          <button
                            onClick={() => votingPlayerId && handleParentPotmVote(selectedMatch.id, votingPlayerId)}
                            disabled={!votingPlayerId || submittingVote}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-energy-500 text-navy-950 rounded-lg text-sm font-medium hover:bg-energy-600 transition-colors disabled:opacity-50"
                          >
                            {submittingVote ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Heart className="w-4 h-4" />
                            )}
                            Cast Vote
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Add Photos Button */}
                  <button
                    onClick={() => {
                      setShowMediaUpload(selectedMatch.id)
                      setSelectedMatch(null)
                    }}
                    className="w-full btn-secondary py-3 flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Add Your Photos
                  </button>
                </>
              ) : (
                /* UPCOMING MATCH VIEW */
                <>
                  {/* Opponent */}
                  <div className="text-center p-4 bg-subtle rounded-xl">
                    <p className="text-sm text-secondary mb-1">
                      {selectedMatch.is_home ? 'HOME' : 'AWAY'} MATCH
                    </p>
                    <h4 className="font-display text-2xl font-bold text-white">
                      V {selectedMatch.opponent}
                    </h4>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-center gap-3 p-3 bg-subtle rounded-lg">
                    <Calendar className="w-5 h-5 text-pitch-400" />
                    <div>
                      <p className="text-white font-medium">{formatDate(selectedMatch.date)}</p>
                      {selectedMatch.date && new Date(selectedMatch.date).getHours() !== 0 && (
                        <p className="text-sm text-secondary">
                          Kick-off: {new Date(selectedMatch.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  {selectedMatch.location && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(selectedMatch.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-subtle rounded-lg hover:bg-subtle transition-colors"
                    >
                      <MapPin className="w-5 h-5 text-pitch-400" />
                      <div className="flex-1">
                        <p className="text-white font-medium">{selectedMatch.location}</p>
                        <p className="text-xs text-pitch-400">Tap for directions</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-tertiary" />
                    </a>
                  )}

                  {/* Kit Color */}
                  {(selectedMatch.kit_type || selectedMatch.is_home !== undefined) && (
                    <div className="flex items-center gap-3 p-3 bg-subtle rounded-lg">
                      <Shield className="w-5 h-5 text-pitch-400" />
                      <div>
                        <p className="text-white font-medium">
                          {selectedMatch.kit_type
                            ? (selectedMatch.kit_type === 'third' ? '3rd Kit' : selectedMatch.kit_type.charAt(0).toUpperCase() + selectedMatch.kit_type.slice(1) + ' Kit')
                            : (selectedMatch.is_home ? 'Home Kit' : 'Away Kit')}
                        </p>
                        <p className="text-sm text-secondary">
                          Wear your {selectedMatch.kit_type
                            ? (selectedMatch.kit_type === 'third' ? '3rd' : selectedMatch.kit_type)
                            : (selectedMatch.is_home ? 'home' : 'away')} colours
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Meetup Info */}
                  {selectedMatch.meetup_time && (
                    <div className="flex items-center gap-3 p-3 bg-energy-500/10 border border-energy-500/30 rounded-lg">
                      <Clock className="w-5 h-5 text-energy-400" />
                      <div>
                        <p className="text-white font-medium">Meet at {new Date(selectedMatch.meetup_time).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        {selectedMatch.meetup_location && (
                          <p className="text-sm text-secondary">{selectedMatch.meetup_location}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedMatch.notes && (
                    <div className="p-3 bg-subtle rounded-lg">
                      <p className="text-sm text-secondary mb-1">Notes from coach:</p>
                      <p className="text-white">{selectedMatch.notes}</p>
                    </div>
                  )}

                  {/* Match Prep */}
                  {selectedMatch.prep_notes && typeof selectedMatch.prep_notes === 'string' && (
                    <div className="p-5 bg-pitch-500/10 border border-pitch-500/30 rounded-xl">
                      <div className="flex items-center gap-2 mb-4">
                        <FileText className="w-6 h-6 text-pitch-400" />
                        <p className="font-display font-bold text-lg text-pitch-400">Match Prep Notes</p>
                      </div>
                      <AIMarkdown>{selectedMatch.prep_notes}</AIMarkdown>
                    </div>
                  )}

                  {/* Match Squad */}
                  {loadingMatchSquad ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-secondary" />
                    </div>
                  ) : matchSquad.length > 0 && (
                    <div className="p-4 bg-gradient-to-br from-pitch-900/20 to-navy-800/50 rounded-xl border border-pitch-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-5 h-5 text-pitch-400" />
                        <h4 className="font-display font-semibold text-white">Match Squad</h4>
                      </div>

                      {/* Starting XI */}
                      {matchSquad.filter(p => p.is_starting).length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-pitch-400 uppercase tracking-wider mb-2">Starting XI</p>
                          <div className="space-y-1">
                            {matchSquad.filter(p => p.is_starting).map(p => (
                              <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 bg-subtle/40 rounded-lg">
                                {p.squad_number && (
                                  <span className="w-6 h-6 flex items-center justify-center bg-pitch-500/20 text-pitch-400 text-xs font-bold rounded-full">
                                    {p.squad_number}
                                  </span>
                                )}
                                <span className="text-white text-sm font-medium flex-1">{p.player_name}</span>
                                {p.position && (
                                  <span className="text-xs text-secondary bg-subtle/60 px-2 py-0.5 rounded">{p.position}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Substitutes */}
                      {matchSquad.filter(p => !p.is_starting).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Substitutes</p>
                          <div className="space-y-1">
                            {matchSquad.filter(p => !p.is_starting).map(p => (
                              <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 bg-subtle/20 rounded-lg">
                                {p.squad_number && (
                                  <span className="w-6 h-6 flex items-center justify-center bg-border-default/50 text-secondary text-xs font-bold rounded-full">
                                    {p.squad_number}
                                  </span>
                                )}
                                <span className="text-secondary text-sm font-medium flex-1">{p.player_name}</span>
                                {p.position && (
                                  <span className="text-xs text-tertiary bg-subtle/60 px-2 py-0.5 rounded">{p.position}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Availability */}
                  <div className="p-4 bg-subtle rounded-lg">
                    <p className="text-sm text-secondary mb-3">Your availability:</p>
                    <AvailabilityButtons
                      match={selectedMatch}
                      onUpdate={(matchId, availability) => {
                        handleAvailabilityUpdate(matchId, availability)
                        setSelectedMatch(prev => ({ ...prev, my_availability: availability }))
                      }}
                      updating={updatingAvailability === selectedMatch.id}
                    />
                  </div>

                  {/* Match Photos */}
                  {loadingMatchMedia ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-secondary" />
                    </div>
                  ) : selectedMatchMedia.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-secondary font-medium flex items-center gap-2">
                          <Camera className="w-4 h-4" />
                          Photos & Media ({selectedMatchMedia.length})
                        </p>
                        <button
                          onClick={() => handleShareMedia(selectedMatchMedia, selectedMatch.opponent)}
                          className="text-xs text-pitch-400 hover:text-pitch-300 flex items-center gap-1"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          Share
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedMatchMedia.slice(0, 6).map((media, idx) => {
                          const mediaUrl = (() => { const u = media.file_path || media.file_url || media.url; return u?.startsWith('http') ? u : `${SERVER_URL}${u}`; })()
                          const isOwn = media.uploaded_by === user?.id
                          return (
                            <div key={media.id || idx} className="relative aspect-square rounded-lg overflow-hidden bg-subtle group">
                              <button onClick={() => setLightboxUrl(mediaUrl)} className="block w-full h-full hover:opacity-80 transition-opacity text-left">
                                {media.media_type === 'video' ? (
                                  <div className="relative w-full h-full bg-subtle">
                                    <video src={`${mediaUrl}#t=0.5`} preload="metadata" muted className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                                        <Play className="w-5 h-5 text-white ml-0.5" />
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <img src={mediaUrl} alt={media.caption || 'Match photo'} className="w-full h-full object-cover" />
                                )}
                              </button>
                              {isOwn && (
                                <button
                                  onClick={() => handleDeleteMedia(selectedMatch.id, media.id)}
                                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-alert-600"
                                >
                                  <X className="w-3.5 h-3.5 text-white" />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      {selectedMatchMedia.length > 6 && (
                        <p className="text-xs text-tertiary text-center mt-2">
                          +{selectedMatchMedia.length - 6} more
                        </p>
                      )}
                    </div>
                  )}

                  {/* Add Photos Button */}
                  <button
                    onClick={() => {
                      setShowMediaUpload(selectedMatch.id)
                      setSelectedMatch(null)
                    }}
                    className="w-full btn-secondary py-3 flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Add Your Photos
                  </button>

                  {/* POTM Voting (match day) */}
                  {teamSquad.length > 0 && parentVoteData && (
                    <div className="p-4 bg-gradient-to-br from-energy-900/30 to-navy-800/50 rounded-xl border border-energy-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Heart className="w-5 h-5 text-energy-400" />
                        <h4 className="font-display font-semibold text-white">Parents' Pupil of the Match</h4>
                      </div>
                      {parentVoteData.my_vote ? (
                        <div className="space-y-3">
                          <p className="text-sm text-secondary">
                            You voted for <span className="text-energy-400 font-medium">
                              {teamSquad.find(p => p.id === parentVoteData.my_vote)?.name || 'a pupil'}
                            </span>
                          </p>
                          <p className="text-xs text-tertiary">{parentVoteData.total_votes} vote{parentVoteData.total_votes !== 1 ? 's' : ''} cast so far</p>
                          <button
                            onClick={() => {
                              setParentVoteData(prev => prev ? { ...prev, my_vote: null } : null)
                              setVotingPlayerId(null)
                            }}
                            className="text-xs text-secondary hover:text-energy-400 transition-colors"
                          >
                            Change vote
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-secondary mb-2">Who stood out today? Cast your vote!</p>
                          <select
                            value={votingPlayerId || ''}
                            onChange={(e) => setVotingPlayerId(e.target.value)}
                            className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-white text-sm focus:border-energy-500 focus:outline-none"
                          >
                            <option value="">Select a pupil...</option>
                            {teamSquad
                              .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                              .map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name}{p.squad_number ? ` (#${p.squad_number})` : ''}
                                </option>
                              ))
                            }
                          </select>
                          <button
                            onClick={() => votingPlayerId && handleParentPotmVote(selectedMatch.id, votingPlayerId)}
                            disabled={!votingPlayerId || submittingVote}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-energy-500 text-navy-950 rounded-lg text-sm font-medium hover:bg-energy-600 transition-colors disabled:opacity-50"
                          >
                            {submittingVote ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Heart className="w-4 h-4" />
                            )}
                            Cast Vote
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pep Talk Button */}
                  <button
                    onClick={() => {
                      handleGetPepTalk(selectedMatch.id)
                      setSelectedMatch(null)
                    }}
                    disabled={loadingPepTalk}
                    className="w-full btn-primary bg-gradient-to-r from-energy-600 to-alert-600 hover:from-energy-500 hover:to-alert-500 py-3"
                  >
                    {loadingPepTalk ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Flame className="w-5 h-5" />
                    )}
                    Get Pre-Match Pep Talk
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Training Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card p-6 max-w-md w-full max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-xl text-white">Session Details</h3>
              <button onClick={() => setSelectedSession(null)} className="text-secondary hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Session Header */}
              <div className={`text-center p-4 rounded-xl ${
                selectedSession.session_type === 's&c'
                  ? 'bg-energy-500/20 border border-energy-500/30'
                  : 'bg-pitch-500/20 border border-pitch-500/30'
              }`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  {selectedSession.session_type === 's&c' ? (
                    <Dumbbell className="w-6 h-6 text-energy-400" />
                  ) : (
                    <Target className="w-6 h-6 text-pitch-400" />
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedSession.session_type === 's&c'
                      ? 'bg-energy-500/30 text-energy-300'
                      : 'bg-pitch-500/30 text-pitch-300'
                  }`}>
                    {selectedSession.session_type === 's&c' ? 'S&C SESSION' : 'TRAINING'}
                  </span>
                </div>
                <h4 className="font-display text-xl font-bold text-white">
                  {selectedSession.session_type === 's&c'
                    ? 'Strength & Conditioning'
                    : (selectedSession.focus_areas?.length > 0 ? selectedSession.focus_areas.join(', ') : 'Training Session')}
                </h4>
              </div>

              {/* Date & Time */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-subtle rounded-lg">
                  <div className="w-10 h-10 bg-border-default/50 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{formatDate(selectedSession.date)}</p>
                    <p className="text-xs text-secondary">
                      {new Date(selectedSession.date).toLocaleDateString('en-GB', { weekday: 'long' })}
                    </p>
                  </div>
                </div>

                {selectedSession.time && (
                  <div className="flex items-center gap-3 p-3 bg-subtle rounded-lg">
                    <div className="w-10 h-10 bg-border-default/50 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{formatTime(selectedSession.time)}</p>
                      {selectedSession.duration && (
                        <p className="text-xs text-secondary">{selectedSession.duration} minutes</p>
                      )}
                    </div>
                  </div>
                )}

                {selectedSession.location && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(selectedSession.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-subtle rounded-lg hover:bg-subtle transition-colors"
                  >
                    <div className="w-10 h-10 bg-border-default/50 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{selectedSession.location}</p>
                      <p className="text-xs text-secondary">Tap for directions</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-tertiary" />
                  </a>
                )}
              </div>

              {/* Focus Areas (for training sessions) */}
              {selectedSession.session_type !== 's&c' && selectedSession.focus_areas?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-secondary font-medium">Focus Areas</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedSession.focus_areas.map((area, i) => (
                      <span key={i} className="px-3 py-1 bg-pitch-500/20 text-pitch-300 rounded-full text-sm">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Availability */}
              <div className="space-y-2">
                <p className="text-sm text-secondary font-medium flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Your Availability
                </p>
                <div className="flex gap-2">
                  <AvailabilityButtons
                    match={selectedSession}
                    onUpdate={(id, status) => handleTrainingAvailabilityUpdate(id, status)}
                    updating={updatingTrainingAvailability === selectedSession.id}
                  />
                  <span className="text-sm text-secondary self-center ml-2">
                    {selectedSession.my_availability
                      ? selectedSession.my_availability === 'available' ? 'Confirmed'
                        : selectedSession.my_availability === 'unavailable' ? 'Not available'
                        : 'Maybe'
                      : 'Not responded'}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {selectedSession.notes && (
                <div className="space-y-2">
                  <p className="text-sm text-secondary font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Session Notes
                  </p>
                  <div className="p-3 bg-subtle rounded-lg">
                    <p className="text-white text-sm">{selectedSession.notes}</p>
                  </div>
                </div>
              )}

              {/* Training Plan (when shared by coach) */}
              {selectedSession.plan && Object.keys(selectedSession.plan).length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-secondary font-medium flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Training Plan
                  </p>
                  <div className="space-y-3">
                    {typeof selectedSession.plan === 'string' ? (
                      <AIMarkdown>{selectedSession.plan}</AIMarkdown>
                    ) : (
                      <>
                        {selectedSession.plan.warmUp && (
                          <div className="p-3 bg-subtle rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-pitch-400 font-medium text-sm">Warm-up</span>
                              {selectedSession.plan.warmUp.duration && (
                                <span className="text-xs text-tertiary">{selectedSession.plan.warmUp.duration} mins</span>
                              )}
                            </div>
                            <p className="text-white text-sm">{selectedSession.plan.warmUp.activity || selectedSession.plan.warmUp.description}</p>
                            {selectedSession.plan.warmUp.diagram && (selectedSession.plan.warmUp.diagram.pupils?.length > 0 || selectedSession.plan.warmUp.diagram.cones?.length > 0) && (
                              <div className="mt-3"><DrillDiagram diagram={selectedSession.plan.warmUp.diagram} /></div>
                            )}
                            {selectedSession.plan.warmUp.coachingPoints && (
                              <p className="text-xs text-secondary mt-2 italic">Tips: {selectedSession.plan.warmUp.coachingPoints}</p>
                            )}
                          </div>
                        )}
                        {selectedSession.plan.technical && (
                          <div className="p-3 bg-subtle rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-pitch-400 font-medium text-sm">Technical Drill</span>
                              {selectedSession.plan.technical.duration && (
                                <span className="text-xs text-tertiary">{selectedSession.plan.technical.duration} mins</span>
                              )}
                            </div>
                            <p className="text-white text-sm">{selectedSession.plan.technical.activity || selectedSession.plan.technical.description}</p>
                            {selectedSession.plan.technical.diagram && (selectedSession.plan.technical.diagram.pupils?.length > 0 || selectedSession.plan.technical.diagram.cones?.length > 0) && (
                              <div className="mt-3"><DrillDiagram diagram={selectedSession.plan.technical.diagram} /></div>
                            )}
                            {selectedSession.plan.technical.coachingPoints && (
                              <p className="text-xs text-secondary mt-2 italic">Tips: {selectedSession.plan.technical.coachingPoints}</p>
                            )}
                          </div>
                        )}
                        {selectedSession.plan.tactical && (
                          <div className="p-3 bg-subtle rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-pitch-400 font-medium text-sm">Tactical Exercise</span>
                              {selectedSession.plan.tactical.duration && (
                                <span className="text-xs text-tertiary">{selectedSession.plan.tactical.duration} mins</span>
                              )}
                            </div>
                            <p className="text-white text-sm">{selectedSession.plan.tactical.activity || selectedSession.plan.tactical.description}</p>
                            {selectedSession.plan.tactical.diagram && (selectedSession.plan.tactical.diagram.pupils?.length > 0 || selectedSession.plan.tactical.diagram.cones?.length > 0) && (
                              <div className="mt-3"><DrillDiagram diagram={selectedSession.plan.tactical.diagram} /></div>
                            )}
                            {selectedSession.plan.tactical.coachingPoints && (
                              <p className="text-xs text-secondary mt-2 italic">Tips: {selectedSession.plan.tactical.coachingPoints}</p>
                            )}
                          </div>
                        )}
                        {selectedSession.plan.game && (
                          <div className="p-3 bg-subtle rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-pitch-400 font-medium text-sm">Match Practice</span>
                              {selectedSession.plan.game.duration && (
                                <span className="text-xs text-tertiary">{selectedSession.plan.game.duration} mins</span>
                              )}
                            </div>
                            <p className="text-white text-sm">{selectedSession.plan.game.activity || selectedSession.plan.game.description}</p>
                            {selectedSession.plan.game.coachingPoints && (
                              <p className="text-xs text-secondary mt-2 italic">Tips: {selectedSession.plan.game.coachingPoints}</p>
                            )}
                          </div>
                        )}
                        {selectedSession.plan.coolDown && (
                          <div className="p-3 bg-subtle rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-pitch-400 font-medium text-sm">Cool-down</span>
                              {selectedSession.plan.coolDown.duration && (
                                <span className="text-xs text-tertiary">{selectedSession.plan.coolDown.duration} mins</span>
                              )}
                            </div>
                            <p className="text-white text-sm">{selectedSession.plan.coolDown.activity || selectedSession.plan.coolDown.description}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* What to Bring Reminder */}
              <div className="p-4 bg-subtle rounded-lg border border-border-strong">
                <p className="text-sm text-secondary font-medium mb-2">Remember to bring:</p>
                <ul className="text-sm text-white space-y-1">
                  {selectedSession.session_type === 's&c' ? (
                    <>
                      <li>• Training kit</li>
                      <li>• Water bottle</li>
                      <li>• Trainers</li>
                    </>
                  ) : selectedSession.venue_type === 'indoor' ? (
                    <>
                      <li>• Full training kit</li>
                      <li>• Trainers (indoor)</li>
                      <li>• Shin pads</li>
                      <li>• Water bottle</li>
                    </>
                  ) : (
                    <>
                      <li>• Full training kit</li>
                      <li>• Boots (studs/moulded)</li>
                      <li>• Shin pads</li>
                      <li>• Water bottle</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Badges Detail Modal */}
      {showBadgesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-xl text-white flex items-center gap-2">
                <Star className="w-6 h-6 text-energy-400" />
                My Badges & Achievements
              </h3>
              <button onClick={() => setShowBadgesModal(false)} className="text-secondary hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Combined Achievements + POTM */}
            <div className="space-y-4">
              {/* Stats Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-energy-900/40 to-navy-900 rounded-xl p-4 text-center border border-energy-500/20">
                  <div className="text-3xl font-bold text-energy-400">{(achievements?.length || 0) + (potmAwards?.length || 0)}</div>
                  <div className="text-xs text-secondary mt-1">Total Awards</div>
                </div>
                <div className="bg-gradient-to-br from-caution-900/40 to-navy-900 rounded-xl p-4 text-center border border-caution-500/20">
                  <div className="text-3xl font-bold text-caution-400">{potmAwards?.length || 0}</div>
                  <div className="text-xs text-secondary mt-1 flex items-center justify-center gap-1">
                    <Award className="w-3 h-3" /> POTM
                  </div>
                </div>
              </div>

              {/* POTM Awards */}
              {potmAwards?.length > 0 && (
                <div>
                  <p className="text-sm text-secondary font-medium mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-energy-400" />
                    Pupil of the Match ({potmAwards.length})
                  </p>
                  <div className="space-y-2">
                    {potmAwards.map((award, i) => (
                      <div
                        key={i}
                        className="bg-gradient-to-r from-energy-900/30 to-navy-900 rounded-lg p-3 border border-energy-500/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-energy-500/20 flex items-center justify-center text-xl">
                            ⭐
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium">vs {award.opponent}</p>
                            <p className="text-xs text-secondary">{new Date(award.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            {award.reason && (
                              <p className="text-xs text-energy-300 mt-1 italic">"{award.reason}"</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Achievements */}
              {achievements?.length > 0 && (
                <div>
                  <p className="text-sm text-secondary font-medium mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4 text-pitch-400" />
                    Badges & Awards ({achievements.length})
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {achievements.map(achievement => (
                      <div
                        key={achievement.id}
                        className="bg-gradient-to-br from-navy-800 to-navy-900 rounded-xl p-4 text-center border border-border-strong"
                      >
                        <div className="text-3xl mb-2">{achievement.icon}</div>
                        <p className="text-sm font-medium text-white">{achievement.title}</p>
                        {achievement.description && (
                          <p className="text-xs text-secondary mt-1">{achievement.description}</p>
                        )}
                        <p className="text-xs text-tertiary mt-2">
                          {new Date(achievement.earned_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {achievement.match_opponent && (
                          <p className="text-xs text-pitch-400 mt-1">vs {achievement.match_opponent}</p>
                        )}
                        {achievement.training_date && (
                          <p className="text-xs text-energy-400 mt-1">Training Session</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {(!achievements || achievements.length === 0) && (!potmAwards || potmAwards.length === 0) && (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 text-tertiary mx-auto mb-3" />
                  <p className="text-secondary">No badges yet</p>
                  <p className="text-xs text-tertiary mt-1">Keep working hard - your first badge is coming!</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Chat Modal - Gaffer AI Assistant (only if not disabled by parent) */}
      <AnimatePresence>
        {showChatModal && !gafferDisabled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setShowChatModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card w-full max-w-lg h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Chat Header */}
              <div className="p-4 border-b border-border-default bg-gradient-to-r from-pitch-900/50 via-energy-900/30 to-navy-900 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pitch-500 to-energy-500 flex items-center justify-center shadow-lg shadow-pitch-500/20">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display font-bold text-white">The Gaffer</h2>
                        <span className="px-2 py-0.5 bg-pitch-500/20 text-pitch-400 text-xs rounded-full font-medium">AI</span>
                      </div>
                      <p className="text-xs text-secondary">Your personal football coach</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowChatModal(false)}
                    className="p-2 text-secondary hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingChat ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-pitch-400" />
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pitch-500/20 to-energy-500/20 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-8 h-8 text-pitch-400" />
                    </div>
                    <h3 className="font-display font-semibold text-white mb-2">Ask the Gaffer!</h3>
                    <p className="text-secondary text-sm mb-4">
                      I know everything about your training, matches, and development. Ask me anything!
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {[
                        'How can I improve my positioning?',
                        'What should I work on?',
                        'Tips for my next match?',
                      ].map(suggestion => (
                        <button
                          key={suggestion}
                          onClick={() => setChatInput(suggestion)}
                          className="text-xs bg-subtle text-secondary px-3 py-1.5 rounded-full hover:bg-border-default transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-3 rounded-2xl ${
                          msg.role === 'user'
                            ? 'bg-pitch-600 text-white rounded-br-md'
                            : 'bg-subtle text-primary rounded-bl-md'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <AIMarkdown variant="chat">{msg.content}</AIMarkdown>
                        ) : (
                          <p className="text-sm">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {sendingMessage && (
                  <div className="flex justify-start">
                    <div className="bg-subtle p-3 rounded-2xl rounded-bl-md">
                      <Loader2 className="w-5 h-5 animate-spin text-pitch-400" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-border-default">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Ask the Gaffer..."
                    className="input flex-1"
                    disabled={sendingMessage}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || sendingMessage}
                    className="btn-primary px-4"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parent Settings Modal */}
      <AnimatePresence>
        {showSettings && user?.role === 'parent' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="card p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-pitch-400" />
                  Parent Settings
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 text-secondary hover:text-white rounded-lg hover:bg-subtle"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Gaffer Toggle */}
                <div className="bg-subtle rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-pitch-400" />
                        <span className="font-medium text-white">The Gaffer AI Assistant</span>
                      </div>
                      <p className="text-sm text-secondary">
                        {gafferDisabled
                          ? "The Gaffer is currently disabled. Your child cannot access the AI coaching assistant."
                          : "The Gaffer provides age-appropriate coaching guidance and motivation to help your child develop."}
                      </p>
                    </div>
                    <button
                      onClick={toggleGafferStatus}
                      disabled={togglingGaffer}
                      className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                        togglingGaffer ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {togglingGaffer ? (
                        <Loader2 className="w-6 h-6 animate-spin text-secondary" />
                      ) : gafferDisabled ? (
                        <ToggleLeft className="w-8 h-8 text-tertiary" />
                      ) : (
                        <ToggleRight className="w-8 h-8 text-pitch-400" />
                      )}
                    </button>
                  </div>
                  <div className={`mt-3 text-xs px-2 py-1 rounded inline-block ${
                    gafferDisabled
                      ? 'bg-alert-500/20 text-alert-400'
                      : 'bg-pitch-500/20 text-pitch-400'
                  }`}>
                    {gafferDisabled ? 'Disabled' : 'Enabled'}
                  </div>
                </div>

                {/* Info note */}
                <div className="bg-subtle rounded-lg p-3 flex gap-3">
                  <Shield className="w-5 h-5 text-tertiary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-secondary">
                    As a parent, you can control your child's access to The Gaffer AI assistant.
                    All AI interactions are logged and can be reviewed in your parent dashboard.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border-default">
                <button
                  onClick={() => setShowSettings(false)}
                  className="btn-secondary w-full"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestion Modal */}
      <AnimatePresence>
        {showSuggestionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setShowSuggestionModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-blue-400" />
                  Make a Suggestion
                </h2>
                <button
                  onClick={() => setShowSuggestionModal(false)}
                  className="p-2 text-secondary hover:text-white rounded-lg hover:bg-subtle"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitSuggestion} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Category</label>
                  <select
                    value={suggestionForm.category}
                    onChange={e => setSuggestionForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="training">Training</option>
                    <option value="communication">Communication</option>
                    <option value="equipment">Equipment</option>
                    <option value="schedule">Schedule</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Title</label>
                  <input
                    type="text"
                    value={suggestionForm.title}
                    onChange={e => setSuggestionForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Brief summary of your suggestion"
                    className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-white placeholder-navy-500 focus:outline-none focus:border-blue-500"
                    maxLength={255}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Your Suggestion</label>
                  <textarea
                    value={suggestionForm.content}
                    onChange={e => setSuggestionForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Share your idea or feedback in detail..."
                    rows={4}
                    className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-white placeholder-navy-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-subtle rounded-lg">
                  <div className="flex items-center gap-2">
                    {suggestionForm.is_anonymous ? (
                      <EyeOff className="w-4 h-4 text-secondary" />
                    ) : (
                      <Eye className="w-4 h-4 text-blue-400" />
                    )}
                    <span className="text-sm text-secondary">Submit anonymously</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSuggestionForm(prev => ({ ...prev, is_anonymous: !prev.is_anonymous }))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      suggestionForm.is_anonymous ? 'bg-blue-500' : 'bg-navy-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        suggestionForm.is_anonymous ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSuggestionModal(false)}
                    className="flex-1 px-4 py-2 bg-subtle text-secondary rounded-lg hover:bg-border-default transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSuggestion || !suggestionForm.title.trim() || !suggestionForm.content.trim()}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submittingSuggestion ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* My Previous Suggestions */}
              {mySuggestions.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border-default">
                  <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-secondary" />
                    Your Previous Suggestions
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {mySuggestions.map(suggestion => (
                      <div
                        key={suggestion.id}
                        className="p-3 bg-subtle rounded-lg"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{suggestion.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                suggestion.status === 'pending' ? 'bg-caution-500/20 text-caution-400' :
                                suggestion.status === 'in_review' ? 'bg-blue-500/20 text-blue-400' :
                                suggestion.status === 'acknowledged' ? 'bg-pitch-500/20 text-pitch-400' :
                                suggestion.status === 'implemented' ? 'bg-energy-500/20 text-energy-400' :
                                'bg-navy-600 text-secondary'
                              }`}>
                                {suggestion.status === 'in_review' ? 'In Review' :
                                 suggestion.status.charAt(0).toUpperCase() + suggestion.status.slice(1)}
                              </span>
                              <span className="text-xs text-tertiary">
                                {new Date(suggestion.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                          </div>
                        </div>
                        {suggestion.coach_response && (
                          <div className="mt-2 p-2 bg-card/50 rounded text-xs">
                            <p className="text-secondary mb-1">Coach response:</p>
                            <p className="text-secondary">{suggestion.coach_response}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loadingSuggestions && (
                <div className="mt-4 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-secondary mx-auto" />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Chat Widget for app guidance */}
      <HelpChatWidget userRole={user?.role || 'pupil'} />
    </div>
  )
}

// Availability buttons component
function AvailabilityButtons({ match, onUpdate, updating }) {
  const options = [
    { value: 'available', icon: CheckCircle, color: 'pitch', label: 'Yes' },
    { value: 'unavailable', icon: XCircle, color: 'alert', label: 'No' },
    { value: 'maybe', icon: HelpCircle, color: 'caution', label: 'Maybe' },
  ]

  return (
    <div className="flex gap-1">
      {options.map(opt => {
        const Icon = opt.icon
        const isSelected = match.my_availability === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onUpdate(match.id, opt.value)}
            disabled={updating}
            className={`p-2 rounded-lg transition-colors ${
              isSelected
                ? `bg-${opt.color}-500/20 text-${opt.color}-400 border border-${opt.color}-500/50`
                : 'bg-subtle text-tertiary hover:text-secondary border border-transparent'
            }`}
            title={opt.label}
          >
            {updating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Icon className="w-4 h-4" />
            )}
          </button>
        )
      })}
    </div>
  )
}

// Result badge component - calculates from goals
function ResultBadge({ goalsFor, goalsAgainst }) {
  const config = {
    W: { bg: 'bg-pitch-500/20', text: 'text-pitch-400', label: 'W' },
    L: { bg: 'bg-alert-500/20', text: 'text-alert-400', label: 'L' },
    D: { bg: 'bg-navy-600/50', text: 'text-secondary', label: 'D' },
  }
  const resultKey = goalsFor > goalsAgainst ? 'W' : goalsFor < goalsAgainst ? 'L' : 'D'
  const cfg = config[resultKey]
  return (
    <span className={`w-7 h-7 rounded-lg ${cfg.bg} ${cfg.text} flex items-center justify-center text-xs font-bold`}>
      {cfg.label}
    </span>
  )
}

// Circle icon fallback
function Circle(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}

// Match countdown component
function MatchCountdown({ date }) {
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    function updateCountdown() {
      const now = new Date()
      const matchDate = new Date(date)
      const diff = matchDate - now

      if (diff < 0) {
        setCountdown('Match day!')
        return
      }

      // Use calendar days for intuitive day counting
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfMatchDay = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate())
      const calendarDays = Math.round((startOfMatchDay - startOfToday) / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      if (calendarDays > 0) {
        setCountdown(`${calendarDays}d ${hours}h`)
      } else if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m`)
      } else {
        setCountdown(`${minutes}m`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [date])

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-energy-500/20 border border-energy-500/30">
      <Clock className="w-4 h-4 text-energy-400" />
      <span className="text-sm font-bold text-energy-400">{countdown}</span>
    </div>
  )
}

// Schedule Calendar Component
function ScheduleCalendar({ currentMonth, onMonthChange, matches, recentMatches, training, onSelectMatch, teamName }) {
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get first day of week offset (Monday = 0)
  const startDayOfWeek = (monthStart.getDay() + 6) % 7

  // Combine all events
  const allMatches = [...(matches || []), ...(recentMatches || [])]

  function getEventsForDay(day) {
    const events = []

    // Check matches
    allMatches.forEach(match => {
      const matchDate = new Date(match.date)
      if (isSameDay(matchDate, day)) {
        events.push({
          type: 'match',
          data: match,
          isPast: match.goals_for !== null && match.goals_for !== undefined,
          sortTime: matchDate.getTime()
        })
      }
    })

    // Check training
    training?.forEach(session => {
      const sessionDate = new Date(session.date)
      if (isSameDay(sessionDate, day)) {
        events.push({
          type: session.session_type === 's&c' ? 'sc' : 'training',
          data: session,
          sortTime: sessionDate.getTime()
        })
      }
    })

    // Sort chronologically by time
    return events.sort((a, b) => a.sortTime - b.sortTime)
  }

  // Helper to format event time
  function formatEventTime(dateStr) {
    const date = new Date(dateStr)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    if (hours === 0 && minutes === 0) return null // No time set
    return format(date, 'HH:mm')
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="p-2 text-secondary hover:text-white rounded-lg hover:bg-subtle transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-display font-semibold text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="p-2 text-secondary hover:text-white rounded-lg hover:bg-subtle transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Week Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-tertiary py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for offset */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[70px]" />
        ))}

        {/* Day cells */}
        {days.map(day => {
          const events = getEventsForDay(day)
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isCurrentDay = isToday(day)

          return (
            <div
              key={day.toISOString()}
              onClick={() => {
                // If there's a match, open it
                const matchEvent = events.find(e => e.type === 'match')
                if (matchEvent) {
                  onSelectMatch(matchEvent.data)
                }
              }}
              className={`
                min-h-[70px] rounded-lg p-1 flex flex-col items-stretch transition-colors relative
                ${isCurrentDay ? 'bg-pitch-500/20 ring-2 ring-pitch-500' : ''}
                ${!isCurrentMonth ? 'opacity-30' : ''}
                ${events.length > 0 ? 'hover:bg-subtle cursor-pointer' : 'cursor-default'}
              `}
            >
              <span className={`text-xs font-medium text-center ${isCurrentDay ? 'text-pitch-400' : 'text-secondary'}`}>
                {format(day, 'd')}
              </span>

              {/* Event Details */}
              {events.length > 0 && (
                <div className="flex flex-col gap-0.5 mt-1 overflow-hidden">
                  {events.slice(0, 3).map((event, idx) => {
                    const time = formatEventTime(event.data.date)
                    return (
                      <div
                        key={idx}
                        className={`text-[9px] leading-tight px-1 py-0.5 rounded truncate ${
                          event.type === 'match'
                            ? event.isPast
                              ? 'bg-navy-600 text-secondary'
                              : 'bg-energy-500/30 text-energy-300'
                            : event.type === 'sc'
                              ? 'bg-caution-500/30 text-caution-300'
                              : 'bg-pitch-500/20 text-pitch-300'
                        }`}
                        title={
                          event.type === 'match'
                            ? `${time ? time + ' - ' : ''}vs ${event.data.opponent}`
                            : event.type === 'sc'
                              ? `${time ? time + ' - ' : ''}S&C`
                              : `${time ? time + ' - ' : ''}Training${event.data.focus_areas?.length ? ': ' + event.data.focus_areas.slice(0, 2).join(', ') : ''}`
                        }
                      >
                        {event.type === 'match' ? (
                          <>
                            {time && <span className="opacity-70">{time} </span>}
                            <span className="font-medium">vs {event.data.opponent?.split(' ')[0]}</span>
                          </>
                        ) : event.type === 'sc' ? (
                          <>
                            {time && <span className="opacity-70">{time} </span>}
                            <span className="font-medium">S&C</span>
                          </>
                        ) : (
                          <>
                            {time && <span className="opacity-70">{time} </span>}
                            <span className="font-medium">{event.data.focus_areas?.[0] || 'Training'}</span>
                          </>
                        )}
                      </div>
                    )
                  })}
                  {events.length > 3 && (
                    <span className="text-[8px] text-secondary text-center">+{events.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-border-default">
        <div className="flex items-center justify-center gap-4 flex-wrap mb-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-energy-400" />
            <span className="text-xs text-secondary">Match</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pitch-400" />
            <span className="text-xs text-secondary">Training</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-caution-400" />
            <span className="text-xs text-secondary">S&C</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-navy-500" />
            <span className="text-xs text-secondary">Past</span>
          </div>
        </div>

        {/* Export to Calendar */}
        {(matches?.length > 0 || training?.length > 0) && (
          <div className="flex justify-center">
            <button
              onClick={() => exportFullScheduleToCalendar(matches || [], training || [], teamName || 'Team')}
              className="btn-sm btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export to Calendar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Media upload modal component
function MediaUploadModal({ matchId, onClose, onUpload, uploading }) {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [previews, setPreviews] = useState([])

  function handleFileSelect(e) {
    const files = Array.from(e.target.files)
    setSelectedFiles(files)

    // Generate previews
    const newPreviews = files.map(file => ({
      name: file.name,
      type: file.type.startsWith('video/') ? 'video' : 'photo',
      url: URL.createObjectURL(file)
    }))
    setPreviews(newPreviews)
  }

  function handleSubmit() {
    if (selectedFiles.length > 0) {
      onUpload(matchId, selectedFiles)
    }
  }

  useEffect(() => {
    return () => {
      // Cleanup preview URLs
      previews.forEach(p => URL.revokeObjectURL(p.url))
    }
  }, [previews])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="card p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-pitch-400" />
            Upload Match Media
          </h3>
          <button onClick={onClose} className="text-secondary hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-secondary text-sm mb-4">
          Share your photos and videos from the match with the team!
        </p>

        {/* File input */}
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border-strong rounded-xl cursor-pointer hover:border-pitch-500/50 transition-colors">
          <Upload className="w-8 h-8 text-tertiary mb-2" />
          <span className="text-sm text-secondary">Click to select photos or videos</span>
          <span className="text-xs text-tertiary mt-1">Max 10 files, 100MB each</span>
          <input
            type="file"
            className="hidden"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
          />
        </label>

        {/* Preview selected files */}
        {previews.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-secondary mb-2">{previews.length} file(s) selected:</p>
            <div className="grid grid-cols-3 gap-2">
              {previews.map((preview, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-subtle">
                  {preview.type === 'photo' ? (
                    <img src={preview.url} alt={preview.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-8 h-8 text-tertiary" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={selectedFiles.length === 0 || uploading}
            className="btn-primary flex-1"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================
// Pupil Film Room - Educational video library
// =============================================

function PlayerFilmRoom({ userId }) {
  const [sections, setSections] = useState([])
  const [videos, setVideos] = useState([])
  const [activeSection, setActiveSection] = useState('all')
  const [loading, setLoading] = useState(true)
  const [playingVideo, setPlayingVideo] = useState(null)

  useEffect(() => {
    Promise.all([
      libraryService.getSections(),
      libraryService.getVideos(),
    ]).then(([sectionsRes, videosRes]) => {
      setSections(sectionsRes.data)
      setVideos(videosRes.data)
    }).catch(() => {})
    .finally(() => setLoading(false))
  }, [])

  const filteredVideos = activeSection === 'all'
    ? videos
    : videos.filter(v => v.section_id === activeSection)

  const highlighted = filteredVideos.filter(v => v.is_highlighted)
  const regular = filteredVideos.filter(v => !v.is_highlighted)

  const handleWatch = async (video) => {
    setPlayingVideo(video)
    try {
      await libraryService.markWatched(video.id)
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, watched: true } : v))
    } catch {}
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-pitch-400 animate-spin" /></div>
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <MonitorPlay className="w-10 h-10 text-tertiary mx-auto mb-3" />
        <p className="text-secondary">No videos available yet.</p>
        <p className="text-sm text-tertiary mt-1">Your coach will add videos here for you to watch.</p>
      </div>
    )
  }

  // Only show sections that have videos
  const activeSections = sections.filter(s => videos.some(v => v.section_id === s.id))

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <MonitorPlay className="w-5 h-5 text-pitch-400" /> Film Room
      </h2>

      {/* Section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveSection('all')}
          className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
            activeSection === 'all' ? 'bg-pitch-500 text-white' : 'bg-subtle text-secondary'
          }`}
        >
          All
        </button>
        {activeSections.sort((a, b) => a.display_order - b.display_order).map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
              activeSection === s.id ? 'bg-pitch-500 text-white' : 'bg-subtle text-secondary'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Featured strip */}
      {highlighted.length > 0 && (
        <div>
          <p className="text-xs text-energy-400 font-medium mb-2 flex items-center gap-1">
            <Star className="w-3 h-3" /> Featured
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {highlighted.map(v => (
              <PlayerVideoCard key={v.id} video={v} onPlay={() => handleWatch(v)} compact />
            ))}
          </div>
        </div>
      )}

      {/* Video grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {regular.map(v => (
          <PlayerVideoCard key={v.id} video={v} onPlay={() => handleWatch(v)} />
        ))}
      </div>

      {/* Video Pupil Modal */}
      {playingVideo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 pt-[5vh] overflow-y-auto" onClick={() => setPlayingVideo(null)}>
          <div className="bg-subtle rounded-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-border-strong">
              <h3 className="text-white font-medium truncate">{playingVideo.title}</h3>
              <button onClick={() => setPlayingVideo(null)} className="p-1 text-secondary hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              {playingVideo.source_type === 'youtube' ? (
                <iframe
                  src={`https://www.youtube.com/embed/${playingVideo.youtube_video_id}?autoplay=1`}
                  className="w-full h-full"
                  allowFullScreen
                  allow="autoplay"
                  title={playingVideo.title}
                />
              ) : playingVideo.mux_playback_id ? (
                <mux-player
                  playback-id={playingVideo.mux_playback_id}
                  metadata-video-title={playingVideo.title}
                  style={{ width: '100%', height: '100%' }}
                  autoplay
                />
              ) : (
                <div className="flex items-center justify-center h-full text-secondary">
                  Video is still processing...
                </div>
              )}
            </div>
            {playingVideo.notes && (
              <div className="p-4 border-t border-border-strong">
                <p className="text-sm text-secondary">{playingVideo.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerVideoCard({ video, onPlay, compact }) {
  const thumbnail = video.source_type === 'youtube'
    ? `https://img.youtube.com/vi/${video.youtube_video_id}/mqdefault.jpg`
    : video.mux_playback_id
      ? `https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg?time=5`
      : null

  return (
    <button
      onClick={onPlay}
      className={`text-left bg-subtle rounded-lg overflow-hidden border border-border-strong hover:border-pitch-500/50 transition-colors ${compact ? 'w-48 flex-shrink-0' : ''}`}
    >
      <div className="relative aspect-video bg-card">
        {thumbnail ? (
          <img src={thumbnail} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <MonitorPlay className="w-6 h-6 text-tertiary" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <Play className="w-8 h-8 text-white" />
        </div>
        {video.watched && (
          <div className="absolute top-1.5 right-1.5 bg-pitch-500 rounded-full p-0.5">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-sm text-white font-medium truncate">{video.title}</p>
        {video.notes && !compact && <p className="text-xs text-tertiary mt-0.5 line-clamp-1">{video.notes}</p>}
      </div>
    </button>
  )
}
