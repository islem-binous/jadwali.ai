import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const slug = req.nextUrl.searchParams.get('slug')
    const q = req.nextUrl.searchParams.get('q')?.trim()

    // Legacy exact-slug lookup (backward compat)
    if (slug) {
      const school = await prisma.school.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          classes: {
            select: { id: true, name: true, grade: true },
            orderBy: { name: 'asc' },
          },
          users: {
            where: { role: 'DIRECTOR' },
            select: { id: true },
          },
        },
      })

      if (!school) {
        return NextResponse.json({ error: 'School not found' }, { status: 404 })
      }

      const { users, ...rest } = school
      return NextResponse.json({ ...rest, hasDirector: users.length > 0 })
    }

    // Name/code search
    if (!q || q.length < 2) {
      return NextResponse.json({ error: 'Query too short' }, { status: 400 })
    }

    const schools = await prisma.school.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { slug: { contains: q } },
          { tunisianSchool: { code: { contains: q } } },
          { tunisianSchool: { nameAr: { contains: q } } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        classes: {
          select: { id: true, name: true, grade: true },
          orderBy: { name: 'asc' },
        },
        users: {
          where: { role: 'DIRECTOR' },
          select: { id: true },
        },
      },
      take: 20,
      orderBy: { name: 'asc' },
    })

    const results = schools.map(({ users, ...rest }) => ({
      ...rest,
      hasDirector: users.length > 0,
    }))

    return NextResponse.json(results)
  } catch (err) {
    console.error('[API Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
