import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { teachingGroupService } from '../../services/api'
import {
  GraduationCap, Users, BookOpen, Plus, Trash2, ChevronLeft,
  X, ClipboardCheck,
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
          </div>

          <div className="bg-navy-900 rounded-xl border border-navy-800 p-4">
            {group.pupils && group.pupils.length > 0 ? (
              <div className="space-y-2">
                {group.pupils.map(pupil => (
                  <div key={pupil.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-navy-800/50">
                    <div>
                      <span className="text-sm text-white">{pupil.last_name}, {pupil.first_name}</span>
                      {pupil.house && (
                        <span className="ml-2 text-xs text-navy-500">{pupil.house}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-navy-400 text-sm text-center py-4">
                No pupils in this class yet. Pupils can be added from the school admin panel.
              </p>
            )}
          </div>
        </div>
      </div>

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
