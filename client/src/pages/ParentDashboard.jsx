import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { parentService } from '../services/api'
import {
  Users, Calendar, CreditCard, Megaphone, MapPin,
  Clock, ChevronRight, AlertTriangle, CheckCircle,
  Bell, Settings, LogOut, Building2,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ParentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const res = await parentService.getDashboard()
      setData(res.data)
    } catch (err) {
      console.error('Failed to load parent dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  // If no guardian records linked, show onboarding
  if (!data || data.guardians.length === 0) {
    return (
      <div className="min-h-screen bg-navy-950">
        <ParentHeader user={user} logout={logout} />
        <div className="max-w-lg mx-auto p-6 mt-8 text-center">
          <Building2 className="w-16 h-16 text-navy-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Welcome to Touchline</h2>
          <p className="text-navy-400 mb-6">
            Your account isn't linked to any clubs yet. Ask your child's club to send you a parent invitation,
            or check your email for an invite link.
          </p>
          <button
            onClick={() => navigate('/player-lounge')}
            className="px-6 py-2.5 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors"
          >
            Go to Player Lounge
          </button>
        </div>
      </div>
    )
  }

  const { children, clubs, upcoming_matches, payments, announcements } = data

  const pendingPayments = payments.filter(p => ['pending', 'past_due', 'overdue'].includes(p.status))
  const urgentAnnouncements = announcements.filter(a => a.priority === 'urgent' || a.priority === 'important')

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'payments', label: 'Payments', icon: CreditCard, badge: pendingPayments.length || null },
    { id: 'announcements', label: 'News', icon: Megaphone, badge: urgentAnnouncements.length || null },
  ]

  return (
    <div className="min-h-screen bg-navy-950">
      <ParentHeader user={user} logout={logout} />

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Club badges */}
        {clubs.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {clubs.map(club => (
              <div
                key={club.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-navy-900 border border-navy-800 rounded-lg"
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: club.color || '#1a365d' }}
                >
                  {club.name?.charAt(0)}
                </div>
                <span className="text-sm text-navy-300">{club.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tab nav */}
        <div className="flex gap-1 bg-navy-900 rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors relative ${
                activeTab === tab.id
                  ? 'bg-navy-800 text-white'
                  : 'text-navy-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-alert-500 rounded-full text-xs text-white flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <OverviewTab
            children={children}
            upcomingMatches={upcoming_matches}
            pendingPayments={pendingPayments}
            announcements={announcements}
          />
        )}
        {activeTab === 'schedule' && (
          <ScheduleTab matches={upcoming_matches} children={children} />
        )}
        {activeTab === 'payments' && (
          <PaymentsTab payments={payments} />
        )}
        {activeTab === 'announcements' && (
          <AnnouncementsTab announcements={announcements} />
        )}
      </div>
    </div>
  )
}

