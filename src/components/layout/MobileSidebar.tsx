'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { X, LayoutDashboard, CalendarDays, Users, GraduationCap, UserX, ClipboardCheck, BookMarked, StickyNote, FileCheck, Calendar, Sparkles, Settings, CreditCard, ClipboardList, Database, BarChart3, UsersRound, HelpCircle } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useUserStore } from '@/store/userStore'
import { canAccessNav } from '@/lib/permissions'
import { LanguageSwitcher } from './LanguageSwitcher'

const allNavItems = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'timetable', href: '/timetable', icon: CalendarDays },
  { key: 'teachers', href: '/teachers', icon: Users },
  { key: 'students', href: '/students', icon: GraduationCap },
  { key: 'student-absences', href: '/student-absences', icon: ClipboardCheck },
  { key: 'marks', href: '/marks', icon: BookMarked },
  { key: 'student-notes', href: '/student-notes', icon: StickyNote },
  { key: 'authorizations', href: '/authorizations', icon: FileCheck },
  { key: 'absences', href: '/absences', icon: UserX },
  { key: 'leave', href: '/leave', icon: ClipboardList },
  { key: 'calendar', href: '/calendar', icon: Calendar },
  { key: 'resources', href: '/resources', icon: Database },
  { key: 'reports', href: '/reports', icon: BarChart3 },
  { key: 'users', href: '/users', icon: UsersRound },
  { key: 'ai', href: '/ai', icon: Sparkles },
  { key: 'settings', href: '/settings', icon: Settings },
  { key: 'billing', href: '/billing', icon: CreditCard },
  { key: 'help', href: '/help', icon: HelpCircle },
] as const

export function MobileSidebar() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const role = useUserStore((s) => s.user?.role || 'ADMIN')
  const navItems = allNavItems.filter((item) => canAccessNav(role, item.key))

  // Close on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname, setSidebarOpen])

  // Lock body scroll
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-50 bg-black/60 lg:hidden"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border-subtle bg-bg-elevated lg:hidden rtl:left-auto rtl:right-0 rtl:border-r-0 rtl:border-l"
          >
            {/* Header */}
            <div className="flex h-16 items-center justify-between border-b border-border-subtle px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent">
                  <span className="font-display text-lg font-bold text-white">J</span>
                </div>
                <span className="font-display text-xl font-bold text-text-primary">jadwali<span className="text-accent">.ai</span></span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-surface"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <ul className="space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  const Icon = item.icon
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-accent-dim text-accent'
                            : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {t(item.key)}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>

            {/* Language */}
            <div className="border-t border-border-subtle p-4">
              <LanguageSwitcher />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
