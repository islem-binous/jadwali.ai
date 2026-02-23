'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface Teacher {
  id: string
  name: string
  colorHex: string
}

interface Period {
  id: string
  name: string
  order: number
  isBreak: boolean
}

export interface AbsenceFormData {
  id?: string
  teacherId: string
  date: string
  endDate: string | null
  type: string
  periods: string[]
  note: string
}

interface EditingAbsence {
  id: string
  teacherId: string
  date: string
  endDate?: string | null
  type: string
  periods: string
  note: string | null
}

interface ReportAbsenceModalProps {
  isOpen: boolean
  onClose: () => void
  teachers: Teacher[]
  periods: Period[]
  schoolId: string
  absence?: EditingAbsence | null
  onSave: (data: AbsenceFormData) => Promise<void>
}

const ABSENCE_TYPES = [
  'SICK',
  'PERSONAL',
  'TRAINING',
  'CONFERENCE',
  'MATERNITY',
  'MEDICAL',
  'EMERGENCY',
  'OTHER',
] as const

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

export function ReportAbsenceModal({
  isOpen,
  onClose,
  teachers,
  periods,
  schoolId,
  absence,
  onSave,
}: ReportAbsenceModalProps) {
  const t = useTranslations()

  const isEdit = !!absence

  const [teacherId, setTeacherId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [type, setType] = useState<string>('SICK')
  const [fullDay, setFullDay] = useState(true)
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const teachingPeriods = periods.filter((p) => !p.isBreak)

  // Pre-fill form when editing
  React.useEffect(() => {
    if (absence) {
      setTeacherId(absence.teacherId)
      setStartDate(absence.date.split('T')[0])
      setEndDate(absence.endDate ? absence.endDate.split('T')[0] : '')
      setType(absence.type)
      setNote(absence.note ?? '')
      try {
        const parsed = JSON.parse(absence.periods)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedPeriods(parsed)
          setFullDay(parsed.length >= teachingPeriods.length)
        }
      } catch {
        setFullDay(true)
        setSelectedPeriods([])
      }
    } else {
      setTeacherId('')
      setStartDate(new Date().toISOString().split('T')[0])
      setEndDate('')
      setType('SICK')
      setFullDay(true)
      setSelectedPeriods([])
      setNote('')
    }
  }, [absence, teachingPeriods.length])

  function handleFullDayToggle(checked: boolean) {
    setFullDay(checked)
    if (checked) {
      setSelectedPeriods(teachingPeriods.map((p) => p.id))
    } else {
      setSelectedPeriods([])
    }
  }

  function togglePeriod(periodId: string) {
    setSelectedPeriods((prev) =>
      prev.includes(periodId) ? prev.filter((id) => id !== periodId) : [...prev, periodId],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!teacherId || !startDate) return

    setSaving(true)
    try {
      await onSave({
        ...(absence ? { id: absence.id } : {}),
        teacherId,
        date: startDate,
        endDate: endDate || null,
        type,
        periods: fullDay ? teachingPeriods.map((p) => p.id) : selectedPeriods,
        note,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose} title={isEdit ? t('app.edit') : t('absences.report')} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Teacher select */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary">
            {t('absences.teacher')}
          </label>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            required
            className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="">{t('absences.teacher')}...</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
              {t('calendar.start_date')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
              {t('calendar.end_date')}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>

        {/* Type select */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary">
            {t('absences.type')}
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            {ABSENCE_TYPES.map((absType) => (
              <option key={absType} value={absType}>
                {t(`absences.${typeKeyMap[absType]}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Period selection */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary">
            {t('absences.periods_affected')}
          </label>

          {/* Full day checkbox */}
          <label className="mb-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={fullDay}
              onChange={(e) => handleFullDayToggle(e.target.checked)}
              className="h-4 w-4 rounded border-border-default bg-bg-surface text-accent focus:ring-accent/20"
            />
            <span className="text-sm text-text-primary">{t('absences.full_day')}</span>
          </label>

          {/* Individual period checkboxes */}
          {!fullDay && (
            <div className="grid grid-cols-2 gap-2">
              {teachingPeriods.map((period) => (
                <label
                  key={period.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    selectedPeriods.includes(period.id)
                      ? 'border-accent bg-accent-dim text-accent'
                      : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-default'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPeriods.includes(period.id)}
                    onChange={() => togglePeriod(period.id)}
                    className="sr-only"
                  />
                  {period.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary">
            {t('app.optional')}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="..."
            className="w-full resize-none rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            {t('app.cancel')}
          </Button>
          <Button type="submit" loading={saving} disabled={!teacherId || !startDate} className="flex-1">
            {t('app.save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
