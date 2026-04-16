import { usePupilProfile } from '../../hooks/usePupilProfile'

const HOUSE_COLOURS = {
  elm: { bg: 'bg-green-600', text: 'text-green-100' },
  oak: { bg: 'bg-amber-600', text: 'text-amber-100' },
  maple: { bg: 'bg-red-600', text: 'text-red-100' },
  birch: { bg: 'bg-sky-600', text: 'text-sky-100' },
  willow: { bg: 'bg-purple-600', text: 'text-purple-100' },
  ash: { bg: 'bg-slate-600', text: 'text-slate-100' },
}

function Avatar({ name }) {
  const initials = (name || '')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center flex-shrink-0">
      <span className="text-navy-900 font-bold text-lg">{initials}</span>
    </div>
  )
}

function HouseBadge({ house }) {
  if (!house) return null
  const key = house.toLowerCase()
  const colours = HOUSE_COLOURS[key] || { bg: 'bg-navy-700', text: 'text-white' }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${colours.bg} ${colours.text}`}>
      {house}
    </span>
  )
}

export default function IdentityBlock() {
  const { pupil, teams, loading } = usePupilProfile()

  if (loading) {
    return (
      <div className="flex items-center gap-3 px-4 pt-5 pb-3">
        <div className="w-14 h-14 rounded-full bg-navy-800 animate-pulse" />
        <div className="space-y-2">
          <div className="h-5 w-32 bg-navy-800 rounded animate-pulse" />
          <div className="h-3 w-48 bg-navy-800 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (!pupil) return null

  const displayName = pupil.first_name || pupil.name?.split(' ')[0] || 'Pupil'
  const fullName = pupil.name || `${pupil.first_name} ${pupil.last_name}`
  const teamRoles = (teams || [])
    .map(t => t.name)
    .filter(Boolean)
    .slice(0, 3)

  return (
    <div className="flex items-center gap-3 px-4 pt-5 pb-3">
      <Avatar name={fullName} />
      <div className="min-w-0">
        <h1 className="text-lg font-bold text-white truncate">
          Hey, {displayName}
        </h1>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {pupil.year_group && (
            <span className="text-xs text-navy-400 font-medium">Year {pupil.year_group}</span>
          )}
          <HouseBadge house={pupil.house} />
        </div>
        {teamRoles.length > 0 && (
          <p className="text-xs text-navy-500 mt-1 truncate">
            {teamRoles.join(' / ')}
          </p>
        )}
      </div>
    </div>
  )
}
