'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, FileCheck, Check, X, Search } from 'lucide-react'
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

interface AuthorizationStudent {
  id: string
  name: string
  classId: string
  class: { id: string; name: string }
}

interface ClassAuthorization {
  id: string
  schoolId: string
  studentId: string
  absenceDate: string
  absenceEndDate: string | null
  reason: string
  status: string
  reviewedById: string | null
  reviewedAt: string | null
  rejectionReason: string | null
  createdAt: string
  student: AuthorizationStudent
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusBadgeVariant(status: string): 'warning' | 'success' | 'danger' {
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'danger'
  return 'warning' // PENDING
}

function formatDate(dateStr: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }
  return new Date(dateStr).toLocaleDateString(undefined, opts)
}

function formatDateRange(start: string, end: string | null): string {
  if (!end) return formatDate(start)
  return `${formatDate(start)} — ${formatDate(end)}`
}

function canReview(role: string | undefined): boolean {
  if (!role) return false
  return ['DIRECTOR', 'ADMIN', 'STAFF'].includes(role)
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function AuthorizationListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-border-subtle bg-bg-card p-4"
        >
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function AuthorizationsPage() {
  const t = useTranslations()
  const toast = useToast()
  const user = useUserStore((s) => s.user)
  const schoolId = user?.schoolId
  const isStudent = user?.role === 'STUDENT'

  /* ---------------------------------------------------------------- */
  /*  Data State                                                       */
  /* ---------------------------------------------------------------- */

  const [authorizations, setAuthorizations] = useState<ClassAuthorization[]>([])
  const [loading, setLoading] = useState(true)

  /* ---------------------------------------------------------------- */
  /*  Filter State                                                     */
  /* ---------------------------------------------------------------- */

  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  /* ---------------------------------------------------------------- */
  /*  Request Modal State (STUDENT)                                    */
  /* ---------------------------------------------------------------- */

  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [reqAbsenceDate, setReqAbsenceDate] = useState(
    () => new Date().toISOString().split('T')[0],
  )
  const [reqEndDate, setReqEndDate] = useState('')
  const [reqReason, setReqReason] = useState('')
  const [reqSaving, setReqSaving] = useState(false)

  /* ---------------------------------------------------------------- */
  /*  Reject Modal State (STAFF / DIRECTOR / ADMIN)                    */
  /* ---------------------------------------------------------------- */

  const [rejectTarget, setRejectTarget] = useState<ClassAuthorization | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectSaving, setRejectSaving] = useState(false)

  /* ---------------------------------------------------------------- */
  /*  Approve loading state                                            */
  /* ---------------------------------------------------------------- */

  const [approvingId, setApprovingId] = useState<string | null>(null)

  /* ---------------------------------------------------------------- */
  /*  Data Fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchAuthorizations = useCallback(async () => {
    if (!schoolId) return
    try {
      const params = new URLSearchParams({ schoolId })
      if (isStudent && user?.studentId) {
        params.set('studentId', user.studentId)
      }
      if (statusFilter !== 'ALL') params.set('status', statusFilter)

      const res = await fetch(`/api/class-authorizations?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setAuthorizations(data)
      }
    } catch {
      toast.error(t('app.error'))
    }
  }, [schoolId, isStudent, user?.studentId, statusFilter, t, toast])

  useEffect(() => {
    if (!schoolId) return
    setLoading(true)
    fetchAuthorizations().finally(() => setLoading(false))
  }, [schoolId, fetchAuthorizations])

  /* ---------------------------------------------------------------- */
  /*  Request Modal Helpers                                            */
  /* ---------------------------------------------------------------- */

  const resetRequestForm = () => {
    setReqAbsenceDate(new Date().toISOString().split('T')[0])
    setReqEndDate('')
    setReqReason('')
  }

  const openRequestModal = () => {
    resetRequestForm()
    setRequestModalOpen(true)
  }

  const closeRequestModal = () => {
    setRequestModalOpen(false)
    resetRequestForm()
  }

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  const handleRequest = async () => {
    if (!reqReason.trim()) {
      toast.error(t('authorizations.reason'))
      return
    }

    setReqSaving(true)
    try {
      const res = await fetch('/api/class-authorizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          studentId: user?.studentId,
          absenceDate: reqAbsenceDate,
          absenceEndDate: reqEndDate || null,
          reason: reqReason.trim(),
        }),
      })

      if (res.ok) {
        toast.success(t('authorizations.request_submitted'))
        closeRequestModal()
        await fetchAuthorizations()
      } else {
        toast.error(t('app.error'))
      }
    } catch {
      toast.error(t('app.error'))
    } finally {
      setReqSaving(false)
    }
  }

  const handleApprove = async (auth: ClassAuthorization) => {
    setApprovingId(auth.id)
    try {
      const res = await fetch('/api/class-authorizations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: auth.id,
          status: 'APPROVED',
          reviewedById: user?.id ?? null,
        }),
      })

      if (res.ok) {
        toast.success(t('authorizations.approved_success'))
        await fetchAuthorizations()
      } else {
        toast.error(t('app.error'))
      }
    } catch {
      toast.error(t('app.error'))
    } finally {
      setApprovingId(null)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    if (!rejectionReason.trim()) {
      toast.error(t('authorizations.rejection_reason'))
      return
    }

    setRejectSaving(true)
    try {
      const res = await fetch('/api/class-authorizations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rejectTarget.id,
          status: 'REJECTED',
          reviewedById: user?.id ?? null,
          rejectionReason: rejectionReason.trim(),
        }),
      })

      if (res.ok) {
        toast.success(t('authorizations.rejected_success'))
        setRejectTarget(null)
        setRejectionReason('')
        await fetchAuthorizations()
      } else {
        toast.error(t('app.error'))
      }
    } catch {
      toast.error(t('app.error'))
    } finally {
      setRejectSaving(false)
    }
  }

  const openRejectModal = (auth: ClassAuthorization) => {
    setRejectTarget(auth)
    setRejectionReason('')
  }

  /* ---------------------------------------------------------------- */
  /*  Filtered & Sorted List                                           */
  /* ---------------------------------------------------------------- */

  const filtered = authorizations
    .filter((a) => {
      if (search.trim()) {
        const q = search.toLowerCase()
        const nameMatch = a.student.name.toLowerCase().includes(q)
        const classMatch = a.student.class.name.toLowerCase().includes(q)
        if (!nameMatch && !classMatch) return false
      }
      return true
    })
    .sort((a, b) => {
      // PENDING first
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1
      // Then by createdAt desc
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {t('authorizations.title')}
        </h1>
        {isStudent && (
          <Button variant="primary" size="md" onClick={openRequestModal}>
            <Plus size={16} />
            {t('authorizations.request')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Search row */}
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder={t('app.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(
            [
              { key: 'ALL', label: t('app.filter') },
              { key: 'PENDING', label: t('authorizations.pending') },
              { key: 'APPROVED', label: t('authorizations.approved') },
              { key: 'REJECTED', label: t('authorizations.rejected') },
            ] as const
          ).map((opt) => (
            <FilterPill
              key={opt.key}
              label={opt.label}
              active={statusFilter === opt.key}
              onClick={() => setStatusFilter(opt.key)}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <AuthorizationListSkeleton />
      ) : filtered.length === 0 ? (
        /* Empty state */
        <div className="rounded-xl border border-border-subtle bg-bg-card p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <FileCheck className="mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">
              {t('authorizations.no_authorizations')}
            </p>
            {isStudent && !search && statusFilter === 'ALL' && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={openRequestModal}
              >
                <Plus size={14} />
                {t('authorizations.request')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Authorization list */
        <div className="space-y-3">
          {filtered.map((auth) => (
            <div
              key={auth.id}
              className={`rounded-xl border bg-bg-card p-4 transition hover:border-border-default ${
                auth.status === 'PENDING'
                  ? 'border-warning/30'
                  : 'border-border-subtle'
              }`}
            >
              {/* Mobile layout */}
              <div className="sm:hidden space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {auth.student.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {auth.student.class.name}
                    </p>
                  </div>
                  <Badge variant={statusBadgeVariant(auth.status)} size="sm">
                    {auth.status === 'APPROVED'
                      ? t('authorizations.approved')
                      : auth.status === 'REJECTED'
                        ? t('authorizations.rejected')
                        : t('authorizations.pending')}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                  <span>
                    {formatDateRange(auth.absenceDate, auth.absenceEndDate)}
                  </span>
                </div>
                <p className="text-xs text-text-secondary">{auth.reason}</p>
                {auth.status === 'REJECTED' && auth.rejectionReason && (
                  <p className="text-xs text-danger">{auth.rejectionReason}</p>
                )}
                {/* Mobile actions for staff */}
                {canReview(user?.role) && auth.status === 'PENDING' && (
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={approvingId === auth.id}
                      onClick={() => handleApprove(auth)}
                    >
                      <Check size={14} />
                      {t('authorizations.approve')}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => openRejectModal(auth)}
                    >
                      <X size={14} />
                      {t('authorizations.reject')}
                    </Button>
                  </div>
                )}
              </div>

              {/* Desktop layout */}
              <div className="hidden sm:grid sm:grid-cols-12 sm:items-center sm:gap-4">
                <div className="col-span-3">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {auth.student.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {auth.student.class.name}
                  </p>
                </div>
                <span className="col-span-2 text-sm text-text-primary">
                  {formatDateRange(auth.absenceDate, auth.absenceEndDate)}
                </span>
                <span className="col-span-3 truncate text-sm text-text-muted">
                  {auth.reason}
                </span>
                <span className="col-span-2">
                  <Badge variant={statusBadgeVariant(auth.status)} size="sm">
                    {auth.status === 'APPROVED'
                      ? t('authorizations.approved')
                      : auth.status === 'REJECTED'
                        ? t('authorizations.rejected')
                        : t('authorizations.pending')}
                  </Badge>
                  {auth.status === 'REJECTED' && auth.rejectionReason && (
                    <p className="mt-1 truncate text-xs text-danger">
                      {auth.rejectionReason}
                    </p>
                  )}
                </span>
                <div className="col-span-2 flex items-center justify-end gap-1">
                  {canReview(user?.role) && auth.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleApprove(auth)}
                        disabled={approvingId === auth.id}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-success-dim hover:text-success transition disabled:opacity-50"
                        aria-label={t('authorizations.approve')}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => openRejectModal(auth)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-danger-dim hover:text-danger transition"
                        aria-label={t('authorizations.reject')}
                      >
                        <X size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/*  Request Authorization Modal (STUDENT)                        */}
      {/* ============================================================ */}
      <Modal
        open={requestModalOpen}
        onClose={closeRequestModal}
        title={t('authorizations.request')}
        size="md"
      >
        <div className="space-y-4">
          {/* Absence date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('authorizations.absence_date')} *
            </label>
            <input
              type="date"
              value={reqAbsenceDate}
              onChange={(e) => setReqAbsenceDate(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            />
          </div>

          {/* End date (optional) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('authorizations.end_date')}
            </label>
            <input
              type="date"
              value={reqEndDate}
              onChange={(e) => setReqEndDate(e.target.value)}
              min={reqAbsenceDate}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('authorizations.reason')} *
            </label>
            <textarea
              value={reqReason}
              onChange={(e) => setReqReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
              placeholder={t('authorizations.reason')}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={closeRequestModal}
            >
              {t('app.cancel')}
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              loading={reqSaving}
              onClick={handleRequest}
            >
              {t('app.save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/*  Reject Modal (STAFF / DIRECTOR / ADMIN)                      */}
      {/* ============================================================ */}
      <Modal
        open={!!rejectTarget}
        onClose={() => {
          setRejectTarget(null)
          setRejectionReason('')
        }}
        title={t('authorizations.reject')}
        size="sm"
      >
        <div className="space-y-4">
          {/* Student info */}
          {rejectTarget && (
            <div className="rounded-lg border border-border-subtle bg-bg-surface px-3 py-2">
              <p className="text-sm font-semibold text-text-primary">
                {rejectTarget.student.name}
              </p>
              <p className="text-xs text-text-muted">
                {rejectTarget.student.class.name} &mdash;{' '}
                {formatDateRange(
                  rejectTarget.absenceDate,
                  rejectTarget.absenceEndDate,
                )}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {rejectTarget.reason}
              </p>
            </div>
          )}

          {/* Rejection reason */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('authorizations.rejection_reason')} *
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
              placeholder={t('authorizations.rejection_reason')}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={() => {
                setRejectTarget(null)
                setRejectionReason('')
              }}
            >
              {t('app.cancel')}
            </Button>
            <Button
              variant="danger"
              size="md"
              className="flex-1"
              loading={rejectSaving}
              onClick={handleReject}
            >
              <X size={16} />
              {t('authorizations.reject')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
