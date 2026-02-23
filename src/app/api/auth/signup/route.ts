import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function POST(request: Request) {
  try {
    const prisma = await getPrisma()
    const body = await request.json()
    const { email, password, name, language, role } = body

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password and name are required' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // ── TEACHER SIGNUP ──────────────────────────────────────
    if (role === 'TEACHER') {
      const { schoolId } = body
      if (!schoolId) {
        return NextResponse.json(
          { error: 'School is required for teacher signup' },
          { status: 400 }
        )
      }

      const school = await prisma.school.findUnique({ where: { id: schoolId } })
      if (!school) {
        return NextResponse.json({ error: 'School not found' }, { status: 404 })
      }

      // Match teacher record by email
      const teacher = await prisma.teacher.findFirst({
        where: { schoolId, email },
      })
      if (!teacher) {
        return NextResponse.json(
          { error: 'No teacher record found with this email. Contact your school admin.' },
          { status: 404 }
        )
      }

      // Check if another user is already linked to this teacher
      const alreadyLinked = await prisma.user.findFirst({
        where: { teacherId: teacher.id },
      })
      if (alreadyLinked) {
        return NextResponse.json(
          { error: 'This teacher account is already linked to another user' },
          { status: 409 }
        )
      }

      const user = await prisma.user.create({
        data: {
          authId: `local_${crypto.randomUUID()}`,
          email,
          name,
          role: 'TEACHER',
          language: language || school.language || 'FR',
          schoolId,
          teacherId: teacher.id,
        },
      })

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          language: user.language,
          avatarUrl: user.avatarUrl,
          schoolId: user.schoolId,
          schoolName: school.name,
          plan: school.plan,
          subscriptionStatus: school.subscriptionStatus ?? 'INACTIVE',
          subscriptionEndsAt: school.subscriptionEndsAt?.toISOString() ?? null,
          teacherId: user.teacherId,
          studentId: null,
          classId: null,
        },
      })
    }

    // ── STUDENT SIGNUP ──────────────────────────────────────
    if (role === 'STUDENT') {
      const { schoolId, classId } = body
      if (!schoolId || !classId) {
        return NextResponse.json(
          { error: 'School and class are required for student signup' },
          { status: 400 }
        )
      }

      const school = await prisma.school.findUnique({ where: { id: schoolId } })
      if (!school) {
        return NextResponse.json({ error: 'School not found' }, { status: 404 })
      }

      const classRecord = await prisma.class.findFirst({
        where: { id: classId, schoolId },
      })
      if (!classRecord) {
        return NextResponse.json({ error: 'Class not found' }, { status: 404 })
      }

      // Find or create student record
      let student = await prisma.student.findFirst({
        where: { schoolId, email },
      })

      if (student) {
        // Check if already linked
        const alreadyLinked = await prisma.user.findFirst({
          where: { studentId: student.id },
        })
        if (alreadyLinked) {
          return NextResponse.json(
            { error: 'This student account is already linked to another user' },
            { status: 409 }
          )
        }
      } else {
        student = await prisma.student.create({
          data: { schoolId, name, email, classId },
        })
      }

      const user = await prisma.user.create({
        data: {
          authId: `local_${crypto.randomUUID()}`,
          email,
          name,
          role: 'STUDENT',
          language: language || school.language || 'FR',
          schoolId,
          studentId: student.id,
        },
      })

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          language: user.language,
          avatarUrl: user.avatarUrl,
          schoolId: user.schoolId,
          schoolName: school.name,
          plan: school.plan,
          subscriptionStatus: school.subscriptionStatus ?? 'INACTIVE',
          subscriptionEndsAt: school.subscriptionEndsAt?.toISOString() ?? null,
          teacherId: null,
          studentId: user.studentId,
          classId: student.classId,
        },
      })
    }

    // ── ADMIN SIGNUP (default) ──────────────────────────────
    const { schoolName } = body
    if (!schoolName) {
      return NextResponse.json(
        { error: 'School name is required' },
        { status: 400 }
      )
    }

    const slug = slugify(schoolName) + '-' + Date.now().toString(36)

    const school = await prisma.school.create({
      data: {
        name: schoolName,
        slug,
        language: language || 'FR',
        plan: 'FREE',
        users: {
          create: {
            authId: `local_${crypto.randomUUID()}`,
            email,
            name,
            role: 'ADMIN',
            language: language || 'FR',
          },
        },
      },
      include: { users: true },
    })

    const user = school.users[0]

    // Seed default periods for the school
    const defaultPeriods = [
      { name: 'Period 1', startTime: '08:00', endTime: '09:00', order: 1, isBreak: false },
      { name: 'Period 2', startTime: '09:00', endTime: '10:00', order: 2, isBreak: false },
      { name: 'Break', startTime: '10:00', endTime: '10:15', order: 3, isBreak: true, breakLabel: 'Break' },
      { name: 'Period 3', startTime: '10:15', endTime: '11:15', order: 4, isBreak: false },
      { name: 'Period 4', startTime: '11:15', endTime: '12:15', order: 5, isBreak: false },
      { name: 'Lunch', startTime: '12:15', endTime: '13:15', order: 6, isBreak: true, breakLabel: 'Lunch' },
      { name: 'Period 5', startTime: '13:15', endTime: '14:15', order: 7, isBreak: false },
      { name: 'Period 6', startTime: '14:15', endTime: '15:15', order: 8, isBreak: false },
    ]

    for (const period of defaultPeriods) {
      await prisma.period.create({
        data: { ...period, schoolId: school.id },
      })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        language: user.language,
        avatarUrl: user.avatarUrl,
        schoolId: user.schoolId,
        schoolName: school.name,
        plan: school.plan,
        subscriptionStatus: 'INACTIVE',
        subscriptionEndsAt: null,
        teacherId: null,
        studentId: null,
        classId: null,
      },
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
