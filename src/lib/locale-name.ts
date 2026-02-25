type LocalizedRow = {
  nameAr: string
  nameFr?: string | null
  nameEn?: string | null
}

export function getLocalizedName(row: LocalizedRow, locale: string): string {
  if (locale === 'fr' && row.nameFr) return row.nameFr
  if (locale === 'en' && row.nameEn) return row.nameEn
  return row.nameAr
}
