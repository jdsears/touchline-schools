import { Home } from 'lucide-react'

const sportIcons = {
  football: '\u26BD',
  rugby: '\uD83C\uDFC9',
  cricket: '\uD83C\uDFCF',
  hockey: '\uD83C\uDFD1',
  netball: '\uD83E\uDD3E',
}

export default function PupilSports() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">My Sports</h1>
        <p className="text-navy-400 mt-1">Everything you play, all in one place</p>
      </div>

      {/* Sport tiles */}
      <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
          <Home className="w-8 h-8 text-navy-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Welcome to your portal</h3>
        <p className="text-navy-400 text-sm max-w-md mx-auto">
          Once your teachers add you to classes and teams, you will see each sport you play here.
          Tap a sport to see your schedule, assessments, and development for that activity.
        </p>
      </div>
    </div>
  )
}
