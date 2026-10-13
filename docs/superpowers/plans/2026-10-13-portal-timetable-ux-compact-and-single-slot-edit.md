# Portal & Timetable UX Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shrink the portal top header by ~45% vertically, update the unuploaded timetable card copy to be concise and catchy, declutter the timetable action bar with a prominent uppercase "MUAT NAIK JADUAL" CTA, and enable instant single-subject editing by clicking any class bento card.

**Architecture:** 
1. `SuperAppHeader.tsx`: Compress padding and streamline greeting, role badge, and user name into a compact unified header row, hide long campus taglines on mobile screens, and scale the search capsule to `h-10`.
2. `NextClassBentoCard.tsx`: Replace lengthy unuploaded timetable copy with the approved high-urgency copy.
3. `EditClassSlotModal.tsx`: New focused modal component allowing students to view, modify, and delete a single timetable slot with live collision detection and instant Supabase persistence.
4. `MyTimetableView.tsx`: Add interactive click-to-edit triggers and edit pencil icons on `ClassCard` in both Grid and Agenda views, and re-architect the top action bar into a balanced 2-tier mobile layout featuring the hero `"MUAT NAIK JADUAL"` button and cohesive utility bar.
5. Update `DEV_GUIDELINE.md` per non-negotiable documentation rules.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, Framer Motion, Supabase Client (`@/lib/supabase`).

## Global Constraints
- Target mobile viewport height for `SuperAppHeader` must drop from ~40% to ~20-25%.
- Hero CTA text in timetable view must be exact uppercase: `"MUAT NAIK JADUAL"`.
- Empty state timetable copy in portal must be exact string: `"Takut terlepas kelas? Muat naik jadual sekarang untuk peringatan automatik & panduan lokasi bilik."`.
- Single-slot edits must target `.eq('id', slotId).eq('user_id', (SELECT auth.uid()))` to preserve strict RLS tenant isolation.
- No `select('*')` or unnecessary roundtrips; reuse local state where possible and trigger fresh fetch after saving.
- All button clicks inside `ClassCard` (like delete and edit icons) must call `e.stopPropagation()`.

---

### Task 1: Compact Portal Top Header (`SuperAppHeader.tsx`)

**Files:**
- Modify: `src/components/portal/SuperAppHeader.tsx`
- Test: `src/__tests__/SuperAppHeader.test.tsx`

**Interfaces:**
- Consumes: `SuperAppHeaderProps` (`profile`, `displayName`, `karnivalActive`, `supsasActive`, `onOpenSidebar`, `unreadCount`)
- Produces: Compact header component consuming ~20-25% mobile viewport height with inline greeting and `h-10` search bar.

- [ ] **Step 1: Write tests for SuperAppHeader compact layout**

Create or update `src/__tests__/SuperAppHeader.test.tsx`:
```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SuperAppHeader } from '../components/portal/SuperAppHeader';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'test-user', full_name: 'Haziq bin Ahmad', role: 'admin' } }),
}));
vi.mock('@/lib/commandPalette', () => ({
  triggerCommandPalette: vi.fn(),
}));
vi.mock('@/components/ui/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));
vi.mock('@/components/ui/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

describe('SuperAppHeader', () => {
  it('renders combined compact greeting and user display name', () => {
    render(<SuperAppHeader displayName="Haziq" />);
    expect(screen.getByText(/Haziq/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Cari makanan, runner, servis, acara, merit/i })).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it passes or fails**

Run: `npm test -- src/__tests__/SuperAppHeader.test.tsx`

- [ ] **Step 3: Implement compact layout in `src/components/portal/SuperAppHeader.tsx`**

Modify `src/components/portal/SuperAppHeader.tsx`:
1. Change container padding from `pt-6 sm:pt-8 pb-7 sm:pb-8` to `pt-3.5 sm:pt-6 pb-4 sm:pb-6` and gap to `gap-3 sm:gap-5`.
2. Consolidate the greeting and name:
```tsx
        {/* Hero Greeting Section - Compact Mobile-First */}
        <div className="flex flex-col gap-1 sm:gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight flex items-center gap-1.5 flex-wrap">
              <span>{greeting.title},</span>
              <span className="text-[#F8F6EE]">{nameToDisplay}</span>
              <span className="text-base sm:text-lg">👋</span>
            </h1>
            {roleTitle && (
              <span className="inline-flex items-center text-[9px] font-black uppercase bg-[#6B7F5B]/30 text-[#D9C9B2] border border-[#6B7F5B]/40 px-2 py-0.5 rounded-full shadow-xs">
                {roleTitle}
              </span>
            )}
            {karnivalActive ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-pink-500/25 text-pink-200 border border-pink-400/30">
                <Sparkles className="w-2.5 h-2.5 text-pink-300" />
                <span>Karnival</span>
              </span>
            ) : supsasActive ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-200 border border-amber-400/30">
                <Trophy className="w-2.5 h-2.5 text-amber-300" />
                <span>SUPSAS</span>
              </span>
            ) : null}
          </div>

          <p className="hidden sm:block text-xs sm:text-sm text-white/80 font-medium max-w-2xl leading-relaxed">
            {karnivalActive
              ? 'Selamat datang ke hab aktiviti, jualan & keraian Karnival Siswa POLISAS!'
              : supsasActive
              ? 'Ikuti perlawanan, jadual sukan & sokong atlet jabatan anda dalam SUPSAS!'
              : 'Pusat sehenti digital untuk semua aktiviti, servis, acara dan kebajikan kampus.'}
          </p>
        </div>
