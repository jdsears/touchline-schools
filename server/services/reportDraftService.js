import pool from '../config/database.js'
import { anthropic, parseJsonObject } from './anthropicClient.js'
import { WORKHORSE_MODEL, WORKHORSE_REQUEST_DEFAULTS, responseText } from '../config/aiModels.js'

// Drafts a pupil's report comment from what the school actually holds about
// them for the term: the teacher's grades, assessments against the
// curriculum strands, confirmed observations, current development goals and
// the last published report. The teacher edits and submits; nothing here
// changes a report's status.

const SYSTEM_PROMPT = `You write end-of-term PE report comments for parents on behalf of a teacher in a UK secondary school.

Rules:
- Write in British English, in the third person, using the pupil's first name. Parents are the readers, but never address them as "you".
- Ground every statement in the evidence supplied: the teacher's grades, assessments, confirmed observations and development goals. Never invent events, results, injuries, attitudes or comparisons that the evidence does not show. If the evidence is thin, write less rather than pad.
- Shape: what the pupil has worked on and how they have performed this term, with one or two specific examples from the evidence; effort and attitude only where the evidence supports it; then one clear, achievable next step.
- Reflect the attainment and effort grades the teacher selected in the overall tone, but do not quote grade codes, scale names, criterion names or the word "observation".
- If a previous report is supplied, mention progress since it only where the new evidence shows it.
- Tone: warm, professional, specific and honest. No inflated superlatives, no jargon, no emojis, no bullet points, no headings.
- Never mention AI, drafting or that the comment was generated.
- Return ONLY a JSON object, no prose and no code fences:
{"comment":"...","evidence_ids":["observation id", "..."]}
where evidence_ids lists the ids of the observations you drew on (empty if none).`

// Report editors use words; school scales use codes (Sec/Exc, effort 1-5).
// Describe both in plain words for the prompt.
const ATTAINMENT_WORDS = {
  exc: 'excelling', excelling: 'excelling',
  sec: 'secure', secure: 'secure',
  dev: 'developing', developing: 'developing',
  beg: 'beginning', emerging: 'emerging',
}
const EFFORT_WORDS = {
  excellent: 'excellent', very_good: 'very good', good: 'good', needs_improvement: 'needs improvement',
  5: 'excellent (5 of 5)', 4: 'very good (4 of 5)', 3: 'good (3 of 5)', 2: 'inconsistent (2 of 5)', 1: 'a concern (1 of 5)',
}

export function describeGrade(value, table) {
  if (value === null || value === undefined || value === '') return null
  const key = String(value).trim().toLowerCase()
  return table[key] || String(value)
}

const DEFAULT_WORDS = { min: 80, max: 130 }

function wordRange(template) {
  const s = template?.structure && typeof template.structure === 'object' ? template.structure : {}
  const min = parseInt(s.min_words, 10)
  const max = parseInt(s.max_words ?? s.word_limit, 10)
  return {
    min: Number.isFinite(min) && min >= 30 ? min : DEFAULT_WORDS.min,
    max: Number.isFinite(max) && max >= 60 ? max : DEFAULT_WORDS.max,
  }
}

function isoDay(value) {
  return value ? String(value instanceof Date ? value.toISOString() : value).slice(0, 10) : ''
}

function clean(text, max = 500) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, max)
}

