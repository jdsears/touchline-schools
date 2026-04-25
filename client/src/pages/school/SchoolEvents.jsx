import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { clubEventsService, clubService } from '../../services/api'
import {
  CalendarDays, Plus, Trophy, Tent, Flag, Star, Users,
  MapPin, Clock, Trash2, Edit3, Eye, EyeOff, Download,
  ChevronDown, ChevronUp, X, Check, AlertCircle, Ticket,
  DollarSign, ExternalLink, Copy, UserCheck, UserX,
} from 'lucide-react'
import toast from 'react-hot-toast'

const EVENT_TYPES = [
  { value: 'camp', label: 'Camp', icon: Tent, color: 'bg-emerald-600/20 text-emerald-400' },
  { value: 'tournament', label: 'Tournament', icon: Trophy, color: 'bg-amber-600/20 text-amber-400' },
  { value: 'trial', label: 'Trial Day', icon: Flag, color: 'bg-blue-600/20 text-blue-400' },
  { value: 'social', label: 'Social Event', icon: Star, color: 'bg-purple-600/20 text-purple-400' },
  { value: 'fundraiser', label: 'Fundraiser', icon: DollarSign, color: 'bg-pink-600/20 text-pink-400' },
  { value: 'other', label: 'Other', icon: CalendarDays, color: 'bg-border-default text-secondary' },
]

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'draft', label: 'Draft' },
  { id: 'cancelled', label: 'Cancelled' },
]

