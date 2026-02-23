-- SchediQ Seed Data for Cloudflare D1 (SQLite)
-- Generated from prisma/seed.ts

-- ─── SCHOOL ─────────────────────────────────────────────────
INSERT INTO School (id, name, slug, country, timezone, language, schoolDays, logoUrl, plan, paymentProvider, subscriptionStatus, subscriptionEndsAt, createdAt, updatedAt) VALUES ('school_1', 'Lycée Ibn Khaldoun', 'lycee-ibn-khaldoun', 'Tunisia', 'Africa/Tunis', 'FR', '[0,1,2,3,4,5]', NULL, 'PRO', NULL, 'ACTIVE', NULL, '2025-09-01T00:00:00.000Z', '2025-09-01T00:00:00.000Z');

-- ─── ADMIN USER ─────────────────────────────────────────────
INSERT INTO User (id, authId, email, name, role, language, avatarUrl, phone, isActive, schoolId, createdAt, teacherId, studentId) VALUES ('user_admin', 'local_demo', 'admin@school.com', 'Ahmed Benali', 'ADMIN', 'FR', NULL, NULL, 1, 'school_1', '2025-09-01T00:00:00.000Z', NULL, NULL);

-- ─── PERIODS ────────────────────────────────────────────────
INSERT INTO Period (id, schoolId, name, startTime, endTime, "order", isBreak, breakLabel, applicableDays) VALUES ('period_1', 'school_1', 'Period 1', '08:00', '09:00', 1, 0, NULL, '[]');
INSERT INTO Period (id, schoolId, name, startTime, endTime, "order", isBreak, breakLabel, applicableDays) VALUES ('period_2', 'school_1', 'Period 2', '09:00', '10:00', 2, 0, NULL, '[]');
INSERT INTO Period (id, schoolId, name, startTime, endTime, "order", isBreak, breakLabel, applicableDays) VALUES ('period_3', 'school_1', 'Break', '10:00', '10:15', 3, 1, 'Break', '[]');
INSERT INTO Period (id, schoolId, name, startTime, endTime, "order", isBreak, breakLabel, applicableDays) VALUES ('period_4', 'school_1', 'Period 3', '10:15', '11:15', 4, 0, NULL, '[]');
INSERT INTO Period (id, schoolId, name, startTime, endTime, "order", isBreak, breakLabel, applicableDays) VALUES ('period_5', 'school_1', 'Period 4', '11:15', '12:15', 5, 0, NULL, '[]');
INSERT INTO Period (id, schoolId, name, startTime, endTime, "order", isBreak, breakLabel, applicableDays) VALUES ('period_6', 'school_1', 'Lunch', '12:15', '13:15', 6, 1, 'Lunch', '[]');
INSERT INTO Period (id, schoolId, name, startTime, endTime, "order", isBreak, breakLabel, applicableDays) VALUES ('period_7', 'school_1', 'Period 5', '13:15', '14:15', 7, 0, NULL, '[]');
INSERT INTO Period (id, schoolId, name, startTime, endTime, "order", isBreak, breakLabel, applicableDays) VALUES ('period_8', 'school_1', 'Period 6', '14:15', '15:15', 8, 0, NULL, '[]');

