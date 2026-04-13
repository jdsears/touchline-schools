import { LayoutDashboard, GraduationCap, Shield, ClipboardCheck, Calendar } from 'lucide-react'

export default function TeacherDashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-navy-400 mt-1">Welcome to your Teacher Hub</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={GraduationCap} label="My Classes" value="--" color="pitch" />
        <StatCard icon={Shield} label="My Teams" value="--" color="amber" />
        <StatCard icon={ClipboardCheck} label="Assessments Due" value="--" color="pitch" />
        <StatCard icon={Calendar} label="Fixtures This Week" value="--" color="amber" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Curriculum PE */}
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-pitch-400" />
            Curriculum PE
          </h2>
          <p className="text-navy-400 text-sm">
            Your teaching groups, current sport units, and upcoming assessments will appear here.
          </p>
          <div className="mt-4 p-4 rounded-lg bg-navy-800/50 border border-navy-700/50">
            <p className="text-sm text-navy-300">No classes set up yet. Create your first teaching group to get started.</p>
          </div>
        </div>

        {/* Extra-curricular */}
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            Extra-curricular Sport
          </h2>
          <p className="text-navy-400 text-sm">
            Your teams, upcoming fixtures, and training sessions will appear here.
          </p>
          <div className="mt-4 p-4 rounded-lg bg-navy-800/50 border border-navy-700/50">
            <p className="text-sm text-navy-300">No teams assigned yet. Teams will appear once a Head of PE assigns you.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    pitch: 'bg-pitch-600/20 text-pitch-400',
    amber: 'bg-amber-400/20 text-amber-400',
  }
  return (
    <div className="bg-navy-900 rounded-xl border border-navy-800 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{value}</div>
          <div className="text-xs text-navy-400">{label}</div>
        </div>
      </div>
    </div>
  )
}
