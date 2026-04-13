import { Calendar, Plus } from 'lucide-react'

export default function TeacherSessions() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Session Planning</h1>
          <p className="text-navy-400 mt-1">Plan extra-curricular training sessions</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Plan Session</span>
        </button>
      </div>

      <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-navy-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No sessions planned</h3>
        <p className="text-navy-400 text-sm max-w-md mx-auto">
          Create training session plans for your extra-curricular teams. The AI assistant can
          help generate sport-specific session plans tailored to your team's level.
        </p>
      </div>
    </div>
  )
}
