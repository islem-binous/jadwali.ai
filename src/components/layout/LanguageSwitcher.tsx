'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { locales, type Locale } from '@/i18n/config'
import { Globe } from 'lucide-react'

const labels: Record<Locale, string> = {
  en: 'EN',
  fr: 'FR',
  ar: 'عر',
}

export function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()

  function switchLocale(newLocale: Locale) {
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <div className="flex items-center gap-1">
      <Globe className="h-4 w-4 text-text-muted" />
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchLocale(loc)}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            locale === loc
              ? 'bg-accent-dim text-accent'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          {labels[loc]}
        </button>
      ))}
    </div>
  )
}
