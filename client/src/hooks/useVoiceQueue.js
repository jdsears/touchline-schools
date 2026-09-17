import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { listVoiceQueue, flushVoiceQueue, removeVoiceQueueItem, VOICE_QUEUE_EVENT } from '../lib/voiceQueue'

// Tracks voice notes waiting on the device and pushes them up whenever the
// app is open and online (the service worker covers the app-closed case).
export function useVoiceQueue({ enabled = true } = {}) {
  const [items, setItems] = useState([])
  const [flushing, setFlushing] = useState(false)
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine !== false)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    const list = await listVoiceQueue()
    if (mounted.current) setItems(list)
    return list
  }, [])

  const flush = useCallback(async ({ silent = false } = {}) => {
    if (!enabled) return
    setFlushing(true)
    try {
      const result = await flushVoiceQueue()
      if (!silent && result.uploaded.length > 0) {
        const n = result.uploaded.length
        toast.success(`${n} voice note${n === 1 ? '' : 's'} uploaded — transcribing now`)
      }
      if (!silent && result.remaining > 0 && navigator.onLine !== false) {
        toast(`${result.remaining} voice note${result.remaining === 1 ? '' : 's'} still waiting to upload`, { icon: '⏳' })
      }
      return result
    } finally {
      setFlushing(false)
      refresh()
    }
  }, [enabled, refresh])

  useEffect(() => {
    mounted.current = true
    if (!enabled) return undefined
    refresh().then(list => { if (list.length && navigator.onLine !== false) flush({ silent: false }) })

    const onChange = () => refresh()
    const onOnline = () => { setOnline(true); flush() }
    const onOffline = () => setOnline(false)
    const onSwMessage = (e) => { if (e.data?.type === VOICE_QUEUE_EVENT) { refresh(); if (e.data.uploaded > 0) toast.success(`${e.data.uploaded} voice note${e.data.uploaded === 1 ? '' : 's'} uploaded in the background`) } }
    window.addEventListener(VOICE_QUEUE_EVENT, onChange)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    navigator.serviceWorker?.addEventListener?.('message', onSwMessage)
    return () => {
      mounted.current = false
      window.removeEventListener(VOICE_QUEUE_EVENT, onChange)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      navigator.serviceWorker?.removeEventListener?.('message', onSwMessage)
    }
  }, [enabled, refresh, flush])

  const remove = useCallback(async (id) => { await removeVoiceQueueItem(id); refresh() }, [refresh])

  return { items, flushing, online, flush, remove, refresh }
}
