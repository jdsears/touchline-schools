/**
 * SSO Callback Page
 *
 * The OAuth provider redirects the browser to /sso-callback?token=...&redirect=...
 * after a successful sign-in. This page picks up the token, stores it, and
 * redirects to the appropriate area.
 *
 * On error, it shows a friendly message and links back to /login.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Shield, AlertTriangle, Loader2 } from 'lucide-react'

export default function SSOCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = searchParams.get('token')
    const redirect = searchParams.get('redirect') || '/teacher'
    const errorParam = searchParams.get('error')
    const detail = searchParams.get('detail')

    if (errorParam) {
      const messages = {
        sso_denied: 'You declined the sign-in request. Please try again.',
        sso_failed: detail || 'SSO authentication failed. Your email may not be registered with this school.',
        sso_init_failed: 'Could not connect to the identity provider. Please try again.',
        sso_missing_params: 'The SSO response was incomplete. Please try again.',
      }
      setError(messages[errorParam] || detail || 'An unknown SSO error occurred.')
      return
    }

    if (!token) {
      setError('No authentication token received. Please try signing in again.')
      return
    }

    // Store the token
    localStorage.setItem('fam_token', token)

    // Refresh the AuthContext so the app knows the user is logged in
    refreshUser().then(() => {
      navigate(redirect, { replace: true })
    }).catch(() => {
      // Even if refresh fails, try the redirect (the token is stored)
      navigate(redirect, { replace: true })
    })
  }, [searchParams, navigate, refreshUser])

  if (error) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-navy-900 rounded-2xl border border-alert-600/30 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-alert-600/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-alert-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Sign-in failed</h1>
          <p className="text-navy-400 text-sm mb-6">{error}</p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-pitch-600 hover:bg-pitch-700 text-white rounded-xl font-medium text-sm transition-colors"
          >
            Back to sign in
          </a>
          <p className="text-xs text-navy-600 mt-6">
            If you continue to have problems, ask your school IT admin to check the SSO configuration
            or invite you directly via email.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-pitch-600/10 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-7 h-7 text-pitch-400" />
        </div>
        <Loader2 className="w-6 h-6 text-pitch-400 animate-spin mx-auto mb-3" />
        <p className="text-navy-400 text-sm">Completing sign-in…</p>
      </div>
    </div>
  )
}
