import { useState, useEffect } from 'react'
import { TrendingUp, Award } from 'lucide-react'
import api from '../../services/api'
import { useAgeMode } from '../../hooks/useAgeMode'

const GRADE_COLOURS = {
  'Exc': { bg: 'bg-green-500', w: '100%', label: 'Exceeding' },
  'Sec': { bg: 'bg-blue-500', w: '75%', label: 'Secure' },
  'Dev': { bg: 'bg-amber-500', w: '50%', label: 'Developing' },
  'Eme': { bg: 'bg-orange-500', w: '30%', label: 'Emerging' },
  'A': { bg: 'bg-green-500', w: '90%', label: 'Grade A' },
  'B': { bg: 'bg-blue-500', w: '75%', label: 'Grade B' },
  'C': { bg: 'bg-amber-500', w: '55%', label: 'Grade C' },
}

const SPORT_EMOJI = {
  football: '⚽', rugby: '🏉', cricket: '🏏', hockey: '🏑',
  netball: '🤾', athletics: '🏃', swimming: '🏊',
}

function AssessmentRow({ assessment }) {
  const grade = GRADE_COLOURS[assessment.grade] || { bg: 'bg-navy-600', w: '40%', label: assessment.grade || 'N/A' }
  const sport = assessment.sport
  const label = assessment.unit_name || assessment.strand_name || sport || 'Assessment'

  return (
    <div className="bg-navy-900 border border-navy-800 rounded-lg px-3 py-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {sport && <span className="text-xs">{SPORT_EMOJI[sport] || ''}</span>}
          <span className="text-xs font-medium text-white truncate">{label}</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${grade.bg} text-white`}>
          {grade.label}
        </span>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
        <div className={`h-full ${grade.bg} rounded-full transition-all`} style={{ width: grade.w }} />
      </div>
      {assessment.teacher_notes && (
        <p className="text-[10px] text-navy-500 mt-1.5 line-clamp-2">{assessment.teacher_notes}</p>
      )}
    </div>
  )
}

function AchievementsList() {
  const [achievements, setAchievements] = useState([])

  useEffect(() => {
    // Use the existing zone endpoint to get achievements
    api.get('/pupils/me/development')
      .then(() => {})
      .catch(() => {})
  }, [])

  // Achievements will be populated when we have pupil-scoped achievement endpoint
  if (achievements.length === 0) return null

  return (
    <div className="mt-5">
      <h2 className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-2">
        <Award size={12} className="inline mr-1 -mt-0.5" />
        Achievements
      </h2>
      <div className="space-y-2">
        {achievements.map(a => (
          <div key={a.id} className="bg-navy-900 border border-navy-800 rounded-lg px-3 py-2.5 flex items-center gap-2">
            <span className="text-lg">{a.icon || '🏆'}</span>
            <div>
              <p className="text-xs font-medium text-white">{a.title}</p>
              <p className="text-[10px] text-navy-500">{a.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProgressPage() {
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const { showGCSEEvidence } = useAgeMode()

  useEffect(() => {
    api.get('/pupils/me/assessments')
      .then(r => setAssessments(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Group assessments by sport
  const bySport = {}
  assessments.forEach(a => {
    const key = a.sport || 'General'
    if (!bySport[key]) bySport[key] = []
    bySport[key].push(a)
  })

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-7 w-40 bg-navy-800 rounded animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-navy-800 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-white mb-1">My Progress</h1>
      <p className="text-navy-400 text-xs mb-4">
        Your assessment grades and development across PE
      </p>

      {assessments.length === 0 ? (
        <div className="rounded-xl bg-navy-900 border border-navy-800 p-10 text-center">
          <TrendingUp className="w-10 h-10 text-navy-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">No assessments yet</h3>
          <p className="text-xs text-navy-500">
            As your teachers record assessments, your progress will appear here.
          </p>
        </div>
      ) : (
        Object.entries(bySport).map(([sport, items]) => (
          <div key={sport} className="mb-5">
            <h2 className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              {SPORT_EMOJI[sport] || ''} {sport}
            </h2>
            <div className="space-y-2">
              {items.map(a => <AssessmentRow key={a.id} assessment={a} />)}
            </div>
          </div>
        ))
      )}

      {showGCSEEvidence && (
        <div className="mt-5 bg-navy-900 border border-gold-500/30 rounded-xl p-4">
          <h2 className="text-sm font-bold text-gold-400 mb-1">GCSE PE Portfolio</h2>
          <p className="text-xs text-navy-400">
            Your practical portfolio and exam evidence will appear here as your teachers update your records.
          </p>
        </div>
      )}
    </div>
  )
}
