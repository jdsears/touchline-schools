import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { teacherService } from '../../services/api'
import { Shield, Users, Trophy, Calendar, Filter } from 'lucide-react'

const SPORT_ICONS = {
  football: '\u26BD',
  rugby: '\uD83C\uDFC9',
  cricket: '\uD83C\uDFCF',
  hockey: '\uD83C\uDFD1',
  netball: '\uD83E\uDD3E',
}

const SPORT_COLORS = {
  football: 'bg-pitch-600/20 text-pitch-400',
  rugby: 'bg-amber-400/20 text-amber-400',
  cricket: 'bg-blue-500/20 text-blue-400',
  hockey: 'bg-purple-500/20 text-purple-400',
  netball: 'bg-pink-500/20 text-pink-400',
}

export default function TeacherTeams() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [sportFilter, setSportFilter] = useState('all')

  useEffect(() => {
    loadTeams()
  }, [])

  async function loadTeams() {
    try {
      const res = await teacherService.getMyTeams()
      setTeams(res.data)
    } catch (err) {
      console.error('Failed to load teams:', err)
    } finally {
      setLoading(false)
    }
  }

  const sports = [...new Set(teams.map(t => t.sport).filter(Boolean))]
  const filtered = sportFilter === 'all' ? teams : teams.filter(t => t.sport === sportFilter)

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
          <h1 className="text-2xl font-bold text-primary">My Teams</h1>
          <p className="text-secondary mt-1">Extra-curricular teams you coach</p>
        </div>
      </div>

      {/* Sport filter */}
      {sports.length > 1 && (
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-4 h-4 text-tertiary" />
          <button
            onClick={() => setSportFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              sportFilter === 'all'
                ? 'bg-pitch-600/20 text-pitch-400'
                : 'bg-subtle text-secondary hover:text-link'
            }`}
          >
            All ({teams.length})
          </button>
          {sports.map(sport => (
            <button
              key={sport}
              onClick={() => setSportFilter(sport)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors capitalize ${
                sportFilter === sport
                  ? 'bg-pitch-600/20 text-pitch-400'
                  : 'bg-subtle text-secondary hover:text-link'
              }`}
            >
              {SPORT_ICONS[sport] || ''} {sport} ({teams.filter(t => t.sport === sport).length})
            </button>
          ))}
        </div>
      )}

      {/* Team list */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(team => (
            <Link
              key={team.id}
              to={`/teacher/teams/${team.id}`}
              className="bg-card rounded-xl border border-border-default p-5 hover:border-border-strong transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${SPORT_COLORS[team.sport] || 'bg-subtle text-secondary'}`}>
                  {SPORT_ICONS[team.sport] || <Shield className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-primary truncate">{team.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-subtle rounded text-xs text-secondary capitalize">{team.sport || 'football'}</span>
                    {team.age_group && <span className="text-xs text-secondary">{team.age_group}</span>}
                    {team.gender && team.gender !== 'mixed' && (
                      <span className="text-xs text-secondary capitalize">{team.gender}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border-default">
                <div className="flex items-center gap-1.5 text-secondary">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-xs">{team.pupil_count || 0} pupils</span>
                </div>
                <div className="flex items-center gap-1.5 text-secondary">
                  <Trophy className="w-3.5 h-3.5" />
                  <span className="text-xs">{team.match_count || 0} matches</span>
                </div>
                {team.season_type && team.season_type !== 'year_round' && (
                  <span className="text-xs text-tertiary capitalize">{team.season_type} term</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border-default p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-subtle flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-tertiary" />
          </div>
          <h3 className="text-lg font-semibold text-primary mb-2">No teams assigned yet</h3>
          <p className="text-secondary text-sm max-w-md mx-auto">
            Your Head of PE will assign you to extra-curricular teams. These are school sports teams
            for fixtures and competitions, separate from your timetabled PE classes.
          </p>
        </div>
      )}
    </div>
  )
}
