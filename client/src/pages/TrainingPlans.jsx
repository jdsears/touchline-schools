import { useState, useId } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import SEO from '../components/common/SEO'
import {
  ChevronRight,
  ChevronDown,
  Zap,
  Clock,
  Settings,
  ClipboardList,
  Check,
  HelpCircle,
  Sparkles,
  Target,
  Shield,
  Users,
  Footprints,
  CloudRain,
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

const painPoints = [
  'Hours scrolling YouTube for drill ideas',
  'The same sessions getting stale week after week',
  'Not sure how to progress players beyond the basics',
  'Last-minute scrambles when your plan falls apart because only 9 turned up',
]

const steps = [
  { number: '1', title: 'Tell us what you want to work on', description: 'Passing, pressing, finishing, transitions — pick a focus or let AI suggest based on your recent matches and player development needs.', icon: Target },
  { number: '2', title: 'Set your constraints', description: 'How many players? How long? What equipment do you have? The session adapts to your reality, not the other way around.', icon: Settings },
  { number: '3', title: 'Get your session', description: 'A complete plan with warm-up, drills, small-sided games, and cool-down. With coaching points, progressions, and equipment lists.', icon: ClipboardList },
]

const sessionComponents = [
  'Warm-up relevant to the session theme',
  'Technical drills with clear coaching points',
  'Skill practices with built-in progressions',
  'Small-sided games to apply skills in context',
  'Cool-down and review',
  'Equipment list so you know what to bring',
]

const adaptations = [
  { icon: Users, text: 'Only 8 players? Session adjusts automatically' },
  { icon: Target, text: 'Just cones and balls? No problem' },
  { icon: Sparkles, text: 'Mixed abilities? Built-in differentiation' },
  { icon: Clock, text: '45 minutes not 90? Condensed format' },
  { icon: CloudRain, text: 'Raining? Indoor alternatives suggested' },
]

const topics = [
  { category: 'Technical', items: ['Passing & receiving', 'Dribbling & ball mastery', 'Shooting & finishing', 'Heading', 'First touch'] },
  { category: 'Tactical', items: ['Pressing & defending', 'Transitions', 'Team shape & formations', 'Set pieces', 'Build-up play'] },
  { category: 'Physical', items: ['Agility & coordination', 'Speed & acceleration', 'Endurance (age-appropriate)', 'Balance & movement'] },
  { category: 'Game Situations', items: ['Overloads (2v1, 3v2)', '1v1 duels', 'Crossing & finishing', 'Counter attacks', 'Goalkeeping'] },
]

const exampleSession = {
  title: 'U12 Passing & Movement Session',
  details: '60 mins · 12 players · Cones, balls, bibs',
  parts: [
    { time: '0–10 min', name: 'Warm-up: Rondo Squares', desc: 'Groups of 4 in a square, 2 touches max. Focus on body shape and receiving on the back foot.' },
    { time: '10–25 min', name: 'Drill: Triangle Passing', desc: 'Pass and follow in triangles. Progress: add a defender, then make it directional.' },
    { time: '25–40 min', name: 'Practice: Pass & Move Boxes', desc: '4v2 in boxes with gates to pass through. Encourage movement off the ball and communication.' },
    { time: '40–55 min', name: 'Game: 4v4+4 Possession', desc: 'Floaters always play with the team in possession. Which team can make 8 passes?' },
    { time: '55–60 min', name: 'Cool-down & Review', desc: 'Light stretching. Ask: what did you do well today? What made passing easier?' },
  ],
}

const faqs = [
  {
    question: 'How long does it take to generate a session?',
    answer: "Under a minute. You answer a few quick questions about what you want to work on, how many players you have, and how long you've got. Touchline does the rest.",
  },
  {
    question: 'Can I edit the sessions Touchline creates?',
    answer: "Yes. Every session is fully editable. Swap drills, adjust timings, add your own notes. The AI gives you a starting point; you make it yours.",
  },
  {
    question: "What if I don't have much equipment?",
    answer: "Tell Touchline what you have. If it's just cones and balls, that's fine. Sessions adapt to your available equipment rather than assuming you have a full academy setup.",
  },
  {
    question: 'Are the drills age-appropriate?',
    answer: 'Always. Touchline asks about your age group and adjusts complexity, physical demands, and coaching language accordingly. U8 sessions look very different from U16 sessions.',
  },
  {
    question: 'Can I save sessions and reuse them?',
    answer: "Yes. Build a library of sessions that worked well. You can also modify saved sessions for different groups or revisit successful practices from previous seasons.",
  },
  {
    question: 'What topics can I create sessions for?',
    answer: 'Almost anything: passing, dribbling, shooting, defending, pressing, transitions, set pieces, goalkeeper training, and more. You can also combine topics or let AI suggest based on player development needs.',
  },
]

export default function TrainingPlans() {
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
        title="Football Training Plans & Session Generator"
        description="Generate complete training plans and lesson plans in under a minute. AI-powered session planning for school PE teachers. Warm-ups, drills, and activities included."
        path="/football-training-plans"
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
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pitch-500/10 text-pitch-400 text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              AI-powered session planning
            </span>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Football Training Plans{' '}
              <span className="text-gradient">in Under a Minute</span>
            </h1>

            <p className="text-lg sm:text-xl text-navy-300 mb-8 max-w-2xl mx-auto">
              Stop spending hours searching for drills. Tell {APP_NAME} what you want to work on,
              and get a complete session plan instantly. Tailored to your team, your time, your equipment.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="btn-primary btn-lg">
                Get Started Free
                <ChevronRight className="w-5 h-5" />
              </Link>
              <a href="#example-session" className="btn-secondary btn-lg">
                See Example Session
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* The session planning problem */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-navy-900/50 to-navy-950">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Planning sessions shouldn't take longer than running them
          </h2>
          <p className="text-lg text-navy-300 mb-8">
            Sound familiar?
          </p>

          <div className="space-y-4">
            {painPoints.map((point) => (
              <div key={point} className="flex items-start gap-4 p-4 rounded-lg bg-navy-900/50 border border-navy-800">
                <div className="w-2 h-2 rounded-full bg-energy-500 flex-shrink-0 mt-2.5" />
                <p className="text-navy-300 text-lg">{point}</p>
              </div>
            ))}
          </div>

          <p className="text-navy-300 mt-8 text-lg">
            {APP_NAME} fixes this. You describe what you need, and AI builds the session. You get back to doing what you actually enjoy — coaching.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-12 text-center">Three steps to a complete session</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-pitch-500/20 flex items-center justify-center mx-auto mb-4">
                  <span className="font-display text-2xl font-bold text-pitch-400">{step.number}</span>
                </div>
                <h3 className="font-display text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-navy-400">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-navy-900/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">Complete sessions, not just drill lists</h2>
          <p className="text-lg text-navy-300 mb-8">
            Every session {APP_NAME} generates is ready to run. Not a list of random drills — a structured, progressive session with clear coaching points.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sessionComponents.map((component) => (
              <div key={component} className="flex items-start gap-3 p-4 card">
                <div className="w-6 h-6 rounded-full bg-pitch-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-pitch-400" />
                </div>
                <p className="text-navy-200">{component}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Adapts to your reality */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">Sessions that fit your situation</h2>
          <p className="text-lg text-navy-300 mb-8">
            No two training sessions are the same. {APP_NAME} adapts to whatever you're dealing with.
          </p>

          <div className="space-y-4">
            {adaptations.map((item) => (
              <div key={item.text} className="card p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-energy-500/20 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-energy-400" />
                </div>
                <p className="text-navy-200 text-lg">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Topics covered */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-navy-900/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4 text-center">Training plans for every aspect of the game</h2>
          <p className="text-lg text-navy-300 mb-12 text-center max-w-2xl mx-auto">
            Whatever you want to work on, {APP_NAME} can build a session for it.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {topics.map((topic) => (
              <div key={topic.category} className="card p-5">
                <h3 className="font-display text-lg font-semibold text-pitch-400 mb-3">{topic.category}</h3>
                <ul className="space-y-2">
                  {topic.items.map((item) => (
                    <li key={item} className="text-navy-300 text-sm flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-pitch-500/50" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example session */}
      <section id="example-session" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2 text-center">Example Session</h2>
          <p className="text-navy-400 mb-8 text-center">{exampleSession.title} · {exampleSession.details}</p>

          <div className="card p-6 space-y-0">
            {exampleSession.parts.map((part, index) => (
              <div key={part.name} className={`py-4 ${index !== exampleSession.parts.length - 1 ? 'border-b border-navy-800' : ''}`}>
                <div className="flex items-start gap-4">
                  <span className="text-pitch-400 text-sm font-mono whitespace-nowrap mt-0.5">{part.time}</span>
                  <div>
                    <h4 className="font-display font-semibold text-white mb-1">{part.name}</h4>
                    <p className="text-navy-400 text-sm">{part.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link to="/register" className="btn-primary">
              Generate Your First Session Free
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Related pages */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-navy-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <Link to="/grassroots-football-coaching" className="card p-6 hover:border-pitch-700/50 transition-colors group">
              <h3 className="font-display text-lg font-semibold text-white mb-1 group-hover:text-pitch-400 transition-colors">School Sport Coaching Tools →</h3>
              <p className="text-navy-400 text-sm">AI-powered tools built for the reality of school PE and sport.</p>
            </Link>
            <Link to="/youth-football-coaches" className="card p-6 hover:border-pitch-700/50 transition-colors group">
              <h3 className="font-display text-lg font-semibold text-white mb-1 group-hover:text-pitch-400 transition-colors">School Sport Coaching App →</h3>
              <p className="text-navy-400 text-sm">Age-appropriate tools for developing pupils from Year 2 to Sixth Form.</p>
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
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">Training plan questions</h2>
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
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">Stop planning. Start coaching.</h2>
            <p className="text-lg text-navy-300 mb-8 max-w-2xl mx-auto">
              Generate your first session in under a minute. Free plan available, no credit card required.
            </p>
            <Link to="/register" className="btn-primary btn-lg">
              Generate Your First Session Free
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
              <p className="text-navy-500 text-sm">© {new Date().getFullYear()} {APP_NAME}. Built for school sport.</p>
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
