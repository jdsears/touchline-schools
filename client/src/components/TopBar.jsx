import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSchoolBranding } from '../hooks/useSchoolBranding'
import { Search, ChevronRight, ChevronDown, Menu, Command } from 'lucide-react'
import AvatarMenu from './topbar/AvatarMenu'
import NotificationsPopover from './topbar/NotificationsPopover'

function Breadcrumbs({ pathname }) {
  const segments = buildCrumbs(pathname)
  if (!segments.length) return null

  const display = segments.length > 4
    ? [segments[0], { ellipsis: true }, ...segments.slice(-2)]
    : segments

  return (
    <div className="flex items-center gap-1.5 min-w-0 text-[13px]">
      {display.map((seg, i) => {
        const isLast = i === display.length - 1
        if (seg.ellipsis) {
          return (
            <span key="ellipsis" className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-[var(--radius-sm)] text-[11.5px] font-semibold"
                style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}>
                ...
              </span>
              <ChevronRight size={11} style={{ color: 'var(--text-tertiary)' }} />
            </span>
          )
        }
        return (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {isLast ? (
              <span className="font-semibold truncate" style={{ color: 'var(--text-primary)', maxWidth: 320 }}>{seg.label}</span>
            ) : (
              <Link to={seg.href} className="font-medium truncate hover:underline" style={{ color: 'var(--text-secondary)', maxWidth: 220, textDecoration: 'none' }}>
                {seg.label}
              </Link>
            )}
            {!isLast && <ChevronRight size={11} style={{ color: 'var(--text-tertiary)' }} />}
          </span>
        )
      })}
    </div>
  )
}

function buildCrumbs(pathname) {
  const parts = pathname.replace(/^\/teacher\/?/, '').split('/').filter(Boolean)
  if (!parts.length) return [{ label: 'Dashboard', href: '/teacher' }]

  const crumbs = [{ label: 'Dashboard', href: '/teacher' }]
  const routeLabels = {
    hod: 'School Overview', teams: 'My Teams', fixtures: 'Fixtures', classes: 'My Classes',
    lessons: 'Lesson Planning', assessment: 'Assessment', reports: 'Reports', settings: 'Settings',
    curriculum: 'Curriculum', development: 'Pupil Development', tactics: 'Tactics',
    video: 'Video', sessions: 'Session Planning', assistant: 'AI Assistant',
    safeguarding: 'Safeguarding', match: 'Match', squad: 'Squad', prep: 'Match Prep',
  }

  let path = '/teacher'
  for (const part of parts) {
    path += '/' + part
    const label = routeLabels[part] || (part.length > 8 ? part.slice(0, 8) + '...' : part)
    crumbs.push({ label, href: path })
  }
  return crumbs
}

function RoleToggle({ active, onChange }) {
  return (
    <div role="tablist" className="inline-flex p-[2px] rounded-full"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)' }}>
      {[{ id: 'admin', label: 'School Admin' }, { id: 'teacher', label: 'Teacher' }].map(o => (
        <button key={o.id} role="tab" aria-selected={active === o.id} onClick={() => onChange(o.id)}
          className="px-[14px] py-[5px] rounded-full text-[12.5px] font-semibold tracking-[-0.005em] transition-colors"
          style={{
            background: active === o.id ? 'var(--brand-primary)' : 'transparent',
            color: active === o.id ? 'var(--on-brand-primary)' : 'var(--text-secondary)',
            border: 'none', cursor: 'pointer',
          }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function TopBar({ onMenuClick, isHoD, isAdmin, roleMode, onRoleChange }) {
  const { user } = useAuth()
  const branding = useSchoolBranding()
  const location = useLocation()
  const showRoleToggle = isAdmin && isHoD
  const initials = (user?.name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  const urlHint = location.pathname.replace('/teacher/', '').replace(/\//g, ' / ')

  return (
    <div className="flex items-center gap-3 h-[56px] z-20" style={{
      padding: '0 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-page)',
    }}>
      {/* Mobile hamburger */}
      <button onClick={onMenuClick} className="lg:hidden w-8 h-8 rounded-[var(--radius-md)] inline-flex items-center justify-center shrink-0"
        style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
        <Menu size={16} />
      </button>

      {/* Breadcrumbs */}
      <div className="flex-1 min-w-0 hidden md:block">
        <Breadcrumbs pathname={location.pathname} />
      </div>
      {/* Mobile: compact crumb */}
      <div className="flex-1 min-w-0 md:hidden">
        <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {buildCrumbs(location.pathname).slice(-1)[0]?.label || 'Dashboard'}
        </span>
      </div>

      {/* URL hint */}
      <span className="hidden xl:block text-[11.5px] font-mono shrink-0" style={{ color: 'var(--text-tertiary)' }}>
        {urlHint}
      </span>

      {/* Role toggle */}
      {showRoleToggle && (
        <div className="hidden lg:block shrink-0">
          <RoleToggle active={roleMode || 'admin'} onChange={onRoleChange} />
        </div>
      )}

      {/* Search */}
      <button className="w-[34px] h-[34px] rounded-[var(--radius-md)] inline-flex items-center justify-center shrink-0"
        style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
        <Search size={15} />
      </button>

      {/* Command palette trigger */}
      <span className="hidden lg:inline-flex items-center px-1.5 py-[2px] rounded-[4px] text-[10.5px] font-semibold font-mono shrink-0"
        style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}>
        <Command size={10} className="mr-0.5" />K
      </span>

      {/* Notifications */}
      <NotificationsPopover isAdmin={isAdmin} isHoD={isHoD} />

      {/* Profile */}
      <AvatarMenu
        initials={initials}
        size={32}
        isAdmin={isAdmin}
        isHoD={isHoD}
        roleMode={roleMode}
        onRoleChange={onRoleChange}
        schoolName={branding?.schoolName}
      />
    </div>
  )
}
