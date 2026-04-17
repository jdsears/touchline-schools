import { useState, useEffect } from 'react'
import { pupilProfileService } from '../../../services/api'
import { Target, Award, Loader2, CheckCircle2, RotateCcw, XCircle } from 'lucide-react'

const STATUS_META = {
  in_progress: { label: 'In progress', colour: 'bg-sky-500/20 text-sky-400', icon: Target },
  achieved:    { label: 'Achieved',    colour: 'bg-pitch-500/20 text-pitch-400', icon: CheckCircle2 },
  revised:     { label: 'Revised',     colour: 'bg-amber-500/20 text-amber-400', icon: RotateCcw },
  abandoned:   { label: 'Abandoned',   colour: 'bg-navy-700 text-navy-400', icon: XCircle },
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DevelopmentTab({ pupilId }) {
  const [goals, setGoals] = useState([])
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      pupilProfileService.getIdpGoals(pupilId).then(r => setGoals(r.data)).catch(() => setGoals([])),
      pupilProfileService.getAchievements(pupilId).then(r => setAchievements(r.data)).catch(() => setAchievements([])),
    ]).finally(() => setLoading(false))
  }, [pupilId])

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-navy-400" /></div>
  }

  const active = goals.filter(g => g.status === 'in_progress')
  const historic = goals.filter(g => g.status !== 'in_progress')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-5">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-pitch-400" />
            IDP Goals ({goals.length})
          </h2>
          {goals.length === 0 ? (
            <p className="text-sm text-navy-500 text-center py-6">No individual development plan goals recorded yet.</p>
          ) : (
            <>
              {active.length > 0 && (
                <div className="space-y-2 mb-4">
                  <h3 className="text-xs font-semibold text-navy-400 uppercase tracking-wide">Active</h3>
                  {active.map(g => <GoalCard key={g.id} g={g} />)}
                </div>
              )}
              {historic.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-navy-500 uppercase tracking-wide">Historic</h3>
                  {historic.map(g => <GoalCard key={g.id} g={g} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-5">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-amber-400" />
            Achievements ({achievements.length})
          </h2>
          {achievements.length === 0 ? (
            <p className="text-sm text-navy-500 text-center py-6">No achievements awarded yet.</p>
          ) : (
            <div className="space-y-2">
              {achievements.map(a => (
                <div key={a.id} className="p-3 rounded-lg bg-navy-800/50">
                  <div className="flex items-start gap-2">
                    <Award className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{a.title}</div>
                      {a.description && <div className="text-xs text-navy-400 mt-0.5">{a.description}</div>}
                      <div className="text-xs text-navy-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span>{formatDate(a.earned_at)}</span>
                        {a.sport_key && <span className="capitalize">· {a.sport_key}</span>}
                        {a.match_opponent && <span>· vs {a.match_opponent}</span>}
                        {a.awarded_by_name && <span>· {a.awarded_by_name}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function GoalCard({ g }) {
  const meta = STATUS_META[g.status] || STATUS_META.in_progress
  const Icon = meta.icon
  return (
    <div className="p-3 rounded-lg bg-navy-800/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white">{g.goal_description}</div>
          <div className="text-xs text-navy-500 mt-1 flex items-center gap-2 flex-wrap">
            {g.sport_key && <span className="capitalize">{g.sport_key}</span>}
            {g.target_date && <span>· Target {formatDate(g.target_date)}</span>}
            {g.created_by_name && <span>· {g.created_by_name}</span>}
          </div>
          {g.teacher_assessment_notes && (
            <div className="text-xs text-navy-400 mt-2 italic">"{g.teacher_assessment_notes}"</div>
          )}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1 shrink-0 ${meta.colour}`}>
          <Icon className="w-3 h-3" />{meta.label}
        </span>
      </div>
    </div>
  )
}
