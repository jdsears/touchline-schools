import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Radio, Lock, Loader2, WifiOff, AlertCircle } from 'lucide-react'
import { streamingService } from '../services/api'
import '@mux/mux-player'

export default function WatchStream() {
  const { shareCode } = useParams()
  const [loading, setLoading] = useState(true)
  const [stream, setStream] = useState(null)
  const [pinRequired, setPinRequired] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    checkStream()
  }, [shareCode])

  // Auto-poll when stream is not active
  useEffect(() => {
    if (!stream || stream.status === 'active' || pinRequired) {
      return
    }

    // Poll every 10 seconds when stream is idle
    const pollInterval = setInterval(() => {
      refreshStreamStatus()
    }, 10000)

    return () => clearInterval(pollInterval)
  }, [stream?.status, pinRequired])

  async function refreshStreamStatus() {
    try {
      const response = await streamingService.getPublicStream(shareCode)
      if (response.data.success) {
        setStream(response.data.stream)
      }
    } catch (err) {
      // Silently fail on poll errors
    }
  }

  async function checkStream() {
    setLoading(true)
    setError(null)
    try {
      const response = await streamingService.getPublicStream(shareCode)
      if (response.data.pinRequired) {
        setPinRequired(true)
      } else if (response.data.success) {
        setStream(response.data.stream)
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Stream not found. The link may be invalid or expired.')
      } else {
        setError('Failed to load stream. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handlePinSubmit(e) {
    e.preventDefault()
    if (!pin || pin.length < 4) return

    setVerifying(true)
    setError(null)
    try {
      const response = await streamingService.verifyPin(shareCode, pin)
      if (response.data.success) {
        setStream(response.data.stream)
        setPinRequired(false)
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Incorrect PIN. Please try again.')
      } else {
        setError('Failed to verify PIN. Please try again.')
      }
    } finally {
      setVerifying(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-pitch-400 mx-auto" />
          <p className="text-secondary mt-4">Loading stream...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !pinRequired) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-alert-500 mx-auto mb-4" />
          <h1 className="text-xl font-display font-bold text-white mb-2">Unable to Load Stream</h1>
          <p className="text-secondary mb-6">{error}</p>
          <button onClick={checkStream} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // PIN entry state
  if (pinRequired) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 max-w-sm w-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-subtle flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-pitch-400" />
          </div>
          <h1 className="text-xl font-display font-bold text-white mb-2">Enter PIN to Watch</h1>
          <p className="text-secondary text-sm mb-6">
            This stream is protected. Enter the PIN provided by the team to watch.
          </p>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter PIN"
              className="input text-center text-2xl tracking-widest"
              autoFocus
            />

            {error && (
              <p className="text-alert-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={pin.length < 4 || verifying}
              className="btn-primary w-full"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Watch Stream'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    )
  }

  // Stream view
  return (
    <div className="min-h-screen bg-page">
      {/* Header */}
      <header className="bg-card border-b border-border-default px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            stream?.status === 'active'
              ? 'bg-gradient-to-br from-alert-500 to-energy-500 animate-pulse'
              : 'bg-border-default'
          }`}>
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-white">
              {stream?.streamName || stream?.teamName || 'Live Stream'}
            </h1>
            <p className="text-xs text-secondary">
              {stream?.status === 'active' ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-alert-500 animate-pulse" />
                  <span className="text-alert-400">LIVE</span>
                </span>
              ) : (
                'Stream offline'
              )}
            </p>
          </div>
        </div>
      </header>

      {/* Stream Content */}
      <main className="max-w-4xl mx-auto p-4">
        {stream?.status === 'active' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl overflow-hidden bg-black shadow-2xl"
          >
            <div className="aspect-video">
              <mux-player
                playback-id={stream.playbackId}
                stream-type="live"
                autoplay
                default-show-remaining-time
                style={{ width: '100%', height: '100%', '--controls': 'flex' }}
              />
            </div>
          </motion.div>
        ) : (
          <div className="card p-12 text-center">
            <div className="w-24 h-24 rounded-full bg-subtle flex items-center justify-center mx-auto mb-6">
              <WifiOff className="w-12 h-12 text-tertiary" />
            </div>
            <h2 className="text-xl font-display font-semibold text-white mb-2">Stream Offline</h2>
            <p className="text-secondary max-w-sm mx-auto mb-6">
              The live stream isn't active right now. Check back when the team starts streaming.
            </p>
            <button onClick={checkStream} className="btn-secondary">
              <Loader2 className="w-4 h-4" />
              Refresh Status
            </button>
          </div>
        )}

        {/* Footer info */}
        <p className="text-center text-tertiary text-xs mt-6">
          Powered by MoonBoots Sports
        </p>
      </main>
    </div>
  )
}
