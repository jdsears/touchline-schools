import { useState, useEffect, useCallback } from 'react'

const VISIT_KEY = 'pwa_visit_count'
const DISMISSED_KEY = 'pwa_install_dismissed'
const VISIT_THRESHOLD = 3

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

/**
 * Hook to manage PWA install prompts for pupil users.
 *
 * Returns:
 *  - showPrompt: boolean (true when the prompt should be displayed)
 *  - isIOSDevice: boolean (true on iOS, where install is manual)
 *  - triggerInstall: function (calls the native install prompt on Android/desktop)
 *  - dismiss: function (hides the prompt permanently)
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const isIOSDevice = isIOS()

  useEffect(() => {
    // Already installed as PWA or user dismissed permanently
    if (isStandalone() || localStorage.getItem(DISMISSED_KEY) === 'true') return

    // Increment visit count
    const count = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10) + 1
    localStorage.setItem(VISIT_KEY, String(count))

    if (count < VISIT_THRESHOLD) return

    // On iOS we always show manual instructions (no beforeinstallprompt)
    if (isIOSDevice) {
      setShowPrompt(true)
      return
    }

    // Android/desktop: listen for the native install event
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [isIOSDevice])

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }, [deferredPrompt])

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setShowPrompt(false)
  }, [])

  return { showPrompt, isIOSDevice, triggerInstall, dismiss }
}
