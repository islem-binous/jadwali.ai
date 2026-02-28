import { NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

/**
 * Middleware handles i18n only.
 * Auth is handled by:
 *   - API routes: requireAuth() in each route handler
 *   - Pages: AuthGuard component calls /api/auth/me
 *
 * JWT validation was removed from middleware because Cloudflare Workers
 * middleware context cannot reliably access secrets via getCloudflareContext().
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes: pass through — each handler does its own auth via requireAuth()
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Page routes: run i18n middleware
  return intlMiddleware(request)
}

export const config = {
  matcher: ['/', '/(fr|en|ar)/:path*', '/api/:path*'],
}
