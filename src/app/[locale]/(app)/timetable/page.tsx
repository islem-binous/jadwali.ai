'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  CalendarDays,
  Upload,
  Download,
  Plus,
  LayoutGrid,
  User,
  DoorOpen,
  Trash2,
  Loader2,
} from 'lucide-react'
import { useUserStore } from '@/store/userStore'
import { isAdmin as checkIsAdmin } from '@/lib/permissions'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FilterPill } from '@/components/ui/FilterPill'
import { Skeleton } from '@/components/ui/Skeleton'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import {
  TimetableGrid,
  Lesson,
  Period,
} from '@/components/timetable/TimetableGrid'
import { ImportModal } from '@/components/ui/ImportModal'
import { triggerExport } from '@/lib/export-helpers'
import { HelpTooltip } from '@/components/ui/HelpTooltip'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Timetable {
  id: string
  name: string
  status: string
  isActive: boolean
  term?: { name: string } | null
}

interface ClassItem {
  id: string
  name: string
}

interface TeacherItem {
  id: string
  name: string
  subjects: { subjectId: string }[]
}

interface RoomItem {
  id: string
  name: string
}

interface SubjectItem {
  id: string
  name: string
  nameAr?: string | null
  nameFr?: string | null
  colorHex: string
}

type ViewMode = 'class' | 'teacher' | 'room'

