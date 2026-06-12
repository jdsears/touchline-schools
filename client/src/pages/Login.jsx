import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Loader2, GraduationCap, Trophy, Users, Eye, EyeOff, AlertTriangle, Check } from 'lucide-react'
import SEO from '../components/common/SEO'
import api from '../services/api'
import { AuroraBackdrop, Eyebrow } from './Landing'

const easeOut = [0.22, 1, 0.36, 1]

const inputCls =
  'w-full rounded-lg border border-[#0F1E3D]/15 bg-white py-3 pl-11 pr-4 font-body text-[15px] text-[#0F1E3D] placeholder:text-[#0F1E3D]/35 outline-none transition-colors focus:border-[#C9A961] focus:ring-2 focus:ring-[#C9A961]/30'

function Field({ label, icon: Icon, action, children }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="font-body text-[13px] font-semibold text-[#0F1E3D]/80">{label}</label>
        {action}
      </div>
      <div className="relative">
        <Icon size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0F1E3D]/35" />
        {children}
      </div>
    </div>
  )
}

function SubmitButton({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F1E3D] py-3.5 font-body text-[15px] font-semibold text-[#FAFAF7] transition-all hover:bg-[#1a2f55] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <>
          {children}
          <ArrowRight size={17} className="text-[#E2C97A] transition-transform duration-300 group-hover:translate-x-1" />
        </>
      )}
    </button>
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

  return (
    <div className="flex min-h-screen bg-[#FAFAF7]">
      <SEO
        title="Login"
        path="/login"
        description="Sign in to MoonBoots Sports to manage your school PE department."
        noIndex={true}
      />

      {/* Left: sign-in form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOut }}
          className="w-full max-w-[420px]"
        >
          <Link to="/" className="mb-12 inline-flex items-center" aria-label="MoonBoots Sports — home">
            <img src="/moonboots-sports-logo.svg" alt="MoonBoots Sports" className="h-8" />
          </Link>

          <h1 className="font-serif text-[34px] font-bold leading-tight text-[#0F1E3D]">
            Welcome back<span className="text-[#C9A961]">.</span>
          </h1>
          <p className="mt-2 font-body text-[15px] text-[#0F1E3D]/60">
            Sign in to your school's platform to continue.
          </p>

          {/* Mode tabs */}
          <div className="mt-8 flex gap-1 rounded-xl bg-[#0F1E3D]/[0.06] p-1">
            {[
              { id: 'password', label: 'Password' },
              { id: 'magic', label: 'Magic Link' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setMode(t.id)}
                className={`flex-1 rounded-lg px-4 py-2.5 font-body text-sm font-semibold transition-colors ${
                  mode === t.id
                    ? 'bg-[#0F1E3D] text-[#FAFAF7] shadow-sm'
                    : 'text-[#0F1E3D]/55 hover:text-[#0F1E3D]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {mode === 'password' ? (
              <form onSubmit={handlePasswordLogin} className="flex flex-col gap-5">
                <Field label="Email" icon={Mail}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                    placeholder="name@school.ac.uk"
                    required
                  />
                </Field>

                <Field
                  label="Password"
                  icon={Lock}
                  action={
                    <Link to="/forgot-password" className="font-body text-[13px] font-medium text-[#8a6d2f] hover:underline">
                      Forgot password?
                    </Link>
                  }
                >
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputCls} pr-11`}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#0F1E3D]/35 transition-colors hover:text-[#0F1E3D]/70"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </Field>

                <SubmitButton loading={loading}>Sign In</SubmitButton>
              </form>
            ) : (
              <form onSubmit={handleMagicLink} className="flex flex-col gap-5">
                {magicLinkSent ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-2xl border border-[#C9A961]/40 bg-[#C9A961]/10 px-6 py-10 text-center"
                  >
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#0F1E3D]">
                      <Mail size={22} className="text-[#E2C97A]" />
                    </div>
                    <h3 className="font-serif text-[22px] font-bold text-[#0F1E3D]">Check your email</h3>
                    <p className="mt-2 font-body text-sm text-[#0F1E3D]/65">
                      We have sent a magic link to{' '}
                      <span className="font-semibold text-[#0F1E3D]">{email}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setMagicLinkSent(false)}
                      className="mt-4 font-body text-sm font-medium text-[#8a6d2f] hover:underline"
                    >
                      Try a different email
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <Field label="Email" icon={Mail}>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputCls}
                        placeholder="name@school.ac.uk"
                        required
                      />
                    </Field>
                    <p className="-mt-2 font-body text-[13px] leading-relaxed text-[#0F1E3D]/50">
                      No password needed — we'll email you a secure one-time sign-in link.
                    </p>
                    <SubmitButton loading={loading}>Send Magic Link</SubmitButton>
                  </>
                )}
              </form>
            )}
          </div>

          {/* SSO error */}
          {ssoError && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-3.5">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
              <p className="font-body text-[13px] leading-relaxed text-red-700">{ssoError}</p>
            </div>
          )}

          {/* SSO providers */}
          {ssoProviders.length > 0 && (
            <div className="mt-7">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#0F1E3D]/10" />
                <span className="font-body text-[11px] font-semibold uppercase tracking-[0.15em] text-[#0F1E3D]/40">
                  or sign in with
                </span>
                <div className="h-px flex-1 bg-[#0F1E3D]/10" />
              </div>
              <div className="flex flex-col gap-2.5">
                {ssoProviders.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSsoLogin(p.id)}
                    className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-[#0F1E3D]/15 bg-white px-4 py-3 font-body text-sm font-semibold text-[#0F1E3D] transition-colors hover:border-[#0F1E3D]/35 hover:bg-[#0F1E3D]/[0.03]"
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

          <p className="mt-8 text-center font-body text-sm text-[#0F1E3D]/55">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-[#8a6d2f] hover:underline">Sign up</Link>
          </p>
        </motion.div>
      </div>

      {/* Right: brand panel (desktop only) */}
      <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-[#0F1E3D] lg:flex">
        <AuroraBackdrop />

        <div className="relative z-10 max-w-[480px] px-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <img src="/moonboots-sports-logo-white.svg" alt="MoonBoots Sports" className="h-9" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease: easeOut }}
            className="mb-9"
          >
            <Eyebrow light>Your whole department, one platform</Eyebrow>
            <h2 className="mt-5 font-serif text-[32px] font-bold leading-tight text-white">
              The PE department platform for UK schools.
            </h2>
            <p className="mt-4 font-body text-[15px] leading-relaxed text-[#FAFAF7]/75">
              Curriculum PE and extra-curricular sport, in one bespoke platform per school.
            </p>
          </motion.div>

          <div className="flex flex-col gap-3.5">
            {[
              { icon: GraduationCap, label: 'Curriculum PE', desc: 'Teaching groups, assessment, AI-drafted reports' },
              { icon: Trophy, label: 'Extra-Curricular Sport', desc: 'Teams, fixtures, sessions, NGB-aligned AI coaching' },
              { icon: Users, label: 'Pupil Development', desc: 'One profile per pupil across every sport' },
            ].map(({ icon: Icon, label, desc }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.12, duration: 0.5, ease: easeOut }}
                className="flex items-start gap-3.5 rounded-xl bg-white/[0.05] p-4 ring-1 ring-white/10"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#C9A961]/15">
                  <Icon size={17} className="text-[#E2C97A]" />
                </span>
                <div>
                  <p className="font-body text-sm font-semibold text-white">{label}</p>
                  <p className="mt-0.5 font-body text-[13px] leading-relaxed text-[#FAFAF7]/60">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-9 flex flex-wrap gap-x-6 gap-y-2 border-t border-[#C9A961]/20 pt-6"
          >
            {['Primary & prep', 'Secondary', 'All-through', 'Multi-academy trusts'].map((t) => (
              <span key={t} className="flex items-center gap-1.5 font-body text-[12px] text-[#FAFAF7]/55">
                <Check size={12} className="text-[#C9A961]" />
                {t}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
