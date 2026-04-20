import { useState, useEffect } from 'react'
import { hodService } from '../../services/api'
import { ClipboardCheck, Users, TrendingUp, Filter } from 'lucide-react'

const KS3_GRADES = ['Beg', 'Dev', 'Sec', 'Exc']
const KS4_GRADES = ['D', 'C', 'B', 'A', 'A*']

const GRADE_LABELS = {
  Beg: 'Beginning', Dev: 'Developing', Sec: 'Secure', Exc: 'Exceeding',
  D: 'D', C: 'C', B: 'B', A: 'A', 'A*': 'A*',
}

const TERMS = [
  { value: '', label: 'All terms' },
  { value: 'autumn', label: 'Autumn' },
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
]

function gradeColor(average, keyStage) {
  if (average === null || average === undefined) return 'bg-navy-800/50 text-navy-500'
  if (keyStage === 'KS4') {
    if (average >= 7) return 'bg-blue-500/25 text-blue-300 border border-blue-500/30'
    if (average >= 5.5) return 'bg-pitch-600/25 text-pitch-300 border border-pitch-600/30'
    if (average >= 4.5) return 'bg-amber-400/25 text-amber-300 border border-amber-400/30'
    return 'bg-alert-600/25 text-alert-300 border border-alert-600/30'
  }
  if (average >= 3.5) return 'bg-blue-500/25 text-blue-300 border border-blue-500/30'
  if (average >= 2.5) return 'bg-pitch-600/25 text-pitch-300 border border-pitch-600/30'
  if (average >= 1.5) return 'bg-amber-400/25 text-amber-300 border border-amber-400/30'
  return 'bg-alert-600/25 text-alert-300 border border-alert-600/30'
}

function averageLabel(average, keyStage) {
  if (average === null || average === undefined) return '--'
  if (keyStage === 'KS4') {
    if (average >= 7.5) return 'A*'
    if (average >= 6.5) return 'A'
    if (average >= 5.5) return 'B'
    if (average >= 4.5) return 'C'
    return 'D'
  }
  if (average >= 3.5) return 'Exc'
  if (average >= 2.5) return 'Sec'
  if (average >= 1.5) return 'Dev'
  return 'Beg'
}

