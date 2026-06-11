import SEO from '../components/common/SEO'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Check, Mail, MapPin, Sparkles, ClipboardList, Trophy, GraduationCap,
  ShieldCheck, MessagesSquare, FileSpreadsheet, CalendarDays, Rocket, FileCheck2,
} from 'lucide-react'
import {
  MarketingFooter, MarketingHeader, Reveal, Eyebrow, PrimaryCTA, GhostCTA, AuroraBackdrop,
} from './Landing'

const CALENDLY_URL = import.meta.env.VITE_CALENDLY_URL || 'https://calendly.com/js-moonbootsconsultancy/moonboots-sports-demo'

const easeOut = [0.22, 1, 0.36, 1]
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
}

// ---------------------------------------------------------------------------
// Hero — the thesis
// ---------------------------------------------------------------------------

function AboutHero() {
  return (
    <section className="relative overflow-hidden bg-[#0F1E3D]">
      <AuroraBackdrop />
      <div className="relative mx-auto max-w-4xl px-6 pb-24 pt-20 lg:pb-32 lg:pt-28">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: easeOut }}>
          <Eyebrow light>About MoonBoots Sports</Eyebrow>
        </motion.div>
        <h1 className="mt-7 font-serif text-[clamp(36px,5vw,58px)] font-bold leading-[1.1] text-white">
          {['A school sport platform built for', 'the schools that actually use it.'].map((line, i) => (
            <span key={line} className="block overflow-hidden pb-1">
              <motion.span
                className="block"
                initial={{ y: '110%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.15 + i * 0.12, ease: easeOut }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: easeOut }}
          className="mt-7 max-w-2xl font-body text-lg leading-relaxed text-[#FAFAF7]/80"
        >
          MoonBoots Sports is a bespoke PE department platform for UK schools. We build custom
          deployments for primary, prep, secondary, all-through, and multi-academy trusts — each
          carrying the school's own crest, colours, and identity throughout, supporting both
          timetabled curriculum PE and extra-curricular sport in one platform.
        </motion.p>
        <motion.blockquote
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.68, ease: easeOut }}
          className="mt-10 max-w-2xl border-l-2 border-[#C9A961] pl-6"
        >
          <p className="font-serif text-2xl italic leading-snug text-[#E2C97A]">
            We are not a SaaS product you sign up for. We are a service.
          </p>
          <p className="mt-3 font-body text-[15px] leading-relaxed text-[#FAFAF7]/70">
            Every deployment is built around the specific way your PE department works: your sport
            mix, your assessment framework, your house system, your term structure, your reporting
            cadence. We handle the build, the branding, the training, and ongoing support. Your PE
            department gets on with teaching.
          </p>
        </motion.blockquote>
        {/* fact strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-12 flex flex-wrap gap-x-10 gap-y-4 border-t border-[#C9A961]/20 pt-7"
        >
          {[
            '17 sports from day one',
            'NGB-grounded AI across 15 of them',
            'Year 2 through Year 13',
            'Fixed annual licence',
          ].map((fact) => (
            <span key={fact} className="flex items-center gap-2 font-body text-sm text-[#FAFAF7]/70">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C9A961]" />
              {fact}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Why we built this — the workload, made visible
// ---------------------------------------------------------------------------

const RESPONSIBILITIES = [
  { icon: GraduationCap, label: 'Curriculum PE for every pupil' },
  { icon: Trophy, label: 'Extra-curricular sport across multiple teams' },
  { icon: ClipboardList, label: 'Assessment and reporting' },
  { icon: FileCheck2, label: 'Evidence for Ofsted and Premium funding' },
  { icon: GraduationCap, label: 'GCSE and A-Level practical portfolios' },
  { icon: MessagesSquare, label: 'Parent communication' },
  { icon: ClipboardList, label: 'Governor reporting' },
  { icon: ShieldCheck, label: 'Safeguarding records' },
]

function WhyWeBuiltThis() {
  return (
    <section className="bg-[#FAFAF7] px-6 py-24 lg:py-32">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[0.85fr_1.15fr]">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <Eyebrow>Why we built this</Eyebrow>
          <h2 className="mt-5 font-serif text-[clamp(28px,3.6vw,42px)] font-bold leading-tight text-[#0F1E3D]">
            PE departments carry an enormous amount.
          </h2>
          <p className="mt-5 font-body text-base leading-relaxed text-[#0F1E3D]/65">
            All of it, every term, alongside actual teaching and coaching. This is the work the
            platform was designed to hold.
          </p>
        </Reveal>
        <div>
          <motion.ul
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="grid gap-3 sm:grid-cols-2"
          >
            {RESPONSIBILITIES.map(({ icon: Icon, label }) => (
              <motion.li
                key={label}
                variants={fadeUp}
                className="flex items-center gap-3 rounded-xl border border-[#0F1E3D]/10 bg-white px-4 py-3.5 shadow-sm"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0F1E3D]/5">
                  <Icon size={15} className="text-[#0F1E3D]" strokeWidth={1.8} />
                </span>
                <span className="font-body text-[14px] font-medium text-[#0F1E3D]/85">{label}</span>
              </motion.li>
            ))}
          </motion.ul>
          <Reveal delay={0.1} className="mt-8">
            <div className="rounded-2xl border border-[#0F1E3D]/10 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet size={17} className="text-[#8a6d2f]" />
                <p className="font-body text-[12px] font-bold uppercase tracking-[0.18em] text-[#8a6d2f]">
                  The tools today
                </p>
              </div>
              <p className="mt-3 font-body text-[15px] leading-relaxed text-[#0F1E3D]/70">
                Usually a combination of the school MIS, spreadsheets, WhatsApp groups, and the long
                memory of whoever happens to be Head of PE. It works, after a fashion — but it
                absorbs time that should be going to teaching and coaching.
              </p>
            </div>
            <p className="mt-8 border-l-2 border-[#C9A961] pl-5 font-serif text-xl italic leading-relaxed text-[#0F1E3D]/85">
              PE departments deserve technology that matches their responsibilities. Bespoke.
              Branded. Sport-aware. Properly safeguarded. Designed around how schools actually work.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Who we are
// ---------------------------------------------------------------------------

const FOUNDER_FACTS = [
  'Four years building agentic AI systems',
  'Seven years as a volunteer grassroots football coach at Morley YFC',
  'Enrolled on the UEFA C Licence course beginning May 2026',
  'Background spanning professional motorsport management, financial services, and blockchain development',
]

function WhoWeAre() {
  return (
    <section className="relative overflow-hidden bg-[#0F1E3D] px-6 py-24 lg:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(rgba(250,250,247,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 70% 80% at 15% 50%, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 15% 50%, black 20%, transparent 70%)',
        }}
      />
      <div className="relative mx-auto grid max-w-5xl items-start gap-14 md:grid-cols-[0.8fr_1.2fr]">
        <Reveal className="relative mx-auto w-full max-w-[280px]">
          <div aria-hidden className="absolute -left-3 -top-3 h-full w-full rounded-2xl border-2 border-[#C9A961]" />
          <motion.img
            src="/john-sears.jpg"
            alt="John Sears, founder of MoonBoots Sports"
            whileHover={{ scale: 1.015 }}
            transition={{ duration: 0.4 }}
            className="relative block aspect-[4/5] w-full rounded-2xl object-cover shadow-2xl"
          />
          <p className="mt-5 text-center font-body text-sm font-semibold text-white">John Sears</p>
          <p className="text-center font-body text-[12px] text-[#FAFAF7]/55">Founder, MoonBoots Consultancy UK Ltd</p>
        </Reveal>
        <Reveal delay={0.1}>
          <Eyebrow light>Who we are</Eyebrow>
          <h2 className="mt-5 font-serif text-[clamp(28px,3.6vw,42px)] font-bold leading-tight text-white">
            A Norfolk studio, not a faceless vendor.
          </h2>
          <p className="mt-6 font-body text-base leading-relaxed text-[#FAFAF7]/80">
            MoonBoots Sports is built and operated by MoonBoots Consultancy UK Ltd, a Norfolk-based
            technology and AI advisory studio. The studio builds bespoke platforms and AI tools for
            founders, small businesses, and institutions across the UK.
          </p>
          <ul className="mt-8 space-y-3.5">
            {FOUNDER_FACTS.map((fact) => (
              <li key={fact} className="flex items-start gap-3 font-body text-[15px] leading-relaxed text-[#FAFAF7]/80">
                <Check size={17} className="mt-0.5 shrink-0 text-[#C9A961]" />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// How we work with schools — vertical timeline
// ---------------------------------------------------------------------------

const WORK_STEPS = [
  {
    icon: CalendarDays,
    heading: 'A 30-minute discovery call',
    body: 'We understand your context: your sport mix, your assessment framework, your reporting requirements, your governance, your data protection arrangements.',
  },
  {
    icon: Sparkles,
    heading: '7-day demo school access',
    body: 'A fully populated demo school so you can explore the platform hands-on, share it with colleagues, and demonstrate it to your SLT and Bursar.',
  },
  {
    icon: FileCheck2,
    heading: 'A bespoke proposal',
    body: 'Features, branding, timeline, and a fixed annual licence. There are no per-pupil fees, no parent-facing billing, and no surprises in the proposal.',
  },
  {
    icon: Rocket,
    heading: 'Live in six to eight weeks',
    body: 'From signed proposal to live deployment is typically six to eight weeks, with staff training and a named account contact throughout.',
  },
]

function HowWeWork() {
  return (
    <section className="bg-[#FAFAF7] px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <Eyebrow>How we work with schools</Eyebrow>
          <h2 className="mt-5 font-serif text-[clamp(28px,3.6vw,42px)] font-bold leading-tight text-[#0F1E3D]">
            From first conversation to live platform.
          </h2>
        </Reveal>
        <div className="relative mt-14 pl-2">
          {/* drawn timeline spine */}
          <motion.div
            aria-hidden
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
            className="absolute bottom-6 left-[31px] top-2 w-px origin-top bg-[#C9A961]/50"
          />
          <motion.ol
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.18 } } }}
            className="space-y-10"
          >
            {WORK_STEPS.map(({ icon: Icon, heading, body }, i) => (
              <motion.li key={heading} variants={fadeUp} className="relative flex gap-6">
                <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#C9A961]/60 bg-[#FAFAF7]">
                  <Icon size={18} className="text-[#8a6d2f]" strokeWidth={1.8} />
                </span>
                <div className="pt-1">
                  <p className="font-body text-[11px] font-bold uppercase tracking-[0.2em] text-[#8a6d2f]">
                    Step 0{i + 1}
                  </p>
                  <h3 className="mt-1.5 font-serif text-xl font-semibold text-[#0F1E3D]">{heading}</h3>
                  <p className="mt-2 font-body text-[15px] leading-relaxed text-[#0F1E3D]/65">{body}</p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Get in touch
// ---------------------------------------------------------------------------

const CONTACTS = [
  { label: 'Sales and discovery calls', email: 'hello@moonbootssports.com' },
  { label: 'Existing school support', email: 'support@moonbootssports.com' },
  { label: 'Partnership and press', email: 'john@moonbootsconsultancy.net' },
]

function GetInTouch() {
  return (
    <section className="relative overflow-hidden bg-[#0F1E3D] px-6 py-24 lg:py-32">
      <AuroraBackdrop />
      <div className="relative mx-auto max-w-4xl text-center">
        <Reveal>
          <h2 className="font-serif text-[clamp(28px,3.8vw,44px)] font-bold leading-tight text-white">
            Get in touch.
          </h2>
          <p className="mx-auto mt-4 flex items-center justify-center gap-2 font-body text-[15px] text-[#FAFAF7]/65">
            <MapPin size={15} className="text-[#C9A961]" />
            Based in Norfolk, United Kingdom
          </p>
        </Reveal>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="mt-12 grid gap-4 sm:grid-cols-3"
        >
          {CONTACTS.map(({ label, email }) => (
            <motion.a
              key={email}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              href={`mailto:${email}`}
              className="group rounded-2xl border border-[#C9A961]/25 bg-white/[0.04] p-6 text-left transition-colors hover:border-[#C9A961]/60 hover:bg-white/[0.07]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C9A961]/15">
                <Mail size={16} className="text-[#E2C97A]" />
              </span>
              <p className="mt-4 font-body text-[12px] font-bold uppercase tracking-[0.16em] text-[#FAFAF7]/50">
                {label}
              </p>
              <p className="mt-1.5 break-all font-body text-[14px] font-medium text-[#E2C97A] transition-colors group-hover:text-white">
                {email}
              </p>
            </motion.a>
          ))}
        </motion.div>
        <Reveal delay={0.15} className="mt-14 flex flex-wrap justify-center gap-4">
          <PrimaryCTA href={CALENDLY_URL} large>Book a discovery call</PrimaryCTA>
          <GhostCTA to="/request-demo" large>Request demo access</GhostCTA>
        </Reveal>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function About() {
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0)
  }, [])
  return (
    <div className="bg-[#0F1E3D]">
      <SEO
        title="About"
        description="MoonBoots Sports is a bespoke PE department platform for UK schools, built by MoonBoots Consultancy UK Ltd in Norfolk."
        path="/about"
      />
      <MarketingHeader />
      <main>
        <AboutHero />
        <WhyWeBuiltThis />
        <WhoWeAre />
        <HowWeWork />
        <GetInTouch />
      </main>
      <MarketingFooter />
    </div>
  )
}
