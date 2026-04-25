import ReactMarkdown from 'react-markdown'

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
            p: ({ children }) => <p className="text-navy-200 mb-2 last:mb-0 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-2 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-navy-200 leading-relaxed">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-pitch-400 hover:text-pitch-300 underline">
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
            h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-4 mb-3 first:mt-0">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-bold text-white mt-4 mb-2 first:mt-0">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-semibold text-white mt-3 mb-2 first:mt-0">{children}</h3>,
            p: ({ children }) => <p className="text-navy-200 mb-3 last:mb-0 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-3 space-y-1.5">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-3 space-y-1.5">{children}</ol>,
            li: ({ children }) => <li className="text-navy-200 leading-relaxed">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
            em: ({ children }) => <em className="italic text-pitch-300">{children}</em>,
            code: ({ children }) => <code className="bg-navy-700 px-1.5 py-0.5 rounded text-pitch-300 text-sm">{children}</code>,
            pre: ({ children }) => <pre className="bg-navy-900 p-3 rounded-lg mb-3 overflow-x-auto">{children}</pre>,
            blockquote: ({ children }) => <blockquote className="border-l-4 border-pitch-500 pl-4 my-3 italic text-navy-300">{children}</blockquote>,
            hr: () => <hr className="border-navy-700 my-4" />,
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
          h1: ({ children }) => <h1 className="text-xl font-display font-bold text-white mt-6 mb-3 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-display font-semibold text-white mt-8 mb-3 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-display font-semibold text-white mt-6 mb-2 first:mt-0">{children}</h3>,
          p: ({ children }) => {
            const text = String(children)
            const startsWithEmoji = /^[\u{1F300}-\u{1F9FF}]|^[⚽🎯📋🔑💪⭐🏆🔥]/u.test(text)
            if (startsWithEmoji) {
              return <p className="text-lg font-display font-bold text-white mt-6 mb-3 first:mt-0">{children}</p>
            }
            return <p className="text-base text-navy-200 mb-3 last:mb-0 leading-relaxed">{children}</p>
          },
          ul: ({ children }) => <ul className="list-disc list-outside ml-5 my-4 space-y-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-outside ml-5 my-4 space-y-2">{children}</ol>,
          li: ({ children }) => <li className="text-base text-navy-100 leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
          em: ({ children }) => <em className="italic text-pitch-300">{children}</em>,
          code: ({ children }) => <code className="bg-navy-800 px-1.5 py-0.5 rounded text-pitch-300 text-sm">{children}</code>,
          pre: ({ children }) => <pre className="bg-navy-900 p-4 rounded-lg my-4 overflow-x-auto font-mono text-sm text-navy-200">{children}</pre>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-pitch-500 pl-4 my-3 italic text-navy-300">{children}</blockquote>,
          hr: () => <hr className="border-navy-700 my-6" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
