import SEO from '../components/common/SEO'
import { Link } from 'react-router-dom'
import { MarketingFooter } from './Landing'

const CALENDLY_URL = import.meta.env.VITE_CALENDLY_URL || 'https://calendly.com/js-moonbootsconsultancy/moonboots-sports-demo'

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

export default function About() {
  return (
    <>
      <SEO
        title="About"
        description="MoonBoots Sports is a bespoke PE department platform for UK schools, built by MoonBoots Consultancy UK Ltd in Norfolk."
        path="/about"
      />
      <Header />
      <main style={{ background: 'var(--mb-navy)', minHeight: '100vh', paddingTop: 48, paddingBottom: 80 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>

          <p style={{ color: 'var(--mb-gold)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase' }}>
            ABOUT MOONBOOTS SPORTS
          </p>
          <div style={{ width: 60, height: 2, background: 'var(--mb-gold)', margin: '20px 0' }} />

          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(36px, 5vw, 56px)', color: 'white', fontWeight: 700, lineHeight: 1.15 }}>
            A school sport platform built for the schools that actually use it.
          </h1>

          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 17, color: 'rgba(250, 250, 247, 0.85)', lineHeight: 1.7, marginTop: 32 }}>
            <p>
              MoonBoots Sports is a bespoke PE department platform for UK schools. We build
              custom deployments for primary, prep, secondary, all-through, and multi-academy
              trusts. Each deployment carries the school's own crest, colours, and identity
              throughout, and supports both timetabled curriculum PE and extra-curricular
              sport in one platform.
            </p>
            <p style={{ marginTop: 16 }}>
              The product covers 17 sports from day one, with NGB-aligned AI coaching
              guidance for the core five (football, rugby, cricket, hockey, netball) and
              extensible framework support for the rest. It supports pupils from Year 2
              through Year 13.
            </p>
            <p style={{ marginTop: 16 }}>
              We are not a SaaS product you sign up for. We are a service. Every deployment
              is built around the specific way your PE department works: your sport mix,
              your assessment framework, your house system, your term structure, your
              reporting cadence. We handle the build, the branding, the training, and
              ongoing support. Your PE department gets on with teaching.
            </p>
          </div>

          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, color: 'white', fontWeight: 700, marginTop: 48, marginBottom: 16 }}>
            Why we built this
          </h2>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 17, color: 'rgba(250, 250, 247, 0.85)', lineHeight: 1.7 }}>
            <p>
              PE departments in UK schools are responsible for an enormous amount of work.
              Curriculum PE for every pupil. Extra-curricular sport across multiple teams.
              Assessment, reporting, evidence for Ofsted, evidence for Premium funding,
              GCSE and A-Level practical portfolios, parent communication, governor
              reporting, safeguarding records.
            </p>
            <p style={{ marginTop: 16 }}>
              The tools available to support this work are usually a combination of the
              school MIS, spreadsheets, WhatsApp groups, and the long memory of whoever
              happens to be Head of PE. It works, after a fashion, but it absorbs time
              that should be going to teaching and coaching.
            </p>
            <p style={{ marginTop: 16 }}>
              We believe PE departments deserve technology that matches their
              responsibilities. Bespoke. Branded. Sport-aware. Properly safeguarded.
              Designed around how schools actually work.
            </p>
          </div>

          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, color: 'white', fontWeight: 700, marginTop: 48, marginBottom: 16 }}>
            Who we are
          </h2>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 17, color: 'rgba(250, 250, 247, 0.85)', lineHeight: 1.7 }}>
            <p>
              MoonBoots Sports is built and operated by MoonBoots Consultancy UK Ltd,
              a Norfolk-based technology and AI advisory studio. The studio builds
              bespoke platforms and AI tools for founders, small businesses, and
              institutions across the UK.
            </p>
            <p style={{ marginTop: 16 }}>
              John Sears, the founder, has spent the past four years building agentic AI
              systems and seven years as a volunteer grassroots football coach at
              Morley YFC. He is enrolled on the UEFA C Licence course beginning May 2026.
              His professional background spans professional motorsport management,
              financial services, and blockchain development.
            </p>
          </div>

          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, color: 'white', fontWeight: 700, marginTop: 48, marginBottom: 16 }}>
            How we work with schools
          </h2>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 17, color: 'rgba(250, 250, 247, 0.85)', lineHeight: 1.7 }}>
            <p>
              Every school relationship starts with a 30-minute discovery call. We
              understand your context: your sport mix, your assessment framework, your
              reporting requirements, your governance, your data protection arrangements.
            </p>
            <p style={{ marginTop: 16 }}>
              After the discovery call, we issue you 7-day access to a fully populated
              demo school so you can explore the platform hands-on, share it with
              colleagues, and demonstrate it to your SLT and Bursar.
            </p>
            <p style={{ marginTop: 16 }}>
              If you decide MoonBoots Sports is right for your school, we produce a
              bespoke proposal covering features, branding, timeline, and a fixed
              annual licence. There are no per-pupil fees, no parent-facing billing,
              and no surprises in the proposal.
            </p>
            <p style={{ marginTop: 16 }}>
              From signed proposal to live deployment is typically six to eight weeks.
            </p>
          </div>

          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, color: 'white', fontWeight: 700, marginTop: 48, marginBottom: 16 }}>
            Get in touch
          </h2>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 17, color: 'rgba(250, 250, 247, 0.85)', lineHeight: 1.7 }}>
            <p>For sales and discovery calls: <a href="mailto:hello@moonbootssports.com" style={{ color: 'var(--mb-gold)' }}>hello@moonbootssports.com</a></p>
            <p>For existing school support: <a href="mailto:support@moonbootssports.com" style={{ color: 'var(--mb-gold)' }}>support@moonbootssports.com</a></p>
            <p>For partnership and press enquiries: <a href="mailto:john@moonbootsconsultancy.net" style={{ color: 'var(--mb-gold)' }}>john@moonbootsconsultancy.net</a></p>
            <p style={{ marginTop: 16 }}>We are based in Norfolk, United Kingdom.</p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 48, justifyContent: 'center' }}>
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
            <Link
              to="/request-demo"
              style={{
                background: 'transparent', color: 'var(--mb-gold)', padding: '12px 24px',
                border: '1.5px solid var(--mb-gold)', borderRadius: 4, fontFamily: 'var(--font-sans)',
                fontWeight: 500, fontSize: 15, textDecoration: 'none', display: 'inline-block',
              }}
            >
              Request demo access
            </Link>
          </div>

        </div>
      </main>
      <MarketingFooter />
    </>
  )
}
