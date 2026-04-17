import { useState, useEffect } from 'react'
import { pupilProfileService } from '../../../services/api'
import { Stethoscope, Brain, Phone, Loader2, AlertTriangle, CalendarCheck } from 'lucide-react'

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function MedicalSendTab({ pupilId }) {
  const [medical, setMedical] = useState(null)
  const [send, setSend] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      pupilProfileService.getMedical(pupilId).then(r => setMedical(r.data)).catch(err => {
        if (err.response?.status === 403) setError('forbidden')
        else setMedical([])
      }),
      pupilProfileService.getSend(pupilId).then(r => setSend(r.data)).catch(() => setSend([])),
    ]).finally(() => setLoading(false))
  }, [pupilId])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-navy-400" /></div>

  if (error === 'forbidden') {
    return (
      <div className="bg-navy-900 rounded-xl border border-navy-800 p-8 text-center">
        <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
        <p className="text-sm text-navy-300">You do not have permission to view medical or SEND records for this pupil.</p>
      </div>
    )
  }

  const m = medical?.[0]
  const s = send?.[0]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-navy-900 rounded-xl border border-navy-800 p-5">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
          <Stethoscope className="w-4 h-4 text-rose-400" />Medical
        </h2>
        {!m ? (
          <p className="text-sm text-navy-500 text-center py-6">No medical notes recorded.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <Row label="Condition" value={m.condition} />
            <Row label="Medication" value={m.medication} />
            <Row label="Allergies" value={m.allergies} />
            <Row label="Dietary" value={m.dietary_requirements} />
            <Row label="Physical limitations (PE)" value={m.physical_limitations_note} />
            {(m.emergency_contact_name || m.emergency_contact_phone) && (
              <div className="pt-3 mt-3 border-t border-navy-800">
                <div className="text-xs text-navy-500 uppercase tracking-wide mb-1.5">Emergency contact</div>
                <div className="text-white text-sm">{m.emergency_contact_name}</div>
                {m.emergency_contact_phone && (
                  <a href={`tel:${m.emergency_contact_phone}`} className="inline-flex items-center gap-1 text-pitch-400 hover:underline text-xs mt-0.5">
                    <Phone className="w-3 h-3" />{m.emergency_contact_phone}
                  </a>
                )}
              </div>
            )}
            {m.last_reviewed_date && (
              <div className="text-xs text-navy-500 flex items-center gap-1 pt-2">
                <CalendarCheck className="w-3 h-3" />Last reviewed {formatDate(m.last_reviewed_date)}
                {m.last_reviewed_by_name && ` by ${m.last_reviewed_by_name}`}
              </div>
            )}
            <p className="text-xs text-amber-400/80 italic pt-2">Verify against school nurse records before acting on clinical details.</p>
          </div>
        )}
      </div>

      <div className="bg-navy-900 rounded-xl border border-navy-800 p-5">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4 text-sky-400" />SEND / Additional needs
        </h2>
        {!s ? (
          <p className="text-sm text-navy-500 text-center py-6">No SEND profile recorded.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.ehcp_status ? 'bg-sky-500/20 text-sky-400' : 'bg-navy-700 text-navy-400'}`}>
                {s.ehcp_status ? 'EHCP in place' : 'No EHCP'}
              </span>
              {s.ehcp_number && <span className="text-xs text-navy-500 font-mono">{s.ehcp_number}</span>}
            </div>
            <Row label="Category" value={s.send_category} />
            <Row label="Adaptations required in PE" value={s.adaptations_required_in_pe} />
            <Row label="SENDCo comment" value={s.sendco_comment} />
            {s.last_reviewed_date && (
              <div className="text-xs text-navy-500 flex items-center gap-1 pt-2">
                <CalendarCheck className="w-3 h-3" />Last reviewed {formatDate(s.last_reviewed_date)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }) {
  if (!value) return null
  return (
    <div>
      <div className="text-xs text-navy-500 uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-navy-200">{value}</div>
    </div>
  )
}
