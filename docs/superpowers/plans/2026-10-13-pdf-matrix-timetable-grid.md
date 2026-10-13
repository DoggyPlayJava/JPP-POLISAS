# PDF-Style Weekly Timetable Matrix Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the student timetable grid in `MyTimetableView.tsx` into a high-visibility, modern institutional 5-day × 9-hour weekly matrix grid modeled after the official POLISAS PDF timetable (`POLISAS-PK-02(1c)`), featuring a mobile-responsive sticky day column, 13:00–14:00 break demarcation, interactive click-to-edit slots, and persistent default view mode.

**Architecture:** 
- A dedicated coordinate utility (`src/lib/timetableMatrix.ts`) maps timetable entries to CSS Grid column indices (08:00–17:00, 9 hourly slots).
- A specialized matrix component (`src/components/takwim/TimetableMatrixGrid.tsx`) renders the 5-day weekly canvas with sticky day badges on the left, sticky time headers on top, dedicated break column styling, and positioned class cards.
- `MyTimetableView.tsx` integrates the new matrix grid as the default view with `localStorage` preference persistence.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Vitest, React Testing Library.

## Global Constraints

- **Zero DB Schema/RLS Changes:** All database tables and RLS policies remain untouched.
- **Strict Mobile Usability:** The matrix MUST support smooth horizontal scrolling (`overflow-x-auto`) on mobile with the Day column (`ISNIN`, `SELASA`, etc.) remaining sticky on the left (`sticky left-0 z-20`).
- **Institutional Aesthetic:** No cartoonish or garish gradients. Follow Section 4 of `design-taste-frontend` with soft tinted borders, clean typography, and muted break-period indicators.
- **Persistence:** View mode (`'grid' | 'agenda'`) MUST persist in `localStorage` under key `'jpp_student_timetable_view'`, defaulting to `'grid'`.
- **Documentation:** `DEV_GUIDELINE.md` must be updated per project guidelines upon task completion.

---

### Task 1: Timetable Matrix Engine & Column Indexing

**Files:**
- Create: `src/lib/timetableMatrix.ts`
- Test: `src/__tests__/timetableMatrix.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export const MATRIX_START_HOUR = 8;
  export const MATRIX_END_HOUR = 17;
  export const REHAT_START_HOUR = 13;
  export const REHAT_END_HOUR = 14;

  export interface MatrixTimeSlot {
    startHour: number;
    endHour: number;
    label: string;
    isBreak: boolean;
  }

  export const MATRIX_TIME_SLOTS: MatrixTimeSlot[];

  export interface GridSpan {
    colStart: number; // 1-indexed for CSS grid
    colSpan: number;
  }

  export function getSlotGridSpan(startTime: string, endTime: string): GridSpan;
  export function isSlotInTimeRange(entryStart: string, entryEnd: string, rangeStart: number, rangeEnd: number): boolean;
  ```

