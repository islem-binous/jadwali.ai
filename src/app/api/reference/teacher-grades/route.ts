import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export async function GET() {
  try {
    const prisma = await getPrisma()
    const grades = await prisma.tunisianTeacherGrade.findMany({
      orderBy: { code: 'asc' },
    })
    return NextResponse.json(grades)
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string }
    if (
      err?.message?.includes('no such table') ||
      err?.message?.includes('D1_ERROR') ||
      err?.code === 'P2021'
    ) {
      return NextResponse.json([])
    }
    console.error('Teacher grades reference error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
