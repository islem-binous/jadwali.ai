import { Link } from '@/i18n/navigation'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base p-4">
      <div className="text-center">
        <p className="font-display text-6xl font-bold text-accent">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-text-primary">Page not found</h1>
        <p className="mt-2 text-sm text-text-secondary">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
