import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { usePageTracking } from './hooks/useAnalytics'
import ErrorBoundary from './components/common/ErrorBoundary'

// Page tracker component
function PageTracker() {
  usePageTracking()
  return null
}

// Loading fallback for lazy-loaded routes
function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--mb-navy, #0F1E3D)' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '2px solid rgba(201, 169, 97, 0.2)',
        borderTopColor: 'var(--mb-gold, #C9A961)',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  )
}

// Layout - eagerly loaded since it wraps most routes
import AppLayout from './components/common/AppLayout'

// Landing page - eagerly loaded for fast initial page load
import Landing from './pages/Landing'

// Lazy-loaded pages - only loaded when the route is visited
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Chat = lazy(() => import('./pages/Chat'))
const Tactics = lazy(() => import('./pages/Tactics'))
const Training = lazy(() => import('./pages/Training'))
const Pupils = lazy(() => import('./pages/Pupils'))
const PupilDetail = lazy(() => import('./pages/PupilDetail'))
const PupilAssistant = lazy(() => import('./pages/PupilAssistant'))
const Matches = lazy(() => import('./pages/Matches'))
const MatchDetail = lazy(() => import('./pages/MatchDetail'))
const LeagueTable = lazy(() => import('./pages/LeagueTable'))
const VideoAnalysis = lazy(() => import('./pages/VideoAnalysis'))
const VideoLibrary = lazy(() => import('./pages/VideoLibrary'))
const TeacherLounge = lazy(() => import('./pages/TeacherLounge'))
const FilmRoom = lazy(() => import('./pages/FilmRoom'))
const PupilLounge = lazy(() => import('./pages/PupilLounge'))
const Settings = lazy(() => import('./pages/Settings'))
const InviteAccept = lazy(() => import('./pages/InviteAccept'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const MagicLinkVerify = lazy(() => import('./pages/MagicLinkVerify'))
const Terms = lazy(() => import('./pages/Terms'))
const Admin = lazy(() => import('./pages/Admin'))
const About = lazy(() => import('./pages/About'))
const RequestDemoAccess = lazy(() => import('./pages/RequestDemoAccess'))
const WatchStream = lazy(() => import('./pages/WatchStream'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const EnterpriseBilling = lazy(() => import('./pages/EnterpriseBilling'))
const SSOCallback = lazy(() => import('./pages/SSOCallback'))

// School pages
const SchoolLayout = lazy(() => import('./pages/school/SchoolLayout'))
const SchoolDashboard = lazy(() => import('./pages/school/SchoolDashboard'))
const SchoolTeams = lazy(() => import('./pages/school/SchoolTeams'))
const SchoolPlayers = lazy(() => import('./pages/school/SchoolPlayers'))
const SchoolMembers = lazy(() => import('./pages/school/SchoolMembers'))
const SchoolSettings = lazy(() => import('./pages/school/SchoolSettings'))
const SchoolBilling = lazy(() => import('./pages/school/SchoolBilling'))
const SchoolSubscriptions = lazy(() => import('./pages/school/SchoolSubscriptions'))
const SchoolAnnouncements = lazy(() => import('./pages/school/SchoolAnnouncements'))
const CreateSchool = lazy(() => import('./pages/school/CreateSchool'))
const SchoolSafeguarding = lazy(() => import('./pages/school/SchoolSafeguarding'))
const SchoolSafeguardingPeople = lazy(() => import('./pages/school/SchoolSafeguardingPeople'))
const SchoolSafeguardingRoles = lazy(() => import('./pages/school/SchoolSafeguardingRoles'))
const SchoolSafeguardingIncidents = lazy(() => import('./pages/school/SchoolSafeguardingIncidents'))
const SchoolEvents = lazy(() => import('./pages/school/SchoolEvents'))
const SchoolSchedule = lazy(() => import('./pages/school/SchoolSchedule'))
const SchoolInsights = lazy(() => import('./pages/school/SchoolInsights'))
const SchoolReports = lazy(() => import('./pages/school/SchoolReports'))
const SeasonDevelopment = lazy(() => import('./pages/SeasonDevelopment'))

// Teacher Hub pages
const TeacherLayout = lazy(() => import('./pages/teacher/TeacherLayout'))
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'))
const TeacherClasses = lazy(() => import('./pages/teacher/TeacherClasses'))
const TeacherLessons = lazy(() => import('./pages/teacher/TeacherLessons'))
const TeacherAssessment = lazy(() => import('./pages/teacher/TeacherAssessment'))
const TeacherReports = lazy(() => import('./pages/teacher/TeacherReports'))
const TeacherCurriculum = lazy(() => import('./pages/teacher/TeacherCurriculum'))
const TeacherTeams = lazy(() => import('./pages/teacher/TeacherTeams'))
const TeacherTeamDetail = lazy(() => import('./pages/teacher/TeacherTeamDetail'))
const TeacherFixtures = lazy(() => import('./pages/teacher/TeacherFixtures'))
const TeacherSessions = lazy(() => import('./pages/teacher/TeacherSessions'))
const TeacherDevelopment = lazy(() => import('./pages/teacher/TeacherDevelopment'))
const TeacherClassDetail = lazy(() => import('./pages/teacher/TeacherClassDetail'))

// Head of Department pages
const HoDOverview = lazy(() => import('./pages/teacher/HoDOverview'))
const HoDTeachers = lazy(() => import('./pages/teacher/HoDTeachers'))
const HoDTeams = lazy(() => import('./pages/teacher/HoDTeams'))
const HoDClasses = lazy(() => import('./pages/teacher/HoDClasses'))
const HoDPupils = lazy(() => import('./pages/teacher/HoDPupils'))
const HoDPupilProfile = lazy(() => import('./pages/teacher/HoDPupilProfile'))
const HoDReporting = lazy(() => import('./pages/teacher/HoDReporting'))
const TeacherSafeguarding = lazy(() => import('./pages/teacher/TeacherSafeguarding'))
const VoiceObservationReview = lazy(() => import('./pages/teacher/VoiceObservationReview'))
const VoiceSafeguardingReview = lazy(() => import('./pages/teacher/VoiceSafeguardingReview'))
const HoDVoiceSettings = lazy(() => import('./pages/teacher/HoDVoiceSettings'))
const GDPRDashboard = lazy(() => import('./pages/teacher/GDPRDashboard'))
const HoDSSOSettings = lazy(() => import('./pages/teacher/HoDSSOSettings'))
const HoDTestPersonas = lazy(() => import('./pages/teacher/HoDTestPersonas'))
const TeacherSettings = lazy(() => import('./pages/teacher/TeacherSettings'))

// Pupil Portal pages
const PupilLayout = lazy(() => import('./pages/pupil/PupilLayout'))
const PupilSports = lazy(() => import('./pages/pupil/PupilSports'))
const PupilWeek = lazy(() => import('./pages/pupil/PupilWeek'))
const PupilDevelopmentPage = lazy(() => import('./pages/pupil/PupilDevelopment'))
const PupilTrainingPage = lazy(() => import('./pages/pupil/PupilTraining'))
const PupilClipsPage = lazy(() => import('./pages/pupil/PupilClipsPage'))
const PupilAssistantPage = lazy(() => import('./pages/pupil/PupilAssistantPage'))
const PupilAchievements = lazy(() => import('./pages/pupil/PupilAchievements'))

// Protected route wrapper
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading, impersonating } = useAuth()

  if (loading) {
    return <PageLoader />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Allow impersonating users through role gates (HoD viewing as pupil)
  if (impersonating) {
    return children
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    if (user.role === 'player') {
      return <Navigate to="/pupil" replace />
    }
    return <Navigate to="/teacher" replace />
  }

  return children
}

// Public route wrapper (redirect if logged in)
function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <PageLoader />
  }

  if (user) {
    if (user.role === 'player') {
      return <Navigate to="/pupil" replace />
    }
    return <Navigate to="/teacher" replace />
  }

  return children
}

// Catch-all redirect component
function CatchAllRedirect() {
  const { user, loading } = useAuth()

  if (loading) {
    return <PageLoader />
  }

  if (user) {
    if (user.role === 'player') {
      return <Navigate to="/pupil" replace />
    }
    return <Navigate to="/teacher" replace />
  }

  return <Navigate to="/" replace />
}

export default function App() {
  return (
    <>
      <PageTracker />
      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />
        <Route path="/invite/:token" element={<InviteAccept />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/magic/:token" element={<MagicLinkVerify />} />
        <Route path="/sso-callback" element={<SSOCallback />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/about" element={<About />} />
        <Route path="/request-demo" element={<RequestDemoAccess />} />
        <Route path="/watch/:shareCode" element={<WatchStream />} />

        {/* Enterprise billing (MoonBoots staff only) */}
        <Route path="/enterprise-billing" element={<EnterpriseBilling />} />

        {/* Onboarding wizard */}
        <Route path="/onboarding" element={
          <ProtectedRoute allowedRoles={['manager', 'assistant', 'scout']}>
            <Onboarding />
          </ProtectedRoute>
        } />

        {/* Protected route - Create school (must be above /school/:slug to avoid conflict) */}
        <Route path="/school/create" element={
          <ProtectedRoute allowedRoles={['manager', 'assistant', 'scout']}>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<CreateSchool />} />
        </Route>

        {/* Protected routes - School management */}
        <Route path="/school/:slug" element={
          <ProtectedRoute allowedRoles={['manager', 'assistant', 'scout']}>
            <SchoolLayout />
          </ProtectedRoute>
        }>
          <Route index element={<SchoolDashboard />} />
          <Route path="teams" element={<SchoolTeams />} />
          <Route path="pupils" element={<SchoolPlayers />} />
          <Route path="members" element={<SchoolMembers />} />
          <Route path="subscriptions" element={<SchoolSubscriptions />} />
          <Route path="announcements" element={<SchoolAnnouncements />} />
          <Route path="billing" element={<SchoolBilling />} />
          <Route path="settings" element={<SchoolSettings />} />
          <Route path="safeguarding" element={<SchoolSafeguarding />} />
          <Route path="safeguarding/people" element={<SchoolSafeguardingPeople />} />
          <Route path="safeguarding/roles" element={<SchoolSafeguardingRoles />} />
          <Route path="safeguarding/incidents" element={<SchoolSafeguardingIncidents />} />
          <Route path="events" element={<SchoolEvents />} />
          <Route path="schedule" element={<SchoolSchedule />} />
          <Route path="insights" element={<SchoolInsights />} />
          <Route path="reports" element={<SchoolReports />} />
        </Route>

        {/* Protected routes - Teachers */}
        <Route path="/" element={
          <ProtectedRoute allowedRoles={['manager', 'assistant', 'scout']}>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="chat" element={<Chat />} />
          <Route path="tactics" element={<Tactics />} />
          <Route path="training" element={<Training />} />
          <Route path="pupils" element={<Pupils />} />
          <Route path="pupils/:id" element={<PupilDetail />} />
          <Route path="pupils/:pupilId/assistant" element={<PupilAssistant />} />
          <Route path="matches" element={<Matches />} />
          <Route path="matches/:id" element={<MatchDetail />} />
          <Route path="matches/:id/analysis" element={<VideoAnalysis />} />
          <Route path="videos/:videoId/analysis" element={<VideoAnalysis />} />
          <Route path="videos" element={<VideoLibrary />} />
          <Route path="film-room" element={<FilmRoom />} />
          <Route path="fixtures" element={<Navigate to="/matches" replace />} />
          <Route path="league" element={<LeagueTable />} />
          <Route path="season-development" element={<SeasonDevelopment />} />
          <Route path="lounge" element={<TeacherLounge />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin" element={<Admin />} />
        </Route>

        {/* Teacher Hub */}
        <Route path="/teacher" element={
          <ProtectedRoute allowedRoles={['manager', 'assistant', 'scout']}>
            <TeacherLayout />
          </ProtectedRoute>
        }>
          <Route index element={<TeacherDashboard />} />
          <Route path="classes" element={<TeacherClasses />} />
          <Route path="classes/:id" element={<TeacherClassDetail />} />
          <Route path="lessons" element={<TeacherLessons />} />
          <Route path="assessment" element={<TeacherAssessment />} />
          <Route path="reports" element={<TeacherReports />} />
          <Route path="curriculum" element={<TeacherCurriculum />} />
          <Route path="teams" element={<TeacherTeams />} />
          <Route path="teams/:teamId" element={<TeacherTeamDetail />} />
          <Route path="fixtures" element={<TeacherFixtures />} />
          <Route path="sessions" element={<TeacherSessions />} />
          <Route path="development" element={<TeacherDevelopment />} />
          <Route path="tactics" element={<Tactics />} />
          <Route path="video" element={<VideoLibrary />} />
          <Route path="film-room" element={<FilmRoom />} />
          <Route path="assistant" element={<Chat />} />
          <Route path="safeguarding" element={<TeacherSafeguarding />} />
          <Route path="settings" element={<Settings />} />
          <Route path="hod" element={<HoDOverview />} />
          <Route path="hod/teachers" element={<HoDTeachers />} />
          <Route path="hod/teams" element={<HoDTeams />} />
          <Route path="hod/classes" element={<HoDClasses />} />
          <Route path="hod/pupils" element={<HoDPupils />} />
          <Route path="hod/pupils/:id" element={<HoDPupilProfile />} />
          <Route path="hod/reporting" element={<HoDReporting />} />
          <Route path="voice-review/:audioSourceId" element={<VoiceObservationReview />} />
          <Route path="hod/voice-safeguarding" element={<VoiceSafeguardingReview />} />
          <Route path="hod/voice-settings" element={<HoDVoiceSettings />} />
          <Route path="hod/gdpr" element={<GDPRDashboard />} />
          <Route path="hod/sso-settings" element={<HoDSSOSettings />} />
          <Route path="hod/test-personas" element={<HoDTestPersonas />} />
          {/* Three-tier settings */}
          <Route path="settings" element={<Navigate to="/teacher/settings/profile" replace />} />
          <Route path="settings/:tab" element={<TeacherSettings />} />
        </Route>

        {/* Pupil Portal */}
        <Route path="/pupil" element={
          <ProtectedRoute allowedRoles={['player']}>
            <PupilLayout />
          </ProtectedRoute>
        }>
          <Route index element={<PupilSports />} />
          <Route path="week" element={<PupilWeek />} />
          <Route path="development" element={<PupilDevelopmentPage />} />
          <Route path="training" element={<PupilTrainingPage />} />
          <Route path="clips" element={<PupilClipsPage />} />
          <Route path="assistant" element={<PupilAssistantPage />} />
          <Route path="achievements" element={<PupilAchievements />} />
        </Route>

        {/* Legacy redirects */}
        <Route path="/pupil-lounge" element={<Navigate to="/pupil" replace />} />
        <Route path="/player-lounge" element={<Navigate to="/pupil" replace />} />
        <Route path="/dashboard" element={<Navigate to="/teacher" replace />} />
        {/* Old Settings tab redirects */}
        <Route path="/settings/profile"      element={<Navigate to="/teacher/settings/profile" replace />} />
        <Route path="/settings/team"         element={<Navigate to="/teacher/settings/teams" replace />} />
        <Route path="/settings/branding"     element={<Navigate to="/teacher/settings/branding" replace />} />
        <Route path="/settings/billing"      element={<Navigate to="/teacher/settings/licence" replace />} />
        <Route path="/settings/invites"      element={<Navigate to="/teacher/settings/staff-directory" replace />} />
        <Route path="/settings/qualifications" element={<Navigate to="/teacher/settings/qualifications" replace />} />
        <Route path="/settings/knowledge-base" element={<Navigate to="/teacher/settings/knowledge-base" replace />} />
        <Route path="/settings/tactics"      element={<Navigate to="/teacher/teams" replace />} />
        <Route path="/settings/streaming"    element={<Navigate to="/teacher/settings" replace />} />
        <Route path="/settings"              element={<Navigate to="/teacher/settings/profile" replace />} />

        {/* Catch all - redirect based on auth status */}
        <Route path="*" element={<CatchAllRedirect />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
    </>
  )
}
