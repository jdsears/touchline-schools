import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { clubService } from '../../services/api'
import { Save, Heart, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ClubSettings() {
  const { school, myRole, refreshClub } = useOutletContext()
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (school) {
      setForm({
        name: school.name || '',
        contact_email: school.contact_email || '',
        contact_phone: school.contact_phone || '',
        website: school.website || '',
        address_line1: school.address_line1 || '',
        address_line2: school.address_line2 || '',
        city: school.city || '',
        county: school.county || '',
        postcode: school.postcode || '',
        fa_affiliation_number: school.fa_affiliation_number || '',
        league: school.league || '',
        charter_standard: school.charter_standard || '',
        primary_color: school.primary_color || '#1a365d',
        secondary_color: school.secondary_color || '#38a169',
        season_start_month: school.season_start_month || 9,
        season_end_month: school.season_end_month || 6,
      })
    }
  }, [school])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await clubService.updateClub(school.id, form)
      toast.success('Settings saved')
      refreshClub()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  function updateField(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">School Settings</h1>
        <p className="text-secondary text-sm mt-1">Manage your school details and branding</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic info */}
        <section className="bg-card border border-border-default rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-primary">School Details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-secondary mb-1">School Name *</label>
              <input
                type="text" required value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Contact Email</label>
              <input
                type="email" value={form.contact_email}
                onChange={(e) => updateField('contact_email', e.target.value)}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Contact Phone</label>
              <input
                type="tel" value={form.contact_phone}
                onChange={(e) => updateField('contact_phone', e.target.value)}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-secondary mb-1">Website</label>
              <input
                type="url" value={form.website}
                onChange={(e) => updateField('website', e.target.value)}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="https://..."
              />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="bg-card border border-border-default rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-primary">Address</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-secondary mb-1">Address Line 1</label>
              <input
                type="text" value={form.address_line1}
                onChange={(e) => updateField('address_line1', e.target.value)}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-secondary mb-1">Address Line 2</label>
              <input
                type="text" value={form.address_line2}
                onChange={(e) => updateField('address_line2', e.target.value)}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">City</label>
              <input
                type="text" value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">County</label>
              <input
                type="text" value={form.county}
                onChange={(e) => updateField('county', e.target.value)}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Postcode</label>
              <input
                type="text" value={form.postcode}
                onChange={(e) => updateField('postcode', e.target.value)}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* Football org */}
        <section className="bg-card border border-border-default rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-primary">Football Organisation</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-secondary mb-1">FA Affiliation Number</label>
              <input
                type="text" value={form.fa_affiliation_number}
                onChange={(e) => updateField('fa_affiliation_number', e.target.value)}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">League</label>
              <input
                type="text" value={form.league}
                onChange={(e) => updateField('league', e.target.value)}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="e.g. Norfolk Youth League"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Charter Standard</label>
              <select
                value={form.charter_standard}
                onChange={(e) => updateField('charter_standard', e.target.value)}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              >
                <option value="">None</option>
                <option value="Standard">Standard</option>
                <option value="Development">Development</option>
                <option value="Community">Community</option>
              </select>
            </div>
          </div>
        </section>

        {/* Branding */}
        <section className="bg-card border border-border-default rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-primary">Branding</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-secondary mb-1">Primary Colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color" value={form.primary_color}
                  onChange={(e) => updateField('primary_color', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border-strong cursor-pointer"
                />
                <input
                  type="text" value={form.primary_color}
                  onChange={(e) => updateField('primary_color', e.target.value)}
                  className="flex-1 bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm font-mono focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Secondary Colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color" value={form.secondary_color}
                  onChange={(e) => updateField('secondary_color', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border-strong cursor-pointer"
                />
                <input
                  type="text" value={form.secondary_color}
                  onChange={(e) => updateField('secondary_color', e.target.value)}
                  className="flex-1 bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm font-mono focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Season */}
        <section className="bg-card border border-border-default rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-primary">Season</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-secondary mb-1">Season Start</label>
              <select
                value={form.season_start_month}
                onChange={(e) => updateField('season_start_month', parseInt(e.target.value))}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              >
                {months.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Season End</label>
              <select
                value={form.season_end_month}
                onChange={(e) => updateField('season_end_month', parseInt(e.target.value))}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              >
                {months.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary hover:bg-brand-primary disabled:opacity-50 text-on-dark rounded-lg text-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

    </div>
  )
}
