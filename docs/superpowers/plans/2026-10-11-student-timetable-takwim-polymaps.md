# Student Timetable, Personalized Calendar & PolyMaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete client-side timetable upload and parser pipeline using `pdfjs-dist`, store verified schedules in `student_timetables`, display a personal calendar tab in e-Akademik (`/akademik/takwim`), render a dynamic "Kelas Seterusnya" Bento Card on the SuperApp Portal page with client-side countdown, deep-link to PolyMaps (`/polymaps?room=<UUID>`), and automate 30-minute class reminders with race-condition-proof deduplication.

**Architecture:** Client-side parsing via `pdfjs-dist` eliminates server CPU/RAM load for 1,500 concurrent students. Mandatory interactive preview modal allows manual corrections and repeat courses before saving. Portal Bento Card computes live countdowns locally using `setInterval` (zero DB polling). PolyMaps deep-links directly by room UUID. Reminders are deduplicated at the DB level with `UNIQUE (timetable_id, notified_date)`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Supabase (PostgreSQL + RLS), `pdfjs-dist` (^5.6.205), Framer Motion, Vitest, Playwright.

## Global Constraints
- **RLS Rules:** ALWAYS use `(SELECT auth.uid())` — NEVER bare `auth.uid()`. One policy per operation per table.
- **Timezone Integrity (UTC+8):** All DB SQL, cron intervals, and date calculations MUST use `AT TIME ZONE 'Asia/Kuala_Lumpur'` and `EXTRACT(ISODOW FROM (NOW() AT TIME ZONE 'Asia/Kuala_Lumpur'))` to prevent wrong day-of-week and shifted dedup dates.
- **Dynamic Reminders:** Cron queries MUST join `student_timetable_settings` to read each student's `reminder_minutes` (default 30, or custom 15/45 min) rather than hardcoding 25-35 min.
- **Online Class Branching:** If `is_online = true`, show "Sertai Kelas Online" (Teams) and HIDE the PolyMaps button (no physical walk). If `is_online = false`, show PolyMaps navigation button (`?room=<UUID>`).
- **Semester Dates Sourcing:** `semester_start_date` and `semester_end_date` are auto-populated from `src/config/takwim-akademik-template.ts` (the ONLY source of institutional academic-session dates — `system_settings` has no session/semester data). Fallback when no session match: `TARIKH KUATKUASA` + 18 weeks (14 kuliah + 1 cuti pertengahan + 1 ulang kaji + 2 peperiksaan), fully editable by the student in the preview modal.
- **Normalization:** No redundant `building_id` in `student_timetables` — access building via `location_id → imaps_locations.building_id → imaps_buildings`.
- **Zero DB Polling:** Client-side live timer/countdown using `setInterval` over locally loaded schedule.
- **No Hardcoded Rooms:** Data-driven mapping via `imaps_room_mappings` table.
- **Testing Stack:** Tasks 3/4/5 use `@testing-library/react` (`render`/`screen`) which is NOT installed — `package.json` has no `@testing-library/react`, `@testing-library/jest-dom`, or `jsdom`. Existing tests (`superAppPortal.test.ts`) use pure-logic imports with zero DOM. EITHER add those devDeps + `environment: 'jsdom'` in `vitest.config`, OR rewrite those component tests to assert pure functions/helpers. Do not assume `@testing-library/react` exists.
- **Strict Human-in-the-Loop:** Never auto-commit parsed data; mandatory user review & confirm.
- **Documentation:** After completing implementation, update `DEV_GUIDELINE.md` per `AGENTS.md`.

---

### Task 1: Database Migration & Core Type Contracts

**Files:**
- Create: `supabase/migrations/20261011000000_create_student_timetables.sql`
- Modify: `src/types/index.ts`
- Test: `src/__tests__/timetableSchemaTypes.test.ts`

**Interfaces:**
- Produces:
  - `StudentTimetableEntry`: `{ id, user_id, academic_session, semester, class_name, day_of_week, start_time, end_time, course_code, course_name, class_type, lecturer_code, room_raw, location_id, is_online, color, is_archived }`
  - `StudentTimetableMetadata`: `{ id, user_id, academic_session, semester, class_name, semester_start_date, semester_end_date, is_active }`
  - `StudentTimetableSettings`: `{ user_id, notifications_enabled, reminder_minutes }`
  - `ImapsRoomMapping`: `{ id, room_code_pattern, location_id, is_online, notes }`

