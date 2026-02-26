'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Search, Users, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { useUserStore } from '@/store/userStore'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FilterPill } from '@/components/ui/FilterPill'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UserData {
  id: string
  authId: string
  email: string
  name: string
  role: string
  language: string
  avatarUrl: string | null
  phone: string | null
  isActive: boolean
  schoolId: string
  createdAt: string
}

interface UnlinkedTeacher {
  id: string
  name: string
  email: string | null
}

interface ClassOption {
  id: string
  name: string
  grade: string | null
}

type RoleFilter = 'ALL' | 'DIRECTOR' | 'ADMIN' | 'STAFF' | 'TEACHER' | 'STUDENT'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function roleBadgeVariant(
  role: string
): 'accent' | 'success' | 'info' | 'default' {
  if (role === 'DIRECTOR') return 'accent'
  if (role === 'ADMIN') return 'success'
  if (role === 'STAFF') return 'info'
  if (role === 'TEACHER') return 'info'
  return 'default'
}

const ROLE_COLORS: Record<string, string> = {
  DIRECTOR: '#8b5cf6',
  ADMIN: '#22c55e',
  STAFF: '#06b6d4',
  TEACHER: '#3b82f6',
  STUDENT: '#6b7280',
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function UsersPage() {
  const t = useTranslations()
  const toast = useToast()
  const user = useUserStore((s) => s.user)
  const schoolId = user?.schoolId

  // Data state
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editRoleTarget, setEditRoleTarget] = useState<UserData | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null)

  // Add form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState('TEACHER')
  const [formPhone, setFormPhone] = useState('')
  const [formTeacherId, setFormTeacherId] = useState('')
  const [formClassId, setFormClassId] = useState('')
  const [saving, setSaving] = useState(false)

  // Linking data
  const [unlinkedTeachers, setUnlinkedTeachers] = useState<UnlinkedTeacher[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])

  // Edit role state
  const [editRole, setEditRole] = useState('')

  /* ---------------------------------------------------------------- */
  /*  Data Fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchUsers = useCallback(async () => {
    if (!schoolId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/users?schoolId=${schoolId}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch {
      toast.error(t('app.error'))
    } finally {
      setLoading(false)
    }
  }, [schoolId, t, toast])

  const fetchUnlinkedTeachers = useCallback(async () => {
    if (!schoolId) return
    try {
      const res = await fetch(`/api/teachers/unlinked?schoolId=${schoolId}`)
      if (res.ok) setUnlinkedTeachers(await res.json())
    } catch { /* silent */ }
  }, [schoolId])

  const fetchClasses = useCallback(async () => {
    if (!schoolId) return
    try {
      const res = await fetch(`/api/classes?schoolId=${schoolId}`)
      if (res.ok) setClasses(await res.json())
    } catch { /* silent */ }
  }, [schoolId])

  useEffect(() => {
    fetchUsers()
    fetchUnlinkedTeachers()
    fetchClasses()
  }, [fetchUsers, fetchUnlinkedTeachers, fetchClasses])

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  const handleAddUser = async () => {
    if (!formEmail.trim() || !formName.trim()) {
      toast.error(t('errors.required_field'))
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formEmail.trim(),
          name: formName.trim(),
          role: formRole,
          phone: formPhone.trim() || null,
          schoolId,
          teacherId: formRole === 'TEACHER' && formTeacherId ? formTeacherId : undefined,
          classId: formRole === 'STUDENT' && formClassId ? formClassId : undefined,
        }),
      })
      if (!res.ok) {
        toast.error(t('errors.save_failed'))
        return
      }
      toast.success(t('users.user_added'))
      setAddModalOpen(false)
      resetForm()
      await fetchUsers()
      await fetchUnlinkedTeachers()
    } catch {
      toast.error(t('errors.save_failed'))
    } finally {
      setSaving(false)
    }
  }

  const handleEditRole = async () => {
    if (!editRoleTarget) return
    setSaving(true)
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editRoleTarget.id,
          role: editRole,
        }),
      })
      if (!res.ok) {
        toast.error(t('errors.save_failed'))
        return
      }
      toast.success(t('users.role_updated'))
      setEditRoleTarget(null)
      await fetchUsers()
    } catch {
      toast.error(t('errors.save_failed'))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (targetUser: UserData) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetUser.id,
          isActive: !targetUser.isActive,
        }),
      })
      if (!res.ok) {
        toast.error(t('errors.save_failed'))
        return
      }
      toast.success(
        targetUser.isActive
          ? t('users.user_deactivated')
          : t('users.user_activated')
      )
      await fetchUsers()
    } catch {
      toast.error(t('errors.save_failed'))
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/users?id=${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        toast.error(t('errors.save_failed'))
        return
      }
      toast.success(t('app.delete'))
      setDeleteTarget(null)
      await fetchUsers()
    } catch {
      toast.error(t('errors.save_failed'))
    }
  }

  const openEditRole = (targetUser: UserData) => {
    setEditRoleTarget(targetUser)
    setEditRole(targetUser.role)
  }

  const resetForm = () => {
    setFormName('')
    setFormEmail('')
    setFormRole('TEACHER')
    setFormPhone('')
    setFormTeacherId('')
    setFormClassId('')
  }

  const closeAddModal = () => {
    setAddModalOpen(false)
    resetForm()
  }

  /* ---------------------------------------------------------------- */
  /*  Filtering                                                        */
  /* ---------------------------------------------------------------- */

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {t('users.title')}
        </h1>
        <Button variant="primary" size="md" onClick={() => setAddModalOpen(true)}>
          <Plus size={16} />
          {t('users.add_user')}
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder={t('app.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none sm:max-w-sm"
          />
        </div>

        {/* Role filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterPill
            label={t('app.filter')}
            active={roleFilter === 'ALL'}
            onClick={() => setRoleFilter('ALL')}
          />
          <FilterPill
            label={t('users.role_director')}
            active={roleFilter === 'DIRECTOR'}
            onClick={() => setRoleFilter('DIRECTOR')}
          />
          <FilterPill
            label={t('users.role_admin')}
            active={roleFilter === 'ADMIN'}
            onClick={() => setRoleFilter('ADMIN')}
          />
          <FilterPill
            label={t('users.role_staff')}
            active={roleFilter === 'STAFF'}
            onClick={() => setRoleFilter('STAFF')}
          />
          <FilterPill
            label={t('users.role_teacher')}
            active={roleFilter === 'TEACHER'}
            onClick={() => setRoleFilter('TEACHER')}
          />
          <FilterPill
            label={t('users.role_student')}
            active={roleFilter === 'STUDENT'}
            onClick={() => setRoleFilter('STUDENT')}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        /* Loading Skeletons */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border-subtle bg-bg-card p-4"
            >
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <Skeleton className="mt-4 h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <div className="rounded-xl border border-border-subtle bg-bg-card p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Users className="mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">
              {search || roleFilter !== 'ALL'
                ? `${t('app.search')} — 0 results`
                : t('users.no_users')}
            </p>
            {!search && roleFilter === 'ALL' && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => setAddModalOpen(true)}
              >
                <Plus size={14} />
                {t('users.add_user')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* User Cards Grid */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((u) => (
            <div
              key={u.id}
              className={`rounded-xl border bg-bg-card p-4 transition ${
                u.isActive
                  ? 'border-border-subtle hover:border-border-default'
                  : 'border-border-subtle opacity-60'
              }`}
            >
              {/* Top section: avatar + info */}
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{
                    backgroundColor: ROLE_COLORS[u.role] || '#6b7280',
                  }}
                >
                  {getInitials(u.name)}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {u.name}
                  </p>
                  <p className="truncate text-xs text-text-muted">{u.email}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditRole(u)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-surface hover:text-text-primary transition"
                    aria-label={t('users.edit_role')}
                  >
                    <ShieldCheck size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(u)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-danger-dim hover:text-danger transition"
                    aria-label={t('app.delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Bottom section: role badge + status + join date */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={roleBadgeVariant(u.role)} size="sm">
                  {u.role}
                </Badge>

                {u.isActive ? (
                  <Badge variant="success" size="sm">
                    {t('users.active')}
                  </Badge>
                ) : (
                  <Badge variant="danger" size="sm">
                    {t('users.inactive')}
                  </Badge>
                )}

                <span className="text-[11px] text-text-muted">
                  {new Date(u.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {/* Toggle active button */}
              <div className="mt-3 border-t border-border-subtle pt-3">
                <button
                  onClick={() => handleToggleActive(u)}
                  className="text-xs font-medium text-text-muted hover:text-text-primary transition"
                >
                  {u.isActive
                    ? t('users.deactivate')
                    : t('users.activate')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        open={addModalOpen}
        onClose={closeAddModal}
        title={t('users.add_user')}
        size="md"
      >
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('teachers.name')} *
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              placeholder={t('teachers.name')}
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('teachers.email')} *
            </label>
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              placeholder={t('teachers.email')}
            />
          </div>

          {/* Role */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('users.role')}
            </label>
            <select
              value={formRole}
              onChange={(e) => setFormRole(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="DIRECTOR">{t('users.role_director')}</option>
              <option value="ADMIN">{t('users.role_admin')}</option>
              <option value="STAFF">{t('users.role_staff')}</option>
              <option value="TEACHER">{t('users.role_teacher')}</option>
              <option value="STUDENT">{t('users.role_student')}</option>
            </select>
          </div>

          {/* Link to Teacher record (when role=TEACHER) */}
          {formRole === 'TEACHER' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                {t('users.link_teacher')}
              </label>
              <select
                value={formTeacherId}
                onChange={(e) => {
                  setFormTeacherId(e.target.value)
                  // Auto-fill name/email from selected teacher
                  const teacher = unlinkedTeachers.find((tc) => tc.id === e.target.value)
                  if (teacher) {
                    if (!formName) setFormName(teacher.name)
                    if (!formEmail && teacher.email) setFormEmail(teacher.email)
                  }
                }}
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="">{t('users.no_link')}</option>
                {unlinkedTeachers.map((tc) => (
                  <option key={tc.id} value={tc.id}>
                    {tc.name} {tc.email ? `(${tc.email})` : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-text-muted">{t('users.link_teacher_hint')}</p>
            </div>
          )}

          {/* Class selection (when role=STUDENT) */}
          {formRole === 'STUDENT' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                {t('users.select_class')}
              </label>
              <select
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="">{t('users.no_class')}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.grade ? `(${c.grade})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Phone */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('teachers.phone')}
            </label>
            <input
              type="tel"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              placeholder={t('teachers.phone')}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={closeAddModal}
            >
              {t('app.cancel')}
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              loading={saving}
              onClick={handleAddUser}
            >
              {t('users.add_user')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        open={!!editRoleTarget}
        onClose={() => setEditRoleTarget(null)}
        title={t('users.edit_role')}
        size="sm"
      >
        {editRoleTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{
                  backgroundColor:
                    ROLE_COLORS[editRoleTarget.role] || '#6b7280',
                }}
              >
                {getInitials(editRoleTarget.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {editRoleTarget.name}
                </p>
                <p className="text-xs text-text-muted">
                  {editRoleTarget.email}
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                {t('users.role')}
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="DIRECTOR">{t('users.role_director')}</option>
                <option value="ADMIN">{t('users.role_admin')}</option>
                <option value="STAFF">{t('users.role_staff')}</option>
                <option value="TEACHER">{t('users.role_teacher')}</option>
                <option value="STUDENT">{t('users.role_student')}</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={() => setEditRoleTarget(null)}
              >
                {t('app.cancel')}
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                loading={saving}
                onClick={handleEditRole}
              >
                {t('app.save')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-sm rounded-xl border border-border-subtle bg-bg-card p-6 shadow-modal">
            <h3 className="font-display text-lg font-semibold text-text-primary">
              {t('app.delete')}
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              {deleteTarget.name} &mdash; {deleteTarget.email}
            </p>
            <div className="mt-5 flex gap-3">
              <Button
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={() => setDeleteTarget(null)}
              >
                {t('app.cancel')}
              </Button>
              <Button
                variant="danger"
                size="md"
                className="flex-1"
                onClick={handleDelete}
              >
                {t('app.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
