import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Command, Plus, ArrowRight, HelpCircle, Compass, CornerDownLeft, X,
  Calendar, Trophy, Target, GraduationCap, BookOpen, Users, Mic, Settings,
  ArrowLeftRight, Search,
} from 'lucide-react'

const RECENT_KEY = 'topbar.palette.recent'
const RECENT_MAX = 5
const readRecent = () => {
  try { return JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}
const writeRecent = (list) => {
  try { window.localStorage.setItem(RECENT_KEY, JSON.stringify(list)) } catch { /* */ }
}

// Mode prefixes per spec §6.2
const MODE = { ACTION: 'action', NAVIGATE: 'navigate', HELP: 'help' }

// Keep this list lean — palette is for the most-used commands, not exhaustive.
function buildCommands({ navigate, isAdmin, isHoD, onSwitchRole, roleMode }) {
  const actions = [
    { id: 'a-new-fixture',     label: 'New fixture',          icon: Plus,        run: () => navigate('/teacher/fixtures?new=1'), keywords: 'create add match game' },
    { id: 'a-new-lesson',      label: 'New lesson plan',      icon: Plus,        run: () => navigate('/teacher/lessons?new=1'),  keywords: 'create add curriculum' },
    { id: 'a-record-voice',    label: 'Record voice obs',     icon: Mic,         run: () => window.dispatchEvent(new CustomEvent('topbar:voice-record')), keywords: 'observation safeguarding note' },
  ]
  if (isAdmin && isHoD) {
    actions.push({
      id: 'a-switch-role',
      label: roleMode === 'admin' ? 'Switch to Teacher view' : 'Switch to School Admin view',
      icon: ArrowLeftRight,
      run: () => onSwitchRole?.(roleMode === 'admin' ? 'teacher' : 'admin'),
      keywords: 'role view',
    })
  }

  const navs = [
    { id: 'n-today',     label: 'Today',           icon: Calendar,       run: () => navigate('/teacher') },
    { id: 'n-fixtures',  label: 'Fixtures',        icon: Trophy,         run: () => navigate('/teacher/fixtures') },
    { id: 'n-teams',     label: 'My Teams',        icon: Trophy,         run: () => navigate('/teacher/teams') },
    { id: 'n-classes',   label: 'My Classes',      icon: GraduationCap,  run: () => navigate('/teacher/classes') },
    { id: 'n-lessons',   label: 'Lesson Planning', icon: BookOpen,       run: () => navigate('/teacher/lessons') },
    { id: 'n-pupils',    label: 'Pupil Development', icon: Users,        run: () => navigate('/teacher/development') },
    { id: 'n-tactics',   label: 'Tactics Board',   icon: Target,         run: () => navigate('/teacher/tactics') },
    { id: 'n-assistant', label: 'AI Assistant',    icon: Search,         run: () => navigate('/teacher/assistant') },
    { id: 'n-search',    label: 'Search',          icon: Search,         run: () => navigate('/teacher/search') },
    { id: 'n-settings',  label: 'Settings',        icon: Settings,       run: () => navigate('/teacher/settings/profile') },
  ]
  if (isAdmin || isHoD) {
    navs.push({ id: 'n-school-overview', label: 'School Overview', icon: Trophy, run: () => navigate('/teacher/hod') })
    navs.push({ id: 'n-teachers',        label: 'Teachers',        icon: Users,  run: () => navigate('/teacher/hod/teachers') })
    navs.push({ id: 'n-reporting',       label: 'Reporting',       icon: Target, run: () => navigate('/teacher/hod/reporting') })
  }

  const help = [
    { id: 'h-shortcuts', label: 'Keyboard shortcuts', icon: HelpCircle, run: () => window.dispatchEvent(new CustomEvent('topbar:shortcuts-help')) },
    { id: 'h-contact',   label: 'Contact support',    icon: HelpCircle, run: () => navigate('/teacher/settings/profile') },
  ]

  return { actions, navs, help }
}

function detectMode(input) {
  if (input.startsWith('>')) return { mode: MODE.NAVIGATE, q: input.slice(1).trim() }
  if (input.startsWith('?')) return { mode: MODE.HELP, q: input.slice(1).trim() }
  return { mode: MODE.ACTION, q: input.trim() }
}

const score = (q, c) => {
  if (!q) return 0
  const qq = q.toLowerCase()
  const label = (c.label || '').toLowerCase()
  const kw = (c.keywords || '').toLowerCase()
  if (label.startsWith(qq)) return 100
  if (label.includes(qq)) return 50
  if (kw.includes(qq)) return 20
  return 0
}

export default function CommandPalette({ open, onClose, isAdmin = false, isHoD = false, roleMode = 'admin', onRoleChange }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const [input, setInput] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const [recent, setRecent] = useState(() => (typeof window !== 'undefined' ? readRecent() : []))

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50) }, [open])
  useEffect(() => { if (!open) { setInput(''); setActiveIdx(0) } }, [open])

  const commands = useMemo(() =>
    buildCommands({ navigate, isAdmin, isHoD, onSwitchRole: onRoleChange, roleMode }),
    [navigate, isAdmin, isHoD, roleMode, onRoleChange],
  )
  const allCommands = [...commands.actions, ...commands.navs, ...commands.help]

  const { mode, q } = detectMode(input)

  // Build the visible list per mode + recency
  const visible = useMemo(() => {
    let pool = []
    if (mode === MODE.NAVIGATE) pool = commands.navs
    else if (mode === MODE.HELP) pool = commands.help
    else pool = q ? allCommands : commands.actions

    if (q) {
      return pool
        .map(c => ({ c, s: score(q, c) }))
        .filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map(x => x.c)
    }
    // No query: show recently-used at the top
    const recentCmds = recent
      .map(id => pool.find(c => c.id === id))
      .filter(Boolean)
    const rest = pool.filter(c => !recent.includes(c.id))
    return [...recentCmds, ...rest]
  }, [mode, q, commands, allCommands, recent])

  useEffect(() => { setActiveIdx(0) }, [input, mode])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(visible.length - 1, i + 1)) }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)) }
      else if (e.key === 'Enter') {
        e.preventDefault()
        const c = visible[activeIdx]
        if (c) {
          const next = [c.id, ...recent.filter(id => id !== c.id)].slice(0, RECENT_MAX)
          setRecent(next); writeRecent(next)
          onClose()
          // Fire after close so navigation isn't intercepted
          setTimeout(() => c.run(), 0)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, visible, activeIdx, onClose, recent])

  // Scroll active item into view
  useEffect(() => {
    const node = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  if (typeof document === 'undefined') return null

  const placeholder = mode === MODE.NAVIGATE ? 'Navigate to…'
    : mode === MODE.HELP ? 'Get help with…'
    : 'Type a command, > to navigate, ? for help'

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'var(--surface-overlay, rgba(15,30,61,0.45))',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '10vh',
          }}
        >
          <motion.div
            initial={{ y: -12, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -8, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            role="dialog"
            aria-label="Command palette"
            style={{
              width: 560, maxHeight: '60vh',
              background: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg, 12px)',
              boxShadow: 'var(--shadow-overlay, 0 24px 60px rgba(15,30,61,0.18), 0 4px 12px rgba(15,30,61,0.10))',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            {/* Input row */}
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {mode === MODE.NAVIGATE ? <Compass size={15} style={{ color: 'var(--text-tertiary)' }} /> :
               mode === MODE.HELP     ? <HelpCircle size={15} style={{ color: 'var(--text-tertiary)' }} /> :
                                        <Command size={15} style={{ color: 'var(--text-tertiary)' }} />}
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                className="flex-1 bg-transparent border-0 outline-none text-[14px]"
                style={{ color: 'var(--text-primary)' }}
              />
              <span className="inline-flex items-center px-1.5 py-[2px] rounded-[3px] text-[10px] font-mono"
                style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}>
                ⌘K
              </span>
            </div>

            {/* Mode hints */}
            {!input && (
              <div className="px-4 py-1.5 flex items-center gap-3 text-[10.5px]"
                style={{ background: 'var(--surface-sunken)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}>
                <span><kbd style={{ fontFamily: 'var(--font-mono)' }}>{'>'}</kbd> navigate</span>
                <span><kbd style={{ fontFamily: 'var(--font-mono)' }}>?</kbd> help</span>
                <span style={{ marginLeft: 'auto' }}>↑↓ ↵ Esc</span>
              </div>
            )}

            {/* Results */}
            <div ref={listRef} style={{ flex: 1, overflowY: 'auto', minHeight: 80 }}>
              {visible.length === 0 ? (
                <div className="px-4 py-6 text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                  No commands match.
                </div>
              ) : (
                visible.map((c, i) => {
                  const Icon = c.icon || ArrowRight
                  const active = i === activeIdx
                  return (
                    <button key={c.id} data-idx={i}
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => {
                        const next = [c.id, ...recent.filter(id => id !== c.id)].slice(0, RECENT_MAX)
                        setRecent(next); writeRecent(next)
                        onClose(); setTimeout(() => c.run(), 0)
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors"
                      style={{
                        background: active ? 'var(--brand-accent-tint)' : 'transparent',
                        cursor: 'pointer', border: 'none',
                      }}>
                      <Icon size={15} style={{ color: 'var(--text-secondary)' }} className="shrink-0" />
                      <span className="flex-1 truncate text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{c.label}</span>
                      {active && <CornerDownLeft size={12} style={{ color: 'var(--text-tertiary)' }} />}
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
