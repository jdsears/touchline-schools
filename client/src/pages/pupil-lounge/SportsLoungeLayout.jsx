import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Home, Calendar, Trophy, TrendingUp, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import PupilInstallPrompt from '../../components/pupil-lounge/PupilInstallPrompt'

const TABS = [
  { to: '/pupil-lounge/today', icon: Home, label: 'Today' },
  { to: '/pupil-lounge/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/pupil-lounge/sports', icon: Trophy, label: 'Sports' },
  { to: '/pupil-lounge/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/pupil-lounge/me', icon: User, label: 'Me' },
]

function ImpersonationBanner() {
  const { impersonating, endImpersonation } = useAuth()
  const navigate = useNavigate()

  if (!impersonating) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-xs font-medium flex items-center justify-between px-3 py-1.5">
      <span>Viewing as: {impersonating} (test persona)</span>
      <button
        onClick={() => { endImpersonation(); navigate('/teacher/hod/test-personas') }}
        className="bg-white/20 hover:bg-white/30 rounded px-2 py-0.5 text-xs transition-colors"
      >
        Return to HoD
      </button>
    </div>
  )
}

export default function SportsLoungeLayout() {
  const { impersonating } = useAuth()

  return (
    <div className="flex flex-col h-[100dvh] bg-navy-950 text-white">
      {/* Impersonation banner */}
      <ImpersonationBanner />

      {/* Main scrollable content */}
      <main
        className={`flex-1 overflow-y-auto overscroll-y-contain ${
          impersonating ? 'pt-8' : ''
        }`}
        style={{
          paddingBottom: 'calc(60px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-navy-900 border-t border-navy-800"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
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

      {/* PWA install prompt (shows after 3 visits) */}
      <PupilInstallPrompt />
    </div>
  )
}
