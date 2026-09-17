const CACHE_NAME = 'moonboots-v3';
const PUPIL_CACHE = 'moonboots-pupil-v1';
// Never pre-cache '/' or index.html: a cached shell can pin users to a
// stale bundle after deploys. The browser/CDN handles those.
const STATIC_ASSETS = [
  '/manifest.json',
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      const keep = [CACHE_NAME, PUPIL_CACHE];
      return Promise.all(
        cacheNames
          .filter((name) => !keep.includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Push notification received
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'moonboots-notification',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'MoonBoots Sports', options)
  );
});

// Notification click - open the app at the right page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open new window
      return clients.openWindow(url);
    })
  );
});

// ── Offline voice notes: background upload ──────────────────────────
// Mirrors client/src/lib/offlineDb.js (same database, stores and item
// shape). The app queues recordings it could not upload; this drains the
// queue on a Background Sync event, or when the app asks, even if the tab
// has since been closed.
const OFFLINE_DB = 'moonboots-offline';
const OFFLINE_DB_VERSION = 1;
const VOICE_QUEUE_STORE = 'voiceQueue';
const META_STORE = 'meta';
const VOICE_SYNC_TAG = 'voice-uploads';
const VOICE_QUEUE_EVENT = 'voice-queue-changed';

function openOfflineDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB, OFFLINE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(VOICE_QUEUE_STORE)) db.createObjectStore(VOICE_QUEUE_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function storeOp(db, store, mode, work) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const r = work(t.objectStore(store));
    t.oncomplete = () => resolve(r && 'result' in r ? r.result : r);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

async function notifyClients(payload) {
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of all) client.postMessage({ type: VOICE_QUEUE_EVENT, ...payload });
}

async function flushVoiceQueueFromSw() {
  let db;
  let uploaded = 0;
  try {
    db = await openOfflineDb();
    const token = await storeOp(db, META_STORE, 'readonly', (s) => s.get('authToken'));
    const items = (await storeOp(db, VOICE_QUEUE_STORE, 'readonly', (s) => s.getAll())) || [];
    if (!token || items.length === 0) return uploaded;
    items.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    for (const item of items) {
      if (item.status === 'failed') continue;
      const form = new FormData();
      form.append('audio', new File([item.blob], item.filename || 'observation.webm', { type: item.mimeType || 'audio/webm' }));
      form.append('context_type', item.contextType || 'general');
      if (item.contextId) form.append('context_id', item.contextId);
      form.append('client_upload_id', item.id);
      let res;
      try {
        res = await fetch('/api/voice-observations/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      } catch {
        break; // still offline: the next sync event retries
      }
      if (res.ok) {
        await storeOp(db, VOICE_QUEUE_STORE, 'readwrite', (s) => s.delete(item.id));
        uploaded++;
      } else if (res.status >= 400 && res.status < 500 && res.status !== 429 && res.status !== 401) {
        let error = `Upload failed (${res.status})`;
        try { error = (await res.json()).error || error; } catch { /* keep default */ }
        await storeOp(db, VOICE_QUEUE_STORE, 'readwrite', (s) => s.put({ ...item, status: 'failed', attempts: (item.attempts || 0) + 1, lastError: error }));
      } else {
        await storeOp(db, VOICE_QUEUE_STORE, 'readwrite', (s) => s.put({ ...item, attempts: (item.attempts || 0) + 1, lastError: `Upload failed (${res.status})` }));
        if (res.status === 401) break; // token no longer valid; the app will re-save it on next use
      }
    }
  } catch (err) {
    console.warn('[sw] voice queue flush failed:', err);
  } finally {
    if (db) db.close();
  }
  await notifyClients({ uploaded });
  return uploaded;
}

self.addEventListener('sync', (event) => {
  if (event.tag === VOICE_SYNC_TAG) event.waitUntil(flushVoiceQueueFromSw());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'flush-voice-queue') event.waitUntil(flushVoiceQueueFromSw());
});

// Pupil API endpoints safe to cache for offline viewing
const CACHEABLE_API = ['/api/pupils/me', '/api/pupils/me/development', '/api/pupils/me/quote'];

// Cache pupil API responses (network first, stale fallback)
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET' && CACHEABLE_API.some(p => event.request.url.includes(p))) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(PUPIL_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Skip non-GET requests and other API calls
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          // Clone and cache successful responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, return cached version if available
          return cachedResponse;
        });

      // Return cached response immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
