'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useUserStore } from '@/store/userStore'
import { isAdmin as checkIsAdmin } from '@/lib/permissions'
import { Link } from '@/i18n/navigation'
import {
  GraduationCap,
  Users,
  DoorOpen,
  ShieldCheck,
  CalendarDays,
  Plus,
  UserX,
  Download,
  Sparkles,
  AlertTriangle,
  BookOpen,
  ClipboardList,
  Calendar,
} from 'lucide-react'

interface DashboardLesson {
  id: string
  dayOfWeek: number
  isConflict: boolean
  conflictNote: string | null
  subject: { id: string; name: string; nameAr?: string | null; nameFr?: string | null; colorHex: string }
  teacher: { id: string; name: string }
  class: { id: string; name: string }
  room: { id: string; name: string } | null
  period: { id: string; name: string; startTime: string; endTime: string; order: number }
}

interface DashboardData {
  classCount: number
  teacherCount: number
  roomCount: number
  absencesToday: number
  coverage: number
  todayLessons: DashboardLesson[]
  timetableStatus: string | null
}

export default function DashboardPage() {
  const t = useTranslations()
  const locale = useLocale()
  const user = useUserStore((s) => s.user)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const adminUser = checkIsAdmin(user?.role || '')

  const getLocaleName = (row: { name: string; nameAr?: string | null; nameFr?: string | null }) => {
    if (locale === 'ar' && row.nameAr) return row.nameAr
    if (locale === 'fr' && row.nameFr) return row.nameFr
    return row.name
  }

  useEffect(() => {
    if (!user?.schoolId) return

    async function fetchDashboard() {
      try {
        // Build API URL with role-specific filters
        let url = `/api/dashboard?schoolId=${user!.schoolId}`
        if (user!.role === 'TEACHER' && user!.teacherId) {
          url += `&teacherId=${user!.teacherId}`
        } else if (user!.role === 'STUDENT' && user!.classId) {
          url += `&classId=${user!.classId}`
        }

        const res = await fetch(url)
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch {
        // Silently fail - will show empty state
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [user?.schoolId, user?.role, user?.teacherId, user?.classId])

  const hour = new Date().getHours()
  const greetingKey =
    hour < 12
      ? 'greeting_morning'
      : hour < 18
        ? 'greeting_afternoon'
        : 'greeting_evening'

  // ── Stat type ──
  type StatItem = { key: string; value: string | number; sub?: string; icon: React.ComponentType<{ className?: string }>; color: string }

  // ── Admin stats ──
  const adminStats: StatItem[] = [
    {
      key: 'stats_classes',
      value: data?.classCount ?? 0,
      icon: GraduationCap,
      color: 'text-accent',
    },
    {
      key: 'stats_teachers',
      value: data?.teacherCount ?? 0,
      sub: data
        ? `${data.absencesToday} ${t('dashboard.stats_absent_today')}`
        : undefined,
      icon: Users,
      color: 'text-success',
    },
    {
      key: 'stats_rooms',
      value: data?.roomCount ?? 0,
      icon: DoorOpen,
      color: 'text-warning',
    },
    {
      key: 'stats_coverage',
      value: data ? `${data.coverage}%` : '—',
      sub: t('dashboard.stats_this_term'),
      icon: ShieldCheck,
      color: 'text-violet',
    },
  ]

  // ── Teacher stats ──
  const teacherStats: StatItem[] = [
    {
      key: 'my_lessons_today',
      value: data?.todayLessons.length ?? 0,
      icon: BookOpen,
      color: 'text-accent',
    },
    {
      key: 'my_absences',
      value: data?.absencesToday ?? 0,
      icon: UserX,
      color: 'text-warning',
    },
    {
      key: 'stats_coverage',
      value: data ? `${data.coverage}%` : '—',
      icon: ShieldCheck,
      color: 'text-success',
    },
  ]

  // ── Student stats ──
  const studentStats: StatItem[] = [
    {
      key: 'lessons_today',
      value: data?.todayLessons.length ?? 0,
      icon: BookOpen,
      color: 'text-accent',
    },
    {
      key: 'stats_classes',
      value: data?.classCount ?? 0,
      icon: GraduationCap,
      color: 'text-success',
    },
  ]

  const stats = adminUser
    ? adminStats
    : user?.role === 'TEACHER'
      ? teacherStats
      : studentStats

  // ── Quick actions ──
  const adminActions = [
    { key: 'quick_view_timetable', icon: CalendarDays, href: '/timetable' },
    { key: 'quick_add_class', icon: Plus, href: '/settings' },
    { key: 'quick_manage_absences', icon: UserX, href: '/absences' },
    { key: 'quick_export', icon: Download, href: '/timetable' },
  ]

  const teacherActions = [
    { key: 'quick_view_timetable', icon: CalendarDays, href: '/timetable' },
    { key: 'quick_request_leave', icon: ClipboardList, href: '/leave' },
    { key: 'quick_view_calendar', icon: Calendar, href: '/calendar' },
  ]

  const studentActions = [
    { key: 'quick_view_timetable', icon: CalendarDays, href: '/timetable' },
    { key: 'quick_view_calendar', icon: Calendar, href: '/calendar' },
  ]

  const quickActions = adminUser
    ? adminActions
    : user?.role === 'TEACHER'
      ? teacherActions
      : studentActions

  // Determine conflict status
  const conflictCount =
    data?.todayLessons.filter((l) => l.isConflict).length ?? 0
  const hasConflicts = conflictCount > 0

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {t(`dashboard.${greetingKey}`)} {user?.name?.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {t('dashboard.week')} {getISOWeek()} &mdash;{' '}
          {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: stats.length }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-border-subtle bg-bg-card p-4"
            >
              <div className="h-4 w-20 rounded bg-bg-surface" />
              <div className="mt-3 h-8 w-12 rounded bg-bg-surface" />
              <div className="mt-2 h-3 w-24 rounded bg-bg-surface" />
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid grid-cols-2 gap-3 ${stats.length >= 4 ? 'lg:grid-cols-4' : `lg:grid-cols-${stats.length}`}`}>
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.key}
                className="rounded-xl border border-border-subtle bg-bg-card p-4 transition hover:border-border-default"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                    {t(`dashboard.${stat.key}`)}
                  </span>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-text-primary">
                  {stat.value}
                </p>
                {stat.sub && (
                  <p className="mt-0.5 text-xs text-text-muted">{stat.sub}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Conflict Status (admin only) */}
      {adminUser && (
        <>
          {loading ? (
            <div className="animate-pulse rounded-xl border border-border-subtle bg-bg-card p-4">
              <div className="h-5 w-48 rounded bg-bg-surface" />
            </div>
          ) : hasConflicts ? (
            <div className="flex items-center gap-3 rounded-xl border border-warning/20 bg-warning-dim p-4">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <p className="text-sm font-medium text-warning">
                {t('dashboard.conflicts_found', { count: conflictCount })}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success-dim p-4">
              <ShieldCheck className="h-5 w-5 text-success" />
              <p className="text-sm font-medium text-success">
                {t('dashboard.conflict_none')}
              </p>
            </div>
          )}
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold text-text-primary">
            {t('dashboard.quick_actions')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.key}
                  href={action.href}
                  className="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-card p-4 text-left text-sm font-medium text-text-primary transition hover:border-accent/30 hover:bg-bg-surface"
                >
                  <Icon className="h-5 w-5 text-accent" />
                  {t(`dashboard.${action.key}`)}
                </Link>
              )
            })}
          </div>
        </div>

        {/* AI Panel (admin/teacher only) */}
        {(adminUser || user?.role === 'TEACHER') && (
          <div className="rounded-xl border border-accent/20 bg-gradient-to-br from-accent-dim to-bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-text-primary">
                  {t('dashboard.ai_panel_title')}
                </h3>
                <p className="text-sm text-text-secondary">
                  {t('dashboard.ai_panel_sub')}
                </p>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <Link
                href="/ai"
                className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-accent-hover"
              >
                {adminUser ? t('dashboard.ai_generate') : t('dashboard.ai_chat')}
              </Link>
              {adminUser && (
                <Link
                  href="/ai"
                  className="rounded-lg border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-bg-surface2"
                >
                  {t('dashboard.ai_chat')}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Today's Overview */}
      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-text-primary">
          {t('dashboard.today_overview')}
        </h2>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-border-subtle bg-bg-card p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-16 rounded bg-bg-surface" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-bg-surface" />
                    <div className="h-3 w-48 rounded bg-bg-surface" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : data && data.todayLessons.length > 0 ? (
          <div className="space-y-2">
            {data.todayLessons.map((lesson) => (
              <div
                key={lesson.id}
                className={`flex items-center gap-4 rounded-xl border p-4 transition ${
                  lesson.isConflict
                    ? 'border-warning/30 bg-warning-dim'
                    : 'border-border-subtle bg-bg-card hover:border-border-default'
                }`}
              >
                {/* Time */}
                <div className="flex w-20 shrink-0 flex-col items-center text-center">
                  <span className="text-xs font-semibold text-text-primary">
                    {lesson.period.startTime}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {lesson.period.endTime}
                  </span>
                </div>

                {/* Divider with subject color dot */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: lesson.subject.colorHex }}
                  />
                  <div className="h-6 w-px bg-border-subtle" />
                </div>

                {/* Lesson details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {getLocaleName(lesson.subject)}
                    </p>
                    {lesson.isConflict && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-medium text-warning">
                        <AlertTriangle className="h-3 w-3" />
                        {t('timetable.conflict_badge')}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
                    <span>{lesson.teacher.name}</span>
                    <span>{lesson.class.name}</span>
                    {lesson.room && (
                      <span>
                        {t('dashboard.lesson_room')}: {lesson.room.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Period name badge */}
                <div className="hidden shrink-0 sm:block">
                  <span className="rounded-lg bg-bg-surface px-2.5 py-1 text-xs font-medium text-text-muted">
                    {lesson.period.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border-subtle bg-bg-card p-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarDays className="mb-3 h-10 w-10 text-text-muted" />
              <p className="text-sm text-text-muted">
                {t('dashboard.no_lessons_today')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Returns the ISO week number for the current date. */
function getISOWeek(): number {
  const date = new Date()
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  )
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
