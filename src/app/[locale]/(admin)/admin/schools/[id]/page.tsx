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

// Field definitions for each entity type's create form
const ENTITY_FIELDS: Record<string, { key: string; label: string; type?: string; required?: boolean; options?: { value: string; label: string }[] }[]> = {
  teachers: [
    { key: 'name', label: 'Name', required: true },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone' },
    { key: 'colorHex', label: 'Color', type: 'color' },
  ],
  students: [
    { key: 'name', label: 'Name', required: true },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'matricule', label: 'Matricule' },
    { key: 'classId', label: 'Class ID', required: true },
    { key: 'sex', label: 'Sex', options: [{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }] },
  ],
  staff: [
    { key: 'name', label: 'Name', required: true },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone' },
    { key: 'cin', label: 'CIN' },
    { key: 'matricule', label: 'Matricule' },
    { key: 'staffTitle', label: 'Title' },
  ],
  classes: [
    { key: 'name', label: 'Name', required: true },
    { key: 'capacity', label: 'Capacity', type: 'number' },
    { key: 'colorHex', label: 'Color', type: 'color' },
  ],
  subjects: [
    { key: 'name', label: 'Name', required: true },
    { key: 'nameAr', label: 'Name (AR)' },
    { key: 'nameFr', label: 'Name (FR)' },
    { key: 'category', label: 'Category', options: [
      { value: 'CORE', label: 'Core' }, { value: 'ELECTIVE', label: 'Elective' },
      { value: 'SCIENCE', label: 'Science' }, { value: 'LANGUAGE', label: 'Language' },
      { value: 'ARTS', label: 'Arts' }, { value: 'SPORTS', label: 'Sports' },
      { value: 'TECH', label: 'Technology' }, { value: 'OTHER', label: 'Other' },
    ]},
    { key: 'colorHex', label: 'Color', type: 'color' },
  ],
  rooms: [
    { key: 'name', label: 'Name', required: true },
    { key: 'building', label: 'Building' },
    { key: 'capacity', label: 'Capacity', type: 'number' },
    { key: 'type', label: 'Type', options: [
      { value: 'CLASSROOM', label: 'Classroom' }, { value: 'LAB', label: 'Lab' },
      { value: 'GYM', label: 'Gym' }, { value: 'AUDITORIUM', label: 'Auditorium' },
      { value: 'LIBRARY', label: 'Library' }, { value: 'OTHER', label: 'Other' },
    ]},
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
  terms: [
    { key: 'name', label: 'Name', required: true },
    { key: 'startDate', label: 'Start Date', type: 'date', required: true },
    { key: 'endDate', label: 'End Date', type: 'date', required: true },
  ],
  events: [
    { key: 'title', label: 'Title', required: true },
    { key: 'type', label: 'Type', options: [
      { value: 'HOLIDAY', label: 'Holiday' }, { value: 'EXAM', label: 'Exam' },
      { value: 'TRIP', label: 'Trip' }, { value: 'MEETING', label: 'Meeting' },
      { value: 'CLOSURE', label: 'Closure' }, { value: 'OTHER', label: 'Other' },
    ]},
    { key: 'startDate', label: 'Start Date', type: 'date', required: true },
    { key: 'endDate', label: 'End Date', type: 'date', required: true },
  ],
  'leave-types': [
    { key: 'name', label: 'Name', required: true },
    { key: 'maxDaysPerYear', label: 'Max Days/Year', type: 'number' },
    { key: 'colorHex', label: 'Color', type: 'color' },
  ],
}

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

