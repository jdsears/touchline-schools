import { Shield, Plus, Search } from 'lucide-react'

export default function TeacherTeams() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">My Teams</h1>
          <p className="text-navy-400 mt-1">Extra-curricular teams you coach</p>
        </div>
      </div>

      <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-navy-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No teams assigned yet</h3>
        <p className="text-navy-400 text-sm max-w-md mx-auto">
          Your Head of PE will assign you to extra-curricular teams. These are school sports teams
          for fixtures and competitions, separate from your timetabled PE classes.
        </p>
      </div>
    </div>
  )
}
