// Google Analytics 4 utilities
// Note: Replace G-XXXXXXXXXX in index.html with your actual GA4 Measurement ID

/**
 * Check if analytics is available
 */
export function isAnalyticsEnabled() {
  return typeof window !== 'undefined' && typeof window.gtag === 'function'
}

/**
 * Track a page view
 * @param {string} path - The page path (e.g., '/dashboard')
 * @param {string} title - The page title
 */
export function trackPageView(path, title) {
  if (!isAnalyticsEnabled()) return

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
  })
}

/**
 * Track a custom event
 * @param {string} eventName - The event name (e.g., 'sign_up', 'login')
 * @param {object} params - Additional parameters
 */
export function trackEvent(eventName, params = {}) {
  if (!isAnalyticsEnabled()) return

  window.gtag('event', eventName, params)
}

/**
 * Track user sign up
 * @param {string} method - Sign up method (e.g., 'email', 'google')
 */
export function trackSignUp(method = 'email') {
  trackEvent('sign_up', { method })
}

/**
 * Track user login
 * @param {string} method - Login method
 */
export function trackLogin(method = 'email') {
  trackEvent('login', { method })
}

/**
 * Track feature usage
 * @param {string} featureName - Name of the feature used
 * @param {object} additionalParams - Additional tracking params
 */
export function trackFeatureUsage(featureName, additionalParams = {}) {
  trackEvent('feature_used', {
    feature_name: featureName,
    ...additionalParams,
  })
}

/**
 * Track CTA click on landing page
 * @param {string} ctaName - Name of the CTA (e.g., 'hero_start_free', 'pricing_signup')
 * @param {string} location - Where on the page (e.g., 'hero', 'pricing', 'footer')
 */
export function trackCTAClick(ctaName, location) {
  trackEvent('cta_click', {
    cta_name: ctaName,
    cta_location: location,
  })
}

/**
 * Track scroll depth on landing page
 * @param {number} percentage - Scroll depth percentage (25, 50, 75, 100)
 */
export function trackScrollDepth(percentage) {
  trackEvent('scroll_depth', {
    depth_percentage: percentage,
  })
}

/**
 * Track pricing plan view
 * @param {string} planName - Name of the plan viewed
 */
export function trackPricingView(planName) {
  trackEvent('view_item', {
    item_name: planName,
    item_category: 'pricing_plan',
  })
}

/**
 * Track trial start
 */
export function trackTrialStart() {
  trackEvent('begin_checkout', {
    currency: 'GBP',
    value: 0,
    items: [{ item_name: 'Free Trial', item_category: 'subscription' }],
  })
}

/**
 * Set user properties after authentication
 * @param {string} userId - Unique user identifier (hashed if needed)
 * @param {object} properties - User properties like role, team_format, etc.
 */
export function setUserProperties(userId, properties = {}) {
  if (!isAnalyticsEnabled()) return

  // Set user ID for cross-device tracking
  window.gtag('set', { user_id: userId })

  // Set user properties
  window.gtag('set', 'user_properties', {
    user_role: properties.role,
    team_format: properties.team_format,
    subscription_tier: properties.subscription_tier,
    ...properties,
  })
}

/**
 * Track outbound link clicks
 * @param {string} url - The outbound URL
 * @param {string} linkText - The link text or description
 */
export function trackOutboundLink(url, linkText) {
  trackEvent('click', {
    event_category: 'outbound',
    event_label: linkText,
    transport_type: 'beacon',
    link_url: url,
  })
}

/**
 * Track error events
 * @param {string} errorType - Type of error
 * @param {string} errorMessage - Error message
 * @param {string} errorLocation - Where the error occurred
 */
export function trackError(errorType, errorMessage, errorLocation) {
  trackEvent('exception', {
    description: `${errorType}: ${errorMessage}`,
    fatal: false,
    error_location: errorLocation,
  })
}

// ============================================
// Cookie Consent Management (GDPR Compliance)
// ============================================

const CONSENT_STORAGE_KEY = 'mb_cookie_consent'

/**
 * Get current consent preferences from localStorage
 * @returns {object|null} Consent preferences or null if not set
 */
export function getConsentPreferences() {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

/**
 * Check if user has made a consent choice
 * @returns {boolean}
 */
export function hasConsentChoice() {
  return getConsentPreferences() !== null
}

/**
 * Update consent preferences and sync with Google
 * @param {object} preferences - { analytics: boolean }
 */
export function updateConsentPreferences(preferences) {
  if (typeof window === 'undefined') return

  // Save to localStorage
  const consentData = {
    ...preferences,
    timestamp: new Date().toISOString(),
  }
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentData))

  // Update Google consent mode
  if (isAnalyticsEnabled()) {
    window.gtag('consent', 'update', {
      'analytics_storage': preferences.analytics ? 'granted' : 'denied',
    })
  }

  // Track consent event (this will only work if analytics is granted)
  trackEvent('consent_update', {
    analytics_consent: preferences.analytics ? 'granted' : 'denied',
  })
}

/**
 * Accept all cookies (essential + analytics - no marketing cookies are used)
 */
export function acceptAllCookies() {
  updateConsentPreferences({ analytics: true })
}

/**
 * Accept only essential cookies (deny analytics)
 */
export function acceptEssentialOnly() {
  updateConsentPreferences({ analytics: false })
}

/**
 * Revoke consent and clear stored preference
 */
export function revokeConsent() {
  if (typeof window === 'undefined') return

  localStorage.removeItem(CONSENT_STORAGE_KEY)

  if (isAnalyticsEnabled()) {
    window.gtag('consent', 'update', {
      'analytics_storage': 'denied',
    })
  }
}
