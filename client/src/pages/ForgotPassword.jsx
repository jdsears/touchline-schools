import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ArrowRight, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
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

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    try {
      await authService.forgotPassword(email)
      setSent(true)
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send reset email'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-8">
      <SEO title="Forgot Password" path="/forgot-password" noIndex={true} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <MoonBootsMark />
          <span className="font-bold text-primary text-xl" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>MoonBoots Sports</span>
        </Link>

        {sent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-pitch-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-pitch-400" />
            </div>
            <h1 className="font-display text-2xl font-bold text-white mb-2">Check your email</h1>
            <p className="text-secondary mb-6">
              If an account exists for <span className="text-white">{email}</span>,
              we've sent a link to reset your password. The link expires in 1 hour.
            </p>
            <p className="text-tertiary text-sm mb-6">
              Don't see it? Check your spam folder.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="text-pitch-400 hover:text-pitch-300 text-sm"
              >
                Try a different email
              </button>
              <div>
                <Link to="/login" className="text-secondary hover:text-white text-sm flex items-center justify-center gap-1">
                  <ArrowLeft className="w-4 h-4" /> Back to sign in
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold text-white mb-2">Reset your password</h1>
            <p className="text-secondary mb-8">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                    placeholder="coach@example.com"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>Send Reset Link <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </form>

            <p className="text-center text-secondary mt-6">
              <Link to="/login" className="text-pitch-400 hover:text-pitch-300 flex items-center justify-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  )
}
