import { useState, useEffect } from 'react'
import { reportingService } from '../../services/api'
import { FileBarChart, Save, Sparkles, Check, ChevronDown, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const ATTAINMENT_GRADES = ['emerging', 'developing', 'secure', 'excelling']
const EFFORT_GRADES = ['needs_improvement', 'good', 'very_good', 'excellent']

const GRADE_COLORS = {
  emerging: 'bg-alert-600/20 text-alert-400 border-alert-600/30',
  developing: 'bg-amber-400/20 text-amber-400 border-amber-400/30',
  secure: 'bg-pitch-600/20 text-pitch-400 border-pitch-600/30',
  excelling: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  needs_improvement: 'bg-alert-600/20 text-alert-400 border-alert-600/30',
  good: 'bg-amber-400/20 text-amber-400 border-amber-400/30',
  very_good: 'bg-pitch-600/20 text-pitch-400 border-pitch-600/30',
  excellent: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

export default function TeacherReports() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedWindow, setSelectedWindow] = useState(null)
  const [reports, setReports] = useState({}) // { pupilId: { attainment, effort, comment, status } }
  const [saving, setSaving] = useState({})
  const [drafting, setDrafting] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const res = await reportingService.getMyReports()
      setData(res.data)
      if (res.data.windows.length > 0) {
        setSelectedWindow(res.data.windows[0])
      }

      // Pre-fill existing reports
      const existing = {}
      for (const [key, report] of Object.entries(res.data.existing_reports || {})) {
        const [pupilId] = key.split('_')
        existing[pupilId] = {
          attainment_grade: report.attainment_grade || '',
          effort_grade: report.effort_grade || '',
          teacher_comment: report.teacher_comment || '',
          status: report.status || 'draft',
          id: report.id,
        }
      }
      setReports(existing)
    } catch (err) {
      console.error('Failed to load reports:', err)
    } finally {
      setLoading(false)
    }
  }

  function updateReport(pupilId, field, value) {
    setReports(prev => ({
      ...prev,
      [pupilId]: { ...prev[pupilId], [field]: value },
    }))
  }

  async function saveReport(pupilId) {
    if (!selectedWindow) return
    const report = reports[pupilId] || {}

    setSaving(prev => ({ ...prev, [pupilId]: true }))
    try {
      await reportingService.saveReport({
        pupil_id: pupilId,
        reporting_window_id: selectedWindow.id,
        attainment_grade: report.attainment_grade || null,
        effort_grade: report.effort_grade || null,
        teacher_comment: report.teacher_comment || null,
        status: 'draft',
      })
      toast.success('Report saved')
    } catch (err) {
      toast.error('Failed to save')
    } finally {
      setSaving(prev => ({ ...prev, [pupilId]: false }))
    }
  }

  async function submitReport(pupilId) {
    if (!selectedWindow) return
    const report = reports[pupilId] || {}

    setSaving(prev => ({ ...prev, [pupilId]: true }))
    try {
      await reportingService.saveReport({
        pupil_id: pupilId,
        reporting_window_id: selectedWindow.id,
        attainment_grade: report.attainment_grade || null,
        effort_grade: report.effort_grade || null,
        teacher_comment: report.teacher_comment || null,
        status: 'submitted',
      })
      updateReport(pupilId, 'status', 'submitted')
      toast.success('Report submitted')
    } catch (err) {
      toast.error('Failed to submit')
    } finally {
      setSaving(prev => ({ ...prev, [pupilId]: false }))
    }
  }

  async function generateDraft(pupilId, pupil) {
    const report = reports[pupilId] || {}
    setDrafting(prev => ({ ...prev, [pupilId]: true }))
    try {
      const res = await reportingService.generateAIDraft({
        pupil_id: pupilId,
        sport: pupil.units?.[0]?.sport || 'football',
        unit_name: pupil.units?.[0]?.unit_name || 'PE',
        attainment_grade: report.attainment_grade,
        effort_grade: report.effort_grade,
      })
      updateReport(pupilId, 'teacher_comment', res.data.draft)
      toast.success('Draft generated. Review and edit before submitting.')
    } catch (err) {
      toast.error('Failed to generate draft')
    } finally {
      setDrafting(prev => ({ ...prev, [pupilId]: false }))
    }
  }

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="spinner w-8 h-8" /></div>
  }

  if (!data || data.windows.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-primary mb-2">Reports</h1>
        <p className="text-secondary mb-8">Generate termly pupil reports</p>
        <div className="bg-card rounded-xl border border-border-default p-12 text-center">
          <FileBarChart className="w-8 h-8 text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">No open reporting windows</h3>
          <p className="text-secondary text-sm">Your Head of PE needs to create and open a reporting window before you can write reports.</p>
        </div>
      </div>
    )
  }

  if (data.pupils_to_report.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-primary mb-2">Reports</h1>
        <div className="bg-card rounded-xl border border-border-default p-12 text-center">
          <FileBarChart className="w-8 h-8 text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">{data.windows[0]?.name} is open</h3>
          <p className="text-secondary text-sm">You have no pupils assigned to your teaching groups for this window. Ask your Head of PE to assign you to a teaching group.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary">Reports</h1>
          <p className="text-secondary mt-1">
            {selectedWindow?.name} - {data.pupils_to_report.length} pupils to report on
          </p>
        </div>
        {data.windows.length > 1 && (
          <select
            value={selectedWindow?.id || ''}
            onChange={e => setSelectedWindow(data.windows.find(w => w.id === e.target.value))}
            className="px-3 py-2 bg-subtle border border-border-strong rounded-lg text-primary text-sm"
          >
            {data.windows.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Progress indicator */}
      {(() => {
        const total = data.pupils_to_report.length
        const started = data.pupils_to_report.filter(p => reports[p.id]?.status).length
        const submitted = data.pupils_to_report.filter(p => reports[p.id]?.status === 'submitted').length
        const pct = total > 0 ? Math.round((submitted / total) * 100) : 0
        return (
          <div className="mb-6 bg-card rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-secondary">{submitted} of {total} reports submitted</span>
              <span className="text-tertiary text-xs">{started - submitted} in draft · {total - started} not started</span>
            </div>
            <div className="h-2 bg-subtle rounded-full overflow-hidden">
              <div className="h-full bg-pitch-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })()}

      {/* Report cards */}
      <div className="space-y-4">
        {data.pupils_to_report.map(pupil => {
          const report = reports[pupil.id] || {}
          const isSubmitted = report.status === 'submitted'

          return (
            <div key={pupil.id} className={`bg-card rounded-xl border ${isSubmitted ? 'border-pitch-600/30' : 'border-border-default'} p-5`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-primary">
                    {pupil.last_name}, {pupil.first_name}
                    {isSubmitted && <Check className="w-4 h-4 text-pitch-400 inline ml-2" />}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-secondary">Year {pupil.year_group}</span>
                    <span className="text-xs text-secondary">{pupil.class_name}</span>
                    {pupil.units?.filter(Boolean).map(u => (
                      <span key={u.id} className="px-1.5 py-0.5 bg-subtle rounded text-xs text-secondary capitalize">{u.sport}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Attainment */}
                <div>
                  <label className="block text-xs text-secondary mb-1.5">Attainment</label>
                  <div className="flex gap-1">
                    {ATTAINMENT_GRADES.map(g => (
                      <button
                        key={g}
                        onClick={() => updateReport(pupil.id, 'attainment_grade', g)}
                        disabled={isSubmitted}
                        className={`flex-1 px-1 py-1.5 rounded text-xs font-medium border transition-all capitalize ${
                          report.attainment_grade === g ? GRADE_COLORS[g] : 'bg-subtle text-tertiary border-border-strong hover:border-navy-500'
                        } ${isSubmitted ? 'opacity-60' : ''}`}
                      >
                        {g.charAt(0).toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Effort */}
                <div>
                  <label className="block text-xs text-secondary mb-1.5">Effort</label>
                  <div className="flex gap-1">
                    {EFFORT_GRADES.map(g => (
                      <button
                        key={g}
                        onClick={() => updateReport(pupil.id, 'effort_grade', g)}
                        disabled={isSubmitted}
                        className={`flex-1 px-1 py-1.5 rounded text-xs font-medium border transition-all ${
                          report.effort_grade === g ? GRADE_COLORS[g] : 'bg-subtle text-tertiary border-border-strong hover:border-navy-500'
                        } ${isSubmitted ? 'opacity-60' : ''}`}
                      >
                        {g === 'needs_improvement' ? 'NI' : g === 'very_good' ? 'VG' : g.charAt(0).toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI draft button */}
                <div className="flex items-end">
                  <button
                    onClick={() => generateDraft(pupil.id, pupil)}
                    disabled={drafting[pupil.id] || isSubmitted}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-subtle hover:bg-border-default text-secondary rounded-lg text-xs transition-colors disabled:opacity-50"
                  >
                    {drafting[pupil.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    AI Draft
                  </button>
                </div>
              </div>

              {/* Comment */}
              <div className="mt-3">
                <textarea
                  value={report.teacher_comment || ''}
                  onChange={e => updateReport(pupil.id, 'teacher_comment', e.target.value)}
                  disabled={isSubmitted}
                  placeholder="Write your report comment..."
                  rows={3}
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-primary text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500 resize-none disabled:opacity-60"
                />
              </div>

              {/* Actions */}
              {!isSubmitted && (
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => saveReport(pupil.id)}
                    disabled={saving[pupil.id]}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-subtle hover:bg-border-default text-secondary rounded-lg text-sm transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving[pupil.id] ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    onClick={() => submitReport(pupil.id)}
                    disabled={saving[pupil.id]}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-pitch-600 hover:bg-pitch-700 text-on-dark rounded-lg text-sm transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Submit
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