```
3. Update Search Capsule to `h-10 sm:h-11`:
```tsx
        {/* Pure White Stadium Capsule Search Button - Slim & Tactile */}
        <div>
          <button
            type="button"
            onClick={() => triggerCommandPalette(true)}
            className="w-full h-10 sm:h-11 px-3.5 sm:px-4 rounded-full bg-white hover:bg-[#F8F6EE] text-[#2E3A2F] shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.16)] border border-[#D9C9B2]/60 flex items-center justify-between gap-2.5 text-left transition-all active:scale-[0.99] group cursor-pointer"
            aria-label="Cari makanan, runner, servis, acara, merit..."
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-full bg-[#6B7F5B]/15 text-[#2E3A2F] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Search className="w-3 h-3" />
              </div>
              <span className="text-xs sm:text-sm text-[#556453] group-hover:text-[#2E3A2F] font-medium truncate">
                Cari makanan, runner, servis, acara, merit...
              </span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono text-[#556453] bg-[#F8F6EE] rounded-full border border-[#D9C9B2]/80">
              <span>Ctrl</span>+<span>K</span>
            </kbd>
          </button>
        </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/SuperAppHeader.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/components/portal/SuperAppHeader.tsx src/__tests__/SuperAppHeader.test.tsx
git commit -m "feat(portal): shrink superapp header for mobile with compact greeting and slim search"
```

---

### Task 2: Actionable Empty-State Copy in `NextClassBentoCard.tsx`

**Files:**
- Modify: `src/components/portal/NextClassBentoCard.tsx`
- Test: `src/__tests__/NextClassBentoCard.test.tsx`

**Interfaces:**
- Produces: Timetable empty state card with punchy copy: `"Takut terlepas kelas? Muat naik jadual sekarang untuk peringatan automatik & panduan lokasi bilik."`

- [ ] **Step 1: Write test for NextClassBentoCard empty state copy**

Create or update `src/__tests__/NextClassBentoCard.test.tsx`:
```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { NextClassBentoCard } from '../components/portal/NextClassBentoCard';

describe('NextClassBentoCard', () => {
  it('renders updated punchy Malay copy when no timetable entries are present', () => {
    render(
      <MemoryRouter>
        <NextClassBentoCard entries={[]} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Jadual Kuliah Belum Dimuat Naik/i)).toBeDefined();
    expect(
      screen.getByText(/Takut terlepas kelas\? Muat naik jadual sekarang untuk peringatan automatik & panduan lokasi bilik\./i)
    ).toBeDefined();
    expect(screen.getByRole('link', { name: /Muat Naik Jadual/i })).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/NextClassBentoCard.test.tsx`
Expected: FAIL due to old copy

- [ ] **Step 3: Update copy in `src/components/portal/NextClassBentoCard.tsx`**

Replace lines 433-435 in `src/components/portal/NextClassBentoCard.tsx`:
```tsx
              <p className="text-xs sm:text-sm text-[#556453] dark:text-[#A3B39F] max-w-xl leading-relaxed">
                Takut terlepas kelas? Muat naik jadual sekarang untuk peringatan automatik & panduan lokasi bilik.
              </p>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/NextClassBentoCard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/components/portal/NextClassBentoCard.tsx src/__tests__/NextClassBentoCard.test.tsx
git commit -m "feat(portal): update empty-state timetable copy to engaging student-friendly phrase"
```

---

### Task 3: Dedicated Single-Slot Edit Modal Component (`EditClassSlotModal.tsx`)

**Files:**
- Create: `src/components/takwim/EditClassSlotModal.tsx`
- Test: `src/__tests__/EditClassSlotModal.test.tsx`

**Interfaces:**
- Consumes:
  ```ts
  interface EditClassSlotModalProps {
    isOpen: boolean;
    onClose: () => void;
    slot: StudentTimetableEntry | null;
    allSlots: StudentTimetableEntry[];
    onSaveSuccess: () => void;
    onDeleteSuccess: () => void;
  }
  ```
- Produces: Modal allowing single-subject editing (Course, Name, Day, Start/End Time, Class Type, Room, Lecturer, Online, Color) with conflict detection, saving, and deletion.

- [ ] **Step 1: Write tests for single slot edit validation and conflict check**

Create `src/__tests__/EditClassSlotModal.test.tsx`:
```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EditClassSlotModal } from '../components/takwim/EditClassSlotModal';
import type { StudentTimetableEntry } from '@/types';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'test-user-id' } }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
      select: vi.fn().mockReturnThis(),
    })),
  },
}));

