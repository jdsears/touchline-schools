import { useState, useEffect } from 'react'
import api from '../services/api'
import { Building2, Check, Pause, XCircle, Clock, Users, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-pitch-600/20 text-pitch-400', icon: Check },
  trial: { label: 'Trial', color: 'bg-amber-400/20 text-amber-400', icon: Clock },
  suspended: { label: 'Suspended', color: 'bg-alert-600/20 text-alert-400', icon: Pause },
  cancelled: { label: 'Cancelled', color: 'bg-navy-700 text-navy-400', icon: XCircle },
}

export default function EnterpriseBilling() {
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/enterprise-billing/schools')
      .then(res => setSchools(res.data))
      .catch(err => console.error('Failed to load schools:', err))
      .finally(() => setLoading(false))
  }, [])

  async function updateStatus(schoolId, newStatus) {
    try {
      await api.put(`/enterprise-billing/schools/${schoolId}/status`, {
        subscription_status: newStatus,
      })
      setSchools(prev => prev.map(s =>
        s.id === schoolId ? { ...s, subscription_status: newStatus } : s
      ))
      toast.success(`School status updated to ${newStatus}`)
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="spinner w-8 h-8" /></div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Enterprise Billing</h1>
        <p className="text-navy-400 mt-1">Manage school subscription statuses (MoonBoots Sports staff only)</p>
      </div>

      {schools.length > 0 ? (
        <div className="space-y-4">
          {schools.map(school => {
            const status = STATUS_CONFIG[school.subscription_status] || STATUS_CONFIG.active
            const StatusIcon = status.icon
            return (
              <div key={school.id} className="bg-navy-900 rounded-xl border border-navy-800 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-navy-800 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-navy-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">{school.name}</h3>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-navy-400">
                        <span className="capitalize">{school.school_type}</span>
                        <span>{school.member_count} staff</span>
                        <span>{school.pupil_count} pupils</span>
                        <span>{school.team_count} teams</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${status.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {status.label}
                    </span>
                    <select
                      value={school.subscription_status || 'active'}
                      onChange={e => updateStatus(school.id, e.target.value)}
                      className="px-3 py-1.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-xs focus:outline-none focus:border-pitch-500"
                    >
                      <option value="active">Active</option>
                      <option value="trial">Trial</option>
                      <option value="suspended">Suspended</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
          <Building2 className="w-8 h-8 text-navy-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No schools yet</h3>
          <p className="text-navy-400 text-sm">Schools will appear here once they complete onboarding.</p>
        </div>
      )}
    </div>
  )
}
