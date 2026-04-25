import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Don't show if user already dismissed
    if (localStorage.getItem('mb-install-dismissed')) return

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    localStorage.setItem('mb-install-dismissed', 'true')
    setShowPrompt(false)
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowPrompt(false)
    } else {
      dismiss()
    }
    setDeferredPrompt(null)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-navy-800 border border-navy-600 text-white p-4 rounded-xl shadow-xl max-w-md mx-auto">
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 text-white/60 hover:text-white"
      >
        <X size={18} />
      </button>
      <div className="flex items-start gap-3">
        <div className="bg-green-500/20 p-2 rounded-lg">
          <Download size={20} className="text-green-400" />
        </div>
        <div>
          <p className="font-semibold">Install Touchline</p>
          <p className="text-sm text-white/70 mt-0.5">Add to your home screen for quick access</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleInstall}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              Install
            </button>
            <button
              onClick={dismiss}
              className="text-white/60 hover:text-white px-4 py-1.5 text-sm transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
