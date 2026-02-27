import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getPrisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
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
      const page = parseInt(url.searchParams.get('page') || '1')
      const limit = parseInt(url.searchParams.get('limit') || '50')
      const where: any = {}
      if (search) {
        where.OR = [
          { nameAr: { contains: search } },
          { nameFr: { contains: search } },
          { code: { contains: search } },
        ]
      }
      if (govCode) where.governorateCode = govCode
      const [data, total] = await Promise.all([
        prisma.tunisianSchool.findMany({
          where,
          orderBy: { code: 'asc' },
          take: limit,
          skip: (page - 1) * limit,
        }),
        prisma.tunisianSchool.count({ where }),
      ])
      return NextResponse.json({ data, total, page, limit })
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

export async function PUT(request: NextRequest) {
  const { error } = await requireSuperAdmin(request)
  if (error) return error

  try {
    const body = await request.json()
    const { type, id, ...fields } = body

    if (!type || !id) {
      return NextResponse.json({ error: 'Missing type or id' }, { status: 400 })
    }

    const prisma = await getPrisma()

    // Build data object from allowed fields per type
    const data: Record<string, unknown> = {}

    switch (type) {
      case 'governorates': {
        for (const k of ['code', 'nameAr', 'nameFr', 'nameEn']) {
          if (k in fields) data[k] = fields[k]
        }
        const updated = await prisma.governorate.update({ where: { id }, data })
        return NextResponse.json(updated)
      }
      case 'tunisian-schools': {
        for (const k of ['code', 'nameAr', 'nameFr', 'nameEn', 'governorateCode', 'zipCode']) {
          if (k in fields) data[k] = fields[k]
        }
        const updated = await prisma.tunisianSchool.update({ where: { id }, data })
        return NextResponse.json(updated)
      }
      case 'grade-levels': {
        for (const k of ['code', 'nameAr', 'nameFr', 'nameEn']) {
          if (k in fields) data[k] = fields[k]
        }
        const updated = await prisma.tunisianGradeLevel.update({ where: { id }, data })
        return NextResponse.json(updated)
      }
      case 'tunisian-subjects': {
        for (const k of ['code', 'nameAr', 'nameFr', 'nameEn', 'sessionTypeCode', 'pedagogicDay']) {
          if (k in fields) data[k] = fields[k]
        }
        // Ensure numeric fields
        if ('sessionTypeCode' in data) data.sessionTypeCode = Number(data.sessionTypeCode)
        if ('pedagogicDay' in data) data.pedagogicDay = Number(data.pedagogicDay)
        const updated = await prisma.tunisianSubject.update({ where: { id }, data })
        return NextResponse.json(updated)
      }
      case 'session-types': {
        for (const k of ['code', 'nameAr', 'nameFr', 'nameEn']) {
          if (k in fields) data[k] = fields[k]
        }
        if ('code' in data) data.code = Number(data.code)
        const updated = await prisma.tunisianSessionType.update({ where: { id }, data })
        return NextResponse.json(updated)
      }
      case 'teacher-grades': {
        for (const k of ['code', 'nameAr', 'nameFr', 'nameEn']) {
          if (k in fields) data[k] = fields[k]
        }
        if ('code' in data) data.code = Number(data.code)
        const updated = await prisma.tunisianTeacherGrade.update({ where: { id }, data })
        return NextResponse.json(updated)
      }
      default:
        return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
    }
  } catch (err) {
    console.error('[Admin Reference PUT Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
