import Anthropic from '@anthropic-ai/sdk'
import pool from '../config/database.js'
import { getTaxonomy } from '../constants/sportTaxonomy.js'

const anthropic = new Anthropic()

// Helper: wrap system prompt string as cacheable array for prompt caching
function cacheableSystem(systemPrompt) {
  return [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }]
}

// Max images per Claude call (keeping within context limits)
const FRAMES_PER_BATCH = 20

// Frame limits by analysis depth
const FRAME_LIMITS = {
  standard: { fullMatch: 120, clip: 40, minFullInterval: 10, minClipInterval: 3 },
  deep:     { fullMatch: 480, clip: 120, minFullInterval: 4,  minClipInterval: 1 },
}

// Legacy constants for backwards compat
const MAX_FRAMES_FULL_MATCH = 120
const MAX_FRAMES_CLIP = 40
const MIN_FULL_MATCH_INTERVAL = 10
const MIN_CLIP_INTERVAL = 3

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/**
 * Extract position strings from the JSONB positions column.
 * Handles both formats: ['GK', 'CB'] and [{position: 'GK', priority: 'primary'}, ...]
 */
function positionStrings(positions) {
  if (!Array.isArray(positions) || positions.length === 0) return []
  if (typeof positions[0] === 'string') return positions
  return positions.filter(p => p && p.position).map(p => p.position)
}

/**
 * Timeout wrapper — rejects if the promise doesn't settle within the given ms
 */
function withTimeout(promise, ms, label = 'operation') {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

// Per-segment API call timeout (90 seconds — generous for image-heavy requests)
const CLAUDE_CALL_TIMEOUT_MS = 90_000
// Synthesis calls generate up to 16-32K tokens of JSON — needs much longer than segment calls
const CLAUDE_SYNTHESIS_TIMEOUT_MS = 300_000

/**
 * Retry wrapper for Claude API calls — handles 429, 500, 529 with exponential backoff.
 * Each attempt is subject to a timeout to prevent indefinite hangs.
 */
async function callClaudeWithRetry(params, maxRetries = 3, timeoutMs = CLAUDE_CALL_TIMEOUT_MS) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(
        anthropic.messages.create(params),
        timeoutMs,
        `Claude API call (attempt ${attempt + 1})`
      )
    } catch (err) {
      const status = err?.status || err?.error?.status
      const isTimeout = err?.message?.includes('timed out')
      const retryable = isTimeout || [429, 500, 529].includes(status) || err?.message?.includes('overloaded')

      if (!retryable || attempt === maxRetries) {
        throw err
      }

      const delay = Math.pow(2, attempt + 1) * 1000 // 2s, 4s, 8s
      console.log(`[Gaffer] Claude API error (${status || err.message}), retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

/**
 * Fetch a single Mux thumbnail as base64
 */
async function fetchFrame(playbackId, time) {
  const url = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}&width=1280`
  const response = await fetch(url)
  if (!response.ok) return null
  const buffer = await response.arrayBuffer()
  return {
    time,
    base64: Buffer.from(buffer).toString('base64'),
    mediaType: 'image/jpeg',
  }
}

/**
 * Fetch frames in parallel with concurrency limit
 */
async function fetchFramesBatch(playbackId, times, concurrency = 5) {
  const frames = []
  for (let i = 0; i < times.length; i += concurrency) {
    const batch = times.slice(i, i + concurrency)
    const results = await Promise.allSettled(
      batch.map(t => fetchFrame(playbackId, t))
    )
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) frames.push(r.value)
    }
  }
  return frames
}

/**
 * Build the context/system preamble shared across all calls
 */
function buildContext(video, options) {
  const { teamColour, teamName, sport = 'football', context = {}, squadPlayers = [] } = options
  const taxonomy = getTaxonomy(sport)
  const term = taxonomy.terminology
  const videoType = video.type === 'training' ? 'training session' : term.matchWord
  const ourTeamLabel = teamName || (teamColour ? `the ${teamColour} team` : 'our team')
  const lines = []
  lines.push(`SPORT: ${term.context} (${term.teamSize})`)
  if (teamColour) lines.push(`OUR TEAM (${teamName || 'our team'}) is wearing ${teamColour.toUpperCase()} kit — focus your analysis on THIS team`)
  if (context.opponent) lines.push(`Opponent: ${context.opponent}`)
  if (context.ageGroup) lines.push(`Age group: ${context.ageGroup}`)
  if (context.goalsFor !== null && context.goalsFor !== undefined && context.goalsAgainst !== null && context.goalsAgainst !== undefined) {
    const score = `${context.goalsFor}-${context.goalsAgainst}`
    const resultLabel = context.result || (context.goalsFor > context.goalsAgainst ? 'Win' : context.goalsFor < context.goalsAgainst ? 'Loss' : 'Draw')
    lines.push(`MATCH RESULT: ${score} (${resultLabel})${context.goalsAgainst === 0 ? ' — CLEAN SHEET' : ''}`)
  }
  if (context.goalscorers?.length > 0) {
    const goalLines = context.goalscorers.map(g => {
      let line = `#${g.scorer_number || '?'} ${g.scorer_name}`
      if (g.minute) line += ` (${g.minute}')`
      if (g.goal_type && g.goal_type !== 'open_play') line += ` [${g.goal_type}]`
      if (g.assist_name) line += ` — assist: #${g.assist_number || '?'} ${g.assist_name}`
      return line
    })
    lines.push(`GOALSCORERS: ${goalLines.join('; ')}`)
  }
  if (context.opponentLeague) {
    const opp = context.opponentLeague
    lines.push(`OPPONENT LEAGUE POSITION: ${opp.position ? ordinal(opp.position) : '?'} (P${opp.played} W${opp.won} D${opp.drawn} L${opp.lost}, GF${opp.goals_for} GA${opp.goals_against}, ${opp.points}pts)`)
  }
  if (context.ownLeague) {
    lines.push(`OUR LEAGUE POSITION: ${context.ownLeague.position ? ordinal(context.ownLeague.position) : '?'} (${context.ownLeague.points}pts)`)
  }
  // Starting formation from match/team data
  if (context.startingFormation) {
    lines.push(`STARTING FORMATION: ${context.startingFormation}`)
    if (context.matchFormations?.length > 0) {
      const formationNames = context.matchFormations.map(f => typeof f === 'string' ? f : f.name || f.formation).filter(Boolean)
      if (formationNames.length > 0) lines.push(`FORMATIONS USED IN MATCH: ${formationNames.join(', ')}`)
    }
  } else if (context.teamFormations?.length > 0) {
    const formationNames = context.teamFormations.map(f => typeof f === 'string' ? f : f.name || f.formation).filter(Boolean)
    if (formationNames.length > 0) lines.push(`TEAM FORMATIONS (no match-specific formation set): ${formationNames.join(', ')}`)
  }
  if (squadPlayers.length > 0) {
    const hasLineupData = squadPlayers.some(p => p.is_starting !== undefined && p.is_starting !== null)
    if (hasLineupData) {
      const starters = squadPlayers.filter(p => p.is_starting)
      const subs = squadPlayers.filter(p => !p.is_starting)
      // Prefer match-day position (from match_squads) over profile positions
      const formatPlayer = p => {
        const pStrs = positionStrings(p.positions)
        const pos = p.match_position || (pStrs.length ? pStrs.join('/') : null)
        const isProfile = !p.match_position && pStrs.length > 0
        return `#${p.squad_number || '?'} ${p.name}${pos ? ` (${pos}${isProfile ? ' — profile' : ''})` : ''}`
      }
      lines.push(`STARTING XI: ${starters.map(formatPlayer).join(', ')}`)
      if (subs.length > 0) lines.push(`SUBS: ${subs.map(formatPlayer).join(', ')}`)
      // Include substitution events if available
      if (context.substitutions?.length > 0) {
        const subLines = context.substitutions.map(s => {
          const off = s.player_off_name ? `#${s.player_off_number || '?'} ${s.player_off_name}` : '?'
          const on = s.player_on_name ? `#${s.player_on_number || '?'} ${s.player_on_name}` : '?'
          return `${s.minute ? s.minute + "'" : '?'}: ${off} → ${on}`
        })
        lines.push(`SUBSTITUTIONS MADE: ${subLines.join('; ')}`)
        lines.push(`Use substitution timings to improve pupil identification — after a substitution, the incoming pupil replaces the outgoing pupil's position on the pitch.`)
      }
      lines.push(`ONLY these ${squadPlayers.length} pupils were in the match squad. Do NOT include any other pupils in your analysis.`)
    } else {
      const playerList = squadPlayers
        .map(p => { const pStrs = positionStrings(p.positions); return `#${p.squad_number || '?'} ${p.name}${pStrs.length ? ` (${pStrs.join('/')})` : ''}` })
        .join(', ')
      lines.push(`SQUAD: ${playerList}`)
    }
  }
  return { videoType, contextBlock: lines.join('\n'), ourTeamLabel, taxonomy }
}

