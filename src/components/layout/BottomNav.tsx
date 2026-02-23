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
  type LucideIcon,
} from 'lucide-react'
import { useUserStore } from '@/store/userStore'
import { getBottomNavKeys } from '@/lib/permissions'

const iconMap: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  timetable: CalendarDays,
  teachers: Users,
  absences: UserX,
  calendar: Calendar,
  ai: Sparkles,
  settings: Settings,
}

const hrefMap: Record<string, string> = {
  dashboard: '/dashboard',
  timetable: '/timetable',
  teachers: '/teachers',
  absences: '/absences',
  calendar: '/calendar',
  ai: '/ai',
  settings: '/settings',
}

export function BottomNav() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const role = useUserStore((s) => s.user?.role || 'ADMIN')
  const keys = getBottomNavKeys(role)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-subtle bg-bg-elevated/95 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-around px-2 py-1">
        {keys.map((key) => {
          const href = hrefMap[key]
          const Icon = iconMap[key]
          if (!href || !Icon) return null
          const isActive = pathname === href || pathname.startsWith(href + '/')

          return (
            <Link
              key={key}
              href={href}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-accent'
                  : 'text-text-muted'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-accent' : ''}`} />
              <span className="truncate">{t(key)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
