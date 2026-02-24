import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { parseCSV, normalizeName, findColumn } from '@/lib/csv'

type RowStatus = 'ok' | 'update' | 'error'

interface ValidatedRow {
  rowIndex: number
  data: Record<string, string>
  status: RowStatus
  errors: string[]
  matchedId?: string
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const type = formData.get('type') as string
    const schoolId = formData.get('schoolId') as string
    const mode = (formData.get('mode') as string) || 'preview'
    const file = formData.get('file') as File
    const timetableId = formData.get('timetableId') as string | null

    if (!type || !schoolId || !file) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const text = await file.text()
    const allRows = parseCSV(text)
    if (allRows.length < 2) {
      return NextResponse.json(
        { error: 'CSV must have a header row and at least one data row' },
        { status: 400 },
      )
    }

    const headers = allRows[0]
    const dataRows = allRows.slice(1)

    switch (type) {
      case 'teachers':
        return handleTeachers(schoolId, headers, dataRows, mode)
      case 'subjects':
        return handleSubjects(schoolId, headers, dataRows, mode)
      case 'classes':
        return handleClasses(schoolId, headers, dataRows, mode)
      case 'rooms':
        return handleRooms(schoolId, headers, dataRows, mode)
      case 'timetable':
        return handleTimetable(schoolId, timetableId, headers, dataRows, mode)
      case 'grades':
        return handleGrades(schoolId, headers, dataRows, mode)
      case 'events':
        return handleEvents(schoolId, headers, dataRows, mode)
      default:
        return NextResponse.json({ error: 'Invalid import type' }, { status: 400 })
    }
  } catch (err) {
    console.error('[Import Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Teachers
// ---------------------------------------------------------------------------

async function handleTeachers(
  schoolId: string,
  headers: string[],
  rows: string[][],
  mode: string,
) {
  const prisma = await getPrisma()
  const nameCol = findColumn(headers, ['name', 'full name', 'teacher name', 'nom'])
  const emailCol = findColumn(headers, ['email', 'e-mail', 'courriel'])
  const phoneCol = findColumn(headers, ['phone', 'telephone', 'tel', 'téléphone'])
  const subjectsCol = findColumn(headers, ['subjects', 'subject', 'matière', 'matières', 'matieres'])
  const maxDayCol = findColumn(headers, ['max/day', 'max per day', 'max periods per day'])
  const maxWeekCol = findColumn(headers, ['max/week', 'max per week', 'max periods per week'])

  if (nameCol === -1) {
    return NextResponse.json({ error: 'CSV must have a "Name" column' }, { status: 400 })
  }

  const existingTeachers = await prisma.teacher.findMany({
    where: { schoolId },
    include: { subjects: { include: { subject: true } } },
  })
  const existingSubjects = await prisma.subject.findMany({ where: { schoolId } })

  const validatedRows: ValidatedRow[] = rows.map((row, i) => {
    const name = row[nameCol] || ''
    const errors: string[] = []

    if (!name.trim()) errors.push('Name is required')

    const email = emailCol >= 0 ? row[emailCol] || '' : ''
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Invalid email')
    }

    const match = existingTeachers.find(
      (t) => normalizeName(t.name) === normalizeName(name),
    )

    const subjectNames =
      subjectsCol >= 0
        ? (row[subjectsCol] || '').split(';').map((s) => s.trim()).filter(Boolean)
        : []

    const unmatched = subjectNames.filter(
      (sn) => !existingSubjects.find((es) => normalizeName(es.name) === normalizeName(sn)),
    )
    if (unmatched.length > 0) {
      errors.push(`Unknown subjects: ${unmatched.join(', ')}`)
    }

    return {
      rowIndex: i + 1,
      data: {
        name,
        email,
        phone: phoneCol >= 0 ? row[phoneCol] || '' : '',
        subjects: subjectNames.join('; '),
        maxPeriodsPerDay: maxDayCol >= 0 ? row[maxDayCol] || '6' : '6',
        maxPeriodsPerWeek: maxWeekCol >= 0 ? row[maxWeekCol] || '24' : '24',
      },
      status: errors.length > 0 ? ('error' as RowStatus) : match ? ('update' as RowStatus) : ('ok' as RowStatus),
      errors,
      matchedId: match?.id,
    }
  })

  if (mode === 'preview') {
    return NextResponse.json({ total: validatedRows.length, rows: validatedRows })
  }

  let created = 0, updated = 0, skipped = 0
  for (const row of validatedRows) {
    if (row.status === 'error') { skipped++; continue }

    const subjectNames = row.data.subjects.split(';').map((s) => s.trim()).filter(Boolean)
    const subjectIds = subjectNames
      .map((sn) => existingSubjects.find((es) => normalizeName(es.name) === normalizeName(sn))?.id)
      .filter(Boolean) as string[]

    if (row.matchedId) {
      await prisma.teacherSubject.deleteMany({ where: { teacherId: row.matchedId } })
      await prisma.teacher.update({
        where: { id: row.matchedId },
        data: {
          name: row.data.name,
          email: row.data.email || null,
          phone: row.data.phone || null,
          maxPeriodsPerDay: parseInt(row.data.maxPeriodsPerDay) || 6,
          maxPeriodsPerWeek: parseInt(row.data.maxPeriodsPerWeek) || 24,
          subjects: {
            create: subjectIds.map((sid, idx) => ({ subjectId: sid, isPrimary: idx === 0 })),
          },
        },
      })
      updated++
    } else {
      await prisma.teacher.create({
        data: {
          schoolId,
          name: row.data.name,
          email: row.data.email || null,
          phone: row.data.phone || null,
          maxPeriodsPerDay: parseInt(row.data.maxPeriodsPerDay) || 6,
          maxPeriodsPerWeek: parseInt(row.data.maxPeriodsPerWeek) || 24,
          subjects: {
            create: subjectIds.map((sid, idx) => ({ subjectId: sid, isPrimary: idx === 0 })),
          },
        },
      })
      created++
    }
  }

  return NextResponse.json({ total: validatedRows.length, rows: validatedRows, created, updated, skipped })
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = ['CORE', 'ELECTIVE', 'LANGUAGE', 'SCIENCE', 'ARTS', 'SPORTS', 'OTHER']

async function handleSubjects(
  schoolId: string,
  headers: string[],
  rows: string[][],
  mode: string,
) {
  const prisma = await getPrisma()
  const nameCol = findColumn(headers, ['name', 'subject', 'nom', 'matière'])
  const frCol = findColumn(headers, ['name (french)', 'nom (français)', 'french', 'namefr'])
  const arCol = findColumn(headers, ['name (arabic)', 'nom (arabe)', 'arabic', 'namear'])
  const catCol = findColumn(headers, ['category', 'catégorie', 'type'])
  const colorCol = findColumn(headers, ['color', 'couleur', 'colorhex'])

  if (nameCol === -1) {
    return NextResponse.json({ error: 'CSV must have a "Name" column' }, { status: 400 })
  }

  const existing = await prisma.subject.findMany({ where: { schoolId } })

  const validatedRows: ValidatedRow[] = rows.map((row, i) => {
    const name = row[nameCol] || ''
    const errors: string[] = []

    if (!name.trim()) errors.push('Name is required')

    const category = catCol >= 0 ? (row[catCol] || '').toUpperCase() : 'OTHER'
    if (category && !VALID_CATEGORIES.includes(category)) {
      errors.push(`Invalid category: ${category}. Must be one of: ${VALID_CATEGORIES.join(', ')}`)
    }

    const match = existing.find((s) => normalizeName(s.name) === normalizeName(name))

    return {
      rowIndex: i + 1,
      data: {
        name,
        nameFr: frCol >= 0 ? row[frCol] || '' : '',
        nameAr: arCol >= 0 ? row[arCol] || '' : '',
        category: category || 'OTHER',
        colorHex: colorCol >= 0 ? row[colorCol] || '#4f6ef7' : '#4f6ef7',
      },
      status: errors.length > 0 ? ('error' as RowStatus) : match ? ('update' as RowStatus) : ('ok' as RowStatus),
      errors,
      matchedId: match?.id,
    }
  })

  if (mode === 'preview') {
    return NextResponse.json({ total: validatedRows.length, rows: validatedRows })
  }

  let created = 0, updated = 0, skipped = 0
  for (const row of validatedRows) {
    if (row.status === 'error') { skipped++; continue }

    const data = {
      name: row.data.name,
      nameFr: row.data.nameFr || null,
      nameAr: row.data.nameAr || null,
      category: row.data.category,
      colorHex: row.data.colorHex,
    }

    if (row.matchedId) {
      await prisma.subject.update({ where: { id: row.matchedId }, data })
      updated++
    } else {
      await prisma.subject.create({ data: { ...data, schoolId } })
      created++
    }
  }

  return NextResponse.json({ total: validatedRows.length, rows: validatedRows, created, updated, skipped })
}

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

async function handleClasses(
  schoolId: string,
  headers: string[],
  rows: string[][],
  mode: string,
) {
  const prisma = await getPrisma()
  const nameCol = findColumn(headers, ['name', 'class', 'classe', 'nom'])
  const gradeCol = findColumn(headers, ['grade', 'niveau', 'level'])
  const capCol = findColumn(headers, ['capacity', 'capacité', 'students', 'size'])
  const colorCol = findColumn(headers, ['color', 'couleur', 'colorhex'])

  if (nameCol === -1) {
    return NextResponse.json({ error: 'CSV must have a "Name" column' }, { status: 400 })
  }

  const existing = await prisma.class.findMany({ where: { schoolId }, include: { grade: true } })
  const grades = await prisma.grade.findMany({ where: { schoolId } })

  const validatedRows: ValidatedRow[] = rows.map((row, i) => {
    const name = row[nameCol] || ''
    const errors: string[] = []

    if (!name.trim()) errors.push('Name is required')

    const capacityStr = capCol >= 0 ? row[capCol] || '30' : '30'
    const capacity = parseInt(capacityStr)
    if (isNaN(capacity) || capacity < 1) errors.push('Capacity must be a positive number')

    const gradeName = gradeCol >= 0 ? row[gradeCol] || '' : ''
    let gradeId: string | null = null
    if (gradeName.trim()) {
      const gradeMatch = grades.find((g) => normalizeName(g.name) === normalizeName(gradeName))
      if (!gradeMatch) {
        errors.push(`Unknown grade: ${gradeName}`)
      } else {
        gradeId = gradeMatch.id
      }
    }

    const match = existing.find((c) => normalizeName(c.name) === normalizeName(name))

    return {
      rowIndex: i + 1,
      data: {
        name,
        grade: gradeName,
        capacity: String(capacity || 30),
        gradeId: gradeId || '',
        colorHex: colorCol >= 0 ? row[colorCol] || '#4f6ef7' : '#4f6ef7',
      },
      status: errors.length > 0 ? ('error' as RowStatus) : match ? ('update' as RowStatus) : ('ok' as RowStatus),
      errors,
      matchedId: match?.id,
    }
  })

  if (mode === 'preview') {
    return NextResponse.json({ total: validatedRows.length, rows: validatedRows })
  }

  let created = 0, updated = 0, skipped = 0
  for (const row of validatedRows) {
    if (row.status === 'error') { skipped++; continue }

    const data = {
      name: row.data.name,
      gradeId: row.data.gradeId || null,
      capacity: parseInt(row.data.capacity) || 30,
      colorHex: row.data.colorHex,
    }

    if (row.matchedId) {
      await prisma.class.update({ where: { id: row.matchedId }, data })
      updated++
    } else {
      await prisma.class.create({ data: { ...data, schoolId } })
      created++
    }
  }

  return NextResponse.json({ total: validatedRows.length, rows: validatedRows, created, updated, skipped })
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

const VALID_ROOM_TYPES = ['CLASSROOM', 'LAB_SCIENCE', 'LAB_COMPUTER', 'GYM', 'AUDITORIUM', 'ART_STUDIO', 'OTHER']

async function handleRooms(
  schoolId: string,
  headers: string[],
  rows: string[][],
  mode: string,
) {
  const prisma = await getPrisma()
  const nameCol = findColumn(headers, ['name', 'room', 'salle', 'nom'])
  const buildingCol = findColumn(headers, ['building', 'bâtiment', 'batiment', 'block'])
  const capCol = findColumn(headers, ['capacity', 'capacité', 'seats', 'places'])
  const typeCol = findColumn(headers, ['type', 'room type'])

  if (nameCol === -1) {
    return NextResponse.json({ error: 'CSV must have a "Name" column' }, { status: 400 })
  }

  const existing = await prisma.room.findMany({ where: { schoolId } })

  const validatedRows: ValidatedRow[] = rows.map((row, i) => {
    const name = row[nameCol] || ''
    const errors: string[] = []

    if (!name.trim()) errors.push('Name is required')

    const capacityStr = capCol >= 0 ? row[capCol] || '30' : '30'
    const capacity = parseInt(capacityStr)
    if (isNaN(capacity) || capacity < 1) errors.push('Capacity must be a positive number')

    const roomType = typeCol >= 0 ? (row[typeCol] || '').toUpperCase().replace(/ /g, '_') : 'CLASSROOM'
    if (roomType && !VALID_ROOM_TYPES.includes(roomType)) {
      errors.push(`Invalid type: ${roomType}. Must be one of: ${VALID_ROOM_TYPES.join(', ')}`)
    }

    const match = existing.find((r) => normalizeName(r.name) === normalizeName(name))

    return {
      rowIndex: i + 1,
      data: {
        name,
        building: buildingCol >= 0 ? row[buildingCol] || '' : '',
        capacity: String(capacity || 30),
        type: roomType || 'CLASSROOM',
      },
      status: errors.length > 0 ? ('error' as RowStatus) : match ? ('update' as RowStatus) : ('ok' as RowStatus),
      errors,
      matchedId: match?.id,
    }
  })

  if (mode === 'preview') {
    return NextResponse.json({ total: validatedRows.length, rows: validatedRows })
  }

  let created = 0, updated = 0, skipped = 0
  for (const row of validatedRows) {
    if (row.status === 'error') { skipped++; continue }

    const data = {
      name: row.data.name,
      building: row.data.building || null,
      capacity: parseInt(row.data.capacity) || 30,
      type: row.data.type,
    }

    if (row.matchedId) {
      await prisma.room.update({ where: { id: row.matchedId }, data })
      updated++
    } else {
      await prisma.room.create({ data: { ...data, schoolId } })
      created++
    }
  }

  return NextResponse.json({ total: validatedRows.length, rows: validatedRows, created, updated, skipped })
}

// ---------------------------------------------------------------------------
// Timetable (lessons)
// ---------------------------------------------------------------------------

const DAY_NAMES: Record<string, number> = {
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6,
  lundi: 0, mardi: 1, mercredi: 2, jeudi: 3, vendredi: 4, samedi: 5, dimanche: 6,
  mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6,
}

async function handleTimetable(
  schoolId: string,
  timetableId: string | null,
  headers: string[],
  rows: string[][],
  mode: string,
) {
  const prisma = await getPrisma()
  if (!timetableId) {
    return NextResponse.json({ error: 'timetableId is required for timetable import' }, { status: 400 })
  }

  const dayCol = findColumn(headers, ['day', 'jour', 'day of week'])
  const periodCol = findColumn(headers, ['period', 'période', 'slot'])
  const classCol = findColumn(headers, ['class', 'classe'])
  const subjectCol = findColumn(headers, ['subject', 'matière', 'matiere'])
  const teacherCol = findColumn(headers, ['teacher', 'enseignant', 'professeur'])
  const roomCol = findColumn(headers, ['room', 'salle'])

  if (dayCol === -1 || periodCol === -1 || classCol === -1 || subjectCol === -1 || teacherCol === -1) {
    return NextResponse.json(
      { error: 'CSV must have Day, Period, Class, Subject, and Teacher columns' },
      { status: 400 },
    )
  }

  const classes = await prisma.class.findMany({ where: { schoolId } })
  const subjects = await prisma.subject.findMany({ where: { schoolId } })
  const teachers = await prisma.teacher.findMany({ where: { schoolId } })
  const rooms = await prisma.room.findMany({ where: { schoolId } })
  const periods = await prisma.period.findMany({ where: { schoolId }, orderBy: { order: 'asc' } })

  const validatedRows: ValidatedRow[] = rows.map((row, i) => {
    const errors: string[] = []

    const dayStr = (row[dayCol] || '').trim()
    let dayOfWeek = DAY_NAMES[dayStr.toLowerCase()]
    if (dayOfWeek === undefined) {
      const num = parseInt(dayStr)
      if (!isNaN(num) && num >= 0 && num <= 6) {
        dayOfWeek = num
      } else {
        errors.push(`Unknown day: ${dayStr}`)
        dayOfWeek = -1
      }
    }

    const periodName = (row[periodCol] || '').trim()
    const periodMatch = periods.find((p) => normalizeName(p.name) === normalizeName(periodName))
    if (!periodMatch) errors.push(`Unknown period: ${periodName}`)

    const className = (row[classCol] || '').trim()
    const classMatch = classes.find((c) => normalizeName(c.name) === normalizeName(className))
    if (!classMatch) errors.push(`Unknown class: ${className}`)

    const subjectName = (row[subjectCol] || '').trim()
    const subjectMatch = subjects.find((s) => normalizeName(s.name) === normalizeName(subjectName))
    if (!subjectMatch) errors.push(`Unknown subject: ${subjectName}`)

    const teacherName = (row[teacherCol] || '').trim()
    const teacherMatch = teachers.find((t) => normalizeName(t.name) === normalizeName(teacherName))
    if (!teacherMatch) errors.push(`Unknown teacher: ${teacherName}`)

    const roomName = roomCol >= 0 ? (row[roomCol] || '').trim() : ''
    let roomId = ''
    if (roomName) {
      const roomMatch = rooms.find((r) => normalizeName(r.name) === normalizeName(roomName))
      if (!roomMatch) errors.push(`Unknown room: ${roomName}`)
      else roomId = roomMatch.id
    }

    return {
      rowIndex: i + 1,
      data: {
        day: dayStr,
        period: periodName,
        class: className,
        subject: subjectName,
        teacher: teacherName,
        room: roomName,
        dayOfWeek: String(dayOfWeek),
        periodId: periodMatch?.id || '',
        classId: classMatch?.id || '',
        subjectId: subjectMatch?.id || '',
        teacherId: teacherMatch?.id || '',
        roomId,
      },
      status: errors.length > 0 ? ('error' as RowStatus) : ('ok' as RowStatus),
      errors,
    }
  })

  if (mode === 'preview') {
    return NextResponse.json({ total: validatedRows.length, rows: validatedRows })
  }

  let created = 0, skipped = 0
  for (const row of validatedRows) {
    if (row.status === 'error') { skipped++; continue }

    await prisma.lesson.create({
      data: {
        timetableId,
        classId: row.data.classId,
        subjectId: row.data.subjectId,
        teacherId: row.data.teacherId,
        roomId: row.data.roomId || null,
        periodId: row.data.periodId,
        dayOfWeek: parseInt(row.data.dayOfWeek),
      },
    })
    created++
  }

  return NextResponse.json({ total: validatedRows.length, rows: validatedRows, created, updated: 0, skipped })
}

// ---------------------------------------------------------------------------
// Grades & Curriculum
// ---------------------------------------------------------------------------

async function handleGrades(
  schoolId: string,
  headers: string[],
  rows: string[][],
  mode: string,
) {
  const prisma = await getPrisma()
  const gradeCol = findColumn(headers, ['grade', 'name', 'nom', 'niveau'])
  const levelCol = findColumn(headers, ['level', 'ordre', 'order'])
  const subjectCol = findColumn(headers, ['subject', 'matière', 'matiere'])
  const hoursCol = findColumn(headers, ['hours/week', 'hours per week', 'heures/semaine', 'h/week', 'hoursperweek'])

  if (gradeCol === -1) {
    return NextResponse.json({ error: 'CSV must have a "Grade" or "Name" column' }, { status: 400 })
  }

  const hasSubjects = subjectCol !== -1

  const existingGrades = await prisma.grade.findMany({ where: { schoolId } })
  const existingSubjects = hasSubjects ? await prisma.subject.findMany({ where: { schoolId } }) : []

  const validatedRows: ValidatedRow[] = rows.map((row, i) => {
    const gradeName = (row[gradeCol] || '').trim()
    const errors: string[] = []

    if (!gradeName) errors.push('Grade name is required')

    const levelStr = levelCol >= 0 ? (row[levelCol] || '').trim() : ''
    const level = levelStr ? parseInt(levelStr) : 1
    if (levelStr && (isNaN(level) || level < 1)) errors.push('Level must be a positive number')

    const subjectName = hasSubjects ? (row[subjectCol] || '').trim() : ''

    const subjectMatch = subjectName
      ? existingSubjects.find((s) => normalizeName(s.name) === normalizeName(subjectName))
      : null
    if (subjectName && !subjectMatch) errors.push(`Unknown subject: ${subjectName}`)

    const hoursStr = hoursCol >= 0 ? (row[hoursCol] || '').trim() : ''
    const hours = hoursStr ? parseInt(hoursStr) : 2
    if (hoursStr && (isNaN(hours) || hours < 1 || hours > 20)) errors.push('Hours/Week must be between 1 and 20')

    const gradeMatch = gradeName
      ? existingGrades.find((g) => normalizeName(g.name) === normalizeName(gradeName))
      : null

    return {
      rowIndex: i + 1,
      data: {
        grade: gradeName,
        level: String(level || 1),
        subject: subjectName,
        'hours/week': String(hours || 2),
        subjectId: subjectMatch?.id || '',
        gradeId: gradeMatch?.id || '',
      },
      status: errors.length > 0 ? ('error' as RowStatus) : gradeMatch ? ('update' as RowStatus) : ('ok' as RowStatus),
      errors,
      matchedId: gradeMatch?.id,
    }
  })

  if (mode === 'preview') {
    return NextResponse.json({ total: validatedRows.length, rows: validatedRows })
  }

  // Group valid rows by grade name
  const gradeGroups = new Map<string, {
    gradeName: string
    level: number
    subjects: Map<string, number> // subjectId → hoursPerWeek (dedup)
    matchedId?: string
  }>()

  for (const row of validatedRows) {
    if (row.status === 'error') continue
    const key = normalizeName(row.data.grade)
    if (!gradeGroups.has(key)) {
      gradeGroups.set(key, {
        gradeName: row.data.grade,
        level: parseInt(row.data.level) || 1,
        subjects: new Map(),
        matchedId: row.matchedId,
      })
    }
    if (row.data.subjectId) {
      gradeGroups.get(key)!.subjects.set(row.data.subjectId, parseInt(row.data['hours/week']) || 2)
    }
  }

  let created = 0, updated = 0
  const skipped = validatedRows.filter((r) => r.status === 'error').length

  for (const group of gradeGroups.values()) {
    let gradeId: string

    if (group.matchedId) {
      await prisma.grade.update({
        where: { id: group.matchedId },
        data: { level: group.level },
      })
      await prisma.gradeCurriculum.deleteMany({ where: { gradeId: group.matchedId } })
      gradeId = group.matchedId
      updated++
    } else {
      const newGrade = await prisma.grade.create({
        data: { schoolId, name: group.gradeName, level: group.level },
      })
      gradeId = newGrade.id
      created++
    }

    for (const [subjectId, hoursPerWeek] of group.subjects) {
      await prisma.gradeCurriculum.create({
        data: { gradeId, subjectId, hoursPerWeek },
      })
    }
  }

  return NextResponse.json({ total: validatedRows.length, rows: validatedRows, created, updated, skipped })
}

// ---------------------------------------------------------------------------
// Events (School Calendar)
// ---------------------------------------------------------------------------

const VALID_EVENT_TYPES = ['EXAM', 'HOLIDAY', 'TRIP', 'MEETING', 'SPORT', 'PARENT_DAY', 'CLOSURE', 'OTHER']

async function handleEvents(
  schoolId: string,
  headers: string[],
  rows: string[][],
  mode: string,
) {
  const prisma = await getPrisma()
  const titleCol = findColumn(headers, ['title', 'name', 'nom', 'event'])
  const titleFrCol = findColumn(headers, ['title (french)', 'titre (français)', 'french', 'titlefr'])
  const titleArCol = findColumn(headers, ['title (arabic)', 'titre (arabe)', 'arabic', 'titlear'])
  const typeCol = findColumn(headers, ['type', 'event type'])
  const startCol = findColumn(headers, ['start date', 'start', 'date', 'début', 'startdate'])
  const endCol = findColumn(headers, ['end date', 'end', 'fin', 'enddate'])
  const colorCol = findColumn(headers, ['color', 'couleur', 'colorhex'])
  const recurringCol = findColumn(headers, ['recurring', 'isrecurring', 'récurrent'])
  const descCol = findColumn(headers, ['description', 'note', 'notes'])

  if (titleCol === -1) {
    return NextResponse.json({ error: 'CSV must have a "Title" column' }, { status: 400 })
  }
  if (startCol === -1) {
    return NextResponse.json({ error: 'CSV must have a "Start Date" column' }, { status: 400 })
  }

  const existing = await prisma.schoolEvent.findMany({ where: { schoolId } })

  const validatedRows: ValidatedRow[] = rows.map((row, i) => {
    const title = (row[titleCol] || '').trim()
    const errors: string[] = []

    if (!title) errors.push('Title is required')

    const eventType = typeCol >= 0 ? (row[typeCol] || '').toUpperCase().replace(/ /g, '_') : 'OTHER'
    if (eventType && !VALID_EVENT_TYPES.includes(eventType)) {
      errors.push(`Invalid type: ${eventType}. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`)
    }

    const startStr = (row[startCol] || '').trim()
    const endStr = endCol >= 0 ? (row[endCol] || '').trim() : startStr

    const startDate = new Date(startStr)
    const endDate = new Date(endStr || startStr)
    if (isNaN(startDate.getTime())) errors.push('Invalid start date')
    if (isNaN(endDate.getTime())) errors.push('Invalid end date')
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate < startDate) {
      errors.push('End date must be after start date')
    }

    const recurringStr = recurringCol >= 0 ? (row[recurringCol] || '').trim().toLowerCase() : 'false'
    const isRecurring = ['true', '1', 'yes', 'oui'].includes(recurringStr)

    const match = existing.find(
      (e) => normalizeName(e.title) === normalizeName(title)
        && e.startDate.toISOString().slice(0, 10) === startStr,
    )

    return {
      rowIndex: i + 1,
      data: {
        title,
        titlefr: titleFrCol >= 0 ? (row[titleFrCol] || '').trim() : '',
        titlear: titleArCol >= 0 ? (row[titleArCol] || '').trim() : '',
        type: eventType || 'OTHER',
        startdate: startStr,
        enddate: endStr || startStr,
        color: colorCol >= 0 ? (row[colorCol] || '').trim() || '#4f6ef7' : '#4f6ef7',
        recurring: String(isRecurring),
        description: descCol >= 0 ? (row[descCol] || '').trim() : '',
      },
      status: errors.length > 0 ? ('error' as RowStatus) : match ? ('update' as RowStatus) : ('ok' as RowStatus),
      errors,
      matchedId: match?.id,
    }
  })

  if (mode === 'preview') {
    return NextResponse.json({ total: validatedRows.length, rows: validatedRows })
  }

  let created = 0, updated = 0, skipped = 0
  for (const row of validatedRows) {
    if (row.status === 'error') { skipped++; continue }

    const data = {
      title: row.data.title,
      titleFr: row.data.titlefr || null,
      titleAr: row.data.titlear || null,
      type: row.data.type,
      startDate: new Date(row.data.startdate),
      endDate: new Date(row.data.enddate),
      colorHex: row.data.color,
      isRecurring: row.data.recurring === 'true',
      description: row.data.description || null,
      affectsClasses: '[]',
    }

    if (row.matchedId) {
      await prisma.schoolEvent.update({ where: { id: row.matchedId }, data })
      updated++
    } else {
      await prisma.schoolEvent.create({ data: { ...data, schoolId } })
      created++
    }
  }

  return NextResponse.json({ total: validatedRows.length, rows: validatedRows, created, updated, skipped })
}
