import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, ArrowRight, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { authService } from '../services/auth'
import toast from 'react-hot-toast'
import SEO from '../components/common/SEO'

function MoonBootsMark() {
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--mb-gold)' }}>
      <span style={{ color: 'var(--mb-navy)', fontFamily: 'Poppins, system-ui, sans-serif', fontWeight: 700, fontSize: '0.875rem' }}>M</span>
    </div>
  )
}

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      await authService.resetPassword(token, password)
      setSuccess(true)
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to reset password'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-8">
      <SEO title="Reset Password" path="/reset-password" noIndex={true} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <MoonBootsMark />
          <span className="font-bold text-navy-50 text-xl" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>MoonBoots Sports</span>
        </Link>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-pitch-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-pitch-400" />
            </div>
            <h1 className="font-display text-2xl font-bold text-white mb-2">Password reset</h1>
            <p className="text-navy-400 mb-6">
              Your password has been updated. You can now sign in with your new password.
            </p>
            <Link to="/login" className="btn-primary inline-flex items-center gap-2">
              Sign In <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold text-white mb-2">Choose a new password</h1>
            <p className="text-navy-400 mb-8">
              Enter your new password below. Must be at least 8 characters.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="label">New password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-500" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10 pr-10"
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-500 hover:text-navy-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="label">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-500" />
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input pl-10"
                    placeholder="Repeat your password"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>Reset Password <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </form>

            <p className="text-center text-navy-400 mt-6">
              <Link to="/login" className="text-pitch-400 hover:text-pitch-300">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  )
}
