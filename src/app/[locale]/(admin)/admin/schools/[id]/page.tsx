'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { useAdminFetch } from '@/hooks/useAdminFetch'
import {
  Building2, Users, GraduationCap, UserCheck, BookOpen, DoorOpen,
  Clock, Calendar, CalendarDays, UserX, ClipboardCheck, CreditCard,
  FileText, ClipboardList, Layers, Loader2, ArrowLeft, Save, Pencil,
  Plus, Trash2, X,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'

// ── Types ─────────────────────────────────────────────────────
interface School {
  id: string
  name: string
  slug: string
  plan: string
  subscriptionStatus: string
  subscriptionEndsAt: string | null
  language: string
  createdAt: string
  _count: Record<string, number>
}

interface ColDef {
  key: string
  label: string
  format?: (value: any, row: any) => string
}

interface EditFieldDef {
  key: string
  label: string
  type?: 'text' | 'email' | 'number' | 'date' | 'color' | 'checkbox' | 'select' | 'select-fk' | 'textarea'
  required?: boolean
  options?: { value: string; label: string }[]
  fkKey?: string
  fkLabel?: string
}

// ── Tab display columns ────────────────────────────────────────
const TAB_COLUMNS: Record<string, ColDef[]> = {
  teachers: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'matricule', label: 'Matricule' },
    { key: 'cin', label: 'CIN' },
    { key: 'sex', label: 'Sex' },
    { key: 'professionalGrade', label: 'Prof. Grade', format: (v) => v?.nameFr || v?.nameEn || '—' },
    { key: 'maxPeriodsPerDay', label: 'Max/Day' },
    { key: 'maxPeriodsPerWeek', label: 'Max/Week' },
    { key: 'subjects', label: 'Subjects', format: (v) => v?.map((ts: any) => ts.subject?.name).join(', ') || '—' },
  ],
  students: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'matricule', label: 'Matricule' },
    { key: 'sex', label: 'Sex' },
    { key: 'class', label: 'Class', format: (v) => v?.name || '—' },
    { key: 'phone', label: 'Phone' },
    { key: 'birthDate', label: 'Birth Date', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
  ],
  staff: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'cin', label: 'CIN' },
    { key: 'matricule', label: 'Matricule' },
    { key: 'staffTitle', label: 'Title' },
  ],
  users: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'language', label: 'Language' },
    { key: 'phone', label: 'Phone' },
    { key: 'isActive', label: 'Active', format: (v) => v ? 'Yes' : 'No' },
    { key: 'createdAt', label: 'Created', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
  ],
  classes: [
    { key: 'name', label: 'Name' },
    { key: 'grade', label: 'Grade', format: (v) => v?.name || '—' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'colorHex', label: 'Color' },
    { key: '_count', label: '#Students', format: (v) => String(v?.students ?? 0) },
  ],
  subjects: [
    { key: 'name', label: 'Name' },
    { key: 'nameAr', label: 'Name (AR)' },
    { key: 'nameFr', label: 'Name (FR)' },
    { key: 'category', label: 'Category' },
    { key: 'colorHex', label: 'Color' },
    { key: 'pedagogicDay', label: 'Ped. Day' },
  ],
  rooms: [
    { key: 'name', label: 'Name' },
    { key: 'building', label: 'Building' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'type', label: 'Type' },
  ],
  periods: [
    { key: 'name', label: 'Name' },
    { key: 'startTime', label: 'Start' },
    { key: 'endTime', label: 'End' },
    { key: 'order', label: 'Order' },
    { key: 'isBreak', label: 'Break', format: (v) => v ? 'Yes' : 'No' },
  ],
  grades: [
    { key: 'name', label: 'Name' },
    { key: 'nameAr', label: 'Name (AR)' },
    { key: 'nameFr', label: 'Name (FR)' },
    { key: 'level', label: 'Level' },
    { key: '_count', label: '#Classes', format: (v) => String(v?.classes ?? 0) },
  ],
  timetables: [
    { key: 'name', label: 'Name' },
    { key: 'term', label: 'Term', format: (v) => v?.name || '—' },
    { key: 'status', label: 'Status' },
    { key: 'isActive', label: 'Active', format: (v) => v ? 'Yes' : 'No' },
    { key: 'generatedByAi', label: 'AI', format: (v) => v ? 'Yes' : 'No' },
    { key: '_count', label: '#Lessons', format: (v) => String(v?.lessons ?? 0) },
  ],
  absences: [
    { key: 'teacher', label: 'Teacher', format: (v) => v?.name || '—' },
    { key: 'date', label: 'Date', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'endDate', label: 'End Date', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'note', label: 'Note' },
    { key: 'periods', label: 'Periods', format: (v) => { try { const a = JSON.parse(v); return Array.isArray(a) ? a.join(', ') : String(v || '—') } catch { return String(v || '—') } } },
  ],
  'student-absences': [
    { key: 'student', label: 'Student', format: (v) => v?.name || '—' },
    { key: 'date', label: 'Date', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'type', label: 'Type' },
    { key: 'reason', label: 'Reason' },
    { key: 'note', label: 'Note' },
  ],
  events: [
    { key: 'title', label: 'Title' },
    { key: 'type', label: 'Type' },
    { key: 'startDate', label: 'Start', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'endDate', label: 'End', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'colorHex', label: 'Color' },
  ],
  terms: [
    { key: 'name', label: 'Name' },
    { key: 'startDate', label: 'Start', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'endDate', label: 'End', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: '_count', label: '#Timetables', format: (v) => String(v?.timetables ?? 0) },
  ],
  'leave-types': [
    { key: 'name', label: 'Name' },
    { key: 'maxDaysPerYear', label: 'Max Days/Year' },
    { key: 'colorHex', label: 'Color' },
    { key: 'requiresApproval', label: 'Approval', format: (v) => v ? 'Yes' : 'No' },
    { key: '_count', label: '#Requests', format: (v) => String(v?.requests ?? 0) },
  ],
  'leave-requests': [
    { key: 'teacher', label: 'Teacher', format: (v) => v?.name || '—' },
    { key: 'leaveType', label: 'Leave Type', format: (v) => v?.name || '—' },
    { key: 'startDate', label: 'Start', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'endDate', label: 'End', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'daysCount', label: 'Days' },
    { key: 'status', label: 'Status' },
    { key: 'reason', label: 'Reason' },
  ],
  payments: [
    { key: 'provider', label: 'Provider' },
    { key: 'orderId', label: 'Order ID' },
    { key: 'plan', label: 'Plan' },
    { key: 'billingCycle', label: 'Cycle' },
    { key: 'amount', label: 'Amount' },
    { key: 'currency', label: 'Currency' },
    { key: 'status', label: 'Status' },
    { key: 'paidAt', label: 'Paid', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
  ],
  exams: [
    { key: 'subject', label: 'Subject', format: (v) => v?.name || '—' },
    { key: 'class', label: 'Class', format: (v) => v?.name || '—' },
    { key: 'teacher', label: 'Teacher', format: (v) => v?.name || '—' },
    { key: 'term', label: 'Term', format: (v) => v?.name || '—' },
    { key: 'type', label: 'Type' },
    { key: 'date', label: 'Date', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'coefficient', label: 'Coeff.' },
    { key: 'maxScore', label: 'Max Score' },
    { key: '_count', label: '#Marks', format: (v) => String(v?.marks ?? 0) },
  ],
}

