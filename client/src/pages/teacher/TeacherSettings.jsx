import { useState, useEffect, Suspense } from 'react'
import { lazyWithRetry as lazy } from '../../utils/lazyWithRetry'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { settingsService } from '../../services/api'
import {
  School, Palette, Dumbbell, CalendarDays, Users, FileText, ScrollText,
  Shield, BookOpen, ClipboardList, LayoutTemplate, MapPin,
  User, Award, Bell, Eye, Lock,
  ChevronRight, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'

// Lazy-load each tab
const SchoolProfileTab     = lazy(() => import('./settings/SchoolProfileTab'))
const BrandingTab          = lazy(() => import('./settings/BrandingTab'))
const SportsConfigTab      = lazy(() => import('./settings/SportsConfigTab'))
const AcademicStructureTab = lazy(() => import('./settings/AcademicStructureTab'))
const StaffDirectoryTab    = lazy(() => import('./settings/StaffDirectoryTab'))
const LicenceTab           = lazy(() => import('./settings/LicenceTab'))
const AuditLogTab          = lazy(() => import('./settings/AuditLogTab'))
const TeamsTab             = lazy(() => import('./settings/TeamsTab'))
const KnowledgeBaseTab     = lazy(() => import('./settings/KnowledgeBaseTab'))
const FixtureDefaultsTab   = lazy(() => import('./settings/FixtureDefaultsTab'))
const PersonalProfileTab   = lazy(() => import('./settings/PersonalProfileTab'))
const QualificationsTab    = lazy(() => import('./settings/QualificationsTab'))
const NotificationsTab     = lazy(() => import('./settings/NotificationsTab'))
const AccessibilityTab     = lazy(() => import('./settings/AccessibilityTab'))
const SecurityTab          = lazy(() => import('./settings/SecurityTab'))
const CalendarExportTab    = lazy(() => import('./settings/CalendarExportTab'))
const VenuesTab            = lazy(() => import('./settings/VenuesTab'))
const MISIntegrationTab    = lazy(() => import('./settings/MISIntegrationTab'))

const SCHOOL_TABS = [
  { id: 'school-profile',    label: 'School Profile',       icon: School },
  { id: 'branding',          label: 'Branding',             icon: Palette },
  { id: 'sports-config',     label: 'Sports Configuration', icon: Dumbbell },
  { id: 'academic-structure',label: 'Academic Structure',   icon: CalendarDays },
  { id: 'staff-directory',   label: 'Staff Directory',      icon: Users },
  { id: 'licence',           label: 'Licence',              icon: FileText },
  { id: 'audit-log',         label: 'Audit Log',            icon: ScrollText },
  { id: 'mis-integration',   label: 'MIS Integration',      icon: Shield },
]

const DEPARTMENT_TABS = [
  { id: 'teams',             label: 'Teams',                icon: Shield },
  { id: 'knowledge-base',    label: 'Knowledge Base',       icon: BookOpen },
  { id: 'fixture-defaults',  label: 'Fixture Defaults',     icon: MapPin },
  { id: 'venues',            label: 'Venues',               icon: MapPin },
]

const PERSONAL_TABS = [
  { id: 'profile',           label: 'Profile',              icon: User },
  { id: 'qualifications',    label: 'Qualifications',       icon: Award },
  { id: 'notifications',     label: 'Notifications',        icon: Bell },
  { id: 'accessibility',     label: 'Accessibility',        icon: Eye },
  { id: 'security',          label: 'Security',             icon: Lock },
  { id: 'calendar-export',   label: 'Calendar Export',      icon: CalendarDays },
]

const TAB_COMPONENTS = {
  'school-profile':    SchoolProfileTab,
  'branding':          BrandingTab,
  'sports-config':     SportsConfigTab,
  'academic-structure':AcademicStructureTab,
  'staff-directory':   StaffDirectoryTab,
  'licence':           LicenceTab,
  'audit-log':         AuditLogTab,
  'teams':             TeamsTab,
  'knowledge-base':    KnowledgeBaseTab,
  'fixture-defaults':  FixtureDefaultsTab,
  'venues':            VenuesTab,
  'mis-integration':   MISIntegrationTab,
  'profile':           PersonalProfileTab,
  'qualifications':    QualificationsTab,
  'notifications':     NotificationsTab,
  'accessibility':     AccessibilityTab,
  'security':          SecurityTab,
  'calendar-export':   CalendarExportTab,
}

function TierHeading({ label }) {
  return (
    <div className="px-3 pt-5 pb-1">
      <span className="text-xs font-semibold tracking-widest uppercase text-amber-400/80">
        {label}
      </span>
    </div>
  )
}

function NavItem({ tab, active, onClick }) {
  const Icon = tab.icon
  return (
    <button
      onClick={() => onClick(tab.id)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
        active
          ? 'bg-pitch-600/20 text-pitch-400 font-medium'
          : 'text-navy-400 hover:text-white hover:bg-navy-800/50'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{tab.label}</span>
      {active && <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0" />}
    </button>
  )
}

export default function TeacherSettings() {
  const { tab: tabParam } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [access, setAccess] = useState(null)
  const [loadingAccess, setLoadingAccess] = useState(true)

  const activeTab = tabParam || 'profile'

  useEffect(() => {
    settingsService.getTiers()
      .then(r => setAccess(r.data))
      .catch(() => setAccess({ tiers: ['personal'], role: 'teacher' }))
      .finally(() => setLoadingAccess(false))
  }, [])

  function setTab(id) {
    navigate(`/teacher/settings/${id}`, { replace: true })
  }

  if (loadingAccess) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-navy-400" />
      </div>
    )
  }

  const showSchool     = access?.tiers?.includes('school')
  const showDepartment = access?.tiers?.includes('department')
  const schoolId       = access?.schoolId

  const ActiveComponent = TAB_COMPONENTS[activeTab] || PersonalProfileTab

  // Build breadcrumb label
  const allTabs = [...SCHOOL_TABS, ...DEPARTMENT_TABS, ...PERSONAL_TABS]
  const tabMeta = allTabs.find(t => t.id === activeTab)
  const tierLabel = SCHOOL_TABS.find(t => t.id === activeTab)
    ? 'School'
    : DEPARTMENT_TABS.find(t => t.id === activeTab)
      ? 'Department'
      : 'Personal'

  return (
    <div className="flex gap-0 min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-navy-800 p-3 sticky top-0 h-screen overflow-y-auto">
        <h1 className="text-sm font-bold text-white px-3 py-2 mb-1">Settings</h1>

        {showSchool && (
          <>
            <TierHeading label="School" />
            {SCHOOL_TABS.map(t => (
              <NavItem key={t.id} tab={t} active={activeTab === t.id} onClick={setTab} />
            ))}
          </>
        )}

        {showDepartment && (
          <>
            <TierHeading label="Department" />
            {DEPARTMENT_TABS.map(t => (
              <NavItem key={t.id} tab={t} active={activeTab === t.id} onClick={setTab} />
            ))}
          </>
        )}

        <TierHeading label="Personal" />
        {PERSONAL_TABS.map(t => (
          <NavItem key={t.id} tab={t} active={activeTab === t.id} onClick={setTab} />
        ))}
      </aside>

      {/* Content */}
      <main className="flex-1 p-6 min-w-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-navy-500 mb-5">
          <span>Settings</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-navy-400">{tierLabel}</span>
          {tabMeta && (
            <>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white">{tabMeta.label}</span>
            </>
          )}
        </div>

        <Suspense fallback={
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-navy-400" />
          </div>
        }>
          <ActiveComponent
            access={access}
            schoolId={schoolId}
            user={user}
          />
        </Suspense>
      </main>
    </div>
  )
}