-- ─── SUBJECTS ───────────────────────────────────────────────
INSERT INTO Subject (id, schoolId, name, nameAr, nameFr, colorHex, category) VALUES ('subject_math', 'school_1', 'Mathematics', 'الرياضيات', 'Mathématiques', '#4f6ef7', 'MATH');
INSERT INTO Subject (id, schoolId, name, nameAr, nameFr, colorHex, category) VALUES ('subject_physics', 'school_1', 'Physics', 'الفيزياء', 'Physique', '#22c55e', 'SCIENCE');
INSERT INTO Subject (id, schoolId, name, nameAr, nameFr, colorHex, category) VALUES ('subject_chemistry', 'school_1', 'Chemistry', 'الكيمياء', 'Chimie', '#06b6d4', 'SCIENCE');
INSERT INTO Subject (id, schoolId, name, nameAr, nameFr, colorHex, category) VALUES ('subject_biology', 'school_1', 'Biology', 'علوم الحياة', 'Biologie', '#84cc16', 'SCIENCE');
INSERT INTO Subject (id, schoolId, name, nameAr, nameFr, colorHex, category) VALUES ('subject_arabic', 'school_1', 'Arabic', 'اللغة العربية', 'Arabe', '#f59e0b', 'LANGUAGE');
INSERT INTO Subject (id, schoolId, name, nameAr, nameFr, colorHex, category) VALUES ('subject_french', 'school_1', 'French', 'الفرنسية', 'Français', '#f97316', 'LANGUAGE');
INSERT INTO Subject (id, schoolId, name, nameAr, nameFr, colorHex, category) VALUES ('subject_english', 'school_1', 'English', 'الإنجليزية', 'Anglais', '#ec4899', 'LANGUAGE');
INSERT INTO Subject (id, schoolId, name, nameAr, nameFr, colorHex, category) VALUES ('subject_history', 'school_1', 'History', 'التاريخ', 'Histoire', '#a78bfa', 'HUMANITIES');
INSERT INTO Subject (id, schoolId, name, nameAr, nameFr, colorHex, category) VALUES ('subject_geography', 'school_1', 'Geography', 'الجغرافيا', 'Géographie', '#8b5cf6', 'HUMANITIES');
INSERT INTO Subject (id, schoolId, name, nameAr, nameFr, colorHex, category) VALUES ('subject_islamic', 'school_1', 'Islamic Studies', 'التربية الإسلامية', 'Éducation Islamique', '#14b8a6', 'RELIGION');
INSERT INTO Subject (id, schoolId, name, nameAr, nameFr, colorHex, category) VALUES ('subject_pe', 'school_1', 'Physical Education', 'التربية البدنية', 'Éducation Physique', '#ef4444', 'PE');
INSERT INTO Subject (id, schoolId, name, nameAr, nameFr, colorHex, category) VALUES ('subject_tech', 'school_1', 'Technology', 'التكنولوجيا', 'Technologie', '#64748b', 'TECH');

-- ─── GRADES ─────────────────────────────────────────────────
INSERT INTO Grade (id, schoolId, name, nameAr, nameFr, level) VALUES ('grade_1', 'school_1', 'Grade 1', NULL, NULL, 1);
INSERT INTO Grade (id, schoolId, name, nameAr, nameFr, level) VALUES ('grade_2', 'school_1', 'Grade 2', NULL, NULL, 2);
INSERT INTO Grade (id, schoolId, name, nameAr, nameFr, level) VALUES ('grade_3', 'school_1', 'Grade 3', NULL, NULL, 3);
INSERT INTO Grade (id, schoolId, name, nameAr, nameFr, level) VALUES ('grade_4', 'school_1', 'Grade 4', NULL, NULL, 4);
INSERT INTO Grade (id, schoolId, name, nameAr, nameFr, level) VALUES ('grade_5', 'school_1', 'Grade 5', NULL, NULL, 5);
INSERT INTO Grade (id, schoolId, name, nameAr, nameFr, level) VALUES ('grade_6', 'school_1', 'Grade 6', NULL, NULL, 6);

-- ─── CLASSES ────────────────────────────────────────────────
INSERT INTO Class (id, schoolId, name, gradeId, capacity, colorHex) VALUES ('class_1a', 'school_1', '1-A', 'grade_1', 30, '#4f6ef7');
INSERT INTO Class (id, schoolId, name, gradeId, capacity, colorHex) VALUES ('class_1b', 'school_1', '1-B', 'grade_1', 30, '#4f6ef7');
INSERT INTO Class (id, schoolId, name, gradeId, capacity, colorHex) VALUES ('class_2a', 'school_1', '2-A', 'grade_2', 30, '#4f6ef7');
INSERT INTO Class (id, schoolId, name, gradeId, capacity, colorHex) VALUES ('class_2b', 'school_1', '2-B', 'grade_2', 30, '#4f6ef7');
INSERT INTO Class (id, schoolId, name, gradeId, capacity, colorHex) VALUES ('class_3a', 'school_1', '3-A', 'grade_3', 30, '#4f6ef7');
INSERT INTO Class (id, schoolId, name, gradeId, capacity, colorHex) VALUES ('class_3b', 'school_1', '3-B', 'grade_3', 30, '#4f6ef7');
INSERT INTO Class (id, schoolId, name, gradeId, capacity, colorHex) VALUES ('class_4a', 'school_1', '4-A', 'grade_4', 30, '#4f6ef7');
INSERT INTO Class (id, schoolId, name, gradeId, capacity, colorHex) VALUES ('class_4b', 'school_1', '4-B', 'grade_4', 30, '#4f6ef7');
INSERT INTO Class (id, schoolId, name, gradeId, capacity, colorHex) VALUES ('class_5a', 'school_1', '5-A', 'grade_5', 30, '#4f6ef7');
INSERT INTO Class (id, schoolId, name, gradeId, capacity, colorHex) VALUES ('class_5b', 'school_1', '5-B', 'grade_5', 30, '#4f6ef7');
INSERT INTO Class (id, schoolId, name, gradeId, capacity, colorHex) VALUES ('class_6a', 'school_1', '6-A', 'grade_6', 30, '#4f6ef7');
INSERT INTO Class (id, schoolId, name, gradeId, capacity, colorHex) VALUES ('class_6b', 'school_1', '6-B', 'grade_6', 30, '#4f6ef7');

