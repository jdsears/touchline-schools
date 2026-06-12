import ReactMarkdown from 'react-markdown'
import { useRef } from 'react'
import { Printer } from 'lucide-react'
import DrillDiagram from './DrillDiagram'
import { printElement } from '../lib/printUtils'

// Fenced ```diagram blocks carry drill-setup JSON (same schema as training
// plans). While streaming, the JSON is incomplete - show a sketch note.
function DiagramBlock({ source }) {
  const ref = useRef(null)
  let diagram = null
  try {
    diagram = JSON.parse(source)
  } catch {
    return (
      <div className="my-3 rounded-xl border border-dashed border-border-strong bg-subtle px-4 py-3 text-sm text-tertiary">
        Sketching diagram…
      </div>
    )
  }
  if (!diagram || !Array.isArray(diagram.pupils)) return null
  return (
    <div ref={ref} className="my-3 rounded-xl border border-border-default bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-primary">{diagram.title || 'Drill setup'}</p>
        <button
          type="button"
          onClick={() => printElement(ref.current, diagram.title || 'Drill diagram')}
          className="flex items-center gap-1.5 rounded-lg border border-border-default px-2.5 py-1 text-xs font-medium text-secondary transition-colors hover:bg-subtle hover:text-primary print:hidden"
        >
          <Printer className="h-3.5 w-3.5" /> Print
        </button>
      </div>
      <DrillDiagram diagram={diagram} />
    </div>
  )
}

function renderCode({ className, children }) {
  const text = String(children ?? '')
  if (/language-diagram/.test(className || '')) {
    return <DiagramBlock source={text} />
  }
  return <code className="bg-subtle px-1.5 py-0.5 rounded text-brand-primary text-sm">{children}</code>
}


/**
 * Shared component for rendering AI-generated markdown content.
 * Use variant="content" for full-page AI content (IDP, reports, prep notes, analysis).
 * Use variant="chat" for chat bubble messages.
 * Use variant="chat-sm" for smaller chat widgets (help, landing).
 */
export default function AIMarkdown({ children, variant = 'content' }) {
  if (!children) return null

  if (variant === 'chat-sm') {
    return (
      <div className="prose prose-sm prose-invert max-w-none">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="text-primary mb-2 last:mb-0 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-2 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-primary leading-relaxed">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:text-brand-primary underline">
                {children}
              </a>
            ),
          }}
        >
          {children}
        </ReactMarkdown>
      </div>
    )
  }

  if (variant === 'chat') {
    return (
      <div className="chat-markdown">
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h1 className="text-xl font-bold text-primary mt-4 mb-3 first:mt-0">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-bold text-primary mt-4 mb-2 first:mt-0">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-semibold text-primary mt-3 mb-2 first:mt-0">{children}</h3>,
            p: ({ children }) => <p className="text-primary mb-3 last:mb-0 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-3 space-y-1.5">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-3 space-y-1.5">{children}</ol>,
            li: ({ children }) => <li className="text-primary leading-relaxed">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
            em: ({ children }) => <em className="italic text-brand-primary">{children}</em>,
            code: renderCode,
            pre: ({ children }) => <pre className="bg-card p-3 rounded-lg mb-3 overflow-x-auto">{children}</pre>,
            blockquote: ({ children }) => <blockquote className="border-l-4 border-brand-primary pl-4 my-3 italic text-secondary">{children}</blockquote>,
            hr: () => <hr className="border-border-strong my-4" />,
          }}
        >
          {children}
        </ReactMarkdown>
      </div>
    )
  }

  // variant === 'content' - full AI content blocks (IDP, reports, prep notes, analysis, training plans)
  return (
    <div className="ai-content">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="text-xl font-display font-bold text-primary mt-6 mb-3 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-display font-semibold text-primary mt-8 mb-3 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-display font-semibold text-primary mt-6 mb-2 first:mt-0">{children}</h3>,
          p: ({ children }) => {
            const text = String(children)
            const startsWithEmoji = /^[\u{1F300}-\u{1F9FF}]|^[⚽🎯📋🔑💪⭐🏆🔥]/u.test(text)
            if (startsWithEmoji) {
              return <p className="text-lg font-display font-bold text-primary mt-6 mb-3 first:mt-0">{children}</p>
            }
            return <p className="text-base text-primary mb-3 last:mb-0 leading-relaxed">{children}</p>
          },
          ul: ({ children }) => <ul className="list-disc list-outside ml-5 my-4 space-y-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-outside ml-5 my-4 space-y-2">{children}</ol>,
          li: ({ children }) => <li className="text-base text-primary leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
          em: ({ children }) => <em className="italic text-brand-primary">{children}</em>,
          code: renderCode,
          pre: ({ children }) => <pre className="bg-card p-4 rounded-lg my-4 overflow-x-auto font-mono text-sm text-primary">{children}</pre>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-brand-primary pl-4 my-3 italic text-secondary">{children}</blockquote>,
          hr: () => <hr className="border-border-strong my-6" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
