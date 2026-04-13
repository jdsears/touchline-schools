import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { teacherService, matchService } from '../../services/api'
import { Trophy, Plus, Calendar, MapPin, Filter, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

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
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function resultBadge(match) {
  if (match.goals_for == null || match.goals_against == null) return null
  const gf = parseInt(match.goals_for)
  const ga = parseInt(match.goals_against)
  if (gf > ga) return { label: 'W', color: 'bg-pitch-600/20 text-pitch-400' }
  if (gf < ga) return { label: 'L', color: 'bg-alert-600/20 text-alert-400' }
  return { label: 'D', color: 'bg-amber-400/20 text-amber-400' }
}

export default function TeacherFixtures() {
  const [fixtures, setFixtures] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [sportFilter, setSportFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all') // all, upcoming, results

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [fixturesRes, teamsRes] = await Promise.all([
        teacherService.getMyFixtures(),
        teacherService.getMyTeams(),
      ])
      setFixtures(fixturesRes.data)
      setTeams(teamsRes.data)
    } catch (err) {
      console.error('Failed to load fixtures:', err)
    } finally {
      setLoading(false)
    }
  }

  const now = new Date()
  const sports = [...new Set(fixtures.map(f => f.sport).filter(Boolean))]

  let filtered = fixtures
  if (sportFilter !== 'all') filtered = filtered.filter(f => f.sport === sportFilter)
  if (timeFilter === 'upcoming') filtered = filtered.filter(f => new Date(f.date) >= now)
  if (timeFilter === 'results') filtered = filtered.filter(f => f.goals_for != null)

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
          <h1 className="text-2xl font-bold text-white">Fixtures & Results</h1>
          <p className="text-navy-400 mt-1">School matches across all your teams</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Time filter */}
        <div className="flex items-center gap-2">
          {['all', 'upcoming', 'results'].map(f => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors capitalize ${
                timeFilter === f
                  ? 'bg-pitch-600/20 text-pitch-400'
                  : 'bg-navy-800 text-navy-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f === 'upcoming' ? 'Upcoming' : 'Results'}
            </button>
          ))}
        </div>

        {/* Sport filter */}
        {sports.length > 1 && (
          <div className="flex items-center gap-2 border-l border-navy-700 pl-4">
            {sports.map(sport => (
              <button
                key={sport}
                onClick={() => setSportFilter(sportFilter === sport ? 'all' : sport)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors capitalize ${
                  sportFilter === sport
                    ? 'bg-pitch-600/20 text-pitch-400'
                    : 'bg-navy-800 text-navy-400 hover:text-white'
                }`}
              >
                {SPORT_ICONS[sport] || ''} {sport}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fixture list */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(match => {
            const result = resultBadge(match)
            const isUpcoming = new Date(match.date) >= now

            return (
              <div
                key={match.id}
                className="bg-navy-900 rounded-xl border border-navy-800 p-5 hover:border-navy-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Sport icon */}
                    <div className="w-10 h-10 rounded-lg bg-navy-800 flex items-center justify-center text-lg">
                      {SPORT_ICONS[match.sport] || <Trophy className="w-5 h-5 text-navy-400" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{match.team_name}</span>
                        <span className="text-navy-600">vs</span>
                        <span className="text-sm font-medium text-white">{match.opponent || 'TBC'}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-navy-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(match.date)} {formatTime(match.date)}
                        </span>
                        {match.location && (
                          <span className="text-xs text-navy-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {match.is_home ? 'Home' : 'Away'}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 bg-navy-800 rounded text-xs text-navy-400 capitalize">{match.sport}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {result ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white">
                          {match.goals_for} - {match.goals_against}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${result.color}`}>
                          {result.label}
                        </span>
                      </div>
                    ) : isUpcoming ? (
                      <span className="px-2 py-0.5 bg-navy-800 rounded text-xs text-navy-400">Upcoming</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-navy-800 rounded text-xs text-navy-400">No result</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-navy-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No teams assigned</h3>
          <p className="text-navy-400 text-sm max-w-md mx-auto">
            Once you have extra-curricular teams, their fixtures will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-navy-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No fixtures yet</h3>
          <p className="text-navy-400 text-sm max-w-md mx-auto">
            Add fixtures from each team's page to see them here. Fixtures across all your teams
            will be shown in one combined view.
          </p>
        </div>
      )}
    </div>
  )
}
