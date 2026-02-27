'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAdminFetch } from '@/hooks/useAdminFetch'
import {
  CreditCard,
  Loader2,
  Save,
  CheckCircle2,
  Star,
  Eye,
  EyeOff,
} from 'lucide-react'

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-base disabled:opacity-50 ${
        checked ? 'bg-accent' : 'bg-bg-surface'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
          checked ? 'ltr:translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

interface PlanRow {
  id: string
  nameEn: string
  nameFr: string
  nameAr: string
  priceMonthly: number | null
  priceAnnual: number | null
  maxTeachers: number
  maxClasses: number
  maxTimetables: number
  aiGeneration: boolean
  aiAssistant: boolean
  substituteAI: boolean
  exportPDF: boolean
  exportExcel: boolean
  shareLink: boolean
  multiUser: boolean
  support: string
  featureListEn: string
  featureListFr: string
  featureListAr: string
  highlighted: boolean
  sortOrder: number
  isActive: boolean
}

export default function AdminPlansPage() {
  const t = useTranslations('admin')
  const { adminFetch } = useAdminFetch()

  const [plans, setPlans] = useState<PlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [editingPlan, setEditingPlan] = useState<PlanRow | null>(null)

  useEffect(() => {
    adminFetch('/api/admin/plans')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPlans(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [adminFetch])

  const handleSave = async (plan: PlanRow) => {
    setSaving(plan.id)
    try {
      const res = await adminFetch('/api/admin/plans', {
        method: 'PUT',
        body: JSON.stringify(plan),
      })
      if (res.ok) {
        const updated = await res.json()
        setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
        setSaved(plan.id)
        setTimeout(() => setSaved(null), 2000)
        setEditingPlan(null)
      }
    } catch {
      // silent
    } finally {
      setSaving(null)
    }
  }

  const formatFeatureList = (json: string): string => {
    try {
      const arr = JSON.parse(json)
      return Array.isArray(arr) ? arr.join('\n') : json
    } catch {
      return json
    }
  }

  const featureListToJson = (text: string): string => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    return JSON.stringify(lines)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-6 w-6 text-accent" />
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {t('plans_title')}
        </h1>
      </div>

      <p className="text-sm text-text-secondary">
        {t('plans_description')}
      </p>

      <div className="grid gap-6 xl:grid-cols-2">
        {plans.map((plan) => {
          const isEditing = editingPlan?.id === plan.id
          const current = isEditing ? editingPlan : plan

          return (
            <div
              key={plan.id}
              className={`rounded-xl border p-6 transition ${
                plan.highlighted
                  ? 'border-accent/40 bg-gradient-to-br from-accent-dim/50 to-bg-card'
                  : 'border-border-subtle bg-bg-card'
              } ${!plan.isActive ? 'opacity-60' : ''}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">
                    {plan.id}
                  </span>
                  {plan.highlighted && (
                    <Star className="h-4 w-4 text-warning fill-warning" />
                  )}
                  {!plan.isActive && (
                    <EyeOff className="h-4 w-4 text-text-muted" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {saved === plan.id && (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  )}
                  {!isEditing ? (
                    <button
                      onClick={() => setEditingPlan({ ...plan })}
                      className="rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-base transition"
                    >
                      {t('plans_edit')}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingPlan(null)}
                        className="rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-base transition"
                      >
                        {t('plans_cancel')}
                      </button>
                      <button
                        onClick={() => handleSave(current)}
                        disabled={saving === plan.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 transition disabled:opacity-50"
                      >
                        {saving === plan.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        {t('plans_save')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Plan names */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-wider text-text-muted mb-1">
                    {t('plans_name_en')}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={current.nameEn}
                      onChange={(e) =>
                        setEditingPlan({ ...current, nameEn: e.target.value })
                      }
                      className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-text-primary">{plan.nameEn}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-wider text-text-muted mb-1">
                    {t('plans_name_fr')}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={current.nameFr}
                      onChange={(e) =>
                        setEditingPlan({ ...current, nameFr: e.target.value })
                      }
                      className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-text-primary">{plan.nameFr}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-wider text-text-muted mb-1">
                    {t('plans_name_ar')}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={current.nameAr}
                      onChange={(e) =>
                        setEditingPlan({ ...current, nameAr: e.target.value })
                      }
                      dir="rtl"
                      className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-text-primary" dir="rtl">{plan.nameAr}</p>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-wider text-text-muted mb-1">
                    {t('plans_price_monthly')}
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={current.priceMonthly ?? ''}
                      onChange={(e) =>
                        setEditingPlan({
                          ...current,
                          priceMonthly: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      placeholder={t('plans_custom')}
                      className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                    />
                  ) : (
                    <p className="text-sm text-text-primary">
                      {plan.priceMonthly !== null ? `${plan.priceMonthly} DT` : t('plans_custom')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-wider text-text-muted mb-1">
                    {t('plans_price_annual')}
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={current.priceAnnual ?? ''}
                      onChange={(e) =>
                        setEditingPlan({
                          ...current,
                          priceAnnual: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      placeholder={t('plans_custom')}
                      className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                    />
                  ) : (
                    <p className="text-sm text-text-primary">
                      {plan.priceAnnual !== null ? `${plan.priceAnnual} DT` : t('plans_custom')}
                    </p>
                  )}
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-wider text-text-muted mb-1">
                    {t('plans_max_teachers')}
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={current.maxTeachers}
                      onChange={(e) =>
                        setEditingPlan({ ...current, maxTeachers: Number(e.target.value) })
                      }
                      className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                    />
                  ) : (
                    <p className="text-sm text-text-primary">
                      {plan.maxTeachers === -1 ? '∞' : plan.maxTeachers}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-wider text-text-muted mb-1">
                    {t('plans_max_classes')}
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={current.maxClasses}
                      onChange={(e) =>
                        setEditingPlan({ ...current, maxClasses: Number(e.target.value) })
                      }
                      className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                    />
                  ) : (
                    <p className="text-sm text-text-primary">
                      {plan.maxClasses === -1 ? '∞' : plan.maxClasses}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-wider text-text-muted mb-1">
                    {t('plans_max_timetables')}
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={current.maxTimetables}
                      onChange={(e) =>
                        setEditingPlan({ ...current, maxTimetables: Number(e.target.value) })
                      }
                      className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                    />
                  ) : (
                    <p className="text-sm text-text-primary">
                      {plan.maxTimetables === -1 ? '∞' : plan.maxTimetables}
                    </p>
                  )}
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="mb-4">
                <label className="block text-[10px] font-medium uppercase tracking-wider text-text-muted mb-2">
                  {t('plans_features')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['aiGeneration', t('plans_ai_generation')],
                    ['aiAssistant', t('plans_ai_assistant')],
                    ['substituteAI', t('plans_substitute_ai')],
                    ['exportPDF', t('plans_export_pdf')],
                    ['exportExcel', t('plans_export_excel')],
                    ['shareLink', t('plans_share_link')],
                    ['multiUser', t('plans_multi_user')],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between gap-2 rounded-lg bg-bg-surface px-3 py-2">
                      <span className="text-xs text-text-secondary">{label}</span>
                      <Toggle
                        checked={current[key] as boolean}
                        onChange={(v) =>
                          isEditing
                            ? setEditingPlan({ ...current, [key]: v })
                            : undefined
                        }
                        disabled={!isEditing}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Support Level */}
              <div className="mb-4">
                <label className="block text-[10px] font-medium uppercase tracking-wider text-text-muted mb-1">
                  {t('plans_support')}
                </label>
                {isEditing ? (
                  <select
                    value={current.support}
                    onChange={(e) =>
                      setEditingPlan({ ...current, support: e.target.value })
                    }
                    className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                  >
                    <option value="community">{t('plans_support_community')}</option>
                    <option value="email">{t('plans_support_email')}</option>
                    <option value="priority">{t('plans_support_priority')}</option>
                    <option value="dedicated">{t('plans_support_dedicated')}</option>
                  </select>
                ) : (
                  <p className="text-sm text-text-primary capitalize">{plan.support}</p>
                )}
              </div>

              {/* Feature Lists (expandable in edit mode) */}
              {isEditing && (
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-[10px] font-medium uppercase tracking-wider text-text-muted mb-1">
                      {t('plans_feature_list_en')}
                    </label>
                    <textarea
                      value={formatFeatureList(current.featureListEn)}
                      onChange={(e) =>
                        setEditingPlan({
                          ...current,
                          featureListEn: featureListToJson(e.target.value),
                        })
                      }
                      rows={4}
                      className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none resize-none"
                      placeholder="One feature per line"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium uppercase tracking-wider text-text-muted mb-1">
                      {t('plans_feature_list_fr')}
                    </label>
                    <textarea
                      value={formatFeatureList(current.featureListFr)}
                      onChange={(e) =>
                        setEditingPlan({
                          ...current,
                          featureListFr: featureListToJson(e.target.value),
                        })
                      }
                      rows={4}
                      className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none resize-none"
                      placeholder="Une fonctionnalité par ligne"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium uppercase tracking-wider text-text-muted mb-1">
                      {t('plans_feature_list_ar')}
                    </label>
                    <textarea
                      value={formatFeatureList(current.featureListAr)}
                      onChange={(e) =>
                        setEditingPlan({
                          ...current,
                          featureListAr: featureListToJson(e.target.value),
                        })
                      }
                      dir="rtl"
                      rows={4}
                      className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none resize-none"
                      placeholder="ميزة واحدة لكل سطر"
                    />
                  </div>
                </div>
              )}

              {/* Bottom toggles: highlighted + active */}
              <div className="flex items-center gap-6 pt-3 border-t border-border-subtle">
                <div className="flex items-center gap-2">
                  <Toggle
                    checked={current.highlighted}
                    onChange={(v) =>
                      isEditing
                        ? setEditingPlan({ ...current, highlighted: v })
                        : undefined
                    }
                    disabled={!isEditing}
                  />
                  <span className="text-xs text-text-secondary flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {t('plans_highlighted')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Toggle
                    checked={current.isActive}
                    onChange={(v) =>
                      isEditing
                        ? setEditingPlan({ ...current, isActive: v })
                        : undefined
                    }
                    disabled={!isEditing}
                  />
                  <span className="text-xs text-text-secondary flex items-center gap-1">
                    {current.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {t('plans_active')}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Help text */}
      <div className="rounded-lg bg-bg-surface border border-border-subtle p-4">
        <p className="text-xs text-text-muted">
          {t('plans_help')}
        </p>
      </div>
    </div>
  )
}