const STATUS_BADGES = {
  published: { label: 'Published', className: 'bg-pitch-600/20 text-pitch-400' },
  draft: { label: 'Draft', className: 'bg-border-default text-secondary' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/20 text-red-400' },
}

const emptyForm = {
  title: '',
  description: '',
  event_type: 'camp',
  start_date: '',
  end_date: '',
  start_time: '09:00',
  end_time: '16:00',
  venue: '',
  venue_address: '',
  price: '',
  sibling_discount: '',
  early_bird_price: '',
  early_bird_deadline: '',
  max_participants: '',
  registration_deadline: '',
  target_audience: 'all',
  target_team_ids: [],
  status: 'published',
  custom_fields: [],
  requires_medical_info: true,
  requires_photo_consent: true,
}

export default function ClubEvents() {
  const { school, myRole } = useOutletContext()
  const [events, setEvents] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [expandedEvent, setExpandedEvent] = useState(null)
  const [registrations, setRegistrations] = useState({})
  const [loadingRegistrations, setLoadingRegistrations] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [customFieldInput, setCustomFieldInput] = useState('')

  const canManage = ['owner', 'admin'].includes(myRole)

  useEffect(() => {
    if (school?.id) loadData()
  }, [school?.id])

  async function loadData() {
    try {
      const [eventsRes, teamsRes] = await Promise.all([
        clubEventsService.getEvents(school.id),
        clubService.getTeams(school.id),
      ])
      setEvents(eventsRes.data)
      setTeams(teamsRes.data)
    } catch (err) {
      toast.error('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  async function loadRegistrations(eventId) {
    if (registrations[eventId]) {
      setExpandedEvent(expandedEvent === eventId ? null : eventId)
      return
    }
    setLoadingRegistrations(eventId)
    try {
      const res = await clubEventsService.getRegistrations(school.id, eventId)
      setRegistrations(prev => ({ ...prev, [eventId]: res.data }))
      setExpandedEvent(eventId)
    } catch (err) {
      toast.error('Failed to load registrations')
    } finally {
      setLoadingRegistrations(null)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title || !form.start_date) {
      return toast.error('Title and start date are required')
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        price: form.price ? Math.round(parseFloat(form.price) * 100) : 0,
        sibling_discount: form.sibling_discount ? Math.round(parseFloat(form.sibling_discount) * 100) : 0,
        early_bird_price: form.early_bird_price ? Math.round(parseFloat(form.early_bird_price) * 100) : 0,
        max_participants: form.max_participants ? parseInt(form.max_participants) : null,
        target_team_ids: form.target_audience === 'specific' ? form.target_team_ids : [],
      }
      if (editingEvent) {
        await clubEventsService.updateEvent(school.id, editingEvent.id, payload)
        toast.success('Event updated')
      } else {
        await clubEventsService.createEvent(school.id, payload)
        toast.success('Event created')
      }
      resetForm()
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save event')
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel(eventId) {
    if (!confirm('Are you sure you want to cancel this event?')) return
    try {
      await clubEventsService.cancelEvent(school.id, eventId)
      toast.success('Event cancelled')
      loadData()
    } catch (err) {
      toast.error('Failed to cancel event')
    }
  }

  async function handleExport(eventId) {
    try {
      const res = await clubEventsService.exportRegistrations(school.id, eventId)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `registrations-${eventId}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    } catch (err) {
      toast.error('Failed to export registrations')
    }
  }

  async function handleAttendanceToggle(eventId, registrationId, attended) {
    try {
      await clubEventsService.updateAttendance(school.id, eventId, {
        registration_id: registrationId,
        attended,
      })
      setRegistrations(prev => ({
        ...prev,
        [eventId]: prev[eventId].map(r =>
          r.id === registrationId ? { ...r, attended } : r
        ),
      }))
    } catch (err) {
      toast.error('Failed to update attendance')
    }
  }

  function startEdit(event) {
    setForm({
      title: event.title || '',
      description: event.description || '',
      event_type: event.event_type || 'camp',
      start_date: event.start_date?.split('T')[0] || '',
      end_date: event.end_date?.split('T')[0] || '',
      start_time: event.start_time || '09:00',
      end_time: event.end_time || '16:00',
      venue: event.venue || '',
      venue_address: event.venue_address || '',
      price: event.price ? (event.price / 100).toFixed(2) : '',
      sibling_discount: event.sibling_discount ? (event.sibling_discount / 100).toFixed(2) : '',
      early_bird_price: event.early_bird_price ? (event.early_bird_price / 100).toFixed(2) : '',
      early_bird_deadline: event.early_bird_deadline?.split('T')[0] || '',
      max_participants: event.max_participants || '',
      registration_deadline: event.registration_deadline?.split('T')[0] || '',
      target_audience: event.target_team_ids?.length > 0 ? 'specific' : 'all',
      target_team_ids: event.target_team_ids || [],
      status: event.status || 'published',
      custom_fields: event.custom_fields || [],
      requires_medical_info: event.requires_medical_info ?? true,
      requires_photo_consent: event.requires_photo_consent ?? true,
    })
    setEditingEvent(event)
    setShowCreate(true)
  }

  function resetForm() {
    setForm({ ...emptyForm })
    setEditingEvent(null)
    setShowCreate(false)
    setCustomFieldInput('')
  }

  function addCustomField() {
    if (!customFieldInput.trim()) return
    setForm(f => ({
      ...f,
      custom_fields: [...f.custom_fields, { label: customFieldInput.trim(), required: false }],
    }))
    setCustomFieldInput('')
  }

  function removeCustomField(index) {
    setForm(f => ({
      ...f,
      custom_fields: f.custom_fields.filter((_, i) => i !== index),
    }))
  }

  function copyPublicLink(eventId) {
    const url = `${window.location.origin}/event/${eventId}`
    navigator.clipboard.writeText(url)
    toast.success('Public link copied to clipboard')
  }

  // Filter events
  const now = new Date()
  const filtered = events.filter(event => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'upcoming') {
      return event.status !== 'cancelled' && new Date(event.start_date) >= now
    }
    if (activeFilter === 'past') {
      return event.status !== 'cancelled' && new Date(event.end_date || event.start_date) < now
    }
    if (activeFilter === 'draft') return event.status === 'draft'
    if (activeFilter === 'cancelled') return event.status === 'cancelled'
    return true
  })

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Events</h1>
          <p className="text-secondary text-sm mt-1">Manage camps, tournaments and school events</p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              if (showCreate) {
                resetForm()
              } else {
                setShowCreate(true)
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-on-dark rounded-lg text-sm transition-colors"
          >
            {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showCreate ? 'Cancel' : 'Create Event'}
          </button>
        )}
      </div>

      {/* Create/Edit event form */}
      {showCreate && (
        <form onSubmit={handleSubmit} className="bg-card border border-border-default rounded-xl p-5 space-y-5">
          <h3 className="font-semibold text-primary flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-pitch-400" />
            {editingEvent ? 'Edit Event' : 'New Event'}
          </h3>

          {/* Title and type */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-secondary mb-1">Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                placeholder="e.g. Summer Holiday Camp 2026"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Event Type</label>
              <select
                value={form.event_type}
                onChange={(e) => setForm(f => ({ ...f, event_type: e.target.value }))}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              >
                {EVENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-secondary mb-1">Description</label>
            <textarea
              value={form.description}
              rows={3}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent resize-none"
              placeholder="Describe the event, what to bring, etc..."
            />
          </div>

          {/* Dates and times */}
          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-secondary mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Start Time</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm(f => ({ ...f, start_time: e.target.value }))}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">End Time</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm(f => ({ ...f, end_time: e.target.value }))}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
          </div>

          {/* Venue */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-secondary mb-1">Venue Name</label>
              <input
                type="text"
                value={form.venue}
                onChange={(e) => setForm(f => ({ ...f, venue: e.target.value }))}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                placeholder="e.g. Main Pitch"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Venue Address</label>
              <input
                type="text"
                value={form.venue_address}
                onChange={(e) => setForm(f => ({ ...f, venue_address: e.target.value }))}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                placeholder="Full address for map link"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-secondary mb-1">Price (GBP)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-sm">£</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                  className="w-full bg-subtle border border-border-strong rounded-lg pl-7 pr-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                  placeholder="0.00 = Free"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Sibling Discount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-sm">£</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.sibling_discount}
                  onChange={(e) => setForm(f => ({ ...f, sibling_discount: e.target.value }))}
                  className="w-full bg-subtle border border-border-strong rounded-lg pl-7 pr-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Early Bird Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-sm">£</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.early_bird_price}
                  onChange={(e) => setForm(f => ({ ...f, early_bird_price: e.target.value }))}
                  className="w-full bg-subtle border border-border-strong rounded-lg pl-7 pr-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Early Bird Deadline</label>
              <input
                type="date"
                value={form.early_bird_deadline}
                onChange={(e) => setForm(f => ({ ...f, early_bird_deadline: e.target.value }))}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
          </div>

          {/* Capacity and deadline */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-secondary mb-1">Max Participants</label>
              <input
                type="number"
                min="1"
                value={form.max_participants}
                onChange={(e) => setForm(f => ({ ...f, max_participants: e.target.value }))}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                placeholder="Unlimited"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Registration Deadline</label>
              <input
                type="date"
                value={form.registration_deadline}
                onChange={(e) => setForm(f => ({ ...f, registration_deadline: e.target.value }))}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {/* Target audience */}
          <div className="space-y-2">
            <label className="block text-xs text-secondary">Target Audience</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, target_audience: 'all', target_team_ids: [] }))}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  form.target_audience === 'all' ? 'bg-pitch-600 text-on-dark' : 'bg-subtle text-secondary hover:text-primary'
                }`}
              >
                <Users className="w-3.5 h-3.5 inline mr-1" />
                All / Open to Public
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, target_audience: 'specific' }))}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  form.target_audience === 'specific' ? 'bg-pitch-600 text-on-dark' : 'bg-subtle text-secondary hover:text-primary'
                }`}
              >
                Specific Teams
              </button>
            </div>
            {form.target_audience === 'specific' && teams.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {teams.map(team => (
                  <label key={team.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-subtle rounded-lg text-sm text-secondary cursor-pointer hover:bg-border-default">
                    <input
                      type="checkbox"
                      checked={form.target_team_ids.includes(team.id)}
                      onChange={(e) => {
                        const ids = e.target.checked
                          ? [...form.target_team_ids, team.id]
                          : form.target_team_ids.filter(id => id !== team.id)
                        setForm(f => ({ ...f, target_team_ids: ids }))
                      }}
                      className="rounded bg-border-default border-border-strong text-pitch-600 focus:ring-pitch-600"
                    />
                    {team.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={form.requires_medical_info}
                onChange={(e) => setForm(f => ({ ...f, requires_medical_info: e.target.checked }))}
                className="rounded bg-subtle border-border-strong text-pitch-600 focus:ring-pitch-600"
              />
              Request medical info
            </label>
            <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={form.requires_photo_consent}
                onChange={(e) => setForm(f => ({ ...f, requires_photo_consent: e.target.checked }))}
                className="rounded bg-subtle border-border-strong text-pitch-600 focus:ring-pitch-600"
              />
              Require photo consent
            </label>
          </div>

          {/* Custom fields */}
          <div className="space-y-2">
            <label className="block text-xs text-secondary">Custom Registration Fields</label>
            {form.custom_fields.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.custom_fields.map((field, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-subtle px-3 py-1.5 rounded-lg text-sm text-secondary">
                    <span>{field.label}</span>
                    <button type="button" onClick={() => removeCustomField(idx)} className="text-tertiary hover:text-red-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={customFieldInput}
                onChange={(e) => setCustomFieldInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomField())}
                className="flex-1 bg-subtle border border-border-strong rounded-lg px-3 py-2 text-primary text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                placeholder="e.g. T-shirt size, dietary requirements..."
              />
              <button
                type="button"
                onClick={addCustomField}
                className="px-3 py-2 bg-subtle hover:bg-border-default text-secondary hover:text-primary rounded-lg text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-secondary hover:text-primary transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-primary rounded-lg text-sm transition-colors">
              {saving ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-card border border-border-default rounded-xl p-1">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === tab.id
                ? 'bg-pitch-600/20 text-pitch-400'
                : 'text-secondary hover:text-primary hover:bg-subtle'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Events list */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border-default rounded-xl p-8 text-center">
          <CalendarDays className="w-12 h-12 text-tertiary mx-auto mb-3" />
          <h3 className="text-lg font-medium text-primary mb-1">No events found</h3>
          <p className="text-secondary text-sm">
            {activeFilter === 'all'
              ? 'Create your first event to get started.'
              : `No ${activeFilter} events.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(event => (
            <EventCard
              key={event.id}
              event={event}
              canManage={canManage}
              expanded={expandedEvent === event.id}
              registrationsList={registrations[event.id]}
              loadingRegistrations={loadingRegistrations === event.id}
              onToggleExpand={() => loadRegistrations(event.id)}
              onEdit={() => startEdit(event)}
              onCancel={() => handleCancel(event.id)}
              onExport={() => handleExport(event.id)}
              onCopyLink={() => copyPublicLink(event.id)}
              onAttendanceToggle={(regId, attended) => handleAttendanceToggle(event.id, regId, attended)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EventCard({
  event, canManage, expanded, registrationsList, loadingRegistrations,
  onToggleExpand, onEdit, onCancel, onExport, onCopyLink, onAttendanceToggle,
}) {
  const typeConfig = EVENT_TYPES.find(t => t.value === event.event_type) || EVENT_TYPES[EVENT_TYPES.length - 1]
  const TypeIcon = typeConfig.icon
  const statusBadge = STATUS_BADGES[event.status] || STATUS_BADGES.draft
  const isPast = new Date(event.end_date || event.start_date) < new Date()
  const priceDisplay = event.price ? `£${(event.price / 100).toFixed(2)}` : 'Free'
  const registrationCount = event.registration_count || 0
  const capacityDisplay = event.max_participants
    ? `${registrationCount} / ${event.max_participants}`
    : `${registrationCount} registered`

  function formatDateRange(start, end) {
    const s = new Date(start)
    const opts = { day: 'numeric', month: 'short', year: 'numeric' }
    if (!end || start === end) return s.toLocaleDateString('en-GB', opts)
    const e = new Date(end)
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return `${s.getDate()}-${e.toLocaleDateString('en-GB', opts)}`
    }
    return `${s.toLocaleDateString('en-GB', opts)} - ${e.toLocaleDateString('en-GB', opts)}`
  }

  return (
    <div className={`bg-card border rounded-xl overflow-hidden ${
      event.status === 'cancelled' ? 'border-red-500/20 opacity-75' : 'border-border-default'
    }`}>
      {/* Event header */}
      <div className="flex items-start gap-4 px-5 py-4">
        {/* Type icon */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${typeConfig.color}`}>
          <TypeIcon className="w-5 h-5" />
        </div>

        {/* Event info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-primary truncate">{event.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${typeConfig.color}`}>
              {typeConfig.label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-secondary">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDateRange(event.start_date, event.end_date)}
              {event.start_time && ` ${event.start_time}`}
              {event.end_time && ` - ${event.end_time}`}
            </span>
            {event.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {event.venue}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Ticket className="w-3.5 h-3.5" />
              {priceDisplay}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {capacityDisplay}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {canManage && event.status === 'published' && (
            <button onClick={onCopyLink} className="p-2 text-secondary hover:text-pitch-400 transition-colors" title="Copy public link">
              <Copy className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onToggleExpand}
            disabled={loadingRegistrations}
            className="p-2 text-secondary hover:text-primary transition-colors"
            title="View registrations"
          >
            {loadingRegistrations ? (
              <div className="spinner w-4 h-4" />
            ) : expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Capacity bar */}
      {event.max_participants > 0 && (
        <div className="px-5 pb-3">
          <div className="w-full h-1.5 bg-subtle rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                registrationCount >= event.max_participants ? 'bg-red-500' :
                registrationCount >= event.max_participants * 0.8 ? 'bg-amber-500' :
                'bg-pitch-500'
              }`}
              style={{ width: `${Math.min(100, (registrationCount / event.max_participants) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Expanded: Registrations */}
      {expanded && (
        <div className="border-t border-border-default">
          {/* Action buttons */}
          {canManage && (
            <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-border-subtle">
              <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 bg-subtle hover:bg-border-default text-secondary hover:text-primary rounded-lg text-xs transition-colors">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-subtle hover:bg-border-default text-secondary hover:text-primary rounded-lg text-xs transition-colors">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
              {event.status !== 'cancelled' && (
                <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 bg-subtle hover:bg-red-600/20 text-secondary hover:text-red-400 rounded-lg text-xs transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Cancel Event
                </button>
              )}
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="px-5 py-3 border-b border-border-subtle">
              <p className="text-sm text-secondary whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Pricing details */}
          {event.price > 0 && (
            <div className="px-5 py-3 border-b border-border-subtle flex flex-wrap gap-4 text-xs text-secondary">
              <span>Standard: <span className="text-primary font-medium">£{(event.price / 100).toFixed(2)}</span></span>
              {event.sibling_discount > 0 && (
                <span>Sibling discount: <span className="text-primary font-medium">-£{(event.sibling_discount / 100).toFixed(2)}</span></span>
              )}
              {event.early_bird_price > 0 && (
                <span>
                  Early bird: <span className="text-primary font-medium">£{(event.early_bird_price / 100).toFixed(2)}</span>
                  {event.early_bird_deadline && (
                    <span className="text-tertiary"> (until {new Date(event.early_bird_deadline).toLocaleDateString('en-GB')})</span>
                  )}
                </span>
              )}
            </div>
          )}

          {/* Registrations list */}
          {registrationsList && registrationsList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-secondary uppercase">Participant</th>
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-secondary uppercase">Guardian</th>
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-secondary uppercase">Email</th>
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-secondary uppercase">Registered</th>
                    {canManage && (
                      <th className="text-center px-5 py-2.5 text-xs font-medium text-secondary uppercase">Attended</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {registrationsList.map(reg => (
                    <tr key={reg.id} className="border-b border-border-subtle last:border-0">
                      <td className="px-5 py-2.5 text-sm text-primary font-medium">{reg.participant_name}</td>
                      <td className="px-5 py-2.5 text-sm text-secondary">{reg.guardian_name}</td>
                      <td className="px-5 py-2.5 text-sm text-secondary">{reg.email}</td>
                      <td className="px-5 py-2.5 text-xs text-secondary">
                        {new Date(reg.created_at).toLocaleDateString('en-GB')}
                      </td>
                      {canManage && (
                        <td className="px-5 py-2.5 text-center">
                          <button
                            onClick={() => onAttendanceToggle(reg.id, !reg.attended)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              reg.attended
                                ? 'bg-pitch-600/20 text-pitch-400 hover:bg-pitch-600/30'
                                : 'bg-subtle text-tertiary hover:text-primary'
                            }`}
                            title={reg.attended ? 'Mark as not attended' : 'Mark as attended'}
                          >
                            {reg.attended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : registrationsList ? (
            <div className="px-5 py-6 text-center">
              <Users className="w-8 h-8 text-tertiary mx-auto mb-2" />
              <p className="text-sm text-secondary">No registrations yet</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
