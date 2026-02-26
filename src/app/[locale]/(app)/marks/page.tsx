'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, BookMarked, Save, Trophy, ArrowLeft, Trash2 } from 'lucide-react'
import { useUserStore, type AuthUser } from '@/store/userStore'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TERMS = [
  { id: 'term1', name: 'Trimester 1' },
  { id: 'term2', name: 'Trimester 2' },
  { id: 'term3', name: 'Trimester 3' },
]

const EXAM_TYPES = ['DC1', 'DC2', 'DC3', 'DS'] as const
type ExamType = (typeof EXAM_TYPES)[number]

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Subject {
  id: string
  name: string
}

interface Class {
  id: string
  name: string
}

interface Teacher {
  id: string
  name: string
}

interface Exam {
  id: string
  schoolId: string
  termId: string
  term: { id: string; name: string }
  subjectId: string
  subject: Subject
  classId: string
  class: Class
  teacherId: string
  teacher: Teacher
  type: string
  date: string
  coefficient: number
  maxScore: number
  _count: { marks: number }
}

interface Mark {
  id: string
  examId: string
  studentId: string
  student: { id: string; name: string }
  score: number | null
  absent: boolean
  note: string | null
  exam: Exam
}

interface MarkEntry {
  studentId: string
  studentName: string
  score: string
  absent: boolean
  note: string
}

interface ReportSubject {
  subjectId: string
  subjectName: string
  coefficient: number
  dc1: number | null
  dc2: number | null
  dc3: number | null
  ds: number | null
  dcAverage: number | null
  termAverage: number | null
  weighted: number | null
}