const mockSlot: StudentTimetableEntry = {
  id: 'slot-1',
  user_id: 'test-user-id',
  academic_session: '2025/2026',
  semester: '2',
  class_name: 'DTK2A',
  day_of_week: 1,
  start_time: '08:00:00',
  end_time: '10:00:00',
  course_code: 'DET20123',
  course_name: 'ELECTRICAL CIRCUITS 2',
  class_type: 'AMALI',
  lecturer_code: 'NSA',
  room_raw: 'K7',
  location_id: null,
  is_online: false,
  color: '#3b82f6',
  is_archived: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('EditClassSlotModal', () => {
  it('renders modal with prefilled single slot details', () => {
    render(
      <EditClassSlotModal
        isOpen={true}
        onClose={vi.fn()}
        slot={mockSlot}
        allSlots={[mockSlot]}
        onSaveSuccess={vi.fn()}
        onDeleteSuccess={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('DET20123')).toBeDefined();
    expect(screen.getByDisplayValue('ELECTRICAL CIRCUITS 2')).toBeDefined();
    expect(screen.getByDisplayValue('08:00')).toBeDefined();
    expect(screen.getByDisplayValue('10:00')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails (component not created yet)**

Run: `npm test -- src/__tests__/EditClassSlotModal.test.tsx`
Expected: FAIL (Cannot find module)

- [ ] **Step 3: Implement `src/components/takwim/EditClassSlotModal.tsx`**

Create `src/components/takwim/EditClassSlotModal.tsx`:
- Import `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` from `@/components/ui/dialog`.
- Prefill initial values from `slot` when `isOpen` becomes true or `slot` changes.
- Provide responsive inputs for:
  - `course_code` (Uppercase, required)
  - `course_name` (Text, required)
  - `day_of_week` (Select 1..5: Isnin..Jumaat)
  - `start_time` & `end_time` (HTML `<input type="time" />`)
  - `class_type` (Select Kuliah, Amali, Tutorial, Lain-lain)
  - `room_raw` (Input text + quick match suggestion for PolyMaps room)
  - `lecturer_code` (Input text)
  - `is_online` (Toggle boolean)
  - `color` (Palette swatches)
- Handle Save:
  - Check for conflicts with `allSlots.filter(s => s.id !== slot.id)`.
  - Update `student_timetables` where `id === slot.id` and `user_id === auth.uid()`.
  - Show toast notification and call `onSaveSuccess()`.
- Handle Delete:
  - Confirm dialog -> update `student_timetables` with `is_archived = true` -> call `onDeleteSuccess()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/EditClassSlotModal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/components/takwim/EditClassSlotModal.tsx src/__tests__/EditClassSlotModal.test.tsx
git commit -m "feat(takwim): create EditClassSlotModal for single-subject editing"
```

---

### Task 4: Integrate Single-Slot Edit & Declutter Action Bar in `MyTimetableView.tsx`

**Files:**
- Modify: `src/components/takwim/MyTimetableView.tsx`
- Test: `src/__tests__/MyTimetableView.test.ts`

**Interfaces:**
- Consumes: `EditClassSlotModal`, `StudentTimetableEntry`
- Produces:
  - 2-tier responsive action bar on mobile with primary CTA `"MUAT NAIK JADUAL"` in full caps.
  - Interactive `ClassCard` with click-to-edit and hover edit pencil icon.
  - Seamless state flow opening `EditClassSlotModal` with the selected slot.

- [ ] **Step 1: Write test for "MUAT NAIK JADUAL" and edit slot triggers**

Update `src/__tests__/MyTimetableView.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('MyTimetableView Structure & Copy', () => {
  it('contains uppercase MUAT NAIK JADUAL button and EditClassSlotModal integration', () => {
    const filePath = path.resolve(__dirname, '../components/takwim/MyTimetableView.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('MUAT NAIK JADUAL');
    expect(content).toContain('EditClassSlotModal');
    expect(content).toContain('editingSlot');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/MyTimetableView.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `MyTimetableView.tsx`**

1. Import `EditClassSlotModal` from `./EditClassSlotModal`.
2. Add `const [editingSlot, setEditingSlot] = useState<StudentTimetableEntry | null>(null);`.
3. Update `ClassCard` props and elements:
   - Add `onEdit: () => void`.
   - Add `onClick={onEdit}` to the card wrapper container with `cursor-pointer hover:shadow-md hover:scale-[1.005] active:scale-[0.99] transition-all`.
   - Add edit pencil button in the top-right card corner:
     ```tsx
     <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
       <button
         type="button"
         onClick={(e) => {
           e.stopPropagation();
           onEdit();
         }}
         className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
         title="Kemaskini Slot"
       >
         <Edit2 className="w-3.5 h-3.5" />
       </button>
       <button
         type="button"
         onClick={(e) => {
           e.stopPropagation();
           onDelete();
         }}
         className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
         title="Padam Slot"
       >
         <Trash2 className="w-3.5 h-3.5" />
       </button>
     </div>
     ```
4. Rebuild the Action Bar in `MyTimetableView.tsx`:
   - Mobile: 2-tier layout.
     - Tier 1: Prominent `"MUAT NAIK JADUAL"` button (`w-full md:w-auto h-10 px-4 text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs`).
     - Tier 2: Unified utility bar flex row:
       - View toggle `[Grid | Agenda]`
       - Tambah slot `+` button
       - Peringatan toggle bell button
       - Padam semua jadual trash button
   - Desktop: Aligns side-by-side cleanly without breaking rows.
5. Render `<EditClassSlotModal>`:
   ```tsx
   {editingSlot && (
     <EditClassSlotModal
       isOpen={!!editingSlot}
       onClose={() => setEditingSlot(null)}
       slot={editingSlot}
       allSlots={entries}
       onSaveSuccess={() => {
         fetchTimetableData();
         setEditingSlot(null);
       }}
       onDeleteSuccess={() => {
         fetchTimetableData();
         setEditingSlot(null);
       }}
     />
   )}
   ```

- [ ] **Step 4: Run tests to verify all tests pass**

Run: `npm test -- src/__tests__/MyTimetableView.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/components/takwim/MyTimetableView.tsx src/__tests__/MyTimetableView.test.ts
git commit -m "feat(takwim): declutter action bar with MUAT NAIK JADUAL hero button and click-to-edit cards"
```

---

### Task 5: Documentation Update in `DEV_GUIDELINE.md`

**Files:**
- Modify: `DEV_GUIDELINE.md`

**Interfaces:**
- Add `EditClassSlotModal.tsx` and updated Timetable/Portal UX specifications to Section 7 (Modul e-Akademik) and Section 11 (Critical & High-Traffic Files).

- [ ] **Step 1: Update `DEV_GUIDELINE.md`**

Add documentation note covering:
- `EditClassSlotModal.tsx` single-slot editor
- Compact `SuperAppHeader` mobile specifications
- Uppercase `"MUAT NAIK JADUAL"` action bar architecture

- [ ] **Step 2: Verify git status and commit**

```bash
git add DEV_GUIDELINE.md
git commit -m "docs: update DEV_GUIDELINE.md with single-slot timetable edit and compact header docs"
```

---

### Task 6: Full Verification & Build Check

**Files:**
- None (verification phase across modified files)

- [ ] **Step 1: Run linter and TypeScript compiler check**

Run: `npm run build` or `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: Run all relevant test suites**

Run: `npm test -- src/__tests__/SuperAppHeader.test.tsx src/__tests__/NextClassBentoCard.test.tsx src/__tests__/EditClassSlotModal.test.tsx src/__tests__/MyTimetableView.test.ts`
Expected: All suites PASS
