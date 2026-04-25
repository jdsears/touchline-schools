import { Users, Search } from 'lucide-react'

export default function TeacherDevelopment() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary">Pupil Development</h1>
          <p className="text-secondary mt-1">Track individual pupil progress across extra-curricular sport</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
        <input
          type="text"
          placeholder="Search pupils..."
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border-strong rounded-lg text-primary text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500"
        />
      </div>

      <div className="bg-card rounded-xl border border-border-default p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-subtle flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-tertiary" />
        </div>
        <h3 className="text-lg font-semibold text-primary mb-2">No pupil development data yet</h3>
        <p className="text-secondary text-sm max-w-md mx-auto">
          As you record observations, match stats, and training feedback for your teams,
          each pupil builds a development profile showing their progress across sports.
        </p>
      </div>
    </div>
  )
}
