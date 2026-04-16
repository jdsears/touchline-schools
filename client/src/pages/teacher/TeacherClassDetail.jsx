import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { teachingGroupService, pupilManagementService } from '../../services/api'
import {
  GraduationCap, Users, BookOpen, Plus, Trash2, ChevronLeft,
  X, ClipboardCheck, Search, Loader2, UserPlus, UserMinus,
} from 'lucide-react'
import toast from 'react-hot-toast'

const SPORTS = [
  { value: 'football', label: 'Football', area: 'invasion_games' },
  { value: 'rugby', label: 'Rugby', area: 'invasion_games' },
  { value: 'hockey', label: 'Hockey', area: 'invasion_games' },
  { value: 'netball', label: 'Netball', area: 'invasion_games' },
  { value: 'basketball', label: 'Basketball', area: 'invasion_games' },
  { value: 'handball', label: 'Handball', area: 'invasion_games' },
  { value: 'cricket', label: 'Cricket', area: 'striking_fielding' },
  { value: 'rounders', label: 'Rounders', area: 'striking_fielding' },
  { value: 'badminton', label: 'Badminton', area: 'net_wall' },
  { value: 'tennis', label: 'Tennis', area: 'net_wall' },
  { value: 'table_tennis', label: 'Table Tennis', area: 'net_wall' },
  { value: 'athletics', label: 'Athletics', area: 'athletics' },
  { value: 'gymnastics', label: 'Gymnastics', area: 'gymnastics' },
  { value: 'dance', label: 'Dance', area: 'dance' },
  { value: 'swimming', label: 'Swimming', area: 'swimming' },
  { value: 'fitness', label: 'Fitness', area: 'fitness' },
  { value: 'outdoor_adventurous', label: 'Outdoor & Adventurous', area: 'outdoor_adventurous' },
]

const TERMS = [
  { value: 'autumn', label: 'Autumn' },
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
]

