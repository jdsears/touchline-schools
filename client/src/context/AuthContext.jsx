import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { authService } from '../services/auth'
import { notificationService } from '../services/api'
import toast from 'react-hot-toast'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    checkAuth()
  }, [])
  
  async function checkAuth() {
    try {
      const token = localStorage.getItem('fam_token')
      if (!token) {
        setLoading(false)
        return
      }

      // Safety timeout - if /auth/me doesn't respond within 10s, stop loading
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth check timed out')), 10000)
      )
      const response = await Promise.race([authService.me(), timeout])
      setUser(response.data.user)

      // Silent token refresh: if the server issued a fresh token, save it
      if (response.data.token) {
        localStorage.setItem('fam_token', response.data.token)
      }
    } catch (error) {
      localStorage.removeItem('fam_token')
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }
  
  async function login(email, password) {
    try {
      const response = await authService.login(email, password)
      localStorage.setItem('fam_token', response.data.token)
      setUser(response.data.user)
      toast.success('Welcome back!')
      return { success: true, user: response.data.user }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }
  
  async function register(data) {
    try {
      const response = await authService.register(data)
      localStorage.setItem('fam_token', response.data.token)
      setUser(response.data.user)
      toast.success('Account created successfully!')
      return { success: true, school: response.data.school || null }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }
  
  async function logout() {
    localStorage.removeItem('fam_token')
    setUser(null)
    toast.success('Logged out successfully')
  }
  
  async function sendMagicLink(email) {
    try {
      await authService.sendMagicLink(email)
      toast.success('Magic link sent! Check your email.')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send magic link'
      toast.error(message)
      return { success: false, error: message }
    }
  }
  
  async function verifyMagicLink(token) {
    try {
      const response = await authService.verifyMagicLink(token)
      localStorage.setItem('fam_token', response.data.token)
      setUser(response.data.user)
      toast.success('Logged in successfully!')
      return { success: true, user: response.data.user }
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid or expired link'
      toast.error(message)
      return { success: false, error: message }
    }
  }
  
  async function acceptInvite(token, password) {
    try {
      const response = await authService.acceptInvite(token, password)
      localStorage.setItem('fam_token', response.data.token)
      setUser(response.data.user)
      toast.success('Welcome to the team!')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to accept invite'
      toast.error(message)
      return { success: false, error: message }
    }
  }
  
  // Register for push notifications when user is logged in
  useEffect(() => {
    if (!user) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    async function subscribeToPush() {
      try {
        const { data } = await notificationService.getVapidKey()
        if (!data.key) return

        const registration = await navigator.serviceWorker.ready
        const existing = await registration.pushManager.getSubscription()
        if (existing) {
          // Already subscribed, just make sure server knows
          await notificationService.registerPushSubscription(existing)
          return
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.key),
        })
        await notificationService.registerPushSubscription(subscription)
      } catch (err) {
        // User denied permission or something else - don't block the app
        console.log('Push subscription failed:', err.message)
      }
    }
    subscribeToPush()
  }, [user])

  // Computed access properties
  const isAdmin = user?.is_admin || false
  const hasFullAccess = user?.hasFullAccess || false
  const subscriptionStatus = user?.subscriptionStatus || 'none'

  const value = useMemo(() => ({
    user,
    setUser,
    loading,
    login,
    register,
    logout,
    sendMagicLink,
    verifyMagicLink,
    acceptInvite,
    refreshUser: checkAuth,
    isAdmin,
    hasFullAccess,
    subscriptionStatus,
  }), [user, loading, isAdmin, hasFullAccess, subscriptionStatus])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
