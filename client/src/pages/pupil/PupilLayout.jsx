import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import ErrorBoundary from '../../components/common/ErrorBoundary'
import { useSchoolBranding } from '../../hooks/useSchoolBranding'
import {
  Home,
  Calendar,
  TrendingUp,
  Dumbbell,
  Video,
  Sparkles,
  Trophy,
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
} from 'lucide-react'

const pupilNav = [
  { name: 'My Sports', href: '', icon: Home, end: true },
  { name: 'My Week', href: '/week', icon: Calendar },
  { name: 'My Development', href: '/development', icon: TrendingUp },
  { name: 'Training Plans', href: '/training', icon: Dumbbell },
  { name: 'My Clips', href: '/clips', icon: Video },
  { name: 'AI Assistant', href: '/assistant', icon: Sparkles },
  { name: 'Achievements', href: '/achievements', icon: Trophy },
]

function SidebarContent({ user, logout, setSidebarOpen, pathname, schoolBranding }) {
  const basePath = '/pupil'

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-navy-800">
        <div className="flex items-center gap-3">
          {schoolBranding?.logoUrl ? (
            <img src={schoolBranding.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: schoolBranding?.primaryColor || '#f59e0b' }}>
              <User className="w-5 h-5" style={{ color: schoolBranding ? 'var(--school-primary-text)' : '#0B1C2D' }} />
            </div>
          )}
          <div>
            <div className="text-sm font-semibold text-white">{schoolBranding?.schoolName || 'My Portal'}</div>
            <div className="text-xs text-navy-400">{user?.name}</div>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1 text-navy-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {pupilNav.map(item => {
          const fullPath = item.end ? basePath : `${basePath}${item.href}`
          const isActive = item.end
            ? pathname === basePath || pathname === `${basePath}/`
            : pathname.startsWith(fullPath)

          return (
            <NavLink
              key={item.href}
              to={fullPath}
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                ${isActive
                  ? 'text-white'
                  : 'text-navy-400 hover:text-white hover:bg-navy-800'
                }
              `}
              style={isActive ? { backgroundColor: `color-mix(in srgb, var(--school-secondary) 20%, transparent)`, color: 'var(--school-secondary)' } : undefined}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
              {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
            </NavLink>
          )
        })}
      </nav>

      {/* User profile + logout */}
      <div className="border-t border-navy-800 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center">
            <span className="text-xs font-medium text-white">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.name}</div>
            <div className="text-xs text-navy-400">Pupil</div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-navy-400 hover:text-alert-400 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  )
}

export default function PupilLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const schoolBranding = useSchoolBranding()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Mobile backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-navy-900 border-r border-navy-800
          flex flex-col transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <SidebarContent
          user={user}
          logout={logout}
          setSidebarOpen={setSidebarOpen}
          pathname={location.pathname}
          schoolBranding={schoolBranding}
        />
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 lg:hidden flex items-center justify-between h-16 px-4 bg-navy-900/80 backdrop-blur-md border-b border-navy-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-navy-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-semibold text-white">My Portal</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center">
            <span className="text-xs font-medium text-white">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)] lg:min-h-screen">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
