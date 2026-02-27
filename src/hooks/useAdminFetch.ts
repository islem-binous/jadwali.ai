'use client'

import { useCallback } from 'react'

export function useAdminFetch() {
  const adminFetch = useCallback(
    async (url: string, options?: RequestInit) => {
      const headers: Record<string, string> = {
        ...(options?.headers as Record<string, string>),
      }
      if (options?.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
      }
      // Auth is now handled via httpOnly session cookie — no manual headers needed
      return fetch(url, { ...options, headers, credentials: 'same-origin' })
    },
    []
  )

  return { adminFetch }
}
