import { useState, useEffect } from 'react'
import { X, Share } from 'lucide-react'

export default function IOSInstallInstructions() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isStandalone = window.navigator.standalone === true
    const dismissed = localStorage.getItem('mb-ios-install-dismissed')

    if (isIOS && !isStandalone && !dismissed) {
      setShow(true)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem('mb-ios-install-dismissed', 'true')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-navy-800 border-t border-navy-600 text-white p-4 pb-[env(safe-area-inset-bottom,16px)]">
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 text-white/60 hover:text-white"
      >
        <X size={18} />
      </button>
      <p className="font-semibold">Install Touchline</p>
      <p className="text-sm text-white/70 mt-1">
        Tap <Share size={14} className="inline -mt-0.5" /> then <span className="font-medium text-white">"Add to Home Screen"</span>
      </p>
    </div>
  )
}
