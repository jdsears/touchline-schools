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
      className="fixed bottom-0 left-0 right-0 z-40 bg-navy-900 border-t border-navy-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-[60px] max-w-lg mx-auto">
        {TABS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] transition-colors ${
                isActive
                  ? 'text-gold-400'
                  : 'text-white/50 hover:text-white/70'
              }`
            }
          >
            <Icon size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
