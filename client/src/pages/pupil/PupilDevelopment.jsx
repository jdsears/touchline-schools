import { TrendingUp } from 'lucide-react'

export default function PupilDevelopment() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">My Development</h1>
        <p className="text-navy-400 mt-1">Your progress across curriculum PE and extra-curricular sport</p>
      </div>

      {/* Two sections: curriculum + extra-curricular */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-6">
          <h2 className="text-base font-semibold text-white mb-2">Curriculum PE</h2>
          <p className="text-navy-400 text-sm">
            Your assessment grades and teacher feedback from timetabled PE lessons.
          </p>
          <div className="mt-4 p-4 rounded-lg bg-navy-800/50 border border-navy-700/50">
            <p className="text-sm text-navy-300">No assessments recorded yet.</p>
          </div>
        </div>

        <div className="bg-navy-900 rounded-xl border border-navy-800 p-6">
          <h2 className="text-base font-semibold text-white mb-2">Extra-curricular Sport</h2>
          <p className="text-navy-400 text-sm">
            Your stats, coach feedback, and development goals from school teams.
          </p>
          <div className="mt-4 p-4 rounded-lg bg-navy-800/50 border border-navy-700/50">
            <p className="text-sm text-navy-300">No team development data yet.</p>
          </div>
        </div>
      </div>

      <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-navy-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Your development story</h3>
        <p className="text-navy-400 text-sm max-w-md mx-auto">
          As your teachers record assessments and your coaches give feedback, you will
          build a complete picture of your development across every sport you play.
        </p>
      </div>
    </div>
  )
}
