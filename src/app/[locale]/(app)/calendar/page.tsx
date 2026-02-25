'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { getLocalizedName } from '@/lib/locale-name'
import { Plus, CalendarDays, Pencil, Trash2, Star, Upload } from 'lucide-react'
import { useUserStore } from '@/store/userStore'
import { isAdmin as checkIsAdmin } from '@/lib/permissions'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { MiniCalendar, type CalendarEvent } from '@/components/calendar/MiniCalendar'
import { EventModal, type EventFormData } from '@/components/calendar/EventModal'
import { ImportModal } from '@/components/ui/ImportModal'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SchoolEventData {
  id: string
  schoolId: string
  title: string
  titleAr?: string | null
  titleFr?: string | null
  description?: string | null
  type: string
  startDate: string
  endDate: string
  colorHex: string
  affectsClasses: string
  isRecurring: boolean
  createdAt: string
}

interface ClassOption {
  id: string
  name: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const TYPE_BADGE_VARIANT: Record<string, 'accent' | 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
  EXAM: 'accent',
  HOLIDAY: 'success',
  TRIP: 'info',
  MEETING: 'warning',
  SPORT: 'danger',
  PARENT_DAY: 'info',
  CLOSURE: 'danger',
  OTHER: 'default',
}

const TYPE_TRANSLATION_MAP: Record<string, string> = {
  EXAM: 'calendar.event_type_exam',
  HOLIDAY: 'calendar.event_type_holiday',
  TRIP: 'calendar.event_type_trip',
  MEETING: 'calendar.event_type_meeting',
  SPORT: 'calendar.event_type_sport',
  PARENT_DAY: 'calendar.event_type_parent',
  CLOSURE: 'calendar.event_type_closure',
  OTHER: 'calendar.event_type_other',
}

function formatDateRange(start: string, end: string, locale = 'en'): string {
  const s = new Date(start)
  const e = new Date(end)
  const loc = locale === 'ar' ? 'ar-TN' : locale === 'fr' ? 'fr-FR' : 'en-US'
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const startStr = s.toLocaleDateString(loc, opts)
  const endStr = e.toLocaleDateString(loc, opts)
  return startStr === endStr ? startStr : `${startStr} - ${endStr}`
}

