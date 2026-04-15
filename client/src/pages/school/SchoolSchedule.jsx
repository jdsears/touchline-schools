import { useState, useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { scheduleService, clubService } from '../../services/api'
import {
  Calendar, Plus, X, ChevronLeft, ChevronRight, Clock,
  MapPin, Users, Repeat, Dumbbell, Swords, Shield,
  Trophy, Check, Minus, AlertCircle, UserCheck, UserX,
  MessageSquare, ChevronDown, ChevronUp, HeartHandshake,
} from 'lucide-react'
import toast from 'react-hot-toast'

const SESSION_TYPES = [
  { value: 'training', label: 'Training', icon: Dumbbell, color: 'bg-emerald-600/20 text-emerald-400' },
  { value: 'match', label: 'Match', icon: Swords, color: 'bg-red-500/20 text-red-400' },
  { value: 'friendly', label: 'Friendly', icon: HeartHandshake, color: 'bg-blue-600/20 text-blue-400' },
  { value: 'cup', label: 'Cup Match', icon: Trophy, color: 'bg-amber-600/20 text-amber-400' },
  { value: 'other', label: 'Other', icon: Calendar, color: 'bg-navy-700 text-navy-300' },
]

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const AVAILABILITY_COLORS = {
  available: 'bg-pitch-500',
  unavailable: 'bg-red-500',
  maybe: 'bg-amber-500',
  pending: 'bg-navy-600',
}

const emptyForm = {
  type: 'training',
  date: '',
  start_time: '18:00',
  end_time: '19:30',
  venue: '',
  opponent: '',
  notes: '',
  is_recurring: false,
  recurring_days: [],
  recurring_until: '',
}

export default function ClubSchedule() {
  const { school, myRole } = useOutletContext()
  const [teams, setTeams] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [editingSession, setEditingSession] = useState(null)
  const [expandedSession, setExpandedSession] = useState(null)
  const [availability, setAvailability] = useState({})
  const [loadingAvailability, setLoadingAvailability] = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)

  const canManage = ['owner', 'admin', 'coach'].includes(myRole)

  useEffect(() => {
    if (school?.id) loadTeams()
  }, [school?.id])

  useEffect(() => {
    if (selectedTeamId) loadSchedule()
  }, [selectedTeamId, weekOffset])

  async function loadTeams() {
    try {
      const res = await clubService.getTeams(school.id)
      setTeams(res.data)
      if (res.data.length > 0) {
        setSelectedTeamId(res.data[0].id)
      } else {
        setLoading(false)
      }
    } catch (err) {
      toast.error('Failed to load teams')
      setLoading(false)
    }
  }

  async function loadSchedule() {
    setLoading(true)
    try {
      const weekStart = getWeekStart(weekOffset)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      const res = await scheduleService.getSchedule(selectedTeamId, {
        from: weekStart.toISOString().split('T')[0],
        to: weekEnd.toISOString().split('T')[0],
      })
      setSessions(res.data)
    } catch (err) {
      toast.error('Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }

  async function loadAvailability(sessionId) {
    if (availability[sessionId]) {
      setExpandedSession(expandedSession === sessionId ? null : sessionId)
      return
    }
    setLoadingAvailability(sessionId)
    try {
      const res = await scheduleService.getAvailability(selectedTeamId, sessionId)
      setAvailability(prev => ({ ...prev, [sessionId]: res.data }))
      setExpandedSession(sessionId)
    } catch (err) {
      toast.error('Failed to load availability')
    } finally {
      setLoadingAvailability(null)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.date || !form.start_time) {
      return toast.error('Date and start time are required')
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        recurring_days: form.is_recurring ? form.recurring_days : [],
      }
      if (editingSession) {
        await scheduleService.updateSession(selectedTeamId, editingSession.id, payload)
        toast.success('Session updated')
      } else {
        await scheduleService.createSession(selectedTeamId, payload)
        toast.success(form.is_recurring ? 'Recurring sessions created' : 'Session created')
      }
      resetForm()
      loadSchedule()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save session')
    } finally {
      setSaving(false)
    }
  }

  async function handleCancelSession(sessionId) {
    if (!confirm('Cancel this session?')) return
    try {
      await scheduleService.cancelSession(selectedTeamId, sessionId)
      toast.success('Session cancelled')
      loadSchedule()
    } catch (err) {
      toast.error('Failed to cancel session')
    }
  }

  async function handleAttendanceToggle(sessionId, pupilId, status) {
    try {
      await scheduleService.updateAttendance(selectedTeamId, sessionId, {
        pupil_id: pupilId,
        status,
      })
      setAvailability(prev => ({
        ...prev,
        [sessionId]: prev[sessionId].map(a =>
          a.pupil_id === pupilId ? { ...a, attendance: status } : a
        ),
      }))
    } catch (err) {
      toast.error('Failed to update attendance')
    }
  }

  function startEdit(session) {
    setForm({
      type: session.type || 'training',
      date: session.date?.split('T')[0] || '',
      start_time: session.start_time || '18:00',
      end_time: session.end_time || '19:30',
      venue: session.venue || '',
      opponent: session.opponent || '',
      notes: session.notes || '',
      is_recurring: false,
      recurring_days: [],
      recurring_until: '',
    })
    setEditingSession(session)
    setShowCreate(true)
  }

  function resetForm() {
    setForm({ ...emptyForm })
    setEditingSession(null)
    setShowCreate(false)
  }

  function getWeekStart(offset) {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + offset * 7
    const monday = new Date(d.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday
  }

  function toggleRecurringDay(dayIndex) {
    setForm(f => {
      const days = f.recurring_days.includes(dayIndex)
        ? f.recurring_days.filter(d => d !== dayIndex)
        : [...f.recurring_days, dayIndex].sort()
      return { ...f, recurring_days: days }
    })
  }

  // Group sessions by day of week
  const weekStart = getWeekStart(weekOffset)
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart)
      day.setDate(day.getDate() + i)
      return {
        date: day,
        dateStr: day.toISOString().split('T')[0],
        label: DAYS_OF_WEEK[i],
        fullLabel: DAYS_FULL[i],
        isToday: day.toDateString() === new Date().toDateString(),
      }
    })
  }, [weekOffset])

  const sessionsByDay = useMemo(() => {
    const grouped = {}
    weekDays.forEach(d => { grouped[d.dateStr] = [] })
    sessions.forEach(s => {
      const dateStr = s.date?.split('T')[0]
      if (grouped[dateStr]) {
        grouped[dateStr].push(s)
      }
    })
    return grouped
  }, [sessions, weekDays])

  const weekLabel = useMemo(() => {
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 6)
    const opts = { day: 'numeric', month: 'short' }
    return `${weekStart.toLocaleDateString('en-GB', opts)} - ${end.toLocaleDateString('en-GB', opts)} ${end.getFullYear()}`
  }, [weekOffset])

  if (!school) return null

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Schedule</h1>
          <p className="text-navy-400 text-sm mt-1">Training sessions, matches and availability</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Team selector */}
          {teams.length > 1 && (
            <select
              value={selectedTeamId || ''}
              onChange={(e) => {
                setSelectedTeamId(e.target.value)
                setWeekOffset(0)
                setSessions([])
                setAvailability({})
                setExpandedSession(null)
              }}
              className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
            >
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          )}
          {canManage && selectedTeamId && (
            <button
              onClick={() => {
                if (showCreate) resetForm()
                else setShowCreate(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors"
            >
              {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showCreate ? 'Cancel' : 'Add Session'}
            </button>
          )}
        </div>
      </div>

      {/* No teams state */}
      {teams.length === 0 && !loading && (
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-8 text-center">
          <Users className="w-12 h-12 text-navy-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">No teams yet</h3>
          <p className="text-navy-400 text-sm">Create a team first to manage schedules.</p>
        </div>
      )}

      {/* Create/Edit session form */}
      {showCreate && selectedTeamId && (
        <form onSubmit={handleSubmit} className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-5">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-pitch-400" />
            {editingSession ? 'Edit Session' : 'New Session'}
          </h3>

          {/* Type */}
          <div>
            <label className="block text-xs text-navy-400 mb-2">Session Type</label>
            <div className="flex flex-wrap gap-2">
              {SESSION_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: t.value }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    form.type === t.value ? t.color + ' ring-1 ring-current' : 'bg-navy-800 text-navy-400 hover:text-white'
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date and time */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-navy-400 mb-1">Date *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Start Time *</label>
              <input
                type="time"
                required
                value={form.start_time}
                onChange={(e) => setForm(f => ({ ...f, start_time: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">End Time</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm(f => ({ ...f, end_time: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
          </div>

          {/* Venue and opponent */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-navy-400 mb-1">Venue</label>
              <input
                type="text"
                value={form.venue}
                onChange={(e) => setForm(f => ({ ...f, venue: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                placeholder="e.g. Main Pitch, Sports Hall"
              />
            </div>
            {['match', 'friendly', 'cup'].includes(form.type) && (
              <div>
                <label className="block text-xs text-navy-400 mb-1">Opponent</label>
                <input
                  type="text"
                  value={form.opponent}
                  onChange={(e) => setForm(f => ({ ...f, opponent: e.target.value }))}
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                  placeholder="Opponent team name"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-navy-400 mb-1">Notes</label>
            <textarea
              value={form.notes}
              rows={2}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent resize-none"
              placeholder="Any additional notes..."
            />
          </div>

          {/* Recurring toggle */}
          {!editingSession && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-navy-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_recurring}
                  onChange={(e) => setForm(f => ({ ...f, is_recurring: e.target.checked }))}
                  className="rounded bg-navy-800 border-navy-700 text-pitch-600 focus:ring-pitch-600"
                />
                <Repeat className="w-4 h-4" />
                Make recurring
              </label>

              {form.is_recurring && (
                <div className="space-y-3 pl-6">
                  <div>
                    <label className="block text-xs text-navy-400 mb-2">Repeat on days</label>
                    <div className="flex gap-2">
                      {DAYS_OF_WEEK.map((day, idx) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleRecurringDay(idx)}
                          className={`w-10 h-10 rounded-lg text-xs font-medium transition-colors ${
                            form.recurring_days.includes(idx)
                              ? 'bg-pitch-600 text-white'
                              : 'bg-navy-800 text-navy-400 hover:text-white hover:bg-navy-700'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="max-w-xs">
                    <label className="block text-xs text-navy-400 mb-1">Repeat until</label>
                    <input
                      type="date"
                      value={form.recurring_until}
                      onChange={(e) => setForm(f => ({ ...f, recurring_until: e.target.value }))}
                      className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-navy-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors">
              {saving ? 'Saving...' : editingSession ? 'Update Session' : 'Create Session'}
            </button>
          </div>
        </form>
      )}

      {/* Week navigation */}
      {selectedTeamId && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-2 text-navy-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">{weekLabel}</p>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-xs text-pitch-400 hover:text-pitch-300 transition-colors"
              >
                Go to this week
              </button>
            )}
          </div>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-2 text-navy-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Calendar grid */}
      {selectedTeamId && !loading && (
        <div className="space-y-2">
          {weekDays.map(day => {
            const daySessions = sessionsByDay[day.dateStr] || []
            return (
              <div key={day.dateStr} className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
                {/* Day header */}
                <div className={`px-4 py-2.5 flex items-center gap-3 border-b border-navy-800/50 ${
                  day.isToday ? 'bg-pitch-600/10' : ''
                }`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    day.isToday
                      ? 'bg-pitch-600 text-white'
                      : 'bg-navy-800 text-navy-400'
                  }`}>
                    {day.date.getDate()}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${day.isToday ? 'text-pitch-400' : 'text-white'}`}>
                      {day.fullLabel}
                    </p>
                    <p className="text-xs text-navy-500">
                      {day.date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  {daySessions.length > 0 && (
                    <span className="ml-auto text-xs text-navy-400">{daySessions.length} session{daySessions.length !== 1 ? 's' : ''}</span>
                  )}
                </div>

                {/* Sessions */}
                {daySessions.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-navy-600">No sessions</div>
                ) : (
                  <div className="divide-y divide-navy-800/50">
                    {daySessions.map(session => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        canManage={canManage}
                        expanded={expandedSession === session.id}
                        availabilityData={availability[session.id]}
                        loadingAvailability={loadingAvailability === session.id}
                        onToggleExpand={() => loadAvailability(session.id)}
                        onEdit={() => startEdit(session)}
                        onCancel={() => handleCancelSession(session.id)}
                        onAttendanceToggle={(pupilId, status) =>
                          handleAttendanceToggle(session.id, pupilId, status)
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Loading */}
      {loading && selectedTeamId && (
        <div className="flex items-center justify-center py-12">
          <div className="spinner w-8 h-8" />
        </div>
      )}
    </div>
  )
}

function SessionCard({
  session, canManage, expanded, availabilityData, loadingAvailability,
  onToggleExpand, onEdit, onCancel, onAttendanceToggle,
}) {
  const typeConfig = SESSION_TYPES.find(t => t.value === session.type) || SESSION_TYPES[SESSION_TYPES.length - 1]
  const TypeIcon = typeConfig.icon
  const isCancelled = session.status === 'cancelled'

  // Availability summary
  const summary = useMemo(() => {
    if (!availabilityData) {
      return { available: session.available_count || 0, unavailable: session.unavailable_count || 0, maybe: session.maybe_count || 0, pending: session.pending_count || 0, total: session.total_players || 0 }
    }
    const counts = { available: 0, unavailable: 0, maybe: 0, pending: 0 }
    availabilityData.forEach(a => {
      const status = a.response || 'pending'
      if (counts[status] !== undefined) counts[status]++
      else counts.pending++
    })
    return { ...counts, total: availabilityData.length }
  }, [session, availabilityData])

  return (
    <div className={`${isCancelled ? 'opacity-60' : ''}`}>
      {/* Session row */}
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-navy-800/30 transition-colors">
        {/* Type icon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeConfig.color}`}>
          <TypeIcon className="w-4 h-4" />
        </div>

        {/* Session info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white">
              {session.start_time}
              {session.end_time && ` - ${session.end_time}`}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${typeConfig.color}`}>
              {typeConfig.label}
            </span>
            {isCancelled && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Cancelled</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-navy-400">
            {session.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {session.venue}
              </span>
            )}
            {session.opponent && (
              <span className="flex items-center gap-1">
                <Swords className="w-3 h-3" />
                vs {session.opponent}
              </span>
            )}
          </div>
        </div>

        {/* Availability summary bar */}
        {summary.total > 0 && (
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <div className="flex w-24 h-2 rounded-full overflow-hidden bg-navy-800">
              {summary.available > 0 && (
                <div
                  className={AVAILABILITY_COLORS.available}
                  style={{ width: `${(summary.available / summary.total) * 100}%` }}
                />
              )}
              {summary.maybe > 0 && (
                <div
                  className={AVAILABILITY_COLORS.maybe}
                  style={{ width: `${(summary.maybe / summary.total) * 100}%` }}
                />
              )}
              {summary.unavailable > 0 && (
                <div
                  className={AVAILABILITY_COLORS.unavailable}
                  style={{ width: `${(summary.unavailable / summary.total) * 100}%` }}
                />
              )}
            </div>
            <span className="text-xs text-navy-500 w-16 text-right">
              {summary.available}/{summary.total}
            </span>
          </div>
        )}

        {/* Expand button */}
        <button
          onClick={onToggleExpand}
          disabled={loadingAvailability}
          className="p-1.5 text-navy-400 hover:text-white transition-colors shrink-0"
        >
          {loadingAvailability ? (
            <div className="spinner w-4 h-4" />
          ) : expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-3 space-y-3">
          {/* Notes */}
          {session.notes && (
            <div className="flex items-start gap-2 p-3 bg-navy-800/50 rounded-lg">
              <MessageSquare className="w-4 h-4 text-navy-500 mt-0.5 shrink-0" />
              <p className="text-xs text-navy-300">{session.notes}</p>
            </div>
          )}

          {/* Availability summary badges */}
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-pitch-600/20 text-pitch-400">
              <Check className="w-3 h-3" /> {summary.available} available
            </span>
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400">
              <AlertCircle className="w-3 h-3" /> {summary.maybe} maybe
            </span>
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-400">
              <X className="w-3 h-3" /> {summary.unavailable} unavailable
            </span>
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-navy-700 text-navy-400">
              <Minus className="w-3 h-3" /> {summary.pending} pending
            </span>
          </div>

          {/* Availability list */}
          {availabilityData && availabilityData.length > 0 && (
            <div className="bg-navy-800/30 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-navy-700/50">
                    <th className="text-left px-3 py-2 text-xs font-medium text-navy-400 uppercase">Pupil</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-navy-400 uppercase">Response</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-navy-400 uppercase">Reason</th>
                    {canManage && (
                      <th className="text-center px-3 py-2 text-xs font-medium text-navy-400 uppercase">Attendance</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {availabilityData.map(a => (
                    <tr key={a.pupil_id || a.id} className="border-b border-navy-700/30 last:border-0">
                      <td className="px-3 py-2 text-sm text-white font-medium">{a.player_name}</td>
                      <td className="px-3 py-2">
                        <ResponseBadge response={a.response} />
                      </td>
                      <td className="px-3 py-2 text-xs text-navy-400">{a.reason || '-'}</td>
                      {canManage && (
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onAttendanceToggle(a.pupil_id, 'present')}
                              className={`p-1 rounded transition-colors ${
                                a.attendance === 'present'
                                  ? 'bg-pitch-600/20 text-pitch-400'
                                  : 'text-navy-600 hover:text-pitch-400'
                              }`}
                              title="Present"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onAttendanceToggle(a.pupil_id, 'absent')}
                              className={`p-1 rounded transition-colors ${
                                a.attendance === 'absent'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'text-navy-600 hover:text-red-400'
                              }`}
                              title="Absent"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Actions */}
          {canManage && !isCancelled && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-navy-300 hover:text-white rounded-lg text-xs transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={onCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 hover:bg-red-600/20 text-navy-300 hover:text-red-400 rounded-lg text-xs transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Cancel Session
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ResponseBadge({ response }) {
  const styles = {
    available: { className: 'bg-pitch-600/20 text-pitch-400', icon: Check, label: 'Available' },
    unavailable: { className: 'bg-red-500/20 text-red-400', icon: X, label: 'Unavailable' },
    maybe: { className: 'bg-amber-500/20 text-amber-400', icon: AlertCircle, label: 'Maybe' },
    pending: { className: 'bg-navy-700 text-navy-400', icon: Minus, label: 'Pending' },
  }
  const config = styles[response] || styles.pending
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}