-- ─── ROOMS ──────────────────────────────────────────────────
INSERT INTO Room (id, schoolId, name, building, capacity, type) VALUES ('room_101', 'school_1', 'Room 101', NULL, 30, 'CLASSROOM');
INSERT INTO Room (id, schoolId, name, building, capacity, type) VALUES ('room_102', 'school_1', 'Room 102', NULL, 30, 'CLASSROOM');
INSERT INTO Room (id, schoolId, name, building, capacity, type) VALUES ('room_103', 'school_1', 'Room 103', NULL, 30, 'CLASSROOM');
INSERT INTO Room (id, schoolId, name, building, capacity, type) VALUES ('room_104', 'school_1', 'Room 104', NULL, 30, 'CLASSROOM');
INSERT INTO Room (id, schoolId, name, building, capacity, type) VALUES ('room_105', 'school_1', 'Room 105', NULL, 30, 'CLASSROOM');
INSERT INTO Room (id, schoolId, name, building, capacity, type) VALUES ('room_106', 'school_1', 'Room 106', NULL, 30, 'CLASSROOM');
INSERT INTO Room (id, schoolId, name, building, capacity, type) VALUES ('room_201', 'school_1', 'Room 201', NULL, 30, 'CLASSROOM');
INSERT INTO Room (id, schoolId, name, building, capacity, type) VALUES ('room_202', 'school_1', 'Room 202', NULL, 30, 'CLASSROOM');
INSERT INTO Room (id, schoolId, name, building, capacity, type) VALUES ('room_scilab', 'school_1', 'Science Lab', NULL, 30, 'LAB_SCIENCE');
INSERT INTO Room (id, schoolId, name, building, capacity, type) VALUES ('room_complab', 'school_1', 'Computer Lab', NULL, 30, 'LAB_COMPUTER');
INSERT INTO Room (id, schoolId, name, building, capacity, type) VALUES ('room_gym', 'school_1', 'Gymnasium', NULL, 60, 'GYM');
INSERT INTO Room (id, schoolId, name, building, capacity, type) VALUES ('room_library', 'school_1', 'Library', NULL, 40, 'LIBRARY');

