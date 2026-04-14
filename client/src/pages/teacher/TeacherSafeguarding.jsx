import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { hodService } from '../../services/api'
import {
  ShieldCheck, AlertTriangle, Users, FileCheck, Clock,
  ChevronRight, Shield, UserCheck, Bell,
} from 'lucide-react'

export default function TeacherSafeguarding() {
  const [isHoD, setIsHoD] = useState(false)
  const [schoolSlug, setSchoolSlug] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hodService.check()
      .then(res => {
        setIsHoD(res.data.isHoD)
        if (res.data.school_id) {
          // We need the slug to link to school safeguarding pages
          setSchoolSlug(res.data.school_slug || null)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="spinner w-8 h-8" /></div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-pitch-400" />
          Safeguarding
        </h1>
        <p className="text-navy-400 mt-1">Safeguarding, compliance, and incident management</p>
      </div>

      {/* Key principles banner */}
      <div className="bg-navy-900 rounded-xl border border-amber-400/30 p-5 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-400 mb-1">Safeguarding is everyone's responsibility</h3>
            <p className="text-xs text-navy-300">
              If you have a concern about a pupil, report it immediately to your Designated Safeguarding Lead.
              If a child is in immediate danger, contact the police (999) or local authority children's services.
              All safeguarding activity on this platform is logged and auditable.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* Quick action cards */}
        <ActionCard
          icon={AlertTriangle}
          title="Report a Concern"
          description="Log a safeguarding concern or incident. This will be visible to the DSL and recorded in the audit trail."
          buttonLabel="Report Concern"
          color="alert"
          href={schoolSlug ? `/school/${schoolSlug}/safeguarding/incidents` : '#'}
        />
        <ActionCard
          icon={UserCheck}
          title="My Compliance"
          description="Check your DBS status, first aid certification, safeguarding training, and coaching qualifications."
          buttonLabel="View My Records"
          color="pitch"
          href={schoolSlug ? `/school/${schoolSlug}/safeguarding/people` : '#'}
        />
        <ActionCard
          icon={Shield}
          title="Safeguarding Contacts"
          description="View the Designated Safeguarding Lead, deputy DSL, and welfare officers for your school."
          buttonLabel="View Contacts"
          color="amber"
          href={schoolSlug ? `/school/${schoolSlug}/safeguarding/roles` : '#'}
        />
      </div>

      {/* HoD-only section */}
      {isHoD && (
        <>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            DSL / Head of Department
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <DashboardCard
              icon={FileCheck}
              title="Compliance Overview"
              description="DBS checks, first aid certs, safeguarding training status across all staff."
              href={schoolSlug ? `/school/${schoolSlug}/safeguarding` : '#'}
            />
            <DashboardCard
              icon={Bell}
              title="Compliance Alerts"
              description="Expiring DBS checks, overdue training, missing qualifications."
              href={schoolSlug ? `/school/${schoolSlug}/safeguarding` : '#'}
            />
            <DashboardCard
              icon={AlertTriangle}
              title="Incident Log"
              description="All reported safeguarding concerns and incidents with status tracking."
              href={schoolSlug ? `/school/${schoolSlug}/safeguarding/incidents` : '#'}
            />
            <DashboardCard
              icon={Users}
              title="Safeguarding Roles"
              description="Assign DSL, deputy DSL, welfare officers, and other safeguarding roles."
              href={schoolSlug ? `/school/${schoolSlug}/safeguarding/roles` : '#'}
            />
          </div>
        </>
      )}

      {/* Key policies */}
      <div className="bg-navy-900 rounded-xl border border-navy-800 p-6">
        <h2 className="text-base font-semibold text-white mb-4">Key Safeguarding Principles</h2>
        <div className="space-y-3">
          <PolicyRow title="All teacher-pupil interactions are logged" description="Messages, feedback, video comments, and assessment notes are visible to the DSL for audit purposes." />
          <PolicyRow title="Incident reporting is confidential" description="Only the DSL and designated personnel can access full incident details. Access is logged." />
          <PolicyRow title="Data is handled in line with GDPR" description="Pupil data is only accessible to authorised staff. Full data export and deletion available on request." />
          <PolicyRow title="AI conversations are visible to teachers" description="All AI assistant conversations with pupils are logged and visible to their teachers and the DSL." />
        </div>
      </div>
    </div>
  )
}

function ActionCard({ icon: Icon, title, description, buttonLabel, color, href }) {
  const colors = {
    alert: 'bg-alert-600/20 text-alert-400',
    pitch: 'bg-pitch-600/20 text-pitch-400',
    amber: 'bg-amber-400/20 text-amber-400',
  }
  return (
    <div className="bg-navy-900 rounded-xl border border-navy-800 p-5 flex flex-col">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
      <p className="text-xs text-navy-400 flex-1 mb-4">{description}</p>
      <Link
        to={href}
        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
          color === 'alert' ? 'text-alert-400 hover:text-alert-300' : 'text-pitch-400 hover:text-pitch-300'
        } transition-colors`}
      >
        {buttonLabel} <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}

function DashboardCard({ icon: Icon, title, description, href }) {
  return (
    <Link to={href} className="bg-navy-800/50 rounded-xl border border-navy-700/50 p-5 hover:border-navy-600 transition-colors flex items-start gap-4">
      <Icon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <div>
        <h3 className="text-sm font-medium text-white">{title}</h3>
        <p className="text-xs text-navy-400 mt-0.5">{description}</p>
      </div>
    </Link>
  )
}

function PolicyRow({ title, description }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-navy-800/50">
      <div className="w-2 h-2 rounded-full bg-pitch-400 mt-1.5 shrink-0" />
      <div>
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="text-xs text-navy-400">{description}</div>
      </div>
    </div>
  )
}
