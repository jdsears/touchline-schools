import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { hodService } from '../../services/api'
import {
  Building2, Users, Shield, GraduationCap, Trophy,
  ClipboardCheck, UserCog, ChevronRight,
} from 'lucide-react'

const SPORT_ICONS = {
  football: '\u26BD', rugby: '\uD83C\uDFC9', cricket: '\uD83C\uDFCF',
  hockey: '\uD83C\uDFD1', netball: '\uD83E\uDD3E',
}

export default function HoDOverview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hodService.getOverview()
      .then(res => setData(res.data))
      .catch(err => console.error('Failed to load overview:', err))
      .finally(() => setLoading(false))
  }, [])

  const stats = data?.stats || {}

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Building2 className="w-7 h-7 text-amber-400" />
          School Overview
        </h1>
        <p className="text-navy-400 mt-1">Whole-school PE and sport at a glance</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="spinner w-8 h-8" />
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <StatCard icon={UserCog} label="Teachers" value={stats.teachers || 0} color="amber" href="/teacher/hod/teachers" />
            <StatCard icon={Shield} label="Teams" value={stats.teams || 0} color="amber" href="/teacher/hod/teams" />
            <StatCard icon={Users} label="Pupils" value={stats.pupils || 0} color="pitch" />
            <StatCard icon={GraduationCap} label="Classes" value={stats.classes || 0} color="pitch" href="/teacher/hod/classes" />
            <StatCard icon={Trophy} label="Fixtures" value={stats.fixtures_this_term || 0} color="amber" />
            <StatCard icon={ClipboardCheck} label="Assessments" value={stats.assessments_this_term || 0} color="pitch" />
          </div>

          {/* Sport breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-navy-900 rounded-xl border border-navy-800 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Sports Breakdown</h2>
              {data?.sport_breakdown?.length > 0 ? (
                <div className="space-y-3">
                  {data.sport_breakdown.map(sport => (
                    <div key={sport.sport} className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{SPORT_ICONS[sport.sport] || ''}</span>
                        <div>
                          <div className="text-sm font-medium text-white capitalize">{sport.sport}</div>
                          <div className="text-xs text-navy-400">
                            {sport.team_count} team{sport.team_count !== 1 ? 's' : ''}, {sport.pupil_count} pupil{sport.pupil_count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <Link
                        to={`/teacher/hod/teams?sport=${sport.sport}`}
                        className="text-xs text-pitch-400 hover:text-pitch-300"
                      >
                        View teams
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-navy-400 text-sm text-center py-4">No teams set up yet.</p>
              )}
            </div>

            {/* Quick links */}
            <div className="bg-navy-900 rounded-xl border border-navy-800 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <QuickLink to="/teacher/hod/teachers" icon={UserCog} label="Manage teachers" description="View all staff, assign to sports and teams" />
                <QuickLink to="/teacher/hod/teams" icon={Shield} label="View all teams" description="Every extra-curricular team across the school" />
                <QuickLink to="/teacher/hod/classes" icon={GraduationCap} label="View all classes" description="Every teaching group and their sport units" />
                <QuickLink to="/teacher/assessment" icon={ClipboardCheck} label="Assessment overview" description="Track assessment completion across departments" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, href }) {
  const colorMap = {
    pitch: 'bg-pitch-600/20 text-pitch-400',
    amber: 'bg-amber-400/20 text-amber-400',
  }
  const inner = (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-navy-400">{label}</div>
      </div>
    </div>
  )
  if (href) {
    return <Link to={href} className="bg-navy-900 rounded-xl border border-navy-800 p-4 hover:border-navy-600 transition-colors">{inner}</Link>
  }
  return <div className="bg-navy-900 rounded-xl border border-navy-800 p-4">{inner}</div>
}

function QuickLink({ to, icon: Icon, label, description }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-navy-800/50 transition-colors"
    >
      <Icon className="w-5 h-5 text-navy-400" />
      <div className="flex-1">
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-navy-400">{description}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-navy-600" />
    </Link>
  )
}
