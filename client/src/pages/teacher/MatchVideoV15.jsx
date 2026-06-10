import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { teamService } from '../../services/api'
import { Video, Upload, Loader2, Play, Trash2, Clock } from 'lucide-react'
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

export default function MatchVideoV15() {
  const { id } = useParams()
  const [match, setMatch] = useState(null)
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!id) return
    teamService.getMatch(id)
      .then(async res => {
        setMatch(res.data)
        if (res.data.team_id) {
          const t = await teamService.getTeam(res.data.team_id)
          setTeam(t.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska']
    if (!allowed.includes(file.type)) { toast.error('Unsupported video format'); return }
    if (file.size > 200 * 1024 * 1024) { toast.error('Video must be under 200MB'); return }

    setUploading(true)
    setProgress(0)
    const formData = new FormData()
    formData.append('video', file)

    try {
      const token = localStorage.getItem('fam_token')
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = (evt) => { if (evt.lengthComputable) setProgress(Math.round(evt.loaded / evt.total * 100)) }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          toast.success('Video uploaded')
          teamService.getMatch(id).then(r => setMatch(r.data))
        } else { toast.error('Upload failed') }
        setUploading(false)
      }
      xhr.onerror = () => { toast.error('Upload failed'); setUploading(false) }
      xhr.open('POST', `/api/matches/${id}/video`)
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.send(formData)
    } catch { toast.error('Upload failed'); setUploading(false) }
    e.target.value = ''
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-tertiary)' }} /></div>
  if (!match) return <div className="text-center py-20 text-[14px]" style={{ color: 'var(--text-tertiary)' }}>Match not found</div>

  const hasVideo = match.video_url || match.veo_link

  return (
    <div className="max-w-[1100px] mx-auto px-7 py-6">
      <MatchHeader match={match} team={team} />
      <div className="mb-5 sticky top-0 z-10 py-2" style={{ background: 'var(--surface-page)' }}>
        <TabStrip tabs={MATCH_TABS} basePath={`/teacher/match/${id}`} />
      </div>

      <div className="max-w-[700px]">
        {hasVideo ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] overflow-hidden">
            {match.video_url && (
              <video src={match.video_url} controls className="w-full" style={{ maxHeight: 400, background: '#000' }} />
            )}
            {match.veo_link && !match.video_url && (
              <div className="p-6 text-center">
                <a href={match.veo_link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-[14px] font-semibold"
                  style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)' }}>
                  <Play size={16} /> Watch on Veo
                </a>
              </div>
            )}
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                {match.video_url ? 'Uploaded video' : 'Veo recording'}
              </span>
              <label className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-[var(--radius-md)] text-[12px] font-semibold cursor-pointer"
                style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                <Upload size={12} /> Replace
                <input type="file" accept="video/*" onChange={handleUpload} className="sr-only" />
              </label>
            </div>
          </div>
        ) : (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] p-12 text-center"
            style={{ background: 'var(--surface-sunken)' }}>
            <Video size={32} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
            <h3 className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No video yet</h3>
            <p className="text-[13px] mb-4" style={{ color: 'var(--text-secondary)' }}>
              Upload a match recording or clip to review with your team.
            </p>
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-48 h-[6px] rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--brand-primary)' }} />
                </div>
                <span className="text-[12px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{progress}%</span>
              </div>
            ) : (
              <label className="inline-flex items-center gap-2 px-4 py-[8px] rounded-[var(--radius-md)] text-[13px] font-semibold cursor-pointer"
                style={{ background: 'var(--brand-primary)', color: 'var(--on-brand-primary)' }}>
                <Upload size={14} /> Upload video
                <input type="file" accept="video/*" onChange={handleUpload} className="sr-only" />
              </label>
            )}
            <p className="text-[11px] mt-3" style={{ color: 'var(--text-tertiary)' }}>MP4, MOV, AVI, WebM. Max 200MB.</p>
          </div>
        )}
      </div>
    </div>
  )
}
