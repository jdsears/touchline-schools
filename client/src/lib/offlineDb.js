// Minimal IndexedDB wrapper shared by the app and (as a copy) the service
// worker in public/sw.js — keep the database name, version and store names
// in step with it.
export const OFFLINE_DB = 'moonboots-offline'
export const OFFLINE_DB_VERSION = 1
export const VOICE_QUEUE_STORE = 'voiceQueue'
export const META_STORE = 'meta'

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'))
    const req = indexedDB.open(OFFLINE_DB, OFFLINE_DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(VOICE_QUEUE_STORE)) db.createObjectStore(VOICE_QUEUE_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(db, store, mode, work) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode)
    const s = t.objectStore(store)
    let result
    try { result = work(s) } catch (e) { reject(e); return }
    t.oncomplete = () => resolve(result && 'result' in result ? result.result : result)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  })
}

export async function idbPut(store, value, key) {
  const db = await openDb()
  try { return await tx(db, store, 'readwrite', s => (key === undefined ? s.put(value) : s.put(value, key))) } finally { db.close() }
}

export async function idbGet(store, key) {
  const db = await openDb()
  try { return await tx(db, store, 'readonly', s => s.get(key)) } finally { db.close() }
}

export async function idbGetAll(store) {
  const db = await openDb()
  try { return (await tx(db, store, 'readonly', s => s.getAll())) || [] } finally { db.close() }
}

export async function idbDelete(store, key) {
  const db = await openDb()
  try { await tx(db, store, 'readwrite', s => s.delete(key)) } finally { db.close() }
}
