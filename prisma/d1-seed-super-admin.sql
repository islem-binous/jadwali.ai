-- Seed SUPER_ADMIN user for production D1
-- Run: npx wrangler d1 execute jadwali-db --remote --file=prisma/d1-seed-super-admin.sql

INSERT OR IGNORE INTO "User" ("id", "authId", "email", "name", "role", "language", "isActive", "schoolId", "createdAt")
VALUES (
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
  'local_super_admin',
  'contact@d-code.lu',
  'D-Code Admin',
  'SUPER_ADMIN',
  'EN',
  1,
  NULL,
  datetime('now')
);
