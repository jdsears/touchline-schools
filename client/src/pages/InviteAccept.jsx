import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services/auth'
import { motion } from 'framer-motion'
import { Sparkles, Lock, Loader2, ArrowRight, AlertCircle } from 'lucide-react'

export default function InviteAccept() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { acceptInvite } = useAuth()
  
  const [invite, setInvite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accepting, setAccepting] = useState(false)
  
  useEffect(() => {
    loadInvite()
  }, [token])
  
  async function loadInvite() {
    try {
      const response = await authService.getInvite(token)
      setInvite(response.data)
    } catch (error) {
      setError(error.response?.data?.message || 'Invalid or expired invite link')
    } finally {
      setLoading(false)
    }
  }
  
  async function handleAccept(e) {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    setAccepting(true)
    setError(null)
    
    const result = await acceptInvite(token, password)
    
    if (result.success) {
      if (invite.role === 'player' || invite.role === 'parent') {
        navigate('/pupil-lounge', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } else {
      setError(result.error)
    }
    
    setAccepting(false)
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pitch-400" />
      </div>
    )
  }
  
  if (error && !invite) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center p-4">
        <div className="card p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-alert-400 mx-auto mb-4" />
          <h1 className="font-display text-xl font-bold text-white mb-2">Invalid Invite</h1>
          <p className="text-secondary mb-6">{error}</p>
          <Link to="/login" className="btn-primary">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-8 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-pitch-500/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-pitch-400" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white mb-2">
            You've Been Invited!
          </h1>
          <p className="text-secondary">
            You've been invited to join <span className="text-white">{invite?.team_name}</span> as {invite?.role === 'assistant' ? 'an' : 'a'} <span className="text-white capitalize">{invite?.role}</span>
          </p>
        </div>
        
        <form onSubmit={handleAccept} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={invite?.email || ''}
              className="input bg-subtle"
              disabled
            />
          </div>
          
          <div>
            <label className="label">Create Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-10"
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="label">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input pl-10"
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>
          </div>
          
          {error && (
            <p className="text-alert-400 text-sm">{error}</p>
          )}
          
          <button type="submit" disabled={accepting} className="btn-primary w-full">
            {accepting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Join Team
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
