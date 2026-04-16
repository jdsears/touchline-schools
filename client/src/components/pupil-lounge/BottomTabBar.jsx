import { NavLink } from 'react-router-dom'
import { Home, Calendar, Trophy, TrendingUp, User } from 'lucide-react'

const TABS = [
  { to: '/pupil-lounge/today', icon: Home, label: 'Today' },
  { to: '/pupil-lounge/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/pupil-lounge/sports', icon: Trophy, label: 'Sports' },
  { to: '/pupil-lounge/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/pupil-lounge/me', icon: User, label: 'Me' },
]

export default function BottomTabBar() {
  return (
    <nav
      className="absolute bottom-0 left-0 right-0 z-40 bg-navy-900/95 backdrop-blur-md border-t border-navy-800/50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-[56px]">
        {TABS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[44px] transition-all duration-150 ${
                isActive
                  ? 'text-gold-400 scale-105'
                  : 'text-white/40 hover:text-white/60'
              }`
            }
          >
            <Icon size={20} strokeWidth={isActive => isActive ? 2 : 1.5} />
            <span className="text-[9px] font-semibold leading-none">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
