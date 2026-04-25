import { useState } from 'react'
import api from '../services/api'

export default function AdminReseedDemo() {
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  async function run(wipeOnly = false) {
    setRunning(true)
    setStatus('running')
    setError(null)
    setLog(['Starting... (this can take 30-60 seconds; the browser will appear to hang)'])
    try {
      const res = await api.post('/admin/reseed-demo', {}, {
        params: wipeOnly ? { wipeOnly: 1 } : {},
        timeout: 5 * 60 * 1000,
      })
      setLog(res.data.log || [])
      setStatus(res.data.ok ? 'done' : 'error')
      if (!res.data.ok) setError(res.data.error || 'unknown')
    } catch (e) {
      setStatus('error')
      setError(e.response?.data?.error || e.message)
      if (e.response?.data?.log) setLog(e.response.data.log)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Demo Tenant Reseed</h1>
      <p style={{ color: '#666' }}>
        Wipes and re-seeds the Ashworth Park Academy demo tenant. Admin only.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => run(false)} disabled={running} style={{ padding: '10px 20px', fontSize: 16 }}>
          {running ? 'Running…' : 'Run full reseed'}
        </button>
        <button onClick={() => run(true)} disabled={running} style={{ padding: '10px 20px', fontSize: 16 }}>
          Wipe only
        </button>
      </div>
      {status !== 'idle' && (
        <div style={{ marginBottom: 8 }}>
          Status: <strong>{status}</strong>
          {error && <span style={{ color: '#c00', marginLeft: 8 }}>— {error}</span>}
        </div>
      )}
      <pre
        style={{
          background: '#111',
          color: '#eee',
          padding: 12,
          borderRadius: 6,
          whiteSpace: 'pre-wrap',
          maxHeight: '60vh',
          overflow: 'auto',
          fontSize: 13,
        }}
      >
        {log.length ? log.join('\n') : 'Ready.'}
      </pre>
    </div>
  )
}
