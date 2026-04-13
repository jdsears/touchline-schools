import { Trophy } from 'lucide-react'

export default function PupilAchievements() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Achievements</h1>
        <p className="text-navy-400 mt-1">Your badges, milestones, and house points</p>
      </div>

      <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-8 h-8 text-navy-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No achievements yet</h3>
        <p className="text-navy-400 text-sm max-w-md mx-auto">
          Earn achievements by attending training, playing in fixtures, reaching development
          milestones, and showing great effort. Your house points will be tracked here too.
        </p>
      </div>
    </div>
  )
}
