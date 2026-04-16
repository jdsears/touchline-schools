import { useState } from 'react'
import { LogOut, Bell, HelpCircle, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePupilProfile } from '../../hooks/usePupilProfile'

const HOUSE_COLOURS = {
  elm: 'bg-green-600', oak: 'bg-amber-600', maple: 'bg-red-600',
  birch: 'bg-sky-600', willow: 'bg-purple-600', ash: 'bg-slate-600',
}

function Avatar({ name }) {
  const initials = (name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
      <span className="text-navy-900 font-bold text-xl">{initials}</span>
    </div>
  )
}

function SettingsRow({ icon: Icon, label, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-navy-800/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className="text-navy-400" />
        <span className="text-sm text-white">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        {value && <span className="text-xs text-navy-500">{value}</span>}
        <ChevronRight size={16} className="text-navy-600" />
      </div>
    </button>
  )
}

export default function MePage() {
  const { user, logout, impersonating, endImpersonation } = useAuth()
  const { pupil } = usePupilProfile()
  const navigate = useNavigate()
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)

  const fullName = pupil?.name || user?.name || 'Pupil'
  const houseBg = pupil?.house ? HOUSE_COLOURS[pupil.house.toLowerCase()] || 'bg-navy-700' : null

  const handleSignOut = () => {
    if (impersonating) {
      endImpersonation()
      navigate('/teacher/hod/test-personas')
    } else {
      logout()
      navigate('/')
    }
  }

  return (
    <div className="pb-4">
      {/* Profile summary */}
      <div className="flex flex-col items-center pt-8 pb-5 px-4">
        <Avatar name={fullName} />
        <h1 className="text-lg font-bold text-white mt-3">{fullName}</h1>
        <div className="flex items-center gap-2 mt-1">
          {pupil?.year_group && (
            <span className="text-xs text-navy-400">Year {pupil.year_group}</span>
          )}
          {pupil?.house && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-semibold ${houseBg}`}>
              {pupil.house}
            </span>
          )}
        </div>
      </div>

      {/* Settings sections */}
      <div className="mx-4 bg-navy-900/60 rounded-2xl border border-navy-800/50 overflow-hidden divide-y divide-navy-800/30">
        <SettingsRow icon={Bell} label="Notifications" value="" onClick={() => {}} />
        <SettingsRow icon={HelpCircle} label="Help" value="" onClick={() => {}} />
      </div>

      {/* Sign out */}
      <div className="mx-4 mt-4">
        {showSignOutConfirm ? (
          <div className="bg-navy-900/60 border border-navy-800/50 rounded-2xl p-4 text-center">
            <p className="text-sm text-white mb-3">
              {impersonating ? 'End impersonation and return to HoD?' : 'Are you sure you want to sign out?'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
              >
                {impersonating ? 'End session' : 'Sign out'}
              </button>
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="text-navy-400 hover:text-white text-sm px-4 py-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowSignOutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 py-3 text-sm transition-colors"
          >
            <LogOut size={16} />
            {impersonating ? 'End impersonation' : 'Sign out'}
          </button>
        )}
      </div>

      <p className="text-center text-[10px] text-navy-700 mt-6">
        MoonBoots Sports v1.8
      </p>
    </div>
  )
}
