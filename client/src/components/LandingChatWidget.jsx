import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Loader2, Sparkles, User, Minimize2 } from 'lucide-react'
import AIMarkdown from './AIMarkdown'
import { publicChatService } from '../services/api'

const suggestedQuestions = [
  "What is MoonBoots Sports?",
  "How does the AI help coaches?",
  "Is it really free?",
  "How is my child's data protected?",
]

export default function LandingChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isMinimized])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus()
    }
  }, [isOpen, isMinimized])

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
      // Build history for context
      const history = messages.map(m => ({
        role: m.role,
        content: m.content,
      }))

      const response = await publicChatService.sendMessage(messageText.trim(), history)

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.data.message,
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Chat error:', error)
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
    }
  }

  function minimize() {
    setIsMinimized(true)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
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
            <div className="bg-gradient-to-r from-pitch-600 to-pitch-500 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Ask about MoonBoots Sports</p>
                  <p className="text-white/70 text-xs">We're here to help</p>
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

            {/* Messages */}
            <div className="h-[350px] overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-4">
                  <Sparkles className="w-10 h-10 text-pitch-400 mx-auto mb-3" />
                  <p className="text-navy-300 text-sm mb-4">
                    Hi! I can answer questions about MoonBoots Sports. What would you like to know?
                  </p>
                  <div className="space-y-2">
                    {suggestedQuestions.map((q) => (
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
                          ${message.role === 'user' ? 'bg-pitch-600' : 'bg-navy-700'}
                        `}>
                          {message.role === 'user' ? (
                            <User className="w-3 h-3 text-white" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-pitch-400" />
                          )}
                        </div>

                        <div className={`
                          rounded-2xl px-3 py-2 text-sm
                          ${message.role === 'user'
                            ? 'bg-pitch-600 text-white rounded-br-md'
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
                          <Sparkles className="w-3 h-3 text-pitch-400" />
                        </div>
                        <div className="bg-navy-800 rounded-2xl rounded-bl-md px-3 py-2">
                          <Loader2 className="w-4 h-4 animate-spin text-pitch-400" />
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
                  placeholder="Ask a question..."
                  className="flex-1 bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-navy-500 focus:outline-none focus:border-pitch-500"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="p-2 rounded-xl bg-pitch-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pitch-500 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
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
            : 'bg-gradient-to-br from-pitch-500 to-pitch-600 hover:from-pitch-400 hover:to-pitch-500'
          }
        `}
      >
        {isOpen && !isMinimized ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <div className="relative">
            <MessageCircle className="w-6 h-6 text-white" />
            {messages.length === 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-energy-400 rounded-full animate-pulse" />
            )}
          </div>
        )}
      </motion.button>
    </div>
  )
}
