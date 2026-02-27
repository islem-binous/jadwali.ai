'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useUserStore, type AuthUser } from '@/store/userStore'
import { Loader2 } from 'lucide-react'

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, setUser, signOut } = useUserStore()
  const router = useRouter()
  const revalidated = useRef(false)

  // Revalidate session on mount
  useEffect(() => {
    if (revalidated.current) return
    revalidated.current = true

    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(async (res) => {
        if (res.ok) {
          const data: { user: AuthUser } = await res.json()
          setUser(data.user)
        } else {
          signOut()
        }
      })
      .catch(() => {})
  }, [setUser, signOut])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login')
    }
    if (!isLoading && user && user.role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'SUPER_ADMIN') {
    return null
  }

  return <>{children}</>
}
