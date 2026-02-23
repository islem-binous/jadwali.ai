'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  HelpCircle,
  Search,
  Rocket,
  LayoutDashboard,
  CalendarDays,
  Users,
  UserX,
  ClipboardList,
  Calendar,
  Database,
  BarChart3,
  Sparkles,
  Settings,
  CreditCard,
} from 'lucide-react'
import { useUserStore } from '@/store/userStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { isAdmin } from '@/lib/permissions'
import { getHelpSectionsForRole, HELP_SECTIONS } from '@/lib/help-content'
import { AccordionItem } from '@/components/ui/Accordion'
import { FilterPill } from '@/components/ui/FilterPill'

/* ------------------------------------------------------------------ */
/*  Icon map                                                           */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, React.ElementType> = {
  Rocket,
  LayoutDashboard,
  CalendarDays,
  Users,
  UserX,
  ClipboardList,
  Calendar,
  Database,
  BarChart3,
  Sparkles,
  Settings,
  CreditCard,
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HelpPage() {
  const t = useTranslations('help')
  const user = useUserStore((s) => s.user)
  const role = user?.role || 'ADMIN'
  const adminUser = isAdmin(role)
  const { openWizard, isComplete } = useOnboardingStore()

  const [search, setSearch] = useState('')
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const sections = useMemo(() => getHelpSectionsForRole(role), [role])

  // Build FAQ data from i18n keys
  const sectionData = useMemo(() => {
    return sections.map((section) => {
      const sectionTitle = t(`section_${section.id}`)
      const sectionOverview = t(`section_${section.id}_overview`)

      const faqs: { q: string; a: string }[] = []
      for (let i = 1; i <= section.faqCount; i++) {
        faqs.push({
          q: t(`section_${section.id}_q${i}`),
          a: t(`section_${section.id}_a${i}`),
        })
      }

      return {
        ...section,
        title: sectionTitle,
        overview: sectionOverview,
        faqs,
      }
    })
  }, [sections, t])

  // Filter by search
  const filteredSections = useMemo(() => {
    if (!search.trim()) {
      if (activeSection) {
        return sectionData.filter((s) => s.id === activeSection)
      }
      return sectionData
    }

    const q = search.toLowerCase()
    return sectionData
      .map((section) => {
        const titleMatch = section.title.toLowerCase().includes(q)
        const overviewMatch = section.overview.toLowerCase().includes(q)
        const matchingFaqs = section.faqs.filter(
          (faq) =>
            faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q)
        )

        if (titleMatch || overviewMatch || matchingFaqs.length > 0) {
          return {
            ...section,
            faqs: matchingFaqs.length > 0 ? matchingFaqs : section.faqs,
          }
        }
        return null
      })
      .filter(Boolean) as typeof sectionData
  }, [search, activeSection, sectionData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-dim">
            <HelpCircle className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-text-primary">
              {t('title')}
            </h1>
            <p className="text-sm text-text-muted">{t('subtitle')}</p>
          </div>
        </div>

        {adminUser && !isComplete && (
          <button
            onClick={openWizard}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            <Rocket className="h-4 w-4" />
            {t('resume_setup')}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            if (e.target.value) setActiveSection(null)
          }}
          placeholder={t('search_placeholder')}
          className="w-full rounded-lg border border-border-default bg-bg-surface py-2.5 pl-10 pr-4 rtl:pl-4 rtl:pr-10 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </div>

      {/* Getting Started card (admin only) */}
      {adminUser && !search && !activeSection && (
        <div className="rounded-xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-dim">
              <Rocket className="h-5 w-5 text-accent" />
            </div>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {t('getting_started_title')}
            </h2>
          </div>
          <p className="text-sm text-text-secondary mb-3">
            {t('getting_started_desc')}
          </p>
          {!isComplete && (
            <button
              onClick={openWizard}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
            >
              <Rocket className="h-4 w-4" />
              {t('resume_setup')}
            </button>
          )}
        </div>
      )}

      {/* Layout: sidebar TOC (desktop) + section tabs (mobile) + content */}
      <div className="flex gap-6">
        {/* Desktop TOC sidebar */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-20 self-start">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
            {t('toc_title')}
          </h3>
          <nav className="space-y-0.5">
            <button
              onClick={() => {
                setActiveSection(null)
                setSearch('')
              }}
              className={`w-full text-left rtl:text-right rounded-md px-3 py-2 text-sm transition-colors ${
                !activeSection && !search
                  ? 'bg-accent-dim text-accent font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
              }`}
            >
              All Topics
            </button>
            {sections.map((section) => {
              const Icon = ICON_MAP[section.icon] || HelpCircle
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id)
                    setSearch('')
                  }}
                  className={`w-full text-left rtl:text-right flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    activeSection === section.id
                      ? 'bg-accent-dim text-accent font-medium'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {t(`section_${section.id}`)}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Mobile section filter tabs */}
        <div className="flex-1 min-w-0">
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
            <FilterPill
              label="All"
              active={!activeSection && !search}
              onClick={() => {
                setActiveSection(null)
                setSearch('')
              }}
            />
            {sections.map((section) => (
              <FilterPill
                key={section.id}
                label={t(`section_${section.id}`)}
                active={activeSection === section.id}
                onClick={() => {
                  setActiveSection(
                    activeSection === section.id ? null : section.id
                  )
                  setSearch('')
                }}
              />
            ))}
          </div>

          {/* Section content */}
          {filteredSections.length === 0 ? (
            <div className="rounded-xl border border-border-subtle bg-bg-card p-12 text-center">
              <Search className="mx-auto h-8 w-8 text-text-muted mb-3" />
              <p className="text-sm text-text-muted">{t('no_results')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSections.map((section) => {
                const Icon = ICON_MAP[section.icon] || HelpCircle
                return (
                  <section
                    key={section.id}
                    id={`help-${section.id}`}
                    className="rounded-xl border border-border-subtle bg-bg-card"
                  >
                    {/* Section header */}
                    <div className="px-5 pt-5 pb-3">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-dim">
                          <Icon className="h-4 w-4 text-accent" />
                        </div>
                        <h2 className="font-display text-base font-semibold text-text-primary">
                          {section.title}
                        </h2>
                      </div>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {section.overview}
                      </p>
                    </div>

                    {/* FAQ accordions */}
                    <div className="px-5 pb-4">
                      <div className="border-t border-border-subtle pt-2">
                        {section.faqs.map((faq, idx) => (
                          <AccordionItem
                            key={idx}
                            title={faq.q}
                            defaultOpen={!!search}
                          >
                            {faq.a}
                          </AccordionItem>
                        ))}
                      </div>
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
