import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search as SearchIcon, Users, GraduationCap, Shield, BookOpen, FileBarChart,
  UserCog, ArrowRight,
} from 'lucide-react'
import { hodService } from '../../services/api'
import { useTopBarSearch, SEARCH_GROUP_LABEL } from '../../hooks/useTopBarSearch'

const TYPE_ICON = {
  pupil: Users, teacher: UserCog, team: Shield,
  class: GraduationCap, lesson: BookOpen, report: FileBarChart,
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [hod, setHod] = useState({ isHoD: false, isAdmin: false })
  useEffect(() => {
    hodService.check().then(res => {
      setHod({
        isHoD: !!res.data?.isHoD,
        isAdmin: ['owner', 'school_admin', 'admin'].includes(res.data?.role),
      })
    }).catch(() => {})
  }, [])
  const { query, setQuery, results, loading, totalResults, recent } = useTopBarSearch({
    isAdmin: hod.isAdmin, isHoD: hod.isHoD,
  })

  const initial = params.get('q') || ''
  const typeFilter = params.get('type') || null

  useEffect(() => { if (initial && initial !== query) setQuery(initial) }, [initial]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = typeFilter ? results.filter(g => g.id === typeFilter) : results
  const filteredCount = filtered.reduce((n, g) => n + g.items.length, 0)

  const handleSubmit = (e) => {
    e.preventDefault()
    setParams(p => {
      const next = new URLSearchParams(p)
      if (query.trim()) next.set('q', query.trim()); else next.delete('q')
      return next
    })
  }

  return (
    <div className="px-6 lg:px-8 py-6 max-w-4xl mx-auto">
      <h1 className="text-[26px] font-bold leading-[1.15] tracking-[-0.02em] mb-1" style={{ color: 'var(--text-primary)' }}>
        Search
      </h1>
      <div className="text-[13px] mb-5" style={{ color: 'var(--text-secondary)' }}>
        Pupils, teachers, classes, lessons, teams and reports across your school.
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 px-3.5 py-3 rounded-[var(--radius-lg)] mb-4"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)' }}>
          <SearchIcon size={16} style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            autoFocus
            className="flex-1 bg-transparent border-0 outline-none text-[14px]"
            style={{ color: 'var(--text-primary)' }}
          />
          {loading && <span className="text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>Searching…</span>}
        </div>
      </form>

      {/* Type filter chips */}
      {results.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <button
            onClick={() => setParams(p => { const n = new URLSearchParams(p); n.delete('type'); return n })}
            className="px-2.5 py-1 rounded-full text-[12px] font-semibold transition-colors"
            style={{
              background: !typeFilter ? 'var(--brand-primary)' : 'transparent',
              color: !typeFilter ? 'var(--on-brand-primary)' : 'var(--text-secondary)',
              border: !typeFilter ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
              cursor: 'pointer',
            }}>
            All ({totalResults})
          </button>
          {results.map(g => (
            <button key={g.id}
              onClick={() => setParams(p => { const n = new URLSearchParams(p); n.set('type', g.id); return n })}
              className="px-2.5 py-1 rounded-full text-[12px] font-semibold transition-colors"
              style={{
                background: typeFilter === g.id ? 'var(--brand-primary)' : 'transparent',
                color: typeFilter === g.id ? 'var(--on-brand-primary)' : 'var(--text-secondary)',
                border: typeFilter === g.id ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
              }}>
              {SEARCH_GROUP_LABEL[g.id] || g.label} ({g.items.length})
            </button>
          ))}
        </div>
      )}

      {/* Empty / hint state */}
      {!query.trim() ? (
        <div className="rounded-[var(--radius-lg)] p-6 text-center"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
          <SearchIcon size={20} style={{ color: 'var(--text-tertiary)' }} className="mx-auto mb-2" />
          <div className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Search across your school</div>
          <div className="text-[12.5px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            Find a pupil, teacher, class, lesson or report. Press ⌘K for the command palette.
          </div>
          {recent.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {recent.map(r => (
                <button key={r} onClick={() => setQuery(r)}
                  className="px-2 py-[3px] rounded-full text-[11.5px]"
                  style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : filteredCount === 0 && !loading ? (
        <div className="rounded-[var(--radius-lg)] p-6 text-center"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>No matches for "{query}"</div>
          <div className="text-[12.5px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            Try a shorter search, or browse from the sidebar.
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map(group => {
            const Icon = TYPE_ICON[group.id] || ArrowRight
            return (
              <section key={group.id}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} style={{ color: 'var(--brand-accent)' }} />
                  <h2 className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: 'var(--brand-accent)' }}>
                    {SEARCH_GROUP_LABEL[group.id] || group.label}
                  </h2>
                  <span className="text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>{group.items.length}</span>
                </div>
                <div className="rounded-[var(--radius-lg)] overflow-hidden"
                  style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
                  {group.items.map((item, i) => {
                    const RowIcon = TYPE_ICON[item.type] || ArrowRight
                    return (
                      <Link key={item.id} to={item.href} onClick={() => navigate(item.href)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-sunken)]"
                        style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)' }}>
                        <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)]"
                          style={{ background: 'var(--surface-sunken)', color: 'var(--text-secondary)' }}>
                          <RowIcon size={14} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13.5px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {item.title}
                          </div>
                          {item.subtitle && (
                            <div className="text-[12px] truncate" style={{ color: 'var(--text-tertiary)' }}>{item.subtitle}</div>
                          )}
                        </div>
                        {item.meta && (
                          <span className="shrink-0 text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{item.meta}</span>
                        )}
                        <ArrowRight size={13} style={{ color: 'var(--text-tertiary)' }} />
                      </Link>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
