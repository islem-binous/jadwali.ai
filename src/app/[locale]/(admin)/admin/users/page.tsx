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
  phone: string | null
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

  // Edit modal state
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [editFields, setEditFields] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

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

  // Open edit modal
  function openEditModal(user: UserRow) {
    setEditUser(user)
    setSaveError('')
    setEditFields({
      name: user.name,
      email: user.email,
      role: user.role,
      language: user.language,
      phone: user.phone || '',
      isActive: user.isActive,
    })
  }

  // Save edit
  async function handleEditSave() {
    if (!editUser) return
    setSaving(true)
    setSaveError('')
    try {
      const res = await adminFetch(`/api/admin/users/${editUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(editFields),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Save failed')
      }
      setEditUser(null)
      load()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
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
                <th className="px-4 py-3">{t('language')}</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">{t('active')}</th>
                <th className="px-4 py-3">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => openEditModal(u)}
                  className="border-b border-border-subtle last:border-0 hover:bg-bg-surface/50 cursor-pointer transition"
                >
                  <td className="px-4 py-3 font-medium text-text-primary">{u.name}</td>
                  <td className="px-4 py-3 text-text-muted text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[u.role] || 'bg-gray-500/10 text-gray-400'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{u.school?.name || '—'}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{u.language}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{u.phone || '—'}</td>
                  <td className="px-4 py-3">
                    {u.isActive ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <X className="h-4 w-4 text-red-400" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.role !== 'SUPER_ADMIN' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(u.id, u.name) }}
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
                  <td colSpan={8} className="px-4 py-8 text-center text-text-muted">
                    {t('no_results')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4 rounded-xl border border-border-subtle bg-bg-card shadow-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <h2 className="text-base font-semibold text-text-primary">Edit User</h2>
              <button
                onClick={() => setEditUser(null)}
                className="rounded-md p-1 text-text-muted hover:text-text-primary hover:bg-bg-surface transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {saveError && (
                <div className="rounded-md bg-danger-dim p-3 text-sm text-danger">{saveError}</div>
              )}

              {/* School (read-only) */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">School</label>
                <input
                  type="text"
                  value={editUser.school?.name || '—'}
                  disabled
                  className="w-full rounded-md border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary opacity-50"
                />
              </div>

              {/* Name */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={editFields.name || ''}
                  onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                  className="w-full rounded-md border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Email <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  value={editFields.email || ''}
                  onChange={(e) => setEditFields({ ...editFields, email: e.target.value })}
                  className="w-full rounded-md border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Role */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Role</label>
                <select
                  value={editFields.role || ''}
                  onChange={(e) => setEditFields({ ...editFields, role: e.target.value })}
                  disabled={editUser.role === 'SUPER_ADMIN'}
                  className="w-full rounded-md border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Language</label>
                <select
                  value={editFields.language || 'FR'}
                  onChange={(e) => setEditFields({ ...editFields, language: e.target.value })}
                  className="w-full rounded-md border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="FR">French</option>
                  <option value="EN">English</option>
                  <option value="AR">Arabic</option>
                </select>
              </div>

              {/* Phone */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Phone</label>
                <input
                  type="text"
                  value={editFields.phone || ''}
                  onChange={(e) => setEditFields({ ...editFields, phone: e.target.value })}
                  className="w-full rounded-md border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Active */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!editFields.isActive}
                  onChange={(e) => setEditFields({ ...editFields, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-border-default accent-accent"
                />
                <label className="text-sm text-text-primary">Active</label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border-subtle">
              <button
                onClick={() => setEditUser(null)}
                className="rounded-md border border-border-default bg-bg-elevated px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-surface transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
