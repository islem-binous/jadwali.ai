'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useAdminFetch } from '@/hooks/useAdminFetch'
import {
  Users,
  Search,
  Loader2,
  Trash2,
  Check,
  X,
} from 'lucide-react'

interface UserRow {
  id: string
  email: string
  name: string
  role: string
  language: string
  isActive: boolean
  schoolId: string | null
  createdAt: string
  school: { name: string } | null
}

const ROLES = ['SUPER_ADMIN', 'DIRECTOR', 'ADMIN', 'STAFF', 'TEACHER', 'STUDENT']

export default function AdminUsersPage() {
  const t = useTranslations('admin')
  const { adminFetch } = useAdminFetch()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (roleFilter) params.set('role', roleFilter)
    adminFetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .finally(() => setLoading(false))
  }, [adminFetch, search, roleFilter])

  useEffect(() => { load() }, [load])

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await adminFetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: !isActive }),
    })
    load()
  }

  const handleChangeRole = async (id: string, role: string) => {
    await adminFetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    })
    load()
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return
    const res = await adminFetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error || 'Delete failed')
      return
    }
    load()
  }

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'bg-red-500/10 text-red-400',
    DIRECTOR: 'bg-purple-500/10 text-purple-400',
    ADMIN: 'bg-blue-500/10 text-blue-400',
    STAFF: 'bg-emerald-500/10 text-emerald-400',
    TEACHER: 'bg-green-500/10 text-green-400',
    STUDENT: 'bg-yellow-500/10 text-yellow-400',
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-text-primary">
        {t('users')}
      </h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_users')}
            className="h-9 w-full rounded-md border border-border-subtle bg-bg-surface pl-9 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 rounded-md border border-border-subtle bg-bg-surface px-3 text-sm text-text-primary"
        >
          <option value="">{t('all_roles')}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
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
                <th className="px-4 py-3">{t('email')}</th>
                <th className="px-4 py-3">{t('role')}</th>
                <th className="px-4 py-3">{t('school')}</th>
                <th className="px-4 py-3">{t('active')}</th>
                <th className="px-4 py-3">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border-subtle last:border-0 hover:bg-bg-surface/50">
                  <td className="px-4 py-3 font-medium text-text-primary">{u.name}</td>
                  <td className="px-4 py-3 text-text-muted text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u.id, e.target.value)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 cursor-pointer ${roleColors[u.role] || ''}`}
                      disabled={u.role === 'SUPER_ADMIN'}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{u.school?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(u.id, u.isActive)}
                      className={`rounded p-1 transition ${
                        u.isActive
                          ? 'text-green-400 hover:bg-green-500/10'
                          : 'text-red-400 hover:bg-red-500/10'
                      }`}
                    >
                      {u.isActive ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {u.role !== 'SUPER_ADMIN' && (
                      <button
                        onClick={() => handleDelete(u.id, u.name)}
                        className="rounded p-1 text-text-muted hover:bg-danger-dim hover:text-danger transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
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
