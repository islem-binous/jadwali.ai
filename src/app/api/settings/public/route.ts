import { NextResponse } from 'next/server'
import { getAppSettings } from '@/lib/app-settings'

/** Public endpoint — returns only non-sensitive platform settings */
export async function GET() {
  try {
    const settings = await getAppSettings()
    return NextResponse.json({
      platformName: settings.platformName,
      googleOAuthEnabled: settings.googleOAuthEnabled,
      registrationEnabled: settings.registrationEnabled,
    })
  } catch (err) {
    console.error('[Public Settings Error]', err)
    return NextResponse.json({
      platformName: 'SchediQ',
      googleOAuthEnabled: true,
      registrationEnabled: true,
    })
  }
}
