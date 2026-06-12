import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { teamService } from '../../services/api'
import { SPORT_ICONS } from '../../constants/sports'
import TeamSessionsCard from '../../components/team/TeamSessionsCard'
import { StatCard, IconTile } from '../../components/common/ui'
import {
  ChevronLeft, Users, Trophy, Calendar, MapPin,
  Shield, Loader2, Clock, Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'


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
        <Loader2 className="w-8 h-8 animate-spin text-tertiary" />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="p-6 text-center">
        <p className="text-secondary">Team not found</p>
        <Link to="/teacher/teams" className="text-brand-primary hover:underline mt-2 inline-block">
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
      <Link to="/teacher/teams" className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-link transition-colors mb-4">
        <ChevronLeft className="w-4 h-4" />
        All Teams
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-xl bg-subtle flex items-center justify-center text-2xl">
          {SPORT_ICONS[team.sport] || <Shield className="w-7 h-7 text-secondary" />}
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-[-0.015em] text-primary">{team.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="px-2 py-0.5 bg-subtle rounded text-xs text-secondary capitalize">{team.sport}</span>
            {team.age_group && <span className="text-sm text-secondary">{team.age_group}</span>}
            {team.gender && team.gender !== 'mixed' && (
              <span className="text-sm text-secondary capitalize">{team.gender}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Squad" value={pupils.length} sub="pupils in this team" />
        <StatCard label="Played" value={past.length} sub="fixtures completed" />
        <StatCard label="Upcoming" value={upcoming.length} sub="fixtures scheduled" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Squad */}
        <div className="bg-card rounded-xl border border-border-default p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary flex items-center gap-2.5 font-display">
              <IconTile icon={Users} size="sm" />
              Squad ({pupils.length})
            </h2>
          </div>
          {pupils.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {pupils.map(p => (
                <Link key={p.id} to={`/teacher/hod/pupils/${p.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-subtle transition-colors">
                  <div>
                    <span className="text-sm text-primary hover:text-brand-primary transition-colors">{p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim()}</span>
                    {p.position && <span className="text-xs text-tertiary ml-2">{p.position}</span>}
                  </div>
                  {p.jersey_number && (
                    <span className="text-xs text-tertiary font-mono">#{p.jersey_number}</span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-tertiary text-sm text-center py-6">No pupils assigned to this team yet</p>
          )}
        </div>

        {/* Fixtures */}
        <div className="bg-card rounded-xl border border-border-default p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary flex items-center gap-2.5 font-display">
              <IconTile icon={Trophy} size="sm" />
              Fixtures ({matches.length})
            </h2>
            <Link to={`/teacher/teams/${teamId}/fixtures/block`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand-primary hover:bg-brand-primary text-on-dark rounded-lg">
              <Plus className="w-3.5 h-3.5" /> Add in bulk
            </Link>
          </div>
          {matches.length > 0 ? (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {/* Upcoming */}
              {upcoming.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">Upcoming</h3>
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
                  <h3 className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">Results</h3>
                  <div className="space-y-2">
                    {past.map(m => (
                      <MatchRow key={m.id} match={m} showResult />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-tertiary text-sm text-center py-6">No fixtures scheduled</p>
          )}
        </div>

        {/* Training sessions */}
        <TeamSessionsCard teamId={teamId} sport={team.sport} pupilCount={pupils.length} />
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
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-subtle">
      <div className="flex items-center gap-3">
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isHome ? 'bg-brand-primary-tint text-brand-primary' : 'bg-border-default text-secondary'}`}>
          {isHome ? 'H' : 'A'}
        </span>
        <div>
          <span className="text-sm text-primary">{match.opponent}</span>
          <div className="text-xs text-tertiary flex items-center gap-2 mt-0.5">
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
          won ? 'text-status-success' : lost ? 'text-status-error' : 'text-secondary'
        }`}>
          {match.score_for} - {match.score_against}
        </span>
      )}
    </div>
  )
}
