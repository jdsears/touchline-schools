import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { teacherService } from '../../services/api'
import { EmptyState } from '../../components/common/ui'
import { SPORT_ICONS, sportLabel } from '../../constants/sports'
import { Users, Search, Loader2, ClipboardList, Target, ChevronRight } from 'lucide-react'

const AVATAR_TINTS = [
  'bg-brand-primary-tint text-brand-primary',
  'bg-brand-accent-tint text-brand-accent',
  'bg-status-info-tint text-status-info',
  'bg-status-success-tint text-status-success',
]
function avatarTint(name = '') {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997
  return AVATAR_TINTS[h % AVATAR_TINTS.length]
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

function lastSeen(d) {
  if (!d) return 'No observations yet'
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (days <= 0) return 'Observed today'
  if (days === 1) return 'Observed yesterday'
  if (days < 28) return `Observed ${days} days ago`
  return `Observed ${new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
}

export default function TeacherDevelopment() {
  const [pupils, setPupils] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')

  function load() {
    setLoading(true)
    setError(false)
    teacherService.getDevelopment()
      .then(res => setPupils(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const filtered = pupils.filter(p =>
    !search || (p.name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-[-0.015em] text-primary">Pupil Development</h1>
          <p className="text-secondary mt-1">
            {pupils.length > 0
              ? `${pupils.length} pupils across your teams`
              : 'Track individual pupil progress across extra-curricular sport'}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search pupils..."
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border-strong rounded-lg text-primary text-sm placeholder:text-tertiary focus:outline-none focus:border-brand-primary"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-tertiary" />
        </div>
      ) : error ? (
        <div className="bg-card rounded-xl border border-status-error/40 p-6">
          <EmptyState
            icon={Users}
            title="Couldn't load pupil development"
            hint="Something went wrong fetching your pupils. This is a loading problem, not missing data."
            actionLabel="Try again"
            onAction={load}
          />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(p => (
            <Link
              key={p.id}
              to={`/teacher/hod/pupils/${p.id}`}
              className="group flex items-center gap-3.5 rounded-xl border border-border-default bg-card p-4 transition-all hover:border-border-strong hover:shadow-md"
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1 ring-black/5 ${avatarTint(p.name)}`}>
                <span className="text-sm font-semibold">{initials(p.name)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-display text-sm font-semibold text-primary">{p.name}</p>
                  {p.year_group && <span className="shrink-0 text-xs text-tertiary">Y{p.year_group}</span>}
                </div>
                <p className="mt-0.5 truncate text-xs text-secondary">
                  {(p.sports || []).filter(Boolean).map(sp => `${SPORT_ICONS[sp] || ''} ${sportLabel(sp)}`).join(' · ')}
                </p>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-tertiary">
                  <span className="inline-flex items-center gap-1">
                    <ClipboardList className="h-3 w-3" /> {p.observation_count} observation{p.observation_count === 1 ? '' : 's'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Target className="h-3 w-3" /> {p.goal_count} goal{p.goal_count === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-tertiary">{lastSeen(p.last_observation_at)}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-tertiary opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border-default p-6">
          <EmptyState
            icon={Users}
            title={search ? 'No pupils match your search' : 'No pupil development data yet'}
            hint={search
              ? 'Try a different name.'
              : 'As you record observations, match stats, and training feedback for your teams, each pupil builds a development profile showing their progress across sports.'}
          />
        </div>
      )}
    </div>
  )
}
