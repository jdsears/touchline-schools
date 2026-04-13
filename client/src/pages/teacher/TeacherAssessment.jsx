import { ClipboardCheck, Filter } from 'lucide-react'

export default function TeacherAssessment() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Assessment & Marking</h1>
          <p className="text-navy-400 mt-1">Assess pupils against curriculum strands and criteria</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 bg-navy-800 hover:bg-navy-700 text-navy-300 rounded-lg transition-colors text-sm">
          <Filter className="w-4 h-4" />
          <span>Filter</span>
        </button>
      </div>

      {/* Assessment workflow description */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StepCard
          number="1"
          title="Select a class and unit"
          description="Choose the teaching group and current sport unit you want to assess."
        />
        <StepCard
          number="2"
          title="Mark against criteria"
          description="Assess each pupil against curriculum strands: Physical Competence, Tactics, Health & Fitness, Evaluation."
        />
        <StepCard
          number="3"
          title="Track progress"
          description="View pupil progress across the year. Compare attainment against expected levels."
        />
      </div>

      <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
          <ClipboardCheck className="w-8 h-8 text-navy-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No assessments recorded yet</h3>
        <p className="text-navy-400 text-sm max-w-md mx-auto">
          Once you have teaching groups with sport units, you can start recording formative
          and summative assessments for each pupil.
        </p>
      </div>
    </div>
  )
}

function StepCard({ number, title, description }) {
  return (
    <div className="bg-navy-900 rounded-xl border border-navy-800 p-5">
      <div className="w-8 h-8 rounded-full bg-pitch-600/20 text-pitch-400 flex items-center justify-center text-sm font-bold mb-3">
        {number}
      </div>
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
      <p className="text-xs text-navy-400">{description}</p>
    </div>
  )
}
