import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { pupilManagementService } from '../../services/api'
import {
  User, ChevronLeft, GraduationCap, Shield, ClipboardCheck,
  BookOpen, TrendingUp, Edit3, Save, X,
} from 'lucide-react'
import toast from 'react-hot-toast'

const GRADE_COLORS = {
  emerging: 'bg-alert-600/20 text-alert-400',
  developing: 'bg-amber-400/20 text-amber-400',
  secure: 'bg-pitch-600/20 text-pitch-400',
  excelling: 'bg-blue-500/20 text-blue-400',
}

const SPORT_ICONS = {
  football: '\u26BD', rugby: '\uD83C\uDFC9', cricket: '\uD83C\uDFCF',
  hockey: '\uD83C\uDFD1', netball: '\uD83E\uDD3E',
}

export default function HoDPupilProfile() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    loadProfile()
  }, [id])

  async function loadProfile() {
    try {
      const res = await pupilManagementService.getProfile(id)
      setData(res.data)
      setEditForm({
        first_name: res.data.pupil.first_name,
        last_name: res.data.pupil.last_name,
        year_group: res.data.pupil.year_group || '',
        house: res.data.pupil.house || '',
      })
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      await pupilManagementService.update(id, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        year_group: editForm.year_group ? parseInt(editForm.year_group) : null,
        house: editForm.house || null,
      })
      toast.success('Pupil updated')
      setEditing(false)
      loadProfile()
    } catch (err) {
      toast.error('Failed to update')
    }
  }

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="spinner w-8 h-8" /></div>
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <p className="text-navy-400">Pupil not found.</p>
        <Link to="/teacher/hod/pupils" className="text-pitch-400 hover:underline text-sm mt-2 inline-block">Back to pupils</Link>
      </div>
    )
  }

  const { pupil, classes, assessments, teams, sports } = data

  // Group assessments by sport
  const assessmentsBySport = {}
  for (const a of assessments) {
    const sport = a.sport || 'unknown'
    if (!assessmentsBySport[sport]) assessmentsBySport[sport] = []
    assessmentsBySport[sport].push(a)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Link to="/teacher/hod/pupils" className="inline-flex items-center gap-1 text-navy-400 hover:text-white text-sm mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to pupils
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-navy-700 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {pupil.first_name?.charAt(0)}{pupil.last_name?.charAt(0)}
            </span>
          </div>
          <div>
            {editing ? (
              <div className="flex items-center gap-2">
                <input value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                  className="px-2 py-1 bg-navy-800 border border-navy-700 rounded text-white text-lg font-bold w-32 focus:outline-none focus:border-pitch-500" />
                <input value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
                  className="px-2 py-1 bg-navy-800 border border-navy-700 rounded text-white text-lg font-bold w-32 focus:outline-none focus:border-pitch-500" />
              </div>
            ) : (
              <h1 className="text-2xl font-bold text-white">{pupil.first_name} {pupil.last_name}</h1>
            )}
            <div className="flex items-center gap-3 mt-1">
              {editing ? (
                <>
                  <select value={editForm.year_group} onChange={e => setEditForm({ ...editForm, year_group: e.target.value })}
                    className="px-2 py-1 bg-navy-800 border border-navy-700 rounded text-sm text-white focus:outline-none focus:border-pitch-500">
                    <option value="">--</option>
                    {[2,3,4,5,6,7,8,9,10,11,12,13].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                  <input value={editForm.house} onChange={e => setEditForm({ ...editForm, house: e.target.value })}
                    placeholder="House" className="px-2 py-1 bg-navy-800 border border-navy-700 rounded text-sm text-white w-24 focus:outline-none focus:border-pitch-500" />
                </>
              ) : (
                <>
                  {pupil.year_group && <span className="text-sm text-navy-400">Year {pupil.year_group}</span>}
                  {pupil.house && <span className="px-2 py-0.5 bg-amber-400/20 text-amber-400 rounded text-xs">{pupil.house}</span>}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="p-2 text-navy-400 hover:text-white"><X className="w-5 h-5" /></button>
              <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-2 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm">
                <Save className="w-4 h-4" /> Save
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-2 bg-navy-800 hover:bg-navy-700 text-navy-300 rounded-lg text-sm">
              <Edit3 className="w-4 h-4" /> Edit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: classes and teams */}
        <div className="space-y-6">
          {/* Teaching groups */}
          <div className="bg-navy-900 rounded-xl border border-navy-800 p-5">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-pitch-400" /> Classes
            </h2>
            {classes.length > 0 ? (
              <div className="space-y-2">
                {classes.map(cls => (
                  <div key={cls.id} className="p-3 rounded-lg bg-navy-800/50">
                    <div className="text-sm font-medium text-white">{cls.name}</div>
                    <div className="text-xs text-navy-400">{cls.teacher_name} - {cls.key_stage}</div>
                    {cls.units?.filter(Boolean).length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {cls.units.filter(Boolean).map(u => (
                          <span key={u.id} className="px-1.5 py-0.5 bg-navy-700 rounded text-xs text-navy-300 capitalize">{u.sport}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-navy-500">Not assigned to any classes yet.</p>
            )}
          </div>

          {/* Extra-curricular teams */}
          <div className="bg-navy-900 rounded-xl border border-navy-800 p-5">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" /> Teams
            </h2>
            {teams.length > 0 ? (
              <div className="space-y-2">
                {teams.map(team => (
                  <div key={team.id} className="flex items-center gap-2 p-3 rounded-lg bg-navy-800/50">
                    <span className="text-lg">{SPORT_ICONS[team.sport] || ''}</span>
                    <div>
                      <div className="text-sm font-medium text-white">{team.name}</div>
                      <div className="text-xs text-navy-400 capitalize">{team.sport} - {team.age_group}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-navy-500">Not in any extra-curricular teams.</p>
            )}
          </div>
        </div>

        {/* Right column: assessments (2/3 width) */}
        <div className="lg:col-span-2">
          <div className="bg-navy-900 rounded-xl border border-navy-800 p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-pitch-400" /> Assessment History
            </h2>
            {assessments.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(assessmentsBySport).map(([sport, sportAssessments]) => (
                  <div key={sport}>
                    <h3 className="text-xs font-semibold text-navy-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span>{SPORT_ICONS[sport] || ''}</span> {sport}
                    </h3>
                    <div className="space-y-2">
                      {sportAssessments.slice(0, 10).map(a => (
                        <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50">
                          <div>
                            <div className="text-sm text-white">{a.unit_name}</div>
                            <div className="text-xs text-navy-400">
                              {a.curriculum_area?.replace('_', ' ')} -
                              {new Date(a.assessed_at).toLocaleDateString('en-GB')}
                            </div>
                          </div>
                          {a.grade && (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${GRADE_COLORS[a.grade] || 'bg-navy-700 text-navy-300'}`}>
                              {a.grade}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-navy-500 text-center py-6">No assessments recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
