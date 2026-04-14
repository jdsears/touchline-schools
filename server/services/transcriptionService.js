// Transcription service abstraction
// Provider-agnostic interface for audio-to-text transcription.
// Supports AssemblyAI (preferred) and OpenAI Whisper (fallback).
// Provider is selected via TRANSCRIPTION_PROVIDER env var.

import dotenv from 'dotenv'
dotenv.config()

/**
 * @typedef {Object} TranscriptionResult
 * @property {string} text - The full transcribed text
 * @property {string} language - Detected language code
 * @property {number} durationSeconds - Audio duration
 * @property {number} confidence - Overall confidence 0-1
 * @property {Array<{word: string, start: number, end: number}>} [wordTimings] - Per-word timestamps
 */

/**
 * Transcribe an audio file using the configured provider.
 * @param {string} audioUrl - Signed URL to the audio file
 * @param {Object} options
 * @param {string[]} [options.customVocabulary] - Pupil names and nicknames for improved accuracy
 * @param {string} [options.languageCode] - Language hint (default: en_gb)
 * @returns {Promise<TranscriptionResult>}
 */
export async function transcribe(audioUrl, options = {}) {
  const provider = process.env.TRANSCRIPTION_PROVIDER || 'assemblyai'

  switch (provider) {
    case 'assemblyai':
      return transcribeWithAssemblyAI(audioUrl, options)
    case 'whisper':
      return transcribeWithWhisper(audioUrl, options)
    default:
      throw new Error(`Unknown transcription provider: ${provider}`)
  }
}

// ==========================================
// AssemblyAI Provider
// ==========================================
async function transcribeWithAssemblyAI(audioUrl, options = {}) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY
  if (!apiKey) {
    throw new Error('ASSEMBLYAI_API_KEY is required for AssemblyAI transcription')
  }

  const requestBody = {
    audio_url: audioUrl,
    language_code: options.languageCode || 'en_gb',
    punctuate: true,
    format_text: true,
  }

  // Custom vocabulary for pupil name accuracy
  if (options.customVocabulary && options.customVocabulary.length > 0) {
    requestBody.word_boost = options.customVocabulary.slice(0, 1000) // AssemblyAI limit
    requestBody.boost_param = 'high'
  }

  // Submit transcription job
  const submitResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!submitResponse.ok) {
    const error = await submitResponse.text()
    throw new Error(`AssemblyAI submit failed: ${submitResponse.status} ${error}`)
  }

  const submitResult = await submitResponse.json()
  const transcriptId = submitResult.id

  // Poll for completion (max 120 seconds)
  const maxWait = 120_000
  const pollInterval = 2_000
  const startTime = Date.now()

  while (Date.now() - startTime < maxWait) {
    const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: { authorization: apiKey },
    })

    const pollResult = await pollResponse.json()

    if (pollResult.status === 'completed') {
      return {
        text: pollResult.text || '',
        language: pollResult.language_code || 'en_gb',
        durationSeconds: Math.round((pollResult.audio_duration || 0)),
        confidence: pollResult.confidence || 0,
        wordTimings: pollResult.words?.map(w => ({
          word: w.text,
          start: w.start / 1000,
          end: w.end / 1000,
        })),
      }
    }

    if (pollResult.status === 'error') {
      throw new Error(`AssemblyAI transcription failed: ${pollResult.error}`)
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }

  throw new Error('AssemblyAI transcription timed out after 120 seconds')
}

// ==========================================
// OpenAI Whisper Provider
// ==========================================
async function transcribeWithWhisper(audioUrl, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for Whisper transcription')
  }

  // Download the audio file first (Whisper needs file upload, not URL)
  const audioResponse = await fetch(audioUrl)
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.status}`)
  }
  const audioBlob = await audioResponse.blob()

  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')
  formData.append('model', 'whisper-1')
  formData.append('language', 'en')
  formData.append('response_format', 'verbose_json')

  if (options.customVocabulary && options.customVocabulary.length > 0) {
    // Whisper uses a prompt hint for custom vocabulary
    formData.append('prompt', `Names mentioned: ${options.customVocabulary.slice(0, 100).join(', ')}`)
  }

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Whisper transcription failed: ${response.status} ${error}`)
  }

  const result = await response.json()

  return {
    text: result.text || '',
    language: result.language || 'en',
    durationSeconds: Math.round(result.duration || 0),
    confidence: 0.85, // Whisper does not return a confidence score
    wordTimings: result.words?.map(w => ({
      word: w.word,
      start: w.start,
      end: w.end,
    })),
  }
}

/**
 * Build custom vocabulary list from a pupil roster.
 * Includes first names, last names, and nicknames.
 */
export function buildCustomVocabulary(pupils) {
  const words = new Set()
  for (const pupil of pupils) {
    if (pupil.first_name) words.add(pupil.first_name)
    if (pupil.last_name) words.add(pupil.last_name)
    if (pupil.nicknames) {
      for (const nick of pupil.nicknames) {
        if (nick) words.add(nick)
      }
    }
  }
  return Array.from(words)
}
