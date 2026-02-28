'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Clock, ArrowLeft } from 'lucide-react'

export default function PendingActivationPage() {
  const t = useTranslations()

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Icon */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-dim">
            <Clock className="h-7 w-7 text-warning" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-text-primary">
            {t('auth.pending_activation_title')}
          </h1>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border-subtle bg-bg-card p-6 shadow-card">
          <p className="text-center text-sm leading-relaxed text-text-secondary">
            {t('auth.pending_activation_message')}
          </p>
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent transition hover:text-accent-hover"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('auth.back_to_login')}
          </Link>
        </div>
      </div>
    </div>
  )
}
