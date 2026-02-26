'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Plus, Database, Pencil, Trash2, Download, Upload, Loader2 } from 'lucide-react'
import { useUserStore } from '@/store/userStore'
import { getLocalizedName } from '@/lib/locale-name'
import { Button } from '@/components/ui/Button'
import { FilterPill } from '@/components/ui/FilterPill'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { ImportModal } from '@/components/ui/ImportModal'
import { triggerExport } from '@/lib/export-helpers'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Tab = 'classes' | 'rooms' | 'subjects'

interface GradeData {
  id: string
  name: string
  nameAr?: string | null
  nameFr?: string | null
  level: number
}

interface ClassData {
  id: string
  name: string
  gradeId: string | null
  grade?: GradeData | null
  capacity: number
  colorHex: string
}

interface RoomData {
  id: string
  name: string
  building: string | null
  capacity: number
  type: string
}

interface SubjectData {
  id: string
  name: string
  nameAr: string | null
  nameFr: string | null
  colorHex: string
  category: string
  pedagogicDay: number
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const COLOR_PRESETS = [
  '#4f6ef7',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  '#ec4899',
]

const ROOM_TYPES = [
  'CLASSROOM',
  'LAB_SCIENCE',
  'LAB_COMPUTER',
  'LAB_ENGINEERING',
  'LAB_CHEMISTRY',
  'LAB_BIOLOGY',
  'LAB_PHYSICS',
  'LAB',
  'GYM',
  'LIBRARY',
  'AUDITORIUM',
  'ART_STUDIO',
  'OTHER',
] as const

const SUBJECT_CATEGORIES = [
  'CORE',
  'MATH',
  'LANGUAGE',
  'SCIENCE',
  'HUMANITIES',
  'RELIGION',
  'PE',
  'TECH',
  'ARTS',
  'SPORTS',
  'ELECTIVE',
  'OTHER',
] as const

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function ResourcesPage() {
  const t = useTranslations()
  const toast = useToast()
  const user = useUserStore((s) => s.user)
  const schoolId = user?.schoolId

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('classes')

  // Data state
  const [classes, setClasses] = useState<ClassData[]>([])
  const [rooms, setRooms] = useState<RoomData[]>([])
  const [subjects, setSubjects] = useState<SubjectData[]>([])
  const [grades, setGrades] = useState<GradeData[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ClassData | RoomData | SubjectData | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; tab: Tab } | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)

  // Tunisian subjects reference loading
  const locale = useLocale()
  interface TunisianSubjectRef {
    id: string; code: string; nameAr: string; nameFr: string | null; nameEn: string | null
    sessionTypeCode: number; sessionType: { code: number; nameAr: string; nameFr: string | null; nameEn: string | null }
  }
  const [showTunisianSubjectsModal, setShowTunisianSubjectsModal] = useState(false)
  const [tunisianSubjects, setTunisianSubjects] = useState<TunisianSubjectRef[]>([])
  const [tunisianSessionTypes, setTunisianSessionTypes] = useState<{ code: number; nameAr: string; nameFr: string | null; nameEn: string | null }[]>([])
  const [selectedTunisianSubjects, setSelectedTunisianSubjects] = useState<Set<string>>(new Set())
  const [tunisianSubjectsLoading, setTunisianSubjectsLoading] = useState(false)
  const [tunisianSubjectsImporting, setTunisianSubjectsImporting] = useState(false)

