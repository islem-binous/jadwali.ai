export type UserRole = 'OWNER' | 'ADMIN' | 'TEACHER' | 'STUDENT'

export interface NavPermission {
  key: string
  roles: UserRole[]
}

const NAV_PERMISSIONS: NavPermission[] = [
  { key: 'dashboard',  roles: ['OWNER', 'ADMIN', 'TEACHER', 'STUDENT'] },
  { key: 'timetable',  roles: ['OWNER', 'ADMIN', 'TEACHER', 'STUDENT'] },
  { key: 'teachers',   roles: ['OWNER', 'ADMIN'] },
  { key: 'absences',   roles: ['OWNER', 'ADMIN', 'TEACHER'] },
  { key: 'leave',      roles: ['OWNER', 'ADMIN', 'TEACHER'] },
  { key: 'calendar',   roles: ['OWNER', 'ADMIN', 'TEACHER', 'STUDENT'] },
  { key: 'resources',  roles: ['OWNER', 'ADMIN'] },
  { key: 'reports',    roles: ['OWNER', 'ADMIN'] },
  { key: 'users',      roles: ['OWNER', 'ADMIN'] },
  { key: 'ai',         roles: ['OWNER', 'ADMIN', 'TEACHER'] },
  { key: 'settings',   roles: ['OWNER', 'ADMIN', 'TEACHER', 'STUDENT'] },
  { key: 'billing',    roles: ['OWNER', 'ADMIN'] },
  { key: 'help',       roles: ['OWNER', 'ADMIN', 'TEACHER', 'STUDENT'] },
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
    return ['dashboard', 'timetable', 'calendar', 'settings']
  }
  if (role === 'TEACHER') {
    return ['dashboard', 'timetable', 'absences', 'calendar', 'ai']
  }
  // ADMIN / OWNER
  return ['dashboard', 'timetable', 'teachers', 'absences', 'ai']
}

/** Route access check from pathname */
export function canAccessRoute(role: string, pathname: string): boolean {
  // Extract the page segment: "/en/teachers" -> "teachers"
  const segments = pathname.split('/').filter(Boolean)
  // segments: ['en', 'teachers'] or ['fr', 'timetable'] etc.
  const pageSegment = segments[1] || 'dashboard'
  return canAccessNav(role, pageSegment)
}

export function isAdmin(role: string): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}

export function isTeacher(role: string): boolean {
  return role === 'TEACHER'
}

export function isStudent(role: string): boolean {
  return role === 'STUDENT'
}
