import { useState, useEffect } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ChevronRight,
  Check,
  Camera,
  ArrowRight,
} from 'lucide-react'
import SEO from '../../components/common/SEO'
import { features, featuresBySlug } from '../../data/features'
import { SERVER_URL } from '../../services/api'

function ScreenshotOrPlaceholder({ dataUrl, alt }) {
  if (dataUrl) {
    return <img src={dataUrl} alt={alt} className="w-full rounded-xl border border-navy-700/50 aspect-video object-cover" loading="lazy" />
  }

  return (
    <div className="bg-navy-800/50 rounded-xl border border-navy-700/50 flex items-center justify-center aspect-video">
      <div className="text-center text-navy-500">
        <Camera className="w-10 h-10 mx-auto mb-2" />
        <p className="text-sm font-medium">{alt}</p>
        <p className="text-xs mt-1">Screenshot coming soon</p>
      </div>
    </div>
  )
}

export default function FeaturePage() {
  const { slug } = useParams()
  const feature = featuresBySlug[slug]
  const [screenshots, setScreenshots] = useState({})

  // Fetch screenshots for this feature
  useEffect(() => {
    if (!slug) return
    fetch(`${SERVER_URL}/api/feature-screenshots/${slug}`)
      .then(r => r.ok ? r.json() : {})
      .then(data => setScreenshots(data))
      .catch(() => setScreenshots({}))
  }, [slug])

  if (!feature) return <Navigate to="/" replace />

  const otherFeatures = features.filter(f => f.slug !== slug)

  return (
    <div className="min-h-screen bg-navy-950">
      <SEO
        title={feature.seo.title}
        description={feature.seo.description}
        path={`/features/${slug}`}
      />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-navy-950/80 backdrop-blur-xl border-b border-navy-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pitch-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-display font-bold text-white text-lg">Touchline</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-navy-400 hover:text-white transition-colors hidden sm:inline">
              Log In
            </Link>
            <Link to="/register" className="btn-primary text-sm px-4 py-2">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="pt-12 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-sm text-navy-500 mb-6">
              <Link to="/" className="hover:text-navy-300 transition-colors">Home</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-navy-400">Features</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-pitch-400">{feature.title}</span>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-pitch-500/15 flex items-center justify-center">
                  <feature.icon className="w-7 h-7 text-pitch-400" />
                </div>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                {feature.title}
              </h1>
              <p className="text-lg sm:text-xl text-navy-300 max-w-2xl mb-8">
                {feature.subtitle}
              </p>

              <div className="flex flex-wrap gap-3">
                <Link to="/register" className="btn-primary px-6 py-3 text-base">
                  Try Free <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/#features" className="btn-secondary px-6 py-3 text-base">
                  See All Features
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Hero Screenshot */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <ScreenshotOrPlaceholder dataUrl={screenshots.hero} alt={`${feature.title} — main view`} />
            </motion.div>
          </div>
        </section>

        {/* The Problem */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-navy-900/30 to-navy-950">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-lg text-navy-200 leading-relaxed mb-6 italic">
                {feature.problem.intro}
              </p>
              <p className="text-xl font-display font-semibold text-pitch-400 mb-4">
                {feature.problem.hook}
              </p>
              <p className="text-navy-300">
                {feature.problem.body}
              </p>
            </motion.div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-2xl sm:text-3xl font-bold text-white mb-12 text-center"
            >
              How It Works
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {feature.steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="relative"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-pitch-500/15 flex items-center justify-center shrink-0">
                      <step.icon className="w-5 h-5 text-pitch-400" />
                    </div>
                    <span className="text-pitch-500 text-sm font-mono font-bold">Step {i + 1}</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-navy-400 text-sm leading-relaxed mb-4">
                    {step.detail}
                  </p>
                  <ScreenshotOrPlaceholder dataUrl={screenshots[`step_${i + 1}`]} alt={`Step ${i + 1}: ${step.title}`} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Key Capabilities */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-navy-900/30 to-navy-950">
          <div className="max-w-4xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-2xl sm:text-3xl font-bold text-white mb-12 text-center"
            >
              Key Capabilities
            </motion.h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {feature.capabilities.map((cap, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="card p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-pitch-500/10 flex items-center justify-center shrink-0">
                      <cap.icon className="w-5 h-5 text-pitch-400" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-white mb-1">{cap.title}</h3>
                      <p className="text-sm text-navy-400 leading-relaxed">{cap.detail}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Quote */}
        {feature.quote && (
          <section className="py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <blockquote className="text-xl sm:text-2xl text-white font-display leading-relaxed mb-4 italic">
                  "{feature.quote.text}"
                </blockquote>
                <p className="text-navy-400 text-sm">— {feature.quote.author}</p>
              </motion.div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-navy-900/50 to-navy-950">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">
                Ready to try it?
              </h2>
              <p className="text-navy-400 mb-8">
                Join grassroots coaches across the UK who are saving hours every week.
              </p>
              <Link to="/register" className="btn-primary px-8 py-3 text-base inline-flex items-center gap-2">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-sm text-navy-500 mt-4">
                Free plan available. Paid plans from £9.99/month. Cancel anytime.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Other Features */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-navy-800/50">
          <div className="max-w-6xl mx-auto">
            <h3 className="font-display text-xl font-semibold text-white mb-8 text-center">
              Explore More Features
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {otherFeatures.map(f => (
                <Link
                  key={f.slug}
                  to={`/features/${f.slug}`}
                  className="card p-4 hover:border-pitch-700/50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-pitch-500/10 flex items-center justify-center mb-3 group-hover:bg-pitch-500/20 transition-colors">
                    <f.icon className="w-5 h-5 text-pitch-400" />
                  </div>
                  <h4 className="font-display font-medium text-sm text-white">{f.title}</h4>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-navy-800/50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-pitch-500 flex items-center justify-center">
                <span className="text-white font-bold text-xs">T</span>
              </div>
              <span className="text-sm text-navy-500">Touchline &copy; {new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-navy-500">
              <Link to="/terms" className="hover:text-navy-300 transition-colors">Terms</Link>
              <Link to="/pricing" className="hover:text-navy-300 transition-colors">Pricing</Link>
              <Link to="/blog" className="hover:text-navy-300 transition-colors">Blog</Link>
            </div>
          </div>
          <p className="text-navy-600 text-xs text-center mt-4">
            Built by <a href="https://moonbootsconsultancy.net" target="_blank" rel="noopener noreferrer" className="hover:text-navy-400 transition-colors underline">MoonBoots Consultancy</a>
          </p>
        </footer>
      </main>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Touchline',
            applicationCategory: 'SportsApplication',
            operatingSystem: 'Web, iOS, Android',
            offers: {
              '@type': 'Offer',
              price: '9.99',
              priceCurrency: 'GBP',
            },
            description: feature.seo.description,
            url: `https://touchline.xyz/features/${slug}`,
            author: {
              '@type': 'Organization',
              name: 'Touchline',
              url: 'https://touchline.xyz',
            },
          }),
        }}
      />
    </div>
  )
}
