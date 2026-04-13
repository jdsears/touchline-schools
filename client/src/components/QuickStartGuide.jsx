import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Users,
  Trophy,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  X,
  Rocket,
} from 'lucide-react'

const steps = [
  {
    icon: Sparkles,
    color: 'pitch',
    title: 'Welcome to Touchline!',
    description:
      "You've got your very own AI coaching assistant called Pep. Ask Pep for help with training plans, match preparation, tactics, and player development — anytime you need a hand.",
    cta: 'Meet Pep',
    href: '/chat',
  },
  {
    icon: Users,
    color: 'blue',
    title: 'Build Your Squad',
    description:
      'Add your players with their positions, squad numbers, and age details. Once they are in, you can track their development, add observations, and build individual development plans.',
    cta: 'Add Players',
    href: '/players',
  },
  {
    icon: Trophy,
    color: 'energy',
    title: 'Log Your First Match',
    description:
      "Create a match fixture to track availability, select your squad, and record results. After the match you can generate reports for parents and run video analysis.",
    cta: 'Create Match',
    href: '/matches',
  },
  {
    icon: UserPlus,
    color: 'purple',
    title: 'Invite Parents',
    description:
      "Open any player's profile and share their parent invite link. Once connected, parents can see schedules, availability, match reports, live streams, and their child's progress in the Player Lounge.",
    cta: 'View Players',
    href: '/players',
  },
]

const colorMap = {
  pitch: 'bg-pitch-500/20 text-pitch-400',
  blue: 'bg-blue-500/20 text-blue-400',
  energy: 'bg-energy-500/20 text-energy-400',
  purple: 'bg-purple-500/20 text-purple-400',
}

export default function QuickStartGuide({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const navigate = useNavigate()

  if (!isOpen) return null

  const step = steps[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1
  const Icon = step.icon

  function goNext() {
    if (isLast) {
      handleClose()
      return
    }
    setDirection(1)
    setCurrentStep((s) => s + 1)
  }

  function goBack() {
    setDirection(-1)
    setCurrentStep((s) => s - 1)
  }

  function handleClose() {
    setCurrentStep(0)
    onClose()
  }

  function handleCta() {
    handleClose()
    navigate(step.href)
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="modal-content max-w-md relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-navy-500 hover:text-navy-300 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step indicator dots */}
        <div className="flex justify-center gap-2 pt-6 pb-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? 'w-6 bg-pitch-500'
                  : i < currentStep
                    ? 'w-1.5 bg-pitch-500/40'
                    : 'w-1.5 bg-navy-700'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 pb-6 pt-2">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className={`p-4 rounded-2xl ${colorMap[step.color]}`}>
                  <Icon className="w-8 h-8" />
                </div>
              </div>

              {/* Title */}
              <h2 className="font-display text-xl font-semibold text-white mb-3">
                {step.title}
              </h2>

              {/* Description */}
              <p className="text-navy-300 text-sm leading-relaxed mb-6">
                {step.description}
              </p>

              {/* CTA button */}
              <button
                onClick={handleCta}
                className="btn-primary w-full mb-3"
              >
                {step.cta}
              </button>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-2">
            <button
              onClick={goBack}
              disabled={isFirst}
              className={`flex items-center gap-1 text-sm transition-colors ${
                isFirst
                  ? 'text-navy-700 cursor-default'
                  : 'text-navy-400 hover:text-white'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <span className="text-xs text-navy-600">
              {currentStep + 1} of {steps.length}
            </span>

            <button
              onClick={goNext}
              className="flex items-center gap-1 text-sm text-navy-400 hover:text-white transition-colors"
            >
              {isLast ? (
                <>
                  <Rocket className="w-4 h-4" />
                  Done
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
