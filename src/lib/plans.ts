import { getPrisma } from '@/lib/prisma'

export interface PlanFeatures {
  maxTeachers: number
  maxClasses: number
  maxTimetables: number
  aiGeneration: boolean
  aiAssistant: boolean
  substituteAI: boolean
  exportPDF: boolean
  exportExcel: boolean
  shareLink: boolean
  multiUser: boolean
  support: string
}

export interface PlanDef {
  id: string
  name: { en: string; fr: string; ar: string }
  price: { monthly: number | null; annual: number | null }
  features: PlanFeatures
  featureList: { en: string[]; fr: string[]; ar: string[] }
  highlighted?: boolean
}

// ── Hardcoded fallback (used when DB is unreachable) ──────────────────
const FALLBACK_PLANS: Record<string, PlanDef> = {
  FREE: {
    id: 'FREE',
    name: { en: 'Free', fr: 'Gratuit', ar: 'مجاني' },
    price: { monthly: 0, annual: 0 },
    features: {
      maxTeachers: -1, maxClasses: -1, maxTimetables: -1,
      aiGeneration: true, aiAssistant: true, substituteAI: true,
      exportPDF: false, exportExcel: false, shareLink: false, multiUser: true,
      support: 'community',
    },
    featureList: {
      en: ['Unlimited teachers & classes', 'AI timetable generation', 'AI Assistant', 'Absence & substitute management', 'Student marks & authorisations', 'Community support', 'No export/print'],
      fr: ['Enseignants & classes illimités', 'Génération IA des emplois du temps', 'Assistant IA', 'Gestion absences & remplacements', 'Notes élèves & autorisations', 'Support communautaire', 'Pas d\'export/impression'],
      ar: ['معلمون وفصول غير محدودة', 'توليد جداول بالذكاء الاصطناعي', 'مساعد ذكاء اصطناعي', 'إدارة الغيابات والبدلاء', 'علامات الطلاب والتصاريح', 'دعم مجتمعي', 'بدون تصدير/طباعة'],
    },
  },
  PRO: {
    id: 'PRO',
    name: { en: 'Pro', fr: 'Pro', ar: 'الاحترافي' },
    price: { monthly: 99, annual: 999 },
    features: {
      maxTeachers: -1, maxClasses: -1, maxTimetables: -1,
      aiGeneration: true, aiAssistant: true, substituteAI: true,
      exportPDF: true, exportExcel: true, shareLink: true, multiUser: true,
      support: 'priority',
    },
    featureList: {
      en: ['Everything in Free', 'Export PDF & Excel', 'Print timetables', 'Print student authorisations', 'CSV import/export', 'Share link', 'Priority support'],
      fr: ['Tout le plan Gratuit', 'Export PDF & Excel', 'Impression des emplois du temps', 'Impression autorisations élèves', 'Import/export CSV', 'Lien de partage', 'Support prioritaire'],
      ar: ['كل ميزات المجاني', 'تصدير PDF و Excel', 'طباعة الجداول الزمنية', 'طباعة تصاريح الطلاب', 'استيراد/تصدير CSV', 'رابط مشاركة', 'دعم ذو أولوية'],
    },
    highlighted: true,
  },
}

// ── Cache ──────────────────────────────────────────────────
const CACHE_TTL = 60_000
let cached: { data: Record<string, PlanDef>; ts: number } | null = null

function parseJSON(str: string): string[] {
  try { return JSON.parse(str) } catch { return [] }
}

function dbRowToPlanDef(row: any): PlanDef {
  return {
    id: row.id,
    name: { en: row.nameEn, fr: row.nameFr, ar: row.nameAr },
    price: {
      monthly: row.priceMonthly,
      annual: row.priceAnnual,
    },
    features: {
      maxTeachers: row.maxTeachers === -1 ? Infinity : row.maxTeachers,
      maxClasses: row.maxClasses === -1 ? Infinity : row.maxClasses,
      maxTimetables: row.maxTimetables === -1 ? Infinity : row.maxTimetables,
      aiGeneration: row.aiGeneration,
      aiAssistant: row.aiAssistant,
      substituteAI: row.substituteAI,
      exportPDF: row.exportPDF,
      exportExcel: row.exportExcel,
      shareLink: row.shareLink,
      multiUser: row.multiUser,
      support: row.support,
    },
    featureList: {
      en: parseJSON(row.featureListEn),
      fr: parseJSON(row.featureListFr),
      ar: parseJSON(row.featureListAr),
    },
    highlighted: row.highlighted,
  }
}

/** Fetch all active plans from DB (cached 60s), falls back to hardcoded */
export async function getPlans(): Promise<Record<string, PlanDef>> {
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  try {
    const prisma = await getPrisma()
    const rows = await prisma.pricingPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    if (rows.length === 0) {
      cached = { data: FALLBACK_PLANS, ts: Date.now() }
      return FALLBACK_PLANS
    }

    const plans: Record<string, PlanDef> = {}
    for (const row of rows) {
      plans[row.id] = dbRowToPlanDef(row)
    }
    cached = { data: plans, ts: Date.now() }
    return plans
  } catch (err) {
    console.error('[Plans] DB fetch failed, using fallback:', err)
    return FALLBACK_PLANS
  }
}

/** Fetch a single plan by ID */
export async function getPlan(id: string): Promise<PlanDef | undefined> {
  const plans = await getPlans()
  return plans[id]
}

/** Invalidate cached plans (call after admin updates) */
export function invalidatePlansCache() {
  cached = null
}

/** Backwards-compatible sync export — prefer getPlans() in new code */
export const PLANS = FALLBACK_PLANS
