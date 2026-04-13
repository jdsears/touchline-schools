import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { assessmentService } from '../../services/api'
import {
  LayoutDashboard, GraduationCap, Shield, ClipboardCheck, Calendar,
  Users, BookOpen, ChevronRight, Plus,
} from 'lucide-react'

export default function TeacherDashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const res = await assessmentService.getDashboard()
      setDashboard(res.data)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const stats = dashboard?.stats || { classes: 0, pupils: 0, units: 0, assessments_this_term: 0 }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-navy-400 mt-1">Welcome to your Teacher Hub</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={GraduationCap}
          label="My Classes"
          value={loading ? '...' : stats.classes}
          color="pitch"
          href="/teacher/classes"
        />
        <StatCard
          icon={Users}
          label="Total Pupils"
          value={loading ? '...' : stats.pupils}
          color="pitch"
        />
        <StatCard
          icon={BookOpen}
          label="Sport Units"
          value={loading ? '...' : stats.units}
          color="amber"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Assessments (this term)"
          value={loading ? '...' : stats.assessments_this_term}
          color="amber"
          href="/teacher/assessment"
        />
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
          <div className="text-center py-6">
            <p className="text-navy-400 text-sm">
              Your teams, upcoming fixtures, and training sessions will appear here.
            </p>
            <p className="text-navy-500 text-xs mt-2">Coming in the next update.</p>
          </div>
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