-- ─── TEACHERS ───────────────────────────────────────────────
INSERT INTO Teacher (id, schoolId, name, email, phone, avatarUrl, colorHex, maxPeriodsPerDay, maxPeriodsPerWeek, excludeFromCover) VALUES ('teacher_1', 'school_1', 'Karim Meziane', 'karim.meziane@school.com', NULL, NULL, '#4f6ef7', 6, 24, 0);
INSERT INTO Teacher (id, schoolId, name, email, phone, avatarUrl, colorHex, maxPeriodsPerDay, maxPeriodsPerWeek, excludeFromCover) VALUES ('teacher_2', 'school_1', 'Fatima Boudjema', 'fatima.boudjema@school.com', NULL, NULL, '#3b82f6', 6, 24, 0);
INSERT INTO Teacher (id, schoolId, name, email, phone, avatarUrl, colorHex, maxPeriodsPerDay, maxPeriodsPerWeek, excludeFromCover) VALUES ('teacher_3', 'school_1', 'Mohamed Larbi', 'mohamed.larbi@school.com', NULL, NULL, '#22c55e', 6, 24, 0);
INSERT INTO Teacher (id, schoolId, name, email, phone, avatarUrl, colorHex, maxPeriodsPerDay, maxPeriodsPerWeek, excludeFromCover) VALUES ('teacher_4', 'school_1', 'Amina Khelifi', 'amina.khelifi@school.com', NULL, NULL, '#06b6d4', 6, 24, 0);
INSERT INTO Teacher (id, schoolId, name, email, phone, avatarUrl, colorHex, maxPeriodsPerDay, maxPeriodsPerWeek, excludeFromCover) VALUES ('teacher_5', 'school_1', 'Youcef Benmoussa', 'youcef.benmoussa@school.com', NULL, NULL, '#84cc16', 6, 24, 0);
INSERT INTO Teacher (id, schoolId, name, email, phone, avatarUrl, colorHex, maxPeriodsPerDay, maxPeriodsPerWeek, excludeFromCover) VALUES ('teacher_6', 'school_1', 'Rachid Hamidi', 'rachid.hamidi@school.com', NULL, NULL, '#f59e0b', 6, 24, 0);
INSERT INTO Teacher (id, schoolId, name, email, phone, avatarUrl, colorHex, maxPeriodsPerDay, maxPeriodsPerWeek, excludeFromCover) VALUES ('teacher_7', 'school_1', 'Naima Saidi', 'naima.saidi@school.com', NULL, NULL, '#eab308', 6, 24, 0);
INSERT INTO Teacher (id, schoolId, name, email, phone, avatarUrl, colorHex, maxPeriodsPerDay, maxPeriodsPerWeek, excludeFromCover) VALUES ('teacher_8', 'school_1', 'Sophie Dupont', 'sophie.dupont@school.com', NULL, NULL, '#f97316', 6, 24, 0);
INSERT INTO Teacher (id, schoolId, name, email, phone, avatarUrl, colorHex, maxPeriodsPerDay, maxPeriodsPerWeek, excludeFromCover) VALUES ('teacher_9', 'school_1', 'Sarah Mitchell', 'sarah.mitchell@school.com', NULL, NULL, '#ec4899', 6, 24, 0);
INSERT INTO Teacher (id, schoolId, name, email, phone, avatarUrl, colorHex, maxPeriodsPerDay, maxPeriodsPerWeek, excludeFromCover) VALUES ('teacher_10', 'school_1', 'Ali Bouzid', 'ali.bouzid@school.com', NULL, NULL, '#a78bfa', 6, 24, 0);
INSERT INTO Teacher (id, schoolId, name, email, phone, avatarUrl, colorHex, maxPeriodsPerDay, maxPeriodsPerWeek, excludeFromCover) VALUES ('teacher_11', 'school_1', 'Leila Ferhat', 'leila.ferhat@school.com', NULL, NULL, '#8b5cf6', 6, 24, 0);
INSERT INTO Teacher (id, schoolId, name, email, phone, avatarUrl, colorHex, maxPeriodsPerDay, maxPeriodsPerWeek, excludeFromCover) VALUES ('teacher_12', 'school_1', 'Mustapha Kebaili', 'mustapha.kebaili@school.com', NULL, NULL, '#14b8a6', 6, 24, 0);
INSERT INTO Teacher (id, schoolId, name, email, phone, avatarUrl, colorHex, maxPeriodsPerDay, maxPeriodsPerWeek, excludeFromCover) VALUES ('teacher_13', 'school_1', 'Omar Benslimane', 'omar.benslimane@school.com', NULL, NULL, '#ef4444', 6, 24, 0);
INSERT INTO Teacher (id, schoolId, name, email, phone, avatarUrl, colorHex, maxPeriodsPerDay, maxPeriodsPerWeek, excludeFromCover) VALUES ('teacher_14', 'school_1', 'Djamel Ouali', 'djamel.ouali@school.com', NULL, NULL, '#64748b', 6, 24, 0);
INSERT INTO Teacher (id, schoolId, name, email, phone, avatarUrl, colorHex, maxPeriodsPerDay, maxPeriodsPerWeek, excludeFromCover) VALUES ('teacher_15', 'school_1', 'Nadia Cherif', 'nadia.cherif@school.com', NULL, NULL, '#0ea5e9', 6, 24, 0);

