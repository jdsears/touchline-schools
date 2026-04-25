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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-subtle border-t border-border-strong text-primary p-4 pb-[env(safe-area-inset-bottom,16px)]">
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 text-primary/60 hover:text-primary"
      >
        <X size={18} />
      </button>
      <p className="font-semibold">Install Touchline</p>
      <p className="text-sm text-primary/70 mt-1">
        Tap <Share size={14} className="inline -mt-0.5" /> then <span className="font-medium text-primary">"Add to Home Screen"</span>
      </p>
    </div>
  )
}
