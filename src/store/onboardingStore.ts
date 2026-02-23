import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const ONBOARDING_STEPS = [
  { key: 'welcome', href: '/dashboard' },
  { key: 'school_days', href: '/settings' },
  { key: 'periods', href: '/settings' },
  { key: 'subjects', href: '/resources' },
  { key: 'teachers', href: '/teachers' },
  { key: 'classes', href: '/resources' },
  { key: 'rooms', href: '/resources' },
  { key: 'timetable', href: '/timetable' },
  { key: 'review', href: '/dashboard' },
] as const

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]['key']

interface OnboardingState {
  isComplete: boolean
  isOpen: boolean
  isDismissed: boolean
  currentStep: number
  completedSteps: number[]
  openWizard: () => void
  closeWizard: () => void
  setStep: (step: number) => void
  completeStep: (step: number) => void
  completeOnboarding: () => void
  resetOnboarding: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      isComplete: false,
      isOpen: false,
      isDismissed: false,
      currentStep: 0,
      completedSteps: [],
      openWizard: () => set({ isOpen: true, isDismissed: false }),
      closeWizard: () => set({ isOpen: false, isDismissed: true }),
      setStep: (step) => set({ currentStep: step }),
      completeStep: (step) =>
        set((state) => ({
          completedSteps: state.completedSteps.includes(step)
            ? state.completedSteps
            : [...state.completedSteps, step],
        })),
      completeOnboarding: () =>
        set({ isComplete: true, isOpen: false }),
      resetOnboarding: () =>
        set({
          isComplete: false,
          isOpen: false,
          isDismissed: false,
          currentStep: 0,
          completedSteps: [],
        }),
    }),
    { name: 'jadwali-onboarding' }
  )
)
