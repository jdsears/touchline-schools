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
  getPlayers: (teamId) => api.get(`/teams/${teamId}/players`),
  addPlayer: (teamId, data) => api.post(`/teams/${teamId}/players`, data),
  getPlayer: (playerId) => api.get(`/players/${playerId}`),
  updatePlayer: (playerId, data) => api.put(`/players/${playerId}`, data),
  deletePlayer: (playerId) => api.delete(`/players/${playerId}`),

  // Player observations
  getObservations: (playerId) => api.get(`/players/${playerId}/observations`),
  addObservation: (playerId, data) => api.post(`/players/${playerId}/observations`, data),
  updateObservation: (playerId, obsId, data) => api.put(`/players/${playerId}/observations/${obsId}`, data),
  deleteObservation: (playerId, obsId) => api.delete(`/players/${playerId}/observations/${obsId}`),

  // Player IDP
  getIDP: (playerId) => api.get(`/players/${playerId}/idp`),
  generateIDP: (playerId, options = {}) => api.post(`/players/${playerId}/idp/generate`, options),
  updateIDPSettings: (playerId, settings) => api.patch(`/players/${playerId}/idp/settings`, settings),

  // Player attribute analysis
  analyzeAttributes: (playerId) => api.post(`/players/${playerId}/attributes/analyze`),

  // Player achievements/badges
  getAchievements: (playerId) => api.get(`/players/${playerId}/achievements`),
  awardAchievement: (playerId, data) => api.post(`/players/${playerId}/achievements`, data),
  deleteAchievement: (playerId, achievementId) =>
    api.delete(`/players/${playerId}/achievements/${achievementId}`),
  getBadgeTypes: () => api.get(`/players/badge-types`),

  // Player parent invites
  inviteParent: (playerId, email) => api.post(`/players/${playerId}/invite-parent`, { email }),
  getPlayerInvites: (playerId) => api.get(`/players/${playerId}/invites`),

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

  // Player of the Match
  setPlayerOfMatch: (matchId, playerId, reason) =>
    api.post(`/matches/${matchId}/player-of-match`, { player_id: playerId, reason }),
  getPlayerOfMatchStats: (playerId) => api.get(`/matches/potm-stats/${playerId}`),

  // Pre-match pep talk
  getPepTalk: (matchId, playerId) => api.post(`/matches/${matchId}/pep-talk/${playerId}`),
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

