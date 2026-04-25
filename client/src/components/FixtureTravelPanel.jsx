import { useState, useEffect } from 'react'
import { travelService } from '../services/api'
import { Bus, Car, Footprints, Train, Save, Loader2, Clock, MapPin, Phone, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const MODES = [
  { value: 'school_coach', label: 'School Coach', icon: Bus },
  { value: 'minibus', label: 'Minibus', icon: Bus },
  { value: 'parent_lifts', label: 'Parent Lifts', icon: Car },
  { value: 'public_transport', label: 'Public Transport', icon: Train },
  { value: 'walking', label: 'Walking', icon: Footprints },
]

export default function FixtureTravelPanel({ matchId, isAway }) {
  const [travel, setTravel] = useState(null)
  const [form, setForm] = useState({
    transportMode: 'school_coach', departureLocation: '', departureTime: '',
    returnTime: '', contactPhone: '', specialInstructions: '', coordinatorNotes: '',
    parentLiftsRequested: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => { load() }, [matchId])

  async function load() {
    try {
      const res = await travelService.get(matchId)
      const t = res.data.travel
      setTravel(t)
      if (t) setForm({
        transportMode: t.transport_mode || 'school_coach',
        departureLocation: t.departure_location || '',
        departureTime: t.departure_time?.slice(0, 5) || '',
        returnTime: t.return_time?.slice(0, 5) || '',
        contactPhone: t.contact_phone || '',
        specialInstructions: t.special_instructions || '',
        coordinatorNotes: t.coordinator_notes || '',
        parentLiftsRequested: t.parent_lifts_requested || false,
      })
    } catch {} finally { setLoading(false) }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await travelService.save(matchId, form)
      await load()
      setEditing(false)
      toast.success('Travel arrangements saved')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-secondary" /></div>

  if (!isAway && !travel) return null

  if (!editing && travel) {
    const mode = MODES.find(m => m.value === travel.transport_mode) || MODES[0]
    const ModeIcon = mode.icon
    return (
      <div className="bg-subtle rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <ModeIcon className="w-4 h-4 text-pitch-400" /> Travel: {mode.label}
          </h3>
          <button onClick={() => setEditing(true)} className="text-xs text-pitch-400 hover:text-pitch-300">Edit</button>
        </div>
        {travel.departure_time && (
          <p className="text-sm text-secondary flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-tertiary" />
            Departing {travel.departure_time.slice(0, 5)}
            {travel.departure_location ? ` from ${travel.departure_location}` : ''}
            {travel.return_time ? `. Returning ~${travel.return_time.slice(0, 5)}` : ''}
          </p>
        )}
        {travel.contact_phone && (
          <p className="text-xs text-secondary flex items-center gap-1.5">
            <Phone className="w-3 h-3" /> {travel.contact_phone}
          </p>
        )}
        {travel.special_instructions && (
          <p className="text-xs text-secondary flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3" /> {travel.special_instructions}
          </p>
        )}
      </div>
    )
  }

  if (!editing && !travel && isAway) {
    return (
      <button onClick={() => setEditing(true)}
        className="w-full py-3 border border-dashed border-border-strong rounded-xl text-sm text-secondary hover:text-primary hover:border-navy-500 transition-colors flex items-center justify-center gap-2">
        <Bus className="w-4 h-4" /> Add travel arrangements
      </button>
    )
  }

  return (
    <div className="bg-subtle rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-primary">Travel Arrangements</h3>
      <div className="flex flex-wrap gap-1.5">
        {MODES.map(m => (
          <button key={m.value} onClick={() => setForm(f => ({ ...f, transportMode: m.value }))}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs ${form.transportMode === m.value ? 'bg-pitch-600 text-on-dark' : 'bg-border-default text-secondary hover:bg-navy-600'}`}>
            <m.icon className="w-3 h-3" /> {m.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TravelField label="Departure Location" value={form.departureLocation}
          onChange={v => setForm(f => ({ ...f, departureLocation: v }))} placeholder="e.g. Main car park" />
        <TravelField label="Contact Phone" value={form.contactPhone}
          onChange={v => setForm(f => ({ ...f, contactPhone: v }))} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TravelField label="Departure Time" value={form.departureTime} type="time"
          onChange={v => setForm(f => ({ ...f, departureTime: v }))} />
        <TravelField label="Return Time" value={form.returnTime} type="time"
          onChange={v => setForm(f => ({ ...f, returnTime: v }))} />
      </div>
      <TravelField label="Special Instructions" value={form.specialInstructions}
        onChange={v => setForm(f => ({ ...f, specialInstructions: v }))} placeholder="e.g. Pupils need packed lunch" />
      <TravelField label="Transport Coordinator Notes" value={form.coordinatorNotes}
        onChange={v => setForm(f => ({ ...f, coordinatorNotes: v }))} placeholder="Internal notes" />
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-secondary hover:text-primary">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1 px-3 py-1.5 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-primary rounded-lg text-xs">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save
        </button>
      </div>
    </div>
  )
}

function TravelField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label className="block text-[11px] text-tertiary">
      {label}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="block w-full mt-0.5 bg-subtle border border-border-strong rounded px-2 py-1.5 text-xs text-primary" />
    </label>
  )
}
