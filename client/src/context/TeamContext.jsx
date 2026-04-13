import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { teamService } from '../services/api'

const TeamContext = createContext(null)

// Helper to determine if a color is light (needs dark text)
function isLightColor(hexColor) {
  if (!hexColor) return false
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  // Calculate relative luminance using sRGB
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6
}

export function TeamProvider({ children }) {
  const { user } = useAuth()
  const [team, setTeam] = useState(null)
  const [players, setPlayers] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(false)

  // Apply team branding colors to CSS variables
  useEffect(() => {
    if (team) {
      const root = document.documentElement
      const primary = team.primary_color || '#22C55E'
      const secondary = team.secondary_color || '#0F172A'
      const accent = team.accent_color || '#F97316'

      root.style.setProperty('--team-primary', primary)
      root.style.setProperty('--team-secondary', secondary)
      root.style.setProperty('--team-accent', accent)

      // Set contrast text colors for light backgrounds
      root.style.setProperty('--team-primary-text', isLightColor(primary) ? '#0F172A' : '#FFFFFF')
      root.style.setProperty('--team-accent-text', isLightColor(accent) ? '#0F172A' : '#FFFFFF')
    }
  }, [team])

  useEffect(() => {
    if (user?.team_id) {
      loadTeamData()
    } else {
      setTeam(null)
      setPlayers([])
      setMatches([])
    }
  }, [user?.team_id])
  
  async function loadTeamData() {
    setLoading(true)
    try {
      const [teamRes, playersRes, matchesRes] = await Promise.all([
        teamService.getTeam(user.team_id),
        teamService.getPlayers(user.team_id),
        teamService.getMatches(user.team_id),
      ])
      
      setTeam(teamRes.data)
      setPlayers(playersRes.data)
      setMatches(matchesRes.data)
    } catch (error) {
      console.error('Failed to load team data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  async function updateTeam(data) {
    try {
      const response = await teamService.updateTeam(user.team_id, data)
      setTeam(response.data)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  }
  
  async function addPlayer(data) {
    try {
      const response = await teamService.addPlayer(user.team_id, data)
      setPlayers(prev => [...prev, response.data])
      return { success: true, player: response.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  }
  
  async function updatePlayer(playerId, data) {
    try {
      const response = await teamService.updatePlayer(playerId, data)
      setPlayers(prev => prev.map(p => p.id === playerId ? response.data : p))
      return { success: true, player: response.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  }

  async function deletePlayer(playerId) {
    try {
      await teamService.deletePlayer(playerId)
      setPlayers(prev => prev.filter(p => p.id !== playerId))
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  }
  
  async function addMatch(data) {
    try {
      const response = await teamService.addMatch(user.team_id, data)
      setMatches(prev => [...prev, response.data])
      return { success: true, match: response.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  }
  
  async function deleteMatch(matchId) {
    try {
      await teamService.deleteMatch(matchId)
      setMatches(prev => prev.filter(m => m.id !== matchId))
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  }

  async function updateMatch(matchId, data) {
    try {
      const response = await teamService.updateMatch(matchId, data)
      setMatches(prev => prev.map(m => m.id === matchId ? response.data : m))
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  }
  
  // Get the effective end time of a match (kick-off + 2 hours)
  function getMatchEndTime(match) {
    const matchDate = new Date(match.date)
    if (match.time) {
      const [h, m] = match.time.split(':').map(Number)
      if (!isNaN(h)) matchDate.setHours(h, m || 0, 0, 0)
    }
    return new Date(matchDate.getTime() + 2 * 60 * 60 * 1000)
  }

  // Memoize computed match lists to avoid recalculating on every render
  const upcomingMatches = useMemo(() =>
    matches
      .filter(m => getMatchEndTime(m) >= new Date() && !m.result && m.goals_for === null)
      .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [matches]
  )

  const recentResults = useMemo(() =>
    matches
      .filter(m => m.result || m.goals_for !== null || getMatchEndTime(m) < new Date())
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [matches]
  )

  // Branding helpers
  const branding = useMemo(() => ({
    hubName: team?.hub_name || team?.name || 'Team Hub',
    teamName: team?.name || 'Team',
    ageGroup: team?.age_group || '',
    primaryColor: team?.primary_color || '#22C55E',
    secondaryColor: team?.secondary_color || '#0F172A',
    accentColor: team?.accent_color || '#F97316',
    logoUrl: team?.logo_url || null,
    faFulltimeUrl: team?.fa_fulltime_url || null,
    timezone: team?.timezone || 'Europe/London',
  }), [team])

  const value = useMemo(() => ({
    team,
    players,
    matches,
    upcomingMatches,
    recentResults,
    loading,
    branding,
    loadTeamData,
    updateTeam,
    addPlayer,
    updatePlayer,
    deletePlayer,
    addMatch,
    updateMatch,
    deleteMatch,
  }), [team, players, matches, upcomingMatches, recentResults, loading, branding])

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  )
}

export function useTeam() {
  const context = useContext(TeamContext)
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider')
  }
  return context
}

export { isLightColor }
