import { useState, useEffect } from 'react'
import { reportingService } from '../../services/api'
import { FileBarChart, Save, Sparkles, Check, ChevronDown, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const ATTAINMENT_GRADES = ['emerging', 'developing', 'secure', 'excelling']
const EFFORT_GRADES = ['needs_improvement', 'good', 'very_good', 'excellent']

const GRADE_COLORS = {
  emerging: 'bg-status-error-tint text-status-error border-status-error',
  developing: 'bg-brand-accent-tint text-brand-accent border-brand-accent',
  secure: 'bg-brand-primary-tint text-brand-primary border-brand-primary',
  excelling: 'bg-status-info-tint text-status-info border-status-info',
  needs_improvement: 'bg-status-error-tint text-status-error border-status-error',
  good: 'bg-brand-accent-tint text-brand-accent border-brand-accent',
  very_good: 'bg-brand-primary-tint text-brand-primary border-brand-primary',
  excellent: 'bg-status-info-tint text-status-info border-status-info',
}

// Seeded and imported reports may carry scale codes (Sec, Exc, effort 1-5)
// rather than the editor's words; show them on the matching button.
const ATTAINMENT_ALIASES = { exc: 'excelling', sec: 'secure', dev: 'developing', beg: 'emerging' }
const EFFORT_ALIASES = { 5: 'excellent', 4: 'very_good', 3: 'good', 2: 'needs_improvement', 1: 'needs_improvement' }
function normaliseAttainment(value) {
  if (!value) return ''
  const key = String(value).toLowerCase()
  return ATTAINMENT_GRADES.includes(key) ? key : (ATTAINMENT_ALIASES[key] || '')
}
function normaliseEffort(value) {
  if (!value) return ''
  const key = String(value).toLowerCase()
  return EFFORT_GRADES.includes(key) ? key : (EFFORT_ALIASES[key] || '')
}

function evidenceSummary(evidence) {
  if (!evidence) return null
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
  const parts = []
  if (evidence.assessments) parts.push(plural(evidence.assessments, 'assessment'))
  if (evidence.observations) parts.push(plural(evidence.observations, 'observation'))
  if (evidence.goals) parts.push(plural(evidence.goals, 'development goal'))
  if (evidence.previous_report) parts.push('the last published report')
  if (parts.length === 0) return 'Drafted from the grades you chose. Edit freely before submitting.'
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0]
  return `Drafted from ${list}. Edit freely before submitting.`
}

export default function TeacherReports() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedWindow, setSelectedWindow] = useState(null)
  const [reports, setReports] = useState({}) // { pupilId: { attainment, effort, comment, status } }
  const [saving, setSaving] = useState({})
  const [drafting, setDrafting] = useState({})
  const [draftInfo, setDraftInfo] = useState({}) // { pupilId: evidence counts behind the last draft }

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
          attainment_grade: normaliseAttainment(report.attainment_grade),
          effort_grade: normaliseEffort(report.effort_grade),
          teacher_comment: report.teacher_comment || '',
          ai_draft: report.ai_draft || '',
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
        ai_draft: report.ai_draft || null,
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
        ai_draft: report.ai_draft || null,
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
    // Never silently overwrite something the teacher has written themselves.
    const written = (report.teacher_comment || '').trim()
    if (written && written !== (report.ai_draft || '').trim()
      && !window.confirm('Replace the comment you have written with a new draft?')) return

    setDrafting(prev => ({ ...prev, [pupilId]: true }))
    try {
      const unit = (pupil.units || []).filter(Boolean)[0]
      const res = await reportingService.generateAIDraft({
        pupil_id: pupilId,
        reporting_window_id: selectedWindow?.id,
        unit_id: unit?.id,
        sport: unit?.sport,
        attainment_grade: report.attainment_grade || null,
        effort_grade: report.effort_grade || null,
      })
      setReports(prev => ({
        ...prev,
        [pupilId]: {
          ...prev[pupilId],
          teacher_comment: res.data.draft,
          ai_draft: res.data.draft,
          id: prev[pupilId]?.id || res.data.report_id || undefined,
          status: prev[pupilId]?.status || 'draft',
        },
      }))
      setDraftInfo(prev => ({ ...prev, [pupilId]: res.data.evidence }))
      toast.success('Draft ready. Review and edit before submitting.')
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to generate draft')
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
        <h1 className="font-display text-3xl font-bold tracking-[-0.015em] text-primary mb-2">Reports</h1>
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
        <h1 className="font-display text-3xl font-bold tracking-[-0.015em] text-primary mb-2">Reports</h1>
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
          <h1 className="font-display text-3xl font-bold tracking-[-0.015em] text-primary">Reports</h1>
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
              <div className="h-full bg-brand-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
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
            <div key={pupil.id} className={`bg-card rounded-xl border ${isSubmitted ? 'border-brand-primary' : 'border-border-default'} p-5`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-primary">
                    {pupil.last_name}, {pupil.first_name}
                    {isSubmitted && <Check className="w-4 h-4 text-brand-primary inline ml-2" />}
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
                          report.attainment_grade === g ? GRADE_COLORS[g] : 'bg-subtle text-tertiary border-border-strong hover:border-border-strong'
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
                          report.effort_grade === g ? GRADE_COLORS[g] : 'bg-subtle text-tertiary border-border-strong hover:border-border-strong'
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
                    title="Drafts a comment from this term's assessments, observations and development goals"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-subtle hover:bg-border-default text-secondary rounded-lg text-xs transition-colors disabled:opacity-50"
                  >
                    {drafting[pupil.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {drafting[pupil.id] ? 'Drafting…' : 'Draft with AI'}
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
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-primary text-sm placeholder:text-tertiary focus:outline-none focus:border-brand-primary resize-none disabled:opacity-60"
                />
                {draftInfo[pupil.id] && (
                  <p className="mt-1.5 text-xs text-tertiary flex items-center gap-1">
                    <Sparkles className="w-3 h-3 shrink-0" /> {evidenceSummary(draftInfo[pupil.id])}
                  </p>
                )}
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
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary hover:bg-brand-primary text-on-dark rounded-lg text-sm transition-colors"
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
