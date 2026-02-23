'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useUserStore } from '@/store/userStore'
import { canAccessRoute } from '@/lib/permissions'
import { Loader2 } from 'lucide-react'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUserStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login')
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
