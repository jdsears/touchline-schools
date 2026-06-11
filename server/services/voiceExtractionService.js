// Voice Observation Extraction Service
// Takes a transcript and context, calls Claude to extract structured observations.

import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'
import { buildExtractionPrompt, EXTRACTION_PROMPT_VERSION } from '../prompts/voiceObservationExtraction.js'

dotenv.config()

// Guarded client: without ANTHROPIC_API_KEY the server must still boot;
// any AI call then fails with a clear, mappable 503 error instead.
function makeAnthropicClient(options = {}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Proxy({}, {
      get() {
        const err = new Error('AI features are not configured on this server. Set ANTHROPIC_API_KEY to enable them.')
        err.status = 503
        err.code = 'AI_NOT_CONFIGURED'
        throw err
      },
    })
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, ...options })
}

const anthropic = makeAnthropicClient()

/**
 * Extract observations from a voice transcript using Claude.
 *
 * @param {Object} params
 * @param {string} params.transcript - The full transcript text
 * @param {string} params.teacherName - Teacher's name
 * @param {string} params.sport - Sport context
 * @param {string} params.contextType - session, match, half_time, etc.
 * @param {string} [params.contextLabel] - Human-readable context label
 * @param {Array} params.pupils - Pupil roster with id, first_name, last_name, nicknames
 * @returns {Promise<Object>} Extracted observations, team notes, action items
 */
export async function extractObservations({ transcript, teacherName, sport, contextType, contextLabel, pupils }) {
  if (!transcript || transcript.trim().length === 0) {
    return {
      observations: [],
      team_level_notes: [],
      action_items: [],
      filtered_fragments: [],
      prompt_version: EXTRACTION_PROMPT_VERSION,
    }
  }

  const systemPrompt = buildExtractionPrompt({
    teacherName,
    sport,
    contextType,
    contextLabel,
    pupils,
  })

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Please extract observations from this transcript:\n\n${transcript}`,
        },
      ],
    })

    const text = response.content[0]?.text || '{}'

    // Parse the JSON response
    // Claude sometimes wraps JSON in markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text]
    const jsonStr = jsonMatch[1].trim()

    const result = JSON.parse(jsonStr)

    return {
      observations: result.observations || [],
      team_level_notes: result.team_level_notes || [],
      action_items: result.action_items || [],
      filtered_fragments: result.filtered_fragments || [],
      prompt_version: EXTRACTION_PROMPT_VERSION,
      model: response.model,
      input_tokens: response.usage?.input_tokens,
      output_tokens: response.usage?.output_tokens,
    }
  } catch (error) {
    if (error?.code === 'AI_NOT_CONFIGURED' || error?.code === 'VIDEO_NOT_CONFIGURED') throw error
    console.error('Voice extraction error:', error)
    throw new Error(`Extraction failed: ${error.message}`)
  }
}
