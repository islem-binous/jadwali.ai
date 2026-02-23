import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  initPayment,
  generateOrderId,
  computeAmount,
} from '@/lib/payment'
import type { PaymentProvider, BillingCycle } from '@/lib/payment'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      schoolId,
      userId,
      plan,
      billingCycle,
      provider,
      firstName,
      lastName,
      email,
      phone,
      locale,
    } = body

    if (
      !schoolId ||
      !plan ||
      !billingCycle ||
      !provider ||
      !firstName ||
      !lastName ||
      !email
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['STARTER', 'PRO'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    if (!['konnect', 'paymee'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (
      !user ||
      user.schoolId !== schoolId ||
      !['OWNER', 'ADMIN'].includes(user.role)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const amount = computeAmount(plan, billingCycle as BillingCycle)
    if (amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const orderId = generateOrderId(schoolId)

    const result = await initPayment({
      provider: provider as PaymentProvider,
      plan,
      billingCycle: billingCycle as BillingCycle,
      amount,
      orderId,
      schoolId,
      firstName,
      lastName,
      email,
      phone,
      locale: locale || 'fr',
    })

    await prisma.payment.create({
      data: {
        schoolId,
        provider,
        providerRef: result.providerRef,
        orderId,
        plan,
        billingCycle,
        amount: amount * 1000,
        status: 'PENDING',
        firstName,
        lastName,
        email,
      },
    })

    return NextResponse.json({ payUrl: result.payUrl, orderId })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Payment initialization failed' },
      { status: 500 }
    )
  }
}