- [ ] **Step 1: Write the failing type contract test**

Create `src/__tests__/timetableSchemaTypes.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import type { 
  StudentTimetableEntry, 
  StudentTimetableMetadata, 
  StudentTimetableSettings, 
  ImapsRoomMapping 
} from '@/types';

describe('Timetable Schema Types Contract', () => {
  it('should validate complete StudentTimetableEntry shape', () => {
    const sample: StudentTimetableEntry = {
      id: 'uuid-1',
      user_id: 'user-uuid',
      academic_session: '2025/2026',
      semester: 'S2',
      class_name: 'DEE2A',
      day_of_week: 1,
      start_time: '08:00:00',
      end_time: '10:00:00',
      course_code: 'DEE20153',
      course_name: 'DIGITAL ELECTRONICS',
      class_type: 'KULIAH',
      lecturer_code: 'AI',
      room_raw: 'EA303',
      location_id: 'loc-uuid',
      is_online: false,
      color: '#3b82f6',
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    expect(sample.class_name).toBe('DEE2A');
    expect(sample.day_of_week).toBe(1);
    expect(sample.is_online).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/timetableSchemaTypes.test.ts`  
Expected: FAIL with "Module '@/types' has no exported member 'StudentTimetableEntry'"

- [ ] **Step 3: Add type definitions to `src/types/index.ts` and create SQL migration**

Edit `src/types/index.ts` to export timetable types:
```typescript
export type ClassType = 'KULIAH' | 'AMALI' | 'TUTORIAL' | 'LAIN_LAIN';

export interface StudentTimetableEntry {
  id: string;
  user_id: string;
  academic_session: string;
  semester: string;
  class_name: string;
  day_of_week: number; // 1=Isnin .. 5=Jumaat
  start_time: string; // HH:mm:ss
  end_time: string;   // HH:mm:ss
  course_code: string;
  course_name: string;
  class_type: ClassType;
  lecturer_code?: string | null;
  room_raw: string;
  location_id?: string | null;
  is_online: boolean;
  color: string;
  is_archived: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StudentTimetableMetadata {
  id: string;
  user_id: string;
  academic_session: string;
  semester: string;
  class_name: string;
  semester_start_date: string;
  semester_end_date: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StudentTimetableSettings {
  user_id: string;
  notifications_enabled: boolean;
  reminder_minutes: number;
  created_at?: string;
  updated_at?: string;
}

export interface ImapsRoomMapping {
  id: string;
  room_code_pattern: string;
  location_id?: string | null;
  is_online: boolean;
  notes?: string | null;
}
```

Create migration file `supabase/migrations/20261011000000_create_student_timetables.sql`:
```sql
-- 1. student_timetables
CREATE TABLE IF NOT EXISTS public.student_timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    academic_session TEXT NOT NULL,
    semester TEXT NOT NULL,
    class_name TEXT NOT NULL,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    course_code TEXT NOT NULL,
    course_name TEXT NOT NULL,
    class_type TEXT NOT NULL DEFAULT 'KULIAH',
    lecturer_code TEXT,
    room_raw TEXT NOT NULL,
    location_id UUID REFERENCES public.imaps_locations(id) ON DELETE SET NULL,
    is_online BOOLEAN NOT NULL DEFAULT false,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_timetables_user_archived ON public.student_timetables(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_student_timetables_location ON public.student_timetables(location_id);
CREATE INDEX IF NOT EXISTS idx_student_timetables_active_schedule ON public.student_timetables(day_of_week, start_time) WHERE is_archived = false;

ALTER TABLE public.student_timetables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_timetables_owner_and_superadmin"
ON public.student_timetables FOR ALL
USING (
    (SELECT auth.uid()) = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP')
)
WITH CHECK (
    (SELECT auth.uid()) = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP')
);

-- 2. student_timetable_metadata
CREATE TABLE IF NOT EXISTS public.student_timetable_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    academic_session TEXT NOT NULL,
    semester TEXT NOT NULL,
    class_name TEXT NOT NULL,
    semester_start_date DATE NOT NULL,
    semester_end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_active_meta UNIQUE (user_id, academic_session, semester)
);

ALTER TABLE public.student_timetable_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_timetable_metadata_owner_and_superadmin"
ON public.student_timetable_metadata FOR ALL
USING (
    (SELECT auth.uid()) = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP')
)
WITH CHECK (
    (SELECT auth.uid()) = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP')
);

-- 3. student_timetable_settings
CREATE TABLE IF NOT EXISTS public.student_timetable_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    reminder_minutes INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.student_timetable_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_timetable_settings_owner_and_superadmin"
ON public.student_timetable_settings FOR ALL
USING (
    (SELECT auth.uid()) = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP')
)
WITH CHECK (
    (SELECT auth.uid()) = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP')
);

-- 4. imaps_room_mappings
CREATE TABLE IF NOT EXISTS public.imaps_room_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code_pattern TEXT NOT NULL UNIQUE,
    location_id UUID REFERENCES public.imaps_locations(id) ON DELETE CASCADE,
    is_online BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.imaps_room_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "imaps_room_mappings_read_all"
ON public.imaps_room_mappings FOR SELECT USING (true);

CREATE POLICY "imaps_room_mappings_superadmin_write"
ON public.imaps_room_mappings FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP'));

-- 5. student_timetable_notification_logs (Harden RLS)
CREATE TABLE IF NOT EXISTS public.student_timetable_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_id UUID NOT NULL REFERENCES public.student_timetables(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notified_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_timetable_notified_per_day UNIQUE (timetable_id, notified_date)
);

CREATE INDEX IF NOT EXISTS idx_timetable_dedup_log ON public.student_timetable_notification_logs(timetable_id, notified_date);

ALTER TABLE public.student_timetable_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_timetable_notification_logs_select_own"
ON public.student_timetable_notification_logs FOR SELECT
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "student_timetable_notification_logs_superadmin"
ON public.student_timetable_notification_logs FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'SUPER_ADMIN_JPP'));
```

