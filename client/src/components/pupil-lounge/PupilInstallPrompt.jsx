import { X, Download, Share } from 'lucide-react'
import { usePWAInstall } from '../../hooks/usePWAInstall'

/**
 * PWA install prompt for pupil users. Shows after 3 visits when not
 * already installed as a PWA. Handles both Android (native prompt)
 * and iOS (manual Add to Home Screen instructions).
 */
export default function PupilInstallPrompt() {
  const { showPrompt, isIOSDevice, triggerInstall, dismiss } = usePWAInstall()

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 bg-navy-800 border border-gold-500/30 text-white p-4 rounded-xl shadow-xl max-w-md mx-auto">
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 text-white/60 hover:text-white p-1"
        aria-label="Dismiss"
      >
        <X size={18} />
      </button>

      <div className="flex items-start gap-3">
        <div className="bg-gold-500/20 p-2 rounded-lg flex-shrink-0">
          <Download size={20} className="text-gold-400" />
        </div>
        <div>
          <p className="font-semibold text-sm">Add to Home Screen</p>
          {isIOSDevice ? (
            <p className="text-xs text-white/70 mt-1">
              Tap{' '}
              <Share size={12} className="inline -mt-0.5" />{' '}
              then <span className="font-medium text-white">"Add to Home Screen"</span> for the full app experience.
            </p>
          ) : (
            <>
              <p className="text-xs text-white/70 mt-0.5">
                Install for quick access from your home screen
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={triggerInstall}
                  className="bg-gold-500 hover:bg-gold-600 text-navy-900 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                >
                  Install
                </button>
                <button
                  onClick={dismiss}
                  className="text-white/50 hover:text-white px-3 py-1.5 text-xs transition-colors"
                >
                  Not now
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
