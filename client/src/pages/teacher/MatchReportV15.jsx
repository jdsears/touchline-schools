import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { teamService } from '../../services/api'
import { FileText, Sparkles, Edit2, Save, Loader2, Trophy, Star, RefreshCw } from 'lucide-react'
import MatchHeader from '../../components/MatchHeader'
import TabStrip from '../../components/TabStrip'
import toast from 'react-hot-toast'

const MATCH_TABS = [
  { id: 'overview', label: 'Overview', href: '' },
  { id: 'squad', label: 'Squad', href: '/squad' },
  { id: 'prep', label: 'Match Prep', href: '/prep' },
  { id: 'report', label: 'Report', href: '/report' },
  { id: 'video', label: 'Video', href: '/video' },
]

export default function MatchReportV15() {
  const { id } = useParams()
  const [match, setMatch] = useState(null)
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [teamNotes, setTeamNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [report, setReport] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [editingReport, setEditingReport] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [goals, setGoals] = useState([])

  useEffect(() => {
    if (!id) return
    Promise.all([
      teamService.getMatch(id),
    ]).then(async ([matchRes]) => {
      const m = matchRes.data
      setMatch(m)
      setTeamNotes(m.team_notes || '')
      setReport(m.report || null)
      if (m.team_id) {
        const t = await teamService.getTeam(m.team_id)
        setTeam(t.data)
      }
      teamService.getMatchGoals(id).then(r => setGoals(r.data || [])).catch(() => {})
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  async function saveNotes() {
    setSavingNotes(true)
    try {
      await teamService.updateMatch(id, { notes: teamNotes })
      setEditingNotes(false)
      toast.success('Notes saved')
    } catch { toast.error('Failed to save') }
    finally { setSavingNotes(false) }
  }

  async function generateReport() {
    setGenerating(true)
    try {
      const res = await teamService.generateMatchReport(id)
      setReport(res.data.report || res.data)
      toast.success('Match report generated')
    } catch { toast.error('Failed to generate report') }
    finally { setGenerating(false) }
  }

  async function saveReport() {
    try {
      await teamService.updateMatchReport(id, editedContent)
      setReport(prev => ({ ...prev, generated: editedContent }))
      setEditingReport(false)
      toast.success('Report saved')
    } catch { toast.error('Failed to save') }
  }

  async function setPOTM(pupilId) {
    try {
      await teamService.setPlayerOfMatch(id, pupilId, '')
      const res = await teamService.getMatch(id)
      setMatch(res.data)
      toast.success('Player of the match set')
    } catch { toast.error('Failed to set') }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-tertiary)' }} /></div>
  if (!match) return <div className="text-center py-20 text-[14px]" style={{ color: 'var(--text-tertiary)' }}>Match not found</div>

  const hasResult = match.score_for != null && match.score_against != null
  const reportText = typeof report?.generated === 'string' ? report.generated : report?.generated?.summary || ''

  return (
    <div className="max-w-[1100px] mx-auto px-7 py-6">
      <MatchHeader match={match} team={team} />
      <div className="mb-5 sticky top-0 z-10 py-2" style={{ background: 'var(--surface-page)' }}>
        <TabStrip tabs={MATCH_TABS} basePath={`/teacher/match/${id}`} />
      </div>

      <div className="max-w-[760px] space-y-5">
        {/* Team performance notes */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Team performance notes</h2>
            {!editingNotes && (
              <button onClick={() => setEditingNotes(true)} className="inline-flex items-center gap-1 text-[12px] font-semibold"
                style={{ color: 'var(--brand-primary)' }}>
                <Edit2 size={12} /> {teamNotes ? 'Edit' : 'Add notes'}
              </button>
            )}
          </div>
          {editingNotes ? (
            <div className="space-y-3">
              <textarea value={teamNotes} onChange={e => setTeamNotes(e.target.value)} rows={5}
                placeholder="How did the team perform? Note strengths, areas to improve, tactical observations..."
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] p-3 text-[14px] resize-none"
                style={{ background: 'var(--surface-card)', color: 'var(--text-primary)' }} />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setTeamNotes(match.team_notes || ''); setEditingNotes(false) }}
                  className="px-3 py-[6px] rounded-[var(--radius-md)] text-[12px] font-semibold"
                  style={{ color: 'var(--text-secondary)' }}>Cancel</button>
                <button onClick={saveNotes} disabled={savingNotes}
                  className="inline-flex items-center gap-1 px-3 py-[6px] rounded-[var(--radius-md)] text-[12px] font-semibold"
                  style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)' }}>
                  {savingNotes ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                </button>
              </div>
            </div>
          ) : teamNotes ? (
            <p className="text-[14px] leading-[1.6] whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{teamNotes}</p>
          ) : (
            <div className="py-6 text-center" style={{ border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-md)' }}>
              <FileText size={24} className="mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Add notes about the team's performance to help personalise pupil feedback.</p>
            </div>
          )}
        </div>

        {/* Scorers */}
        {goals.length > 0 && (
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] p-5">
            <h2 className="text-[15px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Match events</h2>
            {goals.map((g, i) => (
              <div key={i} className="flex items-center gap-3 py-2" style={{ borderBottom: i < goals.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <span className="text-[12px] font-mono tabular-nums" style={{ color: 'var(--text-tertiary)' }}>{g.minute ? `${g.minute}'` : '--'}</span>
                <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{g.scorer_name || g.player_name || 'Unknown'}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--status-success-tint)', color: 'var(--status-success)' }}>Goal</span>
              </div>
            ))}
          </div>
        )}

        {/* Player of the Match */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] p-5">
          <h2 className="text-[15px] font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Star size={16} style={{ color: 'var(--brand-accent)' }} /> Player of the match
          </h2>
          {match.player_of_match_id ? (
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{ background: 'var(--brand-accent-tint)', color: 'var(--brand-primary)' }}>
                <Trophy size={14} />
              </span>
              <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {match.player_of_match_name || 'Selected'}
              </span>
            </div>
          ) : (
            <p className="text-[13px] italic" style={{ color: 'var(--text-tertiary)' }}>Not yet selected</p>
          )}
        </div>

        {/* AI Match Report */}
        {hasResult && (
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-[3px]" style={{ background: 'var(--brand-accent)' }} />
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Match report</h2>
                  <span className="text-[9.5px] font-bold px-1.5 py-px rounded-full"
                    style={{ background: 'var(--brand-primary)', color: 'var(--brand-accent)' }}>AI</span>
                </div>
                <div className="flex gap-2">
                  {reportText && !editingReport && (
                    <button onClick={() => { setEditedContent(reportText); setEditingReport(true) }}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: 'var(--brand-primary)' }}>
                      <Edit2 size={12} /> Edit
                    </button>
                  )}
                  <button onClick={generateReport} disabled={generating}
                    className="inline-flex items-center gap-1 px-3 py-[5px] rounded-[var(--radius-md)] text-[12px] font-semibold"
                    style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)' }}>
                    {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {reportText ? 'Regenerate' : 'Generate report'}
                  </button>
                </div>
              </div>

              {editingReport ? (
                <div className="space-y-3">
                  <textarea value={editedContent} onChange={e => setEditedContent(e.target.value)} rows={8}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] p-3 text-[14px] resize-none"
                    style={{ background: 'var(--surface-card)', color: 'var(--text-primary)' }} />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingReport(false)} className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
                    <button onClick={saveReport} className="inline-flex items-center gap-1 px-3 py-[5px] rounded-[var(--radius-md)] text-[12px] font-semibold"
                      style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)' }}>
                      <Save size={12} /> Save
                    </button>
                  </div>
                </div>
              ) : reportText ? (
                <p className="text-[14px] leading-[1.6] whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>{reportText}</p>
              ) : (
                <div className="py-6 text-center">
                  <Sparkles size={24} className="mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
                  <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Generate an AI match report from the team notes, scorers, and match data.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!hasResult && (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] p-8 text-center" style={{ background: 'var(--surface-sunken)' }}>
            <FileText size={32} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
            <h3 className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No result recorded</h3>
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Enter the match result on the Overview tab to unlock the match report.</p>
          </div>
        )}
      </div>
    </div>
  )
}
