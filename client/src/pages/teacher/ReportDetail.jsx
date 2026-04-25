import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { reportingService } from '../../services/api'
import { ArrowLeft, User, BookOpen, MessageSquare, Clock } from 'lucide-react'

const GRADE_LABELS = {
  attainment: { emerging: 'Emerging', developing: 'Developing', secure: 'Secure', excelling: 'Excelling' },
  effort: { needs_improvement: 'Needs Improvement', good: 'Good', very_good: 'Very Good', excellent: 'Excellent' },
}

const GRADE_COLORS = {
  emerging: 'bg-red-500/20 text-red-400',
  developing: 'bg-amber-500/20 text-amber-400',
  secure: 'bg-pitch-500/20 text-pitch-400',
  excelling: 'bg-blue-500/20 text-blue-400',
  needs_improvement: 'bg-red-500/20 text-red-400',
  good: 'bg-amber-500/20 text-amber-400',
  very_good: 'bg-pitch-500/20 text-pitch-400',
  excellent: 'bg-blue-500/20 text-blue-400',
}

export default function ReportDetail() {
  const { windowId, reportId } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    reportingService.getReport(reportId)
      .then(res => setReport(res.data))
      .catch(() => setError('Report not found'))
      .finally(() => setLoading(false))
  }, [reportId])

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="spinner w-8 h-8" /></div>
  if (error || !report) return (
    <div className="p-6 text-center text-secondary">
      <p className="mb-4">{error || 'Report not found'}</p>
      <button onClick={() => navigate(-1)} className="text-pitch-400 hover:text-pitch-300 text-sm">← Go back</button>
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => navigate(`/teacher/hod/reporting/windows/${windowId}`)} className="flex items-center gap-1.5 text-secondary hover:text-link text-sm mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to reports list
      </button>

      {/* Pupil identity */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-border-default flex items-center justify-center">
            <User className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary">{report.first_name} {report.last_name}</h1>
            <p className="text-sm text-secondary">
              Year {report.year_group}
              {report.house && ` · ${report.house}`}
              {report.class_name && ` · ${report.class_name}`}
            </p>
          </div>
          <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium capitalize ${
            report.status === 'published' ? 'bg-blue-500/20 text-blue-400' :
            report.status === 'submitted' ? 'bg-amber-400/20 text-amber-400' :
            'bg-border-default text-secondary'
          }`}>{report.status}</span>
        </div>
      </div>

      {/* Assessment summary */}
      <div className="card p-5 mb-4">
        <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> Assessment
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-tertiary mb-1">Sport / Unit</p>
            <p className="text-primary text-sm">{report.unit_name || report.unit_sport || report.sport || '—'}</p>
          </div>
          <div />
          <div>
            <p className="text-xs text-tertiary mb-1">Attainment</p>
            {report.attainment_grade ? (
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${GRADE_COLORS[report.attainment_grade] || ''}`}>
                {GRADE_LABELS.attainment[report.attainment_grade] || report.attainment_grade}
              </span>
            ) : <span className="text-tertiary text-sm">Not set</span>}
          </div>
          <div>
            <p className="text-xs text-tertiary mb-1">Effort</p>
            {report.effort_grade ? (
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${GRADE_COLORS[report.effort_grade] || ''}`}>
                {GRADE_LABELS.effort[report.effort_grade] || report.effort_grade}
              </span>
            ) : <span className="text-tertiary text-sm">Not set</span>}
          </div>
        </div>
      </div>

      {/* Teacher comment */}
      <div className="card p-5 mb-4">
        <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Teacher Comment
        </h2>
        {report.teacher_comment ? (
          <p className="text-primary text-sm leading-relaxed whitespace-pre-wrap">{report.teacher_comment}</p>
        ) : (
          <p className="text-tertiary text-sm italic">No comment written yet.</p>
        )}
      </div>

      {/* Metadata */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Metadata
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-secondary">Written by</span>
            <span className="text-primary">{report.teacher_name || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary">Last modified</span>
            <span className="text-primary">{report.updated_at ? new Date(report.updated_at).toLocaleString('en-GB') : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary">Created</span>
            <span className="text-primary">{report.created_at ? new Date(report.created_at).toLocaleString('en-GB') : '—'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
