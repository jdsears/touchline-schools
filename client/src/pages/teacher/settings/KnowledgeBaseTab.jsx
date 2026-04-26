import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ExternalLink } from 'lucide-react'

export default function KnowledgeBaseTab() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary">Knowledge Base</h2>
        <p className="text-sm text-secondary mt-1">
          Department-wide coaching and teaching resources. Shared across all staff.
          The AI assistant uses these resources alongside loaded NGB frameworks.
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border-default p-6 text-center space-y-4">
        <BookOpen className="w-10 h-10 text-tertiary mx-auto" />
        <div>
          <p className="text-primary font-medium">Knowledge Base is managed per team</p>
          <p className="text-sm text-secondary mt-1">
            Add coaching guides, session plans, tactical documents, and NGB resources to each team's knowledge base from the Teams area.
          </p>
        </div>
        <Link
          to="/teacher/teams"
          className="inline-flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-700 text-on-dark rounded-lg text-sm transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Go to Teams
        </Link>
      </div>

      <div className="bg-subtle rounded-xl border border-border-default p-4">
        <h3 className="text-sm font-semibold text-primary mb-2">NGB Frameworks Auto-loaded</h3>
        <p className="text-xs text-secondary">
          The following frameworks are automatically loaded for your active sports: FA 4 Corner Model (football),
          RFU Age-Grade Player Development (rugby), ECB All Stars Activator (cricket), England Hockey FUNdamentals (hockey),
          England Netball GOLD (netball). Manage active sports in Sports Configuration.
        </p>
      </div>
    </div>
  )
}
