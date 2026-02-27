import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requireSchoolAccess } from '@/lib/auth/require-auth'

export async function GET(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const gradeId = req.nextUrl.searchParams.get('gradeId')
    const schoolId = req.nextUrl.searchParams.get('schoolId')
    if (!gradeId) {
      return NextResponse.json({ error: 'Missing gradeId' }, { status: 400 })
    }

    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError

    const teachers = await prisma.teacherGrade.findMany({
      where: { gradeId },
      include: { teacher: true },
    })

    return NextResponse.json(teachers)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Bulk set: receives { gradeId, teacherIds: string[] } */
export async function POST(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const body = await req.json()
    const { gradeId, teacherIds } = body as { gradeId: string; teacherIds: string[] }

    const { error: authError } = await requireSchoolAccess(req, body.schoolId)
    if (authError) return authError

    if (!gradeId || !Array.isArray(teacherIds)) {
      return NextResponse.json({ error: 'gradeId and teacherIds array required' }, { status: 400 })
    }

    // D1 doesn't support interactive transactions — use sequential ops
    await prisma.teacherGrade.deleteMany({ where: { gradeId } })
    for (const teacherId of teacherIds) {
      await prisma.teacherGrade.create({ data: { gradeId, teacherId } })
    }

    const updated = await prisma.teacherGrade.findMany({
      where: { gradeId },
      include: { teacher: true },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[TeacherGrade POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
