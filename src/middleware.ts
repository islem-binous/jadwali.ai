import { NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { jwtVerify } from 'jose'

const intlMiddleware = createIntlMiddleware(routing)

const PUBLIC_PAGES = ['/auth/login', '/auth/signup', '/auth/callback']
const PUBLIC_API = ['/api/auth/', '/api/webhooks/']

function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGES.some((page) => pathname.includes(page))
}

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API.some((prefix) => pathname.startsWith(prefix))
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

async function isValidToken(token: string): Promise<boolean> {
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) return false
    const key = new TextEncoder().encode(secret)
    await jwtVerify(token, key)
    return true
  } catch {
    return false
  }
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes: check auth for protected endpoints
  if (isApiRoute(pathname)) {
    if (isPublicApi(pathname)) {
      return NextResponse.next()
    }

    const token = request.cookies.get('session')?.value
    if (!token || !(await isValidToken(token))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Page routes: run i18n middleware first
  const response = intlMiddleware(request)

  // Check if this is a public page
  if (isPublicPage(pathname)) {
    return response
  }

  // For protected pages, check session cookie
  const isProtectedPage =
    pathname.includes('/dashboard') ||
    pathname.includes('/teachers') ||
    pathname.includes('/students') ||
    pathname.includes('/classes') ||
    pathname.includes('/subjects') ||
    pathname.includes('/rooms') ||
    pathname.includes('/timetable') ||
    pathname.includes('/absences') ||
    pathname.includes('/events') ||
    pathname.includes('/reports') ||
    pathname.includes('/settings') ||
    pathname.includes('/marks') ||
    pathname.includes('/profile') ||
    pathname.includes('/admin') ||
    pathname.includes('/leave') ||
    pathname.includes('/payments') ||
    pathname.includes('/import') ||
    pathname.includes('/export')

  if (isProtectedPage) {
    const token = request.cookies.get('session')?.value
    if (!token || !(await isValidToken(token))) {
      // Determine locale from URL
      const localeMatch = pathname.match(/^\/(en|fr|ar)\//)
      const locale = localeMatch ? localeMatch[1] : 'fr'
      return NextResponse.redirect(
        new URL(`/${locale}/auth/login`, request.url)
      )
    }
  }

  return response
}

export const config = {
  matcher: ['/', '/(fr|en|ar)/:path*', '/api/:path*'],
}
