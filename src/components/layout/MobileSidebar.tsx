'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import {
  X,
  LayoutDashboard,
  CalendarDays,
  Users,
  GraduationCap,
  UserX,
  ClipboardCheck,
  BookMarked,
  StickyNote,
  FileCheck,
  Calendar,
  Sparkles,
  Settings,
  CreditCard,
  ClipboardList,
  Database,
  BarChart3,
  UsersRound,
  HelpCircle,
  Building2,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useUserStore } from '@/store/userStore'
import { canAccessNav } from '@/lib/permissions'
import { LanguageSwitcher } from './LanguageSwitcher'

interface NavItem {
  key: string
  href: string
  icon: LucideIcon
}

interface NavGroup {
  groupKey: string
  icon: LucideIcon
  items: NavItem[]
}

const topItems: NavItem[] = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
]

const navGroups: NavGroup[] = [
  {
    groupKey: 'scheduling',
    icon: CalendarDays,
    items: [
      { key: 'timetable', href: '/timetable', icon: CalendarDays },
      { key: 'calendar', href: '/calendar', icon: Calendar },
      { key: 'ai', href: '/ai', icon: Sparkles },
    ],
  },
  {
    groupKey: 'students_group',
    icon: GraduationCap,
    items: [
      { key: 'students', href: '/students', icon: GraduationCap },
      { key: 'marks', href: '/marks', icon: BookMarked },
      { key: 'student-absences', href: '/student-absences', icon: ClipboardCheck },
      { key: 'student-notes', href: '/student-notes', icon: StickyNote },
      { key: 'authorizations', href: '/authorizations', icon: FileCheck },
    ],
  },
  {
    groupKey: 'personnel',
    icon: Users,
    items: [
      { key: 'teachers', href: '/teachers', icon: Users },
      { key: 'absences', href: '/absences', icon: UserX },
      { key: 'leave', href: '/leave', icon: ClipboardList },
    ],
  },
  {
    groupKey: 'school_group',
    icon: Building2,
    items: [
      { key: 'resources', href: '/resources', icon: Database },
      { key: 'reports', href: '/reports', icon: BarChart3 },
      { key: 'users', href: '/users', icon: UsersRound },
    ],
  },
]

const bottomItems: NavItem[] = [
  { key: 'settings', href: '/settings', icon: Settings },
  { key: 'billing', href: '/billing', icon: CreditCard },
  { key: 'help', href: '/help', icon: HelpCircle },
]

const STORAGE_KEY = 'sidebar-collapsed'

function getInitialCollapsed(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

export function MobileSidebar() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const role = useUserStore((s) => s.user?.role || 'ADMIN')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(getInitialCollapsed)

  // Persist collapsed state (shared with desktop sidebar)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed))
    } catch { /* ignore */ }
  }, [collapsed])

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

  function toggleGroup(groupKey: string) {
    setCollapsed((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }))
  }

  function isItemActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessNav(role, item.key)),
    }))
    .filter((group) => group.items.length > 0)

  const visibleTopItems = topItems.filter((item) => canAccessNav(role, item.key))
  const visibleBottomItems = bottomItems.filter((item) => canAccessNav(role, item.key))

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
              {/* Top standalone items */}
              <ul className="space-y-1">
                {visibleTopItems.map((item) => {
                  const Icon = item.icon
                  const active = isItemActive(item.href)
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                          active
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

              {/* Grouped sections */}
              <div className="mt-4 space-y-1">
                {visibleGroups.map((group) => {
                  const GroupIcon = group.icon
                  const hasActiveChild = group.items.some((item) => isItemActive(item.href))
                  const isCollapsed = collapsed[group.groupKey] && !hasActiveChild

                  return (
                    <div key={group.groupKey}>
                      <button
                        onClick={() => toggleGroup(group.groupKey)}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted transition-colors hover:bg-bg-surface hover:text-text-primary"
                      >
                        <GroupIcon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 text-left">{t(group.groupKey)}</span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                            isCollapsed ? 'ltr:-rotate-90 rtl:rotate-90' : ''
                          }`}
                        />
                      </button>

                      {!isCollapsed && (
                        <ul className="mt-0.5 space-y-0.5">
                          {group.items.map((item) => {
                            const Icon = item.icon
                            const active = isItemActive(item.href)
                            return (
                              <li key={item.key}>
                                <Link
                                  href={item.href}
                                  className={`flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors ltr:pl-9 rtl:pr-9 ltr:pr-3 rtl:pl-3 ${
                                    active
                                      ? 'bg-accent-dim text-accent'
                                      : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
                                  }`}
                                >
                                  <Icon className="h-4 w-4 shrink-0" />
                                  {t(item.key)}
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Bottom standalone items */}
              <div className="mt-4 border-t border-border-subtle pt-4">
                <ul className="space-y-1">
                  {visibleBottomItems.map((item) => {
                    const Icon = item.icon
                    const active = isItemActive(item.href)
                    return (
                      <li key={item.key}>
                        <Link
                          href={item.href}
                          className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                            active
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
              </div>
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
