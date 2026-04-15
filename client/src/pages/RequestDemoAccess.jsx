import { useState } from 'react'
import { Link } from 'react-router-dom'
import SEO from '../components/common/SEO'
import { MarketingFooter } from './Landing'

const CALENDLY_URL = import.meta.env.VITE_CALENDLY_URL || 'https://calendly.com/moonboots-sports/demo'

const ROLES = [
  'Head of PE',
  'Director of Sport',
  'Head of Sport',
  'Bursar',
  'Headteacher / Head of School',
  'Other',
]

const SCHOOL_TYPES = [
  'Primary',
  'Prep / preparatory',
  'Secondary',
  'All-through',
  'Multi-academy trust',
  'Other',
]

const PUPIL_ROLLS = [
  'Under 100',
  '100-300',
  '300-600',
  '600-1000',
  'Over 1000',
]

function Header() {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(15, 30, 61, 0.95)', backdropFilter: 'blur(12px)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/moonboots-sports-logo-white.svg" alt="MoonBoots Sports" style={{ height: 32 }} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link to="/about" style={{ color: 'var(--mb-warm-white)', textDecoration: 'none', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, opacity: 0.9 }}>About</Link>
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'var(--mb-gold)', color: 'var(--mb-navy)', padding: '12px 24px',
              border: 'none', borderRadius: 4, fontFamily: 'var(--font-sans)', fontWeight: 500,
              fontSize: 15, textDecoration: 'none', display: 'inline-block',
            }}
          >
            Book a discovery call
          </a>
        </div>
      </div>
    </header>
  )
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(201, 169, 97, 0.3)',
  borderRadius: 4,
  color: 'var(--mb-warm-white)',
  fontFamily: 'var(--font-sans)',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  fontWeight: 500,
  color: 'rgba(250, 250, 247, 0.9)',
  marginBottom: 6,
}

const errorStyle = {
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  color: '#ef4444',
  marginTop: 4,
}

