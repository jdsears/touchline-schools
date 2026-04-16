import { Trophy, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePupilProfile } from '../../hooks/usePupilProfile'

const SPORT_EMOJI = {
  football: '⚽', rugby: '🏉', cricket: '🏏', hockey: '🏑',
  netball: '🤾', athletics: '🏃', swimming: '🏊', tennis: '🎾',
  basketball: '🏀', rounders: '🥎', badminton: '🏸', gymnastics: '🤸',
}

const SPORT_GRADIENT = {
  football: 'from-green-700 to-emerald-900',
  rugby: 'from-amber-700 to-orange-900',
  cricket: 'from-sky-700 to-blue-900',
  hockey: 'from-purple-700 to-violet-900',
  netball: 'from-pink-700 to-rose-900',
  athletics: 'from-yellow-700 to-amber-900',
  swimming: 'from-cyan-700 to-teal-900',
  tennis: 'from-lime-700 to-green-900',
  basketball: 'from-orange-700 to-red-900',
  gymnastics: 'from-fuchsia-700 to-purple-900',
}

function SportCard({ sport, teams, teachingGroups, onClick }) {
  const gradient = SPORT_GRADIENT[sport] || 'from-navy-700 to-navy-900'
  const emoji = SPORT_EMOJI[sport] || '🏅'
  const teamNames = (teams || []).map(t => t.name).filter(Boolean)

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl bg-gradient-to-br ${gradient} border border-white/10 p-4 text-left active:scale-[0.97] transition-all duration-150 overflow-hidden relative`}
    >
      <span className="absolute -right-3 -bottom-3 text-[80px] opacity-[0.08] leading-none select-none">{emoji}</span>
      <div className="relative flex items-center gap-3">
        <span className="text-3xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-[15px] capitalize">{sport}</h3>
          {teamNames.length > 0 && (
            <p className="text-white/50 text-[11px] mt-0.5 truncate">{teamNames.join(' \u00B7 ')}</p>
          )}
        </div>
        <ChevronRight size={18} className="text-white/20 flex-shrink-0" />
      </div>
    </button>
  )
}

export default function MySportsPage() {
  const { sports, teams, teachingGroups, loading } = usePupilProfile()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-7 w-32 bg-navy-800 rounded animate-pulse" />
        {[1, 2].map(i => (
          <div key={i} className="h-20 bg-navy-800 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-white mb-1">My Sports</h1>
      <p className="text-navy-400 text-xs mb-4">
        Everything you play, all in one place
      </p>

      {(!sports || sports.length === 0) ? (
        <div className="rounded-xl bg-navy-900 border border-navy-800 p-10 text-center">
          <Trophy className="w-10 h-10 text-navy-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">No sports yet</h3>
          <p className="text-xs text-navy-500">
            Once your teachers add you to teams and classes, your sports will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sports.map(sport => {
            const sportTeams = (teams || []).filter(t => t.sport === sport)
            const sportGroups = (teachingGroups || [])
            return (
              <SportCard
                key={sport}
                sport={sport}
                teams={sportTeams}
                teachingGroups={sportGroups}
                onClick={() => navigate(`/pupil-lounge/sports/${sport}`)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
