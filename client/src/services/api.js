import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'
// Server base URL for static assets (uploads)
// In production VITE_API_URL is like https://xxx.railway.app/api, so strip /api
// In dev it's /api, so SERVER_URL becomes '' and Vite proxy handles /uploads
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || API_URL.replace(/\/api$/, '')

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fam_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for error handling
// Use a flag to prevent multiple simultaneous redirects (especially in PWA)
let isRedirectingToLogin = false
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isRedirectingToLogin) {
      // Don't redirect for auth endpoints - they return 401 for invalid credentials
      // and the UI handles those errors directly
      const url = error.config?.url || ''
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register') ||
        url.includes('/auth/magic-link') || url.includes('/auth/invite') ||
        url.includes('/auth/forgot-password') || url.includes('/auth/reset-password') ||
        url.includes('/guardian-invite/')
      if (!isAuthEndpoint) {
        isRedirectingToLogin = true
        localStorage.removeItem('fam_token')
        // Use a small delay to let any in-flight requests settle before redirecting
        // This prevents multiple rapid redirects in PWA standalone mode
        setTimeout(() => {
          isRedirectingToLogin = false
          window.location.href = '/login'
        }, 100)
      }
    }
    return Promise.reject(error)
  }
)

// Team service
export const teamService = {
  getTeam: (teamId) => api.get(`/teams/${teamId}`),
  updateTeam: (teamId, data) => api.put(`/teams/${teamId}`, data),
  getMembers: (teamId) => api.get(`/teams/${teamId}/members`),
  inviteMember: (teamId, data) => api.post(`/teams/${teamId}/invite`, data),
  getInvites: (teamId) => api.get(`/teams/${teamId}/invites`),
  cancelInvite: (teamId, inviteId) => api.delete(`/teams/${teamId}/invites/${inviteId}`),
  removeMember: (teamId, userId) => api.delete(`/teams/${teamId}/members/${userId}`),

  // Players
  getPlayers: (teamId) => api.get(`/teams/${teamId}/pupils`),
  addPlayer: (teamId, data) => api.post(`/teams/${teamId}/pupils`, data),
  getPlayer: (pupilId) => api.get(`/pupils/${pupilId}`),
  updatePlayer: (pupilId, data) => api.put(`/pupils/${pupilId}`, data),
  deletePlayer: (pupilId) => api.delete(`/pupils/${pupilId}`),

  // Pupil observations
  getObservations: (pupilId) => api.get(`/pupils/${pupilId}/observations`),
  addObservation: (pupilId, data) => api.post(`/pupils/${pupilId}/observations`, data),
  updateObservation: (pupilId, obsId, data) => api.put(`/pupils/${pupilId}/observations/${obsId}`, data),
  deleteObservation: (pupilId, obsId) => api.delete(`/pupils/${pupilId}/observations/${obsId}`),

  // Pupil IDP
  getIDP: (pupilId) => api.get(`/pupils/${pupilId}/idp`),
  generateIDP: (pupilId, options = {}) => api.post(`/pupils/${pupilId}/idp/generate`, options),
  updateIDPSettings: (pupilId, settings) => api.patch(`/pupils/${pupilId}/idp/settings`, settings),

  // Pupil attribute analysis
  analyzeAttributes: (pupilId) => api.post(`/pupils/${pupilId}/attributes/analyze`),

  // Pupil achievements/badges
  getAchievements: (pupilId) => api.get(`/pupils/${pupilId}/achievements`),
  awardAchievement: (pupilId, data) => api.post(`/pupils/${pupilId}/achievements`, data),
  deleteAchievement: (pupilId, achievementId) =>
    api.delete(`/pupils/${pupilId}/achievements/${achievementId}`),
  getBadgeTypes: () => api.get(`/pupils/badge-types`),

  // Pupil parent invites
  inviteParent: (pupilId, email) => api.post(`/pupils/${pupilId}/invite-parent`, { email }),
  getPlayerInvites: (pupilId) => api.get(`/pupils/${pupilId}/invites`),

  // Matches
  getMatches: (teamId) => api.get(`/teams/${teamId}/matches`),
  addMatch: (teamId, data) => api.post(`/teams/${teamId}/matches`, data),
  getMatch: (matchId) => api.get(`/matches/${matchId}`),
  updateMatch: (matchId, data) => api.put(`/matches/${matchId}`, data),
  deleteMatch: (matchId) => api.delete(`/matches/${matchId}`),
  getMatchPrep: (matchId) => api.get(`/matches/${matchId}/prep`),
  generateMatchPrep: (matchId) => api.post(`/matches/${matchId}/prep/generate`),
  getMatchReport: (matchId) => api.get(`/matches/${matchId}/report`),
  generateMatchReport: (matchId) => api.post(`/matches/${matchId}/report/generate`),
  publishMatchReport: (matchId, published = true) => api.post(`/matches/${matchId}/report/publish`, { published }),
  updateMatchReport: (matchId, content) => api.put(`/matches/${matchId}/report`, { content }),

  // Match Goals & Assists
  getMatchGoals: (matchId) => api.get(`/matches/${matchId}/goals`),
  addMatchGoal: (matchId, data) => api.post(`/matches/${matchId}/goals`, data),
  deleteMatchGoal: (matchId, goalId) => api.delete(`/matches/${matchId}/goals/${goalId}`),

  // Match Substitutions
  getMatchSubstitutions: (matchId) => api.get(`/matches/${matchId}/substitutions`),
  addMatchSubstitution: (matchId, data) => api.post(`/matches/${matchId}/substitutions`, data),
  deleteMatchSubstitution: (matchId, subId) => api.delete(`/matches/${matchId}/substitutions/${subId}`),

  // Availability
  getMatchAvailability: (matchId) => api.get(`/matches/${matchId}/availability`),
  updateAvailability: (matchId, data) => api.post(`/matches/${matchId}/availability`, data),
  bulkUpdateAvailability: (matchId, availabilities) =>
    api.post(`/matches/${matchId}/availability/bulk`, { availabilities }),
  requestAvailability: (matchId, deadline, { pendingOnly = false } = {}) =>
    api.post(`/matches/${matchId}/availability/request`, { deadline, pendingOnly }),

  // Squad
  getMatchSquad: (matchId) => api.get(`/matches/${matchId}/squad`),
  updateSquad: (matchId, squad) => api.post(`/matches/${matchId}/squad`, { squad }),
  announceSquad: (matchId, data) => api.post(`/matches/${matchId}/squad/announce`, data),

  // Pupil of the Match
  setPlayerOfMatch: (matchId, pupilId, reason) =>
    api.post(`/matches/${matchId}/pupil-of-match`, { pupil_id: pupilId, reason }),
  getPlayerOfMatchStats: (pupilId) => api.get(`/matches/potm-stats/${pupilId}`),

  // Pre-match pep talk
  getPepTalk: (matchId, pupilId) => api.post(`/matches/${matchId}/pep-talk/${pupilId}`),
}

