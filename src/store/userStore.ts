import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  language: string
  avatarUrl: string | null
  schoolId: string
  schoolName: string
  plan: string
  subscriptionStatus: string
  subscriptionEndsAt: string | null
  teacherId: string | null
  studentId: string | null
  classId: string | null
}

interface UserState {
  user: AuthUser | null
  isLoading: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  signOut: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      setUser: (user) => set({ user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      signOut: () => set({ user: null, isLoading: false }),
    }),
    {
      name: 'jadwali-auth',
      onRehydrateStorage: () => (state) => {
        state?.setLoading(false)
      },
    }
  )
)
