'use client'

import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'

export interface LessonPillData {
  id: string
  subject: { name: string; colorHex: string }
  teacher: { name: string }
  room?: { name: string } | null
  class: { name: string }
  isConflict: boolean
}

interface LessonPillProps {
  lesson: LessonPillData
  isAbsent?: boolean
  onClick?: () => void
}

export function LessonPill({ lesson, isAbsent = false, onClick }: LessonPillProps) {
  const t = useTranslations('timetable')

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: lesson.id,
    data: { lesson },
  })

  const style: React.CSSProperties = {
    backgroundColor: `${lesson.subject.colorHex}20`,
    borderLeftColor: lesson.isConflict ? undefined : lesson.subject.colorHex,
    transform: CSS.Translate.toString(transform),
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      onClick={onClick}
      className={`
        relative w-full min-h-[56px] rounded-lg
        border-l-[3px] px-2.5 py-2
        cursor-grab active:cursor-grabbing
        transition-all duration-150 ease-in-out
        hover:brightness-110
        ${lesson.isConflict ? 'border-l-danger border border-danger/40' : 'border border-transparent'}
        ${isDragging ? 'opacity-60 scale-95 shadow-lg z-50' : ''}
        ${isAbsent ? 'opacity-80' : ''}
      `}
      role="button"
      tabIndex={0}
      aria-label={`${lesson.subject.name} - ${lesson.teacher.name}`}
    >
      {/* Conflict icon */}
      {lesson.isConflict && (
        <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-danger text-white">
          <AlertTriangle size={10} />
        </div>
      )}

      {/* Subject name */}
      <p className="text-sm font-medium text-text-primary truncate leading-tight">
        {lesson.subject.name}
      </p>

      {/* Teacher name */}
      <p
        className={`
          text-xs text-text-secondary truncate mt-0.5
          ${isAbsent ? 'line-through text-danger' : ''}
        `}
      >
        {lesson.teacher.name}
      </p>

      {/* Room */}
      {lesson.room && (
        <p className="text-xs text-text-muted truncate mt-0.5">
          {lesson.room.name}
        </p>
      )}

      {/* Absent badge */}
      {isAbsent && (
        <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-danger/20 text-danger">
          {t('absent_badge')}
        </span>
      )}

      {/* Conflict badge */}
      {lesson.isConflict && !isAbsent && (
        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-danger/20 text-danger">
          {t('conflict_badge')}
        </span>
      )}
    </div>
  )
}
