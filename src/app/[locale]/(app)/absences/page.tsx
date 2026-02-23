'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useUserStore } from '@/store/userStore'
import { isAdmin as checkIsAdmin } from '@/lib/permissions'
import { Plus, UserX, Search, CalendarDays, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FilterPill } from '@/components/ui/FilterPill'
import { useToast } from '@/components/ui/Toast'
import { ReportAbsenceModal, type AbsenceFormData } from '@/components/absences/ReportAbsenceModal'
import { SubstituteMatchCard } from '@/components/absences/SubstituteMatchCard'
import type { SubstituteMatch } from '@/lib/substitute-matcher'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AbsenceTeacher {
  id: string
  name: string
  colorHex: string
  subjects: { subjectId: string; subject: { name: string }; isPrimary: boolean }[]
}

interface Absence {
  id: string
  schoolId: string
  teacherId: string
  teacher: AbsenceTeacher
  date: string
  endDate: string | null
  type: string
  periods: string
  note: string | null
  substituteId: string | null
  status: string
  createdAt: string
}

interface TeacherOption {
  id: string
  name: string
  colorHex: string
}

interface PeriodOption {
  id: string
  name: string
  order: number
  isBreak: boolean
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const typeKeyMap: Record<string, string> = {
  SICK: 'type_sick',
  PERSONAL: 'type_personal',
  TRAINING: 'type_training',
  CONFERENCE: 'type_conference',
  MATERNITY: 'type_maternity',
  MEDICAL: 'type_medical',
  EMERGENCY: 'type_emergency',
  OTHER: 'type_other',
}

function statusBadgeVariant(status: string): 'warning' | 'success' | 'danger' {
  if (status === 'COVERED') return 'success'
  if (status === 'UNCOVERED') return 'danger'
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

function formatAbsenceDates(startStr: string, endStr: string | null): string {
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }
  const start = new Date(startStr).toLocaleDateString(undefined, opts)
  if (!endStr) return start
  const end = new Date(endStr).toLocaleDateString(undefined, opts)
  return start === end ? start : `${start} → ${end}`
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function AbsenceSkeleton() {
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

export default function AbsencesPage() {
  const t = useTranslations()
  const user = useUserStore((s) => s.user)
  const toast = useToast()
  const adminUser = checkIsAdmin(user?.role || '')
  const isTeacherRole = user?.role === 'TEACHER'

  // Data
  const [absences, setAbsences] = useState<Absence[]>([])
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [periods, setPeriods] = useState<PeriodOption[]>([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [filter, setFilter] = useState<'today' | 'upcoming'>('today')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Absence | null>(null)
  const [expandedAbsenceId, setExpandedAbsenceId] = useState<string | null>(null)
  const [substitutes, setSubstitutes] = useState<SubstituteMatch[]>([])
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [assigningTeacherId, setAssigningTeacherId] = useState<string | null>(null)

  // Fetch absences
  const fetchAbsences = useCallback(async () => {
    if (!user?.schoolId) return
    setLoading(true)
    try {
      let url = `/api/absences?schoolId=${user.schoolId}&filter=${filter}`
      if (isTeacherRole && user.teacherId) {
        url += `&teacherId=${user.teacherId}`
      }
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setAbsences(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [user?.schoolId, filter])

  useEffect(() => {
    fetchAbsences()
  }, [fetchAbsences])

  // Fetch teachers + periods for the modal
  useEffect(() => {
    if (!user?.schoolId) return

    async function fetchMeta() {
      try {
        const [tRes, pRes] = await Promise.all([
          fetch(`/api/teachers?schoolId=${user!.schoolId}`),
          fetch(`/api/periods?schoolId=${user!.schoolId}`),
        ])
        if (tRes.ok) {
          const teachersData = await tRes.json()
          setTeachers(
            teachersData.map((t: { id: string; name: string; colorHex: string }) => ({
              id: t.id,
              name: t.name,
              colorHex: t.colorHex,
            })),
          )
        }
        if (pRes.ok) {
          const periodsData = await pRes.json()
          setPeriods(periodsData)
        }
      } catch {
        // silently fail
      }
    }

    fetchMeta()
  }, [user?.schoolId])

  // Handle "Find Substitute"
  async function handleFindSubstitute(absenceId: string) {
    if (expandedAbsenceId === absenceId) {
      setExpandedAbsenceId(null)
      setSubstitutes([])
      return
    }

    setExpandedAbsenceId(absenceId)
    setLoadingSubs(true)
    setSubstitutes([])

    try {
      const res = await fetch(
        `/api/absences/substitutes?absenceId=${absenceId}&schoolId=${user!.schoolId}`,
      )
      if (res.ok) {
        const data = await res.json()
        setSubstitutes(data)
      }
    } catch {
      toast.error(t('app.error'))
    } finally {
      setLoadingSubs(false)
    }
  }

  // Handle assign substitute
  async function handleAssign(absenceId: string, teacherId: string) {
    setAssigningTeacherId(teacherId)
    try {
      const res = await fetch('/api/absences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: absenceId, status: 'COVERED' }),
      })
      if (res.ok) {
        toast.success(t('absences.covered'))
        setExpandedAbsenceId(null)
        setSubstitutes([])
        fetchAbsences()
      }
    } catch {
      toast.error(t('app.error'))
    } finally {
      setAssigningTeacherId(null)
    }
  }

  // Handle report/edit absence
  async function handleSaveAbsence(data: AbsenceFormData) {
    const isEdit = !!data.id
    const res = await fetch('/api/absences', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolId: user!.schoolId,
        ...data,
      }),
    })
    if (res.ok) {
      toast.success(isEdit ? t('app.edit') : t('absences.report'))
      fetchAbsences()
    } else {
      toast.error(t('app.error'))
    }
  }

  // Handle delete absence
  async function handleDeleteAbsence() {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/absences?id=${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success(t('app.delete'))
        setDeleteTarget(null)
        fetchAbsences()
      } else {
        toast.error(t('app.error'))
      }
    } catch {
      toast.error(t('app.error'))
    }
  }

  function openEdit(absence: Absence) {
    setEditingAbsence(absence)
    setModalOpen(true)
  }

  function openCreate() {
    setEditingAbsence(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingAbsence(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {t('absences.title')}
        </h1>
        {adminUser && (
          <Button onClick={openCreate} size="md">
            <Plus className="h-4 w-4" />
            {t('absences.report')}
          </Button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-2">
        <FilterPill
          label={t('absences.today')}
          active={filter === 'today'}
          onClick={() => setFilter('today')}
        />
        <FilterPill
          label={t('absences.upcoming')}
          active={filter === 'upcoming'}
          onClick={() => setFilter('upcoming')}
        />
      </div>

      {/* Absence list */}
      {loading ? (
        <AbsenceSkeleton />
      ) : absences.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-bg-card p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CalendarDays className="mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">
              {filter === 'today'
                ? t('absences.today')
                : t('absences.leave_upcoming')}
              {' -- '}
              {t('dashboard.conflict_none')}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {absences.map((absence) => {
            const typeKey = typeKeyMap[absence.type] || 'type_other'
            const isExpanded = expandedAbsenceId === absence.id

            return (
              <div key={absence.id}>
                {/* Absence card */}
                <div
                  className={`rounded-xl border bg-bg-card p-4 transition ${
                    isExpanded
                      ? 'border-accent/30'
                      : 'border-border-subtle hover:border-border-default'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Teacher avatar */}
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: absence.teacher.colorHex }}
                    >
                      {getInitials(absence.teacher.name)}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {absence.teacher.name}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                        <span>
                          {formatAbsenceDates(absence.date, absence.endDate)}
                        </span>
                        <Badge variant="default" size="sm">
                          {t(`absences.${typeKey}`)}
                        </Badge>
                      </div>
                    </div>

                    {/* Status badge */}
                    <Badge variant={statusBadgeVariant(absence.status)} size="sm">
                      {absence.status === 'COVERED'
                        ? t('absences.covered')
                        : absence.status === 'UNCOVERED'
                          ? t('absences.uncovered')
                          : 'Pending'}
                    </Badge>

                    {/* Edit / Delete buttons (admin only) */}
                    {adminUser && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(absence)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-surface hover:text-text-primary transition"
                          aria-label="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(absence)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-danger-dim hover:text-danger transition"
                          aria-label="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}

                    {/* Find substitute button for PENDING (admin only) */}
                    {adminUser && absence.status === 'PENDING' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleFindSubstitute(absence.id)}
                      >
                        <Search className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t('absences.find_sub')}</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Substitute matches panel */}
                {isExpanded && (
                  <div className="mt-2 rounded-xl border border-accent/20 bg-bg-surface p-4">
                    <h3 className="mb-3 text-sm font-semibold text-text-primary">
                      {t('absences.substitute_title')}
                    </h3>

                    {loadingSubs ? (
                      <div className="space-y-3">
                        {Array.from({ length: 2 }).map((_, i) => (
                          <div
                            key={i}
                            className="animate-pulse rounded-xl border border-border-subtle bg-bg-card p-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-full bg-bg-surface" />
                              <div className="flex-1 space-y-2">
                                <div className="h-4 w-32 rounded bg-bg-surface" />
                                <div className="h-3 w-48 rounded bg-bg-surface" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : substitutes.length === 0 ? (
                      <div className="flex flex-col items-center py-6 text-center">
                        <UserX className="mb-2 h-8 w-8 text-text-muted" />
                        <p className="text-sm text-text-muted">
                          {t('absences.uncovered')}
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {substitutes.map((match) => (
                          <SubstituteMatchCard
                            key={match.teacherId}
                            match={match}
                            onAssign={(teacherId) => handleAssign(absence.id, teacherId)}
                            loading={assigningTeacherId === match.teacherId}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Report / Edit absence modal */}
      <ReportAbsenceModal
        isOpen={modalOpen}
        onClose={closeModal}
        teachers={teachers}
        periods={periods}
        schoolId={user?.schoolId ?? ''}
        absence={editingAbsence}
        onSave={handleSaveAbsence}
      />

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
              {deleteTarget.teacher.name} &mdash;{' '}
              {new Date(deleteTarget.date).toLocaleDateString()}
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
                onClick={handleDeleteAbsence}
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
