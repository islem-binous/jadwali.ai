/**
 * Opens a print-optimized popup window with the timetable rendered as an A4 landscape table.
 * Works for both LTR (en/fr) and RTL (ar) layouts.
 * The browser's print dialog lets the user print or "Save as PDF".
 */

interface PrintLesson {
  dayOfWeek: number
  periodId: string
  subject: { name: string; nameAr?: string | null; nameFr?: string | null; colorHex: string }
  teacher: { name: string }
  room?: { name: string } | null
  groupLabel?: string | null
  weekType?: string | null
}

interface PrintPeriod {
  id: string
  name: string
  startTime: string
  endTime: string
  isBreak: boolean
  breakLabel?: string | null
}

export interface PrintTimetableParams {
  schoolName: string
  directorName: string
  filterLabel: string
  yearLabel: string
  lessons: PrintLesson[]
  periods: PrintPeriod[]
  days: number[]
  dayNames: string[]
  locale: string
  isRtl: boolean
  translations: {
    printTitle: string
    director: string
    academicYear: string
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getSubjectName(
  subject: { name: string; nameAr?: string | null; nameFr?: string | null },
  locale: string,
): string {
  if (locale === 'ar' && subject.nameAr) return subject.nameAr
  if (locale === 'fr' && subject.nameFr) return subject.nameFr
  return subject.name
}

export function openPrintTimetable(params: PrintTimetableParams): void {
  const {
    schoolName, directorName, filterLabel, yearLabel,
    lessons, periods, days, dayNames, locale, isRtl, translations,
  } = params

  // Build lesson lookup: key = "dayOfWeek-periodId" → lessons[]
  const lessonMap = new Map<string, PrintLesson[]>()
  for (const l of lessons) {
    const key = `${l.dayOfWeek}-${l.periodId}`
    const arr = lessonMap.get(key) || []
    arr.push(l)
    lessonMap.set(key, arr)
  }

  // Build table rows
  const teachingPeriods = periods.filter(p => !p.isBreak)
  const breakPeriods = new Set(periods.filter(p => p.isBreak).map(p => p.id))

  let tableRows = ''
  for (const period of periods) {
    if (period.isBreak) {
      tableRows += `<tr class="break-row"><td colspan="${days.length + 1}">${escapeHtml(period.breakLabel || period.name)}</td></tr>`
      continue
    }

    tableRows += '<tr>'
    // Period label cell
    tableRows += `<td class="period-cell"><strong>${escapeHtml(period.name)}</strong><br><span class="time">${escapeHtml(period.startTime)} - ${escapeHtml(period.endTime)}</span></td>`

    // Day cells
    for (const day of days) {
      const cellLessons = lessonMap.get(`${day}-${period.id}`) || []

      if (cellLessons.length === 0) {
        tableRows += '<td class="empty-cell"></td>'
      } else if (cellLessons.length === 1) {
        const l = cellLessons[0]
        const subName = getSubjectName(l.subject, locale)
        const bgColor = `${l.subject.colorHex}25`
        const borderColor = l.subject.colorHex
        let badges = ''
        if (l.groupLabel) badges += `<span class="badge" style="background:${l.subject.colorHex}30;color:${l.subject.colorHex}">Gr.${escapeHtml(l.groupLabel)}</span> `
        if (l.weekType) badges += `<span class="badge badge-week">S${l.weekType === 'A' ? '1' : '2'}</span>`

        tableRows += `<td class="lesson-cell" style="background:${bgColor};border-${isRtl ? 'right' : 'left'}:3px solid ${borderColor}">`
        tableRows += `<div class="subject">${escapeHtml(subName)}</div>`
        tableRows += `<div class="teacher">${escapeHtml(l.teacher.name)}</div>`
        if (l.room) tableRows += `<div class="room">${escapeHtml(l.room.name)}</div>`
        if (badges) tableRows += `<div class="badges">${badges}</div>`
        tableRows += '</td>'
      } else {
        // Multiple lessons in same cell (group/biweekly)
        const parts = cellLessons.map(l => {
          const subName = getSubjectName(l.subject, locale)
          let badges = ''
          if (l.groupLabel) badges += `<span class="badge" style="background:${l.subject.colorHex}30;color:${l.subject.colorHex}">Gr.${escapeHtml(l.groupLabel)}</span> `
          if (l.weekType) badges += `<span class="badge badge-week">S${l.weekType === 'A' ? '1' : '2'}</span>`
          return `<div class="multi-lesson" style="border-${isRtl ? 'right' : 'left'}:2px solid ${l.subject.colorHex};background:${l.subject.colorHex}15"><span class="subject-sm">${escapeHtml(subName)}</span> <span class="teacher-sm">${escapeHtml(l.teacher.name)}</span>${badges ? ` ${badges}` : ''}</div>`
        })
        tableRows += `<td class="multi-cell">${parts.join('')}</td>`
      }
    }
    tableRows += '</tr>'
  }

  // Header columns
  const headerCols = dayNames.map(name => `<th>${escapeHtml(name)}</th>`).join('')

  const fontFamily = isRtl
    ? "'Cairo', 'Segoe UI', Tahoma, sans-serif"
    : "'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

  const html = `<!DOCTYPE html>
<html lang="${locale}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(translations.printTitle)} - ${escapeHtml(filterLabel)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm 12mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: ${fontFamily};
    font-size: 11px;
    color: #1a1a2e;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid #333;
  }
  .header-left { text-align: ${isRtl ? 'right' : 'left'}; }
  .header-center { text-align: center; flex: 1; }
  .header-right { text-align: ${isRtl ? 'left' : 'right'}; }
  .school-name { font-size: 16px; font-weight: 700; color: #1a1a2e; }
  .director-line { font-size: 10px; color: #555; margin-top: 2px; }
  .filter-label { font-size: 15px; font-weight: 700; color: #1a1a2e; }
  .print-title { font-size: 11px; color: #555; margin-bottom: 2px; }
  .year-label { font-size: 12px; font-weight: 600; color: #333; }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  th {
    background: #f0f0f5;
    font-weight: 600;
    font-size: 11px;
    padding: 6px 4px;
    border: 1px solid #ccc;
    text-align: center;
    color: #333;
  }
  td {
    border: 1px solid #ddd;
    padding: 3px 4px;
    vertical-align: top;
    font-size: 10px;
  }
  .period-cell {
    background: #f8f8fc;
    text-align: center;
    width: 70px;
    font-size: 10px;
    color: #444;
  }
  .period-cell strong { font-size: 11px; color: #222; }
  .time { font-size: 8px; color: #888; }

  .lesson-cell { padding: 3px 5px; }
  .subject { font-weight: 600; font-size: 10px; line-height: 1.3; }
  .teacher { font-size: 9px; color: #555; }
  .room { font-size: 8px; color: #888; }
  .badges { margin-top: 1px; }
  .badge {
    display: inline-block;
    font-size: 7px;
    font-weight: 700;
    padding: 0 3px;
    border-radius: 2px;
  }
  .badge-week { background: #e8f0fe; color: #4f6ef7; }

  .empty-cell { background: #fafafa; }

  .multi-cell { padding: 1px 2px; }
  .multi-lesson {
    padding: 1px 3px;
    margin-bottom: 1px;
    border-radius: 2px;
    font-size: 8px;
    line-height: 1.3;
  }
  .subject-sm { font-weight: 600; }
  .teacher-sm { color: #666; }

  .break-row td {
    background: #f5f5f5;
    text-align: center;
    font-style: italic;
    color: #999;
    font-size: 9px;
    padding: 3px;
  }

  .print-actions {
    text-align: center;
    padding: 16px;
    background: #f8f8fc;
    border-radius: 8px;
    margin-bottom: 12px;
  }
  .print-actions button {
    padding: 8px 24px;
    font-size: 13px;
    font-weight: 600;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    margin: 0 6px;
  }
  .btn-print { background: #4f6ef7; color: #fff; }
  .btn-print:hover { background: #3d5bd9; }
  .btn-close { background: #e5e7eb; color: #333; }
  .btn-close:hover { background: #d1d5db; }

  @media print {
    .print-actions { display: none !important; }
  }
</style>
</head>
<body>
  <div class="print-actions">
    <button class="btn-print" onclick="window.print()">${isRtl ? 'طباعة / تصدير PDF' : locale === 'fr' ? 'Imprimer / Exporter PDF' : 'Print / Export PDF'}</button>
    <button class="btn-close" onclick="window.close()">${isRtl ? 'إغلاق' : locale === 'fr' ? 'Fermer' : 'Close'}</button>
  </div>

  <div class="header">
    <div class="header-left">
      <div class="school-name">${escapeHtml(schoolName)}</div>
      ${directorName ? `<div class="director-line">${escapeHtml(translations.director)}: ${escapeHtml(directorName)}</div>` : ''}
    </div>
    <div class="header-center">
      <div class="print-title">${escapeHtml(translations.printTitle)}</div>
      <div class="filter-label">${escapeHtml(filterLabel)}</div>
    </div>
    <div class="header-right">
      <div class="year-label">${escapeHtml(translations.academicYear)}</div>
      <div class="year-label">${escapeHtml(yearLabel)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:70px"></th>
        ${headerCols}
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
</body>
</html>`

  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  printWindow.document.write(html)
  printWindow.document.close()
}
