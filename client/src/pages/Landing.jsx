import { useState, useEffect, useId } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import LandingChatWidget from '../components/LandingChatWidget'
import SEO from '../components/common/SEO'
import { useScrollTracking, useAnalytics } from '../hooks/useAnalytics'
import { blogService, SERVER_URL } from '../services/api'
import {
  MessageSquare,
  Target,
  Calendar,
  Users,
  Trophy,
  Video,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Check,
  Play,
  Shield,
  TrendingUp,
  Bell,
  ClipboardList,
  Brain,
  Zap,
  Star,
  ArrowRight,
  ChevronLeft,
  HelpCircle,
  Building2,
  CreditCard,
  UserCheck,
  ShieldCheck,
  CalendarDays,
  CalendarClock,
  FileBarChart,
  AlertTriangle,
  BarChart3,
  Lock,
  GraduationCap,
  Heart,
  MapPin,
  BookOpen,
} from 'lucide-react'

// App name: "Touchline" - where the coach stands, directing the action
const APP_NAME = 'Touchline'
const APP_TAGLINE = 'Your AI Coaching Intelligence'

// Touchline logo mark component
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
        <path d="M12 44 C18 12, 46 12, 52 44"
              stroke={`url(#${gradId})`}
              strokeWidth="4.5"
              strokeLinecap="round"/>
        <line x1="8" y1="44" x2="56" y2="44"
              stroke="#2ED573"
              strokeWidth="3.5"
              strokeLinecap="round"/>
        <circle cx="32" cy="44" r="5" fill="#2ED573"/>
      </g>
    </svg>
  )
}

// Logo component with text
function Logo({ size = 'default', showText = true }) {
  const sizes = {
    small: { icon: 'w-8 h-5', text: 'text-lg' },
    default: { icon: 'w-10 h-6', text: 'text-xl' },
    large: { icon: 'w-12 h-8', text: 'text-2xl' },
  }
  const s = sizes[size]

  return (
    <div className="flex items-center gap-2">
      <TouchlineMark className={s.icon} />
      {showText && (
        <span className={`font-display font-semibold text-navy-50 ${s.text}`}>{APP_NAME}</span>
      )}
    </div>
  )
}

// Mockup: Tactics Board
function TacticsMockup() {
  const positions = [
    { x: 50, y: 88, label: 'GK' },
    { x: 20, y: 70, label: 'LB' },
    { x: 38, y: 72, label: 'CB' },
    { x: 62, y: 72, label: 'CB' },
    { x: 80, y: 70, label: 'RB' },
    { x: 25, y: 48, label: 'CM' },
    { x: 50, y: 45, label: 'CM' },
    { x: 75, y: 48, label: 'CM' },
    { x: 18, y: 22, label: 'LW' },
    { x: 50, y: 18, label: 'ST' },
    { x: 82, y: 22, label: 'RW' },
  ]

  return (
    <div className="bg-gradient-to-b from-pitch-600 to-pitch-700 rounded-xl p-4 aspect-[4/3] relative overflow-hidden shadow-xl">
      {/* Pitch markings */}
      <div className="absolute inset-4 border-2 border-white/30 rounded-lg">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-12 border-2 border-t-0 border-white/30 rounded-b-lg" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-12 border-2 border-b-0 border-white/30 rounded-t-lg" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white/30 rounded-full" />
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/30" />
      </div>
      {/* Players */}
      {positions.map((pos, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="absolute w-8 h-8 -ml-4 -mt-4 bg-white rounded-full shadow-lg flex items-center justify-center text-xs font-bold text-pitch-700"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        >
          {pos.label}
        </motion.div>
      ))}
      {/* Formation label */}
      <div className="absolute bottom-2 right-2 bg-navy-900/80 backdrop-blur px-3 py-1 rounded-full text-sm text-white font-medium">
        4-3-3
      </div>
    </div>
  )
}

// Mockup: AI Chat
function ChatMockup() {
  const messages = [
    { role: 'user', content: "We're playing a team that presses high. How should we adapt?" },
    { role: 'assistant', content: "Against high press, I'd suggest:\n\n• Play out from the back with quick short passes\n• Use your fullbacks as outlets\n• Look for direct balls to your striker\n• Exploit space behind their defence" },
  ]

  return (
    <div className="bg-navy-900 rounded-xl shadow-xl overflow-hidden">
      <div className="bg-navy-800 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pitch-400 to-pitch-600 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white font-medium text-sm">AI Assistant</p>
          <p className="text-pitch-400 text-xs">Always ready to help</p>
        </div>
      </div>
      <div className="p-4 space-y-3 max-h-64">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.3 }}
            className={`${msg.role === 'user' ? 'ml-8 bg-pitch-600' : 'mr-8 bg-navy-800'} rounded-xl p-3`}
          >
            <p className="text-white text-sm whitespace-pre-line">{msg.content}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// Mockup: Player Card
