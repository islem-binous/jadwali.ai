'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { BarChart3, Users, CalendarDays, UserCheck } from 'lucide-react'
import { useUserStore } from '@/store/userStore'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { FilterPill } from '@/components/ui/FilterPill'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ReportTab = 'faculty' | 'class' | 'leave' | 'substitute'

interface FacultyRow {
  id: string
  name: string
  colorHex: string
  totalPeriods: number
  maxPerDay: number
  maxPerWeek: number
  subjects: { name: string; colorHex: string; isPrimary: boolean }[]
  absenceCount: number
  periodsPerDay: number[]
}

interface ClassRow {
  id: string
  name: string
  grade: string | null
  totalPeriods: number
  studentCount: number
  periodsPerDay: number[]
  subjects: { name: string; colorHex: string; count: number }[]
}

interface LeaveSummary {
  total: number
  pending: number
  approved: number
  rejected: number
  totalDays: number
}

interface LeaveRow {
  id: string
  teacherName: string
  teacherColor: string
  type: string
  typeColor: string
  startDate: string
  endDate: string
  daysCount: number
  status: string
  reason: string | null
}

interface SubstituteRow {
  id: string
  date: string
  endDate: string | null
  teacherName: string
  teacherColor: string
  type: string
  status: string
  substituteId: string | null
  substituteTeacherId: string | null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function statusBadgeVariant(
  status: string
): 'warning' | 'success' | 'danger' | 'default' {
  if (status === 'APPROVED' || status === 'COVERED') return 'success'
  if (status === 'REJECTED' || status === 'UNCOVERED') return 'danger'
  if (status === 'PENDING') return 'warning'
  return 'default'
}

const absenceTypeMap: Record<string, string> = {
  SICK: 'Sick',
  PERSONAL: 'Personal',
  TRAINING: 'Training',
  CONFERENCE: 'Conference',
  MATERNITY: 'Maternity',
  MEDICAL: 'Medical',
  EMERGENCY: 'Emergency',
  OTHER: 'Other',
}

/* ------------------------------------------------------------------ */
/*  Skeletons                                                          */
/* ------------------------------------------------------------------ */

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-border-subtle bg-bg-card p-4"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function ReportsPage() {
  const t = useTranslations()
  const toast = useToast()
  const user = useUserStore((s) => s.user)
  const schoolId = user?.schoolId

  const [tab, setTab] = useState<ReportTab>('faculty')
  const [loading, setLoading] = useState(true)