// Everything the school holds about the pupil that a report can rest on.
// Evidence is scoped to roughly the term before the window opened.
export async function gatherReportEvidence({ pupilId, schoolId, window = null, unitId = null, sport = null }) {
  const anchor = window?.opens_at ? new Date(window.opens_at) : new Date()
  const since = new Date(anchor)
  since.setDate(since.getDate() - 84)
  const sinceIso = since.toISOString().slice(0, 10)

  const unitQuery = unitId
    ? pool.query(
      `SELECT su.id, su.sport, su.unit_name, su.term, tg.name AS class_name
       FROM sport_units su LEFT JOIN teaching_groups tg ON tg.id = su.teaching_group_id
       WHERE su.id = $1`,
      [unitId]
    )
    : pool.query(
      `SELECT su.id, su.sport, su.unit_name, su.term, tg.name AS class_name
       FROM teaching_group_pupils tgp
       JOIN teaching_groups tg ON tg.id = tgp.teaching_group_id
       JOIN sport_units su ON su.teaching_group_id = tg.id
       WHERE tgp.pupil_id = $1 AND ($2::text IS NULL OR su.sport = $2)
       ORDER BY (su.start_date <= CURRENT_DATE AND su.end_date >= CURRENT_DATE) DESC, su.end_date DESC
       LIMIT 1`,
      [pupilId, sport || null]
    )

  const [unitRes, assessRes, obsRes, goalsRes, prevRes, templateRes] = await Promise.all([
    unitQuery.catch(() => ({ rows: [] })),
    pool.query(
      `SELECT pa.grade, pa.score, pa.teacher_notes, pa.assessed_at, pa.assessment_type,
              cs.strand_name, COALESCE(ac.criterion_name, ac.criterion) AS criterion,
              su.unit_name, su.sport, su.id AS unit_id
       FROM pupil_assessments pa
       LEFT JOIN assessment_criteria ac ON ac.id = pa.criteria_id
       LEFT JOIN curriculum_strands cs ON cs.id = ac.strand_id
       LEFT JOIN sport_units su ON su.id = pa.unit_id
       WHERE pa.pupil_id = $1 AND pa.grade IS NOT NULL
       ORDER BY COALESCE(su.id = $2::uuid, false) DESC, (pa.assessed_at >= $3::date) DESC, pa.assessed_at DESC
       LIMIT 12`,
      [pupilId, unitId || null, sinceIso]
    ).catch(() => ({ rows: [] })),
    pool.query(
      `SELECT id, type, sport, context_type, content, created_at
       FROM observations
       WHERE pupil_id = $1
         AND COALESCE(review_state, 'confirmed') IN ('confirmed', 'edited')
         AND created_at >= $2::date
       ORDER BY created_at DESC LIMIT 20`,
      [pupilId, sinceIso]
    ).catch(() => ({ rows: [] })),
    pool.query(
      `SELECT id, goal_description, success_criteria, status, sport_key, target_date
       FROM pupil_idp_goals
       WHERE pupil_id = $1 AND status IN ('in_progress', 'revised')
       ORDER BY created_at DESC LIMIT 5`,
      [pupilId]
    ).catch(() => ({ rows: [] })),
    pool.query(
      `SELECT pr.teacher_comment, pr.attainment_grade, pr.effort_grade, rw.name AS window_name, rw.term
       FROM pupil_reports pr JOIN reporting_windows rw ON rw.id = pr.reporting_window_id
       WHERE pr.pupil_id = $1 AND pr.status = 'published' AND pr.teacher_comment IS NOT NULL
         AND ($2::uuid IS NULL OR pr.reporting_window_id <> $2::uuid)
       ORDER BY rw.closes_at DESC NULLS LAST, pr.updated_at DESC LIMIT 1`,
      [pupilId, window?.id || null]
    ).catch(() => ({ rows: [] })),
    schoolId
      ? pool.query(
        `SELECT tone_guidance, structure FROM reporting_templates
         WHERE school_id = $1 ORDER BY is_default DESC, created_at ASC LIMIT 1`,
        [schoolId]
      ).catch(() => ({ rows: [] }))
      : Promise.resolve({ rows: [] }),
  ])

  // Only the assessments that belong to this term's unit or window count as
  // "this term"; older ones are kept as context but labelled as such.
  const assessments = assessRes.rows.map(a => ({ ...a, this_term: isoDay(a.assessed_at) >= sinceIso }))

  return {
    unit: unitRes.rows[0] || null,
    assessments,
    observations: obsRes.rows,
    goals: goalsRes.rows,
    previousReport: prevRes.rows[0] || null,
    template: templateRes.rows[0] || null,
    since: sinceIso,
  }
}

