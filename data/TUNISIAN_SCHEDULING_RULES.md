# Tunisian Secondary Education — Subject Distribution & Scheduling Rules

This document defines the official rules for how subjects are distributed in Tunisian secondary schools. These rules are critical for the AI timetable generator.

---

## 1. Core Concepts

### 1.1 Session Types (CodeTypeCours)

Each lesson slot has a **session type** that determines the teaching format:

| Code | Type | Description | Room Needed |
|------|------|-------------|-------------|
| 1 | Regular (cours) | Standard classroom lecture/lesson | Classroom |
| 2 | Lab — Life Sciences (TP SVT) | Biology / Earth Science practical | Science Lab |
| 3 | Lab — Physical Sciences (TP Physique) | Physics / Chemistry practical | Science Lab |
| 4 | Lab — Technology (TP Technologie) | Technology workshop / practical | Tech Lab |
| 5 | Physical Education (EPS) | Sports / PE session | Gym / Outdoor |
| 6 | Computer Lab (TP Informatique) | Computer science practical | Computer Lab |
| 7 | Mechanical Engineering (TP Génie Mécanique) | Mechanical engineering practical | Engineering Lab |
| 8 | Electrical Engineering (TP Génie Électrique) | Electrical engineering practical | Engineering Lab |

### 1.2 Group Sessions (ParGroupe)

When `ParGroupe = TRUE`:
- The class is **split into two groups** (Group A and Group B, typically half the class each)
- Each group has the session separately — requiring **two time slots** for the same subject
- Both groups must be scheduled, ideally in the **same period or consecutive periods**
- Group sessions require **specialized rooms** (labs, computer rooms) with limited capacity
- While Group A has this subject, Group B may have a **different group-based subject** or be free

**Pairing rule**: When two subjects both have `ParGroupe = TRUE` for the same grade level, they are typically **paired** — Group A takes Subject X while Group B takes Subject Y, then they swap. This is a hard constraint for timetabling.

### 1.3 Biweekly Sessions (ParQuinzaine)

When `ParQuinzaine = TRUE`:
- The session happens **every other week** (alternating Week A / Week B)
- The `VolumeHoraire` still represents the **duration of that session** (not a weekly average)
- Since the session only occurs every 2 weeks, the **effective weekly average** is half the duration
- Two biweekly subjects can share the same time slot if they alternate weeks
- Common for minor subjects: Islamic Studies, Civic Education, some Philosophy hours

**Pairing rule for biweekly**: When `CodeAss = 1`, the session is **paired with another biweekly session** of a different subject, sharing the same time slot on alternating weeks. For example: Islamic Studies (Week A) and Civic Education (Week B) occupy the same slot.

### 1.4 Volume Horaire (VolumeHoraire)

Each row in the distribution table represents **one distinct session** per week.

**Key rule**: `VolumeHoraire` = the **duration in hours of that individual session**.

- A subject may have **multiple rows** for the same grade — each row is a **separate session**
- The **total weekly hours** for a subject = **sum of VolumeHoraire** across all its rows
- A session with `VolumeHoraire = 2` means a **double period** — two consecutive periods blocked together
- A session with `VolumeHoraire = 3` or `4` means a **triple or quadruple period** — must be consecutive

**Example**: 3rd year Mathematics (3ر) has 4 rows:
| Row | VolumeHoraire | Meaning |
|-----|--------------|---------|
| 1 | 1 | One 1-hour session (single period) |
| 2 | 2 | One 2-hour session (double period) |
| 3 | 2 | One 2-hour session (double period) |
| 4 | 2 | One 2-hour session (double period) |
| **Total** | **7h/week** | **4 separate sessions**: 1 single + 3 doubles |

So when scheduling, this class needs **4 Math slots per week**: one single period and three double periods (each double occupying 2 consecutive periods).

---

## 2. Session Duration Constraints

| Duration | Scheduling Rule |
|----------|----------------|
| 1h | Single period slot |
| 2h | Must occupy 2 **consecutive** periods (double period) |
| 3h | Must occupy 3 **consecutive** periods (triple period) |
| 4h | Must occupy 4 **consecutive** periods (quadruple period) |

**Critical**: Multi-hour sessions MUST NOT be split across a break. If periods 3-4 have a break between them, a 2h session cannot span periods 3 and 4.

---

## 3. Pedagogic Day (Journée Pédagogique)

