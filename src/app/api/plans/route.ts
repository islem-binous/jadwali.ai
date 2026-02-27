import { NextResponse } from 'next/server'
import { getPlans } from '@/lib/plans'

/** Public endpoint — no auth required (landing page needs it) */
export async function GET() {
  try {
    const plans = await getPlans()
    return NextResponse.json(Object.values(plans))
  } catch (err) {
    console.error('[Plans GET Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