// Player chat service (player/parent AI assistant - "The Gaffer")
export const playerChatService = {
  getHistory: (playerId, limit = 50) =>
    api.get(`/chat/player/${playerId}/history`, { params: { limit } }),
  sendMessage: (playerId, message) =>
    api.post(`/chat/player/${playerId}/message`, { message }),
  clearHistory: (playerId) => api.delete(`/chat/player/${playerId}/history`),
  // Parent control for The Gaffer
  getGafferStatus: (playerId) => api.get(`/chat/player/${playerId}/gaffer-status`),
  setGafferStatus: (playerId, disabled) =>
    api.put(`/chat/player/${playerId}/gaffer-status`, { disabled }),
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
  getPlayerClips: (playerId) => api.get(`/videos/player/${playerId}/clips`),
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

// Content service (for player lounge)
export const contentService = {
  getContent: (teamId) => api.get(`/teams/${teamId}/content`),
  addContent: (teamId, data) => api.post(`/teams/${teamId}/content`, data),
  updateContent: (contentId, data) => api.put(`/content/${contentId}`, data),
  deleteContent: (contentId) => api.delete(`/content/${contentId}`),
  getPlayerContent: (playerId) => api.get(`/players/${playerId}/content`),
}

// Player zone service (for players/parents)
export const playerZoneService = {
  getZoneData: (playerId) => api.get(`/players/${playerId}/zone`),
  updateAvailability: (playerId, matchId, data) =>
    api.post(`/players/${playerId}/availability/${matchId}`, data),
  updateTrainingAvailability: (playerId, sessionId, data) =>
    api.post(`/players/${playerId}/training-availability/${sessionId}`, data),
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

// Match media service (parent/player uploads)
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

// Suggestion service (player/parent suggestions to coaches)
export const suggestionService = {
  // For coaches - get all team suggestions
  getSuggestions: (teamId, status = null, limit = 50) =>
    api.get(`/suggestions/${teamId}`, { params: { status, limit } }),
  // For players/parents - get their own suggestions
  getMySuggestions: (teamId) =>
    api.get(`/suggestions/${teamId}/my-suggestions`),
  // For players/parents - submit a suggestion
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

// Club service (CRM & club management)
export const clubService = {
  // My clubs
  getMyClubs: () => api.get('/clubs'),

  // Club CRUD
  createClub: (data) => api.post('/clubs', data),
  getClub: (clubId) => api.get(`/clubs/${clubId}`),
  getClubBySlug: (slug) => api.get(`/clubs/by-slug/${slug}`),
  updateClub: (clubId, data) => api.put(`/clubs/${clubId}`, data),
  getDashboard: (clubId) => api.get(`/clubs/${clubId}/dashboard`),

  // Members
  getMembers: (clubId) => api.get(`/clubs/${clubId}/members`),
  inviteMember: (clubId, data) => api.post(`/clubs/${clubId}/members/invite`, data),
  updateMember: (clubId, memberId, data) => api.put(`/clubs/${clubId}/members/${memberId}`, data),
  removeMember: (clubId, memberId) => api.delete(`/clubs/${clubId}/members/${memberId}`),

  // Teams
  getTeams: (clubId) => api.get(`/clubs/${clubId}/teams`),
  createTeam: (clubId, data) => api.post(`/clubs/${clubId}/teams`, data),
  linkTeam: (clubId, teamId, data) => api.put(`/clubs/${clubId}/teams/${teamId}`, data),

  // Guardians
  getGuardians: (clubId, search) => api.get(`/clubs/${clubId}/guardians`, { params: { search } }),
  getGuardian: (clubId, guardianId) => api.get(`/clubs/${clubId}/guardians/${guardianId}`),
  addGuardian: (clubId, data) => api.post(`/clubs/${clubId}/guardians`, data),
  updateGuardian: (clubId, guardianId, data) => api.put(`/clubs/${clubId}/guardians/${guardianId}`, data),
  removeGuardian: (clubId, guardianId) => api.delete(`/clubs/${clubId}/guardians/${guardianId}`),

  // Players (cross-team)
  getPlayers: (clubId, params) => api.get(`/clubs/${clubId}/players`, { params }),

  // Registration
  getRegistrationInfo: (slug) => api.get(`/clubs/by-slug/${slug}/register`),
  submitRegistration: (slug, data) => api.post(`/clubs/by-slug/${slug}/register`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getRegistrations: (clubId, status) => api.get(`/clubs/${clubId}/registrations`, { params: { status } }),
  reviewRegistration: (clubId, playerId, status) => api.put(`/clubs/${clubId}/registrations/${playerId}`, { status }),
}

// Club payments service (Stripe Connect + payment plans + subscriptions)
export const clubPaymentService = {
  // Stripe Connect
  startStripeConnect: (clubId) => api.post(`/club-payments/${clubId}/stripe/connect`),
  getStripeAccount: (clubId) => api.get(`/club-payments/${clubId}/stripe/account`),
  getStripeDashboardLink: (clubId) => api.post(`/club-payments/${clubId}/stripe/dashboard-link`),

  // Payment plans
  getPaymentPlans: (clubId, includeArchived) => api.get(`/club-payments/${clubId}/payment-plans`, { params: { include_archived: includeArchived } }),
  createPaymentPlan: (clubId, data) => api.post(`/club-payments/${clubId}/payment-plans`, data),
  updatePaymentPlan: (clubId, planId, data) => api.put(`/club-payments/${clubId}/payment-plans/${planId}`, data),
  archivePaymentPlan: (clubId, planId) => api.delete(`/club-payments/${clubId}/payment-plans/${planId}`),

  // Subscriptions
  getSubscriptions: (clubId, params) => api.get(`/club-payments/${clubId}/subscriptions`, { params }),
  getOverdueSubscriptions: (clubId) => api.get(`/club-payments/${clubId}/subscriptions/overdue`),
  createSubscription: (clubId, data) => api.post(`/club-payments/${clubId}/subscriptions`, data),
  bulkAssign: (clubId, data) => api.post(`/club-payments/${clubId}/subscriptions/bulk`, data),
  sendReminder: (clubId, subscriptionId) => api.post(`/club-payments/${clubId}/subscriptions/${subscriptionId}/remind`),

  // Finance
  getFinanceSummary: (clubId) => api.get(`/club-payments/${clubId}/finance/summary`),
  getTransactions: (clubId, params) => api.get(`/club-payments/${clubId}/finance/transactions`, { params }),
  exportTransactions: (clubId) => api.get(`/club-payments/${clubId}/finance/export`, { responseType: 'blob' }),
  getForecast: (clubId) => api.get(`/club-payments/${clubId}/finance/forecast`),

  // Overview
  getPaymentsOverview: (clubId) => api.get(`/club-payments/${clubId}/payments/overview`),

  // Portal (public, no auth)
  getPortalInfo: (token) => api.get(`/club-payments/portal/${token}`),
  createPortalPayment: (token) => api.post(`/club-payments/portal/${token}/pay`),
  getPortalHistory: (token) => api.get(`/club-payments/portal/${token}/history`),
}

// Club communications service (announcements, bulk email, guardian invites)
export const clubCommsService = {
  // Announcements
  getAnnouncements: (clubId, params) => api.get(`/club-comms/${clubId}/announcements`, { params }),
  createAnnouncement: (clubId, data) => api.post(`/club-comms/${clubId}/announcements`, data),
  updateAnnouncement: (clubId, announcementId, data) => api.put(`/club-comms/${clubId}/announcements/${announcementId}`, data),
  deleteAnnouncement: (clubId, announcementId) => api.delete(`/club-comms/${clubId}/announcements/${announcementId}`),

  // Bulk comms
  sendToParents: (clubId, data) => api.post(`/club-comms/${clubId}/send-to-parents`, data),
  getCommsLog: (clubId) => api.get(`/club-comms/${clubId}/comms-log`),

  // Guardian invites
  inviteGuardian: (clubId, guardianId) => api.post(`/club-comms/${clubId}/guardians/${guardianId}/invite`),
  inviteAllGuardians: (clubId) => api.post(`/club-comms/${clubId}/guardians/invite-all`),
  getGuardianInvite: (token) => api.get(`/club-comms/guardian-invite/${token}`),
  claimGuardianInvite: (token) => api.post(`/club-comms/guardian-invite/${token}/claim`),
  registerGuardianInvite: (token, data) => api.post(`/club-comms/guardian-invite/${token}/register`, data),
}

// Club safeguarding service (compliance, incidents, roles, alerts)
export const clubSafeguardingService = {
  // Compliance overview
  getOverview: (clubId) => api.get(`/club-safeguarding/${clubId}/compliance/overview`),

  // Compliance records
  getComplianceRecords: (clubId) => api.get(`/club-safeguarding/${clubId}/compliance`),
  getComplianceRecord: (clubId, recordId) => api.get(`/club-safeguarding/${clubId}/compliance/${recordId}`),
  createComplianceRecord: (clubId, data) => api.post(`/club-safeguarding/${clubId}/compliance`, data),
  updateComplianceRecord: (clubId, recordId, data) => api.put(`/club-safeguarding/${clubId}/compliance/${recordId}`, data),
  uploadDocument: (clubId, recordId, formData) => api.post(`/club-safeguarding/${clubId}/compliance/${recordId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // Safeguarding roles
  getRoles: (clubId) => api.get(`/club-safeguarding/${clubId}/safeguarding/roles`),
  assignRole: (clubId, data) => api.post(`/club-safeguarding/${clubId}/safeguarding/roles`, data),
  removeRole: (clubId, roleId) => api.delete(`/club-safeguarding/${clubId}/safeguarding/roles/${roleId}`),

  // Incidents
  getIncidents: (clubId) => api.get(`/club-safeguarding/${clubId}/safeguarding/incidents`),
  getIncident: (clubId, incidentId) => api.get(`/club-safeguarding/${clubId}/safeguarding/incidents/${incidentId}`),
  createIncident: (clubId, data) => api.post(`/club-safeguarding/${clubId}/safeguarding/incidents`, data),
  updateIncident: (clubId, incidentId, data) => api.put(`/club-safeguarding/${clubId}/safeguarding/incidents/${incidentId}`, data),

  // Compliance alerts
  getAlerts: (clubId) => api.get(`/club-safeguarding/${clubId}/compliance/alerts`),
  acknowledgeAlert: (clubId, alertId, data) => api.put(`/club-safeguarding/${clubId}/compliance/alerts/${alertId}`, data),
  generateAlerts: (clubId) => api.post(`/club-safeguarding/${clubId}/compliance/alerts/generate`),
}

// Club events service (camps, tournaments, availability)
export const clubEventsService = {
  // Events CRUD
  getEvents: (clubId, params) => api.get(`/club-events/${clubId}/events`, { params }),
  createEvent: (clubId, data) => api.post(`/club-events/${clubId}/events`, data),
  getEvent: (clubId, eventId) => api.get(`/club-events/${clubId}/events/${eventId}`),
  updateEvent: (clubId, eventId, data) => api.put(`/club-events/${clubId}/events/${eventId}`, data),
  cancelEvent: (clubId, eventId) => api.delete(`/club-events/${clubId}/events/${eventId}`),
  getRegistrations: (clubId, eventId) => api.get(`/club-events/${clubId}/events/${eventId}/registrations`),
  exportRegistrations: (clubId, eventId) => api.get(`/club-events/${clubId}/events/${eventId}/export`, { responseType: 'blob' }),
  updateAttendance: (clubId, eventId, data) => api.put(`/club-events/${clubId}/events/${eventId}/attendance`, data),

  // Public event (no auth)
  getPublicEvent: (eventId) => api.get(`/club-events/public/${eventId}`),
  registerForEvent: (eventId, data) => api.post(`/club-events/public/${eventId}/register`, data),
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
  getClubAttendanceStats: (clubId) => api.get(`/teams/clubs/${clubId}/attendance/stats`),
}

// Club AI intelligence service
export const clubIntelligenceService = {
  // Match reports
  generateMatchReport: (clubId, matchId) => api.post(`/club-intelligence/${clubId}/matches/${matchId}/generate-report`),
  updateMatchReport: (clubId, matchId, data) => api.put(`/club-intelligence/${clubId}/matches/${matchId}/report`, data),
  sendMatchReport: (clubId, matchId) => api.post(`/club-intelligence/${clubId}/matches/${matchId}/report/send`),

  // Insights
  getInsights: (clubId, params) => api.get(`/club-intelligence/${clubId}/insights`, { params }),
  getTeamInsights: (clubId, teamId) => api.get(`/club-intelligence/${clubId}/teams/${teamId}/insights`),
  markInsight: (clubId, insightId, data) => api.put(`/club-intelligence/${clubId}/insights/${insightId}`, data),

  // Season report
  generateSeasonSummary: (clubId) => api.post(`/club-intelligence/${clubId}/reports/season-summary`),
  getLatestSeasonSummary: (clubId) => api.get(`/club-intelligence/${clubId}/reports/season-summary/latest`),

  // Grant helper
  generateGrantDraft: (clubId, data) => api.post(`/club-intelligence/${clubId}/grants/draft`, data),
  getGrantDrafts: (clubId) => api.get(`/club-intelligence/${clubId}/grants/drafts`),
  updateGrantDraft: (clubId, draftId, data) => api.put(`/club-intelligence/${clubId}/grants/drafts/${draftId}`, data),

  // Compliance analysis
  runComplianceAnalysis: (clubId) => api.post(`/club-intelligence/${clubId}/compliance/ai-analysis`),
  getLatestComplianceAnalysis: (clubId) => api.get(`/club-intelligence/${clubId}/compliance/ai-analysis/latest`),

  // Coach development
  getCoachSuggestions: (clubId, userId) => api.get(`/club-intelligence/${clubId}/coaches/${userId}/development-suggestions`),
}

// Gift Aid service
export const giftAidService = {
  // Club charity settings (admin)
  getCharitySettings: (clubId) => api.get(`/gift-aid/${clubId}/charity-settings`),
  updateCharitySettings: (clubId, data) => api.put(`/gift-aid/${clubId}/charity-settings`, data),

  // Parent declarations
  getDeclaration: (clubId) => api.get(`/gift-aid/${clubId}/declaration`),
  saveDeclaration: (clubId, data) => api.post(`/gift-aid/${clubId}/declaration`, data),
  getMyDeclarations: () => api.get('/gift-aid/my-declarations'),

  // Receipts
  getMyReceipts: () => api.get('/gift-aid/my-receipts'),
  downloadReceipt: (receiptId) => api.get(`/gift-aid/receipts/${receiptId}/pdf`, { responseType: 'arraybuffer' }),

  // Club dashboard
  getDashboard: (clubId, taxYear) => api.get(`/gift-aid/${clubId}/dashboard`, { params: { tax_year: taxYear } }),

  // Exports
  exportHMRC: (clubId, taxYear) => api.get(`/gift-aid/${clubId}/export/hmrc`, { params: { tax_year: taxYear }, responseType: 'blob' }),
  exportAudit: (clubId, taxYear) => api.get(`/gift-aid/${clubId}/export/audit`, { params: { tax_year: taxYear }, responseType: 'blob' }),
}

// Parent portal service (authenticated parent dashboard)
export const parentService = {
  getDashboard: () => api.get('/parent/dashboard'),
  getChildren: () => api.get('/parent/children'),
  getPayments: () => api.get('/parent/payments'),
  getAnnouncements: () => api.get('/parent/announcements'),
  getChildSchedule: (playerId) => api.get(`/parent/children/${playerId}/schedule`),
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
  getPlayerSnapshots: (teamId, playerId) => api.get(`/teams/${teamId}/players/${playerId}/snapshots`),
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

export default api
