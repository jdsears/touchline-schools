import { useState, useEffect } from 'react'
import { settingsService } from '../../../services/api'
import { Loader2, Mail, Calendar, Users, Dumbbell } from 'lucide-react'

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-navy-800 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-navy-800 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-navy-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-navy-500">{label}</div>
        <div className="text-sm text-white">{value || <span className="text-navy-500">Not set</span>}</div>
      </div>
    </div>
  )
}

function formatDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function LicenceTab() {
  const [licence, setLicence] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    settingsService.getLicence()
      .then(r => setLicence(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-navy-400" />
    </div>
  )

  const renewalDate = formatDate(licence?.term_end)
  const daysToRenewal = licence?.term_end
    ? Math.ceil((new Date(licence.term_end) - new Date()) / 86400000)
    : null

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Licence</h2>
        <p className="text-sm text-navy-400 mt-1">
          Your school's MoonBoots licence details. Read-only — contact MoonBoots to update.
        </p>
      </div>

      {daysToRenewal !== null && daysToRenewal < 60 && (
        <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-4 text-sm text-amber-400">
          <strong>Renewal approaching:</strong> Your licence renews on {renewalDate} ({daysToRenewal} days).
        </div>
      )}

      <div className="bg-navy-900 rounded-xl border border-navy-800 p-5">
        <Row icon={Calendar} label="Licence Start"   value={formatDate(licence?.term_start)} />
        <Row icon={Calendar} label="Renewal Date"    value={renewalDate} />
        <Row icon={Users}    label="Seat Count"      value={licence?.seat_count ? `${licence.seat_count} staff seats` : null} />
        <Row icon={Dumbbell} label="Sports Included" value={licence?.sport_count ? `${licence.sport_count} sports` : 'All supported sports'} />
        <Row icon={Mail}     label="Your MoonBoots Contact" value={licence?.commercial_contact_name || 'MoonBoots Team'} />
      </div>

      {licence?.notes && (
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-5">
          <h3 className="text-sm font-semibold text-white mb-2">Notes</h3>
          <p className="text-sm text-navy-300">{licence.notes}</p>
        </div>
      )}

      <div className="bg-navy-900 rounded-xl border border-navy-800 p-5">
        <h3 className="text-sm font-semibold text-white mb-2">Licence Review</h3>
        <p className="text-sm text-navy-400 mb-3">
          To discuss your licence, add sports, or adjust your seat count, contact the MoonBoots team.
        </p>
        <a
          href={`mailto:accounts@moonbootssports.com?subject=Licence review request&body=School: ${encodeURIComponent(window.location.hostname)}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-navy-800 hover:bg-navy-700 text-navy-300 rounded-lg text-sm transition-colors"
        >
          <Mail className="w-4 h-4" />
          Request licence review
        </a>
      </div>
    </div>
  )
}
