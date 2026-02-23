'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserX,
  Calendar,
  Sparkles,
  Settings,
  CreditCard,
  ClipboardList,
  Database,
  BarChart3,
  UsersRound,
  HelpCircle,
} from 'lucide-react'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useUserStore } from '@/store/userStore'
import { canAccessNav } from '@/lib/permissions'

const allNavItems = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'timetable', href: '/timetable', icon: CalendarDays },
  { key: 'teachers', href: '/teachers', icon: Users },
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
]

export function Sidebar() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const role = useUserStore((s) => s.user?.role || 'ADMIN')
  const navItems = allNavItems.filter((item) => canAccessNav(role, item.key))

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

      {/* Language switcher */}
      <div className="border-t border-border-subtle p-4">
        <LanguageSwitcher />
      </div>
    </aside>
  )
}
