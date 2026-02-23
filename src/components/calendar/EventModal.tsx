'use client'

import React, { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface EventFormData {
  id?: string
  schoolId: string
  title: string
  titleAr?: string
  titleFr?: string
  description: string
  type: string
  startDate: string
  endDate: string
  colorHex: string
  affectsClasses: string // JSON array string
}

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
}

interface ClassOption {
  id: string
  name: string
}

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  event?: SchoolEventData | null
  schoolId: string
  classes: ClassOption[]
  onSave: (data: EventFormData) => Promise<void>
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EVENT_TYPES = [
  'EXAM',
  'HOLIDAY',
  'TRIP',
  'MEETING',
  'SPORT',
  'PARENT_DAY',
  'CLOSURE',
  'OTHER',
] as const

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

const COLOR_PRESETS = [
  '#4f6ef7', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#a855f7', // purple
  '#ec4899', // pink
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function toDateInput(val: string | Date): string {
  const d = new Date(val)
  return d.toISOString().split('T')[0]
}

function parseAffectsClasses(val: string): string[] {
  try {
    const parsed = JSON.parse(val)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function EventModal({
  isOpen,
  onClose,
  event,
  schoolId,
  classes,
  onSave,
}: EventModalProps) {
  const t = useTranslations()
  const isEdit = !!event

  const [title, setTitle] = useState('')
  const [type, setType] = useState<string>('OTHER')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [colorHex, setColorHex] = useState(COLOR_PRESETS[0])
  const [allClasses, setAllClasses] = useState(true)
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setType(event.type)
      setStartDate(toDateInput(event.startDate))
      setEndDate(toDateInput(event.endDate))
      setDescription(event.description ?? '')
      setColorHex(event.colorHex)
      const affected = parseAffectsClasses(event.affectsClasses)
      if (affected.length === 0) {
        setAllClasses(true)
        setSelectedClassIds([])
      } else {
        setAllClasses(false)
        setSelectedClassIds(affected)
      }
    } else {
      setTitle('')
      setType('OTHER')
      setStartDate('')
      setEndDate('')
      setDescription('')
      setColorHex(COLOR_PRESETS[0])
      setAllClasses(true)
      setSelectedClassIds([])
    }
  }, [event, isOpen])

  const toggleClass = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !startDate || !endDate) return

    setSaving(true)
    try {
      await onSave({
        id: event?.id,
        schoolId,
        title: title.trim(),
        description: description.trim(),
        type,
        startDate,
        endDate,
        colorHex,
        affectsClasses: allClasses ? '[]' : JSON.stringify(selectedClassIds),
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
      title={isEdit ? (event?.title ?? t('calendar.add_event')) : t('calendar.add_event')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Event Name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('calendar.event_name')} *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            placeholder={t('calendar.event_name')}
          />
        </div>

        {/* Event Type */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('calendar.event_type')}
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            {EVENT_TYPES.map((et) => (
              <option key={et} value={et}>
                {t(TYPE_TRANSLATION_MAP[et])}
              </option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('calendar.start_date')} *
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('calendar.end_date')} *
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
            placeholder="Optional description..."
          />
        </div>

        {/* Affects Classes */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('calendar.affects_classes')}
          </label>

          {/* All Classes toggle */}
          <label className="flex cursor-pointer items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={allClasses}
              onChange={(e) => {
                setAllClasses(e.target.checked)
                if (e.target.checked) setSelectedClassIds([])
              }}
              className="h-4 w-4 rounded border-border-default text-accent focus:ring-accent"
            />
            <span className="text-sm text-text-secondary">
              {t('calendar.all_classes')}
            </span>
          </label>

          {/* Class checkboxes */}
          {!allClasses && classes.length > 0 && (
            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-border-default bg-bg-surface p-2">
              {classes.map((cls) => {
                const isChecked = selectedClassIds.includes(cls.id)
                return (
                  <label
                    key={cls.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-bg-base"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleClass(cls.id)}
                      className="h-4 w-4 rounded border-border-default text-accent focus:ring-accent"
                    />
                    <span className="text-text-primary">{cls.name}</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Color Picker */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            Color
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
          {isEdit ? t('app.save') : t('calendar.add_event')}
        </Button>
      </form>
    </Modal>
  )
}
