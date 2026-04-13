import { useState, useId } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import SEO from '../components/common/SEO'
import {
  ChevronRight,
  ChevronDown,
  Users,
  Brain,
  Target,
  Star,
  Sparkles,
  HelpCircle,
  Heart,
  MessageSquare,
  Bell,
  Trophy,
  TrendingUp,
  Shield,
} from 'lucide-react'

const APP_NAME = 'Touchline'

function TouchlineMark({ className = "w-10 h-8" }) {
  const id = useId()
  const gradId = `tl-arc-${id}`
  return (
    <svg viewBox="0 10 64 38" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2ED573"/>
          <stop offset="100%" stopColor="#F5A623"/>
        </linearGradient>
      </defs>
      <g fill="none">
        <path d="M12 44 C18 12, 46 12, 52 44" stroke={`url(#${gradId})`} strokeWidth="4.5" strokeLinecap="round"/>
        <line x1="8" y1="44" x2="56" y2="44" stroke="#2ED573" strokeWidth="3.5" strokeLinecap="round"/>
        <circle cx="32" cy="44" r="5" fill="#2ED573"/>
      </g>
    </svg>
  )
}

function Logo({ size = 'default' }) {
  const sizes = {
    small: { icon: 'w-8 h-5', text: 'text-lg' },
    default: { icon: 'w-10 h-6', text: 'text-xl' },
  }
  const s = sizes[size]
  return (
    <Link to="/" className="flex items-center gap-2">
      <TouchlineMark className={s.icon} />
      <span className={`font-display font-semibold text-navy-50 ${s.text}`}>{APP_NAME}</span>
    </Link>
  )
}