function GradeDistributionBar({ grades, keyStage }) {
  const scale = keyStage === 'KS4' ? KS4_GRADES : KS3_GRADES
  const total = scale.reduce((sum, g) => sum + (grades[g] || 0), 0)
  if (total === 0) return null

  const colors = keyStage === 'KS4'
    ? { D: 'bg-alert-500', C: 'bg-amber-400', B: 'bg-pitch-500', A: 'bg-blue-400', 'A*': 'bg-blue-300' }
    : { Beg: 'bg-alert-500', Dev: 'bg-amber-400', Sec: 'bg-pitch-500', Exc: 'bg-blue-400' }

  return (
    <div className="flex rounded-full overflow-hidden h-2 w-full">
      {scale.map(g => {
        const count = grades[g] || 0
        if (count === 0) return null
        return (
          <div
            key={g}
            className={`${colors[g]} transition-all`}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${GRADE_LABELS[g]}: ${count} (${Math.round((count / total) * 100)}%)`}
          />
        )
      })}
    </div>
  )
}

export default function HoDAssessmentOverview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [term, setTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [term])

  async function loadData() {
    setLoading(true)
    try {
      const res = await hodService.getAssessmentHeatmap(term || undefined)
      setData(res.data)
    } catch (err) {
      console.error('Failed to load assessment heatmap:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="spinner w-8 h-8" /></div>
  }

  if (!data || data.year_groups.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Assessment Overview</h1>
        <p className="text-navy-400 mb-8">Cross-year curriculum assessment heatmap</p>
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
          <ClipboardCheck className="w-8 h-8 text-navy-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No assessments recorded yet</h3>
          <p className="text-navy-400 text-sm max-w-md mx-auto">
            Once teachers begin recording assessments against curriculum strands, the cross-year heatmap will appear here.
          </p>
        </div>
      </div>
    )
  }

  const { year_groups, strands, cells, coverage } = data
  const coverageMap = {}
  for (const c of coverage) coverageMap[c.year_group] = c

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Assessment Overview</h1>
          <p className="text-navy-400 mt-1">Cross-year curriculum assessment heatmap</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-navy-400" />
          <select
            value={term}
            onChange={e => setTerm(e.target.value)}
            className="px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-pitch-500"
          >
            {TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Coverage summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {year_groups.map(yg => {
          const c = coverageMap[yg]
          const pct = c && c.total_pupils > 0 ? Math.round((c.assessed_pupils / c.total_pupils) * 100) : 0
          return (
            <div key={yg} className="bg-navy-900 rounded-xl border border-navy-800 p-4">
              <div className="text-xs text-navy-400 mb-1">Year {yg}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-white">{pct}%</span>
                <span className="text-xs text-navy-500">assessed</span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-navy-400">
                <Users className="w-3 h-3" />
                {c?.assessed_pupils || 0} / {c?.total_pupils || 0} pupils
              </div>
              <div className="mt-2 h-1.5 bg-navy-800 rounded-full overflow-hidden">
                <div className="h-full bg-pitch-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Heatmap grid */}
      <div className="bg-navy-900 rounded-xl border border-navy-800 overflow-hidden">
        <div className="p-5 border-b border-navy-800">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-pitch-400" />
            Grade Distribution by Year Group and Strand
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy-800">
                <th className="text-left text-xs font-medium text-navy-400 px-5 py-3 w-28">Year</th>
                {strands.map(s => (
                  <th key={s} className="text-left text-xs font-medium text-navy-400 px-4 py-3 min-w-[180px]">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {year_groups.map(yg => (
                <tr key={yg} className="border-b border-navy-800/50 hover:bg-navy-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <span className="text-sm font-semibold text-white">Year {yg}</span>
                    <div className="text-xs text-navy-500 mt-0.5">
                      {cells[yg]?.[strands[0]]?.key_stage || (yg <= 9 ? 'KS3' : 'KS4')}
                    </div>
                  </td>
                  {strands.map(s => {
                    const cell = cells[yg]?.[s]
                    if (!cell) {
                      return (
                        <td key={s} className="px-4 py-4">
                          <div className="bg-navy-800/30 rounded-lg px-3 py-2 text-center text-xs text-navy-600">
                            No data
                          </div>
                        </td>
                      )
                    }
                    const ks = cell.key_stage || (yg <= 9 ? 'KS3' : 'KS4')
                    return (
                      <td key={s} className="px-4 py-4">
                        <div className={`rounded-lg px-3 py-2 ${gradeColor(cell.average, ks)}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold">{averageLabel(cell.average, ks)}</span>
                            <span className="text-xs opacity-70">{cell.total} assessments</span>
                          </div>
                          <GradeDistributionBar grades={cell.grades} keyStage={ks} />
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-5 py-4 border-t border-navy-800 flex flex-wrap items-center gap-6">
          <span className="text-xs text-navy-400 font-medium">KS3 Scale:</span>
          <div className="flex items-center gap-3">
            {[
              { label: 'Beginning', color: 'bg-alert-500' },
              { label: 'Developing', color: 'bg-amber-400' },
              { label: 'Secure', color: 'bg-pitch-500' },
              { label: 'Exceeding', color: 'bg-blue-400' },
            ].map(g => (
              <div key={g.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${g.color}`} />
                <span className="text-xs text-navy-400">{g.label}</span>
              </div>
            ))}
          </div>
          <span className="text-xs text-navy-400 font-medium ml-4">KS4 Scale:</span>
          <div className="flex items-center gap-3">
            {[
              { label: 'D', color: 'bg-alert-500' },
              { label: 'C', color: 'bg-amber-400' },
              { label: 'B', color: 'bg-pitch-500' },
              { label: 'A', color: 'bg-blue-400' },
              { label: 'A*', color: 'bg-blue-300' },
            ].map(g => (
              <div key={g.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${g.color}`} />
                <span className="text-xs text-navy-400">{g.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
