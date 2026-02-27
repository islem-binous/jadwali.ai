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
      maxTeachers: 10, maxClasses: 5, maxTimetables: 1,
      aiGeneration: false, aiAssistant: false, substituteAI: false,
      exportPDF: true, exportExcel: false, shareLink: false, multiUser: false,
      support: 'community',
    },
    featureList: {
      en: ['Up to 10 teachers', 'Up to 5 classes', '1 active timetable', 'Basic PDF export', 'Manual scheduling only'],
      fr: ["Jusqu'à 10 enseignants", "Jusqu'à 5 classes", '1 emploi du temps actif', 'Export PDF basique', 'Planification manuelle uniquement'],
      ar: ['حتى 10 معلمين', 'حتى 5 فصول', 'جدول زمني واحد نشط', 'تصدير PDF أساسي', 'جدولة يدوية فقط'],
    },
  },
  STARTER: {
    id: 'STARTER',
    name: { en: 'Starter', fr: 'Starter', ar: 'المبتدئ' },
    price: { monthly: 89, annual: 854 },
    features: {
      maxTeachers: 30, maxClasses: 20, maxTimetables: 3,
      aiGeneration: true, aiAssistant: false, substituteAI: true,
      exportPDF: true, exportExcel: true, shareLink: true, multiUser: false,
      support: 'email',
    },
    featureList: {
      en: ['Up to 30 teachers', 'Up to 20 classes', 'AI schedule generation', 'Smart substitute matching', 'PDF + Excel export', 'Share link', 'Email support'],
      fr: ["Jusqu'à 30 enseignants", "Jusqu'à 20 classes", 'Génération IA de plannings', 'Remplaçants intelligents', 'Export PDF + Excel', 'Lien de partage', 'Support email'],
      ar: ['حتى 30 معلماً', 'حتى 20 فصلاً', 'توليد جداول بالذكاء الاصطناعي', 'مطابقة ذكية للبدلاء', 'تصدير PDF + Excel', 'رابط مشاركة', 'دعم بالبريد الإلكتروني'],
    },
  },
  PRO: {
    id: 'PRO',
    name: { en: 'Pro', fr: 'Pro', ar: 'الاحترافي' },
    price: { monthly: 249, annual: 2390 },
    features: {
      maxTeachers: 100, maxClasses: 60, maxTimetables: 10,
      aiGeneration: true, aiAssistant: true, substituteAI: true,
      exportPDF: true, exportExcel: true, shareLink: true, multiUser: true,
      support: 'priority',
    },
    featureList: {
      en: ['Up to 100 teachers', 'Up to 60 classes', 'AI schedule generation', 'AI Assistant (chat)', 'Unlimited exports', 'Multi-user access', 'Student course selection', 'Calendar & events', 'Priority support'],
      fr: ["Jusqu'à 100 enseignants", "Jusqu'à 60 classes", 'Génération IA', 'Assistant IA (chat)', 'Exports illimités', 'Accès multi-utilisateurs', 'Choix de cours étudiants', 'Calendrier & événements', 'Support prioritaire'],
      ar: ['حتى 100 معلم', 'حتى 60 فصلاً', 'توليد بالذكاء الاصطناعي', 'مساعد ذكاء اصطناعي (دردشة)', 'تصدير غير محدود', 'وصول متعدد المستخدمين', 'اختيار المقررات للطلاب', 'التقويم والفعاليات', 'دعم ذو أولوية'],
    },
    highlighted: true,
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: { en: 'Enterprise', fr: 'Entreprise', ar: 'المؤسسات' },
    price: { monthly: null, annual: null },
    features: {
      maxTeachers: Infinity, maxClasses: Infinity, maxTimetables: Infinity,
      aiGeneration: true, aiAssistant: true, substituteAI: true,
      exportPDF: true, exportExcel: true, shareLink: true, multiUser: true,
      support: 'dedicated',
    },
    featureList: {
      en: ['Unlimited everything', 'Custom AI training', 'SSO / SAML', 'SLA guarantee', 'Dedicated support', 'Custom integrations', 'On-premise option'],
      fr: ['Tout illimité', 'IA personnalisée', 'SSO / SAML', 'Garantie SLA', 'Support dédié', 'Intégrations personnalisées', 'Option sur site'],
      ar: ['كل شيء غير محدود', 'ذكاء اصطناعي مخصص', 'تسجيل دخول موحد', 'ضمان مستوى الخدمة', 'دعم مخصص', 'تكاملات مخصصة', 'خيار محلي'],
    },
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
