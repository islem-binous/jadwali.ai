'use client'

import React, { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { LessonPill, LessonPillData } from './LessonPill'
import { isPeriodActiveOnDay } from '@/lib/period-utils'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Period {
  id: string
  name: string
  startTime: string
  endTime: string
  order: number
  isBreak: boolean
  breakLabel?: string | null
  applicableDays?: string
}

export interface Lesson {
  id: string
  dayOfWeek: number
  periodId: string
  isConflict: boolean
  conflictNote?: string | null
  subject: { id: string; name: string; nameAr?: string | null; nameFr?: string | null; colorHex: string }
  teacher: { id: string; name: string }
  class: { id: string; name: string }
  room?: { id: string; name: string } | null
  period: Period
}

interface TimetableGridProps {
  lessons: Lesson[]
  periods: Period[]
  days: number[]
  viewMode: 'class' | 'teacher' | 'room'
  selectedFilter?: string
  readOnly?: boolean
  onLessonMove: (lessonId: string, newDay: number, newPeriodId: string) => void
  onLessonClick: (lesson: Lesson) => void
  onEmptyCellClick: (day: number, periodId: string) => void
}

/* ------------------------------------------------------------------ */
/*  Day key helpers                                                    */
/* ------------------------------------------------------------------ */

const DAY_KEYS = ['day_mon', 'day_tue', 'day_wed', 'day_thu', 'day_fri', 'day_sat'] as const
const DAY_SHORT_KEYS = ['day_mon_short', 'day_tue_short', 'day_wed_short', 'day_thu_short', 'day_fri_short', 'day_sat_short'] as const

/* ------------------------------------------------------------------ */
/*  Droppable Cell                                                     */
/* ------------------------------------------------------------------ */

interface DroppableCellProps {
  id: string
  children: React.ReactNode
  isEmpty: boolean
  readOnly?: boolean
  onEmptyClick: () => void
}

function DroppableCell({ id, children, isEmpty, readOnly, onEmptyClick }: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`
        border-t border-l border-border-subtle p-1 min-h-[64px]
        transition-colors duration-150
        ${isOver && !readOnly ? 'bg-accent/10 border-accent/30' : ''}
        ${isEmpty && !readOnly ? 'group' : ''}
      `}
    >
      {children}
      {isEmpty && !readOnly && (
        <button
          type="button"
          onClick={onEmptyClick}
          className={`
            w-full h-full min-h-[56px] rounded-lg
            border border-dashed border-transparent
            group-hover:border-border-default
            flex items-center justify-center
            text-text-muted opacity-0 group-hover:opacity-100
            transition-all duration-150 cursor-pointer
            hover:bg-bg-surface/50
          `}
          aria-label="Add lesson"
        >
          <Plus size={16} />
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Mobile Day Tabs                                                    */
/* ------------------------------------------------------------------ */

interface MobileDayTabsProps {
  days: number[]
  activeDay: number
  onDayChange: (day: number) => void
}

function MobileDayTabs({ days, activeDay, onDayChange }: MobileDayTabsProps) {
  const t = useTranslations('timetable')

  return (
    <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide lg:hidden">
      {days.map((day) => (
        <button
          key={day}
          type="button"
          onClick={() => onDayChange(day)}
          className={`
            shrink-0 px-3.5 py-1.5 text-sm font-medium rounded-full border
            transition-colors duration-150 cursor-pointer
            ${
              activeDay === day
                ? 'bg-accent-dim text-accent border-accent'
                : 'bg-transparent text-text-secondary border-border-subtle hover:border-border-default hover:text-text-primary'
            }
          `}
        >
          {t(DAY_SHORT_KEYS[day])}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Grid                                                          */
/* ------------------------------------------------------------------ */

export function TimetableGrid({
  lessons,
  periods,
  days,
  readOnly = false,
  onLessonMove,
  onLessonClick,
  onEmptyCellClick,
}: TimetableGridProps) {
  const t = useTranslations('timetable')
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [mobileDay, setMobileDay] = useState(days[0] ?? 0)

  /* ---------- DnD sensors (disabled in readOnly) ---------- */
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 6 },
  })
  const sensors = useSensors(...(readOnly ? [] : [pointerSensor, touchSensor]))

  /* ---------- Helpers ---------- */
  const getLessonsForCell = useCallback(
    (day: number, periodId: string) =>
      lessons.filter((l) => l.dayOfWeek === day && l.periodId === periodId),
    [lessons]
  )

  const cellId = (day: number, periodId: string) => `cell-${day}-${periodId}`

  /* ---------- DnD handlers ---------- */
  function handleDragStart(event: DragStartEvent) {
    const lesson = (event.active.data.current as { lesson: Lesson } | undefined)?.lesson
    if (lesson) setActiveLesson(lesson)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLesson(null)
    const { active, over } = event
    if (!over) return

    const overId = over.id as string
    if (!overId.startsWith('cell-')) return

    const parts = overId.replace('cell-', '').split('-')
    const newDay = parseInt(parts[0], 10)
    const newPeriodId = parts.slice(1).join('-') // cuid can contain hyphens

    const lessonId = active.id as string
    onLessonMove(lessonId, newDay, newPeriodId)
  }

  /* ---------- Desktop Grid ---------- */
  const gridCols = `80px repeat(${days.length}, 1fr)`

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Mobile day tabs */}
      <MobileDayTabs days={days} activeDay={mobileDay} onDayChange={setMobileDay} />

      {/* ============ DESKTOP GRID ============ */}
      <div className="hidden lg:block rounded-xl border border-border-subtle bg-bg-card overflow-hidden">
        <div
          className="grid"
          style={{ gridTemplateColumns: gridCols }}
        >
          {/* ---- Header row ---- */}
          <div className="bg-bg-surface px-3 py-2 text-xs font-medium uppercase text-text-muted text-center border-b border-border-subtle">
            {t('period')}
          </div>
          {days.map((day) => (
            <div
              key={day}
              className="bg-bg-surface px-3 py-2 text-xs font-medium uppercase text-text-muted text-center border-b border-l border-border-subtle"
            >
              {t(DAY_KEYS[day])}
            </div>
          ))}

          {/* ---- Period rows ---- */}
          {periods.map((period) => {
            if (period.isBreak) {
              return (
                <div
                  key={period.id}
                  className="bg-bg-surface/50 text-center text-xs text-text-muted italic py-2 border-t border-border-subtle"
                  style={{ gridColumn: `1 / -1` }}
                >
                  {period.breakLabel || t('break')}
                </div>
              )
            }

            return (
              <React.Fragment key={period.id}>
                {/* Period label */}
                <div className="bg-bg-surface px-3 py-2 text-xs text-text-muted border-t border-border-subtle flex flex-col justify-center">
                  <span className="font-medium text-text-secondary">{period.name}</span>
                  <span className="text-[10px] mt-0.5">
                    {period.startTime} - {period.endTime}
                  </span>
                </div>

                {/* Day cells */}
                {days.map((day) => {
                  const active = isPeriodActiveOnDay(period.applicableDays, day)

                  if (!active) {
                    return (
                      <div
                        key={cellId(day, period.id)}
                        className="border-t border-l border-border-subtle bg-bg-surface/20 min-h-[64px] flex items-center justify-center"
                      >
                        <span className="text-text-muted/25 text-xs select-none">—</span>
                      </div>
                    )
                  }

                  const cellLessons = getLessonsForCell(day, period.id)
                  const cId = cellId(day, period.id)

                  return (
                    <DroppableCell
                      key={cId}
                      id={cId}
                      isEmpty={cellLessons.length === 0}
                      readOnly={readOnly}
                      onEmptyClick={() => onEmptyCellClick(day, period.id)}
                    >
                      {cellLessons.map((lesson) => (
                        <LessonPill
                          key={lesson.id}
                          lesson={lesson as LessonPillData}
                          onClick={() => onLessonClick(lesson)}
                        />
                      ))}
                    </DroppableCell>
                  )
                })}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* ============ MOBILE LIST VIEW ============ */}
      <div className="lg:hidden rounded-xl border border-border-subtle bg-bg-card overflow-hidden">
        {periods.map((period) => {
          if (period.isBreak) {
            return (
              <div
                key={period.id}
                className="bg-bg-surface/50 text-center text-xs text-text-muted italic py-3 border-t border-border-subtle"
              >
                {period.breakLabel || t('break')}
              </div>
            )
          }

          // Skip period if not active on selected mobile day
          if (!isPeriodActiveOnDay(period.applicableDays, mobileDay)) {
            return null
          }

          const cellLessons = getLessonsForCell(mobileDay, period.id)
          const cId = cellId(mobileDay, period.id)

          return (
            <div key={period.id} className="border-t border-border-subtle">
              {/* Period header */}
              <div className="flex items-center gap-3 px-4 py-2 bg-bg-surface/30">
                <span className="text-xs font-medium text-text-secondary min-w-[60px]">
                  {period.name}
                </span>
                <span className="text-[10px] text-text-muted">
                  {period.startTime} - {period.endTime}
                </span>
              </div>

              {/* Cell */}
              <DroppableCell
                id={cId}
                isEmpty={cellLessons.length === 0}
                readOnly={readOnly}
                onEmptyClick={() => onEmptyCellClick(mobileDay, period.id)}
              >
                <div className="px-2 py-1">
                  {cellLessons.map((lesson) => (
                    <LessonPill
                      key={lesson.id}
                      lesson={lesson as LessonPillData}
                      onClick={() => onLessonClick(lesson)}
                    />
                  ))}
                </div>
              </DroppableCell>
            </div>
          )
        })}
      </div>

      {/* ============ DRAG OVERLAY ============ */}
      <DragOverlay dropAnimation={null}>
        {activeLesson ? (
          <div className="w-[180px] opacity-90 pointer-events-none">
            <LessonPill lesson={activeLesson as LessonPillData} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
