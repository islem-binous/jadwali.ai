import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getPrisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  const prisma = await getPrisma()
  const url = new URL(request.url)
  const type = url.searchParams.get('type')

  switch (type) {
    case 'governorates': {
      const data = await prisma.governorate.findMany({ orderBy: { code: 'asc' } })
      return NextResponse.json({ data })
    }
    case 'tunisian-schools': {
      const search = url.searchParams.get('search') || ''
      const govCode = url.searchParams.get('governorateCode') || ''
      const where: any = {}
      if (search) {
        where.OR = [
          { nameAr: { contains: search } },
          { nameFr: { contains: search } },
          { code: { contains: search } },
        ]
      }
      if (govCode) where.governorateCode = govCode
      const data = await prisma.tunisianSchool.findMany({
        where,
        include: { governorate: { select: { nameAr: true, nameFr: true } } },
        orderBy: { code: 'asc' },
        take: 100,
      })
      return NextResponse.json({ data })
    }
    case 'grade-levels': {
      const data = await prisma.tunisianGradeLevel.findMany({ orderBy: { code: 'asc' } })
      return NextResponse.json({ data })
    }
    case 'tunisian-subjects': {
      const data = await prisma.tunisianSubject.findMany({
        include: { sessionType: { select: { nameEn: true, nameFr: true, nameAr: true } } },
        orderBy: { code: 'asc' },
      })
      return NextResponse.json({ data })
    }
    case 'session-types': {
      const data = await prisma.tunisianSessionType.findMany({ orderBy: { code: 'asc' } })
      return NextResponse.json({ data })
    }
    case 'teacher-grades': {
      const data = await prisma.tunisianTeacherGrade.findMany({ orderBy: { code: 'asc' } })
      return NextResponse.json({ data })
    }
    default: {
      // Return counts for overview
      const [governorates, tunisianSchools, gradeLevels, tunisianSubjects, sessionTypes, teacherGrades] = await Promise.all([
        prisma.governorate.count(),
        prisma.tunisianSchool.count(),
        prisma.tunisianGradeLevel.count(),
        prisma.tunisianSubject.count(),
        prisma.tunisianSessionType.count(),
        prisma.tunisianTeacherGrade.count(),
      ])
      return NextResponse.json({
        counts: { governorates, tunisianSchools, gradeLevels, tunisianSubjects, sessionTypes, teacherGrades },
      })
    }
  }
}