function PlayerCardMockup() {
  return (
    <div className="bg-navy-900 rounded-xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-pitch-600 to-pitch-500 p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold text-white">
            JW
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">James Wilson</h3>
            <p className="text-white/80 text-sm">Central Midfielder · #8</p>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-navy-400">Passing</span>
            <span className="text-pitch-400">85%</span>
          </div>
          <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '85%' }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-gradient-to-r from-pitch-500 to-pitch-400 rounded-full"
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-navy-400">Work Rate</span>
            <span className="text-pitch-400">92%</span>
          </div>
          <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '92%' }}
              transition={{ duration: 1, delay: 0.7 }}
              className="h-full bg-gradient-to-r from-pitch-500 to-pitch-400 rounded-full"
            />
          </div>
        </div>
        <div className="pt-2 border-t border-navy-800">
          <p className="text-xs text-navy-400 mb-2">Recent Feedback</p>
          <p className="text-sm text-white">"Excellent game awareness and leadership on the pitch."</p>
        </div>
      </div>
    </div>
  )
}

// Mockup: Match Prep
function MatchPrepMockup() {
  return (
    <div className="bg-navy-900 rounded-xl shadow-xl overflow-hidden">
      <div className="bg-navy-800 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-white font-medium">Match Preparation</p>
          <p className="text-navy-400 text-sm">vs Riverside FC · Saturday 10:30am</p>
        </div>
        <span className="px-2 py-1 bg-pitch-500/20 text-pitch-400 text-xs rounded-full">Home</span>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-navy-800 rounded-lg p-3">
            <p className="text-navy-400 text-xs mb-1">Formation</p>
            <p className="text-white font-medium">4-3-3</p>
          </div>
          <div className="bg-navy-800 rounded-lg p-3">
            <p className="text-navy-400 text-xs mb-1">Squad Size</p>
            <p className="text-white font-medium">14 players</p>
          </div>
        </div>
        <div>
          <p className="text-navy-400 text-xs mb-2">Key Focus Points</p>
          <div className="space-y-2">
            {['Press high from front', 'Quick transitions', 'Set pieces'].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-white">
                <Check className="w-4 h-4 text-pitch-400" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Mockup: Parent View
function ParentViewMockup() {
  return (
    <div className="bg-navy-900 rounded-xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-energy-500 to-energy-600 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-medium">Player Hub</p>
            <p className="text-white/80 text-sm">Tom's Dashboard</p>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="bg-navy-800 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-pitch-400" />
            <div>
              <p className="text-white text-sm font-medium">Next Match</p>
              <p className="text-navy-400 text-xs">Saturday · 10:30am · Home</p>
            </div>
          </div>
        </div>
        <div className="bg-navy-800 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-caution-400" />
            <div>
              <p className="text-white text-sm font-medium">Player of the Match!</p>
              <p className="text-navy-400 text-xs">Outstanding performance vs Rovers</p>
            </div>
          </div>
        </div>
        <div className="bg-navy-800 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-pitch-400" />
            <div>
              <p className="text-white text-sm font-medium">Development Goals</p>
              <p className="text-navy-400 text-xs">3 active goals · 2 completed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Mockup: Club Management
function ClubManagementMockup() {
  return (
    <div className="bg-navy-900 rounded-xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-medium">Club Hub</p>
            <p className="text-white/80 text-sm">Riverside FC</p>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-navy-800 rounded-lg p-2.5 text-center">
            <p className="text-2xl font-bold text-white">8</p>
            <p className="text-navy-400 text-xs">Teams</p>
          </div>
          <div className="bg-navy-800 rounded-lg p-2.5 text-center">
            <p className="text-2xl font-bold text-pitch-400">96%</p>
            <p className="text-navy-400 text-xs">DBS Compliant</p>
          </div>
        </div>
        <div className="bg-pitch-500/10 border border-pitch-500/20 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-pitch-400" />
            <div>
              <p className="text-white text-sm font-medium">Safeguarding</p>
              <p className="text-pitch-400 text-xs">All checks up to date</p>
            </div>
          </div>
        </div>
        <div className="bg-navy-800 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-white text-sm font-medium">Half-Term Camp</p>
              <p className="text-navy-400 text-xs">24 registered · £960 collected</p>
            </div>
          </div>
        </div>
        <div className="bg-navy-800 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-pitch-400" />
            <div>
              <p className="text-white text-sm font-medium">AI Season Report</p>
              <p className="text-navy-400 text-xs">Ready for your AGM</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hero carousel for showcasing different features
function HeroCarousel() {
  const [activeSlide, setActiveSlide] = useState(0)
  const slides = [
    { component: TacticsMockup, title: 'Visual Tactics Board', subtitle: 'Plan formations and movements' },
    { component: ChatMockup, title: 'AI Coaching Assistant', subtitle: 'Get instant tactical advice' },
    { component: MatchPrepMockup, title: 'Match Preparation', subtitle: 'Never go in unprepared' },
    { component: PlayerCardMockup, title: 'Player Development', subtitle: 'Track progress over time' },
    { component: ParentViewMockup, title: 'Parent & Player Portal', subtitle: 'Keep everyone connected' },
    { component: ClubManagementMockup, title: 'Club Management', subtitle: 'Safeguarding, events & AI intelligence' },
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const ActiveComponent = slides[activeSlide].component

  return (
    <div className="relative">
      <div className="relative mx-auto max-w-lg">
        {/* Browser frame */}
        <div className="rounded-2xl border border-navy-700 bg-navy-900 p-1.5 shadow-2xl shadow-navy-950/50">
          {/* Browser header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-navy-800">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-alert-500/60" />
              <div className="w-3 h-3 rounded-full bg-caution-500/60" />
              <div className="w-3 h-3 rounded-full bg-pitch-500/60" />
            </div>
            <div className="flex-1 ml-2">
              <div className="bg-navy-800 rounded-md px-3 py-1 text-xs text-navy-400 max-w-[200px]">
                app.touchline.coach
              </div>
            </div>
          </div>
          {/* Content */}
          <div className="p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ActiveComponent />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Slide info and controls */}
      <div className="mt-6 flex items-center justify-center gap-6">
        <button
          onClick={() => setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length)}
          className="p-2 rounded-full bg-navy-800 hover:bg-navy-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        <div className="text-center min-w-[200px]">
          <p className="text-white font-medium">{slides[activeSlide].title}</p>
          <p className="text-navy-400 text-sm">{slides[activeSlide].subtitle}</p>
        </div>

        <button
          onClick={() => setActiveSlide((prev) => (prev + 1) % slides.length)}
          className="p-2 rounded-full bg-navy-800 hover:bg-navy-700 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-4">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveSlide(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === activeSlide ? 'bg-pitch-400 w-6' : 'bg-navy-700 hover:bg-navy-600'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

// Tabbed feature carousel for Coaches / Parents & Players / Clubs
const featureTabs = [
  {
    key: 'coaches',
    label: 'For Coaches',
    icon: Shield,
    color: 'pitch',       // tailwind token used for accent colours
    subtitle: 'AI-powered session planning trained on FA frameworks',
    description:
      'Everything you need to plan sessions, prepare for matches, and develop your players. AI that extends your coaching, grounded in FA and UEFA methodology, never replacing your judgement.',
  },
  {
    key: 'parents',
    label: 'For Parents & Players',
    icon: Users,
    color: 'energy',
    subtitle: 'Safe, bounded AI your family can trust',
    description:
      "Parents get full visibility into schedules and their child's development. Players get their own space with a purpose-built AI coach that's bounded by design. No open-ended chat, every conversation logged, parent-controlled.",
  },
  {
    key: 'clubs',
    label: 'For Clubs',
    icon: Building2,
    color: 'amber',
    subtitle: 'AI intelligence that works with your data, not just stores it',
    description:
      'Safeguarding compliance, event management, AI-generated insights, the lowest payment fees in grassroots football, and full multi-team oversight. All in one place, built to support FA Charter Standard requirements.',
  },
]

const TAB_COLORS = {
  pitch: {
    bgIcon: 'bg-pitch-500/20',
    icon: 'text-pitch-400',
    activeBg: 'bg-pitch-500/10 border-pitch-500',
    cardHover: 'hover:border-pitch-700/50',
    iconBg: 'bg-pitch-500/10',
    iconBgHover: 'group-hover:bg-pitch-500/20',
    linkColor: 'text-pitch-400',
  },
  energy: {
    bgIcon: 'bg-energy-500/20',
    icon: 'text-energy-400',
    activeBg: 'bg-energy-500/10 border-energy-500',
    cardHover: 'hover:border-energy-700/50',
    iconBg: 'bg-energy-500/10',
    iconBgHover: 'group-hover:bg-energy-500/20',
    linkColor: 'text-energy-400',
  },
  amber: {
    bgIcon: 'bg-amber-500/20',
    icon: 'text-amber-400',
    activeBg: 'bg-amber-500/10 border-amber-500',
    cardHover: 'hover:border-amber-700/50',
    iconBg: 'bg-amber-500/10',
    iconBgHover: 'group-hover:bg-amber-500/20',
    linkColor: 'text-amber-400',
  },
}

function FeatureTabs() {
  const [activeTab, setActiveTab] = useState('coaches')

  const tab = featureTabs.find((t) => t.key === activeTab)
  const colors = TAB_COLORS[tab.color]
  const features =
    activeTab === 'coaches'
      ? coachFeatures
      : activeTab === 'parents'
        ? parentFeatures
        : clubFeatures

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-navy-900/50 to-navy-950">
      <div className="max-w-7xl mx-auto">
        {/* Tab buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          {featureTabs.map((t) => {
            const isActive = t.key === activeTab
            const c = TAB_COLORS[t.color]
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border text-left transition-all ${
                  isActive
                    ? `${c.activeBg} border-current`
                    : 'border-navy-800 hover:border-navy-700 bg-navy-900/50'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg ${isActive ? c.bgIcon : 'bg-navy-800'} flex items-center justify-center transition-colors`}>
                  <t.icon className={`w-5 h-5 ${isActive ? c.icon : 'text-navy-500'}`} />
                </div>
                <div>
                  <p className={`font-display font-semibold ${isActive ? 'text-white' : 'text-navy-400'}`}>
                    {t.label}
                  </p>
                  <p className={`text-xs ${isActive ? 'text-navy-400' : 'text-navy-600'} hidden sm:block`}>
                    {t.subtitle}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Description */}
        <AnimatePresence mode="wait">
          <motion.p
            key={`desc-${activeTab}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-lg text-navy-300 max-w-2xl mb-10"
          >
            {tab.description}
          </motion.p>
        </AnimatePresence>

        {/* Feature cards */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => {
                const isCoach = activeTab === 'coaches' && feature.slug
                const Wrapper = isCoach ? Link : 'div'
                const wrapperProps = isCoach ? { to: `/features/${feature.slug}` } : {}

                return (
                  <Wrapper
                    key={feature.title}
                    {...wrapperProps}
                    className={`card p-6 ${colors.cardHover} transition-colors group ${isCoach ? 'block h-full' : ''}`}
                  >
                    <div className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center mb-4 ${colors.iconBgHover} transition-colors`}>
                      <feature.icon className={`w-6 h-6 ${colors.icon}`} />
                    </div>
                    <h3 className={`font-display text-xl font-semibold text-white mb-2 ${isCoach ? 'group-hover:text-pitch-400' : ''} transition-colors`}>
                      {feature.title}
                    </h3>
                    <p className="text-navy-400">{feature.description}</p>
                    {isCoach && (
                      <span className={`${colors.linkColor} text-sm mt-3 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                        Learn more <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </Wrapper>
                )
              })}
            </div>

            {activeTab === 'clubs' && (
              <div className="mt-10 text-center">
                <Link to="/pricing" className="btn-secondary btn-lg inline-flex items-center gap-2">
                  View Club Plans
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

// Coach features
const coachFeatures = [
  {
    icon: Brain,
    title: 'AI Tactical Advisor',
    description: 'Chat with an AI that understands formations, player roles, and match situations. Get advice tailored to your team.',
    color: 'pitch',
    slug: 'tactical-advisor',
  },
  {
    icon: Target,
    title: 'Visual Tactics Board',
    description: 'Create and save formations, plan set pieces, and visualize your game model with an intuitive drag-and-drop interface.',
    color: 'pitch',
    slug: 'tactics-board',
  },
  {
    icon: ClipboardList,
    title: 'Training Session Generator',
    description: 'Generate complete training plans based on time, players available, and areas you want to develop.',
    color: 'pitch',
    slug: 'session-planner',
  },
  {
    icon: Trophy,
    title: 'Match Prep & Analysis',
    description: 'AI-powered match preparation with focus points, team talks, and post-match reports to review.',
    color: 'pitch',
    slug: 'match-prep',
  },
  {
    icon: Users,
    title: 'Player Profiles & IDP',
    description: 'Track every player\'s development with observations, skills tracking, and AI-generated individual development plans.',
    color: 'pitch',
    slug: 'player-development',
  },
  {
    icon: Video,
    title: 'Video Analysis',
    description: 'Upload match footage and get AI-powered tactical breakdowns.',
    color: 'pitch',
    slug: 'video-analysis',
  },
]

// Parent/Player features
const parentFeatures = [
  {
    icon: Calendar,
    title: 'Schedule & Availability',
    description: 'See all matches and training sessions. RSVP availability with one tap so coaches always know who\'s coming.',
    color: 'energy',
  },
  {
    icon: Bell,
    title: 'Team Announcements',
    description: 'Stay informed with coach messages, squad selections, and important updates.',
    color: 'energy',
  },
  {
    icon: TrendingUp,
    title: 'Development Tracking',
    description: 'View your child\'s progress, feedback from coaches, and development goals.',
    color: 'energy',
  },
  {
    icon: Sparkles,
    title: 'AI Match Reports',
    description: 'Get AI-generated match summaries after every game. See how the team played and how your child contributed.',
    color: 'energy',
  },
  {
    icon: CalendarDays,
    title: 'Events & Camp Registration',
    description: 'Browse and register for holiday camps, tournaments, and club events. Pay online in one step.',
    color: 'energy',
  },
  {
    icon: Star,
    title: 'Achievements & Awards',
    description: 'Celebrate milestones, Player of the Match awards, and personal bests.',
    color: 'energy',
  },
  {
    icon: Brain,
    title: 'Personal AI Coach',
    description: 'Players can chat with an AI assistant for tips, motivation, and answers about the game.',
    color: 'energy',
  },
  {
    icon: Shield,
    title: 'Private & Secure',
    description: 'Parent portal access is invite-only. Your child\'s data stays within your team.',
    color: 'energy',
  },
]

// Club features
const clubFeatures = [
  {
    icon: Building2,
    title: 'Club Dashboard',
    description: 'Bird\'s-eye view of all your teams, players, staff, and registrations. One dashboard for the whole club.',
  },
  {
    icon: UserCheck,
    title: 'Guardian & Player CRM',
    description: 'Complete contact directory for parents and guardians. Track consent, medical info, and emergency contacts.',
  },
  {
    icon: ClipboardList,
    title: 'Online Registration',
    description: 'Share a branded registration link. Parents sign up their children, and you approve from your dashboard.',
  },
  {
    icon: CreditCard,
    title: 'Payment Collection',
    description: 'Collect match fees, subs, and kit costs via Stripe Connect. Parents pay online with just a 0.5% platform fee — the lowest in grassroots football.',
  },
  {
    icon: ShieldCheck,
    title: 'Safeguarding & DBS Tracking',
    description: 'Track DBS checks, first aid certificates, and safeguarding qualifications. Get automatic expiry alerts so nothing slips through the cracks.',
  },
  {
    icon: AlertTriangle,
    title: 'Incident Reporting',
    description: 'Confidential incident logging with full audit trails. Assign welfare officers, track resolutions, and maintain FA-compliant safeguarding records.',
  },
  {
    icon: CalendarDays,
    title: 'Events & Camps',
    description: 'Run holiday camps, tournaments, and club events. Online registration with integrated payments — parents sign up and pay in one step.',
  },
  {
    icon: CalendarClock,
    title: 'Training Schedule & Attendance',
    description: 'Manage training sessions across all teams. Parents RSVP availability, coaches mark attendance, and you see club-wide trends.',
  },
  {
    icon: Sparkles,
    title: 'AI Club Intelligence',
    description: 'AI-generated match reports for parents, attendance insights, season summaries for your AGM, and even grant application drafts.',
  },
  {
    icon: Bell,
    title: 'Parent Portal & Comms',
    description: 'Parents get their own dashboard with schedules, payments, and announcements. Send targeted emails to all parents or specific teams.',
  },
  {
    icon: Users,
    title: 'Role-Based Access',
    description: 'Assign roles like treasurer, secretary, welfare officer, or coach. Everyone sees exactly what they need — nothing more.',
  },
  {
    icon: TrendingUp,
    title: 'Finance & Reporting',
    description: 'Track revenue, view transaction history, export to CSV, and forecast income from active subscriptions.',
  },
]

const stats = [
  { value: 'Free', label: 'To Start' },
  { value: '£9.99', label: 'From /month' },
  { value: '2%+20p', label: 'Payment Fees' },
  { value: '<1min', label: 'To Get Started' },
]

// FAQ data
const faqs = [
  {
    question: 'What is Touchline?',
    answer: 'Touchline is a platform your team uses to organise matches, training, and communication, and to support player development in a clear and positive way.',
  },
  {
    question: 'Why is my team using it?',
    answer: 'Touchline helps coaches organise fixtures and availability, share match and training information, provide clear development feedback, and keep parents informed.',
  },
  {
    question: 'What information is stored?',
    answer: 'Only information relevant to football activities, such as match availability, coaching observations, development goals, and team announcements. Touchline does not show adverts and does not sell data.',
  },
  {
    question: 'How is AI used?',
    answer: 'AI is used to help explain coaching feedback clearly, generate training and match summaries, and support players with age-appropriate guidance. AI does not make decisions and does not replace coaches.',
  },
  {
    question: "Who can see my child's information?",
    answer: 'Coaches and authorised team staff, and parents or guardians (where enabled). Information is never public.',
  },
  {
    question: 'Questions or concerns?',
    answer: 'Your first point of contact should always be your coach or club. For platform-specific concerns, contact Touchline support.',
  },
]

// FAQ Accordion Item component
function FAQItem({ question, answer, isOpen, onClick }) {
  return (
    <div className="border-b border-navy-800 last:border-b-0">
      <button
        onClick={onClick}
        className="w-full py-5 flex items-center justify-between text-left hover:bg-navy-900/30 transition-colors px-4 -mx-4 rounded-lg"
      >
        <span className="font-display text-lg font-medium text-white pr-4">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-pitch-400 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
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

// Blog preview for homepage
function BlogPreview() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    blogService.getPosts({ limit: 3 })
      .then(res => setPosts(res.data?.slice?.(0, 3) || []))
      .catch(() => {}) // Silently fail if blog is empty
  }, [])

  if (posts.length === 0) return null

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
              From the Blog
            </h2>
            <p className="text-navy-400">Coaching insights and grassroots football thinking.</p>
          </div>
          <Link to="/blog" className="hidden sm:inline-flex items-center gap-2 text-pitch-400 hover:text-pitch-300 transition-colors">
            View all posts <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Link
                to={`/blog/${post.slug}`}
                className="block card overflow-hidden hover:border-navy-600 transition-colors group h-full"
              >
                {post.cover_image_url && (
                  <div className="aspect-[16/9] bg-navy-800/50 overflow-hidden">
                    <img
                      src={post.cover_image_url.startsWith('http') ? post.cover_image_url : `${SERVER_URL}${post.cover_image_url}`}
                      alt={post.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { e.target.parentElement.style.display = 'none' }}
                    />
                  </div>
                )}
                <div className="p-5">
                  {post.category && (
                    <span className="text-xs text-pitch-400 font-medium uppercase tracking-wide">{post.category}</span>
                  )}
                  <h3 className="font-display text-lg font-semibold text-white mt-1 mb-2 group-hover:text-pitch-400 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-navy-400 text-sm line-clamp-2">{post.excerpt}</p>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link to="/blog" className="btn-secondary inline-flex items-center gap-2">
            View all posts <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function Landing() {
  const [openFAQ, setOpenFAQ] = useState(null)
  const { trackCTA } = useAnalytics()

  // Track scroll depth on landing page
  useScrollTracking()

  return (
    <div className="min-h-screen bg-navy-950">
      <SEO
        path="/"
        description="Touchline gives grassroots football coaches AI-powered tools for tactics, training sessions, player development, and club management. Free plan available."
      />

      {/* Homepage-only structured data (SoftwareApplication, Organization, FAQPage) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Touchline",
        "applicationCategory": "SportsApplication",
        "operatingSystem": "Web",
        "description": "AI-powered coaching platform for grassroots football. Generate training sessions, plan tactics, and track player development.",
        "url": "https://touchline.xyz",
        "image": "https://touchline.xyz/touchline-og-image.png",
        "author": { "@type": "Organization", "name": "Touchline" },
        "offers": { "@type": "Offer", "price": "9.99", "priceCurrency": "GBP" },
        "featureList": [
          "AI Coaching Assistant", "Visual Tactics Board", "Training Session Generator",
          "Player Development Plans", "Match Preparation", "Parent & Player Portal", "Video Analysis"
        ]
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Touchline",
        "url": "https://touchline.xyz",
        "logo": "https://touchline.xyz/touchline-logo.svg",
        "description": "AI coaching intelligence for grassroots football",
        "foundingDate": "2025",
        "contactPoint": { "@type": "ContactPoint", "email": "hello@touchline.xyz", "contactType": "customer support" }
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          { "@type": "Question", "name": "What is Touchline?", "acceptedAnswer": { "@type": "Answer", "text": "Touchline is an AI-powered coaching platform designed for grassroots football coaches. It provides tools for generating training sessions, planning tactics, preparing for matches, and tracking player development." } },
          { "@type": "Question", "name": "Why is my team using it?", "acceptedAnswer": { "@type": "Answer", "text": "Your coach has chosen Touchline to help plan better training sessions, prepare for matches, and track each player's development. Parents can stay connected through schedules and progress updates." } },
          { "@type": "Question", "name": "What information is stored?", "acceptedAnswer": { "@type": "Answer", "text": "Touchline stores basic player information (name, position, age group), development observations, and match/training schedules. All data is kept secure and only visible to your team." } },
          { "@type": "Question", "name": "How is AI used?", "acceptedAnswer": { "@type": "Answer", "text": "AI powers features like the training session generator, tactical advisor, match preparation briefings, and individual development plan suggestions." } },
          { "@type": "Question", "name": "Who can see my child's information?", "acceptedAnswer": { "@type": "Answer", "text": "Only your team's coaches and linked parents can see player information. Parent portal access is invite-only. Data is never shared outside your team." } }
        ]
      }) }} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-navy-950/80 backdrop-blur-md border-b border-navy-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo />
            <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/blog" className="hidden sm:block text-navy-300 hover:text-white transition-colors">
                Blog
              </Link>
              <Link to="/pricing" className="hidden sm:block text-navy-300 hover:text-white transition-colors">
                Pricing
              </Link>
              <Link to="/login" className="text-navy-300 hover:text-white transition-colors text-sm sm:text-base">
                Log in
              </Link>
              <Link to="/register" className="btn-primary text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2">
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pitch-500/10 text-pitch-400 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                {APP_TAGLINE}
              </span>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                <span className="sr-only">AI Coaching for Grassroots Football - </span>
                Coach smarter.
                <br />
                <span className="text-gradient">Develop players.</span>
                <br />
                Build something special.
              </h1>

              <p className="text-lg text-navy-300 mb-8 max-w-xl">
                The only grassroots football platform with AI at its core. Purpose-built
                agents trained on FA and UEFA coaching frameworks help you plan sessions,
                track development, run your club, and give every player the attention
                they deserve.
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Link to="/register" className="btn-primary btn-lg">
                  Get Started Free
                  <ChevronRight className="w-5 h-5" />
                </Link>
                <Link to="/pricing" className="btn-secondary btn-lg">
                  View Pricing
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mt-12 pt-8 border-t border-navy-800">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="font-display text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-navy-400 text-sm">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right: App showcase */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <HeroCarousel />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features — Tabbed Carousel */}
      <FeatureTabs />

      {/* Why Touchline? — How we're different */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <span className="inline-block px-3 py-1 bg-pitch-500/10 text-pitch-400 text-sm font-medium rounded-full mb-4">
              How We're Different
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              Why Touchline?
            </h2>
            <p className="text-lg text-navy-300 max-w-2xl mx-auto">
              Not another coaching app with AI bolted on. Touchline is built differently from the ground up.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: 'AI-Native, Not Bolted On',
                description: 'Purpose-built AI agents for every part of your club. Not a database with a chatbot added later.',
              },
              {
                icon: GraduationCap,
                title: 'Trained on FA & UEFA Frameworks',
                description: 'Every AI output is grounded in established coaching methodology. Coach-led, always.',
              },
              {
                icon: CreditCard,
                title: 'Lowest Payment Fees in Grassroots',
                description: '2% + 20p per transaction. No annual subscription. No hidden fees. Your money stays in your club.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="card p-8 text-center border-navy-700/50 hover:border-pitch-700/30 transition-colors"
              >
                <div className="w-14 h-14 rounded-2xl bg-pitch-500/10 flex items-center justify-center mx-auto mb-5">
                  <item.icon className="w-7 h-7 text-pitch-400" />
                </div>
                <h3 className="font-display text-xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-navy-400 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Your Family Can Trust — Bounded AI / Child Safety */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-navy-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-energy-500/10 text-energy-400 text-sm font-medium rounded-full mb-4">
                <Lock className="w-3.5 h-3.5" />
                Child Safety by Design
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-6">
                AI your family can trust
              </h2>
              <p className="text-lg text-navy-300 mb-6 leading-relaxed">
                The Gaffer, our player-facing AI coach, is purpose-built for youth football.
                It can't go off-topic, can't access the internet, and every conversation is
                logged. Parents have full visibility and control.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Shield, text: 'Custom-trained and bounded by design. No open-ended chat.' },
                  { icon: BookOpen, text: 'Every conversation logged and visible to parents and coaches.' },
                  { icon: Users, text: 'Parent-controlled access. Invite-only, never public.' },
                  { icon: Lock, text: 'No internet access. No third-party data sharing. GDPR compliant.' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-energy-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-energy-400" />
                    </div>
                    <p className="text-navy-300">{item.text}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {/* Gaffer chat mockup showing bounded behaviour */}
              <div className="bg-navy-900 rounded-2xl border border-navy-700 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-energy-500 to-energy-600 px-5 py-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">The Gaffer</p>
                    <p className="text-white/70 text-xs">AI Coach for Players</p>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="ml-8 bg-energy-600 rounded-xl rounded-br-md p-3">
                    <p className="text-white text-sm">How can I improve my first touch?</p>
                  </div>
                  <div className="mr-8 bg-navy-800 rounded-xl rounded-bl-md p-3">
                    <p className="text-white text-sm">
                      Great question! Here are three drills your coach might suggest for improving your first touch...
                    </p>
                  </div>
                  <div className="mr-8 bg-navy-800/50 border border-navy-700 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-xs text-navy-500">
                      <Lock className="w-3 h-3" />
                      <span>Bounded AI: football development topics only. Conversation visible to parents and coaches.</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Built on FA & UEFA Coaching Frameworks */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="card p-8 sm:p-12 border-pitch-700/30 bg-pitch-900/5 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pitch-400 via-pitch-500 to-energy-500" />
            <div className="grid sm:grid-cols-[auto_1fr] gap-8 items-start">
              <div className="w-20 h-20 rounded-2xl bg-pitch-500/10 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                <GraduationCap className="w-10 h-10 text-pitch-400" />
              </div>
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-4 text-center sm:text-left">
                  Built on FA and UEFA coaching frameworks
                </h2>
                <p className="text-navy-300 text-lg leading-relaxed mb-6">
                  Every AI output in Touchline is grounded in established coaching methodology from the FA,
                  UEFA development guidelines, and leading youth academy practices. When The Gaffer suggests
                  a session plan or development goal, it's drawing on the same frameworks your coaching
                  courses teach.
                </p>
                <div className="flex flex-wrap gap-3">
                  {['FA Coaching Framework', 'UEFA Development Guidelines', 'Youth Academy Methodology', 'Coach-Led, Always'].map((badge) => (
                    <span key={badge} className="px-3 py-1.5 bg-pitch-500/10 text-pitch-400 text-sm rounded-full">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof / Trust Signals */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-navy-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            {[
              {
                icon: MapPin,
                title: 'Built by a grassroots coach',
                description: 'Founded in Norfolk by someone who stands on the same touchlines you do.',
              },
              {
                icon: Heart,
                title: '10% of profits pledged',
                description: 'We give back 10% of profits to Morley YFC, the club where it all started.',
              },
              {
                icon: ShieldCheck,
                title: 'Safeguarding-first',
                description: 'DBS tracking, incident reporting, and compliance scanning built in from day one.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className="w-12 h-12 rounded-xl bg-navy-800 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-pitch-400" />
                </div>
                <h3 className="font-display text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-navy-400 text-sm">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <BlogPreview />

      {/* Transparent Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-navy-900/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="inline-block px-3 py-1 bg-pitch-500/10 text-pitch-400 text-sm font-medium rounded-full mb-4">
              No Hidden Fees
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              The most transparent payment platform in grassroots football
            </h2>
            <p className="text-lg text-navy-300 max-w-3xl mx-auto">
              Other platforms bury their fees in fine print or take a cut of every payment
              that adds up fast. We believe your club's money should go to your club.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Competitors */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="card p-6 border-alert-600/20"
            >
              <h3 className="font-display text-lg font-semibold text-navy-300 mb-4">Typical Club Platforms</h3>
              <div className="space-y-3">
                {[
                  '2-5% platform fee on every payment',
                  'Hidden "processing fees" on top of card fees',
                  'Monthly subscription PLUS per-transaction charges',
                  'Funds held for 7-14 days before payout',
                  'Long contracts with early exit fees',
                  'Your parents\' data sold to third parties',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-alert-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-alert-400 text-xs">✕</span>
                    </div>
                    <span className="text-navy-400 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Touchline */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="card p-6 border-pitch-600/30 bg-pitch-900/10"
            >
              <h3 className="font-display text-lg font-semibold text-pitch-400 mb-4">Touchline</h3>
              <div className="space-y-3">
                {[
                  'Just 0.5% platform fee — that\'s it',
                  'Standard Stripe processing (1.5% + 20p) — nothing added',
                  'Your Stripe account, your money, your control',
                  'Instant access to your Stripe dashboard',
                  'No contracts — cancel anytime',
                  'Parent data stays private and GDPR compliant',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-pitch-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-pitch-400" />
                    </div>
                    <span className="text-navy-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Big number callout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center bg-navy-800/50 rounded-2xl p-8 border border-navy-700"
          >
            <p className="text-sm text-navy-400 mb-2">On £10,000 in annual parent payments, you save</p>
            <p className="text-5xl sm:text-6xl font-display font-bold text-gradient mb-2">£150 – £450</p>
            <p className="text-navy-400">compared to platforms charging 2-5%. That's money back in your club's pocket.</p>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-navy-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-lg text-navy-300 max-w-2xl mx-auto">
              No complex setup. No credit card. Just sign up and start coaching.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Create your team', description: 'Sign up, name your team, and add your players. Takes less than 5 minutes.' },
              { step: '2', title: 'Invite parents', description: 'Send invite links so parents can access schedules and their child\'s progress.' },
              { step: '3', title: 'Start coaching', description: 'Use the AI assistant, plan training, and prepare for matches. All in one place.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pitch-500 to-pitch-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white">
                  {item.step}
                </div>
                <h3 className="font-display text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-navy-400">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing - Trial focused */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card p-8 sm:p-12 text-center border-pitch-700/50 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pitch-400 via-pitch-500 to-pitch-600" />

            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pitch-500/20 text-pitch-400 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              No Credit Card Required
            </span>

            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-2">
              Start Free. Upgrade Anytime.
            </h2>
            <p className="text-xl text-navy-300 mb-8">
              No credit card required. Paid plans from £9.99/month. Club plans from £99/month.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <div className="bg-navy-800/50 rounded-xl p-5 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-pitch-400" />
                  <span className="font-semibold text-white">Free</span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">£0<span className="text-sm text-navy-400 font-normal">/forever</span></p>
                <p className="text-sm text-navy-400">1 team, 16 players</p>
              </div>
              <div className="bg-pitch-900/30 border border-pitch-500/30 rounded-xl p-5 text-left relative">
                <div className="absolute -top-2 right-3 px-2 py-0.5 bg-pitch-500 text-navy-950 text-xs font-bold rounded-full">
                  POPULAR
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-caution-400" />
                  <span className="font-semibold text-white">Core</span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">£9.99<span className="text-sm text-navy-400 font-normal">/mo</span></p>
                <p className="text-sm text-navy-400">1 team, 25 players</p>
              </div>
              <div className="bg-navy-800/50 rounded-xl p-5 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span className="font-semibold text-white">Pro</span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">£19.99<span className="text-sm text-navy-400 font-normal">/mo</span></p>
                <p className="text-sm text-navy-400">Up to 3 teams</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {[
                'AI coaching assistant',
                'Visual tactics board',
                'Training generator',
                'Match prep & reports',
                'Player development',
                'Parent portal access',
                'Safeguarding & DBS tracking',
                'Events & camp management',
                'Training schedule & RSVP',
                'AI match reports for parents',
                'AI season summaries',
                'Payment collection (0.5%)',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-left">
                  <Check className="w-5 h-5 text-pitch-400 flex-shrink-0" />
                  <span className="text-navy-300 text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="btn-primary btn-lg">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/pricing" className="btn-secondary btn-lg">
                See All Plans
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Transform Your Coaching?
            </h2>
            <p className="text-lg text-navy-300 mb-8 max-w-2xl mx-auto">
              Join coaches already using {APP_NAME} to develop their players,
              plan better sessions, and keep their team connected.
            </p>
            <Link to="/register" className="btn-primary btn-lg">
              Get Started Free
              <ChevronRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-navy-900/30">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-pitch-500/20 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-pitch-400" />
            </div>
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
                Frequently Asked Questions
              </h2>
              <p className="text-navy-400">For parents and players</p>
            </div>
          </div>

          <p className="text-lg text-navy-300 mb-8">
            New to Touchline? Here's what you need to know.
          </p>

          <div className="card p-6">
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

          {/* Final note */}
          <div className="mt-8 p-6 bg-pitch-500/10 rounded-xl border border-pitch-500/20">
            <p className="text-pitch-300 text-sm leading-relaxed">
              <strong className="text-pitch-200">Important:</strong> Touchline is designed to support coaches, empower players, reassure parents, and operate responsibly within youth football. If something does not feel appropriate, we want to know.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-navy-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <Logo size="small" />
              <div className="flex items-center gap-4">
                <Link to="/terms" className="text-navy-500 hover:text-navy-400 text-sm transition-colors">
                  Terms & Privacy
                </Link>
                <p className="text-navy-500 text-sm">
                  © {new Date().getFullYear()} {APP_NAME}. Built for grassroots football.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <Link to="/grassroots-football-coaching" className="text-navy-500 hover:text-navy-400 transition-colors">Grassroots Coaching</Link>
              <Link to="/youth-football-coaches" className="text-navy-500 hover:text-navy-400 transition-colors">Youth Coaches</Link>
              <Link to="/football-training-plans" className="text-navy-500 hover:text-navy-400 transition-colors">Training Plans</Link>
              <Link to="/blog" className="text-navy-500 hover:text-navy-400 transition-colors">Blog</Link>
              <Link to="/pricing" className="text-navy-500 hover:text-navy-400 transition-colors">Pricing</Link>
            </div>
            <p className="text-navy-600 text-xs text-center mt-2">
              Built by <a href="https://moonbootsconsultancy.net" target="_blank" rel="noopener noreferrer" className="hover:text-navy-400 transition-colors underline">MoonBoots Consultancy</a>
            </p>
          </div>
        </div>
      </footer>

      {/* AI Chat Widget */}
      <LandingChatWidget />
    </div>
  )
}
