'use client'

import { useCallback } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useUserStore, type AuthUser } from '@/store/userStore'

export function useAuth() {
  const { user, isLoading, setUser, signOut: clearUser } = useUserStore()
  const router = useRouter()

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'same-origin',
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

  const signUp = useCallback(
    async (data: {
      email: string
      password: string
      name: string
      language: string
      role?: string
      schoolName?: string
      schoolId?: string
      classId?: string
      tunisianSchoolId?: string
      cin?: string
      matricule?: string
    }) => {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'same-origin',
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

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      })
    } catch {
      // Continue with client-side cleanup even if server call fails
    }
    clearUser()
    router.push('/auth/login')
  }, [clearUser, router])

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to change password')
      }
    },
    []
  )

  const deleteAccount = useCallback(
    async (password: string) => {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete account')
      }
      clearUser()
      router.push('/auth/login')
    },
    [clearUser, router]
  )

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    changePassword,
    deleteAccount,
  }
}
