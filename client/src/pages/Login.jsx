import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Loader2, GraduationCap, Trophy, Users, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import SEO from '../components/common/SEO'
import api from '../services/api'

const inputStyle = {
  width: '100%',
  padding: '12px 14px 12px 42px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(201, 169, 97, 0.25)',
  borderRadius: 4,
  color: 'var(--mb-warm-white, #FAFAF7)',
  fontFamily: 'var(--font-sans, Poppins, sans-serif)',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  fontFamily: 'var(--font-sans, Poppins, sans-serif)',
  fontSize: 13,
  fontWeight: 500,
  color: 'rgba(250, 250, 247, 0.8)',
  marginBottom: 6,
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
    api.get('/sso/providers').then(res => {
      setSsoProviders(res.data.providers || [])
    }).catch(() => {})

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
    window.location.href = `/api/sso/${provider}/initiate`
  }

  async function handlePasswordLogin(e) {
    e.preventDefault()
    setLoading(true)
    const result = await login(email, password)
    if (result.success) {
      const userRole = result.user?.role
      if (userRole === 'pupil' || userRole === 'parent') {
        navigate('/pupil-lounge')
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

  const goldBtnStyle = {
    width: '100%',
    padding: '14px 24px',
    background: loading ? 'rgba(201, 169, 97, 0.5)' : 'var(--mb-gold, #C9A961)',
    color: 'var(--mb-navy, #0F1E3D)',
    border: 'none',
    borderRadius: 4,
    fontFamily: 'var(--font-sans, Poppins, sans-serif)',
    fontWeight: 600,
    fontSize: 15,
    cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'background 0.15s ease',
  }

  const tabStyle = (active) => ({
    flex: 1,
    padding: '10px 16px',
    borderRadius: 4,
    fontFamily: 'var(--font-sans, Poppins, sans-serif)',
    fontSize: 14,
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    background: active ? 'rgba(201, 169, 97, 0.15)' : 'transparent',
    color: active ? 'var(--mb-gold, #C9A961)' : 'rgba(250, 250, 247, 0.5)',
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--mb-navy, #0F1E3D)' }}>
      <SEO
        title="Login"
        path="/login"
        description="Sign in to MoonBoots Sports to manage your school PE department."
        noIndex={true}
      />

      {/* Left: Login form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: '100%', maxWidth: 420 }}
        >
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 40 }}>
            <img src="/moonboots-sports-logo-white.svg" alt="MoonBoots Sports" style={{ height: 28 }} />
          </Link>

          <h1 style={{ fontFamily: 'var(--font-serif, "Crimson Pro", Georgia, serif)', fontSize: 32, fontWeight: 700, color: 'white', marginBottom: 8 }}>
            Welcome back
          </h1>
          <p style={{ fontFamily: 'var(--font-sans, Poppins, sans-serif)', fontSize: 15, color: 'rgba(250, 250, 247, 0.6)', marginBottom: 32 }}>
            Sign in to your account to continue
          </p>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 6, marginBottom: 24 }}>
            <button onClick={() => setMode('password')} style={tabStyle(mode === 'password')}>Password</button>
            <button onClick={() => setMode('magic')} style={tabStyle(mode === 'magic')}>Magic Link</button>
          </div>

          {mode === 'password' ? (
            <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(201, 169, 97, 0.5)' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                    placeholder="name@school.ac.uk"
                    required
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={labelStyle}>Password</label>
                  <Link to="/forgot-password" style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--mb-gold, #C9A961)', textDecoration: 'none' }}>
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(201, 169, 97, 0.5)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ ...inputStyle, paddingRight: 42 }}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(250, 250, 247, 0.4)' }}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} style={goldBtnStyle}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : (
                  <>Sign In <ArrowRight size={18} /></>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {magicLinkSent ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(201, 169, 97, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Mail size={24} style={{ color: 'var(--mb-gold)' }} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 8 }}>Check your email</h3>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'rgba(250, 250, 247, 0.6)', marginBottom: 16 }}>
                    We have sent a magic link to <span style={{ color: 'white' }}>{email}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setMagicLinkSent(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--mb-gold)' }}
                  >
                    Try a different email
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(201, 169, 97, 0.5)' }} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={inputStyle}
                        placeholder="name@school.ac.uk"
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} style={goldBtnStyle}>
                    {loading ? <Loader2 size={18} className="animate-spin" /> : (
                      <>Send Magic Link <ArrowRight size={18} /></>
                    )}
                  </button>
                </>
              )}
            </form>
          )}

          {/* SSO error */}
          {ssoError && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 4 }}>
              <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#ef4444' }}>{ssoError}</p>
            </div>
          )}

          {/* SSO providers */}
          {ssoProviders.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(201, 169, 97, 0.15)' }} />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'rgba(250, 250, 247, 0.4)' }}>or sign in with</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(201, 169, 97, 0.15)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ssoProviders.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSsoLogin(p.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201, 169, 97, 0.15)',
                      borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
                      color: 'white', transition: 'background 0.15s ease',
                    }}
                  >
                    {p.id === 'microsoft' && (
                      <svg viewBox="0 0 21 21" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                        <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                        <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                        <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                        <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                      </svg>
                    )}
                    {p.id === 'google' && (
                      <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
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

          <p style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'rgba(250, 250, 247, 0.5)', marginTop: 24 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--mb-gold, #C9A961)', textDecoration: 'none' }}>Sign up</Link>
          </p>
        </motion.div>
      </div>

      {/* Right: Brand panel (desktop only) */}
      <div className="hidden lg:flex" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid rgba(201, 169, 97, 0.1)', position: 'relative', overflow: 'hidden', background: 'var(--mb-navy-deep, #0A1530)' }}>
        <div style={{ position: 'absolute', top: '20%', right: '20%', width: 384, height: 384, borderRadius: '50%', filter: 'blur(120px)', background: 'rgba(201, 169, 97, 0.06)' }} />
        <div style={{ position: 'absolute', bottom: '25%', left: '25%', width: 256, height: 256, borderRadius: '50%', filter: 'blur(120px)', background: 'rgba(201, 169, 97, 0.04)' }} />

        <div style={{ position: 'relative', zIndex: 1, padding: '0 48px', maxWidth: 480 }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: 40 }}>
            <img src="/moonboots-sports-logo-white.svg" alt="MoonBoots Sports" style={{ height: 36 }} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ marginBottom: 32 }}>
            <div style={{ width: 48, height: 2, background: 'var(--mb-gold, #C9A961)', marginBottom: 20 }} />
            <h2 style={{ fontFamily: 'var(--font-serif, "Crimson Pro", Georgia, serif)', fontSize: 32, fontWeight: 700, lineHeight: 1.2, color: 'white' }}>
              The PE department platform for UK schools.
            </h2>
            <p style={{ fontFamily: 'var(--font-sans, Poppins, sans-serif)', fontSize: 15, color: 'rgba(250, 250, 247, 0.7)', lineHeight: 1.6, marginTop: 16 }}>
              Curriculum PE and extra-curricular sport, in one bespoke platform per school.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            style={{ fontFamily: 'var(--font-sans, Poppins, sans-serif)', fontSize: 12, color: 'rgba(250, 250, 247, 0.4)', marginTop: 32 }}
          >
            Bespoke deployments for primary, prep, secondary, all-through, and multi-academy trusts.
          </motion.p>
        </div>
      </div>
    </div>
  )
}
