'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { LogOut, Shield, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Link } from '@/i18n/navigation'

export function AdminTopbar() {
  const t = useTranslations()
  const { user, signOut } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'SA'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border-subtle bg-bg-elevated/80 px-4 backdrop-blur-xl lg:h-16 lg:px-6">
      {/* Mobile menu placeholder */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-danger">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <span className="font-display text-base font-bold text-text-primary">Admin</span>
      </div>

      {/* Spacer */}
      <div className="hidden lg:flex lg:flex-1" />

      {/* Right section */}
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-text-secondary lg:inline">
          {user?.name}
        </span>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-danger text-sm font-semibold text-white transition hover:bg-danger/80"
          >
            {initials}
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-2 z-50 w-48 rounded-xl border border-border-subtle bg-bg-card p-2 shadow-modal">
                <div className="border-b border-border-subtle px-3 py-2 mb-1">
                  <p className="text-sm font-medium text-text-primary">{user?.name}</p>
                  <p className="text-xs text-text-muted">{user?.email}</p>
                  <span className="mt-1 inline-block rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">
                    SUPER_ADMIN
                  </span>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-bg-surface hover:text-text-primary transition"
                >
                  <User className="h-4 w-4" />
                  {t('nav.profile')}
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
