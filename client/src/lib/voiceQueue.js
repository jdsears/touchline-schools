import { voiceObservationService } from '../services/api'
import { idbPut, idbGet, idbGetAll, idbDelete, VOICE_QUEUE_STORE, META_STORE } from './offlineDb'

// Outbox for voice notes recorded without signal. A recording that cannot
// be uploaded is kept on the device (audio blob + context) and retried:
// by the app when it regains connectivity or opens, and by the service
// worker's background sync when the browser supports it. Every attempt
// carries the same client id, so the server files the note once.

export const VOICE_QUEUE_EVENT = 'voice-queue-changed'
export const VOICE_SYNC_TAG = 'voice-uploads'

function notify() {
  try { window.dispatchEvent(new CustomEvent(VOICE_QUEUE_EVENT)) } catch { /* non-browser */ }
}

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '')
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}

export function isNetworkError(err) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  if (!err) return false
  if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED') return true
  return !err.response && !!err.request
}

// Keep a copy of the session token where the service worker can read it;
// it has no access to localStorage.
async function rememberToken() {
  try {
    const token = localStorage.getItem('fam_token')
    if (token) await idbPut(META_STORE, token, 'authToken')
  } catch { /* storage blocked */ }
}

export async function clearOfflineToken() {
  try { await idbDelete(META_STORE, 'authToken') } catch { /* ignore */ }
}

async function requestBackgroundSync() {
  try {
    if (!('serviceWorker' in navigator)) return false
    const reg = await navigator.serviceWorker.ready
    if (!reg.sync) return false
    await reg.sync.register(VOICE_SYNC_TAG)
    return true
  } catch { return false }
}

export async function enqueueVoiceUpload({ blob, mimeType, filename, contextType, contextId, durationSeconds }) {
  const item = {
    id: makeId(),
    blob, mimeType, filename,
    contextType, contextId: contextId || null,
    durationSeconds: durationSeconds || null,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
    status: 'queued',
  }
  await idbPut(VOICE_QUEUE_STORE, item)
  await rememberToken()
  await requestBackgroundSync()
  notify()
  return item
}

export async function listVoiceQueue() {
  try {
    const items = await idbGetAll(VOICE_QUEUE_STORE)
    return items.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
  } catch { return [] }
}

export async function removeVoiceQueueItem(id) {
  await idbDelete(VOICE_QUEUE_STORE, id)
  notify()
}

let flushing = null

// Upload everything queued. Resolves with { uploaded: [{id, audioSourceId}], remaining }.
// Stops at the first network failure (nothing else will get through either).
export function flushVoiceQueue() {
  if (flushing) return flushing
  flushing = (async () => {
    const uploaded = []
    let remaining = 0
    const items = await listVoiceQueue()
    if (items.length === 0) return { uploaded, remaining }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return { uploaded, remaining: items.length }
    await rememberToken()
    for (const item of items) {
      const current = await idbGet(VOICE_QUEUE_STORE, item.id)
      if (!current) continue
      try {
        await idbPut(VOICE_QUEUE_STORE, { ...current, status: 'uploading' })
        notify()
        const file = new File([current.blob], current.filename || 'observation.webm', { type: current.mimeType || 'audio/webm' })
        const res = await voiceObservationService.upload(file, current.contextType, current.contextId, current.id)
        await idbDelete(VOICE_QUEUE_STORE, current.id)
        uploaded.push({ id: current.id, audioSourceId: res.data?.audio_source_id, duplicate: res.data?.status === 'duplicate' })
      } catch (err) {
        const network = isNetworkError(err)
        const status = err.response?.status
        // 4xx other than 429 will not succeed on retry: keep the note but flag it.
        const permanent = status && status >= 400 && status < 500 && status !== 429 && status !== 401
        await idbPut(VOICE_QUEUE_STORE, {
          ...current,
          status: permanent ? 'failed' : 'queued',
          attempts: (current.attempts || 0) + 1,
          lastError: err.response?.data?.error || err.message || 'Upload failed',
          lastAttemptAt: new Date().toISOString(),
        })
        remaining++
        if (network) { remaining += items.length - items.indexOf(item) - 1; break }
      }
    }
    notify()
    return { uploaded, remaining }
  })().finally(() => { flushing = null })
  return flushing
}