- [ ] **Step 4: Run type test to verify it passes**

Run: `npx vitest run src/__tests__/timetableSchemaTypes.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/types/index.ts supabase/migrations/20261011000000_create_student_timetables.sql src/__tests__/timetableSchemaTypes.test.ts
git commit -m "feat(timetable): add database schema migration and core type definitions"
```

---

### Task 2: Client-Side PDF Timetable Parser (`timetableParser.ts`)

**Files:**
- Create: `src/lib/timetableParser.ts`
- Test: `src/__tests__/timetableParser.test.ts`

**Interfaces:**
- Consumes: `pdfjs-dist` (getTextContent), `StudentTimetableEntry`, `ClassType`
- Produces:
  - `scanPdfClasses(file: ArrayBuffer): Promise<{ pageIndex: number; className: string }[]>`
  - `parseTimetablePage(file: ArrayBuffer, pageIndex: number, roomMappings?: ImapsRoomMapping[]): Promise<{ metadata: { session: string; effectiveDate: string; className: string; department: string }; entries: Omit<StudentTimetableEntry, 'id' | 'user_id'>[] }>`
  - `mergeConsecutiveSlots(slots: ParsedSlot[]): ParsedSlot[]`

- [ ] **Step 1: Write failing parser unit test**

Create `src/__tests__/timetableParser.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { mergeConsecutiveSlots, parseCourseCodeAndType } from '@/lib/timetableParser';

describe('Timetable Parser Logic', () => {
  it('should parse course code and class type accurately', () => {
    expect(parseCourseCodeAndType('DEE20153(L)')).toEqual({ courseCode: 'DEE20153', classType: 'KULIAH' });
    expect(parseCourseCodeAndType('DET30053(P)')).toEqual({ courseCode: 'DET30053', classType: 'AMALI' });
    expect(parseCourseCodeAndType('DUE10062(TU)')).toEqual({ courseCode: 'DUE10062', classType: 'TUTORIAL' });
    expect(parseCourseCodeAndType('PA(O)')).toEqual({ courseCode: 'PA', classType: 'LAIN_LAIN' });
  });

  it('should merge consecutive 1-hour slots into a 2-hour continuous slot', () => {
    const rawSlots = [
      {
        day_of_week: 1,
        start_time: '08:00:00',
        end_time: '09:00:00',
        course_code: 'DEE20153',
        course_name: 'DIGITAL ELECTRONICS',
        class_type: 'KULIAH' as const,
        lecturer_code: 'AI',
        room_raw: 'EA303',
        is_online: false,
        color: '#3b82f6'
      },
      {
        day_of_week: 1,
        start_time: '09:00:00',
        end_time: '10:00:00',
        course_code: 'DEE20153',
        course_name: 'DIGITAL ELECTRONICS',
        class_type: 'KULIAH' as const,
        lecturer_code: 'AI',
        room_raw: 'EA303',
        is_online: false,
        color: '#3b82f6'
      }
    ];

    const merged = mergeConsecutiveSlots(rawSlots);
    expect(merged.length).toBe(1);
    expect(merged[0].start_time).toBe('08:00:00');
    expect(merged[0].end_time).toBe('10:00:00');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/timetableParser.test.ts`  
