import { anthropic, parseJsonObject } from './anthropicClient.js'
import { WORKHORSE_MODEL, WORKHORSE_REQUEST_DEFAULTS, responseText } from '../config/aiModels.js'

const SYSTEM_PROMPT = `You help PE teachers in UK secondary schools write Individual Development Plan (IDP) goals for a pupil.

Rules:
- Every goal must be grounded in the observations supplied and cite them by id. Never invent facts, injuries, scores or events that are not in the evidence.
- Goals are SMART: specific, measurable (the success criteria say how the teacher and pupil will know it is met), achievable in the target window, relevant to the evidence, time-bound.
- Prefer development areas the evidence shows are limiting the pupil now; include at most one goal that builds on a strength (leadership, resilience, a transferable skill).
- Do not duplicate or trivially rephrase goals that are already active. If an active goal is clearly superseded by newer evidence, you may suggest a revision and say so in the rationale.
- Use British English and the language a teacher would write in a pupil's plan. Goal descriptions start with a verb and are at most 140 characters.
- Return ONLY a JSON object, no prose and no code fences.`

function buildUserPrompt({ pupil, sports, observations, existingGoals, assessments, maxGoals }) {
  const obsLines = observations.map(o => {
    const date = String(o.created_at).slice(0, 10)
    const tags = [o.type, o.sport, o.context_type].filter(Boolean).join(' · ')
    return `- [${o.id}] ${date} · ${tags}: ${String(o.content).replace(/\s+/g, ' ').trim().slice(0, 400)}`
  })
  const goalLines = existingGoals.length
    ? existingGoals.map(g => `- (${g.status}) ${g.goal_description}${g.sport_key ? ` [${g.sport_key}]` : ''}${g.target_date ? ` due ${String(g.target_date).slice(0, 10)}` : ''}`)
    : ['- none']
  const assessmentLines = assessments.length
    ? assessments.map(a => `- ${a.unit_name || a.sport || 'PE'}: ${a.grade}${a.assessment_type ? ` (${a.assessment_type})` : ''}`)
    : ['- none recorded']

  return `Pupil: ${pupil.name}${pupil.year_group ? ` (Year ${pupil.year_group})` : ''}
Sports they play or study: ${sports.length ? sports.join(', ') : 'not recorded'}
Today: ${new Date().toISOString().slice(0, 10)}

Active and recent IDP goals:
${goalLines.join('\n')}

Latest assessment grades:
${assessmentLines.join('\n')}

Observations (newest first):
${obsLines.join('\n')}

Propose ${Math.min(maxGoals, 4)} goals at most (fewer if the evidence only supports fewer). Respond with this JSON shape:
{"goals":[{"goal_description":"...","success_criteria":"...","rationale":"...","sport_key":"one of: ${sports.length ? sports.join(', ') + ', ' : ''}general","target_weeks":8,"evidence_ids":["observation id", "..."]}]}`
}

function clampWeeks(value) {
  const n = parseInt(value, 10)
  if (!Number.isFinite(n)) return 8
  return Math.min(16, Math.max(3, n))
}

function normaliseSuggestions(parsed, { observations, sports }) {
  const knownIds = new Set(observations.map(o => o.id))
  const allowedSports = new Set([...sports.map(s => String(s).toLowerCase()), 'general'])
  const goals = Array.isArray(parsed?.goals) ? parsed.goals : []
  const today = new Date()

  return goals
    .map(g => {
      const description = String(g?.goal_description || '').replace(/\s+/g, ' ').trim().slice(0, 200)
      if (!description) return null
      const weeks = clampWeeks(g?.target_weeks)
      const target = new Date(today)
      target.setDate(target.getDate() + weeks * 7)
      const sportKey = String(g?.sport_key || 'general').toLowerCase().trim()
      return {
        goal_description: description,
        success_criteria: String(g?.success_criteria || '').trim().slice(0, 400) || null,
        rationale: String(g?.rationale || '').trim().slice(0, 600) || null,
        sport_key: allowedSports.has(sportKey) ? sportKey : 'general',
        target_weeks: weeks,
        target_date: target.toISOString().slice(0, 10),
        evidence_ids: (Array.isArray(g?.evidence_ids) ? g.evidence_ids : []).filter(id => knownIds.has(id)),
      }
    })
    .filter(Boolean)
    .slice(0, 4)
}

// Suggest IDP goals for a pupil from their confirmed observations. Returns
// structured goals with the observation ids each one rests on, so a teacher
// can see the evidence before accepting anything.
export async function suggestGoalsFromObservations({ pupil, sports = [], observations = [], existingGoals = [], assessments = [], maxGoals = 4 }) {
  const response = await anthropic.messages.create({
    model: WORKHORSE_MODEL,
    ...WORKHORSE_REQUEST_DEFAULTS,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt({ pupil, sports, observations, existingGoals, assessments, maxGoals }) }],
  })
  const parsed = parseJsonObject(responseText(response))
  return normaliseSuggestions(parsed, { observations, sports })
}

export const _internals = { parseJsonObject, normaliseSuggestions, buildUserPrompt }