-- ─── TEACHER-SUBJECT LINKS ──────────────────────────────────
INSERT INTO TeacherSubject (id, teacherId, subjectId, isPrimary) VALUES ('ts_1', 'teacher_1', 'subject_math', 1);
INSERT INTO TeacherSubject (id, teacherId, subjectId, isPrimary) VALUES ('ts_2', 'teacher_2', 'subject_math', 1);
INSERT INTO TeacherSubject (id, teacherId, subjectId, isPrimary) VALUES ('ts_3', 'teacher_3', 'subject_physics', 1);
INSERT INTO TeacherSubject (id, teacherId, subjectId, isPrimary) VALUES ('ts_4', 'teacher_4', 'subject_chemistry', 1);
INSERT INTO TeacherSubject (id, teacherId, subjectId, isPrimary) VALUES ('ts_5', 'teacher_5', 'subject_biology', 1);
INSERT INTO TeacherSubject (id, teacherId, subjectId, isPrimary) VALUES ('ts_6', 'teacher_6', 'subject_arabic', 1);
INSERT INTO TeacherSubject (id, teacherId, subjectId, isPrimary) VALUES ('ts_7', 'teacher_7', 'subject_arabic', 1);
INSERT INTO TeacherSubject (id, teacherId, subjectId, isPrimary) VALUES ('ts_8', 'teacher_8', 'subject_french', 1);
INSERT INTO TeacherSubject (id, teacherId, subjectId, isPrimary) VALUES ('ts_9', 'teacher_9', 'subject_english', 1);
INSERT INTO TeacherSubject (id, teacherId, subjectId, isPrimary) VALUES ('ts_10', 'teacher_10', 'subject_history', 1);
INSERT INTO TeacherSubject (id, teacherId, subjectId, isPrimary) VALUES ('ts_11', 'teacher_10', 'subject_geography', 0);
INSERT INTO TeacherSubject (id, teacherId, subjectId, isPrimary) VALUES ('ts_12', 'teacher_11', 'subject_history', 1);
INSERT INTO TeacherSubject (id, teacherId, subjectId, isPrimary) VALUES ('ts_13', 'teacher_12', 'subject_islamic', 1);
INSERT INTO TeacherSubject (id, teacherId, subjectId, isPrimary) VALUES ('ts_14', 'teacher_13', 'subject_pe', 1);
INSERT INTO TeacherSubject (id, teacherId, subjectId, isPrimary) VALUES ('ts_15', 'teacher_14', 'subject_tech', 1);
INSERT INTO TeacherSubject (id, teacherId, subjectId, isPrimary) VALUES ('ts_16', 'teacher_15', 'subject_physics', 1);
INSERT INTO TeacherSubject (id, teacherId, subjectId, isPrimary) VALUES ('ts_17', 'teacher_15', 'subject_chemistry', 0);

-- ─── TERM ───────────────────────────────────────────────────
INSERT INTO Term (id, schoolId, name, nameAr, nameFr, startDate, endDate) VALUES ('term_1', 'school_1', 'Semester 1', 'الفصل الأول', 'Semestre 1', '2025-09-01T00:00:00.000Z', '2026-01-31T00:00:00.000Z');

