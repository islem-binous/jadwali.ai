'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Search, GraduationCap, Pencil, Trash2, Upload, Download } from 'lucide-react'
import { useUserStore } from '@/store/userStore'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FilterPill } from '@/components/ui/FilterPill'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { triggerExport } from '@/lib/export-helpers'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ClassOption {
  id: string
  name: string
  grade: string | null
}

interface StudentData {
  id: string
  schoolId: string
  name: string
  email: string | null
  phone: string | null
  matricule: string | null
  sex: string | null
  birthDate: string | null
  classId: string
  class: ClassOption
  createdAt: string
}

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

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function StudentsPage() {
  const t = useTranslations()
  const toast = useToast()
  const user = useUserStore((s) => s.user)
  const schoolId = user?.schoolId

  // Data state
  const [students, setStudents] = useState<StudentData[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentData | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StudentData | null>(null)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formMatricule, setFormMatricule] = useState('')
  const [formSex, setFormSex] = useState('')
  const [formBirthDate, setFormBirthDate] = useState('')
  const [formClassId, setFormClassId] = useState('')

  // Import ref
  const importInputRef = useRef<HTMLInputElement>(null)

  /* ---------------------------------------------------------------- */
  /*  Data Fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchStudents = useCallback(async () => {
    if (!schoolId) return
    try {
      const params = new URLSearchParams({ schoolId })
      if (classFilter) params.set('classId', classFilter)
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/students?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setStudents(data)
      }
    } catch {
      toast.error(t('app.error'))
    }
  }, [schoolId, classFilter, search, t, toast])

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

  useEffect(() => {
    if (!schoolId) return
    setLoading(true)
    Promise.all([fetchStudents(), fetchClasses()]).finally(() =>
      setLoading(false)
    )
  }, [schoolId, fetchStudents, fetchClasses])

  /* ---------------------------------------------------------------- */
  /*  Form Helpers                                                     */
  /* ---------------------------------------------------------------- */

  const resetForm = () => {
    setFormName('')
    setFormEmail('')
    setFormPhone('')
    setFormMatricule('')
    setFormSex('')
    setFormBirthDate('')
    setFormClassId('')
  }

  const populateForm = (student: StudentData) => {
    setFormName(student.name)
    setFormEmail(student.email ?? '')
    setFormPhone(student.phone ?? '')
    setFormMatricule(student.matricule ?? '')
    setFormSex(student.sex ?? '')
    setFormBirthDate(student.birthDate ? student.birthDate.split('T')[0] : '')
    setFormClassId(student.classId)
  }

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  const openCreate = () => {
    setEditingStudent(null)
    resetForm()
    setModalOpen(true)
  }

  const openEdit = (student: StudentData) => {
    setEditingStudent(student)
    populateForm(student)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingStudent(null)
    resetForm()
  }

  const handleSave = async () => {
    if (!formName.trim() || !formClassId) {
      toast.error(t('errors.required_field'))
      return
    }

    setSaving(true)
    try {
      const isEdit = !!editingStudent
      const method = isEdit ? 'PUT' : 'POST'

      const body: Record<string, unknown> = {
        schoolId,
        name: formName.trim(),
        email: formEmail.trim() || null,
        phone: formPhone.trim() || null,
        matricule: formMatricule.trim() || null,
        sex: formSex || null,
        birthDate: formBirthDate || null,
        classId: formClassId,
      }

      if (isEdit) {
        body.id = editingStudent.id
      }

      const res = await fetch('/api/students', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        toast.error(t('errors.save_failed'))
        return
      }

      toast.success(isEdit ? t('students.student_updated') : t('students.student_added'))
      closeModal()
      await fetchStudents()
    } catch {
      toast.error(t('errors.save_failed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/students?id=${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        toast.error(t('errors.save_failed'))
        return
      }
      toast.success(t('students.student_deleted'))
      setDeleteTarget(null)
      await fetchStudents()
    } catch {
      toast.error(t('errors.save_failed'))
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !schoolId) return

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('schoolId', schoolId)
      formData.append('type', 'students')

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        toast.error(t('errors.save_failed'))
        return
      }

      toast.success(t('students.student_added'))
      await fetchStudents()
    } catch {
      toast.error(t('errors.save_failed'))
    } finally {
      setImporting(false)
      // Reset file input so the same file can be re-selected
      if (importInputRef.current) {
        importInputRef.current.value = ''
      }
    }
  }

  const handleExport = () => {
    if (!schoolId) return
    triggerExport({ type: 'students', schoolId })
  }

  /* ---------------------------------------------------------------- */
  /*  Filtering                                                        */
  /* ---------------------------------------------------------------- */

  const filtered = students.filter((student) => {
    const q = search.toLowerCase()
    const matchesSearch =
      student.name.toLowerCase().includes(q) ||
      (student.matricule?.toLowerCase().includes(q) ?? false) ||
      (student.email?.toLowerCase().includes(q) ?? false)
    const matchesClass = !classFilter || student.classId === classFilter
    return matchesSearch && matchesClass
  })

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {t('students.title')}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download size={14} />
            {t('students.export')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            loading={importing}
            onClick={() => importInputRef.current?.click()}
          >
            <Upload size={14} />
            {t('students.import')}
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv"
            onChange={handleImport}
            className="hidden"
          />
          <Button variant="primary" size="md" onClick={openCreate}>
            <Plus size={16} />
            {t('students.add_student')}
          </Button>
        </div>
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

        {/* Class filter pills */}
        {classes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <FilterPill
              label={t('app.filter')}
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
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <Skeleton className="mt-4 h-2 w-full rounded-full" />
              <div className="mt-3 flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <div className="rounded-xl border border-border-subtle bg-bg-card p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <GraduationCap className="mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">
              {search || classFilter
                ? `${t('app.search')} — 0 results`
                : t('students.no_students')}
            </p>
            {!search && !classFilter && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={openCreate}
              >
                <Plus size={14} />
                {t('students.add_student')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Student Cards Grid */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((student) => (
            <div
              key={student.id}
              className="rounded-xl border border-border-subtle bg-bg-card p-4 transition hover:border-border-default"
            >
              {/* Top section: avatar + info + actions */}
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                  {getInitials(student.name)}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {student.name}
                  </p>
                  {student.email && (
                    <p className="truncate text-xs text-text-muted">
                      {student.email}
                    </p>
                  )}
                  {student.phone && (
                    <p className="truncate text-xs text-text-muted">
                      {student.phone}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(student)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-surface hover:text-text-primary transition"
                    aria-label={t('students.edit_student')}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(student)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-danger-dim hover:text-danger transition"
                    aria-label={t('app.delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Bottom section: badges */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {/* Class badge */}
                <Badge variant="default" size="sm">
                  {student.class.grade
                    ? `${student.class.name} (${student.class.grade})`
                    : student.class.name}
                </Badge>

                {/* Matricule badge */}
                {student.matricule && (
                  <Badge variant="warning" size="sm">
                    {student.matricule}
                  </Badge>
                )}

                {/* Sex badge */}
                {student.sex === 'M' && (
                  <Badge variant="info" size="sm">
                    {t('students.sex_male')}
                  </Badge>
                )}
                {student.sex === 'F' && (
                  <Badge variant="accent" size="sm">
                    {t('students.sex_female')}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingStudent ? t('students.edit_student') : t('students.add_student')}
        size="md"
      >
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('students.name')} *
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              placeholder={t('students.name')}
            />
          </div>

          {/* Class */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('students.class')} *
            </label>
            <select
              value={formClassId}
              onChange={(e) => setFormClassId(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="">{t('students.class')}</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.grade ? `${cls.name} (${cls.grade})` : cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('students.email')}
            </label>
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              placeholder={t('students.email')}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('students.phone')}
            </label>
            <input
              type="tel"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              placeholder={t('students.phone')}
            />
          </div>

          {/* Matricule */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('students.matricule')}
            </label>
            <input
              type="text"
              value={formMatricule}
              onChange={(e) => setFormMatricule(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              placeholder={t('students.matricule')}
            />
          </div>

          {/* Sex + Birth Date — two columns */}
          <div className="grid grid-cols-2 gap-4">
            {/* Sex */}
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                {t('students.sex')}
              </label>
              <select
                value={formSex}
                onChange={(e) => setFormSex(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="">{t('students.sex')}</option>
                <option value="M">{t('students.sex_male')}</option>
                <option value="F">{t('students.sex_female')}</option>
              </select>
            </div>

            {/* Birth Date */}
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                {t('students.birth_date')}
              </label>
              <input
                type="date"
                value={formBirthDate}
                onChange={(e) => setFormBirthDate(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={closeModal}
            >
              {t('app.cancel')}
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              loading={saving}
              onClick={handleSave}
            >
              {t('app.save')}
            </Button>
          </div>
        </div>
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
              {deleteTarget.name}
              {deleteTarget.matricule && (
                <span className="text-text-muted"> &mdash; {deleteTarget.matricule}</span>
              )}
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
