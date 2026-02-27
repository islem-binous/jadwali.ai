/**
 * API route protection helpers.
 * Use these in route handlers to require authentication and authorization.
 */

import { NextResponse } from 'next/server'
import { validateSession } from './session'
import { getSessionCookieName } from './jwt'
import { getAppSettings } from '@/lib/app-settings'

type AuthUser = {
  id: string
  email: string
  name: string
  role: string
  schoolId: string | null
  isActive: boolean
  teacherId: string | null
  studentId: string | null
  staffId: string | null
}

type AuthResult =
  | { user: AuthUser; error: null }
  | { user: null; error: NextResponse }

/**
 * Require authenticated user. Reads session cookie, validates JWT + DB session.
 */
export async function requireAuth(request: Request): Promise<AuthResult> {
  const cookieHeader = request.headers.get('cookie') || ''
  const cookieName = getSessionCookieName()
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`))
  const token = match?.[1]

  if (!token) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const result = await validateSession(token)
  if (!result) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Session expired' }, { status: 401 }),
    }
  }

  const authUser: AuthUser = {
    id: result.user.id,
    email: result.user.email,
    name: result.user.name,
    role: result.user.role,
    schoolId: result.user.schoolId,
    isActive: result.user.isActive,
    teacherId: result.user.teacherId ?? null,
    studentId: result.user.studentId ?? null,
    staffId: result.user.staffId ?? null,
  }

  // Enforce maintenance mode (SUPER_ADMIN exempt)
  if (authUser.role !== 'SUPER_ADMIN') {
    try {
      const settings = await getAppSettings()
      if (settings.maintenanceMode) {
        return {
          user: null,
          error: NextResponse.json(
            { error: 'Platform is under maintenance' },
            { status: 503 }
          ),
        }
      }
    } catch {
      // If settings fetch fails, don't block the request
    }
  }

  return { user: authUser, error: null }
}

/**
 * Require authenticated user who belongs to the given school (or is SUPER_ADMIN).
 */
export async function requireSchoolAccess(
  request: Request,
  schoolId: string | null
): Promise<AuthResult> {
  const result = await requireAuth(request)
  if (result.error) return result

  if (result.user.role === 'SUPER_ADMIN') return result

  if (!schoolId || result.user.schoolId !== schoolId) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return result
}

/**
 * Export AuthUser type for use in route handlers.
 */
export type { AuthUser, AuthResult }