/**
 * Analyse a batch of frames — returns segment-level observations
 */
async function analyseSegment(frames, segmentIndex, totalSegments, video, options) {
  const { teamColour, sport = 'football', squadPlayers = [] } = options
  const { videoType, contextBlock, taxonomy } = buildContext(video, options)
  const term = taxonomy.terminology

  const content = []
  for (const frame of frames) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: frame.mediaType, data: frame.base64 },
    })
    content.push({
      type: 'text',
      text: `[Frame at ${Math.floor(frame.time / 60)}m${Math.round(frame.time % 60)}s]`,
    })
  }

  const startTime = frames[0]?.time || 0
  const endTime = frames[frames.length - 1]?.time || 0

  // Build visual profile context from previously identified pupils
  const { knownProfiles = {} } = options
  let profileContext = ''
  const profileEntries = Object.entries(knownProfiles)
  if (profileEntries.length > 0) {
    profileContext = `\nPLAYER VISUAL PROFILES (identified in earlier segments — use these to help identify the same pupils):
${profileEntries.map(([num, profile]) => `  #${num} ${profile.name}: ${profile.descriptors.join(', ')}`).join('\n')}
`
  }

  content.push({
    type: 'text',
    text: `Analyse this segment (${Math.floor(startTime / 60)}m-${Math.floor(endTime / 60)}m) of a ${term.context} ${videoType}. This is segment ${segmentIndex + 1} of ${totalSegments}.
${contextBlock}
${profileContext}
For this segment, identify:
1. Formation and team shape — ${options.context?.startingFormation ? `the team's STARTING FORMATION is ${options.context.startingFormation}. Note whether the shape matches this formation or has deviated.` : 'the squad positions listed above show the INTENDED formation.'} Note if pupils appear to be playing a different role (common in school sport when teams are short on pupils).
2. Key tactical moments (attacks, defensive actions, transitions, set pieces)
3. Individual pupil actions (good AND bad) — be specific about what you see each pupil do:${squadPlayers.length > 0 ? `
   - FIRST try to identify pupils by reading SHIRT NUMBERS visible in the frames. Match numbers to the squad list.
   - If shirt numbers are NOT clearly visible (common in grassroots footage), identify pupils by POSITION instead. Use the squad list positions to map observations — e.g. "the left-back" → #3 ${squadPlayers.find(p => { const ps = positionStrings(p.positions); return ps.includes('LB') || (p.match_position === 'LB') })?.name || 'Pupil'}, "the goalkeeper" → #1 ${squadPlayers.find(p => { const ps = positionStrings(p.positions); return ps.includes('GK') || (p.match_position === 'GK') })?.name || 'Pupil'}.
   - BUILDING VISUAL PROFILES: When you CAN read a shirt number, also note any visual descriptors that will help identify that pupil in frames where the number is NOT visible — e.g. height (tall/short/average relative to teammates), build (slim/stocky/athletic), hair colour/style, sleeve length (long/short sleeves), distinctive features (headband, different coloured boots, goalkeeper gloves, captain's armband, etc). These profiles accumulate across segments to improve identification consistency.
   - Note SPECIFIC actions: "won a header", "lost their marker", "played a through ball", "was caught upfield leaving space behind"
   - Include both positive AND negative observations — don't just note who touched the ball.
   - If a defender is out of position when the opponent attacks, note this even if they weren't directly involved in the goal.
   - You MUST attempt to identify actions for as many pupils as possible — even "held position well" or "was uninvolved in this segment" counts.
   - GOALKEEPER: Pay special attention to the GK — note saves, catches, punches, distribution (goal kicks, throws), communication, sweeping, and any 1v1 situations. Grassroots GKs are usually busy — do NOT default to "quiet" unless there was genuinely zero action in their area.
   - DEFENDERS GOING FORWARD: Note when defenders push forward, overlap, or create attacking chances — this is just as important as their defensive work.` : ''}
4. Any notable patterns — defensive errors, gaps in the shape, good combination play, pressing triggers
5. CAMERA PERSPECTIVE: This footage is filmed from a fixed sideline camera. You CANNOT reliably determine the pitch's left vs right side from the camera angle — "screen-left" may be either end of the pitch, and teams switch ends at half-time. Do NOT state "left channel" or "right channel" unless you can confirm the side from shirt numbers and known pupil positions (e.g. if you can identify the left-back, the channel they are in is the left channel). When uncertain, use "wide channel", "out wide", or "from the flank" instead.
6. POSITION TRACKING: Players should be assumed to be playing the position listed in the squad data unless you have CLEAR visual evidence across MULTIPLE frames that they are in a completely different role. Do NOT assume a pupil changed position or went in goal based on a single ambiguous frame.

Return JSON:
{
  "segmentSummary": "2-3 sentences about this segment",
  "formation": "observed formation if visible",
  "observations": [
    { "category": "${taxonomy.observationCategories.join('|')}", "observation": "...", "timestamp": "Xm:XXs", "importance": "high|medium|low" }
  ],
  "playerNotes": [
    { "squad_number": 7, "name": "Pupil Name", "action": "what they did", "quality": "positive|negative|neutral", "timestamp": "Xm:XXs", "visual": "brief visual descriptors if shirt number was confirmed — e.g. tall, dark hair, long sleeves" }
  ]
}`,
  })

  const response = await callClaudeWithRetry({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: cacheableSystem(`You are The Gaffer, Touchline's AI tactical assistant for ${term.context}. Analyse ${term.matchWord} footage segments precisely. Be specific about what you see. When shirt numbers are not readable, identify pupils by their position on the pitch and map to the squad list. Always respond with valid JSON.`),
    messages: [{ role: 'user', content }],
  })

  try {
    const text = response.content[0].text
    // Strip markdown code fences — handle 3+ backticks, same-line or multi-line
    let cleaned = text.replace(/^`{3,}(?:json)?\s*/i, '').replace(/\s*`{3,}\s*$/i, '').trim()
    try {
      return JSON.parse(cleaned)
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0])
        } catch {
          // Try fixing trailing commas
          const repaired = jsonMatch[0].replace(/,\s*([}\]])/g, '$1')
          return JSON.parse(repaired)
        }
      }
    }
    return { segmentSummary: text, observations: [], playerNotes: [] }
  } catch {
    return { segmentSummary: response.content[0].text, observations: [], playerNotes: [] }
  }
}

