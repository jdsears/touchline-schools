/**
 * Get the frontend URL for generating links in emails and notifications.
 * Priority:
 * 1. FRONTEND_URL environment variable (explicitly set)
 * 2. RAILWAY_PUBLIC_DOMAIN (auto-provided by Railway in production)
 * 3. Fallback to app.moonbootssports.com (production default)
 * 4. localhost for development
 */
export function getFrontendUrl() {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL
  }

  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  }

  if (process.env.NODE_ENV === 'production') {
    return 'https://app.moonbootssports.com'
  }

  return 'http://localhost:5173'
}
