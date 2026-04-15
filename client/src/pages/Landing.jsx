import { Link } from 'react-router-dom'
import SEO from '../components/common/SEO'
import {
  GraduationCap, Shield, Users, Trophy, Video,
  Sparkles, Check, BookOpen, Calendar, FileBarChart,
  ShieldCheck, Building2, Target, TrendingUp, ArrowRight,
  ClipboardCheck,
} from 'lucide-react'

const SPORTS = [
  { name: 'Football', icon: '\u26BD' },
  { name: 'Rugby', icon: '\uD83C\uDFC9' },
  { name: 'Cricket', icon: '\uD83C\uDFCF' },
  { name: 'Hockey', icon: '\uD83C\uDFD1' },
  { name: 'Netball', icon: '\uD83E\uDD3E' },
]

export default function Landing() {
  return (
    <>
      <SEO
        title="School sport, all in one place"
        description="MoonBoots Sports gives PE departments a single platform for curriculum PE, extra-curricular sport, assessment, reporting, and AI coaching — across every sport."
      />

      <div className="min-h-screen bg-navy-950">
        {/* Nav */}
        <nav className="sticky top-0 z-50 bg-navy-950/90 backdrop-blur-md border-b border-navy-800">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--mb-gold)' }}>
                <span className="text-sm font-bold" style={{ color: 'var(--mb-navy)', fontFamily: 'Poppins, system-ui, sans-serif' }}>M</span>
              </div>
              <span className="text-lg font-bold text-white" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                MoonBoots <span style={{ color: 'var(--mb-gold)' }}>Sports</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/about" className="text-sm text-navy-300 hover:text-white transition-colors hidden sm:block">About</Link>
              <Link to="/login" className="text-sm text-navy-300 hover:text-white transition-colors">Log in</Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--mb-gold)', color: 'var(--mb-navy)' }}
              >
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="max-w-7xl mx-auto px-4 pt-24 pb-20 text-center">
          <div className="flex justify-center gap-3 mb-8">
            {SPORTS.map(s => (
              <span key={s.name} className="text-3xl" title={s.name}>{s.icon}</span>
            ))}
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight max-w-4xl mx-auto" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
            School sport,{' '}
            <span style={{ color: 'var(--mb-gold)' }}>all in one place.</span>
          </h1>
          <p className="text-lg text-navy-300 mt-6 max-w-2xl mx-auto leading-relaxed">
            MoonBoots Sports gives PE departments a single platform to manage curriculum PE,
            extra-curricular sport, assessment, reporting, and AI-assisted coaching —
            from Year 2 to Sixth Form, across every sport you teach.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
            <Link
              to="/register"
              className="px-7 py-3.5 rounded-lg font-semibold transition-all flex items-center gap-2 text-base"
              style={{ backgroundColor: 'var(--mb-gold)', color: 'var(--mb-navy)' }}
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="mailto:hello@moonbootssports.com"
              className="px-7 py-3.5 bg-navy-800 hover:bg-navy-700 text-white rounded-lg font-semibold transition-colors text-base"
            >
              Book a Demo
            </a>
          </div>
          <p className="text-xs text-navy-500 mt-5">Enterprise licence. No per-pupil billing. No parent payment collection.</p>
        </section>

        {/* Two pillars */}
        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-navy-900 rounded-2xl border border-navy-800 p-8">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: 'color-mix(in srgb, var(--mb-gold) 15%, transparent)' }}>
                <GraduationCap className="w-6 h-6" style={{ color: 'var(--mb-gold)' }} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Curriculum PE</h2>
              <p className="text-navy-300 text-sm mb-6 leading-relaxed">
                Manage timetabled PE classes, plan lessons, assess pupils against the National Curriculum,
                and generate termly reports with AI-assisted comment writing.
              </p>
              <ul className="space-y-3">
                <Feature text="Teaching groups with sport units per term" />
                <Feature text="Assessment against NC PE strands (KS1 to KS5)" />
                <Feature text="School-defined grading scales" />
                <Feature text="AI-drafted report comments from assessment data" />
                <Feature text="Curriculum overview across the whole school" />
              </ul>
            </div>

            <div className="bg-navy-900 rounded-2xl border border-navy-800 p-8">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: 'color-mix(in srgb, var(--mb-gold) 15%, transparent)' }}>
                <Shield className="w-6 h-6" style={{ color: 'var(--mb-gold)' }} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Extra-curricular Sport</h2>
              <p className="text-navy-300 text-sm mb-6 leading-relaxed">
                Run every school team from one dashboard. Fixtures, results, squad selection, training sessions,
                video analysis, and tactics boards — across all five sports.
              </p>
              <ul className="space-y-3">
                <Feature text="Multi-sport team management (football, rugby, cricket, hockey, netball)" />
                <Feature text="Fixture scheduling and result recording" />
                <Feature text="Session planning with AI-generated drills" />
                <Feature text="Sport-specific tactics boards and pitch components" />
                <Feature text="Video library and match analysis" />
              </ul>
            </div>
          </div>
        </section>

        {/* AI coaching pillar */}
        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="rounded-2xl border p-8 md:p-12" style={{ backgroundColor: 'color-mix(in srgb, var(--mb-navy-light) 60%, var(--mb-navy))', borderColor: 'color-mix(in srgb, var(--mb-gold) 25%, transparent)' }}>
            <div className="flex items-start gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--mb-gold) 15%, transparent)' }}>
                <Sparkles className="w-6 h-6" style={{ color: 'var(--mb-gold)' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">AI coaching grounded in governing body frameworks</h2>
                <p className="text-navy-300 mt-2 leading-relaxed">
                  Not a generic chatbot. The assistant is trained on development guidelines from the FA, RFU, ECB,
                  England Hockey, and England Netball. It gives age-appropriate, sport-specific advice based on your
                  pupils' year group and the sport they're playing.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PillarCard title="Sport-aware" description="A Year 4 class asking about cricket gets ECB All Stars guidance, not senior coaching advice." />
              <PillarCard title="Extendable" description="Heads of Sport can add their own coaching documents to extend the AI's knowledge base." />
              <PillarCard title="Safeguarded" description="All pupil AI conversations are visible to teachers. Content is age-appropriate and logged." />
            </div>
          </div>
        </section>

        {/* Head of PE section */}
        <section className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-white text-center mb-4" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
            Built for the Head of PE
          </h2>
          <p className="text-navy-300 text-center max-w-2xl mx-auto mb-12">
            See every sport, every team, every year group, every teacher — from one dashboard.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard icon={Building2} title="Whole-school overview" description="Stats across every sport, every team, every class. Know what's happening across the department at a glance." />
            <FeatureCard icon={Users} title="Teacher management" description="Assign teachers to sports and teams. See who is coaching what, and where the gaps are." />
            <FeatureCard icon={FileBarChart} title="Reporting" description="Create reporting windows, track completion, publish reports. AI drafts comments from assessment data." />
            <FeatureCard icon={ClipboardCheck} title="Curriculum tracking" description="See which sport units are being taught in each year group, by which teacher, across the school." />
            <FeatureCard icon={ShieldCheck} title="Safeguarding" description="DBS tracking, compliance alerts, incident logging, and full audit trails. Everything a DSL needs." />
            <FeatureCard icon={TrendingUp} title="Pupil development" description="Cross-sport pupil profiles showing curriculum assessments and extra-curricular feedback in one view." />
          </div>
        </section>

        {/* Pupil portal */}
        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="bg-navy-900 rounded-2xl border border-navy-800 p-8 md:p-12">
            <h2 className="text-2xl font-bold text-white mb-3">Pupil portal</h2>
            <p className="text-navy-300 mb-8 max-w-2xl">
              Every pupil gets their own portal — one place to see every sport they play,
              their weekly schedule, development progress, training plans, video clips, and achievements.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MiniCard icon={Target} label="My Sports" />
              <MiniCard icon={Calendar} label="My Week" />
              <MiniCard icon={TrendingUp} label="My Development" />
              <MiniCard icon={Trophy} label="Achievements" />
            </div>
          </div>
        </section>

        {/* Enterprise grid */}
        <section className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>Enterprise-grade for schools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SimpleCard title="GDPR compliant" description="Full audit trails, data export, and right-to-erasure on request." />
            <SimpleCard title="SSO ready" description="Microsoft 365 and Google Workspace for Education." />
            <SimpleCard title="No parent billing" description="Enterprise licence. The school pays. No per-pupil costs." />
            <SimpleCard title="Works on any device" description="Progressive web app. No app store download needed." />
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-7xl mx-auto px-4 py-24 text-center">
          <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
            Ready to get started?
          </h2>
          <p className="text-navy-300 max-w-xl mx-auto mb-10 text-lg">
            Available for prep schools, primary schools, and secondary schools across the UK.
            Early adopter pricing available now.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-7 py-3.5 rounded-lg font-semibold transition-all flex items-center gap-2 text-base"
              style={{ backgroundColor: 'var(--mb-gold)', color: 'var(--mb-navy)' }}
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="mailto:hello@moonbootssports.com"
              className="px-7 py-3.5 bg-navy-800 hover:bg-navy-700 text-white rounded-lg font-semibold transition-colors text-base"
            >
              Book a Demo
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-navy-800 py-10">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--mb-gold)' }}>
                <span className="text-xs font-bold" style={{ color: 'var(--mb-navy)', fontFamily: 'Poppins, system-ui, sans-serif' }}>M</span>
              </div>
              <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>MoonBoots Sports</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-navy-400">
              <Link to="/about" className="hover:text-white transition-colors">About</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
              <span>MoonBoots Consultancy UK Ltd</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

function Feature({ text }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--mb-gold)' }} />
      <span className="text-sm text-navy-200">{text}</span>
    </li>
  )
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="bg-navy-900 rounded-xl border border-navy-800 p-6">
      <Icon className="w-6 h-6 mb-3" style={{ color: 'var(--mb-gold)' }} />
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      <p className="text-xs text-navy-400 leading-relaxed">{description}</p>
    </div>
  )
}

function PillarCard({ title, description }) {
  return (
    <div className="bg-navy-800/50 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
      <p className="text-xs text-navy-400 leading-relaxed">{description}</p>
    </div>
  )
}

function MiniCard({ icon: Icon, label }) {
  return (
    <div className="bg-navy-800/50 rounded-xl p-4 text-center">
      <Icon className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--mb-gold)' }} />
      <span className="text-xs text-navy-300">{label}</span>
    </div>
  )
}

function SimpleCard({ title, description }) {
  return (
    <div className="bg-navy-900 rounded-xl border border-navy-800 p-5">
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
      <p className="text-xs text-navy-400 leading-relaxed">{description}</p>
    </div>
  )
}
