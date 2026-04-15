// PupilAssistant.jsx - AI Coaching Assistant for Players/Parents
import { useState, useRef, useEffect } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { teamService, playerChatService } from '../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import AIMarkdown from '../components/AIMarkdown'
import {
  Send,
  Sparkles,
  User,
  Loader2,
  Target,
  Calendar,
  TrendingUp,
  Heart,
  Lightbulb,
  RefreshCw,
  ArrowLeft,
  Star,
  Dumbbell,
  Brain,
} from 'lucide-react'
import toast from 'react-hot-toast'

const suggestedPrompts = [
  {
    icon: TrendingUp,
    category: 'My Development',
    prompts: [
      "What should I be working on to improve?",
      "Explain my development plan in simple terms",
      "What are my biggest strengths?",
    ],
  },
  {
    icon: Target,
    category: 'Skills & Practice',
    prompts: [
      "Give me some drills I can practice at home",
      "How can I improve my first touch?",
      "What should I focus on in training this week?",
    ],
  },
  {
    icon: Calendar,
    category: 'Match Preparation',
    prompts: [
      "How should I prepare for our next match?",
      "What's my role in the team's formation?",
      "Tips for staying focused during games",
    ],
  },
  {
    icon: Heart,
    category: 'Mindset & Confidence',
    prompts: [
      "How do I deal with making mistakes in a game?",
      "I'm nervous about an upcoming match, any advice?",
      "How can I be a better teammate?",
    ],
  },
]

export default function PupilAssistant() {
  const { pupilId } = useParams()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  const [pupil, setPlayer] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingPlayer, setLoadingPlayer] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [showSuggestions, setShowSuggestions] = useState(true)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Load pupil data
  useEffect(() => {
    if (pupilId) {
      loadPlayer()
      loadHistory()
    }
  }, [pupilId])

  async function loadPlayer() {
    try {
      const response = await teamService.getPlayer(pupilId)
      setPlayer(response.data)
    } catch (error) {
      console.error('Failed to load pupil:', error)
      toast.error('Failed to load pupil')
    } finally {
      setLoadingPlayer(false)
    }
  }

  async function loadHistory() {
    try {
      const response = await playerChatService.getHistory(pupilId, 50)
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
    if (query && !loadingHistory && !loadingPlayer) {
      setInput(query)
      handleSend(query)
    }
  }, [loadingHistory, loadingPlayer])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
      const response = await playerChatService.sendMessage(pupilId, messageText.trim())

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date().toISOString(),
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Failed to get response. Please try again.')

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
    try {
      await playerChatService.clearHistory(pupilId)
    } catch (error) {
      console.error('Failed to clear chat history:', error)
    }
  }

  if (loadingPlayer) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pitch-400" />
      </div>
    )
  }

  if (!pupil) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <p className="text-navy-400">Pupil not found</p>
        <Link to="/pupils" className="btn-primary mt-4">
          Back to Players
        </Link>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] lg:h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-navy-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to={`/pupils/${pupilId}`}
              className="p-2 rounded-lg text-navy-400 hover:text-white hover:bg-navy-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pitch-500 to-pitch-700 flex items-center justify-center text-white font-bold">
              {pupil.squad_number || pupil.name?.charAt(0)}
            </div>
            <div>
              <h1 className="font-display font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pitch-400" />
                My Coach AI
              </h1>
              <p className="text-sm text-navy-400">
                Personal assistant for {pupil.name}
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
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pitch-500/20 to-energy-500/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-10 h-10 text-pitch-400" />
                </div>
                <h2 className="font-display text-2xl font-bold text-white mb-2">
                  Hey {pupil.name?.split(' ')[0]}! 👋
                </h2>
                <p className="text-navy-400 max-w-md mx-auto">
                  I'm your personal coaching assistant. I know about your development,
                  what the coaches have observed, and I'm here to help you become the best pupil you can be!
                </p>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="card p-4 text-center">
                  <Star className="w-6 h-6 text-energy-400 mx-auto mb-2" />
                  <p className="text-xs text-navy-400">Position</p>
                  <p className="font-semibold text-white">{pupil.positions?.join(', ') || 'Any'}</p>
                </div>
                <div className="card p-4 text-center">
                  <Dumbbell className="w-6 h-6 text-pitch-400 mx-auto mb-2" />
                  <p className="text-xs text-navy-400">Squad #</p>
                  <p className="font-semibold text-white">{pupil.squad_number || '-'}</p>
                </div>
                <div className="card p-4 text-center">
                  <Brain className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-xs text-navy-400">Focus</p>
                  <p className="font-semibold text-white">Development</p>
                </div>
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
                placeholder="Ask me anything about your football journey..."
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
            Your personal coach is here to help you grow as a pupil!
          </p>
        </div>
      </div>
    </div>
  )
}
