import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search as SearchIcon, Users, GraduationCap, Shield, BookOpen, FileBarChart,
  UserCog, History, CornerDownLeft, X,
} from 'lucide-react'
import Popover from './Popover'
import { useTopBarSearch, SEARCH_GROUP_LABEL } from '../../hooks/useTopBarSearch'

const TYPE_ICON = {
  pupil: Users,
  teacher: UserCog,
  team: Shield,
  class: GraduationCap,
  lesson: BookOpen,
  report: FileBarChart,
}

const SUGGESTIONS = ['Y8 Boys Football', 'Whitfield', 'Today', 'Lesson plan']

function flattenForKeyboard(results) {
  const out = []
  for (const g of results) for (const it of g.items) out.push({ ...it, _group: g.id })
  return out
}

function ResultRow({ item, active, onSelect, onHover }) {
  const Icon = TYPE_ICON[item.type] || SearchIcon
  return (
    <button
      onMouseEnter={onHover}
      onClick={onSelect}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
      style={{
        background: active ? 'var(--brand-accent-tint)' : 'transparent',
        cursor: 'pointer', border: 'none',
      }}
    >
      <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)]"
        style={{ background: 'var(--surface-sunken)', color: 'var(--text-secondary)' }}>
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {item.title}
        </div>
        {item.subtitle && (
          <div className="text-[11.5px] truncate" style={{ color: 'var(--text-tertiary)' }}>{item.subtitle}</div>
        )}
      </div>
      {item.meta && (
        <span className="shrink-0 text-[10.5px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{item.meta}</span>
      )}
      {active && <CornerDownLeft size={12} style={{ color: 'var(--text-tertiary)' }} />}
    </button>
  )
}

