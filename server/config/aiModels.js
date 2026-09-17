/**
 * Central registry for Claude model IDs used by background AI services.
 *
 * The voice-extraction pipeline broke in production when its hardcoded dated
 * snapshot (claude-sonnet-4-20250514) was retired by Anthropic — a 404
 * not_found_error on every voice note. Keep model choices here, undated and
 * env-overridable, so the next generation change is config, not code.
 *
 * NOTE: chat/claudeService still pins claude-sonnet-4-6 at ~40 call sites;
 * migrating those onto this registry (and to claude-sonnet-5, which is both
 * newer and cheaper) is a deliberate follow-up, not a find-and-replace —
 * Sonnet 5 rejects temperature/top_p and emits thinking blocks by default,
 * so each call site's params and response parsing need auditing.
 */

// Structured extraction from voice-note transcripts (JSON out).
export const EXTRACTION_MODEL = process.env.AI_MODEL_EXTRACTION || 'claude-sonnet-5'

// Small, fast retrieval helpers (metadata tagging, sub-query formulation).
export const RETRIEVAL_MODEL = process.env.AI_MODEL_RETRIEVAL || 'claude-haiku-4-5'

// The workhorse behind Coach chat, session plans, reports, video analysis and
// school intelligence. Every former claude-sonnet-4-6 call site routes here.
export const WORKHORSE_MODEL = process.env.AI_MODEL_WORKHORSE || 'claude-sonnet-5'

// Request defaults spread into every workhorse call. Sonnet 5 runs adaptive
// thinking by default; `effort` bounds how deep it goes. These routes are
// conversational and generative rather than hard-reasoning tasks, so medium
// holds quality while keeping token spend close to what 4.6 cost.
export const WORKHORSE_REQUEST_DEFAULTS = {
  output_config: { effort: process.env.AI_WORKHORSE_EFFORT || 'medium' },
}

// Pull the first text block from a Messages API response. Current models run
// adaptive thinking by default, so content[0] can be a thinking block —
// response.content[0].text then reads undefined and silently corrupts
// downstream parsing.
export function responseText(response) {
  return response?.content?.find((b) => b.type === 'text')?.text || ''
}
