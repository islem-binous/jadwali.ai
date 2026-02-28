import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getPrisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  const { id } = await params
  const prisma = await getPrisma()

  const school = await prisma.school.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          users: true,
          teachers: true,
          classes: true,
          subjects: true,
          rooms: true,
          payments: true,
          staffMembers: true,
        },
      },
    },
  })

  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  return NextResponse.json({ school })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  const { id } = await params
  const prisma = await getPrisma()
  const body = await request.json()

  const school = await prisma.school.findUnique({ where: { id } })
  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  const updated = await prisma.school.update({
    where: { id },
    data: {
      name: body.name ?? school.name,
      slug: body.slug ?? school.slug,
      language: body.language ?? school.language,
      plan: body.plan ?? school.plan,
      subscriptionStatus: body.subscriptionStatus ?? school.subscriptionStatus,
      subscriptionEndsAt: body.subscriptionEndsAt ? new Date(body.subscriptionEndsAt) : school.subscriptionEndsAt,
    },
  })

  return NextResponse.json({ school: updated })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  const { id } = await params
  const prisma = await getPrisma()

  const school = await prisma.school.findUnique({ where: { id } })
  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  // Cascade-delete all school-owned data (not reference data like TunisianSchool).
  // Order: deepest children first → parents last.
  const sw = { schoolId: id }

  // Deep child records
  await prisma.classAuthorization.deleteMany({ where: sw })
  await prisma.studentNote.deleteMany({ where: sw })
  await prisma.studentAbsence.deleteMany({ where: sw })
  await prisma.exam.deleteMany({ where: sw })   // ExamMark cascades via onDelete
  await prisma.leaveRequest.deleteMany({ where: sw })
  await prisma.leaveType.deleteMany({ where: sw })
  await prisma.schoolEvent.deleteMany({ where: sw })
  await prisma.payment.deleteMany({ where: sw })

  // Lessons (no schoolId — linked via timetableId)
  const timetableIds = (await prisma.timetable.findMany({ where: sw, select: { id: true } })).map(t => t.id)
  if (timetableIds.length > 0) {
    await prisma.lesson.deleteMany({ where: { timetableId: { in: timetableIds } } })
  }

  await prisma.absence.deleteMany({ where: sw })
  await prisma.timetable.deleteMany({ where: sw })

  // Teacher child records (no schoolId — linked via teacherId)
  const teacherIds = (await prisma.teacher.findMany({ where: sw, select: { id: true } })).map(t => t.id)
  if (teacherIds.length > 0) {
    await prisma.teacherSubject.deleteMany({ where: { teacherId: { in: teacherIds } } })
    await prisma.teacherAvailability.deleteMany({ where: { teacherId: { in: teacherIds } } })
  }

  // Grade child records (no schoolId — linked via gradeId)
  const gradeIds = (await prisma.grade.findMany({ where: sw, select: { id: true } })).map(g => g.id)
  if (gradeIds.length > 0) {
    await prisma.gradeCurriculum.deleteMany({ where: { gradeId: { in: gradeIds } } })
    await prisma.teacherGrade.deleteMany({ where: { gradeId: { in: gradeIds } } })
  }

  // Core school records
  await prisma.student.deleteMany({ where: sw })
  await prisma.staff.deleteMany({ where: sw })
  await prisma.teacher.deleteMany({ where: sw })
  await prisma.subject.deleteMany({ where: sw })
  await prisma.room.deleteMany({ where: sw })
  await prisma.period.deleteMany({ where: sw })
  await prisma.term.deleteMany({ where: sw })
  await prisma.grade.deleteMany({ where: sw })
  await prisma.class.deleteMany({ where: sw })

  // Users and sessions
  await prisma.session.deleteMany({ where: { user: { schoolId: id } } })
  await prisma.user.deleteMany({ where: { schoolId: id } })

  // Unlink from TunisianSchool (keep reference data intact) then delete school
  await prisma.school.update({ where: { id }, data: { tunisianSchoolId: null } })
  await prisma.school.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
