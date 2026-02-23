'use client'

import React, { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CalendarEvent {
  id: string
  title: string
  startDate: string
  endDate: string
  colorHex: string
  type: string
}

interface MiniCalendarProps {
  currentMonth: Date
  events: CalendarEvent[]
  onDateSelect: (date: Date) => void
  onMonthChange: (date: Date) => void
  selectedDate: Date | null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function dateInRange(date: Date, start: Date, end: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  return d >= s && d <= e
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MiniCalendar({
  currentMonth,
  events,
  onDateSelect,
  onMonthChange,
  selectedDate,
}: MiniCalendarProps) {
  const today = useMemo(() => new Date(), [])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  /* Build grid of day cells */
  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDow = firstDay.getDay() // 0=Sun

    const grid: Array<{ date: Date; inMonth: boolean }> = []

    // Leading days from prev month
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      grid.push({ date: d, inMonth: false })
    }

    // Days of current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      grid.push({ date: new Date(year, month, d), inMonth: true })
    }

    // Trailing days to fill 6-row grid (42 cells) or at least complete the row
    const remaining = 7 - (grid.length % 7)
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        grid.push({
          date: new Date(year, month + 1, i),
          inMonth: false,
        })
      }
    }

    return grid
  }, [year, month])

  /* Map date -> event colors for dot display */
  const eventsByDate = useMemo(() => {
    const map = new Map<string, string[]>()

    for (const ev of events) {
      const start = new Date(ev.startDate)
      const end = new Date(ev.endDate)

      // Iterate each day of the event and record color
      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())

      while (cursor <= endDay) {
        const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`
        const existing = map.get(key) ?? []
        if (existing.length < 3) {
          existing.push(ev.colorHex)
          map.set(key, existing)
        }
        cursor.setDate(cursor.getDate() + 1)
      }
    }

    return map
  }, [events])

  /* Navigation */
  const goToPrev = () => onMonthChange(new Date(year, month - 1, 1))
  const goToNext = () => onMonthChange(new Date(year, month + 1, 1))

  const monthLabel = currentMonth.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card p-4">
      {/* Navigation bar */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={goToPrev}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-bg-surface transition"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} className="text-text-secondary" />
        </button>
        <span className="text-sm font-semibold text-text-primary font-display">
          {monthLabel}
        </span>
        <button
          onClick={goToNext}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-bg-surface transition"
          aria-label="Next month"
        >
          <ChevronRight size={16} className="text-text-secondary" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7">
        {DAY_LABELS.map((day) => (
          <div
            key={day}
            className="text-xs font-medium text-text-muted text-center py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map(({ date, inMonth }, idx) => {
          const isToday = isSameDay(date, today)
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
          const dots = eventsByDate.get(key) ?? []

          return (
            <div key={idx} className="flex justify-center py-0.5">
              <button
                onClick={() => onDateSelect(date)}
                className={`
                  h-9 w-9 rounded-lg flex flex-col items-center justify-center text-sm cursor-pointer transition
                  ${!inMonth ? 'opacity-30' : ''}
                  ${isSelected ? 'bg-accent text-white' : 'hover:bg-bg-surface'}
                  ${isToday && !isSelected ? 'ring-1 ring-accent' : ''}
                `}
              >
                <span
                  className={`leading-none ${
                    inMonth && !isSelected
                      ? 'text-text-primary'
                      : ''
                  }`}
                >
                  {date.getDate()}
                </span>
                {dots.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dots.map((color, i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor: isSelected ? 'white' : color,
                        }}
                      />
                    ))}
                  </div>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
