import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { clubCommsService } from '../services/api'
import {
  Building2, CheckCircle, XCircle, Clock, LogIn,
  UserPlus, Shield, Lock, User, Loader2, Mail,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function GuardianInvite() {
  const { token } = useParams()
  const { user, loading: authLoading, setUser: setAuthUser } = useAuth()
  const navigate = useNavigate()
  const [invite, setInvite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [registerForm, setRegisterForm] = useState({ name: '', password: '', confirmPassword: '' })
  const [registering, setRegistering] = useState(false)
  const [registerError, setRegisterError] = useState(null)

  useEffect(() => {
    loadInvite()
  }, [token])

  // Pre-fill name from invite data
  useEffect(() => {
    if (invite?.guardian_name && !registerForm.name) {
      setRegisterForm(prev => ({ ...prev, name: invite.guardian_name }))
    }
  }, [invite])

  async function loadInvite() {
    try {
      const res = await clubCommsService.getGuardianInvite(token)
      setInvite(res.data)
    } catch (err) {
      setInvite({ status: 'error', message: err.response?.data?.error || 'Invite not found' })
    } finally {
      setLoading(false)
    }
  }

  async function handleClaim() {
    if (!user) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/guardian-invite/${token}`)
      return
    }

    setClaiming(true)
    try {
      await clubCommsService.claimGuardianInvite(token)
      toast.success('Account linked successfully!')
      navigate('/player-lounge', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to link account')
    } finally {
      setClaiming(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setRegisterError(null)

    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterError('Passwords do not match')
      return
    }

    if (registerForm.password.length < 8) {
      setRegisterError('Password must be at least 8 characters')
      return
    }

    setRegistering(true)
    try {
      const res = await clubCommsService.registerGuardianInvite(token, {
        name: registerForm.name,
        password: registerForm.password,
      })

      // Store the JWT and set the user in auth context
      localStorage.setItem('fam_token', res.data.token)
      if (setAuthUser) {
        setAuthUser(res.data.user)
      }

      toast.success(`Welcome! Your account has been linked to ${res.data.club_name}`)
      navigate('/player-lounge', { replace: true })
    } catch (err) {
      setRegisterError(err.response?.data?.error || 'Registration failed')
    } finally {
      setRegistering(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  if (!invite || invite.status === 'error') {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <XCircle className="w-12 h-12 text-alert-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Invite Not Found</h1>
          <p className="text-navy-400 mb-4">{invite?.message || 'This invite link is invalid or has expired.'}</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="px-6 py-2.5 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  if (invite.status === 'expired') {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Clock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Invite Expired</h1>
          <p className="text-navy-400 mb-4">This invite link has expired. Please ask {invite.club_name} to send you a new one.</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="px-6 py-2.5 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  if (invite.status === 'already_claimed' || invite.status === 'already_linked') {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-12 h-12 text-pitch-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Already Connected</h1>
          <p className="text-navy-400 mb-4">Your account is already linked to {invite.club_name}.</p>
          <button
            onClick={() => navigate('/player-lounge')}
            className="px-6 py-2.5 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors"
          >
            Go to Parent Portal
          </button>
        </div>
      </div>
    )
  }

  // Valid invite
  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Club branding */}
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-xl mx-auto flex items-center justify-center text-white font-bold text-2xl mb-3"
            style={{ backgroundColor: invite.club_color || '#1a365d' }}
          >
            {invite.club_name?.charAt(0)}
          </div>
          <h1 className="text-xl font-bold text-white">{invite.club_name}</h1>
          <p className="text-sm text-navy-400 mt-1">Parent Account Invitation</p>
        </div>

        {/* Invite card */}
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 space-y-4">
          <div className="text-center">
            <p className="text-navy-300">
              Hello <span className="text-white font-medium">{invite.guardian_name}</span>,
            </p>
            <p className="text-navy-400 text-sm mt-2">
              {invite.club_name} has invited you to create a parent account on Touchline.
              You'll be able to:
            </p>
          </div>

          <div className="space-y-2">
            {[
              'View your children\'s match schedules and training',
              'Receive club announcements and updates',
              'Manage and pay subscriptions online',
              'Update availability for matches',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-pitch-400 mt-0.5 shrink-0" />
                <span className="text-sm text-navy-300">{item}</span>
              </div>
            ))}
          </div>

          {user ? (
            // Logged in — link account
            <div className="space-y-3 pt-2">
              <p className="text-xs text-navy-400 text-center">
                Logged in as <span className="text-white">{user.name}</span> ({user.email})
              </p>
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                {claiming ? 'Linking...' : 'Link My Account'}
              </button>
            </div>
          ) : showRegister ? (
            // Inline registration form
            <form onSubmit={handleRegister} className="space-y-3 pt-2">
              <p className="text-xs text-navy-400 text-center">
                Creating account for <span className="text-white">{invite.email}</span>
              </p>

              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">Your Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
                  <input
                    type="text"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-navy-500 focus:border-pitch-500 focus:outline-none"
                    placeholder="Your full name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-navy-500 focus:border-pitch-500 focus:outline-none"
                    placeholder="Min 8 characters"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
                  <input
                    type="password"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-navy-500 focus:border-pitch-500 focus:outline-none"
                    placeholder="Confirm password"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              {registerError && (
                <p className="text-red-400 text-sm text-center">{registerError}</p>
              )}

              <button
                type="submit"
                disabled={registering}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {registering ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <UserPlus className="w-5 h-5" />
                )}
                {registering ? 'Creating Account...' : 'Create Account & Link'}
              </button>

              <button
                type="button"
                onClick={() => setShowRegister(false)}
                className="w-full text-center text-sm text-navy-400 hover:text-white transition-colors"
              >
                Back to options
              </button>
            </form>
          ) : (
            // Not logged in — show login/register options
            <div className="space-y-3 pt-2">
              <button
                onClick={() => navigate(`/login?redirect=/guardian-invite/${token}`)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg font-medium transition-colors"
              >
                <LogIn className="w-5 h-5" />
                Log In & Link Account
              </button>
              <button
                onClick={() => setShowRegister(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-navy-800 hover:bg-navy-700 text-navy-300 hover:text-white rounded-lg text-sm transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Create Account & Link
              </button>
            </div>
          )}
        </div>

        {/* Security note */}
        <div className="flex items-center justify-center gap-2 text-xs text-navy-500">
          <Shield className="w-3.5 h-3.5" />
          <span>Secure connection powered by Touchline</span>
        </div>
      </div>
    </div>
  )
}
