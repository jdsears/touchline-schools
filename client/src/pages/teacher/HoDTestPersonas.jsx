import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { hodService } from '../../services/api'
import {
  Users, Shield, ShieldCheck, Eye,
  GraduationCap, Trophy, BookOpen, ClipboardCheck,
  Loader2, RefreshCw,
} from 'lucide-react'

const YEAR_COLORS = {
  7: 'bg-blue-500/20 text-blue-400',
  9: 'bg-purple-500/20 text-purple-400',
  11: 'bg-amber-500/20 text-amber-400',
  13: 'bg-emerald-500/20 text-emerald-400',
}

const HOUSE_COLORS = {
  Elm: 'bg-green-500/20 text-green-400',
  Oak: 'bg-yellow-500/20 text-yellow-400',
  Maple: 'bg-red-500/20 text-red-400',
}

function StatBadge({ icon: Icon, label, value, color = 'text-navy-300' }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className="text-navy-500">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  )
}

export default function HoDTestPersonas() {
  const [personas, setPersonas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function loadPersonas() {
    setLoading(true)
    setError(null)
    try {
      const res = await hodService.getTestPersonas()
      setPersonas(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load test personas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPersonas() }, [])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-pitch-400" />
            Test Personas
          </h1>
          <p className="text-sm text-navy-400 mt-1">
            Protected pupil profiles for QA testing and demos. These personas carry
            rich sporting data and survive demo resets.
          </p>
        </div>
        <button
          onClick={loadPersonas}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-navy-800 hover:bg-navy-700 text-navy-300 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && personas.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-navy-500" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && personas.length === 0 && (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-navy-600 mx-auto mb-3" />
          <p className="text-navy-400 text-sm">
            No test personas found. Run the demo seed to create them.
          </p>
          <code className="text-xs text-navy-500 mt-2 block">
            node server/db/demo-seed/index.js
          </code>
        </div>
      )}

      {/* Persona cards */}
      {personas.length > 0 && (
        <div className="space-y-4">
          {personas.map(p => (
            <div
              key={p.id}
              className="bg-navy-900 rounded-xl border border-navy-800 p-5 hover:border-navy-700 transition-colors"
            >
              {/* Top row: name, badges, link */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-navy-700 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {p.first_name?.[0]}{p.last_name?.[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">{p.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${YEAR_COLORS[p.year_group] || 'bg-navy-700 text-navy-300'}`}>
                        Year {p.year_group}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${HOUSE_COLORS[p.house] || 'bg-navy-700 text-navy-300'}`}>
                        {p.house} House
                      </span>
                      {p.protected_from_reset && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-pitch-600/20 text-pitch-400 text-xs font-medium">
                          <ShieldCheck className="w-3 h-3" />
                          Protected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Link
                  to={`/teacher/hod/pupils/${p.id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-lg text-sm transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View Profile
                </Link>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-4 pl-13">
                <StatBadge icon={ClipboardCheck} label="Observations" value={p.observation_count} color="text-blue-400" />
                <StatBadge icon={Trophy} label="Teams" value={p.team_count} color="text-amber-400" />
                <StatBadge icon={GraduationCap} label="Classes" value={p.class_count} color="text-purple-400" />
                <StatBadge icon={BookOpen} label="Assessments" value={p.assessment_count} color="text-emerald-400" />
                {p.sports && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Shield className="w-3.5 h-3.5 text-navy-400" />
                    <span className="text-navy-500">Sports</span>
                    <span className="text-navy-300 font-medium capitalize">{p.sports}</span>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="mt-3 pl-13">
                <span className="text-xs text-navy-600">{p.email}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info footer */}
      <div className="mt-8 bg-navy-900/50 rounded-xl border border-navy-800/50 p-4">
        <h3 className="text-sm font-medium text-navy-300 mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-navy-500" />
          About Test Personas
        </h3>
        <ul className="text-xs text-navy-500 space-y-1">
          <li>These personas are seeded by the demo-seed script with realistic sporting data.</li>
          <li>Each persona has a narrative arc of observations, assessments, and development notes.</li>
          <li>Protected personas survive demo tenant resets (protected_from_reset = true).</li>
          <li>Click "View Profile" to see the full pupil profile with all observations and data.</li>
        </ul>
      </div>
    </div>
  )
}