Each subject may have a **pedagogic day** — a day of the week when the subject **cannot be taught**. This is an official Tunisian regulation where teachers of that subject use the blocked day for pedagogical training, meetings, or preparation.

### 3.1 Encoding

| Value | Meaning |
|-------|---------|
| 0 | No restriction — can be taught any day |
| 1 | **Monday** blocked |
| 2 | **Tuesday** blocked |
| 3 | **Wednesday** blocked |
| 4 | **Thursday** blocked |
| 5 | **Friday** blocked |
| 6 | **Saturday** blocked |

### 3.2 Official Pedagogic Day Assignments

| Blocked Day | # | Subjects |
|-------------|---|----------|
| Monday | 1 | التا و الجغ (History & Geography), ت.مسرحية (Theatre) |
| Tuesday | 2 | ت.إسلامية (Islamic Education), ت.موسيقية (Music), ع.فيزيائية (Physical Sciences) |
| Wednesday | 3 | ت.تكنولوجية (Technology), رياضيات (Mathematics) |
| Thursday | 4 | ت.تشكيلية (Visual Arts), عربية (Arabic) |
| Friday | 5 | ت.مدنية (Civic Education), فرنسية (French) |
| Saturday | 6 | إعلامية (Computer Science), انقليزية (English), ت.بدنية (PE), ع.الح.و.الأرض (Life Sciences) |
| None | 0 | الإقتصاد, الأنظمة والشبك, الإيطالية, البرمجة, التاريخ, التصرف, الجغرافيا, الخوارزميات, الروسية, الصينية, الفلسفة, ت.تقنية, تك.المعلومات, رياضيات إخ, ع.الحياة اختيا, ع.بيولوجية, ق البيانات, إخ.رياضي, ه.آلية, ه.كهربائية |

### 3.3 Data Mapping

The `pedagogicDay` field is stored on both:
- **`TunisianSubject`** reference table — canonical values from official data
- **`Subject`** table (per-school) — copied during Tunisian import, editable by school admin

When the day value is 1-6, it maps to our 0-indexed week system as: `blockedDay = pedagogicDay - 1` (since 0=Monday in our codebase, and pedagogicDay 1=Monday).

---

## 4. Grade Levels

### Middle School (Collège)
| Code | French | English |
|------|--------|---------|
| 7أ | 7ème année de base | 7th year (basic) |
| 8أ | 8ème année de base | 8th year (basic) |
| 9أ | 9ème année de base | 9th year (basic) |

### Secondary School — Common Trunk
| Code | French | English |
|------|--------|---------|
| 1ث | 1ère année secondaire | 1st year secondary (common) |

### Secondary School — 2nd Year Specializations
| Code | French | English |
|------|--------|---------|
| 2ع | 2ème Sciences | 2nd year Sciences |
| 2تك | 2ème Technologie | 2nd year Technology |
| 2آ | 2ème Lettres | 2nd year Arts/Literature |
| 2إق | 2ème Économie-Gestion | 2nd year Economics |
| 2ريا | 2ème Sport | 2nd year Sports |

### Secondary School — 3rd Year Specializations
| Code | French | English |
|------|--------|---------|
| 3ر | 3ème Mathématiques | 3rd year Mathematics |
| 3ع | 3ème Sciences Expérimentales | 3rd year Experimental Sciences |
| 3آ | 3ème Lettres | 3rd year Arts/Literature |
| 3إق | 3ème Économie-Gestion | 3rd year Economics |
| 3تق | 3ème Sciences Techniques | 3rd year Technical Sciences |
| 3ريا | 3ème Sport | 3rd year Sports |
| 3ع إ | 3ème Sciences Informatiques | 3rd year Computer Science |

### Secondary School — 4th Year (Baccalauréat)
| Code | French | English |
|------|--------|---------|
| 4ر | 4ème Mathématiques | 4th year Mathematics |
| 4ع | 4ème Sciences Expérimentales | 4th year Experimental Sciences |
| 4آ | 4ème Lettres | 4th year Arts/Literature |
| 4إق | 4ème Économie-Gestion | 4th year Economics |
| 4تق | 4ème Sciences Techniques | 4th year Technical Sciences |
| 4ريا | 4ème Sport | 4th year Sports |
| 4ع إ | 4ème Sciences Informatiques | 4th year Computer Science |

---

## 5. Subject Distribution by Grade

### 5.1 Middle School (7أ, 8أ, 9أ)

