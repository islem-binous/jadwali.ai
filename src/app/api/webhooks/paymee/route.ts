import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { verifyPaymeePayment } from '@/lib/payment'
import { activateSubscription, computePeriodEnd } from '@/lib/subscription'

export async function POST(req: NextRequest) {
  try {
    const prisma = await getPrisma()
    const body = await req.json()
    const token = body.token

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    const payment = await prisma.payment.findFirst({
      where: { providerRef: token, provider: 'paymee' },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.status === 'COMPLETED') {
      return NextResponse.json({ ok: true, message: 'Already processed' })
    }

    const verification = await verifyPaymeePayment(token)

    if (verification.status === 'COMPLETED') {
      const periodEnd = computePeriodEnd(
        payment.billingCycle as 'monthly' | 'annual'
      )

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          paidAt: new Date(),
          periodStart: new Date(),
          periodEnd,
        },
      })

      await activateSubscription(
        payment.schoolId,
        payment.plan,
        payment.billingCycle as 'monthly' | 'annual',
        'paymee'
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Paymee webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
