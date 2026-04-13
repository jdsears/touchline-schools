import { useState, useId } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import SEO from '../components/common/SEO'
import {
  ChevronRight,
  ChevronDown,
  Users,
  Clock,
  Brain,
  Target,
  ClipboardList,
  Map,
  Heart,
  Shield,
  Sparkles,
  HelpCircle,
  Check,
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

const whoCards = [
  { icon: Clock, title: 'Volunteer coaches', description: 'Juggling work, family, and coaching. You need tools that save time, not add to the workload.' },
  { icon: Users, title: 'Club coaches', description: 'Managing multiple age groups and trying to give every player the attention they deserve.' },
  { icon: Heart, title: 'Parents who stepped up', description: "You volunteered because nobody else would. Now you need a bit of help figuring it all out." },
  { icon: Target, title: 'Development-focused coaches', description: "You care more about improving players than the league table. But you still want to be organised." },
]

const realityChallenges = [
  '8 players one week, 14 the next',
  'Training on a public park with one set of cones',
  'Planning sessions after a full day at work',
  'Players with wildly different abilities',
  'Parents asking questions you don\'t have time to answer',
  'No assistant coach to bounce ideas off',
]

const features = [
  { icon: ClipboardList, title: 'Training Session Generator', description: "Tell it how many players you have, what you want to work on, and how long you've got. It builds the session for you." },
  { icon: Brain, title: 'Pep AI Tactical Advisor', description: "Like having an experienced coach to bounce ideas off. Ask about formations, player roles, or how to deal with that team that always parks the bus." },
  { icon: Target, title: 'Player Development Tracking', description: "See progress over the season, not just match days. Track observations, spot patterns, and create individual development plans." },
  { icon: Shield, title: 'Match Preparation', description: "Walk into Saturday morning feeling prepared. Formation plans, squad selection, and pre-match notes all in one place." },
  { icon: Map, title: 'Visual Tactics Board', description: "Explain formations without drawing in the mud. Drag-and-drop tactics board that players can actually understand." },
  { icon: Users, title: 'Club Management', description: "Running a club? Manage registrations, safeguarding & DBS tracking, events & camps, training schedules, payment collection (0.5% fee), AI intelligence reports, and parent portal — all from one dashboard." },
]

const differences = [
  'No academy budget required — starts at £9.99/month',
  'Works with the players you have, not the players you wish you had',
  'Designed for volunteer time constraints — plan a session in under a minute',
  'Keeps parents and players connected without flooding your inbox',
  'Club plans available — safeguarding, events, AI reports, payments (0.5% fee), and full multi-team management from one dashboard',
]

const faqs = [
  {
    question: 'What is grassroots football coaching software?',
    answer: 'Grassroots football coaching software helps volunteer and club coaches plan training sessions, track player development, and prepare for matches. Unlike elite-level tools, grassroots software is designed for coaches working with limited time, varying player numbers, and mixed ability groups.',
  },
  {
    question: 'Do I need technical skills to use Touchline?',
    answer: "Not at all. Touchline is designed for coaches, not tech experts. If you can send a text message, you can use Touchline. Most coaches are planning their first session within 5 minutes of signing up.",
  },
  {
    question: 'How does AI help with coaching grassroots football?',
    answer: "AI handles the time-consuming parts of coaching — generating session plans, suggesting development areas, preparing match briefings. This gives you more time to actually coach, rather than spending evenings searching for drill ideas.",
  },
  {
    question: 'Can I use this with mixed ability groups?',
    answer: "Absolutely. The training session generator asks about your players' abilities and adapts accordingly. You can also track individual development so every player gets appropriate challenges.",
  },
  {
    question: 'What age groups does Touchline work for?',
    answer: 'Touchline works for all youth age groups from U7s through to U18s. The AI understands age-appropriate development and adjusts its suggestions accordingly.',
  },
  {
    question: 'Is Touchline really free?',
    answer: 'Yes! The free plan includes video analysis, AI chat, session planning, and a tactics board — no credit card required. Upgrade anytime for more features.',
  },
]

export default function GrassrootsCoaching() {
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
        title="Grassroots Football Coaching Tools"
        description="Coaching tools built for grassroots football volunteers. Plan training sessions, track player development, and prepare for matches with AI-powered assistance."
        path="/grassroots-football-coaching"
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
              <Sparkles className="w-4 h-4" />
              Built by a grassroots coach, for grassroots coaches
            </span>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Grassroots Football{' '}
              <span className="text-gradient">Coaching Tools</span>
            </h1>

            <p className="text-lg sm:text-xl text-navy-300 mb-8 max-w-2xl mx-auto">
              AI-powered tools that understand the reality of coaching grassroots football.
              Limited time, limited equipment, unlimited enthusiasm.
            </p>

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

      {/* Who this is for */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-navy-900/50 to-navy-950">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">Built for coaches like you</h2>
          <p className="text-lg text-navy-300 max-w-2xl mb-12">
            You don't need a UEFA Pro Licence to use {APP_NAME}. You just need a team and the desire to help them improve.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {whoCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card p-6 hover:border-pitch-700/50 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-pitch-500/10 flex items-center justify-center mb-4 group-hover:bg-pitch-500/20 transition-colors">
                  <card.icon className="w-6 h-6 text-pitch-400" />
                </div>
                <h3 className="font-display text-xl font-semibold text-white mb-2">{card.title}</h3>
                <p className="text-navy-400">{card.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The reality of grassroots coaching */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">We understand grassroots football</h2>
              <p className="text-lg text-navy-300 mb-8">
                We built {APP_NAME} because we've lived it. The rain, the no-shows, the parent who
                asks why their kid isn't playing striker every week. We get it.
              </p>
              <ul className="space-y-4">
                {realityChallenges.map((challenge) => (
                  <li key={challenge} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-energy-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-energy-400" />
                    </div>
                    <span className="text-navy-300">{challenge}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-8 bg-navy-900/50">
              <p className="text-navy-300 text-lg leading-relaxed italic">
                "I was spending more time planning sessions than actually running them. Now I generate
                a plan on my lunch break and turn up ready to go. It's changed how I coach."
              </p>
              <p className="text-pitch-400 mt-4 font-medium">— Grassroots coach, U11s</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-navy-900/50 to-navy-950">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">Tools that actually help</h2>
          <p className="text-lg text-navy-300 max-w-2xl mb-12">
            Not another complicated platform. Just practical tools that save you time and make your coaching better.
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

      {/* What makes us different */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">Not another elite coaching tool</h2>
          <p className="text-lg text-navy-300 mb-8">
            Most coaching platforms are built for academies with staff, budgets, and resources.
            {APP_NAME} is built for the rest of us.
          </p>

          <div className="space-y-4">
            {differences.map((diff) => (
              <div key={diff} className="card p-5 flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-pitch-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 text-pitch-400" />
                </div>
                <p className="text-navy-200 text-lg">{diff}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related pages */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-navy-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <Link to="/youth-football-coaches" className="card p-6 hover:border-pitch-700/50 transition-colors group">
              <h3 className="font-display text-lg font-semibold text-white mb-1 group-hover:text-pitch-400 transition-colors">Youth Football Coaching App →</h3>
              <p className="text-navy-400 text-sm">Age-appropriate tools for developing young players from U7s to U18s.</p>
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
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">Frequently Asked Questions</h2>
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
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">Ready to coach smarter?</h2>
            <p className="text-lg text-navy-300 mb-8 max-w-2xl mx-auto">
              Join grassroots coaches already using {APP_NAME} to save time, develop players, and enjoy coaching more.
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
