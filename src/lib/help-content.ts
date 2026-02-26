import type { UserRole } from './permissions'

export interface HelpSection {
  id: string
  icon: string
  roles: UserRole[]
  faqCount: number
}

export const HELP_SECTIONS: HelpSection[] = [
  { id: 'getting_started', icon: 'Rocket', roles: ['DIRECTOR', 'ADMIN'], faqCount: 4 },
  { id: 'dashboard', icon: 'LayoutDashboard', roles: ['DIRECTOR', 'ADMIN', 'TEACHER', 'STUDENT'], faqCount: 4 },
  { id: 'timetable', icon: 'CalendarDays', roles: ['DIRECTOR', 'ADMIN', 'TEACHER', 'STUDENT'], faqCount: 5 },
  { id: 'teachers', icon: 'Users', roles: ['DIRECTOR', 'ADMIN'], faqCount: 4 },
  { id: 'absences', icon: 'UserX', roles: ['DIRECTOR', 'ADMIN', 'TEACHER'], faqCount: 4 },
  { id: 'leave', icon: 'ClipboardList', roles: ['DIRECTOR', 'ADMIN', 'TEACHER'], faqCount: 3 },
  { id: 'calendar', icon: 'Calendar', roles: ['DIRECTOR', 'ADMIN', 'TEACHER', 'STUDENT'], faqCount: 3 },
  { id: 'resources', icon: 'Database', roles: ['DIRECTOR', 'ADMIN'], faqCount: 4 },
  { id: 'reports', icon: 'BarChart3', roles: ['DIRECTOR', 'ADMIN'], faqCount: 3 },
  { id: 'ai', icon: 'Sparkles', roles: ['DIRECTOR', 'ADMIN', 'TEACHER'], faqCount: 4 },
  { id: 'settings', icon: 'Settings', roles: ['DIRECTOR', 'ADMIN', 'TEACHER', 'STUDENT'], faqCount: 6 },
  { id: 'billing', icon: 'CreditCard', roles: ['DIRECTOR', 'ADMIN'], faqCount: 4 },
]

export function getHelpSectionsForRole(role: string): HelpSection[] {
  return HELP_SECTIONS.filter((s) => s.roles.includes(role as UserRole))
}
