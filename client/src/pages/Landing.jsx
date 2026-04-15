import { Link } from 'react-router-dom'
import SEO from '../components/common/SEO'
import {
  GraduationCap, Shield, ClipboardCheck, Users, Trophy, Video,
  Sparkles, ChevronRight, Check, BookOpen, Calendar, FileBarChart,
  ShieldCheck, Building2, Target, TrendingUp, ArrowRight,
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
        title="Touchline for Schools - One platform for every sport"
        description="The multi-sport platform for PE departments. Curriculum PE, extra-curricular sport, assessment, reporting, and AI coaching in one place."
      />

      <div className="min-h-screen bg-navy-950">
        {/* Nav */}
        <nav className="sticky top-0 z-50 bg-navy-950/80 backdrop-blur-md border-b border-navy-800">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-pitch-600 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Touchline <span className="text-pitch-400">for Schools</span></span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm text-navy-300 hover:text-white transition-colors">Log in</Link>
              <Link to="/register" className="px-4 py-2 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm font-medium transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="max-w-7xl mx-auto px-4 pt-20 pb-16 text-center">
          <div className="flex justify-center gap-3 mb-6">
            {SPORTS.map(s => (
              <span key={s.name} className="text-3xl" title={s.name}>{s.icon}</span>
            ))}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight max-w-4xl mx-auto">
            One platform for <span className="text-pitch-400">every sport</span> across your school
          </h1>
          <p className="text-lg text-navy-300 mt-6 max-w-2xl mx-auto">
            Touchline for Schools gives PE departments a single platform to manage curriculum PE,
            extra-curricular sport, assessment, reporting, and AI-assisted coaching, from Year 2 to Sixth Form.
          </p>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Link to="/register" className="px-6 py-3 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="mailto:schools@touchline.xyz" className="px-6 py-3 bg-navy-800 hover:bg-navy-700 text-white rounded-lg font-medium transition-colors">
              Book a Demo
            </a>
          </div>
          <p className="text-xs text-navy-500 mt-4">Enterprise licence. No per-pupil billing. No parent payment collection.</p>
        </section>

        {/* Two modes */}
        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-navy-900 rounded-2xl border border-navy-800 p-8">
              <div className="w-12 h-12 rounded-xl bg-pitch-600/20 flex items-center justify-center mb-4">
                <GraduationCap className="w-6 h-6 text-pitch-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Curriculum PE</h2>
              <p className="text-navy-300 text-sm mb-6">
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
              <div className="w-12 h-12 rounded-xl bg-amber-400/20 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Extra-curricular Sport</h2>
              <p className="text-navy-300 text-sm mb-6">
                Run every school team from one dashboard. Fixtures, results, squad selection, training sessions,
                video analysis, and tactics boards, across all five sports.
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

        {/* AI coaching */}
        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="bg-navy-900 rounded-2xl border border-pitch-600/30 p-8 md:p-12">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-pitch-600/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-pitch-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">AI coaching grounded in governing body frameworks</h2>
                <p className="text-navy-300 mt-2">
                  Not a generic chatbot. The AI assistant is trained on development guidelines from the FA, RFU, ECB,
                  England Hockey, and England Netball. It gives age-appropriate, sport-specific advice based on your
                  pupils' year group and the sport they are playing.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-navy-800/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-1">Sport-aware</h3>
                <p className="text-xs text-navy-400">A Year 4 teacher asking about cricket gets ECB All Stars guidance, not senior coaching advice.</p>
              </div>
              <div className="bg-navy-800/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-1">Extendable</h3>
                <p className="text-xs text-navy-400">Heads of Sport can add their own coaching documents that extend the AI's knowledge base.</p>
              </div>
              <div className="bg-navy-800/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-1">Safeguarded</h3>
                <p className="text-xs text-navy-400">All pupil AI conversations are visible to teachers. Content is age-appropriate and logged.</p>
              </div>
            </div>
          </div>
        </section>

        {/* For the Head of PE */}
        <section className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-white text-center mb-4">Built for the Head of PE</h2>
          <p className="text-navy-300 text-center max-w-2xl mx-auto mb-12">
            See every sport, every team, every year group, every teacher, from one dashboard.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard icon={Building2} title="Whole-school overview" description="Stats across every sport, every team, every class. Know what is happening across the department at a glance." />
            <FeatureCard icon={Users} title="Teacher management" description="Assign teachers to sports and teams. See who is coaching what, and where the gaps are." />
            <FeatureCard icon={FileBarChart} title="Reporting" description="Create reporting windows, track completion, publish reports. AI drafts comments from assessment data." />
            <FeatureCard icon={ClipboardCheck} title="Curriculum tracking" description="See which sport units are being taught in each year group, by which teacher, across the school." />
            <FeatureCard icon={ShieldCheck} title="Safeguarding" description="DBS tracking, compliance alerts, incident logging, and full audit trails. Everything a DSL needs." />
            <FeatureCard icon={TrendingUp} title="Pupil development" description="Cross-sport pupil profiles showing curriculum assessments and extra-curricular feedback in one view." />
          </div>
        </section>

        {/* For pupils */}
        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="bg-navy-900 rounded-2xl border border-navy-800 p-8 md:p-12">
            <h2 className="text-2xl font-bold text-white mb-3">Pupil portal</h2>
            <p className="text-navy-300 mb-6">
              Every pupil gets their own portal. One place to see every sport they play, their weekly
              schedule, development progress, training plans, video clips, and achievements.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MiniCard icon={Target} label="My Sports" />
              <MiniCard icon={Calendar} label="My Week" />
              <MiniCard icon={TrendingUp} label="My Development" />
              <MiniCard icon={Trophy} label="Achievements" />
            </div>
          </div>
        </section>

        {/* Enterprise */}
        <section className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Enterprise-grade for schools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SimpleCard title="GDPR compliant" description="Full audit trails, data export, and deletion on request." />
            <SimpleCard title="SSO ready" description="Microsoft 365 and Google Workspace for Education (Phase 2)." />
            <SimpleCard title="No parent billing" description="Enterprise licence. The school pays. No per-pupil costs." />
            <SimpleCard title="Works on any device" description="Progressive web app. No app store download needed." />
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-navy-300 max-w-xl mx-auto mb-8">
            Touchline for Schools is available for prep schools, primary schools, and secondary schools
            across the UK. Early adopter pricing available.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/register" className="px-6 py-3 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="mailto:schools@touchline.xyz" className="px-6 py-3 bg-navy-800 hover:bg-navy-700 text-white rounded-lg font-medium transition-colors">
              Book a Demo
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-navy-800 py-8">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-pitch-400" />
              <span className="text-sm font-semibold text-white">Touchline for Schools</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-navy-400">
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
      <Check className="w-4 h-4 text-pitch-400 mt-0.5 shrink-0" />
      <span className="text-sm text-navy-200">{text}</span>
    </li>
  )
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="bg-navy-900 rounded-xl border border-navy-800 p-6">
      <Icon className="w-6 h-6 text-pitch-400 mb-3" />
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      <p className="text-xs text-navy-400">{description}</p>
    </div>
  )
}

function MiniCard({ icon: Icon, label }) {
  return (
    <div className="bg-navy-800/50 rounded-xl p-4 text-center">
      <Icon className="w-6 h-6 text-amber-400 mx-auto mb-2" />
      <span className="text-xs text-navy-300">{label}</span>
    </div>
  )
}

function SimpleCard({ title, description }) {
  return (
    <div className="bg-navy-900 rounded-xl border border-navy-800 p-5">
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
      <p className="text-xs text-navy-400">{description}</p>
    </div>
  )
}
