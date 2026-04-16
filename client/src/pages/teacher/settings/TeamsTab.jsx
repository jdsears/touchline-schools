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
      <Loader2 className="w-6 h-6 animate-spin text-navy-400" />
    </div>
  )

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Teams</h2>
          <p className="text-sm text-navy-400 mt-1">
            All teams in your department. Manage them from the Teams area.
          </p>
        </div>
        <Link
          to="/teacher/teams"
          className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Manage Teams
        </Link>
      </div>

      {teams.length === 0 ? (
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-8 text-center">
          <Trophy className="w-8 h-8 text-navy-600 mx-auto mb-3" />
          <p className="text-navy-400 text-sm">No teams found.</p>
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
              className="flex items-center gap-4 bg-navy-900 rounded-xl border border-navy-800 p-4 hover:border-navy-700 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-navy-800 flex items-center justify-center text-lg flex-shrink-0">
                {SPORT_ICONS[t.sport] || <Trophy className="w-5 h-5 text-navy-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">{t.name}</div>
                <div className="text-xs text-navy-400 capitalize">{t.sport} {t.age_group && `· ${t.age_group}`}</div>
              </div>
              <div className="flex items-center gap-1 text-xs text-navy-500">
                <Users className="w-3 h-3" />
                <span>{t.pupil_count || 0}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="text-xs text-navy-500">
        To add, rename, archive, or reassign coaches, use the{' '}
        <Link to="/teacher/teams" className="text-pitch-400 hover:underline">Teams</Link> area.
      </p>
    </div>
  )
}
