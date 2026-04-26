import { useState, useEffect } from 'react'
import { misService } from '../../../services/api'
import { Database, Loader2, CheckCircle, XCircle, Clock, RefreshCw, Play, Eye, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MISIntegrationTab() {
  const [config, setConfig] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [form, setForm] = useState({ apiEndpoint: '', apiKey: '', syncFrequency: 'nightly', syncScope: 'pupils_staff', isTestMode: true })

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [configRes, historyRes] = await Promise.all([misService.getConfig(), misService.getHistory()])
      const c = configRes.data
      setConfig(c)
      if (c.provider) setForm(f => ({
        ...f, apiEndpoint: c.apiEndpoint || '', syncFrequency: c.syncFrequency || 'nightly',
        syncScope: c.syncScope || 'pupils_staff', isTestMode: c.isTestMode !== false,
      }))
      setHistory(historyRes.data)
    } catch {} finally { setLoading(false) }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.apiKey) delete payload.apiKey
      await misService.saveConfig(payload)
      toast.success('MIS configuration saved')
      load()
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  async function handleSync(dryRun) {
    setSyncing(true)
    try {
      const res = await misService.sync(dryRun)
      const s = res.data.summary
      toast.success(dryRun
        ? `Dry run: ${s.pupils.added} pupils to add, ${s.pupils.updated} to update, ${s.staff.added} staff to add`
        : `Sync complete: ${s.pupils.added} added, ${s.pupils.updated} updated`)
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Sync failed') }
    finally { setSyncing(false) }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-secondary" /></div>

  const statusIcon = !config?.provider ? null
    : config.lastSyncStatus === 'success' ? <CheckCircle className="w-5 h-5 text-green-400" />
    : config.lastSyncStatus === 'error' ? <XCircle className="w-5 h-5 text-red-400" />
    : <Clock className="w-5 h-5 text-secondary" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-400" /> MIS Integration
        </h2>
        {statusIcon && <div className="flex items-center gap-2 text-sm text-secondary">{statusIcon}{config.lastSyncStatus === 'success' ? 'Connected' : config.lastSyncStatus === 'error' ? 'Error' : 'Not synced'}</div>}
      </div>

      {config?.consecutiveFailures >= 3 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {config.consecutiveFailures} consecutive sync failures. Check your API key and endpoint.
        </div>
      )}

      {/* Configuration */}
      <div className="bg-card border border-border-default rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-primary">iSAMS Configuration</h3>
        <Field label="API Endpoint" value={form.apiEndpoint} onChange={v => setForm(f => ({ ...f, apiEndpoint: v }))} placeholder="https://school.isams.cloud" />
        <Field label="API Key" value={form.apiKey} onChange={v => setForm(f => ({ ...f, apiKey: v }))} placeholder={config?.hasApiKey ? '(key set - enter new to replace)' : 'Paste iSAMS API key'} type="password" />
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-xs text-secondary">
            Sync Frequency
            <select value={form.syncFrequency} onChange={e => setForm(f => ({ ...f, syncFrequency: e.target.value }))}
              className="block w-full mt-1 bg-subtle border border-border-strong rounded-lg px-3 py-2 text-sm text-primary">
              <option value="nightly">Nightly (2am)</option><option value="weekly">Weekly</option><option value="manual">Manual only</option>
            </select>
          </label>
          <label className="block text-xs text-secondary">
            Sync Scope
            <select value={form.syncScope} onChange={e => setForm(f => ({ ...f, syncScope: e.target.value }))}
              className="block w-full mt-1 bg-subtle border border-border-strong rounded-lg px-3 py-2 text-sm text-primary">
              <option value="pupils_only">Pupils only</option><option value="pupils_staff">Pupils + Staff</option><option value="full">Full (+ academic structure)</option>
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
          <input type="checkbox" checked={form.isTestMode} onChange={e => setForm(f => ({ ...f, isTestMode: e.target.checked }))}
            className="rounded border-border-strong bg-subtle text-pitch-500" />
          Test mode (dry-run by default, no data changes)
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-on-dark rounded-lg text-sm">
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Sync controls */}
      {config?.provider && (
        <div className="bg-card border border-border-default rounded-xl p-5">
          <h3 className="text-sm font-semibold text-primary mb-3">Sync Controls</h3>
          <div className="flex gap-2">
            <button onClick={() => handleSync(true)} disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-2 bg-subtle hover:bg-border-default text-secondary rounded-lg text-sm border border-border-strong">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Dry Run
            </button>
            <button onClick={() => handleSync(false)} disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-2 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-on-dark rounded-lg text-sm">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Sync Now
            </button>
          </div>
          {config.lastSyncAt && <p className="text-xs text-tertiary mt-2">Last sync: {new Date(config.lastSyncAt).toLocaleString('en-GB')}</p>}
        </div>
      )}

      {/* Sync history */}
      {history.length > 0 && (
        <div className="bg-card border border-border-default rounded-xl p-5">
          <h3 className="text-sm font-semibold text-primary mb-3">Recent Sync History</h3>
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="flex items-center gap-3 text-sm py-2 border-b border-border-subtle last:border-0">
                {h.status === 'success' ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                <div className="flex-1">
                  <span className="text-secondary">{new Date(h.started_at).toLocaleString('en-GB')}</span>
                  {h.is_dry_run && <span className="ml-2 text-[10px] bg-border-default text-secondary px-1.5 py-0.5 rounded">Dry run</span>}
                </div>
                {h.summary && <span className="text-xs text-secondary">
                  {JSON.parse(typeof h.summary === 'string' ? h.summary : JSON.stringify(h.summary)).pupils?.added || 0} added,
                  {' '}{JSON.parse(typeof h.summary === 'string' ? h.summary : JSON.stringify(h.summary)).pupils?.updated || 0} updated
                </span>}
                {h.error_message && <span className="text-xs text-red-400 truncate max-w-[200px]">{h.error_message}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="block text-xs text-secondary">
      {label}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="block w-full mt-1 bg-subtle border border-border-strong rounded-lg px-3 py-2 text-sm text-primary placeholder-navy-500" />
    </label>
  )
}
