import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { teamService, teacherService } from '../../services/api'
import Tactics from '../Tactics'
import { Loader2, ChevronDown } from 'lucide-react'

const LAST_TEAM_KEY = 'tactics_last_team_id'

export function TacticsRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    const lastId = localStorage.getItem(LAST_TEAM_KEY)
    if (lastId) {
      navigate(`/teacher/teams/${lastId}/tactics`, { replace: true })
      return
    }
    // Fetch first available team
    teacherService.getMyTeams()
      .then(res => {
        const teams = res.data || []
        if (teams.length > 0) {
          navigate(`/teacher/teams/${teams[0].id}/tactics`, { replace: true })
        } else {
          navigate('/teacher/teams', { replace: true })
        }
      })
      .catch(() => navigate('/teacher/teams', { replace: true }))
  }, [navigate])

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-6 h-6 animate-spin text-navy-400" />
    </div>
  )
}

export default function TacticsLoader() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const [team, setTeam] = useState(null)
  const [pupils, setPupils] = useState([])
  const [myTeams, setMyTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectorOpen, setSelectorOpen] = useState(false)

  // Persist last viewed team
  useEffect(() => {
    if (teamId) localStorage.setItem(LAST_TEAM_KEY, teamId)
  }, [teamId])

  // Load the specific team + all teacher's teams for selector
  useEffect(() => {
    if (!teamId) return
    setLoading(true)
    setError(null)

    Promise.all([
      teamService.getTeam(teamId),
      teamService.getPlayers(teamId),
      teacherService.getMyTeams(),
    ])
      .then(([teamRes, playersRes, teamsRes]) => {
        setTeam(teamRes.data)
        setPupils(playersRes.data || [])
        setMyTeams(teamsRes.data || [])
      })
      .catch(err => {
        setError(err.response?.status === 404 ? 'Team not found.' : 'Failed to load team.')
      })
      .finally(() => setLoading(false))
  }, [teamId])

  const updateTeam = useCallback(async (data) => {
    try {
      const res = await teamService.updateTeam(teamId, data)
      setTeam(res.data)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.message }
    }
  }, [teamId])

  const switchTeam = (id) => {
    setSelectorOpen(false)
    navigate(`/teacher/teams/${id}/tactics`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-navy-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center text-navy-400">{error}</div>
    )
  }

  return (
    <div>
      {/* Team selector bar */}
      {myTeams.length > 1 && (
        <div className="border-b border-navy-800 bg-navy-900 px-4 py-2 flex items-center gap-3 relative">
          <span className="text-xs text-navy-500 font-medium uppercase tracking-wider">Team:</span>
          <button
            onClick={() => setSelectorOpen(o => !o)}
            className="flex items-center gap-1.5 text-sm font-medium text-white hover:text-pitch-400 transition-colors"
          >
            {team?.name || 'Select team'}
            <ChevronDown className={`w-4 h-4 text-navy-400 transition-transform ${selectorOpen ? 'rotate-180' : ''}`} />
          </button>

          {selectorOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSelectorOpen(false)} />
              <div className="absolute top-full left-0 z-20 mt-1 w-56 bg-navy-800 border border-navy-700 rounded-lg shadow-xl overflow-hidden">
                {myTeams.map(t => (
                  <button
                    key={t.id}
                    onClick={() => switchTeam(t.id)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      t.id === parseInt(teamId)
                        ? 'bg-pitch-600/20 text-pitch-400'
                        : 'text-navy-300 hover:bg-navy-700 hover:text-white'
                    }`}
                  >
                    <div className="font-medium">{t.name}</div>
                    {t.sport && <div className="text-[11px] text-navy-500 capitalize">{t.sport}</div>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tactics board with injected team context */}
      <Tactics
        teamOverride={team}
        pupilsOverride={pupils}
        updateTeamOverride={updateTeam}
      />
    </div>
  )
}