  // Faculty data
  const [faculty, setFaculty] = useState<FacultyRow[]>([])
  // Class data
  const [classes, setClasses] = useState<ClassRow[]>([])
  // Leave data
  const [leaveSummary, setLeaveSummary] = useState<LeaveSummary>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalDays: 0,
  })
  const [leaveRequests, setLeaveRequests] = useState<LeaveRow[]>([])
  // Substitute data
  const [substitutes, setSubstitutes] = useState<SubstituteRow[]>([])

  /* ---------------------------------------------------------------- */
  /*  Data Fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchReport = useCallback(
    async (reportType: ReportTab) => {
      if (!schoolId) return
      setLoading(true)
      try {
        const res = await fetch(
          `/api/reports?schoolId=${schoolId}&type=${reportType}`
        )
        if (!res.ok) throw new Error('Fetch failed')
        const data = await res.json()

        if (reportType === 'faculty') {
          setFaculty(data)
        } else if (reportType === 'class') {
          setClasses(data)
        } else if (reportType === 'leave') {
          setLeaveSummary(data.summary)
          setLeaveRequests(data.requests)
        } else if (reportType === 'substitute') {
          setSubstitutes(data)
        }
      } catch {
        toast.error(t('app.error'))
      } finally {
        setLoading(false)
      }
    },
    [schoolId, t, toast]
  )

  useEffect(() => {
    fetchReport(tab)
  }, [tab, fetchReport])

  /* ---------------------------------------------------------------- */
  /*  Tab content renderers                                            */
  /* ---------------------------------------------------------------- */

  function renderFacultyTab() {
    if (faculty.length === 0) {
      return (
        <div className="rounded-xl border border-border-subtle bg-bg-card p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Users className="mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">
              {t('reports.no_data')}
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="px-4 py-3 text-left font-medium text-text-muted">
                {t('reports.col_name')}
              </th>
              <th className="px-4 py-3 text-center font-medium text-text-muted">
                {t('reports.col_total_periods')}
              </th>
              <th className="px-4 py-3 text-center font-medium text-text-muted">
                {t('reports.col_max_day')}
              </th>
              <th className="px-4 py-3 text-center font-medium text-text-muted">
                {t('reports.col_max_week')}
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">
                {t('teachers.subjects')}
              </th>
              <th className="px-4 py-3 text-center font-medium text-text-muted">
                {t('reports.col_absences')}
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-text-muted sm:table-cell">
                {t('reports.col_periods_day')}
              </th>
            </tr>
          </thead>
          <tbody>
            {faculty.map((row) => {
              const maxBar = Math.max(...row.periodsPerDay, 1)
              return (
                <tr
                  key={row.id}
                  className="border-b border-border-subtle last:border-0 hover:bg-bg-surface/50 transition"
                >
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: row.colorHex }}
                      >
                        {getInitials(row.name)}
                      </div>
                      <span className="font-medium text-text-primary">
                        {row.name}
                      </span>
                    </div>
                  </td>
                  {/* Total Periods */}
                  <td className="px-4 py-3 text-center text-text-secondary">
                    {row.totalPeriods}
                  </td>
                  {/* Max/Day */}
                  <td className="px-4 py-3 text-center text-text-secondary">
                    {row.maxPerDay}
                  </td>
                  {/* Max/Week */}
                  <td className="px-4 py-3 text-center text-text-secondary">
                    {row.maxPerWeek}
                  </td>
                  {/* Subjects */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.subjects.map((s, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                          style={{ backgroundColor: s.colorHex }}
                        >
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  {/* Absences */}
                  <td className="px-4 py-3 text-center">
                    {row.absenceCount > 0 ? (
                      <Badge variant="danger" size="sm">
                        {row.absenceCount}
                      </Badge>
                    ) : (
                      <span className="text-text-muted">0</span>
                    )}
                  </td>
                  {/* Periods per day bar */}
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <div className="flex items-end gap-1">
                      {row.periodsPerDay.map((count, dayIdx) => (
                        <div key={dayIdx} className="flex flex-col items-center gap-0.5">
                          <div
                            className="w-5 rounded-sm transition-all"
                            style={{
                              height: `${Math.max((count / maxBar) * 24, 2)}px`,
                              backgroundColor: row.colorHex,
                              opacity: count > 0 ? 1 : 0.2,
                            }}
                          />
                          <span className="text-[9px] text-text-muted">
                            {DAY_LABELS[dayIdx]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  function renderClassTab() {
    if (classes.length === 0) {
      return (
        <div className="rounded-xl border border-border-subtle bg-bg-card p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <BarChart3 className="mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">
              {t('reports.no_data')}
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="px-4 py-3 text-left font-medium text-text-muted">
                {t('reports.col_class_name')}
              </th>
              <th className="px-4 py-3 text-center font-medium text-text-muted">
                {t('reports.col_grade')}
              </th>
              <th className="px-4 py-3 text-center font-medium text-text-muted">
                {t('reports.col_total_periods')}
              </th>
              <th className="px-4 py-3 text-center font-medium text-text-muted">
                {t('reports.col_students')}
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-text-muted sm:table-cell">
                {t('reports.col_periods_day')}
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">
                {t('teachers.subjects')}
              </th>
            </tr>
          </thead>
          <tbody>
            {classes.map((row) => {
              const maxBar = Math.max(...row.periodsPerDay, 1)
              return (
                <tr
                  key={row.id}
                  className="border-b border-border-subtle last:border-0 hover:bg-bg-surface/50 transition"
                >
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-center text-text-secondary">
                    {row.grade || '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-text-secondary">
                    {row.totalPeriods}
                  </td>
                  <td className="px-4 py-3 text-center text-text-secondary">
                    {row.studentCount}
                  </td>
                  {/* Periods per day bar */}
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <div className="flex items-end gap-1">
                      {row.periodsPerDay.map((count, dayIdx) => (
                        <div key={dayIdx} className="flex flex-col items-center gap-0.5">
                          <div
                            className="w-5 rounded-sm bg-accent transition-all"
                            style={{
                              height: `${Math.max((count / maxBar) * 24, 2)}px`,
                              opacity: count > 0 ? 1 : 0.2,
                            }}
                          />
                          <span className="text-[9px] text-text-muted">
                            {DAY_LABELS[dayIdx]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  {/* Subject dots */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {row.subjects.map((s, i) => (
                        <div
                          key={i}
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: s.colorHex }}
                          title={`${s.name} (${s.count})`}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  function renderLeaveTab() {
    return (
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card padding="sm">
            <p className="text-xs text-text-muted">{t('reports.leave_total')}</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">
              {leaveSummary.total}
            </p>
          </Card>
          <Card padding="sm">
            <p className="text-xs text-text-muted">{t('reports.leave_pending')}</p>
            <p className="mt-1 text-2xl font-bold text-warning">
              {leaveSummary.pending}
            </p>
          </Card>
          <Card padding="sm">
            <p className="text-xs text-text-muted">{t('reports.leave_approved')}</p>
            <p className="mt-1 text-2xl font-bold text-success">
              {leaveSummary.approved}
            </p>
          </Card>
          <Card padding="sm">
            <p className="text-xs text-text-muted">{t('reports.leave_days_taken')}</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">
              {leaveSummary.totalDays}
            </p>
          </Card>
        </div>

        {/* Leave table */}
        {leaveRequests.length === 0 ? (
          <div className="rounded-xl border border-border-subtle bg-bg-card p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <CalendarDays className="mb-3 h-10 w-10 text-text-muted" />
              <p className="text-sm text-text-muted">
                {t('reports.no_data')}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="px-4 py-3 text-left font-medium text-text-muted">
                    {t('absences.teacher')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-text-muted">
                    {t('absences.type')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-text-muted">
                    {t('reports.col_start')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-text-muted">
                    {t('reports.col_end')}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-text-muted">
                    {t('reports.col_days')}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-text-muted">
                    {t('reports.col_status')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border-subtle last:border-0 hover:bg-bg-surface/50 transition"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: row.teacherColor }}
                        >
                          {getInitials(row.teacherName)}
                        </div>
                        <span className="font-medium text-text-primary">
                          {row.teacherName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default" size="sm">
                        {row.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {formatDate(row.startDate)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {formatDate(row.endDate)}
                    </td>
                    <td className="px-4 py-3 text-center text-text-secondary">
                      {row.daysCount}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={statusBadgeVariant(row.status)} size="sm">
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  function renderSubstituteTab() {
    if (substitutes.length === 0) {
      return (
        <div className="rounded-xl border border-border-subtle bg-bg-card p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <UserCheck className="mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">
              {t('reports.no_data')}
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="px-4 py-3 text-left font-medium text-text-muted">
                {t('absences.date')}
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">
                {t('reports.col_absent_teacher')}
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">
                {t('absences.type')}
              </th>
              <th className="px-4 py-3 text-center font-medium text-text-muted">
                {t('reports.col_status')}
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">
                {t('reports.col_substitute')}
              </th>
            </tr>
          </thead>
          <tbody>
            {substitutes.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border-subtle last:border-0 hover:bg-bg-surface/50 transition"
              >
                <td className="px-4 py-3 text-text-secondary">
                  {formatDate(row.date)}
                  {row.endDate && row.endDate !== row.date && (
                    <span className="text-text-muted">
                      {' '}
                      - {formatDate(row.endDate)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: row.teacherColor }}
                    >
                      {getInitials(row.teacherName)}
                    </div>
                    <span className="font-medium text-text-primary">
                      {row.teacherName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="default" size="sm">
                    {absenceTypeMap[row.type] || row.type}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={statusBadgeVariant(row.status)} size="sm">
                    {row.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {row.substituteId ? (
                    <Badge variant="success" size="sm">
                      {t('absences.covered')}
                    </Badge>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {t('reports.title')}
        </h1>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterPill
          label={t('reports.tab_faculty')}
          active={tab === 'faculty'}
          onClick={() => setTab('faculty')}
        />
        <FilterPill
          label={t('reports.tab_classes')}
          active={tab === 'class'}
          onClick={() => setTab('class')}
        />
        <FilterPill
          label={t('reports.tab_leave')}
          active={tab === 'leave'}
          onClick={() => setTab('leave')}
        />
        <FilterPill
          label={t('reports.tab_substitutes')}
          active={tab === 'substitute'}
          onClick={() => setTab('substitute')}
        />
      </div>

      {/* Tab content */}
      {loading ? (
        <TableSkeleton />
      ) : (
        <>
          {tab === 'faculty' && renderFacultyTab()}
          {tab === 'class' && renderClassTab()}
          {tab === 'leave' && renderLeaveTab()}
          {tab === 'substitute' && renderSubstituteTab()}
        </>
      )}
    </div>
  )
}
