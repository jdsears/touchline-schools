import api from './api'

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  sendMagicLink: (email) => api.post('/auth/magic-link', { email }),
  verifyMagicLink: (token) => api.post('/auth/magic-link/verify', { token }),
  acceptInvite: (token, password) => api.post('/auth/invite/accept', { token, password }),
  getInvite: (token) => api.get(`/auth/invite/${token}`),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (currentPassword, newPassword) =>
    api.put('/auth/password', { currentPassword, newPassword }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  completeOnboarding: () => api.patch('/auth/me/onboarding'),
}
