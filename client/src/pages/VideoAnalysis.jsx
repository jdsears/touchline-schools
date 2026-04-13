import '@mux/mux-pupil'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Video,
  Play,
  Sparkles,
  Loader2,
  ExternalLink,
  Scissors,
  Plus,
  X,
  Trash2,
  ChevronRight,
  Target,
  Users,
  Zap,
  AlertCircle,
  CheckCircle,
  FileText,
  Tag,
  Upload,
  Link as LinkIcon,
  Clock,
  RefreshCw,
  Crown,
  Pencil,
  Save,
  Undo2,
  Square,
} from 'lucide-react'
import { teamService, videoService } from '../services/api'
import { purchaseVideoCredits, confirmVideoCredits } from '../services/billing'
import { useTeam } from '../context/TeamContext'
import toast from 'react-hot-toast'
import AIMarkdown from '../components/AIMarkdown'
import VideoUpload from '../components/VideoUpload'

const clipCategories = [
  { value: 'general', label: 'General', color: 'navy' },
  { value: 'highlight', label: 'Highlight', color: 'pitch' },
  { value: 'coaching_point', label: 'Coaching Point', color: 'energy' },
  { value: 'set_piece', label: 'Set Piece', color: 'alert' },
  { value: 'goal', label: 'Goal', color: 'pitch' },
  { value: 'mistake', label: 'Learning Moment', color: 'caution' },
]

