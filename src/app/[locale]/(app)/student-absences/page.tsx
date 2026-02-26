'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Search, ClipboardCheck, Check, X } from 'lucide-react'
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

interface ClassOption {
  id: string
  name: string
  grade: string | null
}

interface StudentOption {
  id: string
  name: string
  classId: string
}

interface PeriodOption {
  id: string
  name: string
  startTime: string
  endTime: string
  isBreak: boolean
}

interface AbsenceStudent {
  id: string
  name: string
  classId: string
  class: { id: string; name: string }
}

interface StudentAbsence {
  id: string
  schoolId: string
  studentId: string
  date: string
  periodIds: string
  type: string
  reason: string | null
  reportedBy: string | null
  justifiedBy: string | null
  justifiedAt: string | null
  note: string | null
  createdAt: string
  student: AbsenceStudent
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type AbsenceType = 'UNJUSTIFIED' | 'JUSTIFIED' | 'LATE'

function typeBadgeVariant(type: string): 'danger' | 'success' | 'warning' {
  if (type === 'JUSTIFIED') return 'success'
  if (type === 'LATE') return 'warning'
  return 'danger' // UNJUSTIFIED
}

function formatDate(dateStr: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }
  return new Date(dateStr).toLocaleDateString(undefined, opts)
}

function parsePeriodIds(json: string): string[] {
  try {
    return JSON.parse(json)
  } catch {
    return []
  }
}

function canManage(role: string | undefined): boolean {
  if (!role) return false
  return ['DIRECTOR', 'ADMIN', 'STAFF'].includes(role)
}

