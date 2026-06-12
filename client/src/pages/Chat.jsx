import { useState, useRef, useEffect } from 'react'
import { printElement } from '../lib/printUtils'
import { ASSISTANT_NAME } from '../lib/assistant'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTeam } from '../context/TeamContext'
import { chatService } from '../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import AIMarkdown from '../components/AIMarkdown'
import { Printer } from 'lucide-react'
import {
  Send,
  Sparkles,
  User,
  Loader2,
  GraduationCap,
  Calendar,
  Users,
  Trophy,
  Lightbulb,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

const suggestedPrompts = [
  {
    icon: GraduationCap,
    category: 'Curriculum PE',
    prompts: [
      'Plan a Year 7 athletics unit for a mixed-ability group',
      'Write report comments for a pupil who excels in teamwork but struggles with technique',
      'What should a Key Stage 3 gymnastics assessment cover?',
    ],
  },
  {
    icon: Calendar,
    category: 'Sessions',
    prompts: [
      'Design a 60-minute rugby session for Year 8 beginners, RFU-aligned',
      'Give me 3 hockey drills that develop close control for Year 5',
      'Plan a cricket net session that follows ECB bowling directives for U11s',
    ],
  },
  {
    icon: Users,
    category: 'Pupils',
    prompts: [
      'How do I develop a pupil who is technically good but lacks confidence?',
      'Write development goals for a Year 9 netball player moving to centre',
      'How should I adapt PE assessment for a pupil with SEND needs?',
    ],
  },
  {
    icon: Trophy,
    category: 'Fixtures',
    prompts: [
      'Write a pre-match team talk for a school cup semi-final',
      'How do I manage squad rotation fairly across a football fixture block?',
      'What should I cover in a post-match debrief with Year 10?',
    ],
  },
]

export default function Chat() {
  const { user } = useAuth()
  const { team, pupils, upcomingMatches } = useTeam()
  // Chat scope: whole-department by default; optionally pinned to a team.
  // Department scope sends no team context, so answers stay multi-sport.
  const [scope, setScope] = useState('department')
  const [searchParams] = useSearchParams()

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [showSuggestions, setShowSuggestions] = useState(true)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Load chat history on mount
  useEffect(() => {
    if (user?.team_id) {
      loadHistory()
    }
  }, [user?.team_id])

  async function loadHistory() {
    try {
      const response = await chatService.getHistory(user.team_id, 50)
      if (response.data && response.data.length > 0) {
        setMessages(response.data.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.created_at,
        })))
        setShowSuggestions(false)
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Handle initial query from URL
  useEffect(() => {
    const query = searchParams.get('q')
    if (query && !loadingHistory) {
      setInput(query)
      handleSend(query)
    }
  }, [loadingHistory])
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Build context for AI
  function buildContext() {
    const teamScoped = scope === 'team' && team
    return {
      team: teamScoped ? {
        name: team.name,
        sport: team.sport,
        ageGroup: team.age_group,
        teamFormat: team.team_format,
        formation: team.formation,
        gameModel: team.game_model,
      } : null,
      squadSize: teamScoped ? pupils.length : undefined,
      upcomingMatch: teamScoped && upcomingMatches[0] ? {
        opponent: upcomingMatches[0].opponent,
        date: upcomingMatches[0].date,
      } : null,
    }
  }
  
  async function handleSend(messageText = input) {
    if (!messageText.trim() || loading) return
    
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setShowSuggestions(false)
    setLoading(true)
    
    const aiId = Date.now() + 1
    try {
      const token = localStorage.getItem('fam_token')
      const res = await fetch(`/api/chat/${user.team_id}/message`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText.trim(),
          context: buildContext(),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to get response. Please try again.')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''
      let buffer = ''
      let started = false
      let streamError = null
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop()
        for (const evt of events) {
          const line = evt.split('\n').find(l => l.startsWith('data: '))
          if (!line) continue
          let parsed
          try { parsed = JSON.parse(line.slice(6)) } catch { continue }
          if (parsed.type === 'text' && parsed.text) {
            text += parsed.text
            if (!started) {
              started = true
              setStreaming(true)
              setMessages(prev => [...prev, {
                id: aiId, role: 'assistant', content: text, timestamp: new Date().toISOString(),
              }])
            } else {
              setMessages(prev => prev.map(msg => msg.id === aiId ? { ...msg, content: text } : msg))
            }
          } else if (parsed.type === 'error') {
            streamError = parsed.message || 'Failed to get response. Please try again.'
          }
        }
      }
      if (streamError && !text) throw new Error(streamError)
      if (!text) throw new Error('No response generated. Please try again.')
    } catch (error) {
      console.error('Chat error:', error)
      toast.error(error.message || 'Failed to get response. Please try again.')

      // Remove the user message (and any empty reply) if we failed
      setMessages(prev => prev.filter(m => m.id !== userMessage.id && m.id !== aiId))
      setInput(messageText)
    } finally {
      setLoading(false)
      setStreaming(false)
      inputRef.current?.focus()
    }
  }
  
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  function handleSuggestionClick(prompt) {
    setInput(prompt)
    handleSend(prompt)
  }
  
  async function clearChat() {
    setMessages([])
    setShowSuggestions(true)
    // Clear history from database
    try {
      await chatService.clearHistory(user.team_id)
    } catch (error) {
      console.error('Failed to clear chat history:', error)
    }
  }
  
  return (
    <div className="h-[calc(100vh-4rem)] lg:h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border-default flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-primary-tint flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-brand-primary" />
          </div>
          <div>
            <h1 className="font-display font-semibold text-primary">{ASSISTANT_NAME}</h1>
            <p className="text-sm text-secondary">
              Your PE department assistant
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setScope('department')}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                  scope === 'department'
                    ? 'bg-brand-primary-tint text-brand-primary'
                    : 'text-tertiary hover:text-secondary'
                }`}
              >
                Whole department
              </button>
              {team && (
                <button
                  type="button"
                  onClick={() => setScope('team')}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                    scope === 'team'
                      ? 'bg-brand-primary-tint text-brand-primary'
                      : 'text-tertiary hover:text-secondary'
                  }`}
                >
                  {team.name}
                </button>
              )}
            </div>
          </div>
        </div>

        {messages.length > 0 && (
          <button onClick={clearChat} className="btn-ghost btn-sm">
            <RefreshCw className="w-4 h-4" />
            New Chat
          </button>
        )}
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {showSuggestions && messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-brand-primary-tint flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-brand-primary" />
                </div>
                <h2 className="font-display text-2xl font-bold text-primary mb-2">
                  How can I help you today?
                </h2>
                <p className="text-secondary max-w-md mx-auto">
                  Ask me anything about tactics, training, pupil development, or match preparation.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestedPrompts.map((category) => (
                  <div key={category.category} className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <category.icon className="w-4 h-4 text-brand-primary" />
                      <span className="text-sm font-medium text-secondary">{category.category}</span>
                    </div>
                    <div className="space-y-2">
                      {category.prompts.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => handleSuggestionClick(prompt)}
                          className="w-full text-left px-3 py-2 rounded-lg bg-subtle text-sm text-primary hover:text-link hover:bg-card border border-border-subtle transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
          
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`
                  w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center
                  ${message.role === 'user' ? 'bg-brand-primary' : 'bg-subtle'}
                `}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-on-dark" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-brand-primary" />
                  )}
                </div>
                
                <div className={`
                  group rounded-2xl p-4
                  ${message.role === 'user'
                    ? 'bg-brand-primary text-on-dark rounded-br-md'
                    : 'bg-subtle text-primary rounded-bl-md'
                  }
                `}>
                  {message.role === 'assistant' ? (
                    <>
                      <div id={`chat-msg-${message.id}`}>
                        <AIMarkdown variant="chat">{message.content}</AIMarkdown>
                      </div>
                      {message.content && (
                        <button
                          type="button"
                          onClick={() => printElement(document.getElementById(`chat-msg-${message.id}`), `${ASSISTANT_NAME} — MoonBoots Sports`)}
                          className="mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-tertiary opacity-0 transition-all hover:bg-card hover:text-primary group-hover:opacity-100"
                          title="Print this answer"
                        >
                          <Printer className="h-3.5 w-3.5" /> Print
                        </button>
                      )}
                    </>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          
          {loading && !streaming && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-subtle flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-brand-primary" />
                </div>
                <div className="bg-subtle rounded-2xl rounded-bl-md p-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center gap-1">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-brand-primary/60 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </span>
                    <span className="text-sm text-secondary">{ASSISTANT_NAME} is typing…</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="flex-shrink-0 p-4 border-t border-border-default">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about coaching..."
                rows={1}
                className="input resize-none pr-12 min-h-[48px] max-h-32"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-brand-primary text-on-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-primary transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-tertiary mt-2 text-center">
            AI can make mistakes. Consider verifying important information.
          </p>
        </div>
      </div>
    </div>
  )
}
