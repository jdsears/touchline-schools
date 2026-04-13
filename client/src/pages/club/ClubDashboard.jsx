import { useState, useEffect } from 'react'
import { useOutletContext, Link, useParams } from 'react-router-dom'
import { clubService } from '../../services/api'
import {
  Users, UserCheck, Building2, ClipboardList, AlertCircle, ChevronRight,
  Copy, Check, CreditCard, Megaphone, ShieldCheck, CalendarDays,
  BarChart3, Settings, TrendingUp, FileText,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ClubDashboard() {
  const { club, myRole } = useOutletContext()
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (club?.id) loadDashboard()
  }, [club?.id])

  async function loadDashboard() {
    try {
      const res = await clubService.getDashboard(club.id)
      setData(res.data)
    } catch (err) {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  function copyRegLink() {
    navigator.clipboard.writeText(`${window.location.origin}/club/${slug}/register`)
    setCopied(true)
    toast.success('Registration link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  const stats = data?.stats || {}
  const isAdmin = ['owner', 'admin'].includes(myRole)

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{club.name}</h1>
          <p className="text-navy-400 text-sm mt-1">
            {club.league && <span>{club.league} &middot; </span>}
            {club.charter_standard && <span>{club.charter_standard} &middot; </span>}
            <span className="capitalize">{club.subscription_tier?.replace('_', ' ')}</span>
          </p>
        </div>
        <button
          onClick={copyRegLink}
          className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          Copy Registration Link
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Teams', value: stats.total_teams, icon: Building2, href: `/club/${slug}/teams`, color: 'text-blue-400' },
          { label: 'Players', value: stats.total_players, icon: Users, href: `/club/${slug}/players`, color: 'text-pitch-400' },
          { label: 'Guardians', value: stats.total_guardians, icon: UserCheck, href: `/club/${slug}/guardians`, color: 'text-amber-400' },
          { label: 'Staff', value: stats.total_members, icon: Users, href: `/club/${slug}/members`, color: 'text-purple-400' },
          { label: 'Pending', value: stats.pending_registrations, icon: ClipboardList, href: `/club/${slug}/registrations`, color: stats.pending_registrations > 0 ? 'text-alert-400' : 'text-navy-400' },
        ].map((stat) => (
          <Link
            key={stat.label}
            to={stat.href}
            className="bg-navy-900 border border-navy-800 rounded-xl p-4 hover:border-navy-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              {stat.value > 0 && stat.label === 'Pending' && (
                <span className="w-2 h-2 rounded-full bg-alert-400 animate-pulse" />
              )}
            </div>
            <p className="text-2xl font-bold text-white">{stat.value ?? 0}</p>
            <p className="text-xs text-navy-400 mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Pending registrations alert */}
      {stats.pending_registrations > 0 && (
        <Link
          to={`/club/${slug}/registrations`}
          className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 hover:bg-amber-500/20 transition-colors"
        >
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-400">
              {stats.pending_registrations} pending registration{stats.pending_registrations !== 1 ? 's' : ''} to review
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-400" />
        </Link>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: 'Payments', description: 'Payment plans & billing', icon: CreditCard, href: `/club/${slug}/payments`, color: 'text-green-400 bg-green-500/10' },
            { label: 'Finance', description: 'Revenue & transactions', icon: TrendingUp, href: `/club/${slug}/finance`, color: 'text-emerald-400 bg-emerald-500/10', roles: ['owner', 'admin', 'treasurer'] },
            { label: 'Announcements', description: 'Notify players & parents', icon: Megaphone, href: `/club/${slug}/announcements`, color: 'text-blue-400 bg-blue-500/10' },
            { label: 'Safeguarding', description: 'Compliance & welfare', icon: ShieldCheck, href: `/club/${slug}/safeguarding`, color: 'text-amber-400 bg-amber-500/10' },
            { label: 'Events', description: 'Club events & calendar', icon: CalendarDays, href: `/club/${slug}/events`, color: 'text-purple-400 bg-purple-500/10' },
            { label: 'Schedule', description: 'Season calendar view', icon: CalendarDays, href: `/club/${slug}/schedule`, color: 'text-cyan-400 bg-cyan-500/10' },
            { label: 'Reports', description: 'Club analytics & data', icon: BarChart3, href: `/club/${slug}/reports`, color: 'text-pink-400 bg-pink-500/10', roles: ['owner', 'admin'] },
            { label: 'Insights', description: 'AI-powered analysis', icon: FileText, href: `/club/${slug}/insights`, color: 'text-violet-400 bg-violet-500/10', roles: ['owner', 'admin'] },
            ...(isAdmin ? [{ label: 'Settings', description: 'Club configuration', icon: Settings, href: `/club/${slug}/settings`, color: 'text-navy-300 bg-navy-700/50' }] : []),
          ]
            .filter(action => !action.roles || action.roles.includes(myRole))
            .map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className="bg-navy-900 border border-navy-800 rounded-xl p-4 hover:border-navy-700 transition-colors group"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${action.color}`}>
                  <action.icon className="w-4.5 h-4.5" />
                </div>
                <h3 className="font-medium text-white text-sm group-hover:text-pitch-400 transition-colors">{action.label}</h3>
                <p className="text-xs text-navy-400 mt-0.5">{action.description}</p>
              </Link>
            ))}
        </div>
      </div>

      {/* Teams overview */}
      {data?.teams?.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Teams</h2>
            <Link
              to={`/club/${slug}/teams`}
              className="text-xs text-navy-400 hover:text-pitch-400 transition-colors flex items-center gap-1"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.teams.map((team) => (
              <div
                key={team.id}
                className="bg-navy-900 border border-navy-800 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-white truncate">{team.name}</h3>
                  <span className="text-xs bg-navy-800 text-navy-300 px-2 py-1 rounded-full">
                    {team.team_format || 11}v{team.team_format || 11}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-navy-400">
                  {team.age_group && <span>{team.age_group}</span>}
                  {team.team_type && <span className="capitalize">{team.team_type}</span>}
                  <span>{team.player_count} player{team.player_count !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent registrations */}
      {data?.recent_registrations?.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Recent Registrations</h2>
            <Link
              to={`/club/${slug}/registrations`}
              className="text-xs text-navy-400 hover:text-pitch-400 transition-colors flex items-center gap-1"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-navy-800">
                    <th className="text-left px-4 py-3 text-xs font-medium text-navy-400 uppercase">Player</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-navy-400 uppercase">Team</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-navy-400 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-navy-400 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_registrations.map((reg) => (
                    <tr key={reg.id} className="border-b border-navy-800/50 last:border-0">
                      <td className="px-4 py-3 text-sm text-white">{reg.name}</td>
                      <td className="px-4 py-3 text-sm text-navy-300">{reg.team_name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          reg.registration_status === 'registered' ? 'bg-pitch-600/20 text-pitch-400' :
                          reg.registration_status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-alert-400/20 text-alert-400'
                        }`}>
                          {reg.registration_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-navy-400">
                        {new Date(reg.created_at).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