- [ ] **Step 1: Write the failing test in `src/__tests__/timetableMatrix.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import {
  MATRIX_TIME_SLOTS,
  MATRIX_START_HOUR,
  MATRIX_END_HOUR,
  REHAT_START_HOUR,
  getSlotGridSpan,
} from '@/lib/timetableMatrix';

describe('Timetable Matrix Engine', () => {
  it('should have 9 standard 1-hour slots from 08:00 to 17:00', () => {
    expect(MATRIX_TIME_SLOTS.length).toBe(9);
    expect(MATRIX_TIME_SLOTS[0].label).toBe('08:00 - 09:00');
    expect(MATRIX_TIME_SLOTS[8].label).toBe('16:00 - 17:00');
    expect(MATRIX_TIME_SLOTS[5].isBreak).toBe(true); // 13:00 - 14:00 Rehat
  });

  it('should calculate accurate grid span for 1-hour morning class (08:00 - 09:00)', () => {
    const span = getSlotGridSpan('08:00:00', '09:00:00');
    expect(span.colStart).toBe(1);
    expect(span.colSpan).toBe(1);
  });

  it('should calculate accurate grid span for 2-hour lab class (09:00 - 11:00)', () => {
    const span = getSlotGridSpan('09:00:00', '11:00:00');
    expect(span.colStart).toBe(2);
    expect(span.colSpan).toBe(2);
  });

  it('should calculate accurate grid span for 3-hour afternoon workshop (14:00 - 17:00)', () => {
    const span = getSlotGridSpan('14:00:00', '17:00:00');
    expect(span.colStart).toBe(7);
    expect(span.colSpan).toBe(3);
  });

  it('should clamp bounds if class times are formatted as HH:mm without seconds', () => {
    const span = getSlotGridSpan('10:00', '12:00');
    expect(span.colStart).toBe(3);
    expect(span.colSpan).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify failure**
  Run: `npm test -- src/__tests__/timetableMatrix.test.ts`
  Verify that the test fails because `timetableMatrix.ts` does not exist yet.

- [ ] **Step 3: Implement `src/lib/timetableMatrix.ts`**
  Implement `MATRIX_START_HOUR`, `MATRIX_END_HOUR`, `REHAT_START_HOUR`, `MATRIX_TIME_SLOTS`, `getSlotGridSpan`, and helper functions.

- [ ] **Step 4: Run test to verify pass**
  Run: `npm test -- src/__tests__/timetableMatrix.test.ts`
  Verify that all test assertions pass cleanly.

- [ ] **Step 5: Commit changes**
  Run: `git add -f src/lib/timetableMatrix.ts src/__tests__/timetableMatrix.test.ts; git commit -m "feat(takwim): implement timetable matrix coordinate engine"`

---

### Task 2: Weekly Timetable Matrix Grid Component

**Files:**
- Create: `src/components/takwim/TimetableMatrixGrid.tsx`
- Test: `src/__tests__/TimetableMatrixGrid.test.tsx`

**Interfaces:**
- Consumes:
  - `StudentTimetableEntry` from `@/types`
  - `MATRIX_TIME_SLOTS`, `getSlotGridSpan` from `@/lib/timetableMatrix`
  - `CLASS_TYPE_BADGES` from `@/components/takwim/MyTimetableView` (or shared constants)
- Produces:
  ```typescript
  export interface TimetableMatrixGridProps {
    entries: StudentTimetableEntry[];
    onSlotClick?: (slot: StudentTimetableEntry) => void;
    onSlotDelete?: (slotId: string) => void;
  }

  export function TimetableMatrixGrid({
    entries,
    onSlotClick,
    onSlotDelete,
  }: TimetableMatrixGridProps): React.JSX.Element;
  ```

- [ ] **Step 1: Write the failing test in `src/__tests__/TimetableMatrixGrid.test.tsx`**

```tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimetableMatrixGrid } from '@/components/takwim/TimetableMatrixGrid';
import type { StudentTimetableEntry } from '@/types';

