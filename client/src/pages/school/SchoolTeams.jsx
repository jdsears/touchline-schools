import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { clubService } from '../../services/api'
import { Plus, Users, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'

// Map age groups to recommended team format (FA guidelines)
const AGE_GROUP_FORMAT_MAP = {
  'U7': 5, 'U8': 5,
  'U9': 7, 'U10': 7,
  'U11': 9, 'U12': 9,
  'U13': 11, 'U14': 11, 'U15': 11, 'U16': 11, 'U17': 11, 'U18': 11,
  'Adult': 11,
}

export default function ClubTeams() {
  const { school, myRole } = useOutletContext()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', age_group: '', team_type: 'boys', team_format: 11 })

  useEffect(() => {
    if (school?.id) loadTeams()
  }, [school?.id])

  async function loadTeams() {
    try {
      const res = await clubService.getTeams(school.id)
      setTeams(res.data)
    } catch (err) {
      toast.error('Failed to load teams')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    try {
      await clubService.createTeam(school.id, form)
      toast.success('Team created')
      setShowAdd(false)
      setForm({ name: '', age_group: '', team_type: 'boys', team_format: 11 })
      loadTeams()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create team')
    }
  }

  const canManage = ['owner', 'admin'].includes(myRole)

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Teams</h1>
          <p className="text-navy-400 text-sm mt-1">{teams.length} team{teams.length !== 1 ? 's' : ''}</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Team
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleCreate} className="bg-navy-900 border border-navy-800 rounded-xl p-4 space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-navy-400 mb-1">Team Name *</label>
              <input
                type="text" required value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                placeholder="e.g. U13 Blues"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Age Group</label>
              <select
                value={form.age_group}
                onChange={(e) => {
                  const ageGroup = e.target.value
                  const recommendedFormat = AGE_GROUP_FORMAT_MAP[ageGroup]
                  setForm(f => ({
                    ...f,
                    age_group: ageGroup,
                    ...(recommendedFormat ? { team_format: recommendedFormat } : {}),
                  }))
                }}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              >
                <option value="">Select age group</option>
                {['U7','U8','U9','U10','U11','U12','U13','U14','U15','U16','U17','U18','Adult'].map(age => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Type</label>
              <select
                value={form.team_type}
                onChange={(e) => setForm(f => ({ ...f, team_type: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              >
                <option value="boys">Boys</option>
                <option value="girls">Girls</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Format</label>
              <select
                value={form.team_format}
                onChange={(e) => setForm(f => ({ ...f, team_format: parseInt(e.target.value) }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              >
                <option value={11}>11-a-side</option>
                <option value={9}>9-a-side</option>
                <option value={7}>7-a-side</option>
                <option value={5}>5-a-side</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-navy-400 hover:text-white">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm">Create Team</button>
          </div>
        </form>
      )}

      {/* Teams grid */}
      {teams.length === 0 ? (
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-8 text-center">
          <Building2 className="w-12 h-12 text-navy-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">No teams yet</h3>
          <p className="text-navy-400 text-sm">Create your first team to get started.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div key={team.id} className="bg-navy-900 border border-navy-800 rounded-xl p-5 hover:border-navy-700 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{team.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {team.age_group && (
                      <span className="text-xs bg-navy-800 text-navy-300 px-2 py-0.5 rounded-full">{team.age_group}</span>
                    )}
                    {team.team_type && (
                      <span className="text-xs bg-navy-800 text-navy-300 px-2 py-0.5 rounded-full capitalize">{team.team_type}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs bg-navy-800 text-navy-400 px-2 py-1 rounded-full">
                  {team.team_format || 11}v{team.team_format || 11}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-navy-400">
                <Users className="w-4 h-4" />
                <span>{team.player_count || 0} pupil{(team.player_count || 0) !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
