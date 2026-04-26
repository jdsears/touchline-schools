import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie, X, Settings, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  hasConsentChoice,
  acceptAllCookies,
  acceptEssentialOnly,
  updateConsentPreferences,
  getConsentPreferences,
} from '../../utils/analytics'

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState({
    analytics: false,
  })

  useEffect(() => {
    // Check if user has already made a choice
    if (!hasConsentChoice()) {
      // Small delay to not show immediately on page load
      const timer = setTimeout(() => setShowBanner(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAcceptAll = () => {
    acceptAllCookies()
    setShowBanner(false)
    setShowSettings(false)
  }

  const handleEssentialOnly = () => {
    acceptEssentialOnly()
    setShowBanner(false)
    setShowSettings(false)
  }

  const handleSavePreferences = () => {
    updateConsentPreferences(preferences)
    setShowBanner(false)
    setShowSettings(false)
  }

  const handleOpenSettings = () => {
    // Load existing preferences if any
    const existing = getConsentPreferences()
    if (existing) {
      setPreferences({
        analytics: existing.analytics || false,
      })
    }
    setShowSettings(true)
  }

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6"
        >
          <div className="max-w-4xl mx-auto">
            <div className="bg-card border border-border-strong rounded-xl shadow-2xl overflow-hidden">
              {!showSettings ? (
                // Main Banner
                <div className="p-4 md:p-6">
                  <div className="flex items-start gap-4">
                    <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-pitch-500/20 text-pitch-400 flex-shrink-0">
                      <Cookie className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-primary mb-2">
                        Cookies
                      </h3>
                      <p className="text-secondary text-sm mb-4">
                        We use essential cookies to make MoonBoots Sports work and anonymised analytics to improve it.
                        We don't use advertising, marketing, or third-party tracking cookies.
                        Learn more in our{' '}
                        <Link to="/terms" className="text-pitch-400 hover:underline">
                          Cookie Policy
                        </Link>.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={handleAcceptAll}
                          className="px-4 py-2 bg-pitch-500 hover:bg-pitch-600 text-navy-950 font-medium rounded-lg transition-colors"
                        >
                          Accept All
                        </button>
                        <button
                          onClick={handleEssentialOnly}
                          className="px-4 py-2 bg-subtle hover:bg-border-default text-primary font-medium rounded-lg border border-border-strong transition-colors"
                        >
                          Essential Only
                        </button>
                        <button
                          onClick={handleOpenSettings}
                          className="px-4 py-2 text-secondary hover:text-primary font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Settings className="w-4 h-4" />
                          Manage Preferences
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleEssentialOnly}
                      className="text-secondary hover:text-primary transition-colors p-1"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                // Settings Panel
                <div className="p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-primary">Cookie Preferences</h3>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="text-secondary hover:text-primary transition-colors p-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4 mb-6">
                    {/* Essential Cookies - Always On */}
                    <div className="flex items-start justify-between p-4 bg-subtle rounded-lg border border-border-strong">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-primary">Essential Cookies</h4>
                          <span className="text-xs px-2 py-0.5 bg-border-default text-secondary rounded">Always On</span>
                        </div>
                        <p className="text-sm text-secondary">
                          Required for the platform to function (session token, CSRF protection, display preferences). These cannot be disabled.
                        </p>
                      </div>
                      <div className="flex items-center justify-center w-10 h-6 bg-pitch-500 rounded-full">
                        <Check className="w-4 h-4 text-navy-950" />
                      </div>
                    </div>

                    {/* Analytics Cookies */}
                    <div className="flex items-start justify-between p-4 bg-subtle rounded-lg border border-border-strong">
                      <div className="flex-1 pr-4">
                        <h4 className="font-medium text-primary mb-1">Analytics (anonymised)</h4>
                        <p className="text-sm text-secondary">
                          Anonymised usage data to understand how the platform is used and where we can improve it. This data cannot identify you personally.
                        </p>
                      </div>
                      <button
                        onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                        className={`relative w-10 h-6 rounded-full transition-colors ${
                          preferences.analytics ? 'bg-pitch-500' : 'bg-navy-600'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            preferences.analytics ? 'left-5' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleSavePreferences}
                      className="px-4 py-2 bg-pitch-500 hover:bg-pitch-600 text-navy-950 font-medium rounded-lg transition-colors"
                    >
                      Save Preferences
                    </button>
                    <button
                      onClick={handleAcceptAll}
                      className="px-4 py-2 bg-subtle hover:bg-border-default text-primary font-medium rounded-lg border border-border-strong transition-colors"
                    >
                      Accept All
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
