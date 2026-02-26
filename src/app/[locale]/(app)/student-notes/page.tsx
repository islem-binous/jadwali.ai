'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, StickyNote, Search, Lock, Trash2 } from 'lucide-react'
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

interface NoteStudent {
  id: string
  name: string
  classId: string
  class: { id: string; name: string }
}

interface StudentNote {
  id: string
  schoolId: string
  studentId: string
  authorId: string
  category: string
  content: string
  isPrivate: boolean
  createdAt: string
  student: NoteStudent
}

interface StudentOption {
  id: string
  name: string
  classId: string
  class?: { id: string; name: string; grade?: string | null }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type NoteCategory = 'DISCIPLINE' | 'OBSERVATION' | 'POSITIVE' | 'MEDICAL'

function categoryBadgeVariant(
  category: string,
): 'danger' | 'info' | 'success' | 'warning' {
  if (category === 'DISCIPLINE') return 'danger'
  if (category === 'POSITIVE') return 'success'
  if (category === 'MEDICAL') return 'warning'
  return 'info' // OBSERVATION
}

function formatDate(dateStr: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
  return new Date(dateStr).toLocaleDateString(undefined, opts)
}

function canAdd(role: string | undefined): boolean {
  if (!role) return false
  return ['DIRECTOR', 'ADMIN', 'STAFF', 'TEACHER'].includes(role)
}

function canSeePrivate(role: string | undefined): boolean {
  if (!role) return false
  return ['DIRECTOR', 'ADMIN'].includes(role)
}

function canDeleteNote(
  role: string | undefined,
  userId: string | undefined,
  authorId: string,
): boolean {
  if (!role || !userId) return false
  if (['DIRECTOR', 'ADMIN'].includes(role)) return true
  return userId === authorId
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function NoteListSkeleton() {
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
              <Skeleton className="h-3 w-full max-w-md" />
              <Skeleton className="h-3 w-24" />
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

export default function StudentNotesPage() {
  const t = useTranslations()
  const toast = useToast()
  const user = useUserStore((s) => s.user)
  const schoolId = user?.schoolId
  const isStudent = user?.role === 'STUDENT'

  /* ---------------------------------------------------------------- */
  /*  Data State                                                       */
  /* ---------------------------------------------------------------- */

  const [notes, setNotes] = useState<StudentNote[]>([])
  const [loading, setLoading] = useState(true)

  /* ---------------------------------------------------------------- */
  /*  Filter State                                                     */
  /* ---------------------------------------------------------------- */

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  /* ---------------------------------------------------------------- */
  /*  Add Modal State                                                  */
  /* ---------------------------------------------------------------- */

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [students, setStudents] = useState<StudentOption[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [addCategory, setAddCategory] = useState<NoteCategory>('OBSERVATION')
  const [addContent, setAddContent] = useState('')
  const [addPrivate, setAddPrivate] = useState(false)
  const [addSaving, setAddSaving] = useState(false)

  /* ---------------------------------------------------------------- */
  /*  Delete State                                                     */
  /* ---------------------------------------------------------------- */

  const [deleteTarget, setDeleteTarget] = useState<StudentNote | null>(null)

  /* ---------------------------------------------------------------- */
  /*  Data Fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchNotes = useCallback(async () => {
    if (!schoolId) return
    try {
      const params = new URLSearchParams({ schoolId })
      if (isStudent && user?.studentId) {
        params.set('studentId', user.studentId)
      }
      if (categoryFilter !== 'ALL') {
        params.set('category', categoryFilter)
      }

      const res = await fetch(`/api/student-notes?${params.toString()}`)
      if (res.ok) {
        const data: StudentNote[] = await res.json()
        setNotes(data)
      }
    } catch {
      toast.error(t('app.error'))
    }
  }, [schoolId, isStudent, user?.studentId, categoryFilter, t, toast])

  const fetchStudents = useCallback(async () => {
    if (!schoolId) return
    setStudentsLoading(true)
    try {
      const res = await fetch(`/api/students?schoolId=${schoolId}`)
      if (res.ok) {
        const data: StudentOption[] = await res.json()
        setStudents(data)
      }
    } catch {
      // silent
    } finally {
      setStudentsLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    if (!schoolId) return
    setLoading(true)
    fetchNotes().finally(() => setLoading(false))
  }, [schoolId, fetchNotes])

  /* ---------------------------------------------------------------- */
  /*  Filtered Notes                                                   */
  /* ---------------------------------------------------------------- */

  const filteredNotes = notes.filter((note) => {
    // STUDENT: only non-private notes
    if (isStudent && note.isPrivate) return false

    // TEACHER/STAFF: non-private + notes authored by this user
    if (
      (user?.role === 'TEACHER' || user?.role === 'STAFF') &&
      note.isPrivate &&
      note.authorId !== user?.id
    ) {
      return false
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      const nameMatch = note.student.name.toLowerCase().includes(q)
      const classMatch = note.student.class.name.toLowerCase().includes(q)
      const contentMatch = note.content.toLowerCase().includes(q)
      if (!nameMatch && !classMatch && !contentMatch) return false
    }

    return true
  })

  /* ---------------------------------------------------------------- */
  /*  Add Modal Helpers                                                */
  /* ---------------------------------------------------------------- */

  const resetAddForm = () => {
    setSelectedStudentId('')
    setStudentSearch('')
    setAddCategory('OBSERVATION')
    setAddContent('')
    setAddPrivate(false)
  }

  const openAddModal = () => {
    resetAddForm()
    fetchStudents()
    setAddModalOpen(true)
  }

  const closeAddModal = () => {
    setAddModalOpen(false)
    resetAddForm()
  }

  const filteredStudents = students.filter((s) => {
    if (!studentSearch.trim()) return true
    const q = studentSearch.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      (s.class?.name?.toLowerCase().includes(q) ?? false)
    )
  })

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  const handleAddNote = async () => {
    if (!selectedStudentId) {
      toast.error(t('studentNotes.student'))
      return
    }
    if (!addContent.trim()) {
      toast.error(t('studentNotes.content'))
      return
    }

    setAddSaving(true)
    try {
      const res = await fetch('/api/student-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          studentId: selectedStudentId,
          authorId: user?.id,
          category: addCategory,
          content: addContent.trim(),
          isPrivate: addPrivate,
        }),
      })

      if (res.ok) {
        toast.success(t('studentNotes.note_added'))
        closeAddModal()
        await fetchNotes()
      } else {
        toast.error(t('app.error'))
      }
    } catch {
      toast.error(t('app.error'))
    } finally {
      setAddSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(
        `/api/student-notes?id=${deleteTarget.id}`,
        { method: 'DELETE' },
      )
      if (res.ok) {
        toast.success(t('studentNotes.note_deleted'))
        setDeleteTarget(null)
        await fetchNotes()
      } else {
        toast.error(t('app.error'))
      }
    } catch {
      toast.error(t('app.error'))
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Category translation helper                                      */
  /* ---------------------------------------------------------------- */

  function categoryLabel(cat: string): string {
    switch (cat) {
      case 'DISCIPLINE':
        return t('studentNotes.discipline')
      case 'OBSERVATION':
        return t('studentNotes.observation')
      case 'POSITIVE':
        return t('studentNotes.positive')
      case 'MEDICAL':
        return t('studentNotes.medical')
      default:
        return cat
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {t('studentNotes.title')}
        </h1>
        {!isStudent && canAdd(user?.role) && (
          <Button variant="primary" size="md" onClick={openAddModal}>
            <Plus size={16} />
            {t('studentNotes.add_note')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Search */}
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

        {/* Category filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(
            [
              { key: 'ALL', label: t('app.filter') },
              { key: 'DISCIPLINE', label: t('studentNotes.discipline') },
              { key: 'OBSERVATION', label: t('studentNotes.observation') },
              { key: 'POSITIVE', label: t('studentNotes.positive') },
              { key: 'MEDICAL', label: t('studentNotes.medical') },
            ] as const
          ).map((opt) => (
            <FilterPill
              key={opt.key}
              label={opt.label}
              active={categoryFilter === opt.key}
              onClick={() => setCategoryFilter(opt.key)}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <NoteListSkeleton />
      ) : filteredNotes.length === 0 ? (
        /* Empty state */
        <div className="rounded-xl border border-border-subtle bg-bg-card p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <StickyNote className="mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">
              {t('studentNotes.no_notes')}
            </p>
            {!isStudent && canAdd(user?.role) && !search && categoryFilter === 'ALL' && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={openAddModal}
              >
                <Plus size={14} />
                {t('studentNotes.add_note')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Notes timeline */
        <div className="space-y-3">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="rounded-xl border border-border-subtle bg-bg-card p-4 transition hover:border-border-default"
            >
              {/* Top row: student info + badges */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {note.student.name}
                    </p>
                    <span className="text-xs text-text-muted">
                      {note.student.class.name}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {note.isPrivate && canSeePrivate(user?.role) && (
                    <Badge variant="default" size="sm">
                      <Lock size={10} className="mr-1" />
                      {t('studentNotes.private')}
                    </Badge>
                  )}
                  <Badge
                    variant={categoryBadgeVariant(note.category)}
                    size="sm"
                  >
                    {categoryLabel(note.category)}
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <p className="mt-2 text-sm text-text-secondary whitespace-pre-wrap">
                {note.content}
              </p>

              {/* Footer: author + date + actions */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                  <span>{formatDate(note.createdAt)}</span>
                </div>
                {canDeleteNote(user?.role, user?.id, note.authorId) && (
                  <button
                    onClick={() => setDeleteTarget(note)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-danger-dim hover:text-danger transition"
                    aria-label={t('app.delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/*  Add Note Modal                                               */}
      {/* ============================================================ */}
      <Modal
        open={addModalOpen}
        onClose={closeAddModal}
        title={t('studentNotes.add_note')}
        size="lg"
      >
        <div className="space-y-4">
          {/* Student search & select */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('studentNotes.student')} *
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                placeholder={t('app.search')}
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>
            <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-border-default bg-bg-surface">
              {studentsLoading ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : filteredStudents.length === 0 ? (
                <p className="py-3 text-center text-xs text-text-muted">
                  {t('studentNotes.no_notes')}
                </p>
              ) : (
                filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors ${
                      selectedStudentId === student.id
                        ? 'bg-accent/10 text-accent'
                        : 'text-text-secondary hover:bg-bg-surface2'
                    }`}
                  >
                    <span className="truncate">{student.name}</span>
                    <span className="ml-2 shrink-0 text-xs text-text-muted">
                      {student.class?.name ?? ''}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Category selector */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('studentNotes.category')}
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  'DISCIPLINE',
                  'OBSERVATION',
                  'POSITIVE',
                  'MEDICAL',
                ] as const
              ).map((cat) => (
                <FilterPill
                  key={cat}
                  label={categoryLabel(cat)}
                  active={addCategory === cat}
                  onClick={() => setAddCategory(cat)}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('studentNotes.content')} *
            </label>
            <textarea
              value={addContent}
              onChange={(e) => setAddContent(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
              placeholder={t('studentNotes.content')}
            />
          </div>

          {/* Private toggle */}
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={addPrivate}
              onChange={(e) => setAddPrivate(e.target.checked)}
              className="h-4 w-4 rounded border-border-default text-accent focus:ring-accent"
            />
            <div className="flex items-center gap-1.5">
              <Lock size={14} className="text-text-muted" />
              <span className="text-sm text-text-secondary">
                {t('studentNotes.private')}
              </span>
            </div>
          </label>

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
              onClick={handleAddNote}
            >
              {t('app.save')}
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
              {categoryLabel(deleteTarget.category)}
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
