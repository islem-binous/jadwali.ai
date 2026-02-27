import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'

export async function requireSuperAdmin(request: Request) {
  const result = await requireAuth(request)
  if (result.error) return { error: result.error, user: null }

  if (result.user.role !== 'SUPER_ADMIN') {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
    }
  }

  return { error: null, user: result.user }
}
