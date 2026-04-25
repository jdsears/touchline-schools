import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PupilProfileProvider, usePupilProfile } from '../../hooks/usePupilProfile'
import BottomTabBar from '../../components/pupil-lounge/BottomTabBar'
import PupilInstallPrompt from '../../components/pupil-lounge/PupilInstallPrompt'

const SL_THEME_KEY = 'touchline-sl-theme'

function SchoolHeader() {
  const { pupil } = usePupilProfile()
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-navy-900/80 backdrop-blur-sm border-b border-navy-800/50">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-gold-500/20 flex items-center justify-center">
          <span className="text-gold-400 text-[10px] font-bold">AP</span>
        </div>
        <span className="text-[11px] font-semibold text-white/80 tracking-wide">
          Ashworth Park Academy
        </span>
      </div>
      {pupil && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
          <span className="text-navy-900 text-[10px] font-bold">
            {(pupil.name || '').split(' ').map(w => w[0]).join('').slice(0, 2)}
          </span>
        </div>
      )}
    </header>
  )
}

function ImpersonationBanner() {
  const { impersonating, endImpersonation } = useAuth()
  const navigate = useNavigate()

  if (!impersonating) return null

  return (
    <div className="bg-amber-600 text-white text-[10px] font-medium flex items-center justify-between px-3 py-1">
      <span>Viewing as: {impersonating}</span>
      <button
        onClick={() => { endImpersonation(); navigate('/teacher/hod/test-personas') }}
        className="bg-white/20 hover:bg-white/30 rounded px-2 py-0.5 transition-colors"
      >
        Return to HoD
      </button>
    </div>
  )
}

function LayoutInner() {
  const { impersonating } = useAuth()

  return (
    <div className="w-full max-w-[430px] mx-auto relative flex flex-col h-[100dvh] bg-navy-950 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
      <ImpersonationBanner />
      <SchoolHeader />

      <main className="flex-1 overflow-y-auto overscroll-y-contain">
        <div className="animate-page-in pb-[calc(60px+env(safe-area-inset-bottom,0px))]">
          <Outlet />
        </div>
      </main>

      <BottomTabBar />
      <PupilInstallPrompt />
    </div>
  )
}

export default function SportsLoungeLayout() {
  const [slTheme, setSlTheme] = useState(() => {
    try { return localStorage.getItem(SL_THEME_KEY) || 'dark' } catch { return 'dark' }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', slTheme)
    try { localStorage.setItem(SL_THEME_KEY, slTheme) } catch {}
    return () => { document.documentElement.setAttribute('data-theme', 'light') }
  }, [slTheme])

  return (
    <PupilProfileProvider>
      <div className={`min-h-[100dvh] ${slTheme === 'dark' ? 'bg-[#060C1A] text-white' : 'bg-page text-primary'}`}>
        <LayoutInner />
      </div>
    </PupilProfileProvider>
  )
}
