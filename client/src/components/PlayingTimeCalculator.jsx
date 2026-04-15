import { useState, useMemo } from 'react'
import { Clock, Users, RotateCcw, Check, AlertCircle, ChevronDown, ChevronUp, Printer } from 'lucide-react'
import PlayingTimePrintView from './PlayingTimePrintView'

// Pre-set match durations by age group format
const FORMAT_DEFAULTS = {
  5: { duration: 40, periods: 4, periodLength: 10, playersOnField: 4 },
  7: { duration: 40, periods: 2, periodLength: 20, playersOnField: 6 },
  9: { duration: 60, periods: 2, periodLength: 30, playersOnField: 8 },
  11: { duration: 70, periods: 2, periodLength: 35, playersOnField: 10 },
}

// Maximum match squad sizes by format (pupils on field + subs allowed)
const MAX_MATCH_SQUAD = {
  5: 8,    // 5 + 3 subs (rolling)
  7: 10,   // 7 + 3 subs
  9: 14,   // 9 + 5 subs
  11: 16,  // 11 + 5 subs
}

function calculatePlayingTime(squadPlayers, playersOnField, matchDuration, numPeriods, rollingSubInterval = 0) {
  const totalSquad = squadPlayers.length
  if (totalSquad === 0 || playersOnField === 0 || matchDuration === 0) return null

  // If squad <= pupils on field, everyone plays the full match
  if (totalSquad <= playersOnField) {
    return {
      slots: squadPlayers.map(p => ({
        pupil: p,
        segments: [{ start: 0, end: matchDuration }],
        totalMinutes: matchDuration,
        percentage: 100,
      })),
      subTimes: [],
      allEqual: true,
    }
  }

  const totalPlayerMinutes = playersOnField * matchDuration
  const idealMinutesPerPlayer = totalPlayerMinutes / totalSquad

  // Determine rotation windows: either period boundaries or rolling intervals
  const useRolling = rollingSubInterval > 0
  let windows
  if (useRolling) {
    // Rolling subs: create rotation windows at the specified interval
    const numWindows = Math.max(1, Math.floor(matchDuration / rollingSubInterval))
    const windowLength = matchDuration / numWindows
    windows = Array.from({ length: numWindows }, (_, i) => ({
      start: Math.round(i * windowLength),
      end: Math.round((i + 1) * windowLength),
    }))
  } else {
    // Period-boundary rotation (halves/quarters)
    const periodLength = matchDuration / numPeriods
    windows = Array.from({ length: numPeriods }, (_, i) => ({
      start: Math.round(i * periodLength),
      end: Math.round((i + 1) * periodLength),
    }))
  }

  const pupils = squadPlayers.map((p, idx) => ({
    pupil: p,
    index: idx,
    segments: [],
    totalMinutes: 0,
  }))

  const subTimes = []
  let prevOnField = null

  for (const window of windows) {
    const windowLength = window.end - window.start

    // Sort by total minutes played (ascending), break ties by index for stability
    const sortedByMinutes = [...pupils].sort((a, b) => {
      if (a.totalMinutes !== b.totalMinutes) return a.totalMinutes - b.totalMinutes
      return a.index - b.index
    })

    // Pick the least-played pupils to be on field for this window
    const onField = new Set(sortedByMinutes.slice(0, playersOnField).map(p => p.index))

    for (const p of pupils) {
      if (onField.has(p.index)) {
        // Merge with previous segment if pupil stays on
        const lastSeg = p.segments[p.segments.length - 1]
        if (lastSeg && lastSeg.end === window.start) {
          lastSeg.end = window.end
        } else {
          p.segments.push({ start: window.start, end: window.end })
        }
        p.totalMinutes += windowLength
      }
    }

    // Record sub time if lineup changes
    if (prevOnField) {
      const hasChanges = [...onField].some(idx => !prevOnField.has(idx))
      if (hasChanges) {
        subTimes.push(window.start)
      }
    }

    prevOnField = onField
  }

  // Round minutes
  pupils.forEach(p => {
    p.totalMinutes = Math.round(p.totalMinutes)
    p.percentage = Math.round((p.totalMinutes / matchDuration) * 100)
  })

  const minMinutes = Math.min(...pupils.map(p => p.totalMinutes))
  const maxMinutes = Math.max(...pupils.map(p => p.totalMinutes))
  const allEqual = maxMinutes - minMinutes <= 2

  return {
    slots: pupils.map(p => ({
      pupil: p.pupil,
      segments: p.segments,
      totalMinutes: p.totalMinutes,
      percentage: p.percentage,
    })),
    subTimes,
    allEqual,
    idealMinutesPerPlayer: Math.round(idealMinutesPerPlayer),
    minMinutes,
    maxMinutes,
    periodLength: useRolling ? rollingSubInterval : Math.round(matchDuration / numPeriods),
    rollingMode: useRolling,
  }
}

