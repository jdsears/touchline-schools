import { BookOpen, Plus, Calendar } from 'lucide-react'

export default function TeacherLessons() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Lesson Planning</h1>
          <p className="text-navy-400 mt-1">Plan and organise your curriculum PE lessons</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">New Lesson</span>
        </button>
      </div>

      <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-navy-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No lessons planned yet</h3>
        <p className="text-navy-400 text-sm max-w-md mx-auto mb-6">
          Create lesson plans linked to your teaching groups and sport units. Each lesson can include
          learning objectives, activities, differentiation notes, and equipment lists.
        </p>
        <p className="text-navy-500 text-xs">
          Tip: The AI assistant can help generate lesson plans based on your sport unit and year group.
        </p>
      </div>
    </div>
  )
}
