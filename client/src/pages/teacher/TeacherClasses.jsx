import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { teachingGroupService } from '../../services/api'
import { GraduationCap, Plus, Search, Users, BookOpen, X, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

const KEY_STAGES = {
  2: 'KS1', 3: 'KS1',
  4: 'KS2', 5: 'KS2', 6: 'KS2',
  7: 'KS3', 8: 'KS3', 9: 'KS3',
  10: 'KS4', 11: 'KS4',
  12: 'KS5', 13: 'KS5',
}

const currentAcademicYear = () => {
  const now = new Date()
  const year = now.getFullYear()
  // Academic year starts in September
  return now.getMonth() >= 8 ? `${year}-${(year + 1).toString().slice(2)}` : `${year - 1}-${year.toString().slice(2)}`
}

export default function TeacherClasses() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    year_group: '7',
    group_identifier: '',
    academic_year: currentAcademicYear(),
  })

  useEffect(() => {
    loadGroups()
  }, [])

  async function loadGroups() {
    try {
      const res = await teachingGroupService.list()
      setGroups(res.data)
    } catch (err) {
      console.error('Failed to load teaching groups:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Class name is required')
      return
    }

    setCreating(true)
    try {
      const yearGroup = parseInt(form.year_group)
      await teachingGroupService.create({
        name: form.name.trim(),
        year_group: yearGroup,
        group_identifier: form.group_identifier.trim() || null,
        academic_year: form.academic_year,
        key_stage: KEY_STAGES[yearGroup] || 'KS3',
      })
      toast.success('Teaching group created')
      setShowCreate(false)
      setForm({ name: '', year_group: '7', group_identifier: '', academic_year: currentAcademicYear() })
      loadGroups()
    } catch (err) {
      toast.error('Failed to create teaching group')
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `year ${g.year_group}`.includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary">My Classes</h1>
          <p className="text-secondary mt-1">Manage your teaching groups and sport units</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-on-dark rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">New Class</span>
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card rounded-xl border border-border-strong w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-primary">Create Teaching Group</h2>
              <button onClick={() => setShowCreate(false)} className="text-secondary hover:text-link">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-secondary mb-1">Class Name</label>
                <input
                  type="text"
                  placeholder="e.g., Year 9 Group B PE"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-primary text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-secondary mb-1">Year Group</label>
                  <select
                    value={form.year_group}
                    onChange={e => setForm({ ...form, year_group: e.target.value })}
                    className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-primary text-sm focus:outline-none focus:border-pitch-500"
                  >
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(y => (
                      <option key={y} value={y}>Year {y} ({KEY_STAGES[y]})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-secondary mb-1">Group ID (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., B"
                    value={form.group_identifier}
                    onChange={e => setForm({ ...form, group_identifier: e.target.value })}
                    className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-primary text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-secondary mb-1">Academic Year</label>
                <input
                  type="text"
                  value={form.academic_year}
                  onChange={e => setForm({ ...form, academic_year: e.target.value })}
                  className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-primary text-sm focus:outline-none focus:border-pitch-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2.5 bg-subtle hover:bg-border-default text-secondary rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-on-dark rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
      {groups.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
          <input
            type="text"
            placeholder="Search classes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border-strong rounded-lg text-primary text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500"
          />
        </div>
      )}

      {/* Class list */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(group => (
            <Link
              key={group.id}
              to={`/teacher/classes/${group.id}`}
              className="block bg-card rounded-xl border border-border-default p-5 hover:border-border-strong transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-pitch-600/20 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-pitch-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-primary">{group.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-secondary">Year {group.year_group}</span>
                      <span className="text-xs text-tertiary">|</span>
                      <span className="text-xs text-secondary">{group.key_stage}</span>
                      <span className="text-xs text-tertiary">|</span>
                      <span className="text-xs text-secondary">{group.academic_year}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-secondary">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-sm">{group.pupil_count || 0} pupils</span>
                    </div>
                    <div className="flex items-center gap-1 text-secondary mt-0.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span className="text-sm">{group.unit_count || 0} units</span>
                    </div>
                  </div>
                  {/* Sport unit badges */}
                  {group.units && (
                    <div className="hidden md:flex flex-wrap gap-1 max-w-xs">
                      {group.units.filter(Boolean).map(u => (
                        <span key={u.id} className="px-2 py-0.5 bg-subtle rounded text-xs text-secondary capitalize">
                          {u.sport}
                        </span>
                      ))}
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-tertiary" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-card rounded-xl border border-border-default p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-subtle flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-tertiary" />
          </div>
          <h3 className="text-lg font-semibold text-primary mb-2">No teaching groups yet</h3>
          <p className="text-secondary text-sm max-w-md mx-auto mb-6">
            Create a teaching group for each of your timetabled PE classes. Add pupils, then assign
            sport units for each term.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-on-dark rounded-lg transition-colors mx-auto"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Create Teaching Group</span>
          </button>
        </div>
      ) : (
        <p className="text-secondary text-sm text-center py-8">No classes match your search.</p>
      )}
    </div>
  )
}