export default function PlayingTimeCalculator({ squad, teamFormat = 11, formation, formationPositions, teamName, matchInfo }) {
  const defaults = FORMAT_DEFAULTS[teamFormat] || FORMAT_DEFAULTS[11]
  const maxSquad = MAX_MATCH_SQUAD[teamFormat] || MAX_MATCH_SQUAD[11]

  const [expanded, setExpanded] = useState(false)
  const [matchDuration, setMatchDuration] = useState(defaults.duration)
  const [numPeriods, setNumPeriods] = useState(defaults.periods)
  const [playersOnField, setPlayersOnField] = useState(defaults.playersOnField)
  const [showTimeline, setShowTimeline] = useState(true)
  const [showPrintView, setShowPrintView] = useState(false)
  const [rollingSubInterval, setRollingSubInterval] = useState(0) // 0 = period-boundary mode

  // Limit squad to match day squad size, prioritising starting pupils
  const allSelected = squad.filter(s => s.is_starting || s.selected)
  const squadPlayers = useMemo(() => {
    if (allSelected.length <= maxSquad) return allSelected
    // Prioritise starting pupils, then take subs up to the limit
    const starters = allSelected.filter(s => s.is_starting)
    const subs = allSelected.filter(s => !s.is_starting)
    return [...starters, ...subs].slice(0, maxSquad)
  }, [allSelected.length, maxSquad])

  const result = useMemo(() => {
    if (squadPlayers.length === 0) return null
    return calculatePlayingTime(squadPlayers, playersOnField, matchDuration, numPeriods, rollingSubInterval)
  }, [squadPlayers.length, playersOnField, matchDuration, numPeriods, rollingSubInterval])

  if (allSelected.length === 0) {
    return null
  }

  const periodLength = matchDuration / numPeriods
  const wasLimited = allSelected.length > maxSquad

  return (
    <div className="card overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-navy-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-pitch-500/20 flex items-center justify-center">
            <Clock className="w-4 h-4 text-pitch-400" />
          </div>
          <div className="text-left">
            <h3 className="font-display font-semibold text-white text-sm">Playing Time Calculator</h3>
            <p className="text-xs text-navy-400">
              Fair rotation plan for {squadPlayers.length} pupils
              {wasLimited && (
                <span className="text-amber-400 ml-1">(limited from {allSelected.length} to match day {maxSquad})</span>
              )}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-navy-400" /> : <ChevronDown className="w-4 h-4 text-navy-400" />}
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-navy-800">
          {/* Config Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div>
              <label className="text-xs text-navy-400 block mb-1">Match Length</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={matchDuration}
                  onChange={e => setMatchDuration(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:border-pitch-500 focus:outline-none"
                />
                <span className="text-xs text-navy-500">min</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-navy-400 block mb-1">On Field</label>
              <input
                type="number"
                value={playersOnField}
                onChange={e => setPlayersOnField(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:border-pitch-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-navy-400 block mb-1">Periods</label>
              <select
                value={numPeriods}
                onChange={e => setNumPeriods(parseInt(e.target.value))}
                disabled={rollingSubInterval > 0}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:border-pitch-500 focus:outline-none disabled:opacity-50"
              >
                <option value={2}>2 halves</option>
                <option value={4}>4 quarters</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-navy-400 block mb-1">Rolling Subs</label>
              <select
                value={rollingSubInterval}
                onChange={e => setRollingSubInterval(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:border-pitch-500 focus:outline-none"
              >
                <option value={0}>Off (breaks only)</option>
                <option value={5}>Every 5 min</option>
                <option value={10}>Every 10 min</option>
                <option value={15}>Every 15 min</option>
              </select>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-navy-500">Presets:</span>
            {Object.entries(FORMAT_DEFAULTS).map(([fmt, cfg]) => (
              <button
                key={fmt}
                onClick={() => {
                  setMatchDuration(cfg.duration)
                  setNumPeriods(cfg.periods)
                  setPlayersOnField(cfg.playersOnField)
                  setRollingSubInterval(0)
                }}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  matchDuration === cfg.duration && numPeriods === cfg.periods && playersOnField === cfg.playersOnField
                    ? 'bg-pitch-500/30 text-pitch-400 border border-pitch-500/30'
                    : 'bg-navy-800 text-navy-400 hover:text-white border border-navy-700'
                }`}
              >
                {fmt}-a-side
              </button>
            ))}
          </div>

          {result && (
            <>
              {/* Summary */}
              <div className={`p-3 rounded-lg flex items-center gap-3 ${
                result.allEqual ? 'bg-green-500/10 border border-green-500/20' : 'bg-amber-500/10 border border-amber-500/20'
              }`}>
                {result.allEqual ? (
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                )}
                <div className="text-sm">
                  <p className={result.allEqual ? 'text-green-400' : 'text-amber-400'}>
                    {result.allEqual
                      ? `Equal playing time: ~${result.idealMinutesPerPlayer} min each (${Math.round((result.idealMinutesPerPlayer / matchDuration) * 100)}%)`
                      : `Range: ${result.minMinutes}-${result.maxMinutes} min (target: ~${result.idealMinutesPerPlayer} min)`
                    }
                  </p>
                  {!result.allEqual && !result.rollingMode && (
                    <p className="text-xs text-navy-400 mt-1">
                      Tip: Enable rolling subs for more even playing time across the squad
                    </p>
                  )}
                </div>
              </div>

              {/* Substitution Windows */}
              {result.subTimes.length > 0 && (
                <div className="bg-navy-800/50 rounded-lg p-3">
                  <p className="text-sm text-navy-400 mb-2 flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Substitution Windows ({result.rollingMode ? `Every ${rollingSubInterval} min` : numPeriods === 4 ? 'Quarter Breaks' : 'Half Breaks'})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.subTimes.map((t, i) => (
                      <span key={i} className="px-2 py-1 bg-pitch-500/20 text-pitch-400 rounded text-sm font-medium">
                        {t}'
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline Toggle & Print */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowTimeline(!showTimeline)}
                  className="flex items-center gap-2 text-sm text-navy-400 hover:text-white transition-colors"
                >
                  {showTimeline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showTimeline ? 'Hide' : 'Show'} Pupil Timeline
                </button>
                <button
                  onClick={() => setShowPrintView(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-navy-800 text-navy-300 hover:text-white hover:bg-navy-700 border border-navy-700 transition-colors"
                  title="Print rotation plan"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Rotation
                </button>
              </div>

              {/* Visual Timeline */}
              {showTimeline && (
                <div className="space-y-1.5">
                  {/* Time axis */}
                  <div className="flex items-center ml-[120px] mb-1">
                    <span className="text-[10px] text-navy-500">0'</span>
                    <div className="flex-1" />
                    {result.subTimes.filter((_, i) => {
                      // In rolling mode with many sub times, only show every other label
                      if (!result.rollingMode) return true
                      return result.subTimes.length <= 6 || i % 2 === 0
                    }).map((t, i) => (
                      <div key={i} className="flex-1 text-center">
                        <span className="text-[10px] text-navy-500">{t}'</span>
                      </div>
                    ))}
                    <span className="text-[10px] text-navy-500">{matchDuration}'</span>
                  </div>

                  {result.slots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-[112px] truncate text-sm text-navy-300 flex-shrink-0">
                        {slot.pupil.player_name || slot.pupil.name}
                        {slot.pupil.squad_number ? ` #${slot.pupil.squad_number}` : ''}
                      </div>
                      <div className="flex-1 relative h-6 bg-navy-800/50 rounded overflow-hidden">
                        {/* Sub time dividers */}
                        {result.subTimes.map((t, i) => (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 w-px bg-navy-600"
                            style={{ left: `${(t / matchDuration) * 100}%` }}
                          />
                        ))}
                        {/* Playing time bars */}
                        {slot.segments.map((seg, sIdx) => (
                          <div
                            key={sIdx}
                            className="absolute top-0.5 bottom-0.5 bg-pitch-500/60 rounded-sm"
                            style={{
                              left: `${(seg.start / matchDuration) * 100}%`,
                              width: `${((seg.end - seg.start) / matchDuration) * 100}%`,
                            }}
                          />
                        ))}
                      </div>
                      <div className="w-14 text-right text-xs text-navy-400 flex-shrink-0">
                        {slot.totalMinutes}' ({slot.percentage}%)
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pupil Summary Table */}
              <div className="bg-navy-800/30 rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 gap-1 px-3 py-2 text-xs text-navy-500 border-b border-navy-700">
                  <div className="col-span-5">Pupil</div>
                  <div className="col-span-3 text-center">Playing Time</div>
                  <div className="col-span-2 text-center">% of Match</div>
                  <div className="col-span-2 text-center">Status</div>
                </div>
                {result.slots.map((slot, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1 px-3 py-2 text-sm border-b border-navy-800/50 last:border-0">
                    <div className="col-span-5 text-white truncate">
                      {slot.pupil.player_name || slot.pupil.name}
                    </div>
                    <div className="col-span-3 text-center text-navy-300">{slot.totalMinutes} min</div>
                    <div className="col-span-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        slot.percentage >= 45 ? 'bg-green-500/20 text-green-400' :
                        slot.percentage >= 30 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {slot.percentage}%
                      </span>
                    </div>
                    <div className="col-span-2 text-center text-xs text-navy-400">
                      {slot.segments[0]?.start === 0 ? 'Start' : `On ${slot.segments[0]?.start}'`}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Print View Modal */}
      {showPrintView && result && (
        <PlayingTimePrintView
          result={result}
          squad={squadPlayers}
          matchDuration={matchDuration}
          numPeriods={numPeriods}
          playersOnField={playersOnField}
          formation={formation}
          formationPositions={formationPositions}
          teamName={teamName}
          teamFormat={teamFormat}
          matchInfo={matchInfo}
          onClose={() => setShowPrintView(false)}
        />
      )}
    </div>
  )
}
