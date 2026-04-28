import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, LogOut } from 'lucide-react'
import { CROSS_ROLE_TOP, SETTINGS_GROUP, buildVisibleRoles, getIcon } from '../lib/navIA'

const MORE_STORAGE_PREFIX = 'nav.more.'

function readMoreStateFromStorage(roleIds) {
  if (typeof window === 'undefined') return {}
  const next = {}
  for (const id of roleIds) {
    try {
      next[id] = window.localStorage.getItem(`${MORE_STORAGE_PREFIX}${id}`) === '1'
    } catch {
      next[id] = false
    }
  }
  return next
}

function SidebarItem({ item, basePath, active, newSchool }) {
  const Icon = getIcon(item.icon)
  const fullPath = item.href === '' ? basePath : `${basePath}${item.href}`
  const showHint = newSchool && item.emptyHint

  return (
    <NavLink to={fullPath} end={item.href === ''} className={({ isActive }) => `
      flex items-center gap-[10px] py-[6px] px-[10px] mx-2 rounded-[var(--radius-md)]
      text-[13px] cursor-pointer transition-colors duration-100
      ${(active || isActive) ? 'font-semibold bg-[var(--brand-accent-tint)] text-[var(--brand-primary)]'
        : 'font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-card)]'}
    `}>
      <Icon size={16} strokeWidth={active ? 1.8 : 1.6} className="shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {showHint && <span className="text-[10.5px] italic text-[var(--text-tertiary)]">{item.emptyHint}</span>}
      {item.badge && (
        <span className="text-[9.5px] font-bold tracking-[0.04em] uppercase px-1.5 py-px rounded-full"
          style={{ background: 'var(--brand-accent)', color: 'var(--on-brand-accent)' }}>
          {item.badge}
        </span>
      )}
    </NavLink>
  )
}

function GroupLabel({ children, collapsible, expanded, onClick }) {
  return (
    <div onClick={onClick} className={`flex items-center gap-1.5 px-[18px] pt-3 pb-1 select-none ${collapsible ? 'cursor-pointer' : ''}`}>
      <span className="flex-1 text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: 'var(--brand-accent)' }}>
        {children}
      </span>
      {collapsible && (
        <ChevronDown size={12} className={`text-[var(--text-tertiary)] transition-transform duration-150 ${expanded ? '' : '-rotate-90'}`} />
      )}
    </div>
  )
}

function MoreToggle({ count, expanded, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 py-[5px] px-[10px] mx-2 mt-0.5 rounded-[var(--radius-md)] text-xs font-medium text-[var(--text-tertiary)] select-none hover:bg-[var(--surface-card)]">
      <ChevronDown size={12} className={`transition-transform duration-150 ${expanded ? '' : '-rotate-90'}`} />
      <span>{expanded ? 'Less' : `More (${count})`}</span>
    </button>
  )
}

export default function Sidebar({ roles = [], school = {}, user = {}, onLogout, newSchool = false, basePath = '/teacher' }) {
  const visible = buildVisibleRoles(roles)
  const isMulti = visible.length > 1
  const location = useLocation()
  const [moreState, setMoreState] = useState(() => readMoreStateFromStorage(visible.map(r => r.id)))
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Re-collapse School settings whenever the route changes (per spec: not persisted).
  useEffect(() => { setSettingsOpen(false) }, [location.pathname])

  const toggleMore = (id) => setMoreState(s => {
    const next = { ...s, [id]: !s[id] }
    try { window.localStorage.setItem(`${MORE_STORAGE_PREFIX}${id}`, next[id] ? '1' : '0') } catch { /* storage blocked */ }
    return next
  })

  return (
    <aside className="w-[248px] shrink-0 flex flex-col h-full" style={{ background: 'var(--surface-sunken)', borderRight: '1px solid var(--border-subtle)' }}>
      {/* School identity header */}
      <div className="flex items-center gap-[10px] px-4 py-[14px]" style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)' }}>
        <span className="w-8 h-8 rounded-[var(--crest-radius)] inline-flex items-center justify-center text-[13px] font-bold shrink-0"
          style={{ background: 'rgba(255,255,255,0.10)', color: 'var(--brand-accent)', border: '1px solid rgba(255,255,255,0.18)' }}>
          {school.initials || 'MB'}
        </span>
        <div className="flex flex-col leading-[1.15] min-w-0 flex-1">
          <span className="text-[13.5px] font-semibold truncate">{school.name || 'MoonBoots Sports'}</span>
          <span className="text-[11px]" style={{ color: 'var(--text-on-dark-secondary)' }}>{school.roleLabel || 'Teacher'}</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto pb-2">
        {/* Cross-role top cluster */}
        <div className="pt-[10px]">
          {CROSS_ROLE_TOP.map(item => <SidebarItem key={item.id} item={item} basePath={basePath} newSchool={newSchool} />)}
        </div>

        {/* Role groups */}
        {visible.map(role => (
          <div key={role.id}>
            {isMulti && <GroupLabel>{role.label}</GroupLabel>}
            {!isMulti && <div className="h-2" />}
            {role.daily.map(item => <SidebarItem key={item.id} item={item} basePath={basePath} newSchool={newSchool} />)}
            {role.more.length > 0 && (
              <>
                <MoreToggle count={role.more.length} expanded={!!moreState[role.id]} onClick={() => toggleMore(role.id)} />
                {moreState[role.id] && role.more.map(item => <SidebarItem key={item.id} item={item} basePath={basePath} newSchool={newSchool} />)}
              </>
            )}
          </div>
        ))}

        {/* School settings */}
        <GroupLabel collapsible expanded={settingsOpen} onClick={() => setSettingsOpen(o => !o)}>
          School settings
        </GroupLabel>
        {settingsOpen && SETTINGS_GROUP.map(item => <SidebarItem key={item.id} item={item} basePath={basePath} />)}
      </nav>

      {/* User footer */}
      <div className="px-[14px] py-[10px] flex items-center gap-[10px]" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <span className="w-7 h-7 rounded-full inline-flex items-center justify-center text-[11.5px] font-bold shrink-0"
          style={{ background: 'var(--brand-accent-tint)', color: 'var(--text-on-tint)' }}>
          {(user.name || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
        </span>
        <div className="flex flex-col leading-[1.15] flex-1 min-w-0">
          <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</span>
          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{school.roleLabel || 'Teacher'}</span>
        </div>
        <button onClick={onLogout} className="text-[var(--text-tertiary)] hover:text-[var(--status-error)] transition-colors" title="Sign out">
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  )
}
