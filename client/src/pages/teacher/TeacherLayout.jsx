import { useState, useEffect, useCallback } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { hodService, voiceObservationService } from '../../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import ErrorBoundary from '../../components/common/ErrorBoundary'
import { useSchoolBranding } from '../../hooks/useSchoolBranding'
import Sidebar from '../../components/Sidebar'
import {
  GraduationCap,
  Menu,
  Mic,
  X,
} from 'lucide-react'

const ROLE_DISPLAY = {
  owner: 'Owner',
  school_admin: 'School Admin',
  head_of_pe: 'Head of PE/Sport',
  head_of_sport: 'Head of Sport',
  teacher: 'Teacher',
  read_only: 'Read Only',
  manager: 'Teacher',
  assistant: 'Assistant Teacher',
  scout: 'Assistant Teacher',
  admin: 'School Admin',
  coach: 'Teacher',
  parent: 'Parent',
}

function buildUserRoles(isHoD, schoolRole) {
  const roles = []
  if (['owner', 'school_admin', 'admin'].includes(schoolRole)) roles.push('schoolAdmin')
  if (isHoD && !roles.includes('schoolAdmin')) roles.push('hod')
  roles.push('teacherCurriculum', 'teacherExtraCurricular')
  return roles
}

export default function TeacherLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const schoolBranding = useSchoolBranding()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isHoD, setIsHoD] = useState(false)
  const [schoolRole, setSchoolRole] = useState(null)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [voicePendingCount, setVoicePendingCount] = useState(0)
  const [showRecorder, setShowRecorder] = useState(false)

  const isOnHoDView = location.pathname === '/teacher/hod' || location.pathname.startsWith('/teacher/hod/')
  const isOnTeacherHome = location.pathname === '/teacher'
  const roleDisplay = ROLE_DISPLAY[schoolRole] || ROLE_DISPLAY[user?.role] || user?.role

  const switchView = useCallback((view) => {
    localStorage.setItem('preferred_dashboard_view', view)
    navigate(view === 'hod' ? '/teacher/hod' : '/teacher')
  }, [navigate])

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
        setVoicePendingCount(Array.isArray(res.data) ? res.data.filter(v => v.pending_count > 0).length : 0)
      })
      .catch((err) => {
        // 403 means school doesn't have voice enabled; other errors are transient
        if (err.response?.status === 403) {
          setVoiceEnabled(false)
        } else {
          // Endpoint may have failed for a transient reason; still show the FAB
          setVoiceEnabled(true)
        }
      })
  }, [location.pathname])

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-page)' }}>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'var(--surface-overlay, rgba(15,30,61,0.45))' }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar -- desktop: fixed, mobile: drawer */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-[280px] lg:w-[248px]
        transition-transform duration-[180ms] ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <Sidebar
          roles={buildUserRoles(isHoD, schoolRole)}
          school={{ name: schoolBranding?.schoolName, initials: schoolBranding?.schoolName?.split(' ').map(w => w[0]).join('').slice(0, 2) || 'MB', roleLabel: roleDisplay }}
          user={user}
          onLogout={logout}
        />
      </div>

      {/* Main content */}
      <div className="lg:pl-[248px]">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 lg:hidden flex items-center justify-between h-14 px-4 bg-brand-navy">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-on-dark/60 hover:text-on-dark"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-brand-gold" />
            <span className="text-sm font-semibold text-on-dark">Teacher Hub</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-xs font-medium text-on-dark">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
        </header>

        {/* Role switcher for dual-role HoD+Teacher users */}
        {isHoD && (isOnHoDView || isOnTeacherHome) && (
          <div className="flex items-center justify-end px-4 md:px-6 pt-4 pb-0">
            <div className="inline-flex rounded-lg bg-card border border-border-default p-0.5">
              <button
                onClick={() => switchView('hod')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  isOnHoDView ? 'bg-brand-navy text-on-dark' : 'text-secondary hover:text-link'
                }`}
              >
                School Admin
              </button>
              <button
                onClick={() => switchView('teacher')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  isOnTeacherHome ? 'bg-brand-navy text-on-dark' : 'text-secondary hover:text-link'
                }`}
              >
                Teacher
              </button>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)] lg:min-h-screen">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Voice Observation FAB -- v1.5 spec: 52px, bottom-right, z-40 */}
      {voiceEnabled && !showRecorder && (
        <button
          onClick={() => setShowRecorder(true)}
          aria-label="Record voice observation"
          className="fixed z-40 flex items-center justify-center"
          style={{
            right: 24, bottom: 24, width: 52, height: 52, borderRadius: '50%',
            background: 'var(--status-success)', color: 'var(--on-brand-primary)',
            border: 'none', cursor: 'pointer',
            boxShadow: '0 8px 22px rgba(15,30,61,0.22), 0 2px 6px rgba(15,30,61,0.14)',
          }}
        >
          <Mic className="w-[22px] h-[22px]" />
          {voicePendingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: 'var(--status-error)', color: 'var(--on-brand-primary)' }}>
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
import { Suspense } from 'react'
import { lazyWithRetry } from '../../utils/lazyWithRetry'
const VoiceRecorderComponent = lazyWithRetry(() => import('../../components/voice/VoiceObservationRecorder'))
function VoiceRecorderLazy({ onClose }) {
  return (
    <Suspense fallback={null}>
      <VoiceRecorderComponent onClose={onClose} />
    </Suspense>
  )
}
