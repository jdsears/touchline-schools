import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { teamService } from '../../../services/api'
import { Loader2, ExternalLink, Users, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'

const SPORT_ICONS = {
  football: '⚽', rugby: '🏉', cricket: '🏏', hockey: '🏑',
  netball: '🤾', basketball: '🏀', athletics: '🏃', swimming: '🏊',
}

export default function TeamsTab({ access }) {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    teamService.getSchoolTeams?.()
      .then(r => setTeams(Array.isArray(r.data) ? r.data : r.data?.teams || []))
      .catch(() => {
        // fallback: get mine
        teamService.getMineAll?.()
          .then(r => setTeams(Array.isArray(r.data) ? r.data : []))
          .catch(() => setTeams([]))
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-secondary" />
    </div>
  )

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary">Teams</h2>
          <p className="text-sm text-secondary mt-1">
            All teams in your department. Manage them from the Teams area.
          </p>
        </div>
        <Link
          to="/teacher/teams"
          className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-700 text-primary rounded-lg text-sm transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Manage Teams
        </Link>
      </div>

      {teams.length === 0 ? (
        <div className="bg-card rounded-xl border border-border-default p-8 text-center">
          <Trophy className="w-8 h-8 text-tertiary mx-auto mb-3" />
          <p className="text-secondary text-sm">No teams found.</p>
          <Link to="/teacher/teams" className="text-pitch-400 hover:underline text-sm mt-2 inline-block">
            Go to Teams to create your first team
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {teams.map(t => (
            <Link
              key={t.id}
              to={`/teacher/teams/${t.id}`}
              className="flex items-center gap-4 bg-card rounded-xl border border-border-default p-4 hover:border-border-strong transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-subtle flex items-center justify-center text-lg flex-shrink-0">
                {SPORT_ICONS[t.sport] || <Trophy className="w-5 h-5 text-secondary" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-primary">{t.name}</div>
                <div className="text-xs text-secondary capitalize">{t.sport} {t.age_group && `· ${t.age_group}`}</div>
              </div>
              <div className="flex items-center gap-1 text-xs text-tertiary">
                <Users className="w-3 h-3" />
                <span>{t.pupil_count || 0}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="text-xs text-tertiary">
        To add, rename, archive, or reassign coaches, use the{' '}
        <Link to="/teacher/teams" className="text-pitch-400 hover:underline">Teams</Link> area.
      </p>
    </div>
  )
}