export default function RequestDemoAccess() {
  const [form, setForm] = useState({
    name: '',
    role_at_school: '',
    role_at_school_other: '',
    school_name: '',
    school_type: '',
    email: '',
    pupil_roll_band: '',
    hopes_to_help_with: '',
    referral_source: '',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState('')

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Required'
    if (!form.role_at_school) errs.role_at_school = 'Required'
    if (form.role_at_school === 'Other' && !form.role_at_school_other.trim()) errs.role_at_school_other = 'Please specify your role'
    if (!form.school_name.trim()) errs.school_name = 'Required'
    if (!form.school_type) errs.school_type = 'Required'
    if (!form.email.trim()) errs.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Please enter a valid email address'
    if (!form.pupil_roll_band) errs.pupil_roll_band = 'Required'
    if (form.hopes_to_help_with.length > 500) errs.hopes_to_help_with = '500 characters maximum'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    setServerError('')

    try {
      const res = await fetch('/api/demo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors)
        } else {
          setServerError(data.error || 'Something went wrong. Please try again.')
        }
        return
      }
      setSubmitted(true)
    } catch {
      setServerError('Unable to submit. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  if (submitted) {
    return (
      <>
        <SEO title="Request Received" path="/request-demo" noIndex />
        <Header />
        <main style={{ background: 'var(--mb-navy)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: 540, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 4vw, 36px)', color: 'white', fontWeight: 700, lineHeight: 1.2 }}>
              Thank you. We will be in touch within one working day.
            </h1>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'rgba(250, 250, 247, 0.85)', lineHeight: 1.6, marginTop: 24 }}>
              We have received your request and will reply by email to arrange a brief
              discovery call. Demo access will be issued to you alongside the call.
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'rgba(250, 250, 247, 0.85)', lineHeight: 1.6, marginTop: 16 }}>
              If you do not hear back within one working day, please email{' '}
              <a href="mailto:hello@moonbootssports.com" style={{ color: 'var(--mb-gold)' }}>hello@moonbootssports.com</a> directly.
            </p>
            <Link to="/" style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--mb-gold)', marginTop: 32, display: 'inline-block', textDecoration: 'none' }}>
              Back to homepage
            </Link>
          </div>
        </main>
        <MarketingFooter />
      </>
    )
  }

  return (
    <>
      <SEO
        title="Request Demo Access"
        description="Request 7-day demo access to MoonBoots Sports for your school. We issue access after a brief discovery call."
        path="/request-demo"
      />
      <Header />
      <main style={{ background: 'var(--mb-navy)', minHeight: '100vh', paddingTop: 48, paddingBottom: 80 }}>
        <div style={{ maxWidth: 540, margin: '0 auto', padding: '0 24px' }}>

          <p style={{ color: 'var(--mb-gold)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase' }}>
            REQUEST DEMO ACCESS
          </p>
          <div style={{ width: 60, height: 2, background: 'var(--mb-gold)', margin: '20px 0' }} />

          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(30px, 4vw, 40px)', color: 'white', fontWeight: 700, lineHeight: 1.15 }}>
            See MoonBoots Sports for your school.
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'rgba(250, 250, 247, 0.85)', lineHeight: 1.6, marginTop: 24 }}>
            We issue 7-day demo access on a per-prospect basis after a brief qualifying
            conversation. Tell us about your school below and we will be in touch within
            one working day to arrange your discovery call and demo access together.
          </p>

          {serverError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 4, padding: '12px 16px', marginTop: 24 }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: '#ef4444' }}>{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Name */}
            <div>
              <label style={labelStyle}>Your name *</label>
              <input type="text" value={form.name} onChange={e => update('name', e.target.value)} style={inputStyle} />
              {errors.name && <p style={errorStyle}>{errors.name}</p>}
            </div>

            {/* Role */}
            <div>
              <label style={labelStyle}>Your role at the school *</label>
              <select value={form.role_at_school} onChange={e => update('role_at_school', e.target.value)} style={{ ...inputStyle, appearance: 'auto' }}>
                <option value="">Select...</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {errors.role_at_school && <p style={errorStyle}>{errors.role_at_school}</p>}
              {form.role_at_school === 'Other' && (
                <div style={{ marginTop: 8 }}>
                  <input type="text" placeholder="Please specify" value={form.role_at_school_other} onChange={e => update('role_at_school_other', e.target.value)} style={inputStyle} />
                  {errors.role_at_school_other && <p style={errorStyle}>{errors.role_at_school_other}</p>}
                </div>
              )}
            </div>

            {/* School name */}
            <div>
              <label style={labelStyle}>School name *</label>
              <input type="text" value={form.school_name} onChange={e => update('school_name', e.target.value)} style={inputStyle} />
              {errors.school_name && <p style={errorStyle}>{errors.school_name}</p>}
            </div>

            {/* School type */}
            <div>
              <label style={labelStyle}>School type *</label>
              <select value={form.school_type} onChange={e => update('school_type', e.target.value)} style={{ ...inputStyle, appearance: 'auto' }}>
                <option value="">Select...</option>
                {SCHOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.school_type && <p style={errorStyle}>{errors.school_type}</p>}
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>School email address *</label>
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)} style={inputStyle} />
              {errors.email && <p style={errorStyle}>{errors.email}</p>}
            </div>

            {/* Pupil roll */}
            <div>
              <label style={labelStyle}>Approximate pupil roll *</label>
              <select value={form.pupil_roll_band} onChange={e => update('pupil_roll_band', e.target.value)} style={{ ...inputStyle, appearance: 'auto' }}>
                <option value="">Select...</option>
                {PUPIL_ROLLS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {errors.pupil_roll_band && <p style={errorStyle}>{errors.pupil_roll_band}</p>}
            </div>

            {/* Hopes */}
            <div>
              <label style={labelStyle}>What are you most hoping MoonBoots Sports could help with? <span style={{ opacity: 0.5 }}>(optional, 500 chars max)</span></label>
              <textarea
                value={form.hopes_to_help_with}
                onChange={e => update('hopes_to_help_with', e.target.value)}
                maxLength={500}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
              {errors.hopes_to_help_with && <p style={errorStyle}>{errors.hopes_to_help_with}</p>}
            </div>

            {/* Referral */}
            <div>
              <label style={labelStyle}>How did you hear about us? <span style={{ opacity: 0.5 }}>(optional)</span></label>
              <input type="text" value={form.referral_source} onChange={e => update('referral_source', e.target.value)} style={inputStyle} />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: submitting ? 'rgba(201, 169, 97, 0.5)' : 'var(--mb-gold)',
                color: 'var(--mb-navy)',
                padding: '14px 24px',
                border: 'none',
                borderRadius: 4,
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                fontSize: 16,
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s ease',
                width: '100%',
              }}
            >
              {submitting ? 'Submitting...' : 'Submit request'}
            </button>

            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'rgba(250, 250, 247, 0.6)', lineHeight: 1.5, textAlign: 'center' }}>
              By submitting, you agree to be contacted about your request. We do not share your details with anyone outside MoonBoots Consultancy UK Ltd.
            </p>
          </form>

        </div>
      </main>
      <MarketingFooter />
    </>
  )
}
