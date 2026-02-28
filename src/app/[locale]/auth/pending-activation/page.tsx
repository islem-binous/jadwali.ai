'use client'

import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { Clock, ArrowLeft, Mail } from 'lucide-react'
import { Suspense } from 'react'

function PendingActivationContent() {
  const t = useTranslations()
  const searchParams = useSearchParams()
  const role = searchParams.get('role')
  const isDirector = role === 'DIRECTOR'

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Icon */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-dim">
            <Clock className="h-7 w-7 text-warning" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-text-primary">
            {t('auth.pending_activation_title')}
          </h1>
        </div>

        {/* Main message card */}
        <div className="rounded-xl border border-border-subtle bg-bg-card p-6 shadow-card space-y-4">
          <p className="text-center text-sm leading-relaxed text-text-secondary">
            {isDirector
              ? t('auth.pending_activation_message')
              : t('auth.pending_activation_message_other')}
          </p>

          {/* ID card instruction — only for directors */}
          {isDirector && (
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-primary">
                    {t('auth.pending_activation_id_instruction')}
                  </p>
                  <a
                    href="mailto:activation@jadwali.ai"
                    className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent-hover"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    activation@jadwali.ai
                  </a>
                </div>
              </div>
            </div>
          )}
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

export default function PendingActivationPage() {
  return (
    <Suspense>
      <PendingActivationContent />
    </Suspense>
  )
}