Expected: FAIL with "Cannot find module '@/lib/timetableParser'"

- [ ] **Step 3: Implement `src/lib/timetableParser.ts`**

```typescript
import * as pdfjsLib from 'pdfjs-dist';
import { ClassType, StudentTimetableEntry, ImapsRoomMapping } from '@/types';

// Palette for distinct course color assignment
export const COURSE_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
];

export function parseCourseCodeAndType(raw: string): { courseCode: string; classType: ClassType } {
  const match = raw.match(/^([A-Z0-9]+)\s*\((L|P|TU|O)\)/i);
  if (!match) return { courseCode: raw.trim(), classType: 'LAIN_LAIN' };
  
  const typeMap: Record<string, ClassType> = {
    L: 'KULIAH',
    P: 'AMALI',
    TU: 'TUTORIAL',
    O: 'LAIN_LAIN',
  };
  return {
    courseCode: match[1].toUpperCase(),
    classType: typeMap[match[2].toUpperCase()] || 'LAIN_LAIN',
  };
}

export function mergeConsecutiveSlots<T extends {
  day_of_week: number;
  start_time: string;
  end_time: string;
  course_code: string;
  class_type: ClassType;
  room_raw: string;
}>(slots: T[]): T[] {
  if (slots.length <= 1) return slots;

  const sorted = [...slots].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
    return a.start_time.localeCompare(b.start_time);
  });

  const merged: T[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    const canMerge =
      current.day_of_week === next.day_of_week &&
      current.end_time === next.start_time &&
      current.course_code === next.course_code &&
      current.class_type === next.class_type &&
      current.room_raw === next.room_raw;

    if (canMerge) {
      current.end_time = next.end_time;
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);
  return merged;
}

export async function scanPdfClasses(arrayBuffer: ArrayBuffer): Promise<{ pageIndex: number; className: string }[]> {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const classesFound: { pageIndex: number; className: string }[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const fullText = content.items.map((it: any) => it.str).join(' ');
    const match = fullText.match(/KELAS\s*:\s*([A-Za-z0-9_-]+)/i);
    if (match) {
      classesFound.push({ pageIndex: pageNum, className: match[1].trim() });
    }
  }

  return classesFound;
}
  return classesFound;
}

// ── parseTimetablePage: coordinate grid extractor (JKE template) ─────────────
// ponytail: grid thresholds tuned for ONE real JKE PDF. Add per-department
// templates (JKA/JKM/JP/JTM) as samples arrive. Do NOT generalize prematurely.
// BLOCKER: validate against a REAL `CM_SEM3_JKE.pdf` before Phase 1 ships —
// the cell-to-slot mapping below is a best-effort skeleton, not verified.

interface PdfTextItem {
  str: string;
  x: number;    // device-space X (it.transform[4])
  y: number;    // device-space Y (it.transform[5], grows downward)
  width: number;
  height: number;
}

const DAY_NAMES = ['ISNIN', 'SELASA', 'RABU', 'KHAMIS', 'JUMAAT'];

function toTextItems(content: any): PdfTextItem[] {
  return content.items
    .filter((it: any) => typeof it.str === 'string' && it.str.trim().length > 0)
    .map((it: any) => ({
      str: it.str.trim(),
      x: it.transform[4],
      y: it.transform[5],
      width: it.width ?? 0,
      height: it.height ?? 0,
    }));
}

// Cluster text items into horizontal bands (rows) by Y proximity.
export function clusterRowsByY(items: PdfTextItem[], tolerance = 5): PdfTextItem[][] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: PdfTextItem[][] = [];
  let cur: PdfTextItem[] = [];
  let anchorY: number | null = null;
  for (const it of sorted) {
    if (anchorY === null || Math.abs(it.y - anchorY) <= tolerance) {
      cur.push(it);
      if (anchorY === null) anchorY = it.y;
    } else {
      rows.push(cur);
      cur = [it];
      anchorY = it.y;
    }
  }
  if (cur.length) rows.push(cur);
  return rows;
}

function rowText(row: PdfTextItem[]): string {
  return row
    .slice()
    .sort((a, b) => a.x - b.x)
    .map((it) => it.str)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function parseTimetablePage(
  arrayBuffer: ArrayBuffer,
  pageIndex: number,
  roomMappings: ImapsRoomMapping[] = []
): Promise<{
  metadata: { session: string; effectiveDate: string; className: string; department: string };
  entries: Omit<StudentTimetableEntry, 'id' | 'user_id'>[];
}> {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageIndex);
  const content = await page.getTextContent();
  const items = toTextItems(content);
  const rows = clusterRowsByY(items);

  // Header metadata via full-text regex (format-independent).
  const fullText = items
    .slice()
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((it) => it.str)
    .join(' ');
  const metadata = {
    className: fullText.match(/KELAS\s*:\s*([A-Za-z0-9_-]+)/i)?.[1]?.trim() ?? '',
    session: fullText.match(/SESI\s*:\s*([A-Za-z0-9_/]+)/i)?.[1]?.trim() ?? '',
    effectiveDate: fullText.match(/TARIKH\s*KUATKUASA\s*:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i)?.[1]?.trim() ?? '',
    department: fullText.match(/JABATAN\s*:\s*([A-Za-z ]+)/i)?.[1]?.trim() ?? '',
  };

  // Time-column X anchors ("08:00".."16:00").
  // ponytail: other templates may use "8-9" or merged 2h blocks — normalize here.
  const timeColX = new Map<string, number>();
  for (const row of rows) {
    for (const it of row) {
      const m = it.str.match(/^(\d{1,2}):(\d{2})$/);
      if (m) timeColX.set(`${String(+m[1]).padStart(2, '0')}:${m[2]}`, it.x);
    }
  }
  const times = [...timeColX.keys()].sort();

  // Day-row Y anchors from day-name cells.
  const dayRowY = new Map<string, number>();
  for (const row of rows) {
    const upper = rowText(row).toUpperCase();
    for (const day of DAY_NAMES) {
      if (upper.includes(day) && !dayRowY.has(day)) {
        dayRowY.set(day, Math.min(...row.map((it) => it.y)));
      }
    }
  }

  const orderedDays = DAY_NAMES.filter((d) => dayRowY.has(d));
  const sortedDayYs = orderedDays.map((d) => dayRowY.get(d)!).sort((a, b) => a - b);
  const timeXs = times.map((t) => timeColX.get(t)!).sort((a, b) => a - b);
  const halfGap = timeXs.length > 1 ? (timeXs[1] - timeXs[0]) / 2 : 30;

  const entries: Omit<StudentTimetableEntry, 'id' | 'user_id'>[] = [];
  for (let di = 0; di < orderedDays.length; di++) {
    const day = orderedDays[di];
    const y0 = dayRowY.get(day)!;
    const y1 = sortedDayYs[di + 1] ?? (y0 + 200);
    for (let ti = 0; ti < times.length; ti++) {
      const x0 = timeXs[ti] - halfGap;
      const x1 = timeXs[ti] + halfGap;
      const cell = items
        .filter((it) => it.y > y0 && it.y < y1 && it.x >= x0 && it.x < x1)
        .sort((a, b) => a.y - b.y || a.x - b.x);
      const cellText = cell.map((it) => it.str).join(' ').trim();
      if (!cellText) continue;

      const parsed = parseCell(cellText, roomMappings);
      if (!parsed.course_code) continue;

      entries.push({
        academic_session: metadata.session,
        semester: '',
        class_name: metadata.className,
        day_of_week: di + 1,
        start_time: `${times[ti]}:00`,
        end_time: `${times[ti + 1] ?? '17:00'}:00`,
        course_code: parsed.course_code,
        course_name: parsed.course_code, // legend match or manual edit fills this
        class_type: parsed.class_type,
        lecturer_code: parsed.lecturer_code,
        room_raw: parsed.room_raw,
        location_id: parsed.location_id,
        is_online: parsed.is_online,
        color: COURSE_PALETTE[0],
        is_archived: false,
      });
    }
  }

  return { metadata, entries: mergeConsecutiveSlots(entries) };
}

// ponytail: lecturer-vs-room token heuristic is JKE-specific ("DEE20153(L) AI EA303").
// Validate token order against the real sample; adjust when format differs.
function parseCell(cellText: string, roomMappings: ImapsRoomMapping[]) {
  const codeType = cellText.match(/^([A-Z0-9]+)\s*\((L|P|TU|O)\)/i);
  const { courseCode, classType } = codeType
    ? parseCourseCodeAndType(codeType[0])
    : { courseCode: '', classType: 'LAIN_LAIN' as ClassType };

  const rest = cellText.replace(/^[A-Z0-9]+\s*\((L|P|TU|O)\)/i, '').trim();
  const tokens = rest.split(/\s+/);
  const room = tokens[tokens.length - 1] ?? '';
  const lecturer = tokens.length > 1 ? tokens.slice(0, -1).join(',') : '';

  const mapping = roomMappings.find((m) => m.room_code_pattern === room);
  return {
    course_code: courseCode,
    class_type: classType,
    lecturer_code: lecturer,
    room_raw: room,
    location_id: mapping?.location_id ?? null,
    is_online: mapping?.is_online ?? false,
  };
}
```