function ParentHeader({ user, logout }) {
  return (
    <header className="sticky top-0 z-30 bg-navy-900/80 backdrop-blur-md border-b border-navy-800">
      <div className="max-w-4xl mx-auto flex items-center justify-between h-14 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-pitch-600/20 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-pitch-400" />
          </div>
          <span className="font-semibold text-white text-sm">Parent Portal</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-navy-400 hidden sm:block">{user?.name}</span>
          <button
            onClick={logout}
            className="p-2 text-navy-400 hover:text-alert-400 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}

function OverviewTab({ children, upcomingMatches, pendingPayments, announcements }) {
  return (
    <div className="space-y-6">
      {/* Alert banner for pending payments */}
      {pendingPayments.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-300">
              {pendingPayments.length} payment{pendingPayments.length > 1 ? 's' : ''} due
            </p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              Total: £{(pendingPayments.reduce((s, p) => s + (p.plan_amount || 0), 0) / 100).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Children cards */}
      <div>
        <h2 className="text-sm font-semibold text-navy-400 uppercase tracking-wider mb-3">My Children</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {children.map(child => (
            <div key={child.id} className="bg-navy-900 border border-navy-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-pitch-600/20 flex items-center justify-center text-pitch-400 font-bold">
                  {child.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-white">{child.name}</p>
                  <p className="text-xs text-navy-400">
                    {child.team_name || 'No team'}
                    {child.position && ` · ${child.position}`}
                    {child.squad_number && ` · #${child.squad_number}`}
                  </p>
                </div>
              </div>
              {child.club_name && (
                <p className="text-xs text-navy-500 mt-2">{child.club_name}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming matches */}
      {upcomingMatches.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-navy-400 uppercase tracking-wider mb-3">Upcoming Matches</h2>
          <div className="space-y-2">
            {upcomingMatches.slice(0, 5).map(match => (
              <div key={match.id} className="bg-navy-900 border border-navy-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    {match.is_home ? `${match.team_name} vs ${match.opponent}` : `${match.opponent} vs ${match.team_name}`}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-navy-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(match.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    {match.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {match.time}
                      </span>
                    )}
                    {match.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {match.location}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    match.is_home ? 'bg-pitch-600/20 text-pitch-400' : 'bg-blue-600/20 text-blue-400'
                  }`}>
                    {match.is_home ? 'Home' : 'Away'}
                  </span>
                  {match.kit_type && (
                    <span className="text-xs text-navy-400 capitalize">{match.kit_type === 'third' ? '3rd Kit' : `${match.kit_type} Kit`}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent announcements */}
      {announcements.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-navy-400 uppercase tracking-wider mb-3">Latest Announcements</h2>
          <div className="space-y-2">
            {announcements.slice(0, 3).map(ann => (
              <div key={ann.id} className={`bg-navy-900 border rounded-xl p-4 ${
                ann.priority === 'urgent' ? 'border-alert-600/30' :
                ann.priority === 'important' ? 'border-amber-600/30' : 'border-navy-800'
              }`}>
                <div className="flex items-start gap-3">
                  <Megaphone className={`w-4 h-4 mt-0.5 shrink-0 ${
                    ann.priority === 'urgent' ? 'text-alert-400' :
                    ann.priority === 'important' ? 'text-amber-400' : 'text-navy-400'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-white">{ann.title}</p>
                    <p className="text-xs text-navy-400 mt-1 line-clamp-2">{ann.content}</p>
                    <p className="text-xs text-navy-500 mt-1.5">
                      {ann.club_name} · {new Date(ann.created_at).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ScheduleTab({ matches, children }) {
  if (matches.length === 0) {
    return (
      <div className="bg-navy-900 border border-navy-800 rounded-xl p-8 text-center">
        <Calendar className="w-12 h-12 text-navy-600 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-white mb-1">No upcoming fixtures</h3>
        <p className="text-navy-400 text-sm">There are no scheduled matches coming up.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {matches.map(match => (
        <div key={match.id} className="bg-navy-900 border border-navy-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-navy-400 bg-navy-800 px-2 py-0.5 rounded">{match.team_name}</span>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded ${
                match.is_home ? 'bg-pitch-600/20 text-pitch-400' : 'bg-blue-600/20 text-blue-400'
              }`}>
                {match.is_home ? 'Home' : 'Away'}
              </span>
              {match.kit_type && (
                <span className="text-xs text-navy-400 capitalize">{match.kit_type === 'third' ? '3rd Kit' : `${match.kit_type} Kit`}</span>
              )}
            </div>
          </div>
          <p className="font-medium text-white">
            {match.is_home
              ? `${match.team_name} vs ${match.opponent}`
              : `${match.opponent} vs ${match.team_name}`
            }
          </p>
          <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
            <div className="flex items-center gap-2 text-navy-300">
              <Calendar className="w-4 h-4 text-navy-500" />
              {new Date(match.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            {match.time && (
              <div className="flex items-center gap-2 text-navy-300">
                <Clock className="w-4 h-4 text-navy-500" />
                {match.time}
              </div>
            )}
            {match.location && (
              <div className="flex items-center gap-2 text-navy-300 col-span-2">
                <MapPin className="w-4 h-4 text-navy-500" />
                {match.location}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function PaymentsTab({ payments }) {
  const pending = payments.filter(p => ['pending', 'past_due', 'overdue'].includes(p.status))
  const active = payments.filter(p => p.status === 'active')
  const other = payments.filter(p => !['pending', 'past_due', 'overdue', 'active'].includes(p.status))

  const statusConfig = {
    active: { icon: CheckCircle, color: 'text-pitch-400', label: 'Active' },
    pending: { icon: Clock, color: 'text-amber-400', label: 'Payment Due' },
    past_due: { icon: AlertTriangle, color: 'text-alert-400', label: 'Overdue' },
    overdue: { icon: AlertTriangle, color: 'text-alert-400', label: 'Overdue' },
    cancelled: { icon: null, color: 'text-navy-500', label: 'Cancelled' },
  }

  if (payments.length === 0) {
    return (
      <div className="bg-navy-900 border border-navy-800 rounded-xl p-8 text-center">
        <CreditCard className="w-12 h-12 text-navy-600 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-white mb-1">No payments</h3>
        <p className="text-navy-400 text-sm">You don't have any payment subscriptions yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-amber-400 mb-2">Payments Due</h3>
          <div className="space-y-2">
            {pending.map(p => (
              <PaymentCard key={p.id} payment={p} status={statusConfig[p.status]} />
            ))}
          </div>
        </div>
      )}
      {active.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-navy-400 mb-2">Active Subscriptions</h3>
          <div className="space-y-2">
            {active.map(p => (
              <PaymentCard key={p.id} payment={p} status={statusConfig.active} />
            ))}
          </div>
        </div>
      )}
      {other.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-navy-400 mb-2">Other</h3>
          <div className="space-y-2">
            {other.map(p => (
              <PaymentCard key={p.id} payment={p} status={statusConfig[p.status] || statusConfig.pending} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PaymentCard({ payment, status }) {
  const StatusIcon = status.icon

  return (
    <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white">{payment.plan_name}</p>
          <p className="text-xs text-navy-400 mt-0.5">
            {payment.player_name} · {payment.club_name}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {StatusIcon && <StatusIcon className={`w-4 h-4 ${status.color}`} />}
          <span className={`text-xs ${status.color}`}>{status.label}</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <p className="text-lg font-bold text-white">
          £{(payment.plan_amount / 100).toFixed(2)}
          {payment.plan_type === 'subscription' && (
            <span className="text-sm text-navy-400 font-normal">/{payment.plan_interval}</span>
          )}
        </p>
        {payment.portal_token && ['pending', 'past_due', 'overdue'].includes(payment.status) && (
          <a
            href={`/pay/${payment.portal_token}`}
            className="flex items-center gap-1.5 px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Pay Now
          </a>
        )}
      </div>
    </div>
  )
}

function AnnouncementsTab({ announcements }) {
  if (announcements.length === 0) {
    return (
      <div className="bg-navy-900 border border-navy-800 rounded-xl p-8 text-center">
        <Megaphone className="w-12 h-12 text-navy-600 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-white mb-1">No announcements</h3>
        <p className="text-navy-400 text-sm">You're all caught up!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {announcements.map(ann => (
        <div key={ann.id} className={`bg-navy-900 border rounded-xl p-5 ${
          ann.priority === 'urgent' ? 'border-alert-600/30' :
          ann.priority === 'important' ? 'border-amber-600/30' : 'border-navy-800'
        }`}>
          <div className="flex items-start gap-3">
            {ann.is_pinned && (
              <span className="text-xs bg-amber-600/20 text-amber-400 px-2 py-0.5 rounded mt-0.5">Pinned</span>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {ann.priority !== 'normal' && (
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    ann.priority === 'urgent' ? 'bg-alert-600/20 text-alert-400' : 'bg-amber-600/20 text-amber-400'
                  }`}>
                    {ann.priority}
                  </span>
                )}
                <span className="text-xs text-navy-500">
                  {ann.club_name} · {new Date(ann.created_at).toLocaleDateString('en-GB')}
                </span>
              </div>
              <h3 className="font-medium text-white">{ann.title}</h3>
              <p className="text-sm text-navy-300 mt-2 whitespace-pre-wrap">{ann.content}</p>
              {ann.created_by_name && (
                <p className="text-xs text-navy-500 mt-2">— {ann.created_by_name}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
