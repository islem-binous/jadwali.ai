import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const gradeId = req.nextUrl.searchParams.get('gradeId')
    if (!gradeId) {
      return NextResponse.json({ error: 'Missing gradeId' }, { status: 400 })
    }

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
    const body = await req.json()
    const { gradeId, teacherIds } = body as { gradeId: string; teacherIds: string[] }

    if (!gradeId || !Array.isArray(teacherIds)) {
      return NextResponse.json({ error: 'gradeId and teacherIds array required' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // Remove existing entries for this grade
      await tx.teacherGrade.deleteMany({ where: { gradeId } })

      // Insert new entries
      for (const teacherId of teacherIds) {
        await tx.teacherGrade.create({ data: { gradeId, teacherId } })
      }
    })

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
