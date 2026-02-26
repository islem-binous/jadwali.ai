'use client'

import { useCallback } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useLocale } from 'next-intl'
import { useUserStore, type AuthUser } from '@/store/userStore'

export function useAuth() {
  const { user, isLoading, setUser, signOut: clearUser } = useUserStore()
  const router = useRouter()
  const locale = useLocale()

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Login failed')
      }

      const data: { user: AuthUser } = await res.json()
      setUser(data.user)
      return data.user
    },
    [setUser]
  )

  const signInWithGoogle = useCallback(
    (mode: 'login' | 'signup', role?: string) => {
      const params = new URLSearchParams({ mode, locale })
      if (role) params.set('role', role)
      window.location.href = `/api/auth/google?${params.toString()}`
    },
    [locale]
  )

  const signUp = useCallback(
    async (data: {
      email: string
      password?: string
      name: string
      language: string
      role?: string
      schoolName?: string
      schoolId?: string
      classId?: string
      googleId?: string
      tunisianSchoolId?: string
      cin?: string
      matricule?: string
    }) => {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Signup failed')
      }

      const result: { user: AuthUser } = await res.json()
      setUser(result.user)
      return result.user
    },
    [setUser]
  )

  const signOut = useCallback(() => {
    clearUser()
    router.push('/auth/login')
  }, [clearUser, router])

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
  }
}
