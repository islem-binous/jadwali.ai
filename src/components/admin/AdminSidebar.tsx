'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Database,
  Shield,
  Settings,
} from 'lucide-react'

const navItems = [
  { key: 'dashboard', href: '/admin', icon: LayoutDashboard },
  { key: 'schools', href: '/admin/schools', icon: Building2 },
  { key: 'users', href: '/admin/users', icon: Users },
  { key: 'payments', href: '/admin/payments', icon: CreditCard },
  { key: 'reference', href: '/admin/reference', icon: Database },
  { key: 'settings', href: '/admin/settings', icon: Settings },
]

export function AdminSidebar() {
  const t = useTranslations('admin_nav')
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 ltr:lg:left-0 rtl:lg:right-0 z-40 border-r rtl:border-r-0 rtl:border-l border-border-subtle bg-bg-elevated">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-border-subtle">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-danger">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="font-display text-lg font-bold text-text-primary">
            SchediQ
          </span>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-danger">
            {t('admin_label')}
          </span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href)
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
    </aside>
  )
}
