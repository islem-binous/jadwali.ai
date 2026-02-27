-- CreateTable
CREATE TABLE IF NOT EXISTS "PricingPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nameEn" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "priceMonthly" INTEGER,
    "priceAnnual" INTEGER,
    "maxTeachers" INTEGER NOT NULL DEFAULT -1,
    "maxClasses" INTEGER NOT NULL DEFAULT -1,
    "maxTimetables" INTEGER NOT NULL DEFAULT -1,
    "aiGeneration" BOOLEAN NOT NULL DEFAULT false,
    "aiAssistant" BOOLEAN NOT NULL DEFAULT false,
    "substituteAI" BOOLEAN NOT NULL DEFAULT false,
    "exportPDF" BOOLEAN NOT NULL DEFAULT true,
    "exportExcel" BOOLEAN NOT NULL DEFAULT false,
    "shareLink" BOOLEAN NOT NULL DEFAULT false,
    "multiUser" BOOLEAN NOT NULL DEFAULT false,
    "support" TEXT NOT NULL DEFAULT 'community',
    "featureListEn" TEXT NOT NULL DEFAULT '[]',
    "featureListFr" TEXT NOT NULL DEFAULT '[]',
    "featureListAr" TEXT NOT NULL DEFAULT '[]',
    "highlighted" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default plans
INSERT OR IGNORE INTO "PricingPlan" ("id", "nameEn", "nameFr", "nameAr", "priceMonthly", "priceAnnual", "maxTeachers", "maxClasses", "maxTimetables", "aiGeneration", "aiAssistant", "substituteAI", "exportPDF", "exportExcel", "shareLink", "multiUser", "support", "featureListEn", "featureListFr", "featureListAr", "highlighted", "sortOrder", "isActive", "updatedAt") VALUES
('FREE', 'Free', 'Gratuit', 'مجاني', 0, 0, 10, 5, 1, false, false, false, true, false, false, false, 'community', '["Up to 10 teachers","Up to 5 classes","1 active timetable","Basic PDF export","Manual scheduling only"]', '["Jusqu''à 10 enseignants","Jusqu''à 5 classes","1 emploi du temps actif","Export PDF basique","Planification manuelle uniquement"]', '["حتى 10 معلمين","حتى 5 فصول","جدول زمني واحد نشط","تصدير PDF أساسي","جدولة يدوية فقط"]', false, 0, true, CURRENT_TIMESTAMP),
('STARTER', 'Starter', 'Starter', 'المبتدئ', 89, 854, 30, 20, 3, true, false, true, true, true, true, false, 'email', '["Up to 30 teachers","Up to 20 classes","AI schedule generation","Smart substitute matching","PDF + Excel export","Share link","Email support"]', '["Jusqu''à 30 enseignants","Jusqu''à 20 classes","Génération IA de plannings","Remplaçants intelligents","Export PDF + Excel","Lien de partage","Support email"]', '["حتى 30 معلماً","حتى 20 فصلاً","توليد جداول بالذكاء الاصطناعي","مطابقة ذكية للبدلاء","تصدير PDF + Excel","رابط مشاركة","دعم بالبريد الإلكتروني"]', false, 1, true, CURRENT_TIMESTAMP),
('PRO', 'Pro', 'Pro', 'الاحترافي', 249, 2390, 100, 60, 10, true, true, true, true, true, true, true, 'priority', '["Up to 100 teachers","Up to 60 classes","AI schedule generation","AI Assistant (chat)","Unlimited exports","Multi-user access","Student course selection","Calendar & events","Priority support"]', '["Jusqu''à 100 enseignants","Jusqu''à 60 classes","Génération IA","Assistant IA (chat)","Exports illimités","Accès multi-utilisateurs","Choix de cours étudiants","Calendrier & événements","Support prioritaire"]', '["حتى 100 معلم","حتى 60 فصلاً","توليد بالذكاء الاصطناعي","مساعد ذكاء اصطناعي (دردشة)","تصدير غير محدود","وصول متعدد المستخدمين","اختيار المقررات للطلاب","التقويم والفعاليات","دعم ذو أولوية"]', true, 2, true, CURRENT_TIMESTAMP),
('ENTERPRISE', 'Enterprise', 'Entreprise', 'المؤسسات', NULL, NULL, -1, -1, -1, true, true, true, true, true, true, true, 'dedicated', '["Unlimited everything","Custom AI training","SSO / SAML","SLA guarantee","Dedicated support","Custom integrations","On-premise option"]', '["Tout illimité","IA personnalisée","SSO / SAML","Garantie SLA","Support dédié","Intégrations personnalisées","Option sur site"]', '["كل شيء غير محدود","ذكاء اصطناعي مخصص","تسجيل دخول موحد","ضمان مستوى الخدمة","دعم مخصص","تكاملات مخصصة","خيار محلي"]', false, 3, true, CURRENT_TIMESTAMP);
