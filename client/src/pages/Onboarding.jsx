import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onboardingService } from '../services/api'
import {
  Building2, Users, Upload, Shield, Check, ChevronRight,
  ChevronLeft, GraduationCap, Plus, X, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'

const STEPS = [
  { id: 'school', label: 'School Details', icon: Building2 },
  { id: 'teachers', label: 'Invite Teachers', icon: Users },
  { id: 'pupils', label: 'Import Pupils', icon: Upload },
  { id: 'teams', label: 'First Team', icon: Shield },
]

const SCHOOL_TYPES = [
  { value: 'state', label: 'State School' },
  { value: 'academy', label: 'Academy' },
  { value: 'independent', label: 'Independent' },
  { value: 'grammar', label: 'Grammar School' },
  { value: 'primary', label: 'Primary School' },
  { value: 'prep', label: 'Prep School' },
  { value: 'all_through', label: 'All-Through School' },
  { value: 'middle', label: 'Middle School' },
]

const SPORTS = [
  { value: 'football', label: 'Football', icon: '\u26BD' },
  { value: 'rugby', label: 'Rugby', icon: '\uD83C\uDFC9' },
  { value: 'cricket', label: 'Cricket', icon: '\uD83C\uDFCF' },
  { value: 'hockey', label: 'Hockey', icon: '\uD83C\uDFD1' },
  { value: 'netball', label: 'Netball', icon: '\uD83E\uDD3E' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [schoolId, setSchoolId] = useState(null)

  // School form
  const [school, setSchool] = useState({
    name: '', school_type: 'state', urn: '',
    contact_email: '', contact_phone: '',
    address_line1: '', city: '', county: '', postcode: '',
    primary_color: '#1a365d', secondary_color: '#2ED573',
  })

  // Teachers form
  const [teachers, setTeachers] = useState([{ name: '', email: '', role: 'coach' }])

  // CSV import
  const [csvFile, setCsvFile] = useState(null)
  const [importResult, setImportResult] = useState(null)

  // Team form
  const [team, setTeam] = useState({ name: '', sport: 'football', age_group: 'U13', gender: 'mixed' })

  async function handleCreateSchool() {
    if (!school.name.trim()) {
      toast.error('School name is required')
      return
    }
    setSaving(true)
    try {
      const res = await onboardingService.createSchool(school)
      setSchoolId(res.data.id)
      toast.success('School created')
      setStep(1)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create school')
    } finally {
      setSaving(false)
    }
  }

  async function handleInviteTeachers() {
    const validTeachers = teachers.filter(t => t.email.trim())
    if (validTeachers.length === 0) {
      setStep(2) // Skip if no teachers
      return
    }
    setSaving(true)
    try {
      await onboardingService.inviteTeachers(schoolId, validTeachers)
      toast.success(`${validTeachers.length} teacher${validTeachers.length > 1 ? 's' : ''} invited`)
      setStep(2)
    } catch (err) {
      toast.error('Failed to invite teachers')
    } finally {
      setSaving(false)
    }
  }

  async function handleImportPupils() {
    if (!csvFile) {
      setStep(3) // Skip if no file
      return
    }
    setSaving(true)
    try {
      const res = await onboardingService.importPupilsCSV(schoolId, csvFile)
      setImportResult(res.data)
      toast.success(`${res.data.created} pupils imported`)
      setStep(3)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to import pupils')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateTeam() {
    if (!team.name.trim()) {
      handleFinish() // Skip if no team name
      return
    }
    setSaving(true)
    try {
      await onboardingService.createTeam({ ...team, school_id: schoolId })
      toast.success('Team created')
      handleFinish()
    } catch (err) {
      toast.error('Failed to create team')
      setSaving(false)
    }
  }

  function handleFinish() {
    toast.success('Onboarding complete!')
    navigate('/teacher')
  }

  function addTeacherRow() {
    setTeachers([...teachers, { name: '', email: '', role: 'coach' }])
  }

  function removeTeacherRow(index) {
    setTeachers(teachers.filter((_, i) => i !== index))
  }

  function updateTeacher(index, field, value) {
    const updated = [...teachers]
    updated[index] = { ...updated[index], [field]: value }
    setTeachers(updated)
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-colors
                ${i < step ? 'bg-pitch-600 text-white' :
                  i === step ? 'bg-pitch-600/20 text-pitch-400 ring-2 ring-pitch-600' :
                  'bg-subtle text-tertiary'}
              `}>
                {i < step ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${i < step ? 'bg-pitch-600' : 'bg-subtle'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border-default p-8">
          {/* Step 1: School Details */}
          {step === 0 && (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">Set up your school</h1>
              <p className="text-secondary mb-6">Tell us about your school to get started.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-secondary mb-1">School Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Langley Prep School"
                    value={school.name}
                    onChange={e => setSchool({ ...school, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-white text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-secondary mb-1">School Type</label>
                    <select
                      value={school.school_type}
                      onChange={e => setSchool({ ...school, school_type: e.target.value })}
                      className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-white text-sm focus:outline-none focus:border-pitch-500"
                    >
                      {SCHOOL_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-1">URN (optional)</label>
                    <input
                      type="text"
                      placeholder="Unique Reference Number"
                      value={school.urn}
                      onChange={e => setSchool({ ...school, urn: e.target.value })}
                      className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-white text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-secondary mb-1">Contact Email</label>
                    <input
                      type="email"
                      placeholder="pe@school.ac.uk"
                      value={school.contact_email}
                      onChange={e => setSchool({ ...school, contact_email: e.target.value })}
                      className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-white text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-1">Phone (optional)</label>
                    <input
                      type="tel"
                      value={school.contact_phone}
                      onChange={e => setSchool({ ...school, contact_phone: e.target.value })}
                      className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-white text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-secondary mb-1">Address</label>
                  <input
                    type="text"
                    placeholder="Street address"
                    value={school.address_line1}
                    onChange={e => setSchool({ ...school, address_line1: e.target.value })}
                    className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-white text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <input type="text" placeholder="City" value={school.city}
                    onChange={e => setSchool({ ...school, city: e.target.value })}
                    className="px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-white text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500" />
                  <input type="text" placeholder="County" value={school.county}
                    onChange={e => setSchool({ ...school, county: e.target.value })}
                    className="px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-white text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500" />
                  <input type="text" placeholder="Postcode" value={school.postcode}
                    onChange={e => setSchool({ ...school, postcode: e.target.value })}
                    className="px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-white text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500" />
                </div>

                {/* School colours */}
                <div>
                  <label className="block text-sm text-secondary mb-2">School Colours</label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input type="color" value={school.primary_color}
                        onChange={e => setSchool({ ...school, primary_color: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border-0" />
                      <span className="text-xs text-secondary">Primary</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="color" value={school.secondary_color}
                        onChange={e => setSchool({ ...school, secondary_color: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border-0" />
                      <span className="text-xs text-secondary">Secondary</span>
                    </div>
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center border border-border-strong"
                      style={{ background: `linear-gradient(135deg, ${school.primary_color}, ${school.secondary_color})` }}>
                      <GraduationCap className="w-6 h-6 text-white drop-shadow" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleCreateSchool}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* Step 2: Invite Teachers */}
          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">Invite your teachers</h1>
              <p className="text-secondary mb-6">Add PE staff and sports coaches. You can always add more later.</p>

              <div className="space-y-3 mb-4">
                {teachers.map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Name"
                      value={t.name}
                      onChange={e => updateTeacher(i, 'name', e.target.value)}
                      className="flex-1 px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-white text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={t.email}
                      onChange={e => updateTeacher(i, 'email', e.target.value)}
                      className="flex-1 px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-white text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500"
                    />
                    <select
                      value={t.role}
                      onChange={e => updateTeacher(i, 'role', e.target.value)}
                      className="w-32 px-2 py-2.5 bg-subtle border border-border-strong rounded-lg text-white text-sm focus:outline-none focus:border-pitch-500"
                    >
                      <option value="admin">Head of PE</option>
                      <option value="coach">Teacher</option>
                    </select>
                    {teachers.length > 1 && (
                      <button onClick={() => removeTeacherRow(i)} className="p-1.5 text-tertiary hover:text-alert-400">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addTeacherRow} className="flex items-center gap-1.5 text-sm text-pitch-400 hover:text-pitch-300 mb-8">
                <Plus className="w-4 h-4" />
                Add another teacher
              </button>

              <div className="flex justify-between">
                <button onClick={() => setStep(0)} className="flex items-center gap-2 px-4 py-2.5 text-secondary hover:text-white transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="px-4 py-2.5 text-secondary hover:text-white text-sm transition-colors">
                    Skip for now
                  </button>
                  <button
                    onClick={handleInviteTeachers}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Invite & Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Import Pupils */}
          {step === 2 && (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">Import your pupils</h1>
              <p className="text-secondary mb-6">Upload a CSV file from your MIS or spreadsheet. You can always add more later.</p>

              <div className="bg-subtle rounded-xl border border-border-strong p-6 mb-6">
                <h3 className="text-sm font-semibold text-white mb-3">CSV Format</h3>
                <p className="text-xs text-secondary mb-3">
                  Your CSV should have columns for pupil names. Year group and house are optional but recommended.
                  We accept flexible header names.
                </p>
                <div className="bg-page rounded-lg p-3 font-mono text-xs text-secondary overflow-x-auto">
                  first_name,last_name,year_group,house<br />
                  James,Wilson,7,Tudor<br />
                  Sophie,Chen,7,Stuart<br />
                  Oliver,Patel,8,Windsor<br />
                  Emma,Jones,9,Tudor
                </div>
              </div>

              <div className="mb-6">
                <label className="block w-full cursor-pointer">
                  <div className={`
                    border-2 border-dashed rounded-xl p-8 text-center transition-colors
                    ${csvFile ? 'border-pitch-600 bg-pitch-600/10' : 'border-border-strong hover:border-navy-500'}
                  `}>
                    {csvFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <Check className="w-6 h-6 text-pitch-400" />
                        <div>
                          <p className="text-sm font-medium text-white">{csvFile.name}</p>
                          <p className="text-xs text-secondary">{(csvFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          onClick={e => { e.preventDefault(); setCsvFile(null); setImportResult(null) }}
                          className="ml-2 p-1 text-secondary hover:text-alert-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-tertiary mx-auto mb-2" />
                        <p className="text-sm text-secondary">Click to upload CSV file</p>
                        <p className="text-xs text-tertiary mt-1">or drag and drop</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={e => {
                      setCsvFile(e.target.files[0] || null)
                      setImportResult(null)
                    }}
                  />
                </label>
              </div>

              {importResult && (
                <div className="bg-pitch-600/10 border border-pitch-600/30 rounded-lg p-4 mb-6">
                  <p className="text-sm text-pitch-400 font-medium">
                    Import complete: {importResult.created} pupils created
                    {importResult.skipped > 0 && `, ${importResult.skipped} skipped`}
                  </p>
                </div>
              )}

              <div className="flex justify-between">
                <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2.5 text-secondary hover:text-white transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <div className="flex gap-3">
                  <button onClick={() => setStep(3)} className="px-4 py-2.5 text-secondary hover:text-white text-sm transition-colors">
                    Skip for now
                  </button>
                  <button
                    onClick={handleImportPupils}
                    disabled={saving || !csvFile}
                    className="flex items-center gap-2 px-6 py-3 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Import & Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Step 4: First Team */}
          {step === 3 && (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">Create your first team</h1>
              <p className="text-secondary mb-6">Set up an extra-curricular sports team. You can add more from the Teacher Hub.</p>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm text-secondary mb-1">Team Name</label>
                  <input
                    type="text"
                    placeholder="e.g., U13 Boys Football"
                    value={team.name}
                    onChange={e => setTeam({ ...team, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-white text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-secondary mb-2">Sport</label>
                  <div className="flex flex-wrap gap-2">
                    {SPORTS.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setTeam({ ...team, sport: s.value })}
                        className={`
                          flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-colors
                          ${team.sport === s.value
                            ? 'bg-pitch-600/20 text-pitch-400 ring-1 ring-pitch-600'
                            : 'bg-subtle text-secondary hover:text-white'}
                        `}
                      >
                        <span className="text-lg">{s.icon}</span>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-secondary mb-1">Age Group</label>
                    <input
                      type="text"
                      placeholder="e.g., U13, 1st XI"
                      value={team.age_group}
                      onChange={e => setTeam({ ...team, age_group: e.target.value })}
                      className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-white text-sm placeholder:text-tertiary focus:outline-none focus:border-pitch-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-1">Gender</label>
                    <select
                      value={team.gender}
                      onChange={e => setTeam({ ...team, gender: e.target.value })}
                      className="w-full px-3 py-2.5 bg-subtle border border-border-strong rounded-lg text-white text-sm focus:outline-none focus:border-pitch-500"
                    >
                      <option value="boys">Boys</option>
                      <option value="girls">Girls</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep(2)} className="flex items-center gap-2 px-4 py-2.5 text-secondary hover:text-white transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <div className="flex gap-3">
                  <button onClick={handleFinish} className="px-4 py-2.5 text-secondary hover:text-white text-sm transition-colors">
                    Skip for now
                  </button>
                  <button
                    onClick={handleCreateTeam}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-pitch-600 hover:bg-pitch-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Create Team & Finish
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Step indicator text */}
        <p className="text-center text-xs text-tertiary mt-4">
          Step {step + 1} of {STEPS.length}: {STEPS[step].label}
        </p>
      </div>
    </div>
  )
}
