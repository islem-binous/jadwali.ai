'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TeacherSubject {
  id: string
  subjectId: string
  isPrimary: boolean
  subject: {
    id: string
    name: string
    colorHex: string
  }
}

interface TeacherLesson {
  id: string
}

interface TeacherAbsence {
  id: string
}

export interface TeacherData {
  id: string
  name: string
  email: string | null
  phone: string | null
  colorHex: string
  maxPeriodsPerDay: number
  maxPeriodsPerWeek: number
  excludeFromCover: boolean
  subjects: TeacherSubject[]
  lessons: TeacherLesson[]
  absences: TeacherAbsence[]
}

interface TeacherCardProps {
  teacher: TeacherData
  onEdit: (teacher: TeacherData) => void
  onDelete: (teacher: TeacherData) => void
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TeacherCard({ teacher, onEdit, onDelete }: TeacherCardProps) {
  const t = useTranslations()

  const lessonsCount = teacher.lessons.length
  const maxWeek = teacher.maxPeriodsPerWeek
  const workloadPct = maxWeek > 0 ? Math.round((lessonsCount / maxWeek) * 100) : 0
  const isAbsent = teacher.absences.length > 0
  const isNearMax = workloadPct > 85

  const workloadColor: 'success' | 'warning' | 'danger' =
    workloadPct > 90 ? 'danger' : workloadPct >= 75 ? 'warning' : 'success'

  const primarySubject = teacher.subjects.find((ts) => ts.isPrimary) ?? teacher.subjects[0]

  const statusVariant: 'success' | 'danger' | 'warning' = isAbsent
    ? 'danger'
    : isNearMax
      ? 'warning'
      : 'success'

  const statusKey = isAbsent
    ? 'teachers.absent'
    : isNearMax
      ? 'teachers.near_max'
      : 'teachers.active'

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card p-4 transition hover:border-border-default">
      {/* Top row: avatar + info + actions */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: teacher.colorHex }}
        >
          {getInitials(teacher.name)}
        </div>

        {/* Name + subject */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-text-primary">{teacher.name}</p>
          {primarySubject && (
            <Badge size="sm" variant="accent">
              {primarySubject.subject.name}
            </Badge>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onEdit(teacher)}
            className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-surface hover:text-text-primary"
            aria-label={t('app.edit')}
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(teacher)}
            className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-danger-dim hover:text-danger"
            aria-label={t('app.delete')}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Workload bar */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-text-secondary">
            {t('teachers.workload')}
          </span>
          <span className="text-xs text-text-muted">
            {lessonsCount} / {maxWeek} {t('teachers.periods_week')}
          </span>
        </div>
        <ProgressBar value={workloadPct} color={workloadColor} size="sm" />
      </div>

      {/* Status badge */}
      <div className="mt-3">
        <Badge variant={statusVariant} size="sm">
          {t(statusKey)}
        </Badge>
      </div>
    </div>
  )
}
