import { useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTeam } from '../context/TeamContext'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Plus,
  Search,
  Filter,
  ChevronRight,
  User,
  X,
  Loader2,
  Image,
  Sparkles,
  Upload,
  Check,
  Calendar,
  Mail,
} from 'lucide-react'
import toast from 'react-hot-toast'

const positions = {
  GK: { label: 'Goalkeeper', color: 'caution' },
  CB: { label: 'Centre Back', color: 'blue' },
  LB: { label: 'Left Back', color: 'blue' },
  RB: { label: 'Right Back', color: 'blue' },
  CDM: { label: 'Defensive Mid', color: 'pitch' },
  CM: { label: 'Central Mid', color: 'pitch' },
  CAM: { label: 'Attacking Mid', color: 'pitch' },
  LM: { label: 'Left Mid', color: 'pitch' },
  RM: { label: 'Right Mid', color: 'pitch' },
  LW: { label: 'Left Wing', color: 'alert' },
  RW: { label: 'Right Wing', color: 'alert' },
  ST: { label: 'Striker', color: 'alert' },
  CF: { label: 'Centre Forward', color: 'alert' },
}

export default function Players() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { team, players, addPlayer, loading, loadTeamData } = useTeam()

  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(searchParams.get('new') === 'true')
  const [showImportModal, setShowImportModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    squadNumber: '',
    dob: '',
    positions: [],
    parentContact: '',
    notes: '',
  })
  
  // Filter players
  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(search.toLowerCase())
    const matchesPosition = !positionFilter || player.positions?.includes(positionFilter)
    return matchesSearch && matchesPosition
  })
  
  // Group by position
  const allPositions = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF']
  const grouped = {
    GK: filteredPlayers.filter(p => p.positions?.includes('GK')),
    DEF: filteredPlayers.filter(p => ['CB', 'LB', 'RB'].some(pos => p.positions?.includes(pos))),
    MID: filteredPlayers.filter(p => ['CDM', 'CM', 'CAM', 'LM', 'RM'].some(pos => p.positions?.includes(pos))),
    FWD: filteredPlayers.filter(p => ['LW', 'RW', 'ST', 'CF'].some(pos => p.positions?.includes(pos))),
    UNASSIGNED: filteredPlayers.filter(p => !p.positions || p.positions.length === 0 || !p.positions.some(pos => allPositions.includes(pos))),
  }
  
  async function handleAddPlayer(e) {
    e.preventDefault()
    setSaving(true)
    
    const result = await addPlayer(newPlayer)
    
    if (result.success) {
      toast.success('Player added!')
      setShowAddModal(false)
      setSearchParams({})
      setNewPlayer({ name: '', squadNumber: '', dob: '', positions: [], parentContact: '', notes: '' })
    } else {
      toast.error(result.error || 'Failed to add player')
    }
    
    setSaving(false)
  }
  
  function togglePosition(pos) {
    setNewPlayer(prev => ({
      ...prev,
      positions: prev.positions.includes(pos)
        ? prev.positions.filter(p => p !== pos)
        : prev.positions.length >= 3
          ? prev.positions
          : [...prev.positions, pos]
    }))
  }
  
  function getPositionBadgeClass(pos) {
    const config = positions[pos]
    if (!config) return 'badge-navy'
    return `badge-${config.color}`
  }
  
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-white mb-1">Players</h1>
          <p className="text-navy-400">{players.length} players in your squad</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="btn-secondary"
          >
            <Sparkles className="w-5 h-5" />
            Import from Image
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <Plus className="w-5 h-5" />
            Add Player
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players..."
            className="input pl-10"
          />
        </div>
        
        <select
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          className="input w-full sm:w-48"
        >
          <option value="">All Positions</option>
          {Object.entries(positions).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>
      
      {/* Player List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-pitch-400" />
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 text-navy-600 mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-white mb-2">
            {players.length === 0 ? 'No players yet' : 'No players match your filters'}
          </h3>
          <p className="text-navy-400 mb-6">
            {players.length === 0
              ? 'Add your first player to get started'
              : 'Try adjusting your search or filters'
            }
          </p>
          {players.length === 0 && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              <Plus className="w-5 h-5" />
              Add Player
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* By position groups */}
          {[
            { key: 'GK', label: 'Goalkeepers', players: grouped.GK },
            { key: 'DEF', label: 'Defenders', players: grouped.DEF },
            { key: 'MID', label: 'Midfielders', players: grouped.MID },
            { key: 'FWD', label: 'Forwards', players: grouped.FWD },
            { key: 'UNASSIGNED', label: 'Unassigned', players: grouped.UNASSIGNED },
          ].map(group => group.players.length > 0 && (
            <div key={group.key}>
              <h2 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${group.key === 'UNASSIGNED' ? 'bg-navy-500' : 'bg-pitch-500'}`} />
                {group.label} ({group.players.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      to={`/players/${player.id}`}
                      className="player-card group"
                    >
                      <div className="player-avatar">
                        {player.squad_number || player.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate group-hover:text-pitch-400 transition-colors">
                          {player.squad_number && <span className="text-navy-400 mr-1">#{player.squad_number}</span>}
                          {player.name}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {player.positions?.slice(0, 3).map(pos => (
                            <span key={pos} className={getPositionBadgeClass(pos)}>
                              {pos}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-navy-600 group-hover:text-navy-400 transition-colors" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add Player Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-navy-800 flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-white">Add Player</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-navy-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleAddPlayer} className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="label">Player Name *</label>
                    <input
                      type="text"
                      value={newPlayer.name}
                      onChange={(e) => setNewPlayer(prev => ({ ...prev, name: e.target.value }))}
                      className="input"
                      placeholder="John Smith"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Squad #</label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={newPlayer.squadNumber}
                      onChange={(e) => setNewPlayer(prev => ({ ...prev, squadNumber: e.target.value }))}
                      className="input text-center"
                      placeholder="7"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Date of Birth</label>
                  <input
                    type="date"
                    value={newPlayer.dob}
                    onChange={(e) => setNewPlayer(prev => ({ ...prev, dob: e.target.value }))}
                    className="input"
                  />
                </div>
                
                <div>
                  <label className="label">Positions ({newPlayer.positions.length}/3)</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(positions).map(([key, { label }]) => {
                      const isSelected = newPlayer.positions.includes(key)
                      const isDisabled = !isSelected && newPlayer.positions.length >= 3
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => togglePosition(key)}
                          disabled={isDisabled}
                          className={`
                            px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                            ${isSelected
                              ? 'bg-pitch-600 text-white'
                              : isDisabled
                                ? 'bg-navy-800 text-navy-600 cursor-not-allowed opacity-50'
                                : 'bg-navy-800 text-navy-400 hover:text-white'
                            }
                          `}
                        >
                          {key}
                        </button>
                      )
                    })}
                  </div>
                </div>
                
                <div>
                  <label className="label">Parent/Guardian Contact</label>
                  <input
                    type="text"
                    value={newPlayer.parentContact}
                    onChange={(e) => setNewPlayer(prev => ({ ...prev, parentContact: e.target.value }))}
                    className="input"
                    placeholder="Email or phone"
                  />
                </div>
                
                <div>
                  <label className="label">Notes</label>
                  <textarea
                    value={newPlayer.notes}
                    onChange={(e) => setNewPlayer(prev => ({ ...prev, notes: e.target.value }))}
                    className="input"
                    rows={3}
                    placeholder="Any additional notes about this player..."
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add Player'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Import from Image Modal */}
        {showImportModal && <ImportFromImageModal />}
      </AnimatePresence>
    </div>
  )

  // Import from Image Modal
  function ImportFromImageModal() {
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [extracting, setExtracting] = useState(false)
    const [extractedPlayers, setExtractedPlayers] = useState(null)
    const [selectedPlayers, setSelectedPlayers] = useState([])
    const [importing, setImporting] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef(null)

    function handleImageSelect(e) {
      const file = e.target.files?.[0]
      if (!file) return
      processFile(file)
    }

    function processFile(file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file')
        return
      }
      setImageFile(file)
      setExtractedPlayers(null)
      setSelectedPlayers([])
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target.result)
      reader.readAsDataURL(file)
    }

    function handleDragOver(e) {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
    }

    function handleDragLeave(e) {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
    }

    function handleDrop(e) {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) processFile(file)
    }

    async function handleExtract() {
      if (!imageFile) return

      setExtracting(true)
      try {
        const formData = new FormData()
        formData.append('image', imageFile)

        const response = await api.post(`/teams/${team.id}/players/extract-from-image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })

        setExtractedPlayers(response.data.players)
        setSelectedPlayers(response.data.players.map((_, i) => i))
        toast.success(`Found ${response.data.count} players`)
      } catch (error) {
        toast.error('Failed to extract players from image')
        console.error(error)
      } finally {
        setExtracting(false)
      }
    }

    function togglePlayer(index) {
      setSelectedPlayers(prev =>
        prev.includes(index)
          ? prev.filter(i => i !== index)
          : [...prev, index]
      )
    }

    async function handleImport() {
      if (selectedPlayers.length === 0) return

      setImporting(true)
      try {
        const playersToImport = selectedPlayers.map(i => extractedPlayers[i])
        await api.post(`/teams/${team.id}/players/bulk`, { players: playersToImport })

        toast.success(`${playersToImport.length} players imported`)
        setShowImportModal(false)
        loadTeamData()
      } catch (error) {
        toast.error('Failed to import players')
      } finally {
        setImporting(false)
      }
    }

    function formatDate(dateStr) {
      if (!dateStr) return 'Unknown'
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    function calculateAge(dateStr) {
      if (!dateStr) return null
      const dob = new Date(dateStr)
      const today = new Date()
      let age = today.getFullYear() - dob.getFullYear()
      const monthDiff = today.getMonth() - dob.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--
      }
      return age
    }

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={() => setShowImportModal(false)}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="card w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-navy-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pitch-400" />
              <h2 className="text-xl font-display font-bold text-white">Import Players from Image</h2>
            </div>
            <button
              onClick={() => setShowImportModal(false)}
              className="text-navy-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            {!extractedPlayers ? (
              <>
                <p className="text-navy-400 text-sm mb-4">
                  Upload a screenshot of your player list or roster. AI will extract player names, dates of birth, and parent contact information.
                </p>

                {imagePreview ? (
                  <div className="mb-4">
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Player list"
                        className="w-full rounded-lg border border-navy-700 max-h-64 object-contain bg-navy-900"
                      />
                      <button
                        onClick={() => {
                          setImageFile(null)
                          setImagePreview(null)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    <button
                      onClick={handleExtract}
                      disabled={extracting}
                      className="btn-primary w-full mt-4"
                    >
                      {extracting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Extracting players...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Extract Players with AI
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <label
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`block w-full p-8 border-2 border-dashed rounded-lg transition cursor-pointer text-center ${
                      isDragging
                        ? 'border-pitch-500 bg-pitch-500/10'
                        : 'border-navy-600 hover:border-pitch-500'
                    }`}
                  >
                    <Image className={`w-12 h-12 mx-auto mb-2 ${isDragging ? 'text-pitch-400' : 'text-navy-500'}`} />
                    <p className="text-white font-medium">
                      {isDragging ? 'Drop image here' : 'Click or drag & drop image'}
                    </p>
                    <p className="text-sm text-navy-400 mt-1">PNG, JPG up to 10MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-navy-400 text-sm">
                    Found {extractedPlayers.length} players. Select which to import.
                  </p>
                  <button
                    onClick={() => {
                      setExtractedPlayers(null)
                      setImageFile(null)
                      setImagePreview(null)
                    }}
                    className="text-sm text-pitch-400 hover:text-pitch-300"
                  >
                    Try another image
                  </button>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {extractedPlayers.map((player, index) => (
                    <div
                      key={index}
                      onClick={() => togglePlayer(index)}
                      className={`p-3 rounded-lg cursor-pointer transition border ${
                        selectedPlayers.includes(index)
                          ? 'bg-pitch-600/20 border-pitch-500'
                          : 'bg-navy-800/50 border-navy-700 hover:border-navy-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          selectedPlayers.includes(index)
                            ? 'bg-pitch-500 border-pitch-500'
                            : 'border-navy-500'
                        }`}>
                          {selectedPlayers.includes(index) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white">{player.name}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-navy-400">
                            {player.dateOfBirth && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDate(player.dateOfBirth)}
                                {calculateAge(player.dateOfBirth) && (
                                  <span className="text-navy-500">({calculateAge(player.dateOfBirth)} yrs)</span>
                                )}
                              </span>
                            )}
                            {player.parentEmail && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5" />
                                {player.parentName || player.parentEmail}
                              </span>
                            )}
                          </div>
                          {player.secondaryParentName && (
                            <p className="text-xs text-navy-500 mt-1">
                              + {player.secondaryParentName}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {extractedPlayers && (
            <div className="p-4 border-t border-navy-800 flex items-center justify-between">
              <p className="text-sm text-navy-400">
                {selectedPlayers.length} of {extractedPlayers.length} selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || selectedPlayers.length === 0}
                  className="btn-primary"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Import {selectedPlayers.length} Players
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    )
  }
}
