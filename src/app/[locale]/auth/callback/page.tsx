'use client'

import { useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useUserStore } from '@/store/userStore'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()
  const setUser = useUserStore((s) => s.setUser)

  useEffect(() => {
    // After Google OAuth, server set an httpOnly session cookie.
    // Call /api/auth/me to get user data from that session.
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Session invalid')
        const data = await res.json()
        setUser(data.user)
        // Redirect based on role
        if (data.user.role === 'SUPER_ADMIN') {
          router.push('/admin')
        } else {
          router.push('/dashboard')
        }
      })
      .catch(() => {
        router.push('/auth/login')
      })
  }, [router, setUser])

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-text-secondary">Signing you in...</p>
      </div>
    </div>
  )
}
