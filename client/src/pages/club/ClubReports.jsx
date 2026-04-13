import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { clubIntelligenceService, clubService } from '../../services/api'
import {
  FileBarChart, Sparkles, FileText, Landmark, ShieldCheck,
  GraduationCap, ChevronDown, ChevronUp, Copy, Check,
  Loader2, AlertCircle, RefreshCw, Pencil, Save, X,
  DollarSign, Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'

const GRANT_TYPES = [
  { value: 'football_foundation_grass_pitch', label: 'Football Foundation Grass Pitch' },
  { value: 'fa_national_game', label: 'FA National Game' },
  { value: 'county_fa', label: 'County FA' },
  { value: 'other', label: 'Other' },
]

export default function ClubReports() {
  const { club, myRole } = useOutletContext()
  const [members, setMembers] = useState([])

  useEffect(() => {
    if (club?.id) loadMembers()
  }, [club?.id])

  async function loadMembers() {
    try {
      const res = await clubService.getMembers(club.id)
      setMembers(res.data.filter(m => ['owner', 'admin', 'coach'].includes(m.role)))
    } catch {
      // Non-critical, coaches dropdown may just be empty
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-pitch-600/10 text-pitch-400">
          <FileBarChart className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-navy-400 text-sm mt-0.5">AI-powered reports, grant applications, and analysis</p>
        </div>
      </div>

      {/* Season Summary */}
      <SeasonSummarySection clubId={club?.id} />

      {/* Grant Helper */}
      <GrantHelperSection clubId={club?.id} />

      {/* Compliance Analysis */}
      <ComplianceAnalysisSection clubId={club?.id} />

      {/* Coach Development */}
      <CoachDevelopmentSection clubId={club?.id} members={members} />
    </div>
  )
}

/* ============================================================
   Season Summary Section
   ============================================================ */
function SeasonSummarySection({ clubId }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded] = useState({})
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (clubId) loadReport()
  }, [clubId])

  async function loadReport() {
    try {
      const res = await clubIntelligenceService.getLatestSeasonSummary(clubId)
      setReport(res.data.report || res.data)
    } catch {
      // No report yet, that's fine
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await clubIntelligenceService.generateSeasonSummary(clubId)
      setReport(res.data.report || res.data)
      toast.success('Season report generated')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate season report')
    } finally {
      setGenerating(false)
    }
  }

  function handleCopy() {
    if (!report) return
    const text = typeof report.content === 'string'
      ? report.content
      : report.sections
        ? report.sections.map(s => `## ${s.title}\n${s.content}`).join('\n\n')
        : JSON.stringify(report, null, 2)
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  function toggleSection(idx) {
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const sections = report?.sections || []
  const reportContent = report?.content || null

  return (
    <div className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-navy-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-600/10 text-blue-400">
            <FileText className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Season Summary</h2>
            <p className="text-xs text-navy-400">AI-generated overview of your club's season</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {report && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-navy-300 hover:text-white rounded-lg text-xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-2 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {generating ? 'Generating...' : report ? 'Regenerate' : 'Generate Season Report'}
          </button>
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="spinner w-6 h-6" />
          </div>
        ) : report ? (
          <div className="space-y-3">
            {report.generated_at && (
              <p className="text-xs text-navy-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Generated {new Date(report.generated_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}

            {/* If report has sections, show expandable sections */}
            {sections.length > 0 ? (
              <div className="space-y-2">
                {sections.map((section, idx) => (
                  <div key={idx} className="border border-navy-800 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection(idx)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-navy-800/30 transition-colors"
                    >
                      <span className="text-sm font-medium text-white">{section.title}</span>
                      {expanded[idx]
                        ? <ChevronUp className="w-4 h-4 text-navy-400" />
                        : <ChevronDown className="w-4 h-4 text-navy-400" />
                      }
                    </button>
                    {expanded[idx] && (
                      <div className="px-4 pb-3 border-t border-navy-800">
                        <p className="text-sm text-navy-300 whitespace-pre-wrap leading-relaxed mt-2">
                          {section.content}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : reportContent ? (
              <div className="text-sm text-navy-300 whitespace-pre-wrap leading-relaxed">
                {reportContent}
              </div>
            ) : (
              <p className="text-sm text-navy-400">Report data available but no content to display.</p>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 text-navy-600 mx-auto mb-3" />
            <p className="text-sm text-navy-400">
              No season report generated yet. Click "Generate Season Report" to create an AI-powered summary of your club's current season.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   Grant Helper Section
   ============================================================ */
function GrantHelperSection({ clubId }) {
  const [drafts, setDrafts] = useState([])
  const [loadingDrafts, setLoadingDrafts] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [copied, setCopied] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [expandedDraft, setExpandedDraft] = useState(null)
  const [form, setForm] = useState({
    grant_type: 'football_foundation_grass_pitch',
    description: '',
    estimated_cost: '',
  })

  useEffect(() => {
    if (clubId) loadDrafts()
  }, [clubId])

  async function loadDrafts() {
    try {
      const res = await clubIntelligenceService.getGrantDrafts(clubId)
      setDrafts(res.data.drafts || res.data || [])
    } catch {
      // No drafts yet
    } finally {
      setLoadingDrafts(false)
    }
  }

  async function handleGenerate(e) {
    e.preventDefault()
    if (!form.description.trim()) return toast.error('Please describe what you need funding for')
    setGenerating(true)
    try {
      const res = await clubIntelligenceService.generateGrantDraft(clubId, {
        grant_type: form.grant_type,
        description: form.description,
        estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : undefined,
      })
      setDrafts(prev => [res.data, ...prev])
      setExpandedDraft(res.data.id)
      setShowForm(false)
      setForm({ grant_type: 'football_foundation_grass_pitch', description: '', estimated_cost: '' })
      toast.success('Grant draft generated')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate grant draft')
    } finally {
      setGenerating(false)
    }
  }

  function handleCopyDraft(draft) {
    const text = draft.content || draft.draft_content || JSON.stringify(draft, null, 2)
    navigator.clipboard.writeText(text)
    setCopied(draft.id)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleSaveEdit(draftId) {
    setSavingEdit(true)
    try {
      await clubIntelligenceService.updateGrantDraft(clubId, draftId, { content: editContent })
      setDrafts(prev => prev.map(d => d.id === draftId ? { ...d, content: editContent, draft_content: editContent } : d))
      setEditingId(null)
      toast.success('Draft updated')
    } catch (err) {
      toast.error('Failed to save changes')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-navy-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-600/10 text-emerald-400">
            <Landmark className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Grant Helper</h2>
            <p className="text-xs text-navy-400">AI-assisted grant and funding applications</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          New Draft
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* New grant form */}
        {showForm && (
          <form onSubmit={handleGenerate} className="border border-navy-800 rounded-lg p-4 space-y-4">
            <div>
              <label className="block text-xs text-navy-400 mb-1">Grant Type</label>
              <select
                value={form.grant_type}
                onChange={e => setForm(f => ({ ...f, grant_type: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              >
                {GRANT_TYPES.map(gt => (
                  <option key={gt.value} value={gt.value}>{gt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">What do you need funding for? *</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent resize-none"
                placeholder="e.g. We need to resurface our main training pitch which is used by 8 youth teams..."
                required
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Estimated Cost</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
                <input
                  type="number"
                  value={form.estimated_cost}
                  onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value }))}
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-navy-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={generating}
                className="flex items-center gap-1.5 px-4 py-2 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {generating ? 'Generating...' : 'Generate Draft'}
              </button>
            </div>
          </form>
        )}

        {/* Saved drafts */}
        {loadingDrafts ? (
          <div className="flex items-center justify-center py-8">
            <div className="spinner w-6 h-6" />
          </div>
        ) : drafts.length === 0 && !showForm ? (
          <div className="text-center py-8">
            <Landmark className="w-10 h-10 text-navy-600 mx-auto mb-3" />
            <p className="text-sm text-navy-400">
              No grant drafts yet. Click "New Draft" to generate an AI-assisted grant application using your club's data.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {drafts.map(draft => {
              const content = draft.content || draft.draft_content || ''
              const isExpanded = expandedDraft === draft.id
              const isEditing = editingId === draft.id
              const grantLabel = GRANT_TYPES.find(g => g.value === draft.grant_type)?.label || draft.grant_type

              return (
                <div key={draft.id} className="border border-navy-800 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedDraft(isExpanded ? null : draft.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-navy-800/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white truncate">
                          {draft.title || grantLabel}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                          {grantLabel}
                        </span>
                      </div>
                      <p className="text-xs text-navy-500 mt-0.5">
                        {draft.created_at && new Date(draft.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                        {draft.estimated_cost && ` · Est. cost: \u00A3${Number(draft.estimated_cost).toLocaleString()}`}
                      </p>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-navy-400 shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-navy-400 shrink-0" />
                    }
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-navy-800">
                      {isEditing ? (
                        <div className="mt-3 space-y-3">
                          <textarea
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            rows={12}
                            className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent resize-y font-mono"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setEditingId(null)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-navy-400 hover:text-white rounded-lg text-xs transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEdit(draft.id)}
                              disabled={savingEdit}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-white rounded-lg text-xs transition-colors"
                            >
                              {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                              {savingEdit ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3">
                          <p className="text-sm text-navy-300 whitespace-pre-wrap leading-relaxed">
                            {content}
                          </p>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => handleCopyDraft(draft)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-navy-300 hover:text-white rounded-lg text-xs transition-colors"
                            >
                              {copied === draft.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copied === draft.id ? 'Copied' : 'Copy to clipboard'}
                            </button>
                            <button
                              onClick={() => { setEditingId(draft.id); setEditContent(content) }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-navy-300 hover:text-white rounded-lg text-xs transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   Compliance Analysis Section
   ============================================================ */
function ComplianceAnalysisSection({ clubId }) {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (clubId) loadAnalysis()
  }, [clubId])

  async function loadAnalysis() {
    try {
      const res = await clubIntelligenceService.getLatestComplianceAnalysis(clubId)
      setAnalysis(res.data.analysis || res.data)
    } catch {
      // No analysis yet
    } finally {
      setLoading(false)
    }
  }

  async function handleRun() {
    setRunning(true)
    try {
      const res = await clubIntelligenceService.runComplianceAnalysis(clubId)
      setAnalysis(res.data.analysis || res.data)
      setExpanded(true)
      toast.success('Compliance analysis complete')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to run compliance analysis')
    } finally {
      setRunning(false)
    }
  }

  const gaps = analysis?.gaps || []
  const recommendations = analysis?.recommendations || []

  return (
    <div className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-navy-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-600/10 text-amber-400">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Compliance Analysis</h2>
            <p className="text-xs text-navy-400">AI-powered review of your compliance status</p>
          </div>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="flex items-center gap-1.5 px-3 py-2 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
        >
          {running ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {running ? 'Analysing...' : analysis ? 'Re-run Analysis' : 'Run AI Analysis'}
        </button>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="spinner w-6 h-6" />
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            {analysis.generated_at && (
              <p className="text-xs text-navy-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last analysed {new Date(analysis.generated_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}

            {/* Overall score/status */}
            {analysis.score !== undefined && (
              <div className="flex items-center gap-3 p-3 bg-navy-800/50 rounded-lg">
                <div className={`text-2xl font-bold ${
                  analysis.score >= 80 ? 'text-pitch-400' :
                  analysis.score >= 50 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {analysis.score}%
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Compliance Score</p>
                  <p className="text-xs text-navy-400">
                    {analysis.score >= 80 ? 'Good standing' :
                     analysis.score >= 50 ? 'Needs attention' : 'Action required'}
                  </p>
                </div>
              </div>
            )}

            {/* Summary */}
            {analysis.summary && (
              <p className="text-sm text-navy-300 leading-relaxed">{analysis.summary}</p>
            )}

            {/* Content (if flat string) */}
            {analysis.content && !analysis.summary && (
              <div className="text-sm text-navy-300 whitespace-pre-wrap leading-relaxed">
                {expanded || analysis.content.length <= 300
                  ? analysis.content
                  : analysis.content.slice(0, 300) + '...'}
                {analysis.content.length > 300 && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-pitch-400 hover:text-pitch-300 text-xs ml-1"
                  >
                    {expanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}

            {/* Gaps */}
            {gaps.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-white">Compliance Gaps</h3>
                {gaps.map((gap, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-white font-medium">{gap.title || gap}</p>
                      {gap.description && (
                        <p className="text-xs text-navy-400 mt-0.5">{gap.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-white">Recommendations</h3>
                {recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-pitch-600/5 border border-pitch-500/20 rounded-lg">
                    <Check className="w-4 h-4 text-pitch-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-navy-300">{rec.text || rec}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <ShieldCheck className="w-10 h-10 text-navy-600 mx-auto mb-3" />
            <p className="text-sm text-navy-400">
              No compliance analysis yet. Click "Run AI Analysis" to get an intelligent review of your club's compliance status including DBS, safeguarding, and training gaps.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   Coach Development Section
   ============================================================ */
function CoachDevelopmentSection({ clubId, members }) {
  const [selectedCoach, setSelectedCoach] = useState('')
  const [suggestions, setSuggestions] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleLoadSuggestions(userId) {
    if (!userId) {
      setSuggestions(null)
      return
    }
    setSelectedCoach(userId)
    setLoading(true)
    try {
      const res = await clubIntelligenceService.getCoachSuggestions(clubId, userId)
      const data = res.data
      // Backend returns { suggestions: "AI text string", coach: {...} }
      // Normalize so the UI can render it as content
      if (typeof data.suggestions === 'string') {
        setSuggestions({ content: data.suggestions, coach: data.coach })
      } else {
        setSuggestions(data)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load development suggestions')
      setSuggestions(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-navy-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-600/10 text-purple-400">
            <GraduationCap className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Coach Development</h2>
            <p className="text-xs text-navy-400">AI-suggested development pathways for your coaches</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <label className="block text-xs text-navy-400 mb-1">Select a coach</label>
          <select
            value={selectedCoach}
            onChange={e => handleLoadSuggestions(e.target.value)}
            className="w-full sm:w-72 bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
          >
            <option value="">Choose a coach...</option>
            {members.map(m => (
              <option key={m.user_id || m.id} value={m.user_id || m.id}>
                {m.user_name || m.name} ({m.role})
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="spinner w-6 h-6" />
          </div>
        ) : suggestions ? (
          <div className="space-y-4">
            {suggestions.summary && (
              <p className="text-sm text-navy-300 leading-relaxed">{suggestions.summary}</p>
            )}

            {/* Content (flat string) */}
            {suggestions.content && !suggestions.summary && (
              <p className="text-sm text-navy-300 whitespace-pre-wrap leading-relaxed">{suggestions.content}</p>
            )}

            {/* Structured suggestions */}
            {suggestions.suggestions && suggestions.suggestions.length > 0 && (
              <div className="space-y-2">
                {suggestions.suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-navy-800/50 border border-navy-800 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-purple-400">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{s.title || s}</p>
                      {s.description && (
                        <p className="text-xs text-navy-400 mt-1">{s.description}</p>
                      )}
                      {s.resource && (
                        <p className="text-xs text-pitch-400 mt-1">{s.resource}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Qualifications */}
            {suggestions.qualifications && suggestions.qualifications.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-white">Recommended Qualifications</h3>
                {suggestions.qualifications.map((q, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-navy-800/50 border border-navy-800 rounded-lg">
                    <GraduationCap className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-white">{q.name || q}</p>
                      {q.reason && <p className="text-xs text-navy-400 mt-0.5">{q.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : selectedCoach ? (
          <div className="text-center py-8">
            <GraduationCap className="w-10 h-10 text-navy-600 mx-auto mb-3" />
            <p className="text-sm text-navy-400">No development suggestions available for this coach.</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <GraduationCap className="w-10 h-10 text-navy-600 mx-auto mb-3" />
            <p className="text-sm text-navy-400">
              Select a coach from the dropdown to see AI-generated development suggestions based on their experience and your club's needs.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
