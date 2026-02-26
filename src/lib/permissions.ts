export type UserRole = 'DIRECTOR' | 'ADMIN' | 'STAFF' | 'TEACHER' | 'STUDENT'

export interface NavPermission {
  key: string
  roles: UserRole[]
}

const NAV_PERMISSIONS: NavPermission[] = [
  { key: 'dashboard',        roles: ['DIRECTOR', 'ADMIN', 'STAFF', 'TEACHER', 'STUDENT'] },
  { key: 'timetable',        roles: ['DIRECTOR', 'ADMIN', 'STAFF', 'TEACHER', 'STUDENT'] },
  { key: 'teachers',         roles: ['DIRECTOR', 'ADMIN'] },
  { key: 'students',         roles: ['DIRECTOR', 'ADMIN', 'STAFF'] },
  { key: 'student-absences', roles: ['DIRECTOR', 'ADMIN', 'STAFF', 'TEACHER'] },
  { key: 'marks',            roles: ['DIRECTOR', 'ADMIN', 'TEACHER', 'STUDENT'] },
  { key: 'student-notes',    roles: ['DIRECTOR', 'ADMIN', 'STAFF', 'TEACHER', 'STUDENT'] },
  { key: 'authorizations',   roles: ['DIRECTOR', 'ADMIN', 'STAFF', 'STUDENT'] },
  { key: 'absences',         roles: ['DIRECTOR', 'ADMIN', 'TEACHER'] },
  { key: 'leave',            roles: ['DIRECTOR', 'ADMIN', 'TEACHER'] },
  { key: 'calendar',         roles: ['DIRECTOR', 'ADMIN', 'STAFF', 'TEACHER', 'STUDENT'] },
  { key: 'resources',        roles: ['DIRECTOR', 'ADMIN'] },
  { key: 'reports',          roles: ['DIRECTOR', 'ADMIN'] },
  { key: 'users',            roles: ['DIRECTOR', 'ADMIN'] },
  { key: 'ai',               roles: ['DIRECTOR', 'ADMIN', 'TEACHER'] },
  { key: 'settings',         roles: ['DIRECTOR', 'ADMIN', 'STAFF', 'TEACHER', 'STUDENT'] },
  { key: 'billing',          roles: ['DIRECTOR', 'ADMIN'] },
  { key: 'help',             roles: ['DIRECTOR', 'ADMIN', 'STAFF', 'TEACHER', 'STUDENT'] },
]

/** Check if a nav key is accessible for a given role */
export function canAccessNav(role: string, key: string): boolean {
  const perm = NAV_PERMISSIONS.find((p) => p.key === key)
  if (!perm) return true
  return perm.roles.includes(role as UserRole)
}

/** Get the set of allowed nav keys for a role */
export function getAllowedNavKeys(role: string): Set<string> {
  const keys = new Set<string>()
  for (const p of NAV_PERMISSIONS) {
    if (p.roles.includes(role as UserRole)) {
      keys.add(p.key)
    }
  }
  return keys
}

/** Bottom nav keys per role */
export function getBottomNavKeys(role: string): string[] {
  if (role === 'STUDENT') {
    return ['dashboard', 'timetable', 'marks', 'authorizations', 'settings']
  }
  if (role === 'TEACHER') {
    return ['dashboard', 'timetable', 'marks', 'student-absences', 'ai']
  }
  if (role === 'STAFF') {
    return ['dashboard', 'students', 'student-absences', 'authorizations', 'settings']
  }
  // DIRECTOR / ADMIN
  return ['dashboard', 'timetable', 'teachers', 'students', 'ai']
}

/** Route access check from pathname */
export function canAccessRoute(role: string, pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean)
  const pageSegment = segments[1] || 'dashboard'
  return canAccessNav(role, pageSegment)
}

export function isDirector(role: string): boolean {
  return role === 'DIRECTOR'
}

export function isAdmin(role: string): boolean {
  return role === 'DIRECTOR' || role === 'ADMIN'
}

export function isStaff(role: string): boolean {
  return role === 'STAFF'
}

export function isTeacher(role: string): boolean {
  return role === 'TEACHER'
}

export function isStudent(role: string): boolean {
  return role === 'STUDENT'
}

export function canManageSchool(role: string): boolean {
  return role === 'DIRECTOR' || role === 'ADMIN'
}

export function canManageStudents(role: string): boolean {
  return role === 'DIRECTOR' || role === 'ADMIN' || role === 'STAFF'
}

export function canEnterMarks(role: string): boolean {
  return role === 'DIRECTOR' || role === 'ADMIN' || role === 'TEACHER'
}

export function canWriteStudentNotes(role: string): boolean {
  return role === 'DIRECTOR' || role === 'ADMIN' || role === 'STAFF' || role === 'TEACHER'
}

export function canApproveAuthorizations(role: string): boolean {
  return role === 'DIRECTOR' || role === 'ADMIN' || role === 'STAFF'
}
