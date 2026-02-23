import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get('schoolId')
  if (!schoolId) {
    return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
  }

  try {
    const users = await prisma.user.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(users)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, name, role, phone, schoolId, teacherId, classId } = body

    if (!email || !name || !schoolId) {
      return NextResponse.json(
        { error: 'email, name, and schoolId are required' },
        { status: 400 }
      )
    }

    let linkedTeacherId: string | undefined
    let linkedStudentId: string | undefined

    // Link to Teacher record
    if (role === 'TEACHER' && teacherId) {
      linkedTeacherId = teacherId
    }

    // Link to Student record (create if needed)
    if (role === 'STUDENT' && classId) {
      let student = await prisma.student.findFirst({
        where: { email, schoolId },
      })
      if (!student) {
        student = await prisma.student.create({
          data: { name, email, schoolId, classId },
        })
      }
      linkedStudentId = student.id
    }

    const user = await prisma.user.create({
      data: {
        authId: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        email,
        name,
        role: role || 'TEACHER',
        phone: phone || null,
        schoolId,
        isActive: true,
        ...(linkedTeacherId ? { teacherId: linkedTeacherId } : {}),
        ...(linkedStudentId ? { studentId: linkedStudentId } : {}),
      },
    })
    return NextResponse.json(user)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, role, isActive, name, email, phone } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (role !== undefined) data.role = role
    if (isActive !== undefined) data.isActive = isActive
    if (name !== undefined) data.name = name
    if (email !== undefined) data.email = email
    if (phone !== undefined) data.phone = phone

    const user = await prisma.user.update({
      where: { id },
      data,
    })
    return NextResponse.json(user)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  try {
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