| Subject | Sessions | Total h/week | Effective h/week | Group? | Biweekly? | Notes |
|---------|----------|-------------|-----------------|--------|-----------|-------|
| عربية (Arabic) | 2h+1h+1h+1h | 5h | 5h | No | No | |
| فرنسية (French) | 1h+1h+2h+1h(bw) | 5h | ~4.5h | No | 1h biweekly | 7أ data |
| انقليزية (English) | 1h+1h+2h(grp) | 4h | 4h | 2h group | No | |
| رياضيات (Mathematics) | 1h+1h+1h+1h | 4h | 4h | No | No | |
| ع فيزيائية (Physics) | 2h(grp)+1h(bw) | 3h | ~2.5h | 2h group lab (type 3) | 1h biweekly | |
| ع الح و الأرض (Life Sci) | 2h(grp)+1h(bw) | 3h | ~2.5h | 2h group lab (type 2) | 1h biweekly | |
| التا و الجغ (History-Geo) | 1h+1h | 2h | 2h | No | No | |
| ت إسلامية (Islamic Ed) | 1h+1h(bw) | 2h | ~1.5h | No | 1h biweekly | |
| ت مدنية (Civic Ed) | 1h+1h(bw) | 2h | ~1.5h | No | 1h biweekly | |
| إعلامية (Computer Sci) | 2h(grp) | 2h | 2h | Yes (group, type 6) | No | |
| ت تكنولوجية (Technology) | 3h(grp) (7أ) / 2h(grp) (8-9أ) | 3h/2h | 3h/2h | Yes (group, type 4) | No | |
| ت بدنية (PE) | 1h+1h | 2h | 2h | No | No | Type 5 |
| ت مسرحية (Theatre) | 1h | 1h | 1h | No | No | 7أ only |
| تربية تشكيلية (Visual Arts) | 1h | 1h | 1h | No | No | |
| تربية موسيقية (Music) | 1h | 1h | 1h | No | No | |

### 5.2 1st Year Secondary (1ث) — Common Trunk

| Subject | Sessions | Total h/week | Effective h/week | Group? | Biweekly? |
|---------|----------|-------------|-----------------|--------|-----------|
| عربية (Arabic) | 2h+2h+1h | 5h | 5h | No | No |
| فرنسية (French) | 1h+1h+2h | 4h | 4h | No | No |
| انقليزية (English) | 1h+1h+1h | 3h | 3h | No | No |
| رياضيات (Mathematics) | 1h+1h+2h | 4h | 4h | No | No |
| ع فيزيائية (Physics) | 2h(grp)+1h+1h | 4h | 4h | 2h group lab (type 3) | No |
| التا و الجغ (History-Geo) | 1h+1h+1h | 3h | 3h | No | No |
| ت إسلامية (Islamic Ed) | 1h+1h(bw) | 2h | ~1.5h | No | 1h biweekly |
| ت مدنية (Civic Ed) | 1h+1h(bw) | 2h | ~1.5h | No | 1h biweekly |
| ت تكنولوجية (Technology) | 4h(grp) | 4h | 4h | Yes (group, type 4) | No |
| إعلامية (Computer Sci) | 2h(grp) | 2h | 2h | Yes (group, type 6) | No |
| ت بدنية (PE) | 1h+1h | 2h | 2h | No | No |

### 5.3 2nd Year Sciences (2ع)

| Subject | Sessions | Total h/week | Effective h/week | Group? | Biweekly? |
|---------|----------|-------------|-----------------|--------|-----------|
| عربية | 1h+1h+2h | 4h | 4h | No | No |
| فرنسية | 1h+1h+2h | 4h | 4h | No | No |
| انقليزية | 1h+1h+1h | 3h | 3h | No | No |
| رياضيات | 1h+2h+2h | 5h | 5h | No | No |
| ع فيزيائية | 3h(grp)+1h+2h(bw)+1h(bw) | 7h | ~5.5h | 3h group lab (type 3) | 2h+1h biweekly |
| ع الح و الأرض | 4h(grp)+1h+2h(grp/bw) | 7h | ~6h | 4h+2h group (type 2) | 2h biweekly |
| التا و الجغ | 1h+1h | 2h | 2h | No | No |
| ت إسلامية | 1h+1h(bw) | 2h | ~1.5h | No | 1h biweekly |
| ت مدنية | 1h+1h(bw) | 2h | ~1.5h | No | 1h biweekly |
| ت تكنولوجية | 4h(grp) | 4h | 4h | Yes (group, type 4) | No |
| ت بدنية | 1h+1h | 2h | 2h | No | No |

