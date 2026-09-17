import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { hodService } from '../../services/api'
import { Lock, Loader2 } from 'lucide-react'
import SchoolSafeguardingIncidents from '../school/SchoolSafeguardingIncidents'

// The incident log lives in the school-admin area, whose layout and sidebar
// belong to the legacy club product. Staff reach it from the teacher hub,
// the dashboard queue and the School Overview, so this mounts the same page
// inside the teacher layout with the school resolved from the HoD check.
export default function TeacherSafeguardingIncidents() {
  const [state, setState] = useState({ loading: true, school: null, role: null, canManage: false })

  useEffect(() => {
    hodService.check()
      .then(res => {
        const d = res.data || {}
        setState({
          loading: false,
          school: d.school_id ? { id: d.school_id, name: d.school_name, slug: d.school_slug } : null,
          role: d.role || null,
          canManage: !!d.isHoD,
        })
      })
      .catch(() => setState({ loading: false, school: null, role: null, canManage: false }))
  }, [])

  if (state.loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-secondary" /></div>
  }

  if (!state.school) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-card border border-border-default rounded-xl p-8 text-center">
          <Lock className="w-10 h-10 text-tertiary mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-primary mb-1">No school linked to your account</h2>
          <p className="text-sm text-secondary mb-4">Incident records belong to a school. Ask your school administrator to add you as a member.</p>
          <Link to="/teacher/safeguarding" className="text-sm font-semibold text-brand-primary">Back to safeguarding</Link>
        </div>
      </div>
    )
  }

  return (
    <SchoolSafeguardingIncidents
      school={state.school}
      myRole={state.role}
      canManageOverride={state.canManage}
      basePath="/teacher/safeguarding"
    />
  )
}
