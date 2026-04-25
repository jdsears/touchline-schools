import { useState, useEffect, useCallback } from 'react'
import {
  MonitorPlay, Plus, Youtube, Upload, X, Loader2, Eye, EyeOff,
  Star, Trash2, Edit3, ChevronUp, ChevronDown, Users, Check,
  Play, ExternalLink, Search, Film
} from 'lucide-react'
import toast from 'react-hot-toast'
import { libraryService } from '../services/api'
import { useTeam } from '../context/TeamContext'
import VideoUpload from '../components/VideoUpload'

export default function FilmRoom() {
  const { team } = useTeam()
  const [sections, setSections] = useState([])
  const [videos, setVideos] = useState([])
  const [activeSection, setActiveSection] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showWatchers, setShowWatchers] = useState(null)
  const [editingVideo, setEditingVideo] = useState(null)
  const [showAddSection, setShowAddSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [sectionsRes, videosRes] = await Promise.allSettled([
        libraryService.getSections(),
        libraryService.getVideos(),
      ])
      if (sectionsRes.status === 'fulfilled') {
        setSections(sectionsRes.value.data)
      } else {
        console.error('Failed to load sections:', sectionsRes.reason)
        toast.error('Failed to load sections')
      }
      if (videosRes.status === 'fulfilled') {
        setVideos(videosRes.value.data)
      } else {
        console.error('Failed to load videos:', videosRes.reason)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredVideos = videos.filter(v => {
    const matchesSection = activeSection === 'all' || v.section_id === activeSection
    const matchesSearch = !searchQuery || v.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSection && matchesSearch
  })

  const handleToggleVisibility = async (video) => {
    try {
      await libraryService.updateVideo(video.id, { is_visible: !video.is_visible })
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, is_visible: !v.is_visible } : v))
    } catch { toast.error('Failed to update') }
  }

  const handleToggleHighlight = async (video) => {
    try {
      await libraryService.updateVideo(video.id, { is_highlighted: !video.is_highlighted })
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, is_highlighted: !v.is_highlighted } : v))
    } catch { toast.error('Failed to update') }
  }

  const handleDelete = async (video) => {
    if (!confirm(`Delete "${video.title}"?`)) return
    try {
      await libraryService.deleteVideo(video.id)
      setVideos(prev => prev.filter(v => v.id !== video.id))
      toast.success('Video deleted')
    } catch { toast.error('Failed to delete') }
  }

  const handleAddSection = async () => {
    if (!newSectionName.trim()) return
    try {
      const res = await libraryService.createSection({ name: newSectionName.trim() })
      setSections(prev => [...prev, res.data])
      setNewSectionName('')
      setShowAddSection(false)
      toast.success('Section added')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add section')
    }
  }

  const handleDeleteSection = async (section) => {
    if (section.is_predefined) return toast.error('Predefined sections cannot be deleted')
    if (!confirm(`Delete "${section.name}"? All videos in this section will be deleted.`)) return
    try {
      await libraryService.deleteSection(section.id)
      setSections(prev => prev.filter(s => s.id !== section.id))
      setVideos(prev => prev.filter(v => v.section_id !== section.id))
      if (activeSection === section.id) setActiveSection('all')
      toast.success('Section deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete')
    }
  }

  const handleMoveSection = async (section, direction) => {
    const sorted = [...sections].sort((a, b) => a.display_order - b.display_order)
    const idx = sorted.findIndex(s => s.id === section.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    try {
      await Promise.all([
        libraryService.updateSection(sorted[idx].id, { display_order: sorted[swapIdx].display_order }),
        libraryService.updateSection(sorted[swapIdx].id, { display_order: sorted[idx].display_order }),
      ])
      const updated = [...sections]
      const a = updated.find(s => s.id === sorted[idx].id)
      const b = updated.find(s => s.id === sorted[swapIdx].id)
      const tmp = a.display_order
      a.display_order = b.display_order
      b.display_order = tmp
      setSections(updated)
    } catch { toast.error('Failed to reorder') }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-pitch-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <MonitorPlay className="w-7 h-7 text-pitch-400" />
            Film Room
          </h1>
          <p className="text-secondary mt-1">Curate educational videos for your pupils</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddSection(true)} className="btn-secondary text-sm">
            <Plus className="w-4 h-4" /> Section
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Video
          </button>
        </div>
      </div>

      {/* Search + Section Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search videos..."
            className="input w-full pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveSection('all')}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              activeSection === 'all' ? 'bg-pitch-500 text-white' : 'bg-subtle text-secondary hover:bg-border-default'
            }`}
          >
            All ({videos.length})
          </button>
          {[...sections].sort((a, b) => a.display_order - b.display_order).map(s => {
            const count = videos.filter(v => v.section_id === s.id).length
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  activeSection === s.id ? 'bg-pitch-500 text-white' : 'bg-subtle text-secondary hover:bg-border-default'
                }`}
              >
                {s.name} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Video Grid */}
      {filteredVideos.length === 0 ? (
        <div className="text-center py-16">
          <Film className="w-12 h-12 text-tertiary mx-auto mb-4" />
          <p className="text-secondary">
            {videos.length === 0 ? 'No videos yet. Add your first video to get started.' : 'No videos match your filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map(video => (
            <VideoCard
              key={video.id}
              video={video}
              onToggleVisibility={() => handleToggleVisibility(video)}
              onToggleHighlight={() => handleToggleHighlight(video)}
              onDelete={() => handleDelete(video)}
              onEdit={() => setEditingVideo(video)}
              onShowWatchers={() => setShowWatchers(video)}
            />
          ))}
        </div>
      )}

      {/* Add Video Modal */}
      {showAddModal && (
        <AddVideoModal
          sections={sections}
          teamId={team?.id}
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); loadData() }}
        />
      )}

      {/* Edit Video Modal */}
      {editingVideo && (
        <EditVideoModal
          video={editingVideo}
          sections={sections}
          onClose={() => setEditingVideo(null)}
          onSaved={(updated) => {
            setVideos(prev => prev.map(v => v.id === updated.id ? { ...v, ...updated } : v))
            setEditingVideo(null)
          }}
        />
      )}

      {/* Watchers Drawer */}
      {showWatchers && (
        <WatcherDrawer video={showWatchers} onClose={() => setShowWatchers(null)} />
      )}

      {/* Add Section Modal */}
      {showAddSection && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAddSection(false)}>
          <div className="bg-subtle rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Add Custom Section</h3>
            <input
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="Section name"
              className="input w-full mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
            />
            <div className="flex gap-2">
              <button onClick={handleAddSection} className="btn-primary flex-1">Add</button>
              <button onClick={() => setShowAddSection(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Section Manager (collapsed by default) */}
      <details className="bg-subtle rounded-xl">
        <summary className="p-4 cursor-pointer text-secondary hover:text-white text-sm font-medium">
          Manage Sections
        </summary>
        <div className="px-4 pb-4 space-y-2">
          {[...sections].sort((a, b) => a.display_order - b.display_order).map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2 bg-card rounded-lg p-2">
              <span className="flex-1 text-sm text-white">{s.name}</span>
              {s.is_predefined && <span className="text-xs text-tertiary">Default</span>}
              <button onClick={() => handleMoveSection(s, 'up')} disabled={idx === 0}
                className="p-1 text-secondary hover:text-white disabled:opacity-30">
                <ChevronUp className="w-4 h-4" />
              </button>
              <button onClick={() => handleMoveSection(s, 'down')} disabled={idx === sections.length - 1}
                className="p-1 text-secondary hover:text-white disabled:opacity-30">
                <ChevronDown className="w-4 h-4" />
              </button>
              {!s.is_predefined && (
                <button onClick={() => handleDeleteSection(s)} className="p-1 text-alert-400 hover:text-alert-300">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

// =============================================
// Video Card
// =============================================

function VideoCard({ video, onToggleVisibility, onToggleHighlight, onDelete, onEdit, onShowWatchers }) {
  const thumbnail = video.source_type === 'youtube'
    ? `https://img.youtube.com/vi/${video.youtube_video_id}/mqdefault.jpg`
    : video.mux_playback_id
      ? `https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg?time=5`
      : null

  const isProcessing = video.source_type === 'mux' && video.mux_status !== 'ready'

  return (
    <div className={`bg-subtle rounded-xl overflow-hidden border transition-colors ${
      video.is_highlighted ? 'border-energy-500/50' : !video.is_visible ? 'border-border-strong opacity-60' : 'border-border-strong'
    }`}>
      {/* Thumbnail */}
      <div className="relative aspect-video bg-card">
        {thumbnail ? (
          <img src={thumbnail} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            {isProcessing ? (
              <Loader2 className="w-8 h-8 text-caution-400 animate-spin" />
            ) : (
              <Film className="w-8 h-8 text-tertiary" />
            )}
          </div>
        )}
        {video.is_highlighted && (
          <div className="absolute top-2 left-2 bg-energy-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3" /> Featured
          </div>
        )}
        {!video.is_visible && (
          <div className="absolute top-2 right-2 bg-card text-secondary text-xs px-2 py-0.5 rounded-full">
            Hidden
          </div>
        )}
        {video.source_type === 'youtube' && (
          <div className="absolute bottom-2 left-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            <Youtube className="w-3 h-3" /> YouTube
          </div>
        )}
        {isProcessing && (
          <div className="absolute inset-0 bg-card/70 flex items-center justify-center">
            <span className="text-sm text-caution-400">Processing...</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="text-white font-medium text-sm truncate">{video.title}</h3>
        <p className="text-xs text-secondary mt-1">{video.section_name}</p>
        {video.notes && <p className="text-xs text-tertiary mt-1 line-clamp-2">{video.notes}</p>}

        {/* Actions */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border-strong">
          <button
            onClick={onShowWatchers}
            className="text-xs text-secondary hover:text-pitch-400 flex items-center gap-1"
          >
            <Users className="w-3.5 h-3.5" />
            {video.watch_count !== undefined ? `${video.watch_count} watched` : 'Watchers'}
          </button>
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-1.5 text-secondary hover:text-white" title="Edit">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onToggleHighlight} className="p-1.5 text-secondary hover:text-energy-400" title="Feature">
              <Star className={`w-3.5 h-3.5 ${video.is_highlighted ? 'fill-energy-400 text-energy-400' : ''}`} />
            </button>
            <button onClick={onToggleVisibility} className="p-1.5 text-secondary hover:text-white" title={video.is_visible ? 'Hide' : 'Show'}>
              {video.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onDelete} className="p-1.5 text-secondary hover:text-alert-400" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================
// Add Video Modal
// =============================================

function AddVideoModal({ sections, teamId, onClose, onAdded }) {
  const [mode, setMode] = useState('youtube') // 'youtube' | 'upload'
  const [title, setTitle] = useState('')
  const [sectionId, setSectionId] = useState(sections[0]?.id || '')
  const [notes, setNotes] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [previewId, setPreviewId] = useState(null)
  const [saving, setSaving] = useState(false)

  const handlePreview = () => {
    const match = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
    if (match) setPreviewId(match[1])
    else toast.error('Could not parse YouTube URL')
  }

  const handleAddYouTube = async () => {
    if (!title.trim() || !youtubeUrl || !sectionId) return
    setSaving(true)
    try {
      await libraryService.addYouTubeVideo({ title: title.trim(), sectionId, notes, youtubeUrl })
      toast.success('Video added')
      onAdded()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add video')
    } finally {
      setSaving(false)
    }
  }

  const handleUploadComplete = () => {
    toast.success('Video uploaded - processing...')
    onAdded()
  }

  // Custom upload function for the Film Room
  const createLibraryUpload = async (data) => {
    return libraryService.createUpload({ title: title.trim(), sectionId, notes })
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 pt-[10vh] overflow-y-auto" onClick={onClose}>
      <div className="bg-subtle rounded-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border-strong">
          <h2 className="text-lg font-semibold text-white">Add Video</h2>
          <button onClick={onClose} className="p-1 text-secondary hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Mode Toggle */}
          <div className="flex bg-card rounded-lg p-1">
            <button
              onClick={() => setMode('youtube')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                mode === 'youtube' ? 'bg-border-default text-white' : 'text-secondary'
              }`}
            >
              <Youtube className="w-4 h-4" /> YouTube
            </button>
            <button
              onClick={() => setMode('upload')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                mode === 'upload' ? 'bg-border-default text-white' : 'text-secondary'
              }`}
            >
              <Upload className="w-4 h-4" /> Upload
            </button>
          </div>

          {/* Common fields */}
          <div>
            <label className="label">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input w-full" placeholder="e.g. Pressing from the front - City vs Arsenal" />
          </div>
          <div>
            <label className="label">Section</label>
            <select value={sectionId} onChange={e => setSectionId(e.target.value)} className="input w-full">
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input w-full" rows={2} placeholder="What should pupils look for?" />
          </div>

          {/* YouTube Mode */}
          {mode === 'youtube' && (
            <>
              <div>
                <label className="label">YouTube URL</label>
                <div className="flex gap-2">
                  <input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} className="input flex-1" placeholder="https://youtube.com/watch?v=..." />
                  <button onClick={handlePreview} className="btn-secondary text-sm">Preview</button>
                </div>
              </div>
              {previewId && (
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={`https://www.youtube.com/embed/${previewId}`}
                    className="w-full h-full"
                    allowFullScreen
                    title="Preview"
                  />
                </div>
              )}
              <button
                onClick={handleAddYouTube}
                disabled={!title.trim() || !youtubeUrl || !sectionId || saving}
                className="btn-primary w-full"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Video
              </button>
            </>
          )}

          {/* Upload Mode */}
          {mode === 'upload' && (
            <div>
              {!title.trim() || !sectionId ? (
                <p className="text-sm text-caution-400">Fill in title and section above first.</p>
              ) : (
                <VideoUpload
                  teamId={teamId}
                  createUploadFn={createLibraryUpload}
                  onUploadComplete={handleUploadComplete}
                  onCancel={onClose}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================
// Edit Video Modal
// =============================================

function EditVideoModal({ video, sections, onClose, onSaved }) {
  const [title, setTitle] = useState(video.title)
  const [notes, setNotes] = useState(video.notes || '')
  const [sectionId, setSectionId] = useState(video.section_id)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await libraryService.updateVideo(video.id, { title: title.trim(), notes, sectionId })
      onSaved(res.data)
      toast.success('Video updated')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-subtle rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-4">Edit Video</h3>
        <div className="space-y-3">
          <div>
            <label className="label">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="label">Section</label>
            <select value={sectionId} onChange={e => setSectionId(e.target.value)} className="input w-full">
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input w-full" rows={3} />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} disabled={saving || !title.trim()} className="btn-primary flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// =============================================
// Watcher Drawer
// =============================================

function WatcherDrawer({ video, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    libraryService.getWatchers(video.id)
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load watchers'))
      .finally(() => setLoading(false))
  }, [video.id])

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={onClose}>
      <div className="bg-subtle w-full max-w-sm h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-subtle border-b border-border-strong p-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">Who's Watched</h3>
            <p className="text-sm text-secondary truncate">{video.title}</p>
          </div>
          <button onClick={onClose} className="p-1 text-secondary hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 text-pitch-400 animate-spin" /></div>
        ) : data ? (
          <div className="p-4">
            <p className="text-sm text-secondary mb-4">
              {data.watched_count} of {data.total} pupils watched
            </p>
            <div className="space-y-2">
              {data.watchers.map(w => (
                <div key={w.pupil_id} className="flex items-center gap-3 py-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    w.watched ? 'bg-pitch-500/20 text-pitch-400' : 'bg-border-default text-tertiary'
                  }`}>
                    {w.watched ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">
                      {w.squad_number ? `#${w.squad_number} ` : ''}{w.name}
                    </p>
                    {w.watched_at && (
                      <p className="text-xs text-tertiary">
                        {new Date(w.watched_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
