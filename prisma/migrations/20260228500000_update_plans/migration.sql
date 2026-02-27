-- Update plans: keep only FREE and PRO
-- Delete old STARTER and ENTERPRISE
DELETE FROM PricingPlan WHERE id IN ('STARTER', 'ENTERPRISE');

-- Update FREE plan: unlimited everything, no export/print
UPDATE PricingPlan SET
  nameEn = 'Free', nameFr = 'Gratuit', nameAr = 'مجاني',
  priceMonthly = 0, priceAnnual = 0,
  maxTeachers = -1, maxClasses = -1, maxTimetables = -1,
  aiGeneration = 1, aiAssistant = 1, substituteAI = 1,
  exportPDF = 0, exportExcel = 0, shareLink = 0, multiUser = 1,
  support = 'community',
  featureListEn = '["Unlimited teachers & classes","AI timetable generation","AI Assistant","Absence & substitute management","Student marks & authorisations","Community support","No export/print"]',
  featureListFr = '["Enseignants & classes illimités","Génération IA des emplois du temps","Assistant IA","Gestion absences & remplacements","Notes élèves & autorisations","Support communautaire","Pas d''export/impression"]',
  featureListAr = '["معلمون وفصول غير محدودة","توليد جداول بالذكاء الاصطناعي","مساعد ذكاء اصطناعي","إدارة الغيابات والبدلاء","علامات الطلاب والتصاريح","دعم مجتمعي","بدون تصدير/طباعة"]',
  highlighted = 0, sortOrder = 0, isActive = 1
WHERE id = 'FREE';

-- Update PRO plan: 99 DT/month, 999 DT/year, everything unlimited + export/print
UPDATE PricingPlan SET
  nameEn = 'Pro', nameFr = 'Pro', nameAr = 'الاحترافي',
  priceMonthly = 99, priceAnnual = 999,
  maxTeachers = -1, maxClasses = -1, maxTimetables = -1,
  aiGeneration = 1, aiAssistant = 1, substituteAI = 1,
  exportPDF = 1, exportExcel = 1, shareLink = 1, multiUser = 1,
  support = 'priority',
  featureListEn = '["Everything in Free","Export PDF & Excel","Print timetables","Print student authorisations","CSV import/export","Share link","Priority support"]',
  featureListFr = '["Tout le plan Gratuit","Export PDF & Excel","Impression des emplois du temps","Impression autorisations élèves","Import/export CSV","Lien de partage","Support prioritaire"]',
  featureListAr = '["كل ميزات المجاني","تصدير PDF و Excel","طباعة الجداول الزمنية","طباعة تصاريح الطلاب","استيراد/تصدير CSV","رابط مشاركة","دعم ذو أولوية"]',
  highlighted = 1, sortOrder = 1, isActive = 1
WHERE id = 'PRO';
