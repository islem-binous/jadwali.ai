/**
 * Lightweight CSV parser and utilities — no external dependencies.
 */

/** Parse CSV text into rows of string arrays. Handles quoted fields. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let current = ''
  let inQuotes = false
  let row: string[] = []

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        row.push(current.trim())
        current = ''
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && text[i + 1] === '\n') i++
        row.push(current.trim())
        if (row.some((cell) => cell !== '')) rows.push(row)
        row = []
        current = ''
      } else {
        current += char
      }
    }
  }
  // Last row
  row.push(current.trim())
  if (row.some((cell) => cell !== '')) rows.push(row)

  return rows
}

/** Normalize a name for fuzzy matching: lowercase, trim, collapse whitespace */
export function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

/** Find a column index by trying multiple aliases (case-insensitive) */
export function findColumn(headers: string[], aliases: string[]): number {
  return headers.findIndex((h) =>
    aliases.some((a) => normalizeName(h) === normalizeName(a)),
  )
}

/** Expected CSV headers per entity type (matching export format) */
export const CSV_HEADERS: Record<string, string[]> = {
  teachers: ['Name', 'Email', 'Phone', 'Subjects', 'Max/Day', 'Max/Week'],
  subjects: ['Name', 'Name (French)', 'Name (Arabic)', 'Category', 'Color'],
  classes: ['Name', 'Grade', 'Capacity', 'Color'],
  rooms: ['Name', 'Building', 'Capacity', 'Type'],
  timetable: ['Day', 'Period', 'Class', 'Subject', 'Teacher', 'Room'],
}
