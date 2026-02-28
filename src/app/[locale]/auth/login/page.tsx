'use client'

import { useState, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

function LoginForm() {
  const t = useTranslations()
  const router = useRouter()
  const { signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await signIn(email, password)
      router.push(user.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
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
            {t('auth.sign_in')}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {t('app.tagline')}
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-border-subtle bg-bg-card p-6 shadow-card">
          {/* Error */}
          {error && (
            <div className="mb-4 rounded-md bg-danger-dim p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
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

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-text-secondary">
                  {t('auth.password')}
                </label>
                <Link href="/auth/forgot-password" className="text-xs text-accent hover:text-accent-hover transition">
                  {t('auth.forgot_password')}
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-border-default bg-bg-elevated px-3 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 rounded border-border-default bg-bg-elevated text-accent focus:ring-accent"
              />
              <label htmlFor="remember" className="text-sm text-text-secondary">
                {t('auth.remember_me')}
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('auth.sign_in')}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-text-muted">
          {t('auth.no_account')}{' '}
          <Link href="/auth/signup" className="font-medium text-accent transition hover:text-accent-hover">
            {t('auth.sign_up')}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