export default function AdminSchoolDetailPage() {
  const t = useTranslations('admin')
  const params = useParams()
  const schoolId = params.id as string
  const { adminFetch } = useAdminFetch()

  const [school, setSchool] = useState<School | null>(null)
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [tabData, setTabData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tabLoading, setTabLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<Record<string, any>>({})
  const [apiError, setApiError] = useState('')
  const [editForm, setEditForm] = useState({ name: '', slug: '', plan: '', language: '', subscriptionStatus: '' })

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

  const handleCreate = async () => {
    const r = await adminFetch(
      `/api/admin/schools/${schoolId}/data?type=${activeTab}`,
      { method: 'POST', body: JSON.stringify(createForm) }
    )
    if (!r.ok) {
      const d = await r.json()
      alert(d.error || 'Create failed')
      return
    }
    setShowCreate(false)
    setCreateForm({})
    loadTabData()
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
  }
  if (!school) return <p className="text-text-muted">{apiError || t('not_found')}</p>

  const canCreate = ENTITY_FIELDS[activeTab] !== undefined

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
          <button onClick={() => { setShowCreate(true); setCreateForm({}) }} className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition">
            <Plus className="h-4 w-4" /> Add
          </button>
        )}
      </div>

      {/* Error banner */}
      {apiError && (
        <div className="rounded-md bg-danger-dim p-3 text-sm text-danger">{apiError}</div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 rounded-lg border border-border-subtle bg-bg-elevated p-1">
        {TABS.map(({ key, icon: Icon }) => (
          <button key={key} onClick={() => { setActiveTab(key); setShowCreate(false) }}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition ${activeTab === key ? 'bg-accent text-white' : 'text-text-muted hover:bg-bg-surface hover:text-text-primary'}`}>
            <Icon className="h-3.5 w-3.5" /> {t(`tab_${key}`)}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showCreate && canCreate && (
        <CreateForm
          fields={ENTITY_FIELDS[activeTab]}
          form={createForm}
          setForm={setCreateForm}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Tab content */}
      {activeTab === 'overview' ? (
        <OverviewTab school={school} editing={editing} editForm={editForm} setEditForm={setEditForm} onSave={handleSave} onCancel={() => setEditing(false)} t={t} />
      ) : tabLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : (
        <DataTable data={tabData} onDelete={handleDelete} />
      )}
    </div>
  )
}

// ─── Create Form ──────────────────────────────────────────────
function CreateForm({
  fields, form, setForm, onSubmit, onCancel,
}: {
  fields: { key: string; label: string; type?: string; required?: boolean; options?: { value: string; label: string }[] }[]
  form: Record<string, any>
  setForm: (f: Record<string, any>) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <div className="rounded-xl border border-accent/30 bg-bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">Create New</h3>
        <button onClick={onCancel} className="text-text-muted hover:text-text-primary"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-xs text-text-muted">
              {f.label} {f.required && <span className="text-danger">*</span>}
            </label>
            {f.options ? (
              <select
                value={form[f.key] || ''}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full rounded-md border border-border-subtle bg-bg-surface px-2.5 py-1.5 text-sm text-text-primary"
              >
                <option value="">—</option>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : f.type === 'checkbox' ? (
              <input type="checkbox" checked={!!form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                className="h-4 w-4 rounded border-border-subtle" />
            ) : f.type === 'color' ? (
              <input type="color" value={form[f.key] || '#4f6ef7'} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="h-8 w-16 rounded border border-border-subtle bg-bg-surface" />
            ) : (
              <input
                type={f.type || 'text'}
                value={form[f.key] || ''}
                onChange={(e) => setForm({ ...form, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
                className="w-full rounded-md border border-border-subtle bg-bg-surface px-2.5 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={onSubmit} className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition">
          <Save className="h-3.5 w-3.5" /> Create
        </button>
        <button onClick={onCancel} className="rounded-md border border-border-subtle px-4 py-1.5 text-sm text-text-secondary hover:bg-bg-surface transition">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────
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
            <option value="FREE">FREE</option><option value="BASIC">BASIC</option>
            <option value="PREMIUM">PREMIUM</option><option value="ENTERPRISE">ENTERPRISE</option>
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

// ─── Data Table with Delete ───────────────────────────────────
function DataTable({ data, onDelete }: { data: any[]; onDelete: (id: string) => void }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-bg-card p-8 text-center text-text-muted">
        No records found. Use the Add button to create one.
      </div>
    )
  }

  const sample = data[0]
  const skipKeys = ['id', 'schoolId', 'createdAt', 'updatedAt', '_count']
  const columns = Object.keys(sample).filter(
    (k) => !skipKeys.includes(k) && typeof sample[k] !== 'object'
  )
  const countKeys = sample._count ? Object.keys(sample._count) : []

  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs text-text-muted">
            {columns.map((col) => (
              <th key={col} className="px-4 py-3 whitespace-nowrap">{col}</th>
            ))}
            {countKeys.map((ck) => (
              <th key={ck} className="px-4 py-3 whitespace-nowrap">#{ck}</th>
            ))}
            <th className="px-4 py-3 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.id || i} className="border-b border-border-subtle last:border-0 hover:bg-bg-surface/50">
              {columns.map((col) => (
                <td key={col} className="px-4 py-2.5 text-text-secondary max-w-[200px] truncate">
                  {renderCell(row[col])}
                </td>
              ))}
              {countKeys.map((ck) => (
                <td key={ck} className="px-4 py-2.5 text-text-muted">{row._count?.[ck] ?? '—'}</td>
              ))}
              <td className="px-4 py-2.5">
                {row.id && (
                  <button onClick={() => onDelete(row.id)} className="rounded p-1 text-text-muted hover:bg-danger-dim hover:text-danger transition">
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

function renderCell(value: any): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Date(value).toLocaleDateString()
  }
  return String(value)
}
