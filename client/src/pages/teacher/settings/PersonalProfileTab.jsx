import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { profileService } from '../../../services/api'
import { Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const TIMEZONES = ['Europe/London','Europe/Dublin','Europe/Paris','UTC']

export default function PersonalProfileTab({ user }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    bio: '',
    timezone: 'Europe/London',
  })
  const [saving, setSaving] = useState(false)

  function set(field) { return val => setForm(f => ({ ...f, [field]: val })) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await profileService.updateProfile?.({ name: form.name, phone: form.phone, bio: form.bio })
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const initials = (form.name || '').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Your Profile</h2>
        <p className="text-sm text-navy-400 mt-1">Personal details visible to other staff in the department.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar placeholder */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-pitch-600/30 flex items-center justify-center text-xl font-bold text-pitch-400">
            {initials || '?'}
          </div>
          <div>
            <div className="text-sm font-medium text-white">{form.name || 'Your name'}</div>
            <div className="text-xs text-navy-500">{form.email}</div>
          </div>
        </div>

        <div className="bg-navy-900 rounded-xl border border-navy-800 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-navy-400 mb-1">Full Name</label>
              <input
                value={form.name}
                onChange={e => set('name')(e.target.value)}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-pitch-500"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Phone (optional)</label>
              <input
                value={form.phone}
                onChange={e => set('phone')(e.target.value)}
                placeholder="07700 900000"
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder:text-navy-500 focus:outline-none focus:border-pitch-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-navy-400 mb-1">Email</label>
            <input
              value={form.email}
              readOnly
              className="w-full px-3 py-2 bg-navy-800/40 border border-navy-800 rounded-lg text-navy-400 text-sm cursor-default"
            />
            <p className="text-xs text-navy-600 mt-1">Email changes are handled via Security settings.</p>
          </div>
          <div>
            <label className="block text-xs text-navy-400 mb-1">Bio (optional)</label>
            <textarea
              value={form.bio}
              onChange={e => set('bio')(e.target.value)}
              rows={3}
              placeholder="Brief description for the staff directory..."
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder:text-navy-500 focus:outline-none focus:border-pitch-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-navy-400 mb-1">Timezone</label>
            <select
              value={form.timezone}
              onChange={e => set('timezone')(e.target.value)}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-pitch-500"
            >
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Profile
        </button>
      </form>
    </div>
  )
}