// ── Tab edit/create field configs ──────────────────────────────
const TAB_EDIT_FIELDS: Record<string, EditFieldDef[]> = {
  teachers: [
    { key: 'name', label: 'Name', required: true },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone' },
    { key: 'matricule', label: 'Matricule' },
    { key: 'cin', label: 'CIN' },
    { key: 'sex', label: 'Sex', type: 'select', options: [{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }] },
    { key: 'professionalGradeId', label: 'Professional Grade', type: 'select-fk', fkKey: 'professionalGrades', fkLabel: 'nameFr' },
    { key: 'maxPeriodsPerDay', label: 'Max Periods/Day', type: 'number' },
    { key: 'maxPeriodsPerWeek', label: 'Max Periods/Week', type: 'number' },
    { key: 'recruitmentDate', label: 'Recruitment Date', type: 'date' },
    { key: 'excludeFromCover', label: 'Exclude From Cover', type: 'checkbox' },
    { key: 'colorHex', label: 'Color', type: 'color' },
  ],
  students: [
    { key: 'name', label: 'Name', required: true },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone' },
    { key: 'matricule', label: 'Matricule' },
    { key: 'sex', label: 'Sex', type: 'select', options: [{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }] },
    { key: 'classId', label: 'Class', type: 'select-fk', fkKey: 'classes', required: true },
    { key: 'birthDate', label: 'Birth Date', type: 'date' },
  ],
  staff: [
    { key: 'name', label: 'Name', required: true },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone' },
    { key: 'cin', label: 'CIN' },
    { key: 'matricule', label: 'Matricule' },
    { key: 'staffTitle', label: 'Title' },
  ],
  users: [
    { key: 'name', label: 'Name', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'role', label: 'Role', type: 'select', options: [
      { value: 'ADMIN', label: 'Admin' }, { value: 'DIRECTOR', label: 'Director' },
      { value: 'TEACHER', label: 'Teacher' }, { value: 'STUDENT', label: 'Student' },
      { value: 'STAFF', label: 'Staff' },
    ] },
    { key: 'language', label: 'Language', type: 'select', options: [
      { value: 'FR', label: 'French' }, { value: 'EN', label: 'English' }, { value: 'AR', label: 'Arabic' },
    ] },
    { key: 'phone', label: 'Phone' },
    { key: 'isActive', label: 'Active', type: 'checkbox' },
  ],
  classes: [
    { key: 'name', label: 'Name', required: true },
    { key: 'gradeId', label: 'Grade', type: 'select-fk', fkKey: 'grades' },
    { key: 'capacity', label: 'Capacity', type: 'number' },
    { key: 'colorHex', label: 'Color', type: 'color' },
  ],
  subjects: [
    { key: 'name', label: 'Name', required: true },
    { key: 'nameAr', label: 'Name (AR)' },
    { key: 'nameFr', label: 'Name (FR)' },
    { key: 'category', label: 'Category', type: 'select', options: [
      { value: 'CORE', label: 'Core' }, { value: 'ELECTIVE', label: 'Elective' },
      { value: 'SCIENCE', label: 'Science' }, { value: 'LANGUAGE', label: 'Language' },
      { value: 'ARTS', label: 'Arts' }, { value: 'SPORTS', label: 'Sports' },
      { value: 'TECH', label: 'Technology' }, { value: 'OTHER', label: 'Other' },
    ] },
    { key: 'colorHex', label: 'Color', type: 'color' },
    { key: 'pedagogicDay', label: 'Pedagogic Day', type: 'number' },
  ],
  rooms: [
    { key: 'name', label: 'Name', required: true },
    { key: 'building', label: 'Building' },
    { key: 'capacity', label: 'Capacity', type: 'number' },
    { key: 'type', label: 'Type', type: 'select', options: [
      { value: 'CLASSROOM', label: 'Classroom' }, { value: 'LAB', label: 'Lab' },
      { value: 'GYM', label: 'Gym' }, { value: 'AUDITORIUM', label: 'Auditorium' },
      { value: 'LIBRARY', label: 'Library' }, { value: 'OTHER', label: 'Other' },
    ] },
  ],
  periods: [
    { key: 'name', label: 'Name', required: true },
    { key: 'startTime', label: 'Start Time', required: true },
    { key: 'endTime', label: 'End Time', required: true },
    { key: 'order', label: 'Order', type: 'number', required: true },
    { key: 'isBreak', label: 'Is Break', type: 'checkbox' },
  ],
  grades: [
    { key: 'name', label: 'Name', required: true },
    { key: 'nameAr', label: 'Name (AR)' },
    { key: 'nameFr', label: 'Name (FR)' },
    { key: 'level', label: 'Level', type: 'number', required: true },
  ],
  timetables: [
    { key: 'name', label: 'Name', required: true },
    { key: 'termId', label: 'Term', type: 'select-fk', fkKey: 'terms' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'DRAFT', label: 'Draft' }, { value: 'PUBLISHED', label: 'Published' }, { value: 'ARCHIVED', label: 'Archived' },
    ] },
    { key: 'isActive', label: 'Active', type: 'checkbox' },
  ],
  absences: [
    { key: 'teacherId', label: 'Teacher', type: 'select-fk', fkKey: 'teachers', required: true },
    { key: 'date', label: 'Date', type: 'date', required: true },
    { key: 'endDate', label: 'End Date', type: 'date' },
    { key: 'type', label: 'Type', type: 'select', options: [
      { value: 'SICK', label: 'Sick' }, { value: 'PERSONAL', label: 'Personal' },
      { value: 'TRAINING', label: 'Training' }, { value: 'OTHER', label: 'Other' },
    ] },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'PENDING', label: 'Pending' }, { value: 'COVERED', label: 'Covered' }, { value: 'UNCOVERED', label: 'Uncovered' },
    ] },
    { key: 'note', label: 'Note', type: 'textarea' },
  ],
  'student-absences': [
    { key: 'studentId', label: 'Student', type: 'select-fk', fkKey: 'students', required: true },
    { key: 'date', label: 'Date', type: 'date', required: true },
    { key: 'type', label: 'Type', type: 'select', options: [
      { value: 'UNJUSTIFIED', label: 'Unjustified' }, { value: 'JUSTIFIED', label: 'Justified' }, { value: 'LATE', label: 'Late' },
    ] },
    { key: 'reason', label: 'Reason' },
    { key: 'note', label: 'Note', type: 'textarea' },
  ],
  events: [
    { key: 'title', label: 'Title', required: true },
    { key: 'type', label: 'Type', type: 'select', options: [
      { value: 'HOLIDAY', label: 'Holiday' }, { value: 'EXAM', label: 'Exam' },
      { value: 'TRIP', label: 'Trip' }, { value: 'MEETING', label: 'Meeting' },
      { value: 'CLOSURE', label: 'Closure' }, { value: 'OTHER', label: 'Other' },
    ] },
    { key: 'startDate', label: 'Start Date', type: 'date', required: true },
    { key: 'endDate', label: 'End Date', type: 'date', required: true },
    { key: 'colorHex', label: 'Color', type: 'color' },
    { key: 'description', label: 'Description', type: 'textarea' },
  ],
  terms: [
    { key: 'name', label: 'Name', required: true },
    { key: 'startDate', label: 'Start Date', type: 'date', required: true },
    { key: 'endDate', label: 'End Date', type: 'date', required: true },
  ],
  'leave-types': [
    { key: 'name', label: 'Name', required: true },
    { key: 'maxDaysPerYear', label: 'Max Days/Year', type: 'number' },
    { key: 'colorHex', label: 'Color', type: 'color' },
    { key: 'requiresApproval', label: 'Requires Approval', type: 'checkbox' },
  ],
  'leave-requests': [
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'PENDING', label: 'Pending' }, { value: 'APPROVED', label: 'Approved' },
      { value: 'REJECTED', label: 'Rejected' }, { value: 'CANCELLED', label: 'Cancelled' },
    ] },
    { key: 'reason', label: 'Reason', type: 'textarea' },
  ],
  payments: [
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'PENDING', label: 'Pending' }, { value: 'COMPLETED', label: 'Completed' },
      { value: 'FAILED', label: 'Failed' }, { value: 'REFUNDED', label: 'Refunded' },
    ] },
  ],
  exams: [
    { key: 'type', label: 'Type', type: 'select', options: [
      { value: 'DS', label: 'DS' }, { value: 'EXAM', label: 'Exam' },
      { value: 'ORAL', label: 'Oral' }, { value: 'TP', label: 'TP' },
    ] },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'coefficient', label: 'Coefficient', type: 'number' },
    { key: 'maxScore', label: 'Max Score', type: 'number' },
  ],
}

