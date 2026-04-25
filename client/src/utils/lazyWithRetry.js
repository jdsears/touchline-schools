import { lazy } from 'react'

/**
 * Wrap React.lazy so that a "Failed to fetch dynamically imported module"
 * error (typical after we ship a new build — old tabs reference chunk hashes
 * that no longer exist) triggers a one-shot hard reload instead of showing
 * the ErrorBoundary.
 *
 * sessionStorage is used to prevent infinite reload loops if the import is
 * genuinely broken rather than just stale.
 */
const RELOAD_KEY = 'stale_chunk_reload'

export function lazyWithRetry(factory) {
  return lazy(async () => {
    try {
      return await factory()
    } catch (err) {
      const msg = String(err?.message || err || '')
      const isChunkError =
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Importing a module script failed') ||
        msg.includes('error loading dynamically imported module') ||
        /Loading chunk \S+ failed/.test(msg) ||
        /Loading CSS chunk \S+ failed/.test(msg)

      if (isChunkError && window.sessionStorage.getItem(RELOAD_KEY) !== '1') {
        window.sessionStorage.setItem(RELOAD_KEY, '1')
        window.location.reload()
        // Never-resolving promise so React holds the Suspense fallback
        // while the reload is in flight.
        return new Promise(() => {})
      }
      throw err
    }
  })
}
