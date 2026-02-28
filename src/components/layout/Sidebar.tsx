'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import {
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
import { LanguageSwitcher } from './LanguageSwitcher'
import { useUserStore } from '@/store/userStore'
import { canAccessNav } from '@/lib/permissions'

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

export function Sidebar() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const role = useUserStore((s) => s.user?.role || 'ADMIN')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(getInitialCollapsed)

  // Persist collapsed state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed))
    } catch { /* ignore */ }
  }, [collapsed])

  function toggleGroup(groupKey: string) {
    setCollapsed((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }))
  }

  function isItemActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Filter groups: only show groups that have at least one visible item
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessNav(role, item.key)),
    }))
    .filter((group) => group.items.length > 0)

  const visibleTopItems = topItems.filter((item) => canAccessNav(role, item.key))
  const visibleBottomItems = bottomItems.filter((item) => canAccessNav(role, item.key))

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 rtl:lg:right-0 ltr:lg:left-0 z-40 border-r rtl:border-r-0 rtl:border-l border-border-subtle bg-bg-elevated">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-border-subtle">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent">
          <span className="font-display text-lg font-bold text-white">J</span>
        </div>
        <span className="font-display text-xl font-bold text-text-primary">
          jadwali<span className="text-accent">.ai</span>
        </span>
      </div>

      {/* Nav items */}
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
                {/* Group header */}
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

                {/* Group children */}
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

      {/* Language switcher */}
      <div className="border-t border-border-subtle p-4">
        <LanguageSwitcher />
      </div>
    </aside>
  )
}
