import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Loader2, GraduationCap, Trophy, Users, Check, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import SEO from '../components/common/SEO'
import api from '../services/api'

function MoonBootsMark() {
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--mb-gold)' }}>
      <span style={{ color: 'var(--mb-navy)', fontFamily: 'Poppins, system-ui, sans-serif', fontWeight: 700, fontSize: '0.875rem' }}>M</span>
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, sendMagicLink } = useAuth()
  const [mode, setMode] = useState('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [ssoProviders, setSsoProviders] = useState([])
  const [ssoError, setSsoError] = useState(null)

  useEffect(() => {
    // Fetch available SSO providers
    api.get('/sso/providers').then(res => {
      setSsoProviders(res.data.providers || [])
    }).catch(() => {})

    // Show SSO error if redirected back with ?error=
    const err = searchParams.get('error')
    const detail = searchParams.get('detail')
    if (err) {
      const messages = {
        sso_denied: 'You declined the sign-in request.',
        sso_failed: detail || 'No MoonBoots Sports account found for that identity. Ask your admin to add you first.',
        sso_init_failed: 'Could not connect to the identity provider. Try again.',
        sso_missing_params: 'The SSO response was incomplete. Try again.',
      }
      setSsoError(messages[err] || detail || 'SSO sign-in failed.')
    }
  }, [searchParams])

  function handleSsoLogin(provider) {
    // Full-page redirect to backend initiation endpoint
    window.location.href = `/api/sso/${provider}/initiate`
  }

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
        description="Sign in to MoonBoots Sports to access your coaching dashboard, tactics board, and pupil management tools."
        noIndex={true}
      />
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <MoonBootsMark />
            <span className="font-bold text-navy-50 text-xl" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>MoonBoots Sports</span>
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
                    placeholder="name@school.ac.uk"
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
                        placeholder="name@school.ac.uk"
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
          
          {/* SSO error */}
          {ssoError && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-alert-600/10 border border-alert-600/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-alert-400 shrink-0 mt-0.5" />
              <p className="text-sm text-alert-300">{ssoError}</p>
            </div>
          )}

          {/* SSO providers */}
          {ssoProviders.length > 0 && (
            <div className="mt-6">
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-navy-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-navy-950 text-navy-500">or sign in with</span>
                </div>
              </div>
              <div className="space-y-2">
                {ssoProviders.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSsoLogin(p.id)}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-navy-900 hover:bg-navy-800 border border-navy-700 hover:border-navy-600 rounded-xl text-sm font-medium text-white transition-colors"
                  >
                    {p.id === 'microsoft' && (
                      <svg viewBox="0 0 21 21" className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg">
                        <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                        <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                        <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                        <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                      </svg>
                    )}
                    {p.id === 'google' && (
                      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    )}
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-navy-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-pitch-400 hover:text-pitch-300">Sign up</Link>
          </p>
        </motion.div>
      </div>
      
      <div className="hidden lg:flex flex-1 items-center justify-center border-l border-navy-800 relative overflow-hidden" style={{ background: 'var(--mb-navy, #0F1E3D)' }}>
        {/* Subtle background accents */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(201, 169, 97, 0.06)' }} />
        <div className="absolute bottom-1/3 left-1/3 w-64 h-64 rounded-full blur-3xl" style={{ background: 'rgba(201, 169, 97, 0.04)' }} />

        <div className="relative z-10 px-12 max-w-lg">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <img src="/moonboots-sports-logo-white.svg" alt="MoonBoots Sports" style={{ height: 36 }} />
          </motion.div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div style={{ width: 48, height: 2, background: 'var(--mb-gold, #C9A961)', marginBottom: 20 }} />
            <h2 style={{ fontFamily: 'var(--font-serif, "Crimson Pro", Georgia, serif)', fontSize: 32, fontWeight: 700, lineHeight: 1.2, color: 'white' }}>
              The PE department platform for UK schools.
            </h2>
            <p style={{ fontFamily: 'var(--font-sans, Poppins, sans-serif)', fontSize: 15, color: 'rgba(250, 250, 247, 0.7)', lineHeight: 1.6, marginTop: 16 }}>
              Curriculum PE and extra-curricular sport, in one bespoke platform per school.
            </p>
          </motion.div>

          {/* Feature highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {[
              { icon: GraduationCap, label: 'Curriculum PE', desc: 'Teaching groups, assessment, AI-drafted reports' },
              { icon: Trophy, label: 'Extra-Curricular Sport', desc: 'Teams, fixtures, sessions, NGB-aligned AI coaching' },
              { icon: Users, label: 'Pupil Development', desc: 'One profile per pupil across every sport' },
            ].map(({ icon: Icon, label, desc }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '16px 18px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(201, 169, 97, 0.15)',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                  background: 'rgba(201, 169, 97, 0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} style={{ color: 'var(--mb-gold, #C9A961)' }} />
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-sans, Poppins, sans-serif)', fontSize: 14, fontWeight: 600, color: 'white' }}>{label}</p>
                  <p style={{ fontFamily: 'var(--font-sans, Poppins, sans-serif)', fontSize: 13, color: 'rgba(250, 250, 247, 0.6)', marginTop: 2 }}>{desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            style={{
              fontFamily: 'var(--font-sans, Poppins, sans-serif)', fontSize: 12,
              color: 'rgba(250, 250, 247, 0.4)', marginTop: 32,
            }}
          >
            Bespoke deployments for primary, prep, secondary, all-through, and multi-academy trusts.
          </motion.p>
        </div>
      </div>
    </div>
  )
}
