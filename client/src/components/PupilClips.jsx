import '@mux/mux-player'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Video, Play, X, Loader2, Scissors, MessageSquare, Star } from 'lucide-react'
import { videoService } from '../services/api'

function formatTime(seconds) {
  if (!seconds && seconds !== 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function PupilClips({ pupilId }) {
  const [clips, setClips] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeClip, setActiveClip] = useState(null)
  const playerRef = useRef(null)

  useEffect(() => {
    if (!pupilId) return
    loadClips()
  }, [pupilId])

  async function loadClips() {
    setLoading(true)
    try {
      const res = await videoService.getPupilClips(pupilId)
      setClips(res.data?.clips || [])
    } catch (error) {
      console.error('Failed to load clips:', error)
    } finally {
      setLoading(false)
    }
  }

  function openClip(clip) {
    setActiveClip(clip)
  }

  function closeClip() {
    setActiveClip(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-pitch-400" />
      </div>
    )
  }

  if (clips.length === 0) {
    return (
      <div className="text-center py-12">
        <Scissors className="w-12 h-12 text-tertiary mx-auto mb-3" />
        <p className="text-secondary font-medium">No clips shared yet</p>
        <p className="text-sm text-tertiary mt-1">Your coach will tag you in video clips after matches</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {clips.map((clip, index) => (
          <motion.div
            key={clip.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="card overflow-hidden cursor-pointer hover:ring-1 hover:ring-pitch-500/50 transition-all"
            onClick={() => openClip(clip)}
          >
            <div className="aspect-video bg-subtle relative">
              {clip.mux_playback_id ? (
                <img
                  src={`https://image.mux.com/${clip.mux_playback_id}/thumbnail.jpg?time=${Math.round(clip.start_time)}&width=480`}
                  alt={clip.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Video className="w-8 h-8 text-tertiary" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Play className="w-12 h-12 text-primary" />
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-xs text-primary font-mono">
                {formatTime(clip.start_time)} - {formatTime(clip.end_time)}
              </div>
            </div>
            <div className="p-3">
              <h3 className="font-medium text-primary text-sm line-clamp-1">{clip.title}</h3>
              <p className="text-xs text-secondary mt-1">{clip.video_title}</p>
              {clip.feedback && (
                <div className="mt-2 p-2 bg-pitch-500/10 rounded-lg">
                  <div className="flex items-center gap-1 mb-1">
                    <MessageSquare className="w-3 h-3 text-pitch-400" />
                    <span className="text-xs text-pitch-400 font-medium">Coach Feedback</span>
                  </div>
                  <p className="text-xs text-secondary line-clamp-2">{clip.feedback}</p>
                </div>
              )}
              {clip.rating && (
                <div className="mt-1 flex items-center gap-1">
                  {Array.from({ length: clip.rating }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 text-energy-400 fill-energy-400" />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Clip Pupil Modal */}
      <AnimatePresence>
        {activeClip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={closeClip}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-2xl overflow-hidden max-w-3xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border-default flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-primary">{activeClip.title}</h3>
                  <p className="text-xs text-secondary">{activeClip.video_title}</p>
                </div>
                <button onClick={closeClip} className="p-2 text-secondary hover:text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {activeClip.mux_playback_id && (
                <div className="aspect-video">
                  <mux-player
                    ref={playerRef}
                    playback-id={activeClip.mux_playback_id}
                    start-time={activeClip.start_time}
                    stream-type="on-demand"
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              )}

              {(activeClip.feedback || activeClip.description) && (
                <div className="p-4">
                  {activeClip.feedback && (
                    <div className="p-3 bg-pitch-500/10 rounded-lg mb-3">
                      <p className="text-xs text-pitch-400 font-medium mb-1">Coach Feedback</p>
                      <p className="text-sm text-primary">{activeClip.feedback}</p>
                    </div>
                  )}
                  {activeClip.description && (
                    <p className="text-sm text-secondary">{activeClip.description}</p>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
