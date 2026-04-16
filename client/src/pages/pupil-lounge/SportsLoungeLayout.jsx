import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import BottomTabBar from '../../components/pupil-lounge/BottomTabBar'
import PupilInstallPrompt from '../../components/pupil-lounge/PupilInstallPrompt'

function ImpersonationBanner() {
  const { impersonating, endImpersonation } = useAuth()
  const navigate = useNavigate()

  if (!impersonating) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-xs font-medium flex items-center justify-between px-3 py-1.5">
      <span>Viewing as: {impersonating} (test persona)</span>
      <button
        onClick={() => { endImpersonation(); navigate('/teacher/hod/test-personas') }}
        className="bg-white/20 hover:bg-white/30 rounded px-2 py-0.5 text-xs transition-colors"
      >
        Return to HoD
      </button>
    </div>
  )
}

export default function SportsLoungeLayout() {
  const { impersonating } = useAuth()

  return (
    <div className="flex flex-col h-[100dvh] bg-navy-950 text-white">
      <ImpersonationBanner />

      <main
        className={`flex-1 overflow-y-auto overscroll-y-contain ${
          impersonating ? 'pt-8' : ''
        }`}
        style={{
          paddingBottom: 'calc(60px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <Outlet />
      </main>

      <BottomTabBar />
      <PupilInstallPrompt />
    </div>
  )
}
