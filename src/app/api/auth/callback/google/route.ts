import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getPrisma } from '@/lib/prisma'
import { checkAndDowngradeExpired } from '@/lib/subscription'

interface GoogleProfile {
  id: string
  email: string
  name: string
  picture?: string
}

async function getEnv(key: string): Promise<string> {
  if (process.env[key]) return process.env[key]!
  try {
    const { env } = await getCloudflareContext()
    return (env as unknown as Record<string, string>)[key] || ''
  } catch {
    return ''
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')
  const errorParam = searchParams.get('error')

  // Determine origin for redirects
  const origin = request.headers.get('x-forwarded-host')
    ? `https://${request.headers.get('x-forwarded-host')}`
    : new URL(request.url).origin

  // Parse state
  let mode = 'login'
  let locale = 'fr'
  let role = ''
  let nonce = ''
  try {
    const parsed = JSON.parse(atob(stateParam || ''))
    mode = parsed.mode || 'login'
    locale = parsed.locale || 'fr'
    role = parsed.role || ''
    nonce = parsed.nonce || ''
  } catch {
    return NextResponse.redirect(`${origin}/${locale}/auth/login?error=google_error`)
  }

  // User denied access on Google consent screen
  if (errorParam) {
    const page = mode === 'signup' ? 'signup' : 'login'
    return NextResponse.redirect(`${origin}/${locale}/auth/${page}?error=google_denied`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/${locale}/auth/login?error=google_error`)
  }

  // Verify CSRF nonce
  const storedNonce = request.cookies.get('oauth_state')?.value
  if (!storedNonce || storedNonce !== nonce) {
    return NextResponse.redirect(`${origin}/${locale}/auth/login?error=google_error`)
  }

  try {
    const redirectUri = `${origin}/api/auth/callback/google`

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: await getEnv('GOOGLE_CLIENT_ID'),
        client_secret: await getEnv('GOOGLE_CLIENT_SECRET'),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', await tokenRes.text())
      return NextResponse.redirect(`${origin}/${locale}/auth/login?error=google_error`)
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    // Fetch user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!profileRes.ok) {
      console.error('Profile fetch failed:', await profileRes.text())
      return NextResponse.redirect(`${origin}/${locale}/auth/login?error=google_error`)
    }

    const profile: GoogleProfile = await profileRes.json()

    const prisma = await getPrisma()

    // Look up existing user by email
    const existingUser = await prisma.user.findUnique({
      where: { email: profile.email },
      include: {
        school: true,
        student: true,
      },
    })

    // ── LOGIN MODE ──
    if (mode === 'login') {
      if (!existingUser) {
        const response = NextResponse.redirect(`${origin}/${locale}/auth/login?error=google_no_account`)
        response.cookies.delete('oauth_state')
        return response
      }

      // Account linking: update authId + avatar
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          authId: `google_${profile.id}`,
          avatarUrl: profile.picture || existingUser.avatarUrl,
        },
      })

      // Check subscription expiry
      if (existingUser.schoolId) {
        await checkAndDowngradeExpired(existingUser.schoolId)
      }

      // Re-fetch school for potentially updated plan
      const school = existingUser.school
      const authUser = {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        role: existingUser.role,
        language: existingUser.language,
        avatarUrl: profile.picture || existingUser.avatarUrl,
        schoolId: existingUser.schoolId,
        schoolName: school?.name || '',
        plan: school?.plan || 'FREE',
        subscriptionStatus: school?.subscriptionStatus ?? 'INACTIVE',
        subscriptionEndsAt: school?.subscriptionEndsAt?.toISOString() ?? null,
        teacherId: existingUser.teacherId,
        studentId: existingUser.studentId,
        classId: existingUser.student?.classId ?? null,
      }

      // Set auth result cookie (readable by client JS)
      const cookieValue = btoa(JSON.stringify(authUser))
      const response = NextResponse.redirect(`${origin}/${locale}/auth/callback`)
      response.cookies.set('auth_result', cookieValue, {
        httpOnly: false,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60,
      })
      response.cookies.delete('oauth_state')
      return response
    }

    // ── SIGNUP MODE ──
    if (existingUser) {
      // User already exists - treat as login (account linking)
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          authId: `google_${profile.id}`,
          avatarUrl: profile.picture || existingUser.avatarUrl,
        },
      })

      if (existingUser.schoolId) {
        await checkAndDowngradeExpired(existingUser.schoolId)
      }

      const school = existingUser.school
      const authUser = {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        role: existingUser.role,
        language: existingUser.language,
        avatarUrl: profile.picture || existingUser.avatarUrl,
        schoolId: existingUser.schoolId,
        schoolName: school?.name || '',
        plan: school?.plan || 'FREE',
        subscriptionStatus: school?.subscriptionStatus ?? 'INACTIVE',
        subscriptionEndsAt: school?.subscriptionEndsAt?.toISOString() ?? null,
        teacherId: existingUser.teacherId,
        studentId: existingUser.studentId,
        classId: existingUser.student?.classId ?? null,
      }

      const cookieValue = btoa(JSON.stringify(authUser))
      const response = NextResponse.redirect(`${origin}/${locale}/auth/callback`)
      response.cookies.set('auth_result', cookieValue, {
        httpOnly: false,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60,
      })
      response.cookies.delete('oauth_state')
      return response
    }

    // New user - redirect to signup page with pre-filled data
    const googleData = {
      newUser: true,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture || null,
      googleId: profile.id,
    }

    const cookieValue = btoa(JSON.stringify(googleData))
    const response = NextResponse.redirect(`${origin}/${locale}/auth/signup?google=true`)
    response.cookies.set('auth_result', cookieValue, {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 300, // 5 minutes for signup form completion
    })
    response.cookies.delete('oauth_state')
    return response
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    const response = NextResponse.redirect(`${origin}/${locale}/auth/login?error=google_error`)
    response.cookies.delete('oauth_state')
    return response
  }
}
