'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/useAuth'
import { useUserStore } from '@/store/userStore'
import { User, Lock, Shield, Check, Loader2 } from 'lucide-react'

export default function AdminProfilePage() {
  const t = useTranslations('admin')
  const { user, signOut } = useAuth()
  const setUser = useUserStore((s) => s.setUser)

  // Profile form
  const [name, setName] = useState(user?.name || '')
  const [language, setLanguage] = useState(user?.language || 'FR')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState('')

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // Security
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setProfileSaving(true)
    setProfileError('')
    setProfileSuccess(false)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, language }),
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      if (user) {
        setUser({ ...user, name, language })
      }
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (err: any) {
      setProfileError(err.message)
    } finally {
      setProfileSaving(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)

    if (newPassword.length < 8) {
      setPasswordError(t('password_min_length'))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('passwords_mismatch'))
      return
    }

    setPasswordSaving(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to change password')
      }
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err: any) {
      setPasswordError(err.message)
    } finally {
      setPasswordSaving(false)
    }
  }

  async function handleSignOutAll() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout-all', {
        method: 'POST',
        credentials: 'same-origin',
      })
    } catch {
      // ignore — we're signing out anyway
    }
    signOut()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-text-primary">
        {t('profile_title')}
      </h1>

      {/* Personal Info */}
      <div className="rounded-xl border border-border-subtle bg-bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">{t('personal_info')}</h2>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('email')}</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-muted cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('language')}</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="FR">Français</option>
              <option value="EN">English</option>
              <option value="AR">العربية</option>
            </select>
          </div>

          {profileError && <p className="text-sm text-danger">{profileError}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={profileSaving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('save_changes')}
            </button>
            {profileSuccess && (
              <span className="flex items-center gap-1 text-sm text-success">
                <Check className="h-4 w-4" /> {t('saved')}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="rounded-xl border border-border-subtle bg-bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">{t('change_password')}</h2>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('current_password')}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('new_password')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">{t('confirm_password')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent"
              required
              minLength={8}
            />
          </div>

          {passwordError && <p className="text-sm text-danger">{passwordError}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={passwordSaving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {passwordSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('update_password')}
            </button>
            {passwordSuccess && (
              <span className="flex items-center gap-1 text-sm text-success">
                <Check className="h-4 w-4" /> {t('password_changed')}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Security */}
      <div className="rounded-xl border border-border-subtle bg-bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-text-primary">{t('security_section')}</h2>
        </div>

        <p className="mb-4 text-sm text-text-muted">{t('sign_out_all_desc')}</p>

        <button
          onClick={handleSignOutAll}
          disabled={loggingOut}
          className="flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/80 disabled:opacity-50"
        >
          {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
          {t('sign_out_all')}
        </button>
      </div>
    </div>
  )
}
