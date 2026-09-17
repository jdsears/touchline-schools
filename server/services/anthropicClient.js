import Anthropic from '@anthropic-ai/sdk'

// One guarded client for the AI services that use the model registry.
// Without ANTHROPIC_API_KEY the server still boots; the first call throws the
// 503 AI_NOT_CONFIGURED error the error handler maps to a clean response.
export function makeAnthropicClient() {
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
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

export const anthropic = makeAnthropicClient()

// Pull the JSON object out of a model reply that may still carry fences or
// a stray sentence, without trusting anything outside the braces.
export function parseJsonObject(text) {
  const cleaned = String(text || '').replace(/```(?:json)?/gi, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('The model did not return JSON')
  return JSON.parse(cleaned.slice(start, end + 1))
}
