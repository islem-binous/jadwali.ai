'use client'

import React, { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { getLocalizedName } from '@/lib/locale-name'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import type { TeacherData } from './TeacherCard'

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

export interface ProfessionalGradeOption {
  id: string
  code: number
  nameAr: string
  nameFr?: string | null
  nameEn?: string | null
}

interface TeacherModalProps {
  isOpen: boolean
  onClose: () => void
  teacher?: TeacherData | null
  subjects: SubjectOption[]
  professionalGrades: ProfessionalGradeOption[]
  schoolId: string
  onSave: (data: TeacherFormData) => Promise<void>
}

export interface TeacherFormData {
  id?: string
  name: string
  email: string
  phone: string
  colorHex: string
  maxPeriodsPerDay: number
  maxPeriodsPerWeek: number
  excludeFromCover: boolean
  matricule: string
  cin: string
  recruitmentDate: string
  sex: string
  professionalGradeId: string
  subjectIds: string[]
  schoolId: string
}

/* ------------------------------------------------------------------ */
/*  Color Presets                                                      */
/* ------------------------------------------------------------------ */

const COLOR_PRESETS = [
  '#4f6ef7', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#a855f7', // purple
  '#ec4899', // pink
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TeacherModal({
  isOpen,
  onClose,
  teacher,
  subjects,
  professionalGrades,
  schoolId,
  onSave,
}: TeacherModalProps) {
  const t = useTranslations()
  const locale = useLocale()
  const isEdit = !!teacher

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [colorHex, setColorHex] = useState(COLOR_PRESETS[1])
  const [maxPeriodsPerDay, setMaxPeriodsPerDay] = useState(6)
  const [maxPeriodsPerWeek, setMaxPeriodsPerWeek] = useState(24)
  const [excludeFromCover, setExcludeFromCover] = useState(false)
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])
  const [matricule, setMatricule] = useState('')
  const [cin, setCin] = useState('')
  const [recruitmentDate, setRecruitmentDate] = useState('')
  const [sex, setSex] = useState('')
  const [professionalGradeId, setProfessionalGradeId] = useState('')
  const [saving, setSaving] = useState(false)

  const inputClass = 'w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none'

  // Populate form when editing
  useEffect(() => {
    if (teacher) {
      setName(teacher.name)
      setEmail(teacher.email ?? '')
      setPhone(teacher.phone ?? '')
      setColorHex(teacher.colorHex)
      setMaxPeriodsPerDay(teacher.maxPeriodsPerDay)
      setMaxPeriodsPerWeek(teacher.maxPeriodsPerWeek)
      setExcludeFromCover(teacher.excludeFromCover)
      setMatricule(teacher.matricule ?? '')
      setCin(teacher.cin ?? '')
      setRecruitmentDate(teacher.recruitmentDate ? teacher.recruitmentDate.slice(0, 10) : '')
      setSex(teacher.sex ?? '')
      setProfessionalGradeId(teacher.professionalGradeId ?? '')
      // Put primary subject first
      const sorted = [...teacher.subjects].sort((a, b) =>
        a.isPrimary ? -1 : b.isPrimary ? 1 : 0
      )
      setSelectedSubjectIds(sorted.map((ts) => ts.subjectId))
    } else {
      setName('')
      setEmail('')
      setPhone('')
      setColorHex(COLOR_PRESETS[1])
      setMaxPeriodsPerDay(6)
      setMaxPeriodsPerWeek(24)
      setExcludeFromCover(false)
      setSelectedSubjectIds([])
      setMatricule('')
      setCin('')
      setRecruitmentDate('')
      setSex('')
      setProfessionalGradeId('')
    }
  }, [teacher, isOpen])

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      await onSave({
        id: teacher?.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        colorHex,
        maxPeriodsPerDay,
        maxPeriodsPerWeek,
        excludeFromCover,
        matricule: matricule.trim(),
        cin: cin.trim(),
        recruitmentDate,
        sex,
        professionalGradeId,
        subjectIds: selectedSubjectIds,
        schoolId,
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
      title={isEdit ? t('teachers.edit') : t('teachers.add')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('teachers.name')} *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder={t('teachers.name')}
          />
        </div>

        {/* Email + Phone row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('teachers.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder={t('teachers.email')}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('teachers.phone')}
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              placeholder={t('teachers.phone')}
            />
          </div>
        </div>

        {/* Matricule + CIN row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('teachers.matricule')}
            </label>
            <input
              type="text"
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              className={inputClass}
              placeholder={t('teachers.matricule')}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('teachers.cin')}
            </label>
            <input
              type="text"
              value={cin}
              onChange={(e) => setCin(e.target.value)}
              className={inputClass}
              placeholder={t('teachers.cin')}
            />
          </div>
        </div>

        {/* Sex + Recruitment Date row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('teachers.sex')}
            </label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="M">{t('teachers.sex_male')}</option>
              <option value="F">{t('teachers.sex_female')}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('teachers.recruitment_date')}
            </label>
            <input
              type="date"
              value={recruitmentDate}
              onChange={(e) => setRecruitmentDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Professional Grade */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('teachers.professional_grade')}
          </label>
          <select
            value={professionalGradeId}
            onChange={(e) => setProfessionalGradeId(e.target.value)}
            className={inputClass}
          >
            <option value="">—</option>
            {professionalGrades.map((g) => (
              <option key={g.id} value={g.id}>
                {getLocalizedName({ name: g.nameAr, nameAr: g.nameAr, nameFr: g.nameFr, nameEn: g.nameEn }, locale)}
              </option>
            ))}
          </select>
        </div>

        {/* Color Picker */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('teachers.color')}
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

        {/* Subjects multi-select */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">
            {t('teachers.subjects')}
          </label>
          {subjects.length === 0 ? (
            <p className="text-xs text-text-muted">
              {t('teachers.subjects')} &mdash; none available
            </p>
          ) : (
            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-border-default bg-bg-surface p-2">
              {subjects.map((subject) => {
                const isChecked = selectedSubjectIds.includes(subject.id)
                const idx = selectedSubjectIds.indexOf(subject.id)
                return (
                  <label
                    key={subject.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-bg-base"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSubject(subject.id)}
                      className="h-4 w-4 rounded border-border-default text-accent focus:ring-accent"
                    />
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: subject.colorHex }}
                    />
                    <span className="text-text-primary">{getLocalizedName(subject, locale)}</span>
                    {isChecked && idx === 0 && (
                      <span className="ml-auto text-[10px] font-medium text-accent">
                        {t('teachers.primary_subject')}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Max periods per day / week */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('teachers.max_periods_day')}
            </label>
            <input
              type="number"
              min={1}
              max={12}
              value={maxPeriodsPerDay}
              onChange={(e) => setMaxPeriodsPerDay(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {t('teachers.max_periods_week')}
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={maxPeriodsPerWeek}
              onChange={(e) => setMaxPeriodsPerWeek(Number(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>

        {/* Exclude from substitutions */}
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={excludeFromCover}
              onChange={(e) => setExcludeFromCover(e.target.checked)}
              className="h-4 w-4 rounded border-border-default text-accent focus:ring-accent"
            />
            <span className="text-sm text-text-secondary">
              {t('teachers.exclude_cover')}
            </span>
          </label>
          <HelpTooltip content={t('tooltips.exclude_cover')} side="top" />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={saving}
          className="w-full"
        >
          {isEdit ? t('app.save') : t('teachers.add')}
        </Button>
      </form>
    </Modal>
  )
}
