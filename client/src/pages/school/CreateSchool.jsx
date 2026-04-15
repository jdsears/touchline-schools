import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clubService } from '../../services/api'
import { Building2, Shield, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CreateClub() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [dpaAccepted, setDpaAccepted] = useState(false)
  const [showDpa, setShowDpa] = useState(false)
  const [form, setForm] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    league: '',
    primary_color: '#1a365d',
    secondary_color: '#38a169',
  })

  async function handleSubmit(e) {
    e.preventDefault()
    if (!dpaAccepted) {
      toast.error('You must accept the Data Processing Agreement to create a school.')
      return
    }
    setSaving(true)
    try {
      const res = await clubService.createClub({ ...form, dpa_accepted: true })
      toast.success('School created!')
      navigate(`/school/${res.data.slug}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create school')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="w-8 h-8 text-pitch-400" />
          <h1 className="text-2xl font-bold text-white">Create Your School</h1>
        </div>
        <p className="text-navy-400 text-sm">
          Set up your school to manage multiple teams, pupils, guardians, and payments from one place.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-xs text-navy-400 mb-1">School Name *</label>
            <input
              type="text" required value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              placeholder="e.g. Morley FC"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-navy-400 mb-1">Contact Email</label>
              <input
                type="email" value={form.contact_email}
                onChange={(e) => setForm(f => ({ ...f, contact_email: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">League</label>
              <input
                type="text" value={form.league}
                onChange={(e) => setForm(f => ({ ...f, league: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                placeholder="e.g. Norfolk Youth League"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-navy-400 mb-1">Primary Colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color" value={form.primary_color}
                  onChange={(e) => setForm(f => ({ ...f, primary_color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-navy-700 cursor-pointer"
                />
                <input
                  type="text" value={form.primary_color}
                  onChange={(e) => setForm(f => ({ ...f, primary_color: e.target.value }))}
                  className="flex-1 bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-navy-400 mb-1">Secondary Colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color" value={form.secondary_color}
                  onChange={(e) => setForm(f => ({ ...f, secondary_color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-navy-700 cursor-pointer"
                />
                <input
                  type="text" value={form.secondary_color}
                  onChange={(e) => setForm(f => ({ ...f, secondary_color: e.target.value }))}
                  className="flex-1 bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:ring-2 focus:ring-pitch-600 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Data Processing Agreement */}
        <section className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Data Processing Agreement</h2>
          </div>

          <button
            type="button"
            onClick={() => setShowDpa(!showDpa)}
            className="flex items-center justify-between w-full text-left px-3 py-2 bg-navy-800 rounded-lg text-sm text-navy-300 hover:bg-navy-700 transition-colors"
          >
            <span>Read the Data Processing Agreement</span>
            {showDpa ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showDpa && (
            <div className="bg-navy-800/50 rounded-lg p-4 text-xs text-navy-300 space-y-3 max-h-80 overflow-y-auto border border-navy-700">
              <h3 className="font-semibold text-white text-sm">Data Processing Agreement (DPA) — v1.0</h3>

              <p>This Data Processing Agreement ("DPA") forms part of the agreement between Touchline ("Processor") and the School ("Controller") for the use of the Touchline platform.</p>

              <h4 className="font-medium text-navy-200">1. Roles & Responsibilities</h4>
              <p>The School acts as the <strong className="text-navy-200">Data Controller</strong> under UK GDPR. The School determines what personal data is collected, the purpose of collection, and is responsible for ensuring lawful basis for processing. Touchline acts as a <strong className="text-navy-200">Data Processor</strong>, processing data solely on the School's instructions through the platform.</p>

              <h4 className="font-medium text-navy-200">2. Data Processed</h4>
              <p>Personal data processed includes: pupil names, dates of birth, medical information, emergency contacts, passport-style photographs, identity documents, guardian contact details, payment information (via Stripe), and consent records.</p>

              <h4 className="font-medium text-navy-200">3. School Obligations</h4>
              <ul className="list-disc pl-4 space-y-1">
                <li>Ensure a lawful basis exists for collecting and processing personal data (e.g. consent, legitimate interest, or contractual necessity).</li>
                <li>Respond to data subject access requests (DSARs) within 30 days.</li>
                <li>Report data breaches to the ICO within 72 hours of becoming aware.</li>
                <li>Ensure that all data entered into Touchline is accurate and up to date.</li>
                <li>Not upload or store data that is unlawful, offensive, or in breach of any regulation.</li>
                <li>Inform guardians/parents about how their data is processed and their rights.</li>
              </ul>

              <h4 className="font-medium text-navy-200">4. Touchline Obligations</h4>
              <ul className="list-disc pl-4 space-y-1">
                <li>Process data only as instructed by the School through the platform.</li>
                <li>Implement appropriate technical and organisational security measures (encryption in transit, access controls, secure hosting).</li>
                <li>Not transfer data outside the UK/EEA without appropriate safeguards.</li>
                <li>Assist the School in responding to DSARs and breach notifications.</li>
                <li>Delete or return all personal data upon termination of the School's account (within 30 days).</li>
                <li>Not sub-process data to third parties without prior consent (current sub-processors: Railway (hosting), Stripe (payments), Resend (email)).</li>
              </ul>

              <h4 className="font-medium text-navy-200">5. Data Retention</h4>
              <p>Data is retained while the School's account is active. Upon account closure, all School data (including pupil records, documents, and payment history) is deleted within 30 days. Clubs may request early deletion at any time.</p>

              <h4 className="font-medium text-navy-200">6. Security Measures</h4>
              <p>Touchline implements: HTTPS/TLS encryption in transit, JWT-based authentication, role-based access controls, authenticated file access for sensitive documents, rate limiting, and regular security reviews.</p>

              <h4 className="font-medium text-navy-200">7. Breach Notification</h4>
              <p>In the event of a personal data breach, Touchline will notify the School without undue delay and no later than 48 hours after becoming aware of the breach.</p>

              <h4 className="font-medium text-navy-200">8. Governing Law</h4>
              <p>This DPA is governed by the laws of England and Wales and is subject to the jurisdiction of the English courts.</p>
            </div>
          )}

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={dpaAccepted}
              onChange={(e) => setDpaAccepted(e.target.checked)}
              className="mt-1 rounded border-navy-600 bg-navy-800 text-pitch-600 focus:ring-pitch-600"
            />
            <span className="text-sm text-navy-300">
              I confirm that I am authorised to act on behalf of this school and I accept the <button type="button" onClick={() => setShowDpa(true)} className="text-amber-400 hover:text-amber-300 underline">Data Processing Agreement</button>. I understand that the school is the Data Controller and is responsible for ensuring lawful basis for processing personal data. *
            </span>
          </label>
        </section>

        <button
          type="submit"
          disabled={saving || !dpaAccepted}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-pitch-600 hover:bg-pitch-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Building2 className="w-5 h-5" />
          {saving ? 'Creating...' : 'Create School'}
        </button>
      </form>
    </div>
  )
}
