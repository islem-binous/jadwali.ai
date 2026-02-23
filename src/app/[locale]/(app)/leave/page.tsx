'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useUserStore } from '@/store/userStore'
import { isAdmin as checkIsAdmin } from '@/lib/permissions'
import {
  Plus,
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  CalendarOff,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FilterPill } from '@/components/ui/FilterPill'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LeaveTeacher {
  id: string
  name: string
  colorHex: string
}

interface LeaveRequest {
  id: string
  schoolId: string
  teacherId: string
  teacher: LeaveTeacher
  leaveTypeId: string
  leaveType: { id: string; name: string; colorHex: string }
  startDate: string
  endDate: string
  days: number
  reason: string | null
  status: string
  createdAt: string
}

interface LeaveType {
  id: string
  name: string
  colorHex: string
}

interface TeacherOption {
  id: string
  name: string
  colorHex: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusBadgeVariant(
  status: string,
): 'warning' | 'success' | 'danger' {
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'danger'
  return 'warning' // PENDING
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatLeaveDates(startStr: string, endStr: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }
  const start = new Date(startStr).toLocaleDateString(undefined, opts)
  const end = new Date(endStr).toLocaleDateString(undefined, opts)
  return start === end ? start : `${start} → ${end}`
}

function computeDays(start: string, end: string): number {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
  const diff = Math.ceil(
    (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24),
  )
  return Math.max(diff + 1, 1)
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function LeaveSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-border-subtle bg-bg-card p-4"
        >
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-bg-surface" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-bg-surface" />
              <div className="h-3 w-48 rounded bg-bg-surface" />
            </div>
            <div className="h-6 w-20 rounded-full bg-bg-surface" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LeavePage() {
  const t = useTranslations('leave')
  const tApp = useTranslations('app')
  const tCal = useTranslations('calendar')
  const user = useUserStore((s) => s.user)
  const toast = useToast()
  const adminUser = checkIsAdmin(user?.role || '')
  const isTeacherRole = user?.role === 'TEACHER'

  // Data
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
  const [modalOpen, setModalOpen] = useState(false)

  // Form state
  const [formTeacherId, setFormTeacherId] = useState('')
  const [formLeaveTypeId, setFormLeaveTypeId] = useState('')
  const [formStartDate, setFormStartDate] = useState(
    new Date().toISOString().split('T')[0],
  )
  const [formEndDate, setFormEndDate] = useState(
    new Date().toISOString().split('T')[0],
  )
  const [formReason, setFormReason] = useState('')
  const [saving, setSaving] = useState(false)

  // Fetch leave requests
  const fetchLeaveRequests = useCallback(async () => {
    if (!user?.schoolId) return
    setLoading(true)
    try {
      let url = `/api/leave?schoolId=${user.schoolId}`
      if (isTeacherRole && user.teacherId) {
        url += `&teacherId=${user.teacherId}`
      }
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setLeaveRequests(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [user?.schoolId])

  useEffect(() => {
    fetchLeaveRequests()
  }, [fetchLeaveRequests])

  // Fetch leave types + teachers for the modal
  useEffect(() => {
    if (!user?.schoolId) return

    async function fetchMeta() {
      try {
        const [ltRes, tRes] = await Promise.all([
          fetch(`/api/leave-types?schoolId=${user!.schoolId}`),
          fetch(`/api/teachers?schoolId=${user!.schoolId}`),
        ])
        if (ltRes.ok) {
          const leaveTypesData = await ltRes.json()
          setLeaveTypes(leaveTypesData)
        }
        if (tRes.ok) {
          const teachersData = await tRes.json()
          setTeachers(
            teachersData.map(
              (t: { id: string; name: string; colorHex: string }) => ({
                id: t.id,
                name: t.name,
                colorHex: t.colorHex,
              }),
            ),
          )
        }
      } catch {
        // silently fail
      }
    }

    fetchMeta()
  }, [user?.schoolId])

  // Filter logic
  const filtered =
    filter === 'ALL'
      ? leaveRequests
      : leaveRequests.filter((lr) => lr.status === filter)

  // Stats
  const now = new Date()
  const thisMonth = leaveRequests.filter((lr) => {
    const d = new Date(lr.startDate)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const pendingCount = leaveRequests.filter((lr) => lr.status === 'PENDING').length
  const approvedCount = leaveRequests.filter((lr) => lr.status === 'APPROVED').length
  const totalDaysUsed = leaveRequests
    .filter((lr) => lr.status === 'APPROVED')
    .reduce((sum, lr) => sum + (lr.days || 1), 0)

  const stats = [
    {
      key: 'this_month',
      value: thisMonth.length,
      icon: CalendarDays,
      color: 'text-accent',
    },
    {
      key: 'pending',
      value: pendingCount,
      icon: Clock,
      color: 'text-warning',
    },
    {
      key: 'approved',
      value: approvedCount,
      icon: CheckCircle,
      color: 'text-success',
    },
    {
      key: 'days_used',
      value: totalDaysUsed,
      sub: t('balance_sub'),
      icon: CalendarOff,
      color: 'text-violet',
    },
  ]

  // Handle approve / reject
  async function handleStatusChange(id: string, newStatus: 'APPROVED' | 'REJECTED') {
    try {
      const res = await fetch('/api/leave', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (res.ok) {
        toast.success(
          newStatus === 'APPROVED' ? t('approved') : t('rejected'),
        )
        fetchLeaveRequests()
      } else {
        toast.error(tApp('error'))
      }
    } catch {
      toast.error(tApp('error'))
    }
  }

  // Handle submit leave request
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formTeacherId || !formStartDate || !formEndDate) return

    setSaving(true)
    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: user!.schoolId,
          teacherId: formTeacherId,
          leaveTypeId: formLeaveTypeId,
          startDate: formStartDate,
          endDate: formEndDate,
          days: computeDays(formStartDate, formEndDate),
          reason: formReason || null,
        }),
      })
      if (res.ok) {
        toast.success(t('request_submitted'))
        closeModal()
        fetchLeaveRequests()
      } else {
        toast.error(tApp('error'))
      }
    } catch {
      toast.error(tApp('error'))
    } finally {
      setSaving(false)
    }
  }

  function openCreate() {
    setFormTeacherId(isTeacherRole && user?.teacherId ? user.teacherId : '')
    setFormLeaveTypeId(leaveTypes[0]?.id ?? '')
    setFormStartDate(new Date().toISOString().split('T')[0])
    setFormEndDate(new Date().toISOString().split('T')[0])
    setFormReason('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {t('title')}
        </h1>
        <Button onClick={openCreate} size="md">
          <Plus className="h-4 w-4" />
          {t('request_leave')}
        </Button>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-border-subtle bg-bg-card p-4"
            >
              <div className="h-4 w-20 rounded bg-bg-surface" />
              <div className="mt-3 h-8 w-12 rounded bg-bg-surface" />
              <div className="mt-2 h-3 w-24 rounded bg-bg-surface" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.key}
                className="rounded-xl border border-border-subtle bg-bg-card p-4 transition hover:border-border-default"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                    {t(stat.key)}
                  </span>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-text-primary">
                  {stat.value}
                </p>
                {stat.sub && (
                  <p className="mt-0.5 text-xs text-text-muted">{stat.sub}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        <FilterPill
          label={t('filter_all')}
          active={filter === 'ALL'}
          onClick={() => setFilter('ALL')}
        />
        <FilterPill
          label={t('filter_pending')}
          active={filter === 'PENDING'}
          onClick={() => setFilter('PENDING')}
        />
        <FilterPill
          label={t('filter_approved')}
          active={filter === 'APPROVED'}
          onClick={() => setFilter('APPROVED')}
        />
        <FilterPill
          label={t('filter_rejected')}
          active={filter === 'REJECTED'}
          onClick={() => setFilter('REJECTED')}
        />
      </div>

      {/* Leave requests list */}
      {loading ? (
        <LeaveSkeleton />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-bg-card p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CalendarDays className="mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">{t('no_requests')}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((leave) => (
            <div
              key={leave.id}
              className="rounded-xl border border-border-subtle bg-bg-card p-4 transition hover:border-border-default"
            >
              <div className="flex items-center gap-4">
                {/* Teacher avatar */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: leave.teacher.colorHex }}
                >
                  {getInitials(leave.teacher.name)}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {leave.teacher.name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                    <span>
                      {formatLeaveDates(leave.startDate, leave.endDate)}
                    </span>
                    <span>
                      {leave.days || 1} {t('days')}
                    </span>
                    <Badge
                      variant="accent"
                      size="sm"
                    >
                      {leave.leaveType?.name ?? '—'}
                    </Badge>
                  </div>
                  {leave.reason && (
                    <p className="mt-1 truncate text-xs text-text-secondary">
                      {leave.reason}
                    </p>
                  )}
                </div>

                {/* Status badge */}
                <Badge
                  variant={statusBadgeVariant(leave.status)}
                  size="sm"
                >
                  {leave.status === 'APPROVED'
                    ? t('approved')
                    : leave.status === 'REJECTED'
                      ? t('rejected')
                      : t('pending')}
                </Badge>

                {/* Action buttons for PENDING (admin only) */}
                {adminUser && leave.status === 'PENDING' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStatusChange(leave.id, 'APPROVED')}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-success-dim hover:text-success transition"
                      aria-label="Approve"
                    >
                      <CheckCircle size={16} />
                    </button>
                    <button
                      onClick={() => handleStatusChange(leave.id, 'REJECTED')}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-danger-dim hover:text-danger transition"
                      aria-label="Reject"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request Leave Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={t('request_leave')}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Teacher select (hidden for teacher role — auto-set) */}
          {!isTeacherRole && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                {t('teacher')}
              </label>
              <select
                value={formTeacherId}
                onChange={(e) => setFormTeacherId(e.target.value)}
                required
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="">{t('teacher')}...</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Leave type select */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
              {t('leave_type')}
            </label>
            <select
              value={formLeaveTypeId}
              onChange={(e) => setFormLeaveTypeId(e.target.value)}
              required
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="">{t('leave_type')}...</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                {tCal('start_date')}
              </label>
              <input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                required
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                {tCal('end_date')}
              </label>
              <input
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                min={formStartDate}
                required
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>

          {/* Days preview */}
          <div className="rounded-lg bg-bg-surface px-3 py-2 text-sm text-text-secondary">
            {computeDays(formStartDate, formEndDate)} {t('days')}
          </div>

          {/* Reason */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
              {t('reason')}
            </label>
            <textarea
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              rows={3}
              placeholder="..."
              className="w-full resize-none rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={closeModal}
              className="flex-1"
            >
              {tApp('cancel')}
            </Button>
            <Button
              type="submit"
              loading={saving}
              disabled={!formTeacherId || !formLeaveTypeId || !formStartDate || !formEndDate}
              className="flex-1"
            >
              {tApp('save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
