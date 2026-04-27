import { NavLink, useLocation } from 'react-router-dom'

export default function TabStrip({ tabs, basePath }) {
  const location = useLocation()

  return (
    <div className="flex gap-1 w-fit" style={{
      background: 'var(--surface-sunken)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding: 3,
    }}>
      {tabs.map(t => {
        const to = t.href === '' ? basePath : `${basePath}${t.href}`
        const isActive = t.href === ''
          ? location.pathname === basePath || location.pathname === `${basePath}/`
          : location.pathname.startsWith(to)

        return (
          <NavLink key={t.id} to={to} className={`
            px-[12px] py-[6px] rounded-[var(--radius-sm)] text-[13px] font-semibold
            tracking-[-0.005em] transition-colors duration-100 whitespace-nowrap
            ${isActive
              ? 'shadow-[var(--shadow-sm)]'
              : 'hover:text-[var(--text-primary)]'
            }
          `} style={{
            background: isActive ? 'var(--surface-card)' : 'transparent',
            color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
          }}>
            {t.label}
          </NavLink>
        )
      })}
    </div>
  )
}
