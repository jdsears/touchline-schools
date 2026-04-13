import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { clubService, SERVER_URL } from '../../services/api'
import { UserPlus, Plus, X, CheckCircle, AlertCircle, Camera, FileText, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'

const emptyPlayer = {
  name: '', date_of_birth: '', team_id: '', allergies: '', medications: '', kit_size: '',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
  id_document_type: '',
}

export default function ClubRegister() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [club, setClub] = useState(null)
  const [teams, setTeams] = useState([])
  const [paymentPlans, setPaymentPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [paymentToken, setPaymentToken] = useState(null)

  const [guardian, setGuardian] = useState({
    guardian_first_name: '', guardian_last_name: '', guardian_email: '', guardian_phone: '',
    guardian_address_line1: '', guardian_city: '', guardian_county: '', guardian_postcode: '',
    guardian_relationship: 'parent',
  })
  const [players, setPlayers] = useState([{ ...emptyPlayer }])
  const [playerFiles, setPlayerFiles] = useState([{ photo: null, id_doc: null }])
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [consents, setConsents] = useState({ photo_consent: false, data_consent: false, medical_consent: false })

  useEffect(() => {
    loadRegistrationInfo()
  }, [slug])

  async function loadRegistrationInfo() {
    try {
      const res = await clubService.getRegistrationInfo(slug)
      setClub(res.data.club)
      setTeams(res.data.teams)
      setPaymentPlans(res.data.paymentPlans || [])
    } catch (err) {
      console.error('Failed to load registration info:', err)
    } finally {
      setLoading(false)
    }
  }

  function updateGuardian(field, value) {
    setGuardian(g => ({ ...g, [field]: value }))
  }

  function updatePlayer(index, field, value) {
    setPlayers(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  function updatePlayerFile(index, field, file) {
    setPlayerFiles(prev => prev.map((pf, i) => i === index ? { ...pf, [field]: file } : pf))
  }

  function addPlayer() {
    setPlayers(prev => [...prev, { ...emptyPlayer }])
    setPlayerFiles(prev => [...prev, { photo: null, id_doc: null }])
  }

  function removePlayer(index) {
    if (players.length <= 1) return
    setPlayers(prev => prev.filter((_, i) => i !== index))
    setPlayerFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!consents.data_consent) {
      toast.error('You must agree to the data processing consent to register.')
      return
    }

    const validPlayers = players.filter(p => p.name && p.team_id)
    if (validPlayers.length === 0) {
      toast.error('Please add at least one player with a name and team.')
      return
    }

    // Check emergency contact is filled
    for (let i = 0; i < validPlayers.length; i++) {
      if (!validPlayers[i].emergency_contact_name || !validPlayers[i].emergency_contact_phone) {
        toast.error(`Please provide an emergency contact for ${validPlayers[i].name || `Player ${i + 1}`}.`)
        return
      }
    }

    setSubmitting(true)
    try {
      // Build FormData for multipart upload
      const formData = new FormData()

      // Guardian fields
      Object.entries(guardian).forEach(([key, val]) => formData.append(key, val))

      // Consents
      Object.entries(consents).forEach(([key, val]) => formData.append(key, val.toString()))

      // Payment plan
      if (selectedPlanId) {
        formData.append('payment_plan_id', selectedPlanId)
      }

      // Players as JSON (files are separate)
      formData.append('players', JSON.stringify(validPlayers))

      // File uploads — keyed by player index
      validPlayers.forEach((_, vi) => {
        const originalIndex = players.indexOf(validPlayers[vi])
        const files = playerFiles[originalIndex]
        if (files?.photo) formData.append(`player_photo_${vi}`, files.photo)
        if (files?.id_doc) formData.append(`player_id_doc_${vi}`, files.id_doc)
      })

      const res = await clubService.submitRegistration(slug, formData)

      // If a payment token was returned, redirect to payment
      if (res.data?.paymentToken) {
        setPaymentToken(res.data.paymentToken)
      }
      setSubmitted(true)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent'

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-navy-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Club not found</h2>
          <p className="text-navy-400">This registration link may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-pitch-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Registration Submitted!</h2>
          <p className="text-navy-300 mb-6">
            Thank you for registering with {club.name}. We've sent a confirmation to your email.
            {paymentToken
              ? ' Please complete your membership payment below to finalise your registration.'
              : ' The club admin will review your registration and you\'ll be notified once approved.'
            }
          </p>
          {paymentToken ? (
            <a
              href={`/pay/${paymentToken}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-pitch-600 hover:bg-pitch-500 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <CreditCard className="w-5 h-5" />
              Complete Payment
            </a>
          ) : (
            <Link to="/" className="text-pitch-400 hover:text-pitch-300 text-sm">
              Back to Touchline
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Header */}
      <div className="bg-navy-900 border-b border-navy-800">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: club.primary_color || '#1a365d' }}
            >
              {club.name?.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{club.name}</h1>
              <p className="text-sm text-navy-400">Player Registration</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Guardian details */}
        <section className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-white">Parent / Guardian Details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-navy-400 mb-1">First Name *</label>
              <input
                type="text" required value={guardian.guardian_first_name}
                onChange={(e) => updateGuardian('guardian_first_name', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Last Name *</label>
              <input
                type="text" required value={guardian.guardian_last_name}
                onChange={(e) => updateGuardian('guardian_last_name', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Email *</label>
              <input
                type="email" required value={guardian.guardian_email}
                onChange={(e) => updateGuardian('guardian_email', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Phone</label>
              <input
                type="tel" value={guardian.guardian_phone}
                onChange={(e) => updateGuardian('guardian_phone', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Relationship</label>
              <select
                value={guardian.guardian_relationship}
                onChange={(e) => updateGuardian('guardian_relationship', e.target.value)}
                className={inputClass}
              >
                <option value="parent">Parent</option>
                <option value="guardian">Guardian</option>
                <option value="carer">Carer</option>
              </select>
            </div>
          </div>

          {/* Address */}
          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div className="sm:col-span-2">
              <label className="block text-xs text-navy-400 mb-1">Address *</label>
              <input
                type="text" required value={guardian.guardian_address_line1}
                onChange={(e) => updateGuardian('guardian_address_line1', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">City *</label>
              <input
                type="text" required value={guardian.guardian_city}
                onChange={(e) => updateGuardian('guardian_city', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Postcode *</label>
              <input
                type="text" required value={guardian.guardian_postcode}
                onChange={(e) => updateGuardian('guardian_postcode', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Player(s) details */}
        {players.map((player, index) => (
          <section key={index} className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {players.length > 1 ? `Player ${index + 1}` : 'Player Details'}
              </h2>
              {players.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePlayer(index)}
                  className="p-1.5 text-navy-400 hover:text-alert-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-navy-400 mb-1">Full Name *</label>
                <input
                  type="text" required value={player.name}
                  onChange={(e) => updatePlayer(index, 'name', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-navy-400 mb-1">Date of Birth *</label>
                <input
                  type="date" required value={player.date_of_birth}
                  onChange={(e) => updatePlayer(index, 'date_of_birth', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-navy-400 mb-1">Team *</label>
                <select
                  required value={player.team_id}
                  onChange={(e) => updatePlayer(index, 'team_id', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a team...</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name} {t.age_group ? `(${t.age_group})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-navy-400 mb-1">Kit Size</label>
                <select
                  value={player.kit_size}
                  onChange={(e) => updatePlayer(index, 'kit_size', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select...</option>
                  <option value="YXS">Youth XS</option>
                  <option value="YS">Youth S</option>
                  <option value="YM">Youth M</option>
                  <option value="YL">Youth L</option>
                  <option value="YXL">Youth XL</option>
                  <option value="AS">Adult S</option>
                  <option value="AM">Adult M</option>
                  <option value="AL">Adult L</option>
                  <option value="AXL">Adult XL</option>
                </select>
              </div>

              {/* Medical */}
              <div className="sm:col-span-2">
                <label className="block text-xs text-navy-400 mb-1">Allergies</label>
                <input
                  type="text" value={player.allergies}
                  onChange={(e) => updatePlayer(index, 'allergies', e.target.value)}
                  className={inputClass}
                  placeholder="Leave blank if none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-navy-400 mb-1">Medications</label>
                <input
                  type="text" value={player.medications}
                  onChange={(e) => updatePlayer(index, 'medications', e.target.value)}
                  className={inputClass}
                  placeholder="Leave blank if none"
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="pt-2 border-t border-navy-800">
              <h3 className="text-sm font-medium text-white mb-3">Emergency Contact *</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-navy-400 mb-1">Name *</label>
                  <input
                    type="text" required value={player.emergency_contact_name}
                    onChange={(e) => updatePlayer(index, 'emergency_contact_name', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-navy-400 mb-1">Phone *</label>
                  <input
                    type="tel" required value={player.emergency_contact_phone}
                    onChange={(e) => updatePlayer(index, 'emergency_contact_phone', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-navy-400 mb-1">Relationship</label>
                  <select
                    value={player.emergency_contact_relationship}
                    onChange={(e) => updatePlayer(index, 'emergency_contact_relationship', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select...</option>
                    <option value="parent">Parent</option>
                    <option value="guardian">Guardian</option>
                    <option value="grandparent">Grandparent</option>
                    <option value="sibling">Sibling</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Photo & ID Document uploads */}
            <div className="pt-2 border-t border-navy-800">
              <h3 className="text-sm font-medium text-white mb-3">Photo & ID Verification</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Player photo */}
                <div>
                  <label className="block text-xs text-navy-400 mb-1">
                    <Camera className="w-3 h-3 inline mr-1" />
                    Player Photo (passport style) *
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 bg-navy-800 border border-navy-700 border-dashed rounded-lg cursor-pointer hover:border-navy-600 transition-colors">
                    <Camera className="w-4 h-4 text-navy-400" />
                    <span className="text-sm text-navy-300 truncate">
                      {playerFiles[index]?.photo ? playerFiles[index].photo.name : 'Choose photo...'}
                    </span>
                    <input
                      type="file" accept="image/*" className="hidden"
                      onChange={(e) => updatePlayerFile(index, 'photo', e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                {/* ID Document */}
                <div>
                  <label className="block text-xs text-navy-400 mb-1">
                    <FileText className="w-3 h-3 inline mr-1" />
                    Passport or Birth Certificate *
                  </label>
                  <select
                    value={player.id_document_type}
                    onChange={(e) => updatePlayer(index, 'id_document_type', e.target.value)}
                    className={`${inputClass} mb-2`}
                  >
                    <option value="">Document type...</option>
                    <option value="passport">Passport</option>
                    <option value="birth_certificate">Birth Certificate</option>
                  </select>
                  <label className="flex items-center gap-2 px-3 py-2 bg-navy-800 border border-navy-700 border-dashed rounded-lg cursor-pointer hover:border-navy-600 transition-colors">
                    <FileText className="w-4 h-4 text-navy-400" />
                    <span className="text-sm text-navy-300 truncate">
                      {playerFiles[index]?.id_doc ? playerFiles[index].id_doc.name : 'Upload document...'}
                    </span>
                    <input
                      type="file" accept="image/*,.pdf" className="hidden"
                      onChange={(e) => updatePlayerFile(index, 'id_doc', e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>
              <p className="text-xs text-navy-500 mt-2">
                Documents are stored securely and used for age verification purposes only.
              </p>
            </div>
          </section>
        ))}

        <button
          type="button"
          onClick={addPlayer}
          className="flex items-center gap-2 px-4 py-2 bg-navy-800 hover:bg-navy-700 text-navy-300 rounded-lg text-sm transition-colors w-full justify-center border border-navy-700 border-dashed"
        >
          <Plus className="w-4 h-4" />
          Add Another Player
        </button>

        {/* Membership Payment Plan selection */}
        {paymentPlans.length > 0 && (
          <section className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-pitch-400" />
              Membership Subscription
            </h2>
            <p className="text-sm text-navy-400">
              Select a membership plan. Payment is taken on the 1st of each month during the subscription term.
            </p>
            <div className="space-y-2">
              {paymentPlans.map(plan => {
                const amount = `£${(plan.amount / 100).toFixed(2)}`
                const intervalLabel = plan.interval_count > 1
                  ? `every ${plan.interval_count} ${plan.interval}s`
                  : `/${plan.interval}`
                const termLabel = plan.term_start && plan.term_end
                  ? ` (${new Date(plan.term_start).toLocaleDateString('en-GB', { month: 'short' })} – ${new Date(plan.term_end).toLocaleDateString('en-GB', { month: 'short' })})`
                  : ''

                return (
                  <label
                    key={plan.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPlanId === plan.id
                        ? 'border-pitch-500 bg-pitch-600/10'
                        : 'border-navy-700 bg-navy-800/50 hover:border-navy-600'
                    }`}
                  >
                    <input
                      type="radio" name="payment_plan" value={plan.id}
                      checked={selectedPlanId === plan.id}
                      onChange={() => setSelectedPlanId(plan.id)}
                      className="text-pitch-600 focus:ring-pitch-600 bg-navy-800 border-navy-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{plan.name}</p>
                      {plan.description && <p className="text-xs text-navy-400">{plan.description}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{amount}<span className="text-navy-400 font-normal">{intervalLabel}</span></p>
                      {termLabel && <p className="text-xs text-navy-500">{termLabel}</p>}
                    </div>
                  </label>
                )
              })}
            </div>
          </section>
        )}

        {/* Consents */}
        <section className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-3">
          <h2 className="text-lg font-semibold text-white">Consent</h2>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox" checked={consents.data_consent}
              onChange={(e) => setConsents(c => ({ ...c, data_consent: e.target.checked }))}
              className="mt-1 rounded border-navy-600 bg-navy-800 text-pitch-600 focus:ring-pitch-600"
            />
            <span className="text-sm text-navy-300">
              I consent to {club.name} storing and processing the personal data provided for the purpose of managing player registration and club administration. *
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox" checked={consents.photo_consent}
              onChange={(e) => setConsents(c => ({ ...c, photo_consent: e.target.checked }))}
              className="mt-1 rounded border-navy-600 bg-navy-800 text-pitch-600 focus:ring-pitch-600"
            />
            <span className="text-sm text-navy-300">
              I consent to photographs and videos of my child being taken and used for club purposes (website, social media, match reports).
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox" checked={consents.medical_consent}
              onChange={(e) => setConsents(c => ({ ...c, medical_consent: e.target.checked }))}
              className="mt-1 rounded border-navy-600 bg-navy-800 text-pitch-600 focus:ring-pitch-600"
            />
            <span className="text-sm text-navy-300">
              I consent to the club administering first aid to my child in the event of an injury during training or matches.
            </span>
          </label>
        </section>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          {submitting ? 'Submitting...' : selectedPlanId ? 'Register & Continue to Payment' : 'Submit Registration'}
        </button>

        <p className="text-xs text-navy-500 text-center">
          Powered by <a href="https://touchline.xyz" className="text-navy-400 hover:text-white">Touchline</a>
        </p>
      </form>
    </div>
  )
}
