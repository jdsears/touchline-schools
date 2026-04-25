import { useState, useEffect, lazy, Suspense } from 'react'
import { venueService } from '../../../services/api'
import { MapPin, Plus, Edit2, Archive, Loader2, Home, X, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

const VenueMap = lazy(() => import('../../../components/VenueMap'))

const EMPTY = { name: '', address: '', postcode: '', contactName: '', contactPhone: '',
  parkingNotes: '', changingRoomNotes: '', pitchLayoutNotes: '', accessibilityNotes: '', isSchoolVenue: false }

export default function VenuesTab() {
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await venueService.list()
      setVenues(res.data)
    } catch { toast.error('Failed to load venues') }
    finally { setLoading(false) }
  }

  function openNew() { setForm(EMPTY); setEditing('new') }
  function openEdit(v) {
    setForm({
      name: v.name || '', address: v.address || '', postcode: v.postcode || '',
      contactName: v.contact_name || '', contactPhone: v.contact_phone || '',
      parkingNotes: v.parking_notes || '', changingRoomNotes: v.changing_room_notes || '',
      pitchLayoutNotes: v.pitch_layout_notes || '', accessibilityNotes: v.accessibility_notes || '',
      isSchoolVenue: v.is_school_venue || false,
    })
    setEditing(v.id)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Venue name required'); return }
    setSaving(true)
    try {
      if (editing === 'new') {
        await venueService.create(form)
        toast.success('Venue added')
      } else {
        await venueService.update(editing, form)
        toast.success('Venue updated')
      }
      setEditing(null)
      load()
    } catch { toast.error('Failed to save venue') }
    finally { setSaving(false) }
  }

  async function handleArchive(id) {
    try {
      await venueService.archive(id)
      toast.success('Venue archived')
      load()
    } catch { toast.error('Failed to archive venue') }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-navy-400" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Venues</h2>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm">
          <Plus className="w-4 h-4" /> Add Venue
        </button>
      </div>

      {/* Venue list */}
      <div className="space-y-2">
        {venues.length === 0 && <p className="text-navy-400 text-sm py-8 text-center">No venues yet. Add your school grounds and common away venues.</p>}
        {venues.map(v => (
          <div key={v.id} className="bg-navy-900 border border-navy-800 rounded-xl p-4 flex items-start gap-3">
            <div className={`p-2 rounded-lg ${v.is_school_venue ? 'bg-pitch-500/20 text-pitch-400' : 'bg-navy-800 text-navy-400'}`}>
              {v.is_school_venue ? <Home className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-white">{v.name}</h3>
                {v.is_school_venue && <span className="text-[10px] bg-pitch-600/20 text-pitch-400 px-1.5 py-0.5 rounded">Home</span>}
              </div>
              {v.address && <p className="text-sm text-navy-400 mt-0.5">{v.address}{v.postcode ? `, ${v.postcode}` : ''}</p>}
              {v.contact_name && <p className="text-xs text-navy-500 mt-1">{v.contact_name}{v.contact_phone ? ` - ${v.contact_phone}` : ''}</p>}
              <p className="text-xs text-navy-500 mt-0.5">{v.fixture_count || 0} fixture{v.fixture_count !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setViewing(v)} title="View" className="p-1.5 text-navy-500 hover:text-pitch-400"><Eye className="w-4 h-4" /></button>
              <button onClick={() => openEdit(v)} title="Edit" className="p-1.5 text-navy-500 hover:text-white"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => handleArchive(v.id)} title="Archive" className="p-1.5 text-navy-500 hover:text-alert-400"><Archive className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Venue detail with map */}
      {viewing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{viewing.name}</h3>
              <button onClick={() => setViewing(null)} className="text-navy-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {viewing.address && <p className="text-sm text-navy-300 mb-1">{viewing.address}</p>}
            {viewing.postcode && <p className="text-sm text-navy-400 mb-3">{viewing.postcode}</p>}
            <Suspense fallback={<div className="bg-navy-800 rounded-lg h-60 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-navy-400" /></div>}>
              <VenueMap venue={viewing} />
            </Suspense>
            {viewing.parking_notes && <Detail label="Parking" text={viewing.parking_notes} />}
            {viewing.changing_room_notes && <Detail label="Changing Rooms" text={viewing.changing_room_notes} />}
            {viewing.pitch_layout_notes && <Detail label="Pitch / Facilities" text={viewing.pitch_layout_notes} />}
            {viewing.accessibility_notes && <Detail label="Accessibility" text={viewing.accessibility_notes} />}
            {viewing.contact_name && (
              <p className="text-xs text-navy-400 mt-3">Contact: {viewing.contact_name}{viewing.contact_phone ? ` - ${viewing.contact_phone}` : ''}</p>
            )}
          </div>
        </div>
      )}

      {/* Edit/Create modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{editing === 'new' ? 'Add Venue' : 'Edit Venue'}</h3>
              <button onClick={() => setEditing(null)} className="text-navy-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Venue Name *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
              <Field label="Address" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} />
              <Field label="Postcode" value={form.postcode} onChange={v => setForm(f => ({ ...f, postcode: v }))} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Contact Name" value={form.contactName} onChange={v => setForm(f => ({ ...f, contactName: v }))} />
                <Field label="Contact Phone" value={form.contactPhone} onChange={v => setForm(f => ({ ...f, contactPhone: v }))} />
              </div>
              <Field label="Parking Notes" value={form.parkingNotes} onChange={v => setForm(f => ({ ...f, parkingNotes: v }))} multi />
              <Field label="Changing Room Notes" value={form.changingRoomNotes} onChange={v => setForm(f => ({ ...f, changingRoomNotes: v }))} multi />
              <Field label="Pitch/Facility Notes" value={form.pitchLayoutNotes} onChange={v => setForm(f => ({ ...f, pitchLayoutNotes: v }))} multi />
              <Field label="Accessibility Notes" value={form.accessibilityNotes} onChange={v => setForm(f => ({ ...f, accessibilityNotes: v }))} multi />
              <label className="flex items-center gap-2 text-sm text-navy-300 cursor-pointer">
                <input type="checkbox" checked={form.isSchoolVenue} onChange={e => setForm(f => ({ ...f, isSchoolVenue: e.target.checked }))}
                  className="rounded border-navy-700 bg-navy-800 text-pitch-500" />
                This is our school's home venue
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-navy-400 hover:text-white">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-white rounded-lg text-sm">
                {saving ? 'Saving...' : editing === 'new' ? 'Add Venue' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Detail({ label, text }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-navy-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-navy-300">{text}</p>
    </div>
  )
}

function Field({ label, value, onChange, multi }) {
  const cls = "w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white placeholder-navy-500 focus:border-pitch-500 focus:outline-none"
  return (
    <label className="block text-xs text-navy-400">
      {label}
      {multi
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={2} className={`${cls} mt-1 resize-none`} />
        : <input value={value} onChange={e => onChange(e.target.value)} className={`${cls} mt-1`} />
      }
    </label>
  )
}
