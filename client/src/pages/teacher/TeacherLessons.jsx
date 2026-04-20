import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Plus, Calendar, Clock, X, Trash2,
  ChevronRight, Loader2, GraduationCap, Tag,
  Sparkles, Users, ClipboardList,
} from 'lucide-react'
import { lessonService, teachingGroupService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const SPORTS_EMOJI = {
  football: '⚽', rugby: '🏉', hockey: '🏑', netball: '🥅',
  cricket: '🏏', basketball: '🏀', badminton: '🏸', tennis: '🎾',
  athletics: '🏃', gymnastics: '🤸', dance: '💃', swimming: '🏊',
  fitness: '💪', rounders: '🏏', table_tennis: '🏓',
  outdoor_adventurous: '🧗', handball: '🤾',
}

const STATUS_STYLES = {
  draft: 'bg-navy-800 text-navy-400',
  planned: 'bg-blue-900/40 text-blue-400',
  delivered: 'bg-pitch-900/40 text-pitch-400',
}

const DURATION_OPTIONS = [30, 45, 60, 75, 90]

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function TeacherLessons() {
  const { user } = useAuth()
  const [lessons, setLessons] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // Form state
  const [form, setForm] = useState({
    teaching_group_id: '',
    sport_unit_id: '',
    title: '',
    lesson_date: new Date().toISOString().split('T')[0],
    duration: 60,
    learning_objectives: '',
    activities: '',
    equipment: '',
    differentiation: '',
    homework: '',
    status: 'draft',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [lessonsRes, groupsRes] = await Promise.all([
        lessonService.list(),
        teachingGroupService.list(),
      ])
      setLessons(lessonsRes.data)
      setGroups(groupsRes.data)
    } catch (err) {
      console.error('Failed to load lessons:', err)
      toast.error('Failed to load lesson plans')
    } finally {
      setLoading(false)
    }
  }

  const selectedGroup = groups.find(g => g.id === form.teaching_group_id)
  const availableUnits = selectedGroup?.units || []

  function openModal() {
    setEditingId(null)
    setForm({
      teaching_group_id: groups[0]?.id || '',
      sport_unit_id: '',
      title: '',
      lesson_date: new Date().toISOString().split('T')[0],
      duration: 60,
      learning_objectives: '',
      activities: '',
      equipment: '',
      differentiation: '',
      homework: '',
      status: 'draft',
    })
    setGenerating(false)
    setShowModal(true)
  }

  function openEditModal(lesson) {
    setEditingId(lesson.id)
    setForm({
      teaching_group_id: lesson.teaching_group_id || '',
      sport_unit_id: lesson.sport_unit_id || '',
      title: lesson.title || '',
      lesson_date: lesson.lesson_date ? lesson.lesson_date.split('T')[0] : '',
      duration: lesson.duration || 60,
      learning_objectives: lesson.learning_objectives || '',
      activities: lesson.activities || '',
      equipment: lesson.equipment || '',
      differentiation: lesson.differentiation || '',
      homework: lesson.homework || '',
      status: lesson.status || 'draft',
    })
    setGenerating(false)
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Please enter a lesson title')
      return
    }
    setSaving(true)
    try {
      const payload = {
        teaching_group_id: form.teaching_group_id || null,
        sport_unit_id: form.sport_unit_id || null,
        title: form.title.trim(),
        lesson_date: form.lesson_date || null,
        duration: form.duration,
        learning_objectives: form.learning_objectives || null,
        activities: form.activities || null,
        equipment: form.equipment || null,
        differentiation: form.differentiation || null,
        homework: form.homework || null,
        status: form.status,
      }
      if (editingId) {
        await lessonService.update(editingId, payload)
        toast.success('Lesson plan updated')
      } else {
        await lessonService.create(payload)
        toast.success('Lesson plan created')
      }
      setShowModal(false)
      setEditingId(null)
      loadData()
    } catch (err) {
      console.error('Failed to save lesson:', err)
      toast.error(err.response?.data?.error || 'Failed to save lesson plan')
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await lessonService.generate({
        teaching_group_id: form.teaching_group_id || null,
        sport_unit_id: form.sport_unit_id || null,
        title: form.title || null,
        duration: form.duration,
        learning_objectives: form.learning_objectives || null,
        equipment: form.equipment || null,
      })
      const data = res.data
      if (data.raw) {
        toast.error('AI returned an unexpected format')
        return
      }
      setForm(f => ({
        ...f,
        learning_objectives: data.learning_objectives || f.learning_objectives,
        activities: data.activities || f.activities,
        equipment: data.equipment || f.equipment,
        differentiation: data.differentiation || f.differentiation,
        homework: data.homework || f.homework,
      }))
      toast.success('Lesson content generated')
    } catch (err) {
      console.error('AI generation failed:', err)
      toast.error(err.response?.data?.error || 'Failed to generate lesson content')
    } finally {
      setGenerating(false)
    }
  }

  async function handleDelete(lesson) {
    if (!confirm(`Delete "${lesson.title}"?`)) return
    setDeletingId(lesson.id)
    try {
      await lessonService.remove(lesson.id)
      toast.success('Lesson deleted')
      setLessons(prev => prev.filter(l => l.id !== lesson.id))
    } catch (err) {
      toast.error('Failed to delete lesson')
    } finally {
      setDeletingId(null)
    }
  }

  const now = new Date()
  const upcoming = lessons.filter(l => !l.lesson_date || new Date(l.lesson_date) >= now)
  const past = lessons.filter(l => l.lesson_date && new Date(l.lesson_date) < now)

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-navy-500" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Lesson Planning</h1>
          <p className="text-navy-400 mt-1">Plan and organise your curriculum PE lessons</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Lesson
        </button>
      </div>

      {lessons.length === 0 ? (
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-navy-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No lessons planned yet</h3>
          <p className="text-navy-400 text-sm max-w-md mx-auto mb-6">
            Create lesson plans linked to your teaching groups and sport units.
          </p>
          <button
            onClick={openModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create your first lesson
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-navy-400 uppercase tracking-wider mb-3">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map(lesson => (
                  <LessonCard key={lesson.id} lesson={lesson} onDelete={handleDelete} onEdit={openEditModal} deletingId={deletingId} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-navy-400 uppercase tracking-wider mb-3">Past</h2>
              <div className="space-y-3 opacity-70">
                {past.slice(0, 20).map(lesson => (
                  <LessonCard key={lesson.id} lesson={lesson} onDelete={handleDelete} onEdit={openEditModal} deletingId={deletingId} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Lesson Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-navy-900 rounded-2xl border border-navy-700 w-full max-w-xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-navy-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-pitch-600/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-pitch-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">{editingId ? 'Edit Lesson Plan' : 'New Lesson Plan'}</h2>
              </div>
              <button onClick={() => { setShowModal(false); setEditingId(null) }} className="text-navy-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSave} className="overflow-y-auto flex-1">
              <div className="p-6 space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1.5">Lesson title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Year 8 Hockey – Passing and Receiving"
                    className="input w-full"
                    autoFocus
                  />
                </div>

                {/* Class & Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-300 mb-1.5">
                      <GraduationCap className="w-3.5 h-3.5 inline mr-1" />
                      Teaching group
                    </label>
                    <select
                      value={form.teaching_group_id}
                      onChange={e => setForm(f => ({ ...f, teaching_group_id: e.target.value, sport_unit_id: '' }))}
                      className="input w-full"
                    >
                      <option value="">— None —</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name} {g.year_group ? `(Y${g.year_group})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-300 mb-1.5">
                      <Tag className="w-3.5 h-3.5 inline mr-1" />
                      Sport unit
                    </label>
                    <select
                      value={form.sport_unit_id}
                      onChange={e => setForm(f => ({ ...f, sport_unit_id: e.target.value }))}
                      className="input w-full"
                      disabled={availableUnits.length === 0}
                    >
                      <option value="">— None —</option>
                      {availableUnits.map(u => (
                        <option key={u.id} value={u.id}>{u.unit_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date & Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-300 mb-1.5">
                      <Calendar className="w-3.5 h-3.5 inline mr-1" />
                      Date
                    </label>
                    <input
                      type="date"
                      value={form.lesson_date}
                      onChange={e => setForm(f => ({ ...f, lesson_date: e.target.value }))}
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-300 mb-1.5">
                      <Clock className="w-3.5 h-3.5 inline mr-1" />
                      Duration
                    </label>
                    <select
                      value={form.duration}
                      onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) }))}
                      className="input w-full"
                    >
                      {DURATION_OPTIONS.map(d => (
                        <option key={d} value={d}>{d} min</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* AI Generate button */}
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-purple-800 disabled:to-blue-800 text-white rounded-xl text-sm font-medium transition-all"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating lesson content…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate with AI
                    </>
                  )}
                </button>
                {generating && (
                  <p className="text-xs text-navy-500 text-center -mt-3">
                    The AI will fill in objectives, activities, equipment, differentiation, and homework based on your selections above.
                  </p>
                )}

                {/* Learning objectives */}
                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1.5">Learning objectives</label>
                  <textarea
                    value={form.learning_objectives}
                    onChange={e => setForm(f => ({ ...f, learning_objectives: e.target.value }))}
                    placeholder="What will pupils know, understand, or be able to do by the end?"
                    rows={3}
                    className="input w-full resize-none"
                  />
                </div>

                {/* Activities */}
                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1.5">Activities / lesson structure</label>
                  <textarea
                    value={form.activities}
                    onChange={e => setForm(f => ({ ...f, activities: e.target.value }))}
                    placeholder="Warm-up, main activities, cool-down..."
                    rows={4}
                    className="input w-full resize-none"
                  />
                </div>

                {/* Equipment */}
                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1.5">Equipment needed</label>
                  <input
                    type="text"
                    value={form.equipment}
                    onChange={e => setForm(f => ({ ...f, equipment: e.target.value }))}
                    placeholder="e.g. 20 bibs, cones, 10 balls"
                    className="input w-full"
                  />
                </div>

                {/* Differentiation */}
                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1.5">
                    <Users className="w-3.5 h-3.5 inline mr-1" />
                    Differentiation
                  </label>
                  <textarea
                    value={form.differentiation}
                    onChange={e => setForm(f => ({ ...f, differentiation: e.target.value }))}
                    placeholder="How will you support lower-ability pupils and extend higher-ability pupils?"
                    rows={3}
                    className="input w-full resize-none"
                  />
                </div>

                {/* Homework */}
                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1.5">
                    <ClipboardList className="w-3.5 h-3.5 inline mr-1" />
                    Homework / follow-up
                  </label>
                  <input
                    type="text"
                    value={form.homework}
                    onChange={e => setForm(f => ({ ...f, homework: e.target.value }))}
                    placeholder="Optional task or reflection for pupils"
                    className="input w-full"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-navy-300 mb-1.5">Status</label>
                  <div className="flex gap-2">
                    {['draft', 'planned', 'delivered'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, status: s }))}
                        className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors border ${
                          form.status === s
                            ? 'bg-pitch-600 text-white border-pitch-600'
                            : 'bg-navy-800 text-navy-400 border-navy-700 hover:text-white'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="p-6 border-t border-navy-800 flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null) }}
                  className="px-4 py-2.5 text-sm text-navy-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.title.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? (editingId ? 'Saving…' : 'Creating…') : (editingId ? 'Save Changes' : 'Create Lesson')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function LessonCard({ lesson, onDelete, onEdit, deletingId }) {
  const emoji = SPORT_ICONS[lesson.sport] || '📋'
  const statusStyle = STATUS_STYLES[lesson.status] || STATUS_STYLES.draft

  return (
    <div className="bg-navy-900 rounded-xl border border-navy-800 hover:border-navy-700 transition-colors flex items-center justify-between gap-4 group">
      <button
        type="button"
        onClick={() => onEdit(lesson)}
        className="flex items-center gap-4 min-w-0 flex-1 text-left p-5 rounded-xl hover:bg-navy-800/30 transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-navy-800 flex items-center justify-center text-lg flex-shrink-0">
          {emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white truncate">{lesson.title}</span>
            <span className={`px-1.5 py-0.5 rounded text-xs capitalize flex-shrink-0 ${statusStyle}`}>
              {lesson.status}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {lesson.lesson_date && (
              <span className="text-xs text-navy-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(lesson.lesson_date)}
              </span>
            )}
            {lesson.duration && (
              <span className="text-xs text-navy-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lesson.duration} min
              </span>
            )}
            {lesson.teaching_group_name && (
              <span className="text-xs text-navy-400 flex items-center gap-1">
                <GraduationCap className="w-3 h-3" />
                {lesson.teaching_group_name}
                {lesson.year_group ? ` (Y${lesson.year_group})` : ''}
              </span>
            )}
            {lesson.unit_name && (
              <span className="text-xs text-navy-500">· {lesson.unit_name}</span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-navy-600 group-hover:text-navy-400 flex-shrink-0 transition-colors" />
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(lesson) }}
        disabled={deletingId === lesson.id}
        className="p-2 mr-3 text-navy-500 hover:text-red-400 transition-colors flex-shrink-0"
        title="Delete lesson"
      >
        {deletingId === lesson.id
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Trash2 className="w-4 h-4" />
        }
      </button>
    </div>
  )
}

// Fix reference: SPORT_ICONS uses SPORTS_EMOJI values
const SPORT_ICONS = SPORTS_EMOJI
