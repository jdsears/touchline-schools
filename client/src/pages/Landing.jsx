import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import SEO from '../components/common/SEO'
import { GraduationCap, Trophy, Users, Check } from 'lucide-react'

const CALENDLY_URL = import.meta.env.VITE_CALENDLY_URL || 'https://calendly.com/js-moonbootsconsultancy/moonboots-sports-demo'

function GoldDivider() {
  return <div style={{ width: 60, height: 2, background: 'var(--mb-gold)', margin: '20px 0' }} />
}

function PrimaryButton({ href, to, children, className = '', fullWidth = false }) {
  const style = {
    background: 'var(--mb-gold)',
    color: 'var(--mb-navy)',
    padding: '12px 24px',
    border: 'none',
    borderRadius: 4,
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    fontSize: 15,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
    transition: 'background 0.15s ease',
    width: fullWidth ? '100%' : 'auto',
    textAlign: 'center',
  }
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" style={style} className={className}>{children}</a>
  if (to) return <Link to={to} style={style} className={className}>{children}</Link>
  return <button style={style} className={className}>{children}</button>
}

function SecondaryButton({ href, to, children, className = '' }) {
  const style = {
    background: 'transparent',
    color: 'var(--mb-gold)',
    padding: '12px 24px',
    border: '1.5px solid var(--mb-gold)',
    borderRadius: 4,
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    fontSize: 15,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
    transition: 'all 0.15s ease',
    textAlign: 'center',
  }
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" style={style} className={className}>{children}</a>
  if (to) return <Link to={to} style={style} className={className}>{children}</Link>
  return <button style={style} className={className}>{children}</button>
}

function FadeInSection({ children, className = '' }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.4s ease-out, transform 0.4s ease-out',
      }}
    >
      {children}
    </div>
  )
}

// Section 1: Sticky Header
function Header() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: scrolled ? 'rgba(15, 30, 61, 0.95)' : 'var(--mb-navy)',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        transition: 'background 0.2s ease, backdrop-filter 0.2s ease',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/moonboots-sports-logo-white.svg" alt="MoonBoots Sports" style={{ height: 32 }} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link to="/about" style={{ color: 'var(--mb-warm-white)', textDecoration: 'none', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, opacity: 0.9 }}>About</Link>
          <PrimaryButton href={CALENDLY_URL}>Book a discovery call</PrimaryButton>
        </div>
      </div>
    </header>
  )
}

// Section 2: Hero
function Hero() {
  return (
    <section style={{ background: 'var(--mb-navy)', minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: 80 }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px' }}>
        <p style={{ color: 'var(--mb-gold)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 }}>
          MOONBOOTS SPORTS
        </p>
        <GoldDivider />
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(40px, 6vw, 64px)', color: 'white', fontWeight: 700, lineHeight: 1.1, margin: '24px 0 0' }}>
          The PE department platform<br />for UK schools.
        </h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(17px, 2.5vw, 22px)', color: 'rgba(250, 250, 247, 0.85)', lineHeight: 1.5, marginTop: 32, maxWidth: 700 }}>
          Curriculum PE and school sport, in one bespoke platform per school.
          Branded to your crest. Designed around how your PE department actually works.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 32 }}>
          <PrimaryButton href={CALENDLY_URL}>Book a discovery call</PrimaryButton>
          <SecondaryButton to="/request-demo">Request demo access</SecondaryButton>
        </div>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'rgba(250, 250, 247, 0.6)', marginTop: 24 }}>
          Bespoke deployments for primary, prep, secondary, all-through, and multi-academy trusts.
        </p>
      </div>
    </section>
  )
}

// Section 3: Three Pillars
function Pillar({ icon: Icon, heading, body, bullets }) {
  return (
    <FadeInSection style={{ flex: '1 1 300px' }}>
      <div style={{ padding: '32px 0' }}>
        <Icon size={32} color="var(--mb-navy)" strokeWidth={1.5} />
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--mb-navy)', fontWeight: 600, marginTop: 16 }}>
          {heading}
        </h3>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: '#444', lineHeight: 1.7, marginTop: 14 }}>
          {body}
        </p>
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 20 }}>
          {bullets.map((b, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 10, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--mb-navy)' }}>
              <Check size={16} color="var(--mb-gold)" style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </FadeInSection>
  )
}

