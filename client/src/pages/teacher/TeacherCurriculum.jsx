import { useState } from 'react'
import { Target, BookOpen, GraduationCap, AlertCircle } from 'lucide-react'
import { KEY_STAGES } from '../../config/nationalCurriculumPE'

function StrandRow({ name, description }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-navy-800/50">
      <div className="w-2 h-2 rounded-full bg-pitch-400 mt-1.5 shrink-0" />
      <div>
        <div className="text-sm font-medium text-white">{name}</div>
        <div className="text-xs text-navy-400">{description}</div>
      </div>
    </div>
  )
}

function PathwayCard({ pathway }) {
  return (
    <div className="bg-navy-800/60 rounded-xl border border-navy-700 p-5">
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap className="w-4 h-4 text-amber-400" />
        <h4 className="text-sm font-semibold text-white">{pathway.label}</h4>
        <span className="text-xs text-navy-500 ml-auto">{pathway.examBoard}</span>
      </div>
      <div className="space-y-2">
        {pathway.components.map(c => (
          <div key={c.label} className="flex items-start gap-3 text-xs">
            <span className="px-2 py-0.5 bg-amber-400/20 text-amber-400 rounded font-medium shrink-0">{c.weight}</span>
            <div>
              <span className="text-white font-medium">{c.label}</span>
              <span className="text-navy-400 ml-1">{c.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TeacherCurriculum() {
  const [activeKS, setActiveKS] = useState('KS3')
  const ks = KEY_STAGES.find(k => k.id === activeKS) || KEY_STAGES[2]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Curriculum Overview</h1>
        <p className="text-navy-400 mt-1">National Curriculum PE areas and assessment strands</p>
      </div>

      {/* Key Stage tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {KEY_STAGES.map(k => (
          <button
            key={k.id}
            onClick={() => setActiveKS(k.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeKS === k.id
                ? 'bg-pitch-600/20 text-pitch-400'
                : 'bg-navy-800 text-navy-400 hover:text-white'
            }`}
          >
            {k.label} <span className="text-xs opacity-70">({k.yearRange})</span>
          </button>
        ))}
      </div>

      {/* Primary school notice */}
      {ks.primaryOnly && (
        <div className="flex items-start gap-3 bg-navy-800/60 border border-navy-700 rounded-xl p-4 mb-6">
          <AlertCircle className="w-4 h-4 text-navy-400 shrink-0 mt-0.5" />
          <p className="text-sm text-navy-400">
            <strong className="text-navy-300">{ks.label} covers a primary school phase.</strong> Your school may not teach these year groups.
            This content is provided as reference for curriculum context or feeder-school alignment.
          </p>
        </div>
      )}

      {/* KS description */}
      <p className="text-sm text-navy-400 mb-5">{ks.description}</p>

      {/* Activity areas grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {ks.activityAreas.map(area => (
          <div key={area.name} className="bg-navy-900 rounded-xl border border-navy-800 p-5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
              area.color === 'pitch' ? 'bg-pitch-600/20' : 'bg-amber-400/20'
            }`}>
              <BookOpen className={`w-5 h-5 ${area.color === 'pitch' ? 'text-pitch-400' : 'text-amber-400'}`} />
            </div>
            <h3 className="text-sm font-semibold text-white mb-2">{area.name}</h3>
            <div className="flex flex-wrap gap-1">
              {area.sports.map(sport => (
                <span key={sport} className="px-2 py-0.5 bg-navy-800 rounded text-xs text-navy-300">{sport}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Assessment strands */}
      <div className="bg-navy-900 rounded-xl border border-navy-800 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-pitch-400" />
          {ks.label} Assessment Strands
        </h2>
        <div className="space-y-3">
          {ks.strands.map(s => (
            <StrandRow key={s.name} name={s.name} description={s.description} />
          ))}
        </div>
      </div>

      {/* Examination pathways (KS4 / KS5) */}
      {ks.pathways && ks.pathways.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-amber-400" />
            Examination Pathways
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {ks.pathways.map(p => <PathwayCard key={p.id} pathway={p} />)}
          </div>
          <p className="text-xs text-navy-500 mt-3">
            Default exam board shown. Schools can configure their exam board in School Settings &rsaquo; Academic Structure.
            Per-school editing of activity areas and strands will be available in a future update.
          </p>
        </div>
      )}
    </div>
  )
}