function formatTime(seconds) {
  if (!seconds && seconds !== 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VideoAnalysis() {
  const { id, videoId: videoIdParam } = useParams()
  const { team, pupils } = useTeam()

  const [match, setMatch] = useState(null)
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)

  const [videoMode, setVideoMode] = useState('upload')
  const [showUploader, setShowUploader] = useState(false)
  const [veoUrl, setVeoUrl] = useState('')
  const [savingUrl, setSavingUrl] = useState(false)

  // Analysis
  const [analysing, setAnalysing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState('')
  const [analyses, setAnalyses] = useState([])
  const analysesRef = useRef([])
  const [approving, setApproving] = useState(false)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [showCreditPurchase, setShowCreditPurchase] = useState(false)
  const [purchasingCredits, setPurchasingCredits] = useState(false)
  const [includeRatings, setIncludeRatings] = useState(false)
  const [analysisDepth, setAnalysisDepth] = useState('standard')
  const [processingAnalysisId, setProcessingAnalysisId] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [analysisError, setAnalysisError] = useState(null)

  // Editing analysis before approving
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState(null)
  const [savingEdits, setSavingEdits] = useState(false)

  // Clips
  const [clips, setClips] = useState([])
  const [showClipModal, setShowClipModal] = useState(false)
  const [newClip, setNewClip] = useState({
    title: '', description: '', clipType: 'general', pupils: [],
  })
  const [clipStart, setClipStart] = useState(null)
  const [clipEnd, setClipEnd] = useState(null)
  const [savingClip, setSavingClip] = useState(false)

  const [activeTab, setActiveTab] = useState('video')
  const [teamColour, setTeamColour] = useState(team?.kit_colour || '')

  // Mux pupil ref
  const playerRef = useRef(null)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => { analysesRef.current = analyses }, [analyses])

  useEffect(() => {
    loadData()
  }, [id, videoIdParam])

  // Listen for timeupdate on mux-pupil
  useEffect(() => {
    const el = playerRef.current
    if (!el) return
    const handler = () => setCurrentTime(el.currentTime || 0)
    el.addEventListener('timeupdate', handler)
    return () => el.removeEventListener('timeupdate', handler)
  }, [video?.mux_playback_id])

  async function loadData() {
    setLoading(true)
    try {
      if (videoIdParam) {
        // Direct video route: /videos/:videoId/analysis
        const videoRes = await videoService.getVideo(videoIdParam)
        const v = videoRes.data?.video || videoRes.data
        setVideo(v)
        setClips(videoRes.data?.clips || [])
        setVideoMode('upload')

        const analysisRes = await videoService.getAnalysis(videoIdParam)
        const allAnalyses = analysisRes.data?.analyses || []
        setAnalyses(allAnalyses.filter(a => a.status === 'complete' || !a.status))

        // Show error if the most recent analysis failed (so user knows what happened)
        const mostRecent = allAnalyses[0]
        if (mostRecent?.status === 'failed') {
          setAnalysisError(mostRecent.error || 'Analysis failed — please try again')
        } else {
          setAnalysisError(null)
        }

        // Resume progress tracking if an analysis is in progress (but not stale)
        const inProgress = allAnalyses.find(a => a.status === 'processing')
        if (inProgress) {
          const createdAt = new Date(inProgress.created_at || inProgress.updated_at)
          const ageMinutes = (Date.now() - createdAt.getTime()) / 60000
          if (ageMinutes < 45) {
            setAnalysing(true)
            setAnalysisProgress(inProgress.progress || 'Analysing...')
          }
          // Stale processing records (>60 min) are ignored — backend will clean them up
        }

        // Load match context if video is linked to a match
        if (v.match_id) {
          try {
            const matchRes = await teamService.getMatch(v.match_id)
            setMatch(matchRes.data)
            if (matchRes.data.veo_link) setVeoUrl(matchRes.data.veo_link)
          } catch {}
        }
      } else if (id) {
        // Match route: /matches/:id/analysis
        const matchRes = await teamService.getMatch(id)
        setMatch(matchRes.data)

        if (matchRes.data.veo_link) {
          setVeoUrl(matchRes.data.veo_link)
          setVideoMode('link')
        }

        if (matchRes.data.video_id) {
          try {
            const videoRes = await videoService.getVideo(matchRes.data.video_id)
            const v = videoRes.data?.video || videoRes.data
            setVideo(v)
            setClips(videoRes.data?.clips || [])
            setVideoMode('upload')

            const analysisRes = await videoService.getAnalysis(matchRes.data.video_id)
            const matchAnalyses = analysisRes.data?.analyses || []
            setAnalyses(matchAnalyses.filter(a => a.status === 'complete' || !a.status))

            // Show error if the most recent analysis failed
            const mostRecentMatch = matchAnalyses[0]
            if (mostRecentMatch?.status === 'failed') {
              setAnalysisError(mostRecentMatch.error || 'Analysis failed — please try again')
            } else {
              setAnalysisError(null)
            }

            // Resume progress tracking if an analysis is in progress (but not stale)
            const inProgress = matchAnalyses.find(a => a.status === 'processing')
            if (inProgress) {
              const createdAt = new Date(inProgress.created_at || inProgress.updated_at)
              const ageMinutes = (Date.now() - createdAt.getTime()) / 60000
              if (ageMinutes < 45) {
                setAnalysing(true)
                setAnalysisProgress(inProgress.progress || 'Analysing...')
              }
            }
          } catch {
            // Video may not exist
          }
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  function handleUploadComplete(uploadedVideo) {
    setVideo(uploadedVideo)
    setShowUploader(false)
    setMatch(prev => ({ ...prev, video_id: uploadedVideo.id }))
  }

  // Resume polling if page loaded with in-progress analysis
  useEffect(() => {
    if (!analysing || !video?.id) return
    const pollStarted = Date.now()
    let lastProgress = ''
    let lastProgressChange = Date.now()
    // Deep analysis processes 480 frames in 24 batches — needs much longer timeouts
    const isDeep = analysisDepth === 'deep'
    const stuckTimeout = isDeep ? 20 : 12  // minutes without progress change
    const totalTimeout = isDeep ? 50 : 30  // minutes total polling time
    const pollInterval = setInterval(async () => {
      try {
        const res = await videoService.getAnalysis(video.id)
        const all = res.data?.analyses || []
        const processing = all.find(a => a.status === 'processing')
        if (processing) {
          setProcessingAnalysisId(processing.id)
          if (processing.progress) {
            if (processing.progress !== lastProgress) {
              lastProgress = processing.progress
              lastProgressChange = Date.now()
            }
            setAnalysisProgress(processing.progress)
          }
        }

        // Handle cancelled analysis
        const mostRecent = all[0] // already ordered by created_at DESC from server
        if (mostRecent?.status === 'cancelled') {
          clearInterval(pollInterval)
          setAnalysing(false)
          setAnalysisProgress('')
          setProcessingAnalysisId(null)
          setCancelling(false)
          toast('Analysis stopped', { icon: '🛑' })
          setAnalyses(all.filter(a => a.status === 'complete' || !a.status))
          return
        }

        // Timeout: if no progress change for stuckTimeout, or polling for totalTimeout, give up
        const stuckMinutes = (Date.now() - lastProgressChange) / 60000
        const totalMinutes = (Date.now() - pollStarted) / 60000
        if (stuckMinutes > stuckTimeout || totalMinutes > totalTimeout) {
          clearInterval(pollInterval)
          setAnalysing(false)
          setAnalysisProgress('')
          setProcessingAnalysisId(null)
          setAnalysisError('Analysis appears to have stalled — please try again')
          toast.error('Analysis appears to have stalled — please try again')
          setAnalyses(all.filter(a => a.status === 'complete' || !a.status))
          return
        }

        // Only treat the most recent record as a failure indicator
        if (mostRecent?.status === 'failed') {
          clearInterval(pollInterval)
          setAnalysing(false)
          setAnalysisProgress('')
          setProcessingAnalysisId(null)
          const errorMsg = mostRecent.error || 'Analysis failed — please try again'
          setAnalysisError(errorMsg)
          toast.error(errorMsg)
          setAnalyses(all.filter(a => a.status !== 'failed'))
          return
        }
        const completed = all.filter(a => a.status === 'complete' || !a.status)
        if (completed.length > analysesRef.current.length) {
          setAnalyses(completed)
          clearInterval(pollInterval)
          setAnalysing(false)
          setAnalysisProgress('')
          setProcessingAnalysisId(null)
          setActiveTab('analysis')
          toast.success('Analysis complete!')
        }
      } catch {}
    }, 3000)
    return () => clearInterval(pollInterval)
  }, [analysing, video?.id, analysisDepth])

  function getVeoEmbedUrl(url) {
    if (!url) return ''
    if (url.includes('embed')) return url
    if (url.includes('app.veo.co/matches/')) {
      const matchId = url.split('/matches/')[1]?.split('/')[0]?.split('?')[0]
      return `https://app.veo.co/embed/matches/${matchId}`
    }
    return url
  }

  async function handleSaveUrl() {
    if (!veoUrl) return
    setSavingUrl(true)
    try {
      await teamService.updateMatch(id, { veoLink: veoUrl })
      setMatch(prev => ({ ...prev, veo_link: veoUrl }))
      toast.success('Video link saved!')
    } catch {
      toast.error('Failed to save video link')
    }
    setSavingUrl(false)
  }

  const hasVideo = video?.mux_playback_id || veoUrl

  async function handleAnalyse() {
    if (!video?.id || !video.mux_playback_id) {
      toast.error('Please upload a video first for AI analysis')
      return
    }

    setAnalysing(true)
    setProcessingAnalysisId(null)
    setCancelling(false)
    setAnalysisError(null)
    setAnalysisProgress(analysisDepth === 'deep' ? 'Starting deep analysis...' : 'Starting analysis...')
    try {
      await videoService.analyseVideo(video.id, { analysisType: 'full_match', teamColour: teamColour || undefined, depth: analysisDepth })
      // Polling is handled by the useEffect that watches `analysing` state
    } catch (error) {
      if (error.response?.data?.code === 'TIER_UPGRADE_REQUIRED') {
        setShowUpgradePrompt(true)
      } else if (error.response?.status === 429 && error.response?.data?.canPurchase) {
        setShowCreditPurchase(true)
      } else if (error.response?.status === 429 && error.response?.data?.upgradeRequired) {
        toast.error(error.response.data.message)
        setAnalysisDepth('standard')
      } else {
        toast.error(error.response?.data?.message || 'Analysis failed')
      }
      setAnalysing(false)
      setAnalysisProgress('')
    }
  }

  async function handleCancelAnalysis() {
    if (!processingAnalysisId) return
    setCancelling(true)
    try {
      await videoService.cancelAnalysis(processingAnalysisId)
    } catch {
      toast.error('Failed to cancel analysis')
      setCancelling(false)
    }
  }

  async function handlePurchaseCredits(packId) {
    setPurchasingCredits(true)
    try {
      const result = await purchaseVideoCredits(packId)
      if (result.success) {
        // Dev/test mode — credits granted immediately
        toast.success(`${result.credits} analysis credit${result.credits > 1 ? 's' : ''} added!`)
        setShowCreditPurchase(false)
      } else if (result.clientSecret) {
        // Stripe mode — would need Stripe Elements confirmation
        // For now, confirm directly (in production, integrate Stripe payment sheet)
        await confirmVideoCredits(result.clientSecret, result.credits)
        toast.success(`${result.credits} analysis credit${result.credits > 1 ? 's' : ''} added!`)
        setShowCreditPurchase(false)
      }
    } catch (error) {
      if (error.response?.data?.upgradeRequired) {
        toast.error('Upgrade to a paid plan to purchase credits')
        setShowCreditPurchase(false)
        setShowUpgradePrompt(true)
      } else {
        toast.error(error.response?.data?.message || 'Purchase failed')
      }
    } finally {
      setPurchasingCredits(false)
    }
  }

  async function handleApprove(analysisId) {
    setApproving(true)
    try {
      await videoService.approveAnalysis(analysisId, { includeRatings })
      setAnalyses(prev => prev.map(a => a.id === analysisId ? { ...a, approved: true } : a))
      toast.success('Analysis approved — pupil notes saved to profiles')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve analysis')
    }
    setApproving(false)
  }

  function startEditing() {
    setEditData({
      summary: latestAnalysis.summary || '',
      observations: (latestAnalysis.observations || []).map(o => ({ ...o })),
      recommendations: (latestAnalysis.recommendations || []).map(r => ({ ...r })),
      player_feedback: (latestAnalysis.player_feedback || []).map(pf => ({ ...pf })),
    })
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setEditData(null)
  }

  function updateObservation(index, field, value) {
    setEditData(prev => ({
      ...prev,
      observations: prev.observations.map((o, i) => i === index ? { ...o, [field]: value } : o),
    }))
  }

  function removeObservation(index) {
    setEditData(prev => ({
      ...prev,
      observations: prev.observations.filter((_, i) => i !== index),
    }))
  }

  function updateRecommendation(index, field, value) {
    setEditData(prev => ({
      ...prev,
      recommendations: prev.recommendations.map((r, i) => i === index ? { ...r, [field]: value } : r),
    }))
  }

  function removeRecommendation(index) {
    setEditData(prev => ({
      ...prev,
      recommendations: prev.recommendations.filter((_, i) => i !== index),
    }))
  }

  function updatePlayerFeedback(index, field, value) {
    setEditData(prev => ({
      ...prev,
      player_feedback: prev.player_feedback.map((pf, i) => i === index ? { ...pf, [field]: field === 'rating' ? parseInt(value) || 0 : value } : pf),
    }))
  }

  function removePlayerFeedback(index) {
    setEditData(prev => ({
      ...prev,
      player_feedback: prev.player_feedback.filter((_, i) => i !== index),
    }))
  }

  async function saveEdits() {
    setSavingEdits(true)
    try {
      await videoService.updateAnalysis(latestAnalysis.id, editData)
      setAnalyses(prev => prev.map(a => a.id === latestAnalysis.id ? { ...a, ...editData } : a))
      setEditing(false)
      setEditData(null)
      toast.success('Analysis updated')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save edits')
    }
    setSavingEdits(false)
  }

  function getCurrentTime() {
    return playerRef.current?.currentTime || 0
  }

  function markClipStart() {
    setClipStart(getCurrentTime())
  }

  function markClipEnd() {
    setClipEnd(getCurrentTime())
  }

  async function handleSaveClip(e) {
    e.preventDefault()
    if (!newClip.title || clipStart == null || clipEnd == null) {
      toast.error('Mark start and end times, and enter a title')
      return
    }

    setSavingClip(true)
    try {
      const res = await videoService.addClip(video.id, {
        title: newClip.title,
        description: newClip.description,
        startTime: clipStart,
        endTime: clipEnd,
        clipType: newClip.clipType,
        playerTags: newClip.pupils.map(pid => ({ pupilId: pid })),
      })
      setClips(prev => [...prev, { ...res.data, player_tags: newClip.pupils.map(pid => ({ pupilId: pid })) }])
      setShowClipModal(false)
      setNewClip({ title: '', description: '', clipType: 'general', pupils: [] })
      setClipStart(null)
      setClipEnd(null)
      toast.success('Clip saved!')
    } catch {
      toast.error('Failed to save clip')
    }
    setSavingClip(false)
  }

  async function handleDeleteClip(clipId) {
    try {
      await videoService.deleteClip(clipId)
      setClips(prev => prev.filter(c => c.id !== clipId))
      toast.success('Clip deleted')
    } catch {
      toast.error('Failed to delete clip')
    }
  }

  function jumpToClip(clip) {
    if (playerRef.current) {
      playerRef.current.currentTime = clip.start_time
      playerRef.current.play?.()
    }
    setActiveTab('video')
  }

  function togglePlayer(pupilId) {
    setNewClip(prev => ({
      ...prev,
      pupils: prev.pupils.includes(pupilId)
        ? prev.pupils.filter(p => p !== pupilId)
        : [...prev.pupils, pupilId]
    }))
  }

  // Recover analysis data if the summary contains unparsed JSON (backend parse failure)
  const latestAnalysis = useMemo(() => {
    const raw = analyses[0]
    if (!raw) return null

    // Check if summary contains raw JSON that wasn't properly parsed into separate fields
    const summaryLooksLikeJson = raw.summary && (
      raw.summary.includes('"summary"') || raw.summary.includes('"observations"') || raw.summary.includes('"playerFeedback"') || raw.summary.includes('"player_feedback"')
    )
    const fieldsEmpty = !raw.observations || raw.observations.length === 0

    if (summaryLooksLikeJson && fieldsEmpty) {
      // Strip markdown code fences — handle 3+ backticks, same-line or multi-line
      const cleaned = raw.summary.replace(/^`{3,}(?:json)?\s*/i, '').replace(/\s*`{3,}\s*$/i, '').trim()

      // Try full JSON parse first
      const jsonStr = cleaned.startsWith('{') ? cleaned : (cleaned.match(/\{[\s\S]*\}/) || [])[0]
      if (jsonStr) {
        try {
          const parsed = JSON.parse(jsonStr)
          return {
            ...raw,
            summary: parsed.summary || raw.summary,
            observations: parsed.observations || raw.observations || [],
            recommendations: parsed.recommendations || raw.recommendations || [],
            player_feedback: parsed.playerFeedback || parsed.player_feedback || raw.player_feedback || [],
            formations: parsed.formations || raw.formations,
          }
        } catch {
          // Try with trailing comma repair
          try {
            const repaired = jsonStr.replace(/,\s*([}\]])/g, '$1')
            const parsed = JSON.parse(repaired)
            return {
              ...raw,
              summary: parsed.summary || raw.summary,
              observations: parsed.observations || raw.observations || [],
              recommendations: parsed.recommendations || raw.recommendations || [],
              player_feedback: parsed.playerFeedback || parsed.player_feedback || raw.player_feedback || [],
              formations: parsed.formations || raw.formations,
            }
          } catch {
            // Full parse failed — extract individual fields with regex
            const result = { ...raw }

            // Extract summary text so it displays readably instead of raw JSON
            const summaryMatch = cleaned.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/s)
            if (summaryMatch) {
              result.summary = summaryMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
            }

            // Try to extract arrays
            const tryParseArray = (key) => {
              const m = cleaned.match(new RegExp(`"${key}"\\s*:\\s*(\\[[\\s\\S]*?\\])\\s*[,}]`, 's'))
              if (m) { try { return JSON.parse(m[1]) } catch {} }
              return null
            }

            result.observations = tryParseArray('observations') || raw.observations || []
            result.recommendations = tryParseArray('recommendations') || raw.recommendations || []
            result.player_feedback = tryParseArray('playerFeedback') || tryParseArray('player_feedback') || raw.player_feedback || []
            return result
          }
        }
      }
    }

    // Even if conditions above didn't trigger, check if summary starts with code fence
    if (raw.summary && /^`{3}/.test(raw.summary)) {
      const cleaned = raw.summary.replace(/^`{3,}(?:json)?\s*/i, '').replace(/\s*`{3,}\s*$/i, '').trim()
      const summaryMatch = cleaned.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/s)
      if (summaryMatch) {
        return { ...raw, summary: summaryMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') }
      }
    }

    return raw
  }, [analyses])

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-pitch-400" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <Link to={match ? `/matches/${match.id}` : '/videos'} className="inline-flex items-center gap-2 text-navy-400 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> {match ? 'Back to Match' : 'Back to Videos'}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-white mb-1">Video Analysis</h1>
          <p className="text-navy-400">
            {match?.opponent ? `vs ${match.opponent}` : video?.title || 'Review footage and get AI tactical insights'}
          </p>
        </div>
        {veoUrl && (
          <a href={veoUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            <ExternalLink className="w-4 h-4" /> Open Video Link
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: 'video', icon: Video, label: 'Video' },
          { key: 'analysis', icon: Sparkles, label: 'AI Analysis' },
          { key: 'clips', icon: Scissors, label: `Clips (${clips.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key ? 'bg-pitch-600 text-white' : 'bg-navy-800 text-navy-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Video Tab */}
        {activeTab === 'video' && (
          <motion.div key="video" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="card">
                <div className="p-4 border-b border-navy-800">
                  <h2 className="font-display font-semibold text-white">Match Video</h2>
                </div>
                <div className="p-4">
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setVideoMode('upload')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                        videoMode === 'upload' ? 'bg-pitch-600 text-white' : 'bg-navy-800 text-navy-400 hover:text-white'
                      }`}
                    >
                      <Upload className="w-4 h-4" /> Upload Video
                    </button>
                    <button
                      onClick={() => setVideoMode('link')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                        videoMode === 'link' ? 'bg-pitch-600 text-white' : 'bg-navy-800 text-navy-400 hover:text-white'
                      }`}
                    >
                      <LinkIcon className="w-4 h-4" /> Video Link
                    </button>
                  </div>

                  {videoMode === 'upload' && (
                    <>
                      {video?.mux_playback_id ? (
                        <div className="space-y-4">
                          <div className="aspect-video bg-navy-900 rounded-lg overflow-hidden">
                            <mux-pupil
                              ref={playerRef}
                              playback-id={video.mux_playback_id}
                              stream-type="on-demand"
                              style={{ width: '100%', height: '100%' }}
                              metadata={`{"video_title":"${video.title || ''}"}`}
                            />
                          </div>
                          <p className="text-xs text-navy-500 font-mono">
                            {formatTime(currentTime)} / {formatTime(video.duration_seconds)}
                          </p>
                          <button onClick={() => setShowUploader(true)} className="btn-secondary">
                            <Upload className="w-4 h-4" /> Upload New Video
                          </button>
                        </div>
                      ) : video?.status === 'processing' ? (
                        <div className="aspect-video bg-navy-800 rounded-lg flex flex-col items-center justify-center">
                          <Loader2 className="w-12 h-12 text-caution-400 animate-spin mb-4" />
                          <p className="text-white font-medium">Processing Video</p>
                          <p className="text-sm text-navy-400">Mux is transcoding — usually 1-2 minutes</p>
                        </div>
                      ) : showUploader ? (
                        <VideoUpload
                          teamId={team?.id}
                          matchId={id}
                          onUploadComplete={handleUploadComplete}
                          onCancel={() => setShowUploader(false)}
                        />
                      ) : (
                        <div className="aspect-video bg-navy-800 rounded-lg flex flex-col items-center justify-center">
                          <Upload className="w-16 h-16 text-navy-600 mb-4" />
                          <p className="text-navy-400 mb-2">No video uploaded yet</p>
                          <p className="text-sm text-navy-500 text-center max-w-xs mb-4">
                            Upload your match video for AI analysis — uploads go direct to cloud
                          </p>
                          <button onClick={() => setShowUploader(true)} className="btn-primary">
                            <Upload className="w-4 h-4" /> Upload Video
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {videoMode === 'link' && (
                    <>
                      <div className="flex gap-3 mb-4">
                        <input
                          type="url" value={veoUrl} onChange={(e) => setVeoUrl(e.target.value)}
                          placeholder="Paste video link..." className="input flex-1"
                        />
                        <button onClick={handleSaveUrl} disabled={savingUrl || !veoUrl} className="btn-primary">
                          {savingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                        </button>
                      </div>
                      {veoUrl ? (
                        <div className="aspect-video bg-navy-900 rounded-lg overflow-hidden">
                          <iframe src={getVeoEmbedUrl(veoUrl)} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen title="Match Video" />
                        </div>
                      ) : (
                        <div className="aspect-video bg-navy-800 rounded-lg flex flex-col items-center justify-center">
                          <Video className="w-16 h-16 text-navy-600 mb-4" />
                          <p className="text-navy-400">No video link added</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="card p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-pitch-500/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-pitch-400" />
                  </div>
                  <div>
                    <h2 className="font-display font-semibold text-white">AI Analysis</h2>
                    <p className="text-xs text-navy-400">Powered by The Gaffer</p>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="label mb-1.5">Our Kit Colour</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['red', 'blue', 'green', 'yellow', 'orange', 'white', 'black', 'purple', 'pink', 'navy', 'sky blue', 'maroon', 'claret'].map(colour => (
                      <button
                        key={colour}
                        onClick={() => setTeamColour(colour)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                          teamColour === colour
                            ? 'bg-pitch-500 text-white ring-2 ring-pitch-400 ring-offset-1 ring-offset-navy-900'
                            : 'bg-navy-700 text-navy-300 hover:bg-navy-600'
                        }`}
                      >
                        {colour}
                      </button>
                    ))}
                  </div>
                  {teamColour && (
                    <p className="text-xs text-pitch-400 mt-1.5">AI will focus on the <strong>{teamColour}</strong> team</p>
                  )}
                </div>

                {showCreditPurchase ? (
                  <div className="rounded-xl border border-alert-500/30 bg-alert-500/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-alert-400" />
                      <h3 className="font-display font-semibold text-white">Analysis Limit Reached</h3>
                    </div>
                    <p className="text-sm text-navy-300 mb-4">You've used all your analyses this month. Purchase additional credits to keep analysing.</p>
                    <div className="space-y-2 mb-4">
                      {[
                        { id: 'pack_3', credits: 3, price: '£3.49' },
                        { id: 'pack_5', credits: 5, price: '£4.99', badge: 'Save 20%' },
                        { id: 'pack_10', credits: 10, price: '£7.99', badge: 'Save 35%' },
                      ].map(pack => (
                        <button
                          key={pack.id}
                          onClick={() => handlePurchaseCredits(pack.id)}
                          disabled={purchasingCredits}
                          className="w-full flex items-center justify-between p-3 rounded-lg border border-navy-600 hover:border-pitch-500 bg-navy-800/50 hover:bg-navy-800 transition-colors text-left"
                        >
                          <div>
                            <span className="text-white font-medium">{pack.credits} analysis credits</span>
                            {pack.badge && <span className="ml-2 text-xs px-1.5 py-0.5 bg-pitch-500/20 text-pitch-400 rounded">{pack.badge}</span>}
                          </div>
                          <span className="text-energy-400 font-semibold">{pack.price}</span>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setShowCreditPurchase(false)} className="text-xs text-navy-500 hover:text-navy-300 w-full text-center">
                      Cancel
                    </button>
                  </div>
                ) : showUpgradePrompt ? (
                  <div className="rounded-xl border border-energy-500/30 bg-energy-500/5 p-4 text-center">
                    <Crown className="w-8 h-8 text-energy-400 mx-auto mb-2" />
                    <h3 className="font-display font-semibold text-white mb-1">Pro Feature</h3>
                    <p className="text-sm text-navy-300 mb-4">AI video analysis is available on the Grassroots Pro plan. Upgrade to get tactical breakdowns, individual pupil feedback, and training recommendations from your match footage.</p>
                    <Link to="/settings" className="btn-primary w-full inline-flex items-center justify-center gap-2">
                      <Crown className="w-4 h-4" /> Upgrade to Pro
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Analysis depth selector */}
                    <div className="mb-3">
                      <label className="text-xs font-medium text-navy-400 mb-1.5 block">Analysis Mode</label>
                      <div className="flex bg-navy-800 rounded-lg p-0.5">
                        <button
                          onClick={() => setAnalysisDepth('standard')}
                          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            analysisDepth === 'standard'
                              ? 'bg-pitch-500 text-white'
                              : 'text-navy-400 hover:text-navy-200'
                          }`}
                        >
                          Standard
                        </button>
                        <button
                          onClick={() => setAnalysisDepth('deep')}
                          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${
                            analysisDepth === 'deep'
                              ? 'bg-energy-500 text-white'
                              : 'text-navy-400 hover:text-navy-200'
                          }`}
                        >
                          <Zap className="w-3 h-3" /> Deep
                        </button>
                      </div>
                      <p className="text-xs text-navy-500 mt-1">
                        {analysisDepth === 'deep'
                          ? '4x more frames analysed for greater detail'
                          : 'Quick overview of the match'}
                      </p>
                    </div>

                    {analysing ? (
                      <div className="flex gap-2 mb-3">
                        <div className="btn-primary flex-1 cursor-default flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> {analysisProgress || 'Analysing...'}
                        </div>
                        <button
                          onClick={handleCancelAnalysis}
                          disabled={cancelling || !processingAnalysisId}
                          className="px-3 py-2 rounded-lg bg-alert-500/20 text-alert-400 hover:bg-alert-500/30 border border-alert-500/30 transition-colors disabled:opacity-50"
                          title="Stop analysis"
                        >
                          {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                        </button>
                      </div>
                    ) : (
                      <button onClick={handleAnalyse} disabled={!video?.mux_playback_id} className="btn-primary w-full mb-3">
                        <Play className="w-4 h-4" /> {latestAnalysis ? 'Re-Analyse' : 'Analyse Match'}
                      </button>
                    )}
                    <p className="text-xs text-navy-500 text-center">
                      {analysing
                        ? 'Tap the stop button to cancel'
                        : analysisDepth === 'deep' ? 'Deep analysis reviews 480 frames for comprehensive insights' : 'AI reviews key frames for tactical insights'}
                    </p>
                  </>
                )}
              </div>

              {video?.mux_playback_id && (
                <div className="card p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-energy-500/10 flex items-center justify-center">
                      <Scissors className="w-5 h-5 text-energy-400" />
                    </div>
                    <div>
                      <h2 className="font-display font-semibold text-white">Create Clip</h2>
                      <p className="text-xs text-navy-400">Mark key moments</p>
                    </div>
                  </div>
                  <button onClick={() => setShowClipModal(true)} className="btn-secondary w-full">
                    <Plus className="w-4 h-4" /> Add Clip
                  </button>
                </div>
              )}

              <div className="card p-4">
                <h3 className="font-display font-semibold text-white mb-3">What AI Analyses</h3>
                <ul className="space-y-2 text-sm text-navy-400">
                  <li className="flex items-start gap-2"><Target className="w-4 h-4 text-pitch-400 mt-0.5 shrink-0" /> Team shape and formation</li>
                  <li className="flex items-start gap-2"><Zap className="w-4 h-4 text-energy-400 mt-0.5 shrink-0" /> Key tactical moments</li>
                  <li className="flex items-start gap-2"><Users className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" /> Individual contributions</li>
                  <li className="flex items-start gap-2"><AlertCircle className="w-4 h-4 text-caution-400 mt-0.5 shrink-0" /> Areas for improvement</li>
                  <li className="flex items-start gap-2"><FileText className="w-4 h-4 text-alert-400 mt-0.5 shrink-0" /> Training recommendations</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <motion.div key="analysis" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {latestAnalysis ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="card p-6">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-navy-800">
                      <CheckCircle className="w-6 h-6 text-pitch-400" />
                      <div className="flex-1">
                        <h2 className="font-display text-lg font-semibold text-white">The Gaffer's Analysis</h2>
                        <p className="text-sm text-navy-400">
                          {latestAnalysis.frames_analysed} frames analysed{match?.opponent && ` — vs ${match.opponent}`}
                        </p>
                      </div>
                      {!latestAnalysis.approved && !editing && (
                        <button onClick={startEditing} className="btn-secondary text-sm">
                          <Pencil className="w-4 h-4" /> Edit
                        </button>
                      )}
                      {editing && (
                        <div className="flex gap-2">
                          <button onClick={cancelEditing} className="btn-secondary text-sm">
                            <Undo2 className="w-4 h-4" /> Cancel
                          </button>
                          <button onClick={saveEdits} disabled={savingEdits} className="btn-primary text-sm">
                            {savingEdits ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {savingEdits ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      )}
                    </div>

                    {editing && (
                      <div className="p-3 rounded-lg bg-energy-500/10 border border-energy-500/30 mb-6 flex items-center gap-2">
                        <Pencil className="w-4 h-4 text-energy-400 shrink-0" />
                        <p className="text-sm text-energy-300">Editing mode — adjust the AI analysis, then save your changes before approving.</p>
                      </div>
                    )}

                    {/* Summary */}
                    {editing ? (
                      <div className="mb-6">
                        <label className="label">Summary</label>
                        <textarea
                          value={editData.summary}
                          onChange={(e) => setEditData(prev => ({ ...prev, summary: e.target.value }))}
                          className="input"
                          rows={3}
                        />
                      </div>
                    ) : latestAnalysis.summary && (
                      <div className="p-4 rounded-lg bg-pitch-500/10 border border-pitch-500/30 mb-6">
                        <p className="text-white">{latestAnalysis.summary}</p>
                      </div>
                    )}

                    {/* Observations */}
                    {editing ? (
                      <div className="mb-6">
                        <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
                          <Target className="w-4 h-4 text-pitch-400" /> Observations
                        </h3>
                        <div className="space-y-3">
                          {editData.observations.map((obs, i) => (
                            <div key={i} className="p-3 bg-navy-800/50 rounded-lg border border-navy-700 space-y-2">
                              <div className="flex items-center gap-2">
                                <select
                                  value={obs.category}
                                  onChange={(e) => updateObservation(i, 'category', e.target.value)}
                                  className="input text-xs py-1 w-auto"
                                >
                                  {['formation', 'attack', 'defence', 'transition', 'set_piece'].map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                                <button onClick={() => removeObservation(i)} className="ml-auto p-1 text-navy-500 hover:text-alert-400 transition-colors" title="Remove">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <textarea
                                value={obs.observation}
                                onChange={(e) => updateObservation(i, 'observation', e.target.value)}
                                className="input text-sm"
                                rows={2}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : latestAnalysis.observations?.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
                          <Target className="w-4 h-4 text-pitch-400" /> Observations
                        </h3>
                        <div className="space-y-2">
                          {latestAnalysis.observations.map((obs, i) => (
                            <div key={i} className="p-3 bg-navy-800/50 rounded-lg flex gap-3">
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full h-fit whitespace-nowrap">{obs.category}</span>
                              <div>
                                <p className="text-sm text-navy-200">{obs.observation}</p>
                                {obs.timestamp && <p className="text-xs text-navy-500 mt-1">{obs.timestamp}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Training Recommendations */}
                    {editing ? (
                      <div className="mb-6">
                        <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-energy-400" /> Training Recommendations
                        </h3>
                        <div className="space-y-3">
                          {editData.recommendations.map((rec, i) => (
                            <div key={i} className="p-3 bg-energy-500/10 rounded-lg border border-energy-500/20 space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={rec.focus}
                                  onChange={(e) => updateRecommendation(i, 'focus', e.target.value)}
                                  className="input text-sm flex-1"
                                  placeholder="Focus area"
                                />
                                <input
                                  type="text"
                                  value={rec.duration || ''}
                                  onChange={(e) => updateRecommendation(i, 'duration', e.target.value)}
                                  className="input text-xs w-24"
                                  placeholder="Duration"
                                />
                                <button onClick={() => removeRecommendation(i)} className="p-1 text-navy-500 hover:text-alert-400 transition-colors" title="Remove">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <textarea
                                value={rec.drill}
                                onChange={(e) => updateRecommendation(i, 'drill', e.target.value)}
                                className="input text-sm"
                                rows={2}
                                placeholder="Drill description"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : latestAnalysis.recommendations?.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-energy-400" /> Training Recommendations
                        </h3>
                        <div className="space-y-2">
                          {latestAnalysis.recommendations.map((rec, i) => (
                            <div key={i} className="p-3 bg-energy-500/10 rounded-lg border border-energy-500/20">
                              <div className="flex justify-between mb-1">
                                <p className="font-medium text-sm text-white">{rec.focus}</p>
                                {rec.duration && <span className="text-xs text-navy-400">{rec.duration}</span>}
                              </div>
                              <p className="text-sm text-navy-300">{rec.drill}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pupil Notes */}
                    {editing ? (
                      <div>
                        <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-400" /> Pupil Notes
                        </h3>
                        <div className="space-y-3">
                          {editData.player_feedback.map((pf, i) => (
                            <div key={i} className="p-3 bg-navy-800/50 rounded-lg border border-navy-700 space-y-2">
                              <div className="flex items-center gap-2">
                                {pf.squad_number && (
                                  <span className="w-6 h-6 rounded-full bg-pitch-500/20 text-pitch-400 text-xs font-bold flex items-center justify-center shrink-0">
                                    {pf.squad_number}
                                  </span>
                                )}
                                <p className="font-medium text-sm text-white flex-1">{pf.name || pf.description}</p>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={pf.rating || ''}
                                    onChange={(e) => updatePlayerFeedback(i, 'rating', e.target.value)}
                                    className="input text-xs w-14 text-center py-1"
                                    placeholder="0-10"
                                  />
                                  <span className="text-xs text-navy-500">/10</span>
                                </div>
                                <button onClick={() => removePlayerFeedback(i)} className="p-1 text-navy-500 hover:text-alert-400 transition-colors" title="Remove">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <textarea
                                value={pf.feedback}
                                onChange={(e) => updatePlayerFeedback(i, 'feedback', e.target.value)}
                                className="input text-sm"
                                rows={2}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : latestAnalysis.player_feedback?.length > 0 && (
                      <div>
                        <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-400" /> Pupil Notes
                        </h3>
                        <div className="space-y-2">
                          {latestAnalysis.player_feedback.map((pf, i) => (
                            <div key={i} className="p-3 bg-navy-800/50 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                {pf.squad_number && (
                                  <span className="w-6 h-6 rounded-full bg-pitch-500/20 text-pitch-400 text-xs font-bold flex items-center justify-center">
                                    {pf.squad_number}
                                  </span>
                                )}
                                <p className="font-medium text-sm text-white">{pf.name || pf.description}</p>
                                {pf.rating && (
                                  <span className="ml-auto px-2 py-0.5 bg-energy-500/20 text-energy-400 text-xs rounded-full">{pf.rating}/10</span>
                                )}
                              </div>
                              <p className="text-sm text-navy-300">{pf.feedback}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Approve / Edit bottom actions */}
                    {!editing && latestAnalysis.player_feedback?.length > 0 && (
                      <div className="mt-4 p-3 rounded-lg border border-navy-700 bg-navy-800/30">
                        {latestAnalysis.approved ? (
                          <div className="flex items-center gap-2 text-pitch-400">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Approved — pupil notes saved to profiles</span>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-sm text-navy-300">Review the analysis above. Edit anything you'd like to change, then approve to save to pupil profiles.</p>
                            <label className="flex items-center gap-3 p-2 rounded-lg bg-navy-800/50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={includeRatings}
                                onChange={(e) => setIncludeRatings(e.target.checked)}
                                className="rounded border-navy-600 bg-navy-700 text-pitch-500 focus:ring-pitch-500"
                              />
                              <div>
                                <p className="text-sm text-white font-medium">Include pupil ratings</p>
                                <p className="text-xs text-navy-400">Save the /10 scores to pupil profiles (can be sensitive for younger age groups)</p>
                              </div>
                            </label>
                            <div className="flex gap-2">
                              <button
                                onClick={startEditing}
                                className="btn-secondary flex-1 flex items-center justify-center gap-2"
                              >
                                <Pencil className="w-4 h-4" /> Edit Before Approving
                              </button>
                              <button
                                onClick={() => handleApprove(latestAnalysis.id)}
                                disabled={approving}
                                className="btn-primary flex-1 flex items-center justify-center gap-2"
                              >
                                {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                {approving ? 'Saving...' : 'Approve & Save'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {editing && (
                      <div className="mt-4 flex gap-2">
                        <button onClick={cancelEditing} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                          <Undo2 className="w-4 h-4" /> Discard Changes
                        </button>
                        <button onClick={saveEdits} disabled={savingEdits} className="btn-primary flex-1 flex items-center justify-center gap-2">
                          {savingEdits ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          {savingEdits ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="card p-4">
                    {analysing ? (
                      <div className="flex gap-2">
                        <div className="btn-secondary flex-1 cursor-default flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Analysing...
                        </div>
                        <button
                          onClick={handleCancelAnalysis}
                          disabled={cancelling || !processingAnalysisId}
                          className="px-3 py-2 rounded-lg bg-alert-500/20 text-alert-400 hover:bg-alert-500/30 border border-alert-500/30 transition-colors disabled:opacity-50"
                          title="Stop analysis"
                        >
                          {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                        </button>
                      </div>
                    ) : (
                      <button onClick={handleAnalyse} className="btn-secondary w-full">
                        <RefreshCw className="w-4 h-4" /> Re-Analyse
                      </button>
                    )}
                  </div>
                  <Link to={`/chat?q=Based on our match against ${match?.opponent}, what training sessions should we focus on?`} className="card-hover p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pitch-500/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-pitch-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">Discuss with AI</p>
                      <p className="text-xs text-navy-400">Ask follow-up questions</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-navy-600" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="card p-12 text-center max-w-xl mx-auto">
                <Sparkles className="w-16 h-16 text-navy-600 mx-auto mb-4" />
                <h2 className="font-display text-xl font-semibold text-white mb-2">No Analysis Yet</h2>
                {analysisError && !analysing ? (
                  <div className="p-3 rounded-lg bg-alert-500/10 border border-alert-500/30 mb-4">
                    <p className="text-sm text-alert-300">{analysisError}</p>
                  </div>
                ) : (
                  <p className="text-navy-400 mb-6">
                    {video?.mux_playback_id ? 'Run AI analysis to get tactical insights.' : 'Upload a video first.'}
                  </p>
                )}
                {analysing ? (
                  <div className="inline-flex gap-2">
                    <div className="btn-primary cursor-default flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> {analysisProgress || 'Analysing...'}
                    </div>
                    <button
                      onClick={handleCancelAnalysis}
                      disabled={cancelling || !processingAnalysisId}
                      className="px-3 py-2 rounded-lg bg-alert-500/20 text-alert-400 hover:bg-alert-500/30 border border-alert-500/30 transition-colors disabled:opacity-50"
                      title="Stop analysis"
                    >
                      {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                    </button>
                  </div>
                ) : (
                  <button onClick={video?.mux_playback_id ? handleAnalyse : () => setActiveTab('video')} className="btn-primary">
                    {video?.mux_playback_id ? <><Sparkles className="w-4 h-4" /> Analyse Match</> : <><Video className="w-4 h-4" /> Add Video First</>}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Clips Tab */}
        {activeTab === 'clips' && (
          <motion.div key="clips" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-white">Saved Clips ({clips.length})</h2>
              <button onClick={() => setShowClipModal(true)} disabled={!video?.mux_playback_id} className="btn-primary">
                <Plus className="w-4 h-4" /> Add Clip
              </button>
            </div>

            {clips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clips.map((clip, index) => {
                  const category = clipCategories.find(c => c.value === clip.clip_type)
                  return (
                    <motion.div key={clip.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="card overflow-hidden">
                      <div className="aspect-video bg-navy-800 relative cursor-pointer" onClick={() => jumpToClip(clip)}>
                        {video?.mux_playback_id ? (
                          <img
                            src={`https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg?time=${Math.round(clip.start_time)}&width=480`}
                            alt={clip.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center"><Video className="w-8 h-8 text-navy-600" /></div>
                        )}
                        <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-xs text-white font-mono">
                          {formatTime(clip.start_time)} — {formatTime(clip.end_time)}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-medium text-white line-clamp-1">{clip.title}</h3>
                          <button onClick={() => handleDeleteClip(clip.id)} className="p-1 text-navy-500 hover:text-alert-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`badge-${category?.color || 'navy'} text-xs`}>{category?.label || clip.clip_type}</span>
                          {clip.player_tags?.length > 0 && (
                            <span className="text-xs text-navy-400">{clip.player_tags.length} pupil{clip.player_tags.length > 1 ? 's' : ''}</span>
                          )}
                        </div>
                        {clip.description && <p className="text-sm text-navy-400 line-clamp-2 mt-2">{clip.description}</p>}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="card p-12 text-center max-w-xl mx-auto">
                <Scissors className="w-16 h-16 text-navy-600 mx-auto mb-4" />
                <h2 className="font-display text-xl font-semibold text-white mb-2">No Clips Yet</h2>
                <p className="text-navy-400 mb-6">
                  {video?.mux_playback_id ? 'Mark key moments from the match.' : 'Upload a video first.'}
                </p>
                <button onClick={video?.mux_playback_id ? () => setShowClipModal(true) : () => setActiveTab('video')} className="btn-primary">
                  {video?.mux_playback_id ? <><Plus className="w-4 h-4" /> Create Clip</> : <><Video className="w-4 h-4" /> Add Video</>}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clip Modal */}
      <AnimatePresence>
        {showClipModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowClipModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-navy-800 flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-white">Create Clip</h2>
                <button onClick={() => setShowClipModal(false)} className="p-2 text-navy-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSaveClip} className="p-6 space-y-4">
                <p className="text-sm text-navy-400">Navigate the video pupil, then mark start/end times.</p>

                <div className="flex gap-3">
                  <button type="button" onClick={markClipStart} className="btn-primary flex-1 text-sm">
                    <Clock className="w-4 h-4" /> Start {clipStart != null && `(${formatTime(clipStart)})`}
                  </button>
                  <button type="button" onClick={markClipEnd} className="btn-secondary flex-1 text-sm">
                    <Clock className="w-4 h-4" /> End {clipEnd != null && `(${formatTime(clipEnd)})`}
                  </button>
                </div>

                <div>
                  <label className="label">Clip Title *</label>
                  <input type="text" value={newClip.title} onChange={(e) => setNewClip(prev => ({ ...prev, title: e.target.value }))} className="input" placeholder="e.g., Great team goal" required />
                </div>

                <div>
                  <label className="label">Description</label>
                  <textarea value={newClip.description} onChange={(e) => setNewClip(prev => ({ ...prev, description: e.target.value }))} className="input" rows={2} placeholder="Coaching points?" />
                </div>

                <div>
                  <label className="label">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {clipCategories.map(cat => (
                      <button key={cat.value} type="button" onClick={() => setNewClip(prev => ({ ...prev, clipType: cat.value }))}
                        className={`p-2 rounded-lg text-sm font-medium transition-colors text-left flex items-center gap-2 ${
                          newClip.clipType === cat.value ? `bg-${cat.color}-500/20 border border-${cat.color}-500 text-white` : 'bg-navy-800 border border-navy-700 text-navy-400 hover:text-white'
                        }`}
                      >
                        <Tag className="w-3 h-3" /> {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {pupils.length > 0 && (
                  <div>
                    <label className="label">Tag Players</label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {pupils.slice(0, 20).map(pupil => (
                        <button key={pupil.id} type="button" onClick={() => togglePlayer(pupil.id)}
                          className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                            newClip.pupils.includes(pupil.id) ? 'bg-pitch-600 text-white' : 'bg-navy-800 text-navy-400 hover:text-white'
                          }`}
                        >
                          {pupil.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowClipModal(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={savingClip || clipStart == null || clipEnd == null || !newClip.title} className="btn-primary">
                    {savingClip ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Clip'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