const mockEntries: StudentTimetableEntry[] = [
  {
    id: 'slot-1',
    user_id: 'user-123',
    academic_session: 'S1 2026/2027',
    semester: '3',
    class_name: 'DTK3A',
    day_of_week: 1, // Isnin
    start_time: '09:00:00',
    end_time: '11:00:00',
    course_code: 'DEE30163',
    course_name: 'ELECTRONIC CIRCUITS',
    class_type: 'KULIAH',
    lecturer_code: 'FZA',
    room_raw: 'EA301',
    location_id: null,
    is_online: false,
    color: '#3b82f6',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('TimetableMatrixGrid Component', () => {
  it('renders all 5 days of the week in the sticky day column', () => {
    render(<TimetableMatrixGrid entries={mockEntries} />);
    expect(screen.getByText('ISNIN')).toBeDefined();
    expect(screen.getByText('SELASA')).toBeDefined();
    expect(screen.getByText('RABU')).toBeDefined();
    expect(screen.getByText('KHAMIS')).toBeDefined();
    expect(screen.getByText('JUMAAT')).toBeDefined();
  });

  it('renders official time columns including 13:00 - 14:00 REHAT column', () => {
    render(<TimetableMatrixGrid entries={mockEntries} />);
    expect(screen.getByText('08:00 - 09:00')).toBeDefined();
    expect(screen.getByText('13:00 - 14:00')).toBeDefined();
  });

  it('renders class card with course code, room, and lecturer', () => {
    render(<TimetableMatrixGrid entries={mockEntries} />);
    expect(screen.getByText('DEE30163 (L)')).toBeDefined();
    expect(screen.getByText('EA301')).toBeDefined();
    expect(screen.getByText('FZA')).toBeDefined();
  });

  it('triggers onSlotClick when a class cell is clicked', () => {
    const handleSlotClick = vi.fn();
    render(<TimetableMatrixGrid entries={mockEntries} onSlotClick={handleSlotClick} />);
    const card = screen.getByText('DEE30163 (L)');
    fireEvent.click(card);
    expect(handleSlotClick).toHaveBeenCalledTimes(1);
    expect(handleSlotClick).toHaveBeenCalledWith(mockEntries[0]);
  });
});
```

- [ ] **Step 2: Run test to verify failure**
  Run: `npm test -- src/__tests__/TimetableMatrixGrid.test.tsx`
  Verify that the test fails because `TimetableMatrixGrid` does not exist yet.

- [ ] **Step 3: Implement `src/components/takwim/TimetableMatrixGrid.tsx`**
  - Implement full 5-day × 9-column matrix layout using Tailwind grid with sticky day column on the left and sticky time headers on top.
  - Implement 13:00–14:00 break column with subtle diagonal striping/tint.
  - Render class slot cards with `gridColumn: '${colStart} / span ${colSpan}'`.
  - Add smooth horizontal scrollbar container and mobile touch hint.
  - Wire up `onSlotClick` and delete action on hover.

- [ ] **Step 4: Run test to verify pass**
  Run: `npm test -- src/__tests__/TimetableMatrixGrid.test.tsx`
  Verify that all tests pass.

- [ ] **Step 5: Commit changes**
  Run: `git add -f src/components/takwim/TimetableMatrixGrid.tsx src/__tests__/TimetableMatrixGrid.test.tsx; git commit -m "feat(takwim): create TimetableMatrixGrid weekly matrix component"`

---

### Task 3: Integration & View Mode Persistence in `MyTimetableView.tsx`

**Files:**
- Modify: `src/components/takwim/MyTimetableView.tsx`
- Modify: `src/__tests__/MyTimetableView.test.ts`

**Interfaces:**
- Consumes: `TimetableMatrixGrid` from `@/components/takwim/TimetableMatrixGrid`
- Persists: `localStorage.getItem('jpp_student_timetable_view')` / `localStorage.setItem(...)`

- [ ] **Step 1: Update test in `src/__tests__/MyTimetableView.test.ts`**
  Update assertions to test for `TimetableMatrixGrid` integration, `localStorage` persistence, and `'grid'` default.

- [ ] **Step 2: Run test to verify failure**
  Run: `npm test -- src/__tests__/MyTimetableView.test.ts`
  Verify test reflects updated requirements.

- [ ] **Step 3: Update `src/components/takwim/MyTimetableView.tsx`**
  - Initialize `viewMode`:
    ```typescript
    const [viewMode, setViewModeState] = useState<'grid' | 'agenda'>(() => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('jpp_student_timetable_view');
        if (saved === 'grid' || saved === 'agenda') return saved;
      }
      return 'grid'; // Default to grid as requested
    });

    const setViewMode = (mode: 'grid' | 'agenda') => {
      setViewModeState(mode);
      if (typeof window !== 'undefined') {
        localStorage.setItem('jpp_student_timetable_view', mode);
      }
    };
    ```
  - In `viewMode === 'grid'`, render `<TimetableMatrixGrid entries={entries} onSlotClick={(slot) => setEditingSlot(slot)} onSlotDelete={handleDeleteSlot} />`.
  - Maintain the existing `viewMode === 'agenda'` (Daily Agenda list) for quick single-day scanning.

- [ ] **Step 4: Run test to verify pass**
  Run: `npm test -- src/__tests__/MyTimetableView.test.ts`
  Verify that all assertions pass cleanly.

- [ ] **Step 5: Commit changes**
  Run: `git add src/components/takwim/MyTimetableView.tsx src/__tests__/MyTimetableView.test.ts; git commit -m "feat(takwim): integrate TimetableMatrixGrid with localStorage view persistence"`

---

### Task 4: Documentation Update & Full Verification Suite

**Files:**
- Modify: `DEV_GUIDELINE.md`

- [ ] **Step 1: Update `DEV_GUIDELINE.md`**
  - Add `TimetableMatrixGrid.tsx` and `timetableMatrix.ts` to Section 11 (Critical Files / Modules).
  - Add Section 32.15 documenting the PDF-style Weekly Timetable Matrix Grid architecture, mobile sticky-column scrolling, and `localStorage` persistence pattern.

- [ ] **Step 2: Run full Vitest test suite**
  Run: `npm test`
  Confirm 100% of tests pass.

- [ ] **Step 3: Run production build verification**
  Run: `npm run build`
  Confirm clean compilation with exit code 0.

- [ ] **Step 4: Commit documentation and verification**
  Run: `git add DEV_GUIDELINE.md; git commit -m "docs: update DEV_GUIDELINE.md with TimetableMatrixGrid architecture and verification"`
