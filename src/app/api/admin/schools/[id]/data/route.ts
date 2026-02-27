import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getPrisma } from '@/lib/prisma'

// ─── GET: Fetch entity data for a school ─────────────────────
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  const { id } = await params
  const prisma = await getPrisma()
  const url = new URL(request.url)
  const type = url.searchParams.get('type')

  const school = await prisma.school.findUnique({ where: { id } })
  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  switch (type) {
    case 'teachers': {
      const data = await prisma.teacher.findMany({
        where: { schoolId: id },
        include: {
          user: { select: { email: true, isActive: true } },
          subjects: { include: { subject: { select: { name: true } } } },
          professionalGrade: { select: { nameEn: true, nameFr: true, nameAr: true } },
        },
        orderBy: { name: 'asc' },
      })
      return NextResponse.json({ data })
    }
    case 'students': {
      const data = await prisma.student.findMany({
        where: { schoolId: id },
        include: { class: { select: { name: true } } },
        orderBy: { name: 'asc' },
      })
      return NextResponse.json({ data })
    }
    case 'staff': {
      const data = await prisma.staff.findMany({
        where: { schoolId: id },
        include: { user: { select: { email: true, isActive: true } } },
        orderBy: { name: 'asc' },
      })
      return NextResponse.json({ data })
    }
    case 'users': {
      const data = await prisma.user.findMany({
        where: { schoolId: id },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ data })
    }
    case 'classes': {
      const data = await prisma.class.findMany({
        where: { schoolId: id },
        include: {
          grade: { select: { name: true } },
          _count: { select: { students: true, lessons: true } },
        },
        orderBy: { name: 'asc' },
      })
      return NextResponse.json({ data })
    }
    case 'subjects': {
      const data = await prisma.subject.findMany({
        where: { schoolId: id },
        orderBy: { name: 'asc' },
      })
      return NextResponse.json({ data })
    }
    case 'rooms': {
      const data = await prisma.room.findMany({
        where: { schoolId: id },
        orderBy: { name: 'asc' },
      })
      return NextResponse.json({ data })
    }
    case 'periods': {
      const data = await prisma.period.findMany({
        where: { schoolId: id },
        orderBy: { order: 'asc' },
      })
      return NextResponse.json({ data })
    }
    case 'grades': {
      const data = await prisma.grade.findMany({
        where: { schoolId: id },
        include: { _count: { select: { classes: true } } },
        orderBy: { level: 'asc' },
      })
      return NextResponse.json({ data })
    }
    case 'timetables': {
      const data = await prisma.timetable.findMany({
        where: { schoolId: id },
        include: {
          term: { select: { name: true } },
          _count: { select: { lessons: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ data })
    }
    case 'absences': {
      const data = await prisma.absence.findMany({
        where: { schoolId: id },
        include: { teacher: { select: { name: true } } },
        orderBy: { date: 'desc' },
      })
      return NextResponse.json({ data })
    }
    case 'student-absences': {
      const data = await prisma.studentAbsence.findMany({
        where: { schoolId: id },
        include: { student: { select: { name: true, classId: true } } },
        orderBy: { date: 'desc' },
      })
      return NextResponse.json({ data })
    }
    case 'events': {
      const data = await prisma.schoolEvent.findMany({
        where: { schoolId: id },
        orderBy: { startDate: 'desc' },
      })
      return NextResponse.json({ data })
    }
    case 'terms': {
      const data = await prisma.term.findMany({
        where: { schoolId: id },
        include: { _count: { select: { timetables: true, exams: true } } },
        orderBy: { startDate: 'desc' },
      })
      return NextResponse.json({ data })
    }
    case 'leave-types': {
      const data = await prisma.leaveType.findMany({
        where: { schoolId: id },
        include: { _count: { select: { requests: true } } },
        orderBy: { name: 'asc' },
      })
      return NextResponse.json({ data })
    }
    case 'leave-requests': {
      const data = await prisma.leaveRequest.findMany({
        where: { schoolId: id },
        include: {
          teacher: { select: { name: true } },
          leaveType: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ data })
    }
    case 'payments': {
      const data = await prisma.payment.findMany({
        where: { schoolId: id },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ data })
    }
    case 'exams': {
      const data = await prisma.exam.findMany({
        where: { schoolId: id },
        include: {
          subject: { select: { name: true } },
          class: { select: { name: true } },
          teacher: { select: { name: true } },
          term: { select: { name: true } },
          _count: { select: { marks: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ data })
    }
    default:
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
}

// ─── POST: Create entity within a school ─────────────────────
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  const { id: schoolId } = await params
  const prisma = await getPrisma()
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const body = await request.json()

  const school = await prisma.school.findUnique({ where: { id: schoolId } })
  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  try {
    switch (type) {
      case 'teachers': {
        const item = await prisma.teacher.create({
          data: { schoolId, name: body.name, email: body.email || null, phone: body.phone || null, colorHex: body.colorHex || '#22c55e', maxPeriodsPerDay: body.maxPeriodsPerDay || 6, maxPeriodsPerWeek: body.maxPeriodsPerWeek || 24 },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      case 'students': {
        const item = await prisma.student.create({
          data: { schoolId, name: body.name, email: body.email || null, classId: body.classId, matricule: body.matricule || null, sex: body.sex || null },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      case 'staff': {
        const item = await prisma.staff.create({
          data: { schoolId, name: body.name, email: body.email || null, phone: body.phone || null, cin: body.cin || null, matricule: body.matricule || null, staffTitle: body.staffTitle || null },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      case 'classes': {
        const item = await prisma.class.create({
          data: { schoolId, name: body.name, gradeId: body.gradeId || null, capacity: body.capacity || 30, colorHex: body.colorHex || '#4f6ef7' },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      case 'subjects': {
        const item = await prisma.subject.create({
          data: { schoolId, name: body.name, nameAr: body.nameAr || null, nameFr: body.nameFr || null, colorHex: body.colorHex || '#4f6ef7', category: body.category || 'OTHER', pedagogicDay: body.pedagogicDay || 0 },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      case 'rooms': {
        const item = await prisma.room.create({
          data: { schoolId, name: body.name, building: body.building || null, capacity: body.capacity || 30, type: body.type || 'CLASSROOM' },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      case 'periods': {
        const item = await prisma.period.create({
          data: { schoolId, name: body.name, startTime: body.startTime, endTime: body.endTime, order: body.order || 1, isBreak: body.isBreak || false, breakLabel: body.breakLabel || null },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      case 'grades': {
        const item = await prisma.grade.create({
          data: { schoolId, name: body.name, nameAr: body.nameAr || null, nameFr: body.nameFr || null, level: body.level || 1 },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      case 'terms': {
        const item = await prisma.term.create({
          data: { schoolId, name: body.name, startDate: new Date(body.startDate), endDate: new Date(body.endDate) },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      case 'events': {
        const item = await prisma.schoolEvent.create({
          data: { schoolId, title: body.title, type: body.type || 'OTHER', startDate: new Date(body.startDate), endDate: new Date(body.endDate), colorHex: body.colorHex || '#4f6ef7' },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      case 'leave-types': {
        const item = await prisma.leaveType.create({
          data: { schoolId, name: body.name, maxDaysPerYear: body.maxDaysPerYear || 12, colorHex: body.colorHex || '#F59E0B', requiresApproval: body.requiresApproval ?? true },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      default:
        return NextResponse.json({ error: 'Cannot create this entity type' }, { status: 400 })
    }
  } catch (err: any) {
    console.error('[Admin CRUD Error]', err)
    return NextResponse.json({ error: err.message || 'Create failed' }, { status: 500 })
  }
}

// ─── DELETE: Delete entity within a school ────────────────────
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  const { id: schoolId } = await params
  const prisma = await getPrisma()
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const itemId = url.searchParams.get('itemId')

  if (!itemId) {
    return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
  }

  try {
    switch (type) {
      case 'teachers':
        await prisma.teacher.delete({ where: { id: itemId } })
        break
      case 'students':
        await prisma.student.delete({ where: { id: itemId } })
        break
      case 'staff':
        await prisma.staff.delete({ where: { id: itemId } })
        break
      case 'users':
        await prisma.user.delete({ where: { id: itemId } })
        break
      case 'classes':
        await prisma.class.delete({ where: { id: itemId } })
        break
      case 'subjects':
        await prisma.subject.delete({ where: { id: itemId } })
        break
      case 'rooms':
        await prisma.room.delete({ where: { id: itemId } })
        break
      case 'periods':
        await prisma.period.delete({ where: { id: itemId } })
        break
      case 'grades':
        await prisma.grade.delete({ where: { id: itemId } })
        break
      case 'timetables':
        await prisma.timetable.delete({ where: { id: itemId } })
        break
      case 'absences':
        await prisma.absence.delete({ where: { id: itemId } })
        break
      case 'student-absences':
        await prisma.studentAbsence.delete({ where: { id: itemId } })
        break
      case 'events':
        await prisma.schoolEvent.delete({ where: { id: itemId } })
        break
      case 'terms':
        await prisma.term.delete({ where: { id: itemId } })
        break
      case 'leave-types':
        await prisma.leaveType.delete({ where: { id: itemId } })
        break
      case 'leave-requests':
        await prisma.leaveRequest.delete({ where: { id: itemId } })
        break
      case 'payments':
        await prisma.payment.delete({ where: { id: itemId } })
        break
      case 'exams':
        await prisma.exam.delete({ where: { id: itemId } })
        break
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Admin Delete Error]', err)
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 })
  }
}
