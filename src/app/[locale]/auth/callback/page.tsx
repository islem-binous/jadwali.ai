'use client'

import { useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useUserStore } from '@/store/userStore'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()
  const setUser = useUserStore((s) => s.setUser)

  useEffect(() => {
    try {
      // Read auth_result cookie
      const match = document.cookie
        .split('; ')
        .find((c) => c.startsWith('auth_result='))
      if (!match) {
        router.push('/auth/login')
        return
      }

      const value = decodeURIComponent(match.split('=')[1])
      const user = JSON.parse(atob(value))

      // Store in Zustand
      setUser(user)

      // Delete cookie
      document.cookie = 'auth_result=; path=/; max-age=0'

      // Redirect to dashboard
      router.push('/dashboard')
    } catch {
      router.push('/auth/login')
    }
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