function parseAffectsClasses(val: string): string[] {
  try {
    const parsed = JSON.parse(val)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function dateInRange(date: Date, startStr: string, endStr: string) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const s = new Date(new Date(startStr))
  const e = new Date(new Date(endStr))
  const sDay = new Date(s.getFullYear(), s.getMonth(), s.getDate())
  const eDay = new Date(e.getFullYear(), e.getMonth(), e.getDate())
  return d >= sDay && d <= eDay
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function CalendarPage() {
  const t = useTranslations()
  const locale = useLocale()
  const toast = useToast()
  const user = useUserStore((s) => s.user)
  const schoolId = user?.schoolId
  const adminUser = checkIsAdmin(user?.role || '')

  // Locale-aware event title
  const getEventTitle = (ev: SchoolEventData) =>
    getLocalizedName(
      { name: ev.title, nameAr: ev.titleAr, nameFr: ev.titleFr },
      locale
    )

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Data state
  const [events, setEvents] = useState<SchoolEventData[]>([])
  const [holidays, setHolidays] = useState<SchoolEventData[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<SchoolEventData | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SchoolEventData | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  /* ---------------------------------------------------------------- */
  /*  Data Fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchEvents = useCallback(async () => {
    if (!schoolId) return
    try {
      const m = currentMonth.getMonth() + 1
      const y = currentMonth.getFullYear()
      const res = await fetch(
        `/api/events?schoolId=${schoolId}&month=${m}&year=${y}`
      )
      if (res.ok) {
        const data = await res.json()
        setEvents(data)
      }
    } catch {
      toast.error(t('app.error'))
    }
  }, [schoolId, currentMonth, t, toast])
  // toast is now stable via useMemo in useToast()

  const fetchHolidays = useCallback(async () => {
    if (!schoolId) return
    try {
      const res = await fetch(
        `/api/events?schoolId=${schoolId}&recurring=true`
      )
      if (res.ok) {
        const data = await res.json()
        setHolidays(data)
      }
    } catch {
      // silent
    }
  }, [schoolId])

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
    Promise.all([fetchEvents(), fetchHolidays(), fetchClasses()]).finally(() =>
      setLoading(false)
    )
  }, [schoolId, fetchEvents, fetchHolidays, fetchClasses])

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  const handleSave = async (data: EventFormData) => {
    const isEdit = !!data.id
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch('/api/events', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      toast.error(t('app.error'))
      throw new Error('Save failed')
    }

    toast.success(t('calendar.add_event'))
    await Promise.all([fetchEvents(), fetchHolidays()])
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/events?id=${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        toast.error(t('app.error'))
        return
      }
      toast.success(t('app.delete'))
      setDeleteTarget(null)
      await Promise.all([fetchEvents(), fetchHolidays()])
    } catch {
      toast.error(t('app.error'))
    }
  }

  const openCreate = () => {
    setEditingEvent(null)
    setModalOpen(true)
  }

  const openEdit = (ev: SchoolEventData) => {
    setEditingEvent(ev)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingEvent(null)
  }

  const handleDateSelect = (date: Date) => {
    // Toggle selection off if same date clicked
    if (selectedDate && isSameDay(selectedDate, date)) {
      setSelectedDate(null)
    } else {
      setSelectedDate(date)
    }
  }

  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date)
    setSelectedDate(null)
  }

  /* ---------------------------------------------------------------- */
  /*  Filtering                                                        */
  /* ---------------------------------------------------------------- */

  // Separate regular events from recurring holidays
  const regularEvents = events.filter((ev) => !ev.isRecurring)

  // Combine regular events + holidays for calendar dots
  const calendarEvents: CalendarEvent[] = [...events, ...holidays.filter(
    (h) => !events.some((e) => e.id === h.id)
  )].map((ev) => ({
    id: ev.id,
    title: getEventTitle(ev),
    startDate: ev.startDate,
    endDate: ev.endDate,
    colorHex: ev.colorHex,
    type: ev.type,
  }))

  // Filter regular events for the list (exclude recurring holidays — shown separately)
  const filteredEvents = selectedDate
    ? regularEvents.filter((ev) => dateInRange(selectedDate, ev.startDate, ev.endDate))
    : regularEvents.filter((ev) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const endD = new Date(ev.endDate)
        endD.setHours(23, 59, 59, 999)
        return endD >= today
      })

  // Build class name lookup
  const classMap = new Map(classes.map((c) => [c.id, c.name]))

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {t('calendar.title')}
        </h1>
        {adminUser && (
          <div className="flex gap-2">
            <Button variant="secondary" size="md" onClick={() => setImportOpen(true)}>
              <Upload size={16} />
              {t('app.import')}
            </Button>
            <Button variant="primary" size="md" onClick={openCreate}>
              <Plus size={16} />
              {t('calendar.add_event')}
            </Button>
          </div>
        )}
      </div>

      {/* Content: Calendar + Events */}
      {loading ? (
        /* Loading skeleton */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* MiniCalendar */}
          <div className="lg:col-span-1">
            <MiniCalendar
              currentMonth={currentMonth}
              events={calendarEvents}
              onDateSelect={handleDateSelect}
              onMonthChange={handleMonthChange}
              selectedDate={selectedDate}
            />
          </div>

          {/* Events List */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 font-display text-lg font-semibold text-text-primary">
              {selectedDate
                ? `${t('calendar.today')} - ${selectedDate.toLocaleDateString(
                    'en-US',
                    { month: 'long', day: 'numeric', year: 'numeric' }
                  )}`
                : t('calendar.upcoming_events')}
            </h2>

            {filteredEvents.length === 0 ? (
              /* Empty state */
              <div className="rounded-xl border border-border-subtle bg-bg-card p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <CalendarDays className="mb-3 h-10 w-10 text-text-muted" />
                  <p className="text-sm text-text-muted">
                    {selectedDate
                      ? `${t('calendar.upcoming_events')} - 0`
                      : t('calendar.upcoming_events')}
                  </p>
                  {adminUser && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-4"
                      onClick={openCreate}
                    >
                      <Plus size={14} />
                      {t('calendar.add_event')}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((ev) => {
                  const affectedIds = parseAffectsClasses(ev.affectsClasses)
                  const badgeVariant =
                    TYPE_BADGE_VARIANT[ev.type] ?? 'default'

                  return (
                    <div
                      key={ev.id}
                      className="group relative rounded-xl border border-border-subtle bg-bg-card p-4 transition hover:border-border-default"
                    >
                      <div className="flex items-start gap-3">
                        {/* Color stripe */}
                        <div
                          className="mt-1 h-10 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: ev.colorHex }}
                        />

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-text-primary">
                              {getEventTitle(ev)}
                            </h3>
                            <Badge variant={badgeVariant} size="sm">
                              {t(
                                TYPE_TRANSLATION_MAP[ev.type] ??
                                  'calendar.event_type_other'
                              )}
                            </Badge>
                          </div>

                          <p className="mt-1 text-xs text-text-muted">
                            {formatDateRange(ev.startDate, ev.endDate, locale)}
                          </p>

                          {ev.description && (
                            <p className="mt-1 text-xs text-text-secondary line-clamp-2">
                              {ev.description}
                            </p>
                          )}

                          {/* Affected classes */}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {affectedIds.length === 0 ? (
                              <Badge variant="default" size="sm">
                                {t('calendar.all_classes')}
                              </Badge>
                            ) : (
                              affectedIds.map((cid) => (
                                <Badge
                                  key={cid}
                                  variant="default"
                                  size="sm"
                                >
                                  {classMap.get(cid) ?? cid}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {adminUser && (
                          <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(ev)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-surface hover:text-text-primary transition"
                              aria-label="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(ev)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-danger-dim hover:text-danger transition"
                              aria-label="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Official Holidays — always visible */}
      {holidays.length > 0 && (
        <div className="rounded-xl border border-border-subtle bg-bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Star size={18} className="text-warning" />
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {t('calendar.official_holidays')}
            </h2>
          </div>
          <p className="mb-4 text-xs text-text-muted">
            {t('calendar.holidays_note')}
          </p>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {holidays.map((h) => (
              <div
                key={h.id}
                className="group flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-3 py-2.5 transition hover:border-border-default"
              >
                <div
                  className="h-8 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: h.colorHex }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {getEventTitle(h)}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatDateRange(h.startDate, h.endDate, locale)}
                  </p>
                </div>
                {adminUser && (
                  <button
                    onClick={() => openEdit(h)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted opacity-0 transition hover:bg-bg-card hover:text-text-primary group-hover:opacity-100"
                    aria-label="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Modal (Add / Edit) */}
      <EventModal
        isOpen={modalOpen}
        onClose={closeModal}
        event={editingEvent}
        schoolId={schoolId ?? ''}
        classes={classes}
        onSave={handleSave}
      />

      {/* Import Modal */}
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        type="events"
        schoolId={schoolId ?? ''}
        onComplete={() => {
          Promise.all([fetchEvents(), fetchHolidays()])
        }}
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
              {getEventTitle(deleteTarget)}
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
