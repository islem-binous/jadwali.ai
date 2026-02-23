import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get('schoolId')

  if (!schoolId) {
    return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
  }

  try {
    const payments = await prisma.payment.findMany({
      where: { schoolId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({ payments })
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
