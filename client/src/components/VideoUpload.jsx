import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Upload,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Film,
  ChevronDown,
  WifiOff,
} from 'lucide-react'
import toast from 'react-hot-toast'
import * as UpChunk from '@mux/upchunk'
import { videoService, teamService, trainingService } from '../services/api'

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export default function VideoUpload({
  teamId,
  matchId: initialMatchId,
  onUploadComplete,
  onCancel,
  createUploadFn,
  maxSize = 3 * 1024 * 1024 * 1024
}) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [videoType, setVideoType] = useState(initialMatchId ? 'match' : 'match')
  const [selectedMatchId, setSelectedMatchId] = useState(initialMatchId || '')
  const [selectedTrainingId, setSelectedTrainingId] = useState('')
  const [matches, setMatches] = useState([])
  const [trainingSessions, setTrainingSessions] = useState([])
  const [status, setStatus] = useState('idle') // idle, uploading, processing, ready, error
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [videoId, setVideoId] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const [paused, setPaused] = useState(false)

  const fileInputRef = useRef(null)
  const pollRef = useRef(null)
  const uploadRef = useRef(null)
  const dragCountRef = useRef(0)

  // Load matches and training sessions for selector
  useEffect(() => {
    if (!teamId || initialMatchId) return
    teamService.getMatches(teamId).then(res => {
      const now = new Date()
      const past = (res.data || []).filter(m => new Date(m.date) <= now)
      setMatches(past)
    }).catch(() => {})
    trainingService.getSessions(teamId).then(res => {
      setTrainingSessions(res.data || [])
    }).catch(() => {})
  }, [teamId, initialMatchId])

  // Clean up polling and upload on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (uploadRef.current) {
        uploadRef.current.abort()
        uploadRef.current = null
      }
    }
  }, [])

  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm']
  const allowedExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']

  const validateAndSetFile = useCallback((selectedFile) => {
    if (!selectedFile) return

    // Check MIME type first, then fall back to file extension (some cameras produce files
    // that browsers don't recognise the MIME type for, e.g. XbotGo, Veo, Pixellot)
    const ext = '.' + selectedFile.name.split('.').pop()?.toLowerCase()
    const typeOk = allowedTypes.includes(selectedFile.type) || selectedFile.type?.startsWith('video/')
    const extOk = allowedExtensions.includes(ext)
    if (!typeOk && !extOk) {
      toast.error('Please select a video file (MP4, MOV, AVI, MKV, or WebM)')
      return
    }

    if (selectedFile.size > maxSize) {
      toast.error(`File size must be less than ${formatBytes(maxSize)}`)
      return
    }

    setFile(selectedFile)
    setError(null)
    setProgress(0)
    setStatus('idle')

    // Auto-fill title from filename
    if (!title) {
      const name = selectedFile.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ')
      setTitle(name)
    }
  }, [maxSize, title])

  const handleFileSelect = useCallback((e) => {
    validateAndSetFile(e.target.files?.[0])
  }, [validateAndSetFile])

  // Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCountRef.current++
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCountRef.current--
    if (dragCountRef.current === 0) setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCountRef.current = 0
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files?.[0]
    validateAndSetFile(droppedFile)
  }, [validateAndSetFile])

  const startPolling = useCallback((vid) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res = await videoService.getVideo(vid)
        const video = res.data?.video || res.data
        if (video?.status === 'ready') {
          clearInterval(pollRef.current)
          pollRef.current = null
          setStatus('ready')
          toast.success('Video ready!')
          onUploadComplete?.(video)
        } else if (video?.status === 'error') {
          clearInterval(pollRef.current)
          pollRef.current = null
          setStatus('error')
          setError(video.error_message || 'Processing failed')
        }
      } catch {
        // Ignore poll errors
      }
    }, 3000)
  }, [onUploadComplete])

  const startUpload = useCallback(async () => {
    if (!file || !title.trim() || !teamId) return

    // Abort any previous upload attempt before starting fresh
    if (uploadRef.current) {
      uploadRef.current.abort()
      uploadRef.current = null
    }

    setStatus('uploading')
    setError(null)
    setProgress(0)
    setPaused(false)

    // Check network before attempting upload
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus('error')
      setError('You appear to be offline - check your connection and try again')
      return
    }

    const effectiveMatchId = (videoType === 'match' || videoType === 'match_clip') ? (selectedMatchId || initialMatchId) : null
    // match_clip type is always a clip; otherwise auto-detect by file size
    const isClip = videoType === 'match_clip' || file.size < 1 * 1024 * 1024 * 1024

    try {
      // 1. Get Mux direct upload URL from our backend
      const uploadFn = createUploadFn || videoService.createUpload
      const { data } = await uploadFn({
        title: title.trim(),
        videoType,
        teamId,
        matchId: effectiveMatchId || null,
        isClip,
        recordedAt: new Date().toISOString(),
      })

      setVideoId(data.videoId)

      // 2. Upload via Mux UpChunk (chunked PUT with Content-Range headers)
      // Uses standard HTTP PUT instead of TUS protocol - avoids CORS preflight
      // failures caused by TUS-specific headers (Tus-Resumable, Upload-Length, etc.)
      const upload = UpChunk.createUpload({
        endpoint: data.uploadUrl,
        file: file,
        chunkSize: 5120, // 5 MB in KB
        maxFileBytes: maxSize,
      })

      upload.on('progress', (detail) => {
        setProgress(Math.round(detail.detail))
        setPaused(false)
      })

      upload.on('success', () => {
        uploadRef.current = null
        setStatus('processing')
        setProgress(100)
        startPolling(data.videoId)
      })

      upload.on('error', (detail) => {
        console.error('Upload error:', detail.detail)
        uploadRef.current = null
        setStatus('error')
        const msg = String(detail?.detail?.message || detail?.detail || '')
        let errorMsg
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          errorMsg = 'You are offline - reconnect and try again'
        } else if (msg.includes('403') || msg.includes('401')) {
          errorMsg = 'Upload permission denied - the upload link may have expired'
        } else if (msg.includes('404') || msg.includes('410')) {
          errorMsg = 'Upload session expired - please try again for a fresh link'
        } else if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
          errorMsg = 'Video service temporarily unavailable - try again shortly'
        } else {
          errorMsg = 'Upload failed - check your connection and try again'
        }
        setError(errorMsg)
        toast.error('Upload failed. Please try again.')
      })

      upload.on('offline', () => setPaused(true))
      upload.on('online', () => setPaused(false))
      upload.on('attemptFailure', () => setPaused(true))
      upload.on('attempt', () => setPaused(false))

      uploadRef.current = upload
    } catch (err) {
      console.error('Upload error:', err)
      setStatus('error')
      setError(err.response?.data?.message || err.message || 'Upload failed')
      toast.error('Upload failed. Please try again.')
    }
  }, [file, title, teamId, initialMatchId, selectedMatchId, videoType, startPolling])

  const handleCancel = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (uploadRef.current) {
      uploadRef.current.abort()
      uploadRef.current = null
    }
    setFile(null)
    setTitle('')
    setStatus('idle')
    setProgress(0)
    setError(null)
    setPaused(false)
    onCancel?.()
  }, [onCancel])

  return (
    <div className="space-y-4">
      {/* File Selection */}
      {!file && status === 'idle' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-pitch-500 bg-pitch-500/10'
              : 'border-border-strong hover:border-pitch-500 hover:bg-subtle'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,.mp4,.mov,.avi,.mkv,.webm,.m4v"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-pitch-400' : 'text-tertiary'}`} />
          <p className="text-primary font-medium mb-2">
            {isDragging ? 'Drop video here' : 'Drag & drop or tap to select video'}
          </p>
          <p className="text-sm text-secondary">
            MP4, MOV, AVI, MKV, or WebM up to {formatBytes(maxSize)}
          </p>
          <p className="text-xs text-tertiary mt-2">
            Uploads directly to cloud - no server timeout issues
          </p>
        </div>
      )}

      {/* Selected File - Ready to upload */}
      {file && status === 'idle' && (
        <div className="bg-subtle rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-border-default flex items-center justify-center shrink-0">
              <Film className="w-6 h-6 text-pitch-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-primary font-medium truncate">{file.name}</p>
              <p className="text-sm text-secondary">{formatBytes(file.size)}</p>
            </div>
            <button
              onClick={() => { setFile(null); setTitle('') }}
              className="p-2 text-secondary hover:text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <label className="label">Video Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Morley U13 vs Hethersett - 25 Jan"
              className="input w-full"
            />
          </div>

          {/* Video type & assignment selector (only when not pre-assigned to a match) */}
          {!initialMatchId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <select
                  value={videoType}
                  onChange={(e) => setVideoType(e.target.value)}
                  className="input w-full"
                >
                  <option value="match">Match</option>
                  <option value="match_clip">Match Clip</option>
                  <option value="training">Training</option>
                </select>
              </div>
              <div>
                <label className="label">
                  {videoType === 'training' ? 'Assign to Session' : 'Assign to Match'} (optional)
                </label>
                {videoType !== 'training' ? (
                  <select
                    value={selectedMatchId}
                    onChange={(e) => setSelectedMatchId(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">None</option>
                    {matches.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.opponent} - {new Date(m.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedTrainingId}
                    onChange={(e) => setSelectedTrainingId(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">None</option>
                    {trainingSessions.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.title || 'Training'} - {new Date(s.session_date || s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={startUpload}
              disabled={!title.trim()}
              className="btn-primary flex-1"
            >
              <Upload className="w-4 h-4" />
              Upload Video
            </button>
            {onCancel && (
              <button onClick={handleCancel} className="btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Uploading */}
      {status === 'uploading' && (
        <div className="bg-subtle rounded-xl p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-border-default flex items-center justify-center shrink-0">
              {paused
                ? <WifiOff className="w-6 h-6 text-caution-400" />
                : <Loader2 className="w-6 h-6 text-pitch-400 animate-spin" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-primary font-medium truncate">{file?.name}</p>
              <p className="text-sm text-secondary">
                {paused ? 'Reconnecting - upload will resume automatically...' : 'Uploading to cloud...'}
              </p>
            </div>
          </div>
          <div className="h-2 bg-border-default rounded-full overflow-hidden mb-2">
            <div
              className={`h-full transition-all duration-300 ${paused ? 'bg-caution-500' : 'bg-pitch-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-secondary text-center">{progress}%</p>
          {paused && (
            <p className="text-xs text-caution-400 text-center mt-2">
              Keep this screen open - upload resumes when connection returns
            </p>
          )}
        </div>
      )}

      {/* Processing */}
      {status === 'processing' && (
        <div className="bg-subtle rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-caution-500/20 flex items-center justify-center shrink-0">
              <Loader2 className="w-6 h-6 text-caution-400 animate-spin" />
            </div>
            <div className="flex-1">
              <p className="text-primary font-medium">Processing video</p>
              <p className="text-sm text-secondary">Mux is transcoding - usually 1-2 minutes...</p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={() => {
                if (pollRef.current) clearInterval(pollRef.current)
                onCancel?.()
              }}
              className="mt-4 w-full text-sm text-secondary hover:text-primary py-2"
            >
              Processing in background - close this panel
            </button>
          )}
        </div>
      )}

      {/* Ready */}
      {status === 'ready' && (
        <div className="bg-pitch-500/10 border border-pitch-500/30 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-pitch-500/20 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6 text-pitch-400" />
            </div>
            <div>
              <p className="text-primary font-medium">Video Ready</p>
              <p className="text-sm text-secondary">{title}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="bg-alert-500/10 border border-alert-500/30 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-alert-500/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-alert-400" />
            </div>
            <div className="flex-1">
              <p className="text-primary font-medium">Upload Failed</p>
              <p className="text-sm text-alert-400">{error}</p>
            </div>
          </div>
          {error?.toLowerCase().includes('process') && (
            <p className="text-xs text-secondary mt-3">
              If your camera uses H.265/HEVC encoding (common with XbotGo, newer iPhones), try exporting as H.264/MP4 first. Most video apps can convert this.
            </p>
          )}
          <div className="flex gap-3 mt-4">
            <button onClick={startUpload} className="btn-primary flex-1">
              Try Again
            </button>
            {onCancel && (
              <button onClick={handleCancel} className="btn-secondary">Cancel</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
