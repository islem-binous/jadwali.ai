import { NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth/session'
import { getSessionCookieName } from '@/lib/auth/jwt'

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || ''
    const cookieName = getSessionCookieName()
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`))
    const token = match?.[1]

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await validateSession(token)
    if (!result) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

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
    console.error('[/api/auth/me] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
