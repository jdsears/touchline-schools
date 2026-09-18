import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { voiceObservationService } from '../../services/api'
import { enqueueVoiceUpload, isNetworkError } from '../../lib/voiceQueue'
import { Mic, Square, Loader2, X, Clock, CloudOff, CheckCircle2 } from 'lucide-react'
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
  const [state, setState] = useState('idle') // idle, recording, uploading, processing, queued
  const [contextType, setContextType] = useState(defaultContext || 'general')
  const [contextId, setContextId] = useState(defaultContextId || null)
  const [duration, setDuration] = useState(0)
  const [audioSourceId, setAudioSourceId] = useState(null)
  const [queuedReason, setQueuedReason] = useState(null)
  const durationRef = useRef(0)
  const clientUploadIdRef = useRef(null)
  const [hasConsented, setHasConsented] = useState(
    localStorage.getItem('voice_obs_consent') === 'true'
  )

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const streamRef = useRef(null)
  const discardRef = useRef(false) // set when the teacher abandons a recording
  const closedRef = useRef(false) // set once the modal is dismissed; stops polling
  const stateRef = useRef('idle')
  stateRef.current = state

  useEffect(() => {
    return () => {
      closedRef.current = true
      stopTimer()
      stopMediaStream()
    }
  }, [])

  // Escape always offers a way out; what it does depends on the state.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Leave the recorder: drop an in-progress recording, let a recording that
  // is already being transcribed finish in the background, never interrupt
  // an upload that is mid-flight.
  function dismiss() {
    const current = stateRef.current
    if (current === 'uploading') return
    if (current === 'recording') {
      discardRecording()
      return
    }
    if (current === 'processing') {
      closedRef.current = true
      toast('Still transcribing. It will appear under Voice Observations when it is ready.', { icon: '⏳' })
    }
    if (onClose) onClose()
  }

  function discardRecording() {
    discardRef.current = true
    stopTimer()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    stopMediaStream()
    toast('Recording discarded')
    if (onClose) onClose()
  }

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
        if (discardRef.current) return
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const ext = mimeType.includes('mp4') ? '.m4a' : '.webm'
        const file = new File([blob], `observation${ext}`, { type: mimeType })
        await uploadAndProcess(file)
      }

      mediaRecorder.start(1000) // Collect data every second
      clientUploadIdRef.current = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}${Math.random()}`).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)
      setState('recording')
      setDuration(0)
      durationRef.current = 0
      timerRef.current = setInterval(() => {
        setDuration(d => {
          if (d >= 299) { // Max 5 minutes
            stopRecording()
            return d
          }
          durationRef.current = d + 1
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

  // No signal on the field is the normal case, not the error case: keep the
  // recording on the device and let the outbox upload it later.
  async function keepForLater(file, reason) {
    try {
      await enqueueVoiceUpload({
        blob: file, mimeType: file.type, filename: file.name,
        contextType, contextId, durationSeconds: durationRef.current,
      })
      setQueuedReason(reason)
      setState('queued')
    } catch (err) {
      console.error('Could not queue recording:', err)
      toast.error('No connection, and this device could not store the recording. Please try again when online.')
      setState('idle')
    }
  }

  async function uploadAndProcess(file) {
    if (navigator.onLine === false) {
      await keepForLater(file, 'offline')
      return
    }
    try {
      setState('processing')
      const res = await voiceObservationService.upload(file, contextType, contextId, clientUploadIdRef.current)
      setAudioSourceId(res.data.audio_source_id)
      // Poll for completion
      pollForCompletion(res.data.audio_source_id)
    } catch (err) {
      if (isNetworkError(err)) {
        await keepForLater(file, 'network')
        return
      }
      const serverMsg = err.response?.data?.error
      toast.error(serverMsg || 'Failed to upload observation')
      console.error('Upload error:', err)
      setState('idle')
    }
  }

  async function pollForCompletion(sourceId) {
    const maxAttempts = 60
    let attempts = 0

    const poll = async () => {
      if (closedRef.current) return
      attempts++
      try {
        const res = await voiceObservationService.getStatus(sourceId)
        if (closedRef.current) return
        if (res.data.status === 'ready_for_review') {
          navigate(`/teacher/voice-review/${sourceId}`)
          return
        }
        if (res.data.status === 'error') {
          toast.error(res.data.processing_error || 'Voice processing failed. Please try again.', { duration: 8000 })
          if (onClose) onClose()
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
        <div className="bg-card rounded-2xl border border-border-strong w-full max-w-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-primary-tint flex items-center justify-center">
              <Mic className="w-5 h-5 text-brand-primary" />
            </div>
            <h2 className="text-lg font-semibold text-primary">Voice Observations</h2>
          </div>
          <div className="space-y-3 text-sm text-secondary mb-6">
            <p>Voice observations let you speak coaching notes into your phone and have the AI transcribe and file them against the correct pupils.</p>
            <p>Here is how it works:</p>
            <ul className="list-disc pl-5 space-y-1 text-secondary">
              <li>Audio is used only to create a transcript for observation extraction</li>
              <li>Raw audio is automatically deleted within {'{'}school retention period{'}'} days</li>
              <li>Only you and the DSL can access the transcript</li>
              <li>Any pupil voices captured in the background are filtered out</li>
              <li>Nothing is filed until you review and confirm it</li>
            </ul>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-subtle hover:bg-border-default text-secondary rounded-lg text-sm transition-colors">
              Not now
            </button>
            <button onClick={handleConsent} className="flex-1 px-4 py-2.5 bg-brand-primary hover:bg-brand-primary text-on-dark rounded-lg text-sm font-medium transition-colors">
              I understand, continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget && state === 'idle') dismiss() }}
    >
      <div className="relative bg-card rounded-2xl border border-border-strong w-full max-w-sm p-6">
        {/* Close: sits inside the card, in every state except a mid-flight upload */}
        {state !== 'uploading' && (
          <button
            type="button"
            onClick={dismiss}
            aria-label={state === 'recording' ? 'Discard recording' : 'Close'}
            title={state === 'recording' ? 'Discard recording' : state === 'processing' ? 'Continue in the background' : 'Close'}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Context selector */}
        {state === 'idle' && (
          <div className="mb-6">
            <label className="block text-sm text-secondary mb-2">What are you observing?</label>
            <select
              value={contextType}
              onChange={e => setContextType(e.target.value)}
              className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-primary text-sm focus:outline-none focus:border-brand-primary"
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
                className="w-20 h-20 rounded-full bg-brand-primary hover:bg-brand-primary flex items-center justify-center transition-all hover:scale-105 shadow-lg shadow-pitch-600/30"
                aria-label="Start recording"
              >
                <Mic className="w-8 h-8 text-on-dark" />
              </button>
              <p className="text-xs text-secondary mt-4">Tap to start recording</p>
            </>
          )}

          {state === 'recording' && (
            <>
              {/* Pulsing indicator */}
              <div className="relative">
                <div className="absolute inset-0 w-20 h-20 rounded-full bg-status-error-tint animate-ping" />
                <button
                  onClick={stopRecording}
                  className="relative w-20 h-20 rounded-full bg-status-error hover:bg-status-error flex items-center justify-center transition-all shadow-lg shadow-alert-600/30"
                  aria-label="Stop recording"
                >
                  <Square className="w-6 h-6 text-on-dark" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <div className="w-2 h-2 rounded-full bg-status-error animate-pulse" />
                <span className="text-lg font-mono text-primary">{formatTime(duration)}</span>
              </div>
              <p className="text-xs text-secondary mt-2">Tap to stop recording</p>
            </>
          )}

          {state === 'uploading' && (
            <>
              <div className="w-20 h-20 rounded-full bg-subtle flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
              </div>
              <p className="text-sm text-secondary mt-4">Uploading...</p>
            </>
          )}

          {state === 'processing' && (
            <>
              <div className="w-20 h-20 rounded-full bg-subtle flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
              </div>
              <p className="text-sm text-secondary mt-4">Transcribing and extracting observations...</p>
              <p className="text-xs text-tertiary mt-1">This usually takes 10-20 seconds</p>
              <button type="button" onClick={dismiss} className="mt-4 text-xs text-secondary underline underline-offset-2 hover:text-primary">
                Continue in the background
              </button>
            </>
          )}

          {state === 'queued' && (
            <>
              <div className="w-20 h-20 rounded-full bg-brand-accent-tint flex items-center justify-center">
                <CloudOff className="w-8 h-8 text-brand-primary" />
              </div>
              <p className="text-sm font-semibold text-primary mt-4 text-center">Saved on this device</p>
              <p className="text-xs text-secondary mt-1 text-center max-w-[260px]">
                {queuedReason === 'offline' ? "You're offline" : 'The upload could not get through'}, so the recording is stored here and will upload by itself when you're back in signal — even if you close the app.
              </p>
              <button onClick={onClose}
                className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-primary text-on-dark rounded-lg text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> Done
              </button>
            </>
          )}
        </div>

        {/* Duration recorded */}
        {(state === 'uploading' || state === 'processing') && duration > 0 && (
          <div className="flex items-center justify-center gap-2 text-xs text-tertiary">
            <Clock className="w-3 h-3" />
            {formatTime(duration)} recorded
          </div>
        )}
      </div>
    </div>
  )
}
