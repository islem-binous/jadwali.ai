'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'

interface LegalPageShellProps {
  children: React.ReactNode
}

export function LegalPageShell({ children }: LegalPageShellProps) {
  const t = useTranslations()

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border-subtle bg-bg-base/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent">
              <span className="font-display text-lg font-bold text-white">J</span>
            </div>
            <span className="font-display text-xl font-bold text-text-primary">
              jadwali<span className="text-accent">.ai</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/auth/login"
              className="hidden sm:inline-block rounded-md px-4 py-2 text-sm font-medium text-text-secondary transition hover:text-text-primary"
            >
              {t('auth.sign_in')}
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
            >
              {t('auth.sign_up')}
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pt-16">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border-subtle px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent">
                <span className="font-display text-sm font-bold text-white">J</span>
              </div>
              <span className="font-display text-lg font-bold text-text-primary">
                jadwali<span className="text-accent">.ai</span>
              </span>
            </Link>
            <div className="flex gap-6 text-sm text-text-muted">
              <Link href="/privacy" className="transition hover:text-text-secondary">
                {t('legal.privacy')}
              </Link>
              <Link href="/terms" className="transition hover:text-text-secondary">
                {t('legal.terms')}
              </Link>
              <Link href="/support" className="transition hover:text-text-secondary">
                {t('legal.support')}
              </Link>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-text-muted">
            &copy; 2026 jadwali.ai. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
