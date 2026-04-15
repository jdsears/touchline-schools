import { Sparkles } from 'lucide-react'

export default function PupilAssistantPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
        <p className="text-navy-400 mt-1">Get help with your training, technique, and development</p>
      </div>

      <div className="bg-navy-900 rounded-xl border border-navy-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-navy-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">AI coaching assistant</h3>
        <p className="text-navy-400 text-sm max-w-md mx-auto">
          Ask questions about your sports, get tips on improving your technique,
          and understand your assessment feedback. The assistant knows which sports you play
          and gives advice appropriate for your level.
        </p>
        <p className="text-navy-500 text-xs mt-4">
          All conversations are visible to your teachers for safeguarding purposes.
        </p>
      </div>
    </div>
  )
}