// Tabs that support creation
const CREATABLE_TABS = new Set([
  'teachers', 'students', 'staff', 'classes', 'subjects', 'rooms',
  'periods', 'grades', 'terms', 'events', 'leave-types',
])

const TABS = [
  { key: 'overview', icon: Building2 },
  { key: 'users', icon: Users },
  { key: 'teachers', icon: UserCheck },
  { key: 'students', icon: GraduationCap },
  { key: 'staff', icon: Users },
  { key: 'classes', icon: Layers },
  { key: 'subjects', icon: BookOpen },
  { key: 'rooms', icon: DoorOpen },
  { key: 'periods', icon: Clock },
  { key: 'grades', icon: Layers },
  { key: 'timetables', icon: CalendarDays },
  { key: 'absences', icon: UserX },
  { key: 'student-absences', icon: ClipboardCheck },
  { key: 'events', icon: Calendar },
  { key: 'terms', icon: FileText },
  { key: 'leave-types', icon: ClipboardList },
  { key: 'leave-requests', icon: ClipboardList },
  { key: 'payments', icon: CreditCard },
  { key: 'exams', icon: BookOpen },
] as const

// ── Main Component ─────────────────────────────────────────────
export default function AdminSchoolDetailPage() {
  const t = useTranslations('admin')
  const params = useParams()
  const schoolId = params.id as string
  const { adminFetch } = useAdminFetch()

  const [school, setSchool] = useState<School | null>(null)
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [tabData, setTabData] = useState<any[]>([])
  const [lookups, setLookups] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [tabLoading, setTabLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [apiError, setApiError] = useState('')
  const [editForm, setEditForm] = useState({ name: '', slug: '', plan: '', language: '', subscriptionStatus: '' })

  // Modal state (shared for create & edit)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [modalRow, setModalRow] = useState<any>(null)
  const [modalFields, setModalFields] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const loadSchool = useCallback(() => {
    setLoading(true)
    adminFetch(`/api/admin/schools/${schoolId}`)
      .then(async (r) => {
        if (!r.ok) { setApiError(`School fetch failed: ${r.status}`); return }
        const d = await r.json()
        setSchool(d.school)
        setEditForm({
          name: d.school.name, slug: d.school.slug,
          plan: d.school.plan, language: d.school.language,
          subscriptionStatus: d.school.subscriptionStatus,
        })
      })
      .finally(() => setLoading(false))
  }, [adminFetch, schoolId])

  const loadTabData = useCallback(() => {
    if (activeTab === 'overview') return
    setTabLoading(true)
    setApiError('')
    adminFetch(`/api/admin/schools/${schoolId}/data?type=${activeTab}`)
      .then(async (r) => {
        if (!r.ok) { setApiError(`Data fetch failed: ${r.status}`); setTabData([]); return }
        const d = await r.json()
        setTabData(d.data || [])
        setLookups(d.lookups || {})
      })
      .finally(() => setTabLoading(false))
  }, [adminFetch, schoolId, activeTab])

  useEffect(() => { loadSchool() }, [loadSchool])
  useEffect(() => { loadTabData() }, [loadTabData])

  const handleSave = async () => {
    await adminFetch(`/api/admin/schools/${schoolId}`, {
      method: 'PUT', body: JSON.stringify(editForm),
    })
    setEditing(false)
    loadSchool()
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Delete this record? This cannot be undone.')) return
    const r = await adminFetch(
      `/api/admin/schools/${schoolId}/data?type=${activeTab}&itemId=${itemId}`,
      { method: 'DELETE' }
    )
    if (!r.ok) {
      const d = await r.json()
      alert(d.error || 'Delete failed')
      return
    }
    loadTabData()
  }

  // Open modal for editing
  function openEditModal(row: any) {
    const fieldDefs = TAB_EDIT_FIELDS[activeTab] || []
    const fields: Record<string, any> = {}
    for (const f of fieldDefs) {
      let val = row[f.key]
      if (f.type === 'date' && val) {
        val = new Date(val).toISOString().split('T')[0]
      } else if (f.type === 'checkbox') {
        val = !!val
      } else {
        val = val ?? ''
      }
      fields[f.key] = val
    }
    setModalFields(fields)
    setModalRow(row)
    setModalMode('edit')
    setSaveError('')
  }

  // Open modal for creating
  function openCreateModal() {
    const fieldDefs = TAB_EDIT_FIELDS[activeTab] || []
    const fields: Record<string, any> = {}
    for (const f of fieldDefs) {
      if (f.type === 'checkbox') fields[f.key] = false
      else if (f.type === 'color') fields[f.key] = '#4f6ef7'
      else fields[f.key] = ''
    }
    setModalFields(fields)
    setModalRow(null)
    setModalMode('create')
    setSaveError('')
  }

  // Submit modal (create or edit)
  async function handleModalSubmit() {
    setSaving(true)
    setSaveError('')
    try {
      if (modalMode === 'create') {
        const r = await adminFetch(
          `/api/admin/schools/${schoolId}/data?type=${activeTab}`,
          { method: 'POST', body: JSON.stringify(modalFields) }
        )
        if (!r.ok) {
          const d = await r.json()
          throw new Error(d.error || 'Create failed')
        }
      } else {
        const payload: Record<string, any> = { itemId: modalRow.id }
        const fieldDefs = TAB_EDIT_FIELDS[activeTab] || []
        for (const f of fieldDefs) {
          let val = modalFields[f.key]
          if (f.type === 'checkbox') val = !!val
          else if (f.type === 'number' && val !== '' && val != null) val = Number(val)
          payload[f.key] = val
        }
        const r = await adminFetch(
          `/api/admin/schools/${schoolId}/data?type=${activeTab}`,
          { method: 'PUT', body: JSON.stringify(payload) }
        )
        if (!r.ok) {
          const d = await r.json()
          throw new Error(d.error || 'Save failed')
        }
      }
      setModalMode(null)
      setModalRow(null)
      loadTabData()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Operation failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
  }
  if (!school) return <p className="text-text-muted">{apiError || t('not_found')}</p>

  const canCreate = CREATABLE_TABS.has(activeTab)
  const hasEditFields = TAB_EDIT_FIELDS[activeTab] !== undefined

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/schools" className="rounded p-1 text-text-muted hover:text-text-primary transition">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold text-text-primary">{school.name}</h1>
          <p className="text-xs text-text-muted font-mono">{school.slug} &middot; {school.plan} &middot; {school.language}</p>
        </div>
        {activeTab === 'overview' && !editing && (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-surface transition">
            <Pencil className="h-3.5 w-3.5" /> {t('edit')}
          </button>
        )}
        {activeTab !== 'overview' && canCreate && (
          <button onClick={openCreateModal} className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition">
            <Plus className="h-4 w-4" /> Add
          </button>
        )}
      </div>

      {apiError && (
        <div className="rounded-md bg-danger-dim p-3 text-sm text-danger">{apiError}</div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 rounded-lg border border-border-subtle bg-bg-elevated p-1">
        {TABS.map(({ key, icon: Icon }) => (
          <button key={key} onClick={() => { setActiveTab(key); setModalMode(null) }}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition ${activeTab === key ? 'bg-accent text-white' : 'text-text-muted hover:bg-bg-surface hover:text-text-primary'}`}>
            <Icon className="h-3.5 w-3.5" /> {t(`tab_${key}`)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' ? (
        <OverviewTab school={school} editing={editing} editForm={editForm} setEditForm={setEditForm} onSave={handleSave} onCancel={() => setEditing(false)} t={t} />
      ) : tabLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : (
        <DataTable
          data={tabData}
          columns={TAB_COLUMNS[activeTab] || []}
          onRowClick={hasEditFields ? openEditModal : undefined}
          onDelete={handleDelete}
        />
      )}

      {/* Entity Modal (create/edit) */}
      {modalMode && hasEditFields && (
        <EntityModal
          mode={modalMode}
          fields={TAB_EDIT_FIELDS[activeTab] || []}
          lookups={lookups}
          editFields={modalFields}
          setEditFields={setModalFields}
          onSave={handleModalSubmit}
          onCancel={() => { setModalMode(null); setModalRow(null) }}
          saving={saving}
          error={saveError}
        />
      )}
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────
function OverviewTab({ school, editing, editForm, setEditForm, onSave, onCancel, t }: {
  school: School; editing: boolean; editForm: any; setEditForm: (f: any) => void; onSave: () => void; onCancel: () => void; t: any
}) {
  if (editing) {
    return (
      <div className="rounded-xl border border-border-subtle bg-bg-card p-5 space-y-4 max-w-lg">
        {(['name', 'slug', 'language'] as const).map((field) => (
          <div key={field}>
            <label className="mb-1 block text-xs font-medium text-text-muted">{t(field)}</label>
            <input value={editForm[field]} onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
              className="w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none" />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">{t('plan')}</label>
          <select value={editForm.plan} onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
            className="w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">{t('status')}</label>
          <select value={editForm.subscriptionStatus} onChange={(e) => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
            className="w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="INACTIVE">INACTIVE</option><option value="ACTIVE">ACTIVE</option><option value="EXPIRED">EXPIRED</option>
          </select>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onSave} className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition">
            <Save className="h-4 w-4" /> {t('save')}
          </button>
          <button onClick={onCancel} className="rounded-md border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:bg-bg-surface transition">{t('cancel')}</button>
        </div>
      </div>
    )
  }

  const info = [
    { label: t('plan'), value: school.plan },
    { label: t('status'), value: school.subscriptionStatus },
    { label: t('language'), value: school.language },
    { label: t('created'), value: new Date(school.createdAt).toLocaleDateString() },
    { label: t('subscription_ends'), value: school.subscriptionEndsAt ? new Date(school.subscriptionEndsAt).toLocaleDateString() : '—' },
  ]
  const counts = school._count || {}

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border-subtle bg-bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">{t('school_info')}</h3>
        {info.map((item) => (
          <div key={item.label} className="flex justify-between text-sm">
            <span className="text-text-muted">{item.label}</span>
            <span className="text-text-primary font-medium">{item.value}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border-subtle bg-bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">{t('counts')}</h3>
        {Object.entries(counts).map(([key, val]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-text-muted">{key}</span>
            <span className="text-text-primary font-medium">{val as number}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Data Table ────────────────────────────────────────────────
function DataTable({ data, columns, onRowClick, onDelete }: {
  data: any[]
  columns: ColDef[]
  onRowClick?: (row: any) => void
  onDelete: (id: string) => void
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-bg-card p-8 text-center text-text-muted">
        No records found. Use the Add button to create one.
      </div>
    )
  }

  // Fallback: if no columns config, auto-detect from data
  const cols = columns.length > 0 ? columns : Object.keys(data[0])
    .filter((k) => !['id', 'schoolId', 'createdAt', 'updatedAt'].includes(k) && typeof data[0][k] !== 'object')
    .map((k) => ({ key: k, label: k } as ColDef))

  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs text-text-muted">
            {cols.map((col) => (
              <th key={col.key} className="px-4 py-3 whitespace-nowrap">{col.label}</th>
            ))}
            <th className="px-4 py-3 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id || i}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-border-subtle last:border-0 hover:bg-bg-surface/50 transition ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {cols.map((col) => {
                const rawValue = row[col.key]
                let displayValue: string
                if (col.format) {
                  displayValue = col.format(rawValue, row)
                } else if (rawValue === null || rawValue === undefined) {
                  displayValue = '—'
                } else if (typeof rawValue === 'boolean') {
                  displayValue = rawValue ? 'Yes' : 'No'
                } else if (typeof rawValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rawValue)) {
                  displayValue = new Date(rawValue).toLocaleDateString()
                } else {
                  displayValue = String(rawValue)
                }

                // Color swatch for colorHex columns
                if (col.key === 'colorHex' && rawValue) {
                  return (
                    <td key={col.key} className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-5 w-5 rounded border border-border-subtle" style={{ backgroundColor: String(rawValue) }} />
                        <span className="text-text-muted text-xs">{rawValue}</span>
                      </div>
                    </td>
                  )
                }

                return (
                  <td key={col.key} className="px-4 py-2.5 text-text-secondary max-w-[200px] truncate">
                    {displayValue}
                  </td>
                )
              })}
              <td className="px-4 py-2.5">
                {row.id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(row.id) }}
                    className="rounded p-1 text-text-muted hover:bg-danger-dim hover:text-danger transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-border-subtle px-4 py-2 text-xs text-text-muted">
        {data.length} record{data.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

// ── Entity Modal (Create/Edit) ────────────────────────────────
function EntityModal({ mode, fields, lookups, editFields, setEditFields, onSave, onCancel, saving, error }: {
  mode: 'create' | 'edit'
  fields: EditFieldDef[]
  lookups: Record<string, any[]>
  editFields: Record<string, any>
  setEditFields: (f: Record<string, any>) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  error: string
}) {
  const updateField = (key: string, value: any) => {
    setEditFields({ ...editFields, [key]: value })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-xl border border-border-subtle bg-bg-card shadow-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="text-base font-semibold text-text-primary">
            {mode === 'create' ? 'Create Record' : 'Edit Record'}
          </h2>
          <button onClick={onCancel} className="rounded-md p-1 text-text-muted hover:text-text-primary hover:bg-bg-surface transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="rounded-md bg-danger-dim p-3 text-sm text-danger">{error}</div>
          )}

          {fields.map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                {field.label} {field.required && <span className="text-danger">*</span>}
              </label>

              {field.type === 'select' && field.options ? (
                <select
                  value={editFields[field.key] || ''}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  className="w-full rounded-md border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="">—</option>
                  {field.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : field.type === 'select-fk' && field.fkKey ? (
                <select
                  value={editFields[field.key] || ''}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  className="w-full rounded-md border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="">— None —</option>
                  {(lookups[field.fkKey] || []).map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {field.fkLabel ? item[field.fkLabel] : item.name || item.nameEn || item.nameFr || item.id}
                    </option>
                  ))}
                </select>
              ) : field.type === 'checkbox' ? (
                <input
                  type="checkbox"
                  checked={!!editFields[field.key]}
                  onChange={(e) => updateField(field.key, e.target.checked)}
                  className="h-4 w-4 rounded border-border-default accent-accent"
                />
              ) : field.type === 'color' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editFields[field.key] || '#4f6ef7'}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    className="h-8 w-16 rounded border border-border-default bg-bg-elevated cursor-pointer"
                  />
                  <span className="text-xs text-text-muted">{editFields[field.key]}</span>
                </div>
              ) : field.type === 'textarea' ? (
                <textarea
                  value={editFields[field.key] || ''}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-1 focus:ring-accent resize-none"
                />
              ) : (
                <input
                  type={field.type || 'text'}
                  value={editFields[field.key] ?? ''}
                  onChange={(e) => updateField(field.key, field.type === 'number' ? e.target.value : e.target.value)}
                  className="w-full rounded-md border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border-subtle">
          <button
            onClick={onCancel}
            className="rounded-md border border-border-default bg-bg-elevated px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-surface transition"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
