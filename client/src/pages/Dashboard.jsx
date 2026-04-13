import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTeam } from '../context/TeamContext'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  Calendar,
  Users,
  Trophy,
  Target,
  TrendingUp,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Sparkles,
  CalendarDays,
  Megaphone,
  Pin,
  Edit2,
  X,
  Send,
  MapPin,
  Home,
  Plane,
  Mail,
  HelpCircle,
} from 'lucide-react'
import { format, isToday, isTomorrow, parseISO, differenceInCalendarDays, differenceInHours } from 'date-fns'
import { announcementService } from '../services/api'
import { authService } from '../services/auth'
import toast from 'react-hot-toast'
import QuickStartGuide from '../components/QuickStartGuide'

export default function Dashboard() {
  const { user } = useAuth()
  const { team, players, upcomingMatches, recentResults, loading } = useTeam()
  const [currentTime, setCurrentTime] = useState(new Date())

  // Announcements state
  const [announcements, setAnnouncements] = useState([])
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false)
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', priority: 'normal', send_email: false, email_recipients: 'all', selected_player_ids: [], expires_at: '' })
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false)
  const [viewingAnnouncement, setViewingAnnouncement] = useState(null)
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [savingAnnouncement, setSavingAnnouncement] = useState(false)

  // Quick Start Guide
  const [showQuickStart, setShowQuickStart] = useState(false)

  // Expand state for results and fixtures
  const [resultsExpanded, setResultsExpanded] = useState(false)
  const [fixturesExpanded, setFixturesExpanded] = useState(false)

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Show Quick Start Guide for new managers
  useEffect(() => {
    if (user?.role === 'manager' && user?.has_completed_onboarding === false) {
      setShowQuickStart(true)
    }
  }, [user])

  // Load announcements
  useEffect(() => {
    if (team?.id) {
      loadAnnouncements()
    }
  }, [team?.id])

  async function handleCloseQuickStart() {
    setShowQuickStart(false)
    try {
      await authService.completeOnboarding()
    } catch (err) {
      console.error('Failed to save onboarding status:', err)
    }
  }

  async function loadAnnouncements() {
    try {
      const response = await announcementService.getAnnouncements(team.id, 5)
      setAnnouncements(response.data || [])
    } catch (err) {
      console.error('Failed to load announcements:', err)
    }
  }

  async function handleCreateAnnouncement(e) {
    e.preventDefault()
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      toast.error('Title and content are required')
      return
    }

    setCreatingAnnouncement(true)
    try {
      // Resolve expiry shortcuts
      const payload = { ...newAnnouncement }
      if (payload.expires_at === 'end_of_day') {
        const eod = new Date()
        eod.setHours(23, 59, 59, 0)
        payload.expires_at = eod.toISOString()
      } else if (payload.expires_at === 'end_of_tomorrow') {
        const eot = new Date()
        eot.setDate(eot.getDate() + 1)
        eot.setHours(23, 59, 59, 0)
        payload.expires_at = eot.toISOString()
      } else if (payload.expires_at === 'custom' || !payload.expires_at) {
        delete payload.expires_at
      }
      const response = await announcementService.createAnnouncement(team.id, payload)
      setAnnouncements(prev => [response.data, ...prev])
      const { emails_sent = 0, emails_attempted = 0, email_enabled } = response.data
      setNewAnnouncement({ title: '', content: '', priority: 'normal', send_email: false, email_recipients: 'all', selected_player_ids: [], expires_at: '' })
      setShowAnnouncementForm(false)

      // Show appropriate message based on email status
      if (newAnnouncement.send_email) {
        if (!email_enabled) {
          toast.success('Announcement sent! (Email not configured)')
        } else if (emails_sent === 0 && emails_attempted > 0) {
          toast.error(`Announcement sent but emails failed to deliver (0/${emails_attempted})`)
        } else if (emails_sent < emails_attempted) {
          toast.success(`Announcement sent! ${emails_sent}/${emails_attempted} emails delivered.`)
        } else if (emails_sent > 0) {
          toast.success(`Announcement sent! ${emails_sent} emails delivered.`)
        } else {
          toast.success('Announcement sent! (No parent emails found)')
        }
      } else {
        toast.success('Announcement sent to team!')
      }
    } catch (err) {
      toast.error('Failed to create announcement')
    } finally {
      setCreatingAnnouncement(false)
    }
  }

  async function handleDeleteAnnouncement(announcementId) {
    if (!confirm('Are you sure you want to delete this announcement?')) return
    try {
      await announcementService.deleteAnnouncement(team.id, announcementId)
      setAnnouncements(prev => prev.filter(a => a.id !== announcementId))
      setViewingAnnouncement(null)
      toast.success('Announcement deleted')
    } catch (err) {
      toast.error('Failed to delete announcement')
    }
  }

  async function handleUpdateAnnouncement(e) {
    e.preventDefault()
    if (!editingAnnouncement?.title?.trim() || !editingAnnouncement?.content?.trim()) {
      toast.error('Title and content are required')
      return
    }

    setSavingAnnouncement(true)
    try {
      const response = await announcementService.updateAnnouncement(team.id, editingAnnouncement.id, {
        title: editingAnnouncement.title,
        content: editingAnnouncement.content,
        priority: editingAnnouncement.priority,
        is_pinned: editingAnnouncement.is_pinned
      })
      setAnnouncements(prev => prev.map(a => a.id === editingAnnouncement.id ? { ...a, ...response.data } : a))
      setEditingAnnouncement(null)
      setViewingAnnouncement(null)
      toast.success('Announcement updated')
    } catch (err) {
      toast.error('Failed to update announcement')
    } finally {
      setSavingAnnouncement(false)
    }
  }

  function openAnnouncementView(announcement) {
    setViewingAnnouncement(announcement)
    setEditingAnnouncement(null)
  }

  function startEditAnnouncement(announcement) {
    setEditingAnnouncement({ ...announcement })
  }

  function cancelEdit() {
    setEditingAnnouncement(null)
  }

  // Get next match countdown
  const nextMatch = upcomingMatches[0]
  const getNextMatchCountdown = () => {
    if (!nextMatch) return null
    const matchDate = parseISO(nextMatch.date)
    const now = new Date()
    const daysUntil = differenceInCalendarDays(matchDate, now)
    const hoursUntil = differenceInHours(matchDate, now)

    if (daysUntil < 0) return null
    if (daysUntil === 0 && hoursUntil <= 0) return 'Now!'
    if (daysUntil === 0) return `${hoursUntil}h`
    if (daysUntil === 1) return '1 day'
    return `${daysUntil} days`
  }
  
  const quickActions = [
    { name: 'Ask Pep', href: '/chat', icon: MessageSquare, color: 'pitch' },
    { name: 'Add Training', href: '/training?new=true', icon: Calendar, color: 'energy' },
    { name: 'Add Player', href: '/players?new=true', icon: Users, color: 'blue' },
    { name: 'Log Match', href: '/matches?new=true', icon: Trophy, color: 'caution' },
  ]
  
  function formatMatchDate(dateStr) {
    const date = parseISO(dateStr)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'EEE, MMM d')
  }
  
  function getResultClass(result) {
    if (!result) return ''
    const [home, away] = result.split('-').map(Number)
    if (home > away) return 'text-pitch-400'
    if (home < away) return 'text-alert-400'
    return 'text-caution-400'
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }
  
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-white mb-1">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-navy-400">
              Here's what's happening with {team?.name || 'your team'}
            </p>
          </div>

          {/* Date/Time & Season Context */}
          <div className="flex items-center gap-3">
            {user?.role === 'manager' && (
              <button
                onClick={() => setShowQuickStart(true)}
                className="p-2 rounded-xl bg-navy-800/50 border border-navy-700 text-navy-400 hover:text-pitch-400 hover:border-pitch-500/30 transition-colors"
                title="Quick Start Guide"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            )}
            {/* Current Date & Time */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-navy-800/50 border border-navy-700">
              <CalendarDays className="w-5 h-5 text-pitch-400" />
              <div>
                <p className="text-white font-medium">
                  {format(currentTime, 'EEEE, d MMMM yyyy')}
                </p>
                <p className="text-sm text-navy-400">
                  {format(currentTime, 'h:mm a')} • {(() => { const m = currentTime.getMonth(); const y = currentTime.getFullYear(); return m >= 7 ? `${y}/${String(y+1).slice(2)}` : `${y-1}/${String(y).slice(2)}`; })()} Season
                </p>
              </div>
            </div>

            {/* Next Match Countdown */}
            {nextMatch && getNextMatchCountdown() && (
              <Link
                to={`/matches/${nextMatch.id}`}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-energy-500/10 border border-energy-500/30 hover:border-energy-500/50 transition-colors"
              >
                <Clock className="w-5 h-5 text-energy-400" />
                <div>
                  <p className="text-energy-400 font-bold">{getNextMatchCountdown()}</p>
                  <p className="text-sm text-navy-400">until {nextMatch.opponent}</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </motion.div>
      
      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        {quickActions.map((action, index) => (
          <Link
            key={action.name}
            to={action.href}
            className={`
              card p-4 flex flex-col items-center justify-center gap-3 text-center
              hover:border-navy-700 transition-all group
            `}
          >
            <div className={`
              w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110
              ${action.color === 'pitch' ? 'bg-pitch-500/10 text-pitch-400' : ''}
              ${action.color === 'energy' ? 'bg-energy-500/10 text-energy-400' : ''}
              ${action.color === 'blue' ? 'bg-blue-500/10 text-blue-400' : ''}
              ${action.color === 'caution' ? 'bg-caution-500/10 text-caution-400' : ''}
            `}>
              <action.icon className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-navy-300 group-hover:text-white transition-colors">
              {action.name}
            </span>
          </Link>
        ))}
      </motion.div>
      
      {/* Row 1: AI Assistant & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* AI Assistant Preview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="card overflow-hidden h-full">
            <div className="p-4 border-b border-navy-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pitch-500/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-pitch-400" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-white">Pep</h2>
                  <p className="text-sm text-navy-400">Your AI coaching assistant</p>
                </div>
              </div>
              <Link to="/chat" className="btn-ghost btn-sm">
                Open Chat
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-navy-300">Quick suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Prepare for next match',
                  'Generate a training session',
                  'Half-time adjustments for when losing',
                  'Player development ideas',
                ].map((suggestion) => (
                  <Link
                    key={suggestion}
                    to={`/chat?q=${encodeURIComponent(suggestion)}`}
                    className="px-3 py-1.5 rounded-lg bg-navy-800 text-sm text-navy-300 hover:text-white hover:bg-navy-700 transition-colors"
                  >
                    {suggestion}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Announcements Widget */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="card h-full flex flex-col">
            <div className="p-4 border-b border-navy-800 flex items-center justify-between">
              <h2 className="font-display font-semibold text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-alert-400" />
                Team Announcements
              </h2>
              <button
                onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                className="btn-ghost btn-sm"
              >
                {showAnnouncementForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAnnouncementForm ? 'Cancel' : 'New'}
              </button>
            </div>

            {/* New Announcement Form */}
            {showAnnouncementForm && (
              <form onSubmit={handleCreateAnnouncement} className="p-4 bg-navy-800/50 border-b border-navy-800">
                <input
                  type="text"
                  placeholder="Announcement title..."
                  value={newAnnouncement.title}
                  onChange={e => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                  className="input w-full mb-2"
                />
                <textarea
                  placeholder="Message for the team..."
                  value={newAnnouncement.content}
                  onChange={e => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                  className="input w-full mb-2 min-h-[80px]"
                />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={newAnnouncement.priority}
                      onChange={e => setNewAnnouncement(prev => ({ ...prev, priority: e.target.value }))}
                      className="input flex-1"
                    >
                      <option value="normal">Normal Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <button type="submit" disabled={creatingAnnouncement} className="btn-primary">
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-navy-400" />
                      <select
                        value={newAnnouncement.expires_at}
                        onChange={e => setNewAnnouncement(prev => ({ ...prev, expires_at: e.target.value }))}
                        className="input flex-1 text-sm"
                      >
                        <option value="">No expiry</option>
                        {upcomingMatches?.[0] && (
                          <option value={(() => {
                            const m = upcomingMatches[0]
                            const d = new Date(m.date)
                            if (m.time) {
                              const [h, min] = m.time.split(':')
                              d.setHours(parseInt(h), parseInt(min), 0)
                            }
                            return d.toISOString()
                          })()}>
                            Kick-off: {upcomingMatches[0].opponent} ({format(parseISO(upcomingMatches[0].date), 'EEE d MMM')}{upcomingMatches[0].time ? ` ${upcomingMatches[0].time}` : ''})
                          </option>
                        )}
                        <option value="end_of_day">{format(new Date(), "'Today' d MMM")} end of day</option>
                        <option value="end_of_tomorrow">Tomorrow end of day</option>
                        <option value="custom">Custom date/time...</option>
                      </select>
                    </div>
                    {newAnnouncement.expires_at === 'custom' && (
                      <input
                        type="datetime-local"
                        onChange={e => {
                          if (e.target.value) {
                            setNewAnnouncement(prev => ({ ...prev, expires_at: new Date(e.target.value).toISOString() }))
                          }
                        }}
                        className="input w-full text-sm ml-6"
                      />
                    )}
                    <label className="flex items-center gap-2 text-sm text-navy-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newAnnouncement.send_email}
                        onChange={e => setNewAnnouncement(prev => ({ ...prev, send_email: e.target.checked }))}
                        className="w-4 h-4 rounded border-navy-600 bg-navy-700 text-pitch-500 focus:ring-pitch-500"
                      />
                      <Mail className="w-4 h-4" />
                      Also send via email
                    </label>
                    {newAnnouncement.send_email && (
                      <div className="ml-6 space-y-2">
                        <select
                          value={newAnnouncement.email_recipients}
                          onChange={e => setNewAnnouncement(prev => ({ ...prev, email_recipients: e.target.value, selected_player_ids: [] }))}
                          className="input w-full text-sm"
                        >
                          <option value="all">All parents</option>
                          <option value="matchday_squad">Matchday squad only</option>
                          <option value="selected">Selected players only</option>
                        </select>
                        {newAnnouncement.email_recipients === 'selected' && (
                          <div className="max-h-32 overflow-y-auto bg-navy-900 rounded-lg p-2 space-y-1">
                            {players.map(player => (
                              <label key={player.id} className="flex items-center gap-2 text-sm text-navy-300 cursor-pointer hover:text-white">
                                <input
                                  type="checkbox"
                                  checked={newAnnouncement.selected_player_ids.includes(player.id)}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setNewAnnouncement(prev => ({ ...prev, selected_player_ids: [...prev.selected_player_ids, player.id] }))
                                    } else {
                                      setNewAnnouncement(prev => ({ ...prev, selected_player_ids: prev.selected_player_ids.filter(id => id !== player.id) }))
                                    }
                                  }}
                                  className="w-3 h-3 rounded border-navy-600 bg-navy-700 text-pitch-500"
                                />
                                {player.name}
                              </label>
                            ))}
                          </div>
                        )}
                        {newAnnouncement.email_recipients === 'matchday_squad' && (
                          <p className="text-xs text-navy-500">Emails will be sent to parents of players in the next match squad</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </form>
            )}

            {/* Announcements List */}
            {announcements.length > 0 ? (
              <div className="divide-y divide-navy-800 flex-1">
                {announcements.map(announcement => (
                  <div
                    key={announcement.id}
                    className={`p-4 cursor-pointer hover:bg-navy-800/50 transition-colors ${
                      announcement.priority === 'high' ? 'bg-alert-500/5' :
                      announcement.priority === 'urgent' ? 'bg-alert-500/10' : ''
                    }`}
                    onClick={() => openAnnouncementView(announcement)}
                  >
                    <div className="flex items-start gap-2">
                      {announcement.is_pinned && <Pin className="w-3 h-3 text-pitch-400 shrink-0 mt-1" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white text-sm">{announcement.title}</span>
                          {announcement.priority === 'high' && (
                            <span className="badge-alert text-xs">High</span>
                          )}
                          {announcement.priority === 'urgent' && (
                            <span className="badge-alert text-xs animate-pulse">Urgent</span>
                          )}
                        </div>
                        <p className="text-navy-300 text-sm mt-1 line-clamp-2">{announcement.content}</p>
                        <p className="text-xs text-navy-500 mt-2">
                          {format(parseISO(announcement.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => startEditAnnouncement(announcement)}
                          className="text-navy-500 hover:text-pitch-400 p-1"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAnnouncement(announcement.id)}
                          className="text-navy-500 hover:text-alert-400 p-1"
                          title="Delete"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center flex-1 flex flex-col items-center justify-center">
                <Megaphone className="w-8 h-8 text-navy-600 mx-auto mb-2" />
                <p className="text-navy-400 text-sm">No announcements yet</p>
                <p className="text-navy-500 text-xs mt-1">Send updates to players & parents</p>
              </div>
            )}

            {/* Announcement View/Edit Modal */}
            {(viewingAnnouncement || editingAnnouncement) && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => { setViewingAnnouncement(null); setEditingAnnouncement(null); }}>
                <div className="card w-full max-w-lg max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-navy-800 flex items-center justify-between">
                    <h3 className="font-display font-semibold text-white flex items-center gap-2">
                      <Megaphone className="w-5 h-5 text-alert-400" />
                      {editingAnnouncement ? 'Edit Announcement' : 'Announcement Details'}
                    </h3>
                    <button
                      onClick={() => { setViewingAnnouncement(null); setEditingAnnouncement(null); }}
                      className="text-navy-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {editingAnnouncement ? (
                    <form onSubmit={handleUpdateAnnouncement} className="p-4 space-y-4">
                      <div>
                        <label className="block text-sm text-navy-400 mb-1">Title</label>
                        <input
                          type="text"
                          value={editingAnnouncement.title}
                          onChange={e => setEditingAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                          className="input w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-navy-400 mb-1">Content</label>
                        <textarea
                          value={editingAnnouncement.content}
                          onChange={e => setEditingAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                          className="input w-full min-h-[120px]"
                        />
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-sm text-navy-400 mb-1">Priority</label>
                          <select
                            value={editingAnnouncement.priority}
                            onChange={e => setEditingAnnouncement(prev => ({ ...prev, priority: e.target.value }))}
                            className="input w-full"
                          >
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm text-navy-400 mb-1">Pinned</label>
                          <label className="flex items-center gap-2 mt-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingAnnouncement.is_pinned || false}
                              onChange={e => setEditingAnnouncement(prev => ({ ...prev, is_pinned: e.target.checked }))}
                              className="w-4 h-4 rounded border-navy-600 bg-navy-700 text-pitch-500"
                            />
                            <span className="text-sm text-navy-300">Pin to top</span>
                          </label>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button type="button" onClick={cancelEdit} className="btn-ghost flex-1">
                          Cancel
                        </button>
                        <button type="submit" disabled={savingAnnouncement} className="btn-primary flex-1">
                          {savingAnnouncement ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  ) : viewingAnnouncement && (
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {viewingAnnouncement.is_pinned && <Pin className="w-4 h-4 text-pitch-400" />}
                        <h4 className="text-lg font-semibold text-white">{viewingAnnouncement.title}</h4>
                        {viewingAnnouncement.priority === 'high' && (
                          <span className="badge-alert text-xs">High</span>
                        )}
                        {viewingAnnouncement.priority === 'urgent' && (
                          <span className="badge-alert text-xs animate-pulse">Urgent</span>
                        )}
                      </div>
                      <p className="text-navy-300 whitespace-pre-wrap">{viewingAnnouncement.content}</p>
                      <p className="text-xs text-navy-500 mt-4">
                        Posted {format(parseISO(viewingAnnouncement.created_at), 'MMMM d, yyyy \'at\' h:mm a')}
                        {viewingAnnouncement.created_by_name && ` by ${viewingAnnouncement.created_by_name}`}
                      </p>
                      <div className="flex gap-2 mt-4 pt-4 border-t border-navy-800">
                        <button
                          onClick={() => startEditAnnouncement(viewingAnnouncement)}
                          className="btn-secondary flex-1"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAnnouncement(viewingAnnouncement.id)}
                          className="btn-ghost text-alert-400 hover:bg-alert-500/10 flex-1"
                        >
                          <X className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Row 2: Team Overview & Next Match Overview (equal size) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Team Overview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="card p-4 h-full">
            <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-pitch-400" />
              Team Overview
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-navy-400">Squad Size</span>
                <span className="font-semibold text-white">{players.length} players</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-navy-400">Age Group</span>
                <span className="font-semibold text-white">{team?.age_group || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-navy-400">Formation</span>
                <span className="font-semibold text-white">{team?.formation || '4-3-3'}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Next Match Overview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="card p-4 h-full">
            <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-energy-400" />
              Next Match
            </h2>

            {nextMatch ? (
              <Link to={`/matches/${nextMatch.id}`} className="block hover:opacity-80 transition-opacity">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-navy-400">Opponent</span>
                    <span className="font-semibold text-white">{nextMatch.opponent}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-navy-400">Date</span>
                    <span className="font-semibold text-energy-400">{formatMatchDate(nextMatch.date)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-navy-400">Kick-off</span>
                    <span className="font-semibold text-white">
                      {nextMatch.time || format(parseISO(nextMatch.date), 'h:mm a')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-navy-400">Venue</span>
                    <span className="font-semibold text-white flex items-center gap-1">
                      {nextMatch.is_home ? <Home className="w-4 h-4 text-pitch-400" /> : <Plane className="w-4 h-4 text-energy-400" />}
                      {nextMatch.is_home ? 'Home' : 'Away'}
                    </span>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Calendar className="w-8 h-8 text-navy-600 mb-2" />
                <p className="text-navy-400 text-sm">No upcoming matches</p>
                <Link to="/matches?new=true" className="btn-secondary btn-sm mt-3">
                  <Plus className="w-4 h-4" />
                  Add Match
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Row 3: Results & Fixtures (equal size, show 3 with expand) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Results */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="card">
            <div className="p-4 border-b border-navy-800 flex items-center justify-between">
              <h2 className="font-display font-semibold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-caution-400" />
                Recent Results
              </h2>
              {recentResults.length > 3 && (
                <button
                  onClick={() => setResultsExpanded(!resultsExpanded)}
                  className="btn-ghost btn-sm"
                >
                  {resultsExpanded ? 'Show Less' : `+${recentResults.length - 3} more`}
                  {resultsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
            </div>

            {recentResults.length > 0 ? (
              <div className="divide-y divide-navy-800">
                {recentResults.slice(0, resultsExpanded ? undefined : 3).map((match) => (
                  <Link
                    key={match.id}
                    to={`/matches/${match.id}`}
                    className="flex items-center justify-between p-4 hover:bg-navy-800/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-white">vs {match.opponent}</p>
                      <p className="text-sm text-navy-400">{formatMatchDate(match.date)}</p>
                    </div>
                    <p className={`font-display font-bold text-lg ${getResultClass(match.result)}`}>
                      {match.result}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Trophy className="w-8 h-8 text-navy-600 mx-auto mb-2" />
                <p className="text-navy-400">No results yet</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Upcoming Fixtures */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="card">
            <div className="p-4 border-b border-navy-800 flex items-center justify-between">
              <h2 className="font-display font-semibold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-energy-400" />
                Upcoming Fixtures
              </h2>
              {upcomingMatches.length > 3 && (
                <button
                  onClick={() => setFixturesExpanded(!fixturesExpanded)}
                  className="btn-ghost btn-sm"
                >
                  {fixturesExpanded ? 'Show Less' : `+${upcomingMatches.length - 3} more`}
                  {fixturesExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
            </div>

            {upcomingMatches.length > 0 ? (
              <div className="divide-y divide-navy-800">
                {upcomingMatches.slice(0, fixturesExpanded ? undefined : 3).map((match) => (
                  <Link
                    key={match.id}
                    to={`/matches/${match.id}`}
                    className="flex items-center justify-between p-4 hover:bg-navy-800/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-white">vs {match.opponent}</p>
                      <p className="text-sm text-navy-400 flex items-center gap-1">
                        {match.is_home ? <Home className="w-3 h-3" /> : <Plane className="w-3 h-3" />}
                        {match.location || (match.is_home ? 'Home' : 'Away')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-energy-400">{formatMatchDate(match.date)}</p>
                      <p className="text-sm text-navy-400">
                        {match.time || format(parseISO(match.date), 'h:mm a')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Calendar className="w-8 h-8 text-navy-600 mx-auto mb-2" />
                <p className="text-navy-400 mb-4">No upcoming matches</p>
                <Link to="/matches?new=true" className="btn-secondary btn-sm">
                  <Plus className="w-4 h-4" />
                  Add Match
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <QuickStartGuide isOpen={showQuickStart} onClose={handleCloseQuickStart} />
    </div>
  )
}
