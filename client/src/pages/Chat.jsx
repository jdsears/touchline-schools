import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTeam } from '../context/TeamContext'
import { chatService } from '../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import AIMarkdown from '../components/AIMarkdown'
import {
  Send,
  Sparkles,
  User,
  Loader2,
  Target,
  Calendar,
  Users,
  Trophy,
  Lightbulb,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

const suggestedPrompts = [
  {
    icon: Target,
    category: 'Tactics',
    prompts: [
      'How should we set up against a team that plays 4-4-2?',
      'What are good pressing triggers for U13s?',
      'Create a Plan B if we are losing at half-time',
    ],
  },
  {
    icon: Calendar,
    category: 'Training',
    prompts: [
      'Design a 90-minute session focused on passing and movement',
      'Give me 3 drills to improve our defensive shape',
      'What should we practice before a cup final?',
    ],
  },
  {
    icon: Users,
    category: 'Players',
    prompts: [
      'How do I develop a pupil who is technically good but lacks confidence?',
      'What positions suit a quick but small pupil?',
      'Give me development goals for a central midfielder',
    ],
  },
  {
    icon: Trophy,
    category: 'Match Day',
    prompts: [
      'Write a pre-match team talk for an important game',
      'What should I say at half-time when we are 2-0 down?',
      'How do I handle a pupil who is disappointed not to start?',
    ],
  },
]

export default function Chat() {
  const { user } = useAuth()
  const { team, pupils, upcomingMatches } = useTeam()
  const [searchParams] = useSearchParams()

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
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
    return {
      team: team ? {
        name: team.name,
        ageGroup: team.age_group,
        formation: team.formation,
        gameModel: team.game_model,
      } : null,
      squadSize: pupils.length,
      upcomingMatch: upcomingMatches[0] ? {
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
    
    try {
      const response = await chatService.sendMessage(
        user.team_id,
        messageText.trim(),
        buildContext()
      )
      
      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date().toISOString(),
      }
      
      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const serverMsg = error.response?.data?.message
      toast.error(serverMsg || 'Failed to get response. Please try again.')
      
      // Remove the user message if we failed
      setMessages(prev => prev.filter(m => m.id !== userMessage.id))
      setInput(messageText)
    } finally {
      setLoading(false)
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
      <div className="flex-shrink-0 p-4 border-b border-navy-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pitch-500/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-pitch-400" />
          </div>
          <div>
            <h1 className="font-display font-semibold text-white">Pep</h1>
            <p className="text-sm text-navy-400">
              {team ? `Helping ${team.name}` : 'Your AI coaching assistant'}
            </p>
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
                <div className="w-16 h-16 rounded-2xl bg-pitch-500/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-pitch-400" />
                </div>
                <h2 className="font-display text-2xl font-bold text-white mb-2">
                  How can I help you today?
                </h2>
                <p className="text-navy-400 max-w-md mx-auto">
                  Ask me anything about tactics, training, pupil development, or match preparation.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestedPrompts.map((category) => (
                  <div key={category.category} className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <category.icon className="w-4 h-4 text-pitch-400" />
                      <span className="text-sm font-medium text-navy-300">{category.category}</span>
                    </div>
                    <div className="space-y-2">
                      {category.prompts.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => handleSuggestionClick(prompt)}
                          className="w-full text-left px-3 py-2 rounded-lg bg-navy-800/50 text-sm text-navy-300 hover:text-white hover:bg-navy-800 transition-colors"
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
                  ${message.role === 'user' ? 'bg-pitch-600' : 'bg-navy-700'}
                `}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-pitch-400" />
                  )}
                </div>
                
                <div className={`
                  rounded-2xl p-4
                  ${message.role === 'user'
                    ? 'bg-pitch-600 text-white rounded-br-md'
                    : 'bg-navy-800 text-navy-100 rounded-bl-md'
                  }
                `}>
                  {message.role === 'assistant' ? (
                    <AIMarkdown variant="chat">{message.content}</AIMarkdown>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-navy-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-pitch-400" />
                </div>
                <div className="bg-navy-800 rounded-2xl rounded-bl-md p-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-pitch-400" />
                    <span className="text-navy-400">Thinking...</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="flex-shrink-0 p-4 border-t border-navy-800">
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
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-pitch-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pitch-500 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-navy-500 mt-2 text-center">
            AI can make mistakes. Consider verifying important information.
          </p>
        </div>
      </div>
    </div>
  )
}
