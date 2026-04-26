import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Users, ArrowRight, Loader2, ArrowLeft, ExternalLink, X, Image, Sparkles, FileDown, Check, Shield, Calendar, MessageSquare, Ticket, CheckCircle, XCircle, Building2, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../services/api'
import SEO from '../components/common/SEO'


// Preset color schemes for teams
const colorPresets = [
  { name: 'Pitch Green', primary: '#2ED573', secondary: '#0B1C2D', accent: '#F5A623' },
  { name: 'Royal Blue', primary: '#3B82F6', secondary: '#1E293B', accent: '#FBBF24' },
  { name: 'Classic Red', primary: '#EF4444', secondary: '#18181B', accent: '#FFFFFF' },
  { name: 'Purple Pride', primary: '#8B5CF6', secondary: '#1E1B4B', accent: '#F472B6' },
  { name: 'Sky Blue', primary: '#38BDF8', secondary: '#0C4A6E', accent: '#FCD34D' },
  { name: 'Orange Crush', primary: '#F97316', secondary: '#1C1917', accent: '#FFFFFF' },
  { name: 'Claret & Blue', primary: '#7C3AED', secondary: '#7F1D1D', accent: '#60A5FA' },
  { name: 'Black & White', primary: '#FFFFFF', secondary: '#000000', accent: '#2ED573' },
]

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const fileInputRef = useRef(null)

  // Account type: 'team' or 'school'
  const [accountType, setAccountType] = useState(null)

  // School-specific state
  const [dpaAccepted, setDpaAccepted] = useState(false)
  const [showDpa, setShowDpa] = useState(false)

  // Promo code state
  const [promoCode, setPromoCode] = useState('')
  const [promoValidating, setPromoValidating] = useState(false)
  const [promoResult, setPromoResult] = useState(null) // { valid, discount_type, discount_value, description } or { valid: false, message }
  const [showPromoInput, setShowPromoInput] = useState(false)

  const [formData, setFormData] = useState({
    // Step 2: User details
    name: '',
    email: '',
    password: '',
    // Step 3: Team details
    teamName: '',
    ageGroup: 'U13',
    teamFormat: 11,
    // Step 3 (school): School name
    clubName: '',
    // Step 4: Branding
    hubName: '',
    primaryColor: '#2ED573',
    secondaryColor: '#0B1C2D',
    accentColor: '#F5A623',
    faFulltimeUrl: '',
    logoUrl: '',
  })

  const ageGroups = [
    'U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'Adult'
  ]

  function handleChange(e) {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  function applyColorPreset(preset) {
    setFormData(prev => ({
      ...prev,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent,
    }))
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview immediately
    const reader = new FileReader()
    reader.onload = (e) => setLogoPreview(e.target.result)
    reader.readAsDataURL(file)

    // Upload to server
    setUploadingLogo(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('logo', file)

      const response = await api.post('/teams/upload-logo', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setFormData(prev => ({
        ...prev,
        logoUrl: response.data.logoUrl
      }))
    } catch (error) {
      console.error('Logo upload failed:', error)
    } finally {
      setUploadingLogo(false)
    }
  }

  function removeLogo() {
    setLogoPreview(null)
    setFormData(prev => ({ ...prev, logoUrl: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function validatePromoCode() {
    if (!promoCode.trim()) return
    setPromoValidating(true)
    setPromoResult(null)
    try {
      const res = await api.post('/billing/validate-promo', { code: promoCode.trim() })
      setPromoResult(res.data)
    } catch (err) {
      setPromoResult({
        valid: false,
        message: err.response?.data?.message || 'Invalid or expired promo code'
      })
    } finally {
      setPromoValidating(false)
    }
  }

  function clearPromoCode() {
    setPromoCode('')
    setPromoResult(null)
  }

  function downloadTerms() {
    const termsText = `TOUCHLINE POLICIES
MoonBoots Consultancy UK Ltd

=====================================
TERMS OF SERVICE
Last updated: 17 February 2026
=====================================

These Terms of Service ("Terms") govern your access to and use of MoonBoots Sports(app.moonbootssports.com), operated by MoonBoots Consultancy UK Ltd ("we", "us", "our"), a company registered in England and Wales.

By accessing or using MoonBoots Sports, you agree to be bound by these Terms. If you are accepting these Terms on behalf of a football school or organisation, you represent that you have the authority to bind that organisation.

1. About MoonBoots Sports

MoonBoots Sports is an AI-powered coaching platform designed for school PE and sport. It provides session planning, pupil development insights, video analysis, and communication tools for coaches, schools, and parents.

MoonBoots Sports is a coaching support tool. It does not replace qualified coaching, medical advice, or safeguarding procedures. All coaching decisions remain the responsibility of the coach and school.

2. Account Types

Individual Coach Accounts
Individual coaches may create a personal account to access MoonBoots Sports features for their own coaching activities. Coaches are responsible for ensuring they hold appropriate coaching qualifications and DBS checks as required by their school and governing body.

School Accounts
Clubs may register for a school account, which enables multiple coaches and administrators to use MoonBoots Sports under a single organisation. Before a school account is activated:
- The school must designate a School Administrator with authority to accept these Terms
- The school must review and accept our Privacy Policy and Safeguarding Policy
- The school must confirm they hold a current safeguarding policy of their own
- The school must confirm they have an appointed School Welfare Officer
- The school must confirm all coaches using the platform hold appropriate DBS clearance
School accounts are not activated until these requirements are satisfied.

Parent/Guardian Access
Where a school enables parent communication features, parents and guardians may be granted limited access to view session plans, development updates, and school communications relating to their child. Parent access is managed by the school and subject to these Terms.

3. Acceptable Use

You agree to use MoonBoots Sports only for lawful purposes related to school PE and sport coaching and school management. You must not:
- Use the platform in any way that could harm, endanger, or negatively impact any child or young person
- Upload, share, or transmit any content that is abusive, offensive, discriminatory, or inappropriate
- Share login credentials or allow unauthorised individuals to access the platform
- Attempt to access data belonging to other users, schools, or organisations
- Use the platform to contact children or young people directly
- Use automated tools, scrapers, or bots to access the platform
- Reverse-engineer, decompile, or attempt to extract the source code

4. Content and Data

Your Content: You retain ownership of any content you upload to MoonBoots Sports. By uploading content, you grant us a limited licence to store, process, and display it within the platform.

AI-Generated Content: AI-generated content is provided as guidance only. You are responsible for reviewing all AI output before use and ensuring it is appropriate for your pupils' age, ability, and needs.

Data Processing: We process personal data in accordance with our Privacy Policy and UK GDPR.

5. Subscriptions and Payment

MoonBoots Sports operates on a subscription basis. Subscriptions renew automatically unless cancelled before the renewal date. You may cancel at any time through your account settings. Refunds are handled on a case-by-case basis within 14 days of initial subscription.

6. School Responsibilities

Clubs using MoonBoots Sports are responsible for:
- Ensuring all coaches and staff are appropriately vetted (DBS checked) and qualified
- Maintaining their own safeguarding policy in accordance with FA and local authority guidelines
- Obtaining appropriate consent from parents/guardians before any child's data is entered
- Appointing a School Administrator responsible for managing user access
- Removing access promptly for any individual who leaves the school
- Reporting safeguarding concerns through their own procedures and to the relevant authorities

7. Our Responsibilities

We are responsible for:
- Maintaining the security and availability of the platform
- Processing data in accordance with UK GDPR and our Privacy Policy
- Responding promptly to data access requests, deletion requests, and safeguarding concerns
- Conducting regular security reviews and maintaining appropriate technical safeguards

8. Safeguarding

Safeguarding children and young people is central to everything we do. Our full Safeguarding Policy forms part of these Terms. If you become aware of any safeguarding concern related to the use of MoonBoots Sports, contact us immediately at safeguarding@moonbootssports.com.

9. Limitation of Liability

MoonBoots Sports is provided "as is" without warranties of any kind. We are not liable for any decisions made based on AI-generated content, coaching outcomes, injuries, or incidents arising from use of the platform. Our total liability shall not exceed the fees paid by you in the 12 months preceding the claim. Nothing in these Terms excludes liability for death or personal injury caused by negligence, fraud, or any liability that cannot be excluded by law.

10. Termination

We may suspend or terminate your account if you breach these Terms. You may close your account at any time. If a school account is terminated, all associated coach and parent access will also be revoked.

11. Governing Law

These Terms are governed by the laws of England and Wales.

12. Contact

MoonBoots Consultancy UK Ltd
Email: hello@moonbootssports.com
Safeguarding concerns: safeguarding@moonbootssports.com


=====================================
PRIVACY POLICY
Last updated: 17 February 2026
=====================================

This Privacy Policy explains how MoonBoots Consultancy UK Ltd collects, uses, stores, and protects personal data through MoonBoots Sports(app.moonbootssports.com).

We are the data controller for personal data processed through MoonBoots Sports. We comply with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.

1. Data We Collect

Account Data: Name, email, password (encrypted), subscription and payment details, preferences.
Coach Data: Qualifications, school affiliation, session plans, video uploads.
School Data: School name, contact details, Welfare Officer details, safeguarding compliance.
Pupil Data: First name, age group, position, development notes, attendance, performance observations.
Parent/Guardian Data: Name, email, relationship to pupil, communication preferences.
Technical Data: IP address, browser type, pages visited, session duration.

2. How We Use Your Data

We use data to provide the service, process payments, generate AI coaching suggestions, manage school administration, ensure platform security, and comply with legal obligations. We do not sell, rent, or trade personal data.

3. Children's Data

- Pupil data is only entered by coaches or school administrators, never by children
- Children do not create accounts or access the platform directly
- Clubs must obtain parental/guardian consent before entering any child's data
- We do not use children's data for marketing or to train AI models
- Parents may request access, correction, or deletion of their child's data at any time

4. Data Sharing

We share data only with: service providers (under data processing agreements), within a school (role-based access), where required by law, and for safeguarding purposes.

5. Data Retention

Active account data: Duration of account plus 30 days
Pupil data: Duration of school membership plus 12 months
Video uploads: Duration of account plus 30 days
Payment records: 7 years (legal requirement)
Technical logs: 12 months

6. Your Rights

Under UK GDPR: access, rectification, erasure, restriction, portability, objection, and withdrawal of consent. Contact: privacy@moonbootssports.com. Response within 30 days. Complaints to the ICO at ico.org.uk.

7. AI and Automated Processing

AI-generated content is always presented as suggestions. No decisions about a pupil are made solely by AI. We do not use personal data about individual pupils to train AI models.

8. Contact

Privacy enquiries: privacy@moonbootssports.com
Safeguarding concerns: safeguarding@moonbootssports.com
General: hello@moonbootssports.com


=====================================
SAFEGUARDING POLICY
Last updated: 17 February 2026
=====================================

The safety and wellbeing of children and young people is the highest priority at MoonBoots Sports.

MoonBoots Sports is a coaching support platform. It does not replace a school's own safeguarding procedures, the role of the School Welfare Officer, or the responsibilities of coaches and parents.

1. Our Principles

- The welfare of children is paramount in everything we do
- All children have the right to protection from abuse
- All concerns and allegations will be taken seriously and responded to promptly
- We are guided by The FA's Safeguarding Policy, the Children Act 1989 and 2004

2. How MoonBoots SportsProtects Children

- Children never access the platform directly
- We collect the minimum data necessary about young pupils
- Pupil data is only visible to authorised coaches and administrators
- No direct messaging to children is possible
- Video and images are stored securely with restricted access
- All AI content is reviewed by the coach before use

3. School Requirements

Before activation, schools must confirm: current safeguarding policy, appointed School Welfare Officer, DBS clearance for all coaches, FA Safeguarding Children training, and parental consent procedures.

4. Reporting Concerns

If you have a safeguarding concern about a child, follow your school's procedures and contact your School Welfare Officer. If a child is in immediate danger, contact the police (999).

You can also contact:
- The FA Safeguarding Team: 0800 169 1863
- NSPCC Helpline: 0808 800 5000
- Childline: 0800 1111

MoonBoots Sports concerns: safeguarding@moonbootssports.com

5. Contact

Safeguarding concerns: safeguarding@moonbootssports.com
General enquiries: hello@moonbootssports.com


=====================================
COOKIE POLICY
Last updated: 17 February 2026
=====================================

Cookies are small text files stored on your device when you visit a website. We use the minimum cookies necessary to make MoonBoots Sports work properly.

Essential Cookies (always active):
- Session token: Keeps you logged in
- CSRF token: Protects against cross-site attacks
- Preferences: Remembers your display settings (12 months)

Analytics (anonymised):
We collect anonymised usage data to understand how the platform is used. This data cannot identify you personally.

Cookies We Don't Use:
- No advertising or marketing cookies
- No third-party tracking cookies
- No social media cookies
- No cookies that track you across other websites

Managing Cookies: You can control cookies through your browser settings. Blocking essential cookies will prevent MoonBoots Sports from working properly.

Contact: hello@moonbootssports.com


=====================================
ARTIFICIAL INTELLIGENCE POLICY
Last updated: 17 February 2026
=====================================

MoonBoots Sports uses artificial intelligence to support school PE and sport coaches with session planning, pupil development insights, and video analysis.

We believe AI should enhance coaching, not replace it. Every AI feature in MoonBoots Sports is designed to support the coach's judgement, never to override it.

1. How AI is Used

- Session Planning: AI generates training session suggestions based on coach inputs (age group, objectives, ability level, equipment), tailored to FA coaching frameworks.
- Pupil Development Insights: AI identifies patterns in coaching observations and suggests focus areas.
- Video Analysis: AI assists with tactical observations (positioning, movement, set-pieces). AI does not identify children by name; this is done by the coach.
- Content Generation: AI drafts parent communications, session summaries, and development reports for coach review.

2. What AI Does Not Do

- AI does not make decisions about children (selection, ranking, welfare assessments, playing time)
- AI does not communicate with children (no chatbot or interactive element for children)
- AI does not communicate with parents directly (all communications reviewed and sent by coach)
- AI does not process sensitive personal data (health, behavioural, sensitive category data)
- AI does not make safeguarding assessments
- AI does not replace coaching qualifications

3. Human Oversight

- All AI content is presented as suggestions for coach review before use
- Coaches can modify, reject, or rewrite any AI suggestion
- AI does not trigger any action without explicit human input
- Coaches can flag unhelpful or inappropriate suggestions

4. Data and AI Training

- AI uses only information the coach has provided within their account
- Individual pupil data is never used to train AI models
- School data is never shared between schools
- Video footage is not used for AI training
- AI improvements are based on anonymised, aggregated usage patterns only

5. Third-Party AI Services

- Only minimum necessary information is transmitted to AI service providers
- No children's names or PII included in prompts sent to third-party services
- All data transmission is encrypted
- Data processing agreements in place with all providers
- Providers contractually prohibited from using our data to train their models

6. Age-Appropriate Content

- Session plans respect FA guidelines for each age group
- Development language is positive and growth-focused
- AI does not generate content that pressures children or prioritises results over development
- Content follows FA Pupil Development Model principles

7. Accuracy and Limitations

- AI can make mistakes; coaches must always review before use
- AI does not know your pupils personally; your judgement takes priority
- AI cannot assess physical readiness or provide medical advice

8. Transparency

- AI-generated content is clearly labelled within the platform
- Coaches are informed during onboarding about AI use and limitations
- Significant changes to AI use are communicated to all users

9. Accountability

Email: hello@moonbootssports.com
Safeguarding concerns involving AI: safeguarding@moonbootssports.com

10. Review

This AI Policy is reviewed annually and whenever new AI features are introduced or AI service providers change.
`
    const blob = new Blob([termsText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'MoonBoots-Sports-Policies.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const totalSteps = 4

  async function handleSubmit(e) {
    e.preventDefault()

    if (step === 1) {
      // Account type selection - handled by button clicks, not form submit
      return
    }

    if (step === 2) {
      setStep(3)
      return
    }

    if (step === 3) {
      // Auto-generate hub name if not set
      if (!formData.hubName) {
        setFormData(prev => ({
          ...prev,
          hubName: `${prev.teamName} ${prev.ageGroup} Hub`
        }))
      }
      setStep(4)
      return
    }

    setLoading(true)

    const registrationData = {
      ...formData,
      accountType,
      hubName: formData.hubName || `${formData.teamName} ${formData.ageGroup} Hub`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...(promoResult?.valid ? { promoCode: promoCode.trim() } : {}),
      ...(accountType === 'school' ? { clubName: formData.clubName, dpaAccepted } : {}),
    }

    const result = await register(registrationData)

    if (result.success) {
      if (result.school?.slug) {
        navigate(`/school/${result.school.slug}/billing`)
      } else {
        navigate('/pricing')
      }
    }

    setLoading(false)
  }

  function selectAccountType(type) {
    setAccountType(type)
    setStep(2)
  }

  function goBack() {
    setStep(prev => prev - 1)
  }

  // Preview of the hub branding
  function BrandingPreview() {
    const hubName = formData.hubName || `${formData.teamName || 'Your Team'} ${formData.ageGroup} Hub`

    return (
      <div
        className="rounded-xl p-6 border"
        style={{
          backgroundColor: formData.secondaryColor,
          borderColor: formData.primaryColor + '40'
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          {logoPreview ? (
            <img
              src={logoPreview}
              alt="Team logo"
              className="w-12 h-12 rounded-xl object-cover"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: formData.primaryColor }}
            >
              {(formData.teamName || 'T').charAt(0)}
            </div>
          )}
          <div>
            <p className="text-white font-display font-bold">{hubName}</p>
            <p className="text-sm" style={{ color: formData.primaryColor }}>
              {formData.ageGroup} • {(() => { const m = new Date().getMonth(); const y = new Date().getFullYear(); return m >= 7 ? `${y}/${String(y+1).slice(2)}` : `${y-1}/${String(y).slice(2)}`; })()} Season
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div
            className="p-3 rounded-lg text-center text-xs font-medium"
            style={{ backgroundColor: formData.primaryColor, color: formData.secondaryColor }}
          >
            Fixtures
          </div>
          <div
            className="p-3 rounded-lg text-center text-xs font-medium"
            style={{ backgroundColor: formData.primaryColor + '20', color: formData.primaryColor }}
          >
            Squad
          </div>
          <div
            className="p-3 rounded-lg text-center text-xs font-medium"
            style={{ backgroundColor: formData.accentColor, color: formData.secondaryColor }}
          >
            Table
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page flex">
      <SEO
        title="Register"
        path="/register"
        description="Create your free MoonBoots Sports account. The multi-sport platform for school PE departments - curriculum PE, extra-curricular sport, and AI coaching."
      />
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--mb-gold)' }}>
              <span className="text-sm font-bold" style={{ color: 'var(--mb-navy)', fontFamily: 'Poppins, system-ui, sans-serif' }}>M</span>
            </div>
            <span className="font-bold text-primary text-xl" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>MoonBoots Sports</span>
          </Link>

          <h1 className="font-display text-3xl font-bold text-white mb-2">
            {step === 1 ? 'Get started' : step === 2 ? 'Create your account' : step === 3 ? (accountType === 'school' ? 'Set up your school' : 'Set up your team') : 'Customize your hub'}
          </h1>
          <p className="text-secondary mb-8">
            {step === 1
              ? 'What are you setting up?'
              : step === 2
              ? 'Create your free account'
              : step === 3
              ? (accountType === 'school' ? 'Tell us about your school and first team' : 'Tell us about your team')
              : 'Make it yours with custom branding'
            }
          </p>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${step >= i + 1 ? 'bg-pitch-500' : 'bg-border-default'}`} />
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => selectAccountType('team')}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all hover:border-pitch-500 ${
                    accountType === 'team' ? 'border-pitch-500 bg-pitch-500/10' : 'border-border-strong bg-card/50 hover:bg-subtle'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-pitch-500/20 flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-pitch-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">A Team</p>
                      <p className="text-secondary text-sm">I coach a single team and want to manage pupils, sessions, and fixtures</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-tertiary ml-auto flex-shrink-0" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => selectAccountType('school')}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all hover:border-amber-500 ${
                    accountType === 'school' ? 'border-amber-500 bg-amber-500/10' : 'border-border-strong bg-card/50 hover:bg-subtle'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">A School</p>
                      <p className="text-secondary text-sm">I run a school with multiple teams and want to manage payments, guardians, and registrations</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-tertiary ml-auto flex-shrink-0" />
                  </div>
                </button>
              </div>
            )}

            {step === 2 && (
              <>
                <div>
                  <label htmlFor="name" className="label">Your Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      className="input pl-10"
                      placeholder="John Smith"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="label">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="input pl-10"
                      placeholder="coach@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="label">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="input pl-10"
                      placeholder="••••••••"
                      minLength={8}
                      required
                    />
                  </div>
                  <p className="text-xs text-tertiary mt-1">Minimum 8 characters</p>
                </div>

                {/* Terms Agreement */}
                <div className="mt-6 p-4 bg-card/50 rounded-xl border border-border-default">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setAgreedToTerms(!agreedToTerms)}
                      className={`
                        mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
                        ${agreedToTerms
                          ? 'bg-pitch-500 border-pitch-500'
                          : 'border-border-strong hover:border-navy-500'
                        }
                      `}
                    >
                      {agreedToTerms && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <div className="flex-1">
                      <p className="text-sm text-secondary">
                        I agree to the{' '}
                        <Link
                          to="/terms"
                          target="_blank"
                          className="text-pitch-400 hover:text-pitch-300 underline"
                        >
                          Terms of Service, Privacy Policy, Safeguarding Policy, and AI Policy
                        </Link>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={downloadTerms}
                    className="mt-3 flex items-center gap-2 text-xs text-secondary hover:text-secondary transition-colors"
                  >
                    <FileDown className="w-4 h-4" />
                    Download policies
                  </button>
                </div>

                {/* Promo Code */}
                {!showPromoInput ? (
                  <button
                    type="button"
                    onClick={() => setShowPromoInput(true)}
                    className="flex items-center gap-2 text-sm text-secondary hover:text-pitch-400 transition-colors"
                  >
                    <Ticket className="w-4 h-4" />
                    Have a promo code?
                  </button>
                ) : (
                  <div className="p-4 bg-card/50 rounded-xl border border-border-default">
                    <label className="label">Promo Code <span className="text-tertiary">(optional)</span></label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" />
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => {
                            setPromoCode(e.target.value.toUpperCase())
                            if (promoResult) setPromoResult(null)
                          }}
                          className="input pl-10 uppercase"
                          placeholder="Enter code"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              validatePromoCode()
                            }
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={validatePromoCode}
                        disabled={promoValidating || !promoCode.trim()}
                        className="px-4 py-2 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        {promoValidating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Apply'
                        )}
                      </button>
                    </div>
                    {promoResult && (
                      <div className={`mt-2 flex items-center gap-2 text-sm ${promoResult.valid ? 'text-pitch-400' : 'text-red-400'}`}>
                        {promoResult.valid ? (
                          <>
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            <span>
                              {promoResult.discount_type === 'free'
                                ? 'Free access applied!'
                                : promoResult.discount_type === 'percentage'
                                ? `${promoResult.discount_value}% discount applied!`
                                : `£${promoResult.discount_value} discount applied!`}
                              {promoResult.description && ` - ${promoResult.description}`}
                            </span>
                            <button type="button" onClick={clearPromoCode} className="ml-auto text-secondary hover:text-white">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{promoResult.message}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {step === 3 && (
              <>
                {accountType === 'school' && (
                  <div>
                    <label htmlFor="clubName" className="label">School Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" />
                      <input
                        id="clubName"
                        name="clubName"
                        type="text"
                        value={formData.clubName}
                        onChange={handleChange}
                        className="input pl-10"
                        placeholder="Morley FC"
                        required
                      />
                    </div>
                    <p className="text-xs text-tertiary mt-1">The name of your school - teams sit under this</p>
                  </div>
                )}

                <div>
                  <label htmlFor="teamName" className="label">{accountType === 'school' ? 'First Team Name' : 'Team Name'}</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" />
                    <input
                      id="teamName"
                      name="teamName"
                      type="text"
                      value={formData.teamName}
                      onChange={handleChange}
                      className="input pl-10"
                      placeholder="Morley Youth F.C."
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="ageGroup" className="label">Age Group</label>
                  <select
                    id="ageGroup"
                    name="ageGroup"
                    value={formData.ageGroup}
                    onChange={handleChange}
                    className="input"
                  >
                    {ageGroups.map(age => (
                      <option key={age} value={age}>{age}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Team Format</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 11, label: '11-a-side' },
                      { value: 9, label: '9-a-side' },
                      { value: 7, label: '7-a-side' },
                      { value: 5, label: '5-a-side' },
                    ].map(format => (
                      <button
                        key={format.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, teamFormat: format.value }))}
                        className={`
                          py-2.5 rounded-lg text-sm font-medium transition-all border-2
                          ${formData.teamFormat === format.value
                            ? 'bg-pitch-600 border-pitch-500 text-white'
                            : 'bg-subtle border-border-strong text-secondary hover:text-white hover:border-border-strong'
                          }
                        `}
                      >
                        {format.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="faFulltimeUrl" className="label">
                    FA Full-Time URL <span className="text-tertiary">(optional)</span>
                  </label>
                  <div className="relative">
                    <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" />
                    <input
                      id="faFulltimeUrl"
                      name="faFulltimeUrl"
                      type="url"
                      value={formData.faFulltimeUrl}
                      onChange={handleChange}
                      className="input pl-10"
                      placeholder="https://fulltime.thefa.com/..."
                    />
                  </div>
                  <p className="text-xs text-tertiary mt-1">Link to your league page for fixtures & table sync</p>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div>
                  <label htmlFor="hubName" className="label">Hub Name</label>
                  <div className="relative">
                    <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" />
                    <input
                      id="hubName"
                      name="hubName"
                      type="text"
                      value={formData.hubName}
                      onChange={handleChange}
                      className="input pl-10"
                      placeholder={`${formData.teamName} ${formData.ageGroup} Hub`}
                    />
                  </div>
                  <p className="text-xs text-tertiary mt-1">This will be displayed as your team's hub name</p>
                </div>

                <div>
                  <label className="label">School Logo <span className="text-tertiary">(optional)</span></label>
                  <div className="flex items-center gap-3">
                    {logoPreview ? (
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-16 h-16 rounded-xl object-cover border border-border-strong"
                        />
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-16 h-16 rounded-xl border-2 border-dashed border-border-strong flex flex-col items-center justify-center cursor-pointer hover:border-pitch-500 transition-colors">
                        {uploadingLogo ? (
                          <Loader2 className="w-6 h-6 text-secondary animate-spin" />
                        ) : (
                          <>
                            <Image className="w-6 h-6 text-secondary" />
                          </>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                    <div className="text-xs text-secondary">
                      <p>Upload your school badge or logo</p>
                      <p>PNG, JPG, SVG (max 2MB)</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">Color Scheme</label>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {colorPresets.map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyColorPreset(preset)}
                        className={`
                          h-10 rounded-lg border-2 transition-all relative overflow-hidden
                          ${formData.primaryColor === preset.primary
                            ? 'border-white scale-105'
                            : 'border-transparent hover:border-border-strong'
                          }
                        `}
                        title={preset.name}
                      >
                        <div className="absolute inset-0 flex">
                          <div className="w-1/2" style={{ backgroundColor: preset.primary }} />
                          <div className="w-1/2" style={{ backgroundColor: preset.secondary }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label text-xs">Primary</label>
                    <div className="relative">
                      <input
                        type="color"
                        name="primaryColor"
                        value={formData.primaryColor}
                        onChange={handleChange}
                        className="w-full h-10 rounded-lg cursor-pointer border border-border-strong"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label text-xs">Background</label>
                    <div className="relative">
                      <input
                        type="color"
                        name="secondaryColor"
                        value={formData.secondaryColor}
                        onChange={handleChange}
                        className="w-full h-10 rounded-lg cursor-pointer border border-border-strong"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label text-xs">Accent</label>
                    <div className="relative">
                      <input
                        type="color"
                        name="accentColor"
                        value={formData.accentColor}
                        onChange={handleChange}
                        className="w-full h-10 rounded-lg cursor-pointer border border-border-strong"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="label text-xs text-tertiary">Preview</label>
                  <BrandingPreview />
                </div>

                {accountType === 'school' && (
                  <div className="mt-6 p-4 bg-card/50 rounded-xl border border-border-default space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-amber-400" />
                      <h2 className="text-sm font-semibold text-white">Data Processing Agreement</h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowDpa(!showDpa)}
                      className="flex items-center justify-between w-full text-left px-3 py-2 bg-subtle rounded-lg text-sm text-secondary hover:bg-border-default transition-colors"
                    >
                      <span>Read the Data Processing Agreement</span>
                      {showDpa ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showDpa && (
                      <div className="bg-subtle rounded-lg p-4 text-xs text-secondary space-y-3 max-h-60 overflow-y-auto border border-border-strong">
                        <h3 className="font-semibold text-white text-sm">Data Processing Agreement (DPA) - v1.0</h3>
                        <p>This Data Processing Agreement ("DPA") forms part of the agreement between MoonBoots Sports ("Processor") and the School ("Controller") for the use of the MoonBoots Sports platform.</p>
                        <h4 className="font-medium text-primary">1. Roles & Responsibilities</h4>
                        <p>The School acts as the <strong className="text-primary">Data Controller</strong> under UK GDPR. MoonBoots Sports acts as a<strong className="text-primary">Data Processor</strong>, processing data solely on the School's instructions.</p>
                        <h4 className="font-medium text-primary">2. Data Processed</h4>
                        <p>Pupil names, dates of birth, medical information, emergency contacts, photographs, identity documents, guardian contact details, payment information (via Stripe), and consent records.</p>
                        <h4 className="font-medium text-primary">3. School Obligations</h4>
                        <p>Ensure lawful basis for processing, respond to DSARs within 30 days, report breaches to the ICO within 72 hours, and inform guardians about data processing.</p>
                        <h4 className="font-medium text-primary">4. MoonBoots SportsObligations</h4>
                        <p>Process data only as instructed, implement security measures, not transfer data outside UK/EEA, assist with DSARs, and delete data upon account termination.</p>
                        <h4 className="font-medium text-primary">5. Security & Retention</h4>
                        <p>Data retained while account is active, deleted within 30 days of closure. HTTPS/TLS encryption, JWT authentication, role-based access controls.</p>
                      </div>
                    )}

                    <label className="flex items-start gap-3 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => setDpaAccepted(!dpaAccepted)}
                        className={`
                          mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
                          ${dpaAccepted
                            ? 'bg-amber-500 border-amber-500'
                            : 'border-border-strong hover:border-navy-500'
                          }
                        `}
                      >
                        {dpaAccepted && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <span className="text-xs text-secondary">
                        I confirm that I am authorised to act on behalf of this school and I accept the Data Processing Agreement. I understand that the school is the Data Controller.
                      </span>
                    </label>
                  </div>
                )}
              </>
            )}

            {step > 1 && (
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={goBack}
                  className="btn-secondary"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading || (step === 2 && !agreedToTerms) || (step === 4 && accountType === 'school' && !dpaAccepted)}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {step === 4 ? (accountType === 'school' ? 'Create School' : 'Create Hub') : 'Continue'}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </form>

          <p className="text-center text-secondary mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-pitch-400 hover:text-pitch-300">Sign in</Link>
          </p>
        </motion.div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-navy-900 via-navy-900 to-pitch-950/30 border-l border-border-default relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-pitch-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />

        <div className="relative z-10 px-12 max-w-lg">
          {step === 4 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8"
            >
              <BrandingPreview />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative mb-10"
            >
              {/* Step-specific illustration */}
              {step <= 2 ? (
                <svg viewBox="0 0 320 200" className="w-full h-auto drop-shadow-2xl">
                  <defs>
                    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1E9550" />
                      <stop offset="100%" stopColor="#0A3A1F" />
                    </linearGradient>
                  </defs>

                  {/* Card background */}
                  <rect x="40" y="30" width="240" height="140" rx="12" fill="url(#cardGrad)" />
                  <rect x="40" y="30" width="240" height="140" rx="12" fill="none" stroke="#2ED573" strokeWidth="1" opacity="0.3" />

                  {/* MoonBoots Sports logo mark */}
                  <g transform="translate(60, 55)">
                    <path d="M8 20 C16 8, 32 8, 40 20" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" fill="none" />
                    <line x1="4" y1="20" x2="44" y2="20" stroke="#2ED573" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="24" cy="20" r="4" fill="#2ED573" />
                  </g>

                  {/* Trial badge */}
                  <rect x="180" y="50" width="80" height="28" rx="14" fill="#F5A623" />
                  <text x="220" y="69" textAnchor="middle" fill="#0B1C2D" fontSize="12" fontWeight="bold">FREE</text>

                  {/* Feature lines */}
                  <g fill="#2ED573" opacity="0.6">
                    <rect x="60" y="95" width="120" height="6" rx="3" />
                    <rect x="60" y="110" width="80" height="6" rx="3" />
                    <rect x="60" y="125" width="100" height="6" rx="3" />
                  </g>

                  {/* Check marks */}
                  {[[200, 95], [200, 110], [200, 125]].map(([x, y], i) => (
                    <motion.g
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    >
                      <circle cx={x} cy={y + 3} r="8" fill="#2ED573" opacity="0.2" />
                      <path d={`M${x - 3} ${y + 3} l2 2 l4 -4`} stroke="#2ED573" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </motion.g>
                  ))}
                </svg>
              ) : (
                <svg viewBox="0 0 320 200" className="w-full h-auto drop-shadow-2xl">
                  <defs>
                    <linearGradient id="hubGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0E1F30" />
                      <stop offset="100%" stopColor="#0B1C2D" />
                    </linearGradient>
                  </defs>

                  {/* Hub card */}
                  <rect x="30" y="20" width="260" height="160" rx="12" fill="url(#hubGrad)" stroke="#2ED573" strokeWidth="1" opacity="0.8" />

                  {/* Header area */}
                  <rect x="30" y="20" width="260" height="50" rx="12" fill="#2ED573" opacity="0.1" />
                  <circle cx="60" cy="45" r="15" fill="#2ED573" />
                  <text x="60" y="50" textAnchor="middle" fill="#0B1C2D" fontSize="14" fontWeight="bold">T</text>
                  <rect x="85" y="38" width="80" height="8" rx="4" fill="#ffffff" opacity="0.8" />
                  <rect x="85" y="52" width="50" height="6" rx="3" fill="#2ED573" opacity="0.6" />

                  {/* Feature cards */}
                  {[
                    { x: 45, icon: 'M', label: 'Fixtures' },
                    { x: 125, icon: 'S', label: 'Squad' },
                    { x: 205, icon: 'T', label: 'Table' },
                  ].map(({ x, icon, label }, i) => (
                    <motion.g
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    >
                      <rect x={x} y="85" width="60" height="70" rx="8" fill="#0E1F30" stroke="#2ED573" strokeWidth="0.5" opacity="0.5" />
                      <circle cx={x + 30} cy="110" r="12" fill="#2ED573" opacity="0.2" />
                      <text x={x + 30} y="115" textAnchor="middle" fill="#2ED573" fontSize="12" fontWeight="bold">{icon}</text>
                      <text x={x + 30} y="142" textAnchor="middle" fill="#ffffff" fontSize="9" opacity="0.7">{label}</text>
                    </motion.g>
                  ))}
                </svg>
              )}
            </motion.div>
          )}

          {/* Heading */}
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-8"
          >
            <h2 className="font-display text-2xl font-bold text-white mb-3">
              {step <= 2 ? 'Start Free Today' : step === 3 ? (accountType === 'school' ? 'Your School Hub' : 'Your Team Hub') : 'Your Brand'}
            </h2>
            <p className="text-secondary">
              {step <= 2
                ? 'No credit card required. Full access to all features.'
                : step === 3
                ? (accountType === 'school' ? 'Manage multiple teams from one place' : 'Everything your team needs in one place')
                : 'Customize your hub to match your identity'
              }
            </p>
          </motion.div>

          {/* Feature highlights based on step */}
          <motion.div
            key={`features-${step}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 gap-4"
          >
            {(step <= 2 ? [
                { icon: Shield, label: 'Safeguarding Built-in', color: 'pitch' },
                { icon: Sparkles, label: 'AI-Powered Tools', color: 'amber' },
                { icon: Users, label: 'Parent Portal', color: 'pitch' },
                { icon: MessageSquare, label: 'Team Messaging', color: 'amber' },
              ] : step === 3 ? (accountType === 'school' ? [
                { icon: Building2, label: 'Multi-Team Management', color: 'amber' },
                { icon: Users, label: 'Pupil Registrations', color: 'pitch' },
                { icon: Shield, label: 'School Payments', color: 'amber' },
                { icon: Calendar, label: 'All Teams, One Place', color: 'pitch' },
              ] : [
                { icon: Calendar, label: 'Match Fixtures', color: 'pitch' },
                { icon: Users, label: 'Squad Management', color: 'amber' },
                { icon: MessageSquare, label: 'Availability', color: 'pitch' },
                { icon: ExternalLink, label: 'FA Full-Time Sync', color: 'amber' },
              ]) : [
                { icon: Image, label: 'School Logo', color: 'pitch' },
                { icon: Sparkles, label: 'Custom Colors', color: 'amber' },
                { icon: Users, label: 'Team Identity', color: 'pitch' },
                { icon: Shield, label: 'Professional Look', color: 'amber' },
              ]
            ).map(({ icon: Icon, label, color }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-subtle border border-border-strong/50"
              >
                <div className={`w-8 h-8 rounded-md bg-${color}-500/20 flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 text-${color}-400`} />
                </div>
                <span className="text-sm text-primary font-medium">{label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
