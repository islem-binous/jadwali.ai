'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useAdminFetch } from '@/hooks/useAdminFetch'
import { CreditCard, Search, Loader2 } from 'lucide-react'

interface PaymentRow {
  id: string
  provider: string
  providerRef: string
  orderId: string
  plan: string
  billingCycle: string
  amount: number
  currency: string
  status: string
  paidAt: string | null
  createdAt: string
  school: { name: string }
}

export default function AdminPaymentsPage() {
  const t = useTranslations('admin')
  const { adminFetch } = useAdminFetch()
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    adminFetch(`/api/admin/payments?${params}`)
      .then((r) => r.json())
      .then((d) => setPayments(d.payments || []))
      .finally(() => setLoading(false))
  }, [adminFetch, statusFilter])

  useEffect(() => { load() }, [load])

  const statusColors: Record<string, string> = {
    COMPLETED: 'bg-green-500/10 text-green-400',
    PENDING: 'bg-yellow-500/10 text-yellow-400',
    FAILED: 'bg-red-500/10 text-red-400',
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-text-primary">
        {t('payments')}
      </h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-border-subtle bg-bg-surface px-3 text-sm text-text-primary"
        >
          <option value="">{t('all_statuses')}</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="PENDING">PENDING</option>
          <option value="FAILED">FAILED</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs text-text-muted">
                <th className="px-4 py-3">{t('school')}</th>
                <th className="px-4 py-3">{t('provider')}</th>
                <th className="px-4 py-3">{t('plan')}</th>
                <th className="px-4 py-3">{t('amount')}</th>
                <th className="px-4 py-3">{t('status')}</th>
                <th className="px-4 py-3">{t('date')}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border-subtle last:border-0 hover:bg-bg-surface/50">
                  <td className="px-4 py-3 font-medium text-text-primary">{p.school.name}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs uppercase">{p.provider}</td>
                  <td className="px-4 py-3 text-text-secondary">{p.plan} / {p.billingCycle}</td>
                  <td className="px-4 py-3 text-text-primary font-medium">
                    {(p.amount / 1000).toFixed(3)} {p.currency}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[p.status] || ''}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                    {t('no_results')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
