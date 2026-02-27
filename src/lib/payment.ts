import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getPlan } from '@/lib/plans'

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

async function getEnv(key: string): Promise<string> {
  if (process.env[key]) return process.env[key]!
  try {
    const { env } = await getCloudflareContext()
    return (env as unknown as Record<string, string>)[key] || ''
  } catch {
    return ''
  }
}

export function generateOrderId(schoolId: string): string {
  return `SCQ-${schoolId.slice(-6)}-${Date.now().toString(36).toUpperCase()}`
}

export async function computeAmount(plan: string, cycle: BillingCycle): Promise<number> {
  const planDef = await getPlan(plan)
  if (!planDef) return 0
  const price = cycle === 'monthly' ? planDef.price.monthly : planDef.price.annual
  return price ?? 0
}

// ── Konnect ─────────────────────────────────────────────────

async function initKonnect(params: InitPaymentParams): Promise<InitPaymentResult> {
  const apiUrl = await getEnv('KONNECT_API_URL')
  const apiKey = await getEnv('KONNECT_API_KEY')
  const walletId = await getEnv('KONNECT_WALLET_ID')
  const appUrl = await getEnv('NEXT_PUBLIC_APP_URL')

  if (!apiUrl || !apiKey || !walletId) {
    throw new Error('Konnect not configured: missing API_URL, API_KEY, or WALLET_ID')
  }

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
      successUrl: `${appUrl}/${params.locale}/billing?status=success&orderId=${params.orderId}`,
      failUrl: `${appUrl}/${params.locale}/billing?status=failed&orderId=${params.orderId}`,
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
  const apiUrl = await getEnv('PAYMEE_API_URL')
  const apiToken = await getEnv('PAYMEE_API_TOKEN')
  const vendorId = await getEnv('PAYMEE_VENDOR_ID')
  const appUrl = await getEnv('NEXT_PUBLIC_APP_URL')

  if (!apiUrl || !apiToken || !vendorId) {
    throw new Error('Paymee not configured: missing API_URL, API_TOKEN, or VENDOR_ID')
  }

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
  const apiUrl = await getEnv('KONNECT_API_URL')
  const apiKey = await getEnv('KONNECT_API_KEY')

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
  const apiUrl = await getEnv('PAYMEE_API_URL')
  const apiToken = await getEnv('PAYMEE_API_TOKEN')

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
