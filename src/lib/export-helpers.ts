import { CSV_HEADERS } from './csv'

/** Trigger a CSV export download from the /api/export endpoint. */
export function triggerExport(params: {
  type: string
  schoolId: string
  format?: 'csv' | 'json'
  timetableId?: string
}) {
  const { type, schoolId, format = 'csv', timetableId } = params
  const qp = new URLSearchParams({ type, schoolId, format })
  if (timetableId) qp.set('timetableId', timetableId)

  const link = document.createElement('a')
  link.href = `/api/export?${qp.toString()}`
  link.download = `${type}-export.${format}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/** Generate and download a blank CSV template for import. */
export function downloadTemplate(type: string) {
  const headers = CSV_HEADERS[type]
  if (!headers) return
  const csv = headers.join(',') + '\n'
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${type}-template.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
