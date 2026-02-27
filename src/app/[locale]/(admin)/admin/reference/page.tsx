'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useAdminFetch } from '@/hooks/useAdminFetch'
import { Database, Loader2, ChevronDown, ChevronRight } from 'lucide-react'

const REF_TYPES = [
  { key: 'governorates', label: 'Governorates' },
  { key: 'tunisian-schools', label: 'Tunisian Schools (Registry)' },
  { key: 'grade-levels', label: 'Grade Levels' },
  { key: 'tunisian-subjects', label: 'Subjects' },
  { key: 'session-types', label: 'Session Types' },
  { key: 'teacher-grades', label: 'Teacher Professional Grades' },
]

export default function AdminReferencePage() {
  const t = useTranslations('admin')
  const { adminFetch } = useAdminFetch()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [activeType, setActiveType] = useState<string | null>(null)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)

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
    let url = `/api/admin/reference?type=${type}`
    adminFetch(url)
      .then((r) => r.json())
      .then((d) => setData(d.data || []))
      .finally(() => setDataLoading(false))
  }, [adminFetch, activeType])

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-text-primary">
        Reference Data
      </h1>
      <p className="text-sm text-text-muted">Tunisian education reference tables (read-only)</p>

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
                  {dataLoading ? (
                    <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
                  ) : data.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-text-muted">No data</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <RefTable data={data} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RefTable({ data }: { data: any[] }) {
  const sample = data[0]
  const skipKeys = ['id']
  const columns = Object.keys(sample).filter(
    (k) => !skipKeys.includes(k) && typeof sample[k] !== 'object'
  )

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border-subtle text-left text-xs text-text-muted">
          {columns.map((col) => (
            <th key={col} className="px-4 py-2 whitespace-nowrap">{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={row.id || i} className="border-b border-border-subtle last:border-0 hover:bg-bg-surface/50">
            {columns.map((col) => (
              <td key={col} className="px-4 py-2 text-text-secondary max-w-[250px] truncate">
                {row[col] === null || row[col] === undefined ? '—' : String(row[col])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
