import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requireAuth, requireSchoolAccess } from '@/lib/auth/require-auth'

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get('schoolId')
  if (!schoolId) {
    return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
  }

  const { error: authError } = await requireSchoolAccess(req, schoolId)
  if (authError) return authError

  const classId = req.nextUrl.searchParams.get('classId')
  const search = req.nextUrl.searchParams.get('search')

  try {
    const prisma = await getPrisma()

    const where: Record<string, unknown> = { schoolId }

    if (classId) {
      where.classId = classId
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { matricule: { contains: search, mode: 'insensitive' } },
      ]
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        class: { select: { id: true, name: true, grade: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(students)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const body = await req.json()
    const { schoolId, name, email, phone, matricule, sex, birthDate, classId } = body

    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    if (!schoolId || !name || !classId) {
      return NextResponse.json(
        { error: 'Missing required fields: schoolId, name, classId' },
        { status: 400 }
      )
    }

    const student = await prisma.student.create({
      data: {
        schoolId,
        name,
        email: email || null,
        phone: phone || null,
        matricule: matricule || null,
        sex: sex || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        classId,
      },
      include: {
        class: { select: { id: true, name: true, grade: true } },
      },
    })

    return NextResponse.json(student)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { error: authError } = await requireAuth(req)
    if (authError) return authError

    const prisma = await getPrisma()
    const body = await req.json()
    const { id, name, email, phone, matricule, sex, birthDate, classId } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing student id' }, { status: 400 })
    }

    const student = await prisma.student.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(matricule !== undefined && { matricule: matricule || null }),
        ...(sex !== undefined && { sex: sex || null }),
        ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
        ...(classId !== undefined && { classId }),
      },
      include: {
        class: { select: { id: true, name: true, grade: true } },
      },
    })

    return NextResponse.json(student)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { error: authError } = await requireAuth(req)
  if (authError) return authError

  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  try {
    const prisma = await getPrisma()

    await prisma.$transaction([
      prisma.studentAbsence.deleteMany({ where: { studentId: id } }),
      prisma.examMark.deleteMany({ where: { studentId: id } }),
      prisma.studentNote.deleteMany({ where: { studentId: id } }),
      prisma.classAuthorization.deleteMany({ where: { studentId: id } }),
      prisma.user.updateMany({ where: { studentId: id }, data: { studentId: null } }),
      prisma.student.delete({ where: { id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
