'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Menu, Bell, Search, LogOut, Settings, User } from 'lucide-react'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useAuth } from '@/hooks/useAuth'
import { Link } from '@/i18n/navigation'
import { useUIStore } from '@/store/uiStore'

export function Topbar() {
  const t = useTranslations()
  const { user, signOut } = useAuth()
  const { toggleSidebar } = useUIStore()
  const [showDropdown, setShowDropdown] = useState(false)

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'A'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border-subtle bg-bg-elevated/80 px-4 backdrop-blur-xl lg:h-16 lg:px-6">
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-bg-surface lg:hidden"
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent">
          <span className="font-display text-sm font-bold text-white">J</span>
        </div>
        <span className="font-display text-base font-bold text-text-primary">
          jadwali<span className="text-accent">.ai</span>
        </span>
      </div>

      {/* Search - desktop */}
      <div className="hidden lg:flex lg:flex-1 lg:items-center lg:gap-2">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted rtl:left-auto rtl:right-3" />
          <input
            type="text"
            placeholder={t('app.search')}
            className="h-9 w-full rounded-md border border-border-subtle bg-bg-surface pl-9 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent rtl:pl-4 rtl:pr-9"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <div className="hidden lg:block">
          <LanguageSwitcher />
        </div>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-bg-surface"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* User avatar + dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            {initials}
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-2 z-50 w-56 rounded-xl border border-border-subtle bg-bg-card p-2 shadow-modal">
                {/* User info */}
                <div className="border-b border-border-subtle px-3 py-2 mb-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary">{user?.name}</p>
                    {user?.role && (
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                        {user.role}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">{user?.email}</p>
                  <p className="mt-1 text-xs text-accent">{user?.schoolName || 'Platform Admin'}</p>
                </div>

                <Link
                  href="/settings"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-bg-surface hover:text-text-primary transition"
                >
                  <Settings className="h-4 w-4" />
                  {t('nav.settings')}
                </Link>

                <button
                  onClick={() => {
                    setShowDropdown(false)
                    signOut()
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-danger hover:bg-danger-dim transition"
                >
                  <LogOut className="h-4 w-4" />
                  {t('auth.sign_out')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
