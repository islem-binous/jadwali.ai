'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Link } from '@/i18n/navigation'
import {
  Mail, Clock, HelpCircle, Rocket, FileCode, Activity,
  Zap, Crown, Star, Building2,
} from 'lucide-react'
import { LegalPageShell } from '@/components/layout/LegalPageShell'
import { AccordionItem } from '@/components/ui/Accordion'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const },
  }),
}

const RESPONSE_TIERS = [
  { key: 'free', icon: Zap, color: 'text-text-muted', bg: 'bg-bg-surface' },
  { key: 'starter', icon: Star, color: 'text-emerald', bg: 'bg-emerald/10' },
  { key: 'pro', icon: Crown, color: 'text-accent', bg: 'bg-accent-dim' },
  { key: 'enterprise', icon: Building2, color: 'text-amber-400', bg: 'bg-amber-400/10' },
]

const QUICK_LINKS = [
  { key: 'help_center', icon: HelpCircle, href: '/help' as const, auth: true },
  { key: 'getting_started', icon: Rocket, href: '/help' as const, auth: true },
  { key: 'api_docs', icon: FileCode, href: null },
  { key: 'status', icon: Activity, href: null },
]

export default function SupportPage() {
  const t = useTranslations('support')

  return (
    <LegalPageShell>
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Hero */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-dim">
              <HelpCircle className="h-7 w-7 text-accent" />
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold text-text-primary sm:text-4xl">
            {t('title')}
          </h1>
          <p className="mt-3 text-lg text-text-secondary max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </motion.div>

        {/* Contact Card */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={1}
          className="rounded-xl border border-border-subtle bg-bg-card p-6 mb-8"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-dim shrink-0">
              <Mail className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-text-primary mb-1">
                {t('contact_title')}
              </h2>
              <p className="text-sm text-text-secondary mb-3">
                {t('contact_desc')}
              </p>
              <a
                href={`mailto:${t('contact_email')}`}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover"
              >
                <Mail className="h-4 w-4" />
                {t('contact_email')}
              </a>
            </div>
          </div>
        </motion.div>

        {/* Response Times */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={2}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-text-muted" />
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {t('response_title')}
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {RESPONSE_TIERS.map((tier) => {
              const Icon = tier.icon
              return (
                <div
                  key={tier.key}
                  className="rounded-xl border border-border-subtle bg-bg-card p-4 text-center"
                >
                  <div className={`flex h-10 w-10 mx-auto items-center justify-center rounded-lg ${tier.bg} mb-3`}>
                    <Icon className={`h-5 w-5 ${tier.color}`} />
                  </div>
                  <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">
                    {t(`response_${tier.key}_label`)}
                  </p>
                  <p className="text-sm font-semibold text-text-primary">
                    {t(`response_${tier.key}`)}
                  </p>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={3}
          className="mb-8"
        >
          <h2 className="font-display text-lg font-semibold text-text-primary mb-4">
            {t('faq_title')}
          </h2>
          <div className="rounded-xl border border-border-subtle bg-bg-card overflow-hidden">
            <div className="divide-y divide-border-subtle">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="px-5">
                  <AccordionItem title={t(`faq_q${n}`)}>
                    {t(`faq_a${n}`)}
                  </AccordionItem>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={4}
          className="mb-8"
        >
          <h2 className="font-display text-lg font-semibold text-text-primary mb-4">
            {t('quick_links_title')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon
              const content = (
                <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-bg-card p-4 transition hover:border-border-default hover:bg-bg-surface">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-dim shrink-0">
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {t(`link_${link.key}`)}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {t(`link_${link.key}_desc`)}
                    </p>
                  </div>
                </div>
              )

              if (link.href) {
                return (
                  <Link key={link.key} href={link.href}>
                    {content}
                  </Link>
                )
              }

              return (
                <div key={link.key} className="opacity-60 cursor-not-allowed">
                  {content}
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* System Status */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={5}
        >
          <h2 className="font-display text-lg font-semibold text-text-primary mb-4">
            {t('status_title')}
          </h2>
          <div className="rounded-xl border border-border-subtle bg-bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald" />
              </span>
              <p className="text-sm font-medium text-text-primary">
                {t('status_operational')}
              </p>
            </div>
            <p className="mt-2 text-xs text-text-muted">
              {t('status_last_checked')}
            </p>
          </div>
        </motion.div>
      </div>
    </LegalPageShell>
  )
}