function ThreePillars() {
  return (
    <section style={{ background: 'var(--mb-warm-white)', padding: '80px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48 }}>
          <Pillar
            icon={GraduationCap}
            heading="Curriculum PE"
            body="Teaching groups, sport units mapped to curriculum areas, school-defined assessment, AI-drafted reports. Every PE lesson logged, every pupil assessed, every report ready when reporting windows open."
            bullets={[
              'Teaching groups by year group and key stage',
              'Assessment grid against National Curriculum strands',
              'AI-drafted report comments from real assessment data',
            ]}
          />
          <Pillar
            icon={Trophy}
            heading="Extra-Curricular Sport"
            body="Every team, every fixture, every training session, in one place. AI session planning aligned to the FA, RFU, ECB, England Hockey, and England Netball published frameworks. Match preparation, video analysis, and tactics boards built in."
            bullets={[
              'Cross-team dashboard for Heads of Department',
              'Sport-specific AI session generation, NGB-aligned',
              'Video analysis with pupil tagging and tactical breakdown',
            ]}
          />
          <Pillar
            icon={Users}
            heading="Pupil Development"
            body="One profile per pupil, covering every sport they play and every PE strand they study. A complete development journey from Year 2 through Year 13, visible to teachers, pupils, and parents."
            bullets={[
              'Individual Development Plans across every sport',
              'Pupil portal showing curriculum and team feedback together',
              'SEND-adapted assessment and goal setting',
            ]}
          />
        </div>
      </div>
    </section>
  )
}

// Section 4: Whitelabel
function Whitelabel() {
  return (
    <FadeInSection>
      <section style={{ background: 'var(--mb-navy)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 64, alignItems: 'center' }}>
          <div style={{ flex: '1 1 400px' }}>
            <p style={{ color: 'var(--mb-gold)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase' }}>
              WHITELABEL
            </p>
            <GoldDivider />
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 4vw, 44px)', color: 'white', fontWeight: 700, lineHeight: 1.15, marginTop: 16 }}>
              Branded to your school.
            </h2>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'rgba(250, 250, 247, 0.85)', lineHeight: 1.7, marginTop: 24 }}>
              <p>Every MoonBoots Sports deployment is yours. Your crest on the login screen. Your colours throughout the interface. Your school's name in every email and every report.</p>
              <p style={{ marginTop: 16 }}>When pupils install the platform on their phones, they see your crest, not ours. This is not a SaaS skin. It is your school's platform, built on our engine.</p>
            </div>
          </div>
          <div style={{ flex: '1 1 360px', display: 'flex', gap: 16, justifyContent: 'center' }}>
            {/* PLACEHOLDER: replace with real per-school whitelabel mockups before v1.6 polish pass */}
            <div style={{ width: 160, height: 280, borderRadius: 12, border: '1px solid rgba(201, 169, 97, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, background: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 20 }}>A</span>
              </div>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'rgba(250, 250, 247, 0.6)', textAlign: 'center' }}>Your School</span>
              <div style={{ width: '100%', height: 4, background: '#1B4332', borderRadius: 2 }} />
              <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }} />
              <div style={{ width: '80%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }} />
            </div>
            <div style={{ width: 160, height: 280, borderRadius: 12, border: '1px solid rgba(201, 169, 97, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, background: '#1E3A5F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 20 }}>B</span>
              </div>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'rgba(250, 250, 247, 0.6)', textAlign: 'center' }}>Another School</span>
              <div style={{ width: '100%', height: 4, background: '#1E3A5F', borderRadius: 2 }} />
              <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }} />
              <div style={{ width: '80%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }} />
            </div>
          </div>
        </div>
      </section>
    </FadeInSection>
  )
}

// Section 5: NGB Alignment
const NGB_DATA = [
  { name: 'FA', framework: '4 Corner Model and England DNA' },
  { name: 'RFU', framework: 'Age-Grade Rugby Laws' },
  { name: 'ECB', framework: 'Inspiring Generations and bowling directives' },
  { name: 'ENGLAND HOCKEY', framework: 'Player Pathway' },
  { name: 'ENGLAND NETBALL', framework: 'High 5 and Pathway' },
]

function NGBAlignment() {
  return (
    <FadeInSection>
      <section style={{ background: 'var(--mb-warm-white)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ color: 'var(--mb-gold)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase' }}>
            NGB-ALIGNED AI
          </p>
          <GoldDivider />
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 4vw, 36px)', color: 'var(--mb-navy)', fontWeight: 700, lineHeight: 1.2, marginTop: 16 }}>
            Sport-aware AI, aligned to the people who set the standards.
          </h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: '#444', lineHeight: 1.7, marginTop: 24 }}>
            The AI coaching assistant in MoonBoots Sports is sport-specific, not sport-agnostic.
            Each of the core team sports is wired with the published development framework
            of its national governing body.
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: '#444', lineHeight: 1.7, marginTop: 16 }}>
            Ask for a Year 7 rugby session and you get RFU Age-Grade-aligned progression.
            Ask for an Under-9 cricket net and you get ECB-mandated over limits.
            Ask for an Under-11 netball drill and you get High 5 format principles
            with mandatory position rotation.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 40 }}>
            {NGB_DATA.map((ngb) => (
              <div key={ngb.name} style={{ flex: '1 1 150px', minWidth: 140 }}>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--mb-gold)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
                  {ngb.name}
                </p>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#555', lineHeight: 1.5 }}>
                  {ngb.framework}
                </p>
              </div>
            ))}
          </div>

          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#999', marginTop: 32, lineHeight: 1.5 }}>
            Framework references are public and used here to indicate alignment of AI coaching guidance. MoonBoots Sports is not affiliated with or endorsed by these governing bodies.
          </p>
        </div>
      </section>
    </FadeInSection>
  )
}

