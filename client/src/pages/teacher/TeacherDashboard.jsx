import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { assessmentService, teacherService } from '../../services/api'
import {
  LayoutDashboard, GraduationCap, Shield, ClipboardCheck, Calendar,
  Users, BookOpen, ChevronRight, Plus, Trophy,
} from 'lucide-react'

const SPORT_ICONS = {
  football: '\u26BD', rugby: '\uD83C\uDFC9', cricket: '\uD83C\uDFCF',
  hockey: '\uD83C\uDFD1', netball: '\uD83E\uDD3E',
}

export default function TeacherDashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [teams, setTeams] = useState([])
  const [fixtures, setFixtures] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const [dashRes, teamsRes, fixturesRes] = await Promise.all([
        assessmentService.getDashboard(),
        teacherService.getMyTeams().catch(() => ({ data: [] })),
        teacherService.getMyFixtures().catch(() => ({ data: [] })),
      ])
      setDashboard(dashRes.data)
      setTeams(teamsRes.data)
      setFixtures(fixturesRes.data)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const stats = dashboard?.stats || { classes: 0, pupils: 0, units: 0, assessments_this_term: 0 }
  const upcomingFixtures = fixtures.filter(f => new Date(f.date) >= new Date()).slice(0, 5)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-navy-400 mt-1">Welcome to your Teacher Hub</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard icon={GraduationCap} label="My Classes" value={loading ? '...' : stats.classes} color="pitch" href="/teacher/classes" />
        <StatCard icon={Users} label="Pupils" value={loading ? '...' : stats.pupils} color="pitch" />
        <StatCard icon={ClipboardCheck} label="Assessments" value={loading ? '...' : stats.assessments_this_term} color="pitch" href="/teacher/assessment" />
        <StatCard icon={Shield} label="My Teams" value={loading ? '...' : teams.length} color="amber" href="/teacher/teams" />
        <StatCard icon={Trophy} label="Fixtures" value={loading ? '...' : fixtures.length} color="amber" href="/teacher/fixtures" />
        <StatCard icon={Calendar} label="Upcoming" value={loading ? '...' : upcomingFixtures.length} color="amber" href="/teacher/fixtures" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent classes */}
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-pitch-400" />
              Curriculum PE
            </h2>
            <Link
              to="/teacher/classes"
              className="text-sm text-pitch-400 hover:text-pitch-300 transition-colors"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="spinner w-6 h-6" />
            </div>
          ) : dashboard?.recent_groups?.length > 0 ? (
            <div className="space-y-3">
              {dashboard.recent_groups.map(group => (
                <Link
                  key={group.id}
                  to={`/teacher/classes/${group.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-navy-800/50 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-white">{group.name}</div>
                    <div className="text-xs text-navy-400 mt-0.5">
                      Year {group.year_group} - {group.pupil_count || 0} pupils
                      {group.units && group.units.filter(Boolean).length > 0 && (
                        <> - {group.units.filter(Boolean).map(u => u.sport).join(', ')}</>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-navy-600" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-navy-400 text-sm mb-3">No classes set up yet.</p>
              <Link
                to="/teacher/classes"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create class
              </Link>
            </div>
          )}
        </div>

        {/* Extra-curricular */}
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              Extra-curricular Sport
            </h2>
            <Link
              to="/teacher/teams"
              className="text-sm text-pitch-400 hover:text-pitch-300 transition-colors"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="spinner w-6 h-6" />
            </div>
          ) : teams.length > 0 ? (
            <div className="space-y-3">
              {teams.slice(0, 5).map(team => (
                <Link
                  key={team.id}
                  to="/teacher/teams"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-navy-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{SPORT_ICONS[team.sport] || ''}</span>
                    <div>
                      <div className="text-sm font-medium text-white">{team.name}</div>
                      <div className="text-xs text-navy-400">
                        {team.pupil_count || 0} pupils - {team.match_count || 0} matches
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-navy-600" />
                </Link>
              ))}
              {upcomingFixtures.length > 0 && (
                <div className="border-t border-navy-800 pt-3 mt-3">
                  <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-2">Next fixture</p>
                  <div className="text-sm text-white">
                    {upcomingFixtures[0].team_name} vs {upcomingFixtures[0].opponent || 'TBC'}
                  </div>
                  <div className="text-xs text-navy-400">
                    {new Date(upcomingFixtures[0].date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-navy-400 text-sm">No teams assigned yet.</p>
              <p className="text-navy-500 text-xs mt-1">
                Your Head of PE will assign you to extra-curricular teams.
              </p>
            </div>
          )}
        </div>
      </div>
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
    return (
      <Link to={href} className="bg-navy-900 rounded-xl border border-navy-800 p-4 hover:border-navy-600 transition-colors">
        {inner}
      </Link>
    )
  }

  return (
    <div className="bg-navy-900 rounded-xl border border-navy-800 p-4">
      {inner}
    </div>
  )
}