function FAQItem({ question, answer, isOpen, onClick }) {
  return (
    <div className="border-b border-navy-800 last:border-b-0">
      <button
        onClick={onClick}
        className="w-full py-5 flex items-center justify-between text-left hover:bg-navy-900/30 transition-colors px-4 -mx-4 rounded-lg"
      >
        <span className="font-display text-lg font-medium text-white pr-4">{question}</span>
        <ChevronDown className={`w-5 h-5 text-pitch-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-navy-300 pb-5 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const youthChallenges = [
  { text: "It's not about winning every game", icon: Heart },
  { text: "It's about helping every player improve", icon: TrendingUp },
  { text: "It's about making football fun while building skills", icon: Star },
  { text: "It's about developing confidence, not just technique", icon: Shield },
]

const features = [
  { icon: Brain, title: 'Age-Appropriate Sessions', description: "Drills designed for how kids actually learn. Not scaled-down adult training — proper youth-focused activities that build skills through play." },
  { icon: Target, title: 'Individual Development Plans', description: "Track each player's journey over the season. Spot strengths, identify areas to work on, and show parents real progress." },
  { icon: MessageSquare, title: 'The Gaffer — AI for Players', description: "Players can chat with their own AI coach for tips, motivation, and football knowledge. Safe, age-appropriate, and coach-controlled." },
  { icon: Bell, title: 'Parent Portal', description: "Keep families informed without the endless WhatsApp messages. Parents get their own login to view schedules, pay subscriptions, and read club announcements — all in one place." },
  { icon: Trophy, title: 'Achievement System', description: "Celebrate progress, not just goals scored. Award badges for effort, improvement, teamwork, and attitude. Every player can earn recognition." },
  { icon: TrendingUp, title: 'Skills Tracking', description: "See development over weeks and months, not just individual sessions. Visual progress that shows players and parents how far they've come." },
  { icon: Users, title: 'Club Dashboard', description: "Running a youth club? Manage all your age groups from one central dashboard with player CRM, online registration, payment collection (just 0.5% fee), parent portal, announcements, and finance reporting." },
]

const ageGroups = [
  { range: 'U7 – U9', label: 'Mini Soccer', focus: 'Fun-focused sessions, basic ball mastery, lots of touches, and small-sided games. At this age, every player should be smiling.', colour: 'pitch' },
  { range: 'U10 – U12', label: 'Skill Development', focus: 'Building technique, introducing simple tactics, and developing game sense. Players start understanding positions and teamwork.', colour: 'energy' },
  { range: 'U13 – U16', label: 'Youth Football', focus: 'Position-specific work, team shape, and physical development. Balancing competition with continued player development.', colour: 'pitch' },
  { range: 'U17 – U18', label: 'Transition', focus: 'Advanced tactics, detailed match preparation, and bridging the gap to adult football. Building footballers who can think for themselves.', colour: 'energy' },
]

const faqs = [
  {
    question: 'How do I plan sessions for mixed ability youth teams?',
    answer: "Touchline's session generator accounts for ability range. It suggests drills with built-in progressions so stronger players are challenged while others build confidence. You can also run differentiated activities within the same session.",
  },
  {
    question: 'What should I focus on at different age groups?',
    answer: 'Touchline follows FA youth development guidelines. For younger ages (U7-U10), it emphasises fun, basic ball mastery, and small-sided games. For older youth (U13+), it introduces more tactical elements, position-specific skills, and match preparation.',
  },
  {
    question: 'How can AI help with youth player development?',
    answer: "AI tracks observations you make about each player, spots patterns, and suggests focus areas. It's like having an assistant coach who remembers everything about every player's development journey.",
  },
  {
    question: 'Can parents see their child\'s progress?',
    answer: 'Yes. Parents get access to schedules, can mark availability, and see development updates you choose to share. It keeps them involved without overwhelming your inbox with messages.',
  },
  {
    question: 'Is this suitable for my U10s / U14s / etc?',
    answer: 'Touchline works across all youth age groups. The AI understands developmental stages and adjusts session suggestions, language, and complexity accordingly.',
  },
  {
    question: 'What qualifications do I need to use Touchline?',
    answer: 'None. Touchline is designed for all coaches, from FA qualified coaches to parents who volunteered to help. The AI provides guidance regardless of your formal coaching background.',
  },
]

export default function YouthCoaches() {
  const [openFAQ, setOpenFAQ] = useState(null)

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": { "@type": "Answer", "text": faq.answer },
    })),
  }

  return (
    <div className="min-h-screen bg-navy-950">
      <SEO
        title="Youth Football Coaching App"
        description="The coaching app built for youth football coaches. AI-powered session planning, player development tracking, and match preparation. Free plan available, no card required."
        path="/youth-football-coaches"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-navy-950/80 backdrop-blur-md border-b border-navy-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo />
            <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/blog" className="hidden sm:block text-navy-300 hover:text-white transition-colors">Blog</Link>
              <Link to="/pricing" className="hidden sm:block text-navy-300 hover:text-white transition-colors">Pricing</Link>
              <Link to="/login" className="text-navy-300 hover:text-white transition-colors text-sm sm:text-base">Log in</Link>
              <Link to="/register" className="btn-primary text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2">Get Started Free</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              The Coaching App for{' '}
              <span className="text-gradient">Youth Football Coaches</span>
            </h1>

            <p className="text-lg sm:text-xl text-navy-300 mb-4 max-w-2xl mx-auto">
              Everything you need to develop young players, in one place.
              Because youth coaching should be about development, not paperwork.
            </p>

            <p className="text-navy-400 mb-8">Free plan available · Paid plans from £9.99/month · Used by coaches across the UK</p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="btn-primary btn-lg">
                Get Started Free
                <ChevronRight className="w-5 h-5" />
              </Link>
              <Link to="/pricing" className="btn-secondary btn-lg">
                View Pricing
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* The youth coaching challenge */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-navy-900/50 to-navy-950">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-12 text-center">Youth coaching is different</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {youthChallenges.map((item, index) => (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card p-6 flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-energy-500/20 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-energy-400" />
                </div>
                <p className="text-navy-200 text-lg">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">Tools built for youth development</h2>
          <p className="text-lg text-navy-300 max-w-2xl mb-12">
            Every feature in {APP_NAME} is designed with youth players in mind.
            Age-appropriate, development-focused, and easy to use.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card p-6 hover:border-pitch-700/50 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-pitch-500/10 flex items-center justify-center mb-4 group-hover:bg-pitch-500/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-pitch-400" />
                </div>
                <h3 className="font-display text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-navy-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Development philosophy */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-navy-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">Coaching the whole player</h2>
          <p className="text-lg text-navy-300 mb-12 max-w-2xl mx-auto">
            Youth football isn't just about what happens on the pitch.
            {APP_NAME} helps you track and develop every aspect of a young player.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Technical Skills', desc: 'Ball mastery, passing, shooting', icon: Target },
              { label: 'Game Understanding', desc: 'Positioning, decision making', icon: Brain },
              { label: 'Physical Development', desc: 'Age-appropriate fitness', icon: TrendingUp },
              { label: 'Confidence & Enjoyment', desc: 'The most important one', icon: Heart },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card p-5 text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-pitch-500/10 flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-5 h-5 text-pitch-400" />
                </div>
                <h3 className="font-display font-semibold text-white mb-1">{item.label}</h3>
                <p className="text-navy-400 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Age group guidance */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4 text-center">From mini soccer to youth football</h2>
          <p className="text-lg text-navy-300 mb-12 text-center max-w-2xl mx-auto">
            {APP_NAME} adapts to every age group. The AI understands what's appropriate at each stage of development.
          </p>

          <div className="space-y-6">
            {ageGroups.map((group, index) => (
              <motion.div
                key={group.range}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className={`card p-6 border-l-4 ${group.colour === 'pitch' ? 'border-l-pitch-500' : 'border-l-energy-500'}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                  <span className={`font-display text-xl font-bold ${group.colour === 'pitch' ? 'text-pitch-400' : 'text-energy-400'}`}>{group.range}</span>
                  <span className="text-navy-400 text-sm">{group.label}</span>
                </div>
                <p className="text-navy-300">{group.focus}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Related pages */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-navy-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <Link to="/grassroots-football-coaching" className="card p-6 hover:border-pitch-700/50 transition-colors group">
              <h3 className="font-display text-lg font-semibold text-white mb-1 group-hover:text-pitch-400 transition-colors">Grassroots Football Coaching Tools →</h3>
              <p className="text-navy-400 text-sm">AI-powered tools built for the reality of grassroots coaching.</p>
            </Link>
            <Link to="/football-training-plans" className="card p-6 hover:border-pitch-700/50 transition-colors group">
              <h3 className="font-display text-lg font-semibold text-white mb-1 group-hover:text-pitch-400 transition-colors">Football Training Plans →</h3>
              <p className="text-navy-400 text-sm">Generate complete training sessions in under a minute with AI.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-pitch-500/20 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-pitch-400" />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">Questions from youth coaches</h2>
          </div>

          <div className="card p-6 mt-8">
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFAQ === index}
                onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-navy-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">Start developing players today</h2>
            <p className="text-lg text-navy-300 mb-8 max-w-2xl mx-auto">
              Give your young players the coaching they deserve. Start free, no credit card required.
            </p>
            <Link to="/register" className="btn-primary btn-lg">
              Get Started Free
              <ChevronRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-navy-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Logo size="small" />
            <div className="flex items-center gap-4">
              <Link to="/terms" className="text-navy-500 hover:text-navy-400 text-sm transition-colors">Terms & Privacy</Link>
              <p className="text-navy-500 text-sm">© {new Date().getFullYear()} {APP_NAME}. Built for grassroots football.</p>
            </div>
          </div>
          <p className="text-navy-600 text-xs text-center mt-4">
            Built by <a href="https://moonbootsconsultancy.net" target="_blank" rel="noopener noreferrer" className="hover:text-navy-400 transition-colors underline">MoonBoots Consultancy</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
