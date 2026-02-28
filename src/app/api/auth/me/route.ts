import { NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth/session'
import { getSessionCookieName } from '@/lib/auth/jwt'

export async function GET(request: Request) {
  let step = 'init'
  try {
    step = 'cookie_parse'
    const cookieHeader = request.headers.get('cookie') || ''
    const cookieName = getSessionCookieName()
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`))
    const token = match?.[1]

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized', step: 'no_cookie' }, { status: 401 })
    }

    step = 'validate_session'
    const result = await validateSession(token)
    if (!result) {
      return NextResponse.json({ error: 'Session expired', step: 'invalid_session' }, { status: 401 })
    }

    step = 'build_response'
    const { user } = result
    const school = user.school

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        language: user.language,
        avatarUrl: user.avatarUrl,
        schoolId: user.schoolId,
        schoolName: school?.name || null,
        plan: user.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : (school?.plan || 'FREE'),
        subscriptionStatus: user.role === 'SUPER_ADMIN' ? 'ACTIVE' : (school?.subscriptionStatus ?? 'INACTIVE'),
        subscriptionEndsAt: school?.subscriptionEndsAt?.toISOString() ?? null,
        teacherId: user.teacherId ?? null,
        studentId: user.studentId ?? null,
        staffId: user.staffId ?? null,
        classId: user.student?.classId ?? null,
      },
    })
  } catch (err) {
    console.error(`[/api/auth/me] Error at step=${step}:`, err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Internal server error', detail, step }, { status: 500 })
  }
}
