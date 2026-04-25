import { useState, useEffect, createContext, useContext } from 'react'
import api from '../services/api'

const PupilProfileContext = createContext(null)

/**
 * Provider that fetches and caches the pupil's own profile data.
 * Wrap the Sports Lounge layout with this so all child components
 * can call usePupilProfile() without redundant API calls.
 */
export function PupilProfileProvider({ children }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/pupils/me')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <PupilProfileContext.Provider value={{ ...data, loading }}>
      {children}
    </PupilProfileContext.Provider>
  )
}

/**
 * Access the pupil's own profile. Returns:
 *   { pupil, sports, teams, teachingGroups, loading }
 */
export function usePupilProfile() {
  const ctx = useContext(PupilProfileContext)
  if (!ctx) return { pupil: null, sports: [], teams: [], teachingGroups: [], loading: true }
  return ctx
}