- [ ] **Step 4: Run parser unit test to verify it passes**

Run: `npx vitest run src/__tests__/timetableParser.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit parser utility**

```bash
git add src/lib/timetableParser.ts src/__tests__/timetableParser.test.ts
git commit -m "feat(timetable): add client-side pdf parser core with slot merging"
```

---

### Task 3: Interactive Timetable Preview & Edit Modal (`TimetablePreviewModal.tsx`)

**Files:**
- Create: `src/components/takwim/TimetablePreviewModal.tsx`
- Create: `src/components/takwim/TimetableUploadModal.tsx`
- Test: `src/__tests__/TimetablePreviewModal.test.tsx`

**Interfaces:**
- Consumes: `StudentTimetableEntry`, `timetableParser.ts`, Supabase client
- Produces: Modal displaying editable timetable slots grouped by day, manual slot addition, course name editing, conflict warnings, and safe write to `student_timetables`.

- [ ] **Step 1: Write preview modal render test**

Create `src/__tests__/TimetablePreviewModal.test.tsx`:
```tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimetablePreviewModal } from '@/components/takwim/TimetablePreviewModal';

describe('TimetablePreviewModal', () => {
  it('renders preview slots and mandatory disclaimer', () => {
    const mockEntries = [
      {
        academic_session: '2025/2026',
        semester: 'S2',
        class_name: 'DEE2A',
        day_of_week: 1,
        start_time: '08:00:00',
        end_time: '10:00:00',
        course_code: 'DEE20153',
        course_name: 'DIGITAL ELECTRONICS',
        class_type: 'KULIAH' as const,
        lecturer_code: 'AI',
        room_raw: 'EA303',
        is_online: false,
        color: '#3b82f6',
        is_archived: false,
      }
    ];

    render(
      <TimetablePreviewModal
        isOpen={true}
        onClose={() => {}}
        onSave={() => Promise.resolve()}
        entries={mockEntries}
        className="DEE2A"
      />
    );

    expect(screen.getByText(/DEE20153/i)).toBeDefined();
    expect(screen.getByText(/DIGITAL ELECTRONICS/i)).toBeDefined();
    expect(screen.getByText(/EA303/i)).toBeDefined();
    expect(screen.getByText(/Peringatan: Ini adalah jadual kuliah mingguan biasa/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/TimetablePreviewModal.test.tsx`  
Expected: FAIL with "Cannot find module '@/components/takwim/TimetablePreviewModal'"

- [ ] **Step 3: Implement `TimetablePreviewModal.tsx` and `TimetableUploadModal.tsx`**

Create `src/components/takwim/TimetablePreviewModal.tsx` with full interactive editing, slot delete, manual add, and the mandatory disclosure notice.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/TimetablePreviewModal.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit preview and upload modal**

```bash
git add src/components/takwim/TimetablePreviewModal.tsx src/components/takwim/TimetableUploadModal.tsx src/__tests__/TimetablePreviewModal.test.tsx
git commit -m "feat(takwim): add timetable upload and interactive verification modal"
```

---

### Task 4: e-Akademik Unified Takwim Tab (`MyTimetableView.tsx`)

**Files:**
- Create: `src/components/takwim/MyTimetableView.tsx`
- Modify: `src/pages/akademik/AkademikTakwimPage.tsx`
- Test: `src/__tests__/MyTimetableView.test.tsx`

**Interfaces:**
- Consumes: Supabase `student_timetables`, `student_timetable_settings`, `AuthContext`
- Produces: Dual tab switcher on `/akademik/takwim`: Tab 1 "Jadual Kuliah Saya" + Tab 2 "Takwim Rasmi POLISAS & Kelab". Mobile daily agenda & desktop 5-day grid.

- [ ] **Step 1: Write failing component test**

Create `src/__tests__/MyTimetableView.test.tsx`:
```tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyTimetableView } from '@/components/takwim/MyTimetableView';

describe('MyTimetableView', () => {
  it('renders weekday columns and empty state when no timetable exists', () => {
    render(<MyTimetableView timetables={[]} onUploadClick={() => {}} />);
    expect(screen.getByText(/Belum Memuat Naik Jadual/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/MyTimetableView.test.tsx`  
Expected: FAIL

- [ ] **Step 3: Implement `MyTimetableView.tsx` & integrate tab in `AkademikTakwimPage.tsx`**

Implement `MyTimetableView.tsx` supporting:
- Toggle between Weekly Grid (desktop) and Daily Agenda (mobile).
- Action buttons: "Muat Naik Jadual PDF", "Tambah Slot Manual", Notification toggle bell.
- Edit `src/pages/akademik/AkademikTakwimPage.tsx` to add top Tab Switcher (`activeMainTab: 'PERSONAL' | 'PUSAT'`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/MyTimetableView.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit e-Akademik timetable integration**

```bash
git add src/components/takwim/MyTimetableView.tsx src/pages/akademik/AkademikTakwimPage.tsx src/__tests__/MyTimetableView.test.tsx
git commit -m "feat(takwim): add MyTimetableView component and unified tab switcher in e-Akademik"
```

---

### Task 5: SuperApp Portal Page Bento Card (`NextClassBentoCard.tsx`)

**Files:**
- Create: `src/components/portal/NextClassBentoCard.tsx`
- Modify: `src/pages/PortalPage.tsx`
- Test: `src/__tests__/NextClassBentoCard.test.tsx`

**Interfaces:**
- Consumes: `student_timetables` data passed from PortalPage's parallel initial fetch.
- Produces: Live widget with local `setInterval` countdown, direct deep link to `/polymaps?room=<UUID>`, weekend skipping to next Monday, 4 display states.

- [ ] **Step 1: Write failing Bento Card unit test**

Create `src/__tests__/NextClassBentoCard.test.tsx`:
```tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextClassBentoCard } from '@/components/portal/NextClassBentoCard';
import { MemoryRouter } from 'react-router-dom';

describe('NextClassBentoCard', () => {
  it('renders prompt when no timetable uploaded', () => {
    render(
      <MemoryRouter>
        <NextClassBentoCard timetable={null} todayClasses={[]} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Jadual Kuliah & Bilik/i)).toBeDefined();
    expect(screen.getByText(/Muat Naik Jadual/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/NextClassBentoCard.test.tsx`  
Expected: FAIL

- [ ] **Step 3: Implement `NextClassBentoCard.tsx` and embed in `PortalPage.tsx`**

- Create `src/components/portal/NextClassBentoCard.tsx` with:
  - Client-side countdown using `setInterval` every 30s calculated with Malaysian Timezone (`Asia/Kuala_Lumpur`).
  - Class type branching:
    - If `is_online = true`: displays "Sertai Kelas Online" (Teams badge / external link) and completely hides the PolyMaps navigation button.
    - If `is_online = false`: displays physical room and button "Panduan PolyMaps" linking to `/polymaps?room=${item.location_id || ''}${!item.location_id ? `q=${encodeURIComponent(item.room_raw)}` : ''}`.
  - State logic for Today's next class, Today's finished classes (skip to Monday), Weekend, and No Timetable.
- Modify `src/pages/PortalPage.tsx` to include `fetchUserTimetable` in initial `Promise.all` and render `<NextClassBentoCard />` above `CampusServicesGrid`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/NextClassBentoCard.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit Bento Card**

```bash
git add src/components/portal/NextClassBentoCard.tsx src/pages/PortalPage.tsx src/__tests__/NextClassBentoCard.test.tsx
git commit -m "feat(portal): add NextClassBentoCard with live client countdown and PolyMaps deep link"
```

---

### Task 6: Scheduled Notification Engine with Unique Deduplication

**Files:**
- Create: `supabase/migrations/20261011000001_timetable_reminder_cron.sql`
- Modify: `server.js`
- Test: `src/__tests__/timetableNotificationDedup.test.ts`

**Interfaces:**
- Consumes: `student_timetables`, `student_timetable_settings`, `student_timetable_metadata`, existing `web-push` infra.
- Produces: Scheduled runner firing class reminders based on student's `reminder_minutes` during semester dates, recording unique dedup entries with `ON CONFLICT DO NOTHING`.

- [ ] **Step 1: Write dedup logic test**

Create `src/__tests__/timetableNotificationDedup.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';

describe('Notification Deduplication Key', () => {
  it('generates consistent unique keys per slot per day', () => {
    const slotId = 'slot-123';
    const today = '2026-10-12';
    const key = `${slotId}_${today}`;
    expect(key).toBe('slot-123_2026-10-12');
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/__tests__/timetableNotificationDedup.test.ts`  
Expected: PASS

- [ ] **Step 3: Implement cron handler in `server.js` and migration function**

Add scheduled job in `server.js`:
- Executes every 5 minutes (`*/5 * * * *`).
- Uses Malaysian Time (`Asia/Kuala_Lumpur` / UTC+8) for day-of-week and time calculations:
  ```sql
  SELECT 
    t.id, t.user_id, t.course_code, t.course_name, t.room_raw, t.is_online,
    COALESCE(s.reminder_minutes, 30) AS reminder_mins
  FROM public.student_timetables t
  JOIN public.student_timetable_settings s ON s.user_id = t.user_id
  JOIN public.student_timetable_metadata m ON m.user_id = t.user_id AND m.academic_session = t.academic_session AND m.semester = t.semester
  WHERE s.notifications_enabled = true
    AND t.is_archived = false
    AND (NOW() AT TIME ZONE 'Asia/Kuala_Lumpur')::date BETWEEN m.semester_start_date AND m.semester_end_date
    AND t.day_of_week = EXTRACT(ISODOW FROM (NOW() AT TIME ZONE 'Asia/Kuala_Lumpur'))
    AND t.start_time BETWEEN 
      ((NOW() AT TIME ZONE 'Asia/Kuala_Lumpur')::time + (COALESCE(s.reminder_minutes, 30) - 4) * INTERVAL '1 minute')
      AND 
      ((NOW() AT TIME ZONE 'Asia/Kuala_Lumpur')::time + (COALESCE(s.reminder_minutes, 30) + 4) * INTERVAL '1 minute');
  ```
- Inserts notification log via `supabaseAdmin` with:
  ```sql
  INSERT INTO public.student_timetable_notification_logs (timetable_id, user_id, notified_date)
  VALUES ($1, $2, (NOW() AT TIME ZONE 'Asia/Kuala_Lumpur')::date)
  ON CONFLICT (timetable_id, notified_date) DO NOTHING;
  ```
- Dispatches Web Push (via existing `push_subscriptions`) and In-App notification only when insertion succeeds.

- [ ] **Step 4: Commit notification automation**

```bash
git add server.js supabase/migrations/20261011000001_timetable_reminder_cron.sql src/__tests__/timetableNotificationDedup.test.ts
git commit -m "feat(notifications): add automated timezone-aware class reminder with unique dedup"
```

---

### Task 7: Full Verification, Documentation & Production Readiness

**Files:**
- Modify: `DEV_GUIDELINE.md`
- Run: Full lint and test suite

- [ ] **Step 1: Update `DEV_GUIDELINE.md` per `AGENTS.md` obligation**

Update `DEV_GUIDELINE.md`:
- Add `student_timetables`, `student_timetable_metadata`, `student_timetable_settings`, `imaps_room_mappings`, and `student_timetable_notification_logs` to database table listings.
- Add `/akademik/takwim` Tab "Jadual Kuliah Saya" and Portal Bento Card to the module registry.
- Document the PolyMaps UUID deep-link pattern (`/polymaps?room=<UUID>`).

- [ ] **Step 2: Run full lint and type check**

Run: `bun run lint:types && bun run lint:js`  
Expected: 0 errors.

- [ ] **Step 3: Run all unit tests**

Run: `npx vitest run`  
Expected: All tests PASS.

- [ ] **Step 4: Commit documentation and final verifications**

```bash
git add DEV_GUIDELINE.md
git commit -m "docs(guideline): update DEV_GUIDELINE with student timetable and polymaps architecture"
```
