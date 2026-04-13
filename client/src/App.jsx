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
    <div className="min-h-screen flex items-center justify-center">
      <div className="spinner w-8 h-8" />
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
const Players = lazy(() => import('./pages/Players'))
const PlayerDetail = lazy(() => import('./pages/PlayerDetail'))
const PlayerAssistant = lazy(() => import('./pages/PlayerAssistant'))
const Matches = lazy(() => import('./pages/Matches'))
const MatchDetail = lazy(() => import('./pages/MatchDetail'))
const LeagueTable = lazy(() => import('./pages/LeagueTable'))
const VideoAnalysis = lazy(() => import('./pages/VideoAnalysis'))
const VideoLibrary = lazy(() => import('./pages/VideoLibrary'))
const CoachLounge = lazy(() => import('./pages/CoachLounge'))
const FilmRoom = lazy(() => import('./pages/FilmRoom'))
const PlayerLounge = lazy(() => import('./pages/PlayerLounge'))
const Settings = lazy(() => import('./pages/Settings'))
const InviteAccept = lazy(() => import('./pages/InviteAccept'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const MagicLinkVerify = lazy(() => import('./pages/MagicLinkVerify'))
const Terms = lazy(() => import('./pages/Terms'))
const Admin = lazy(() => import('./pages/Admin'))
const Blog = lazy(() => import('./pages/Blog'))
const BlogPost = lazy(() => import('./pages/BlogPost'))
const GrassrootsCoaching = lazy(() => import('./pages/GrassrootsCoaching'))
const YouthCoaches = lazy(() => import('./pages/YouthCoaches'))
const TrainingPlans = lazy(() => import('./pages/TrainingPlans'))
const FeaturePage = lazy(() => import('./pages/features/FeaturePage'))
const WatchStream = lazy(() => import('./pages/WatchStream'))

// Club pages
const ClubLayout = lazy(() => import('./pages/club/ClubLayout'))
const ClubDashboard = lazy(() => import('./pages/club/ClubDashboard'))
const ClubTeams = lazy(() => import('./pages/club/ClubTeams'))
const ClubPlayers = lazy(() => import('./pages/club/ClubPlayers'))
const ClubMembers = lazy(() => import('./pages/club/ClubMembers'))
const ClubSettings = lazy(() => import('./pages/club/ClubSettings'))
const ClubBilling = lazy(() => import('./pages/club/ClubBilling'))
const ClubSubscriptions = lazy(() => import('./pages/club/ClubSubscriptions'))
const ClubAnnouncements = lazy(() => import('./pages/club/ClubAnnouncements'))
const CreateClub = lazy(() => import('./pages/club/CreateClub'))
const ClubSafeguarding = lazy(() => import('./pages/club/ClubSafeguarding'))
const ClubSafeguardingPeople = lazy(() => import('./pages/club/ClubSafeguardingPeople'))
const ClubSafeguardingRoles = lazy(() => import('./pages/club/ClubSafeguardingRoles'))
const ClubSafeguardingIncidents = lazy(() => import('./pages/club/ClubSafeguardingIncidents'))
const ClubEvents = lazy(() => import('./pages/club/ClubEvents'))
const ClubSchedule = lazy(() => import('./pages/club/ClubSchedule'))
const ClubInsights = lazy(() => import('./pages/club/ClubInsights'))
const ClubReports = lazy(() => import('./pages/club/ClubReports'))
const SeasonDevelopment = lazy(() => import('./pages/SeasonDevelopment'))


// Protected route wrapper
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <PageLoader />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    if (user.role === 'player' || user.role === 'parent') {
      return <Navigate to="/player-lounge" replace />
    }
    return <Navigate to="/dashboard" replace />
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
    if (user.role === 'player' || user.role === 'parent') {
      return <Navigate to="/player-lounge" replace />
    }
    return <Navigate to="/dashboard" replace />
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
    if (user.role === 'player' || user.role === 'parent') {
      return <Navigate to="/player-lounge" replace />
    }
    return <Navigate to="/dashboard" replace />
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
        <Route path="/terms" element={<Terms />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/grassroots-football-coaching" element={<GrassrootsCoaching />} />
        <Route path="/youth-football-coaches" element={<YouthCoaches />} />
        <Route path="/football-training-plans" element={<TrainingPlans />} />
        <Route path="/features/:slug" element={<FeaturePage />} />
        <Route path="/watch/:shareCode" element={<WatchStream />} />


        {/* Protected route - Create club (must be above /club/:slug to avoid conflict) */}
        <Route path="/club/create" element={
          <ProtectedRoute allowedRoles={['manager', 'assistant', 'scout']}>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<CreateClub />} />
        </Route>

        {/* Protected routes - Club management */}
        <Route path="/club/:slug" element={
          <ProtectedRoute allowedRoles={['manager', 'assistant', 'scout']}>
            <ClubLayout />
          </ProtectedRoute>
        }>
          <Route index element={<ClubDashboard />} />
          <Route path="teams" element={<ClubTeams />} />
          <Route path="players" element={<ClubPlayers />} />
          <Route path="members" element={<ClubMembers />} />
          <Route path="subscriptions" element={<ClubSubscriptions />} />
          <Route path="announcements" element={<ClubAnnouncements />} />
          <Route path="billing" element={<ClubBilling />} />
          <Route path="settings" element={<ClubSettings />} />
          <Route path="safeguarding" element={<ClubSafeguarding />} />
          <Route path="safeguarding/people" element={<ClubSafeguardingPeople />} />
          <Route path="safeguarding/roles" element={<ClubSafeguardingRoles />} />
          <Route path="safeguarding/incidents" element={<ClubSafeguardingIncidents />} />
          <Route path="events" element={<ClubEvents />} />
          <Route path="schedule" element={<ClubSchedule />} />
          <Route path="insights" element={<ClubInsights />} />
          <Route path="reports" element={<ClubReports />} />
        </Route>

        {/* Protected routes - Coaches */}
        <Route path="/" element={
          <ProtectedRoute allowedRoles={['manager', 'assistant', 'scout']}>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="chat" element={<Chat />} />
          <Route path="tactics" element={<Tactics />} />
          <Route path="training" element={<Training />} />
          <Route path="players" element={<Players />} />
          <Route path="players/:id" element={<PlayerDetail />} />
          <Route path="players/:playerId/assistant" element={<PlayerAssistant />} />
          <Route path="matches" element={<Matches />} />
          <Route path="matches/:id" element={<MatchDetail />} />
          <Route path="matches/:id/analysis" element={<VideoAnalysis />} />
          <Route path="videos/:videoId/analysis" element={<VideoAnalysis />} />
          <Route path="videos" element={<VideoLibrary />} />
          <Route path="film-room" element={<FilmRoom />} />
          <Route path="fixtures" element={<Navigate to="/matches" replace />} />
          <Route path="league" element={<LeagueTable />} />
          <Route path="season-development" element={<SeasonDevelopment />} />
          <Route path="lounge" element={<CoachLounge />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin" element={<Admin />} />
        </Route>

        {/* Protected routes - Players/Parents */}
        <Route path="/player-lounge" element={
          <ProtectedRoute allowedRoles={['player', 'parent']}>
            <PlayerLounge />
          </ProtectedRoute>
        } />


        {/* Catch all - redirect based on auth status */}
        <Route path="*" element={<CatchAllRedirect />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
    </>
  )
}
