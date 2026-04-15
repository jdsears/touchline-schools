import { useState, useId } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Loader2, Brain, Users, TrendingUp, Target, Eye, EyeOff } from 'lucide-react'
import SEO from '../components/common/SEO'

// Touchline logo mark component
function TouchlineMark({ className = "w-10 h-8" }) {
  const id = useId()
  const gradId = `tl-arc-${id}`
  return (
    <svg viewBox="0 10 64 38" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2ED573"/>
          <stop offset="100%" stopColor="#F5A623"/>
        </linearGradient>
      </defs>
      <g fill="none">
        <path d="M12 44 C18 12, 46 12, 52 44"
              stroke={`url(#${gradId})`}
              strokeWidth="4.5"
              strokeLinecap="round"/>
        <line x1="8" y1="44" x2="56" y2="44"
              stroke="#2ED573"
              strokeWidth="3.5"
              strokeLinecap="round"/>
        <circle cx="32" cy="44" r="5" fill="#2ED573"/>
      </g>
    </svg>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const { login, sendMagicLink } = useAuth()
  const [mode, setMode] = useState('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  
  async function handlePasswordLogin(e) {
    e.preventDefault()
    setLoading(true)

    const result = await login(email, password)

    if (result.success) {
      // Navigate based on user role
      const userRole = result.user?.role
      if (userRole === 'pupil' || userRole === 'parent') {
        navigate('/pupil')
      } else {
        navigate('/teacher')
      }
    }

    setLoading(false)
  }
  
  async function handleMagicLink(e) {
    e.preventDefault()
    setLoading(true)
    
    const result = await sendMagicLink(email)
    
    if (result.success) {
      setMagicLinkSent(true)
    }
    
    setLoading(false)
  }
  
  return (
    <div className="min-h-screen bg-navy-950 flex">
      <SEO
        title="Login"
        path="/login"
        description="Sign in to Touchline to access your coaching dashboard, tactics board, and pupil management tools."
        noIndex={true}
      />
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <TouchlineMark className="w-10 h-6" />
            <span className="font-display font-semibold text-navy-50 text-xl">Touchline</span>
          </Link>
          
          <h1 className="font-display text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-navy-400 mb-8">Sign in to your account to continue</p>
          
          <div className="flex gap-2 p-1 bg-navy-900 rounded-lg mb-6">
            <button
              onClick={() => setMode('password')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'password' ? 'bg-navy-800 text-white' : 'text-navy-400 hover:text-white'
              }`}
            >
              Password
            </button>
            <button
              onClick={() => setMode('magic')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'magic' ? 'bg-navy-800 text-white' : 'text-navy-400 hover:text-white'
              }`}
            >
              Magic Link
            </button>
          </div>
          
          {mode === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-500" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                    placeholder="coach@example.com"
                    required
                  />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="label">Password</label>
                  <Link to="/forgot-password" className="text-sm text-pitch-400 hover:text-pitch-300">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-500" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10 pr-10"
                    placeholder="••••••••"
                    required
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
              
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>Sign In <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              {magicLinkSent ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-pitch-500/10 flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-pitch-400" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-white mb-2">Check your email</h3>
                  <p className="text-navy-400 mb-4">
                    We've sent a magic link to <span className="text-white">{email}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setMagicLinkSent(false)}
                    className="text-pitch-400 hover:text-pitch-300 text-sm"
                  >
                    Try a different email
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="magic-email" className="label">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-500" />
                      <input
                        id="magic-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input pl-10"
                        placeholder="coach@example.com"
                        required
                      />
                    </div>
                  </div>
                  
                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>Send Magic Link <ArrowRight className="w-5 h-5" /></>
                    )}
                  </button>
                </>
              )}
            </form>
          )}
          
          <p className="text-center text-navy-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-pitch-400 hover:text-pitch-300">Sign up</Link>
          </p>
        </motion.div>
      </div>
      
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-navy-900 via-navy-900 to-pitch-950/30 border-l border-navy-800 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-pitch-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />

        <div className="relative z-10 px-12 max-w-lg">
          {/* Animated Tactics Board */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative mb-10"
          >
            <svg viewBox="0 0 320 200" className="w-full h-auto drop-shadow-2xl">
              {/* Pitch background */}
              <defs>
                <linearGradient id="pitchGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#166534" />
                  <stop offset="50%" stopColor="#15803d" />
                  <stop offset="100%" stopColor="#14532d" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Pitch shape */}
              <rect x="10" y="10" width="300" height="180" rx="8" fill="url(#pitchGrad)" />

              {/* Pitch markings */}
              <g stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none">
                {/* Outer border */}
                <rect x="20" y="20" width="280" height="160" rx="2" />
                {/* Center line */}
                <line x1="160" y1="20" x2="160" y2="180" />
                {/* Center circle */}
                <circle cx="160" cy="100" r="25" />
                <circle cx="160" cy="100" r="2" fill="rgba(255,255,255,0.3)" />
                {/* Left penalty area */}
                <rect x="20" y="55" width="45" height="90" />
                <rect x="20" y="75" width="18" height="50" />
                {/* Right penalty area */}
                <rect x="255" y="55" width="45" height="90" />
                <rect x="282" y="75" width="18" height="50" />
              </g>

              {/* Animated pupil positions - 4-3-3 formation */}
              <g filter="url(#glow)">
                {/* Goalkeeper */}
                <motion.circle
                  cx="40" cy="100" r="6"
                  fill="#F5A623"
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                />

                {/* Defenders */}
                {[[75, 45], [75, 75], [75, 125], [75, 155]].map(([x, y], i) => (
                  <motion.circle
                    key={`def-${i}`}
                    cx={x} cy={y} r="6"
                    fill="#2ED573"
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.1 * (i + 1) }}
                  />
                ))}

                {/* Midfielders */}
                {[[130, 60], [130, 100], [130, 140]].map(([x, y], i) => (
                  <motion.circle
                    key={`mid-${i}`}
                    cx={x} cy={y} r="6"
                    fill="#2ED573"
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.1 * (i + 5) }}
                  />
                ))}

                {/* Forwards */}
                {[[190, 50], [200, 100], [190, 150]].map(([x, y], i) => (
                  <motion.circle
                    key={`fwd-${i}`}
                    cx={x} cy={y} r="6"
                    fill="#2ED573"
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.1 * (i + 8) }}
                  />
                ))}
              </g>

              {/* Tactical movement arrows */}
              <g stroke="#F5A623" strokeWidth="1.5" fill="none" opacity="0.6">
                <motion.path
                  d="M130,100 Q160,85 190,100"
                  strokeDasharray="4 4"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.6 }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
                />
                <motion.path
                  d="M75,75 Q100,60 130,60"
                  strokeDasharray="4 4"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.6 }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: "loop", delay: 0.5 }}
                />
              </g>
            </svg>
          </motion.div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-8"
          >
            <h2 className="font-display text-2xl font-bold text-white mb-3">
              Football intelligence for grassroots teams
            </h2>
            <p className="text-navy-400">
              The analytical support your coaching deserves
            </p>
          </motion.div>

          {/* Feature highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 gap-4"
          >
            {[
              { icon: Brain, label: 'AI-Powered Analysis', color: 'pitch' },
              { icon: Target, label: 'Tactical Planning', color: 'amber' },
              { icon: Users, label: 'Squad Management', color: 'pitch' },
              { icon: TrendingUp, label: 'Pupil Development', color: 'amber' },
            ].map(({ icon: Icon, label, color }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-navy-800/50 border border-navy-700/50"
              >
                <div className={`w-8 h-8 rounded-md bg-${color}-500/20 flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 text-${color}-400`} />
                </div>
                <span className="text-sm text-navy-200 font-medium">{label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
