import { Sparkles } from 'lucide-react'

export default function PupilAssistantPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
        <p className="text-secondary mt-1">Get help with your training, technique, and development</p>
      </div>

      <div className="bg-navy-900 rounded-xl border border-border-strong p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-secondary" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">AI coaching assistant</h3>
        <p className="text-secondary text-sm max-w-md mx-auto">
          Ask questions about your sports, get tips on improving your technique,
          and understand your assessment feedback. The assistant knows which sports you play
          and gives advice appropriate for your level.
        </p>
        <p className="text-secondary text-xs mt-4">
          All conversations are visible to your teachers for safeguarding purposes.
        </p>
      </div>
    </div>
  )
}
