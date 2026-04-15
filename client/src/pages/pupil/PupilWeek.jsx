import { Calendar } from 'lucide-react'

export default function PupilWeek() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">My Week</h1>
        <p className="text-navy-400 mt-1">PE lessons, training, and fixtures all in one calendar</p>
      </div>

      <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-navy-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Nothing scheduled yet</h3>
        <p className="text-navy-400 text-sm max-w-md mx-auto">
          Your weekly calendar will show PE lessons, extra-curricular training sessions,
          and school fixtures across all your sports.
        </p>
      </div>
    </div>
  )
}
