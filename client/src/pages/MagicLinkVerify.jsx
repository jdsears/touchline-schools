import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2, AlertCircle } from 'lucide-react'

export default function MagicLinkVerify() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { verifyMagicLink } = useAuth()
  const [error, setError] = useState(null)

  useEffect(() => {
    async function verify() {
      const result = await verifyMagicLink(token)

      if (result.success) {
        // Small delay so the toast shows before navigation
        setTimeout(() => {
          const role = result.user?.role
          if (role === 'player' || role === 'parent') {
            navigate('/pupil-lounge', { replace: true })
          } else {
            navigate('/dashboard', { replace: true })
          }
        }, 100)
      } else {
        setError(result.error || 'Invalid or expired link')
      }
    }

    if (token) {
      verify()
    }
  }, [token])

  if (error) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white mb-2">Link expired</h1>
          <p className="text-navy-400 mb-6">
            This magic link has expired or has already been used. Magic links are valid for 15 minutes.
          </p>
          <div className="space-y-3">
            <Link to="/login" className="btn-primary inline-flex items-center gap-2">
              Sign in again
            </Link>
            <p className="text-navy-500 text-sm">
              Try the Magic Link option to get a new link sent to your email.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-pitch-500 mx-auto mb-4" />
        <p className="text-navy-400">Signing you in...</p>
      </div>
    </div>
  )
}
