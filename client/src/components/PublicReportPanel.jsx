import { useState } from 'react'
import { teamService } from '../services/api'
import { FileText, Sparkles, Send, Edit2, Loader2, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PublicReportPanel({ matchId, reportText, reportStatus }) {
  const [text, setText] = useState(reportText || '')
  const [status, setStatus] = useState(reportStatus || 'none')
  const [generating, setGenerating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  async function generate() {
    setGenerating(true)
    try {
      const res = await teamService.generatePublicReport(matchId)
      setText(res.data.text)
      setStatus('draft')
      toast.success('Match report drafted by AI - review before publishing')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate report')
    } finally { setGenerating(false) }
  }

  async function saveEdit() {
    setSaving(true)
    try {
      await teamService.updatePublicReport(matchId, text)
      setEditing(false)
      toast.success('Report updated')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  async function togglePublish() {
    const newPublish = status !== 'published'
    try {
      await teamService.publishPublicReport(matchId, newPublish)
      setStatus(newPublish ? 'published' : 'draft')
      toast.success(newPublish ? 'Report published to public site' : 'Report unpublished')
    } catch { toast.error('Failed to update') }
  }

  if (status === 'none' && !text) {
    return (
      <button onClick={generate} disabled={generating}
        className="w-full py-3 border border-dashed border-border-strong rounded-xl text-sm text-secondary hover:text-primary hover:border-navy-500 transition-colors flex items-center justify-center gap-2">
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {generating ? 'Drafting match report...' : 'Generate AI Match Report'}
      </button>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-primary flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-400" /> Public Match Report
          {status === 'draft' && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">Draft</span>}
          {status === 'published' && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Published</span>}
        </h3>
        <div className="flex gap-1.5">
          {!editing && (
            <>
              <button onClick={() => setEditing(true)} className="p-1.5 text-secondary hover:text-primary" title="Edit"><Edit2 className="w-4 h-4" /></button>
              <button onClick={generate} disabled={generating} className="p-1.5 text-secondary hover:text-purple-400" title="Regenerate">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </button>
              <button onClick={togglePublish}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs ${status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-pitch-600 text-on-dark hover:bg-pitch-500'}`}>
                {status === 'published' ? <><X className="w-3 h-3" /> Unpublish</> : <><Send className="w-3 h-3" /> Publish</>}
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={8}
            className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-sm text-primary resize-none" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-secondary">Cancel</button>
            <button onClick={saveEdit} disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-primary rounded-lg text-xs">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-secondary leading-relaxed whitespace-pre-line">{text}</p>
      )}
    </div>
  )
}
