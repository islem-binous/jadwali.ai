export type PaymentProvider = 'konnect' | 'paymee'
export type BillingCycle = 'monthly' | 'annual'

export interface InitPaymentParams {
  provider: PaymentProvider
  plan: string
  billingCycle: BillingCycle
  amount: number // whole DT
  orderId: string
  schoolId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  locale: string
}

export interface InitPaymentResult {
  payUrl: string
  providerRef: string
}

export function generateOrderId(schoolId: string): string {
  return `SCQ-${schoolId.slice(-6)}-${Date.now().toString(36).toUpperCase()}`
}

export function computeAmount(plan: string, cycle: BillingCycle): number {
  const prices: Record<string, { monthly: number; annual: number }> = {
    STARTER: { monthly: 89, annual: 854 },
    PRO: { monthly: 249, annual: 2390 },
  }
  return prices[plan]?.[cycle] ?? 0
}

// ── Konnect ─────────────────────────────────────────────────

async function initKonnect(params: InitPaymentParams): Promise<InitPaymentResult> {
  const apiUrl = process.env.KONNECT_API_URL!
  const apiKey = process.env.KONNECT_API_KEY!
  const walletId = process.env.KONNECT_WALLET_ID!
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  const res = await fetch(`${apiUrl}/payments/init-payment`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      receiverWalletId: walletId,
      amount: params.amount * 1000, // DT → millimes
      token: 'TND',
      type: 'immediate',
      description: `Jadwali ${params.plan} - ${params.billingCycle}`,
      acceptedPaymentMethods: ['bank_card', 'e-DINAR', 'wallet'],
      lifespan: 30,
      webhook: `${appUrl}/api/webhooks/konnect`,
      orderId: params.orderId,
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      phoneNumber: params.phone || undefined,
      theme: 'dark',
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Konnect init failed: ${error}`)
  }

  const data = await res.json()
  return { payUrl: data.payUrl, providerRef: data.paymentRef }
}

// ── Paymee ──────────────────────────────────────────────────

async function initPaymee(params: InitPaymentParams): Promise<InitPaymentResult> {
  const apiUrl = process.env.PAYMEE_API_URL!
  const apiToken = process.env.PAYMEE_API_TOKEN!
  const vendorId = process.env.PAYMEE_VENDOR_ID!
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  const res = await fetch(`${apiUrl}/payments/create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vendor: vendorId,
      amount: params.amount,
      note: `Jadwali ${params.plan} - ${params.billingCycle}`,
      first_name: params.firstName,
      last_name: params.lastName,
      email: params.email,
      phone: params.phone || '+21600000000',
      return_url: `${appUrl}/${params.locale}/billing?status=success&orderId=${params.orderId}`,
      cancel_url: `${appUrl}/${params.locale}/billing?status=failed&orderId=${params.orderId}`,
      webhook_url: `${appUrl}/api/webhooks/paymee`,
      order_id: params.orderId,
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Paymee init failed: ${error}`)
  }

  const data = await res.json()
  return { payUrl: data.data.payment_url, providerRef: data.data.token }
}

// ── Verify ──────────────────────────────────────────────────

export async function verifyKonnectPayment(
  paymentRef: string
): Promise<{ status: string; amount: number }> {
  const apiUrl = process.env.KONNECT_API_URL!
  const apiKey = process.env.KONNECT_API_KEY!

  const res = await fetch(`${apiUrl}/payments/${paymentRef}`, {
    headers: { 'x-api-key': apiKey },
  })
  const data = await res.json()
  return {
    status: data.payment?.status === 'completed' ? 'COMPLETED' : 'PENDING',
    amount: data.payment?.amount || 0,
  }
}

export async function verifyPaymeePayment(
  token: string
): Promise<{ status: string; amount: number }> {
  const apiUrl = process.env.PAYMEE_API_URL!
  const apiToken = process.env.PAYMEE_API_TOKEN!

  const res = await fetch(`${apiUrl}/payments/${token}/check`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  })
  const data = await res.json()
  return {
    status: data.data?.payment_status === true ? 'COMPLETED' : 'PENDING',
    amount: data.data?.amount || 0,
  }
}

// ── Public entry point ──────────────────────────────────────

export async function initPayment(
  params: InitPaymentParams
): Promise<InitPaymentResult> {
  if (params.provider === 'konnect') return initKonnect(params)
  if (params.provider === 'paymee') return initPaymee(params)
  throw new Error(`Unknown provider: ${params.provider}`)
}
