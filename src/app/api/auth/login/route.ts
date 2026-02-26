import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { checkAndDowngradeExpired } from '@/lib/subscription'

export async function POST(request: Request) {
  try {
    const prisma = await getPrisma()
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { school: true, teacher: true, student: true, staff: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // In local dev, we skip password verification (no hashing setup)
    // In production, this would use Supabase Auth

    // Check and downgrade expired subscriptions on login
    const wasDowngraded = await checkAndDowngradeExpired(user.schoolId)

    // Re-fetch school if downgraded to get updated plan
    const school = wasDowngraded
      ? await prisma.school.findUnique({ where: { id: user.schoolId } })
      : user.school

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        language: user.language,
        avatarUrl: user.avatarUrl,
        schoolId: user.schoolId,
        schoolName: school!.name,
        plan: school!.plan,
        subscriptionStatus: school!.subscriptionStatus ?? 'INACTIVE',
        subscriptionEndsAt: school!.subscriptionEndsAt?.toISOString() ?? null,
        teacherId: user.teacherId ?? null,
        studentId: user.studentId ?? null,
        staffId: user.staffId ?? null,
        classId: user.student?.classId ?? null,
      },
    })
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
