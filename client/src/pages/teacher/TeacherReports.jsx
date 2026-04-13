import { FileBarChart, Plus, Sparkles } from 'lucide-react'

export default function TeacherReports() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-navy-400 mt-1">Generate termly pupil reports for the school reporting cycle</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">New Reporting Window</span>
        </button>
      </div>

      {/* AI assist callout */}
      <div className="bg-navy-900 rounded-xl border border-pitch-600/30 p-5 mb-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-pitch-600/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-pitch-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">AI-assisted report writing</h3>
          <p className="text-xs text-navy-400">
            The AI assistant can draft report comments for each pupil using their assessment data,
            attendance, and your observations. You review and edit before submission.
          </p>
        </div>
      </div>

      <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
          <FileBarChart className="w-8 h-8 text-navy-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No reporting windows set up</h3>
        <p className="text-navy-400 text-sm max-w-md mx-auto">
          A Head of PE or school admin creates reporting windows aligned to the school calendar.
          Once a window is open, you can generate and submit reports for your classes.
        </p>
      </div>
    </div>
  )
}
