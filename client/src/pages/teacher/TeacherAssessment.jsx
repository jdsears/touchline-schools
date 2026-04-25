import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { assessmentService, teachingGroupService } from '../../services/api'
import { ClipboardCheck, ChevronLeft, Save, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const GRADES = ['emerging', 'developing', 'secure', 'excelling']
const GRADE_COLORS = {
  emerging: 'bg-alert-600/20 text-alert-400 border-alert-600/30',
  developing: 'bg-amber-400/20 text-amber-400 border-amber-400/30',
  secure: 'bg-pitch-600/20 text-pitch-400 border-pitch-600/30',
  excelling: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

export default function TeacherAssessment() {
  const [searchParams] = useSearchParams()
  const unitId = searchParams.get('unit')

  const [groups, setGroups] = useState([])
  const [selectedUnitId, setSelectedUnitId] = useState(unitId || '')
  const [unitData, setUnitData] = useState(null)
  const [grades, setGrades] = useState({}) // { `${pupilId}_${strandId}`: grade }
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingGroups, setLoadingGroups] = useState(true)

  // Load teaching groups to let teacher pick a unit
  useEffect(() => {
    loadGroups()
  }, [])

  // Load unit data when a unit is selected
  useEffect(() => {
    if (selectedUnitId) loadUnitData(selectedUnitId)
  }, [selectedUnitId])

  async function loadGroups() {
    try {
      const res = await teachingGroupService.list()
      setGroups(res.data)
    } catch (err) {
      console.error('Failed to load groups:', err)
    } finally {
      setLoadingGroups(false)
    }
  }

  async function loadUnitData(uId) {
    setLoading(true)
    try {
      const res = await assessmentService.getUnitAssessments(uId)
      setUnitData(res.data)

      // Pre-fill existing grades
      const existing = {}
      for (const a of res.data.assessments) {
        if (a.grade) {
          // Use a generic key for strand-less assessments
          const key = `${a.pupil_id}_general`
          existing[key] = a.grade
        }
      }
      setGrades(existing)
    } catch (err) {
      console.error('Failed to load unit data:', err)
      toast.error('Failed to load assessment data')
    } finally {
      setLoading(false)
    }
  }

  function handleGradeChange(pupilId, strandId, grade) {
    const key = `${pupilId}_${strandId}`
    setGrades(prev => {
      // Toggle off if same grade clicked
      if (prev[key] === grade) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: grade }
    })
  }

  async function handleSave() {
    if (!unitData) return

    const assessments = []
    for (const [key, grade] of Object.entries(grades)) {
      const [pupilId] = key.split('_')
      assessments.push({
        pupil_id: pupilId,
        unit_id: selectedUnitId,
        assessment_type: 'formative',
        grade,
      })
    }

    if (assessments.length === 0) {
      toast.error('No grades to save')
      return
    }

    setSaving(true)
    try {
      await assessmentService.recordBatch(assessments)
      toast.success(`${assessments.length} assessments saved`)
    } catch (err) {
      toast.error('Failed to save assessments')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // Build a flat list of all units across all groups
  const allUnits = groups.flatMap(g =>
    (g.units || []).filter(Boolean).map(u => ({
      ...u,
      group_name: g.name,
      year_group: g.year_group,
      group_id: g.id,
    }))
  )

  if (loadingGroups) {
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
          <h1 className="text-2xl font-bold text-primary">Assessment & Marking</h1>
          <p className="text-secondary mt-1">Assess pupils against curriculum strands</p>
        </div>
        {unitData && Object.keys(grades).length > 0 && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-primary rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span className="text-sm font-medium">{saving ? 'Saving...' : 'Save Assessments'}</span>
          </button>
        )}
      </div>

      {/* Unit selector */}
      <div className="bg-card rounded-xl border border-border-default p-5 mb-6">
        <label className="block text-sm text-secondary mb-2">Select a sport unit to assess</label>
        {allUnits.length > 0 ? (
          <select
            value={selectedUnitId}
            onChange={e => setSelectedUnitId(e.target.value)}
            className="w-full max-w-lg px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-primary text-sm focus:outline-none focus:border-pitch-500"
          >
            <option value="">Choose a unit...</option>
            {allUnits.map(u => (
              <option key={u.id} value={u.id}>
                {u.group_name} - {u.unit_name} ({u.sport}, {u.term} term)
              </option>
            ))}
          </select>
        ) : (
          <p className="text-secondary text-sm">
            No sport units available.{' '}
            <Link to="/teacher/classes" className="text-pitch-400 hover:underline">
              Create a class and add sport units first.
            </Link>
          </p>
        )}
      </div>

      {/* Assessment grid */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="spinner w-8 h-8" />
        </div>
      )}

      {unitData && !loading && (
        <div className="bg-card rounded-xl border border-border-default overflow-hidden">
          {/* Unit header */}
          <div className="px-5 py-4 border-b border-border-default">
            <h2 className="text-base font-semibold text-primary">{unitData.unit.unit_name}</h2>
            <p className="text-xs text-secondary mt-0.5">
              {unitData.unit.key_stage} - {unitData.unit.curriculum_area?.replace('_', ' ')} - {unitData.pupils.length} pupils
            </p>
          </div>

          {unitData.pupils.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3 sticky left-0 bg-card min-w-[200px]">
                      Pupil
                    </th>
                    {unitData.strands.map(strand => (
                      <th key={strand.id} className="text-left text-xs font-medium text-secondary px-4 py-3 min-w-[140px]">
                        {strand.strand_name}
                      </th>
                    ))}
                    {unitData.strands.length === 0 && (
                      <th className="text-left text-xs font-medium text-secondary px-4 py-3 min-w-[140px]">
                        Overall
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {unitData.pupils.map((pupil, i) => (
                    <tr key={pupil.id} className={i % 2 === 0 ? '' : 'bg-subtle/20'}>
                      <td className="px-5 py-3 sticky left-0 bg-card border-r border-border-default">
                        <span className="text-sm text-primary font-medium">
                          {pupil.last_name}, {pupil.first_name}
                        </span>
                      </td>
                      {(unitData.strands.length > 0 ? unitData.strands : [{ id: 'general', strand_name: 'Overall' }]).map(strand => {
                        const key = `${pupil.id}_${strand.id}`
                        const currentGrade = grades[key]
                        return (
                          <td key={strand.id} className="px-4 py-3">
                            <div className="flex gap-1">
                              {GRADES.map(g => (
                                <button
                                  key={g}
                                  onClick={() => handleGradeChange(pupil.id, strand.id, g)}
                                  className={`
                                    px-2 py-1 rounded text-xs font-medium border transition-all capitalize
                                    ${currentGrade === g
                                      ? GRADE_COLORS[g]
                                      : 'bg-subtle text-tertiary border-border-strong hover:border-navy-500'
                                    }
                                  `}
                                  title={g}
                                >
                                  {g.charAt(0).toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-secondary text-sm">No pupils in this teaching group yet.</p>
            </div>
          )}

          {/* Grade key */}
          <div className="px-5 py-3 border-t border-border-default flex items-center gap-4">
            <span className="text-xs text-tertiary">Key:</span>
            {GRADES.map(g => (
              <span key={g} className={`px-2 py-0.5 rounded text-xs font-medium border capitalize ${GRADE_COLORS[g]}`}>
                {g}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
