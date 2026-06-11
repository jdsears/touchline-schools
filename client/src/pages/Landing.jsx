import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import SEO from '../components/common/SEO'
import {
  motion, AnimatePresence, animate,
  useScroll, useTransform, useInView, useReducedMotion,
} from 'framer-motion'
import {
  GraduationCap, Trophy, Users, Check, ArrowRight, Sparkles,
  CalendarDays, Clock, ChevronRight, Mic, Video, ClipboardList,
} from 'lucide-react'

const CALENDLY_URL = import.meta.env.VITE_CALENDLY_URL || 'https://calendly.com/js-moonbootsconsultancy/moonboots-sports-demo'

// Brand constants (kept in sync with --mb-* tokens in styles/tokens.css)
const NAVY = '#0F1E3D'
const GOLD = '#C9A961'

// ---------------------------------------------------------------------------
// Motion primitives
// ---------------------------------------------------------------------------

const easeOut = [0.22, 1, 0.36, 1]

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOut } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

export function Reveal({ children, className = '', delay = 0, ...rest }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={{
        hidden: { opacity: 0, y: 28 },
        show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOut, delay } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export function Eyebrow({ children, light = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`h-px w-8 ${light ? 'bg-[#C9A961]' : 'bg-[#C9A961]'}`} />
      <span className="font-body text-[12px] font-semibold uppercase tracking-[0.25em] text-[#C9A961]">
        {children}
      </span>
    </div>
  )
}

function CountUp({ value, suffix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView) return
    const controls = animate(0, value, {
      duration: 1.4,
      ease: 'easeOut',
      onUpdate: (v) => setN(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, value])
  return <span ref={ref}>{n}{suffix}</span>
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export function PrimaryCTA({ href, to, children, large = false }) {
  const cls = `group inline-flex items-center justify-center gap-2 rounded-lg bg-[#C9A961] font-body font-semibold text-[#0F1E3D] transition-colors hover:bg-[#E2C97A] ${large ? 'px-7 py-4 text-base' : 'px-6 py-3 text-[15px]'}`
  const inner = (
    <>
      {children}
      <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
    </>
  )
  const hover = { whileHover: { y: -2 }, whileTap: { scale: 0.98 }, transition: { duration: 0.2 } }
  if (href) return <motion.a {...hover} href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</motion.a>
  return <motion.span {...hover} className="inline-block"><Link to={to} className={cls}>{inner}</Link></motion.span>
}

export function GhostCTA({ to, children, light = true, large = false }) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-lg border font-body font-semibold transition-colors ${large ? 'px-7 py-4 text-base' : 'px-6 py-3 text-[15px]'} ${
    light
      ? 'border-[#C9A961]/60 text-[#E2C97A] hover:border-[#C9A961] hover:bg-[#C9A961]/10'
      : 'border-[#0F1E3D]/25 text-[#0F1E3D] hover:border-[#0F1E3D] hover:bg-[#0F1E3D]/5'
  }`
  return (
    <motion.span whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }} className="inline-block">
      <Link to={to} className={cls}>{children}</Link>
    </motion.span>
  )
}

// ---------------------------------------------------------------------------
// Header (shared across marketing pages)
// ---------------------------------------------------------------------------

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const links = [
    { label: 'Platform', href: '/#platform' },
    { label: 'Meet Coach', href: '/#coach' },
    { label: 'Whitelabel', href: '/#whitelabel' },
    { label: 'How it works', href: '/#process' },
    { label: 'About', to: '/about' },
  ]
  return (
    <header
      className="sticky top-0 z-50 transition-shadow duration-300"
      style={{
        background: scrolled ? 'rgba(15, 30, 61, 0.88)' : NAVY,
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(14px)' : 'none',
        boxShadow: scrolled ? '0 1px 0 rgba(201,169,97,0.25), 0 12px 32px rgba(10,21,48,0.35)' : '0 1px 0 rgba(201,169,97,0.15)',
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex shrink-0 items-center">
          <img src="/moonboots-sports-logo-white.svg" alt="MoonBoots Sports" className="h-8" />
        </Link>
        <nav className="hidden items-center gap-7 lg:flex">
          {links.map((l) =>
            l.to ? (
              <Link key={l.label} to={l.to} className="font-body text-sm font-medium text-[#FAFAF7]/80 transition-colors hover:text-[#E2C97A]">
                {l.label}
              </Link>
            ) : (
              <a
                key={l.label}
                href={l.href}
                onClick={(e) => {
                  if (window.location.pathname === '/') {
                    const el = document.querySelector(l.href.replace('/', ''))
                    if (el) {
                      e.preventDefault()
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }
                }}
                className="font-body text-sm font-medium text-[#FAFAF7]/80 transition-colors hover:text-[#E2C97A]"
              >
                {l.label}
              </a>
            )
          )}
        </nav>
        <div className="flex items-center gap-3 sm:gap-5">
          <Link to="/login" className="font-body text-sm font-medium text-[#FAFAF7]/80 transition-colors hover:text-[#E2C97A]">
            Sign in
          </Link>
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-[#C9A961] px-4 py-2.5 font-body text-sm font-semibold text-[#0F1E3D] transition-colors hover:bg-[#E2C97A] sm:px-5"
          >
            Book a discovery call
          </a>
        </div>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export function AuroraBackdrop() {
  const reduce = useReducedMotion()
  const drift = (xRange, yRange, duration) =>
    reduce
      ? {}
      : {
          animate: { x: xRange, y: yRange },
          transition: { duration, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
        }
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* faint dot grid */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(rgba(250,250,247,0.10) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 90% 70% at 50% 30%, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 30%, black 30%, transparent 75%)',
        }}
      />
      <motion.div
        {...drift([-40, 60], [-20, 40], 18)}
        className="absolute -top-40 left-[-10%] h-[34rem] w-[34rem] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(201,169,97,0.22), transparent 65%)' }}
      />
      <motion.div
        {...drift([50, -50], [30, -30], 24)}
        className="absolute right-[-12%] top-24 h-[40rem] w-[40rem] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(26,47,85,0.9), transparent 65%)' }}
      />
      <motion.div
        {...drift([-30, 30], [40, -20], 30)}
        className="absolute bottom-[-30%] left-1/3 h-[30rem] w-[30rem] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(201,169,97,0.12), transparent 60%)' }}
      />
    </div>
  )
}

function UnderlineFlourish() {
  return (
    <svg viewBox="0 0 220 12" className="absolute -bottom-5 left-[2%] w-[96%]" aria-hidden>
      <motion.path
        d="M3 9 C 60 2, 160 2, 217 7"
        fill="none"
        stroke={GOLD}
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, delay: 1.0, ease: easeOut }}
      />
    </svg>
  )
}

function BriefingCard() {
  return (
    <div className="rounded-xl border-l-[3px] border-[#C9A961] bg-white/[0.04] p-4 ring-1 ring-white/10">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#C9A961]/20">
          <Sparkles size={11} className="text-[#E2C97A]" />
        </span>
        <span className="font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E2C97A]">Morning briefing</span>
        <span className="ml-auto rounded bg-[#C9A961]/15 px-1.5 py-0.5 font-mono text-[9px] text-[#E2C97A]">AI</span>
      </div>
      <p className="mt-2.5 font-body text-[13px] leading-relaxed text-[#FAFAF7]/85">
        Two fixtures this afternoon. Year 8 rugby squad confirmed. Spring reports: <span className="font-semibold text-white">Y8 closes Thursday</span> — 14 of 31 submitted.
      </p>
    </div>
  )
}

function StatTile({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-3.5 ring-1 ring-white/10">
      <p className="font-body text-[9px] font-semibold uppercase tracking-[0.18em] text-[#FAFAF7]/50">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-white">{value}</p>
      <p className="font-body text-[10px] text-[#FAFAF7]/45">{sub}</p>
    </div>
  )
}

function DashboardMock() {
  return (
    <div className="relative rounded-2xl bg-[#13254a]/80 p-5 shadow-2xl ring-1 ring-white/15 backdrop-blur-xl">
      {/* window chrome */}
      <div className="mb-4 flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-3 hidden rounded-md bg-white/[0.06] px-2.5 py-1 font-mono text-[9px] text-[#FAFAF7]/40 sm:block">
          stedmunds.moonbootssports.com
        </span>
      </div>
      <p className="font-serif text-xl font-semibold text-white">Good afternoon, Ms&nbsp;Hughes.</p>
      <p className="mt-0.5 font-body text-[11px] text-[#FAFAF7]/50">Wednesday — 2 fixtures, 3 lessons, 1 reporting window open</p>
      <div className="mt-4 space-y-3">
        <BriefingCard />
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Sports active" value="7" sub="this term" />
          <StatTile label="Pupils involved" value="412" sub="↑ 14 vs last term" />
          <StatTile label="To moderate" value="3" sub="assessments" />
        </div>
      </div>
    </div>
  )
}

function FloatingFixtureCard({ style }) {
  return (
    <motion.div style={style} className="absolute -left-10 top-24 hidden w-56 lg:block">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="rounded-xl bg-white p-4 shadow-2xl ring-1 ring-[#0F1E3D]/10"
      >
        <div className="flex items-center justify-between">
          <span className="font-body text-[9px] font-semibold uppercase tracking-[0.18em] text-[#0F1E3D]/50">Fixture</span>
          <span className="rounded-full bg-[#C9A961]/15 px-2 py-0.5 font-body text-[10px] font-semibold text-[#8a6d2f]">Tomorrow</span>
        </div>
        <p className="mt-2 font-body text-sm font-semibold text-[#0F1E3D]">U13A Hockey vs Whitfield Grove</p>
        <div className="mt-1.5 flex items-center gap-3 font-body text-[11px] text-[#0F1E3D]/55">
          <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> Thu</span>
          <span className="inline-flex items-center gap-1"><Clock size={11} /> 14:30</span>
          <span>Home</span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#0F1E3D]/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '78%' }}
            transition={{ duration: 1.2, delay: 1.2, ease: easeOut }}
            className="h-full rounded-full bg-[#C9A961]"
          />
        </div>
        <p className="mt-1 font-body text-[10px] text-[#0F1E3D]/45">11 of 14 squad confirmed</p>
      </motion.div>
    </motion.div>
  )
}

function FloatingCoachCard({ style }) {
  return (
    <motion.div style={style} className="absolute -right-8 bottom-10 hidden w-60 lg:block">
      <motion.div
        animate={{ y: [0, 9, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="rounded-xl bg-white p-4 shadow-2xl ring-1 ring-[#0F1E3D]/10"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0F1E3D]">
            <Sparkles size={12} className="text-[#E2C97A]" />
          </span>
          <span className="font-body text-xs font-semibold text-[#0F1E3D]">Coach</span>
          <span className="font-body text-[10px] text-[#0F1E3D]/45">· AI assistant</span>
        </div>
        <p className="mt-2.5 rounded-lg bg-[#FAFAF7] p-2.5 font-body text-[11px] leading-relaxed text-[#0F1E3D]/80 ring-1 ring-[#0F1E3D]/8">
          Year 8 rugby session ready — RFU Age-Grade aligned, tackle-technique progression, 60 minutes.
        </p>
        <div className="mt-2 flex items-center gap-1.5 font-body text-[10px] font-medium text-[#1f7a4d]">
          <Check size={11} /> Safe contact progression checked
        </div>
      </motion.div>
    </motion.div>
  )
}

function Hero() {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const yMock = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 70])
  const yFix = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 140])
  const yCoach = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 40])

  const lines = ['The PE department', 'platform for']
  return (
    <section ref={ref} className="relative overflow-hidden bg-[#0F1E3D]">
      <AuroraBackdrop />
      <div className="relative mx-auto grid max-w-6xl gap-16 px-6 pb-28 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-36 lg:pt-28">
        {/* Copy */}
        <div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: easeOut }}>
            <Eyebrow light>MoonBoots Sports</Eyebrow>
          </motion.div>
          <h1 className="mt-7 font-serif text-[clamp(42px,5.6vw,68px)] font-bold leading-[1.12] text-white">
            {lines.map((line, i) => (
              <span key={line} className="block overflow-hidden">
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
            <span className="block overflow-hidden pb-7">
              <motion.span
                className="relative inline-block"
                initial={{ y: '110%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.39, ease: easeOut }}
              >
                UK&nbsp;schools.
                <UnderlineFlourish />
              </motion.span>
            </span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55, ease: easeOut }}
            className="mt-7 max-w-xl font-body text-lg leading-relaxed text-[#FAFAF7]/80 sm:text-xl"
          >
            Curriculum PE and school sport, in one bespoke platform per school.
            Branded to your crest. Designed around how your PE department actually works.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7, ease: easeOut }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <PrimaryCTA href={CALENDLY_URL} large>Book a discovery call</PrimaryCTA>
            <GhostCTA to="/request-demo" large>Request demo access</GhostCTA>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mt-6 font-body text-sm text-[#FAFAF7]/55"
          >
            Bespoke deployments for primary, prep, secondary, all-through, and multi-academy trusts.
          </motion.p>
        </div>

        {/* Product visual */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.5, ease: easeOut }}
          className="relative"
        >
          <motion.div style={{ y: yMock }}>
            <DashboardMock />
          </motion.div>
          <FloatingFixtureCard style={{ y: yFix }} />
          <FloatingCoachCard style={{ y: yCoach }} />
          {/* gold glow under the mock */}
          <div aria-hidden className="absolute -inset-x-8 -bottom-10 h-32 rounded-[50%] bg-[#C9A961]/15 blur-3xl" />
        </motion.div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Sports marquee + proof bar
// ---------------------------------------------------------------------------

const SPORTS = [
  'Football', 'Rugby', 'Cricket', 'Hockey', 'Netball', 'Athletics', 'Swimming',
  'Gymnastics', 'Tennis', 'Badminton', 'Rounders', 'Dance', 'Volleyball',
  'Basketball', 'Cross Country',
]

function SportsMarquee() {
  const reduce = useReducedMotion()
  const row = (ariaHidden) => (
    <div aria-hidden={ariaHidden} className="flex shrink-0 items-center">
      {SPORTS.map((s) => (
        <span key={`${s}${ariaHidden ? '-dup' : ''}`} className="flex items-center">
          <span className="whitespace-nowrap px-6 font-serif text-2xl italic text-[#0F1E3D]/70 sm:text-3xl">{s}</span>
          <span className="text-[10px] text-[#C9A961]">◆</span>
        </span>
      ))}
    </div>
  )
  return (
    <section className="border-y border-[#0F1E3D]/8 bg-[#FAFAF7] py-7">
      <div className="mb-9 px-6 text-center">
        <p className="font-body text-[12px] font-semibold uppercase tracking-[0.25em] text-[#0F1E3D]/45">
          Every sport on your timetable
        </p>
      </div>
      <div className="mb-marquee relative overflow-hidden" tabIndex={-1}>
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#FAFAF7] to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#FAFAF7] to-transparent" />
        {reduce ? (
          <div className="flex flex-wrap justify-center gap-y-2">{row(false)}</div>
        ) : (
          <div className="mb-marquee-track flex w-max">{row(false)}{row(true)}</div>
        )}
      </div>
      {/* proof stats */}
      <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-8 px-6 sm:grid-cols-4">
        {[
          { v: 17, suffix: '', label: 'sports supported' },
          { v: 15, suffix: '', label: 'NGB frameworks wired into the AI' },
          { v: 12, suffix: '', label: 'year groups, Year 2 to Year 13' },
          { v: 1, suffix: '', label: 'platform per school, yours' },
        ].map((s) => (
          <Reveal key={s.label} className="text-center">
            <p className="font-serif text-5xl font-bold text-[#0F1E3D]">
              <CountUp value={s.v} suffix={s.suffix} />
            </p>
            <p className="mx-auto mt-2 max-w-[170px] font-body text-[13px] leading-snug text-[#0F1E3D]/55">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Three pillars
// ---------------------------------------------------------------------------

const PILLARS = [
  {
    icon: GraduationCap,
    heading: 'Curriculum PE',
    body: 'Teaching groups, sport units mapped to curriculum areas, school-defined assessment, AI-drafted reports. Every PE lesson logged, every pupil assessed, every report ready when reporting windows open.',
    bullets: [
      'Teaching groups by year group and key stage',
      'Assessment grid against National Curriculum strands',
      'AI-drafted report comments from real assessment data',
    ],
  },
  {
    icon: Trophy,
    heading: 'Extra-Curricular Sport',
    body: 'Every team, every fixture, every training session, in one place. AI session planning aligned to the FA, RFU, ECB, England Hockey, and England Netball published frameworks. Match preparation, video analysis, and tactics boards built in.',
    bullets: [
      'Cross-team dashboard for Heads of Department',
      'Sport-specific AI session generation, NGB-aligned',
      'Video analysis with pupil tagging and tactical breakdown',
    ],
  },
  {
    icon: Users,
    heading: 'Pupil Development',
    body: 'One profile per pupil, covering every sport they play and every PE strand they study. A complete development journey from Year 2 through Year 13, visible to teachers, pupils, and parents.',
    bullets: [
      'Individual Development Plans across every sport',
      'Pupil portal showing curriculum and team feedback together',
      'SEND-adapted assessment and goal setting',
    ],
  },
]

function ThreePillars() {
  return (
    <section id="platform" className="scroll-mt-20 bg-[#FAFAF7] px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <Eyebrow>One platform</Eyebrow>
          <h2 className="mt-5 font-serif text-[clamp(30px,4vw,44px)] font-bold leading-tight text-[#0F1E3D]">
            Everything your department runs on.
          </h2>
        </Reveal>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="mt-14 grid gap-6 md:grid-cols-3"
        >
          {PILLARS.map(({ icon: Icon, heading, body, bullets }) => (
            <motion.div
              key={heading}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3 }}
              className="group relative overflow-hidden rounded-2xl border border-[#0F1E3D]/10 bg-white p-8 shadow-sm transition-shadow hover:shadow-xl"
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-[#C9A961] transition-transform duration-500 group-hover:scale-x-100" />
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0F1E3D]">
                <Icon size={22} className="text-[#E2C97A]" strokeWidth={1.8} />
              </span>
              <h3 className="mt-6 font-serif text-2xl font-semibold text-[#0F1E3D]">{heading}</h3>
              <p className="mt-3 font-body text-[14px] leading-relaxed text-[#0F1E3D]/65">{body}</p>
              <ul className="mt-6 space-y-2.5">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 font-body text-[14px] text-[#0F1E3D]">
                    <Check size={16} className="mt-0.5 shrink-0 text-[#C9A961]" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Whitelabel — live theme demo
// ---------------------------------------------------------------------------

const DEMO_SCHOOLS = [
  { name: "St Edmund's College", short: 'SE', colour: '#1B4332', tint: '#2D6A4F' },
  { name: 'Ashworth Park Academy', short: 'AP', colour: '#0F1E3D', tint: '#C9A961' },
  { name: 'Roundwood High School', short: 'RH', colour: '#6B2737', tint: '#A04452' },
]

function WhitelabelDemo() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduce = useReducedMotion()
  useEffect(() => {
    if (paused || reduce) return
    const t = setInterval(() => setI((v) => (v + 1) % DEMO_SCHOOLS.length), 3200)
    return () => clearInterval(t)
  }, [paused, reduce])
  const school = DEMO_SCHOOLS[i]
  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="relative mx-auto w-full max-w-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={school.name}
          initial={{ opacity: 0, y: 14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.985 }}
          transition={{ duration: 0.45, ease: easeOut }}
          className="rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-white/20"
        >
          <div className="flex flex-col items-center text-center">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-2xl font-serif text-2xl font-bold text-white shadow-lg"
              style={{ background: school.colour }}
            >
              {school.short}
            </span>
            <p className="mt-4 font-serif text-xl font-semibold text-[#1A1A1A]">{school.name}</p>
            <p className="mt-0.5 font-body text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/45">School Sport Portal</p>
          </div>
          <div className="mt-7 space-y-3">
            <div className="h-11 rounded-lg border border-[#1A1A1A]/12 bg-[#FAFAF7] px-4 py-3">
              <div className="h-full w-24 rounded bg-[#1A1A1A]/10" />
            </div>
            <div className="h-11 rounded-lg border border-[#1A1A1A]/12 bg-[#FAFAF7] px-4 py-3">
              <div className="h-full w-16 rounded bg-[#1A1A1A]/10" />
            </div>
            <div
              className="flex h-11 items-center justify-center rounded-lg font-body text-sm font-semibold text-white transition-colors"
              style={{ background: school.colour }}
            >
              Sign in to {school.short}
            </div>
          </div>
          <p className="mt-6 text-center font-body text-[10px] text-[#1A1A1A]/35">Powered by MoonBoots Sports</p>
        </motion.div>
      </AnimatePresence>
      {/* theme dots */}
      <div className="mt-5 flex items-center justify-center gap-2.5">
        {DEMO_SCHOOLS.map((s, idx) => (
          <button
            key={s.name}
            onClick={() => setI(idx)}
            aria-label={`Show ${s.name} theme`}
            className="h-3 w-3 rounded-full ring-1 ring-white/40 transition-all"
            style={{ background: s.colour, transform: idx === i ? 'scale(1.35)' : 'scale(1)', opacity: idx === i ? 1 : 0.55 }}
          />
        ))}
      </div>
    </div>
  )
}

function Whitelabel() {
  return (
    <section id="whitelabel" className="scroll-mt-20 relative overflow-hidden bg-[#0F1E3D] px-6 py-24 lg:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(rgba(250,250,247,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 70% 80% at 80% 50%, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 80% 50%, black 20%, transparent 70%)',
        }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
        <Reveal>
          <Eyebrow light>Whitelabel</Eyebrow>
          <h2 className="mt-5 font-serif text-[clamp(30px,4vw,44px)] font-bold leading-tight text-white">
            Branded to your school.
          </h2>
          <div className="mt-6 space-y-4 font-body text-base leading-relaxed text-[#FAFAF7]/80">
            <p>
              Every MoonBoots Sports deployment is yours. Your crest on the login screen.
              Your colours throughout the interface. Your school's name in every email and every report.
            </p>
            <p>
              When pupils install the platform on their phones, they see your crest, not ours.
              This is not a SaaS skin. It is your school's platform, built on our engine.
            </p>
          </div>
          <p className="mt-8 inline-flex items-center gap-2 font-body text-sm font-medium text-[#E2C97A]">
            One engine. Every school its own platform.
            <ChevronRight size={15} />
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <WhitelabelDemo />
        </Reveal>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Meet Coach — multi-sport AI demo
// ---------------------------------------------------------------------------

const CHAT_DEMOS = [
  {
    q: 'Design a 60-minute rugby session for Year 8 beginners.',
    tag: 'RFU Age-Grade aligned · U13',
    lines: [
      'Warm-up: evasion tag, ball familiarity — 10 min',
      'Tackle technique on bags, cheek-to-cheek — 15 min',
      '3v3 conditioned touch, support lines — 20 min',
    ],
  },
  {
    q: 'An U11 netball shooting drill for High 5?',
    tag: 'England Netball · High 5 format',
    lines: [
      'Balanced stance, high release — technique first',
      'Pairs: feed, land, pivot, shoot — 8 min',
      'Rotate every position, as High 5 requires',
    ],
  },
  {
    q: 'Plan an U11 cricket net that follows ECB directives.',
    tag: 'ECB Dynamos · soft-to-hard transition',
    lines: [
      'Pairs nets: everyone bats, everyone bowls',
      'Bowling workloads monitored per bowler',
      'Helmets on for hard-ball batting — mandatory',
    ],
  },
]

function ChatDemo() {
  const [i, setI] = useState(0)
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const inView = useInView(ref, { margin: '-80px' })
  useEffect(() => {
    if (reduce || !inView) return
    const t = setInterval(() => setI((v) => (v + 1) % CHAT_DEMOS.length), 5200)
    return () => clearInterval(t)
  }, [reduce, inView])
  const demo = CHAT_DEMOS[i]
  return (
    <div ref={ref} className="rounded-2xl border border-[#0F1E3D]/10 bg-white p-6 shadow-xl">
      <div className="flex items-center gap-2.5 border-b border-[#0F1E3D]/8 pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F1E3D]">
          <Sparkles size={16} className="text-[#E2C97A]" />
        </span>
        <div>
          <p className="font-body text-sm font-semibold text-[#0F1E3D]">Coach</p>
          <p className="font-body text-[11px] text-[#0F1E3D]/45">Your department's AI assistant</p>
        </div>
        <div className="ml-auto flex gap-1.5">
          {CHAT_DEMOS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`Show example ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === i ? 'w-6 bg-[#C9A961]' : 'w-1.5 bg-[#0F1E3D]/15'}`}
            />
          ))}
        </div>
      </div>
      <div className="min-h-[270px] pt-5">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial="hidden" animate="show" exit={{ opacity: 0, y: -8, transition: { duration: 0.25 } }} variants={stagger}>
            <motion.div variants={fadeUp} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[#0F1E3D] px-4 py-2.5 font-body text-[13px] leading-relaxed text-white">
                {demo.q}
              </p>
            </motion.div>
            <motion.div variants={fadeUp} className="mt-4 max-w-[92%] rounded-2xl rounded-bl-md bg-[#FAFAF7] p-4 ring-1 ring-[#0F1E3D]/8">
              <span className="inline-block rounded-md bg-[#C9A961]/15 px-2 py-1 font-body text-[10px] font-bold uppercase tracking-wider text-[#8a6d2f]">
                {demo.tag}
              </span>
              <motion.ul variants={stagger} className="mt-3 space-y-2">
                {demo.lines.map((line) => (
                  <motion.li key={line} variants={fadeUp} className="flex items-start gap-2 font-body text-[13px] leading-relaxed text-[#0F1E3D]/80">
                    <Check size={14} className="mt-0.5 shrink-0 text-[#C9A961]" />
                    {line}
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

const NGB_DATA = [
  { name: 'FA', framework: '4 Corner Model and England DNA' },
  { name: 'RFU', framework: 'Age-Grade Rugby Laws' },
  { name: 'ECB', framework: 'Inspiring Generations and bowling directives' },
  { name: 'England Hockey', framework: 'Player Pathway' },
  { name: 'England Netball', framework: 'High 5 and Pathway' },
  { name: '+ 10 more', framework: 'England Athletics, Swim England, British Gymnastics, LTA, Basketball England…' },
]

function MeetCoach() {
  return (
    <section id="coach" className="scroll-mt-20 bg-[#FAFAF7] px-6 py-24 lg:py-32">
      <div className="mx-auto grid max-w-6xl items-start gap-16 lg:grid-cols-[1fr_0.9fr]">
        <Reveal>
          <Eyebrow>NGB-aligned AI</Eyebrow>
          <h2 className="mt-5 font-serif text-[clamp(30px,4vw,44px)] font-bold leading-tight text-[#0F1E3D]">
            Sport-aware AI, aligned to the people who set the standards.
          </h2>
          <div className="mt-6 space-y-4 font-body text-base leading-relaxed text-[#0F1E3D]/70">
            <p>
              The AI coaching assistant in MoonBoots Sports is sport-specific, not sport-agnostic.
              Fifteen sports are wired with the published development framework of their national
              governing body — and it answers to one name across your whole school: Coach.
            </p>
            <p>
              Ask for a Year 7 rugby session and you get RFU Age-Grade-aligned progression.
              Ask for an Under-9 cricket net and you get ECB-mandated over limits.
              Ask for an Under-11 netball drill and you get High 5 format principles
              with mandatory position rotation.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3">
            {NGB_DATA.map((ngb) => (
              <div key={ngb.name}>
                <p className="font-body text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a6d2f]">{ngb.name}</p>
                <p className="mt-1.5 font-body text-[12px] leading-snug text-[#0F1E3D]/55">{ngb.framework}</p>
              </div>
            ))}
          </div>
          <p id="ngb-note" className="mt-10 max-w-lg font-body text-[11px] leading-relaxed text-[#0F1E3D]/40">
            Framework references are public and used here to indicate alignment of AI coaching guidance.
            MoonBoots Sports is not affiliated with or endorsed by these governing bodies.
          </p>
        </Reveal>
        <Reveal delay={0.15} className="lg:sticky lg:top-28">
          <ChatDemo />
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { icon: Mic, label: 'Voice observations' },
              { icon: Video, label: 'Video analysis' },
              { icon: ClipboardList, label: 'AI-drafted reports' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 rounded-xl border border-[#0F1E3D]/10 bg-white px-3 py-2.5">
                <Icon size={14} className="shrink-0 text-[#8a6d2f]" />
                <span className="font-body text-[11px] font-medium leading-tight text-[#0F1E3D]/70">{label}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Process
// ---------------------------------------------------------------------------

const STEPS = [
  {
    num: '01',
    heading: 'Discovery Call',
    body: "A 30-minute conversation with John Sears, founder of MoonBoots Consultancy. We understand your school's PE provision, sport mix, and reporting requirements.",
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
    <section id="process" className="scroll-mt-20 relative overflow-hidden bg-[#0F1E3D] px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <h2 className="font-serif text-[clamp(30px,4vw,44px)] font-bold text-white">How it works</h2>
          <p className="mt-4 font-body text-base text-[#FAFAF7]/70">
            Six to eight weeks from first conversation to live deployment.
          </p>
        </Reveal>
        <div className="relative mt-16">
          {/* drawn connecting line (desktop) */}
          <svg aria-hidden className="absolute left-0 right-0 top-[22px] hidden h-[2px] w-full lg:block" viewBox="0 0 100 1" preserveAspectRatio="none">
            <motion.line
              x1="2" y1="0.5" x2="98" y2="0.5"
              stroke={GOLD} strokeWidth="0.45" strokeOpacity="0.45"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 1.6, ease: 'easeInOut' }}
            />
          </svg>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8"
          >
            {STEPS.map((step) => (
              <motion.div key={step.num} variants={fadeUp} className="relative">
                <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-[#C9A961]/50 bg-[#0F1E3D] font-serif text-sm font-bold text-[#E2C97A]">
                  {step.num}
                </span>
                <h3 className="mt-5 font-display text-lg font-bold text-white">{step.heading}</h3>
                <p className="mt-2.5 font-body text-[14px] leading-relaxed text-[#FAFAF7]/65">{step.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Founder
// ---------------------------------------------------------------------------

function Founder() {
  return (
    <section className="bg-[#FAFAF7] px-6 py-24 lg:py-32">
      <div className="mx-auto grid max-w-5xl items-start gap-14 md:grid-cols-[0.85fr_1.15fr]">
        <Reveal className="relative mx-auto w-full max-w-[320px]">
          <div aria-hidden className="absolute -left-3 -top-3 h-full w-full rounded-2xl border-2 border-[#C9A961]" />
          <motion.img
            src="/john-sears.jpg"
            alt="John Sears, founder of MoonBoots Sports"
            whileHover={{ scale: 1.015 }}
            transition={{ duration: 0.4 }}
            className="relative block aspect-[4/5] w-full rounded-2xl object-cover shadow-xl"
          />
        </Reveal>
        <Reveal delay={0.1}>
          <Eyebrow>Founder</Eyebrow>
          <h2 className="mt-5 font-serif text-[clamp(28px,3.4vw,38px)] font-bold leading-tight text-[#0F1E3D]">
            Built in Norfolk, by someone who coaches.
          </h2>
          <p className="mt-7 border-l-2 border-[#C9A961] pl-5 font-serif text-xl italic leading-relaxed text-[#0F1E3D]/80">
            "The tools available to school PE departments did not match the responsibilities they carry."
          </p>
          <div className="mt-7 space-y-4 font-body text-base leading-relaxed text-[#0F1E3D]/70">
            <p>
              MoonBoots Sports is built by John Sears, founder of MoonBoots Consultancy UK Ltd.
              John has spent seven years as a volunteer grassroots football coach at Morley YFC
              and is enrolled on the UEFA C Licence course beginning May 2026.
            </p>
            <p>
              He started building MoonBoots Sports because bespoke deployments, sport-aware AI,
              and proper data protection should not be reserved for the largest independent schools.
            </p>
            <p>
              MoonBoots Sports is a service of MoonBoots Consultancy UK Ltd, a Norfolk-based
              technology and AI advisory studio building bespoke platforms for founders and
              organisations who value clarity over hype.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Final CTA
// ---------------------------------------------------------------------------

function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-[#0F1E3D] px-6 py-28 lg:py-36">
      <AuroraBackdrop />
      <div className="relative mx-auto max-w-3xl text-center">
        <Reveal>
          <h2 className="font-serif text-[clamp(30px,4.4vw,48px)] font-bold leading-tight text-white">
            Built for your school. Designed around how your
            <span className="text-[#E2C97A]"> PE department actually works.</span>
          </h2>
          <p className="mx-auto mt-7 max-w-2xl font-body text-lg leading-relaxed text-[#FAFAF7]/75">
            Every school is different. We start with a 30-minute discovery call to understand
            your sport mix, your assessment framework, your house system, and your reporting
            needs. Then we build a bespoke deployment around that.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <PrimaryCTA href={CALENDLY_URL} large>Book a discovery call</PrimaryCTA>
            <GhostCTA to="/request-demo" large>Request demo access</GhostCTA>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Footer (imported by About / RequestDemoAccess — keep the export)
// ---------------------------------------------------------------------------

export function MarketingFooter() {
  return (
    <footer className="bg-[#0A1530] px-6 pt-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap gap-12 pb-12">
          <div className="min-w-[260px] flex-1">
            <img src="/moonboots-sports-logo-white.svg" alt="MoonBoots Sports" className="h-7" />
            <p className="mt-4 max-w-xs font-body text-[13px] leading-relaxed text-[#FAFAF7]/60">
              The PE department platform for UK schools.
            </p>
          </div>
          <div className="min-w-[140px]">
            <p className="mb-4 font-body text-[11px] font-bold uppercase tracking-[0.2em] text-[#C9A961]">Site</p>
            <ul className="space-y-2.5">
              {[
                { label: 'About', to: '/about' },
                { label: 'Terms', to: '/terms' },
                { label: 'Privacy', to: '/terms' },
                { label: 'Contact', href: 'mailto:hello@moonbootssports.com' },
              ].map((link) => (
                <li key={link.label}>
                  {link.to ? (
                    <Link to={link.to} className="font-body text-sm text-[#FAFAF7]/70 transition-colors hover:text-[#E2C97A]">
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className="font-body text-sm text-[#FAFAF7]/70 transition-colors hover:text-[#E2C97A]">
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-[240px]">
            <p className="mb-4 font-body text-[11px] font-bold uppercase tracking-[0.2em] text-[#C9A961]">Get in touch</p>
            <p className="font-body text-sm text-[#FAFAF7]/70">hello@moonbootssports.com</p>
            <p className="mt-1 font-body text-sm text-[#FAFAF7]/70">Norfolk, United Kingdom</p>
            <a
              href="https://moonbootsconsultancy.net"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block font-body text-[13px] text-[#FAFAF7]/45 transition-colors hover:text-[#E2C97A]"
            >
              A service of MoonBoots Consultancy UK Ltd
            </a>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-t border-[#C9A961]/30 py-6">
          <p className="font-body text-xs text-[#FAFAF7]/40">&copy; 2026 MoonBoots Consultancy UK Ltd</p>
          <p className="font-body text-xs text-[#FAFAF7]/40">Built with care in Norfolk.</p>
        </div>
      </div>
    </footer>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Landing() {
  return (
    <div className="bg-[#0F1E3D]">
      <SEO
        title=""
        description="Bespoke PE department platform for UK schools. Curriculum PE, extra-curricular sport, assessment, reporting, and NGB-aligned AI coaching across 17 sports."
        path="/"
      />
      <MarketingHeader />
      <main>
        <Hero />
        <SportsMarquee />
        <ThreePillars />
        <Whitelabel />
        <MeetCoach />
        <Process />
        <Founder />
        <FinalCTA />
      </main>
      <MarketingFooter />
    </div>
  )
}
