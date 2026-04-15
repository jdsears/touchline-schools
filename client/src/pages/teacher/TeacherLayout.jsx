import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { hodService, voiceObservationService } from '../../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import ErrorBoundary from '../../components/common/ErrorBoundary'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardCheck,
  FileBarChart,
  GraduationCap,
  Calendar,
  Shield,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Trophy,
  Video,
  Clapperboard,
  Sparkles,
  Target,
  Swords,
  MonitorPlay,
  Building2,
  BarChart3,
  UserCog,
  Mic,
  Link2,
} from 'lucide-react'

const hodNav = [
  { name: 'School Overview', href: '/hod', icon: Building2, end: true },
  { name: 'Teachers', href: '/hod/teachers', icon: UserCog },
  { name: 'Pupils', href: '/hod/pupils', icon: Users },
  { name: 'All Teams', href: '/hod/teams', icon: Shield },
  { name: 'All Classes', href: '/hod/classes', icon: GraduationCap },
  { name: 'Reporting', href: '/hod/reporting', icon: BarChart3 },
  { name: 'Voice Safeguarding', href: '/hod/voice-safeguarding', icon: Shield, voiceOnly: true },
  { name: 'Voice Settings', href: '/hod/voice-settings', icon: Mic, voiceOnly: true },
  { name: 'Data & Privacy', href: '/hod/gdpr', icon: ShieldCheck },
  { name: 'SSO Settings', href: '/hod/sso-settings', icon: Link2 },
]

const curriculumNav = [
  { name: 'Dashboard', href: '', icon: LayoutDashboard, end: true },
  { name: 'My Classes', href: '/classes', icon: GraduationCap },
  { name: 'Lesson Planning', href: '/lessons', icon: BookOpen },
  { name: 'Assessment', href: '/assessment', icon: ClipboardCheck },
  { name: 'Reports', href: '/reports', icon: FileBarChart },
  { name: 'Curriculum Overview', href: '/curriculum', icon: Target },
]

const extracurricularNav = [
  { name: 'My Teams', href: '/teams', icon: Shield },
  { name: 'Fixtures & Results', href: '/fixtures', icon: Trophy },
  { name: 'Session Planning', href: '/sessions', icon: Calendar },
  { name: 'Pupil Development', href: '/development', icon: Users },
  { name: 'Tactics Board', href: '/tactics', icon: Swords },
  { name: 'Video Library', href: '/video', icon: Video },
  { name: 'Film Room', href: '/film-room', icon: MonitorPlay },
]

const sharedNav = [
  { name: 'AI Assistant', href: '/assistant', icon: Sparkles },
  { name: 'Safeguarding', href: '/safeguarding', icon: ShieldCheck },
  { name: 'Settings', href: '/settings', icon: Settings },
]

// Map internal role values to school-friendly display labels
const ROLE_DISPLAY = {
  owner: 'Owner',
  school_admin: 'School Admin',
  head_of_pe: 'Head of PE/Sport',
  head_of_sport: 'Head of Sport',
  teacher: 'Teacher',
  read_only: 'Read Only',
  // Legacy grassroots roles -> school labels
  manager: 'Teacher',
  assistant: 'Assistant Teacher',
  scout: 'Assistant Teacher',
  admin: 'School Admin',
  coach: 'Teacher',
  parent: 'Parent',
}

function SidebarContent({ user, logout, setSidebarOpen, pathname, isHoD, voiceEnabled, schoolRole }) {
  const basePath = '/teacher'
  const roleDisplay = ROLE_DISPLAY[schoolRole] || ROLE_DISPLAY[user?.role] || user?.role

  function NavItem({ item }) {
    const fullPath = item.end ? basePath : `${basePath}${item.href}`
    const isActive = item.end
      ? pathname === basePath || pathname === `${basePath}/`
      : pathname.startsWith(fullPath)

    return (
      <NavLink
        to={fullPath}
        onClick={() => setSidebarOpen(false)}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
          ${isActive
            ? 'bg-pitch-600/20 text-pitch-400'
            : 'text-navy-400 hover:text-white hover:bg-navy-800'
          }
        `}
      >
        <item.icon className="w-5 h-5" />
        <span className="font-medium">{item.name}</span>
        {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
      </NavLink>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-navy-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-pitch-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Teacher Hub</div>
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

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {/* Head of Department (role-gated) */}
        {isHoD && (
          <>
            <div className="mb-1 px-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Head of Department
              </span>
            </div>
            <div className="space-y-1 mb-6">
              {hodNav.filter(item => !item.voiceOnly || voiceEnabled).map(item => (
                <NavItem key={item.href} item={item} />
              ))}
            </div>
          </>
        )}

        {/* Curriculum PE */}
        <div className="mb-1 px-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-navy-500">
            Curriculum PE
          </span>
        </div>
        <div className="space-y-1 mb-6">
          {curriculumNav.map(item => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>

        {/* Extra-curricular Sport */}
        <div className="mb-1 px-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-navy-500">
            Extra-curricular
          </span>
        </div>
        <div className="space-y-1 mb-6">
          {extracurricularNav.map(item => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>

        {/* Shared */}
        <div className="border-t border-navy-800 pt-4 space-y-1">
          {sharedNav.map(item => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>
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
            <div className="text-xs text-navy-400">{roleDisplay}</div>
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

export default function TeacherLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isHoD, setIsHoD] = useState(false)
  const [schoolRole, setSchoolRole] = useState(null)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [voicePendingCount, setVoicePendingCount] = useState(0)
  const [showRecorder, setShowRecorder] = useState(false)

  useEffect(() => {
    hodService.check()
      .then(res => {
        setIsHoD(res.data.isHoD)
        if (res.data.role) setSchoolRole(res.data.role)
      })
      .catch(() => setIsHoD(false))

    // Check voice observations feature flag and pending count
    voiceObservationService.listPending()
      .then(res => {
        setVoiceEnabled(true)
        setVoicePendingCount(res.data.filter(v => v.pending_count > 0).length)
      })
      .catch(() => setVoiceEnabled(false))
  }, [location.pathname])

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
          isHoD={isHoD}
          voiceEnabled={voiceEnabled}
          schoolRole={schoolRole}
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
            <GraduationCap className="w-5 h-5 text-pitch-400" />
            <span className="text-sm font-semibold text-white">Teacher Hub</span>
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

      {/* Voice Observation FAB (mobile-first, bottom-right) */}
      {voiceEnabled && !showRecorder && (
        <button
          onClick={() => setShowRecorder(true)}
          className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-pitch-600 hover:bg-pitch-700 shadow-lg shadow-pitch-600/30 flex items-center justify-center transition-all hover:scale-105"
          title="Voice observation"
        >
          <Mic className="w-6 h-6 text-white" />
          {voicePendingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-alert-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
              {voicePendingCount}
            </span>
          )}
        </button>
      )}

      {/* Voice Recorder Modal */}
      {showRecorder && (
        <VoiceRecorderLazy onClose={() => setShowRecorder(false)} />
      )}
    </div>
  )
}

// Lazy load the recorder component to avoid loading MediaRecorder code unnecessarily
import { lazy, Suspense } from 'react'
const VoiceRecorderComponent = lazy(() => import('../../components/voice/VoiceObservationRecorder'))
function VoiceRecorderLazy({ onClose }) {
  return (
    <Suspense fallback={null}>
      <VoiceRecorderComponent onClose={onClose} />
    </Suspense>
  )
}
