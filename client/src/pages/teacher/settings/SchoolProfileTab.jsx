import { useState, useEffect } from 'react'
import { settingsService } from '../../../services/api'
import { Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const SCHOOL_TYPES = [
  { value: 'primary',   label: 'Primary' },
  { value: 'prep',      label: 'Prep' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'all_through', label: 'All-through' },
  { value: 'mat',       label: 'MAT' },
  { value: 'other',     label: 'Other' },
]

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-sm text-secondary mb-1">{label}</label>
      {hint && <p className="text-xs text-tertiary mb-1">{hint}</p>}
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', readOnly }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full px-3 py-2 rounded-lg border text-sm text-primary placeholder:text-tertiary focus:outline-none focus:border-pitch-500 ${
        readOnly
          ? 'bg-subtle/40 border-border-default text-secondary cursor-default'
          : 'bg-subtle border-border-strong'
      }`}
    />
  )
}

export default function SchoolProfileTab({ access }) {
  const [form, setForm]   = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const canEdit = access?.isAdmin

  useEffect(() => {
    settingsService.getSchoolProfile()
      .then(r => setForm(r.data))
      .catch(() => toast.error('Failed to load school profile'))
      .finally(() => setLoading(false))
  }, [])

  function set(field) {
    return val => setForm(f => ({ ...f, [field]: val }))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!canEdit) return
    setSaving(true)
    try {
      await settingsService.updateSchoolProfile(form)
      toast.success('School profile updated')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save')
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
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-primary">School Profile</h2>
        <p className="text-sm text-secondary mt-1">
          Core school details used across the platform.
          {!canEdit && <span className="ml-2 text-amber-400">View only — contact your School Administrator to edit.</span>}
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic details */}
        <div className="bg-card rounded-xl border border-border-default p-5 space-y-4">
          <h3 className="text-sm font-semibold text-primary">Basic Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="School Name" hint="To request a name change, contact MoonBoots.">
              <Input value={form.name} onChange={() => {}} readOnly />
            </Field>
            <Field label="School Type">
              {canEdit ? (
                <select
                  value={form.school_type || 'secondary'}
                  onChange={e => set('school_type')(e.target.value)}
                  className="w-full px-3 py-2 bg-subtle border border-border-strong rounded-lg text-primary text-sm focus:outline-none focus:border-pitch-500"
                >
                  {SCHOOL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              ) : (
                <Input value={SCHOOL_TYPES.find(t => t.value === form.school_type)?.label || 'Secondary'} onChange={() => {}} readOnly />
              )}
            </Field>
          </div>
          <Field label="URN (Unique Reference Number)">
            <Input value={form.urn} onChange={set('urn')} placeholder="e.g. 123456" readOnly={!canEdit} />
          </Field>
        </div>

        {/* Contact */}
        <div className="bg-card rounded-xl border border-border-default p-5 space-y-4">
          <h3 className="text-sm font-semibold text-primary">Contact Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Email">
              <Input value={form.contact_email} onChange={set('contact_email')} placeholder="office@school.ac.uk" readOnly={!canEdit} />
            </Field>
            <Field label="Contact Phone">
              <Input value={form.contact_phone} onChange={set('contact_phone')} placeholder="01234 567890" readOnly={!canEdit} />
            </Field>
          </div>
          <Field label="Website">
            <Input value={form.website} onChange={set('website')} placeholder="https://www.school.ac.uk" readOnly={!canEdit} />
          </Field>
          <Field label="Address Line 1">
            <Input value={form.address_line1} onChange={set('address_line1')} readOnly={!canEdit} />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="City">
              <Input value={form.city} onChange={set('city')} readOnly={!canEdit} />
            </Field>
            <Field label="County">
              <Input value={form.county} onChange={set('county')} readOnly={!canEdit} />
            </Field>
            <Field label="Postcode">
              <Input value={form.postcode} onChange={set('postcode')} readOnly={!canEdit} />
            </Field>
          </div>
        </div>

        {/* Key contacts */}
        <div className="bg-card rounded-xl border border-border-default p-5 space-y-4">
          <h3 className="text-sm font-semibold text-primary">Key Contacts</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Head Teacher Name">
              <Input value={form.head_teacher_name} onChange={set('head_teacher_name')} readOnly={!canEdit} />
            </Field>
            <Field label="Head Teacher Email">
              <Input value={form.head_teacher_email} onChange={set('head_teacher_email')} type="email" readOnly={!canEdit} />
            </Field>
            <Field label="Safeguarding Lead Name">
              <Input value={form.safeguarding_lead_name} onChange={set('safeguarding_lead_name')} readOnly={!canEdit} />
            </Field>
            <Field label="Safeguarding Lead Email">
              <Input value={form.safeguarding_lead_email} onChange={set('safeguarding_lead_email')} type="email" readOnly={!canEdit} />
            </Field>
            <Field label="Data Protection Officer">
              <Input value={form.dpo_name} onChange={set('dpo_name')} readOnly={!canEdit} />
            </Field>
            <Field label="DPO Email">
              <Input value={form.dpo_email} onChange={set('dpo_email')} type="email" readOnly={!canEdit} />
            </Field>
          </div>
        </div>

        {canEdit && (
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-pitch-600 hover:bg-pitch-700 text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save School Profile
          </button>
        )}
      </form>
    </div>
  )
}
