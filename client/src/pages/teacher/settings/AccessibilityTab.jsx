import { useState, useEffect } from 'react'
import { settingsService } from '../../../services/api'
import { Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-pitch-600' : 'bg-border-default'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function AccessibilityTab() {
  const [prefs, setPrefs]   = useState({ font_size: 'medium', reduced_motion: false, high_contrast: false, screen_reader_optimised: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    settingsService.getAccessibility()
      .then(r => setPrefs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await settingsService.updateAccessibility(prefs)
      toast.success('Accessibility settings saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-secondary" />
    </div>
  )

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary">Accessibility</h2>
        <p className="text-sm text-secondary mt-1">Adjust the interface to suit your needs.</p>
      </div>

      <div className="bg-card rounded-xl border border-border-default p-5 space-y-5">
        <div>
          <label className="block text-sm text-primary mb-2">Font Size</label>
          <div className="flex gap-2">
            {['small','medium','large'].map(size => (
              <button
                key={size}
                onClick={() => setPrefs(p => ({ ...p, font_size: size }))}
                className={`px-4 py-2 rounded-lg text-sm capitalize border transition-colors ${
                  prefs.font_size === size
                    ? 'border-pitch-600 bg-pitch-600/20 text-pitch-400'
                    : 'border-border-strong text-secondary hover:text-link'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {[
          { key: 'reduced_motion',        label: 'Reduced Motion',          desc: 'Minimise animations and transitions' },
          { key: 'high_contrast',         label: 'High Contrast',           desc: 'Increase contrast for better visibility' },
          { key: 'screen_reader_optimised',label: 'Screen Reader Optimised', desc: 'Improve compatibility with screen readers' },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between">
            <div>
              <div className="text-sm text-primary">{item.label}</div>
              <div className="text-xs text-tertiary">{item.desc}</div>
            </div>
            <Toggle
              checked={!!prefs[item.key]}
              onChange={val => setPrefs(p => ({ ...p, [item.key]: val }))}
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-on-dark rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Settings
      </button>
    </div>
  )
}
