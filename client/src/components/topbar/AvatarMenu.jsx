import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Settings, Bell, Mic, Building2, ChevronRight, LogOut,
  Keyboard, HelpCircle, User as UserIcon, ArrowLeftRight,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { clubService } from '../../services/api'
import Popover from './Popover'

const ROLE_PILL_LABEL = {
  schoolAdmin: 'Admin',
  hod: 'HoD',
  teacherCurriculum: 'Curriculum',
  teacherExtraCurricular: 'Extra',
}

function MenuRow({ icon: Icon, label, hint, onClick, to, danger = false, trailing }) {
  const cls = `flex items-center gap-2.5 px-3 py-[7px] w-full text-left text-[13px] transition-colors`
  const style = {
    color: danger ? 'var(--status-error)' : 'var(--text-primary)',
    background: 'transparent',
  }
  const inner = (
    <>
      <Icon size={15} className="shrink-0" style={{ color: danger ? 'var(--status-error)' : 'var(--text-secondary)' }} />
      <span className="flex-1 truncate">{label}</span>
      {hint && <span className="text-[11.5px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{hint}</span>}
      {trailing}
    </>
  )
  if (to) {
    return (
      <Link to={to} onClick={onClick} className={cls + ' hover:bg-[var(--surface-sunken)]'} style={style}>
        {inner}
      </Link>
    )
  }
  return (
    <button onClick={onClick} className={cls + ' hover:bg-[var(--surface-sunken)]'} style={{ ...style, border: 'none', cursor: 'pointer' }}>
      {inner}
    </button>
  )
}

function Divider({ thick = false }) {
  return <div style={{ height: thick ? 2 : 1, background: thick ? 'var(--border-default)' : 'var(--border-subtle)', margin: thick ? '4px 0' : '4px 0' }} />
}

function SectionLabel({ children }) {
  return (
    <div className="px-3 pt-2.5 pb-1 text-[10px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--text-tertiary)' }}>
      {children}
    </div>
  )
}

// Identity card sits at the top: name, email, school, role pills.
function IdentityCard({ name, email, schoolName, roles }) {
  return (
    <div className="px-3.5 py-3" style={{ background: 'var(--surface-sunken)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2.5 mb-1.5">
        <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{name}</span>
      </div>
      {email && <div className="text-[11.5px] truncate mb-2" style={{ color: 'var(--text-secondary)' }}>{email}</div>}
      {schoolName && (
        <div className="flex items-center gap-1.5 mb-2">
          <Building2 size={11} style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-[11.5px] truncate" style={{ color: 'var(--text-tertiary)' }}>{schoolName}</span>
        </div>
      )}
      {roles && roles.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {roles.map(r => (
            <span key={r} className="px-1.5 py-px rounded-[var(--radius-sm)] text-[9.5px] font-bold tracking-[0.06em] uppercase"
              style={{ background: 'var(--brand-accent-tint)', color: 'var(--text-on-tint)' }}>
              {ROLE_PILL_LABEL[r] || r}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AvatarMenu({
  initials,
  size = 32,
  isAdmin = false,
  isHoD = false,
  roleMode = 'admin',
  onRoleChange,
  schoolName,
}) {
  const triggerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [myClubs, setMyClubs] = useState(null) // null = not loaded; [] = loaded empty
  const { user, logout } = useAuth()

  // Lazy-load clubs only when the menu first opens.
  useEffect(() => {
    if (!open || myClubs !== null) return
    clubService.getMyClubs()
      .then(res => setMyClubs(Array.isArray(res.data) ? res.data : []))
      .catch(() => setMyClubs([]))
  }, [open, myClubs])

  // Compose role-class array from layout flags. Mirrors buildUserRoles in TeacherLayout.
  const roleClasses = []
  if (isAdmin) roleClasses.push('schoolAdmin')
  if (isHoD && !isAdmin) roleClasses.push('hod')
  // Every teacher holds both curriculum + extra in v1.5 — no per-user split yet.
  if (!isAdmin) roleClasses.push('teacherCurriculum', 'teacherExtraCurricular')

  const showRoleSwitch = isAdmin && isHoD
  const multiSchool = (myClubs || []).length > 1

  const close = () => setOpen(false)

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
        className="rounded-full inline-flex items-center justify-center font-bold shrink-0 transition-shadow"
        style={{
          width: size, height: size, fontSize: Math.round(size * 0.42),
          background: 'var(--brand-primary-tint)', color: 'var(--brand-primary)',
          border: open ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
          boxShadow: open ? '0 0 0 3px var(--brand-accent-tint)' : 'none',
          cursor: 'pointer',
        }}
      >
        {initials || '?'}
      </button>

      <Popover open={open} onClose={close} anchorRef={triggerRef} width={280} align="right">
        <IdentityCard name={user?.name} email={user?.email} schoolName={schoolName} roles={roleClasses} />

        {showRoleSwitch && (
          <>
            <SectionLabel>Switch role</SectionLabel>
            <MenuRow
              icon={ArrowLeftRight}
              label={roleMode === 'admin' ? 'Switch to Teacher view' : 'Switch to School Admin view'}
              onClick={() => { onRoleChange?.(roleMode === 'admin' ? 'teacher' : 'admin'); close() }}
            />
          </>
        )}

        {multiSchool && (
          <>
            <SectionLabel>Switch school</SectionLabel>
            {myClubs.map(c => (
              <MenuRow
                key={c.id}
                icon={Building2}
                label={c.name}
                hint={c.my_role}
                to={`/school/${c.slug}`}
                onClick={close}
                trailing={<ChevronRight size={12} style={{ color: 'var(--text-tertiary)' }} />}
              />
            ))}
          </>
        )}

        <Divider />
        <SectionLabel>Account</SectionLabel>
        <MenuRow icon={UserIcon} label="Profile settings" to="/teacher/settings/profile" onClick={close} />
        <MenuRow icon={Bell} label="Notification preferences" to="/teacher/settings/notifications" onClick={close} />
        <MenuRow icon={Mic} label="Voice settings" to="/teacher/hod/voice-settings" onClick={close} />

        {isAdmin && (
          <>
            <Divider />
            <MenuRow icon={Settings} label="School settings" to="/teacher/hod" onClick={close} />
          </>
        )}

        <Divider />
        <MenuRow icon={Keyboard} label="Keyboard shortcuts" hint="?" onClick={() => { /* future help modal */ close() }} />
        <MenuRow icon={HelpCircle} label="Help & support" to="/teacher/settings/profile" onClick={close} />

        <Divider thick />
        <MenuRow icon={LogOut} label="Sign out" onClick={() => { logout?.(); close() }} danger />
      </Popover>
    </>
  )
}
