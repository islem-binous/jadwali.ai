// Re-export Prisma types for convenience
export type {
  School,
  User,
  Term,
  Class,
  Teacher,
  TeacherSubject,
  TeacherAvailability,
  Subject,
  Room,
  Period,
  Timetable,
  Lesson,
  Absence,
  Substitute,
  SchoolEvent,
  Student,
} from '@/generated/prisma/client'

// Enum-like string union types (SQLite doesn't support enums)
export type Language = 'AR' | 'FR' | 'EN'
export type Plan = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'
export type SubscriptionStatus = 'ACTIVE' | 'INACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING'
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'COORDINATOR' | 'TEACHER' | 'STUDENT' | 'PARENT'
export type SubjectCategory = 'MATH' | 'SCIENCE' | 'LANGUAGE' | 'HUMANITIES' | 'ARTS' | 'PE' | 'MUSIC' | 'TECH' | 'RELIGION' | 'OTHER'
export type RoomType = 'CLASSROOM' | 'LAB_SCIENCE' | 'LAB_COMPUTER' | 'GYM' | 'AUDITORIUM' | 'LIBRARY' | 'MUSIC_ROOM' | 'ART_STUDIO' | 'OUTDOOR' | 'OTHER'
export type TimetableStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type AbsenceType = 'SICK' | 'PERSONAL' | 'TRAINING' | 'CONFERENCE' | 'MATERNITY' | 'PATERNITY' | 'MEDICAL' | 'EMERGENCY' | 'OTHER'
export type AbsenceStatus = 'PENDING' | 'COVERED' | 'PARTIAL' | 'UNCOVERED'
export type EventType = 'EXAM' | 'HOLIDAY' | 'TRIP' | 'MEETING' | 'SPORT' | 'PARENT_DAY' | 'CLOSURE' | 'OTHER'

// Nav items
export interface NavItem {
  key: string
  href: string
  icon: string
}
