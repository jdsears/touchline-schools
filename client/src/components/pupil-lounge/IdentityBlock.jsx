import { usePupilProfile } from '../../hooks/usePupilProfile'

const HOUSE_COLOURS = {
  elm: 'bg-green-500/15 text-green-400 border-green-500/30',
  oak: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  maple: 'bg-red-500/15 text-red-400 border-red-500/30',
  birch: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  willow: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  ash: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
}

export default function IdentityBlock() {
  const { pupil, teams, loading } = usePupilProfile()

  if (loading) {
    return (
      <div className="px-4 pt-4 pb-2">
        <div className="h-7 w-44 bg-navy-800/50 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-56 bg-navy-800/50 rounded animate-pulse" />
      </div>
    )
  }

  if (!pupil) return null

  const displayName = pupil.first_name || pupil.name?.split(' ')[0] || 'Pupil'
  const houseStyle = pupil.house
    ? HOUSE_COLOURS[pupil.house.toLowerCase()] || 'bg-navy-700/30 text-navy-300 border-navy-600/30'
    : null

  const teamRoles = (teams || []).map(t => t.name).filter(Boolean).slice(0, 2)

  return (
    <div className="px-4 pt-4 pb-1">
      <h1 className="text-[22px] font-bold text-white leading-tight">
        Hey, {displayName} <span className="text-white/30">&#x1F44B;</span>
      </h1>
      <div className="flex items-center gap-2 mt-1.5">
        {pupil.year_group && (
          <span className="text-[11px] text-navy-400 font-medium">Year {pupil.year_group}</span>
        )}
        {houseStyle && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${houseStyle}`}>
            {pupil.house}
          </span>
        )}
        {teamRoles.length > 0 && (
          <span className="text-[10px] text-navy-500 truncate">
            {teamRoles.join(' \u00B7 ')}
          </span>
        )}
      </div>
    </div>
  )
}
