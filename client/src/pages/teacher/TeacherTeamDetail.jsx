import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { teamService, matchService } from '../../services/api'
import {
  ChevronLeft, Users, Trophy, Calendar, MapPin,
  Shield, Loader2, Clock, Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'

const SPORT_ICONS = {
  football: '⚽', rugby: '🏉', cricket: '🏏',
  hockey: '🏑', netball: '🤾',
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function TeacherTeamDetail() {
  const { teamId } = useParams()
  const [team, setTeam] = useState(null)
  const [pupils, setPupils] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTeamData()
  }, [teamId])

  async function loadTeamData() {
    setLoading(true)
    try {
      const [teamRes, pupilsRes, matchesRes] = await Promise.all([
        teamService.getTeam(teamId),
        teamService.getPlayers(teamId).catch(() => ({ data: [] })),
        teamService.getMatches(teamId).catch(() => ({ data: [] })),
      ])
      setTeam(teamRes.data)
      setPupils(Array.isArray(pupilsRes.data) ? pupilsRes.data : [])
      setMatches(Array.isArray(matchesRes.data) ? matchesRes.data : [])
    } catch (err) {
      console.error('Failed to load team:', err)
      toast.error('Failed to load team')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-navy-500" />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="p-6 text-center">
        <p className="text-navy-400">Team not found</p>
        <Link to="/teacher/teams" className="text-pitch-400 hover:underline mt-2 inline-block">
          Back to teams
        </Link>
      </div>
    )
  }

  const now = new Date()
  const upcoming = matches.filter(m => {
    const d = m.date || m.match_date
    return d && new Date(d) >= now
  })
  const past = matches.filter(m => {
    const d = m.date || m.match_date
    return d && new Date(d) < now
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back + Header */}
      <Link to="/teacher/teams" className="inline-flex items-center gap-1.5 text-sm text-navy-400 hover:text-white transition-colors mb-4">
        <ChevronLeft className="w-4 h-4" />
        All Teams
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-xl bg-navy-800 flex items-center justify-center text-2xl">
          {SPORT_ICONS[team.sport] || <Shield className="w-7 h-7 text-navy-400" />}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{team.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="px-2 py-0.5 bg-navy-800 rounded text-xs text-navy-300 capitalize">{team.sport}</span>
            {team.age_group && <span className="text-sm text-navy-400">{team.age_group}</span>}
            {team.gender && team.gender !== 'mixed' && (
              <span className="text-sm text-navy-400 capitalize">{team.gender}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-4 text-center">
          <div className="text-2xl font-bold text-white">{pupils.length}</div>
          <div className="text-xs text-navy-400 mt-1">Squad</div>
        </div>
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-4 text-center">
          <div className="text-2xl font-bold text-white">{past.length}</div>
          <div className="text-xs text-navy-400 mt-1">Played</div>
        </div>
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-4 text-center">
          <div className="text-2xl font-bold text-white">{upcoming.length}</div>
          <div className="text-xs text-navy-400 mt-1">Upcoming</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Squad */}
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-pitch-400" />
              Squad ({pupils.length})
            </h2>
          </div>
          {pupils.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {pupils.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-navy-800/50">
                  <div>
                    <span className="text-sm text-white">{p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim()}</span>
                    {p.position && <span className="text-xs text-navy-500 ml-2">{p.position}</span>}
                  </div>
                  {p.jersey_number && (
                    <span className="text-xs text-navy-500 font-mono">#{p.jersey_number}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-navy-500 text-sm text-center py-6">No pupils assigned to this team yet</p>
          )}
        </div>

        {/* Fixtures */}
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Fixtures ({matches.length})
            </h2>
          </div>
          {matches.length > 0 ? (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {/* Upcoming */}
              {upcoming.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-2">Upcoming</h3>
                  <div className="space-y-2">
                    {upcoming.map(m => (
                      <MatchRow key={m.id} match={m} />
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              {past.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-2">Results</h3>
                  <div className="space-y-2">
                    {past.map(m => (
                      <MatchRow key={m.id} match={m} showResult />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-navy-500 text-sm text-center py-6">No fixtures scheduled</p>
          )}
        </div>
      </div>
    </div>
  )
}

function MatchRow({ match, showResult }) {
  const d = match.date || match.match_date
  const isHome = match.home_away === 'home'
  const hasResult = match.score_for != null && match.score_against != null
  const won = hasResult && match.score_for > match.score_against
  const drew = hasResult && match.score_for === match.score_against
  const lost = hasResult && match.score_for < match.score_against

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-navy-800/30">
      <div className="flex items-center gap-3">
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isHome ? 'bg-pitch-600/20 text-pitch-400' : 'bg-navy-700 text-navy-300'}`}>
          {isHome ? 'H' : 'A'}
        </span>
        <div>
          <span className="text-sm text-white">{match.opponent}</span>
          <div className="text-xs text-navy-500 flex items-center gap-2 mt-0.5">
            <Calendar className="w-3 h-3" />
            {formatDate(d)}
            {match.location && (
              <>
                <MapPin className="w-3 h-3 ml-1" />
                <span className="truncate max-w-[150px]">{match.location}</span>
              </>
            )}
          </div>
        </div>
      </div>
      {showResult && hasResult && (
        <span className={`text-sm font-bold px-2 py-1 rounded ${
          won ? 'text-green-400' : lost ? 'text-red-400' : 'text-navy-300'
        }`}>
          {match.score_for} - {match.score_against}
        </span>
      )}
    </div>
  )
}