export function buildUserPrompt({ pupil, window, unit, grades = {}, assessments = [], observations = [], goals = [], previousReport = null, template = null }) {
  const words = wordRange(template)
  const firstName = pupil.first_name || String(pupil.name || '').split(' ')[0] || 'The pupil'
  const attainment = describeGrade(grades.attainment, ATTAINMENT_WORDS)
  const effort = describeGrade(grades.effort, EFFORT_WORDS)

  const gradeLine = attainment || effort
    ? `Teacher's grades for this report: ${[attainment && `attainment ${attainment}`, effort && `effort ${effort}`].filter(Boolean).join('; ')}`
    : "Teacher's grades for this report: not chosen yet (let the evidence set the tone)"

  const assessmentLines = assessments.length
    ? assessments.map(a => {
      const label = [a.strand_name, a.criterion].filter(Boolean).join(' – ') || a.unit_name || 'Assessment'
      const when = isoDay(a.assessed_at)
      const scope = a.this_term ? '' : ' (earlier)'
      return `- ${when}${scope} · ${label}${a.unit_name ? ` · ${a.unit_name}` : ''}: ${a.grade}${a.teacher_notes ? ` — ${clean(a.teacher_notes, 240)}` : ''}`
    })
    : ['- none recorded']

  const observationLines = observations.length
    ? observations.map(o => {
      const tags = [o.type, o.sport, o.context_type].filter(Boolean).join(' · ')
      return `- [${o.id}] ${isoDay(o.created_at)}${tags ? ` · ${tags}` : ''}: ${clean(o.content, 400)}`
    })
    : ['- none this term']

  const goalLines = goals.length
    ? goals.map(g => `- (${g.status}) ${clean(g.goal_description, 200)}${g.success_criteria ? ` — success looks like: ${clean(g.success_criteria, 200)}` : ''}`)
    : ['- none']

  const previous = previousReport
    ? `Previous published report (${previousReport.window_name}${previousReport.term ? `, ${previousReport.term} term` : ''}): "${clean(previousReport.teacher_comment, 900)}"`
    : 'Previous published report: none'

  const tone = template?.tone_guidance ? clean(template.tone_guidance, 600) : 'none beyond the rules above'

  return `Pupil: ${pupil.name || firstName}${pupil.year_group ? ` (Year ${pupil.year_group})` : ''}${unit?.class_name ? `, class ${unit.class_name}` : ''}
Report: ${window ? `${window.name}${window.term ? ` (${window.term} term` : ''}${window.academic_year ? `${window.term ? ', ' : ' ('}${window.academic_year}` : ''}${window.term || window.academic_year ? ')' : ''}` : 'this term'}
Unit this term: ${unit ? `${unit.unit_name}${unit.sport ? ` (${unit.sport})` : ''}` : 'not specified'}
${gradeLine}
Length: between ${words.min} and ${words.max} words, in one or two paragraphs.
School guidance on tone: ${tone}

${previous}

Assessments (strand – criterion · unit: grade, with the teacher's note where there is one):
${assessmentLines.join('\n')}

Confirmed observations this term (newest first):
${observationLines.join('\n')}

Current development goals:
${goalLines.join('\n')}

Write the report comment for ${firstName} now. Respond with the JSON shape only.`
}

function countWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length
}

export function normaliseDraft(parsed, { observations = [] } = {}) {
  let comment = String(parsed?.comment || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if ((comment.startsWith('"') && comment.endsWith('"')) || (comment.startsWith('“') && comment.endsWith('”'))) {
    comment = comment.slice(1, -1).trim()
  }
  if (!comment) throw new Error('The model returned an empty comment')

  const known = new Set(observations.map(o => String(o.id)))
  const evidenceIds = (Array.isArray(parsed?.evidence_ids) ? parsed.evidence_ids : [])
    .map(String)
    .filter(id => known.has(id))

  return { comment, evidence_ids: [...new Set(evidenceIds)], word_count: countWords(comment) }
}

// Ask the model for the comment. `client` is injectable so the shape of the
// exchange can be exercised without a live key.
export async function draftReportComment(input, { client = anthropic } = {}) {
  const response = await client.messages.create({
    model: WORKHORSE_MODEL,
    ...WORKHORSE_REQUEST_DEFAULTS,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(input) }],
  })
  const parsed = parseJsonObject(responseText(response))
  return normaliseDraft(parsed, input)
}

// Keep the machine draft beside whatever the teacher finally writes, on the
// report row this teacher owns for the window (seeded and HoD-created rows
// have no generated_by, so a matching teacher_id claims those too).
export async function storeAiDraft({ pupilId, windowId, teacherId, unitId = null, sport = null, draft }) {
  const existing = await pool.query(
    `SELECT id FROM pupil_reports
     WHERE pupil_id = $1 AND reporting_window_id = $2
       AND (generated_by = $3 OR (generated_by IS NULL AND (teacher_id = $3 OR teacher_id IS NULL)))
     ORDER BY (generated_by = $3) DESC NULLS LAST, updated_at DESC NULLS LAST LIMIT 1`,
    [pupilId, windowId, teacherId]
  )
  if (existing.rows[0]) {
    await pool.query(
      `UPDATE pupil_reports SET ai_draft = $1, updated_at = NOW() WHERE id = $2`,
      [draft, existing.rows[0].id]
    )
    return existing.rows[0].id
  }
  const inserted = await pool.query(
    `INSERT INTO pupil_reports (pupil_id, reporting_window_id, unit_id, sport, ai_draft, generated_by, teacher_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $6, 'draft') RETURNING id`,
    [pupilId, windowId, unitId, sport, draft, teacherId]
  )
  return inserted.rows[0].id
}

export const _internals = { SYSTEM_PROMPT, wordRange, ATTAINMENT_WORDS, EFFORT_WORDS }
