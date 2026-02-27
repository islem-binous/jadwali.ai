'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useAdminFetch } from '@/hooks/useAdminFetch'
import {
  Building2,
  Search,
  Users,
  Loader2,
  ExternalLink,
  Trash2,
} from 'lucide-react'

interface SchoolRow {
  id: string
  name: string
  slug: string
  plan: string
  subscriptionStatus: string
  language: string
  createdAt: string
  _count: { users: number; teachers: number; classes: number }
}

export default function AdminSchoolsPage() {
  const t = useTranslations('admin')
  const { adminFetch } = useAdminFetch()
  const [schools, setSchools] = useState<SchoolRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (planFilter) params.set('plan', planFilter)
    adminFetch(`/api/admin/schools?${params}`)
      .then((r) => r.json())
      .then((d) => setSchools(d.schools || []))
      .finally(() => setLoading(false))
  }, [adminFetch, search, planFilter])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete school "${name}"? This cannot be undone.`)) return
    await adminFetch(`/api/admin/schools/${id}`, { method: 'DELETE' })
    load()
  }

  const planColors: Record<string, string> = {
    FREE: 'bg-gray-500/10 text-gray-400',
    STARTER: 'bg-blue-500/10 text-blue-400',
    PRO: 'bg-purple-500/10 text-purple-400',
    ENTERPRISE: 'bg-amber-500/10 text-amber-400',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {t('schools')}
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_schools')}
            className="h-9 w-full rounded-md border border-border-subtle bg-bg-surface pl-9 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="h-9 rounded-md border border-border-subtle bg-bg-surface px-3 text-sm text-text-primary"
        >
          <option value="">{t('all_plans')}</option>
          <option value="FREE">FREE</option>
          <option value="STARTER">STARTER</option>
          <option value="PRO">PRO</option>
          <option value="ENTERPRISE">ENTERPRISE</option>
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
                <th className="px-4 py-3">{t('name')}</th>
                <th className="px-4 py-3">{t('slug')}</th>
                <th className="px-4 py-3">{t('plan')}</th>
                <th className="px-4 py-3">{t('status')}</th>
                <th className="px-4 py-3"><Users className="inline h-3.5 w-3.5" /></th>
                <th className="px-4 py-3">{t('tab_classes')}</th>
                <th className="px-4 py-3">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id} className="border-b border-border-subtle last:border-0 hover:bg-bg-surface/50">
                  <td className="px-4 py-3 font-medium text-text-primary">
                    <Link href={`/admin/schools/${s.id}`} className="hover:text-accent transition">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-muted font-mono text-xs">{s.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${planColors[s.plan] || 'bg-gray-500/10 text-gray-400'}`}>
                      {s.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">{s.subscriptionStatus}</td>
                  <td className="px-4 py-3 text-text-secondary">{s._count.teachers}</td>
                  <td className="px-4 py-3 text-text-secondary">{s._count.classes}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/admin/schools/${s.id}`}
                        className="rounded p-1 text-text-muted hover:bg-bg-surface hover:text-accent transition"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        className="rounded p-1 text-text-muted hover:bg-danger-dim hover:text-danger transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {schools.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
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
