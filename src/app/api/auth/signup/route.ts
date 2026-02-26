import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function authUserResponse(user: any, school: any, extra?: Record<string, any>) {
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
      teacherId: user.teacherId ?? null,
      studentId: user.studentId ?? null,
      staffId: user.staffId ?? null,
      classId: extra?.classId ?? null,
    },
  })
}

export async function POST(request: Request) {
  try {
    const prisma = await getPrisma()
    const body = await request.json()
    const { email, password, name, language, role, googleId } = body

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    if (!googleId && !password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    const authId = googleId ? `google_${googleId}` : `local_${crypto.randomUUID()}`

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // ── TEACHER SIGNUP ──────────────────────────────────────
    if (role === 'TEACHER') {
      const { schoolId, cin, matricule } = body
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

      // Match teacher by email OR by CIN+matricule
      const teacher = await prisma.teacher.findFirst({
        where: {
          schoolId,
          OR: [
            { email },
            ...(cin && matricule ? [{ cin, matricule }] : []),
          ],
        },
      })
      if (!teacher) {
        return NextResponse.json(
          { error: 'No teacher record found. Contact your school admin.' },
          { status: 404 }
        )
      }

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
          authId,
          email,
          name,
          role: 'TEACHER',
          language: language || school.language || 'FR',
          schoolId,
          teacherId: teacher.id,
        },
      })

      return authUserResponse(user, school)
    }

    // ── STUDENT SIGNUP ──────────────────────────────────────
    if (role === 'STUDENT') {
      const { schoolId, classId, matricule } = body
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

      // Find student by email or matricule
      let student = await prisma.student.findFirst({
        where: {
          schoolId,
          OR: [
            ...(email ? [{ email }] : []),
            ...(matricule ? [{ matricule }] : []),
          ],
        },
      })

      if (student) {
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
          data: { schoolId, name, email, classId, matricule: matricule || null },
        })
      }

      const user = await prisma.user.create({
        data: {
          authId,
          email,
          name,
          role: 'STUDENT',
          language: language || school.language || 'FR',
          schoolId,
          studentId: student.id,
        },
      })

      return authUserResponse(user, school, { classId: student.classId })
    }

    // ── STAFF SIGNUP ──────────────────────────────────────
    if (role === 'STAFF') {
      const { schoolId, cin, matricule } = body
      if (!schoolId || !cin || !matricule) {
        return NextResponse.json(
          { error: 'School, CIN, and matricule are required for staff signup' },
          { status: 400 }
        )
      }

      const school = await prisma.school.findUnique({ where: { id: schoolId } })
      if (!school) {
        return NextResponse.json({ error: 'School not found' }, { status: 404 })
      }

      // Find existing staff by CIN or matricule
      let staff = await prisma.staff.findFirst({
        where: {
          schoolId,
          OR: [{ cin }, { matricule }],
        },
      })

      if (staff) {
        const alreadyLinked = await prisma.user.findFirst({
          where: { staffId: staff.id },
        })
        if (alreadyLinked) {
          return NextResponse.json(
            { error: 'This staff account is already linked to another user' },
            { status: 409 }
          )
        }
      } else {
        staff = await prisma.staff.create({
          data: { schoolId, name, email, cin, matricule },
        })
      }

      const user = await prisma.user.create({
        data: {
          authId,
          email,
          name,
          role: 'STAFF',
          language: language || school.language || 'FR',
          schoolId,
          staffId: staff.id,
        },
      })

      return authUserResponse(user, school)
    }

    // ── ADMIN SIGNUP (school code required) ──────────────────
    if (role === 'ADMIN') {
      const { schoolId } = body
      if (!schoolId) {
        return NextResponse.json(
          { error: 'School is required for admin signup' },
          { status: 400 }
        )
      }

      const school = await prisma.school.findUnique({ where: { id: schoolId } })
      if (!school) {
        return NextResponse.json({ error: 'School not found' }, { status: 404 })
      }

      const user = await prisma.user.create({
        data: {
          authId,
          email,
          name,
          role: 'ADMIN',
          language: language || school.language || 'FR',
          schoolId,
        },
      })

      return authUserResponse(user, school)
    }

    // ── DIRECTOR SIGNUP (creates school) ──────────────────────
    const { schoolName, tunisianSchoolId } = body
    if (!schoolName) {
      return NextResponse.json(
        { error: 'School name is required' },
        { status: 400 }
      )
    }

    let tunisianSchool: any = null
    if (tunisianSchoolId) {
      tunisianSchool = await prisma.tunisianSchool.findUnique({
        where: { id: tunisianSchoolId },
      })
      if (!tunisianSchool) {
        return NextResponse.json(
          { error: 'Selected school not found in registry' },
          { status: 404 }
        )
      }
      const existingSchool = await prisma.school.findUnique({
        where: { tunisianSchoolId },
      })
      if (existingSchool) {
        return NextResponse.json(
          { error: 'This school is already registered' },
          { status: 409 }
        )
      }
    }

    const slug = tunisianSchool
      ? tunisianSchool.code
      : slugify(schoolName) + '-' + Date.now().toString(36)

    const school = await prisma.school.create({
      data: {
        name: schoolName,
        slug,
        language: language || 'FR',
        plan: 'FREE',
        tunisianSchoolId: tunisianSchoolId || null,
        users: {
          create: {
            authId,
            email,
            name,
            role: 'DIRECTOR',
            language: language || 'FR',
          },
        },
      },
      include: { users: true },
    })

    const user = school.users[0]

    // Seed default periods
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

    return authUserResponse(user, school)
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
