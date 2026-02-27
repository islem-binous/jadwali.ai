'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAdminFetch } from '@/hooks/useAdminFetch'
import {
  Building2,
  Users,
  GraduationCap,
  UserCheck,
  CreditCard,
  TrendingUp,
  Loader2,
} from 'lucide-react'

interface Stats {
  schoolCount: number
  userCount: number
  teacherCount: number
  studentCount: number
  staffCount: number
  paymentCount: number
  totalRevenue: number
  planBreakdown: Record<string, number>
  statusBreakdown: Record<string, number>
}

export default function AdminDashboard() {
  const t = useTranslations('admin')
  const { adminFetch } = useAdminFetch()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminFetch('/api/admin/stats')
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [adminFetch])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  if (!stats) return null

  const cards = [
    { label: t('schools'), value: stats.schoolCount, icon: Building2, color: 'text-blue-400' },
    { label: t('users'), value: stats.userCount, icon: Users, color: 'text-green-400' },
    { label: t('teachers'), value: stats.teacherCount, icon: UserCheck, color: 'text-purple-400' },
    { label: t('students'), value: stats.studentCount, icon: GraduationCap, color: 'text-yellow-400' },
    { label: t('payments'), value: stats.paymentCount, icon: CreditCard, color: 'text-pink-400' },
    { label: t('revenue'), value: `${(stats.totalRevenue / 1000).toFixed(1)} DT`, icon: TrendingUp, color: 'text-emerald-400' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-text-primary">
        {t('dashboard_title')}
      </h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="rounded-xl border border-border-subtle bg-bg-card p-4"
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${card.color}`} />
                <span className="text-xs text-text-muted">{card.label}</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-text-primary">{card.value}</p>
            </div>
          )
        })}
      </div>

      {/* Plan breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border-subtle bg-bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-text-primary">{t('plan_breakdown')}</h2>
          <div className="space-y-3">
            {Object.entries(stats.planBreakdown).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">{plan}</span>
                <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-sm font-medium text-accent">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-text-primary">{t('subscription_status')}</h2>
          <div className="space-y-3">
            {Object.entries(stats.statusBreakdown).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">{status}</span>
                <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-sm font-medium text-accent">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
