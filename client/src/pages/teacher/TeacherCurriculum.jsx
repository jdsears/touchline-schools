import { Target, BookOpen } from 'lucide-react'

const curriculumAreas = [
  { name: 'Invasion Games', sports: ['Football', 'Rugby', 'Hockey', 'Netball', 'Basketball', 'Handball'], color: 'pitch' },
  { name: 'Net/Wall Games', sports: ['Badminton', 'Tennis', 'Table Tennis'], color: 'amber' },
  { name: 'Striking & Fielding', sports: ['Cricket', 'Rounders'], color: 'pitch' },
  { name: 'Athletics', sports: ['Track', 'Field', 'Cross Country'], color: 'amber' },
  { name: 'Gymnastics', sports: ['Floor', 'Apparatus'], color: 'pitch' },
  { name: 'Dance', sports: ['Creative', 'Cultural', 'Performance'], color: 'amber' },
  { name: 'Swimming', sports: ['Stroke Development', 'Water Safety'], color: 'pitch' },
  { name: 'Outdoor & Adventurous', sports: ['Orienteering', 'Climbing', 'Team Challenges'], color: 'amber' },
]

export default function TeacherCurriculum() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Curriculum Overview</h1>
        <p className="text-navy-400 mt-1">National Curriculum PE areas and assessment strands</p>
      </div>

      {/* Key Stage tabs */}
      <div className="flex gap-2 mb-6">
        <button className="px-4 py-2 rounded-lg bg-pitch-600/20 text-pitch-400 text-sm font-medium">
          KS3 (Years 7-9)
        </button>
        <button className="px-4 py-2 rounded-lg bg-navy-800 text-navy-400 hover:text-white text-sm font-medium transition-colors">
          KS4 / GCSE (Years 10-11)
        </button>
        <button className="px-4 py-2 rounded-lg bg-navy-800 text-navy-400 hover:text-white text-sm font-medium transition-colors">
          KS5 / A-Level (Years 12-13)
        </button>
      </div>

      {/* Curriculum areas grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {curriculumAreas.map(area => (
          <div key={area.name} className="bg-navy-900 rounded-xl border border-navy-800 p-5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
              area.color === 'pitch' ? 'bg-pitch-600/20' : 'bg-amber-400/20'
            }`}>
              <BookOpen className={`w-5 h-5 ${
                area.color === 'pitch' ? 'text-pitch-400' : 'text-amber-400'
              }`} />
            </div>
            <h3 className="text-sm font-semibold text-white mb-2">{area.name}</h3>
            <div className="flex flex-wrap gap-1">
              {area.sports.map(sport => (
                <span key={sport} className="px-2 py-0.5 bg-navy-800 rounded text-xs text-navy-300">
                  {sport}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Assessment strands */}
      <div className="bg-navy-900 rounded-xl border border-navy-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-pitch-400" />
          KS3 Assessment Strands
        </h2>
        <div className="space-y-3">
          <StrandRow name="Physical Competence" description="Develop competence to excel in a broad range of physical activities" />
          <StrandRow name="Rules, Strategies and Tactics" description="Apply rules, strategies and tactics across different sports and activities" />
          <StrandRow name="Health and Fitness" description="Understand how to lead a healthy, active lifestyle and improve fitness" />
          <StrandRow name="Evaluation and Improvement" description="Analyse performance, identify strengths and areas for development" />
        </div>
      </div>
    </div>
  )
}

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
