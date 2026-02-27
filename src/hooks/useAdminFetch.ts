'use client'

import { useCallback } from 'react'
import { useUserStore } from '@/store/userStore'

export function useAdminFetch() {
  const userId = useUserStore((s) => s.user?.id)

  const adminFetch = useCallback(
    async (url: string, options?: RequestInit) => {
      const headers: Record<string, string> = {
        ...(options?.headers as Record<string, string>),
      }
      if (userId) {
        headers['x-user-id'] = userId
      }
      if (options?.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
      }
      return fetch(url, { ...options, headers })
    },
    [userId]
  )

  return { adminFetch }
}
