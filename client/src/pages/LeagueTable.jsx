import { useState, useEffect, useRef } from 'react'
import { useTeam } from '../context/TeamContext'
import { useAuth } from '../context/AuthContext'
import { leagueService } from '../services/api'
import api from '../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Trophy,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ExternalLink,
  Loader2,
  RefreshCw,
  Table as TableIcon,
  Upload,
  Image,
  Sparkles,
  List,
  LayoutGrid,
  Home,
  Plane,
  ChevronDown
} from 'lucide-react'

export default function LeagueTable() {
  const { user } = useAuth()
  const { team, branding } = useTeam()
  const [settings, setSettings] = useState(null)
  const [table, setTable] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importType, setImportType] = useState(null) // 'summary' or 'detailed'
  const [editingTeam, setEditingTeam] = useState(null)
  const [viewMode, setViewMode] = useState('summary') // 'summary' or 'detailed'

  const isManager = user?.role === 'manager' || user?.role === 'assistant'

  // Check if we have detailed stats (any team has home/away data)
  const hasDetailedStats = table.some(t => t.home_played > 0 || t.away_played > 0)

  useEffect(() => {
    if (team?.id) {
      loadLeagueData()
    }
  }, [team?.id])

  async function loadLeagueData() {
    setLoading(true)
    try {
      const [settingsRes, tableRes] = await Promise.all([
        leagueService.getSettings(team.id),
        leagueService.getTable(team.id)
      ])
      setSettings(settingsRes.data)
      setTable(tableRes.data)
    } catch (error) {
      console.error('Failed to load league data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings(data) {
    try {
      const response = await leagueService.updateSettings(team.id, data)
      setSettings(response.data)
      toast.success('Settings saved')
      setShowSettings(false)
    } catch (error) {
      toast.error('Failed to save settings')
    }
  }

  async function addTeamToTable(teamName, isOwnTeam = false) {
    try {
      const response = await leagueService.addTeamToTable(team.id, {
        team_name: teamName,
        is_own_team: isOwnTeam
      })
      setTable(prev => [...prev, response.data])
      toast.success('Team added')
      setShowAddTeam(false)
    } catch (error) {
      toast.error('Failed to add team')
    }
  }

  async function updateTeamStats(teamRecordId, data) {
    try {
      const response = await leagueService.updateTeamInTable(team.id, teamRecordId, data)
      setTable(prev => prev.map(t => t.id === teamRecordId ? response.data : t))
      setEditingTeam(null)
      toast.success('Stats updated')
    } catch (error) {
      toast.error('Failed to update stats')
    }
  }

  async function removeTeam(teamRecordId) {
    if (!confirm('Remove this team from the table?')) return
    try {
      await leagueService.removeTeamFromTable(team.id, teamRecordId)
      setTable(prev => prev.filter(t => t.id !== teamRecordId))
      toast.success('Team removed')
    } catch (error) {
      toast.error('Failed to remove team')
    }
  }

  // Sort table by points, then GD, then GF
  const sortedTable = [...table].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
    return b.goals_for - a.goals_for
  })

  // Settings Modal
  function SettingsModal() {
    const [formData, setFormData] = useState({
      league_name: settings?.league_name || '',
      season: settings?.season || '2024/25',
      division: settings?.division || '',
      fa_fulltime_table_url: settings?.fa_fulltime_table_url || '',
      use_fa_embed: settings?.use_fa_embed || false
    })

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={() => setShowSettings(false)}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="card w-full max-w-md"
          onClick={e => e.stopPropagation()}
        >
          <h2 className="text-xl font-display font-bold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            League Settings
          </h2>

          <div className="space-y-4">
            <div>
              <label className="label">League Name</label>
              <input
                type="text"
                className="input"
                value={formData.league_name}
                onChange={e => setFormData(prev => ({ ...prev, league_name: e.target.value }))}
                placeholder="e.g. MJPL Division 1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Season</label>
                <input
                  type="text"
                  className="input"
                  value={formData.season}
                  onChange={e => setFormData(prev => ({ ...prev, season: e.target.value }))}
                  placeholder="2024/25"
                />
              </div>
              <div>
                <label className="label">Division</label>
                <input
                  type="text"
                  className="input"
                  value={formData.division}
                  onChange={e => setFormData(prev => ({ ...prev, division: e.target.value }))}
                  placeholder="Division 1"
                />
              </div>
            </div>

            <div>
              <label className="label">FA Full-Time Table URL</label>
              <input
                type="url"
                className="input"
                value={formData.fa_fulltime_table_url}
                onChange={e => setFormData(prev => ({ ...prev, fa_fulltime_table_url: e.target.value }))}
                placeholder="https://fulltime.thefa.com/..."
              />
              <p className="text-xs text-navy-500 mt-1">
                Optional: Link to your league table on FA Full-Time
              </p>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-navy-800/50 border border-navy-700">
              <input
                type="checkbox"
                id="useEmbed"
                checked={formData.use_fa_embed}
                onChange={e => setFormData(prev => ({ ...prev, use_fa_embed: e.target.checked }))}
                className="w-4 h-4 rounded border-navy-600"
              />
              <label htmlFor="useEmbed" className="text-sm text-navy-300">
                Show FA Full-Time embed instead of manual table
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => saveSettings(formData)}
                className="btn-primary flex-1"
              >
                Save Settings
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  // Add Team Modal
  function AddTeamModal() {
    const [teamName, setTeamName] = useState('')
    const [isOwnTeam, setIsOwnTeam] = useState(false)

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={() => setShowAddTeam(false)}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="card w-full max-w-sm"
          onClick={e => e.stopPropagation()}
        >
          <h2 className="text-xl font-display font-bold text-white mb-4">Add Team</h2>

          <div className="space-y-4">
            <div>
              <label className="label">Team Name</label>
              <input
                type="text"
                className="input"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="e.g. Rival FC"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isOwnTeam"
                checked={isOwnTeam}
                onChange={e => setIsOwnTeam(e.target.checked)}
                className="w-4 h-4 rounded border-navy-600"
              />
              <label htmlFor="isOwnTeam" className="text-sm text-navy-300">
                This is our team
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAddTeam(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => addTeamToTable(teamName, isOwnTeam)}
                disabled={!teamName.trim()}
                className="btn-primary flex-1"
              >
                Add Team
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  // Import from Image Modal - supports both summary and detailed imports
  function ImportFromImageModal() {
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [extracting, setExtracting] = useState(false)
    const [extractedTable, setExtractedTable] = useState(null)
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
      setExtractedTable(null)

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
      if (file) {
        processFile(file)
      }
    }

    async function handleExtract() {
      if (!imageFile) return

      setExtracting(true)
      try {
        const formData = new FormData()
        formData.append('image', imageFile)

        // Use different endpoint based on import type
        const endpoint = importType === 'detailed'
          ? `/league/table/${team.id}/extract-detailed-from-image`
          : `/league/table/${team.id}/extract-from-image`

        const response = await api.post(endpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })

        setExtractedTable(response.data.table)
        toast.success(`Found ${response.data.count} teams`)
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to extract table from image')
        console.error(error)
      } finally {
        setExtracting(false)
      }
    }

    async function handleImport() {
      if (!extractedTable || extractedTable.length === 0) return

      setImporting(true)
      try {
        // Use different endpoint for detailed imports
        if (importType === 'detailed') {
          await api.post(`/league/table/${team.id}/detailed`, { table: extractedTable })
        } else {
          await leagueService.updateTable(team.id, extractedTable)
        }
        toast.success(`${extractedTable.length} teams imported`)
        setShowImportModal(false)
        setImportType(null)
        loadLeagueData()
      } catch (error) {
        toast.error('Failed to import table')
      } finally {
        setImporting(false)
      }
    }

    function closeModal() {
      setShowImportModal(false)
      setImportType(null)
      setExtractedTable(null)
      setImageFile(null)
      setImagePreview(null)
    }

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={closeModal}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="card w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-navy-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pitch-400" />
              <h2 className="text-xl font-display font-bold text-white">
                Import {importType === 'detailed' ? 'Detailed' : 'Summary'} Table from Image
              </h2>
            </div>
            <button
              onClick={closeModal}
              className="text-navy-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            {!extractedTable ? (
              <>
                <p className="text-navy-400 text-sm mb-4">
                  {importType === 'detailed' ? (
                    <>Upload a screenshot of a detailed league table with <span className="text-white">Home/Away breakdown</span> columns.</>
                  ) : (
                    <>Upload a screenshot of a summary league table with basic standings (P, W, D, L, Pts).</>
                  )}
                </p>

                {imagePreview ? (
                  <div className="mb-4">
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="League table"
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
                          Extracting {importType === 'detailed' ? 'detailed ' : ''}table...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Extract {importType === 'detailed' ? 'Detailed ' : ''}Table with AI
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
                    <p className="text-sm text-navy-400 mt-1">PNG, JPG up to 5MB</p>
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
                    Found {extractedTable.length} teams. This will replace your current table.
                  </p>
                  <button
                    onClick={() => {
                      setExtractedTable(null)
                      setImageFile(null)
                      setImagePreview(null)
                    }}
                    className="text-sm text-pitch-400 hover:text-pitch-300"
                  >
                    Try another image
                  </button>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-navy-800/50 text-left text-navy-400">
                        <th className="px-3 py-2">Pos</th>
                        <th className="px-3 py-2">Team</th>
                        <th className="px-3 py-2 text-center">P</th>
                        <th className="px-3 py-2 text-center">W</th>
                        <th className="px-3 py-2 text-center">D</th>
                        <th className="px-3 py-2 text-center">L</th>
                        {importType === 'detailed' && (
                          <>
                            <th className="px-3 py-2 text-center">GF</th>
                            <th className="px-3 py-2 text-center">GA</th>
                          </>
                        )}
                        <th className="px-3 py-2 text-center">GD</th>
                        <th className="px-3 py-2 text-center">Pts</th>
                        {importType === 'detailed' && (
                          <th className="px-3 py-2 text-center text-xs">H/A</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-800">
                      {extractedTable.map((teamRow, index) => (
                        <tr
                          key={index}
                          className={teamRow.is_own_team ? 'bg-pitch-500/10' : ''}
                        >
                          <td className="px-3 py-2 text-navy-400">{index + 1}</td>
                          <td className="px-3 py-2">
                            <span className={teamRow.is_own_team ? 'text-pitch-400 font-medium' : 'text-white'}>
                              {teamRow.team_name}
                              {teamRow.is_own_team && (
                                <span className="ml-2 text-xs bg-pitch-500/20 text-pitch-400 px-1.5 py-0.5 rounded">
                                  You
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-navy-300">{teamRow.played}</td>
                          <td className="px-3 py-2 text-center text-green-400">{teamRow.won}</td>
                          <td className="px-3 py-2 text-center text-yellow-400">{teamRow.drawn}</td>
                          <td className="px-3 py-2 text-center text-red-400">{teamRow.lost}</td>
                          {importType === 'detailed' && (
                            <>
                              <td className="px-3 py-2 text-center text-navy-300">{teamRow.goals_for}</td>
                              <td className="px-3 py-2 text-center text-navy-300">{teamRow.goals_against}</td>
                            </>
                          )}
                          <td className="px-3 py-2 text-center">
                            <span className={
                              teamRow.goal_difference > 0 ? 'text-green-400' :
                              teamRow.goal_difference < 0 ? 'text-red-400' :
                              'text-navy-400'
                            }>
                              {teamRow.goal_difference > 0 ? '+' : ''}{teamRow.goal_difference}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-white">{teamRow.points}</td>
                          {importType === 'detailed' && (
                            <td className="px-3 py-2 text-center text-xs text-navy-400">
                              {teamRow.home_won}-{teamRow.home_drawn}-{teamRow.home_lost} /
                              {teamRow.away_won}-{teamRow.away_drawn}-{teamRow.away_lost}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {extractedTable && (
            <div className="p-4 border-t border-navy-800 flex justify-between items-center">
              <p className="text-sm text-navy-400">
                {extractedTable.length} teams will be imported {importType === 'detailed' && 'with home/away stats'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="btn-primary"
                >
                  {importing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Import Table
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

  // Import Type Selection Modal
  function ImportTypeModal() {
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
          className="card w-full max-w-lg"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-navy-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-pitch-400" />
              <h2 className="text-xl font-display font-bold text-white">Import Table from Image</h2>
            </div>
            <button
              onClick={() => setShowImportModal(false)}
              className="text-navy-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <p className="text-navy-400 text-sm">
              Choose the type of league table you want to import:
            </p>

            <button
              onClick={() => setImportType('summary')}
              className="w-full p-4 rounded-lg border border-navy-700 hover:border-pitch-500 transition text-left group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-navy-800 flex items-center justify-center group-hover:bg-pitch-500/20">
                  <List className="w-5 h-5 text-navy-400 group-hover:text-pitch-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white group-hover:text-pitch-400">Summary Table</h3>
                  <p className="text-sm text-navy-400 mt-1">
                    Basic standings with P, W, D, L, GD, Pts columns
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setImportType('detailed')}
              className="w-full p-4 rounded-lg border border-navy-700 hover:border-energy-500 transition text-left group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-navy-800 flex items-center justify-center group-hover:bg-energy-500/20">
                  <LayoutGrid className="w-5 h-5 text-navy-400 group-hover:text-energy-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white group-hover:text-energy-400">Detailed Table</h3>
                  <p className="text-sm text-navy-400 mt-1">
                    Full breakdown with Home/Away stats (P, W, D, L, F, A for each)
                  </p>
                </div>
              </div>
            </button>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  // Edit Team Row
  function EditTeamRow({ teamRecord }) {
    const [stats, setStats] = useState({
      played: teamRecord.played,
      won: teamRecord.won,
      drawn: teamRecord.drawn,
      lost: teamRecord.lost,
      goals_for: teamRecord.goals_for,
      goals_against: teamRecord.goals_against
    })

    return (
      <tr className="bg-navy-800/50">
        <td className="px-4 py-3 text-navy-400">-</td>
        <td className="px-4 py-3">
          <span className={teamRecord.is_own_team ? 'text-pitch-400 font-medium' : 'text-white'}>
            {teamRecord.team_name}
          </span>
        </td>
        {['played', 'won', 'drawn', 'lost', 'goals_for', 'goals_against'].map(field => (
          <td key={field} className="px-2 py-3">
            <input
              type="number"
              min="0"
              className="w-12 bg-navy-700 border border-navy-600 rounded px-2 py-1 text-center text-white text-sm"
              value={stats[field]}
              onChange={e => setStats(prev => ({ ...prev, [field]: parseInt(e.target.value) || 0 }))}
            />
          </td>
        ))}
        <td className="px-4 py-3 text-navy-400">-</td>
        <td className="px-4 py-3 text-navy-400">-</td>
        <td className="px-4 py-3">
          <div className="flex gap-1">
            <button
              onClick={() => updateTeamStats(teamRecord.id, stats)}
              className="p-1 text-green-400 hover:bg-green-500/20 rounded"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEditingTeam(null)}
              className="p-1 text-red-400 hover:bg-red-500/20 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-pitch-500" />
      </div>
    )
  }

  // Show FA Full-Time Embed
  if (settings?.use_fa_embed && settings?.fa_fulltime_table_url) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
              <Trophy className="w-7 h-7 text-pitch-500" />
              {settings.league_name || 'League Table'}
            </h1>
            <p className="text-navy-400">
              {settings.division} • {settings.season}
            </p>
          </div>

          {isManager && (
            <button onClick={() => setShowSettings(true)} className="btn-secondary">
              <Settings className="w-5 h-5" />
              Settings
            </button>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-navy-400">Data from FA Full-Time</p>
            <a
              href={settings.fa_fulltime_table_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pitch-400 hover:text-pitch-300 text-sm flex items-center gap-1"
            >
              View on FA Full-Time
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div className="aspect-video bg-white rounded-lg overflow-hidden">
            <iframe
              src={settings.fa_fulltime_table_url}
              className="w-full h-full border-0"
              title="FA Full-Time League Table"
            />
          </div>
        </div>

        <AnimatePresence>
          {showSettings && <SettingsModal />}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <Trophy className="w-7 h-7 text-pitch-500" />
            {settings?.league_name || 'League Table'}
          </h1>
          <p className="text-navy-400">
            {settings?.division || branding.ageGroup} • {settings?.season || '2024/25'}
          </p>
        </div>

        {isManager && (
          <div className="flex gap-2">
            <button onClick={() => setShowImportModal(true)} className="btn-secondary">
              <Upload className="w-5 h-5" />
              Import from Image
            </button>
            <button onClick={() => setShowAddTeam(true)} className="btn-secondary">
              <Plus className="w-5 h-5" />
              Add Team
            </button>
            <button onClick={() => setShowSettings(true)} className="btn-secondary">
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </div>
        )}
      </div>

      {/* View Mode Toggle - only show if we have detailed stats */}
      {hasDetailedStats && sortedTable.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-navy-400">View:</span>
          <div className="flex rounded-lg border border-navy-700 overflow-hidden">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition ${
                viewMode === 'summary'
                  ? 'bg-pitch-500 text-white'
                  : 'bg-navy-800 text-navy-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
              Summary
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition ${
                viewMode === 'detailed'
                  ? 'bg-energy-500 text-white'
                  : 'bg-navy-800 text-navy-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Detailed
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {sortedTable.length > 0 ? (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            {viewMode === 'detailed' && hasDetailedStats ? (
              /* Detailed View with Home/Away breakdown */
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy-800/50 text-left text-navy-400">
                    <th className="px-3 py-3 font-medium" rowSpan={2}>Pos</th>
                    <th className="px-3 py-3 font-medium" rowSpan={2}>Team</th>
                    <th className="px-2 py-2 text-center border-l border-navy-700" colSpan={6}>
                      <div className="flex items-center justify-center gap-1">
                        <Home className="w-3 h-3" />
                        Home
                      </div>
                    </th>
                    <th className="px-2 py-2 text-center border-l border-navy-700" colSpan={6}>
                      <div className="flex items-center justify-center gap-1">
                        <Plane className="w-3 h-3" />
                        Away
                      </div>
                    </th>
                    <th className="px-2 py-2 text-center border-l border-navy-700" colSpan={4}>Overall</th>
                    {isManager && <th className="px-3 py-3 font-medium" rowSpan={2}></th>}
                  </tr>
                  <tr className="bg-navy-800/30 text-xs text-navy-400">
                    <th className="px-2 py-2 text-center border-l border-navy-700">P</th>
                    <th className="px-2 py-2 text-center">W</th>
                    <th className="px-2 py-2 text-center">D</th>
                    <th className="px-2 py-2 text-center">L</th>
                    <th className="px-2 py-2 text-center">F</th>
                    <th className="px-2 py-2 text-center">A</th>
                    <th className="px-2 py-2 text-center border-l border-navy-700">P</th>
                    <th className="px-2 py-2 text-center">W</th>
                    <th className="px-2 py-2 text-center">D</th>
                    <th className="px-2 py-2 text-center">L</th>
                    <th className="px-2 py-2 text-center">F</th>
                    <th className="px-2 py-2 text-center">A</th>
                    <th className="px-2 py-2 text-center border-l border-navy-700">W</th>
                    <th className="px-2 py-2 text-center">D</th>
                    <th className="px-2 py-2 text-center">GD</th>
                    <th className="px-2 py-2 text-center">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800">
                  {sortedTable.map((teamRecord, index) => (
                    <tr
                      key={teamRecord.id}
                      className={`hover:bg-navy-800/30 ${
                        teamRecord.is_own_team ? 'bg-pitch-500/10' : ''
                      }`}
                    >
                      <td className="px-3 py-2">
                        <span className={`font-medium ${
                          index === 0 ? 'text-yellow-400' :
                          index < 3 ? 'text-pitch-400' :
                          index >= sortedTable.length - 2 ? 'text-red-400' :
                          'text-navy-300'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={teamRecord.is_own_team ? 'text-pitch-400 font-medium' : 'text-white'}>
                          {teamRecord.team_name}
                          {teamRecord.is_own_team && (
                            <span className="ml-2 text-xs bg-pitch-500/20 text-pitch-400 px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </span>
                      </td>
                      {/* Home Stats */}
                      <td className="px-2 py-2 text-center text-navy-300 border-l border-navy-700">{teamRecord.home_played || 0}</td>
                      <td className="px-2 py-2 text-center text-green-400">{teamRecord.home_won || 0}</td>
                      <td className="px-2 py-2 text-center text-yellow-400">{teamRecord.home_drawn || 0}</td>
                      <td className="px-2 py-2 text-center text-red-400">{teamRecord.home_lost || 0}</td>
                      <td className="px-2 py-2 text-center text-navy-300">{teamRecord.home_goals_for || 0}</td>
                      <td className="px-2 py-2 text-center text-navy-300">{teamRecord.home_goals_against || 0}</td>
                      {/* Away Stats */}
                      <td className="px-2 py-2 text-center text-navy-300 border-l border-navy-700">{teamRecord.away_played || 0}</td>
                      <td className="px-2 py-2 text-center text-green-400">{teamRecord.away_won || 0}</td>
                      <td className="px-2 py-2 text-center text-yellow-400">{teamRecord.away_drawn || 0}</td>
                      <td className="px-2 py-2 text-center text-red-400">{teamRecord.away_lost || 0}</td>
                      <td className="px-2 py-2 text-center text-navy-300">{teamRecord.away_goals_for || 0}</td>
                      <td className="px-2 py-2 text-center text-navy-300">{teamRecord.away_goals_against || 0}</td>
                      {/* Overall */}
                      <td className="px-2 py-2 text-center text-green-400 border-l border-navy-700">{teamRecord.won}</td>
                      <td className="px-2 py-2 text-center text-yellow-400">{teamRecord.drawn}</td>
                      <td className="px-2 py-2 text-center">
                        <span className={
                          teamRecord.goal_difference > 0 ? 'text-green-400' :
                          teamRecord.goal_difference < 0 ? 'text-red-400' :
                          'text-navy-400'
                        }>
                          {teamRecord.goal_difference > 0 ? '+' : ''}{teamRecord.goal_difference}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center font-bold text-white">{teamRecord.points}</td>
                      {isManager && (
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingTeam(teamRecord.id)}
                              className="p-1 text-navy-400 hover:text-white hover:bg-navy-700 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeTeam(teamRecord.id)}
                              className="p-1 text-navy-400 hover:text-red-400 hover:bg-red-500/20 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              /* Summary View */
              <table className="w-full">
                <thead>
                  <tr className="bg-navy-800/50 text-left text-sm text-navy-400">
                    <th className="px-4 py-3 font-medium">Pos</th>
                    <th className="px-4 py-3 font-medium">Team</th>
                    <th className="px-4 py-3 font-medium text-center">P</th>
                    <th className="px-4 py-3 font-medium text-center">W</th>
                    <th className="px-4 py-3 font-medium text-center">D</th>
                    <th className="px-4 py-3 font-medium text-center">L</th>
                    <th className="px-4 py-3 font-medium text-center">GF</th>
                    <th className="px-4 py-3 font-medium text-center">GA</th>
                    <th className="px-4 py-3 font-medium text-center">GD</th>
                    <th className="px-4 py-3 font-medium text-center">Pts</th>
                    {isManager && <th className="px-4 py-3 font-medium"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800">
                  {sortedTable.map((teamRecord, index) => (
                    editingTeam === teamRecord.id ? (
                      <EditTeamRow key={teamRecord.id} teamRecord={teamRecord} />
                    ) : (
                      <tr
                        key={teamRecord.id}
                        className={`hover:bg-navy-800/30 ${
                          teamRecord.is_own_team ? 'bg-pitch-500/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className={`font-medium ${
                            index === 0 ? 'text-yellow-400' :
                            index < 3 ? 'text-pitch-400' :
                            index >= sortedTable.length - 2 ? 'text-red-400' :
                            'text-navy-300'
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={teamRecord.is_own_team ? 'text-pitch-400 font-medium' : 'text-white'}>
                            {teamRecord.team_name}
                            {teamRecord.is_own_team && (
                              <span className="ml-2 text-xs bg-pitch-500/20 text-pitch-400 px-2 py-0.5 rounded">
                                Your Team
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-navy-300">{teamRecord.played}</td>
                        <td className="px-4 py-3 text-center text-green-400">{teamRecord.won}</td>
                        <td className="px-4 py-3 text-center text-yellow-400">{teamRecord.drawn}</td>
                        <td className="px-4 py-3 text-center text-red-400">{teamRecord.lost}</td>
                        <td className="px-4 py-3 text-center text-navy-300">{teamRecord.goals_for}</td>
                        <td className="px-4 py-3 text-center text-navy-300">{teamRecord.goals_against}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={
                            teamRecord.goal_difference > 0 ? 'text-green-400' :
                            teamRecord.goal_difference < 0 ? 'text-red-400' :
                            'text-navy-400'
                          }>
                            {teamRecord.goal_difference > 0 ? '+' : ''}{teamRecord.goal_difference}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-white">{teamRecord.points}</span>
                        </td>
                        {isManager && (
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button
                                onClick={() => setEditingTeam(teamRecord.id)}
                                className="p-1 text-navy-400 hover:text-white hover:bg-navy-700 rounded"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => removeTeam(teamRecord.id)}
                                className="p-1 text-navy-400 hover:text-red-400 hover:bg-red-500/20 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <TableIcon className="w-12 h-12 mx-auto mb-4 text-navy-600" />
          <p className="text-navy-400 mb-4">No league table set up yet</p>
          {isManager && (
            <div className="flex flex-col items-center gap-3">
              <button onClick={() => setShowImportModal(true)} className="btn-primary">
                <Upload className="w-5 h-5" />
                Import from Screenshot
              </button>
              <div className="flex gap-3">
                <button onClick={() => setShowAddTeam(true)} className="btn-secondary">
                  <Plus className="w-5 h-5" />
                  Add Teams Manually
                </button>
                <button onClick={() => setShowSettings(true)} className="btn-secondary">
                  <ExternalLink className="w-5 h-5" />
                  Link FA Full-Time
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FA Full-Time Link */}
      {settings?.fa_fulltime_table_url && !settings?.use_fa_embed && (
        <div className="mt-4 text-center">
          <a
            href={settings.fa_fulltime_table_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-pitch-400 hover:text-pitch-300 text-sm flex items-center justify-center gap-1"
          >
            View official table on FA Full-Time
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showSettings && <SettingsModal />}
        {showAddTeam && <AddTeamModal />}
        {showImportModal && !importType && <ImportTypeModal />}
        {showImportModal && importType && <ImportFromImageModal />}
      </AnimatePresence>
    </div>
  )
}
