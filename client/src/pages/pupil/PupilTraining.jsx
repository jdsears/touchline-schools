import { Dumbbell } from 'lucide-react'

export default function PupilTraining() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Training Plans</h1>
        <p className="text-navy-400 mt-1">Training plans assigned by your teachers, per sport</p>
      </div>

      <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
          <Dumbbell className="w-8 h-8 text-navy-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No training plans yet</h3>
        <p className="text-navy-400 text-sm max-w-md mx-auto">
          When your teachers assign you training plans or homework, they will appear here.
          You can track your progress and tick off completed sessions.
        </p>
      </div>
    </div>
  )
}