### 5.4 3rd Year Mathematics (3ر)

| Subject | Sessions | Total h/week | Effective h/week | Group? | Biweekly? |
|---------|----------|-------------|-----------------|--------|-----------|
| عربية | 2h+1h | 3h | 3h | No | No |
| فرنسية | 1h+1h+2h | 4h | 4h | No | No |
| انقليزية | 1h+1h+1h | 3h | 3h | No | No |
| رياضيات | 1h+2h+2h+2h | 7h | 7h | No | No |
| ع فيزيائية | 3h(grp)+1h+2h+1h(bw) | 7h | ~6.5h | 3h group lab (type 3) | 1h biweekly |
| ع الح و الأرض | 4h(grp/bw)+1h(bw) | 5h | ~2.5h | 4h group lab (type 2) | Both biweekly |
| التا و الجغ | 1h+1h | 2h | 2h | No | No |
| ت إسلامية | 1h | 1h | 1h | No | No |
| ت مدنية | 1h | 1h | 1h | No | No |
| الفلسفة (Philosophy) | 1h | 1h | 1h | No | No |
| إعلامية | 3h(grp) | 3h | 3h | Yes (group, type 6) | No |
| ت بدنية | 2h | 2h | 2h | No | No |

### 5.5 4th Year Mathematics (4ر — Baccalauréat)

| Subject | Sessions | Total h/week | Effective h/week | Group? | Biweekly? |
|---------|----------|-------------|-----------------|--------|-----------|
| عربية | 1h+1h | 2h | 2h | No | No |
| فرنسية | 1h+2h | 3h | 3h | No | No |
| انقليزية | 1h+1h+1h | 3h | 3h | No | No |
| رياضيات | 2h+2h+2h+1h | 7h | 7h | No | No |
| ع فيزيائية | 3h(grp)+1h+2h+1h(bw) | 7h | ~6.5h | 3h group lab (type 3) | 1h biweekly |
| ع الح و الأرض | 4h(grp/bw)+1h(bw) | 5h | ~2.5h | 4h group lab (type 2) | Both biweekly |
| الفلسفة (Philosophy) | 2h+1h | 3h | 3h | No | No |
| إعلامية | 4h(grp) | 4h | 4h | Yes (group, type 6) | No |
| ت بدنية | 2h | 2h | 2h | No | No |

---

## 6. Teacher Workload Rules

### 6.1 Default Weekly & Daily Limits

| Rule | Limit | Applies To |
|------|-------|-----------|
| Max hours per **week** | **18h** | All teachers (default) |
| Max hours per **day** | **4h** | All teachers |
| Max hours per **week** (senior) | **15h** | Teachers with **25+ years** of service |

### 6.2 Seniority Calculation

A teacher's **years of service** is calculated from their `recruitmentDate` to the **start of the current school year** (September 1st):

```
yearsOfService = currentSchoolYear - recruitmentYear

Where:
  currentSchoolYear = if current month >= September then current year, else current year - 1
  recruitmentYear   = year of teacher's recruitmentDate

Example (school year 2025-2026):
  Teacher recruited on 2000-09-15 → 2025 - 2000 = 25 years → SENIOR (≤15h/week)
  Teacher recruited on 2001-10-01 → 2025 - 2001 = 24 years → REGULAR (≤18h/week)
  Teacher recruited on 2005-01-20 → 2025 - 2005 = 20 years → REGULAR (≤18h/week)
```

### 6.3 How to Apply

When generating a timetable, for each teacher:

1. **If `recruitmentDate` is available**: calculate years of service as above
   - If **≥ 25 years** → `maxPeriodsPerWeek = 15`, `maxPeriodsPerDay = 4`
   - If **< 25 years** → `maxPeriodsPerWeek = 18`, `maxPeriodsPerDay = 4`

2. **If `recruitmentDate` is NOT set**: fall back to the teacher's stored `maxPeriodsPerWeek` and `maxPeriodsPerDay` values from the database (which default to 18/week and 4/day)

3. **Manual override**: if a teacher's `maxPeriodsPerWeek` or `maxPeriodsPerDay` is explicitly set to a value **lower** than the rule-based limit, respect the manual value (stricter of the two)

### 6.4 Data Mapping

