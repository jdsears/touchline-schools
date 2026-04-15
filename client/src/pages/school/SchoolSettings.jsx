import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { clubService, giftAidService } from '../../services/api'
import { Save, Heart, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ClubSettings() {
  const { school, myRole, refreshClub } = useOutletContext()
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [charityForm, setCharityForm] = useState({})
  const [savingCharity, setSavingCharity] = useState(false)
  const [charityLoaded, setCharityLoaded] = useState(false)

  useEffect(() => {
    if (school?.id && !charityLoaded) {
      giftAidService.getCharitySettings(school.id).then(res => {
        if (res.data) setCharityForm(res.data)
        setCharityLoaded(true)
      }).catch(() => setCharityLoaded(true))
    }
  }, [school?.id])

  async function handleSaveCharity(e) {
    e.preventDefault()
    setSavingCharity(true)
    try {
      const res = await giftAidService.updateCharitySettings(school.id, charityForm)
      setCharityForm(res.data)
      toast.success('Gift Aid settings saved')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save Gift Aid settings')
    } finally {
      setSavingCharity(false)
    }
  }

  function updateCharityField(field, value) {
    setCharityForm(f => ({ ...f, [field]: value }))
  }

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
        <h1 className="text-2xl font-bold text-white">School Settings</h1>
        <p className="text-navy-400 text-sm mt-1">Manage your school details and branding</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic info */}
        <section className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-white">School Details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-navy-400 mb-1">School Name *</label>
              <input
                type="text" required value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Contact Email</label>
              <input
                type="email" value={form.contact_email}
                onChange={(e) => updateField('contact_email', e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Contact Phone</label>
              <input
                type="tel" value={form.contact_phone}
                onChange={(e) => updateField('contact_phone', e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-navy-400 mb-1">Website</label>
              <input
                type="url" value={form.website}
                onChange={(e) => updateField('website', e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                placeholder="https://..."
              />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-white">Address</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-navy-400 mb-1">Address Line 1</label>
              <input
                type="text" value={form.address_line1}
                onChange={(e) => updateField('address_line1', e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-navy-400 mb-1">Address Line 2</label>
              <input
                type="text" value={form.address_line2}
                onChange={(e) => updateField('address_line2', e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">City</label>
              <input
                type="text" value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">County</label>
              <input
                type="text" value={form.county}
                onChange={(e) => updateField('county', e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Postcode</label>
              <input
                type="text" value={form.postcode}
                onChange={(e) => updateField('postcode', e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* Football org */}
        <section className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-white">Football Organisation</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-navy-400 mb-1">FA Affiliation Number</label>
              <input
                type="text" value={form.fa_affiliation_number}
                onChange={(e) => updateField('fa_affiliation_number', e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">League</label>
              <input
                type="text" value={form.league}
                onChange={(e) => updateField('league', e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                placeholder="e.g. Norfolk Youth League"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Charter Standard</label>
              <select
                value={form.charter_standard}
                onChange={(e) => updateField('charter_standard', e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
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
        <section className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-white">Branding</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-navy-400 mb-1">Primary Colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color" value={form.primary_color}
                  onChange={(e) => updateField('primary_color', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-navy-700 cursor-pointer"
                />
                <input
                  type="text" value={form.primary_color}
                  onChange={(e) => updateField('primary_color', e.target.value)}
                  className="flex-1 bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Secondary Colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color" value={form.secondary_color}
                  onChange={(e) => updateField('secondary_color', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-navy-700 cursor-pointer"
                />
                <input
                  type="text" value={form.secondary_color}
                  onChange={(e) => updateField('secondary_color', e.target.value)}
                  className="flex-1 bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Season */}
        <section className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-white">Season</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-navy-400 mb-1">Season Start</label>
              <select
                value={form.season_start_month}
                onChange={(e) => updateField('season_start_month', parseInt(e.target.value))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              >
                {months.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Season End</label>
              <select
                value={form.season_end_month}
                onChange={(e) => updateField('season_end_month', parseInt(e.target.value))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
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
            className="flex items-center gap-2 px-6 py-2.5 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Gift Aid & Charity Settings */}
      {(myRole === 'owner' || myRole === 'admin') && (
        <form onSubmit={handleSaveCharity} className="space-y-6 mt-8">
          <section className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-pink-600/10">
                  <Heart className="w-4.5 h-4.5 text-pink-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Gift Aid & Charity</h2>
                  <p className="text-navy-400 text-xs mt-0.5">HMRC charity details for Gift Aid claims</p>
                </div>
              </div>
              {charityForm.gift_aid_enabled ? (
                <span className="text-xs bg-pitch-600/20 text-pitch-400 px-3 py-1 rounded-full font-medium">Gift Aid Active</span>
              ) : (
                <span className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full font-medium">Gift Aid Not Configured</span>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs text-navy-400 mb-1">Organisation Name (for Gift Aid) *</label>
                <input
                  type="text" value={charityForm.organisation_name || ''}
                  onChange={(e) => updateCharityField('organisation_name', e.target.value)}
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-navy-400 mb-1">Registered Charity Number</label>
                <input
                  type="text" value={charityForm.charity_number || ''}
                  onChange={(e) => updateCharityField('charity_number', e.target.value)}
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                  placeholder="Optional if CASC"
                />
              </div>
              <div>
                <label className="block text-xs text-navy-400 mb-1">CASC Number</label>
                <input
                  type="text" value={charityForm.casc_number || ''}
                  onChange={(e) => updateCharityField('casc_number', e.target.value)}
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                  placeholder="Community Amateur Sports School number"
                />
              </div>
              <div>
                <label className="block text-xs text-navy-400 mb-1">HMRC Gift Aid Reference</label>
                <input
                  type="text" value={charityForm.hmrc_reference || ''}
                  onChange={(e) => updateCharityField('hmrc_reference', e.target.value)}
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-navy-400 mb-1">Authorised Official Name</label>
                <input
                  type="text" value={charityForm.authorised_official_name || ''}
                  onChange={(e) => updateCharityField('authorised_official_name', e.target.value)}
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-navy-400 mb-1">Authorised Official Position</label>
                <input
                  type="text" value={charityForm.authorised_official_position || ''}
                  onChange={(e) => updateCharityField('authorised_official_position', e.target.value)}
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                  placeholder="e.g. School Secretary"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-navy-400 mb-1">Organisation Address</label>
                <textarea
                  value={charityForm.organisation_address || ''}
                  onChange={(e) => updateCharityField('organisation_address', e.target.value)}
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs text-navy-400 mb-1">Postcode</label>
                <input
                  type="text" value={charityForm.organisation_postcode || ''}
                  onChange={(e) => updateCharityField('organisation_postcode', e.target.value)}
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                />
              </div>
            </div>

            {/* Warning if no charity/CASC number */}
            {charityForm.gift_aid_enabled && !charityForm.charity_number && !charityForm.casc_number && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-sm text-amber-400">
                Neither a Charity Number nor CASC Number has been provided. At least one is recommended for HMRC Gift Aid claims.
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-navy-800">
              <div>
                <label className="text-sm text-white font-medium">Enable Gift Aid for this school</label>
                <p className="text-xs text-navy-400 mt-0.5">Parents will be offered Gift Aid opt-in during payment</p>
              </div>
              <button
                type="button"
                onClick={() => updateCharityField('gift_aid_enabled', !charityForm.gift_aid_enabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  charityForm.gift_aid_enabled ? 'bg-pitch-600' : 'bg-navy-700'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  charityForm.gift_aid_enabled ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>

            <a
              href="https://www.gov.uk/claim-gift-aid"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-pitch-400 hover:text-pitch-300"
            >
              <ExternalLink className="w-3 h-3" />
              HMRC Gift Aid guidance
            </a>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingCharity}
              className="flex items-center gap-2 px-6 py-2.5 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              {savingCharity ? 'Saving...' : 'Save Gift Aid Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
