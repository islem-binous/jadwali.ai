'use client'

import React, { useCallback, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, RefreshCw, Download } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Badge } from './Badge'
import { useToast } from './Toast'
import { CSV_HEADERS } from '@/lib/csv'
import { downloadTemplate } from '@/lib/export-helpers'

type ImportType = 'teachers' | 'subjects' | 'classes' | 'rooms' | 'timetable' | 'grades' | 'events'

interface ImportModalProps {
  open: boolean
  onClose: () => void
  type: ImportType
  schoolId: string
  timetableId?: string
  onComplete: () => void
}

interface PreviewRow {
  rowIndex: number
  data: Record<string, string>
  status: 'ok' | 'update' | 'error'
  errors: string[]
  matchedId?: string
}

type Step = 'upload' | 'preview' | 'importing' | 'done'

export function ImportModal({ open, onClose, type, schoolId, timetableId, onComplete }: ImportModalProps) {
  const t = useTranslations('app')
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null)

  const headers = CSV_HEADERS[type] || []

  const reset = useCallback(() => {
    setStep('upload')
    setFile(null)
    setPreviewRows([])
    setResult(null)
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setStep('preview')

    const formData = new FormData()
    formData.append('type', type)
    formData.append('schoolId', schoolId)
    formData.append('mode', 'preview')
    formData.append('file', f)
    if (timetableId) formData.append('timetableId', timetableId)

    try {
      const res = await fetch('/api/import', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Import failed')
        setStep('upload')
        return
      }

      setPreviewRows(data.rows || [])
    } catch {
      toast.error('Failed to preview import')
      setStep('upload')
    }
  }, [type, schoolId, timetableId, toast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) {
      handleFile(f)
    }
  }, [handleFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleCommit = useCallback(async () => {
    if (!file) return
    setStep('importing')

    const formData = new FormData()
    formData.append('type', type)
    formData.append('schoolId', schoolId)
    formData.append('mode', 'commit')
    formData.append('file', file)
    if (timetableId) formData.append('timetableId', timetableId)

    try {
      const res = await fetch('/api/import', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Import failed')
        setStep('preview')
        return
      }

      setResult({ created: data.created || 0, updated: data.updated || 0, skipped: data.skipped || 0 })
      setStep('done')
      onComplete()
      toast.success(t('import_success'))
    } catch {
      toast.error('Import failed')
      setStep('preview')
    }
  }, [file, type, schoolId, timetableId, toast, t, onComplete])

  const okCount = previewRows.filter((r) => r.status === 'ok').length
  const updateCount = previewRows.filter((r) => r.status === 'update').length
  const errorCount = previewRows.filter((r) => r.status === 'error').length
  const importableCount = okCount + updateCount

  const displayHeaders = type === 'timetable'
    ? ['Day', 'Period', 'Class', 'Subject', 'Teacher', 'Room']
    : type === 'teachers'
      ? ['Name', 'Email', 'Subjects']
      : type === 'subjects'
        ? ['Name', 'Category']
        : type === 'classes'
          ? ['Name', 'Grade', 'Capacity']
          : type === 'grades'
            ? ['Grade', 'Level', 'Subject', 'Hours/Week']
            : type === 'events'
              ? ['Title', 'Type', 'Start Date', 'End Date']
              : ['Name', 'Building', 'Type']

  return (
    <Modal open={open} onClose={handleClose} title={`${t('import')} ${t(`type_${type}`)}`} size="lg">
      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            {t('csv_format_hint', { columns: headers.join(', ') })}
          </p>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors
              ${dragOver
                ? 'border-accent bg-accent/5'
                : 'border-border-default hover:border-border-strong hover:bg-bg-surface'
              }
            `}
          >
            <Upload size={32} className="text-text-muted" />
            <p className="text-sm text-text-muted text-center">
              {t('drag_drop_csv')}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {/* Template download */}
          <button
            onClick={() => downloadTemplate(type)}
            className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
          >
            <Download size={14} />
            {t('download_template')}
          </button>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* File name */}
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <FileSpreadsheet size={16} />
            <span>{file?.name}</span>
          </div>

          {/* Summary bar */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="default" size="sm">{t('rows_total', { count: previewRows.length })}</Badge>
            {okCount > 0 && <Badge variant="success" size="sm">{t('rows_new', { count: okCount })}</Badge>}
            {updateCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                {t('rows_update', { count: updateCount })}
              </span>
            )}
            {errorCount > 0 && <Badge variant="danger" size="sm">{t('rows_error', { count: errorCount })}</Badge>}
          </div>

          {/* Preview table */}
          <div className="max-h-64 overflow-auto rounded-lg border border-border-subtle">
            <table className="w-full text-xs">
              <thead className="bg-bg-surface sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-text-muted font-medium">#</th>
                  {displayHeaders.map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-text-muted font-medium">{h}</th>
                  ))}
                  <th className="px-3 py-2 text-left text-text-muted font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {previewRows.map((row) => (
                  <tr
                    key={row.rowIndex}
                    className={
                      row.status === 'error'
                        ? 'bg-red-500/5'
                        : row.status === 'update'
                          ? 'bg-blue-500/5'
                          : 'bg-green-500/5'
                    }
                  >
                    <td className="px-3 py-1.5 text-text-muted">{row.rowIndex}</td>
                    {displayHeaders.map((h) => {
                      const key = h.toLowerCase().replace(/ /g, '').replace(/\(.*\)/, '')
                      const val = row.data[key] || row.data[h.toLowerCase()] || row.data[h] || ''
                      return (
                        <td key={h} className="px-3 py-1.5 text-text-primary max-w-[120px] truncate">
                          {val}
                        </td>
                      )
                    })}
                    <td className="px-3 py-1.5">
                      {row.status === 'ok' && (
                        <span className="inline-flex items-center gap-1 text-green-400">
                          <CheckCircle size={12} /> {t('status_new')}
                        </span>
                      )}
                      {row.status === 'update' && (
                        <span className="inline-flex items-center gap-1 text-blue-400">
                          <RefreshCw size={12} /> {t('status_update')}
                        </span>
                      )}
                      {row.status === 'error' && (
                        <span className="inline-flex items-center gap-1 text-red-400" title={row.errors.join(', ')}>
                          <AlertCircle size={12} /> {row.errors[0]}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={reset}>
              {t('back')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCommit}
              disabled={importableCount === 0}
            >
              {t('confirm_import', { count: importableCount })}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === 'importing' && (
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-text-muted">{t('importing')}</p>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && result && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle size={40} className="text-green-400" />
            <p className="text-sm text-text-primary text-center">
              {t('import_complete', {
                created: result.created,
                updated: result.updated,
                skipped: result.skipped,
              })}
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleClose}>
              {t('close')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