These rules map to the existing `Teacher` model fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `maxPeriodsPerDay` | Int | 4 | Max teaching hours in a single day |
| `maxPeriodsPerWeek` | Int | 18 | Max teaching hours across the week |
| `recruitmentDate` | DateTime? | null | Used to calculate seniority for 15h rule |

---

## 7. Scheduling Rules for the AI Engine

### 7.1 HARD CONSTRAINTS

```
RULE H1: CONSECUTIVE_PERIODS
Sessions with VolumeHoraire > 1 MUST be scheduled in consecutive periods
with NO break between them. A 2h session needs periods N and N+1 where
neither is a break. A 4h session needs periods N, N+1, N+2, N+3.

RULE H2: GROUP_SESSIONS_REQUIRE_PAIRING
When ParGroupe=TRUE, the class is split into two groups. Both groups
must be scheduled. When two subjects have ParGroupe=TRUE for the same
grade, they should be paired: Group A takes Subject X while Group B
takes Subject Y simultaneously, then they swap in the next slot.
This means the two paired group sessions must occupy the SAME time slot.

RULE H3: GROUP_SESSIONS_NEED_SPECIALIZED_ROOMS
Group sessions (ParGroupe=TRUE) must be assigned to the correct
specialized room type:
- CodeTypeCours 2 → Science Lab (Life Sciences)
- CodeTypeCours 3 → Science Lab (Physical Sciences)
- CodeTypeCours 4 → Technology Lab
- CodeTypeCours 5 → Gym / Sports field
- CodeTypeCours 6 → Computer Lab
- CodeTypeCours 7 → Mechanical Engineering Lab
- CodeTypeCours 8 → Electrical Engineering Lab
Group sessions have HALF the class, so room capacity can be smaller.

RULE H4: BIWEEKLY_SLOT_SHARING
When ParQuinzaine=TRUE, two biweekly sessions can share the same
time slot if they alternate weeks (Week A / Week B). The paired
session is indicated by CodeAss or by matching the same grade level.
The timetable shows BOTH subjects in the same cell with a Week A/B label.

RULE H5: PE_NEEDS_DEDICATED_SLOTS
Physical Education (CodeTypeCours=5) requires gym/outdoor facilities.
Multiple PE sessions for the same class should be on DIFFERENT days.
PE must NOT be scheduled in the first period of the day.

RULE H6: SAME_TEACHER_FOR_ALL_SESSIONS
All sessions of the same subject for the same class MUST be assigned
to the SAME teacher. You cannot split Arabic 5h across two teachers
for the same class.

RULE H7: TEACHER_MAX_HOURS_PER_WEEK
No teacher may be assigned more than their weekly limit:
- Default: 18 hours/week for all teachers
- Senior teachers (25+ years of service): 15 hours/week
Calculate seniority from recruitmentDate to current school year start.
If the teacher has a manually set maxPeriodsPerWeek that is lower,
use the stricter (lower) value.

RULE H8: TEACHER_MAX_HOURS_PER_DAY
No teacher may be assigned more than 4 teaching hours in a single day.
This applies to ALL teachers regardless of seniority.
If the teacher has a manually set maxPeriodsPerDay that is lower,
use the stricter (lower) value.

RULE H9: PEDAGOGIC_DAY
If a subject has pedagogicDay > 0, it MUST NOT be scheduled on
the corresponding day of the week:
  pedagogicDay 1 → No lessons on Monday
  pedagogicDay 2 → No lessons on Tuesday
  pedagogicDay 3 → No lessons on Wednesday
  pedagogicDay 4 → No lessons on Thursday
  pedagogicDay 5 → No lessons on Friday
  pedagogicDay 6 → No lessons on Saturday
This is an absolute hard constraint — the blocked day is reserved
for teacher training and pedagogical meetings for that subject.
```

### 7.2 SOFT CONSTRAINTS (Priority Order)