// Section 6: Process
const STEPS = [
  {
    num: '01',
    heading: 'Discovery Call',
    body: 'A 30-minute conversation with John Sears, founder of MoonBoots Consultancy. We understand your school\'s PE provision, sport mix, and reporting requirements.',
  },
  {
    num: '02',
    heading: 'Bespoke Demo Access',
    body: 'We issue you 7-day access to a fully populated demo school so you can experience the platform hands-on and share it with your colleagues.',
  },
  {
    num: '03',
    heading: 'Custom Build',
    body: 'We design and build a deployment for your school: your crest, your colours, your sports, your assessment framework, your house system.',
  },
  {
    num: '04',
    heading: 'Launch',
    body: 'We train your staff, configure your data, and launch your platform. Ongoing support via a named account contact.',
  },
]

function Process() {
  return (
    <FadeInSection>
      <section style={{ background: 'var(--mb-navy)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 4vw, 36px)', color: 'white', fontWeight: 700 }}>
            How it works
          </h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'rgba(250, 250, 247, 0.85)', marginTop: 16 }}>
            Six to eight weeks from first conversation to live deployment.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, marginTop: 48, textAlign: 'left', justifyContent: 'center' }}>
            {STEPS.map((step, i) => (
              <div key={step.num} style={{ flex: '1 1 240px', maxWidth: 280, position: 'relative' }}>
                {i < STEPS.length - 1 && (
                  <div style={{ display: 'none', position: 'absolute', top: 12, left: 'calc(100% + 4px)', width: 'calc(100% - 260px)', height: 2, background: 'var(--mb-gold)', opacity: 0.3 }} className="hidden-mobile" />
                )}
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--mb-gold)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>
                  Step {step.num}
                </p>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mb-gold)', margin: '12px 0' }} />
                <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 18, color: 'white', fontWeight: 700, marginTop: 8 }}>
                  {step.heading}
                </h3>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'rgba(250, 250, 247, 0.8)', lineHeight: 1.6, marginTop: 8 }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </FadeInSection>
  )
}

// Section 7: Founder
function Founder() {
  return (
    <FadeInSection>
      <section style={{ background: 'var(--mb-warm-white)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 48, alignItems: 'flex-start' }}>
          <div style={{ flex: '0 0 auto', width: 'clamp(200px, 30vw, 320px)' }}>
            {/* PLACEHOLDER: replace with John Sears founder photo before launch */}
            <div style={{
              width: '100%', aspectRatio: '4/5', background: 'var(--mb-navy)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 4,
            }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 48, color: 'var(--mb-gold)', fontWeight: 700 }}>JS</span>
            </div>
          </div>
          <div style={{ flex: '1 1 400px' }}>
            <p style={{ color: 'var(--mb-gold)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase' }}>
              FOUNDER
            </p>
            <GoldDivider />
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, color: 'var(--mb-navy)', fontWeight: 700, lineHeight: 1.2, marginTop: 16 }}>
              Built in Norfolk, by someone who coaches.
            </h2>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: '#444', lineHeight: 1.7, marginTop: 24 }}>
              <p>
                MoonBoots Sports is built by John Sears, founder of MoonBoots Consultancy UK Ltd.
                John has spent seven years as a volunteer grassroots football coach at Morley YFC
                and is enrolled on the UEFA C Licence course beginning May 2026.
              </p>
              <p style={{ marginTop: 16 }}>
                He started building MoonBoots Sports because the tools available to school PE
                departments did not match the responsibilities they carry. Bespoke deployments,
                sport-aware AI, and proper data protection should not be reserved for the largest
                independent schools.
              </p>
              <p style={{ marginTop: 16 }}>
                MoonBoots Sports is a service of MoonBoots Consultancy UK Ltd, a Norfolk-based
                technology and AI advisory studio building bespoke platforms for founders and
                organisations who value clarity over hype.
              </p>
            </div>
          </div>
        </div>
      </section>
    </FadeInSection>
  )
}