// League service
export const leagueService = {
  getSettings: (teamId) => api.get(`/league/settings/${teamId}`),
  updateSettings: (teamId, data) => api.post(`/league/settings/${teamId}`, data),
  getTable: (teamId) => api.get(`/league/table/${teamId}`),
  updateTable: (teamId, table) => api.post(`/league/table/${teamId}`, { table }),
  addTeamToTable: (teamId, data) => api.post(`/league/table/${teamId}/team`, data),
  updateTeamInTable: (teamId, teamRecordId, data) =>
    api.put(`/league/table/${teamId}/team/${teamRecordId}`, data),
  removeTeamFromTable: (teamId, teamRecordId) =>
    api.delete(`/league/table/${teamId}/team/${teamRecordId}`),
}

// Notification service
export const notificationService = {
  getNotifications: (limit = 50, unreadOnly = false) =>
    api.get('/notifications', { params: { limit, unread_only: unreadOnly } }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (notificationId) => api.put(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (notificationId) => api.delete(`/notifications/${notificationId}`),
  getVapidKey: () => api.get('/notifications/vapid-key'),
  registerPushSubscription: (subscription) =>
    api.post('/notifications/push-subscription', { subscription }),
  updatePreferences: (preferences) =>
    api.put('/notifications/preferences', { preferences }),
}

// Profile service
export const profileService = {
  getQualifications: () => api.get('/auth/me/qualifications'),
  updateQualifications: (qualifications) => api.put('/auth/me/qualifications', { qualifications }),
}

// Training service
export const trainingService = {
  getSessions: (teamId) => api.get(`/teams/${teamId}/training`),
  getSession: (sessionId) => api.get(`/training/${sessionId}`),
  createSession: (teamId, data) => api.post(`/teams/${teamId}/training`, data),
  updateSession: (teamId, sessionId, data) => api.put(`/teams/${teamId}/training/${sessionId}`, data),
  deleteSession: (sessionId) => api.delete(`/training/${sessionId}`),
  generateSession: (teamId, params) => api.post(`/teams/${teamId}/training/generate`, params),
  generateSummary: (teamId, sessionId) => api.post(`/teams/${teamId}/training/${sessionId}/summary`),
  toggleSharePlan: (teamId, sessionId, share) => api.put(`/teams/${teamId}/training/${sessionId}/share`, { share_plan_with_players: share }),
  getAttendance: (teamId, sessionId) => api.get(`/teams/${teamId}/training/${sessionId}/attendance`),
  saveAttendance: (teamId, sessionId, attendance) => api.put(`/teams/${teamId}/training/${sessionId}/attendance`, { attendance }),
  saveCustomPlan: (teamId, sessionId, customPlan) => api.put(`/teams/${teamId}/training/${sessionId}/custom-plan`, { custom_plan: customPlan }),
  uploadPlanImages: (teamId, sessionId, formData) => api.post(`/teams/${teamId}/training/${sessionId}/images`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deletePlanImage: (teamId, sessionId, imageId) => api.delete(`/teams/${teamId}/training/${sessionId}/images/${imageId}`),
  getAvailability: (teamId, sessionId) => api.get(`/teams/${teamId}/training/${sessionId}/availability`),
  updateAvailability: (teamId, sessionId, data) => api.post(`/teams/${teamId}/training/${sessionId}/availability`, data),
  requestAvailability: (teamId, sessionId, options = {}) => api.post(`/teams/${teamId}/training/${sessionId}/availability/request`, options),
}

// Tactics service
export const tacticsService = {
  getGameModel: (teamId) => api.get(`/teams/${teamId}/tactics/game-model`),
  updateGameModel: (teamId, data) => api.put(`/teams/${teamId}/tactics/game-model`, data),
  getFormations: (teamId) => api.get(`/teams/${teamId}/tactics/formations`),
  saveFormation: (teamId, data) => api.post(`/teams/${teamId}/tactics/formations`, data),
  getPlaybook: (teamId) => api.get(`/teams/${teamId}/tactics/playbook`),
  addPlay: (teamId, data) => api.post(`/teams/${teamId}/tactics/playbook`, data),
  updatePlay: (playId, data) => api.put(`/tactics/plays/${playId}`, data),
  deletePlay: (playId) => api.delete(`/tactics/plays/${playId}`),
}

// Chat service (team/coach AI assistant - "Pep")
export const chatService = {
  getHistory: (teamId, limit = 50) => api.get(`/chat/${teamId}/history`, { params: { limit } }),
  sendMessage: (teamId, message, context = {}) =>
    api.post(`/chat/${teamId}/message`, { message, context }),
  streamMessage: (teamId, message, context = {}) =>
    api.post(`/chat/${teamId}/stream`, { message, context }, { responseType: 'stream' }),
  clearHistory: (teamId) => api.delete(`/chat/${teamId}/history`),
}

// Pupil chat service (pupil/parent AI assistant - "The Gaffer")
export const playerChatService = {
  getHistory: (pupilId, limit = 50) =>
    api.get(`/chat/pupil/${pupilId}/history`, { params: { limit } }),
  sendMessage: (pupilId, message) =>
    api.post(`/chat/pupil/${pupilId}/message`, { message }),
  clearHistory: (pupilId) => api.delete(`/chat/pupil/${pupilId}/history`),
  // Parent control for The Gaffer
  getGafferStatus: (pupilId) => api.get(`/chat/pupil/${pupilId}/gaffer-status`),
  setGafferStatus: (pupilId, disabled) =>
    api.put(`/chat/pupil/${pupilId}/gaffer-status`, { disabled }),
}

// Video service
export const videoService = {
  getVideos: (teamId) => api.get(`/videos/${teamId}`),
  // Mux direct upload: get presigned upload URL
  createUpload: (data) => api.post('/videos/upload', data),
  addVeoLink: (teamId, matchId, veoUrl) =>
    api.post(`/videos/${teamId}/veo`, { matchId, veoUrl }),
  getVideo: (videoId) => api.get(`/videos/video/${videoId}`),
  deleteVideo: (videoId) => api.delete(`/videos/video/${videoId}`),
  updateVideo: (videoId, data) => api.put(`/videos/video/${videoId}`, data),
  analyseVideo: (videoId, data) => api.post(`/videos/video/${videoId}/analyse`, data || {}),
  getAnalysis: (videoId) => api.get(`/videos/video/${videoId}/analysis`),
  cancelAnalysis: (analysisId) => api.post(`/videos/analysis/${analysisId}/cancel`),
  approveAnalysis: (analysisId, options = {}) => api.post(`/videos/analysis/${analysisId}/approve`, options),
  updateAnalysis: (analysisId, data) => api.put(`/videos/analysis/${analysisId}`, data),
  addClip: (videoId, data) => api.post(`/videos/video/${videoId}/clips`, data),
  getClips: (videoId) => api.get(`/videos/video/${videoId}/clips`),
  deleteClip: (clipId) => api.delete(`/videos/clips/${clipId}`),
  tagPlayer: (clipId, data) => api.put(`/videos/clips/${clipId}/tag`, data),
  getPupilClips: (pupilId) => api.get(`/videos/pupil/${pupilId}/clips`),
  assignVideo: (videoId, data) => api.put(`/videos/video/${videoId}/assign`, data),
}

// Film Room (video library) service
export const libraryService = {
  getSections: () => api.get('/video-library/sections'),
  createSection: (data) => api.post('/video-library/sections', data),
  updateSection: (sectionId, data) => api.patch(`/video-library/sections/${sectionId}`, data),
  deleteSection: (sectionId) => api.delete(`/video-library/sections/${sectionId}`),
  getVideos: () => api.get('/video-library/videos'),
  getVideo: (videoId) => api.get(`/video-library/videos/${videoId}`),
  addYouTubeVideo: (data) => api.post('/video-library/videos', data),
  createUpload: (data) => api.post('/video-library/videos/upload', data),
  updateVideo: (videoId, data) => api.patch(`/video-library/videos/${videoId}`, data),
  deleteVideo: (videoId) => api.delete(`/video-library/videos/${videoId}`),
  markWatched: (videoId) => api.post(`/video-library/videos/${videoId}/watched`),
  getWatchers: (videoId) => api.get(`/video-library/videos/${videoId}/watchers`),
  getWatchSummary: () => api.get('/video-library/watch-summary'),
}

// Content service (for pupil lounge)
export const contentService = {
  getContent: (teamId) => api.get(`/teams/${teamId}/content`),
  addContent: (teamId, data) => api.post(`/teams/${teamId}/content`, data),
  updateContent: (contentId, data) => api.put(`/content/${contentId}`, data),
  deleteContent: (contentId) => api.delete(`/content/${contentId}`),
  getPlayerContent: (pupilId) => api.get(`/pupils/${pupilId}/content`),
}

// Pupil zone service (for pupils/parents)
export const playerZoneService = {
  getZoneData: (pupilId) => api.get(`/pupils/${pupilId}/zone`),
  updateAvailability: (pupilId, matchId, data) =>
    api.post(`/pupils/${pupilId}/availability/${matchId}`, data),
  updateTrainingAvailability: (pupilId, sessionId, data) =>
    api.post(`/pupils/${pupilId}/training-availability/${sessionId}`, data),
}

// Document service (team documents)
export const documentService = {
  getDocuments: (teamId) => api.get(`/documents/${teamId}`),
  uploadDocument: (teamId, formData) =>
    api.post(`/documents/${teamId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  updateDocument: (teamId, docId, data) =>
    api.patch(`/documents/${teamId}/documents/${docId}`, data),
  deleteDocument: (teamId, docId) =>
    api.delete(`/documents/${teamId}/documents/${docId}`),
}

// Match media service (parent/pupil uploads)
export const matchMediaService = {
  getMedia: (matchId) => api.get(`/matches/${matchId}/media`),
  uploadMedia: (matchId, formData) =>
    api.post(`/matches/${matchId}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  updateCaption: (matchId, mediaId, caption) =>
    api.patch(`/matches/${matchId}/media/${mediaId}`, { caption }),
  deleteMedia: (matchId, mediaId) =>
    api.delete(`/matches/${matchId}/media/${mediaId}`),
}

// Public chat service (landing page assistant)
export const publicChatService = {
  sendMessage: (message, history = []) =>
    api.post('/chat/public/message', { message, history }),
}

// Help chat service (app guide assistant)
export const helpChatService = {
  sendMessage: (message, history = [], userRole = 'coach') =>
    api.post('/chat/help/message', { message, history, userRole }),
}

// Announcement service (team announcements)
export const announcementService = {
  getAnnouncements: (teamId, limit = 20) =>
    api.get(`/announcements/${teamId}`, { params: { limit } }),
  createAnnouncement: (teamId, data) =>
    api.post(`/announcements/${teamId}`, data),
  updateAnnouncement: (teamId, announcementId, data) =>
    api.put(`/announcements/${teamId}/announcements/${announcementId}`, data),
  deleteAnnouncement: (teamId, announcementId) =>
    api.delete(`/announcements/${teamId}/announcements/${announcementId}`),
}

// Suggestion service (pupil/parent suggestions to coaches)
export const suggestionService = {
  // For coaches - get all team suggestions
  getSuggestions: (teamId, status = null, limit = 50) =>
    api.get(`/suggestions/${teamId}`, { params: { status, limit } }),
  // For pupils/parents - get their own suggestions
  getMySuggestions: (teamId) =>
    api.get(`/suggestions/${teamId}/my-suggestions`),
  // For pupils/parents - submit a suggestion
  createSuggestion: (teamId, data) =>
    api.post(`/suggestions/${teamId}`, data),
  // For coaches - respond to a suggestion
  updateSuggestion: (teamId, suggestionId, data) =>
    api.put(`/suggestions/${teamId}/suggestions/${suggestionId}`, data),
  // Delete a suggestion
  deleteSuggestion: (teamId, suggestionId) =>
    api.delete(`/suggestions/${teamId}/suggestions/${suggestionId}`),
  // Get suggestion stats (coaches only)
  getStats: (teamId) =>
    api.get(`/suggestions/${teamId}/stats`),
}

// Streaming service (RTMP integration)
export const streamingService = {
  getCredentials: (teamId) => api.get(`/streaming/${teamId}/credentials`),
  setup: (teamId, streamName) => api.post(`/streaming/${teamId}/setup`, { streamName }),
  regenerateKey: (teamId) => api.post(`/streaming/${teamId}/regenerate`),
  deleteCredentials: (teamId) => api.delete(`/streaming/${teamId}/credentials`),
  // Guest access management
  updatePin: (teamId, pin) => api.post(`/streaming/${teamId}/pin`, { pin }),
  regenerateShareCode: (teamId) => api.post(`/streaming/${teamId}/regenerate-share-code`),
  // Public endpoints (no auth required)
  getPublicStream: (shareCode) => api.get(`/streaming/watch/${shareCode}`),
  verifyPin: (shareCode, pin) => api.post(`/streaming/watch/${shareCode}`, { pin }),
}

// School service (CRM & school management)
export const clubService = {
  // My schools
  getMyClubs: () => api.get('/schools'),

  // School CRUD
  createClub: (data) => api.post('/schools', data),
  getClub: (schoolId) => api.get(`/schools/${schoolId}`),
  getClubBySlug: (slug) => api.get(`/schools/by-slug/${slug}`),
  updateClub: (schoolId, data) => api.put(`/schools/${schoolId}`, data),
  getDashboard: (schoolId) => api.get(`/schools/${schoolId}/dashboard`),

  // Members
  getMembers: (schoolId) => api.get(`/schools/${schoolId}/members`),
  inviteMember: (schoolId, data) => api.post(`/schools/${schoolId}/members/invite`, data),
  updateMember: (schoolId, memberId, data) => api.put(`/schools/${schoolId}/members/${memberId}`, data),
  removeMember: (schoolId, memberId) => api.delete(`/schools/${schoolId}/members/${memberId}`),

  // Teams
  getTeams: (schoolId) => api.get(`/schools/${schoolId}/teams`),
  createTeam: (schoolId, data) => api.post(`/schools/${schoolId}/teams`, data),
  linkTeam: (schoolId, teamId, data) => api.put(`/schools/${schoolId}/teams/${teamId}`, data),

  // Guardians
  getGuardians: (schoolId, search) => api.get(`/schools/${schoolId}/guardians`, { params: { search } }),
  getGuardian: (schoolId, guardianId) => api.get(`/schools/${schoolId}/guardians/${guardianId}`),
  addGuardian: (schoolId, data) => api.post(`/schools/${schoolId}/guardians`, data),
  updateGuardian: (schoolId, guardianId, data) => api.put(`/schools/${schoolId}/guardians/${guardianId}`, data),
  removeGuardian: (schoolId, guardianId) => api.delete(`/schools/${schoolId}/guardians/${guardianId}`),

  // Players (cross-team)
  getPlayers: (schoolId, params) => api.get(`/schools/${schoolId}/pupils`, { params }),

  // Registration
  getRegistrationInfo: (slug) => api.get(`/schools/by-slug/${slug}/register`),
  submitRegistration: (slug, data) => api.post(`/schools/by-slug/${slug}/register`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getRegistrations: (schoolId, status) => api.get(`/schools/${schoolId}/registrations`, { params: { status } }),
  reviewRegistration: (schoolId, pupilId, status) => api.put(`/schools/${schoolId}/registrations/${pupilId}`, { status }),
}

// School payments service (Stripe Connect + payment plans + subscriptions)
export const clubPaymentService = {
  // Stripe Connect
  startStripeConnect: (schoolId) => api.post(`/school-payments/${schoolId}/stripe/connect`),
  getStripeAccount: (schoolId) => api.get(`/school-payments/${schoolId}/stripe/account`),
  getStripeDashboardLink: (schoolId) => api.post(`/school-payments/${schoolId}/stripe/dashboard-link`),

  // Payment plans
  getPaymentPlans: (schoolId, includeArchived) => api.get(`/school-payments/${schoolId}/payment-plans`, { params: { include_archived: includeArchived } }),
  createPaymentPlan: (schoolId, data) => api.post(`/school-payments/${schoolId}/payment-plans`, data),
  updatePaymentPlan: (schoolId, planId, data) => api.put(`/school-payments/${schoolId}/payment-plans/${planId}`, data),
  archivePaymentPlan: (schoolId, planId) => api.delete(`/school-payments/${schoolId}/payment-plans/${planId}`),

  // Subscriptions
  getSubscriptions: (schoolId, params) => api.get(`/school-payments/${schoolId}/subscriptions`, { params }),
  getOverdueSubscriptions: (schoolId) => api.get(`/school-payments/${schoolId}/subscriptions/overdue`),
  createSubscription: (schoolId, data) => api.post(`/school-payments/${schoolId}/subscriptions`, data),
  bulkAssign: (schoolId, data) => api.post(`/school-payments/${schoolId}/subscriptions/bulk`, data),
  sendReminder: (schoolId, subscriptionId) => api.post(`/school-payments/${schoolId}/subscriptions/${subscriptionId}/remind`),

  // Finance
  getFinanceSummary: (schoolId) => api.get(`/school-payments/${schoolId}/finance/summary`),
  getTransactions: (schoolId, params) => api.get(`/school-payments/${schoolId}/finance/transactions`, { params }),
  exportTransactions: (schoolId) => api.get(`/school-payments/${schoolId}/finance/export`, { responseType: 'blob' }),
  getForecast: (schoolId) => api.get(`/school-payments/${schoolId}/finance/forecast`),

  // Overview
  getPaymentsOverview: (schoolId) => api.get(`/school-payments/${schoolId}/payments/overview`),

  // Portal (public, no auth)
  getPortalInfo: (token) => api.get(`/school-payments/portal/${token}`),
  createPortalPayment: (token) => api.post(`/school-payments/portal/${token}/pay`),
  getPortalHistory: (token) => api.get(`/school-payments/portal/${token}/history`),
}

// School communications service (announcements, bulk email, guardian invites)
export const clubCommsService = {
  // Announcements
  getAnnouncements: (schoolId, params) => api.get(`/school-comms/${schoolId}/announcements`, { params }),
  createAnnouncement: (schoolId, data) => api.post(`/school-comms/${schoolId}/announcements`, data),
  updateAnnouncement: (schoolId, announcementId, data) => api.put(`/school-comms/${schoolId}/announcements/${announcementId}`, data),
  deleteAnnouncement: (schoolId, announcementId) => api.delete(`/school-comms/${schoolId}/announcements/${announcementId}`),

  // Bulk comms
  sendToParents: (schoolId, data) => api.post(`/school-comms/${schoolId}/send-to-parents`, data),
  getCommsLog: (schoolId) => api.get(`/school-comms/${schoolId}/comms-log`),

  // Guardian invites
  inviteGuardian: (schoolId, guardianId) => api.post(`/school-comms/${schoolId}/guardians/${guardianId}/invite`),
  inviteAllGuardians: (schoolId) => api.post(`/school-comms/${schoolId}/guardians/invite-all`),
  getGuardianInvite: (token) => api.get(`/school-comms/guardian-invite/${token}`),
  claimGuardianInvite: (token) => api.post(`/school-comms/guardian-invite/${token}/claim`),
  registerGuardianInvite: (token, data) => api.post(`/school-comms/guardian-invite/${token}/register`, data),
}

// School safeguarding service (compliance, incidents, roles, alerts)
export const clubSafeguardingService = {
  // Compliance overview
  getOverview: (schoolId) => api.get(`/school-safeguarding/${schoolId}/compliance/overview`),

  // Compliance records
  getComplianceRecords: (schoolId) => api.get(`/school-safeguarding/${schoolId}/compliance`),
  getComplianceRecord: (schoolId, recordId) => api.get(`/school-safeguarding/${schoolId}/compliance/${recordId}`),
  createComplianceRecord: (schoolId, data) => api.post(`/school-safeguarding/${schoolId}/compliance`, data),
  updateComplianceRecord: (schoolId, recordId, data) => api.put(`/school-safeguarding/${schoolId}/compliance/${recordId}`, data),
  uploadDocument: (schoolId, recordId, formData) => api.post(`/school-safeguarding/${schoolId}/compliance/${recordId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // Safeguarding roles
  getRoles: (schoolId) => api.get(`/school-safeguarding/${schoolId}/safeguarding/roles`),
  assignRole: (schoolId, data) => api.post(`/school-safeguarding/${schoolId}/safeguarding/roles`, data),
  removeRole: (schoolId, roleId) => api.delete(`/school-safeguarding/${schoolId}/safeguarding/roles/${roleId}`),

  // Incidents
  getIncidents: (schoolId) => api.get(`/school-safeguarding/${schoolId}/safeguarding/incidents`),
  getIncident: (schoolId, incidentId) => api.get(`/school-safeguarding/${schoolId}/safeguarding/incidents/${incidentId}`),
  createIncident: (schoolId, data) => api.post(`/school-safeguarding/${schoolId}/safeguarding/incidents`, data),
  updateIncident: (schoolId, incidentId, data) => api.put(`/school-safeguarding/${schoolId}/safeguarding/incidents/${incidentId}`, data),

  // Compliance alerts
  getAlerts: (schoolId) => api.get(`/school-safeguarding/${schoolId}/compliance/alerts`),
  acknowledgeAlert: (schoolId, alertId, data) => api.put(`/school-safeguarding/${schoolId}/compliance/alerts/${alertId}`, data),
  generateAlerts: (schoolId) => api.post(`/school-safeguarding/${schoolId}/compliance/alerts/generate`),
}

// School events service (camps, tournaments, availability)
export const clubEventsService = {
  // Events CRUD
  getEvents: (schoolId, params) => api.get(`/school-events/${schoolId}/events`, { params }),
  createEvent: (schoolId, data) => api.post(`/school-events/${schoolId}/events`, data),
  getEvent: (schoolId, eventId) => api.get(`/school-events/${schoolId}/events/${eventId}`),
  updateEvent: (schoolId, eventId, data) => api.put(`/school-events/${schoolId}/events/${eventId}`, data),
  cancelEvent: (schoolId, eventId) => api.delete(`/school-events/${schoolId}/events/${eventId}`),
  getRegistrations: (schoolId, eventId) => api.get(`/school-events/${schoolId}/events/${eventId}/registrations`),
  exportRegistrations: (schoolId, eventId) => api.get(`/school-events/${schoolId}/events/${eventId}/export`, { responseType: 'blob' }),
  updateAttendance: (schoolId, eventId, data) => api.put(`/school-events/${schoolId}/events/${eventId}/attendance`, data),

  // Public event (no auth)
  getPublicEvent: (eventId) => api.get(`/school-events/public/${eventId}`),
  registerForEvent: (eventId, data) => api.post(`/school-events/public/${eventId}/register`, data),
}

// Schedule & availability service
export const scheduleService = {
  getSchedule: (teamId, params) => api.get(`/teams/${teamId}/schedule`, { params }),
  createSession: (teamId, data) => api.post(`/teams/${teamId}/schedule`, data),
  updateSession: (teamId, sessionId, data) => api.put(`/teams/${teamId}/schedule/${sessionId}`, data),
  cancelSession: (teamId, sessionId) => api.delete(`/teams/${teamId}/schedule/${sessionId}`),
  getAvailability: (teamId, sessionId) => api.get(`/teams/${teamId}/schedule/${sessionId}/availability`),
  submitAvailability: (teamId, sessionId, data) => api.post(`/teams/${teamId}/schedule/${sessionId}/availability`, data),
  updateAttendance: (teamId, sessionId, data) => api.put(`/teams/${teamId}/schedule/${sessionId}/attendance`, data),
  getClubAttendanceStats: (schoolId) => api.get(`/teams/schools/${schoolId}/attendance/stats`),
}

// School AI intelligence service
export const clubIntelligenceService = {
  // Match reports
  generateMatchReport: (schoolId, matchId) => api.post(`/school-intelligence/${schoolId}/matches/${matchId}/generate-report`),
  updateMatchReport: (schoolId, matchId, data) => api.put(`/school-intelligence/${schoolId}/matches/${matchId}/report`, data),
  sendMatchReport: (schoolId, matchId) => api.post(`/school-intelligence/${schoolId}/matches/${matchId}/report/send`),

  // Insights
  getInsights: (schoolId, params) => api.get(`/school-intelligence/${schoolId}/insights`, { params }),
  getTeamInsights: (schoolId, teamId) => api.get(`/school-intelligence/${schoolId}/teams/${teamId}/insights`),
  markInsight: (schoolId, insightId, data) => api.put(`/school-intelligence/${schoolId}/insights/${insightId}`, data),

  // Season report
  generateSeasonSummary: (schoolId) => api.post(`/school-intelligence/${schoolId}/reports/season-summary`),
  getLatestSeasonSummary: (schoolId) => api.get(`/school-intelligence/${schoolId}/reports/season-summary/latest`),

  // Grant helper
  generateGrantDraft: (schoolId, data) => api.post(`/school-intelligence/${schoolId}/grants/draft`, data),
  getGrantDrafts: (schoolId) => api.get(`/school-intelligence/${schoolId}/grants/drafts`),
  updateGrantDraft: (schoolId, draftId, data) => api.put(`/school-intelligence/${schoolId}/grants/drafts/${draftId}`, data),

  // Compliance analysis
  runComplianceAnalysis: (schoolId) => api.post(`/school-intelligence/${schoolId}/compliance/ai-analysis`),
  getLatestComplianceAnalysis: (schoolId) => api.get(`/school-intelligence/${schoolId}/compliance/ai-analysis/latest`),

  // Coach development
  getCoachSuggestions: (schoolId, userId) => api.get(`/school-intelligence/${schoolId}/coaches/${userId}/development-suggestions`),
}

// Gift Aid service
export const giftAidService = {
  // School charity settings (admin)
  getCharitySettings: (schoolId) => api.get(`/gift-aid/${schoolId}/charity-settings`),
  updateCharitySettings: (schoolId, data) => api.put(`/gift-aid/${schoolId}/charity-settings`, data),

  // Parent declarations
  getDeclaration: (schoolId) => api.get(`/gift-aid/${schoolId}/declaration`),
  saveDeclaration: (schoolId, data) => api.post(`/gift-aid/${schoolId}/declaration`, data),
  getMyDeclarations: () => api.get('/gift-aid/my-declarations'),

  // Receipts
  getMyReceipts: () => api.get('/gift-aid/my-receipts'),
  downloadReceipt: (receiptId) => api.get(`/gift-aid/receipts/${receiptId}/pdf`, { responseType: 'arraybuffer' }),

  // School dashboard
  getDashboard: (schoolId, taxYear) => api.get(`/gift-aid/${schoolId}/dashboard`, { params: { tax_year: taxYear } }),

  // Exports
  exportHMRC: (schoolId, taxYear) => api.get(`/gift-aid/${schoolId}/export/hmrc`, { params: { tax_year: taxYear }, responseType: 'blob' }),
  exportAudit: (schoolId, taxYear) => api.get(`/gift-aid/${schoolId}/export/audit`, { params: { tax_year: taxYear }, responseType: 'blob' }),
}

// Parent portal service (authenticated parent dashboard)
export const parentService = {
  getDashboard: () => api.get('/parent/dashboard'),
  getChildren: () => api.get('/parent/children'),
  getPayments: () => api.get('/parent/payments'),
  getAnnouncements: () => api.get('/parent/announcements'),
  getChildSchedule: (pupilId) => api.get(`/parent/children/${pupilId}/schedule`),
  updateNotificationPreferences: (preferences) => api.put('/parent/notification-preferences', { preferences }),
}

// Blog service
export const blogService = {
  // Public
  getPosts: (params) => api.get('/blog/posts', { params }),
  getPostBySlug: (slug) => api.get(`/blog/posts/slug/${slug}`),
  // Admin
  getAdminPosts: () => api.get('/blog/admin/posts'),
  getAdminPost: (id) => api.get(`/blog/admin/posts/${id}`),
  createPost: (data) => api.post('/blog/admin/posts', data),
  updatePost: (id, data) => api.put(`/blog/admin/posts/${id}`, data),
  deletePost: (id) => api.delete(`/blog/admin/posts/${id}`),
  generatePost: (data) => api.post('/blog/admin/generate', data),
  generateImagePrompt: (data) => api.post('/blog/admin/generate-image-prompt', data),
  uploadImage: (file) => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post('/blog/admin/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
}

// Season Development service
export const seasonDevelopmentService = {
  getDashboard: (teamId, params) => api.get(`/teams/${teamId}/season-development`, { params }),
  getPlayerSnapshots: (teamId, pupilId) => api.get(`/teams/${teamId}/pupils/${pupilId}/snapshots`),
  generateSeasonReview: (teamId, data) => api.post(`/teams/${teamId}/season-review`, data),
}

export const knowledgeBaseService = {
  getDocuments: (teamId) => api.get(`/knowledge-base/${teamId}`),
  getStats: (teamId) => api.get(`/knowledge-base/${teamId}/stats`),
  getDocument: (teamId, docId) => api.get(`/knowledge-base/${teamId}/${docId}`),
  addText: (teamId, data) => api.post(`/knowledge-base/${teamId}/text`, data),
  uploadFile: (teamId, formData) => api.post(`/knowledge-base/${teamId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  search: (teamId, query) => api.post(`/knowledge-base/${teamId}/search`, query),
  deleteDocument: (teamId, docId) => api.delete(`/knowledge-base/${teamId}/${docId}`),
}

// Teacher Hub cross-team service (extra-curricular)
export const teacherService = {
  getMyTeams: () => api.get('/teams/mine'),
  getMyFixtures: () => api.get('/teams/mine/fixtures'),
  getMySessions: () => api.get('/teams/mine/sessions'),
}

// Teaching Groups service (curriculum PE classes)
export const teachingGroupService = {
  list: () => api.get('/teaching-groups'),
  get: (id) => api.get(`/teaching-groups/${id}`),
  create: (data) => api.post('/teaching-groups', data),
  update: (id, data) => api.put(`/teaching-groups/${id}`, data),
  remove: (id) => api.delete(`/teaching-groups/${id}`),
  addPupils: (id, pupilIds) => api.post(`/teaching-groups/${id}/pupils`, { pupil_ids: pupilIds }),
  removePupil: (id, pupilId) => api.delete(`/teaching-groups/${id}/pupils/${pupilId}`),
  addUnit: (id, data) => api.post(`/teaching-groups/${id}/units`, data),
  updateUnit: (id, unitId, data) => api.put(`/teaching-groups/${id}/units/${unitId}`, data),
  removeUnit: (id, unitId) => api.delete(`/teaching-groups/${id}/units/${unitId}`),
}

// Assessment service (curriculum PE assessment)
export const assessmentService = {
  getStrands: (keyStage) => api.get('/assessments/strands', { params: { key_stage: keyStage } }),
  getCriteria: (strandId, sport) => api.get(`/assessments/criteria/${strandId}`, { params: { sport } }),
  getUnitAssessments: (unitId) => api.get(`/assessments/unit/${unitId}`),
  record: (data) => api.post('/assessments', data),
  recordBatch: (assessments) => api.post('/assessments/batch', { assessments }),
  update: (id, data) => api.put(`/assessments/${id}`, data),
  getPupilAssessments: (pupilId) => api.get(`/assessments/pupil/${pupilId}`),
  getDashboard: () => api.get('/assessments/dashboard'),
}

// Head of Department service (whole-school views)
export const hodService = {
  check: () => api.get('/hod/check'),
  getOverview: () => api.get('/hod/overview'),
  getTeachers: () => api.get('/hod/teachers'),
  getTeams: (sport) => api.get('/hod/teams', { params: { sport } }),
  getClasses: () => api.get('/hod/classes'),
  assignTeacherSport: (userId, sport, role) => api.post(`/hod/teachers/${userId}/sports`, { sport, role }),
  removeTeacherSport: (userId, sport) => api.delete(`/hod/teachers/${userId}/sports/${sport}`),
}

// Sport Knowledge Base service
export const sportKnowledgeService = {
  list: (params) => api.get('/sport-knowledge', { params }),
  getSports: () => api.get('/sport-knowledge/sports'),
  create: (data) => api.post('/sport-knowledge', data),
  update: (id, data) => api.put(`/sport-knowledge/${id}`, data),
  remove: (id) => api.delete(`/sport-knowledge/${id}`),
  getForAI: (sport, schoolId) => api.get(`/sport-knowledge/for-ai/${sport}`, { params: { school_id: schoolId } }),
}

export default api