```
RULE S1: HEAVY_SUBJECTS_MORNING
Subjects with high weekly volume (Math ≥5h, Physics, Arabic) should
be scheduled in MORNING periods (periods 1-4), not late afternoon.

RULE S2: SPREAD_SESSIONS_ACROSS_WEEK
Multiple sessions of the same subject for one class should be
distributed across DIFFERENT days. Never put 2 sessions of the same
subject on the same day unless it's a multi-hour block.

RULE S3: NO_BACK_TO_BACK_SAME_SUBJECT
A class should not have the same subject in consecutive single-period
slots (unless it's a planned 2h session).

RULE S4: LAB_BEFORE_LECTURE
When a subject has both lab (group) and lecture (whole class) sessions,
the lab session should ideally come BEFORE the lecture session in the
week, so students can discuss practical work in class.

RULE S5: ARTS_AND_PE_AFTERNOON
Arts (Music, Theatre, Visual Arts) and PE should be scheduled in
AFTERNOON periods when possible.

RULE S6: BALANCE_DAILY_LOAD
Each day should have a balanced mix of heavy (Math, Sciences) and
light (Arts, PE, Civic Ed) subjects. Avoid stacking all heavy
subjects on the same day.

RULE S7: GROUP_PAIRING_SAME_DAY
Paired group sessions (Group A + Group B swap) should be scheduled
in consecutive periods on the SAME day. Example: Period 3 Group A
has Physics Lab while Group B has Biology Lab, Period 4 they swap.

RULE S8: BIWEEKLY_SAME_DAY_TIME
Paired biweekly sessions must be at the same day and time slot so
the timetable is consistent — students always know "Tuesday period 3"
even if the subject alternates weeks.
```

### 7.3 ROOM ALLOCATION RULES

```
RULE R1: Regular sessions (CodeTypeCours=1) → Standard classroom
RULE R2: Lab sessions need matching specialized room
RULE R3: Group sessions use HALF the class → smaller room OK
RULE R4: Engineering labs (types 7, 8) are RARE — only tech schools have them
RULE R5: Computer labs (type 6) are high-demand — schedule carefully
RULE R6: PE (type 5) doesn't need an indoor room (gym/field)

RULE R7: SPECIALIZED_ROOMS_RESERVED (HARD)
Specialized rooms (computer labs, chemistry labs, biology labs, science labs,
engineering labs) MUST NOT be used for regular/normal subject classes.
These rooms are RESERVED for their matching session types only.
Exception: if ALL standard classrooms are occupied AND the specialized room
is empty for that slot, it MAY be used as a last resort.
Priority order for room assignment:
  1. Matching specialized room (e.g., lab session → lab room)
  2. Standard classroom (for regular sessions)
  3. Any available standard classroom
  4. LAST RESORT ONLY: empty specialized room for a regular session

RULE R8: LIBRARY_GYMNASIUM_ABSOLUTE (HARD)
Library and gymnasium rooms MUST NEVER be used for teaching subjects
other than their intended purpose. Gymnasium is ONLY for Physical Education
(CodeTypeCours=5). Library is ONLY for supervised study/reading sessions.
This rule has NO exceptions — even if all other rooms are full, do NOT
assign a math or language class to the library or gymnasium.
```

---

## 8. Data Format for AI Prompt

When feeding curriculum data to the AI timetable generator, each grade-class should include session details in this format:

```json
{
  "classId": "class_id",
  "gradeLevelCode": "2ع",
  "sessions": [
    {
      "subjectId": "subject_id",
      "subjectName": "رياضيات",
      "sessionType": 1,
      "duration": 2,
      "isGroup": false,
      "isBiweekly": false,
      "pairedWith": null,
      "pedagogicDay": 3
    },
    {
      "subjectId": "physics_id",
      "subjectName": "ع فيزيائية",
      "sessionType": 3,
      "duration": 3,
      "isGroup": true,
      "isBiweekly": false,
      "pairedWith": "bio_session_id",
      "pedagogicDay": 2
    }
  ]
}
```

---

## 9. Summary Statistics

| Grade Family | Total Grades | Avg Sessions/Week | Group Sessions | Biweekly Sessions |
|-------------|-------------|-------------------|----------------|-------------------|
| Middle School (7-9أ) | 3 | ~28-30 | 3-4 (labs, IT, tech) | 3-4 (Islamic, Civic, some sciences) |
| 1st Year (1ث) | 1 | ~28 | 3 (physics, tech, IT) | 2 (Islamic, Civic) |
| 2nd Year | 5 | ~28-34 | 3-5 (labs, IT, tech) | 2-4 |
| 3rd Year | 7 | ~28-36 | 3-6 (labs, IT, engineering) | 2-4 |
| 4th Year (Bac) | 7 | ~26-34 | 3-6 (labs, IT, engineering) | 2-4 |

**Key takeaway**: A typical Tunisian secondary class has 28-34 session slots per week, of which 3-6 are group-based (requiring room splits and pairing) and 2-4 are biweekly (alternating weeks).
