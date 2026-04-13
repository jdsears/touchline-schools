import { useState, useId } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import SEO from '../components/common/SEO'
import {
  ChevronRight,
  ChevronDown,
  Check,
  X,
  HelpCircle,
  PoundSterling,
  Shield,
  CreditCard,
  Eye,
  Clock,
  Users,
  Building2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CalendarDays,
  BarChart3,
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

const competitors = [
  { name: 'Typical Platform A', platformFee: '2.5%', processing: '~2%', heldFunds: 'Yes', contracts: '12 months', total: '~4.5%' },
  { name: 'Typical Platform B', platformFee: '3%', processing: 'Included', heldFunds: 'Yes', contracts: '6 months', total: '~3%' },
  { name: 'Typical Platform C', platformFee: '1.5%', processing: '~2.5%', heldFunds: 'Yes', contracts: 'Monthly', total: '~4%' },
  { name: 'Touchline', platformFee: '0.5%', processing: '1.5% + 20p', heldFunds: 'No', contracts: 'None', total: '~2% + 20p', highlight: true },
]

const transparencyPoints = [
  { icon: Eye, title: 'No hidden fees', description: 'Our 0.5% platform fee is the only charge from us. Stripe\'s standard processing rate (1.5% + 20p for UK cards) goes directly to Stripe, not to us.' },
  { icon: PoundSterling, title: 'Your money, your account', description: 'Payments go directly to your club\'s Stripe account. We never hold or touch your funds. You control your own payouts.' },
  { icon: Shield, title: 'No contracts or lock-in', description: 'Cancel anytime. We don\'t lock you into annual contracts or minimum terms. Your data stays yours.' },
  { icon: Clock, title: 'Standard Stripe payouts', description: 'Money arrives in your bank account on Stripe\'s standard schedule (typically 2-3 business days). No artificial delays.' },
]

const savingsExamples = [
  { annual: '£5,000', touchline: '£25 + Stripe fees', typical: '£125 – £250', saved: '£100 – £225' },
  { annual: '£10,000', touchline: '£50 + Stripe fees', typical: '£250 – £500', saved: '£200 – £450' },
  { annual: '£25,000', touchline: '£125 + Stripe fees', typical: '£625 – £1,250', saved: '£500 – £1,125' },
  { annual: '£50,000', touchline: '£250 + Stripe fees', typical: '£1,250 – £2,500', saved: '£1,000 – £2,250' },
]

const faqs = [
  {
    question: 'What exactly does Touchline charge for payments?',
    answer: 'Touchline charges a 0.5% platform fee on each transaction. This is on top of Stripe\'s standard processing fees (1.5% + 20p for UK cards). For example, on a £10 payment, our fee is 5p. That\'s it.',
  },
  {
    question: 'Why do other platforms charge 2-5%?',
    answer: 'Most platforms use payments as their primary revenue model and add mark-ups on top of processing fees. Some also hold funds, charge withdrawal fees, or require minimum monthly volumes. We think that\'s not fair to grassroots clubs running on tight budgets.',
  },
  {
    question: 'Where does the money go when parents pay?',
    answer: 'Straight to your club\'s own Stripe account. You connect your bank account to Stripe during setup, and payments are deposited directly. Touchline never touches or holds your money.',
  },
  {
    question: 'Are there any hidden charges?',
    answer: 'No. Our pricing is: club management subscription (from £99/month) + 0.5% on payment transactions. Stripe charges their standard processing fee separately. There are no setup fees, withdrawal fees, minimum volumes, or surprise charges.',
  },
  {
    question: 'What payment methods can parents use?',
    answer: 'All major debit and credit cards (Visa, Mastercard, Amex), Apple Pay, and Google Pay — whatever Stripe supports in your country. Parents can also save their card details for recurring payments.',
  },
  {
    question: 'Can I collect recurring subscriptions?',
    answer: 'Yes. You create payment plans (weekly, monthly, or one-off) and assign them to players. Parents receive a payment link and can pay directly. You can track who\'s paid, send reminders, and view everything in your finance dashboard.',
  },
  {
    question: 'Do I need to be a Stripe expert?',
    answer: 'Not at all. We guide you through connecting your Stripe account (takes about 5 minutes). After that, everything is managed from your Touchline club dashboard — create plans, assign to players, track payments, download reports.',
  },
  {
    question: 'What about GDPR and data protection?',
    answer: 'Touchline is fully GDPR compliant. All payment data is handled by Stripe (who are PCI DSS Level 1 certified). We never store card numbers. Parent data is stored securely and only accessible to authorised club staff.',
  },
]

export default function ClubPaymentFees() {
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
        title="Club Payment Collection - 0.5% Fee"
        description="Collect match fees, subscriptions, and kit payments online with just a 0.5% platform fee. The lowest payment fees in grassroots football. Money goes straight to your bank."
        path="/club-payments"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-navy-950/80 backdrop-blur-md border-b border-navy-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo />
            <div className="flex items-center gap-2 sm:gap-4">
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
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              The lowest payment fees in grassroots football
            </span>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Collect club payments with a{' '}
              <span className="text-gradient">0.5% fee</span>
            </h1>

            <p className="text-lg sm:text-xl text-navy-300 mb-4 max-w-2xl mx-auto">
              Match fees, subscriptions, kit costs, camp bookings, event registrations — collect everything online.
              Money goes straight to your bank account. No hidden charges. No contracts.
            </p>

            <p className="text-navy-400 mb-8">
              While other platforms charge 2–5%, Touchline charges just 0.5%.
              Because grassroots clubs shouldn't be paying premium fees.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="btn-primary btn-lg">
                Get Started Free
                <ChevronRight className="w-5 h-5" />
              </Link>
              <Link to="/pricing" className="btn-secondary btn-lg">
                View All Plans
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* The big number */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-navy-900/50 to-navy-950">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="card p-8"
            >
              <div className="text-5xl font-bold text-pitch-400 mb-2">0.5%</div>
              <p className="text-navy-300">Platform fee per transaction</p>
              <p className="text-navy-500 text-sm mt-1">That's just 5p on a £10 payment</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="card p-8"
            >
              <div className="text-5xl font-bold text-amber-400 mb-2">£0</div>
              <p className="text-navy-300">Setup or withdrawal fees</p>
              <p className="text-navy-500 text-sm mt-1">No hidden charges, ever</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="card p-8"
            >
              <div className="text-5xl font-bold text-pitch-400 mb-2">0</div>
              <p className="text-navy-300">Days we hold your money</p>
              <p className="text-navy-500 text-sm mt-1">Straight to your Stripe account</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Transparency points */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4 text-center">Transparent by design</h2>
          <p className="text-lg text-navy-300 text-center max-w-2xl mx-auto mb-12">
            We believe grassroots clubs deserve honest pricing. Here's exactly how we work.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {transparencyPoints.map((point, index) => (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card p-6 hover:border-pitch-700/50 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-pitch-500/10 flex items-center justify-center mb-4 group-hover:bg-pitch-500/20 transition-colors">
                  <point.icon className="w-6 h-6 text-pitch-400" />
                </div>
                <h3 className="font-display text-xl font-semibold text-white mb-2">{point.title}</h3>
                <p className="text-navy-400">{point.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-navy-900/50 to-navy-950">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4 text-center">How we compare</h2>
          <p className="text-lg text-navy-300 text-center max-w-2xl mx-auto mb-12">
            Most platforms use payment collection as their main revenue stream.
            We think your club's money should stay with your club.
          </p>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-navy-700">
                    <th className="text-left text-navy-400 text-sm font-medium px-4 py-3">Platform</th>
                    <th className="text-left text-navy-400 text-sm font-medium px-4 py-3">Platform Fee</th>
                    <th className="text-left text-navy-400 text-sm font-medium px-4 py-3">Processing</th>
                    <th className="text-left text-navy-400 text-sm font-medium px-4 py-3">Holds Funds</th>
                    <th className="text-left text-navy-400 text-sm font-medium px-4 py-3">Contract</th>
                    <th className="text-left text-navy-400 text-sm font-medium px-4 py-3">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((row) => (
                    <tr
                      key={row.name}
                      className={`border-b border-navy-800 last:border-b-0 ${row.highlight ? 'bg-pitch-500/5' : ''}`}
                    >
                      <td className={`px-4 py-3 font-medium ${row.highlight ? 'text-pitch-400' : 'text-navy-300'}`}>
                        {row.name}
                      </td>
                      <td className={`px-4 py-3 ${row.highlight ? 'text-pitch-300 font-semibold' : 'text-navy-400'}`}>
                        {row.platformFee}
                      </td>
                      <td className="px-4 py-3 text-navy-400">{row.processing}</td>
                      <td className="px-4 py-3">
                        {row.heldFunds === 'No' ? (
                          <span className="text-pitch-400 font-medium">No</span>
                        ) : (
                          <span className="text-amber-400">Yes</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.contracts === 'None' ? (
                          <span className="text-pitch-400 font-medium">None</span>
                        ) : (
                          <span className="text-navy-400">{row.contracts}</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 font-medium ${row.highlight ? 'text-pitch-400' : 'text-navy-300'}`}>
                        {row.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-navy-500 text-sm text-center mt-4">
            Competitor fees are based on publicly available pricing as of 2025. Actual fees may vary.
          </p>
        </div>
      </section>

      {/* Savings calculator */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4 text-center">
            How much could your club save?
          </h2>
          <p className="text-lg text-navy-300 text-center max-w-2xl mx-auto mb-12">
            The difference between 0.5% and 2–5% adds up fast. Here's what your club could keep.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {savingsExamples.map((example) => (
              <motion.div
                key={example.annual}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="card p-5 text-center"
              >
                <p className="text-navy-400 text-sm mb-1">Annual payments</p>
                <p className="text-2xl font-bold text-white mb-3">{example.annual}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-navy-400">Touchline fee:</span>
                    <span className="text-pitch-400 font-medium">{example.touchline}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-navy-400">Others charge:</span>
                    <span className="text-navy-300">{example.typical}</span>
                  </div>
                  <div className="border-t border-navy-700 pt-2 flex justify-between">
                    <span className="text-navy-400 font-medium">You save:</span>
                    <span className="text-pitch-400 font-bold">{example.saved}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-navy-500 text-sm text-center mt-6">
            Savings calculated by comparing Touchline's 0.5% platform fee against typical 2.5–5% competitor fees.
            All transactions also incur Stripe's standard processing fee.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-navy-900/50 to-navy-950">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-12 text-center">
            How payment collection works
          </h2>

          <div className="space-y-8">
            {[
              { step: '1', title: 'Connect your Stripe account', desc: 'Create or connect a free Stripe account in about 5 minutes. This is where your money goes — directly to your bank account.' },
              { step: '2', title: 'Create payment plans', desc: 'Set up match fees, monthly subscriptions, or one-off payments for kit, trips, and more. Assign plans to specific teams or players.' },
              { step: '3', title: 'Parents pay online', desc: 'Each parent receives a simple payment link. They pay with card, Apple Pay, or Google Pay. No app download required.' },
              { step: '4', title: 'Track everything', desc: 'See who\'s paid, who\'s overdue, and send reminders from your finance dashboard. Export reports as CSV for your treasurer.' },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-6 items-start"
              >
                <div className="w-12 h-12 rounded-full bg-pitch-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-pitch-400 font-bold text-lg">{item.step}</span>
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-navy-400">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What else you get */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4 text-center">
            Payment collection is just the start
          </h2>
          <p className="text-lg text-navy-300 text-center max-w-2xl mx-auto mb-12">
            {APP_NAME} club plans include everything you need to run a grassroots football club.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: ShieldCheck, title: 'Safeguarding & DBS Tracking', desc: 'Track DBS checks, first aid certs, and safeguarding qualifications. Automatic expiry alerts and incident reporting.' },
              { icon: CalendarDays, title: 'Events & Camp Management', desc: 'Run holiday camps and tournaments with online registration. Parents sign up and pay in one step.' },
              { icon: Sparkles, title: 'AI Club Intelligence', desc: 'AI-generated match reports, attendance insights, season summaries for your AGM, and grant application drafts.' },
              { icon: Users, title: 'Player & Guardian CRM', desc: 'Manage all your players and their parents in one place. Contact details, medical info, and emergency contacts.' },
              { icon: Building2, title: 'Multi-Team Management', desc: 'Manage all your age groups from one dashboard. Each team gets full access to coaching tools.' },
              { icon: Shield, title: 'Role-Based Access', desc: 'Give your treasurer, secretary, welfare officer, and coaches the right level of access.' },
              { icon: Eye, title: 'Parent Portal', desc: 'Parents get their own login to view schedules, pay subscriptions, RSVP availability, and read club announcements.' },
              { icon: BarChart3, title: 'Training Schedule & Attendance', desc: 'Manage training sessions, track availability RSVPs, and monitor attendance trends across all teams.' },
              { icon: PoundSterling, title: 'Finance Dashboard', desc: 'Track revenue, view transaction history, forecast income, and export reports as CSV for your committee.' },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card p-6"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
                  <feature.icon className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="font-display font-semibold text-white mb-1">{feature.title}</h3>
                <p className="text-navy-400 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Related pages */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-navy-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <Link to="/grassroots-football-coaching" className="card p-6 hover:border-pitch-700/50 transition-colors group">
              <h3 className="font-display text-lg font-semibold text-white mb-1 group-hover:text-pitch-400 transition-colors">Grassroots Coaching Tools →</h3>
              <p className="text-navy-400 text-sm">AI-powered session planning and player development.</p>
            </Link>
            <Link to="/youth-football-coaches" className="card p-6 hover:border-pitch-700/50 transition-colors group">
              <h3 className="font-display text-lg font-semibold text-white mb-1 group-hover:text-pitch-400 transition-colors">Youth Coaching App →</h3>
              <p className="text-navy-400 text-sm">Age-appropriate tools for developing young players.</p>
            </Link>
            <Link to="/pricing" className="card p-6 hover:border-pitch-700/50 transition-colors group">
              <h3 className="font-display text-lg font-semibold text-white mb-1 group-hover:text-pitch-400 transition-colors">Full Pricing →</h3>
              <p className="text-navy-400 text-sm">View all team and club plans with detailed features.</p>
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
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">Payment FAQs</h2>
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
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              Stop overpaying for payment collection
            </h2>
            <p className="text-lg text-navy-300 mb-8 max-w-2xl mx-auto">
              Switch to {APP_NAME} and keep more of your club's money where it belongs — in your club.
              Get started free today.
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
