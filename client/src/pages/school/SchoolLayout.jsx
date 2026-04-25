import { useState, useEffect, Suspense } from 'react'
import { Outlet, NavLink, useParams, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { clubService } from '../../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import ErrorBoundary from '../../components/common/ErrorBoundary'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ClipboardList,
  Building2,
  UserPlus,
  ChevronLeft,
  CreditCard,
  Receipt,
  Megaphone,
  ShieldCheck,
  CalendarDays,
  Calendar,
  Sparkles,
  FileBarChart,
  Heart,
} from 'lucide-react'

const clubNavigation = [
  { name: 'Dashboard', href: '', icon: LayoutDashboard, end: true },
  { name: 'Teams', href: '/teams', icon: Building2 },
  { name: 'Players', href: '/pupils', icon: Users },
  { name: 'Guardians', href: '/guardians', icon: UserCheck },
  { name: 'Members', href: '/members', icon: Shield },
  { name: 'Registrations', href: '/registrations', icon: ClipboardList, roles: ['owner', 'admin', 'secretary'] },
  { name: 'Safeguarding', href: '/safeguarding', icon: ShieldCheck, roles: ['owner', 'admin', 'secretary'] },
  { name: 'Events', href: '/events', icon: CalendarDays, roles: ['owner', 'admin'] },
  { name: 'Schedule', href: '/schedule', icon: Calendar, roles: ['owner', 'admin', 'coach'] },
  { name: 'AI Insights', href: '/insights', icon: Sparkles, roles: ['owner', 'admin'] },
  { name: 'Reports', href: '/reports', icon: FileBarChart, roles: ['owner', 'admin'] },
  { name: 'Announcements', href: '/announcements', icon: Megaphone, roles: ['owner', 'admin', 'secretary'] },
  { name: 'Payments', href: '/payments', icon: CreditCard, roles: ['owner', 'admin', 'treasurer'] },
  { name: 'Gift Aid', href: '/gift-aid', icon: Heart, roles: ['owner', 'admin', 'treasurer'] },
  { name: 'Billing', href: '/billing', icon: Receipt, roles: ['owner', 'admin'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['owner', 'admin'] },
]

export default function ClubLayout() {
  const { slug } = useParams()
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [school, setClub] = useState(null)
  const [myRole, setMyRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    loadClub()
  }, [slug])

  async function loadClub() {
    setLoadError(null)
    try {
      // First get public info, then try to get full school via my schools
      const myClubs = await clubService.getMyClubs()
      const myClub = myClubs.data.find(c => c.slug === slug)
      if (myClub) {
        setClub(myClub)
        setMyRole(myClub.my_role)
      } else {
        // Try public endpoint
        const pubRes = await clubService.getClubBySlug(slug)
        setClub(pubRes.data)
        if (user?.is_admin) setMyRole('owner')
      }
    } catch (err) {
      console.error('Failed to load school:', err)
      setLoadError(err.response?.status === 404 ? 'not_found' : 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-primary mb-2">
            {loadError === 'error' ? 'Failed to load school' : 'School not found'}
          </h2>
          <p className="text-secondary mb-4">
            {loadError === 'error'
              ? 'Something went wrong loading the school. Please check your connection and try again.'
              : "The school you're looking for doesn't exist."}
          </p>
          {loadError === 'error' && (
            <button
              onClick={() => { setLoading(true); loadClub() }}
              className="px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-on-dark rounded-lg text-sm transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    )
  }

  const basePath = `/school/${slug}`
  const filteredNav = clubNavigation.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(myRole) || user?.is_admin
  })

  return (
    <div className="min-h-screen bg-page">
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
        fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border-default
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* School header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-border-default">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-primary font-bold text-sm shrink-0"
                style={{ backgroundColor: school.primary_color || '#1a365d' }}
              >
                {school.name?.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary truncate">{school.name}</p>
                {myRole && <p className="text-xs text-secondary capitalize">{myRole}</p>}
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-secondary hover:text-primary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {filteredNav.map((item) => {
              const fullPath = basePath + item.href
              const isActive = item.end
                ? location.pathname === fullPath || location.pathname === fullPath + '/'
                : location.pathname.startsWith(fullPath) && item.href !== ''

              return (
                <NavLink
                  key={item.name}
                  to={fullPath}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                    ${isActive
                      ? 'bg-pitch-600/20 text-pitch-400'
                      : 'text-secondary hover:text-primary hover:bg-subtle'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </NavLink>
              )
            })}
          </nav>

          {/* Registration link */}
          <div className="px-3 py-2 border-t border-border-default">
            <div className="bg-subtle rounded-lg p-3">
              <p className="text-xs text-secondary mb-1">Registration link</p>
              <p className="text-xs text-pitch-400 truncate font-mono">
                /school/{slug}/register
              </p>
            </div>
          </div>

          {/* Bottom nav */}
          <div className="px-3 py-4 border-t border-border-default space-y-1">
            <NavLink
              to="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-secondary hover:text-primary hover:bg-subtle transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">Back to Team</span>
            </NavLink>

            <div className="flex items-center gap-3 px-3 py-2.5 mt-2">
              <div className="w-8 h-8 rounded-full bg-border-default flex items-center justify-center text-sm font-medium text-secondary">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">{user?.name}</p>
                <p className="text-xs text-secondary capitalize">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                className="p-2 text-secondary hover:text-alert-400 transition-colors"
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
        <header className="sticky top-0 z-30 lg:hidden flex items-center justify-between h-16 px-4 bg-card backdrop-blur-md border-b border-border-default">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-secondary hover:text-primary"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-primary font-bold text-xs"
              style={{ backgroundColor: school.primary_color || '#1a365d' }}
            >
              {school.name?.charAt(0)}
            </div>
            <span className="font-semibold text-primary text-sm truncate max-w-[200px]">{school.name}</span>
          </div>

          <div className="w-8 h-8 rounded-full bg-border-default flex items-center justify-center text-sm font-medium text-secondary">
            {user?.name?.charAt(0) || 'U'}
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)] lg:min-h-screen">
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="spinner w-8 h-8" /></div>}>
              <Outlet context={{ school, myRole, refreshClub: loadClub }} />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
