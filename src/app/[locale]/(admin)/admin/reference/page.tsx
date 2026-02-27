'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useAdminFetch } from '@/hooks/useAdminFetch'
import { Database, Loader2, ChevronDown, ChevronRight, X, Search, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react'

type RefRow = Record<string, any>

const REF_TYPES = [
  { key: 'governorates', label: 'Governorates' },
  { key: 'tunisian-schools', label: 'Tunisian Schools (Registry)' },
  { key: 'grade-levels', label: 'Grade Levels' },
  { key: 'tunisian-subjects', label: 'Subjects' },
  { key: 'session-types', label: 'Session Types' },
  { key: 'teacher-grades', label: 'Teacher Professional Grades' },
]

// Fields shown in table & editable per type
const TYPE_FIELDS: Record<string, { key: string; label: string; editable?: boolean }[]> = {
  governorates: [
    { key: 'code', label: 'Code', editable: true },
    { key: 'nameAr', label: 'Name (AR)', editable: true },
    { key: 'nameFr', label: 'Name (FR)', editable: true },
    { key: 'nameEn', label: 'Name (EN)', editable: true },
  ],
  'tunisian-schools': [
    { key: 'code', label: 'Code', editable: true },
    { key: 'nameAr', label: 'Name (AR)', editable: true },
    { key: 'governorateCode', label: 'Gov. Code', editable: true },
    { key: 'zipCode', label: 'Zip Code', editable: true },
  ],
  'grade-levels': [
    { key: 'code', label: 'Code', editable: true },
    { key: 'nameAr', label: 'Name (AR)', editable: true },
    { key: 'nameFr', label: 'Name (FR)', editable: true },
    { key: 'nameEn', label: 'Name (EN)', editable: true },
  ],
  'tunisian-subjects': [
    { key: 'code', label: 'Code', editable: true },
    { key: 'nameAr', label: 'Name (AR)', editable: true },
    { key: 'nameFr', label: 'Name (FR)', editable: true },
    { key: 'nameEn', label: 'Name (EN)', editable: true },
    { key: 'sessionTypeCode', label: 'Session Type', editable: true },
    { key: 'pedagogicDay', label: 'Pedagogic Day', editable: true },
  ],
  'session-types': [
    { key: 'code', label: 'Code', editable: true },
    { key: 'nameAr', label: 'Name (AR)', editable: true },
    { key: 'nameFr', label: 'Name (FR)', editable: true },
    { key: 'nameEn', label: 'Name (EN)', editable: true },
  ],
  'teacher-grades': [
    { key: 'code', label: 'Code', editable: true },
    { key: 'nameAr', label: 'Name (AR)', editable: true },
    { key: 'nameFr', label: 'Name (FR)', editable: true },
    { key: 'nameEn', label: 'Name (EN)', editable: true },
  ],
}

export default function AdminReferencePage() {
  const t = useTranslations('admin')
  const { adminFetch } = useAdminFetch()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [activeType, setActiveType] = useState<string | null>(null)
  const [data, setData] = useState<RefRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)

  // Edit modal state
  const [editRow, setEditRow] = useState<RefRow | null>(null)
  const [editFields, setEditFields] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // School search + pagination
  const [schoolSearch, setSchoolSearch] = useState('')
  const [schoolPage, setSchoolPage] = useState(1)
  const [schoolTotal, setSchoolTotal] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const SCHOOL_LIMIT = 50

  useEffect(() => {
    adminFetch('/api/admin/reference')
      .then((r) => r.json())
      .then((d) => setCounts(d.counts || {}))
      .finally(() => setLoading(false))
  }, [adminFetch])

  const loadType = useCallback((type: string) => {
    if (activeType === type) { setActiveType(null); return }
    setActiveType(type)
    setDataLoading(true)
    setSchoolSearch('')
    setSchoolPage(1)

    if (type === 'tunisian-schools') {
      adminFetch(`/api/admin/reference?type=tunisian-schools&page=1&limit=${SCHOOL_LIMIT}`)
        .then((r) => r.json())
        .then((d) => {
          setData(d.data || [])
          setSchoolTotal(d.total || 0)
        })
        .finally(() => setDataLoading(false))
    } else {
      adminFetch(`/api/admin/reference?type=${type}`)
        .then((r) => r.json())
        .then((d) => setData(d.data || []))
        .finally(() => setDataLoading(false))
    }
  }, [adminFetch, activeType])

  // School search handler (debounced)
  const searchSchools = useCallback((query: string, page: number) => {
    setDataLoading(true)
    const params = new URLSearchParams({
      type: 'tunisian-schools',
      page: String(page),
      limit: String(SCHOOL_LIMIT),
    })
    if (query) params.set('search', query)
    adminFetch(`/api/admin/reference?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d.data || [])
        setSchoolTotal(d.total || 0)
        setSchoolPage(page)
      })
      .finally(() => setDataLoading(false))
  }, [adminFetch])

  function handleSchoolSearchChange(value: string) {
    setSchoolSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      searchSchools(value, 1)
    }, 300)
  }

  function handleSchoolPageChange(newPage: number) {
    searchSchools(schoolSearch, newPage)
  }

  // Open edit modal
  function openEditModal(row: RefRow) {
    setEditRow(row)
    setSaveError('')
    const fields: Record<string, string> = {}
    const fieldDefs = TYPE_FIELDS[activeType!] || []
    for (const f of fieldDefs) {
      fields[f.key] = row[f.key] === null || row[f.key] === undefined ? '' : String(row[f.key])
    }
    setEditFields(fields)
  }

  // Save edit
  async function handleSave() {
    if (!editRow || !activeType) return
    setSaving(true)
    setSaveError('')
    try {
      const res = await adminFetch('/api/admin/reference', {
        method: 'PUT',
        body: JSON.stringify({ type: activeType, id: editRow.id, ...editFields }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Save failed')
      }
      const updated = await res.json()
      // Update the row in-place
      setData((prev) => prev.map((r) => r.id === updated.id ? { ...r, ...updated } : r))
      setEditRow(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
  }

  const totalSchoolPages = Math.ceil(schoolTotal / SCHOOL_LIMIT)

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-text-primary">
        Reference Data
      </h1>
      <p className="text-sm text-text-muted">Tunisian education reference tables</p>

      <div className="space-y-2">
        {REF_TYPES.map((rt) => {
          const isOpen = activeType === rt.key
          const countKey = rt.key === 'tunisian-schools' ? 'tunisianSchools'
            : rt.key === 'grade-levels' ? 'gradeLevels'
            : rt.key === 'tunisian-subjects' ? 'tunisianSubjects'
            : rt.key === 'session-types' ? 'sessionTypes'
            : rt.key === 'teacher-grades' ? 'teacherGrades'
            : rt.key
          const count = counts[countKey] ?? 0

          return (
            <div key={rt.key} className="rounded-xl border border-border-subtle bg-bg-card overflow-hidden">
              <button
                onClick={() => loadType(rt.key)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-bg-surface/50 transition"
              >
                <div className="flex items-center gap-3">
                  <Database className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-text-primary">{rt.label}</span>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    {count}
                  </span>
                </div>
                {isOpen ? <ChevronDown className="h-4 w-4 text-text-muted" /> : <ChevronRight className="h-4 w-4 text-text-muted" />}
              </button>

              {isOpen && (
                <div className="border-t border-border-subtle">
                  {/* Search bar for schools */}
                  {rt.key === 'tunisian-schools' && (
                    <div className="px-4 py-3 border-b border-border-subtle">
                      <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                        <input
                          type="text"
                          value={schoolSearch}
                          onChange={(e) => handleSchoolSearchChange(e.target.value)}
                          placeholder="Search by name, code..."
                          className="w-full rounded-md border border-border-default bg-bg-elevated pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                        />
                      </div>
                      {schoolSearch && (
                        <p className="mt-2 text-xs text-text-muted">
                          {schoolTotal} result{schoolTotal !== 1 ? 's' : ''} found
                        </p>
                      )}
                    </div>
                  )}

                  {dataLoading ? (
                    <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
                  ) : data.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-text-muted">No data</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <RefTable
                          data={data}
                          fields={TYPE_FIELDS[rt.key] || []}
                          onRowClick={openEditModal}
                        />
                      </div>

                      {/* Pagination for schools */}
                      {rt.key === 'tunisian-schools' && totalSchoolPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
                          <p className="text-xs text-text-muted">
                            Page {schoolPage} of {totalSchoolPages} ({schoolTotal} total)
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSchoolPageChange(schoolPage - 1)}
                              disabled={schoolPage <= 1}
                              className="rounded-md border border-border-default bg-bg-elevated px-2 py-1.5 text-xs text-text-secondary hover:bg-bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleSchoolPageChange(schoolPage + 1)}
                              disabled={schoolPage >= totalSchoolPages}
                              className="rounded-md border border-border-default bg-bg-elevated px-2 py-1.5 text-xs text-text-secondary hover:bg-bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <ChevronRightIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Edit Modal */}
      {editRow && activeType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4 rounded-xl border border-border-subtle bg-bg-card shadow-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <h2 className="text-base font-semibold text-text-primary">Edit Record</h2>
              <button
                onClick={() => setEditRow(null)}
                className="rounded-md p-1 text-text-muted hover:text-text-primary hover:bg-bg-surface transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {saveError && (
                <div className="rounded-md bg-danger-dim p-3 text-sm text-danger">{saveError}</div>
              )}

              {(TYPE_FIELDS[activeType] || []).map((field) => (
                <div key={field.key}>
                  <label className="mb-1 block text-xs font-medium text-text-muted">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={editFields[field.key] || ''}
                    onChange={(e) =>
                      setEditFields((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    disabled={!field.editable}
                    className="w-full rounded-md border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border-subtle">
              <button
                onClick={() => setEditRow(null)}
                className="rounded-md border border-border-default bg-bg-elevated px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-surface transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RefTable({
  data,
  fields,
  onRowClick,
}: {
  data: RefRow[]
  fields: { key: string; label: string }[]
  onRowClick: (row: RefRow) => void
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border-subtle text-left text-xs text-text-muted">
          {fields.map((f) => (
            <th key={f.key} className="px-4 py-2 whitespace-nowrap">{f.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr
            key={row.id || i}
            onClick={() => onRowClick(row)}
            className="border-b border-border-subtle last:border-0 hover:bg-bg-surface/50 cursor-pointer transition"
          >
            {fields.map((f) => (
              <td key={f.key} className="px-4 py-2 text-text-secondary max-w-[250px] truncate">
                {row[f.key] === null || row[f.key] === undefined ? '—' : String(row[f.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