const DAY_KEYS = ['day_mon', 'day_tue', 'day_wed', 'day_thu', 'day_fri', 'day_sat'] as const

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TimetablePage() {
  const t = useTranslations('timetable')
  const tApp = useTranslations('app')
  const tTooltips = useTranslations('tooltips')
  const locale = useLocale()
  const user = useUserStore((s) => s.user)
  const schoolId = user?.schoolId
  const toast = useToast()
  const adminUser = checkIsAdmin(user?.role || '')
  const readOnly = !adminUser

  const getLocaleName = (row: { name: string; nameAr?: string | null; nameFr?: string | null }) => {
    if (locale === 'ar' && row.nameAr) return row.nameAr
    if (locale === 'fr' && row.nameFr) return row.nameFr
    return row.name
  }

  /* ---------- State ---------- */
  const [viewMode, setViewMode] = useState<ViewMode>('class')
  const [activeTimetable, setActiveTimetable] = useState<Timetable | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [teachers, setTeachers] = useState<TeacherItem[]>([])
  const [rooms, setRooms] = useState<RoomItem[]>([])
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [selectedFilter, setSelectedFilter] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4])

  /* ---------- Lesson modal state ---------- */
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [modalDay, setModalDay] = useState(0)
  const [modalPeriodId, setModalPeriodId] = useState('')
  const [modalSubjectId, setModalSubjectId] = useState('')
  const [modalTeacherId, setModalTeacherId] = useState('')
  const [modalClassId, setModalClassId] = useState('')
  const [modalRoomId, setModalRoomId] = useState('')
  const [modalSaving, setModalSaving] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)

  /* ---------- Fetch timetables ---------- */
  const fetchTimetable = useCallback(async () => {
    if (!schoolId) return
    try {
      const res = await fetch(`/api/timetable?schoolId=${schoolId}`)
      const data: Timetable[] = await res.json()
      const active = data.find((tt) => tt.isActive) || data[0] || null
      setActiveTimetable(active)
      return active
    } catch {
      return null
    }
  }, [schoolId])

  /* ---------- Fetch lessons ---------- */
  const fetchLessons = useCallback(async (timetableId: string) => {
    try {
      const res = await fetch(`/api/timetable/lessons?timetableId=${timetableId}`)
      const data: Lesson[] = await res.json()
      setLessons(data)
    } catch {
      setLessons([])
    }
  }, [])

  /* ---------- Fetch periods / classes / teachers / rooms / subjects / school days ---------- */
  const fetchMeta = useCallback(async () => {
    if (!schoolId) return
    const [periodsRes, classesRes, teachersRes, roomsRes, subjectsRes, schoolRes] = await Promise.all([
      fetch(`/api/periods?schoolId=${schoolId}`),
      fetch(`/api/classes?schoolId=${schoolId}`),
      fetch(`/api/teachers?schoolId=${schoolId}`),
      fetch(`/api/rooms?schoolId=${schoolId}`),
      fetch(`/api/subjects?schoolId=${schoolId}`),
      fetch(`/api/school?schoolId=${schoolId}`),
    ])
    const [p, c, te, r, s] = await Promise.all([
      periodsRes.json() as Promise<Period[]>,
      classesRes.json() as Promise<ClassItem[]>,
      teachersRes.json() as Promise<TeacherItem[]>,
      roomsRes.json() as Promise<RoomItem[]>,
      subjectsRes.json() as Promise<SubjectItem[]>,
    ])
    setPeriods(p)
    setClasses(c)
    setTeachers(te)
    setRooms(r)
    setSubjects(s)

    // Parse school days from school settings
    if (schoolRes.ok) {
      const schoolData = await schoolRes.json()
      try {
        const parsed = JSON.parse(schoolData.schoolDays || '[0,1,2,3,4,5]')
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDays(parsed.sort((a: number, b: number) => a - b))
        }
      } catch { /* keep default */ }
    }
  }, [schoolId])

  /* ---------- Auto-set view for teacher/student roles ---------- */
  useEffect(() => {
    if (user?.role === 'TEACHER' && user.teacherId) {
      setViewMode('teacher')
      setSelectedFilter(user.teacherId)
    } else if (user?.role === 'STUDENT' && user.classId) {
      setViewMode('class')
      setSelectedFilter(user.classId)
    }
  }, [user])

  /* ---------- Initial load ---------- */
  useEffect(() => {
    if (!schoolId) return
    setLoading(true)

    Promise.all([fetchTimetable(), fetchMeta()]).then(async ([tt]) => {
      if (tt) await fetchLessons(tt.id)
      setLoading(false)
    })
  }, [schoolId, fetchTimetable, fetchMeta, fetchLessons])

  /* ---------- Filter lessons by viewMode + selectedFilter ---------- */
  const filteredLessons = selectedFilter
    ? lessons.filter((l) => {
        if (viewMode === 'class') return l.class.id === selectedFilter
        if (viewMode === 'teacher') return l.teacher.id === selectedFilter
        if (viewMode === 'room') return l.room?.id === selectedFilter
        return true
      })
    : lessons

  /* ---------- Filter pill items ---------- */
  const filterItems: { id: string; name: string; nameAr?: string | null; nameFr?: string | null }[] =
    viewMode === 'class'
      ? classes
      : viewMode === 'teacher'
        ? teachers
        : rooms

  /* ---------- Handlers ---------- */
  const handleLessonMove = async (
    lessonId: string,
    newDay: number,
    newPeriodId: string
  ) => {
    // Optimistic update
    setLessons((prev) =>
      prev.map((l) =>
        l.id === lessonId
          ? { ...l, dayOfWeek: newDay, periodId: newPeriodId }
          : l
      )
    )

    try {
      const res = await fetch('/api/timetable/lessons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lessonId, dayOfWeek: newDay, periodId: newPeriodId }),
      })
      if (!res.ok) throw new Error('Failed to move lesson')

      // Refetch to get accurate server state
      if (activeTimetable) await fetchLessons(activeTimetable.id)
    } catch {
      // Revert on failure
      if (activeTimetable) await fetchLessons(activeTimetable.id)
    }
  }

  const resetModalForm = () => {
    setModalSubjectId('')
    setModalTeacherId('')
    setModalClassId('')
    setModalRoomId('')
  }

  const handleEmptyCellClick = (day: number, periodId: string) => {
    setModalDay(day)
    setModalPeriodId(periodId)
    resetModalForm()
    // Pre-fill class if in class view with a filter selected
    if (viewMode === 'class' && selectedFilter) {
      setModalClassId(selectedFilter)
    }
    setShowCreateModal(true)
  }

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson)
    setModalSubjectId(lesson.subject.id)
    setModalTeacherId(lesson.teacher.id)
    setModalClassId(lesson.class.id)
    setModalRoomId(lesson.room?.id || '')
    setShowDetailModal(true)
  }

  const handleCreateLesson = async () => {
    if (!activeTimetable || !modalSubjectId || !modalTeacherId || !modalClassId || !modalPeriodId) return
    setModalSaving(true)
    try {
      const res = await fetch('/api/timetable/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timetableId: activeTimetable.id,
          dayOfWeek: modalDay,
          periodId: modalPeriodId,
          subjectId: modalSubjectId,
          teacherId: modalTeacherId,
          classId: modalClassId,
          roomId: modalRoomId || null,
        }),
      })
      if (res.ok) {
        toast.success(t('lesson_added'))
        await fetchLessons(activeTimetable.id)
        setShowCreateModal(false)
      } else {
        toast.error(t('lesson_add_failed'))
      }
    } catch {
      toast.error(t('lesson_add_failed'))
    } finally {
      setModalSaving(false)
    }
  }

  const handleUpdateLesson = async () => {
    if (!selectedLesson || !activeTimetable) return
    setModalSaving(true)
    try {
      const res = await fetch('/api/timetable/lessons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedLesson.id,
          subjectId: modalSubjectId,
          teacherId: modalTeacherId,
          classId: modalClassId,
          roomId: modalRoomId || null,
        }),
      })
      if (res.ok) {
        toast.success(t('lesson_updated'))
        await fetchLessons(activeTimetable.id)
        setShowDetailModal(false)
      } else {
        toast.error(t('lesson_update_failed'))
      }
    } catch {
      toast.error(t('lesson_update_failed'))
    } finally {
      setModalSaving(false)
    }
  }

  const handleDeleteLesson = async () => {
    if (!selectedLesson || !activeTimetable) return
    setModalSaving(true)
    try {
      const res = await fetch(`/api/timetable/lessons?id=${selectedLesson.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success(t('lesson_deleted'))
        await fetchLessons(activeTimetable.id)
        setShowDetailModal(false)
      } else {
        toast.error(t('lesson_delete_failed'))
      }
    } catch {
      toast.error(t('lesson_delete_failed'))
    } finally {
      setModalSaving(false)
    }
  }

  const handleCreateTimetable = async () => {
    if (!schoolId) return
    setCreating(true)
    try {
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, name: 'Timetable' }),
      })
      if (res.ok) {
        const tt: Timetable = await res.json()
        setActiveTimetable(tt)
      }
    } finally {
      setCreating(false)
    }
  }

  const handlePublish = async () => {
    if (!activeTimetable) return
    const newStatus = activeTimetable.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
    setActiveTimetable({ ...activeTimetable, status: newStatus })
  }

  const handleReset = async () => {
    if (!activeTimetable) return
    if (!window.confirm(t('reset_confirm'))) return
    try {
      const res = await fetch(`/api/timetable?id=${activeTimetable.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(t('reset_success'))
        setActiveTimetable(null)
        setLessons([])
      }
    } catch {
      // silent
    }
  }

  /* ---------- Get period/day name for modal title ---------- */
  const getModalPeriodName = () => {
    const period = periods.find((p) => p.id === modalPeriodId)
    return period ? `${period.name} (${period.startTime} - ${period.endTime})` : ''
  }

  /* ---------- View mode icon map ---------- */
  const viewIcons: Record<ViewMode, React.ReactNode> = {
    class: <LayoutGrid size={14} />,
    teacher: <User size={14} />,
    room: <DoorOpen size={14} />,
  }

  const viewLabels: Record<ViewMode, string> = {
    class: t('view_class'),
    teacher: t('view_teacher'),
    room: t('view_room'),
  }

  /* ---------- Lesson form fields (shared between create & edit) ---------- */
  const filteredTeachers = modalSubjectId
    ? teachers.filter((te) => te.subjects.some((s) => s.subjectId === modalSubjectId))
    : teachers

  const renderLessonForm = () => (
    <div className="space-y-4">
      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('subject')} *</label>
        <select
          value={modalSubjectId}
          onChange={(e) => {
            setModalSubjectId(e.target.value)
            // Clear teacher if they don't teach the new subject
            if (e.target.value && modalTeacherId) {
              const teacherValid = teachers.some(
                (te) => te.id === modalTeacherId && te.subjects.some((s) => s.subjectId === e.target.value)
              )
              if (!teacherValid) setModalTeacherId('')
            }
          }}
          className="w-full px-3 py-2 rounded-lg bg-bg-surface border border-border-subtle text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          <option value="">{t('select_subject')}</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {getLocaleName(s)}
            </option>
          ))}
        </select>
      </div>

      {/* Teacher */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('teacher')} *</label>
        <select
          value={modalTeacherId}
          onChange={(e) => setModalTeacherId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-bg-surface border border-border-subtle text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          <option value="">{t('select_teacher')}</option>
          {filteredTeachers.map((te) => (
            <option key={te.id} value={te.id}>
              {te.name}
            </option>
          ))}
        </select>
      </div>

      {/* Class */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('view_class')} *</label>
        <select
          value={modalClassId}
          onChange={(e) => setModalClassId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-bg-surface border border-border-subtle text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          <option value="">{t('select_class')}</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Room (optional) */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('view_room')}</label>
        <select
          value={modalRoomId}
          onChange={(e) => setModalRoomId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-bg-surface border border-border-subtle text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          <option value="">{t('no_room')}</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )

  /* ---------- Loading skeleton ---------- */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    )
  }

  /* ---------- Empty state ---------- */
  if (!activeTimetable) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {t('title')}
        </h1>
        <div className="flex flex-col items-center justify-center py-24 rounded-xl border border-border-subtle bg-bg-card">
          <CalendarDays size={48} className="text-text-muted mb-4" />
          <p className="text-text-secondary mb-6 text-center max-w-xs">
            {t('empty_state')}
          </p>
          {adminUser && (
            <Button onClick={handleCreateTimetable} loading={creating}>
              <Plus size={16} />
              {t('create_timetable')}
            </Button>
          )}
        </div>
      </div>
    )
  }

  /* ---------- Main render ---------- */
  return (
    <div className="space-y-4">
      {/* ====== TOP BAR ====== */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: title + status */}
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-text-primary">
            {t('title')}
          </h1>
          <Badge
            variant={activeTimetable.status === 'PUBLISHED' ? 'success' : 'default'}
            size="sm"
          >
            {activeTimetable.status === 'PUBLISHED' ? t('published') : t('draft')}
          </Badge>
        </div>

        {/* Right: actions (admin only) */}
        {adminUser && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handlePublish}>
              <Upload size={14} />
              {t('publish')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              if (activeTimetable && schoolId) {
                triggerExport({ type: 'timetable', schoolId, timetableId: activeTimetable.id })
              }
            }}>
              <Download size={14} />
              {tApp('export')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowImportModal(true)}>
              <Upload size={14} />
              {tApp('import')}
            </Button>
            <Button variant="danger" size="sm" onClick={handleReset}>
              <Trash2 size={14} />
              {t('reset')}
            </Button>
          </div>
        )}
      </div>

      {/* ====== VIEW SWITCHER (admin only) ====== */}
      {adminUser && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* View tabs */}
          <div className="flex gap-1 p-1 rounded-lg bg-bg-surface border border-border-subtle w-fit">
            {(['class', 'teacher', 'room'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setViewMode(mode)
                  setSelectedFilter(undefined)
                }}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md
                  transition-colors duration-150 cursor-pointer
                  ${
                    viewMode === mode
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface2'
                  }
                `}
              >
                {viewIcons[mode]}
                {viewLabels[mode]}
              </button>
            ))}
          </div>

          {/* Conflict indicator */}
          <div className="flex items-center gap-1.5">
            {lessons.some((l) => l.isConflict) ? (
              <Badge variant="danger" size="sm">
                {lessons.filter((l) => l.isConflict).length} {t('conflict_badge')}
              </Badge>
            ) : (
              <span className="text-xs text-text-muted">{t('conflicts_none')}</span>
            )}
            <HelpTooltip content={tTooltips('conflict_detection')} side="left" />
          </div>
        </div>
      )}

      {/* ====== FILTER PILLS (admin only) ====== */}
      {adminUser && filterItems.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <FilterPill
            label={
              viewMode === 'class'
                ? t('select_class')
                : viewMode === 'teacher'
                  ? t('select_teacher')
                  : t('select_room')
            }
            active={!selectedFilter}
            onClick={() => setSelectedFilter(undefined)}
          />
          {filterItems.map((item) => (
            <FilterPill
              key={item.id}
              label={getLocaleName(item)}
              active={selectedFilter === item.id}
              onClick={() =>
                setSelectedFilter(
                  selectedFilter === item.id ? undefined : item.id
                )
              }
            />
          ))}
        </div>
      )}

      {/* ====== DnD hint (admin only) ====== */}
      {adminUser && (
        <p className="text-xs text-text-muted hidden lg:block">
          {t('drag_to_edit')}
        </p>
      )}

      {/* ====== TIMETABLE GRID ====== */}
      <TimetableGrid
        lessons={filteredLessons}
        periods={periods}
        days={days}
        viewMode={viewMode}
        selectedFilter={selectedFilter}
        readOnly={readOnly}
        onLessonMove={readOnly ? () => {} : handleLessonMove}
        onLessonClick={readOnly ? () => {} : handleLessonClick}
        onEmptyCellClick={readOnly ? () => {} : handleEmptyCellClick}
      />

      {/* ====== CREATE LESSON MODAL (admin only) ====== */}
      {adminUser && <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('add_lesson')}
        size="sm"
      >
        <div className="mb-3">
          <p className="text-xs text-text-muted">
            {t(DAY_KEYS[modalDay])} &middot; {getModalPeriodName()}
          </p>
        </div>

        {renderLessonForm()}

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCreateModal(false)}
          >
            {tApp('cancel')}
          </Button>
          <Button
            size="sm"
            onClick={handleCreateLesson}
            disabled={!modalSubjectId || !modalTeacherId || !modalClassId || modalSaving}
          >
            {modalSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {t('add_lesson')}
          </Button>
        </div>
      </Modal>}

      {/* ====== LESSON DETAIL / EDIT MODAL (admin only) ====== */}
      {adminUser && <Modal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={t('edit_lesson')}
        size="sm"
      >
        {selectedLesson && (
          <>
            <div className="mb-3">
              <p className="text-xs text-text-muted">
                {t(DAY_KEYS[selectedLesson.dayOfWeek])} &middot;{' '}
                {selectedLesson.period.name} ({selectedLesson.period.startTime} - {selectedLesson.period.endTime})
              </p>
            </div>

            {renderLessonForm()}

            <div className="flex items-center justify-between mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteLesson}
                disabled={modalSaving}
                className="text-danger hover:text-danger hover:bg-danger/10"
              >
                <Trash2 size={14} />
                {t('delete_lesson')}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetailModal(false)}
                >
                  {tApp('cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpdateLesson}
                  disabled={!modalSubjectId || !modalTeacherId || !modalClassId || modalSaving}
                >
                  {modalSaving && <Loader2 size={14} className="animate-spin" />}
                  {tApp('save')}
                </Button>
              </div>
            </div>
          </>
        )}
      </Modal>}

      {/* Import Modal */}
      <ImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        type="timetable"
        schoolId={schoolId!}
        timetableId={activeTimetable?.id}
        onComplete={() => activeTimetable && fetchLessons(activeTimetable.id)}
      />
    </div>
  )
}