// Section 8: Final CTA
function FinalCTA() {
  return (
    <section style={{ background: 'var(--mb-navy)', padding: '80px 24px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 4vw, 44px)', color: 'white', fontWeight: 700, lineHeight: 1.2 }}>
          Built for your school. Designed around how your PE department actually works.
        </h2>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 18, color: 'rgba(250, 250, 247, 0.85)', lineHeight: 1.6, marginTop: 24 }}>
          Every school is different. We start with a 30-minute discovery call to understand
          your sport mix, your assessment framework, your house system, and your reporting
          needs. Then we build a bespoke deployment around that.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 32, justifyContent: 'center' }}>
          <PrimaryButton href={CALENDLY_URL}>Book a discovery call</PrimaryButton>
          <SecondaryButton to="/request-demo">Request demo access</SecondaryButton>
        </div>
      </div>
    </section>
  )
}

// Section 9: Footer
export function MarketingFooter() {
  return (
    <footer style={{ background: 'var(--mb-navy-deep, #0A1530)', padding: '48px 24px 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, paddingBottom: 32 }}>
          {/* Left column */}
          <div style={{ flex: '1 1 300px' }}>
            <img src="/moonboots-sports-logo-white.svg" alt="MoonBoots Sports" style={{ height: 28 }} />
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(250, 250, 247, 0.7)', marginTop: 12 }}>
              The PE department platform for UK schools.
            </p>
          </div>
          {/* Middle column */}
          <div style={{ flex: '0 1 160px' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700, color: 'var(--mb-gold)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Site</p>
            {[
              { label: 'About', to: '/about' },
              { label: 'Terms', to: '/terms' },
              { label: 'Privacy', to: '/terms' },
              { label: 'Contact', href: 'mailto:hello@moonbootssports.com' },
            ].map((link) => (
              <div key={link.label} style={{ marginBottom: 8 }}>
                {link.to ? (
                  <Link to={link.to} style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'rgba(250, 250, 247, 0.8)', textDecoration: 'none' }}>{link.label}</Link>
                ) : (
                  <a href={link.href} style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'rgba(250, 250, 247, 0.8)', textDecoration: 'none' }}>{link.label}</a>
                )}
              </div>
            ))}
          </div>
          {/* Right column */}
          <div style={{ flex: '0 1 280px' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700, color: 'var(--mb-gold)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Get in touch</p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'rgba(250, 250, 247, 0.8)', marginBottom: 4 }}>hello@moonbootssports.com</p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'rgba(250, 250, 247, 0.8)', marginBottom: 12 }}>Norfolk, United Kingdom</p>
            <a href="https://moonbootsconsultancy.net" target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(250, 250, 247, 0.6)', textDecoration: 'none' }}>
              A service of MoonBoots Consultancy UK Ltd
            </a>
          </div>
        </div>
        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid var(--mb-gold)', padding: '20px 0', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'rgba(250, 250, 247, 0.5)' }}>
            &copy; 2026 MoonBoots Consultancy UK Ltd
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'rgba(250, 250, 247, 0.5)' }}>
            Built with care in Norfolk.
          </p>
        </div>
      </div>
    </footer>
  )
}

// Main Landing Page
export default function Landing() {
  return (
    <>
      <SEO
        title=""
        description="Bespoke PE department platform for UK schools. Curriculum PE, extra-curricular sport, assessment, reporting, and NGB-aligned AI coaching across 17 sports."
        path="/"
      />
      <Header />
      <Hero />
      <ThreePillars />
      <Whitelabel />
      <NGBAlignment />
      <Process />
      <Founder />
      <FinalCTA />
      <MarketingFooter />
    </>
  )
}