function canAdd(role: string | undefined): boolean {
  if (!role) return false
  return ['DIRECTOR', 'ADMIN', 'STAFF', 'TEACHER'].includes(role)
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function AbsenceListSkeleton() {
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

export default function StudentAbsencesPage() {
  const t = useTranslations()
  const toast = useToast()
  const user = useUserStore((s) => s.user)
  const schoolId = user?.schoolId
  const isStudent = user?.role === 'STUDENT'

  /* ---------------------------------------------------------------- */
  /*  Data State                                                       */
  /* ---------------------------------------------------------------- */

  const [absences, setAbsences] = useState<StudentAbsence[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [periods, setPeriods] = useState<PeriodOption[]>([])
  const [loading, setLoading] = useState(true)

  /* ---------------------------------------------------------------- */
  /*  Filter State                                                     */
  /* ---------------------------------------------------------------- */

  const [classFilter, setClassFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [search, setSearch] = useState('')

  /* ---------------------------------------------------------------- */
  /*  Add Modal State                                                  */
  /* ---------------------------------------------------------------- */

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addClassId, setAddClassId] = useState('')
  const [addStudents, setAddStudents] = useState<StudentOption[]>([])
  const [addStudentsLoading, setAddStudentsLoading] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(),
  )
  const [addDate, setAddDate] = useState(
    () => new Date().toISOString().split('T')[0],
  )
  const [addPeriodIds, setAddPeriodIds] = useState<Set<string>>(new Set())
  const [addType, setAddType] = useState<'UNJUSTIFIED' | 'LATE'>('UNJUSTIFIED')
  const [addReason, setAddReason] = useState('')
  const [addSaving, setAddSaving] = useState(false)

  /* ---------------------------------------------------------------- */
  /*  Justify Modal State                                              */
  /* ---------------------------------------------------------------- */

  const [justifyTarget, setJustifyTarget] = useState<StudentAbsence | null>(
    null,
  )
  const [justifyReason, setJustifyReason] = useState('')
  const [justifyNote, setJustifyNote] = useState('')
  const [justifySaving, setJustifySaving] = useState(false)

  /* ---------------------------------------------------------------- */
  /*  Delete State                                                     */
  /* ---------------------------------------------------------------- */

  const [deleteTarget, setDeleteTarget] = useState<StudentAbsence | null>(null)

  /* ---------------------------------------------------------------- */
  /*  Data Fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchAbsences = useCallback(async () => {
    if (!schoolId) return
    try {
      const params = new URLSearchParams({ schoolId })
      if (isStudent && user?.studentId) {
        params.set('studentId', user.studentId)
      }
      if (classFilter) params.set('classId', classFilter)
      if (dateFilter) params.set('date', dateFilter)
      if (typeFilter !== 'ALL') params.set('type', typeFilter)

      const res = await fetch(`/api/student-absences?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setAbsences(data)
      }
    } catch {
      toast.error(t('app.error'))
    }
  }, [schoolId, isStudent, user?.studentId, classFilter, dateFilter, typeFilter, t, toast])

  const fetchClasses = useCallback(async () => {
    if (!schoolId) return
    try {
      const res = await fetch(`/api/classes?schoolId=${schoolId}`)
      if (res.ok) {
        const data = await res.json()
        setClasses(data)
      }
    } catch {
      // silent
    }
  }, [schoolId])

  const fetchPeriods = useCallback(async () => {
    if (!schoolId) return
    try {
      const res = await fetch(`/api/periods?schoolId=${schoolId}`)
      if (res.ok) {
        const data: PeriodOption[] = await res.json()
        setPeriods(data.filter((p) => !p.isBreak))
      }
    } catch {
      // silent
    }
  }, [schoolId])

  useEffect(() => {
    if (!schoolId) return
    setLoading(true)
    Promise.all([fetchAbsences(), fetchClasses(), fetchPeriods()]).finally(() =>
      setLoading(false),
    )
  }, [schoolId, fetchAbsences, fetchClasses, fetchPeriods])

  /* ---------------------------------------------------------------- */
  /*  Period lookup                                                    */
  /* ---------------------------------------------------------------- */

  const periodMap = new Map(periods.map((p) => [p.id, p]))

  function periodNamesFromIds(json: string): string {
    const ids = parsePeriodIds(json)
    return ids
      .map((id) => periodMap.get(id)?.name ?? id)
      .join(', ')
  }

  /* ---------------------------------------------------------------- */
  /*  Add Modal Helpers                                                */
  /* ---------------------------------------------------------------- */

  const resetAddForm = () => {
    setAddClassId('')
    setAddStudents([])
    setSelectedStudentIds(new Set())
    setAddDate(new Date().toISOString().split('T')[0])
    setAddPeriodIds(new Set())
    setAddType('UNJUSTIFIED')
    setAddReason('')
  }

  const openAddModal = () => {
    resetAddForm()
    setAddModalOpen(true)
  }

  const closeAddModal = () => {
    setAddModalOpen(false)
    resetAddForm()
  }

  // Load students when class changes in the add modal
  useEffect(() => {
    if (!addClassId || !schoolId) {
      setAddStudents([])
      setSelectedStudentIds(new Set())
      return
    }

    let cancelled = false
    setAddStudentsLoading(true)

    fetch(`/api/students?schoolId=${schoolId}&classId=${addClassId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: StudentOption[]) => {
        if (!cancelled) {
          setAddStudents(data)
          setSelectedStudentIds(new Set())
        }
      })
      .catch(() => {
        if (!cancelled) setAddStudents([])
      })
      .finally(() => {
        if (!cancelled) setAddStudentsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [addClassId, schoolId])

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAllStudents = () => {
    if (selectedStudentIds.size === addStudents.length) {
      setSelectedStudentIds(new Set())
    } else {
      setSelectedStudentIds(new Set(addStudents.map((s) => s.id)))
    }
  }

  const togglePeriod = (id: string) => {
    setAddPeriodIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  const handleAddAbsences = async () => {
    if (selectedStudentIds.size === 0) {
      toast.error(t('studentAbsences.select_students'))
      return
    }
    if (addPeriodIds.size === 0) {
      toast.error(t('studentAbsences.periods'))
      return
    }

    setAddSaving(true)
    try {
      const periodIdsArray = Array.from(addPeriodIds)
      const promises = Array.from(selectedStudentIds).map((studentId) =>
        fetch('/api/student-absences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId,
            studentId,
            date: addDate,
            periodIds: JSON.stringify(periodIdsArray),
            type: addType,
            reason: addReason.trim() || null,
            reportedBy: user?.id ?? null,
          }),
        }),
      )

      const results = await Promise.all(promises)
      const allOk = results.every((r) => r.ok)

      if (allOk) {
        toast.success(t('studentAbsences.absence_added'))
        closeAddModal()
        await fetchAbsences()
      } else {
        toast.error(t('app.error'))
      }
    } catch {
      toast.error(t('app.error'))
    } finally {
      setAddSaving(false)
    }
  }

  const handleJustify = async () => {
    if (!justifyTarget) return

    setJustifySaving(true)
    try {
      const res = await fetch('/api/student-absences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: justifyTarget.id,
          type: 'JUSTIFIED',
          reason: justifyReason.trim() || justifyTarget.reason || null,
          justifiedBy: user?.id ?? null,
          note: justifyNote.trim() || null,
        }),
      })

      if (res.ok) {
        toast.success(t('studentAbsences.justified_success'))
        setJustifyTarget(null)
        setJustifyReason('')
        setJustifyNote('')
        await fetchAbsences()
      } else {
        toast.error(t('app.error'))
      }
    } catch {
      toast.error(t('app.error'))
    } finally {
      setJustifySaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(
        `/api/student-absences?id=${deleteTarget.id}`,
        { method: 'DELETE' },
      )
      if (res.ok) {
        toast.success(t('app.delete'))
        setDeleteTarget(null)
        await fetchAbsences()
      } else {
        toast.error(t('app.error'))
      }
    } catch {
      toast.error(t('app.error'))
    }
  }

  const openJustify = (absence: StudentAbsence) => {
    setJustifyTarget(absence)
    setJustifyReason(absence.reason ?? '')
    setJustifyNote(absence.note ?? '')
  }

  /* ---------------------------------------------------------------- */
  /*  Filtered List                                                    */
  /* ---------------------------------------------------------------- */

  const filtered = absences.filter((a) => {
    if (search.trim()) {
      const q = search.toLowerCase()
      const nameMatch = a.student.name.toLowerCase().includes(q)
      const classMatch = a.student.class.name.toLowerCase().includes(q)
      if (!nameMatch && !classMatch) return false
    }
    return true
  })

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {t('studentAbsences.title')}
        </h1>
        {!isStudent && canAdd(user?.role) && (
          <Button variant="primary" size="md" onClick={openAddModal}>
            <Plus size={16} />
            {t('studentAbsences.add_absence')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Search + Date row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none sm:w-44"
          />
        </div>

        {/* Type filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(
            [
              { key: 'ALL', label: t('app.filter') },
              { key: 'UNJUSTIFIED', label: t('studentAbsences.unjustified') },
              { key: 'JUSTIFIED', label: t('studentAbsences.justified') },
              { key: 'LATE', label: t('studentAbsences.late') },
            ] as const
          ).map((opt) => (
            <FilterPill
              key={opt.key}
              label={opt.label}
              active={typeFilter === opt.key}
              onClick={() => setTypeFilter(opt.key)}
            />
          ))}
        </div>

        {/* Class filter pills (hidden for STUDENT role) */}
        {!isStudent && classes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <FilterPill
              label={t('studentAbsences.class')}
              active={classFilter === null}
              onClick={() => setClassFilter(null)}
            />
            {classes.map((cls) => (
              <FilterPill
                key={cls.id}
                label={cls.grade ? `${cls.name} (${cls.grade})` : cls.name}
                active={classFilter === cls.id}
                onClick={() =>
                  setClassFilter(classFilter === cls.id ? null : cls.id)
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <AbsenceListSkeleton />
      ) : filtered.length === 0 ? (
        /* Empty state */
        <div className="rounded-xl border border-border-subtle bg-bg-card p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <ClipboardCheck className="mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">
              {t('studentAbsences.no_absences')}
            </p>
            {!isStudent && canAdd(user?.role) && !search && !dateFilter && typeFilter === 'ALL' && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={openAddModal}
              >
                <Plus size={14} />
                {t('studentAbsences.add_absence')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Absence list */
        <div className="space-y-3">
          {/* Desktop table header (hidden on mobile) */}
          <div className="hidden rounded-lg bg-bg-surface px-4 py-2 sm:grid sm:grid-cols-12 sm:gap-4">
            <span className="col-span-2 text-xs font-medium text-text-muted">
              {t('studentAbsences.date')}
            </span>
            <span className="col-span-2 text-xs font-medium text-text-muted">
              {t('studentAbsences.student')}
            </span>
            <span className="col-span-1 text-xs font-medium text-text-muted">
              {t('studentAbsences.class')}
            </span>
            <span className="col-span-2 text-xs font-medium text-text-muted">
              {t('studentAbsences.periods')}
            </span>
            <span className="col-span-1 text-xs font-medium text-text-muted">
              {t('studentAbsences.type')}
            </span>
            <span className="col-span-2 text-xs font-medium text-text-muted">
              {t('studentAbsences.reason')}
            </span>
            <span className="col-span-2 text-xs font-medium text-text-muted text-end">
              {/* Actions */}
            </span>
          </div>

          {filtered.map((absence) => (
            <div
              key={absence.id}
              className="rounded-xl border border-border-subtle bg-bg-card p-4 transition hover:border-border-default"
            >
              {/* Mobile layout */}
              <div className="sm:hidden space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {absence.student.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {absence.student.class.name}
                    </p>
                  </div>
                  <Badge variant={typeBadgeVariant(absence.type)} size="sm">
                    {absence.type === 'JUSTIFIED'
                      ? t('studentAbsences.justified')
                      : absence.type === 'LATE'
                        ? t('studentAbsences.late')
                        : t('studentAbsences.unjustified')}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                  <span>{formatDate(absence.date)}</span>
                  {periodNamesFromIds(absence.periodIds) && (
                    <span>{periodNamesFromIds(absence.periodIds)}</span>
                  )}
                </div>
                {absence.reason && (
                  <p className="text-xs text-text-secondary">{absence.reason}</p>
                )}
                {/* Mobile actions */}
                {canManage(user?.role) && (
                  <div className="flex items-center gap-2 pt-1">
                    {absence.type === 'UNJUSTIFIED' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openJustify(absence)}
                      >
                        <Check size={14} />
                        {t('studentAbsences.justify')}
                      </Button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(absence)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-danger-dim hover:text-danger transition"
                      aria-label={t('app.delete')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Desktop layout */}
              <div className="hidden sm:grid sm:grid-cols-12 sm:items-center sm:gap-4">
                <span className="col-span-2 text-sm text-text-primary">
                  {formatDate(absence.date)}
                </span>
                <span className="col-span-2 truncate text-sm font-semibold text-text-primary">
                  {absence.student.name}
                </span>
                <span className="col-span-1 text-sm text-text-secondary">
                  {absence.student.class.name}
                </span>
                <span className="col-span-2 text-sm text-text-muted">
                  {periodNamesFromIds(absence.periodIds)}
                </span>
                <span className="col-span-1">
                  <Badge variant={typeBadgeVariant(absence.type)} size="sm">
                    {absence.type === 'JUSTIFIED'
                      ? t('studentAbsences.justified')
                      : absence.type === 'LATE'
                        ? t('studentAbsences.late')
                        : t('studentAbsences.unjustified')}
                  </Badge>
                </span>
                <span className="col-span-2 truncate text-sm text-text-muted">
                  {absence.reason ?? '\u2014'}
                </span>
                <div className="col-span-2 flex items-center justify-end gap-1">
                  {canManage(user?.role) && absence.type === 'UNJUSTIFIED' && (
                    <button
                      onClick={() => openJustify(absence)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-success-dim hover:text-success transition"
                      aria-label={t('studentAbsences.justify')}
                    >
                      <Check size={14} />
                    </button>
                  )}
                  {canManage(user?.role) && (
                    <button
                      onClick={() => setDeleteTarget(absence)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-danger-dim hover:text-danger transition"
                      aria-label={t('app.delete')}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/*  Add Absence Modal                                            */}
      {/* ============================================================ */}
      <Modal
        open={addModalOpen}
        onClose={closeAddModal}
        title={t('studentAbsences.add_absence')}
        size="lg"
      >
        <div className="space-y-4">
          {/* Select class */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('studentAbsences.class')} *
            </label>
            <select
              value={addClassId}
              onChange={(e) => setAddClassId(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="">{t('studentAbsences.class')}</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.grade ? `${cls.name} (${cls.grade})` : cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Students checkbox list */}
          {addClassId && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium text-text-secondary">
                  {t('studentAbsences.select_students')} *
                </label>
                {addStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAllStudents}
                    className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                  >
                    {selectedStudentIds.size === addStudents.length
                      ? t('app.cancel')
                      : t('app.filter')}
                  </button>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border-default bg-bg-surface p-2 space-y-0.5">
                {addStudentsLoading ? (
                  <div className="space-y-2 p-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                ) : addStudents.length === 0 ? (
                  <p className="py-3 text-center text-xs text-text-muted">
                    {t('studentAbsences.no_absences')}
                  </p>
                ) : (
                  addStudents.map((student) => (
                    <label
                      key={student.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors ${
                        selectedStudentIds.has(student.id)
                          ? 'bg-accent/10 text-text-primary'
                          : 'text-text-secondary hover:bg-bg-surface2'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.has(student.id)}
                        onChange={() => toggleStudent(student.id)}
                        className="h-4 w-4 rounded border-border-default text-accent focus:ring-accent"
                      />
                      {student.name}
                    </label>
                  ))
                )}
              </div>
              {selectedStudentIds.size > 0 && (
                <p className="mt-1 text-xs text-text-muted">
                  {selectedStudentIds.size} / {addStudents.length}
                </p>
              )}
            </div>
          )}

          {/* Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('studentAbsences.date')} *
            </label>
            <input
              type="date"
              value={addDate}
              onChange={(e) => setAddDate(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            />
          </div>

          {/* Period checkboxes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('studentAbsences.periods')} *
            </label>
            <div className="flex flex-wrap gap-2">
              {periods.map((period) => (
                <button
                  key={period.id}
                  type="button"
                  onClick={() => togglePeriod(period.id)}
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    addPeriodIds.has(period.id)
                      ? 'border-accent bg-accent-dim text-accent'
                      : 'border-border-subtle bg-transparent text-text-secondary hover:border-border-default hover:text-text-primary'
                  }`}
                >
                  {period.name}
                </button>
              ))}
              {periods.length === 0 && (
                <p className="text-xs text-text-muted">
                  {t('studentAbsences.periods')}
                </p>
              )}
            </div>
          </div>

          {/* Type selector */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('studentAbsences.type')}
            </label>
            <div className="flex gap-2">
              <FilterPill
                label={t('studentAbsences.unjustified')}
                active={addType === 'UNJUSTIFIED'}
                onClick={() => setAddType('UNJUSTIFIED')}
              />
              <FilterPill
                label={t('studentAbsences.late')}
                active={addType === 'LATE'}
                onClick={() => setAddType('LATE')}
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('studentAbsences.reason')}
            </label>
            <textarea
              value={addReason}
              onChange={(e) => setAddReason(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
              placeholder={t('studentAbsences.reason')}
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
              loading={addSaving}
              onClick={handleAddAbsences}
            >
              {t('app.save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/*  Justify Modal                                                */}
      {/* ============================================================ */}
      <Modal
        open={!!justifyTarget}
        onClose={() => {
          setJustifyTarget(null)
          setJustifyReason('')
          setJustifyNote('')
        }}
        title={t('studentAbsences.justify')}
        size="sm"
      >
        <div className="space-y-4">
          {/* Student info */}
          {justifyTarget && (
            <div className="rounded-lg border border-border-subtle bg-bg-surface px-3 py-2">
              <p className="text-sm font-semibold text-text-primary">
                {justifyTarget.student.name}
              </p>
              <p className="text-xs text-text-muted">
                {justifyTarget.student.class.name} &mdash;{' '}
                {formatDate(justifyTarget.date)}
              </p>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('studentAbsences.reason')}
            </label>
            <input
              type="text"
              value={justifyReason}
              onChange={(e) => setJustifyReason(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              placeholder={t('studentAbsences.reason')}
            />
          </div>

          {/* Note */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('studentAbsences.note')}
            </label>
            <textarea
              value={justifyNote}
              onChange={(e) => setJustifyNote(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
              placeholder={t('studentAbsences.note')}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={() => {
                setJustifyTarget(null)
                setJustifyReason('')
                setJustifyNote('')
              }}
            >
              {t('app.cancel')}
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              loading={justifySaving}
              onClick={handleJustify}
            >
              <Check size={16} />
              {t('studentAbsences.justify')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/*  Delete Confirmation Modal                                    */}
      {/* ============================================================ */}
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
              {deleteTarget.student.name} &mdash;{' '}
              {formatDate(deleteTarget.date)}
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
