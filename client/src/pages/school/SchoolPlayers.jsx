import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { clubService } from '../../services/api'
import { Search, Users, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ClubPlayers() {
  const { school } = useOutletContext()
  const [pupils, setPlayers] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    if (school?.id) {
      loadPlayers()
      loadTeams()
    }
  }, [school?.id])

  async function loadTeams() {
    try {
      const res = await clubService.getTeams(school.id)
      setTeams(res.data)
    } catch (err) {
      // non-critical
    }
  }

  async function loadPlayers() {
    try {
      const params = {}
      if (search) params.search = search
      if (teamFilter) params.team_id = teamFilter
      if (statusFilter) params.registration_status = statusFilter
      const res = await clubService.getPlayers(school.id, params)
      setPlayers(res.data)
    } catch (err) {
      toast.error('Failed to load pupils')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (school?.id) {
      const t = setTimeout(loadPlayers, 300)
      return () => clearTimeout(t)
    }
  }, [search, teamFilter, statusFilter])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">All Players</h1>
        <p className="text-navy-400 text-sm mt-1">{pupils.length} pupil{pupils.length !== 1 ? 's' : ''} across all teams</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
          <input
            type="text"
            placeholder="Search pupils..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
          />
        </div>
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
        >
          <option value="">All Teams</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name} {t.age_group ? `(${t.age_group})` : ''}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
        >
          <option value="">All Statuses</option>
          <option value="registered">Registered</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Players table */}
      {pupils.length === 0 ? (
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-8 text-center">
          <Users className="w-12 h-12 text-navy-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">No pupils found</h3>
          <p className="text-navy-400 text-sm">Players will appear here when they're registered with the school.</p>
        </div>
      ) : (
        <div className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-800">
                  <th className="text-left px-4 py-3 text-xs font-medium text-navy-400 uppercase">Pupil</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-navy-400 uppercase">Team</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-navy-400 uppercase">Age Group</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-navy-400 uppercase">Position</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-navy-400 uppercase">Guardian</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-navy-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {pupils.map((p) => (
                  <tr key={p.id} className="border-b border-navy-800/50 last:border-0 hover:bg-navy-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-navy-800 flex items-center justify-center text-xs font-medium text-navy-300">
                          {p.jersey_number || p.name?.charAt(0)}
                        </div>
                        <span className="text-sm text-white font-medium">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-navy-300">{p.team_name}</td>
                    <td className="px-4 py-3 text-sm text-navy-400">{p.age_group || '-'}</td>
                    <td className="px-4 py-3 text-sm text-navy-400">{p.position || '-'}</td>
                    <td className="px-4 py-3 text-sm text-navy-400">
                      {p.guardians && p.guardians.length > 0
                        ? p.guardians.map(g => g.name).join(', ')
                        : '-'
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        p.registration_status === 'registered' ? 'bg-pitch-600/20 text-pitch-400' :
                        p.registration_status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-alert-400/20 text-alert-400'
                      }`}>
                        {p.registration_status || 'registered'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