/**
 * Synthesise segment analyses into a final comprehensive report
 */
function getAgeFeedbackGuidance(ageGroup) {
  if (!ageGroup) return ''
  const age = parseInt(ageGroup.replace(/\D/g, ''), 10)
  if (!age || isNaN(age)) return ''

  if (age <= 10) {
    return `\nFEEDBACK TONE (${ageGroup} — young pupils):
- Be very encouraging and positive — focus heavily on what they did well
- Frame improvements as "next steps" or "things to try" rather than criticisms
- Keep language simple and fun — avoid tactical jargon
- Celebrate effort, bravery, and teamwork above technical ability
- Ratings should still DIFFERENTIATE — a pupil who stood out positively should score higher than one who was quiet. Use the 5-9 range, not a flat score for everyone.`
  } else if (age <= 12) {
    return `\nFEEDBACK TONE (${ageGroup} — developing pupils):
- Be encouraging but start introducing specific areas to work on
- Balance praise with constructive pointers — aim for 2 positives per 1 improvement
- Use simple tactical language where appropriate (positioning, passing, movement)
- Recognise effort and improvement, not just outcomes
- Use the full 5-9 scoring range — differentiate between pupils who stood out and those who were quieter`
  } else if (age <= 14) {
    return `\nFEEDBACK TONE (${ageGroup} — adolescent pupils):
- Balanced and constructive — honest about strengths and weaknesses
- Can use tactical terminology (pressing triggers, defensive shape, transitions)
- Be specific about what to improve and how
- Acknowledge good performances directly but don't sugarcoat areas needing work
- Use the full 4-9 scoring range — differentiate clearly between performances`
  } else {
    return `\nFEEDBACK TONE (${ageGroup} — older youth pupils):
- Direct and detailed — these pupils can handle honest, specific feedback
- Use full tactical language and expect higher standards
- Be critical where warranted — they need to hear what's not working
- Focus on decision-making, game intelligence, and consistency
- Hold to higher standards: a 7 should mean genuinely good, not just "tried hard"`
  }
}

function getResultScoringContext(context) {
  const { goalsFor, goalsAgainst, result, opponentLeague } = context
  if (goalsFor === null || goalsFor === undefined) return ''

  const lines = ['\nMATCH RESULT CONTEXT FOR SCORING:']
  const gd = goalsFor - goalsAgainst
  const isWin = gd > 0 || result === 'Win'
  const isDraw = gd === 0 || result === 'Draw'
  const cleanSheet = goalsAgainst === 0

  // Result context — NOT baselines. Ratings should always be differentiated based on individual performance.
  if (isWin && gd >= 2) {
    lines.push('- This was a convincing WIN — the team performed well collectively')
    lines.push('- A win means more pupils may deserve higher ratings, but NOT all of them — some pupils will have contributed more than others. Still use the full range.')
  } else if (isWin) {
    lines.push('- This was a WIN — the team got the result')
    lines.push('- A win does NOT mean everyone gets the same score. Identify who drove the result and who was carried by teammates.')
  } else if (isDraw) {
    lines.push('- This was a DRAW — assess each pupil individually')
  } else {
    lines.push('- This was a LOSS — but still assess individuals fairly, not just the scoreline')
    lines.push('- Some pupils may have performed well despite the result — recognise them. Others may have been at fault — note that too.')
  }

  // Clean sheet bonus
  if (cleanSheet && (isWin || isDraw)) {
    lines.push('- CLEAN SHEET: defenders and goalkeeper deserve credit for keeping a clean sheet — but still differentiate between them (e.g. a GK who made several saves vs a CB who was barely tested)')
  }

  // Opponent strength context
  if (opponentLeague) {
    const oppPos = opponentLeague.position
    const oppWon = opponentLeague.won
    const oppPlayed = opponentLeague.played
    if (oppPos && oppPos <= 3) {
      lines.push(`- The opponent is ${ordinal(oppPos)} in the league (${oppWon}W from ${oppPlayed} games) — this is a TOP team`)
      if (isWin) lines.push('- Beating a top-of-the-table team is a significant achievement — reflect this in ratings (most pupils 7-8+)')
      if (cleanSheet) lines.push('- Keeping a clean sheet against a top team is exceptional — defenders/GK merit 8+')
    } else if (oppPos && oppPos <= 6) {
      lines.push(`- Opponent is ${ordinal(oppPos)} — a strong mid-table team`)
    }
  }

  return lines.join('\n')
}

