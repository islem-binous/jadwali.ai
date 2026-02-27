'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useUserStore, type AuthUser } from '@/store/userStore'
import { canAccessRoute } from '@/lib/permissions'
import { Loader2 } from 'lucide-react'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, setUser, signOut } = useUserStore()
  const router = useRouter()
  const pathname = usePathname()
  const revalidated = useRef(false)

  // Revalidate session on mount by calling /api/auth/me
  useEffect(() => {
    if (revalidated.current) return
    revalidated.current = true

    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(async (res) => {
        if (res.ok) {
          const data: { user: AuthUser } = await res.json()
          setUser(data.user)
        } else {
          // Session invalid — clear local state and redirect
          signOut()
        }
      })
      .catch(() => {
        // Network error — keep current state (offline support)
      })
  }, [setUser, signOut])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login')
    }
    // SUPER_ADMIN should use the /admin section, not the school app
    if (!isLoading && user && user.role === 'SUPER_ADMIN') {
      router.push('/admin')
      return
    }
    // Role-based route protection
    if (!isLoading && user && !canAccessRoute(user.role, pathname)) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router, pathname])

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

  if (!user) {
    return null
  }

  // Block rendering for unauthorized routes
  if (!canAccessRoute(user.role, pathname)) {
    return null
  }

  return <>{children}</>
}
