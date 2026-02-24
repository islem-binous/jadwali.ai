'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useUserStore } from '@/store/userStore'
import {
  Building2,
  GraduationCap,
  Bell,
  Shield,
  Database,
  AlertTriangle,
  Save,
  ChevronDown,
  ChevronUp,
  Lock,
  Download,
  Upload,
  Trash2,
  Loader2,
  ClipboardList,
  UserCheck,
  Plus,
  Pencil,
  X,
  BookOpen,
  Copy,
  Check,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'
import { useRouter } from '@/i18n/navigation'
import { isAdmin as checkIsAdmin } from '@/lib/permissions'
import { ImportModal } from '@/components/ui/ImportModal'
import { triggerExport } from '@/lib/export-helpers'
import { HelpTooltip } from '@/components/ui/HelpTooltip'

interface PeriodData {
  id: string
  name: string
  startTime: string
  endTime: string
  order: number
  isBreak: boolean
  breakLabel: string | null
  applicableDays: string
}

interface SchoolData {
  id: string
  name: string
  slug: string
  country: string | null
  timezone: string
  language: string
  schoolDays: string
  periods: PeriodData[]
}

const TIMEZONES = [
  'Africa/Tunis',
  'Africa/Algiers',
  'Africa/Casablanca',
  'Africa/Cairo',
  'Europe/Paris',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Istanbul',
  'Asia/Riyadh',
  'Asia/Dubai',
  'Asia/Beirut',
  'Asia/Baghdad',
  'America/New_York',
  'America/Chicago',
]

const LANGUAGES = [
  { value: 'AR', label: 'العربية' },
  { value: 'FR', label: 'Français' },
  { value: 'EN', label: 'English' },
]

const SCHOOL_DAYS = [
  { key: 'day_mon_short', day: 0, full: 'day_mon' },
  { key: 'day_tue_short', day: 1, full: 'day_tue' },
  { key: 'day_wed_short', day: 2, full: 'day_wed' },
  { key: 'day_thu_short', day: 3, full: 'day_thu' },
  { key: 'day_fri_short', day: 4, full: 'day_fri' },
  { key: 'day_sat_short', day: 5, full: 'day_sat' },
]

const LANG_TO_LOCALE: Record<string, string> = { AR: 'ar', FR: 'fr', EN: 'en' }

export default function SettingsPage() {
  const t = useTranslations()
  const user = useUserStore((s) => s.user)
  const router = useRouter()
  const adminUser = checkIsAdmin(user?.role || '')

  // Section collapse state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    school: true,
    academic: true,
    grades: false,
    notifications: true,
    leaveTypes: false,
    substituteSettings: false,
    security: false,
    data: false,
    danger: false,
  })

  const [showExportPicker, setShowExportPicker] = useState(false)
  const [showImportPicker, setShowImportPicker] = useState(false)
  const [importType, setImportType] = useState<'teachers' | 'subjects' | 'classes' | 'rooms' | null>(null)

  const toast = useToast()

  // School data
  const [school, setSchool] = useState<SchoolData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // School form state
  const [schoolName, setSchoolName] = useState('')
  const [country, setCountry] = useState('')
  const [timezone, setTimezone] = useState('Africa/Tunis')
  const [language, setLanguage] = useState('FR')

  // School days (client-side only)
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5])

  // Notification toggles (localStorage-based)
  const [notifAbsences, setNotifAbsences] = useState(true)
  const [notifConflicts, setNotifConflicts] = useState(true)
  const [notifSubstitutes, setNotifSubstitutes] = useState(true)

  // 2FA toggle (placeholder)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  // Leave types
  interface LeaveTypeItem {
    id: string
    name: string
    nameAr?: string | null
    nameFr?: string | null
    maxDaysPerYear: number
    colorHex: string
    requiresApproval: boolean
  }
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeItem[]>([])
  const [leaveTypesLoading, setLeaveTypesLoading] = useState(false)
  const [showLeaveTypeModal, setShowLeaveTypeModal] = useState(false)
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveTypeItem | null>(null)
  const [ltName, setLtName] = useState('')
  const [ltMaxDays, setLtMaxDays] = useState(12)
  const [ltColor, setLtColor] = useState('#F59E0B')
  const [ltRequiresApproval, setLtRequiresApproval] = useState(true)

  // Substitute settings (localStorage-based)
  const [subAutoAssign, setSubAutoAssign] = useState(false)
  const [subMaxCoverPeriods, setSubMaxCoverPeriods] = useState(4)

  // Period editing
  const [showPeriodModal, setShowPeriodModal] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<PeriodData | null>(null)
  const [pName, setPName] = useState('')
  const [pStart, setPStart] = useState('08:00')
  const [pEnd, setPEnd] = useState('09:00')
  const [pIsBreak, setPIsBreak] = useState(false)
  const [pBreakLabel, setPBreakLabel] = useState('')
  const [pApplicableDays, setPApplicableDays] = useState<number[]>([])
  const [academicSaving, setAcademicSaving] = useState(false)

  // Grades & Curriculum
  interface GradeItem {
    id: string
    name: string
    nameAr?: string | null
    nameFr?: string | null
    level: number
    curriculum: { id: string; subjectId: string; hoursPerWeek: number; subject: { id: string; name: string } }[]
    teachers: { id: string; teacherId: string; teacher: { id: string; name: string } }[]
    _count: { classes: number }
  }
  interface SubjectItem { id: string; name: string; category: string }
  interface TeacherItem { id: string; name: string }

  const [grades, setGrades] = useState<GradeItem[]>([])
  const [gradesLoading, setGradesLoading] = useState(false)
  const [showGradeModal, setShowGradeModal] = useState(false)
  const [editingGrade, setEditingGrade] = useState<GradeItem | null>(null)
  const [gName, setGName] = useState('')
  const [gLevel, setGLevel] = useState(1)
  const [gCurriculum, setGCurriculum] = useState<Record<string, number>>({}) // subjectId → hours
  const [gTeacherIds, setGTeacherIds] = useState<string[]>([])
  const [allSubjects, setAllSubjects] = useState<SubjectItem[]>([])
  const [allTeachers, setAllTeachers] = useState<TeacherItem[]>([])
  const [gradeSaving, setGradeSaving] = useState(false)

  // School code copy state
  const [codeCopied, setCodeCopied] = useState(false)

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Load notification preferences from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('jadwali-notifications')
      if (stored) {
        const prefs = JSON.parse(stored)
        setNotifAbsences(prefs.absences ?? true)
        setNotifConflicts(prefs.conflicts ?? true)
        setNotifSubstitutes(prefs.substitutes ?? true)
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // Save notification preferences to localStorage
  const saveNotificationPrefs = useCallback(
    (absences: boolean, conflicts: boolean, substitutes: boolean) => {
      try {
        localStorage.setItem(
          'jadwali-notifications',
          JSON.stringify({ absences, conflicts, substitutes })
        )
      } catch {
        // Ignore storage errors
      }
    },
    []
  )

  // Fetch school data
  useEffect(() => {
    if (!user?.schoolId) return

    async function fetchSchool() {
      try {
        const res = await fetch(`/api/school?schoolId=${user!.schoolId}`)
        if (res.ok) {
          const data: SchoolData = await res.json()
          setSchool(data)
          setSchoolName(data.name)
          setCountry(data.country ?? '')
          setTimezone(data.timezone)
          setLanguage(data.language)
          try {
            const days = JSON.parse(data.schoolDays || '[0,1,2,3,4,5]')
            setSelectedDays(Array.isArray(days) ? days : [0,1,2,3,4,5])
          } catch { setSelectedDays([0,1,2,3,4,5]) }
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }

    fetchSchool()
  }, [user?.schoolId])

  // Save school info
  const handleSaveSchool = async () => {
    if (!school) return
    setSaving(true)
    setSaveSuccess(false)

    try {
      const res = await fetch('/api/school', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: school.id,
          name: schoolName,
          country: country || null,
          timezone,
          language,
        }),
      })

      if (res.ok) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
        // Switch locale if language changed
        const newLocale = LANG_TO_LOCALE[language]
        if (newLocale) {
          router.replace('/settings', { locale: newLocale as 'en' | 'fr' | 'ar' })
        }
      }
    } catch {
      // Silently fail
    } finally {
      setSaving(false)
    }
  }

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  // Save academic setup (school days)
  const handleSaveAcademic = async () => {
    if (!school) return
    setAcademicSaving(true)
    try {
      const res = await fetch('/api/school', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: school.id, schoolDays: selectedDays }),
      })
      if (res.ok) toast.success('Academic setup saved')
      else toast.error('Failed to save')
    } catch { toast.error('Failed to save') }
    finally { setAcademicSaving(false) }
  }

  // Period CRUD
  const openPeriodForm = (p?: PeriodData) => {
    if (p) {
      setEditingPeriod(p)
      setPName(p.name)
      setPStart(p.startTime)
      setPEnd(p.endTime)
      setPIsBreak(p.isBreak)
      setPBreakLabel(p.breakLabel ?? '')
      try {
        const days = JSON.parse(p.applicableDays || '[]')
        setPApplicableDays(Array.isArray(days) ? days : [])
      } catch { setPApplicableDays([]) }
    } else {
      setEditingPeriod(null)
      const periods = school?.periods ?? []
      const nextOrder = periods.length > 0 ? Math.max(...periods.map(pp => pp.order)) + 1 : 1
      const lastEnd = periods.length > 0 ? periods[periods.length - 1].endTime : '08:00'
      setPName(`Period ${nextOrder}`)
      setPStart(lastEnd)
      const [h, m] = lastEnd.split(':').map(Number)
      const endH = h + 1
      setPEnd(`${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      setPIsBreak(false)
      setPBreakLabel('')
      setPApplicableDays([])
    }
    setShowPeriodModal(true)
  }

  const handleSavePeriod = async () => {
    if (!pName.trim() || !user?.schoolId || !school) return
    try {
      const periods = school.periods
      const order = editingPeriod ? editingPeriod.order : (periods.length > 0 ? Math.max(...periods.map(p => p.order)) + 1 : 1)
      const method = editingPeriod ? 'PUT' : 'POST'
      const body = editingPeriod
        ? { id: editingPeriod.id, name: pName, startTime: pStart, endTime: pEnd, isBreak: pIsBreak, breakLabel: pIsBreak ? pBreakLabel : null, order, applicableDays: pIsBreak ? [] : pApplicableDays }
        : { schoolId: user.schoolId, name: pName, startTime: pStart, endTime: pEnd, isBreak: pIsBreak, breakLabel: pIsBreak ? pBreakLabel : null, order, applicableDays: pIsBreak ? [] : pApplicableDays }
      const res = await fetch('/api/periods', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success(editingPeriod ? 'Period updated' : 'Period added')
        setShowPeriodModal(false)
        // Refresh school data to get updated periods
        const schoolRes = await fetch(`/api/school?schoolId=${user.schoolId}`)
        if (schoolRes.ok) {
          const data: SchoolData = await schoolRes.json()
          setSchool(data)
        }
      }
    } catch { toast.error('Failed to save period') }
  }

  const handleDeletePeriod = async (id: string) => {
    try {
      const res = await fetch(`/api/periods?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Period deleted')
        if (user?.schoolId) {
          const schoolRes = await fetch(`/api/school?schoolId=${user.schoolId}`)
          if (schoolRes.ok) setSchool(await schoolRes.json())
        }
      }
    } catch { toast.error('Failed to delete period') }
  }

  // Fetch leave types
  const fetchLeaveTypes = useCallback(async () => {
    if (!user?.schoolId) return
    setLeaveTypesLoading(true)
    try {
      const res = await fetch(`/api/leave-types?schoolId=${user.schoolId}`)
      if (res.ok) setLeaveTypes(await res.json())
    } catch { /* silent */ } finally { setLeaveTypesLoading(false) }
  }, [user?.schoolId])

  useEffect(() => { fetchLeaveTypes() }, [fetchLeaveTypes])

  // Fetch grades, subjects, teachers for grade management
  const fetchGrades = useCallback(async () => {
    if (!user?.schoolId) return
    setGradesLoading(true)
    try {
      const [gradesRes, subsRes, teachersRes] = await Promise.all([
        fetch(`/api/grades?schoolId=${user.schoolId}`),
        fetch(`/api/subjects?schoolId=${user.schoolId}`),
        fetch(`/api/teachers?schoolId=${user.schoolId}`),
      ])
      if (gradesRes.ok) setGrades(await gradesRes.json())
      if (subsRes.ok) setAllSubjects(await subsRes.json())
      if (teachersRes.ok) {
        const tData = await teachersRes.json()
        setAllTeachers(tData.map((t: TeacherItem & Record<string, unknown>) => ({ id: t.id, name: t.name })))
      }
    } catch { /* silent */ }
    finally { setGradesLoading(false) }
  }, [user?.schoolId])

  useEffect(() => { fetchGrades() }, [fetchGrades])

  const openGradeForm = (g?: GradeItem) => {
    if (g) {
      setEditingGrade(g)
      setGName(g.name)
      setGLevel(g.level)
      const curr: Record<string, number> = {}
      g.curriculum.forEach((c) => { curr[c.subjectId] = c.hoursPerWeek })
      setGCurriculum(curr)
      setGTeacherIds(g.teachers.map((t) => t.teacherId))
    } else {
      setEditingGrade(null)
      setGName('')
      setGLevel(grades.length + 1)
      setGCurriculum({})
      setGTeacherIds([])
    }
    setShowGradeModal(true)
  }

  const handleSaveGrade = async () => {
    if (!gName.trim() || !user?.schoolId) return
    setGradeSaving(true)
    try {
      // Save/update grade
      const method = editingGrade ? 'PUT' : 'POST'
      const body = editingGrade
        ? { id: editingGrade.id, name: gName, level: gLevel }
        : { schoolId: user.schoolId, name: gName, level: gLevel }
      const res = await fetch('/api/grades', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) { toast.error('Failed to save grade'); return }
      const gradeData = await res.json()
      const gradeId = gradeData.id

      // Save curriculum (subjects + hours)
      const subjects = Object.entries(gCurriculum)
        .filter(([, h]) => h > 0)
        .map(([subjectId, hoursPerWeek]) => ({ subjectId, hoursPerWeek }))
      await fetch('/api/grades/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradeId, subjects }),
      })

      // Save teacher assignments
      await fetch('/api/grades/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradeId, teacherIds: gTeacherIds }),
      })

      toast.success(editingGrade ? 'Grade updated' : 'Grade created')
      setShowGradeModal(false)
      fetchGrades()
    } catch { toast.error('Failed to save grade') }
    finally { setGradeSaving(false) }
  }

  const handleDeleteGrade = async (id: string) => {
    try {
      const res = await fetch(`/api/grades?id=${id}`, { method: 'DELETE' })
      if (res.ok) { toast.success('Grade deleted'); fetchGrades() }
      else toast.error('Failed to delete')
    } catch { toast.error('Failed to delete grade') }
  }

  // Load substitute settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('jadwali-sub-settings')
      if (stored) {
        const prefs = JSON.parse(stored)
        setSubAutoAssign(prefs.autoAssign ?? false)
        setSubMaxCoverPeriods(prefs.maxCoverPeriods ?? 4)
      }
    } catch { /* */ }
  }, [])

  const saveSubSettings = (autoAssign: boolean, maxCoverPeriods: number) => {
    try {
      localStorage.setItem('jadwali-sub-settings', JSON.stringify({ autoAssign, maxCoverPeriods }))
    } catch { /* */ }
  }

  const openLeaveTypeForm = (lt?: LeaveTypeItem) => {
    if (lt) {
      setEditingLeaveType(lt)
      setLtName(lt.name)
      setLtMaxDays(lt.maxDaysPerYear)
      setLtColor(lt.colorHex)
      setLtRequiresApproval(lt.requiresApproval)
    } else {
      setEditingLeaveType(null)
      setLtName('')
      setLtMaxDays(12)
      setLtColor('#F59E0B')
      setLtRequiresApproval(true)
    }
    setShowLeaveTypeModal(true)
  }

  const handleSaveLeaveType = async () => {
    if (!ltName.trim() || !user?.schoolId) return
    try {
      const method = editingLeaveType ? 'PUT' : 'POST'
      const body = editingLeaveType
        ? { id: editingLeaveType.id, name: ltName, maxDaysPerYear: ltMaxDays, colorHex: ltColor, requiresApproval: ltRequiresApproval }
        : { schoolId: user.schoolId, name: ltName, maxDaysPerYear: ltMaxDays, colorHex: ltColor, requiresApproval: ltRequiresApproval }
      const res = await fetch('/api/leave-types', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success(editingLeaveType ? 'Updated' : 'Created')
        setShowLeaveTypeModal(false)
        fetchLeaveTypes()
      }
    } catch { toast.error('Failed to save') }
  }

  const handleDeleteLeaveType = async (id: string) => {
    try {
      const res = await fetch(`/api/leave-types?id=${id}`, { method: 'DELETE' })
      if (res.ok) { toast.success('Deleted'); fetchLeaveTypes() }
    } catch { toast.error('Failed to delete') }
  }

  // Count non-break periods
  const periodCount =
    school?.periods.filter((p) => !p.isBreak).length ?? 0

  return (
    <div className="space-y-6">
      {/* Title */}
      <h1 className="font-display text-2xl font-bold text-text-primary">
        {t('settings.title')}
      </h1>

      {/* 1. School Information — Admin only */}
      {adminUser && (<section className="rounded-xl border border-border-subtle bg-bg-card">
        <button
          onClick={() => toggleSection('school')}
          className="flex w-full items-center justify-between p-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-dim">
              <Building2 className="h-4.5 w-4.5 text-accent" />
            </div>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {t('settings.school')}
            </h2>
          </div>
          {openSections.school ? (
            <ChevronUp className="h-5 w-5 text-text-muted" />
          ) : (
            <ChevronDown className="h-5 w-5 text-text-muted" />
          )}
        </button>

        {openSections.school && (
          <div className="border-t border-border-subtle px-6 pb-6 pt-4">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="mb-1.5 h-4 w-24 rounded bg-bg-surface" />
                    <div className="h-10 w-full rounded-lg bg-bg-surface" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* School Name */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    {t('settings.school_name')}
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                  />
                </div>

                {/* School Code */}
                {school?.slug && (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      {t('settings.school_code')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={school.slug}
                        className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary font-mono cursor-default"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(school.slug)
                          setCodeCopied(true)
                          setTimeout(() => setCodeCopied(false), 2000)
                        }}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary hover:bg-bg-surface2 transition"
                      >
                        {codeCopied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                        {codeCopied ? t('settings.copied') : t('settings.copy')}
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-text-muted">
                      {t('settings.school_code_desc')}
                    </p>
                  </div>
                )}

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    {t('settings.country')}
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Tunisia"
                    className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                  />
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    {t('settings.timezone')}
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Default Language */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    {t('settings.language')}
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Save Button */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSaveSchool}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {t('app.save')}
                  </button>
                  {saveSuccess && (
                    <span className="text-sm font-medium text-success">
                      Saved successfully
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>)}

      {/* 2. Academic Setup — Admin only */}
      {adminUser && (<><section className="rounded-xl border border-border-subtle bg-bg-card">
        <button
          onClick={() => toggleSection('academic')}
          className="flex w-full items-center justify-between p-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
              <GraduationCap className="h-4.5 w-4.5 text-success" />
            </div>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {t('settings.academic')}
            </h2>
          </div>
          {openSections.academic ? (
            <ChevronUp className="h-5 w-5 text-text-muted" />
          ) : (
            <ChevronDown className="h-5 w-5 text-text-muted" />
          )}
        </button>

        {openSections.academic && (
          <div className="border-t border-border-subtle px-6 pb-6 pt-4">
            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-10 w-full rounded-lg bg-bg-surface" />
                <div className="h-10 w-full rounded-lg bg-bg-surface" />
              </div>
            ) : (
              <div className="space-y-5">
                {/* School days checkboxes */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    {t('settings.school_days')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SCHOOL_DAYS.map((sd) => (
                      <button
                        key={sd.day}
                        onClick={() => toggleDay(sd.day)}
                        className={`flex h-10 w-12 items-center justify-center rounded-lg border text-sm font-medium transition ${
                          selectedDays.includes(sd.day)
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border-default bg-bg-surface text-text-muted hover:border-border-default hover:text-text-secondary'
                        }`}
                      >
                        {t(`timetable.${sd.key}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Periods per day */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-text-secondary">
                      {t('settings.periods_per_day')} ({periodCount})
                    </label>
                    <button
                      onClick={() => openPeriodForm()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:bg-accent-hover"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t('app.add')}
                    </button>
                  </div>
                  {school && school.periods.length > 0 ? (
                    <div className="space-y-1.5">
                      {school.periods.map((period) => (
                        <div
                          key={period.id}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                            period.isBreak
                              ? 'border-warning/30 bg-warning/5'
                              : 'border-border-subtle bg-bg-surface'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-text-muted w-24">
                              {period.startTime} - {period.endTime}
                            </span>
                            <span className="text-sm font-medium text-text-primary">
                              {period.name}
                            </span>
                            {period.isBreak && (
                              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                                {period.breakLabel || t('timetable.break')}
                              </span>
                            )}
                            {!period.isBreak && (() => {
                              try {
                                const days: number[] = JSON.parse(period.applicableDays || '[]')
                                if (!Array.isArray(days) || days.length === 0) return null
                                return (
                                  <div className="flex gap-0.5 ml-1">
                                    {days.map(d => {
                                      const sd = SCHOOL_DAYS.find(s => s.day === d)
                                      return sd ? (
                                        <span key={d} className="text-[9px] px-1 py-0.5 rounded bg-accent/10 text-accent font-medium">
                                          {t(`timetable.${sd.key}`)}
                                        </span>
                                      ) : null
                                    })}
                                  </div>
                                )
                              } catch { return null }
                            })()}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openPeriodForm(period)}
                              className="rounded-md p-1.5 text-text-muted hover:bg-bg-surface2 hover:text-text-primary transition"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePeriod(period.id)}
                              className="rounded-md p-1.5 text-text-muted hover:bg-danger-dim hover:text-danger transition"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border-subtle bg-bg-surface p-6 text-center">
                      <p className="text-sm text-text-muted">No periods configured yet</p>
                    </div>
                  )}
                </div>

                {/* Save academic setup */}
                <div className="pt-2">
                  <button
                    onClick={handleSaveAcademic}
                    disabled={academicSaving}
                    className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
                  >
                    {academicSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {t('app.save')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Period Modal */}
      <Modal
        open={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        title={editingPeriod ? t('app.edit') + ' Period' : t('app.add') + ' Period'}
        size="sm"
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Name</label>
            <input
              type="text"
              value={pName}
              onChange={e => setPName(e.target.value)}
              placeholder="e.g. Period 1"
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Start Time</label>
              <input
                type="time"
                value={pStart}
                onChange={e => setPStart(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">End Time</label>
              <input
                type="time"
                value={pEnd}
                onChange={e => setPEnd(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">{t('timetable.break')}</p>
              <p className="text-xs text-text-muted">Mark as break / recess</p>
            </div>
            <button
              onClick={() => setPIsBreak(!pIsBreak)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                pIsBreak ? 'bg-accent' : 'bg-bg-surface'
              }`}
              role="switch"
              aria-checked={pIsBreak}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${
                pIsBreak ? 'translate-x-5' : 'translate-x-0.5'
              } mt-0.5`} />
            </button>
          </div>
          {pIsBreak && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Break Label</label>
              <input
                type="text"
                value={pBreakLabel}
                onChange={e => setPBreakLabel(e.target.value)}
                placeholder="e.g. Recess, Lunch"
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>
          )}
          {!pIsBreak && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="block text-sm font-medium text-text-secondary">
                  {t('settings.applicable_days')}
                </label>
                <HelpTooltip content={t('tooltips.per_day_periods')} side="right" />
              </div>
              <p className="text-xs text-text-muted mb-2">
                {t('settings.applicable_days_hint')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SCHOOL_DAYS.map((sd) => {
                  const isActive = pApplicableDays.length === 0 || pApplicableDays.includes(sd.day)
                  return (
                    <button
                      key={sd.day}
                      type="button"
                      onClick={() => {
                        if (pApplicableDays.length === 0) {
                          // Currently "all days" → switch to all-except-this
                          setPApplicableDays(SCHOOL_DAYS.map(s => s.day).filter(d => d !== sd.day))
                        } else if (pApplicableDays.includes(sd.day)) {
                          const next = pApplicableDays.filter(d => d !== sd.day)
                          // If none left, reset to all
                          setPApplicableDays(next.length === 0 ? [] : next)
                        } else {
                          const next = [...pApplicableDays, sd.day].sort((a, b) => a - b)
                          // If all school days selected, reset to [] (= all)
                          const allDayNums = selectedDays.sort((a, b) => a - b)
                          if (JSON.stringify(next) === JSON.stringify(allDayNums)) {
                            setPApplicableDays([])
                          } else {
                            setPApplicableDays(next)
                          }
                        }
                      }}
                      className={`flex h-8 w-10 items-center justify-center rounded-lg border text-xs font-medium transition ${
                        isActive
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border-default bg-bg-surface text-text-muted'
                      }`}
                    >
                      {t(`timetable.${sd.key}`)}
                    </button>
                  )
                })}
              </div>
              {pApplicableDays.length === 0 && (
                <p className="text-xs text-accent mt-1">{t('settings.all_days_active')}</p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowPeriodModal(false)}
              className="rounded-lg border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-surface2 transition"
            >
              {t('app.cancel')}
            </button>
            <button
              onClick={handleSavePeriod}
              disabled={!pName.trim()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition disabled:opacity-50"
            >
              {t('app.save')}
            </button>
          </div>
        </div>
      </Modal>

      {/* 2b. Grades & Curriculum — Admin only */}
      <section className="rounded-xl border border-border-subtle bg-bg-card">
        <div className="flex items-center">
          <button
            onClick={() => toggleSection('grades')}
            className="flex flex-1 items-center justify-between p-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet/10">
                <BookOpen className="h-4.5 w-4.5 text-violet" />
              </div>
              <h2 className="font-display text-lg font-semibold text-text-primary">
                {t('settings.grades')}
              </h2>
            </div>
            {openSections.grades ? (
              <ChevronUp className="h-5 w-5 text-text-muted" />
            ) : (
              <ChevronDown className="h-5 w-5 text-text-muted" />
            )}
          </button>
          <div className="pr-6 rtl:pr-0 rtl:pl-6">
            <HelpTooltip content={t('tooltips.grade_curriculum')} side="bottom" />
          </div>
        </div>

        {openSections.grades && (
          <div className="border-t border-border-subtle px-6 pb-6 pt-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-text-muted">{t('settings.grades_desc')}</p>
              <button
                onClick={() => openGradeForm()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
              >
                <Plus className="h-4 w-4" />
                {t('settings.add_grade')}
              </button>
            </div>

            {gradesLoading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-lg bg-bg-surface" />
                ))}
              </div>
            ) : grades.length === 0 ? (
              <div className="rounded-lg border border-border-subtle bg-bg-surface p-8 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-text-muted mb-2" />
                <p className="text-sm text-text-muted">{t('settings.no_grades')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {grades.map(g => (
                  <div key={g.id} className="rounded-lg border border-border-subtle bg-bg-surface px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{g.name}</p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-text-muted">
                          <span>{g.curriculum.length} {t('settings.grade_subjects').toLowerCase()}</span>
                          <span>·</span>
                          <span>{g.teachers.length} {t('settings.grade_teachers').toLowerCase()}</span>
                          <span>·</span>
                          <span>{g._count.classes} {t('dashboard.stats_classes').toLowerCase()}</span>
                        </div>
                        {g.curriculum.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {g.curriculum.map(c => (
                              <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-bg-surface2 px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                                {c.subject.name} <span className="text-accent">{c.hoursPerWeek}h</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openGradeForm(g)}
                          className="rounded-md p-1.5 text-text-muted hover:bg-bg-surface2 hover:text-text-primary transition"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteGrade(g.id)}
                          className="rounded-md p-1.5 text-text-muted hover:bg-danger-dim hover:text-danger transition"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Grade Modal */}
      <Modal
        open={showGradeModal}
        onClose={() => setShowGradeModal(false)}
        title={editingGrade ? t('settings.edit_grade') : t('settings.add_grade')}
        size="lg"
      >
        <div className="space-y-5 pt-2 max-h-[70vh] overflow-y-auto">
          {/* Grade name + level */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('settings.grade_name')} *</label>
              <input
                type="text"
                value={gName}
                onChange={e => setGName(e.target.value)}
                placeholder="e.g. 7th Grade / 7ème année"
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('settings.grade_level')}</label>
              <input
                type="number"
                value={gLevel}
                onChange={e => setGLevel(parseInt(e.target.value) || 1)}
                min={1}
                className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Curriculum: subjects + hours */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">{t('settings.grade_subjects')}</label>
            {allSubjects.length === 0 ? (
              <p className="text-sm text-text-muted">No subjects available. Add subjects first in Resources.</p>
            ) : (
              <div className="space-y-1.5 rounded-lg border border-border-subtle p-3">
                {allSubjects.map(sub => {
                  const hours = gCurriculum[sub.id] ?? 0
                  const isEnabled = hours > 0
                  return (
                    <div key={sub.id} className="flex items-center justify-between py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setGCurriculum(prev => {
                            const next = { ...prev }
                            if (isEnabled) { delete next[sub.id] } else { next[sub.id] = 2 }
                            return next
                          })
                        }}
                        className={`flex items-center gap-2 text-sm ${isEnabled ? 'text-text-primary font-medium' : 'text-text-muted'}`}
                      >
                        <div className={`h-4 w-4 rounded border ${isEnabled ? 'border-accent bg-accent' : 'border-border-default bg-bg-surface'} flex items-center justify-center`}>
                          {isEnabled && <span className="text-[10px] text-white font-bold">✓</span>}
                        </div>
                        {sub.name}
                      </button>
                      {isEnabled && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={hours}
                            onChange={e => {
                              const val = Math.max(1, parseInt(e.target.value) || 1)
                              setGCurriculum(prev => ({ ...prev, [sub.id]: val }))
                            }}
                            min={1}
                            max={10}
                            className="w-14 rounded border border-border-default bg-bg-surface px-2 py-1 text-center text-xs text-text-primary focus:border-accent focus:outline-none"
                          />
                          <span className="text-xs text-text-muted">{t('settings.hours_per_week')}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Teacher assignments */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">{t('settings.grade_teachers')}</label>
            <p className="text-xs text-text-muted mb-2">{t('settings.select_teachers')}</p>
            {allTeachers.length === 0 ? (
              <p className="text-sm text-text-muted">No teachers available.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allTeachers.map(teacher => {
                  const isSelected = gTeacherIds.includes(teacher.id)
                  return (
                    <button
                      key={teacher.id}
                      type="button"
                      onClick={() => {
                        setGTeacherIds(prev =>
                          isSelected ? prev.filter(id => id !== teacher.id) : [...prev, teacher.id]
                        )
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        isSelected
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border-default bg-bg-surface text-text-muted hover:border-border-default hover:text-text-secondary'
                      }`}
                    >
                      {teacher.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowGradeModal(false)}
              className="rounded-lg border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-surface2 transition"
            >
              {t('app.cancel')}
            </button>
            <button
              onClick={handleSaveGrade}
              disabled={!gName.trim() || gradeSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition disabled:opacity-50"
            >
              {gradeSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('app.save')}
            </button>
          </div>
        </div>
      </Modal></>)}

      {/* 3. Notifications — visible to all roles */}
      <section className="rounded-xl border border-border-subtle bg-bg-card">
        <button
          onClick={() => toggleSection('notifications')}
          className="flex w-full items-center justify-between p-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
              <Bell className="h-4.5 w-4.5 text-warning" />
            </div>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {t('settings.notifications')}
            </h2>
          </div>
          {openSections.notifications ? (
            <ChevronUp className="h-5 w-5 text-text-muted" />
          ) : (
            <ChevronDown className="h-5 w-5 text-text-muted" />
          )}
        </button>

        {openSections.notifications && (
          <div className="border-t border-border-subtle px-6 pb-6 pt-4">
            <div className="space-y-4">
              {/* Absence alerts */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {t('settings.notif_absences')}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    Get notified when a teacher reports an absence
                  </p>
                </div>
                <button
                  onClick={() => {
                    const next = !notifAbsences
                    setNotifAbsences(next)
                    saveNotificationPrefs(next, notifConflicts, notifSubstitutes)
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                    notifAbsences ? 'bg-accent' : 'bg-bg-surface'
                  }`}
                  role="switch"
                  aria-checked={notifAbsences}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      notifAbsences
                        ? 'translate-x-5'
                        : 'translate-x-0.5'
                    } mt-0.5`}
                  />
                </button>
              </div>

              {/* Conflict alerts */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {t('settings.notif_conflicts')}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    Get notified when scheduling conflicts are detected
                  </p>
                </div>
                <button
                  onClick={() => {
                    const next = !notifConflicts
                    setNotifConflicts(next)
                    saveNotificationPrefs(notifAbsences, next, notifSubstitutes)
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                    notifConflicts ? 'bg-accent' : 'bg-bg-surface'
                  }`}
                  role="switch"
                  aria-checked={notifConflicts}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      notifConflicts
                        ? 'translate-x-5'
                        : 'translate-x-0.5'
                    } mt-0.5`}
                  />
                </button>
              </div>

              {/* Substitute assignments */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {t('settings.notif_substitutes')}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    Get notified when substitute teachers are assigned
                  </p>
                </div>
                <button
                  onClick={() => {
                    const next = !notifSubstitutes
                    setNotifSubstitutes(next)
                    saveNotificationPrefs(notifAbsences, notifConflicts, next)
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                    notifSubstitutes ? 'bg-accent' : 'bg-bg-surface'
                  }`}
                  role="switch"
                  aria-checked={notifSubstitutes}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      notifSubstitutes
                        ? 'translate-x-5'
                        : 'translate-x-0.5'
                    } mt-0.5`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 4. Leave Types — Admin only */}
      {adminUser && (<><section className="rounded-xl border border-border-subtle bg-bg-card">
        <button
          onClick={() => toggleSection('leaveTypes')}
          className="flex w-full items-center justify-between p-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
              <ClipboardList className="h-4.5 w-4.5 text-warning" />
            </div>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {t('settings.leave_types')}
            </h2>
          </div>
          {openSections.leaveTypes ? (
            <ChevronUp className="h-5 w-5 text-text-muted" />
          ) : (
            <ChevronDown className="h-5 w-5 text-text-muted" />
          )}
        </button>

        {openSections.leaveTypes && (
          <div className="border-t border-border-subtle px-6 pb-6 pt-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-text-muted">{t('settings.leave_types_desc')}</p>
              <button
                onClick={() => openLeaveTypeForm()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
              >
                <Plus className="h-4 w-4" />
                {t('settings.add_leave_type')}
              </button>
            </div>

            {leaveTypesLoading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 rounded-lg bg-bg-surface" />
                ))}
              </div>
            ) : leaveTypes.length === 0 ? (
              <div className="rounded-lg border border-border-subtle bg-bg-surface p-8 text-center">
                <ClipboardList className="mx-auto h-8 w-8 text-text-muted mb-2" />
                <p className="text-sm text-text-muted">No leave types configured yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaveTypes.map(lt => (
                  <div key={lt.id} className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-surface px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: lt.colorHex }} />
                      <div>
                        <p className="text-sm font-medium text-text-primary">{lt.name}</p>
                        <p className="text-xs text-text-muted">
                          {lt.maxDaysPerYear} {t('settings.days_per_year')} {lt.requiresApproval ? `· ${t('settings.requires_approval_label')}` : `· ${t('settings.auto_approved_label')}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openLeaveTypeForm(lt)}
                        className="rounded-md p-1.5 text-text-muted hover:bg-bg-surface2 hover:text-text-primary transition"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLeaveType(lt.id)}
                        className="rounded-md p-1.5 text-text-muted hover:bg-danger-dim hover:text-danger transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Leave Type Modal */}
      <Modal
        open={showLeaveTypeModal}
        onClose={() => setShowLeaveTypeModal(false)}
        title={editingLeaveType ? t('settings.edit_leave_type') : t('settings.add_leave_type')}
        size="sm"
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('settings.type_name')}</label>
            <input
              type="text"
              value={ltName}
              onChange={e => setLtName(e.target.value)}
              placeholder="e.g. Sick Leave"
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('settings.max_days')}</label>
            <input
              type="number"
              value={ltMaxDays}
              onChange={e => setLtMaxDays(parseInt(e.target.value) || 0)}
              min={1}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={ltColor}
                onChange={e => setLtColor(e.target.value)}
                className="h-9 w-9 cursor-pointer rounded border border-border-default"
              />
              <span className="text-sm text-text-muted">{ltColor}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">{t('settings.requires_approval')}</p>
              <p className="text-xs text-text-muted">Admin must approve leave requests</p>
            </div>
            <button
              onClick={() => setLtRequiresApproval(!ltRequiresApproval)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                ltRequiresApproval ? 'bg-accent' : 'bg-bg-surface'
              }`}
              role="switch"
              aria-checked={ltRequiresApproval}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${
                ltRequiresApproval ? 'translate-x-5' : 'translate-x-0.5'
              } mt-0.5`} />
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowLeaveTypeModal(false)}
              className="rounded-lg border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-surface2 transition"
            >
              {t('app.cancel')}
            </button>
            <button
              onClick={handleSaveLeaveType}
              disabled={!ltName.trim()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition disabled:opacity-50"
            >
              {t('app.save')}
            </button>
          </div>
        </div>
      </Modal></>)}

      {/* 5. Substitute Settings — Admin only */}
      {adminUser && (<section className="rounded-xl border border-border-subtle bg-bg-card">
        <button
          onClick={() => toggleSection('substituteSettings')}
          className="flex w-full items-center justify-between p-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
              <UserCheck className="h-4.5 w-4.5 text-success" />
            </div>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {t('settings.substitute_settings')}
            </h2>
          </div>
          {openSections.substituteSettings ? (
            <ChevronUp className="h-5 w-5 text-text-muted" />
          ) : (
            <ChevronDown className="h-5 w-5 text-text-muted" />
          )}
        </button>

        {openSections.substituteSettings && (
          <div className="border-t border-border-subtle px-6 pb-6 pt-4">
            <div className="space-y-5">
              {/* Auto-assign toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-text-primary">{t('settings.auto_assign')}</p>
                    <HelpTooltip content={t('tooltips.auto_assign_subs')} side="right" />
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {t('settings.auto_assign_desc')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const next = !subAutoAssign
                    setSubAutoAssign(next)
                    saveSubSettings(next, subMaxCoverPeriods)
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                    subAutoAssign ? 'bg-accent' : 'bg-bg-surface'
                  }`}
                  role="switch"
                  aria-checked={subAutoAssign}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${
                    subAutoAssign ? 'translate-x-5' : 'translate-x-0.5'
                  } mt-0.5`} />
                </button>
              </div>

              {/* Max cover periods */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  {t('settings.max_cover_periods')}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={subMaxCoverPeriods}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 1
                      setSubMaxCoverPeriods(val)
                      saveSubSettings(subAutoAssign, val)
                    }}
                    min={1}
                    max={10}
                    className="w-24 rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
                  />
                  <span className="text-sm text-text-muted">{t('settings.periods_per_day_unit')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>)}

      {/* 6. Security — visible to all roles */}
      <section className="rounded-xl border border-border-subtle bg-bg-card">
        <button
          onClick={() => toggleSection('security')}
          className="flex w-full items-center justify-between p-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet/10">
              <Shield className="h-4.5 w-4.5 text-violet" />
            </div>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {t('settings.security')}
            </h2>
          </div>
          {openSections.security ? (
            <ChevronUp className="h-5 w-5 text-text-muted" />
          ) : (
            <ChevronDown className="h-5 w-5 text-text-muted" />
          )}
        </button>

        {openSections.security && (
          <div className="border-t border-border-subtle px-6 pb-6 pt-4">
            <div className="space-y-4">
              {/* Change Password */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {t('settings.change_password')}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {t('settings.change_password_desc')}
                  </p>
                </div>
                <button
                  disabled
                  className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary opacity-50 cursor-not-allowed"
                >
                  <Lock className="h-4 w-4" />
                  {t('settings.change_password')}
                </button>
              </div>

              {/* Two-Factor Authentication */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {t('settings.two_factor')}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {t('settings.two_factor_desc')}
                  </p>
                </div>
                <button
                  onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out opacity-50 cursor-not-allowed ${
                    twoFactorEnabled ? 'bg-accent' : 'bg-bg-surface'
                  }`}
                  role="switch"
                  aria-checked={twoFactorEnabled}
                  disabled
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      twoFactorEnabled
                        ? 'translate-x-5'
                        : 'translate-x-0.5'
                    } mt-0.5`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 7. Data — Admin only */}
      {adminUser && (<section className="rounded-xl border border-border-subtle bg-bg-card">
        <button
          onClick={() => toggleSection('data')}
          className="flex w-full items-center justify-between p-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10">
              <Database className="h-4.5 w-4.5 text-info" />
            </div>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {t('settings.data')}
            </h2>
          </div>
          {openSections.data ? (
            <ChevronUp className="h-5 w-5 text-text-muted" />
          ) : (
            <ChevronDown className="h-5 w-5 text-text-muted" />
          )}
        </button>

        {openSections.data && (
          <div className="border-t border-border-subtle px-6 pb-6 pt-4">
            <p className="mb-3 text-xs text-text-muted">
              {t('settings.data_desc')}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setShowExportPicker(!showExportPicker)}
                className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-bg-surface2 transition-colors"
              >
                <Download className="h-4 w-4" />
                {t('settings.export_data')}
              </button>
              <button
                onClick={() => setShowImportPicker(!showImportPicker)}
                className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-bg-surface2 transition-colors"
              >
                <Upload className="h-4 w-4" />
                {t('settings.import_data')}
              </button>
            </div>
            {/* Export type picker */}
            {showExportPicker && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(['teachers', 'subjects', 'classes', 'rooms'] as const).map((etype) => (
                  <button
                    key={etype}
                    onClick={() => {
                      triggerExport({ type: etype, schoolId: user!.schoolId! })
                      toast.success(`${t(`app.type_${etype}`)} exported`)
                      setShowExportPicker(false)
                    }}
                    className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-xs font-medium text-text-primary hover:bg-bg-surface2 transition-colors"
                  >
                    <Download className="h-3 w-3 text-text-muted" />
                    {t(`app.type_${etype}`)}
                  </button>
                ))}
              </div>
            )}
            {/* Import type picker */}
            {showImportPicker && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(['teachers', 'subjects', 'classes', 'rooms'] as const).map((itype) => (
                  <button
                    key={itype}
                    onClick={() => {
                      setImportType(itype)
                      setShowImportPicker(false)
                    }}
                    className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-xs font-medium text-text-primary hover:bg-bg-surface2 transition-colors"
                  >
                    <Upload className="h-3 w-3 text-text-muted" />
                    {t(`app.type_${itype}`)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>)}

      {/* 8. Danger Zone — Admin only */}
      {adminUser && (<section className="rounded-xl border border-danger/30 bg-danger/5">
        <button
          onClick={() => toggleSection('danger')}
          className="flex w-full items-center justify-between p-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger/10">
              <AlertTriangle className="h-4.5 w-4.5 text-danger" />
            </div>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {t('settings.danger_zone')}
            </h2>
          </div>
          {openSections.danger ? (
            <ChevronUp className="h-5 w-5 text-text-muted" />
          ) : (
            <ChevronDown className="h-5 w-5 text-text-muted" />
          )}
        </button>

        {openSections.danger && (
          <div className="border-t border-danger/20 px-6 pb-6 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {t('settings.delete_account')}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Permanently delete your account and all associated data. This
                  action cannot be undone.
                </p>
              </div>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/20"
                >
                  <Trash2 className="h-4 w-4" />
                  {t('settings.delete_account')}
                </button>
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-lg border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-bg-surface2"
                  >
                    {t('app.cancel')}
                  </button>
                  <button
                    disabled
                    className="inline-flex items-center gap-2 rounded-lg bg-danger px-4 py-2.5 text-sm font-semibold text-white opacity-50 cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('app.confirm')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>)}

      {/* Import Modal */}
      {importType && (
        <ImportModal
          open={!!importType}
          onClose={() => setImportType(null)}
          type={importType}
          schoolId={user!.schoolId!}
          onComplete={() => {}}
        />
      )}
    </div>
  )
}
