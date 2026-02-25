'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Plus, Search, Users, Download, Upload } from 'lucide-react'
import { useUserStore } from '@/store/userStore'
import { Button } from '@/components/ui/Button'
import { FilterPill } from '@/components/ui/FilterPill'
import { Skeleton } from '@/components/ui/Skeleton'
import { TeacherCard, type TeacherData } from '@/components/teachers/TeacherCard'
import { TeacherModal, type TeacherFormData } from '@/components/teachers/TeacherModal'
import { useToast } from '@/components/ui/Toast'
import { ImportModal } from '@/components/ui/ImportModal'
import { triggerExport } from '@/lib/export-helpers'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SubjectOption {
  id: string
  name: string
  nameAr?: string | null
  nameFr?: string | null
  colorHex: string
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function TeachersPage() {
  const t = useTranslations()
  const locale = useLocale()
  const toast = useToast()
  const user = useUserStore((s) => s.user)
  const schoolId = user?.schoolId

  // Data state
  const [teachers, setTeachers] = useState<TeacherData[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<TeacherData | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TeacherData | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)

  /* ---------------------------------------------------------------- */
  /*  Data Fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchTeachers = useCallback(async () => {
    if (!schoolId) return
    try {
      const res = await fetch(`/api/teachers?schoolId=${schoolId}`)
      if (res.ok) {
        const data = await res.json()
        setTeachers(data)
      }
    } catch {
      toast.error(t('app.error'))
    }
  }, [schoolId, t, toast])
  // toast is now stable via useMemo in useToast()

  const fetchSubjects = useCallback(async () => {
    if (!schoolId) return
    try {
      const res = await fetch(`/api/subjects?schoolId=${schoolId}`)
      if (res.ok) {
        const data = await res.json()
        setSubjects(data)
      }
    } catch {
      // silent
    }
  }, [schoolId])

  useEffect(() => {
    if (!schoolId) return
    setLoading(true)
    Promise.all([fetchTeachers(), fetchSubjects()]).finally(() =>
      setLoading(false)
    )
  }, [schoolId, fetchTeachers, fetchSubjects])

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  const handleSave = async (data: TeacherFormData) => {
    const isEdit = !!data.id
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch('/api/teachers', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      toast.error(t('errors.save_failed'))
      throw new Error('Save failed')
    }

    toast.success(isEdit ? t('teachers.edit') : t('teachers.add'))
    await fetchTeachers()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/teachers?id=${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        toast.error(t('errors.save_failed'))
        return
      }
      toast.success(t('app.delete'))
      setDeleteTarget(null)
      await fetchTeachers()
    } catch {
      toast.error(t('errors.save_failed'))
    }
  }

  const openCreate = () => {
    setEditingTeacher(null)
    setModalOpen(true)
  }

  const openEdit = (teacher: TeacherData) => {
    setEditingTeacher(teacher)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingTeacher(null)
  }

  /* ---------------------------------------------------------------- */
  /*  Filtering                                                        */
  /* ---------------------------------------------------------------- */

  const filtered = teachers.filter((teacher) => {
    const matchesSearch = teacher.name
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchesSubject =
      !subjectFilter ||
      teacher.subjects.some((ts) => ts.subjectId === subjectFilter)
    return matchesSearch && matchesSubject
  })

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {t('teachers.title')}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => triggerExport({ type: 'teachers', schoolId: schoolId! })}>
            <Download size={14} />
            {t('app.export')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowImportModal(true)}>
            <Upload size={14} />
            {t('app.import')}
          </Button>
          <Button variant="primary" size="md" onClick={openCreate}>
            <Plus size={16} />
            {t('teachers.add')}
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

        {/* Subject filter pills */}
        {subjects.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <FilterPill
              label={t('app.filter')}
              active={subjectFilter === null}
              onClick={() => setSubjectFilter(null)}
            />
            {subjects.map((subject) => (
              <FilterPill
                key={subject.id}
                label={(locale === 'ar' && subject.nameAr) ? subject.nameAr : (locale === 'fr' && subject.nameFr) ? subject.nameFr : subject.name}
                active={subjectFilter === subject.id}
                onClick={() =>
                  setSubjectFilter(
                    subjectFilter === subject.id ? null : subject.id
                  )
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
              <Skeleton className="mt-3 h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <div className="rounded-xl border border-border-subtle bg-bg-card p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Users className="mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">
              {search || subjectFilter
                ? `${t('app.search')} — 0 results`
                : t('teachers.title')}
            </p>
            {!search && !subjectFilter && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={openCreate}
              >
                <Plus size={14} />
                {t('teachers.add')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Teacher Grid */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((teacher) => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Teacher Modal (Add / Edit) */}
      <TeacherModal
        isOpen={modalOpen}
        onClose={closeModal}
        teacher={editingTeacher}
        subjects={subjects}
        schoolId={schoolId ?? ''}
        onSave={handleSave}
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
              {deleteTarget.name}
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

      {/* Import Modal */}
      <ImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        type="teachers"
        schoolId={schoolId!}
        onComplete={fetchTeachers}
      />
    </div>
  )
}
