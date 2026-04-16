import { useState, useEffect } from 'react'
import { teacherService } from '../../services/api'
import { Calendar, Clock, Target, Filter, Users } from 'lucide-react'

const SPORT_ICONS = {
  football: '\u26BD',
  rugby: '\uD83C\uDFC9',
  cricket: '\uD83C\uDFCF',
  hockey: '\uD83C\uDFD1',
  netball: '\uD83E\uDD3E',
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function TeacherSessions() {
  const [sessions, setSessions] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [sportFilter, setSportFilter] = useState('all')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [sessionsRes, teamsRes] = await Promise.all([
        teacherService.getMySessions().catch(() => ({ data: [] })),
        teacherService.getMyTeams().catch(() => ({ data: [] })),
      ])
      setSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : [])
      setTeams(Array.isArray(teamsRes.data) ? teamsRes.data : [])
    } catch (err) {
      console.error('Failed to load sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  const sports = [...new Set(sessions.map(s => s.sport).filter(Boolean))]
  const filtered = sportFilter === 'all' ? sessions : sessions.filter(s => s.sport === sportFilter)

  // Split into upcoming and past
  const now = new Date()
  const upcoming = filtered.filter(s => new Date(s.session_date) >= now)
  const past = filtered.filter(s => new Date(s.session_date) < now)

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Session Planning</h1>
          <p className="text-navy-400 mt-1">Training sessions across all your teams</p>
        </div>
      </div>

      {/* Sport filter */}
      {sports.length > 1 && (
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-4 h-4 text-navy-500" />
          <button
            onClick={() => setSportFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              sportFilter === 'all' ? 'bg-pitch-600/20 text-pitch-400' : 'bg-navy-800 text-navy-400 hover:text-white'
            }`}
          >
            All
          </button>
          {sports.map(sport => (
            <button
              key={sport}
              onClick={() => setSportFilter(sport)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors capitalize ${
                sportFilter === sport ? 'bg-pitch-600/20 text-pitch-400' : 'bg-navy-800 text-navy-400 hover:text-white'
              }`}
            >
              {SPORT_ICONS[sport] || ''} {sport}
            </button>
          ))}
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="space-y-8">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-navy-400 uppercase tracking-wider mb-3">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map(session => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-navy-400 uppercase tracking-wider mb-3">Previous</h2>
              <div className="space-y-3">
                {past.slice(0, 20).map(session => (
                  <SessionCard key={session.id} session={session} faded />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-navy-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No teams assigned</h3>
          <p className="text-navy-400 text-sm max-w-md mx-auto">
            Once you have extra-curricular teams, their training sessions will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-navy-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No sessions planned</h3>
          <p className="text-navy-400 text-sm max-w-md mx-auto">
            Create training sessions from each team's page. The AI assistant can help generate
            sport-specific session plans tailored to your team's level.
          </p>
        </div>
      )}
    </div>
  )
}

function SessionCard({ session, faded }) {
  const focusAreas = session.focus_areas
    ? (typeof session.focus_areas === 'string' ? session.focus_areas.split(',') : session.focus_areas)
    : []

  return (
    <div className={`bg-navy-900 rounded-xl border border-navy-800 p-5 ${faded ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-navy-800 flex items-center justify-center text-lg">
            {SPORT_ICONS[session.sport] || <Calendar className="w-5 h-5 text-navy-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">{session.team_name}</span>
              <span className="px-1.5 py-0.5 bg-navy-800 rounded text-xs text-navy-400 capitalize">{session.sport}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-navy-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(session.session_date)}
              </span>
              {session.duration && (
                <span className="text-xs text-navy-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {session.duration} min
                </span>
              )}
            </div>
          </div>
        </div>

        {focusAreas.length > 0 && (
          <div className="hidden md:flex flex-wrap gap-1 max-w-xs">
            {focusAreas.slice(0, 3).map((area, i) => (
              <span key={i} className="px-2 py-0.5 bg-navy-800 rounded text-xs text-navy-300">
                {typeof area === 'string' ? area.trim() : area}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
