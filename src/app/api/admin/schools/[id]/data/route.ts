import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getPrisma } from '@/lib/prisma'

// ─── Lookup helper: load FK dropdown options for edit modals ──
async function getLookups(prisma: any, schoolId: string, type: string) {
  switch (type) {
    case 'classes':
      return {
        grades: await prisma.grade.findMany({
          where: { schoolId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      }
    case 'students':
      return {
        classes: await prisma.class.findMany({
          where: { schoolId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      }
    case 'teachers':
      return {
        professionalGrades: await prisma.tunisianTeacherGrade.findMany({
          select: { id: true, nameEn: true, nameFr: true, nameAr: true },
          orderBy: { code: 'asc' },
        }),
      }
    case 'absences':
      return {
        teachers: await prisma.teacher.findMany({
          where: { schoolId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      }
    case 'student-absences':
      return {
        students: await prisma.student.findMany({
          where: { schoolId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      }
    case 'timetables':
      return {
        terms: await prisma.term.findMany({
          where: { schoolId },
          select: { id: true, name: true },
          orderBy: { startDate: 'desc' },
        }),
      }
    case 'leave-requests':
      return {
        teachers: await prisma.teacher.findMany({
          where: { schoolId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        leaveTypes: await prisma.leaveType.findMany({
          where: { schoolId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      }
    case 'exams':
      return {
        subjects: await prisma.subject.findMany({
          where: { schoolId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        classes: await prisma.class.findMany({
          where: { schoolId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        teachers: await prisma.teacher.findMany({
          where: { schoolId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        terms: await prisma.term.findMany({
          where: { schoolId },
          select: { id: true, name: true },
          orderBy: { startDate: 'desc' },
        }),
      }
    default:
      return {}
  }
}

// ─── GET: Fetch entity data + lookups for a school ────────────
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

  let data: any[] = []

  switch (type) {
    case 'teachers':
      data = await prisma.teacher.findMany({
        where: { schoolId: id },
        include: {
          user: { select: { email: true, isActive: true } },
          subjects: { include: { subject: { select: { name: true } } } },
          professionalGrade: { select: { nameEn: true, nameFr: true, nameAr: true } },
        },
        orderBy: { name: 'asc' },
      })
      break
    case 'students':
      data = await prisma.student.findMany({
        where: { schoolId: id },
        include: { class: { select: { name: true } } },
        orderBy: { name: 'asc' },
      })
      break
    case 'staff':
      data = await prisma.staff.findMany({
        where: { schoolId: id },
        include: { user: { select: { email: true, isActive: true } } },
        orderBy: { name: 'asc' },
      })
      break
    case 'users':
      data = await prisma.user.findMany({
        where: { schoolId: id },
        select: {
          id: true, authId: true, email: true, name: true, role: true,
          language: true, avatarUrl: true, phone: true, isActive: true,
          teacherId: true, studentId: true, staffId: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })
      break
    case 'classes':
      data = await prisma.class.findMany({
        where: { schoolId: id },
        include: {
          grade: { select: { name: true } },
          _count: { select: { students: true, lessons: true } },
        },
        orderBy: { name: 'asc' },
      })
      break
    case 'subjects':
      data = await prisma.subject.findMany({
        where: { schoolId: id },
        orderBy: { name: 'asc' },
      })
      break
    case 'rooms':
      data = await prisma.room.findMany({
        where: { schoolId: id },
        orderBy: { name: 'asc' },
      })
      break
    case 'periods':
      data = await prisma.period.findMany({
        where: { schoolId: id },
        orderBy: { order: 'asc' },
      })
      break
    case 'grades':
      data = await prisma.grade.findMany({
        where: { schoolId: id },
        include: { _count: { select: { classes: true } } },
        orderBy: { level: 'asc' },
      })
      break
    case 'timetables':
      data = await prisma.timetable.findMany({
        where: { schoolId: id },
        include: {
          term: { select: { name: true } },
          _count: { select: { lessons: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      break
    case 'absences':
      data = await prisma.absence.findMany({
        where: { schoolId: id },
        include: { teacher: { select: { name: true } } },
        orderBy: { date: 'desc' },
      })
      break
    case 'student-absences':
      data = await prisma.studentAbsence.findMany({
        where: { schoolId: id },
        include: { student: { select: { name: true, classId: true } } },
        orderBy: { date: 'desc' },
      })
      break
    case 'events':
      data = await prisma.schoolEvent.findMany({
        where: { schoolId: id },
        orderBy: { startDate: 'desc' },
      })
      break
    case 'terms':
      data = await prisma.term.findMany({
        where: { schoolId: id },
        include: { _count: { select: { timetables: true, exams: true } } },
        orderBy: { startDate: 'desc' },
      })
      break
    case 'leave-types':
      data = await prisma.leaveType.findMany({
        where: { schoolId: id },
        include: { _count: { select: { requests: true } } },
        orderBy: { name: 'asc' },
      })
      break
    case 'leave-requests':
      data = await prisma.leaveRequest.findMany({
        where: { schoolId: id },
        include: {
          teacher: { select: { name: true } },
          leaveType: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      break
    case 'payments':
      data = await prisma.payment.findMany({
        where: { schoolId: id },
        orderBy: { createdAt: 'desc' },
      })
      break
    case 'exams':
      data = await prisma.exam.findMany({
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
      break
    default:
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const lookups = await getLookups(prisma, id, type!)
  return NextResponse.json({ data, lookups })
}

// ─── PUT: Update entity within a school ───────────────────────
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  const prisma = await getPrisma()
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const body = await request.json()
  const { itemId, ...fields } = body

  if (!itemId) {
    return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
  }

  try {
    let updated: any
    switch (type) {
      case 'teachers':
        updated = await prisma.teacher.update({
          where: { id: itemId },
          data: {
            name: fields.name,
            email: fields.email || null,
            phone: fields.phone || null,
            matricule: fields.matricule || null,
            cin: fields.cin || null,
            sex: fields.sex || null,
            colorHex: fields.colorHex || '#22c55e',
            maxPeriodsPerDay: fields.maxPeriodsPerDay != null ? Number(fields.maxPeriodsPerDay) : undefined,
            maxPeriodsPerWeek: fields.maxPeriodsPerWeek != null ? Number(fields.maxPeriodsPerWeek) : undefined,
            professionalGradeId: fields.professionalGradeId || null,
            recruitmentDate: fields.recruitmentDate ? new Date(fields.recruitmentDate) : null,
            excludeFromCover: fields.excludeFromCover != null ? Boolean(fields.excludeFromCover) : undefined,
          },
        })
        break
      case 'students':
        updated = await prisma.student.update({
          where: { id: itemId },
          data: {
            name: fields.name,
            email: fields.email || null,
            phone: fields.phone || null,
            matricule: fields.matricule || null,
            sex: fields.sex || null,
            classId: fields.classId,
            birthDate: fields.birthDate ? new Date(fields.birthDate) : null,
          },
        })
        break
      case 'staff':
        updated = await prisma.staff.update({
          where: { id: itemId },
          data: {
            name: fields.name,
            email: fields.email || null,
            phone: fields.phone || null,
            cin: fields.cin || null,
            matricule: fields.matricule || null,
            staffTitle: fields.staffTitle || null,
          },
        })
        break
      case 'users':
        updated = await prisma.user.update({
          where: { id: itemId },
          data: {
            name: fields.name,
            email: fields.email,
            role: fields.role,
            language: fields.language,
            phone: fields.phone || null,
            isActive: fields.isActive != null ? Boolean(fields.isActive) : undefined,
          },
        })
        break
      case 'classes':
        updated = await prisma.class.update({
          where: { id: itemId },
          data: {
            name: fields.name,
            gradeId: fields.gradeId || null,
            capacity: fields.capacity != null ? Number(fields.capacity) : undefined,
            colorHex: fields.colorHex,
          },
        })
        break
      case 'subjects':
        updated = await prisma.subject.update({
          where: { id: itemId },
          data: {
            name: fields.name,
            nameAr: fields.nameAr || null,
            nameFr: fields.nameFr || null,
            colorHex: fields.colorHex,
            category: fields.category,
            pedagogicDay: fields.pedagogicDay != null ? Number(fields.pedagogicDay) : undefined,
          },
        })
        break
      case 'rooms':
        updated = await prisma.room.update({
          where: { id: itemId },
          data: {
            name: fields.name,
            building: fields.building || null,
            capacity: fields.capacity != null ? Number(fields.capacity) : undefined,
            type: fields.type,
          },
        })
        break
      case 'periods':
        updated = await prisma.period.update({
          where: { id: itemId },
          data: {
            name: fields.name,
            startTime: fields.startTime,
            endTime: fields.endTime,
            order: fields.order != null ? Number(fields.order) : undefined,
            isBreak: fields.isBreak != null ? Boolean(fields.isBreak) : undefined,
          },
        })
        break
      case 'grades':
        updated = await prisma.grade.update({
          where: { id: itemId },
          data: {
            name: fields.name,
            nameAr: fields.nameAr || null,
            nameFr: fields.nameFr || null,
            level: fields.level != null ? Number(fields.level) : undefined,
          },
        })
        break
      case 'timetables':
        updated = await prisma.timetable.update({
          where: { id: itemId },
          data: {
            name: fields.name,
            termId: fields.termId || null,
            status: fields.status,
            isActive: fields.isActive != null ? Boolean(fields.isActive) : undefined,
          },
        })
        break
      case 'absences':
        updated = await prisma.absence.update({
          where: { id: itemId },
          data: {
            teacherId: fields.teacherId,
            date: fields.date ? new Date(fields.date) : undefined,
            endDate: fields.endDate ? new Date(fields.endDate) : null,
            type: fields.type,
            status: fields.status,
            note: fields.note || null,
          },
        })
        break
      case 'student-absences':
        updated = await prisma.studentAbsence.update({
          where: { id: itemId },
          data: {
            studentId: fields.studentId,
            date: fields.date ? new Date(fields.date) : undefined,
            type: fields.type,
            reason: fields.reason || null,
            note: fields.note || null,
          },
        })
        break
      case 'events':
        updated = await prisma.schoolEvent.update({
          where: { id: itemId },
          data: {
            title: fields.title,
            type: fields.type,
            startDate: fields.startDate ? new Date(fields.startDate) : undefined,
            endDate: fields.endDate ? new Date(fields.endDate) : undefined,
            colorHex: fields.colorHex,
            description: fields.description || null,
          },
        })
        break
      case 'terms':
        updated = await prisma.term.update({
          where: { id: itemId },
          data: {
            name: fields.name,
            startDate: fields.startDate ? new Date(fields.startDate) : undefined,
            endDate: fields.endDate ? new Date(fields.endDate) : undefined,
          },
        })
        break
      case 'leave-types':
        updated = await prisma.leaveType.update({
          where: { id: itemId },
          data: {
            name: fields.name,
            maxDaysPerYear: fields.maxDaysPerYear != null ? Number(fields.maxDaysPerYear) : undefined,
            colorHex: fields.colorHex,
            requiresApproval: fields.requiresApproval != null ? Boolean(fields.requiresApproval) : undefined,
          },
        })
        break
      case 'leave-requests':
        updated = await prisma.leaveRequest.update({
          where: { id: itemId },
          data: {
            status: fields.status,
            reason: fields.reason || null,
          },
        })
        break
      case 'payments':
        updated = await prisma.payment.update({
          where: { id: itemId },
          data: { status: fields.status },
        })
        break
      case 'exams':
        updated = await prisma.exam.update({
          where: { id: itemId },
          data: {
            type: fields.type,
            date: fields.date ? new Date(fields.date) : null,
            coefficient: fields.coefficient != null ? Number(fields.coefficient) : undefined,
            maxScore: fields.maxScore != null ? Number(fields.maxScore) : undefined,
          },
        })
        break
      default:
        return NextResponse.json({ error: 'Invalid type for update' }, { status: 400 })
    }

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('[Admin Edit Error]', err)
    return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 })
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
          data: {
            schoolId, name: body.name, email: body.email || null,
            phone: body.phone || null, colorHex: body.colorHex || '#22c55e',
            maxPeriodsPerDay: body.maxPeriodsPerDay ? Number(body.maxPeriodsPerDay) : 6,
            maxPeriodsPerWeek: body.maxPeriodsPerWeek ? Number(body.maxPeriodsPerWeek) : 24,
            matricule: body.matricule || null, cin: body.cin || null, sex: body.sex || null,
            professionalGradeId: body.professionalGradeId || null,
            recruitmentDate: body.recruitmentDate ? new Date(body.recruitmentDate) : null,
            excludeFromCover: body.excludeFromCover || false,
          },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      case 'students': {
        const item = await prisma.student.create({
          data: {
            schoolId, name: body.name, email: body.email || null,
            phone: body.phone || null, classId: body.classId,
            matricule: body.matricule || null, sex: body.sex || null,
            birthDate: body.birthDate ? new Date(body.birthDate) : null,
          },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      case 'staff': {
        const item = await prisma.staff.create({
          data: {
            schoolId, name: body.name, email: body.email || null,
            phone: body.phone || null, cin: body.cin || null,
            matricule: body.matricule || null, staffTitle: body.staffTitle || null,
          },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      case 'classes': {
        const item = await prisma.class.create({
          data: {
            schoolId, name: body.name, gradeId: body.gradeId || null,
            capacity: body.capacity ? Number(body.capacity) : 30,
            colorHex: body.colorHex || '#4f6ef7',
          },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      case 'subjects': {
        const item = await prisma.subject.create({
          data: {
            schoolId, name: body.name, nameAr: body.nameAr || null,
            nameFr: body.nameFr || null, colorHex: body.colorHex || '#4f6ef7',
            category: body.category || 'OTHER',
            pedagogicDay: body.pedagogicDay ? Number(body.pedagogicDay) : 0,
          },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      case 'rooms': {
        const item = await prisma.room.create({
          data: {
            schoolId, name: body.name, building: body.building || null,
            capacity: body.capacity ? Number(body.capacity) : 30,
            type: body.type || 'CLASSROOM',
          },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      case 'periods': {
        const item = await prisma.period.create({
          data: {
            schoolId, name: body.name, startTime: body.startTime,
            endTime: body.endTime, order: body.order ? Number(body.order) : 1,
            isBreak: body.isBreak || false, breakLabel: body.breakLabel || null,
          },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      case 'grades': {
        const item = await prisma.grade.create({
          data: {
            schoolId, name: body.name, nameAr: body.nameAr || null,
            nameFr: body.nameFr || null, level: body.level ? Number(body.level) : 1,
          },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      case 'terms': {
        const item = await prisma.term.create({
          data: {
            schoolId, name: body.name,
            startDate: new Date(body.startDate), endDate: new Date(body.endDate),
          },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      case 'events': {
        const item = await prisma.schoolEvent.create({
          data: {
            schoolId, title: body.title, type: body.type || 'OTHER',
            startDate: new Date(body.startDate), endDate: new Date(body.endDate),
            colorHex: body.colorHex || '#4f6ef7', description: body.description || null,
          },
        })
        return NextResponse.json({ item }, { status: 201 })
      }
      case 'leave-types': {
        const item = await prisma.leaveType.create({
          data: {
            schoolId, name: body.name,
            maxDaysPerYear: body.maxDaysPerYear ? Number(body.maxDaysPerYear) : 12,
            colorHex: body.colorHex || '#F59E0B',
            requiresApproval: body.requiresApproval ?? true,
          },
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
