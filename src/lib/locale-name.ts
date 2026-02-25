type LocalizedRow = {
  name: string
  nameAr?: string | null
  nameFr?: string | null
  nameEn?: string | null
}

export function getLocalizedName(row: LocalizedRow, locale: string): string {
  if (locale === 'ar' && row.nameAr) return row.nameAr
  if (locale === 'fr' && row.nameFr) return row.nameFr
  if (locale === 'en' && row.nameEn) return row.nameEn
  return row.name
}
