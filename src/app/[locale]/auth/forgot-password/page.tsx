'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Loader2, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const t = useTranslations()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Request failed')
      }

      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent shadow-accent-glow">
            <span className="font-display text-2xl font-bold text-white">S</span>
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-text-primary">
            {t('auth.reset_password')}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {t('auth.forgot_password_desc')}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border-subtle bg-bg-card p-6 shadow-card">
          {sent ? (
            <div className="space-y-4">
              <div className="rounded-md bg-success/10 p-4 text-sm text-success">
                {t('auth.reset_email_sent')}
              </div>
              <Link
                href="/auth/login"
                className="flex items-center justify-center gap-2 text-sm font-medium text-accent hover:text-accent-hover transition"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('auth.back_to_login')}
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-md bg-danger-dim p-3 text-sm text-danger">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-secondary">
                    {t('auth.email')}
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border border-border-default bg-bg-elevated px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                    placeholder="admin@school.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('auth.send_reset_link')}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t('auth.back_to_login')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
