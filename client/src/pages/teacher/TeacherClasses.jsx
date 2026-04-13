import { useState } from 'react'
import { GraduationCap, Plus, Search, BookOpen } from 'lucide-react'

export default function TeacherClasses() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">My Classes</h1>
          <p className="text-navy-400 mt-1">Manage your teaching groups and sport units</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">New Class</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
        <input
          type="text"
          placeholder="Search classes..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm placeholder:text-navy-500 focus:outline-none focus:border-pitch-500"
        />
      </div>

      {/* Empty state */}
      <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="w-8 h-8 text-navy-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No teaching groups yet</h3>
        <p className="text-navy-400 text-sm max-w-md mx-auto mb-6">
          Create a teaching group for each of your timetabled PE classes. Add pupils, then assign
          sport units for each term (e.g., Football in Autumn, Gymnastics in Spring).
        </p>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg transition-colors mx-auto">
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Create Teaching Group</span>
        </button>
      </div>
    </div>
  )
}
