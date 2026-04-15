import { useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  trackPageView,
  trackEvent,
  trackCTAClick,
  trackFeatureUsage,
  setUserProperties,
} from '../utils/analytics'

/**
 * Hook to automatically track page views on route changes
 * @param {string} pageTitle - Optional page title override
 */
export function usePageTracking(pageTitle) {
  const location = useLocation()

  useEffect(() => {
    // Map routes to readable page titles
    const pageTitles = {
      '/': 'Landing Page',
      '/login': 'Login',
      '/register': 'Register',
      '/pricing': 'Pricing',
      '/terms': 'Terms of Service',
      '/dashboard': 'Dashboard',
      '/chat': 'AI Chat',
      '/tactics': 'Tactics Board',
      '/training': 'Training',
      '/pupils': 'Players',
      '/matches': 'Matches',
      '/fixtures': 'Fixtures',
      '/league': 'League Table',
      '/lounge': 'Team Lounge',
      '/settings': 'Settings',
      '/pupil-lounge': 'Pupil Lounge',
    }

    const title = pageTitle || pageTitles[location.pathname] || 'Page'
    trackPageView(location.pathname, title)
  }, [location.pathname, pageTitle])
}

/**
 * Hook providing analytics tracking functions
 */
export function useAnalytics() {
  const track = useCallback((eventName, params = {}) => {
    trackEvent(eventName, params)
  }, [])

  const trackCTA = useCallback((ctaName, location) => {
    trackCTAClick(ctaName, location)
  }, [])

  const trackFeature = useCallback((featureName, params = {}) => {
    trackFeatureUsage(featureName, params)
  }, [])

  const identifyUser = useCallback((userId, properties = {}) => {
    setUserProperties(userId, properties)
  }, [])

  return {
    track,
    trackCTA,
    trackFeature,
    identifyUser,
  }
}

/**
 * Hook to track scroll depth on landing page
 */
export function useScrollTracking() {
  useEffect(() => {
    const scrollThresholds = [25, 50, 75, 100]
    const trackedThresholds = new Set()

    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = Math.round((scrollTop / docHeight) * 100)

      scrollThresholds.forEach(threshold => {
        if (scrollPercent >= threshold && !trackedThresholds.has(threshold)) {
          trackedThresholds.add(threshold)
          trackEvent('scroll_depth', { depth_percentage: threshold })
        }
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
}

export default useAnalytics
