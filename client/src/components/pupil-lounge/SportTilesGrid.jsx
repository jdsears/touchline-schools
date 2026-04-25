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

function SportTile({ sport, teams, onClick }) {
  const gradient = SPORT_GRADIENT[sport] || 'from-navy-700 to-navy-900'
  const emoji = SPORT_EMOJI[sport] || '🏅'
  const teamNames = (teams || []).map(t => t.name).filter(Boolean)

  // Determine role line
  let role = ''
  if (teamNames.length > 0) {
    role = teamNames.join(' / ')
  }

  return (
    <button
      onClick={onClick}
      className={`rounded-xl bg-gradient-to-br ${gradient} border border-white/10 p-3.5 text-left min-w-[140px] snap-start flex-shrink-0 active:scale-95 transition-transform`}
    >
      <div className="text-2xl mb-1.5">{emoji}</div>
      <h4 className="text-primary font-semibold text-sm capitalize">{sport}</h4>
      {role && (
        <p className="text-primary/50 text-[10px] mt-0.5 truncate">{role}</p>
      )}
    </button>
  )
}

export default function SportTilesGrid() {
  const { sports, teams, loading } = usePupilProfile()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="px-4 mb-4">
        <div className="flex gap-3 overflow-x-auto">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 w-36 bg-subtle rounded-xl animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
    )
  }

  if (!sports || sports.length === 0) return null

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2 px-5">
        My Sports
      </h3>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory scrollbar-hide">
        {sports.map(sport => {
          const sportTeams = (teams || []).filter(t => t.sport === sport)
          return (
            <SportTile
              key={sport}
              sport={sport}
              teams={sportTeams}
              onClick={() => navigate(`/pupil-lounge/sports?sport=${sport}`)}
            />
          )
        })}
      </div>
    </div>
  )
}
