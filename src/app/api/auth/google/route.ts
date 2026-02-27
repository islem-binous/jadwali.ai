import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getAppSettings } from '@/lib/app-settings'

async function getEnv(key: string): Promise<string | undefined> {
  if (process.env[key]) return process.env[key]
  try {
    const { env } = await getCloudflareContext()
    return (env as unknown as Record<string, string>)[key]
  } catch {
    return undefined
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') || 'login'
  const locale = searchParams.get('locale') || 'fr'
  const role = searchParams.get('role') || ''

  // Check if Google OAuth is enabled before redirecting to Google
  try {
    const settings = await getAppSettings()
    if (!settings.googleOAuthEnabled) {
      const origin = request.headers.get('x-forwarded-host')
        ? `https://${request.headers.get('x-forwarded-host')}`
        : new URL(request.url).origin
      const page = mode === 'signup' ? 'signup' : 'login'
      return NextResponse.redirect(`${origin}/${locale}/auth/${page}?error=google_disabled`)
    }
  } catch {
    // If settings fetch fails, allow OAuth to proceed
  }

  const clientId = await getEnv('GOOGLE_CLIENT_ID')
  if (!clientId) {
    const origin = request.headers.get('x-forwarded-host')
      ? `https://${request.headers.get('x-forwarded-host')}`
      : new URL(request.url).origin
    const page = mode === 'signup' ? 'signup' : 'login'
    return NextResponse.redirect(`${origin}/${locale}/auth/${page}?error=google_error`)
  }

  // Determine redirect URI based on request origin
  const origin = request.headers.get('x-forwarded-host')
    ? `https://${request.headers.get('x-forwarded-host')}`
    : new URL(request.url).origin
  const redirectUri = `${origin}/api/auth/callback/google`

  // CSRF protection: generate nonce and store in httpOnly cookie
  const nonce = crypto.randomUUID()
  const state = btoa(JSON.stringify({ mode, locale, role, nonce }))

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  googleAuthUrl.searchParams.set('client_id', clientId)
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri)
  googleAuthUrl.searchParams.set('response_type', 'code')
  googleAuthUrl.searchParams.set('scope', 'openid email profile')
  googleAuthUrl.searchParams.set('state', state)
  googleAuthUrl.searchParams.set('access_type', 'online')
  googleAuthUrl.searchParams.set('prompt', 'select_account')

  const response = NextResponse.redirect(googleAuthUrl.toString())
  response.cookies.set('oauth_state', nonce, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  })

  return response
}
