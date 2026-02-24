'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { motion } from 'framer-motion'
import {
  Sparkles, Calendar, Users, Shield, Globe, Zap,
  Check, Star, ArrowRight, MessageSquare,
} from 'lucide-react'
import { PLANS } from '@/lib/plans'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import type { Locale } from '@/i18n/config'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const },
  }),
}

const FEATURE_KEYS = [
  { icon: Sparkles, key: 'ai', color: 'text-accent' },
  { icon: Calendar, key: 'timetable', color: 'text-success' },
  { icon: Users, key: 'substitute', color: 'text-warning' },
  { icon: Shield, key: 'absence', color: 'text-violet' },
  { icon: Globe, key: 'multilingual', color: 'text-info' },
  { icon: Zap, key: 'pwa', color: 'text-danger' },
] as const

export default function LandingPage() {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const plans = Object.values(PLANS)

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border-subtle bg-bg-base/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent">
              <span className="font-display text-lg font-bold text-white">J</span>
            </div>
            <span className="hidden sm:inline font-display text-xl font-bold text-text-primary">
              jadwali<span className="text-accent">.ai</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/auth/login"
              className="hidden sm:inline-block rounded-md px-4 py-2 text-sm font-medium text-text-secondary transition hover:text-text-primary"
            >
              {t('auth.sign_in')}
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
            >
              {t('landing.start_free')}
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-16">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden px-4 py-20 sm:py-32">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-accent/10 blur-[120px]" />

          <motion.div
            className="relative mx-auto max-w-4xl text-center"
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeUp} custom={0} className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-dim px-4 py-1.5 text-sm text-accent-light">
              <Sparkles className="h-4 w-4" />
              {t('landing.badge')}
            </motion.div>

            <motion.h1 variants={fadeUp} custom={1} className="font-display text-4xl font-bold leading-tight text-text-primary sm:text-6xl lg:text-7xl">
              {t('app.tagline')}
            </motion.h1>

            <motion.p variants={fadeUp} custom={2} className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary">
              {t('landing.hero_desc')}
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/auth/signup"
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-base font-semibold text-white shadow-accent-glow transition hover:bg-accent-hover sm:w-auto"
              >
                {t('landing.start_free')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/dashboard"
                className="w-full rounded-xl border border-border-default bg-bg-elevated px-8 py-3.5 text-base font-semibold text-text-primary transition hover:bg-bg-surface sm:w-auto"
              >
                {t('landing.view_timetable')}
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* ── Features ── */}
        <section className="border-t border-border-subtle px-4 py-20">
          <div className="mx-auto max-w-6xl">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="font-display text-3xl font-bold text-text-primary sm:text-4xl">
                {t('landing.features_title')}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-text-secondary">
                {t('landing.features_subtitle')}
              </p>
            </motion.div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURE_KEYS.map((feature, i) => (
                <motion.div
                  key={feature.key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="group rounded-xl border border-border-subtle bg-bg-card p-6 transition hover:border-accent/30 hover:shadow-card"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-accent-dim">
                    <feature.icon className={`h-5 w-5 ${feature.color}`} />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-text-primary">
                    {t(`landing.feat_${feature.key}_title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {t(`landing.feat_${feature.key}_desc`)}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="border-t border-border-subtle px-4 py-20">
          <div className="mx-auto max-w-6xl">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-display text-3xl font-bold text-text-primary sm:text-4xl">
                {t('billing.title')}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-text-secondary">
                {t('billing.save_annual')}
              </p>

              {/* Toggle */}
              <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-card p-1">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                    billingCycle === 'monthly'
                      ? 'bg-accent text-white'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {t('billing.billed_monthly')}
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                    billingCycle === 'annual'
                      ? 'bg-accent text-white'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {t('billing.billed_annually')}
                </button>
              </div>
            </motion.div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan, i) => {
                const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.annual
                const features = plan.featureList[locale] || plan.featureList.en
                const planName = plan.name[locale] || plan.name.en

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className={`relative flex flex-col rounded-xl border p-6 transition ${
                      plan.highlighted
                        ? 'border-accent bg-bg-card shadow-accent-glow/20'
                        : 'border-border-subtle bg-bg-card hover:border-border-default'
                    }`}
                  >
                    {plan.highlighted && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-white">
                        {t('landing.most_popular')}
                      </div>
                    )}

                    <h3 className="font-display text-lg font-semibold text-text-primary">
                      {planName}
                    </h3>

                    <div className="mt-4">
                      {price !== null ? (
                        <>
                          <span className="font-display text-4xl font-bold text-text-primary">
                            {billingCycle === 'annual' ? Math.round(price / 12) : price}
                          </span>
                          <span className="ml-1 text-sm text-text-muted">
                            {t('landing.price_per_month')}
                          </span>
                          {billingCycle === 'annual' && price > 0 && (
                            <p className="mt-1 text-xs text-success">
                              {t('landing.price_per_year_savings', { price })}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="font-display text-2xl font-bold text-text-primary">
                          {t('landing.contact_us')}
                        </span>
                      )}
                    </div>

                    <ul className="mt-6 flex-1 space-y-2.5">
                      {features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-sm text-text-secondary">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                          {feat}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/auth/signup"
                      className={`mt-6 block rounded-lg py-2.5 text-center text-sm font-semibold transition ${
                        plan.highlighted
                          ? 'bg-accent text-white hover:bg-accent-hover'
                          : 'border border-border-default bg-bg-surface text-text-primary hover:bg-bg-surface2'
                      }`}
                    >
                      {price === 0
                        ? t('landing.start_free')
                        : price === null
                          ? t('landing.contact_sales')
                          : t('billing.upgrade')}
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="border-t border-border-subtle px-4 py-20">
          <div className="mx-auto max-w-6xl">
            <motion.h2
              className="text-center font-display text-3xl font-bold text-text-primary sm:text-4xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              {t('landing.testimonials_title')}
            </motion.h2>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n, i) => (
                <motion.div
                  key={n}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="rounded-xl border border-border-subtle bg-bg-card p-6"
                >
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-text-secondary">
                    &ldquo;{t(`landing.testimonial_${n}_text`)}&rdquo;
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-dim text-sm font-semibold text-accent">
                      {t(`landing.testimonial_${n}_name`).split(' ').map(w => w[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{t(`landing.testimonial_${n}_name`)}</p>
                      <p className="text-xs text-text-muted">{t(`landing.testimonial_${n}_role`)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="border-t border-border-subtle px-4 py-20">
          <motion.div
            className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-gradient-to-br from-accent-dim to-bg-card p-8 text-center sm:p-12"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/20">
              <Sparkles className="h-7 w-7 text-accent" />
            </div>
            <h2 className="font-display text-3xl font-bold text-text-primary">
              {t('dashboard.ai_panel_title')}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-text-secondary">
              {t('dashboard.ai_panel_sub')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/auth/signup"
                className="group flex items-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-base font-semibold text-white shadow-accent-glow transition hover:bg-accent-hover"
              >
                {t('landing.start_free')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/auth/login"
                className="flex items-center gap-2 rounded-xl border border-border-default bg-bg-elevated px-8 py-3.5 text-base font-semibold text-text-primary transition hover:bg-bg-surface"
              >
                <MessageSquare className="h-4 w-4" />
                {t('dashboard.ai_chat')}
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border-subtle px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent">
                <span className="font-display text-sm font-bold text-white">J</span>
              </div>
              <span className="font-display text-lg font-bold text-text-primary">jadwali<span className="text-accent">.ai</span></span>
            </div>
            <div className="flex gap-6 text-sm text-text-muted">
              <Link href="/privacy" className="transition hover:text-text-secondary">{t('legal.privacy')}</Link>
              <Link href="/terms" className="transition hover:text-text-secondary">{t('legal.terms')}</Link>
              <Link href="/support" className="transition hover:text-text-secondary">{t('legal.support')}</Link>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-text-muted">
            &copy; 2026 jadwali.ai. {t('landing.footer_rights')}
          </div>
        </div>
      </footer>
    </div>
  )
}
