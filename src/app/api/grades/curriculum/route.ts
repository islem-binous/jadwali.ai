import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const gradeId = req.nextUrl.searchParams.get('gradeId')
    if (!gradeId) {
      return NextResponse.json({ error: 'Missing gradeId' }, { status: 400 })
    }

    const curriculum = await prisma.gradeCurriculum.findMany({
      where: { gradeId },
      include: { subject: true },
      orderBy: { subject: { name: 'asc' } },
    })

    return NextResponse.json(curriculum)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Bulk upsert: receives { gradeId, subjects: [{ subjectId, hoursPerWeek }] } */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { gradeId, subjects } = body as {
      gradeId: string
      subjects: { subjectId: string; hoursPerWeek: number }[]
    }

    if (!gradeId || !Array.isArray(subjects)) {
      return NextResponse.json({ error: 'gradeId and subjects array required' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // Remove existing entries for this grade
      await tx.gradeCurriculum.deleteMany({ where: { gradeId } })

      // Insert new entries
      for (const s of subjects) {
        if (s.hoursPerWeek > 0) {
          await tx.gradeCurriculum.create({
            data: { gradeId, subjectId: s.subjectId, hoursPerWeek: s.hoursPerWeek },
          })
        }
      }
    })

    const updated = await prisma.gradeCurriculum.findMany({
      where: { gradeId },
      include: { subject: true },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[GradeCurriculum POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