interface ReportCard {
  subjects: ReportSubject[]
  overall: number | null
  rank: number | null
  classSize: number
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function examTypeBadgeVariant(type: string): 'info' | 'accent' | 'warning' | 'success' {
  switch (type) {
    case 'DC1':
      return 'info'
    case 'DC2':
      return 'accent'
    case 'DC3':
      return 'warning'
    case 'DS':
      return 'success'
    default:
      return 'info'
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function scoreColor(value: number | null): string {
  if (value === null) return 'text-text-muted'
  return value >= 10 ? 'text-success' : 'text-danger'
}

/* ------------------------------------------------------------------ */
/*  Skeletons                                                          */
/* ------------------------------------------------------------------ */

function ExamListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-border-subtle bg-bg-card p-4"
        >
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ReportCardSkeleton() {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card p-4">
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Create Exam Modal                                                  */
/* ------------------------------------------------------------------ */

interface CreateExamModalProps {
  open: boolean
  onClose: () => void
  subjects: Subject[]
  classes: Class[]
  termId: string
  onSave: (data: {
    subjectId: string
    classId: string
    termId: string
    type: ExamType
    date: string
    coefficient: number
    maxScore: number
  }) => Promise<void>
  t: (key: string) => string
}

function CreateExamModal({
  open,
  onClose,
  subjects,
  classes,
  termId,
  onSave,
  t,
}: CreateExamModalProps) {
  const [subjectId, setSubjectId] = useState('')
  const [classId, setClassId] = useState('')
  const [type, setType] = useState<ExamType>('DC1')
  const [date, setDate] = useState('')
  const [coefficient, setCoefficient] = useState(1)
  const [maxScore, setMaxScore] = useState(20)
  const [saving, setSaving] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSubjectId(subjects[0]?.id ?? '')
      setClassId(classes[0]?.id ?? '')
      setType('DC1')
      setDate(new Date().toISOString().split('T')[0])
      setCoefficient(1)
      setMaxScore(20)
    }
  }, [open, subjects, classes])

  // Update coefficient when type changes
  useEffect(() => {
    setCoefficient(type === 'DS' ? 2 : 1)
  }, [type])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subjectId || !classId || !date) return
    setSaving(true)
    try {
      await onSave({ subjectId, classId, termId, type, date, coefficient, maxScore })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none'

  return (
    <Modal open={open} onClose={onClose} title={t('marks.create_exam')} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Subject */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('marks.subject')}
          </label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className={inputClass}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Class */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('marks.class')}
          </label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className={inputClass}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('marks.type')}
          </label>
          <div className="flex gap-2">
            {EXAM_TYPES.map((et) => (
              <button
                key={et}
                type="button"
                onClick={() => setType(et)}
                className={`
                  rounded-lg px-4 py-2 text-sm font-medium border transition-colors
                  ${
                    type === et
                      ? 'bg-accent-dim text-accent border-accent'
                      : 'bg-bg-surface text-text-secondary border-border-subtle hover:border-border-default'
                  }
                `}
              >
                {t(`marks.${et.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('marks.date')}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        {/* Coefficient + Max Score */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('marks.coefficient')}
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={coefficient}
              onChange={(e) => setCoefficient(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('marks.max_score')}
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" size="md" className="flex-1" onClick={onClose}>
            {t('app.cancel')}
          </Button>
          <Button type="submit" size="md" className="flex-1" loading={saving}>
            <Plus className="h-4 w-4" />
            {t('marks.create_exam')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/*  Mark Entry View (Teacher)                                          */
/* ------------------------------------------------------------------ */

interface MarkEntryViewProps {
  exam: Exam
  onBack: () => void
  t: (key: string) => string
  schoolId: string
}

function MarkEntryView({ exam, onBack, t, schoolId }: MarkEntryViewProps) {
  const toast = useToast()
  const [marks, setMarks] = useState<MarkEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Fetch existing marks for this exam
  const fetchMarks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/marks?examId=${exam.id}`)
      if (res.ok) {
        const data: Mark[] = await res.json()
        setMarks(
          data.map((m) => ({
            studentId: m.studentId,
            studentName: m.student.name,
            score: m.score !== null ? String(m.score) : '',
            absent: m.absent,
            note: m.note ?? '',
          })),
        )
      }
    } catch {
      toast.error(t('app.error'))
    } finally {
      setLoading(false)
    }
  }, [exam.id, t, toast])

  useEffect(() => {
    fetchMarks()
  }, [fetchMarks])

  function updateMark(index: number, field: keyof MarkEntry, value: string | boolean) {
    setMarks((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      // If marking absent, clear the score
      if (field === 'absent' && value === true) {
        updated[index].score = ''
      }
      return updated
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        examId: exam.id,
        marks: marks.map((m) => ({
          studentId: m.studentId,
          score: m.absent ? null : m.score !== '' ? Number(m.score) : null,
          absent: m.absent,
          note: m.note || null,
        })),
      }
      const res = await fetch('/api/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success(t('marks.marks_saved'))
      } else {
        toast.error(t('app.error'))
      }
    } catch {
      toast.error(t('app.error'))
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-bg-surface hover:text-text-primary transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="font-display text-lg font-semibold text-text-primary">
            {t('marks.enter_marks')}
          </h2>
          <p className="text-sm text-text-muted">
            {exam.subject.name} &mdash; {exam.class.name} &mdash;{' '}
            <Badge variant={examTypeBadgeVariant(exam.type)} size="sm">
              {t(`marks.${exam.type.toLowerCase()}`)}
            </Badge>
            {' '}&mdash; {formatDate(exam.date)}
          </p>
        </div>
        <Button onClick={handleSave} loading={saving} size="md">
          <Save className="h-4 w-4" />
          {t('marks.save_marks')}
        </Button>
      </div>

      {/* Marks Table */}
      {loading ? (
        <ExamListSkeleton />
      ) : marks.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-bg-card p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BookMarked className="mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">{t('marks.no_exams')}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border-subtle bg-bg-card shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-4 py-3 text-left font-medium text-text-secondary">#</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  {t('marks.student_name')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  {t('marks.score')} / {exam.maxScore}
                </th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">
                  {t('marks.absent')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  {t('marks.note')}
                </th>
              </tr>
            </thead>
            <tbody>
              {marks.map((mark, index) => (
                <tr
                  key={mark.studentId}
                  className="border-b border-border-subtle last:border-b-0 hover:bg-bg-surface/50 transition-colors"
                >
                  <td className="px-4 py-3 text-text-muted">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {mark.studentName}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      max={exam.maxScore}
                      step={0.25}
                      value={mark.score}
                      onChange={(e) => updateMark(index, 'score', e.target.value)}
                      disabled={mark.absent}
                      placeholder="--"
                      className={`${inputClass} w-24 ${mark.absent ? 'opacity-40' : ''}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={mark.absent}
                      onChange={(e) => updateMark(index, 'absent', e.target.checked)}
                      className="h-4 w-4 rounded border-border-default bg-bg-surface text-accent focus:ring-accent cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={mark.note}
                      onChange={(e) => updateMark(index, 'note', e.target.value)}
                      placeholder={t('marks.note')}
                      className={`${inputClass} w-40`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Teacher View                                                       */
/* ------------------------------------------------------------------ */

interface TeacherViewProps {
  user: AuthUser
  t: (key: string) => string
}

function TeacherView({ user, t }: TeacherViewProps) {
  const toast = useToast()
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0].id)
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null)

  // View state: 'list' or 'marks'
  const [view, setView] = useState<'list' | 'marks'>('list')
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)

  // Fetch exams for teacher
  const fetchExams = useCallback(async () => {
    if (!user.schoolId || !user.teacherId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/exams?schoolId=${user.schoolId}&termId=${selectedTerm}&teacherId=${user.teacherId}`,
      )
      if (res.ok) {
        const data = await res.json()
        setExams(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [user.schoolId, user.teacherId, selectedTerm])

  useEffect(() => {
    fetchExams()
  }, [fetchExams])

  // Fetch subjects + classes for the create modal
  useEffect(() => {
    if (!user.schoolId) return
    async function fetchMeta() {
      try {
        const [sRes, cRes] = await Promise.all([
          fetch(`/api/subjects?schoolId=${user.schoolId}`),
          fetch(`/api/classes?schoolId=${user.schoolId}`),
        ])
        if (sRes.ok) setSubjects(await sRes.json())
        if (cRes.ok) setClasses(await cRes.json())
      } catch {
        // silently fail
      }
    }
    fetchMeta()
  }, [user.schoolId])

  async function handleCreateExam(data: {
    subjectId: string
    classId: string
    termId: string
    type: ExamType
    date: string
    coefficient: number
    maxScore: number
  }) {
    const res = await fetch('/api/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolId: user.schoolId,
        teacherId: user.teacherId,
        ...data,
      }),
    })
    if (res.ok) {
      toast.success(t('marks.exam_created'))
      fetchExams()
    } else {
      toast.error(t('app.error'))
    }
  }

  async function handleDeleteExam() {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/exams?id=${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(t('marks.exam_deleted'))
        setDeleteTarget(null)
        fetchExams()
      } else {
        toast.error(t('app.error'))
      }
    } catch {
      toast.error(t('app.error'))
    }
  }

  function openMarks(exam: Exam) {
    setSelectedExam(exam)
    setView('marks')
  }

  function backToList() {
    setView('list')
    setSelectedExam(null)
    fetchExams()
  }

  // Mark entry sub-view
  if (view === 'marks' && selectedExam) {
    return (
      <MarkEntryView
        exam={selectedExam}
        onBack={backToList}
        t={t}
        schoolId={user.schoolId}
      />
    )
  }

  return (
    <>
      {/* Term selector */}
      <div className="flex gap-2">
        {TERMS.map((term) => (
          <button
            key={term.id}
            onClick={() => setSelectedTerm(term.id)}
            className={`
              rounded-full px-4 py-1.5 text-sm font-medium border transition-colors
              ${
                selectedTerm === term.id
                  ? 'bg-accent-dim text-accent border-accent'
                  : 'bg-transparent text-text-secondary border-border-subtle hover:border-border-default hover:text-text-primary'
              }
            `}
          >
            {term.name}
          </button>
        ))}
      </div>

      {/* Exam list header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-text-primary">
          {t('marks.my_exams')}
        </h2>
        <Button onClick={() => setCreateModalOpen(true)} size="md">
          <Plus className="h-4 w-4" />
          {t('marks.create_exam')}
        </Button>
      </div>

      {/* Exam list */}
      {loading ? (
        <ExamListSkeleton />
      ) : exams.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-bg-card p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BookMarked className="mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">{t('marks.no_exams')}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="group rounded-xl border border-border-subtle bg-bg-card p-4 shadow-card hover:border-border-default transition cursor-pointer"
              onClick={() => openMarks(exam)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') openMarks(exam)
              }}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-dim text-accent">
                  <BookMarked size={20} />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {exam.subject.name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                    <span>{exam.class.name}</span>
                    <span>{formatDate(exam.date)}</span>
                    <span>
                      {t('marks.coefficient')}: {exam.coefficient}
                    </span>
                  </div>
                </div>

                {/* Type badge */}
                <Badge variant={examTypeBadgeVariant(exam.type)} size="sm">
                  {t(`marks.${exam.type.toLowerCase()}`)}
                </Badge>

                {/* Mark count */}
                <span className="text-xs text-text-muted">
                  {exam._count.marks} {t('marks.score').toLowerCase()}
                </span>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteTarget(exam)
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted opacity-0 group-hover:opacity-100 hover:bg-danger-dim hover:text-danger transition"
                  aria-label="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Exam Modal */}
      <CreateExamModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        subjects={subjects}
        classes={classes}
        termId={selectedTerm}
        onSave={handleCreateExam}
        t={t}
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
              {deleteTarget.subject.name} &mdash; {deleteTarget.class.name} &mdash;{' '}
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
              <Button variant="danger" size="md" className="flex-1" onClick={handleDeleteExam}>
                {t('app.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Student View (Report Card / Bulletin)                              */
/* ------------------------------------------------------------------ */

interface StudentViewProps {
  user: AuthUser
  t: (key: string) => string
}

function StudentView({ user, t }: StudentViewProps) {
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0].id)
  const [report, setReport] = useState<ReportCard | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReport = useCallback(async () => {
    if (!user.studentId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/marks/report?studentId=${user.studentId}&termId=${selectedTerm}`,
      )
      if (res.ok) {
        const data = await res.json()
        setReport(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [user.studentId, selectedTerm])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  return (
    <>
      {/* Term selector */}
      <div className="flex gap-2">
        {TERMS.map((term) => (
          <button
            key={term.id}
            onClick={() => setSelectedTerm(term.id)}
            className={`
              rounded-full px-4 py-1.5 text-sm font-medium border transition-colors
              ${
                selectedTerm === term.id
                  ? 'bg-accent-dim text-accent border-accent'
                  : 'bg-transparent text-text-secondary border-border-subtle hover:border-border-default hover:text-text-primary'
              }
            `}
          >
            {term.name}
          </button>
        ))}
      </div>

      {/* Report Card Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-dim text-accent">
          <Trophy size={20} />
        </div>
        <h2 className="font-display text-lg font-semibold text-text-primary">
          {t('marks.report_card')}
        </h2>
      </div>

      {/* Report table */}
      {loading ? (
        <ReportCardSkeleton />
      ) : !report || report.subjects.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-bg-card p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BookMarked className="mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">{t('marks.no_exams')}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border-subtle bg-bg-card shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  {t('marks.subject')}
                </th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">
                  {t('marks.coefficient')}
                </th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">
                  {t('marks.dc1')}
                </th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">
                  {t('marks.dc2')}
                </th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">
                  {t('marks.dc3')}
                </th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">
                  {t('marks.ds')}
                </th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">
                  {t('marks.dc_average')}
                </th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">
                  {t('marks.term_average')}
                </th>
              </tr>
            </thead>
            <tbody>
              {report.subjects.map((subj) => (
                <tr
                  key={subj.subjectId}
                  className="border-b border-border-subtle last:border-b-0 hover:bg-bg-surface/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {subj.subjectName}
                  </td>
                  <td className="px-4 py-3 text-center text-text-muted">{subj.coefficient}</td>
                  <td className={`px-4 py-3 text-center ${scoreColor(subj.dc1)}`}>
                    {subj.dc1 !== null ? subj.dc1.toFixed(2) : '--'}
                  </td>
                  <td className={`px-4 py-3 text-center ${scoreColor(subj.dc2)}`}>
                    {subj.dc2 !== null ? subj.dc2.toFixed(2) : '--'}
                  </td>
                  <td className={`px-4 py-3 text-center ${scoreColor(subj.dc3)}`}>
                    {subj.dc3 !== null ? subj.dc3.toFixed(2) : '--'}
                  </td>
                  <td className={`px-4 py-3 text-center ${scoreColor(subj.ds)}`}>
                    {subj.ds !== null ? subj.ds.toFixed(2) : '--'}
                  </td>
                  <td className={`px-4 py-3 text-center font-medium ${scoreColor(subj.dcAverage)}`}>
                    {subj.dcAverage !== null ? subj.dcAverage.toFixed(2) : '--'}
                  </td>
                  <td
                    className={`px-4 py-3 text-center font-semibold ${scoreColor(subj.termAverage)}`}
                  >
                    {subj.termAverage !== null ? subj.termAverage.toFixed(2) : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Overall average + Rank */}
          <div className="border-t border-border-subtle bg-bg-surface/50 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-text-secondary">
                  {t('marks.overall_average')}:
                </span>
                <span
                  className={`text-lg font-bold ${scoreColor(report.overall)}`}
                >
                  {report.overall !== null ? report.overall.toFixed(2) : '--'}
                </span>
                <span className="text-sm text-text-muted">/ 20</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-text-secondary">
                  {t('marks.rank')}:
                </span>
                <span className="text-lg font-bold text-accent">
                  {report.rank !== null ? report.rank : '--'}
                </span>
                <span className="text-sm text-text-muted">
                  / {report.classSize} ({t('marks.class_size')})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Admin View (Director / Admin)                                      */
/* ------------------------------------------------------------------ */

interface AdminViewProps {
  user: AuthUser
  t: (key: string) => string
}

function AdminView({ user, t }: AdminViewProps) {
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0].id)
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [filterClass, setFilterClass] = useState<string>('all')
  const [filterSubject, setFilterSubject] = useState<string>('all')

  // View state for mark viewing
  const [viewingExam, setViewingExam] = useState<Exam | null>(null)
  const [viewMarks, setViewMarks] = useState<Mark[]>([])
  const [loadingMarks, setLoadingMarks] = useState(false)

  // Fetch classes + subjects for filters
  useEffect(() => {
    if (!user.schoolId) return
    async function fetchMeta() {
      try {
        const [cRes, sRes] = await Promise.all([
          fetch(`/api/classes?schoolId=${user.schoolId}`),
          fetch(`/api/subjects?schoolId=${user.schoolId}`),
        ])
        if (cRes.ok) setClasses(await cRes.json())
        if (sRes.ok) setSubjects(await sRes.json())
      } catch {
        // silently fail
      }
    }
    fetchMeta()
  }, [user.schoolId])

  // Fetch exams
  const fetchExams = useCallback(async () => {
    if (!user.schoolId) return
    setLoading(true)
    try {
      let url = `/api/exams?schoolId=${user.schoolId}&termId=${selectedTerm}`
      if (filterClass !== 'all') url += `&classId=${filterClass}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setExams(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [user.schoolId, selectedTerm, filterClass])

  useEffect(() => {
    fetchExams()
  }, [fetchExams])

  // Apply subject filter client-side (since API may not support it)
  const filteredExams =
    filterSubject === 'all' ? exams : exams.filter((e) => e.subjectId === filterSubject)

  // Calculate class averages per subject
  const classAverages: { subject: string; examCount: number; markCount: number }[] = (() => {
    const subjectMap = new Map<string, { name: string; exams: number; marks: number }>()
    for (const exam of filteredExams) {
      const existing = subjectMap.get(exam.subjectId)
      if (existing) {
        existing.exams += 1
        existing.marks += exam._count.marks
      } else {
        subjectMap.set(exam.subjectId, {
          name: exam.subject.name,
          exams: 1,
          marks: exam._count.marks,
        })
      }
    }
    return Array.from(subjectMap.values()).map((v) => ({
      subject: v.name,
      examCount: v.exams,
      markCount: v.marks,
    }))
  })()

  // View marks for an exam
  async function handleViewMarks(exam: Exam) {
    setViewingExam(exam)
    setLoadingMarks(true)
    try {
      const res = await fetch(`/api/marks?examId=${exam.id}`)
      if (res.ok) {
        const data = await res.json()
        setViewMarks(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoadingMarks(false)
    }
  }

  function closeMarksView() {
    setViewingExam(null)
    setViewMarks([])
  }

  const inputClass =
    'w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none'

  return (
    <>
      {/* Term selector */}
      <div className="flex gap-2">
        {TERMS.map((term) => (
          <button
            key={term.id}
            onClick={() => setSelectedTerm(term.id)}
            className={`
              rounded-full px-4 py-1.5 text-sm font-medium border transition-colors
              ${
                selectedTerm === term.id
                  ? 'bg-accent-dim text-accent border-accent'
                  : 'bg-transparent text-text-secondary border-border-subtle hover:border-border-default hover:text-text-primary'
              }
            `}
          >
            {term.name}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-48">
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className={inputClass}
          >
            <option value="all">{t('marks.class')} -- All</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-48">
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className={inputClass}
          >
            <option value="all">{t('marks.subject')} -- All</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Class averages summary */}
      {classAverages.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classAverages.map((avg) => (
            <div
              key={avg.subject}
              className="rounded-xl border border-border-subtle bg-bg-card p-4 shadow-card"
            >
              <p className="text-sm font-semibold text-text-primary">{avg.subject}</p>
              <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
                <span>
                  {avg.examCount} {t('marks.type').toLowerCase()}(s)
                </span>
                <span>
                  {avg.markCount} {t('marks.score').toLowerCase()}(s)
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Exam list */}
      {loading ? (
        <ExamListSkeleton />
      ) : filteredExams.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-bg-card p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BookMarked className="mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">{t('marks.no_exams')}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="rounded-xl border border-border-subtle bg-bg-card p-4 shadow-card hover:border-border-default transition cursor-pointer"
              onClick={() => handleViewMarks(exam)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleViewMarks(exam)
              }}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-dim text-accent">
                  <BookMarked size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {exam.subject.name} &mdash; {exam.class.name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                    <span>{exam.teacher.name}</span>
                    <span>{formatDate(exam.date)}</span>
                    <span>
                      {t('marks.coefficient')}: {exam.coefficient}
                    </span>
                  </div>
                </div>
                <Badge variant={examTypeBadgeVariant(exam.type)} size="sm">
                  {t(`marks.${exam.type.toLowerCase()}`)}
                </Badge>
                <span className="text-xs text-text-muted">
                  {exam._count.marks} {t('marks.score').toLowerCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Marks Modal (read-only) */}
      <Modal
        open={!!viewingExam}
        onClose={closeMarksView}
        title={
          viewingExam
            ? `${viewingExam.subject.name} - ${viewingExam.class.name} (${t(`marks.${viewingExam.type.toLowerCase()}`)})`
            : ''
        }
        size="lg"
      >
        {loadingMarks ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : viewMarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BookMarked className="mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">{t('marks.no_exams')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">#</th>
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">
                    {t('marks.student_name')}
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-text-secondary">
                    {t('marks.score')} / {viewingExam?.maxScore}
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-text-secondary">
                    {t('marks.absent')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">
                    {t('marks.note')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {viewMarks.map((mark, index) => (
                  <tr
                    key={mark.id}
                    className="border-b border-border-subtle last:border-b-0"
                  >
                    <td className="px-3 py-2 text-text-muted">{index + 1}</td>
                    <td className="px-3 py-2 font-medium text-text-primary">
                      {mark.student.name}
                    </td>
                    <td
                      className={`px-3 py-2 text-center font-medium ${
                        mark.absent
                          ? 'text-text-muted'
                          : scoreColor(mark.score)
                      }`}
                    >
                      {mark.absent ? '--' : mark.score !== null ? mark.score : '--'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {mark.absent && (
                        <Badge variant="danger" size="sm">
                          {t('marks.absent')}
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-text-muted">{mark.note || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function MarksPage() {
  const t = useTranslations()
  const user = useUserStore((s) => s.user)

  if (!user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <ExamListSkeleton />
      </div>
    )
  }

  const isTeacher = user.role === 'TEACHER'
  const isStudent = user.role === 'STUDENT'
  const isAdmin = user.role === 'DIRECTOR' || user.role === 'ADMIN'

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {t('marks.title')}
        </h1>
      </div>

      {/* Role-specific views */}
      {isTeacher && <TeacherView user={user} t={t} />}
      {isStudent && <StudentView user={user} t={t} />}
      {isAdmin && <AdminView user={user} t={t} />}

      {/* Fallback for unknown roles */}
      {!isTeacher && !isStudent && !isAdmin && (
        <div className="rounded-xl border border-border-subtle bg-bg-card p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BookMarked className="mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">{t('marks.no_exams')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
