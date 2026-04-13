import { useState, useEffect, useId, Suspense } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTeam } from '../../context/TeamContext'
import { clubService } from '../../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import ErrorBoundary from './ErrorBoundary'
import {
  LayoutDashboard,
  MessageSquare,
  Target,
  Calendar,
  Users,
  Trophy,
  Video,
  Coffee,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  CalendarDays,
  Table as TableIcon,
  Bell,
  Shield,
  Building2,
  Plus,
  TrendingUp,
  MonitorPlay,
} from 'lucide-react'
import HelpChatWidget from '../HelpChatWidget'

// Touchline logo mark component
function TouchlineMark({ className = "w-10 h-8" }) {
  const id = useId()
  const gradId = `tl-arc-${id}`
  return (
    <svg viewBox="0 10 64 38" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2ED573"/>
          <stop offset="100%" stopColor="#F5A623"/>
        </linearGradient>
      </defs>
      <g fill="none">
        <path d="M12 44 C18 12, 46 12, 52 44"
              stroke={`url(#${gradId})`}
              strokeWidth="4.5"
              strokeLinecap="round"/>
        <line x1="8" y1="44" x2="56" y2="44"
              stroke="#2ED573"
              strokeWidth="3.5"
              strokeLinecap="round"/>
        <circle cx="32" cy="44" r="5" fill="#2ED573"/>
      </g>
    </svg>
  )
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Assistant', href: '/chat', icon: MessageSquare, highlight: true },
  { name: 'Matches', href: '/matches', icon: CalendarDays },
  { name: 'League Table', href: '/league', icon: TableIcon },
  { name: 'Tactics', href: '/tactics', icon: Target },
  { name: 'Training', href: '/training', icon: Calendar },
  { name: 'Players', href: '/players', icon: Users },
  { name: 'Development', href: '/season-development', icon: TrendingUp },
  { name: 'Videos', href: '/videos', icon: Video },
  { name: 'Film Room', href: '/film-room', icon: MonitorPlay },
  { name: 'Lounge', href: '/lounge', icon: Coffee },
]

const bottomNav = [
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const { team, branding } = useTeam()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [myClubs, setMyClubs] = useState([])

  useEffect(() => {
    clubService.getMyClubs()
      .then(res => setMyClubs(res.data || []))
      .catch(() => {}) // non-critical
  }, [user?.id])

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>
      
      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-navy-900 border-r border-navy-800
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-navy-800">
            <div className="flex items-center gap-2">
              <TouchlineMark className="w-10 h-6" />
              <h1 className="font-display font-semibold text-navy-50 text-lg">Touchline</h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-navy-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Team info with branding */}
          {team && (
            <div
              className="px-4 py-3 border-b"
              style={{ borderColor: branding.primaryColor + '30' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  {branding.teamName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{branding.hubName}</p>
                  <p className="text-xs" style={{ color: branding.primaryColor }}>{branding.ageGroup}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
              
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-pitch-600/20 text-pitch-400' 
                      : 'text-navy-400 hover:text-white hover:bg-navy-800'
                    }
                    ${item.highlight && !isActive ? 'bg-navy-800/50' : ''}
                  `}
                >
                  <item.icon className={`w-5 h-5 ${item.highlight && !isActive ? 'text-pitch-400' : ''}`} />
                  <span className="font-medium">{item.name}</span>
                  {item.highlight && (
                    <span className="ml-auto text-xs bg-pitch-600/30 text-pitch-400 px-2 py-0.5 rounded-full">
                      AI
                    </span>
                  )}
                  {isActive && (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </NavLink>
              )
            })}
          </nav>
          
          {/* Club links */}
          {(myClubs.length > 0 || (user?.role === 'manager' || user?.role === 'assistant')) && (
            <div className="px-3 py-2 border-t border-navy-800">
              {myClubs.map((club) => (
                <NavLink
                  key={club.id}
                  to={`/club/${club.slug}`}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                    ${isActive
                      ? 'bg-amber-600/20 text-amber-400'
                      : 'text-amber-400/70 hover:text-amber-400 hover:bg-navy-800'
                    }
                  `}
                >
                  <Building2 className="w-5 h-5" />
                  <span className="font-medium truncate">{club.name}</span>
                  <span className="ml-auto text-xs bg-amber-600/20 text-amber-400 px-2 py-0.5 rounded-full capitalize">
                    {club.my_role}
                  </span>
                </NavLink>
              ))}
              {(user?.role === 'manager' || user?.role === 'assistant') && (
                <NavLink
                  to="/club/create"
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                    ${isActive
                      ? 'bg-amber-600/20 text-amber-400'
                      : 'text-navy-400 hover:text-amber-400 hover:bg-navy-800'
                    }
                  `}
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Create Club</span>
                </NavLink>
              )}
            </div>
          )}

          {/* Bottom navigation */}
          <div className="px-3 py-4 border-t border-navy-800 space-y-1">
            {bottomNav.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                  ${isActive
                    ? 'bg-pitch-600/20 text-pitch-400'
                    : 'text-navy-400 hover:text-white hover:bg-navy-800'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </NavLink>
            ))}

            {/* Admin link - only visible to admins */}
            {user?.is_admin && (
              <NavLink
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                  ${isActive
                    ? 'bg-amber-600/20 text-amber-400'
                    : 'text-amber-400/70 hover:text-amber-400 hover:bg-navy-800'
                  }
                `}
              >
                <Shield className="w-5 h-5" />
                <span className="font-medium">Admin</span>
              </NavLink>
            )}

            {/* User & Logout */}
            <div className="flex items-center gap-3 px-3 py-2.5 mt-2">
              <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-sm font-medium text-navy-300">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-navy-400 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                className="p-2 text-navy-400 hover:text-alert-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 lg:hidden flex items-center justify-between h-16 px-4 bg-navy-900/80 backdrop-blur-md border-b border-navy-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-navy-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-1">
            <TouchlineMark className="w-8 h-5" />
            <span className="font-display font-semibold text-navy-50">Touchline</span>
          </div>
          
          <div className="w-10 h-10 rounded-full bg-navy-700 flex items-center justify-center text-sm font-medium text-navy-300">
            {user?.name?.charAt(0) || 'U'}
          </div>
        </header>
        
        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)] lg:min-h-screen">
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="spinner w-8 h-8" /></div>}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      
      {/* Help Chat Widget (all screen sizes) */}
      <HelpChatWidget userRole={user?.role || 'manager'} />
    </div>
  )
}