  /* ---------------------------------------------------------------- */
  /*  Data Fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchClasses = useCallback(async () => {
    if (!schoolId) return
    try {
      const res = await fetch(`/api/classes?schoolId=${schoolId}`)
      if (res.ok) {
        const data = await res.json()
        setClasses(data)
      }
    } catch {
      toast.error(t('app.error'))
    }
  }, [schoolId, t, toast])

  const fetchRooms = useCallback(async () => {
    if (!schoolId) return
    try {
      const res = await fetch(`/api/rooms?schoolId=${schoolId}`)
      if (res.ok) {
        const data = await res.json()
        setRooms(data)
      }
    } catch {
      toast.error(t('app.error'))
    }
  }, [schoolId, t, toast])

  const fetchSubjects = useCallback(async () => {
    if (!schoolId) return
    try {
      const res = await fetch(`/api/subjects?schoolId=${schoolId}`)
      if (res.ok) {
        const data = await res.json()
        setSubjects(data)
      }
    } catch {
      toast.error(t('app.error'))
    }
  }, [schoolId, t, toast])

  const fetchGrades = useCallback(async () => {
    if (!schoolId) return
    try {
      const res = await fetch(`/api/grades?schoolId=${schoolId}`)
      if (res.ok) {
        const data = await res.json()
        setGrades(data.map((g: GradeData) => ({ id: g.id, name: g.name, nameAr: g.nameAr, nameFr: g.nameFr, level: g.level })))
      }
    } catch { /* silent */ }
  }, [schoolId])

  useEffect(() => {
    if (!schoolId) return
    setLoading(true)
    Promise.all([fetchClasses(), fetchRooms(), fetchSubjects(), fetchGrades()]).finally(() =>
      setLoading(false)
    )
  }, [schoolId, fetchClasses, fetchRooms, fetchSubjects, fetchGrades])

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */

  const roomTypeLabel = (type: string) => {
    const key = `resources.type_${type.toLowerCase()}` as const
    return t(key)
  }

  const categoryLabel = (cat: string) => {
    const key = `resources.cat_${cat.toLowerCase()}` as const
    return t(key)
  }

  /* ---------------------------------------------------------------- */
  /*  CRUD Handlers                                                    */
  /* ---------------------------------------------------------------- */

  const handleSaveClass = async (data: Partial<ClassData>) => {
    const isEdit = !!data.id
    const method = isEdit ? 'PUT' : 'POST'
    const { grade: _grade, ...rest } = data
    const res = await fetch('/api/classes', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rest, schoolId }),
    })
    if (!res.ok) {
      toast.error(t('errors.save_failed'))
      return
    }
    toast.success(isEdit ? t('resources.edit_class') : t('resources.add_class'))
    await fetchClasses()
  }

  const handleSaveRoom = async (data: Partial<RoomData>) => {
    const isEdit = !!data.id
    const method = isEdit ? 'PUT' : 'POST'
    const res = await fetch('/api/rooms', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, schoolId }),
    })
    if (!res.ok) {
      toast.error(t('errors.save_failed'))
      return
    }
    toast.success(isEdit ? t('resources.edit_room') : t('resources.add_room'))
    await fetchRooms()
  }

  const handleSaveSubject = async (data: Partial<SubjectData>) => {
    const isEdit = !!data.id
    const method = isEdit ? 'PUT' : 'POST'
    const res = await fetch('/api/subjects', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, schoolId }),
    })
    if (!res.ok) {
      toast.error(t('errors.save_failed'))
      return
    }
    toast.success(isEdit ? t('resources.edit_subject') : t('resources.add_subject'))
    await fetchSubjects()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const endpoint = `/api/${deleteTarget.tab}?id=${deleteTarget.id}`
      const res = await fetch(endpoint, { method: 'DELETE' })
      if (!res.ok) {
        toast.error(t('errors.save_failed'))
        return
      }
      toast.success(t('app.delete'))
      setDeleteTarget(null)
      if (deleteTarget.tab === 'classes') await fetchClasses()
      else if (deleteTarget.tab === 'rooms') await fetchRooms()
      else await fetchSubjects()
    } catch {
      toast.error(t('errors.save_failed'))
    }
  }

  const openCreate = () => {
    setEditingItem(null)
    setModalOpen(true)
  }

  const openEdit = (item: ClassData | RoomData | SubjectData) => {
    setEditingItem(item)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingItem(null)
  }

  /* ---------------------------------------------------------------- */
  /*  Tunisian Subjects Reference                                      */
  /* ---------------------------------------------------------------- */

  const getLocaleName = (row: { name?: string; nameAr?: string | null; nameFr?: string | null; nameEn?: string | null }) => {
    if (locale === 'ar' && row.nameAr) return row.nameAr
    if (locale === 'fr' && row.nameFr) return row.nameFr
    if (locale === 'en' && row.nameEn) return row.nameEn
    return row.name || row.nameAr || ''
  }

  const openTunisianSubjectsModal = async () => {
    setShowTunisianSubjectsModal(true)
    setSelectedTunisianSubjects(new Set())
    setTunisianSubjectsLoading(true)
    try {
      const res = await fetch('/api/reference/tunisian')
      if (res.ok) {
        const data = await res.json()
        setTunisianSubjects(data.subjects || [])
        setTunisianSessionTypes(data.sessionTypes || [])
      }
    } catch { /* silent */ }
    finally { setTunisianSubjectsLoading(false) }
  }

  const handleImportTunisianSubjects = async () => {
    if (!schoolId || selectedTunisianSubjects.size === 0) return
    setTunisianSubjectsImporting(true)
    try {
      const items = tunisianSubjects
        .filter(s => selectedTunisianSubjects.has(s.code))
        .map(s => ({ code: s.code, nameAr: s.nameAr, nameFr: s.nameFr, nameEn: s.nameEn, sessionTypeCode: s.sessionTypeCode }))
      const res = await fetch('/api/reference/tunisian/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'subjects', schoolId, items }),
      })
      if (res.ok) {
        const { created, skipped } = await res.json()
        toast.success(t('resources.subjects_loaded', { created, skipped }))
        setShowTunisianSubjectsModal(false)
        fetchSubjects()
      } else {
        toast.error('Failed to import subjects')
      }
    } catch { toast.error('Failed to import subjects') }
    finally { setTunisianSubjectsImporting(false) }
  }

  const subjectAlreadyExists = (s: TunisianSubjectRef) =>
    subjects.some(es => es.nameAr?.toLowerCase() === s.nameAr.toLowerCase() || es.name.toLowerCase() === (s.nameFr || s.nameAr).toLowerCase())

  /* ---------------------------------------------------------------- */
  /*  Add button label                                                 */
  /* ---------------------------------------------------------------- */

  const addLabel =
    activeTab === 'classes'
      ? t('resources.add_class')
      : activeTab === 'rooms'
        ? t('resources.add_room')
        : t('resources.add_subject')

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {t('resources.title')}
        </h1>
        <div className="flex items-center gap-2">
          {activeTab === 'subjects' && (
            <Button variant="ghost" size="sm" onClick={openTunisianSubjectsModal}>
              <Database size={14} />
              {t('resources.load_official_subjects')}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => triggerExport({ type: activeTab, schoolId: schoolId! })}>
            <Download size={14} />
            {t('app.export')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowImportModal(true)}>
            <Upload size={14} />
            {t('app.import')}
          </Button>
          <Button variant="primary" size="md" onClick={openCreate}>
            <Plus size={16} />
            {addLabel}
          </Button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterPill
          label={t('resources.tab_classes')}
          active={activeTab === 'classes'}
          onClick={() => setActiveTab('classes')}
        />
        <FilterPill
          label={t('resources.tab_rooms')}
          active={activeTab === 'rooms'}
          onClick={() => setActiveTab('rooms')}
        />
        <FilterPill
          label={t('resources.tab_subjects')}
          active={activeTab === 'subjects'}
          onClick={() => setActiveTab('subjects')}
        />
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : activeTab === 'classes' ? (
        <ClassesTable
          classes={classes}
          onEdit={openEdit}
          onDelete={(c) => setDeleteTarget({ id: c.id, name: c.name, tab: 'classes' })}
          t={t}
          openCreate={openCreate}
          locale={locale}
        />
      ) : activeTab === 'rooms' ? (
        <RoomsTable
          rooms={rooms}
          onEdit={openEdit}
          onDelete={(r) => setDeleteTarget({ id: r.id, name: r.name, tab: 'rooms' })}
          roomTypeLabel={roomTypeLabel}
          t={t}
          openCreate={openCreate}
        />
      ) : (
        <SubjectsTable
          subjects={subjects}
          onEdit={openEdit}
          onDelete={(s) => setDeleteTarget({ id: s.id, name: s.name, tab: 'subjects' })}
          categoryLabel={categoryLabel}
          t={t}
          openCreate={openCreate}
          locale={locale}
        />
      )}

      {/* Add / Edit Modal */}
      {activeTab === 'classes' && (
        <ClassModal
          isOpen={modalOpen}
          onClose={closeModal}
          item={editingItem as ClassData | null}
          onSave={handleSaveClass}
          grades={grades}
          t={t}
          locale={locale}
        />
      )}
      {activeTab === 'rooms' && (
        <RoomModal
          isOpen={modalOpen}
          onClose={closeModal}
          item={editingItem as RoomData | null}
          onSave={handleSaveRoom}
          roomTypeLabel={roomTypeLabel}
          t={t}
        />
      )}
      {activeTab === 'subjects' && (
        <SubjectModal
          isOpen={modalOpen}
          onClose={closeModal}
          item={editingItem as SubjectData | null}
          onSave={handleSaveSubject}
          categoryLabel={categoryLabel}
          t={t}
        />
      )}

      {/* Import Modal */}
      <ImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        type={activeTab}
        schoolId={schoolId!}
        onComplete={() => {
          if (activeTab === 'classes') fetchClasses()
          else if (activeTab === 'rooms') fetchRooms()
          else fetchSubjects()
        }}
      />

      {/* Tunisian Subjects Modal */}
      <Modal
        open={showTunisianSubjectsModal}
        onClose={() => setShowTunisianSubjectsModal(false)}
        title={t('resources.load_official_subjects')}
        size="lg"
      >
        <div className="pt-2">
          <p className="text-sm text-text-muted mb-4">{t('resources.load_official_subjects_desc')}</p>

          {tunisianSubjectsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : (
            <>
              {/* Select All / Deselect All */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-text-muted">
                  {selectedTunisianSubjects.size} selected
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const available = tunisianSubjects.filter(s => !subjectAlreadyExists(s))
                    if (selectedTunisianSubjects.size === available.length) {
                      setSelectedTunisianSubjects(new Set())
                    } else {
                      setSelectedTunisianSubjects(new Set(available.map(s => s.code)))
                    }
                  }}
                  className="text-xs font-medium text-accent hover:text-accent-hover transition"
                >
                  {selectedTunisianSubjects.size > 0 ? t('settings.deselect_all') : t('settings.select_all')}
                </button>
              </div>

              {/* Subjects grouped by session type */}
              <div className="max-h-[50vh] overflow-y-auto space-y-4 rounded-lg border border-border-subtle p-3">
                {tunisianSessionTypes.map(st => {
                  const groupSubjects = tunisianSubjects.filter(s => s.sessionTypeCode === st.code)
                  if (groupSubjects.length === 0) return null
                  return (
                    <div key={st.code}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                          {getLocaleName(st)}
                        </span>
                        <span className="text-[10px] text-text-muted">({groupSubjects.length})</span>
                      </div>
                      <div className="space-y-1">
                        {groupSubjects.map(s => {
                          const alreadyExists = subjectAlreadyExists(s)
                          const isSelected = selectedTunisianSubjects.has(s.code)
                          return (
                            <button
                              key={s.code}
                              type="button"
                              disabled={alreadyExists}
                              onClick={() => {
                                setSelectedTunisianSubjects(prev => {
                                  const next = new Set(prev)
                                  if (next.has(s.code)) next.delete(s.code)
                                  else next.add(s.code)
                                  return next
                                })
                              }}
                              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start transition ${
                                alreadyExists
                                  ? 'opacity-50 cursor-not-allowed'
                                  : isSelected
                                    ? 'bg-accent/10 border border-accent/30'
                                    : 'hover:bg-bg-surface2 border border-transparent'
                              }`}
                            >
                              <div className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center ${
                                alreadyExists
                                  ? 'border-border-default bg-bg-surface'
                                  : isSelected
                                    ? 'border-accent bg-accent'
                                    : 'border-border-default bg-bg-surface'
                              }`}>
                                {(isSelected || alreadyExists) && <span className="text-[10px] text-white font-bold">✓</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-primary truncate">{getLocaleName(s)}</p>
                                {locale !== 'ar' && (
                                  <p className="text-xs text-text-muted truncate">{s.nameAr}</p>
                                )}
                              </div>
                              {alreadyExists && (
                                <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">{t('settings.already_added')}</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" size="md" onClick={() => setShowTunisianSubjectsModal(false)}>
                  {t('app.cancel')}
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleImportTunisianSubjects}
                  disabled={selectedTunisianSubjects.size === 0 || tunisianSubjectsImporting}
                >
                  {tunisianSubjectsImporting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('settings.load_selected', { count: selectedTunisianSubjects.size })}
                </Button>
              </div>
            </>
          )}
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

/* ================================================================== */
/*  Loading Skeleton                                                    */
/* ================================================================== */

function LoadingSkeleton() {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card p-4">
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Classes Table                                                       */
/* ================================================================== */

function ClassesTable({
  classes,
  onEdit,
  onDelete,
  t,
  openCreate,
  locale,
}: {
  classes: ClassData[]
  onEdit: (c: ClassData) => void
  onDelete: (c: ClassData) => void
  t: ReturnType<typeof useTranslations>
  openCreate: () => void
  locale: string
}) {
  if (classes.length === 0) {
    return (
      <EmptyState
        label={t('resources.empty_classes')}
        addLabel={t('resources.add_class')}
        openCreate={openCreate}
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle">
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              {t('resources.name')}
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              {t('resources.grade')}
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              {t('resources.capacity')}
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              {t('resources.color')}
            </th>
            <th className="px-4 py-3 text-right font-medium text-text-secondary">
              {/* Actions */}
            </th>
          </tr>
        </thead>
        <tbody>
          {classes.map((cls) => (
            <tr
              key={cls.id}
              className="border-b border-border-subtle last:border-b-0 transition-colors hover:bg-bg-surface"
            >
              <td className="px-4 py-3 font-medium text-text-primary">
                {cls.name}
              </td>
              <td className="px-4 py-3 text-text-secondary">
                {cls.grade ? getLocalizedName(cls.grade, locale) : '—'}
              </td>
              <td className="px-4 py-3 text-text-secondary">{cls.capacity}</td>
              <td className="px-4 py-3">
                <span
                  className="inline-block h-5 w-5 rounded-full border border-border-subtle"
                  style={{ backgroundColor: cls.colorHex }}
                />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEdit(cls)}
                    className="rounded-md p-1.5 text-text-muted hover:bg-bg-surface hover:text-text-primary transition-colors"
                    aria-label={t('app.edit')}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => onDelete(cls)}
                    className="rounded-md p-1.5 text-text-muted hover:bg-danger-dim hover:text-danger transition-colors"
                    aria-label={t('app.delete')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ================================================================== */
/*  Rooms Table                                                         */
/* ================================================================== */

function RoomsTable({
  rooms,
  onEdit,
  onDelete,
  roomTypeLabel,
  t,
  openCreate,
}: {
  rooms: RoomData[]
  onEdit: (r: RoomData) => void
  onDelete: (r: RoomData) => void
  roomTypeLabel: (type: string) => string
  t: ReturnType<typeof useTranslations>
  openCreate: () => void
}) {
  if (rooms.length === 0) {
    return (
      <EmptyState
        label={t('resources.empty_rooms')}
        addLabel={t('resources.add_room')}
        openCreate={openCreate}
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle">
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              {t('resources.name')}
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              {t('resources.building')}
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              {t('resources.capacity')}
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              {t('resources.type')}
            </th>
            <th className="px-4 py-3 text-right font-medium text-text-secondary">
              {/* Actions */}
            </th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr
              key={room.id}
              className="border-b border-border-subtle last:border-b-0 transition-colors hover:bg-bg-surface"
            >
              <td className="px-4 py-3 font-medium text-text-primary">
                {room.name}
              </td>
              <td className="px-4 py-3 text-text-secondary">
                {room.building || '—'}
              </td>
              <td className="px-4 py-3 text-text-secondary">
                {room.capacity}
              </td>
              <td className="px-4 py-3">
                <Badge variant="default" size="sm">
                  {roomTypeLabel(room.type)}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEdit(room)}
                    className="rounded-md p-1.5 text-text-muted hover:bg-bg-surface hover:text-text-primary transition-colors"
                    aria-label={t('app.edit')}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => onDelete(room)}
                    className="rounded-md p-1.5 text-text-muted hover:bg-danger-dim hover:text-danger transition-colors"
                    aria-label={t('app.delete')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ================================================================== */
/*  Subjects Table                                                      */
/* ================================================================== */

function SubjectsTable({
  subjects,
  onEdit,
  onDelete,
  categoryLabel,
  t,
  openCreate,
  locale,
}: {
  subjects: SubjectData[]
  onEdit: (s: SubjectData) => void
  onDelete: (s: SubjectData) => void
  categoryLabel: (cat: string) => string
  t: ReturnType<typeof useTranslations>
  openCreate: () => void
  locale: string
}) {
  if (subjects.length === 0) {
    return (
      <EmptyState
        label={t('resources.empty_subjects')}
        addLabel={t('resources.add_subject')}
        openCreate={openCreate}
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle">
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              {t('resources.name')}
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              {t('resources.color')}
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              {t('resources.category')}
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              {t('resources.pedagogic_day')}
            </th>
            <th className="px-4 py-3 text-right font-medium text-text-secondary">
              {/* Actions */}
            </th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subj) => (
            <tr
              key={subj.id}
              className="border-b border-border-subtle last:border-b-0 transition-colors hover:bg-bg-surface"
            >
              <td className="px-4 py-3 font-medium text-text-primary">
                {getLocalizedName(subj, locale)}
              </td>
              <td className="px-4 py-3">
                <span
                  className="inline-block h-5 w-5 rounded-full border border-border-subtle"
                  style={{ backgroundColor: subj.colorHex }}
                />
              </td>
              <td className="px-4 py-3">
                <Badge variant="default" size="sm">
                  {categoryLabel(subj.category)}
                </Badge>
              </td>
              <td className="px-4 py-3 text-text-muted text-xs">
                {subj.pedagogicDay > 0
                  ? t(`resources.pedagogic_day_${['mon', 'tue', 'wed', 'thu', 'fri', 'sat'][subj.pedagogicDay - 1]}`)
                  : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEdit(subj)}
                    className="rounded-md p-1.5 text-text-muted hover:bg-bg-surface hover:text-text-primary transition-colors"
                    aria-label={t('app.edit')}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => onDelete(subj)}
                    className="rounded-md p-1.5 text-text-muted hover:bg-danger-dim hover:text-danger transition-colors"
                    aria-label={t('app.delete')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ================================================================== */
/*  Empty State                                                         */
/* ================================================================== */

function EmptyState({
  label,
  addLabel,
  openCreate,
}: {
  label: string
  addLabel: string
  openCreate: () => void
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card p-12">
      <div className="flex flex-col items-center justify-center text-center">
        <Database className="mb-3 h-10 w-10 text-text-muted" />
        <p className="text-sm text-text-muted">{label}</p>
        <Button
          variant="primary"
          size="sm"
          className="mt-4"
          onClick={openCreate}
        >
          <Plus size={14} />
          {addLabel}
        </Button>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Class Modal                                                         */
/* ================================================================== */

function ClassModal({
  isOpen,
  onClose,
  item,
  onSave,
  grades,
  t,
  locale,
}: {
  isOpen: boolean
  onClose: () => void
  item: ClassData | null
  onSave: (data: Partial<ClassData>) => Promise<void>
  grades: GradeData[]
  t: ReturnType<typeof useTranslations>
  locale: string
}) {
  const isEdit = !!item

  const [name, setName] = useState('')
  const [gradeId, setGradeId] = useState('')
  const [capacity, setCapacity] = useState(30)
  const [colorHex, setColorHex] = useState(COLOR_PRESETS[0])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (item) {
      setName(item.name)
      setGradeId(item.gradeId ?? '')
      setCapacity(item.capacity)
      setColorHex(item.colorHex)
    } else {
      setName('')
      setGradeId('')
      setCapacity(30)
      setColorHex(COLOR_PRESETS[0])
    }
  }, [item, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        id: item?.id,
        name: name.trim(),
        gradeId: gradeId || null,
        capacity,
        colorHex,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isEdit ? t('resources.edit_class') : t('resources.add_class')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('resources.name')} *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            placeholder={t('resources.name')}
          />
        </div>

        {/* Grade */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('resources.grade')}
          </label>
          <select
            value={gradeId}
            onChange={(e) => setGradeId(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="">— {t('app.optional')} —</option>
            {grades.map(g => (
              <option key={g.id} value={g.id}>{getLocalizedName(g, locale)}</option>
            ))}
          </select>
        </div>

        {/* Capacity */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('resources.capacity')}
          </label>
          <input
            type="number"
            min={1}
            max={500}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>

        {/* Color Picker */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('resources.color')}
          </label>
          <div className="flex gap-2">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setColorHex(color)}
                className={`h-8 w-8 rounded-full border-2 transition ${
                  colorHex === color
                    ? 'border-text-primary scale-110'
                    : 'border-transparent hover:border-border-default'
                }`}
                style={{ backgroundColor: color }}
                aria-label={color}
              />
            ))}
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={saving}
          className="w-full"
        >
          {isEdit ? t('app.save') : t('resources.add_class')}
        </Button>
      </form>
    </Modal>
  )
}

/* ================================================================== */
/*  Room Modal                                                          */
/* ================================================================== */

function RoomModal({
  isOpen,
  onClose,
  item,
  onSave,
  roomTypeLabel,
  t,
}: {
  isOpen: boolean
  onClose: () => void
  item: RoomData | null
  onSave: (data: Partial<RoomData>) => Promise<void>
  roomTypeLabel: (type: string) => string
  t: ReturnType<typeof useTranslations>
}) {
  const isEdit = !!item

  const [name, setName] = useState('')
  const [building, setBuilding] = useState('')
  const [capacity, setCapacity] = useState(30)
  const [type, setType] = useState<string>('CLASSROOM')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (item) {
      setName(item.name)
      setBuilding(item.building ?? '')
      setCapacity(item.capacity)
      setType(item.type)
    } else {
      setName('')
      setBuilding('')
      setCapacity(30)
      setType('CLASSROOM')
    }
  }, [item, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        id: item?.id,
        name: name.trim(),
        building: building.trim() || null,
        capacity,
        type,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isEdit ? t('resources.edit_room') : t('resources.add_room')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('resources.name')} *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            placeholder={t('resources.name')}
          />
        </div>

        {/* Building */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('resources.building')}
          </label>
          <input
            type="text"
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            placeholder={t('resources.building')}
          />
        </div>

        {/* Capacity */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('resources.capacity')}
          </label>
          <input
            type="number"
            min={1}
            max={500}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>

        {/* Type */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('resources.type')}
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            {ROOM_TYPES.map((rt) => (
              <option key={rt} value={rt}>
                {roomTypeLabel(rt)}
              </option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={saving}
          className="w-full"
        >
          {isEdit ? t('app.save') : t('resources.add_room')}
        </Button>
      </form>
    </Modal>
  )
}

/* ================================================================== */
/*  Subject Modal                                                       */
/* ================================================================== */

function SubjectModal({
  isOpen,
  onClose,
  item,
  onSave,
  categoryLabel,
  t,
}: {
  isOpen: boolean
  onClose: () => void
  item: SubjectData | null
  onSave: (data: Partial<SubjectData>) => Promise<void>
  categoryLabel: (cat: string) => string
  t: ReturnType<typeof useTranslations>
}) {
  const isEdit = !!item

  const [name, setName] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [nameFr, setNameFr] = useState('')
  const [colorHex, setColorHex] = useState(COLOR_PRESETS[0])
  const [category, setCategory] = useState<string>('OTHER')
  const [pedagogicDay, setPedagogicDay] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (item) {
      setName(item.name)
      setNameAr(item.nameAr ?? '')
      setNameFr(item.nameFr ?? '')
      setColorHex(item.colorHex)
      setCategory(item.category)
      setPedagogicDay(item.pedagogicDay ?? 0)
    } else {
      setName('')
      setNameAr('')
      setNameFr('')
      setColorHex(COLOR_PRESETS[0])
      setCategory('OTHER')
      setPedagogicDay(0)
    }
  }, [item, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        id: item?.id,
        name: name.trim(),
        nameAr: nameAr.trim() || null,
        nameFr: nameFr.trim() || null,
        colorHex,
        category,
        pedagogicDay,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isEdit ? t('resources.edit_subject') : t('resources.add_subject')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('resources.name')} *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            placeholder={t('resources.name')}
          />
        </div>

        {/* Name Arabic */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('resources.name_ar')}
          </label>
          <input
            type="text"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            dir="rtl"
            className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            placeholder={t('resources.name_ar')}
          />
        </div>

        {/* Name French */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('resources.name_fr')}
          </label>
          <input
            type="text"
            value={nameFr}
            onChange={(e) => setNameFr(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            placeholder={t('resources.name_fr')}
          />
        </div>

        {/* Color Picker */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('resources.color')}
          </label>
          <div className="flex gap-2">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setColorHex(color)}
                className={`h-8 w-8 rounded-full border-2 transition ${
                  colorHex === color
                    ? 'border-text-primary scale-110'
                    : 'border-transparent hover:border-border-default'
                }`}
                style={{ backgroundColor: color }}
                aria-label={color}
              />
            ))}
          </div>
        </div>

        {/* Category + Pedagogic Day */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('resources.category')}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              {SUBJECT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabel(cat)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('resources.pedagogic_day')}
            </label>
            <select
              value={pedagogicDay}
              onChange={(e) => setPedagogicDay(Number(e.target.value))}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value={0}>{t('resources.pedagogic_day_none')}</option>
              <option value={1}>{t('resources.pedagogic_day_mon')}</option>
              <option value={2}>{t('resources.pedagogic_day_tue')}</option>
              <option value={3}>{t('resources.pedagogic_day_wed')}</option>
              <option value={4}>{t('resources.pedagogic_day_thu')}</option>
              <option value={5}>{t('resources.pedagogic_day_fri')}</option>
              <option value={6}>{t('resources.pedagogic_day_sat')}</option>
            </select>
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={saving}
          className="w-full"
        >
          {isEdit ? t('app.save') : t('resources.add_subject')}
        </Button>
      </form>
    </Modal>
  )
}
