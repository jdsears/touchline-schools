import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useTeam } from '../context/TeamContext'
import { useAuth } from '../context/AuthContext'
import { teamService, trainingService } from '../services/api'
import api from '../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import EventCalendar from '../components/common/EventCalendar'
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ChevronRight,
  Check,
  X,
  HelpCircle,
  AlertCircle,
  Plus,
  Bell,
  UserCheck,
  Loader2,
  Upload,
  Image,
  Sparkles,
  Trash2,
  Trophy,
  Video,
  CalendarDays,
  List
} from 'lucide-react'

const statusColors = {
  available: 'bg-green-500/20 text-green-400 border-green-500/30',
  unavailable: 'bg-red-500/20 text-red-400 border-red-500/30',
  maybe: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  pending: 'bg-navy-700 text-navy-400 border-navy-600'
}

const statusIcons = {
  available: Check,
  unavailable: X,
  maybe: HelpCircle,
  pending: AlertCircle
}

// Convert a naive datetime (from datetime-local input) to UTC ISO string,
// interpreting the input as being in the given IANA timezone.
// E.g. "2026-04-19", "10:00", "Europe/London" → "2026-04-19T09:00:00.000Z" (BST = UTC+1)
function localToUtcIso(dateStr, timeStr, tz) {
  const asUtc = new Date(`${dateStr}T${timeStr}:00Z`)
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

export default function Matches() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { team, matches, upcomingMatches, recentResults, branding, addMatch, deleteMatch, loadTeamData } = useTeam()

  // View state
  const [showCalendar, setShowCalendar] = useState(false)
  const [activeTab, setActiveTab] = useState('upcoming')

  // Training sessions for calendar
  const [trainingSessions, setTrainingSessions] = useState([])
  const [loadingTraining, setLoadingTraining] = useState(false)

  // Modal states
  const [showAddModal, setShowAddModal] = useState(searchParams.get('new') === 'true')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)

  // Availability states
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [availability, setAvailability] = useState({})
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [deletingMatch, setDeletingMatch] = useState(null)

  const isManager = user?.role === 'manager' || user?.role === 'assistant'

  // Memoize sorted matches to avoid re-sorting on every render
  const sortedMatches = useMemo(() =>
    [...matches].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [matches]
  )

  // Load training sessions for calendar view
  useEffect(() => {
    if (team?.id) {
      loadTrainingSessions()
    }
  }, [team?.id])

  async function loadTrainingSessions() {
    setLoadingTraining(true)
    try {
      const response = await trainingService.getSessions(team.id)
      setTrainingSessions(response.data || [])
    } catch (error) {
      console.error('Failed to load training sessions:', error)
    } finally {
      setLoadingTraining(false)
    }
  }

  // Load availability for selected match
  useEffect(() => {
    if (selectedMatch) {
      loadAvailability(selectedMatch.id)
    }
  }, [selectedMatch?.id])

  async function loadAvailability(matchId) {
    setLoadingAvailability(true)
    try {
      const response = await teamService.getMatchAvailability(matchId)
      const availMap = {}
      response.data.forEach(a => {
        availMap[a.player_id] = a
      })
      setAvailability(availMap)
    } catch (error) {
      console.error('Failed to load availability:', error)
    } finally {
      setLoadingAvailability(false)
    }
  }

  async function handleAvailabilityUpdate(playerId, status, notes = null) {
    try {
      await teamService.updateAvailability(selectedMatch.id, {
        player_id: playerId,
        status,
        notes
      })
      setAvailability(prev => ({
        ...prev,
        [playerId]: { ...prev[playerId], status, notes }
      }))
      toast.success('Availability updated')
    } catch (error) {
      toast.error('Failed to update availability')
    }
  }

  async function handleRequestAvailability() {
    try {
      const deadline = new Date(selectedMatch.date)
      deadline.setDate(deadline.getDate() - 2)
      await teamService.requestAvailability(selectedMatch.id, deadline.toISOString())
      toast.success('Availability request sent to all players')
    } catch (error) {
      toast.error('Failed to send availability request')
    }
  }

  async function handleDeleteMatch(matchId, e) {
    if (e) e.stopPropagation()
    if (!confirm('Are you sure you want to delete this match?')) return

    setDeletingMatch(matchId)
    try {
      const result = await deleteMatch(matchId)
      if (result.success) {
        toast.success('Match deleted')
        if (selectedMatch?.id === matchId) {
          setSelectedMatch(null)
        }
      } else {
        toast.error(result.error || 'Failed to delete match')
      }
    } catch (error) {
      toast.error('Failed to delete match')
    } finally {
      setDeletingMatch(null)
    }
  }

  async function handleDeleteAll(type) {
    const typeLabel = type === 'upcoming' ? 'upcoming fixtures' :
                      type === 'results' ? 'results' : 'all matches'
    const count = type === 'upcoming' ? upcomingMatches.length :
                  type === 'results' ? recentResults.length : matches.length

    if (!confirm(`Are you sure you want to delete ${count} ${typeLabel}? This cannot be undone.`)) return

    try {
      const response = await api.delete(`/teams/${team.id}/matches/all`, { params: { type } })
      toast.success(`${response.data.count} matches deleted`)
      setShowDeleteAllModal(false)
      setSelectedMatch(null)
      loadTeamData()
    } catch (error) {
      toast.error('Failed to delete matches')
    }
  }

  const teamTz = branding?.timezone || 'Europe/London'

  function formatDate(date) {
    return new Date(date).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: teamTz,
    })
  }

  function formatTime(date) {
    return new Date(date).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: teamTz,
    })
  }

  function getAvailabilitySummary() {
    const values = Object.values(availability)
    return {
      available: values.filter(a => a.status === 'available').length,
      unavailable: values.filter(a => a.status === 'unavailable').length,
      maybe: values.filter(a => a.status === 'maybe').length,
      pending: values.filter(a => a.status === 'pending').length,
      total: values.length
    }
  }

  function getResultClass(result) {
    if (!result) return ''
    const [home, away] = result.split('-').map(Number)
    if (home > away) return 'text-pitch-400 bg-pitch-500/10'
    if (home < away) return 'text-alert-400 bg-alert-500/10'
    return 'text-caution-400 bg-caution-500/10'
  }

  // New Match Form Modal
  function NewMatchModal() {
    const [formData, setFormData] = useState({
      opponent: '',
      date: '',
      time: '10:00',
      meetTime: '',
      location: '',
      isHome: true,
      kitType: 'home',
      competition: '',
      veoLink: ''
    })
    const [saving, setSaving] = useState(false)

    async function handleSubmit(e) {
      e.preventDefault()
      setSaving(true)

      const result = await addMatch({
        opponent: formData.opponent,
        date: localToUtcIso(formData.date, formData.time, teamTz),
        location: formData.location,
        isHome: formData.isHome,
        kitType: formData.kitType,
        competition: formData.competition,
        veoLink: formData.veoLink,
        meetTime: formData.meetTime || null
      })

      if (result.success) {
        toast.success('Match added')
        setShowAddModal(false)
        setSearchParams({})
        loadTeamData()
      } else {
        toast.error(result.error || 'Failed to add match')
      }
      setSaving(false)
    }

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={() => setShowAddModal(false)}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="card w-full max-w-md"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-navy-800 flex items-center justify-between">
            <h2 className="text-xl font-display font-bold text-white">Add Match</h2>
            <button onClick={() => setShowAddModal(false)} className="text-navy-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="label">Opponent *</label>
              <input
                type="text"
                className="input"
                value={formData.opponent}
                onChange={e => setFormData(prev => ({ ...prev, opponent: e.target.value }))}
                placeholder="Team name"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Date *</label>
                <input
                  type="date"
                  className="input"
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Kick-off</label>
                <input
                  type="time"
                  className="input"
                  value={formData.time}
                  onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Meet Time</label>
                <input
                  type="time"
                  className="input"
                  value={formData.meetTime}
                  onChange={e => setFormData(prev => ({ ...prev, meetTime: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="label">Location</label>
              <input
                type="text"
                className="input"
                value={formData.location}
                onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Venue address"
              />
            </div>

            <div>
              <label className="label">Competition</label>
              <input
                type="text"
                className="input"
                value={formData.competition}
                onChange={e => setFormData(prev => ({ ...prev, competition: e.target.value }))}
                placeholder="e.g. League, Cup"
              />
            </div>

            <div>
              <label className="label">Home/Away</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isHome: true, kitType: 'home' }))}
                  className={`flex-1 py-2 rounded-lg border transition ${
                    formData.isHome
                      ? 'bg-pitch-500/20 border-pitch-500 text-pitch-400'
                      : 'border-navy-700 text-navy-400 hover:border-navy-600'
                  }`}
                >
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isHome: false, kitType: 'away' }))}
                  className={`flex-1 py-2 rounded-lg border transition ${
                    !formData.isHome
                      ? 'bg-pitch-500/20 border-pitch-500 text-pitch-400'
                      : 'border-navy-700 text-navy-400 hover:border-navy-600'
                  }`}
                >
                  Away
                </button>
              </div>
            </div>

            <div>
              <label className="label">Kit</label>
              <div className="flex gap-2">
                {['home', 'away', 'third'].map(kit => (
                  <button
                    key={kit}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, kitType: kit }))}
                    className={`flex-1 py-2 rounded-lg border transition text-sm capitalize ${
                      formData.kitType === kit
                        ? 'bg-pitch-500/20 border-pitch-500 text-pitch-400'
                        : 'border-navy-700 text-navy-400 hover:border-navy-600'
                    }`}
                  >
                    {kit === 'third' ? '3rd Kit' : `${kit.charAt(0).toUpperCase() + kit.slice(1)} Kit`}
                  </button>
                ))}
              </div>
              <p className="text-xs text-navy-500 mt-1">Change if there's a kit clash</p>
            </div>

            <div>
              <label className="label">Video Link (optional)</label>
              <input
                type="url"
                className="input"
                value={formData.veoLink}
                onChange={e => setFormData(prev => ({ ...prev, veoLink: e.target.value }))}
                placeholder="https://example.com/match-video..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add Match'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    )
  }

  // Import from Image Modal
  function ImportFromImageModal() {
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [extracting, setExtracting] = useState(false)
    const [extractedFixtures, setExtractedFixtures] = useState(null)
    const [selectedFixtures, setSelectedFixtures] = useState([])
    const [importing, setImporting] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef(null)

    function handleImageSelect(e) {
      const file = e.target.files?.[0]
      if (!file) return
      processFile(file)
    }

    function processFile(file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file')
        return
      }

      setImageFile(file)
      setExtractedFixtures(null)
      setSelectedFixtures([])

      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target.result)
      reader.readAsDataURL(file)
    }

    function handleDragOver(e) {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
    }

    function handleDragLeave(e) {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
    }

    function handleDrop(e) {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const file = e.dataTransfer.files?.[0]
      if (file) {
        processFile(file)
      }
    }

    async function handleExtract() {
      if (!imageFile) return

      setExtracting(true)
      try {
        const formData = new FormData()
        formData.append('image', imageFile)

        const response = await api.post(`/teams/${team.id}/matches/extract-from-image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })

        setExtractedFixtures(response.data.fixtures)
        setSelectedFixtures(response.data.fixtures.map((_, i) => i))
        toast.success(`Found ${response.data.count} matches`)
      } catch (error) {
        toast.error('Failed to extract fixtures from image')
        console.error(error)
      } finally {
        setExtracting(false)
      }
    }

    function toggleFixture(index) {
      setSelectedFixtures(prev =>
        prev.includes(index)
          ? prev.filter(i => i !== index)
          : [...prev, index]
      )
    }

    async function handleImport() {
      if (selectedFixtures.length === 0) return

      setImporting(true)
      try {
        const matchesToImport = selectedFixtures.map(i => extractedFixtures[i])
        await api.post(`/teams/${team.id}/matches/bulk`, { matches: matchesToImport })

        toast.success(`${matchesToImport.length} matches imported`)
        setShowImportModal(false)
        loadTeamData()
      } catch (error) {
        toast.error('Failed to import matches')
      } finally {
        setImporting(false)
      }
    }

    function getResultColor(fixture) {
      if (!fixture.result) return ''
      const [us, them] = fixture.result.split('-').map(Number)
      if (us > them) return 'text-green-400'
      if (us < them) return 'text-red-400'
      return 'text-yellow-400'
    }

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={() => setShowImportModal(false)}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="card w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-navy-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pitch-400" />
              <h2 className="text-xl font-display font-bold text-white">Import from Image</h2>
            </div>
            <button
              onClick={() => setShowImportModal(false)}
              className="text-navy-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            {!extractedFixtures ? (
              <>
                <p className="text-navy-400 text-sm mb-4">
                  Upload a screenshot of your fixtures or results from FA Full-Time, and AI will extract the match data.
                </p>

                {imagePreview ? (
                  <div className="mb-4">
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Fixture list"
                        className="w-full rounded-lg border border-navy-700 max-h-64 object-contain bg-navy-900"
                      />
                      <button
                        onClick={() => {
                          setImageFile(null)
                          setImagePreview(null)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    <button
                      onClick={handleExtract}
                      disabled={extracting}
                      className="btn-primary w-full mt-4"
                    >
                      {extracting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Extracting fixtures...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Extract Fixtures with AI
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <label
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`block w-full p-8 border-2 border-dashed rounded-lg transition cursor-pointer text-center ${
                      isDragging
                        ? 'border-pitch-500 bg-pitch-500/10'
                        : 'border-navy-600 hover:border-pitch-500'
                    }`}
                  >
                    <Image className={`w-12 h-12 mx-auto mb-2 ${isDragging ? 'text-pitch-400' : 'text-navy-500'}`} />
                    <p className="text-white font-medium">
                      {isDragging ? 'Drop image here' : 'Click or drag & drop image'}
                    </p>
                    <p className="text-sm text-navy-400 mt-1">PNG, JPG up to 10MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-navy-400 text-sm">
                    Found {extractedFixtures.length} matches. Select which to import:
                  </p>
                  <button
                    onClick={() => {
                      setExtractedFixtures(null)
                      setImageFile(null)
                      setImagePreview(null)
                    }}
                    className="text-sm text-pitch-400 hover:text-pitch-300"
                  >
                    Try another image
                  </button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {extractedFixtures.map((fixture, index) => (
                    <div
                      key={index}
                      onClick={() => toggleFixture(index)}
                      className={`p-3 rounded-lg border cursor-pointer transition ${
                        selectedFixtures.includes(index)
                          ? 'bg-pitch-500/10 border-pitch-500'
                          : 'bg-navy-800/50 border-navy-700 hover:border-navy-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                          selectedFixtures.includes(index)
                            ? 'bg-pitch-500 border-pitch-500'
                            : 'border-navy-600'
                        }`}>
                          {selectedFixtures.includes(index) && <Check className="w-3 h-3 text-white" />}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              fixture.isHome ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {fixture.isHome ? 'H' : 'A'}
                            </span>
                            <span className="font-medium text-white">{fixture.opponent}</span>
                            {fixture.result && (
                              <span className={`font-bold ${getResultColor(fixture)}`}>
                                {fixture.result}
                              </span>
                            )}
                            {fixture.status === 'postponed' && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                                Postponed
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-navy-400 mt-1">
                            <span>{new Date(fixture.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            {fixture.time && <span>{fixture.time}</span>}
                            {fixture.location && <span>@ {fixture.location}</span>}
                          </div>
                          {fixture.competition && (
                            <p className="text-xs text-navy-500 mt-1">{fixture.competition}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {extractedFixtures && (
            <div className="p-4 border-t border-navy-800 flex justify-between items-center">
              <p className="text-sm text-navy-400">
                {selectedFixtures.length} of {extractedFixtures.length} selected
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || selectedFixtures.length === 0}
                  className="btn-primary"
                >
                  {importing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Import {selectedFixtures.length} Matches
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    )
  }

  // Delete All Modal
  function DeleteAllModal() {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={() => setShowDeleteAllModal(false)}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="card w-full max-w-md"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-navy-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              <h2 className="text-xl font-display font-bold text-white">Delete Matches</h2>
            </div>
            <button
              onClick={() => setShowDeleteAllModal(false)}
              className="text-navy-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-navy-400 text-sm mb-4">
              Choose which matches to delete. This action cannot be undone.
            </p>

            <button
              onClick={() => handleDeleteAll('upcoming')}
              disabled={upcomingMatches.length === 0}
              className="w-full p-4 rounded-lg border border-navy-700 hover:border-red-500/50 hover:bg-red-500/10 transition text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white group-hover:text-red-400">Upcoming Fixtures</h3>
                  <p className="text-sm text-navy-400">Delete all future matches without results</p>
                </div>
                <span className="text-lg font-bold text-navy-500 group-hover:text-red-400">
                  {upcomingMatches.length}
                </span>
              </div>
            </button>

            <button
              onClick={() => handleDeleteAll('results')}
              disabled={recentResults.length === 0}
              className="w-full p-4 rounded-lg border border-navy-700 hover:border-red-500/50 hover:bg-red-500/10 transition text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white group-hover:text-red-400">Results</h3>
                  <p className="text-sm text-navy-400">Delete all past matches with results</p>
                </div>
                <span className="text-lg font-bold text-navy-500 group-hover:text-red-400">
                  {recentResults.length}
                </span>
              </div>
            </button>

            <button
              onClick={() => handleDeleteAll('all')}
              disabled={matches.length === 0}
              className="w-full p-4 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-red-400">Delete All Matches</h3>
                  <p className="text-sm text-red-400/70">Permanently delete all fixtures and results</p>
                </div>
                <span className="text-lg font-bold text-red-400">
                  {matches.length}
                </span>
              </div>
            </button>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  // Match Card Component
  function MatchCard({ match, showResult = false }) {
    const isSelected = selectedMatch?.id === match.id
    const isPast = new Date(match.date) < new Date()

    return (
      <motion.div
        layout
        className={`card cursor-pointer transition-all ${
          isSelected ? 'ring-2 ring-pitch-500' : 'hover:border-navy-600'
        }`}
        onClick={() => {
          if (isPast || showResult) {
            navigate(`/matches/${match.id}`)
          } else {
            setSelectedMatch(match)
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-center min-w-[60px]">
              <p className="text-xs text-navy-500 uppercase">{formatDate(match.date)}</p>
              <p className="text-lg font-bold text-white">{formatTime(match.date)}</p>
            </div>

            <div className="h-12 w-px bg-navy-700" />

            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  match.is_home ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {match.is_home ? 'H' : 'A'}
                </span>
                <p className="font-semibold text-white">{match.opponent}</p>
                {match.veoLink && <Video className="w-4 h-4 text-pitch-400" />}
              </div>
              {match.competition && (
                <p className="text-sm text-navy-400">{match.competition}</p>
              )}
              {match.location && (
                <p className="text-xs text-navy-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {match.location}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {showResult && match.result ? (
              <div className={`text-xl font-bold ${
                match.goals_for > match.goals_against ? 'text-green-400' :
                match.goals_for < match.goals_against ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {match.is_home ? match.goals_for : match.goals_against} - {match.is_home ? match.goals_against : match.goals_for}
              </div>
            ) : !isPast && (
              <div className="text-right">
                <p className="text-xs text-navy-500">Availability</p>
                <p className="text-sm font-medium text-pitch-400">
                  {parseInt(match.available_count) || 0} ready
                </p>
              </div>
            )}
            {isManager && (
              <button
                onClick={(e) => handleDeleteMatch(match.id, e)}
                disabled={deletingMatch === match.id}
                className="p-2 text-navy-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                title="Delete match"
              >
                {deletingMatch === match.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            )}
            <ChevronRight className="w-5 h-5 text-navy-500" />
          </div>
        </div>
      </motion.div>
    )
  }

  // Availability Panel
  function AvailabilityPanel() {
    if (!selectedMatch) return null

    const summary = getAvailabilitySummary()
    const isPast = new Date(selectedMatch.date) < new Date()

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="card h-fit sticky top-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-white">
            vs {selectedMatch.opponent}
          </h3>
          <button
            onClick={() => setSelectedMatch(null)}
            className="text-navy-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4 text-sm text-navy-400 mb-4">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {formatDate(selectedMatch.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatTime(selectedMatch.date)}
          </span>
        </div>

        {/* Availability Summary */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-xl font-bold text-green-400">{summary.available}</p>
            <p className="text-xs text-green-400/70">Yes</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-xl font-bold text-yellow-400">{summary.maybe}</p>
            <p className="text-xs text-yellow-400/70">Maybe</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xl font-bold text-red-400">{summary.unavailable}</p>
            <p className="text-xs text-red-400/70">No</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-navy-700/50 border border-navy-600">
            <p className="text-xl font-bold text-navy-400">{summary.pending}</p>
            <p className="text-xs text-navy-500">Waiting</p>
          </div>
        </div>

        {/* Manager Actions */}
        {isManager && !isPast && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={handleRequestAvailability}
              className="btn-secondary flex-1 text-sm"
            >
              <Bell className="w-4 h-4" />
              Request All
            </button>
            <Link
              to={`/matches/${selectedMatch.id}?tab=squad`}
              className="btn-primary flex-1 text-sm"
            >
              <UserCheck className="w-4 h-4" />
              Select Squad
            </Link>
          </div>
        )}

        {/* Player List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {loadingAvailability ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-pitch-500" />
            </div>
          ) : (
            Object.entries(availability).map(([playerId, data]) => {
              const StatusIcon = statusIcons[data.status]
              return (
                <div
                  key={playerId}
                  className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50 border border-navy-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-sm font-medium text-white">
                      {data.squad_number || data.player_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{data.player_name}</p>
                      {data.notes && (
                        <p className="text-xs text-navy-400">{data.notes}</p>
                      )}
                    </div>
                  </div>

                  {isManager && !isPast ? (
                    <div className="flex gap-1">
                      {['available', 'maybe', 'unavailable'].map(status => {
                        const Icon = statusIcons[status]
                        return (
                          <button
                            key={status}
                            onClick={() => handleAvailabilityUpdate(playerId, status)}
                            className={`p-1.5 rounded transition ${
                              data.status === status
                                ? statusColors[status]
                                : 'text-navy-500 hover:text-navy-300'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <span className={`px-2 py-1 rounded text-xs border ${statusColors[data.status]}`}>
                      <StatusIcon className="w-3 h-3 inline mr-1" />
                      {data.status}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* View Full Match Button */}
        <Link
          to={`/matches/${selectedMatch.id}`}
          className="btn-secondary w-full mt-4"
        >
          View Match Details
          <ChevronRight className="w-4 h-4" />
        </Link>
      </motion.div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Matches</h1>
          <p className="text-navy-400">{branding?.teamName} • {branding?.ageGroup}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-lg bg-navy-800 p-1">
            <button
              onClick={() => setShowCalendar(false)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                !showCalendar ? 'bg-pitch-600 text-white' : 'text-navy-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setShowCalendar(true)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                showCalendar ? 'bg-pitch-600 text-white' : 'text-navy-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              Calendar
            </button>
          </div>

          {isManager && (
            <>
              {matches.length > 0 && (
                <button
                  onClick={() => setShowDeleteAllModal(true)}
                  className="btn-secondary text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="hidden sm:inline">Delete...</span>
                </button>
              )}
              <button onClick={() => setShowImportModal(true)} className="btn-secondary">
                <Upload className="w-5 h-5" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <button onClick={() => setShowAddModal(true)} className="btn-primary">
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Add Match</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Calendar View */}
      {showCalendar ? (
        <section className="mb-8">
          <div className="card p-6">
            <EventCalendar
              matches={matches}
              training={trainingSessions}
              teamName={team?.name}
              onSelectEvent={(event, type) => {
                if (type === 'match') {
                  navigate(`/matches/${event.id}`)
                } else {
                  navigate('/training')
                }
              }}
            />
          </div>

          {/* Quick Stats under calendar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="card p-4 text-center">
              <p className="text-2xl font-display font-bold text-energy-400">{upcomingMatches.length}</p>
              <p className="text-sm text-navy-400">Upcoming</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-display font-bold text-pitch-400">
                {recentResults.filter(m => {
                  const [home, away] = (m.result || '').split('-').map(Number)
                  return home > away
                }).length}
              </p>
              <p className="text-sm text-navy-400">Wins</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-display font-bold text-white">{recentResults.length}</p>
              <p className="text-sm text-navy-400">Played</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-display font-bold text-purple-400">{trainingSessions.length}</p>
              <p className="text-sm text-navy-400">Training</p>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'upcoming'
                  ? 'bg-pitch-500 text-white'
                  : 'bg-navy-800 text-navy-400 hover:text-white'
              }`}
            >
              Upcoming ({upcomingMatches.length})
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'results'
                  ? 'bg-pitch-500 text-white'
                  : 'bg-navy-800 text-navy-400 hover:text-white'
              }`}
            >
              Results ({recentResults.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'all'
                  ? 'bg-pitch-500 text-white'
                  : 'bg-navy-800 text-navy-400 hover:text-white'
              }`}
            >
              All ({matches.length})
            </button>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Match List */}
            <div className="lg:col-span-2 space-y-3">
              <AnimatePresence mode="popLayout">
                {activeTab === 'upcoming' && upcomingMatches.map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
                {activeTab === 'results' && recentResults.map(match => (
                  <MatchCard key={match.id} match={match} showResult />
                ))}
                {activeTab === 'all' && sortedMatches.map(match => (
                    <MatchCard key={match.id} match={match} showResult={!!match.result} />
                  ))
                }
              </AnimatePresence>

              {((activeTab === 'upcoming' && upcomingMatches.length === 0) ||
                (activeTab === 'results' && recentResults.length === 0) ||
                (activeTab === 'all' && matches.length === 0)) && (
                <div className="card text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-navy-600" />
                  <p className="text-navy-400">No {activeTab} matches</p>
                  {isManager && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="btn-primary mt-4"
                    >
                      <Plus className="w-5 h-5" />
                      Add First Match
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Availability Panel */}
            <div className="lg:col-span-1">
              {selectedMatch ? (
                <AvailabilityPanel />
              ) : (
                <div className="card text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-navy-600" />
                  <p className="text-navy-400">Select a match to view availability</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* New Match Modal */}
      <AnimatePresence>
        {showAddModal && <NewMatchModal />}
      </AnimatePresence>

      {/* Import from Image Modal */}
      <AnimatePresence>
        {showImportModal && <ImportFromImageModal />}
      </AnimatePresence>

      {/* Delete All Modal */}
      <AnimatePresence>
        {showDeleteAllModal && <DeleteAllModal />}
      </AnimatePresence>
    </div>
  )
}