async function synthesiseAnalysis(segmentResults, video, options) {
  const { squadPlayers = [], sport = 'football', context = {} } = options
  const { videoType, contextBlock, ourTeamLabel, taxonomy } = buildContext(video, options)
  const term = taxonomy.terminology
  const ageFeedbackGuidance = getAgeFeedbackGuidance(context.ageGroup)
  const resultScoringContext = getResultScoringContext(context)

  const segmentSummaries = segmentResults.map((seg, i) => {
    const obs = (seg.observations || []).map(o => `  - [${o.timestamp || '?'}] (${o.category}) ${o.observation}`).join('\n')
    const pupils = (seg.playerNotes || []).map(p => {
      let line = `  - [${p.timestamp || '?'}] ${p.name || '#' + p.squad_number}: ${p.action} (${p.quality})`
      if (p.visual) line += ` [visual: ${p.visual}]`
      return line
    }).join('\n')
    return `SEGMENT ${i + 1}: ${seg.segmentSummary || 'No summary'}\nFormation: ${seg.formation || 'unclear'}\nObservations:\n${obs || '  (none)'}\nPlayer notes:\n${pupils || '  (none)'}`
  }).join('\n\n')

  const totalFrames = segmentResults.reduce((sum, _, i) => sum + (segmentResults[i]?._frameCount || 0), 0)

  const prompt = `You have analysed a full ${term.context} ${videoType} across ${segmentResults.length} segments. Here are the segment-by-segment findings:

${segmentSummaries}

${contextBlock}

Now synthesise these into a comprehensive match analysis:
1. FORMATION & SHAPE: ${context.startingFormation ? `${ourTeamLabel} were SET UP in a ${context.startingFormation} formation. Your formation observation MUST reference this starting formation explicitly — e.g. "Started in a ${context.startingFormation}" — and then describe how the shape looked in practice. Did they maintain it? Did it morph into something different in/out of possession? Were there deviations from the intended shape?` : `What formation is ${ourTeamLabel} playing? Use the squad position data to determine the EXPECTED shape.`} If pupils appear to be playing different roles from what is listed, note this — in school ${term.sport}, pupils often fill in wherever needed.
2. KEY OBSERVATIONS: What stands out tactically? Patterns across the ${term.matchWord}?
3. STRENGTHS: What ${ourTeamLabel} does well
4. AREAS TO IMPROVE: What needs work (be specific and constructive)
5. INDIVIDUAL NOTES: Evaluate every pupil based on the role they actually played in the ${term.matchWord}.${squadPlayers.length > 0 ? ' Use actual pupil names from the squad list.' : ''}
6. TRAINING RECOMMENDATIONS: 3-5 specific drills/exercises for next training based on patterns you noticed

Remember this is school-level ${term.sport} (ages 8-16, PE teachers and school coaches). Keep advice practical and age-appropriate.
IMPORTANT: Always refer to our team as "${ourTeamLabel}" (not "the blue team" or similar). Focus on ${ourTeamLabel} specifically.

IMPORTANT: Generate playerFeedback FIRST — it is the most valuable part of the analysis.

Return JSON:
{
  "playerFeedback": [
    { "squad_number": 7, "name": "Pupil Name", "description": "Pupil in red, #7", "feedback": "...", "rating": 7, "capabilities": { ${taxonomy.capabilities.items.slice(0, 3).map(c => `"${c.key}": "Good"`).join(', ')} } }
  ],
  "summary": "3-4 sentence overview of the whole ${term.matchWord}",
  "formations": ["formations observed across the ${term.matchWord}"],
  "observations": [
    { "category": "${taxonomy.observationCategories.join('|')}", "observation": "...", "timestamp": "2m30s" }
  ],
  "recommendations": [
    { "priority": 1, "focus": "...", "drill": "...", "duration": "15 mins" }
  ]
}
${squadPlayers.length > 0 ? (() => {
  const hasLineupData = squadPlayers.some(p => p.is_starting !== undefined && p.is_starting !== null)
  const starters = hasLineupData ? squadPlayers.filter(p => p.is_starting) : squadPlayers
  const subs = hasLineupData ? squadPlayers.filter(p => !p.is_starting) : []
  return `PLAYER FEEDBACK — THESE ARE THE MOST IMPORTANT RULES:

PLAYERS: ${starters.map(p => { const pStrs = positionStrings(p.positions); const pos = p.match_position || (pStrs.length ? pStrs.join('/') : 'unknown'); const isProfile = !p.match_position && pStrs.length > 0; return `#${p.squad_number || '?'} ${p.name} (${pos}${isProfile ? ' — profile position' : ''})` }).join(', ')}${subs.length > 0 ? `\nSUBS: ${subs.map(p => { const pStrs = positionStrings(p.positions); const pos = p.match_position || (pStrs.length ? pStrs.join('/') : 'unknown'); const isProfile = !p.match_position && pStrs.length > 0; return `#${p.squad_number || '?'} ${p.name} (${pos}${isProfile ? ' — profile position' : ''})` }).join(', ')}` : ''}

RULE 1 — SPECIFIC OBSERVATIONS ARE MANDATORY:
Every pupil's feedback MUST reference specific things from the segment data above — actual actions, moments, or patterns you observed.
GOOD feedback: "Won 3 aerial duels and made a crucial block at 23 minutes, but was caught too far up the pitch for their second goal at 31 minutes leaving space behind him."
BAD feedback: "Contributed to the team effort from centre-back. Played their part in the overall team performance." ← NEVER write generic feedback like this. It is useless to a coach.
If the segment data identified pupils by POSITION rather than shirt number, map those positional observations to the correct pupil using the squad list above. E.g. if the segments reference "the left-back" and the squad shows #3 as LB, attribute those observations to #3.
If you have fewer specific observations for a pupil, reference their positioning, their partnership with nearby pupils, or how the team's shape around them worked — but always be concrete.

RULE 2 — EVALUATE AGAINST THE ROLE THEY ACTUALLY PLAYED:
Some positions above are match-day assignments; others marked "profile position" are the pupil's usual position and they may have played a different role in THIS ${term.matchWord}. In school ${term.sport}, pupils often fill in wherever needed.
- If a pupil has a MATCH-DAY position assigned (not marked "profile position"), TRUST that position. Do NOT assume they switched to a completely different role (e.g. a pupil assigned LCB did NOT go in goal) unless you have overwhelming visual evidence from MULTIPLE segments showing them clearly in a different position.
- If a position is marked "profile position", the pupil may or may not be playing that exact role — use segment observations to determine where they operated.
- Do NOT fabricate substitutions or position changes you didn't clearly observe. If SUBSTITUTIONS MADE data is provided above, USE it — the incoming pupil takes the outgoing pupil's role/position from that minute onward. If no substitution data is provided, assume starters played the full match unless you have specific visual evidence.
- Do NOT repeatedly reference a pupil's listed position in the feedback text — focus on what they DID and how well they did it.
- A fullback caught upfield when the opponent scores = their poor positioning contributed to the goal, even if someone else was closer
- A centre-back who stays disciplined and rarely appears in highlights may be performing excellently
- A midfielder in a double pivot should be judged on how they shield the defence, not on how many forward runs they make
- "Activity" alone is not a positive — running around aimlessly out of position is a negative

RULE 3 — DIFFERENTIATE RATINGS (CRITICAL — DO NOT GIVE EVERYONE THE SAME SCORE):
Not every pupil had the same match. Ratings MUST vary based on actual performance.
- 4-5/10: Poor — errors leading to goals, frequently out of position, significant negative impact
- 6/10: Below par — did some things okay but clear weaknesses or lapses that a coach needs to address
- 7/10: Solid — fulfilled their role competently with no major errors AND showed some positive moments
- 8/10: Very good — stood out positively with multiple specific good moments beyond just doing their job
- 9/10: Exceptional — dominated their area of the pitch with consistent quality, reserved for 1-2 pupils max per match
- 10/10: Perfect — flawless, match-winning performance. Almost never awarded.

RATING DISTRIBUTION RULES (MANDATORY):
1. You MUST use at least 3 different ratings across the squad — ideally 4+
2. No more than 3 pupils can share the same rating. If you have 4+ at the same number, move the best one UP and the weakest one DOWN.
3. You MUST have at least one pupil rated BELOW the squad average AND at least one rated ABOVE. There is always a best and worst performer.
4. Before finalising: rank all pupils mentally from best to worst performance. The top-ranked pupil MUST have the highest rating and the bottom-ranked MUST have the lowest. If they're the same number, your ratings are wrong.
5. If goals were conceded, at least one defender or midfielder at fault should score lower than the squad average.
6. A goalkeeper who made several important saves is NOT the same rating as a midfielder who was anonymous — the GK clearly had the better match.
7. Players directly involved in goals (scorers, assisters) should generally rate higher than pupils with no direct contributions — unless their overall play was poor outside those moments.

RULE 4 — POSITION-SPECIFIC EVALUATION:
Evaluate pupils according to their role. Different positions contribute differently:

${Object.values(taxonomy.positionGuidance).map(g => g.guidance).join('\n\n')}

RULE 5 — COMPLETENESS:
- You MUST include feedback for ALL ${starters.length} starting pupils
- NEVER include pupils not in the squad list above
- For subs: only include if evidence they came on in later segments
- Use shirt numbers from the video AND squad list together

RULE 6 — ${taxonomy.capabilities.label.toUpperCase()}:
For each pupil, evaluate against these ${taxonomy.capabilities.items.length} core capabilities where evidence exists:
${taxonomy.capabilities.items.map(c => `- ${c.label}: ${c.description}`).join('\n')}

Include a "capabilities" object for each pupil with only the capabilities you have specific evidence for.
Set value to one of: ${taxonomy.capabilityScale.map(s => `"${s}"`).join(', ')}, or omit if not observed.

RULE 7 — CAMERA PERSPECTIVE AND DIRECTIONAL ACCURACY:
The footage is from a fixed sideline camera. Do NOT confidently state "left channel" or "right channel" based on screen position alone — teams switch ends at ${term.periods}, so screen-left/right does not reliably correspond to the actual pitch sides. Only reference a specific channel (left/right) if you can confirm it by identifying a known pupil's assigned position. Otherwise use "wide channel", "out wide", or "from the flank".${resultScoringContext}${ageFeedbackGuidance}`
})() : ''}`

  const params = {
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    temperature: 0.3,
    system: cacheableSystem(`You are The Gaffer, Touchline's AI tactical assistant for ${term.context}. You synthesise detailed ${term.matchWord} segment analyses into comprehensive, actionable coaching reports. Be constructive and practical. Always respond with valid JSON.`),
    messages: [{ role: 'user', content: prompt }],
  }
  let response = await callClaudeWithRetry(params, 3, CLAUDE_SYNTHESIS_TIMEOUT_MS)

  // Detect truncation — if the response was cut off, the JSON (especially playerFeedback) may be incomplete
  if (response.stop_reason === 'max_tokens') {
    console.warn(`[Gaffer] Synthesis response truncated at ${params.max_tokens} tokens — retrying with higher limit`)
    params.max_tokens = 32000
    response = await callClaudeWithRetry(params, 3, CLAUDE_SYNTHESIS_TIMEOUT_MS)
    if (response.stop_reason === 'max_tokens') {
      console.warn(`[Gaffer] Synthesis STILL truncated at ${params.max_tokens} tokens`)
    }
  }

  try {
    let text = response.content[0].text
    // Strip markdown code fences — handle 3+ backticks, same-line or multi-line
    text = text.replace(/^`{3,}(?:json)?\s*/i, '').replace(/\s*`{3,}\s*$/i, '').trim()

    // Normalize snake_case keys from AI response to camelCase
    function normalizeKeys(obj) {
      if (obj.player_feedback && !obj.playerFeedback) {
        obj.playerFeedback = obj.player_feedback
        delete obj.player_feedback
      }
      // Also handle other potential snake_case keys
      if (obj.segment_summary && !obj.segmentSummary) obj.segmentSummary = obj.segment_summary
      if (obj.player_notes && !obj.playerNotes) obj.playerNotes = obj.player_notes
      return obj
    }

    // Try direct parse first (most common case — clean JSON)
    try {
      return normalizeKeys(JSON.parse(text))
    } catch (e1) {
      console.log(`[Gaffer] Direct JSON parse failed: ${e1.message}`)

      // Try extracting the outermost { ... }
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          return normalizeKeys(JSON.parse(jsonMatch[0]))
        } catch (e2) {
          console.log(`[Gaffer] Regex JSON parse failed: ${e2.message}`)

          // Try fixing common AI JSON issues: trailing commas before } or ]
          let repaired = jsonMatch[0]
            .replace(/,\s*([}\]])/g, '$1')           // Remove trailing commas
            .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":') // Unquoted keys
          try {
            return normalizeKeys(JSON.parse(repaired))
          } catch (e3) {
            console.log(`[Gaffer] Repaired JSON parse also failed: ${e3.message}`)
            console.log(`[Gaffer] Raw text (first 500 chars): ${text.substring(0, 500)}`)
          }
        }
      }
    }

    // All parse attempts failed — extract what we can via regex
    console.log('[Gaffer] Falling back to regex field extraction')
    const result = { summary: text }

    // Try to extract summary string
    const summaryMatch = text.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/s)
    if (summaryMatch) result.summary = summaryMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')

    // Try to extract arrays by finding [...] after each key
    const obsMatch = text.match(/"observations"\s*:\s*(\[[\s\S]*?\])\s*[,}]/s)
    if (obsMatch) {
      try { result.observations = JSON.parse(obsMatch[1]) } catch {}
    }

    const recMatch = text.match(/"recommendations"\s*:\s*(\[[\s\S]*?\])\s*[,}]/s)
    if (recMatch) {
      try { result.recommendations = JSON.parse(recMatch[1]) } catch {}
    }

    // Match both camelCase and snake_case variants — use GREEDY match to capture the full array
    const pfMatch = text.match(/"pupil[_]?[Ff]eedback"\s*:\s*(\[[\s\S]*\])\s*[,}]/s)
    if (pfMatch) {
      try {
        result.playerFeedback = JSON.parse(pfMatch[1])
      } catch (pfErr) {
        console.warn(`[Gaffer] Regex-extracted playerFeedback failed to parse (${pfErr.message}) — captured ${pfMatch[1].length} chars`)
        // Try to salvage: extract individual complete objects from the truncated array
        const objectMatches = pfMatch[1].matchAll(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g)
        const salvaged = []
        for (const m of objectMatches) {
          try { salvaged.push(JSON.parse(m[0])) } catch { /* skip malformed */ }
        }
        if (salvaged.length > 0) {
          console.log(`[Gaffer] Salvaged ${salvaged.length} pupil entries from truncated response`)
          result.playerFeedback = salvaged
        }
      }
    } else {
      console.warn('[Gaffer] No playerFeedback found in regex fallback extraction')
    }

    return result
  } catch (outerErr) {
    console.error('[Gaffer] Synthesis parse completely failed:', outerErr.message)
    return { summary: response.content[0].text }
  }
}

