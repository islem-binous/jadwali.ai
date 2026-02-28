import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/password'
import { createSession, setSessionCookie } from '@/lib/auth/session'
import { getAppSettings } from '@/lib/app-settings'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function authUserResponse(user: any, school: any, token: string, extra?: Record<string, any>) {
  const response = NextResponse.json({
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
  return setSessionCookie(response, token)
}

export async function POST(request: Request) {
  try {
    // Enforce platform settings
    const settings = await getAppSettings()
    if (!settings.registrationEnabled) {
      return NextResponse.json(
        { error: 'Registration is currently disabled' },
        { status: 403 }
      )
    }

    const prisma = await getPrisma()
    const body = await request.json()
    const { email, password, name, language, role } = body

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    const minPwdLen = settings.passwordMinLength || 8
    if (password.length < minPwdLen) {
      return NextResponse.json(
        { error: `Password must be at least ${minPwdLen} characters` },
        { status: 400 }
      )
    }

    // Enforce max schools limit for new school creation (DIRECTOR signup)
    if (!role || role === 'DIRECTOR') {
      if (settings.maxSchools > 0) {
        const schoolCount = await prisma.school.count()
        if (schoolCount >= settings.maxSchools) {
          return NextResponse.json(
            { error: 'Maximum number of schools reached' },
            { status: 403 }
          )
        }
      }
    }

    const authId = `local_${crypto.randomUUID()}`
    const passwordHash = await hashPassword(password)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Helper: resolve school from schoolId or auto-create from tunisianSchoolId
    async function resolveSchool(schoolId?: string, tunisianSchoolId?: string) {
      if (schoolId) {
        const school = await prisma.school.findUnique({ where: { id: schoolId } })
        return school
      }
      if (tunisianSchoolId) {
        // Check if a school was already created for this TunisianSchool
        const existing = await prisma.school.findFirst({ where: { tunisianSchoolId } })
        if (existing) return existing

        // Auto-create school from TunisianSchool registry
        const ts = await prisma.tunisianSchool.findUnique({ where: { id: tunisianSchoolId } })
        if (!ts) return null

        const school = await prisma.school.create({
          data: {
            name: ts.nameAr,
            slug: ts.code,
            language: language || 'FR',
            plan: 'FREE',
            tunisianSchoolId: ts.id,
          },
        })

        // Seed default periods for the new school
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
          await prisma.period.create({ data: { ...period, schoolId: school.id } })
        }

        return school
      }
      return null
    }

    // ── TEACHER SIGNUP ──────────────────────────────────────
    if (role === 'TEACHER') {
      const { schoolId, tunisianSchoolId, cin, matricule } = body
      if (!schoolId && !tunisianSchoolId) {
        return NextResponse.json(
          { error: 'School is required for teacher signup' },
          { status: 400 }
        )
      }

      const school = await resolveSchool(schoolId, tunisianSchoolId)
      if (!school) {
        return NextResponse.json({ error: 'School not found' }, { status: 404 })
      }

      // Match teacher by email OR by CIN+matricule
      let teacher = await prisma.teacher.findFirst({
        where: {
          schoolId: school.id,
          OR: [
            { email },
            ...(cin && matricule ? [{ cin, matricule }] : []),
          ],
        },
      })

      if (teacher) {
        const alreadyLinked = await prisma.user.findFirst({
          where: { teacherId: teacher.id },
        })
        if (alreadyLinked) {
          return NextResponse.json(
            { error: 'This teacher account is already linked to another user' },
            { status: 409 }
          )
        }
      } else {
        // No matching teacher record — create one (school may be newly created)
        teacher = await prisma.teacher.create({
          data: { schoolId: school.id, name, email, cin: cin || null, matricule: matricule || null },
        })
      }

      const user = await prisma.user.create({
        data: {
          authId,
          email,
          name,
          passwordHash,
          role: 'TEACHER',
          language: language || school.language || 'FR',
          schoolId: school.id,
          teacherId: teacher.id,
        },
      })

      const token = await createSession(user.id)
      return authUserResponse(user, school, token)
    }

    // ── STUDENT SIGNUP ──────────────────────────────────────
    if (role === 'STUDENT') {
      const { schoolId, tunisianSchoolId, classId, matricule } = body
      if (!schoolId && !tunisianSchoolId) {
        return NextResponse.json(
          { error: 'School is required for student signup' },
          { status: 400 }
        )
      }

      const school = await resolveSchool(schoolId, tunisianSchoolId)
      if (!school) {
        return NextResponse.json({ error: 'School not found' }, { status: 404 })
      }

      // Validate class if provided
      let validClassId = classId || null
      if (classId) {
        const classRecord = await prisma.class.findFirst({
          where: { id: classId, schoolId: school.id },
        })
        if (!classRecord) {
          return NextResponse.json({ error: 'Class not found' }, { status: 404 })
        }
      }

      // Find student by email or matricule
      let student = await prisma.student.findFirst({
        where: {
          schoolId: school.id,
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
          data: { schoolId: school.id, name, email, classId: validClassId, matricule: matricule || null },
        })
      }

      const user = await prisma.user.create({
        data: {
          authId,
          email,
          name,
          passwordHash,
          role: 'STUDENT',
          language: language || school.language || 'FR',
          schoolId: school.id,
          studentId: student.id,
        },
      })

      const token = await createSession(user.id)
      return authUserResponse(user, school, token, { classId: student.classId })
    }

    // ── STAFF SIGNUP ──────────────────────────────────────
    if (role === 'STAFF') {
      const { schoolId, tunisianSchoolId, cin, matricule } = body
      if ((!schoolId && !tunisianSchoolId) || !cin || !matricule) {
        return NextResponse.json(
          { error: 'School, CIN, and matricule are required for staff signup' },
          { status: 400 }
        )
      }

      const school = await resolveSchool(schoolId, tunisianSchoolId)
      if (!school) {
        return NextResponse.json({ error: 'School not found' }, { status: 404 })
      }

      // Find existing staff by CIN or matricule
      let staff = await prisma.staff.findFirst({
        where: {
          schoolId: school.id,
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
          data: { schoolId: school.id, name, email, cin, matricule },
        })
      }

      const user = await prisma.user.create({
        data: {
          authId,
          email,
          name,
          passwordHash,
          role: 'STAFF',
          language: language || school.language || 'FR',
          schoolId: school.id,
          staffId: staff.id,
        },
      })

      const token = await createSession(user.id)
      return authUserResponse(user, school, token)
    }

    // ── ADMIN SIGNUP (school code required) ──────────────────
    if (role === 'ADMIN') {
      const { schoolId, tunisianSchoolId } = body
      if (!schoolId && !tunisianSchoolId) {
        return NextResponse.json(
          { error: 'School is required for admin signup' },
          { status: 400 }
        )
      }

      const school = await resolveSchool(schoolId, tunisianSchoolId)
      if (!school) {
        return NextResponse.json({ error: 'School not found' }, { status: 404 })
      }

      const user = await prisma.user.create({
        data: {
          authId,
          email,
          name,
          passwordHash,
          role: 'ADMIN',
          language: language || school.language || 'FR',
          schoolId: school.id,
        },
      })

      const token = await createSession(user.id)
      return authUserResponse(user, school, token)
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
      // Check if a school already exists for this TunisianSchool
      const existingSchool = await prisma.school.findFirst({
        where: { tunisianSchoolId },
        include: { users: { where: { role: 'DIRECTOR' } } },
      })
      if (existingSchool) {
        // School already has a director — block
        if (existingSchool.users.length > 0) {
          return NextResponse.json(
            { error: 'This school is already registered' },
            { status: 409 }
          )
        }
        // School exists but was auto-created without a director — claim it
        await prisma.user.create({
          data: {
            authId,
            email,
            name,
            passwordHash,
            role: 'DIRECTOR',
            isActive: false,
            language: language || existingSchool.language || 'FR',
            schoolId: existingSchool.id,
          },
        })
        // Director accounts require admin activation — no session created
        return NextResponse.json({ pendingActivation: true })
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
            passwordHash,
            role: 'DIRECTOR',
            isActive: false,
            language: language || 'FR',
          },
        },
      },
    })

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

    // Director accounts require admin activation — no session created
    return NextResponse.json({ pendingActivation: true })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
