'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useUserStore } from '@/store/userStore'
import type { PlanDef } from '@/lib/plans'
import { Modal } from '@/components/ui/Modal'
import {
  Check,
  FileText,
  Crown,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react'
import type { Locale } from '@/i18n/config'

type PaymentProvider = 'konnect' | 'paymee'

interface InvoiceRecord {
  id: string
  createdAt: string
  amount: number
  plan: string
  status: string
  provider: string
}

export default function BillingPage() {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const user = useUserStore((s) => s.user)
  const setUser = useUserStore((s) => s.setUser)
  const searchParams = useSearchParams()

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [downgradeConfirm, setDowngradeConfirm] = useState(false)
  const [downgrading, setDowngrading] = useState(false)
  const [plansMap, setPlansMap] = useState<Record<string, PlanDef>>({})

  const userPlanKey = (user?.plan ?? 'FREE').toUpperCase()
  const currentPlan = plansMap[userPlanKey] ?? plansMap.FREE
  const plans = Object.entries(plansMap)

  // Fetch plans from API
  useEffect(() => {
    fetch('/api/plans')
      .then((r) => r.json())
      .then((data: PlanDef[]) => {
        if (Array.isArray(data)) {
          const map: Record<string, PlanDef> = {}
          for (const p of data) map[p.id] = p
          setPlansMap(map)
        }
      })
      .catch(() => {})
  }, [])

  // Pre-fill name from user
  useEffect(() => {
    if (user?.name) {
      const parts = user.name.split(' ')
      setFirstName(parts[0] || '')
      setLastName(parts.slice(1).join(' ') || '')
    }
  }, [user?.name])

  // Fetch invoices
  useEffect(() => {
    if (!user?.schoolId) return
    fetch(`/api/payments/history?schoolId=${user.schoolId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.payments) setInvoices(data.payments)
      })
      .catch(() => {})
  }, [user?.schoolId])

  // Post-payment verification on redirect
  const verifyPayment = useCallback(
    async (orderId: string) => {
      setVerifying(true)
      setVerifyMessage(t('billing.verifying_payment'))

      let attempts = 0
      const maxAttempts = 5

      const poll = async () => {
        try {
          const res = await fetch(`/api/payments/verify?orderId=${orderId}`)
          const data = await res.json()

          if (data.status === 'COMPLETED') {
            setVerifyMessage(t('billing.payment_success'))
            // Update user store with new plan
            if (user && data.plan) {
              setUser({
                ...user,
                plan: data.plan,
                subscriptionStatus: 'ACTIVE',
                subscriptionEndsAt: data.periodEnd ?? null,
              })
            }
            // Refresh invoices
            if (user?.schoolId) {
              const invRes = await fetch(
                `/api/payments/history?schoolId=${user.schoolId}`
              )
              const invData = await invRes.json()
              if (invData.payments) setInvoices(invData.payments)
            }
            setTimeout(() => {
              setVerifying(false)
              setVerifyMessage(null)
            }, 3000)
            return
          }

          attempts++
          if (attempts < maxAttempts) {
            setTimeout(poll, 3000)
          } else {
            setVerifyMessage(t('billing.payment_pending'))
            setTimeout(() => {
              setVerifying(false)
              setVerifyMessage(null)
            }, 5000)
          }
        } catch {
          setVerifyMessage(t('billing.payment_failed'))
          setTimeout(() => {
            setVerifying(false)
            setVerifyMessage(null)
          }, 3000)
        }
      }

      poll()
    },
    [t, user, setUser]
  )

  useEffect(() => {
    const status = searchParams.get('status')
    const orderId = searchParams.get('orderId')
    if (status === 'success' && orderId) {
      verifyPayment(orderId)
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams, verifyPayment])

  const handleUpgradeClick = (planKey: string) => {
    setSelectedPlan(planKey)
    setCheckoutOpen(true)
  }

  const handleCheckout = async (provider: PaymentProvider) => {
    if (!user || !selectedPlan) return
    setCheckoutLoading(true)

    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: user.schoolId,
          userId: user.id,
          plan: selectedPlan,
          billingCycle,
          provider,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: user.email,
        }),
      })

      const data = await res.json()

      if (data.payUrl) {
        window.location.href = data.payUrl
      } else {
        alert(data.error || t('billing.payment_failed'))
        setCheckoutLoading(false)
      }
    } catch {
      alert(t('billing.payment_failed'))
      setCheckoutLoading(false)
    }
  }

  const handleDowngrade = async () => {
    if (!user) return
    setDowngrading(true)

    try {
      const res = await fetch('/api/payments/downgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: user.schoolId, userId: user.id }),
      })

      if (res.ok) {
        setUser({
          ...user,
          plan: 'FREE',
          subscriptionStatus: 'CANCELLED',
          subscriptionEndsAt: null,
        })
      }
    } catch {
      // silent
    } finally {
      setDowngrading(false)
      setDowngradeConfirm(false)
    }
  }

  const subscriptionStatus = user?.subscriptionStatus ?? 'INACTIVE'
  const subscriptionEndsAt = user?.subscriptionEndsAt
    ? new Date(user.subscriptionEndsAt)
    : null

  const statusBadge = () => {
    const map: Record<string, { color: string; key: string }> = {
      ACTIVE: { color: 'bg-success/10 text-success', key: 'subscription_active' },
      EXPIRED: { color: 'bg-warning/10 text-warning', key: 'subscription_expired' },
      CANCELLED: { color: 'bg-danger/10 text-danger', key: 'subscription_cancelled' },
      INACTIVE: { color: 'bg-text-muted/10 text-text-muted', key: 'subscription_inactive' },
    }
    const badge = map[subscriptionStatus] ?? map.INACTIVE
    return (
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.color}`}>
        {t(`billing.${badge.key}`)}
      </span>
    )
  }

  const selectedPlanDef = selectedPlan ? plansMap[selectedPlan] : null
  const selectedPrice = selectedPlanDef
    ? billingCycle === 'monthly'
      ? selectedPlanDef.price.monthly
      : selectedPlanDef.price.annual
    : 0

  const getPlanName = (key: string) => {
    const p = plansMap[key]
    if (p) return p.name[locale] || p.name.en
    return key
  }

  if (plans.length === 0 && !verifying) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Verification Banner */}
      {verifying && verifyMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent-dim p-4">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <p className="text-sm font-medium text-text-primary">{verifyMessage}</p>
        </div>
      )}

      {!verifying && verifyMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-4">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <p className="text-sm font-medium text-success">{verifyMessage}</p>
        </div>
      )}

      {/* Title */}
      <h1 className="font-display text-2xl font-bold text-text-primary">
        {t('billing.title')}
      </h1>

      {/* Current Plan Card */}
      <div className="relative overflow-hidden rounded-xl border border-accent/30 bg-gradient-to-br from-accent-dim to-bg-card p-6">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/20">
              <Crown className="h-6 w-6 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-text-primary">
                  {t('billing.current_plan')}
                </h2>
                <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                  {getPlanName(userPlanKey)}
                </span>
                {statusBadge()}
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                {currentPlan.price.monthly !== null &&
                currentPlan.price.monthly > 0 ? (
                  <>
                    <span className="font-display text-2xl font-bold text-text-primary">
                      {currentPlan.price.monthly}
                    </span>{' '}
                    DT / {t('billing.billed_monthly')}
                  </>
                ) : currentPlan.price.monthly === 0 ? (
                  <span className="font-display text-2xl font-bold text-text-primary">
                    0 DT
                  </span>
                ) : (
                  <span className="text-sm text-text-secondary">
                    {t('billing.custom_pricing')}
                  </span>
                )}
              </p>
              {subscriptionEndsAt && subscriptionStatus === 'ACTIVE' && (
                <p className="mt-1 text-xs text-text-muted">
                  {t('billing.expires_on')}{' '}
                  {subscriptionEndsAt.toLocaleDateString(locale)}
                </p>
              )}
            </div>
          </div>

          {/* Current plan features preview */}
          <ul className="flex flex-wrap gap-2">
            {(currentPlan.featureList[locale] || currentPlan.featureList.en)
              .slice(0, 3)
              .map((feat) => (
                <li
                  key={feat}
                  className="flex items-center gap-1.5 rounded-lg bg-bg-surface px-3 py-1.5 text-xs text-text-secondary"
                >
                  <Check className="h-3 w-3 text-success" />
                  {feat}
                </li>
              ))}
          </ul>
        </div>
      </div>

      {/* Monthly / Annual Toggle */}
      <div className="flex flex-col items-center gap-3">
        <div className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-card p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              billingCycle === 'monthly'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('billing.billed_monthly')}
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              billingCycle === 'annual'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('billing.billed_annually')}
          </button>
        </div>
        {billingCycle === 'annual' && (
          <p className="text-xs font-medium text-success">
            {t('billing.save_annual')}
          </p>
        )}
      </div>

      {/* Plan Comparison Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map(([key, plan]) => {
          const price =
            billingCycle === 'monthly' ? plan.price.monthly : plan.price.annual
          const features = plan.featureList[locale] || plan.featureList.en
          const isCurrentPlan = key === userPlanKey
          const isDowngrade =
            Object.keys(plansMap).indexOf(key) <
            Object.keys(plansMap).indexOf(userPlanKey)

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl border p-6 transition ${
                plan.highlighted
                  ? 'border-accent shadow-[0_0_24px_-4px_rgba(79,110,247,0.25)]'
                  : 'border-border-subtle hover:border-border-default'
              } bg-bg-card`}
            >
              {/* Popular badge */}
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-white">
                    <Sparkles className="h-3 w-3" />
                    {t('billing.most_popular')}
                  </span>
                </div>
              )}

              {/* Plan Name */}
              <h3 className="font-display text-lg font-semibold text-text-primary">
                {plan.name[locale] || plan.name.en}
              </h3>

              {/* Price */}
              <div className="mt-4">
                {price !== null ? (
                  <>
                    <span className="font-display text-4xl font-bold text-text-primary">
                      {billingCycle === 'annual' && price > 0
                        ? Math.round(price / 12)
                        : price}
                    </span>
                    <span className="ml-1 text-sm text-text-muted">
                      DT / {t('billing.billed_monthly')}
                    </span>
                    {billingCycle === 'annual' && price > 0 && (
                      <p className="mt-1 text-xs text-success">
                        {price} DT / {t('billing.billed_annually')}
                      </p>
                    )}
                  </>
                ) : (
                  <span className="font-display text-2xl font-bold text-text-primary">
                    {t('billing.contact_sales')}
                  </span>
                )}
              </div>

              {/* Feature List */}
              <ul className="mt-6 flex-1 space-y-2.5">
                {features.map((feat) => (
                  <li
                    key={feat}
                    className="flex items-start gap-2 text-sm text-text-secondary"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {feat}
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              <div className="mt-6">
                {isCurrentPlan ? (
                  <div className="rounded-lg border border-success/30 bg-success/10 py-2.5 text-center text-sm font-semibold text-success">
                    {t('billing.current_plan')}
                  </div>
                ) : price === null ? (
                  <button
                    disabled
                    className="w-full rounded-lg border border-border-default bg-bg-surface py-2.5 text-sm font-semibold text-text-primary opacity-70 cursor-not-allowed"
                  >
                    {t('billing.contact_sales')}
                  </button>
                ) : isDowngrade ? (
                  <button
                    disabled
                    className="w-full rounded-lg border border-border-default bg-bg-surface py-2.5 text-sm font-semibold text-text-muted opacity-50 cursor-not-allowed"
                  >
                    {t('billing.current_plan')}
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgradeClick(key)}
                    className={`w-full rounded-lg py-2.5 text-sm font-semibold transition ${
                      plan.highlighted
                        ? 'bg-accent text-white hover:bg-accent/90'
                        : 'border border-border-default bg-bg-surface text-text-primary hover:bg-bg-base'
                    }`}
                  >
                    {t('billing.upgrade')}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Subscription Management */}
      <div className="rounded-xl border border-border-subtle bg-bg-card p-6">
        <h2 className="font-display text-lg font-semibold text-text-primary mb-4">
          {t('billing.manage')}
        </h2>

        <div className="flex items-center gap-3 rounded-lg bg-bg-surface p-4 mb-4">
          <Info className="h-5 w-5 shrink-0 text-accent" />
          <p className="text-sm text-text-secondary">
            {t('billing.providers_info')}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Renew button — show if ACTIVE or EXPIRED and not FREE */}
          {userPlanKey !== 'FREE' &&
            (subscriptionStatus === 'ACTIVE' ||
              subscriptionStatus === 'EXPIRED') && (
              <button
                onClick={() => handleUpgradeClick(userPlanKey)}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90 transition"
              >
                {t('billing.renew')}
              </button>
            )}

          {/* Downgrade button — only if not already FREE */}
          {userPlanKey !== 'FREE' && (
            <button
              onClick={() => setDowngradeConfirm(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/10 transition"
            >
              {t('billing.downgrade')}
            </button>
          )}
        </div>
      </div>

      {/* Invoices Section */}
      <div className="rounded-xl border border-border-subtle bg-bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-5 w-5 text-text-muted" />
          <h2 className="font-display text-lg font-semibold text-text-primary">
            {t('billing.invoices')}
          </h2>
        </div>

        <div className="overflow-hidden rounded-lg border border-border-subtle">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-surface">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                  {t('billing.col_date')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                  {t('billing.col_amount')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                  {t('billing.col_plan')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                  {t('billing.col_status')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                  {t('billing.col_provider')}
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <FileText className="mx-auto mb-2 h-8 w-8 text-text-muted" />
                    <p className="text-sm text-text-muted">
                      {t('billing.no_invoices')}
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-border-subtle last:border-b-0"
                  >
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {new Date(inv.createdAt).toLocaleDateString(locale)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-text-primary">
                      {inv.amount / 1000} DT
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {getPlanName(inv.plan)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                        {t('billing.payment_completed')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary capitalize">
                      {inv.provider}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Checkout Modal */}
      <Modal
        open={checkoutOpen}
        onClose={() => {
          if (!checkoutLoading) setCheckoutOpen(false)
        }}
        title={t('billing.checkout_title')}
        size="md"
      >
        {selectedPlanDef && (
          <div className="space-y-5">
            {/* Plan summary */}
            <div className="rounded-lg bg-bg-surface p-4">
              <p className="text-sm text-text-muted">
                {t('billing.upgrading_to')}
              </p>
              <p className="font-display text-lg font-bold text-text-primary">
                {getPlanName(selectedPlan!)}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">
                  {selectedPrice} DT
                </span>{' '}
                /{' '}
                {billingCycle === 'monthly'
                  ? t('billing.billed_monthly')
                  : t('billing.billed_annually')}
              </p>
            </div>

            {/* Name inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  {t('billing.first_name')}
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  {t('billing.last_name')}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            {/* Provider selection */}
            <div>
              <p className="mb-3 text-sm font-medium text-text-primary">
                {t('billing.choose_provider')}
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => handleCheckout('konnect')}
                  disabled={checkoutLoading}
                  className="flex w-full items-center gap-3 rounded-lg border border-border-default bg-bg-surface px-4 py-3 text-left transition hover:border-accent hover:bg-accent-dim disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#003B5C] text-white font-bold text-xs">
                    K
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-primary">
                      Konnect
                    </p>
                    <p className="text-xs text-text-muted">
                      {t('billing.bank_card_edinar')}
                    </p>
                  </div>
                  {checkoutLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  )}
                </button>

                <button
                  onClick={() => handleCheckout('paymee')}
                  disabled={checkoutLoading}
                  className="flex w-full items-center gap-3 rounded-lg border border-border-default bg-bg-surface px-4 py-3 text-left transition hover:border-accent hover:bg-accent-dim disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E91E63] text-white font-bold text-xs">
                    P
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-primary">
                      Paymee
                    </p>
                    <p className="text-xs text-text-muted">
                      {t('billing.bank_card')}
                    </p>
                  </div>
                  {checkoutLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Downgrade Confirmation Modal */}
      <Modal
        open={downgradeConfirm}
        onClose={() => {
          if (!downgrading) setDowngradeConfirm(false)
        }}
        title={t('billing.downgrade')}
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex gap-3 rounded-lg bg-warning/5 border border-warning/20 p-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
            <p className="text-sm text-text-secondary">
              {t('billing.downgrade_confirm')}
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setDowngradeConfirm(false)}
              disabled={downgrading}
              className="rounded-lg border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-base transition"
            >
              {t('app.cancel')}
            </button>
            <button
              onClick={handleDowngrade}
              disabled={downgrading}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90 transition disabled:opacity-50"
            >
              {downgrading ? t('billing.processing') : t('billing.downgrade')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
