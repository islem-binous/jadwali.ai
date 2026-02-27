'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAdminFetch } from '@/hooks/useAdminFetch'
import {
  Settings,
  Shield,
  Zap,
  AlertTriangle,
  Loader2,
  Save,
  CheckCircle2,
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

interface SettingsData {
  platformName: string
  maintenanceMode: boolean
  registrationEnabled: boolean
  googleOAuthEnabled: boolean
  defaultLanguage: string
  passwordMinLength: number
  sessionDurationHours: number
  aiEnabled: boolean
  trialPeriodDays: number
  maxSchools: number
}

const DEFAULTS: SettingsData = {
  platformName: 'SchediQ',
  maintenanceMode: false,
  registrationEnabled: true,
  googleOAuthEnabled: false,
  defaultLanguage: 'fr',
  passwordMinLength: 8,
  sessionDurationHours: 24,
  aiEnabled: true,
  trialPeriodDays: 14,
  maxSchools: 0,
}

export default function AdminSettingsPage() {
  const t = useTranslations('admin')
  const { adminFetch } = useAdminFetch()

  const [settings, setSettings] = useState<SettingsData>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminFetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => {
        setSettings({
          platformName: data.platformName ?? DEFAULTS.platformName,
          maintenanceMode: data.maintenanceMode ?? DEFAULTS.maintenanceMode,
          registrationEnabled:
            data.registrationEnabled ?? DEFAULTS.registrationEnabled,
          googleOAuthEnabled:
            data.googleOAuthEnabled ?? DEFAULTS.googleOAuthEnabled,
          defaultLanguage: data.defaultLanguage ?? DEFAULTS.defaultLanguage,
          passwordMinLength:
            data.passwordMinLength ?? DEFAULTS.passwordMinLength,
          sessionDurationHours:
            data.sessionDurationHours ?? DEFAULTS.sessionDurationHours,
          aiEnabled: data.aiEnabled ?? DEFAULTS.aiEnabled,
          trialPeriodDays: data.trialPeriodDays ?? DEFAULTS.trialPeriodDays,
          maxSchools: data.maxSchools ?? DEFAULTS.maxSchools,
        })
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [adminFetch])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await adminFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Save failed')
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const update = <K extends keyof SettingsData>(
    key: K,
    value: SettingsData[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const inputClass =
    'w-full rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent'
  const cardClass = 'rounded-xl border border-border-subtle bg-bg-card p-6'
  const labelClass = 'block text-sm font-medium text-text-primary'
  const helpClass = 'text-xs text-text-muted mt-1'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {t('settings_title')}
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {success ? t('settings_saved') : t('save_changes')}
        </button>
      </div>

      {/* Success / Error banners */}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          {t('settings_saved')}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Section 1: General */}
      <div className={cardClass}>
        <div className="mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">
            {t('settings_general')}
          </h2>
        </div>
        <div className="space-y-4">
          {/* Platform Name */}
          <div>
            <label className={labelClass}>{t('platform_name')}</label>
            <input
              type="text"
              value={settings.platformName}
              onChange={(e) => update('platformName', e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </div>
          {/* Default Language */}
          <div>
            <label className={labelClass}>{t('default_language')}</label>
            <select
              value={settings.defaultLanguage}
              onChange={(e) => update('defaultLanguage', e.target.value)}
              className={`${inputClass} mt-1`}
            >
              <option value="FR">Français</option>
              <option value="EN">English</option>
              <option value="AR">العربية</option>
            </select>
          </div>
          {/* Max Schools */}
          <div>
            <label className={labelClass}>{t('max_schools')}</label>
            <input
              type="number"
              min={0}
              value={settings.maxSchools}
              onChange={(e) => update('maxSchools', Number(e.target.value))}
              className={`${inputClass} mt-1`}
            />
            <p className={helpClass}>{t('max_schools_help')}</p>
          </div>
        </div>
      </div>

      {/* Section 2: Security */}
      <div className={cardClass}>
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">
            {t('settings_security')}
          </h2>
        </div>
        <div className="space-y-4">
          {/* Registration Enabled */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-text-primary">
                {t('registration_enabled')}
              </span>
              <p className="text-xs text-text-muted">
                {t('registration_enabled_desc')}
              </p>
            </div>
            <Toggle
              checked={settings.registrationEnabled}
              onChange={(v) => update('registrationEnabled', v)}
            />
          </div>
          {/* Google OAuth */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-text-primary">
                {t('google_oauth_enabled')}
              </span>
              <p className="text-xs text-text-muted">
                {t('google_oauth_enabled_desc')}
              </p>
            </div>
            <Toggle
              checked={settings.googleOAuthEnabled}
              onChange={(v) => update('googleOAuthEnabled', v)}
            />
          </div>
          {/* Min Password Length */}
          <div>
            <label className={labelClass}>{t('min_password_length')}</label>
            <input
              type="number"
              min={6}
              max={128}
              value={settings.passwordMinLength}
              onChange={(e) => update('passwordMinLength', Number(e.target.value))}
              className={`${inputClass} mt-1`}
            />
          </div>
          {/* Session Duration */}
          <div>
            <label className={labelClass}>{t('session_duration')}</label>
            <input
              type="number"
              min={1}
              value={settings.sessionDurationHours}
              onChange={(e) =>
                update('sessionDurationHours', Number(e.target.value))
              }
              className={`${inputClass} mt-1`}
            />
          </div>
        </div>
      </div>

      {/* Section 3: Features */}
      <div className={cardClass}>
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">
            {t('settings_features')}
          </h2>
        </div>
        <div className="space-y-4">
          {/* AI Enabled */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-text-primary">
                {t('ai_enabled')}
              </span>
              <p className="text-xs text-text-muted">{t('ai_enabled_desc')}</p>
            </div>
            <Toggle
              checked={settings.aiEnabled}
              onChange={(v) => update('aiEnabled', v)}
            />
          </div>
          {/* Trial Period */}
          <div>
            <label className={labelClass}>{t('trial_period_days')}</label>
            <input
              type="number"
              min={0}
              value={settings.trialPeriodDays}
              onChange={(e) =>
                update('trialPeriodDays', Number(e.target.value))
              }
              className={`${inputClass} mt-1`}
            />
            <p className={helpClass}>{t('trial_period_days_desc')}</p>
          </div>
        </div>
      </div>

      {/* Section 4: Maintenance */}
      <div
        className={`rounded-xl border p-6 ${
          settings.maintenanceMode
            ? 'border-danger/50 bg-danger/5'
            : 'border-border-subtle bg-bg-card'
        }`}
      >
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle
            className={`h-5 w-5 ${
              settings.maintenanceMode ? 'text-danger' : 'text-text-muted'
            }`}
          />
          <h2 className="text-lg font-semibold text-text-primary">
            {t('settings_maintenance')}
          </h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">
              {t('maintenance_mode')}
            </span>
            <Toggle
              checked={settings.maintenanceMode}
              onChange={(v) => update('maintenanceMode', v)}
            />
          </div>
          {settings.maintenanceMode && (
            <div className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p className="text-sm text-danger">{t('maintenance_warning')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {success ? t('settings_saved') : t('save_changes')}
        </button>
      </div>
    </div>
  )
}