function GroupHeader({ label, count, onSeeAll }) {
  return (
    <div className="px-3 pt-2 pb-1 flex items-center justify-between"
      style={{ background: 'var(--surface-card)' }}>
      <span className="text-[10px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </span>
      {count > 0 && onSeeAll && (
        <button onClick={onSeeAll}
          className="text-[10.5px] font-semibold hover:underline"
          style={{ color: 'var(--brand-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          See all {count}
        </button>
      )}
    </div>
  )
}

export default function SearchPanel({ openExternal, onClose: onCloseProp, isAdmin = false, isHoD = false }) {
  const triggerRef = useRef(null)
  const inputRef = useRef(null)
  const [openInternal, setOpen] = useState(false)
  const open = openExternal !== undefined ? openExternal : openInternal
  const close = () => { setOpen(false); onCloseProp?.() }
  const toggle = () => { openExternal !== undefined ? onCloseProp?.() : setOpen(o => !o) }

  const navigate = useNavigate()
  const { query, setQuery, results, loading, totalResults, recent, recordRecent, clearRecent } =
    useTopBarSearch({ isAdmin, isHoD })

  const flat = useMemo(() => flattenForKeyboard(results), [results])
  const [activeIdx, setActiveIdx] = useState(0)
  useEffect(() => { setActiveIdx(0) }, [query, results])

  // Auto-focus input when open
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50) }, [open])

  // Keyboard navigation per spec §5.4
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx(i => Math.min(flat.length - 1, i + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx(i => Math.max(0, i - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = flat[activeIdx]
        if (item) {
          recordRecent(query)
          close()
          navigate(item.href)
        } else if (query.trim()) {
          recordRecent(query)
          close()
          navigate(`/teacher/search?q=${encodeURIComponent(query.trim())}`)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, flat, activeIdx, navigate, query, recordRecent])

  const handleSelect = (item) => {
    recordRecent(query)
    close()
    navigate(item.href)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    recordRecent(query)
    close()
    navigate(`/teacher/search?q=${encodeURIComponent(query.trim())}`)
  }

  const handleSuggestion = (s) => {
    setQuery(s)
    inputRef.current?.focus()
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Search"
        className="w-[34px] h-[34px] rounded-[var(--radius-md)] inline-flex items-center justify-center shrink-0 transition-colors"
        style={{
          background: open ? 'var(--brand-primary-tint)' : 'var(--surface-sunken)',
          border: '1px solid var(--border-subtle)',
          color: open ? 'var(--brand-primary)' : 'var(--text-secondary)',
          cursor: 'pointer',
        }}
      >
        <SearchIcon size={15} />
      </button>

      <Popover open={open} onClose={close} anchorRef={triggerRef} width={420} align="right">
        <form onSubmit={handleSubmit} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2 px-3 py-2.5">
            <SearchIcon size={14} style={{ color: 'var(--text-tertiary)' }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pupils, teachers, classes, lessons…"
              className="flex-1 bg-transparent border-0 outline-none text-[13.5px]"
              style={{ color: 'var(--text-primary)' }}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear search"
                className="inline-flex items-center justify-center w-5 h-5 rounded-full"
                style={{ background: 'var(--surface-sunken)', color: 'var(--text-tertiary)', border: 'none', cursor: 'pointer' }}>
                <X size={11} />
              </button>
            )}
            <span className="hidden md:inline-flex items-center px-1.5 py-[2px] rounded-[3px] text-[9.5px] font-mono"
              style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}>
              Esc
            </span>
          </div>
        </form>

        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {!query.trim() ? (
            <div>
              {recent.length > 0 && (
                <>
                  <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--text-tertiary)' }}>
                      Recent
                    </span>
                    <button onClick={clearRecent} className="text-[10.5px] hover:underline"
                      style={{ color: 'var(--text-tertiary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      Clear
                    </button>
                  </div>
                  {recent.map((r, i) => (
                    <button key={`${r}-${i}`} onClick={() => setQuery(r)}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-[var(--surface-sunken)]"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      <History size={12} style={{ color: 'var(--text-tertiary)' }} />
                      <span className="text-[12.5px] truncate" style={{ color: 'var(--text-secondary)' }}>{r}</span>
                    </button>
                  ))}
                </>
              )}
              <div className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--text-tertiary)' }}>
                Try
              </div>
              <div className="px-3 pb-3 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => handleSuggestion(s)}
                    className="px-2 py-[3px] rounded-full text-[11.5px] transition-colors"
                    style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : loading && totalResults === 0 ? (
            <div className="px-4 py-6 text-center text-[12.5px]" style={{ color: 'var(--text-tertiary)' }}>Searching…</div>
          ) : totalResults === 0 ? (
            <div className="px-4 py-6 text-center" style={{ color: 'var(--text-secondary)' }}>
              <div className="text-[13px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No matches</div>
              <div className="text-[12px]">Try a different name, or open the sidebar to browse.</div>
            </div>
          ) : (
            (() => {
              let runningIdx = 0
              return results.map(group => {
                const groupStart = runningIdx
                const rows = group.items.map((item, i) => {
                  const idx = groupStart + i
                  return (
                    <ResultRow key={item.id} item={item} active={idx === activeIdx}
                      onHover={() => setActiveIdx(idx)}
                      onSelect={() => handleSelect(item)} />
                  )
                })
                runningIdx += group.items.length
                return (
                  <div key={group.id}>
                    <GroupHeader
                      label={SEARCH_GROUP_LABEL[group.id] || group.label}
                      count={group.items.length === 8 ? group.items.length : 0}
                      onSeeAll={() => {
                        recordRecent(query); close()
                        navigate(`/teacher/search?q=${encodeURIComponent(query.trim())}&type=${group.id}`)
                      }}
                    />
                    {rows}
                  </div>
                )
              })
            })()
          )}
        </div>

        {query.trim() && totalResults > 0 && (
          <div className="px-3 py-2 text-[11.5px] flex items-center justify-between"
            style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-sunken)', color: 'var(--text-tertiary)' }}>
            <span>↑↓ navigate · ↵ open</span>
            <button onClick={handleSubmit}
              className="font-semibold hover:underline"
              style={{ color: 'var(--brand-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              See all {totalResults} →
            </button>
          </div>
        )}
      </Popover>
    </>
  )
}
