import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Trophy, Calendar, MapPin, Clock, Filter, ChevronRight, Loader2 } from 'lucide-react'
import api from '../services/api'

const SPORT_ICONS = { football: '⚽', rugby: '🏉', cricket: '🏏', hockey: '🏑', netball: '🤾' }

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function resultBadge(f) {
  if (f.score_for == null || f.score_against == null) return null
  const w = f.score_for > f.score_against ? 'W' : f.score_for < f.score_against ? 'L' : 'D'
  const colours = { W: 'bg-green-100 text-green-800', L: 'bg-red-100 text-red-800', D: 'bg-amber-100 text-amber-800' }
  return { label: w, score: `${f.score_for} - ${f.score_against}`, cls: colours[w] }
}

export default function PublicFixtures() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [school, setSchool] = useState(null)
  const [teams, setTeams] = useState([])
  const [fixtures, setFixtures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedFixture, setSelectedFixture] = useState(null)

  const teamFilter = searchParams.get('team') || ''
  const typeFilter = searchParams.get('type') || 'all'
  const sportFilter = searchParams.get('sport') || ''

  useEffect(() => { loadSite() }, [slug])
  useEffect(() => { if (school) loadFixtures() }, [school, teamFilter, typeFilter])

  async function loadSite() {
    try {
      const res = await api.get(`/public/sport/${slug}`)
      setSchool(res.data.school)
      setTeams(res.data.teams)
    } catch (err) {
      setError(err.response?.status === 403 ? 'Public fixtures are not enabled for this school.' : 'School not found.')
    } finally { setLoading(false) }
  }

  async function loadFixtures() {
    try {
      const params = {}
      if (teamFilter) params.teamId = teamFilter
      if (typeFilter !== 'all') params.type = typeFilter
      const res = await api.get(`/public/sport/${slug}/fixtures`, { params })
      setFixtures(res.data)
    } catch {}
  }

  async function loadDetail(matchId) {
    try {
      const res = await api.get(`/public/sport/${slug}/fixture/${matchId}`)
      setSelectedFixture(res.data)
    } catch {}
  }

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
  if (error) return <div className="min-h-screen bg-white flex items-center justify-center"><p className="text-gray-500">{error}</p></div>

  const sports = [...new Set(teams.map(t => t.sport))].sort()
  const displayTeams = sportFilter ? teams.filter(t => t.sport === sportFilter) : teams
  const displayFixtures = sportFilter ? fixtures.filter(f => f.sport === sportFilter) : fixtures

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm" style={{ borderBottomColor: school.primaryColor || '#1a365d' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          {school.logoUrl && <img src={school.logoUrl} alt="" className="w-10 h-10 rounded" />}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{school.name}</h1>
            <p className="text-sm text-gray-500">Sport Fixtures & Results</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'upcoming', 'results'].map(t => (
            <button key={t} onClick={() => setSearchParams(p => { p.set('type', t); return p })}
              className={`px-3 py-1.5 rounded-full text-sm ${typeFilter === t ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border hover:bg-gray-100'}`}>
              {t === 'all' ? 'All' : t === 'upcoming' ? 'Upcoming' : 'Results'}
            </button>
          ))}
          {sports.length > 1 && (
            <select value={sportFilter} onChange={e => setSearchParams(p => { p.set('sport', e.target.value); return p })}
              className="ml-2 px-3 py-1.5 rounded-full text-sm border bg-white text-gray-600">
              <option value="">All Sports</option>
              {sports.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          )}
          {displayTeams.length > 1 && (
            <select value={teamFilter} onChange={e => setSearchParams(p => { p.set('team', e.target.value); return p })}
              className="px-3 py-1.5 rounded-full text-sm border bg-white text-gray-600">
              <option value="">All Teams</option>
              {displayTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
        </div>

        {/* Fixture list */}
        <div className="space-y-2">
          {displayFixtures.length === 0 && (
            <p className="text-gray-400 text-center py-12">No fixtures to display.</p>
          )}
          {displayFixtures.map(f => {
            const result = resultBadge(f)
            return (
              <button key={f.id} onClick={() => loadDetail(f.id)}
                className="w-full bg-white rounded-lg border p-4 hover:shadow-md transition-shadow text-left flex items-center gap-4">
                <div className="text-2xl shrink-0">{SPORT_ICONS[f.sport] || '🏆'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{f.team_name}</span>
                    <span className="text-gray-400">vs</span>
                    <span className="font-medium text-gray-900">{f.opponent}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(f.date)}</span>
                    {f.match_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{f.match_time.slice(0, 5)}</span>}
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{f.home_away === 'home' ? 'Home' : 'Away'}</span>
                  </div>
                </div>
                {result ? (
                  <div className="text-right shrink-0">
                    <span className="text-lg font-bold text-gray-900">{result.score}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${result.cls}`}>{result.label}</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded shrink-0">Upcoming</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Fixture detail modal */}
      {selectedFixture && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedFixture(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500">{formatDate(selectedFixture.date)}{selectedFixture.match_time ? ` at ${selectedFixture.match_time.slice(0, 5)}` : ''}</p>
              <h2 className="text-xl font-bold text-gray-900 mt-1">
                {selectedFixture.home_away === 'home' ? selectedFixture.team_name : selectedFixture.opponent}
                {' vs '}
                {selectedFixture.home_away === 'home' ? selectedFixture.opponent : selectedFixture.team_name}
              </h2>
              {selectedFixture.score_for != null && (
                <p className="text-3xl font-bold text-gray-900 mt-2">{selectedFixture.score_for} - {selectedFixture.score_against}</p>
              )}
            </div>
            {selectedFixture.location && (
              <p className="text-sm text-gray-600 flex items-center gap-1.5 mb-2"><MapPin className="w-4 h-4" />{selectedFixture.location}</p>
            )}
            {selectedFixture.potm_name && (
              <p className="text-sm text-gray-600 mb-2"><Trophy className="w-4 h-4 inline text-amber-500" /> Player of the Match: {selectedFixture.potm_name}</p>
            )}
            {selectedFixture.match_report_text && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="font-semibold text-gray-900 mb-2">Match Report</h3>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{selectedFixture.match_report_text}</p>
              </div>
            )}
            <button onClick={() => setSelectedFixture(null)} className="mt-4 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm">Close</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t bg-white mt-12 py-6 text-center text-xs text-gray-400">
        Powered by MoonBoots Sports
      </footer>
    </div>
  )
}
