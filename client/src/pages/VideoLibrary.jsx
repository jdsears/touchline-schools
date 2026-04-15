import '@mux/mux-pupil'
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Video, Upload, Play, Loader2, Trash2, Sparkles, Film,
  Clock, Calendar, Plus, Search, X, ChevronRight, LinkIcon, Edit2,
} from 'lucide-react'
import { videoService, teamService, trainingService } from '../services/api'
import { useTeam } from '../context/TeamContext'
import toast from 'react-hot-toast'
import VideoUpload from '../components/VideoUpload'

function formatDuration(seconds) {
  if (!seconds) return '-'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VideoLibrary() {
  const { team } = useTeam()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUploader, setShowUploader] = useState(false)
  const [filter, setFilter] = useState('all')
  const [activeVideo, setActiveVideo] = useState(null)
  const [assigningVideo, setAssigningVideo] = useState(null)
  const [editingVideo, setEditingVideo] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', type: 'match', matchId: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [matches, setMatches] = useState([])
  const [trainingSessions, setTrainingSessions] = useState([])
  const playerRef = useRef(null)
  const pollRef = useRef(null)

  useEffect(() => {
    if (team?.id) {
      loadVideos()
      teamService.getMatches(team.id).then(res => {
      const now = new Date()
      setMatches((res.data || []).filter(m => new Date(m.date) <= now))
    }).catch(() => {})
      trainingService.getSessions(team.id).then(res => setTrainingSessions(res.data || [])).catch(() => {})
    }
  }, [team?.id])

  // Poll when any video is not ready
  useEffect(() => {
    const hasProcessing = videos.some(v => v.status === 'processing' || v.status === 'waiting_upload')
    if (hasProcessing && team?.id) {
      pollRef.current = setInterval(() => {
        videoService.getVideos(team.id).then(res => {
          setVideos(res.data || [])
        }).catch(() => {})
      }, 5000)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [videos.some(v => v.status === 'processing' || v.status === 'waiting_upload'), team?.id])

  async function loadVideos() {
    setLoading(true)
    try {
      const res = await videoService.getVideos(team.id)
      setVideos(res.data || [])
    } catch (error) {
      console.error('Failed to load videos:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleUploadComplete(video) {
    setShowUploader(false)
    loadVideos()
  }

  async function handleDelete(e, videoId) {
    e.stopPropagation()
    if (!confirm('Delete this video? This cannot be undone.')) return
    try {
      await videoService.deleteVideo(videoId)
      setVideos(prev => prev.filter(v => v.id !== videoId))
      if (activeVideo?.id === videoId) setActiveVideo(null)
      toast.success('Video deleted')
    } catch {
      toast.error('Failed to delete video')
    }
  }

  async function handleAssign(videoId, matchId) {
    try {
      await videoService.assignVideo(videoId, { matchId })
      toast.success('Video assigned to match')
      setAssigningVideo(null)
      loadVideos()
    } catch {
      toast.error('Failed to assign video')
    }
  }

  function openEditModal(video) {
    setEditForm({ title: video.title || '', type: video.type || 'match', matchId: video.match_id || '' })
    setEditingVideo(video)
  }

  async function handleSaveEdit() {
    if (!editingVideo) return
    setSavingEdit(true)
    try {
      await videoService.updateVideo(editingVideo.id, {
        title: editForm.title.trim(),
        type: editForm.type,
        matchId: editForm.matchId || null,
      })
      toast.success('Video updated')
      setEditingVideo(null)
      loadVideos()
    } catch {
      toast.error('Failed to update video')
    } finally {
      setSavingEdit(false)
    }
  }

  const filteredVideos = filter === 'all' ? videos : videos.filter(v => v.type === filter)

  const statusBadge = (status) => {
    switch (status) {
      case 'ready': return <span className="px-2 py-0.5 bg-pitch-500/20 text-pitch-400 text-xs rounded-full">Ready</span>
      case 'processing': return <span className="px-2 py-0.5 bg-caution-500/20 text-caution-400 text-xs rounded-full flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Processing</span>
      case 'waiting_upload': return <span className="px-2 py-0.5 bg-navy-700 text-navy-400 text-xs rounded-full flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Uploading</span>
      case 'error': return <span className="px-2 py-0.5 bg-alert-500/20 text-alert-400 text-xs rounded-full">Error</span>
      default: return null
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-white">Video Library</h1>
          <p className="text-navy-400 mt-1">All team videos, clips, and analyses</p>
        </div>
        <button onClick={() => setShowUploader(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Upload Video
        </button>
      </div>

      {showUploader && (
        <div className="card p-4 mb-6">
          <VideoUpload
            teamId={team?.id}
            onUploadComplete={handleUploadComplete}
            onCancel={() => {
              setShowUploader(false)
              loadVideos() // Reload to show any processing videos in the grid
            }}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'All Videos' },
          { key: 'match', label: 'Matches' },
          { key: 'match_clip', label: 'Match Clips' },
          { key: 'training', label: 'Training' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors text-sm ${
              filter === f.key ? 'bg-pitch-600 text-white' : 'bg-navy-800 text-navy-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-pitch-400" />
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="card p-12 text-center max-w-lg mx-auto">
          <Film className="w-16 h-16 text-navy-600 mx-auto mb-4" />
          <h2 className="font-display text-xl font-semibold text-white mb-2">No Videos Yet</h2>
          <p className="text-navy-400 mb-6">Upload match or training videos to unlock AI analysis, clips, and pupil feedback.</p>
          <button onClick={() => setShowUploader(true)} className="btn-primary">
            <Upload className="w-4 h-4" /> Upload First Video
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="card overflow-hidden"
            >
              {/* Thumbnail */}
              <div
                className="aspect-video bg-navy-800 relative cursor-pointer"
                onClick={() => video.mux_playback_id ? setActiveVideo(video) : null}
              >
                {video.mux_playback_id ? (
                  <img
                    src={video.thumbnail_url || `https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg?time=10&width=480`}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {(video.status === 'processing' || video.status === 'waiting_upload') ? (
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 text-caution-400 animate-spin mx-auto" />
                        <p className="text-xs text-navy-400 mt-2">
                          {video.status === 'waiting_upload' ? 'Uploading...' : 'Processing...'}
                        </p>
                      </div>
                    ) : (
                      <Film className="w-8 h-8 text-navy-600" />
                    )}
                  </div>
                )}
                {video.mux_playback_id && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Play className="w-12 h-12 text-white" />
                  </div>
                )}
                {video.duration_seconds && (
                  <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-xs text-white font-mono">
                    {formatDuration(video.duration_seconds)}
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-white line-clamp-1">{video.title || video.original_filename || 'Untitled Video'}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); openEditModal(video) }} className="p-1 text-navy-500 hover:text-white" title="Edit">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => handleDelete(e, video.id)} className="p-1 text-navy-500 hover:text-alert-400" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-navy-700 text-navy-300 text-xs rounded-full capitalize">{video.type || 'match'}</span>
                  {statusBadge(video.status)}
                  {video.match_opponent && (
                    <span className="px-2 py-0.5 bg-energy-500/20 text-energy-400 text-xs rounded-full">
                      vs {video.match_opponent}
                    </span>
                  )}
                </div>
                {video.recorded_at && (
                  <p className="text-xs text-navy-500 mt-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(video.recorded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-3">
                  {video.mux_playback_id && (
                    <Link to={`/videos/${video.id}/analysis`} className="flex items-center gap-1 text-sm text-pitch-400 hover:text-pitch-300">
                      <Sparkles className="w-4 h-4" /> Analysis
                    </Link>
                  )}
                  {!video.match_id && video.status === 'ready' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setAssigningVideo(video) }}
                      className="flex items-center gap-1 text-sm text-navy-400 hover:text-pitch-400"
                    >
                      <LinkIcon className="w-3.5 h-3.5" /> Assign to match
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Video Pupil Modal */}
      <AnimatePresence>
        {activeVideo?.mux_playback_id && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setActiveVideo(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-navy-900 rounded-2xl overflow-hidden max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-navy-800 flex items-center justify-between">
                <h3 className="font-medium text-white">{activeVideo.title}</h3>
                <button onClick={() => setActiveVideo(null)} className="p-2 text-navy-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="aspect-video">
                <mux-pupil
                  ref={playerRef}
                  playback-id={activeVideo.mux_playback_id}
                  stream-type="on-demand"
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign to Match Modal */}
      <AnimatePresence>
        {assigningVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setAssigningVideo(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-navy-900 rounded-2xl overflow-hidden max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-white">Assign to Match</h3>
                <button onClick={() => setAssigningVideo(null)} className="p-2 text-navy-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-navy-400 mb-4">Select a match to link "{assigningVideo.title}" to:</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {matches.length === 0 ? (
                  <p className="text-sm text-navy-500 text-center py-4">No matches found</p>
                ) : (
                  matches.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleAssign(assigningVideo.id, m.id)}
                      className="w-full text-left px-4 py-3 rounded-lg bg-navy-800 hover:bg-navy-700 transition-colors"
                    >
                      <p className="text-white text-sm font-medium">{m.opponent}</p>
                      <p className="text-xs text-navy-400">
                        {new Date(m.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Video Modal */}
      <AnimatePresence>
        {editingVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setEditingVideo(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-navy-900 rounded-2xl overflow-hidden max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-white">Edit Video</h3>
                <button onClick={() => setEditingVideo(null)} className="p-2 text-navy-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Title</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="label">Type</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="input w-full"
                  >
                    <option value="match">Match</option>
                    <option value="match_clip">Match Clip</option>
                    <option value="training">Training</option>
                  </select>
                </div>

                <div>
                  <label className="label">Assign to Match (optional)</label>
                  <select
                    value={editForm.matchId}
                    onChange={(e) => setEditForm({ ...editForm, matchId: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">None</option>
                    {matches.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.opponent} — {new Date(m.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={handleSaveEdit} disabled={savingEdit || !editForm.title.trim()} className="btn-primary flex-1">
                    {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </button>
                  <button onClick={() => setEditingVideo(null)} className="btn-secondary">Cancel</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
