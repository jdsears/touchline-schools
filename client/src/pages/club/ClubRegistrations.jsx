import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { clubService } from '../../services/api'
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ClubRegistrations() {
  const { club } = useOutletContext()
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    if (club?.id) loadRegistrations()
  }, [club?.id, statusFilter])

  async function loadRegistrations() {
    setLoading(true)
    try {
      const res = await clubService.getRegistrations(club.id, statusFilter)
      setRegistrations(res.data)
    } catch (err) {
      toast.error('Failed to load registrations')
    } finally {
      setLoading(false)
    }
  }

  async function handleReview(playerId, status) {
    try {
      await clubService.reviewRegistration(club.id, playerId, status)
      toast.success(status === 'registered' ? 'Registration approved' : 'Registration rejected')
      loadRegistrations()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update registration')
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Registrations</h1>
          <p className="text-navy-400 text-sm mt-1">Review and manage player registrations</p>
        </div>
        <div className="flex gap-2">
          {['pending', 'registered', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-pitch-600 text-white'
                  : 'bg-navy-800 text-navy-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="spinner w-8 h-8" />
        </div>
      ) : registrations.length === 0 ? (
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-8 text-center">
          <Clock className="w-12 h-12 text-navy-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">No {statusFilter} registrations</h3>
          <p className="text-navy-400 text-sm">
            {statusFilter === 'pending'
              ? 'New registrations will appear here for review.'
              : `No registrations with status "${statusFilter}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {registrations.map((reg) => (
            <div key={reg.id} className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === reg.id ? null : reg.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-navy-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-navy-800 flex items-center justify-center text-sm font-medium text-navy-300">
                    {reg.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{reg.name}</p>
                    <p className="text-xs text-navy-400">{reg.team_name} {reg.age_group ? `(${reg.age_group})` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-navy-400">
                    {reg.registration_date && new Date(reg.registration_date).toLocaleDateString('en-GB')}
                  </span>
                  {expandedId === reg.id ? <ChevronUp className="w-4 h-4 text-navy-400" /> : <ChevronDown className="w-4 h-4 text-navy-400" />}
                </div>
              </button>

              {expandedId === reg.id && (
                <div className="px-4 pb-4 pt-2 border-t border-navy-800 space-y-4">
                  {/* Player details */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    {reg.date_of_birth && (
                      <div>
                        <p className="text-xs text-navy-400">Date of Birth</p>
                        <p className="text-navy-200">{new Date(reg.date_of_birth).toLocaleDateString('en-GB')}</p>
                      </div>
                    )}
                    {reg.kit_size && (
                      <div>
                        <p className="text-xs text-navy-400">Kit Size</p>
                        <p className="text-navy-200">{reg.kit_size}</p>
                      </div>
                    )}
                    {reg.allergies && (
                      <div>
                        <p className="text-xs text-navy-400">Allergies</p>
                        <p className="text-navy-200">{reg.allergies}</p>
                      </div>
                    )}
                    {reg.medications && (
                      <div>
                        <p className="text-xs text-navy-400">Medications</p>
                        <p className="text-navy-200">{reg.medications}</p>
                      </div>
                    )}
                  </div>

                  {/* Medical alert */}
                  {(reg.allergies || reg.medications) && (
                    <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <p className="text-xs text-amber-400">This player has medical information that should be noted.</p>
                    </div>
                  )}

                  {/* Guardian info */}
                  {reg.guardians && reg.guardians.length > 0 && (
                    <div>
                      <p className="text-xs text-navy-400 mb-2">Guardian(s)</p>
                      {reg.guardians.map((g, i) => (
                        <div key={i} className="flex items-center gap-4 text-sm text-navy-300">
                          <span className="text-white">{g.name}</span>
                          <a href={`mailto:${g.email}`} className="hover:text-pitch-400">{g.email}</a>
                          {g.phone && <a href={`tel:${g.phone}`} className="hover:text-pitch-400">{g.phone}</a>}
                          <span className="text-xs text-navy-500 capitalize">({g.relationship})</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  {statusFilter === 'pending' && (
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleReview(reg.id, 'registered')}
                        className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(reg.id, 'rejected')}
                        className="flex items-center gap-2 px-4 py-2 bg-navy-800 hover:bg-alert-600 text-navy-300 hover:text-white rounded-lg text-sm transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
