'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import {
  X,
  Rocket,
  CalendarDays,
  Clock,
  BookOpen,
  Users,
  GraduationCap,
  DoorOpen,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { useOnboardingStore, ONBOARDING_STEPS } from '@/store/onboardingStore'
import { useUserStore } from '@/store/userStore'
import { useRouter } from '@/i18n/navigation'
import { isAdmin } from '@/lib/permissions'

const STEP_ICONS = [
  Rocket,         // welcome
  CalendarDays,   // school_days
  Clock,          // periods
  BookOpen,       // subjects
  Users,          // teachers
  GraduationCap,  // classes
  DoorOpen,       // rooms
  Sparkles,       // timetable
  CheckCircle2,   // review
]

export function OnboardingWizard() {
  const t = useTranslations('onboarding')
  const user = useUserStore((s) => s.user)
  const router = useRouter()

  const {
    isComplete,
    isOpen,
    isDismissed,
    currentStep,
    completedSteps,
    openWizard,
    closeWizard,
    setStep,
    completeStep,
    completeOnboarding,
  } = useOnboardingStore()

  // Auto-open for admin users who haven't completed or dismissed
  useEffect(() => {
    if (user && isAdmin(user.role) && !isComplete && !isDismissed && !isOpen) {
      openWizard()
    }
  }, [user, isComplete, isDismissed, isOpen, openWizard])

  if (!isOpen || !user) return null

  const totalSteps = ONBOARDING_STEPS.length
  const progress = ((completedSteps.length) / totalSteps) * 100
  const step = ONBOARDING_STEPS[currentStep]
  const StepIcon = STEP_ICONS[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === totalSteps - 1

  const handleNext = () => {
    completeStep(currentStep)
    if (isLast) {
      completeOnboarding()
    } else {
      setStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (!isFirst) setStep(currentStep - 1)
  }

  const handleGoToSetup = () => {
    completeStep(currentStep)
    closeWizard()
    router.push(step.href as '/dashboard')
  }

  const titleKey = `${step.key}_title` as const
  const descKey = `${step.key}_desc` as const

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center">
        {/* Overlay */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeWizard}
        />

        {/* Card */}
        <motion.div
          className="relative w-full max-w-md mx-4 rounded-xl border border-border-subtle bg-bg-card shadow-modal overflow-hidden"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Progress bar */}
          <div className="h-1 bg-bg-surface">
            <motion.div
              className="h-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Close button */}
          <button
            onClick={closeWizard}
            className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-1.5 rounded-sm text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors z-10"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Step content */}
          <div className="px-6 pt-8 pb-6">
            {/* Step indicator */}
            <p className="text-xs font-medium text-text-muted mb-6">
              {t('step_of', { current: currentStep + 1, total: totalSteps })}
            </p>

            {/* Icon + text */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-dim">
                  <StepIcon className="h-8 w-8 text-accent" />
                </div>
                <h2 className="font-display text-xl font-bold text-text-primary mb-2">
                  {t(titleKey)}
                </h2>
                <p className="text-sm text-text-secondary leading-relaxed max-w-sm mx-auto">
                  {t(descKey)}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Step dots */}
            <div className="flex justify-center gap-1.5 mt-6 mb-6">
              {ONBOARDING_STEPS.map((_, idx) => {
                const isCurrent = idx === currentStep
                const isDone = completedSteps.includes(idx)
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setStep(idx)}
                    className={`h-2 rounded-full transition-all duration-200 ${
                      isCurrent
                        ? 'w-6 bg-accent'
                        : isDone
                          ? 'w-2 bg-success'
                          : 'w-2 bg-border-strong'
                    }`}
                    aria-label={`Step ${idx + 1}`}
                  />
                )
              })}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between">
              <div>
                {!isFirst ? (
                  <button
                    onClick={handleBack}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {t('back')}
                  </button>
                ) : (
                  <button
                    onClick={closeWizard}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
                  >
                    {t('skip')}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Go to Setup — only for middle steps (not welcome/review) */}
                {!isFirst && !isLast && (
                  <button
                    onClick={handleGoToSetup}
                    className="rounded-lg border border-accent bg-accent-dim px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20 transition-colors"
                  >
                    {t('go_to_page')}
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
                >
                  {isLast ? t('finish') : t('next')}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
