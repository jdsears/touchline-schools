import { useState, useEffect } from 'react'
import api from '../../services/api'
import { Mic, Save, Shield, Clock, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function HoDVoiceSettings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const res = await api.get('/hod/check')
      if (!res.data.isHoD || !res.data.school_id) {
        setLoading(false)
        return
      }
      // Get school settings
      const schoolRes = await api.get(`/schools/${res.data.school_id}`)
      setSettings({
        school_id: res.data.school_id,
        voice_observations_enabled: schoolRes.data.voice_observations_enabled || false,
        audio_retention_days: schoolRes.data.audio_retention_days || 7,
        transcript_retention_days: schoolRes.data.transcript_retention_days || 30,
      })
    } catch (err) {
      console.error('Failed to load voice settings:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    try {
      await api.put(`/schools/${settings.school_id}`, {
        voice_observations_enabled: settings.voice_observations_enabled,
        audio_retention_days: settings.audio_retention_days,
        transcript_retention_days: settings.transcript_retention_days,
      })
      toast.success('Voice observation settings saved')
    } catch (err) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="spinner w-8 h-8" /></div>
  }

  if (!settings) {
    return (
      <div className="p-6 text-center">
        <p className="text-navy-400">Unable to load voice observation settings.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Mic className="w-7 h-7 text-pitch-400" />
          Voice Observations Settings
        </h1>
        <p className="text-navy-400 mt-1">Configure voice observations for your school</p>
      </div>

      <div className="space-y-6">
        {/* Enable/Disable */}
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Enable Voice Observations</h3>
              <p className="text-sm text-navy-400 mt-1">
                When enabled, teachers see a record button in the Teacher Hub and can
                speak observations that are transcribed and filed against pupils.
              </p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, voice_observations_enabled: !settings.voice_observations_enabled })}
              className={`
                relative w-14 h-7 rounded-full transition-colors
                ${settings.voice_observations_enabled ? 'bg-pitch-600' : 'bg-navy-700'}
              `}
            >
              <div className={`
                absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform shadow
                ${settings.voice_observations_enabled ? 'translate-x-7' : 'translate-x-0.5'}
              `} />
            </button>
          </div>
        </div>

        {/* Retention settings */}
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-6">
          <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Retention Policy
          </h3>
          <p className="text-sm text-navy-400 mb-4">
            Raw audio and transcripts are automatically purged after the configured retention window.
            Confirmed observations are retained per your standard pupil data policy.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-navy-300 mb-1">Audio retention (days)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={settings.audio_retention_days}
                  onChange={e => setSettings({ ...settings, audio_retention_days: Math.min(30, Math.max(1, parseInt(e.target.value) || 7)) })}
                  className="w-24 px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-pitch-500"
                />
                <span className="text-xs text-navy-500">1-30 days (default 7)</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-navy-300 mb-1">Transcript retention (days)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={7}
                  max={90}
                  value={settings.transcript_retention_days}
                  onChange={e => setSettings({ ...settings, transcript_retention_days: Math.min(90, Math.max(7, parseInt(e.target.value) || 30)) })}
                  className="w-24 px-3 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-pitch-500"
                />
                <span className="text-xs text-navy-500">7-90 days (default 30)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Safeguarding info */}
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-6">
          <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <Shield className="w-5 h-5 text-alert-400" />
            Safeguarding
          </h3>
          <div className="space-y-2 text-sm text-navy-400">
            <p>The AI automatically flags observations that may indicate safeguarding concerns. Flagged observations are routed to the DSL review surface and are not filed as routine observations.</p>
            <p>Only the teacher who recorded and the DSL can access raw audio and transcripts during the retention window.</p>
            <p>Pupil voices captured in the background are filtered out by the AI before transcripts reach the review screen.</p>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