/**
 * Analyse a Mux video by extracting frames and sending to Claude Vision.
 * For full matches: samples many frames, batches into segments, then synthesises.
 * For clips: single-pass analysis with denser frame sampling.
 * Runs asynchronously — caller should not await this in the request cycle.
 */
export async function analyseVideoWithMux(video, options = {}) {
  const { analysisType = 'full_match', pupilId, clipId, context = {}, teamColour, squadPlayers = [] } = options
  const duration = video.duration_seconds || 0
  const playbackId = video.mux_playback_id

  if (!playbackId) {
    console.error('[Gaffer] No playback ID for video', video.id)
    return
  }

  // Clean up old failed records for this video so they don't trigger stale error toasts
  try {
    await pool.query(
      `DELETE FROM video_ai_analysis WHERE video_id = $1 AND status = 'failed'`,
      [video.id]
    )
  } catch (err) {
    console.error('[Gaffer] Failed to clean up old failed records:', err.message)
  }

  // Create a progress record immediately so the frontend can track status
  let analysisId
  try {
    const insertResult = await pool.query(
      `INSERT INTO video_ai_analysis (video_id, clip_id, analysis_type, pupil_id, status, progress)
       VALUES ($1, $2, $3, $4, 'processing', 'Extracting frames...')
       RETURNING id`,
      [video.id, clipId || null, analysisType, pupilId || null]
    )
    analysisId = insertResult.rows[0].id
  } catch (err) {
    console.error('[Gaffer] Failed to create progress record:', err.message)
  }

  async function updateProgress(progress) {
    if (!analysisId) return
    try {
      await pool.query('UPDATE video_ai_analysis SET progress = $1 WHERE id = $2', [progress, analysisId])
    } catch { /* ignore progress update failures */ }
  }

  const isClip = duration < 120 // Under 2 minutes = treat as clip
  const depth = options.depth || 'standard'
  const limits = FRAME_LIMITS[depth] || FRAME_LIMITS.standard
  const maxFrames = isClip ? limits.clip : limits.fullMatch
  const minInterval = isClip ? limits.minClipInterval : limits.minFullInterval
  const interval = Math.max(minInterval, Math.ceil(duration / maxFrames))

  const frameTimes = []
  const startOffset = isClip ? 2 : 10
  for (let t = startOffset; t < duration; t += interval) {
    frameTimes.push(Math.round(t))
  }

  if (frameTimes.length === 0 && duration > 0) {
    frameTimes.push(Math.round(duration / 2))
  }

  console.log(`[Gaffer] Sampling ${frameTimes.length} frames from ${Math.round(duration)}s video (${isClip ? 'clip' : 'full match'} mode, ${interval}s interval)`)

  const allFrames = await fetchFramesBatch(playbackId, frameTimes)

  if (allFrames.length === 0) {
    console.error('[Gaffer] No frames extracted for video', video.id)
    if (analysisId) {
      await pool.query('UPDATE video_ai_analysis SET status = $1, error = $2, progress = NULL WHERE id = $3',
        ['failed', 'Failed to extract frames from video', analysisId])
    }
    return
  }

  console.log(`[Gaffer] Fetched ${allFrames.length}/${frameTimes.length} frames successfully`)
  await updateProgress(`Extracted ${allFrames.length} frames`)

  let analysis

  try {
    if (allFrames.length <= FRAMES_PER_BATCH) {
      console.log(`[Gaffer] Single-pass analysis (${allFrames.length} frames)`)
      await updateProgress('Analysing video...')

      const segResult = await analyseSegment(allFrames, 0, 1, video, options)

      if (allFrames.length <= 10) {
        analysis = {
          summary: segResult.segmentSummary,
          observations: (segResult.observations || []).map(o => ({
            category: o.category,
            observation: o.observation,
            timestamp: o.timestamp,
          })),
          recommendations: [],
          playerFeedback: (segResult.playerNotes || []).map(p => ({
            squad_number: p.squad_number,
            name: p.name,
            description: p.name || `#${p.squad_number}`,
            feedback: p.action,
            rating: null,
          })),
        }
      } else {
        await updateProgress('Building report...')
        analysis = await synthesiseAnalysis([segResult], video, options)
      }
    } else {
      const batches = []
      for (let i = 0; i < allFrames.length; i += FRAMES_PER_BATCH) {
        batches.push(allFrames.slice(i, i + FRAMES_PER_BATCH))
      }

      console.log(`[Gaffer] Multi-pass analysis: ${batches.length} batches of ~${FRAMES_PER_BATCH} frames`)

      // Process batches in parallel (3 concurrent for deep, 2 for standard)
      // Visual profiles accumulate across waves so later segments can identify pupils more reliably
      const SEGMENT_CONCURRENCY = depth === 'deep' ? 3 : 2
      const segmentResults = new Array(batches.length)
      let completed = 0
      const knownProfiles = {} // Accumulated visual profiles: { squadNumber: { name, descriptors: [] } }

      for (let wave = 0; wave < batches.length; wave += SEGMENT_CONCURRENCY) {
        // Check if analysis was cancelled before starting next wave
        if (analysisId) {
          const statusCheck = await pool.query('SELECT status FROM video_ai_analysis WHERE id = $1', [analysisId])
          if (statusCheck.rows[0]?.status === 'cancelled') {
            console.log(`[Gaffer] Analysis ${analysisId} cancelled by user — stopping`)
            return
          }
        }

        const waveBatches = batches.slice(wave, wave + SEGMENT_CONCURRENCY)
        const waveStart = wave
        await updateProgress(`Analysing segments ${wave + 1}-${Math.min(wave + waveBatches.length, batches.length)} of ${batches.length}...`)

        // Pass accumulated visual profiles into each segment's options
        const waveOptions = { ...options, knownProfiles }

        // Timeout the entire wave (3 minutes per segment in the wave, minimum 4 minutes)
        const waveTimeoutMs = Math.max(waveBatches.length * 3 * 60_000, 4 * 60_000)
        const waveResults = await withTimeout(
          Promise.allSettled(
            waveBatches.map((batch, j) => {
              const idx = waveStart + j
              console.log(`[Gaffer] Analysing segment ${idx + 1}/${batches.length} (${batch.length} frames)...`)
              return analyseSegment(batch, idx, batches.length, video, waveOptions)
            })
          ),
          waveTimeoutMs,
          `Wave segments ${wave + 1}-${Math.min(wave + waveBatches.length, batches.length)}`
        ).catch(err => {
          console.error(`[Gaffer] Wave timed out: ${err.message}`)
          // Return rejected results for all segments in this wave
          return waveBatches.map(() => ({ status: 'rejected', reason: err }))
        })

        for (let j = 0; j < waveResults.length; j++) {
          const idx = waveStart + j
          if (waveResults[j].status === 'fulfilled') {
            const result = waveResults[j].value
            result._frameCount = waveBatches[j].length
            segmentResults[idx] = result

            // Accumulate visual profiles from this segment's pupil notes
            for (const note of (result.playerNotes || [])) {
              if (note.squad_number && note.visual) {
                const num = String(note.squad_number)
                if (!knownProfiles[num]) {
                  knownProfiles[num] = { name: note.name || `#${num}`, descriptors: [] }
                }
                // Add new visual descriptors, avoiding duplicates
                const newDescriptors = note.visual.split(',').map(d => d.trim().toLowerCase()).filter(Boolean)
                for (const d of newDescriptors) {
                  if (!knownProfiles[num].descriptors.some(existing => existing.includes(d) || d.includes(existing))) {
                    knownProfiles[num].descriptors.push(d)
                  }
                }
              }
            }
          } else {
            console.error(`[Gaffer] Segment ${idx + 1} failed:`, waveResults[j].reason?.message)
            segmentResults[idx] = {
              segmentSummary: `Segment ${idx + 1} analysis failed`,
              observations: [],
              playerNotes: [],
              _frameCount: waveBatches[j].length,
            }
          }
          completed++
        }
        await updateProgress(`Completed ${completed} of ${batches.length} segments...`)
      }

      const profileCount = Object.keys(knownProfiles).length
      if (profileCount > 0) {
        console.log(`[Gaffer] Built visual profiles for ${profileCount} pupils: ${Object.entries(knownProfiles).map(([num, p]) => `#${num} ${p.name} (${p.descriptors.length} traits)`).join(', ')}`)
      }

      // Check cancellation before synthesis
      if (analysisId) {
        const statusCheck = await pool.query('SELECT status FROM video_ai_analysis WHERE id = $1', [analysisId])
        if (statusCheck.rows[0]?.status === 'cancelled') {
          console.log(`[Gaffer] Analysis ${analysisId} cancelled by user — stopping before synthesis`)
          return
        }
      }

      console.log(`[Gaffer] Synthesising ${segmentResults.length} segments...`)
      await updateProgress('Building final report...')
      analysis = await synthesiseAnalysis(segmentResults, video, options)

      // Post-processing: filter out non-squad pupils and ensure all starters have feedback
      if (squadPlayers.length > 0) {
        // Normalize key: AI may return "player_feedback" (snake_case) instead of "playerFeedback" (camelCase)
        if (!analysis.playerFeedback && analysis.player_feedback) {
          console.log(`[Gaffer] AI returned snake_case "player_feedback" — normalizing to camelCase`)
          analysis.playerFeedback = analysis.player_feedback
        }

        // Use Number() coercion for squad_number comparison (AI may return strings)
        const squadNumbers = new Set(squadPlayers.map(p => p.squad_number).filter(Boolean).map(Number))
        const squadNames = new Set(squadPlayers.map(p => p.name?.toLowerCase()).filter(Boolean))

        // Log what the AI returned before filtering
        const aiFeedback = analysis.playerFeedback || []
        console.log(`[Gaffer] AI returned ${aiFeedback.length} playerFeedback entries: ${aiFeedback.map(pf => `#${pf.squad_number} ${pf.name} (type: ${typeof pf.squad_number})`).join(', ')}`)
        console.log(`[Gaffer] Squad numbers in DB: ${[...squadNumbers].join(', ')}`)
        console.log(`[Gaffer] Analysis keys: ${Object.keys(analysis).join(', ')}`)

        // Remove any pupils not in the squad (but don't throw away everything if filtering is too aggressive)
        if (analysis.playerFeedback?.length > 0) {
          const before = analysis.playerFeedback.length
          const filtered = analysis.playerFeedback.filter(pf => {
            const num = pf.squad_number != null ? Number(pf.squad_number) : null
            const numberMatch = num && squadNumbers.has(num)
            const nameMatch = pf.name && squadNames.has(pf.name.toLowerCase())
            return numberMatch || nameMatch
          })
          const removed = before - filtered.length
          if (removed > 0) console.log(`[Gaffer] Filtered out ${removed} pupils not in match squad`)
          // Safeguard: if filtering removed ALL entries, the AI likely used slightly different names/numbers
          // Keep the originals rather than replacing everything with generic placeholders
          if (filtered.length === 0 && before > 0) {
            console.warn(`[Gaffer] WARNING: Filtering removed ALL ${before} playerFeedback entries — keeping originals (likely name/number mismatch)`)
          } else {
            analysis.playerFeedback = filtered
          }
        }

        // Ensure all starters have feedback — fill in any the AI missed
        const starters = squadPlayers.filter(p => p.is_starting)
        if (starters.length > 0) {
          const feedbackNumbers = new Set((analysis.playerFeedback || []).map(pf => pf.squad_number).filter(Boolean).map(Number))
          const feedbackNames = new Set((analysis.playerFeedback || []).map(pf => pf.name?.toLowerCase()).filter(Boolean))
          const missing = starters.filter(p => {
            const num = p.squad_number ? Number(p.squad_number) : null
            const hasNumber = num && feedbackNumbers.has(num)
            const hasName = p.name && feedbackNames.has(p.name.toLowerCase())
            return !hasNumber && !hasName
          })
          if (missing.length > 0) {
            if (!analysis.playerFeedback) analysis.playerFeedback = []
            const ageNum = parseInt(context.ageGroup?.replace(/\D/g, '')) || 14
            let defaultRating = ageNum <= 10 ? 7 : 6
            for (const p of missing) {
              const pStrs = positionStrings(p.positions)
              const pos = p.match_position || (pStrs.length ? pStrs.join('/') : null)
              const posLabel = pos || 'their position'
              // Generate a slightly more useful default based on position type
              let defaultFeedback
              if (['GK'].includes(pos)) {
                defaultFeedback = `Limited footage of the goalkeeper — individual actions were difficult to assess from the available angles. Coach observation recommended for shot-stopping, distribution and communication.`
              } else if (['CB', 'LCB', 'RCB'].includes(pos)) {
                defaultFeedback = `Played from ${posLabel} but individual contributions were difficult to distinguish in the footage. Review defensive positioning, aerial ability and distribution in training.`
              } else if (['LB', 'RB', 'LWB', 'RWB'].includes(pos)) {
                defaultFeedback = `Operated at ${posLabel} but was difficult to track individually in the footage. Assess their overlapping runs, defensive recovery and crossing quality in training.`
              } else if (['CM', 'CDM', 'CAM', 'DM', 'AM'].includes(pos)) {
                defaultFeedback = `Played in midfield at ${posLabel} but individual actions were hard to isolate from the footage. Focus on their passing range, positioning and work rate in upcoming sessions.`
              } else if (['LW', 'RW', 'LM', 'RM', 'ST', 'CF', 'FW'].includes(pos)) {
                defaultFeedback = `Played in the attacking role at ${posLabel} but specific contributions were difficult to assess from the footage. Review their movement, finishing and link-up play in training.`
              } else {
                defaultFeedback = `Individual actions from ${posLabel} were difficult to assess from the available footage. Coach observation during training would provide better insight into their development areas.`
              }
              analysis.playerFeedback.push({
                squad_number: p.squad_number,
                name: p.name,
                description: `#${p.squad_number || '?'} ${p.name}`,
                feedback: defaultFeedback,
                rating: defaultRating,
              })
            }
            console.log(`[Gaffer] Added default feedback for ${missing.length} starters AI missed: ${missing.map(p => p.name).join(', ')}`)
          }
        }
      }
    }
  } catch (err) {
    console.error('[Gaffer] Analysis failed:', err.message)
    // Extract a user-friendly error message
    let userMessage = 'Analysis failed — please try again'
    const status = err?.status || err?.error?.status
    if (status === 400 && (err.message?.includes('balance') || err.message?.includes('billing'))) {
      userMessage = 'AI credits exhausted — please top up your Anthropic API balance'
    } else if (status === 401) {
      userMessage = 'API key invalid — check your Anthropic API key in settings'
    } else if (status === 429) {
      userMessage = 'Rate limited — too many requests, please try again in a few minutes'
    } else if (status === 529 || err.message?.includes('overloaded')) {
      userMessage = 'AI service is busy — please try again in a few minutes'
    }
    if (analysisId) {
      await pool.query('UPDATE video_ai_analysis SET status = $1, error = $2, progress = NULL WHERE id = $3',
        ['failed', userMessage, analysisId])
    }
    return
  }

  // Save completed analysis
  try {
    if (analysisId) {
      await pool.query(
        `UPDATE video_ai_analysis
         SET summary = $1, observations = $2, recommendations = $3, player_feedback = $4,
             frames_analysed = $5, status = 'complete', progress = NULL, error = NULL
         WHERE id = $6`,
        [
          analysis.summary,
          JSON.stringify(analysis.observations || []),
          JSON.stringify(analysis.recommendations || []),
          JSON.stringify(analysis.playerFeedback || []),
          allFrames.length,
          analysisId,
        ]
      )
    } else {
      await pool.query(
        `INSERT INTO video_ai_analysis (video_id, clip_id, analysis_type, pupil_id, summary, observations, recommendations, player_feedback, frames_analysed, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'complete')`,
        [
          video.id,
          clipId || null,
          analysisType,
          pupilId || null,
          analysis.summary,
          JSON.stringify(analysis.observations || []),
          JSON.stringify(analysis.recommendations || []),
          JSON.stringify(analysis.playerFeedback || []),
          allFrames.length,
        ]
      )
    }

    console.log(`[Gaffer] Analysis complete for video ${video.id}: ${allFrames.length} frames analysed across ${Math.ceil(allFrames.length / FRAMES_PER_BATCH)} batch(es)`)

    // Pupil observations are saved when the manager approves the analysis (via /approve endpoint)
  } catch (error) {
    console.error('[Gaffer] Failed to save analysis:', error.message)
    // Mark the record as failed so the frontend can show the error instead of leaving it stuck as 'processing'
    if (analysisId) {
      try {
        await pool.query('UPDATE video_ai_analysis SET status = $1, error = $2, progress = NULL WHERE id = $3',
          ['failed', 'Failed to save analysis results — please try again', analysisId])
      } catch { /* last resort — nothing more we can do */ }
    }
  }
}

/**
 * Save AI pupil feedback as observations linked to the match
 */
export async function savePlayerObservations(video, playerFeedback, squadPlayers, options) {
  const { userId, includeRatings = false } = options
  if (!userId) {
    console.log('[Gaffer] No userId provided — skipping observation auto-save')
    return
  }

  // Map by both number and name for robust lookup
  const playerByNumber = new Map(squadPlayers.filter(p => p.squad_number).map(p => [Number(p.squad_number), p]))
  const playerByName = new Map(squadPlayers.filter(p => p.name).map(p => [p.name.toLowerCase(), p]))

  let saved = 0
  for (const pf of playerFeedback) {
    try {
      const num = pf.squad_number != null ? Number(pf.squad_number) : null
      let pupil = num ? playerByNumber.get(num) : null
      if (!pupil && pf.name) pupil = playerByName.get(pf.name.toLowerCase())
      if (!pupil) continue

      const content = includeRatings && pf.rating
        ? `${pf.feedback} (AI rating: ${pf.rating}/10)`
        : pf.feedback
      await pool.query(
        `INSERT INTO observations (pupil_id, observer_id, type, content, context, context_type, match_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          pupil.id,
          userId,
          'match',
          content,
          'AI Video Analysis',
          'match',
          video.match_id,
        ]
      )

      // Merge video-observed core capabilities into the pupil profile
      if (pf.capabilities && typeof pf.capabilities === 'object') {
        try {
          const validDescriptors = ['excellent', 'very good', 'good', 'developing', 'needs work']
          const caps = {}
          for (const [key, val] of Object.entries(pf.capabilities)) {
            if (val && validDescriptors.includes(val.toLowerCase())) {
              caps[key] = val
            }
          }
          if (Object.keys(caps).length > 0) {
            await pool.query(
              `UPDATE pupils SET
                core_capabilities = COALESCE(core_capabilities, '{}'::jsonb) || $1::jsonb,
                updated_at = NOW()
              WHERE id = $2`,
              [JSON.stringify(caps), pupil.id]
            )
          }
        } catch (capErr) {
          console.log(`[Gaffer] core_capabilities column not yet available for ${pf.name}:`, capErr.message)
        }
      }

      saved++
    } catch (err) {
      console.error(`[Gaffer] Failed to save observation for pupil ${pf.name}:`, err.message)
    }
  }
  console.log(`[Gaffer] Saved ${saved} pupil observations to match ${video.match_id}`)
}

// Keep legacy export for backwards compatibility
export async function analyzeVideo() {
  throw new Error('Legacy ffmpeg analysis removed. Use Mux-based analysis via analyseVideoWithMux.')
}
