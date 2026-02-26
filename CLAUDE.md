# SchediQ — Claude Code Instructions

## Project Overview
SchediQ (Jadwali) is a school timetable management SaaS for Tunisian secondary schools.

**Stack**: Next.js 16 + TypeScript + Tailwind v3 + Prisma 7 + SQLite (local) / Cloudflare D1 (prod)
**Locales**: en, fr (default), ar (RTL) — use `next-intl` for all user-facing strings
**State**: Zustand (client), Prisma (server). Auth is mock (localStorage, no password in local dev)

## Quick Reference

### Commands
```bash
npx next dev          # Dev server (localhost:3000)
npx next build        # Production build (MUST pass before committing)
npx prisma db push    # Apply local schema changes
npx prisma generate   # Regenerate client after schema changes
npx wrangler d1 execute jadwali-db --remote --file=path.sql  # D1 production migration
```

### Key Paths
| What | Path |
|------|------|
| Pages | `src/app/[locale]/(app)/*/page.tsx` |
| API routes | `src/app/api/*/route.ts` |
| Components | `src/components/{ui,layout,timetable,teachers,absences,calendar}/` |
| Libs | `src/lib/{prisma,schedule-engine,schedule-solver,conflict-detector,csv,payment,subscription}.ts` |
| i18n messages | `src/messages/{en,fr,ar}.json` |
| Schema | `prisma/schema.prisma` |
| D1 migrations | `prisma/migrations/*/migration.sql` |
| Scheduling rules | `data/TUNISIAN_SCHEDULING_RULES.md` |
| Reference data | `data/*.xlsx` (raw Tunisian education data) |

## Tunisian Education System

### Reference Tables (read-only, seeded)
- `TunisianGradeLevel` — 23 grade levels (7أ to 4ر)
- `TunisianSubject` — 35 subjects with session types, pedagogic days
- `TunisianSessionType` — 8 types (Regular, Lab SVT, Lab Physics, Lab Tech, PE, Computer Lab, Mech Eng, Elec Eng)
- `TunisianTeacherGrade` — 9 professional grades

### Key Scheduling Concepts
- **Pedagogic Day** (`pedagogicDay` 0-6): Day when subject cannot be taught. 0=unrestricted, 1=Monday blocked, ..., 6=Saturday blocked
- **Session Types**: Each lesson has a type determining room requirements (labs, gym, computer room)
- **Group Sessions** (`ParGroupe`): Class splits into 2 groups for labs; paired subjects swap groups
- **Biweekly** (`ParQuinzaine`): Session alternates weeks A/B; two biweekly subjects share a slot
- **VolumeHoraire**: Duration of ONE session (not weekly total). Total weekly hours = sum of all rows for that subject+grade

### Teacher Workload Rules
- Default: max 18h/week, max 4h/day
- Seniority (25+ years from `recruitmentDate`): max 15h/week
- If teacher has custom `maxPeriodsPerWeek` set, use the stricter value

### Room Allocation Rules
- Specialized rooms (labs, computer rooms) are RESERVED for matching session types only
- Library and gymnasium MUST NEVER be used for other subjects (absolute, no exceptions)
- Last resort: empty specialized room for regular class IF all classrooms are full

## Database Conventions
- All entities are scoped by `schoolId` (multi-tenant)
- SQLite String fields instead of enums (category, type, status)
- `dev.db` lives at project root, not `prisma/`
- Prisma 7 needs `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=true` env for destructive commands
- D1 doesn't support interactive transactions — use individual creates/updates

## Code Conventions
- Always add i18n keys to ALL 3 message files (en, fr, ar) when adding UI text
- `ValidatedRow.data` is `Record<string, string>` — store numbers as strings, convert with `Number()` on save
- CSV headers defined in `src/lib/csv.ts` — update when adding import/export columns
- Framer Motion `ease` arrays need `as const` for TypeScript strict mode
- Prefer editing existing files over creating new ones
