import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({ url: 'file:dev.db' })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // Create school
  const school = await prisma.school.create({
    data: {
      name: 'Lycée Ibn Khaldoun',
      slug: 'lycee-ibn-khaldoun',
      country: 'Tunisia',
      timezone: 'Africa/Tunis',
      language: 'FR',
      plan: 'PRO',
      subscriptionStatus: 'ACTIVE',
    },
  })

  // Create admin user
  await prisma.user.create({
    data: {
      authId: 'local_demo',
      email: 'admin@school.com',
      name: 'Ahmed Benali',
      role: 'ADMIN',
      language: 'FR',
      schoolId: school.id,
    },
  })

  // Create periods
  const periodsData = [
    { name: 'Period 1', startTime: '08:00', endTime: '09:00', order: 1, isBreak: false },
    { name: 'Period 2', startTime: '09:00', endTime: '10:00', order: 2, isBreak: false },
    { name: 'Break', startTime: '10:00', endTime: '10:15', order: 3, isBreak: true, breakLabel: 'Break' },
    { name: 'Period 3', startTime: '10:15', endTime: '11:15', order: 4, isBreak: false },
    { name: 'Period 4', startTime: '11:15', endTime: '12:15', order: 5, isBreak: false },
    { name: 'Lunch', startTime: '12:15', endTime: '13:15', order: 6, isBreak: true, breakLabel: 'Lunch' },
    { name: 'Period 5', startTime: '13:15', endTime: '14:15', order: 7, isBreak: false },
    { name: 'Period 6', startTime: '14:15', endTime: '15:15', order: 8, isBreak: false },
  ]

  for (const p of periodsData) {
    await prisma.period.create({ data: { ...p, schoolId: school.id } })
  }

  // Create subjects
  const subjects = [
    { name: 'Mathematics', nameAr: 'الرياضيات', nameFr: 'Mathématiques', colorHex: '#4f6ef7', category: 'MATH' },
    { name: 'Physics', nameAr: 'الفيزياء', nameFr: 'Physique', colorHex: '#22c55e', category: 'SCIENCE' },
    { name: 'Chemistry', nameAr: 'الكيمياء', nameFr: 'Chimie', colorHex: '#06b6d4', category: 'SCIENCE' },
    { name: 'Biology', nameAr: 'علوم الحياة', nameFr: 'Biologie', colorHex: '#84cc16', category: 'SCIENCE' },
    { name: 'Arabic', nameAr: 'اللغة العربية', nameFr: 'Arabe', colorHex: '#f59e0b', category: 'LANGUAGE' },
    { name: 'French', nameAr: 'الفرنسية', nameFr: 'Français', colorHex: '#f97316', category: 'LANGUAGE' },
    { name: 'English', nameAr: 'الإنجليزية', nameFr: 'Anglais', colorHex: '#ec4899', category: 'LANGUAGE' },
    { name: 'History', nameAr: 'التاريخ', nameFr: 'Histoire', colorHex: '#a78bfa', category: 'HUMANITIES' },
    { name: 'Geography', nameAr: 'الجغرافيا', nameFr: 'Géographie', colorHex: '#8b5cf6', category: 'HUMANITIES' },
    { name: 'Islamic Studies', nameAr: 'التربية الإسلامية', nameFr: 'Éducation Islamique', colorHex: '#14b8a6', category: 'RELIGION' },
    { name: 'Physical Education', nameAr: 'التربية البدنية', nameFr: 'Éducation Physique', colorHex: '#ef4444', category: 'PE' },
    { name: 'Technology', nameAr: 'التكنولوجيا', nameFr: 'Technologie', colorHex: '#64748b', category: 'TECH' },
  ]

  const createdSubjects: Record<string, string> = {}
  for (const s of subjects) {
    const sub = await prisma.subject.create({ data: { ...s, schoolId: school.id } })
    createdSubjects[s.name] = sub.id
  }

  // Create grades
  const gradeNames = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6']
  const createdGrades: Record<string, string> = {}
  for (let i = 0; i < gradeNames.length; i++) {
    const g = await prisma.grade.create({
      data: { name: gradeNames[i], level: i + 1, schoolId: school.id },
    })
    createdGrades[gradeNames[i]] = g.id
  }

  // Create classes (linked to grades)
  const classes = ['1-A', '1-B', '2-A', '2-B', '3-A', '3-B', '4-A', '4-B', '5-A', '5-B', '6-A', '6-B']
  for (const c of classes) {
    const gradeName = `Grade ${c.split('-')[0]}`
    const gradeId = createdGrades[gradeName] ?? null
    await prisma.class.create({
      data: { name: c, gradeId, capacity: 30, schoolId: school.id },
    })
  }

  // Create rooms
  const rooms = [
    { name: 'Room 101', type: 'CLASSROOM' },
    { name: 'Room 102', type: 'CLASSROOM' },
    { name: 'Room 103', type: 'CLASSROOM' },
    { name: 'Room 104', type: 'CLASSROOM' },
    { name: 'Room 105', type: 'CLASSROOM' },
    { name: 'Room 106', type: 'CLASSROOM' },
    { name: 'Room 201', type: 'CLASSROOM' },
    { name: 'Room 202', type: 'CLASSROOM' },
    { name: 'Science Lab', type: 'LAB_SCIENCE' },
    { name: 'Computer Lab', type: 'LAB_COMPUTER' },
    { name: 'Gymnasium', type: 'GYM', capacity: 60 },
    { name: 'Library', type: 'LIBRARY', capacity: 40 },
  ]

  for (const r of rooms) {
    await prisma.room.create({
      data: { name: r.name, type: r.type, capacity: r.capacity || 30, schoolId: school.id },
    })
  }

  // Create teachers
  const teachers = [
    { name: 'Karim Meziane', subjects: ['Mathematics'], color: '#4f6ef7' },
    { name: 'Fatima Boudjema', subjects: ['Mathematics'], color: '#3b82f6' },
    { name: 'Mohamed Larbi', subjects: ['Physics'], color: '#22c55e' },
    { name: 'Amina Khelifi', subjects: ['Chemistry'], color: '#06b6d4' },
    { name: 'Youcef Benmoussa', subjects: ['Biology'], color: '#84cc16' },
    { name: 'Rachid Hamidi', subjects: ['Arabic'], color: '#f59e0b' },
    { name: 'Naima Saidi', subjects: ['Arabic'], color: '#eab308' },
    { name: 'Sophie Dupont', subjects: ['French'], color: '#f97316' },
    { name: 'Sarah Mitchell', subjects: ['English'], color: '#ec4899' },
    { name: 'Ali Bouzid', subjects: ['History', 'Geography'], color: '#a78bfa' },
    { name: 'Leila Ferhat', subjects: ['History'], color: '#8b5cf6' },
    { name: 'Mustapha Kebaili', subjects: ['Islamic Studies'], color: '#14b8a6' },
    { name: 'Omar Benslimane', subjects: ['Physical Education'], color: '#ef4444' },
    { name: 'Djamel Ouali', subjects: ['Technology'], color: '#64748b' },
    { name: 'Nadia Cherif', subjects: ['Physics', 'Chemistry'], color: '#0ea5e9' },
  ]

  for (const t of teachers) {
    const teacher = await prisma.teacher.create({
      data: {
        name: t.name,
        email: `${t.name.toLowerCase().replace(/\s/g, '.')}@school.com`,
        colorHex: t.color,
        maxPeriodsPerDay: 6,
        maxPeriodsPerWeek: 24,
        schoolId: school.id,
      },
    })

    for (let i = 0; i < t.subjects.length; i++) {
      await prisma.teacherSubject.create({
        data: {
          teacherId: teacher.id,
          subjectId: createdSubjects[t.subjects[i]],
          isPrimary: i === 0,
        },
      })
    }
  }

  // Create a term
  await prisma.term.create({
    data: {
      name: 'Semester 1',
      nameAr: 'الفصل الأول',
      nameFr: 'Semestre 1',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-01-31'),
      schoolId: school.id,
    },
  })

  // ─── TUNISIA SCHOOL CALENDAR 2024-2025 + OFFICIAL HOLIDAYS ────────
  const events = [
    // === Official Public Holidays (recurring) ===
    { title: "Nouvel An", titleAr: "رأس السنة الميلادية", titleFr: "Nouvel An", type: "HOLIDAY", startDate: "2025-01-01", endDate: "2025-01-01", colorHex: "#22c55e", isRecurring: true },
    { title: "Fête de l'Indépendance", titleAr: "عيد الاستقلال", titleFr: "Fête de l'Indépendance", type: "HOLIDAY", startDate: "2025-03-20", endDate: "2025-03-20", colorHex: "#22c55e", isRecurring: true },
    { title: "Aïd el-Fitr", titleAr: "عيد الفطر", titleFr: "Aïd el-Fitr", type: "HOLIDAY", startDate: "2025-03-31", endDate: "2025-04-02", colorHex: "#14b8a6", isRecurring: true, description: "Dates change yearly (lunar calendar)" },
    { title: "Journée des Martyrs", titleAr: "يوم الشهداء", titleFr: "Journée des Martyrs", type: "HOLIDAY", startDate: "2025-04-09", endDate: "2025-04-09", colorHex: "#22c55e", isRecurring: true },
    { title: "Fête du Travail", titleAr: "عيد الشغل", titleFr: "Fête du Travail", type: "HOLIDAY", startDate: "2025-05-01", endDate: "2025-05-01", colorHex: "#22c55e", isRecurring: true },
    { title: "Aïd el-Adha", titleAr: "عيد الأضحى", titleFr: "Aïd el-Adha", type: "HOLIDAY", startDate: "2025-06-06", endDate: "2025-06-07", colorHex: "#14b8a6", isRecurring: true, description: "Dates change yearly (lunar calendar)" },
    { title: "Ras el Am el Hejri", titleAr: "رأس السنة الهجرية", titleFr: "Nouvel An Hégirien", type: "HOLIDAY", startDate: "2025-06-26", endDate: "2025-06-26", colorHex: "#14b8a6", isRecurring: true, description: "Dates change yearly (lunar calendar)" },
    { title: "Fête de la République", titleAr: "عيد الجمهورية", titleFr: "Fête de la République", type: "HOLIDAY", startDate: "2025-07-25", endDate: "2025-07-25", colorHex: "#22c55e", isRecurring: true },
    { title: "Journée de la Femme", titleAr: "عيد المرأة", titleFr: "Journée de la Femme", type: "HOLIDAY", startDate: "2025-08-13", endDate: "2025-08-13", colorHex: "#22c55e", isRecurring: true },
    { title: "Mouled", titleAr: "المولد النبوي الشريف", titleFr: "Mouled", type: "HOLIDAY", startDate: "2025-09-04", endDate: "2025-09-04", colorHex: "#14b8a6", isRecurring: true, description: "Dates change yearly (lunar calendar)" },
    { title: "Fête de l'Évacuation", titleAr: "عيد الجلاء", titleFr: "Fête de l'Évacuation", type: "HOLIDAY", startDate: "2025-10-15", endDate: "2025-10-15", colorHex: "#22c55e", isRecurring: true },
    { title: "Journée de la Révolution", titleAr: "عيد الثورة", titleFr: "Journée de la Révolution", type: "HOLIDAY", startDate: "2025-12-17", endDate: "2025-12-17", colorHex: "#22c55e", isRecurring: true },

    // === School Vacations ===
    { title: "Vacances mi-1er trimestre", titleAr: "عطلة منتصف الثلاثي الأول", titleFr: "Vacances mi-1er trimestre", type: "CLOSURE", startDate: "2024-10-28", endDate: "2024-11-03", colorHex: "#f59e0b", description: "Mid-1st trimester break" },
    { title: "Vacances d'hiver", titleAr: "عطلة الشتاء", titleFr: "Vacances d'hiver", type: "CLOSURE", startDate: "2024-12-23", endDate: "2025-01-05", colorHex: "#3b82f6", description: "Winter / New Year break" },
    { title: "Vacances mi-2ème trimestre", titleAr: "عطلة منتصف الثلاثي الثاني", titleFr: "Vacances mi-2ème trimestre", type: "CLOSURE", startDate: "2025-02-03", endDate: "2025-02-09", colorHex: "#f59e0b", description: "Mid-2nd trimester break" },
    { title: "Vacances de printemps", titleAr: "عطلة الربيع", titleFr: "Vacances de printemps", type: "CLOSURE", startDate: "2025-03-24", endDate: "2025-04-06", colorHex: "#84cc16", description: "Spring / Eid al-Fitr break" },

    // === Trimester Structure ===
    { title: "1er Trimestre", titleAr: "الثلاثي الأول", titleFr: "1er Trimestre", type: "OTHER", startDate: "2024-09-16", endDate: "2025-01-11", colorHex: "#4f6ef7", description: "Premier trimestre de l'année scolaire" },
    { title: "2ème Trimestre", titleAr: "الثلاثي الثاني", titleFr: "2ème Trimestre", type: "OTHER", startDate: "2025-01-12", endDate: "2025-04-12", colorHex: "#8b5cf6", description: "Deuxième trimestre" },
    { title: "3ème Trimestre", titleAr: "الثلاثي الثالث", titleFr: "3ème Trimestre", type: "OTHER", startDate: "2025-04-13", endDate: "2025-06-28", colorHex: "#06b6d4", description: "Troisième trimestre" },

    // === Exam Periods ===
    { title: "Examens T1 - Semaine ouverte", titleAr: "امتحانات ث1 - أسبوع مفتوح", titleFr: "Examens T1 - Semaine ouverte", type: "EXAM", startDate: "2024-12-02", endDate: "2024-12-07", colorHex: "#ef4444" },
    { title: "Examens T1 - Semaine bloquée", titleAr: "امتحانات ث1 - أسبوع مغلق", titleFr: "Examens T1 - Semaine bloquée", type: "EXAM", startDate: "2024-12-09", endDate: "2024-12-14", colorHex: "#ef4444" },
    { title: "Conseils de classe T1", titleAr: "مجالس الأقسام ث1", titleFr: "Conseils de classe T1", type: "MEETING", startDate: "2025-01-06", endDate: "2025-01-11", colorHex: "#f97316" },
    { title: "Examens T2 - Semaine ouverte", titleAr: "امتحانات ث2 - أسبوع مفتوح", titleFr: "Examens T2 - Semaine ouverte", type: "EXAM", startDate: "2025-03-03", endDate: "2025-03-08", colorHex: "#ef4444" },
    { title: "Examens T2 - Semaine bloquée", titleAr: "امتحانات ث2 - أسبوع مغلق", titleFr: "Examens T2 - Semaine bloquée", type: "EXAM", startDate: "2025-03-10", endDate: "2025-03-15", colorHex: "#ef4444" },
    { title: "Conseils de classe T2", titleAr: "مجالس الأقسام ث2", titleFr: "Conseils de classe T2", type: "MEETING", startDate: "2025-04-07", endDate: "2025-04-12", colorHex: "#f97316" },

    // === National Exams ===
    { title: "Baccalauréat - Épreuves pratiques", titleAr: "البكالوريا - اختبارات تطبيقية", titleFr: "Baccalauréat - Épreuves pratiques", type: "EXAM", startDate: "2025-05-15", endDate: "2025-05-26", colorHex: "#dc2626" },
    { title: "Baccalauréat - Session principale", titleAr: "البكالوريا - الدورة الرئيسية", titleFr: "Baccalauréat - Session principale", type: "EXAM", startDate: "2025-06-02", endDate: "2025-06-11", colorHex: "#dc2626", description: "Main written session (break June 5-8 for Eid al-Adha)" },
    { title: "Concours Sixième", titleAr: "مناظرة السيزيام", titleFr: "Concours d'entrée en 6ème", type: "EXAM", startDate: "2025-06-16", endDate: "2025-06-18", colorHex: "#dc2626" },
    { title: "Concours Neuvième (DFEEB)", titleAr: "مناظرة النوفيام", titleFr: "Diplôme de fin d'études de l'enseignement de base", type: "EXAM", startDate: "2025-06-19", endDate: "2025-06-21", colorHex: "#dc2626" },

    // === School Year Milestones ===
    { title: "Rentrée scolaire", titleAr: "الدخول المدرسي", titleFr: "Rentrée scolaire", type: "OTHER", startDate: "2024-09-16", endDate: "2024-09-16", colorHex: "#4f6ef7", description: "First day of school for students" },
    { title: "Fin de l'année scolaire", titleAr: "نهاية السنة الدراسية", titleFr: "Fin de l'année scolaire", type: "OTHER", startDate: "2025-06-28", endDate: "2025-06-28", colorHex: "#4f6ef7", description: "Last day of school for students" },
  ]

  for (const ev of events) {
    await prisma.schoolEvent.create({
      data: {
        schoolId: school.id,
        title: ev.title,
        titleAr: ev.titleAr,
        titleFr: ev.titleFr,
        description: ev.description ?? null,
        type: ev.type,
        startDate: new Date(ev.startDate),
        endDate: new Date(ev.endDate),
        colorHex: ev.colorHex,
        affectsClasses: '[]',
        isRecurring: 'isRecurring' in ev ? (ev as { isRecurring: boolean }).isRecurring : false,
      },
    })
  }

  console.log(`  Seeded ${events.length} calendar events (Tunisia 2024-2025)`)

  console.log('Seed complete!')
  console.log('')
  console.log('Demo credentials:')
  console.log('  Email:    admin@school.com')
  console.log('  Password: any (no password check in local dev)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