-- ─── SCHOOL EVENTS ──────────────────────────────────────────
-- Official Public Holidays (recurring)
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_1', 'school_1', 'Nouvel An', 'رأس السنة الميلادية', 'Nouvel An', NULL, 'HOLIDAY', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z', '#22c55e', '[]', 1, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_2', 'school_1', 'Fête de l''Indépendance', 'عيد الاستقلال', 'Fête de l''Indépendance', NULL, 'HOLIDAY', '2025-03-20T00:00:00.000Z', '2025-03-20T00:00:00.000Z', '#22c55e', '[]', 1, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_3', 'school_1', 'Aïd el-Fitr', 'عيد الفطر', 'Aïd el-Fitr', 'Dates change yearly (lunar calendar)', 'HOLIDAY', '2025-03-31T00:00:00.000Z', '2025-04-02T00:00:00.000Z', '#14b8a6', '[]', 1, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_4', 'school_1', 'Journée des Martyrs', 'يوم الشهداء', 'Journée des Martyrs', NULL, 'HOLIDAY', '2025-04-09T00:00:00.000Z', '2025-04-09T00:00:00.000Z', '#22c55e', '[]', 1, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_5', 'school_1', 'Fête du Travail', 'عيد الشغل', 'Fête du Travail', NULL, 'HOLIDAY', '2025-05-01T00:00:00.000Z', '2025-05-01T00:00:00.000Z', '#22c55e', '[]', 1, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_6', 'school_1', 'Aïd el-Adha', 'عيد الأضحى', 'Aïd el-Adha', 'Dates change yearly (lunar calendar)', 'HOLIDAY', '2025-06-06T00:00:00.000Z', '2025-06-07T00:00:00.000Z', '#14b8a6', '[]', 1, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_7', 'school_1', 'Ras el Am el Hejri', 'رأس السنة الهجرية', 'Nouvel An Hégirien', 'Dates change yearly (lunar calendar)', 'HOLIDAY', '2025-06-26T00:00:00.000Z', '2025-06-26T00:00:00.000Z', '#14b8a6', '[]', 1, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_8', 'school_1', 'Fête de la République', 'عيد الجمهورية', 'Fête de la République', NULL, 'HOLIDAY', '2025-07-25T00:00:00.000Z', '2025-07-25T00:00:00.000Z', '#22c55e', '[]', 1, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_9', 'school_1', 'Journée de la Femme', 'عيد المرأة', 'Journée de la Femme', NULL, 'HOLIDAY', '2025-08-13T00:00:00.000Z', '2025-08-13T00:00:00.000Z', '#22c55e', '[]', 1, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_10', 'school_1', 'Mouled', 'المولد النبوي الشريف', 'Mouled', 'Dates change yearly (lunar calendar)', 'HOLIDAY', '2025-09-04T00:00:00.000Z', '2025-09-04T00:00:00.000Z', '#14b8a6', '[]', 1, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_11', 'school_1', 'Fête de l''Évacuation', 'عيد الجلاء', 'Fête de l''Évacuation', NULL, 'HOLIDAY', '2025-10-15T00:00:00.000Z', '2025-10-15T00:00:00.000Z', '#22c55e', '[]', 1, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_12', 'school_1', 'Journée de la Révolution', 'عيد الثورة', 'Journée de la Révolution', NULL, 'HOLIDAY', '2025-12-17T00:00:00.000Z', '2025-12-17T00:00:00.000Z', '#22c55e', '[]', 1, '2025-09-01T00:00:00.000Z');
-- School Vacations
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_13', 'school_1', 'Vacances mi-1er trimestre', 'عطلة منتصف الثلاثي الأول', 'Vacances mi-1er trimestre', 'Mid-1st trimester break', 'CLOSURE', '2024-10-28T00:00:00.000Z', '2024-11-03T00:00:00.000Z', '#f59e0b', '[]', 0, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_14', 'school_1', 'Vacances d''hiver', 'عطلة الشتاء', 'Vacances d''hiver', 'Winter / New Year break', 'CLOSURE', '2024-12-23T00:00:00.000Z', '2025-01-05T00:00:00.000Z', '#3b82f6', '[]', 0, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_15', 'school_1', 'Vacances mi-2ème trimestre', 'عطلة منتصف الثلاثي الثاني', 'Vacances mi-2ème trimestre', 'Mid-2nd trimester break', 'CLOSURE', '2025-02-03T00:00:00.000Z', '2025-02-09T00:00:00.000Z', '#f59e0b', '[]', 0, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_16', 'school_1', 'Vacances de printemps', 'عطلة الربيع', 'Vacances de printemps', 'Spring / Eid al-Fitr break', 'CLOSURE', '2025-03-24T00:00:00.000Z', '2025-04-06T00:00:00.000Z', '#84cc16', '[]', 0, '2025-09-01T00:00:00.000Z');
-- Trimester Structure
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_17', 'school_1', '1er Trimestre', 'الثلاثي الأول', '1er Trimestre', 'Premier trimestre de l''année scolaire', 'OTHER', '2024-09-16T00:00:00.000Z', '2025-01-11T00:00:00.000Z', '#4f6ef7', '[]', 0, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_18', 'school_1', '2ème Trimestre', 'الثلاثي الثاني', '2ème Trimestre', 'Deuxième trimestre', 'OTHER', '2025-01-12T00:00:00.000Z', '2025-04-12T00:00:00.000Z', '#8b5cf6', '[]', 0, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_19', 'school_1', '3ème Trimestre', 'الثلاثي الثالث', '3ème Trimestre', 'Troisième trimestre', 'OTHER', '2025-04-13T00:00:00.000Z', '2025-06-28T00:00:00.000Z', '#06b6d4', '[]', 0, '2025-09-01T00:00:00.000Z');
-- Exam Periods
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_20', 'school_1', 'Examens T1 - Semaine ouverte', 'امتحانات ث1 - أسبوع مفتوح', 'Examens T1 - Semaine ouverte', NULL, 'EXAM', '2024-12-02T00:00:00.000Z', '2024-12-07T00:00:00.000Z', '#ef4444', '[]', 0, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_21', 'school_1', 'Examens T1 - Semaine bloquée', 'امتحانات ث1 - أسبوع مغلق', 'Examens T1 - Semaine bloquée', NULL, 'EXAM', '2024-12-09T00:00:00.000Z', '2024-12-14T00:00:00.000Z', '#ef4444', '[]', 0, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_22', 'school_1', 'Conseils de classe T1', 'مجالس الأقسام ث1', 'Conseils de classe T1', NULL, 'MEETING', '2025-01-06T00:00:00.000Z', '2025-01-11T00:00:00.000Z', '#f97316', '[]', 0, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_23', 'school_1', 'Examens T2 - Semaine ouverte', 'امتحانات ث2 - أسبوع مفتوح', 'Examens T2 - Semaine ouverte', NULL, 'EXAM', '2025-03-03T00:00:00.000Z', '2025-03-08T00:00:00.000Z', '#ef4444', '[]', 0, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_24', 'school_1', 'Examens T2 - Semaine bloquée', 'امتحانات ث2 - أسبوع مغلق', 'Examens T2 - Semaine bloquée', NULL, 'EXAM', '2025-03-10T00:00:00.000Z', '2025-03-15T00:00:00.000Z', '#ef4444', '[]', 0, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_25', 'school_1', 'Conseils de classe T2', 'مجالس الأقسام ث2', 'Conseils de classe T2', NULL, 'MEETING', '2025-04-07T00:00:00.000Z', '2025-04-12T00:00:00.000Z', '#f97316', '[]', 0, '2025-09-01T00:00:00.000Z');
-- National Exams
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_26', 'school_1', 'Baccalauréat - Épreuves pratiques', 'البكالوريا - اختبارات تطبيقية', 'Baccalauréat - Épreuves pratiques', NULL, 'EXAM', '2025-05-15T00:00:00.000Z', '2025-05-26T00:00:00.000Z', '#dc2626', '[]', 0, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_27', 'school_1', 'Baccalauréat - Session principale', 'البكالوريا - الدورة الرئيسية', 'Baccalauréat - Session principale', 'Main written session (break June 5-8 for Eid al-Adha)', 'EXAM', '2025-06-02T00:00:00.000Z', '2025-06-11T00:00:00.000Z', '#dc2626', '[]', 0, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_28', 'school_1', 'Concours Sixième', 'مناظرة السيزيام', 'Concours d''entrée en 6ème', NULL, 'EXAM', '2025-06-16T00:00:00.000Z', '2025-06-18T00:00:00.000Z', '#dc2626', '[]', 0, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_29', 'school_1', 'Concours Neuvième (DFEEB)', 'مناظرة النوفيام', 'Diplôme de fin d''études de l''enseignement de base', NULL, 'EXAM', '2025-06-19T00:00:00.000Z', '2025-06-21T00:00:00.000Z', '#dc2626', '[]', 0, '2025-09-01T00:00:00.000Z');
-- School Year Milestones
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_30', 'school_1', 'Rentrée scolaire', 'الدخول المدرسي', 'Rentrée scolaire', 'First day of school for students', 'OTHER', '2024-09-16T00:00:00.000Z', '2024-09-16T00:00:00.000Z', '#4f6ef7', '[]', 0, '2025-09-01T00:00:00.000Z');
INSERT INTO SchoolEvent (id, schoolId, title, titleAr, titleFr, description, type, startDate, endDate, colorHex, affectsClasses, isRecurring, createdAt) VALUES ('event_31', 'school_1', 'Fin de l''année scolaire', 'نهاية السنة الدراسية', 'Fin de l''année scolaire', 'Last day of school for students', 'OTHER', '2025-06-28T00:00:00.000Z', '2025-06-28T00:00:00.000Z', '#4f6ef7', '[]', 0, '2025-09-01T00:00:00.000Z');
