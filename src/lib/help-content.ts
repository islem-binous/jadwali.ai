import type { UserRole } from './permissions'

export interface HelpSection {
  id: string
  icon: string
  roles: UserRole[]
  faqCount: number
}

export const HELP_SECTIONS: HelpSection[] = [
  { id: 'getting_started', icon: 'Rocket', roles: ['OWNER', 'ADMIN'], faqCount: 4 },
  { id: 'dashboard', icon: 'LayoutDashboard', roles: ['OWNER', 'ADMIN', 'TEACHER', 'STUDENT'], faqCount: 4 },
  { id: 'timetable', icon: 'CalendarDays', roles: ['OWNER', 'ADMIN', 'TEACHER', 'STUDENT'], faqCount: 5 },
  { id: 'teachers', icon: 'Users', roles: ['OWNER', 'ADMIN'], faqCount: 4 },
  { id: 'absences', icon: 'UserX', roles: ['OWNER', 'ADMIN', 'TEACHER'], faqCount: 4 },
  { id: 'leave', icon: 'ClipboardList', roles: ['OWNER', 'ADMIN', 'TEACHER'], faqCount: 3 },
  { id: 'calendar', icon: 'Calendar', roles: ['OWNER', 'ADMIN', 'TEACHER', 'STUDENT'], faqCount: 3 },
  { id: 'resources', icon: 'Database', roles: ['OWNER', 'ADMIN'], faqCount: 4 },
  { id: 'reports', icon: 'BarChart3', roles: ['OWNER', 'ADMIN'], faqCount: 3 },
  { id: 'ai', icon: 'Sparkles', roles: ['OWNER', 'ADMIN', 'TEACHER'], faqCount: 4 },
  { id: 'settings', icon: 'Settings', roles: ['OWNER', 'ADMIN', 'TEACHER', 'STUDENT'], faqCount: 6 },
  { id: 'billing', icon: 'CreditCard', roles: ['OWNER', 'ADMIN'], faqCount: 4 },
]

export function getHelpSectionsForRole(role: string): HelpSection[] {
  return HELP_SECTIONS.filter((s) => s.roles.includes(role as UserRole))
}
