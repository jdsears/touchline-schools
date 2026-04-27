import {
  Calendar, Sparkles, Search, Building2, UserCog, Users, Shield,
  GraduationCap, Mic, BarChart3, ClipboardCheck, ShieldCheck,
  LayoutDashboard, BookOpen, Target, Trophy, Timer, Swords,
  Video, MonitorPlay, FileBarChart, Lock, Key, Settings2,
  ChevronDown, ChevronRight, LogOut,
} from 'lucide-react'

const ICON_MAP = {
  calendar: Calendar, aiAssist: Sparkles, search: Search,
  schoolOverview: Building2, teachersAdmin: UserCog, pupils: Users,
  teamsShield: Shield, classes: GraduationCap, voiceObs: Mic,
  reports: BarChart3, assessment: ClipboardCheck, safeguard: ShieldCheck,
  dashboard: LayoutDashboard, training: BookOpen, target: Target,
  fixtures: Trophy, sessions: Timer, pupilDev: Users,
  tactics: Swords, film: MonitorPlay, videos: Video,
  consent: ShieldCheck, privacy: Lock, key: Key, voiceCfg: Settings2,
}

export const CROSS_ROLE_TOP = [
  { id: 'today', icon: 'calendar', label: 'Today', href: '' },
  { id: 'ai-assistant', icon: 'aiAssist', label: 'AI Assistant', badge: 'AI', href: '/assistant' },
  { id: 'search', icon: 'search', label: 'Search', href: '/search' },
]

export const ROLE_DEFS = {
  schoolAdmin: {
    label: 'School Admin',
    daily: [
      { id: 'school-overview', icon: 'schoolOverview', label: 'School Overview', href: '/hod' },
      { id: 'teachers', icon: 'teachersAdmin', label: 'Teachers', href: '/hod/teachers', emptyHint: 'Add teachers' },
      { id: 'pupils', icon: 'pupils', label: 'Pupils', href: '/hod/pupils', emptyHint: 'Import pupils' },
      { id: 'all-teams', icon: 'teamsShield', label: 'All Teams', href: '/hod/teams' },
      { id: 'all-classes', icon: 'classes', label: 'All Classes', href: '/hod/classes' },
      { id: 'voice-obs', icon: 'voiceObs', label: 'Voice Observations', href: '/hod/voice-safeguarding' },
      { id: 'reporting', icon: 'reports', label: 'Reporting', href: '/hod/reporting' },
      { id: 'assessment-overview', icon: 'assessment', label: 'Assessment Overview', href: '/hod/assessment-overview' },
    ],
    more: [
      { id: 'safeguarding', icon: 'safeguard', label: 'Safeguarding', href: '/safeguarding' },
    ],
  },
  hod: {
    label: 'Head of Department',
    daily: [
      { id: 'school-overview', icon: 'schoolOverview', label: 'School Overview', href: '/hod' },
      { id: 'teachers', icon: 'teachersAdmin', label: 'Teachers', href: '/hod/teachers' },
      { id: 'all-teams', icon: 'teamsShield', label: 'All Teams', href: '/hod/teams' },
      { id: 'all-classes', icon: 'classes', label: 'All Classes', href: '/hod/classes' },
      { id: 'voice-obs', icon: 'voiceObs', label: 'Voice Observations', href: '/hod/voice-safeguarding' },
      { id: 'reporting', icon: 'reports', label: 'Reporting', href: '/hod/reporting' },
    ],
    more: [
      { id: 'pupils', icon: 'pupils', label: 'Pupils', href: '/hod/pupils' },
      { id: 'assessment-overview', icon: 'assessment', label: 'Assessment Overview', href: '/hod/assessment-overview' },
    ],
  },
  teacherCurriculum: {
    label: 'Curriculum PE',
    daily: [
      { id: 'dashboard-c', icon: 'dashboard', label: 'Dashboard', href: '' },
      { id: 'my-classes', icon: 'classes', label: 'My Classes', href: '/classes', emptyHint: 'No classes assigned' },
      { id: 'lesson-planning', icon: 'training', label: 'Lesson Planning', href: '/lessons' },
      { id: 'assessment', icon: 'assessment', label: 'Assessment', href: '/assessment' },
      { id: 'curriculum-overview', icon: 'target', label: 'Curriculum Overview', href: '/curriculum' },
    ],
    more: [
      { id: 'reports-c', icon: 'reports', label: 'Reports', href: '/reports' },
    ],
  },
  teacherExtraCurricular: {
    label: 'Extra-Curricular',
    daily: [
      { id: 'my-teams', icon: 'teamsShield', label: 'My Teams', href: '/teams' },
      { id: 'fixtures', icon: 'fixtures', label: 'Fixtures & Results', href: '/fixtures' },
      { id: 'session-plan', icon: 'sessions', label: 'Session Planning', href: '/sessions' },
      { id: 'pupil-dev', icon: 'pupilDev', label: 'Pupil Development', href: '/development' },
      { id: 'film-room', icon: 'film', label: 'Film Room', href: '/film-room' },
    ],
    more: [
      { id: 'tactics', icon: 'tactics', label: 'Tactics Board', href: '/tactics' },
      { id: 'video-library', icon: 'videos', label: 'Video Library', href: '/video' },
    ],
  },
}

export const SETTINGS_GROUP = [
  { id: 'consent', icon: 'consent', label: 'Parental Consent', href: '/hod/consent' },
  { id: 'privacy', icon: 'privacy', label: 'Data & Privacy', href: '/hod/gdpr' },
  { id: 'sso', icon: 'key', label: 'SSO Settings', href: '/hod/sso-settings' },
  { id: 'voice-cfg', icon: 'voiceCfg', label: 'Voice Settings', href: '/hod/voice-settings' },
]

const ROLE_ORDER = ['schoolAdmin', 'hod', 'teacherCurriculum', 'teacherExtraCurricular']

export function buildVisibleRoles(roles) {
  const ordered = ROLE_ORDER.filter(r => roles.includes(r))
  const folded = ordered.includes('schoolAdmin')
    ? ordered.filter(r => r !== 'hod')
    : ordered
  const seen = new Set()
  return folded.map(roleId => {
    const role = ROLE_DEFS[roleId]
    const filterIds = (list) => list.filter(it => {
      if (seen.has(it.id)) return false
      seen.add(it.id)
      return true
    })
    return { id: roleId, label: role.label, daily: filterIds(role.daily), more: filterIds(role.more || []) }
  })
}

export function getIcon(name) {
  return ICON_MAP[name] || Settings2
}
