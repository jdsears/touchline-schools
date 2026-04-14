import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { voiceObservationService } from '../../services/api'
import { Mic, Square, Loader2, X, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const CONTEXT_OPTIONS = [
  { value: 'general', label: 'Quick note' },
  { value: 'session', label: 'Session observation' },
  { value: 'match', label: 'Match observation' },
  { value: 'half_time', label: 'Half-time' },
  { value: 'post_fixture', label: 'Post-fixture debrief' },
  { value: 'lesson', label: 'Lesson observation' },
]

export default function VoiceObservationRecorder({ onClose, defaultContext, defaultContextId }) {
  const navigate = useNavigate()
  const [state, setState] = useState('idle') // idle, recording, uploading, processing
  const [contextType, setContextType] = useState(defaultContext || 'general')
  const [contextId, setContextId] = useState(defaultContextId || null)
  const [duration, setDuration] = useState(0)
  const [audioSourceId, setAudioSourceId] = useState(null)
  const [hasConsented, setHasConsented] = useState(
    localStorage.getItem('voice_obs_consent') === 'true'
  )

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    return () => {
      stopTimer()
      stopMediaStream()
    }
  }, [])

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function stopMediaStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stopMediaStream()
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const ext = mimeType.includes('mp4') ? '.m4a' : '.webm'
        const file = new File([blob], `observation${ext}`, { type: mimeType })
        await uploadAndProcess(file)
      }

      mediaRecorder.start(1000) // Collect data every second
      setState('recording')
      setDuration(0)
      timerRef.current = setInterval(() => {
        setDuration(d => {
          if (d >= 299) { // Max 5 minutes
            stopRecording()
            return d
          }
          return d + 1
        })
      }, 1000)
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        toast.error('Microphone access is needed for voice observations. Please allow microphone access in your browser settings.')
      } else {
        toast.error('Could not access microphone')
        console.error('MediaRecorder error:', err)
      }
    }
  }

  function stopRecording() {
    stopTimer()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setState('uploading')
    }
  }

  async function uploadAndProcess(file) {
    try {
      setState('processing')
      const res = await voiceObservationService.upload(file, contextType, contextId)
      setAudioSourceId(res.data.audio_source_id)
      // Poll for completion
      pollForCompletion(res.data.audio_source_id)
    } catch (err) {
      toast.error('Failed to upload observation')
      console.error('Upload error:', err)
      setState('idle')
    }
  }

  async function pollForCompletion(sourceId) {
    const maxAttempts = 60
    let attempts = 0

    const poll = async () => {
      attempts++
      try {
        const res = await voiceObservationService.getStatus(sourceId)
        if (res.data.status === 'ready_for_review') {
          navigate(`/teacher/voice-review/${sourceId}`)
          return
        }
        if (attempts >= maxAttempts) {
          toast('Transcription is taking longer than expected. Check back shortly.', { icon: '\u23F3' })
          if (onClose) onClose()
          return
        }
        setTimeout(poll, 2000)
      } catch (err) {
        console.error('Poll error:', err)
        if (attempts < maxAttempts) setTimeout(poll, 3000)
      }
    }

    poll()
  }

  function handleConsent() {
    localStorage.setItem('voice_obs_consent', 'true')
    setHasConsented(true)
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Consent modal (first use)
  if (!hasConsented) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-navy-900 rounded-2xl border border-navy-700 w-full max-w-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-pitch-600/20 flex items-center justify-center">
              <Mic className="w-5 h-5 text-pitch-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Voice Observations</h2>
          </div>
          <div className="space-y-3 text-sm text-navy-300 mb-6">
            <p>Voice observations let you speak coaching notes into your phone and have the AI transcribe and file them against the correct pupils.</p>
            <p>Here is how it works:</p>
            <ul className="list-disc pl-5 space-y-1 text-navy-400">
              <li>Audio is used only to create a transcript for observation extraction</li>
              <li>Raw audio is automatically deleted within {'{'}school retention period{'}'} days</li>
              <li>Only you and the DSL can access the transcript</li>
              <li>Any pupil voices captured in the background are filtered out</li>
              <li>Nothing is filed until you review and confirm it</li>
            </ul>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-navy-800 hover:bg-navy-700 text-navy-300 rounded-lg text-sm transition-colors">
              Not now
            </button>
            <button onClick={handleConsent} className="flex-1 px-4 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm font-medium transition-colors">
              I understand, continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-navy-900 rounded-2xl border border-navy-700 w-full max-w-sm p-6">
        {/* Close */}
        {state === 'idle' && (
          <button onClick={onClose} className="absolute top-4 right-4 text-navy-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Context selector */}
        {state === 'idle' && (
          <div className="mb-6">
            <label className="block text-sm text-navy-300 mb-2">What are you observing?</label>
            <select
              value={contextType}
              onChange={e => setContextType(e.target.value)}
              className="w-full px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-pitch-500"
            >
              {CONTEXT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Record button area */}
        <div className="flex flex-col items-center py-6">
          {state === 'idle' && (
            <>
              <button
                onClick={startRecording}
                className="w-20 h-20 rounded-full bg-pitch-600 hover:bg-pitch-700 flex items-center justify-center transition-all hover:scale-105 shadow-lg shadow-pitch-600/30"
              >
                <Mic className="w-8 h-8 text-white" />
              </button>
              <p className="text-xs text-navy-400 mt-4">Tap to start recording</p>
            </>
          )}

          {state === 'recording' && (
            <>
              {/* Pulsing indicator */}
              <div className="relative">
                <div className="absolute inset-0 w-20 h-20 rounded-full bg-alert-600/30 animate-ping" />
                <button
                  onClick={stopRecording}
                  className="relative w-20 h-20 rounded-full bg-alert-600 hover:bg-alert-700 flex items-center justify-center transition-all shadow-lg shadow-alert-600/30"
                >
                  <Square className="w-6 h-6 text-white" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <div className="w-2 h-2 rounded-full bg-alert-500 animate-pulse" />
                <span className="text-lg font-mono text-white">{formatTime(duration)}</span>
              </div>
              <p className="text-xs text-navy-400 mt-2">Tap to stop recording</p>
            </>
          )}

          {state === 'uploading' && (
            <>
              <div className="w-20 h-20 rounded-full bg-navy-800 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-pitch-400 animate-spin" />
              </div>
              <p className="text-sm text-navy-300 mt-4">Uploading...</p>
            </>
          )}

          {state === 'processing' && (
            <>
              <div className="w-20 h-20 rounded-full bg-navy-800 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-pitch-400 animate-spin" />
              </div>
              <p className="text-sm text-navy-300 mt-4">Transcribing and extracting observations...</p>
              <p className="text-xs text-navy-500 mt-1">This usually takes 10-20 seconds</p>
            </>
          )}
        </div>

        {/* Duration recorded */}
        {(state === 'uploading' || state === 'processing') && duration > 0 && (
          <div className="flex items-center justify-center gap-2 text-xs text-navy-500">
            <Clock className="w-3 h-3" />
            {formatTime(duration)} recorded
          </div>
        )}
      </div>
    </div>
  )
}
