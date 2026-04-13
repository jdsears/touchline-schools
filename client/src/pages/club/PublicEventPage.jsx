import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { clubEventsService } from '../../services/api'
import {
  CalendarDays, Clock, MapPin, Users, Ticket, Trophy,
  Tent, Flag, Star, DollarSign, CheckCircle, AlertCircle,
  XCircle, ExternalLink, ArrowRight, ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'

const EVENT_TYPE_CONFIG = {
  camp: { icon: Tent, color: 'text-emerald-400', bg: 'bg-emerald-600/20', label: 'Camp' },
  tournament: { icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-600/20', label: 'Tournament' },
  trial: { icon: Flag, color: 'text-blue-400', bg: 'bg-blue-600/20', label: 'Trial Day' },
  social: { icon: Star, color: 'text-purple-400', bg: 'bg-purple-600/20', label: 'Social Event' },
  fundraiser: { icon: DollarSign, color: 'text-pink-400', bg: 'bg-pink-600/20', label: 'Fundraiser' },
  other: { icon: CalendarDays, color: 'text-navy-300', bg: 'bg-navy-700', label: 'Event' },
}

export default function PublicEventPage() {
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    participant_name: '',
    participant_dob: '',
    guardian_name: '',
    email: '',
    phone: '',
    medical_info: '',
    photo_consent: false,
    custom_responses: {},
  })

  useEffect(() => {
    loadEvent()
  }, [eventId])

  async function loadEvent() {
    try {
      const res = await clubEventsService.getPublicEvent(eventId)
      setEvent(res.data)
    } catch (err) {
      console.error('Failed to load event:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.participant_name || !form.guardian_name || !form.email) {
      return toast.error('Please fill in all required fields')
    }
    if (event.requires_photo_consent && !form.photo_consent) {
      return toast.error('Photo consent is required for this event')
    }
    setSubmitting(true)
    try {
      const res = await clubEventsService.registerForEvent(eventId, {
        ...form,
        custom_responses: Object.keys(form.custom_responses).length > 0
          ? form.custom_responses
          : undefined,
      })
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url
      } else {
        setSubmitted(true)
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to register'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  function formatDateRange(start, end) {
    const s = new Date(start)
    const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    if (!end || start === end) return s.toLocaleDateString('en-GB', opts)
    const e = new Date(end)
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return `${s.getDate()} - ${e.toLocaleDateString('en-GB', opts)}`
    }
    return `${s.toLocaleDateString('en-GB', opts)} - ${e.toLocaleDateString('en-GB', opts)}`
  }

  function getMapUrl(address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  }

  function isRegistrationClosed() {
    if (!event) return false
    if (event.status === 'cancelled') return true
    if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) return true
    return false
  }

  function isAtCapacity() {
    if (!event || !event.max_participants) return false
    return (event.registration_count || 0) >= event.max_participants
  }

  function getCurrentPrice() {
    if (!event || !event.price) return null
    if (event.early_bird_price && event.early_bird_deadline) {
      const deadline = new Date(event.early_bird_deadline)
      if (new Date() < deadline) {
        return { amount: event.early_bird_price, isEarlyBird: true }
      }
    }
    return { amount: event.price, isEarlyBird: false }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center px-4">
          <XCircle className="w-16 h-16 text-navy-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Event Not Found</h1>
          <p className="text-navy-400">This event may have been removed or the link is invalid.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center px-4 max-w-md">
          <div className="w-16 h-16 rounded-full bg-pitch-600/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-pitch-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Registration Confirmed</h1>
          <p className="text-navy-300 mb-4">
            You have been successfully registered for <span className="text-white font-semibold">{event.title}</span>.
          </p>
          <p className="text-sm text-navy-400">A confirmation email has been sent to {form.email}.</p>
        </div>
      </div>
    )
  }

  const typeConfig = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.other
  const TypeIcon = typeConfig.icon
  const closed = isRegistrationClosed()
  const full = isAtCapacity()
  const currentPrice = getCurrentPrice()

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Hero banner */}
      <div className="bg-gradient-to-b from-navy-900 to-navy-950 border-b border-navy-800">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
          {/* Club name */}
          {event.club_name && (
            <p className="text-sm text-navy-400 mb-3 flex items-center gap-2">
              {event.club_logo ? (
                <img src={event.club_logo} alt="" className="w-5 h-5 rounded" />
              ) : (
                <div
                  className="w-5 h-5 rounded flex items-center justify-center text-white font-bold text-xs"
                  style={{ backgroundColor: event.club_color || '#1a365d' }}
                >
                  {event.club_name?.charAt(0)}
                </div>
              )}
              {event.club_name}
            </p>
          )}

          {/* Event type badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${typeConfig.bg} ${typeConfig.color}`}>
              <TypeIcon className="w-3.5 h-3.5" />
              {typeConfig.label}
            </span>
            {event.status === 'cancelled' && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-400">Cancelled</span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">{event.title}</h1>

          {/* Key details */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-navy-300">
            <span className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-navy-500" />
              {formatDateRange(event.start_date, event.end_date)}
            </span>
            {event.start_time && (
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-navy-500" />
                {event.start_time}{event.end_time ? ` - ${event.end_time}` : ''}
              </span>
            )}
            {event.venue && (
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-navy-500" />
                {event.venue}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Event details cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          {/* Price card */}
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-pitch-600/10 text-pitch-400">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                {currentPrice ? (
                  <>
                    <p className="text-xl font-bold text-white">
                      £{(currentPrice.amount / 100).toFixed(2)}
                    </p>
                    {currentPrice.isEarlyBird && (
                      <p className="text-xs text-pitch-400">Early bird price</p>
                    )}
                    {currentPrice.isEarlyBird && event.price && (
                      <p className="text-xs text-navy-500 line-through">
                        £{(event.price / 100).toFixed(2)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xl font-bold text-pitch-400">Free</p>
                )}
              </div>
            </div>
            {event.sibling_discount > 0 && (
              <p className="text-xs text-navy-400 mt-2">
                Sibling discount: -£{(event.sibling_discount / 100).toFixed(2)}
              </p>
            )}
          </div>

          {/* Capacity card */}
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                full ? 'bg-red-500/10 text-red-400' : 'bg-blue-600/10 text-blue-400'
              }`}>
                <Users className="w-5 h-5" />
              </div>
              <div>
                {event.max_participants ? (
                  <>
                    <p className="text-xl font-bold text-white">
                      {event.registration_count || 0} / {event.max_participants}
                    </p>
                    <p className="text-xs text-navy-400">
                      {full ? 'Full' : `${event.max_participants - (event.registration_count || 0)} places left`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold text-white">{event.registration_count || 0}</p>
                    <p className="text-xs text-navy-400">Registered</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Venue card */}
          {event.venue && (
            <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-600/10 text-amber-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{event.venue}</p>
                  {event.venue_address && (
                    <a
                      href={getMapUrl(event.venue_address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-pitch-400 hover:text-pitch-300 flex items-center gap-1"
                    >
                      View on map <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-3">About this event</h2>
            <div className="text-sm text-navy-300 whitespace-pre-wrap leading-relaxed">
              {event.description}
            </div>
          </div>
        )}

        {/* Early bird info */}
        {event.early_bird_price > 0 && event.early_bird_deadline && (
          <div className="bg-pitch-600/10 border border-pitch-600/20 rounded-xl p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-pitch-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-pitch-400">Early bird pricing available</p>
              <p className="text-xs text-navy-300 mt-0.5">
                Register before {new Date(event.early_bird_deadline).toLocaleDateString('en-GB', {
                  weekday: 'long', day: 'numeric', month: 'long'
                })} to pay £{(event.early_bird_price / 100).toFixed(2)} instead of £{(event.price / 100).toFixed(2)}.
              </p>
            </div>
          </div>
        )}

        {/* Registration status alerts */}
        {event.status === 'cancelled' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-400">Event Cancelled</p>
              <p className="text-xs text-navy-300 mt-0.5">This event has been cancelled. Please contact the club for more information.</p>
            </div>
          </div>
        )}

        {closed && event.status !== 'cancelled' && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-400">Registration Closed</p>
              <p className="text-xs text-navy-300 mt-0.5">
                The registration deadline for this event has passed.
              </p>
            </div>
          </div>
        )}

        {full && !closed && event.status !== 'cancelled' && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-400">Event Full</p>
              <p className="text-xs text-navy-300 mt-0.5">
                This event has reached maximum capacity. You may register to be added to the waitlist.
              </p>
            </div>
          </div>
        )}

        {/* Registration form */}
        {!closed && event.status !== 'cancelled' && (
          <form onSubmit={handleSubmit} className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-pitch-400" />
              {full ? 'Join Waitlist' : 'Register'}
            </h2>

            {/* Participant details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-navy-300 uppercase tracking-wider">Participant Details</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-navy-400 mb-1">Participant Name *</label>
                  <input
                    type="text"
                    required
                    value={form.participant_name}
                    onChange={(e) => setForm(f => ({ ...f, participant_name: e.target.value }))}
                    className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                    placeholder="Child's full name"
                  />
                </div>
                <div>
                  <label className="block text-xs text-navy-400 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={form.participant_dob}
                    onChange={(e) => setForm(f => ({ ...f, participant_dob: e.target.value }))}
                    className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Guardian details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-navy-300 uppercase tracking-wider">Guardian Details</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-navy-400 mb-1">Guardian Name *</label>
                  <input
                    type="text"
                    required
                    value={form.guardian_name}
                    onChange={(e) => setForm(f => ({ ...f, guardian_name: e.target.value }))}
                    className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                    placeholder="Parent/guardian full name"
                  />
                </div>
                <div>
                  <label className="block text-xs text-navy-400 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <div className="max-w-sm">
                <label className="block text-xs text-navy-400 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                  placeholder="07700 900000"
                />
              </div>
            </div>

            {/* Medical info */}
            {event.requires_medical_info && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-navy-300 uppercase tracking-wider">Medical Information</h3>
                <div>
                  <label className="block text-xs text-navy-400 mb-1">
                    Allergies, conditions, or medications we should know about
                  </label>
                  <textarea
                    value={form.medical_info}
                    rows={3}
                    onChange={(e) => setForm(f => ({ ...f, medical_info: e.target.value }))}
                    className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent resize-none"
                    placeholder="Please list any relevant medical information, or write 'None' if not applicable..."
                  />
                </div>
              </div>
            )}

            {/* Custom fields */}
            {event.custom_fields && event.custom_fields.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-navy-300 uppercase tracking-wider">Additional Information</h3>
                {event.custom_fields.map((field, idx) => (
                  <div key={idx}>
                    <label className="block text-xs text-navy-400 mb-1">
                      {field.label} {field.required && '*'}
                    </label>
                    <input
                      type="text"
                      required={field.required}
                      value={form.custom_responses[field.label] || ''}
                      onChange={(e) => setForm(f => ({
                        ...f,
                        custom_responses: { ...f.custom_responses, [field.label]: e.target.value },
                      }))}
                      className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Photo consent */}
            {event.requires_photo_consent && (
              <div className="border border-navy-800 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.photo_consent}
                    onChange={(e) => setForm(f => ({ ...f, photo_consent: e.target.checked }))}
                    className="mt-0.5 rounded bg-navy-800 border-navy-700 text-pitch-600 focus:ring-pitch-600"
                  />
                  <div>
                    <p className="text-sm text-white font-medium">Photo & Video Consent *</p>
                    <p className="text-xs text-navy-400 mt-0.5">
                      I give permission for photographs and videos of the participant to be taken during this event
                      and used on the club's website, social media, and promotional materials.
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {submitting ? (
                  <>
                    <div className="spinner w-4 h-4" />
                    Processing...
                  </>
                ) : (
                  <>
                    {full ? 'Join Waitlist' : currentPrice ? `Register & Pay £${(currentPrice.amount / 100).toFixed(2)}` : 'Register Now'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              {currentPrice && (
                <p className="text-xs text-navy-500 text-center mt-2">
                  Secure payment powered by Stripe
                </p>
              )}
            </div>
          </form>
        )}

        {/* Registration deadline info */}
        {event.registration_deadline && !closed && (
          <p className="text-xs text-navy-500 text-center">
            Registration closes {new Date(event.registration_deadline).toLocaleDateString('en-GB', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
        )}
      </div>
    </div>
  )
}
