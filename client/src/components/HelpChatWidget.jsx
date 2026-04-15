import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, X, Send, Loader2, Sparkles, User, Minimize2, BookOpen, Ticket, CheckCircle } from 'lucide-react'
import AIMarkdown from './AIMarkdown'
import { helpChatService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const suggestedQuestions = {
  coach: [
    "How do I create a training session?",
    "How do I set up my team's formation?",
    "How do I track pupil development?",
    "What can the AI assistant help me with?",
  ],
  pupil: [
    "How do I check my schedule?",
    "What does my development progress show?",
    "How do I talk to The Gaffer?",
    "How can I update my availability?",
  ]
}

const SUBJECTS = ['Bug Report', 'Feature Request', 'Account Issue', 'General Question']

export default function HelpChatWidget({ userRole = 'coach' }) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [tab, setTab] = useState('chat') // 'chat' | 'support'
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Support form state
  const [supportForm, setSupportForm] = useState({ email: '', subject: 'General Question', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [supportError, setSupportError] = useState('')

  const questions = userRole === 'parent' || userRole === 'pupil'
    ? suggestedQuestions.pupil
    : suggestedQuestions.coach

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isMinimized])

  useEffect(() => {
    if (isOpen && !isMinimized && tab === 'chat') {
      inputRef.current?.focus()
    }
  }, [isOpen, isMinimized, tab])

  async function handleSend(messageText = input) {
    if (!messageText.trim() || loading) return

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageText.trim(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const history = messages.map(m => ({
        role: m.role,
        content: m.content,
      }))

      const response = await helpChatService.sendMessage(messageText.trim(), history, userRole)

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.data.message,
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Help chat error:', error)
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: error.response?.data?.message || "Sorry, I couldn't respond right now. Please try again.",
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function toggleOpen() {
    if (isMinimized) {
      setIsMinimized(false)
    } else {
      setIsOpen(!isOpen)
      if (!isOpen) {
        setSupportForm(f => ({ ...f, email: user?.email || f.email }))
      }
    }
  }

  function minimize() {
    setIsMinimized(true)
  }

  async function handleSupportSubmit(e) {
    e.preventDefault()
    setSupportError('')
    setSubmitting(true)

    try {
      await axios.post(`${API_URL}/support`, {
        email: supportForm.email,
        subject: supportForm.subject,
        message: supportForm.message,
        userId: user?.id,
        page: window.location.pathname,
      })
      setSubmitted(true)
      setSupportForm({ email: '', subject: 'General Question', message: '' })
    } catch (err) {
      setSupportError(err.response?.data?.error || 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function switchToSupport() {
    setTab('support')
    setSubmitted(false)
    setSupportError('')
    setSupportForm(f => ({ ...f, email: user?.email || f.email }))
  }

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50">
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 w-[380px] max-w-[calc(100vw-3rem)] bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  {tab === 'chat' ? <BookOpen className="w-4 h-4 text-white" /> : <Ticket className="w-4 h-4 text-white" />}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{tab === 'chat' ? 'App Guide' : 'Submit a Ticket'}</p>
                  <p className="text-white/70 text-xs">{tab === 'chat' ? 'Learn how to use MoonBoots Sports' : 'Get help from our team'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={minimize}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <Minimize2 className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-navy-800">
              <button
                onClick={() => setTab('chat')}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${tab === 'chat' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-navy-400 hover:text-navy-200'}`}
              >
                App Guide
              </button>
              <button
                onClick={switchToSupport}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${tab === 'support' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-navy-400 hover:text-navy-200'}`}
              >
                Submit a Ticket
              </button>
            </div>

            {tab === 'chat' ? (
              <>
                {/* Messages */}
                <div className="h-[310px] overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-4">
                      <BookOpen className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                      <p className="text-navy-300 text-sm mb-4">
                        Hi! I can help you learn how to use MoonBoots Sports. What would you like to know?
                      </p>
                      <div className="space-y-2">
                        {questions.map((q) => (
                          <button
                            key={q}
                            onClick={() => handleSend(q)}
                            className="w-full text-left px-3 py-2 rounded-lg bg-navy-800/50 text-sm text-navy-300 hover:text-white hover:bg-navy-800 transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex gap-2 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`
                              w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center
                              ${message.role === 'user' ? 'bg-blue-600' : 'bg-navy-700'}
                            `}>
                              {message.role === 'user' ? (
                                <User className="w-3 h-3 text-white" />
                              ) : (
                                <BookOpen className="w-3 h-3 text-blue-400" />
                              )}
                            </div>

                            <div className={`
                              rounded-2xl px-3 py-2 text-sm
                              ${message.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-md'
                                : 'bg-navy-800 text-navy-100 rounded-bl-md'
                              }
                            `}>
                              {message.role === 'assistant' ? (
                                <AIMarkdown variant="chat-sm">{message.content}</AIMarkdown>
                              ) : (
                                <p>{message.content}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {loading && (
                        <div className="flex justify-start">
                          <div className="flex gap-2">
                            <div className="w-6 h-6 rounded-full bg-navy-700 flex items-center justify-center">
                              <BookOpen className="w-3 h-3 text-blue-400" />
                            </div>
                            <div className="bg-navy-800 rounded-2xl rounded-bl-md px-3 py-2">
                              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-navy-800">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask about features..."
                      className="flex-1 bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-navy-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={!input.trim() || loading}
                      className="p-2 rounded-xl bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Support ticket form */
              <div className="h-[350px] overflow-y-auto">
                {submitted ? (
                  <div className="p-6 text-center">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <h3 className="text-white font-semibold text-lg mb-1">Request received</h3>
                    <p className="text-navy-400 text-sm mb-4">
                      We'll get back to you as soon as possible.
                    </p>
                    <button
                      onClick={() => { setSubmitted(false); setTab('chat') }}
                      className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-lg text-sm transition-colors"
                    >
                      Back to App Guide
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSupportSubmit} className="p-4 space-y-3">
                    <div>
                      <label className="block text-xs text-navy-400 mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={supportForm.email}
                        onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })}
                        placeholder="your@email.com"
                        className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder-navy-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-navy-400 mb-1">Subject</label>
                      <select
                        value={supportForm.subject}
                        onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                        className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                      >
                        {SUBJECTS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-navy-400 mb-1">Message</label>
                      <textarea
                        required
                        rows={4}
                        maxLength={5000}
                        value={supportForm.message}
                        onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                        placeholder="Describe your issue or question..."
                        className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder-navy-500 focus:outline-none focus:border-blue-500 resize-none"
                      />
                    </div>

                    {supportError && (
                      <p className="text-red-400 text-xs">{supportError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {submitting ? 'Sending...' : <><Send className="w-4 h-4" /> Send</>}
                    </button>
                  </form>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        onClick={toggleOpen}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors
          ${isOpen && !isMinimized
            ? 'bg-navy-800 hover:bg-navy-700'
            : 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500'
          }
        `}
        title="App Help Guide"
      >
        {isOpen && !isMinimized ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <div className="relative">
            <HelpCircle className="w-6 h-6 text-white" />
            {messages.length === 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-energy-400 rounded-full animate-pulse" />
            )}
          </div>
        )}
      </motion.button>
    </div>
  )
}