export default function TeacherClassDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddUnit, setShowAddUnit] = useState(false)
  const [addingUnit, setAddingUnit] = useState(false)
  const [unitForm, setUnitForm] = useState({ sport: 'football', unit_name: '', term: 'autumn', lesson_count: '' })

  // Add pupils
  const [showAddPupils, setShowAddPupils] = useState(false)
  const [allPupils, setAllPupils] = useState([])
  const [pupilSearch, setPupilSearch] = useState('')
  const [loadingPupils, setLoadingPupils] = useState(false)
  const [addingPupilIds, setAddingPupilIds] = useState(new Set())
  const [removingPupilId, setRemovingPupilId] = useState(null)

  useEffect(() => {
    loadGroup()
  }, [id])

  async function loadGroup() {
    try {
      const res = await teachingGroupService.get(id)
      setGroup(res.data)
    } catch (err) {
      console.error('Failed to load teaching group:', err)
      toast.error('Failed to load class')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddUnit(e) {
    e.preventDefault()
    if (!unitForm.unit_name.trim()) {
      toast.error('Unit name is required')
      return
    }

    setAddingUnit(true)
    try {
      const sportConfig = SPORTS.find(s => s.value === unitForm.sport)
      await teachingGroupService.addUnit(id, {
        sport: unitForm.sport,
        unit_name: unitForm.unit_name.trim(),
        curriculum_area: sportConfig?.area || 'other',
        term: unitForm.term,
        lesson_count: unitForm.lesson_count ? parseInt(unitForm.lesson_count) : null,
      })
      toast.success('Sport unit added')
      setShowAddUnit(false)
      setUnitForm({ sport: 'football', unit_name: '', term: 'autumn', lesson_count: '' })
      loadGroup()
    } catch (err) {
      toast.error('Failed to add sport unit')
      console.error(err)
    } finally {
      setAddingUnit(false)
    }
  }

  async function handleDeleteUnit(unitId, unitName) {
    if (!confirm(`Remove "${unitName}" from this class?`)) return

    try {
      await teachingGroupService.removeUnit(id, unitId)
      toast.success('Sport unit removed')
      loadGroup()
    } catch (err) {
      toast.error('Failed to remove unit')
    }
  }

  async function openAddPupils() {
    setShowAddPupils(true)
    setPupilSearch('')
    if (allPupils.length === 0) {
      setLoadingPupils(true)
      try {
        const res = await pupilManagementService.list({ limit: 200 })
        setAllPupils(res.data.pupils || [])
      } catch (err) {
        console.error('Failed to load pupils:', err)
      } finally {
        setLoadingPupils(false)
      }
    }
  }

  async function handleAddPupils(pupilIds) {
    setAddingPupilIds(new Set(pupilIds))
    try {
      await teachingGroupService.addPupils(id, pupilIds)
      toast.success(`${pupilIds.length} pupil${pupilIds.length > 1 ? 's' : ''} added`)
      loadGroup()
    } catch (err) {
      toast.error('Failed to add pupils')
    } finally {
      setAddingPupilIds(new Set())
    }
  }

  async function handleRemovePupil(pupilId, pupilName) {
    if (!confirm(`Remove ${pupilName} from this class?`)) return
    setRemovingPupilId(pupilId)
    try {
      await teachingGroupService.removePupil(id, pupilId)
      toast.success('Pupil removed')
      loadGroup()
    } catch (err) {
      toast.error('Failed to remove pupil')
    } finally {
      setRemovingPupilId(null)
    }
  }

  async function handleDeleteGroup() {
    if (!confirm('Delete this entire teaching group? This cannot be undone.')) return

    try {
      await teachingGroupService.remove(id)
      toast.success('Teaching group deleted')
      navigate('/teacher/classes')
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="p-6 text-center">
        <p className="text-navy-400">Teaching group not found.</p>
        <Link to="/teacher/classes" className="text-pitch-400 hover:underline text-sm mt-2 inline-block">
          Back to classes
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back link */}
      <Link
        to="/teacher/classes"
        className="inline-flex items-center gap-1 text-navy-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to classes
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-pitch-600/20 flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-pitch-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{group.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-navy-400">Year {group.year_group}</span>
              <span className="text-navy-600">|</span>
              <span className="text-sm text-navy-400">{group.key_stage}</span>
              <span className="text-navy-600">|</span>
              <span className="text-sm text-navy-400">{group.academic_year}</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleDeleteGroup}
          className="p-2 text-navy-500 hover:text-alert-400 transition-colors"
          title="Delete teaching group"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sport Units (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-pitch-400" />
              Sport Units
            </h2>
            <button
              onClick={() => setShowAddUnit(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Unit
            </button>
          </div>

          {group.units && group.units.length > 0 ? (
            <div className="space-y-3">
              {group.units.map(unit => (
                <div key={unit.id} className="bg-navy-900 rounded-xl border border-navy-800 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium text-white">{unit.unit_name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="px-2 py-0.5 bg-pitch-600/20 text-pitch-400 rounded text-xs capitalize">{unit.sport}</span>
                        <span className="text-xs text-navy-400 capitalize">{unit.curriculum_area?.replace('_', ' ')}</span>
                        {unit.term && <span className="text-xs text-navy-400 capitalize">{unit.term} term</span>}
                        {unit.lesson_count && <span className="text-xs text-navy-400">{unit.lesson_count} lessons</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/teacher/assessment?unit=${unit.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-navy-300 rounded-lg text-sm transition-colors"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        Assess
                      </Link>
                      <button
                        onClick={() => handleDeleteUnit(unit.id, unit.unit_name)}
                        className="p-1.5 text-navy-500 hover:text-alert-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-navy-900 rounded-xl border border-navy-800 p-8 text-center">
              <p className="text-navy-400 text-sm mb-4">
                No sport units yet. Add the activities this class will cover across the year.
              </p>
              <button
                onClick={() => setShowAddUnit(true)}
                className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm mx-auto transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Sport Unit
              </button>
            </div>
          )}
        </div>

        {/* Pupils sidebar (1/3 width) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-pitch-400" />
              Pupils ({group.pupils?.length || 0})
            </h2>
            <button
              onClick={openAddPupils}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          <div className="bg-navy-900 rounded-xl border border-navy-800 p-4">
            {group.pupils && group.pupils.length > 0 ? (
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {group.pupils.map(pupil => (
                  <div key={pupil.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-navy-800/50 group">
                    <Link to={`/teacher/hod/pupils/${pupil.id}`} className="flex-1 min-w-0">
                      <span className="text-sm text-white hover:text-pitch-400 transition-colors">
                        {pupil.last_name ? `${pupil.last_name}, ${pupil.first_name}` : pupil.name || pupil.first_name}
                      </span>
                      {pupil.house && (
                        <span className="ml-2 text-xs text-navy-500">{pupil.house}</span>
                      )}
                    </Link>
                    <button
                      onClick={() => handleRemovePupil(pupil.id, pupil.name || `${pupil.first_name} ${pupil.last_name}`)}
                      disabled={removingPupilId === pupil.id}
                      className="opacity-0 group-hover:opacity-100 p-1 text-navy-600 hover:text-red-400 transition-all ml-2 flex-shrink-0"
                      title="Remove from class"
                    >
                      {removingPupilId === pupil.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <UserMinus className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-navy-400 text-sm mb-3">
                  No pupils in this class yet.
                </p>
                <button
                  onClick={openAddPupils}
                  className="flex items-center gap-1.5 px-3 py-2 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm mx-auto transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Pupils
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Pupils Modal */}
      {showAddPupils && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-navy-900 rounded-xl border border-navy-700 w-full max-w-md mx-4 p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Add Pupils to {group.name}</h2>
              <button onClick={() => setShowAddPupils(false)} className="text-navy-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
              <input
                type="text"
                placeholder="Search by name..."
                value={pupilSearch}
                onChange={e => setPupilSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder:text-navy-500 focus:outline-none focus:border-pitch-500"
                autoFocus
              />
            </div>

            {loadingPupils ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-navy-400" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                {(() => {
                  const existingIds = new Set((group.pupils || []).map(p => p.id))
                  const filtered = allPupils
                    .filter(p => !existingIds.has(p.id))
                    .filter(p => {
                      if (!pupilSearch) return true
                      const q = pupilSearch.toLowerCase()
                      const name = (p.name || `${p.first_name || ''} ${p.last_name || ''}`).toLowerCase()
                      return name.includes(q)
                    })

                  if (filtered.length === 0) {
                    return (
                      <p className="text-navy-500 text-sm text-center py-6">
                        {pupilSearch ? 'No matching pupils found.' : 'All pupils are already in this class.'}
                      </p>
                    )
                  }

                  return filtered.map(p => {
                    const displayName = p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim()
                    const isAdding = addingPupilIds.has(p.id)
                    return (
                      <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-navy-800/50">
                        <div>
                          <span className="text-sm text-white">{displayName}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {p.year_group && <span className="text-xs text-navy-500">Year {p.year_group}</span>}
                            {p.house && <span className="text-xs text-navy-500">{p.house}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddPupils([p.id])}
                          disabled={isAdding}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-xs transition-colors disabled:opacity-50"
                        >
                          {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                          Add
                        </button>
                      </div>
                    )
                  })
                })()}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-navy-800 mt-4">
              <button
                onClick={() => setShowAddPupils(false)}
                className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-navy-300 rounded-lg text-sm transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Unit Modal */}
      {showAddUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-navy-900 rounded-xl border border-navy-700 w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Add Sport Unit</h2>
              <button onClick={() => setShowAddUnit(false)} className="text-navy-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddUnit} className="space-y-4">
              <div>
                <label className="block text-sm text-navy-300 mb-1">Sport</label>
                <select
                  value={unitForm.sport}
                  onChange={e => {
                    const sport = SPORTS.find(s => s.value === e.target.value)
                    setUnitForm({
                      ...unitForm,
                      sport: e.target.value,
                      unit_name: unitForm.unit_name || sport?.label || '',
                    })
                  }}
                  className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-pitch-500"
                >
                  {SPORTS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-navy-300 mb-1">Unit Name</label>
                <input
                  type="text"
                  placeholder="e.g., Football - Invasion Games"
                  value={unitForm.unit_name}
                  onChange={e => setUnitForm({ ...unitForm, unit_name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder:text-navy-500 focus:outline-none focus:border-pitch-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-navy-300 mb-1">Term</label>
                  <select
                    value={unitForm.term}
                    onChange={e => setUnitForm({ ...unitForm, term: e.target.value })}
                    className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-pitch-500"
                  >
                    {TERMS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-navy-300 mb-1">Lessons (optional)</label>
                  <input
                    type="number"
                    placeholder="e.g., 6"
                    value={unitForm.lesson_count}
                    onChange={e => setUnitForm({ ...unitForm, lesson_count: e.target.value })}
                    className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder:text-navy-500 focus:outline-none focus:border-pitch-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUnit(false)}
                  className="flex-1 px-4 py-2.5 bg-navy-800 hover:bg-navy-700 text-navy-300 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingUnit}
                  className="flex-1 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {addingUnit ? 'Adding...' : 'Add Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
