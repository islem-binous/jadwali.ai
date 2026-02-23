'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'
import { PRIVACY_SECTIONS } from '@/lib/legal-content'
import { LegalPageShell } from '@/components/layout/LegalPageShell'
import { FilterPill } from '@/components/ui/FilterPill'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const },
  }),
}

export default function PrivacyPage() {
  const t = useTranslations('privacy')
  const [activeSection, setActiveSection] = useState<string>('intro')
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  // Scroll-spy with IntersectionObserver
  useEffect(() => {
    const observers: IntersectionObserver[] = []
    PRIVACY_SECTIONS.forEach((section) => {
      const el = sectionRefs.current[section.id]
      if (!el) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(section.id)
        },
        { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
      )
      observer.observe(el)
      observers.push(observer)
    })
    return () => observers.forEach((o) => o.disconnect())
  }, [])

  const scrollToSection = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <LegalPageShell>
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Page Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-dim">
              <Shield className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">
                {t('title')}
              </h1>
              <p className="text-sm text-text-muted">{t('last_updated')}</p>
            </div>
          </div>
        </motion.div>

        <div className="flex gap-8">
          {/* Desktop TOC Sidebar */}
          <nav className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-20">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                {t('toc_title')}
              </p>
              <ul className="space-y-0.5">
                {PRIVACY_SECTIONS.map((section) => (
                  <li key={section.id}>
                    <button
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left rtl:text-right px-3 py-1.5 text-sm rounded-md transition-colors ${
                        activeSection === section.id
                          ? 'bg-accent-dim text-accent font-medium'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                      }`}
                    >
                      {t(`section_${section.id}`)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Mobile TOC */}
            <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
              {PRIVACY_SECTIONS.map((section) => (
                <FilterPill
                  key={section.id}
                  label={t(`section_${section.id}`)}
                  active={activeSection === section.id}
                  onClick={() => scrollToSection(section.id)}
                />
              ))}
            </div>

            {/* Sections */}
            <div className="space-y-6">
              {PRIVACY_SECTIONS.map((section, i) => {
                const Icon = section.icon
                return (
                  <motion.section
                    key={section.id}
                    ref={(el) => { sectionRefs.current[section.id] = el }}
                    id={section.id}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    custom={i}
                    className="scroll-mt-24 rounded-xl border border-border-subtle bg-bg-card p-6"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-dim">
                        <Icon className="h-4 w-4 text-accent" />
                      </div>
                      <h2 className="font-display text-base font-semibold text-text-primary">
                        {t(`section_${section.id}`)}
                      </h2>
                    </div>

                    {/* Section-specific content */}
                    {section.id === 'data_collected' && (
                      <div className="space-y-3">
                        <p className="text-sm text-text-secondary leading-relaxed">
                          {t('section_data_collected_content')}
                        </p>
                        {['account', 'teacher', 'student', 'schedule', 'usage', 'technical'].map((sub) => (
                          <div key={sub} className="pl-4 rtl:pl-0 rtl:pr-4 border-l-2 rtl:border-l-0 rtl:border-r-2 border-border-subtle">
                            <p className="text-sm font-medium text-text-primary">
                              {t(`section_data_collected_${sub}`)}
                            </p>
                            <p className="text-sm text-text-secondary leading-relaxed">
                              {t(`section_data_collected_${sub}_desc`)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {section.id === 'how_used' && (
                      <div className="space-y-2">
                        <p className="text-sm text-text-secondary leading-relaxed mb-3">
                          {t('section_how_used_content')}
                        </p>
                        <ul className="list-disc pl-5 rtl:pl-0 rtl:pr-5 space-y-1.5">
                          {[1, 2, 3, 4, 5, 6].map((n) => (
                            <li key={n} className="text-sm text-text-secondary leading-relaxed">
                              {t(`section_how_used_item${n}`)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {section.id === 'third_party' && (
                      <div className="space-y-3">
                        <p className="text-sm text-text-secondary leading-relaxed">
                          {t('section_third_party_content')}
                        </p>
                        {['konnect', 'paymee', 'ai'].map((provider) => (
                          <div key={provider} className="pl-4 rtl:pl-0 rtl:pr-4 border-l-2 rtl:border-l-0 rtl:border-r-2 border-border-subtle">
                            <p className="text-sm text-text-secondary leading-relaxed">
                              {t(`section_third_party_${provider}`)}
                            </p>
                          </div>
                        ))}
                        <p className="text-sm font-medium text-text-primary mt-2">
                          {t('section_third_party_no_sell')}
                        </p>
                      </div>
                    )}

                    {section.id === 'rights' && (
                      <div className="space-y-2">
                        <p className="text-sm text-text-secondary leading-relaxed mb-3">
                          {t('section_rights_intro')}
                        </p>
                        <ul className="list-disc pl-5 rtl:pl-0 rtl:pr-5 space-y-1.5">
                          {['access', 'rectify', 'delete', 'object', 'portability'].map((right) => (
                            <li key={right} className="text-sm text-text-secondary leading-relaxed">
                              {t(`section_rights_${right}`)}
                            </li>
                          ))}
                        </ul>
                        <p className="text-sm text-accent mt-3">
                          {t('section_rights_exercise')}
                        </p>
                      </div>
                    )}

                    {section.id === 'contact' && (
                      <div className="space-y-2">
                        <p className="text-sm text-text-secondary leading-relaxed">
                          {t('section_contact_content')}
                        </p>
                        <p className="text-sm text-text-primary font-medium">
                          {t('section_contact_email')}
                        </p>
                        <p className="text-sm text-text-muted">
                          {t('section_contact_address')}
                        </p>
                      </div>
                    )}

                    {/* Default content for sections without special formatting */}
                    {!['data_collected', 'how_used', 'third_party', 'rights', 'contact'].includes(section.id) && (
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {t(`section_${section.id}_content`)}
                      </p>
                    )}
                  </motion.section>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </LegalPageShell>
  )
}
