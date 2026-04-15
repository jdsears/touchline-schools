import { useState, useEffect } from 'react'
import { hodService } from '../../services/api'
import { GraduationCap, Users, BookOpen, Filter } from 'lucide-react'

export default function HoDClasses() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [yearFilter, setYearFilter] = useState('all')

  useEffect(() => {
    hodService.getClasses()
      .then(res => setClasses(res.data))
      .catch(err => console.error('Failed to load classes:', err))
      .finally(() => setLoading(false))
  }, [])

  const yearGroups = [...new Set(classes.map(c => c.year_group))].sort((a, b) => a - b)
  const filtered = yearFilter === 'all' ? classes : classes.filter(c => c.year_group === parseInt(yearFilter))

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">All Classes</h1>
        <p className="text-navy-400 mt-1">Every teaching group across the school</p>
      </div>

      {/* Year group filter */}
      {yearGroups.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Filter className="w-4 h-4 text-navy-500" />
          <button
            onClick={() => setYearFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              yearFilter === 'all' ? 'bg-pitch-600/20 text-pitch-400' : 'bg-navy-800 text-navy-400 hover:text-white'
            }`}
          >
            All ({classes.length})
          </button>
          {yearGroups.map(y => (
            <button
              key={y}
              onClick={() => setYearFilter(String(y))}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                yearFilter === String(y) ? 'bg-pitch-600/20 text-pitch-400' : 'bg-navy-800 text-navy-400 hover:text-white'
              }`}
            >
              Year {y} ({classes.filter(c => c.year_group === y).length})
            </button>
          ))}
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(cls => (
            <div key={cls.id} className="bg-navy-900 rounded-xl border border-navy-800 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-pitch-600/20 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-pitch-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">{cls.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-navy-400">Year {cls.year_group}</span>
                      <span className="text-xs text-navy-600">|</span>
                      <span className="text-xs text-navy-400">{cls.key_stage}</span>
                      <span className="text-xs text-navy-600">|</span>
                      <span className="text-xs text-navy-400">{cls.teacher_name}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-navy-400">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-sm">{cls.pupil_count || 0} pupils</span>
                    </div>
                    <div className="flex items-center gap-1 text-navy-400 mt-0.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span className="text-sm">{cls.unit_count || 0} units</span>
                    </div>
                  </div>
                  {cls.units && (
                    <div className="hidden md:flex flex-wrap gap-1 max-w-xs">
                      {cls.units.filter(Boolean).map(u => (
                        <span key={u.id} className="px-2 py-0.5 bg-navy-800 rounded text-xs text-navy-300 capitalize">
                          {u.sport}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-navy-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No classes yet</h3>
          <p className="text-navy-400 text-sm">Teaching groups will appear here as teachers create them.</p>
        </div>
      )}
    </div>
  )
}
