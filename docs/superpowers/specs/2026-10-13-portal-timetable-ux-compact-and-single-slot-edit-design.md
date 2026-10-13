# Portal & Timetable UX Refinement: Header Shrinkage, Copy Tuning & Single-Slot Subject Edit

**Date:** 2026-10-13  
**Status:** Approved  
**Author:** Antigravity AI & JPP-POLISAS Core Team  

---

## 1. Problem Statement & Motivation

During student usage of the Portal and Timetable features:
1. **Portal Top Header Overcrowding:** The top header (`SuperAppHeader.tsx`) occupies approximately 40% of the viewport on mobile devices. This pushes the primary actionable cards (including the Timetable Bento Card and quick application launchers) far below the fold, forcing unnecessary scrolling.
2. **Wordy Portal Timetable Notice:** The unuploaded timetable empty-state copy in `NextClassBentoCard.tsx` is lengthy and formal ("Muat naik fail jadual kelas (PDF) anda di modul e-Akademik untuk semakan kelas masa nyata, kiraan detik automatik, dan navigasi pantas PolyMaps."). Students overlook it.
3. **Cluttered Timetable Action Bar:** In `MyTimetableView.tsx`, the action bar wraps awkwardly on mobile devices (e.g., the delete button ends up on an isolated second row). The primary CTA was previously labeled "MUAT NAIK PDF" which should be updated to a prominent, clear uppercase "MUAT NAIK JADUAL".
4. **Difficulty Editing Single Subject Slots:** Previously, editing an individual subject or class slot required opening the bulk preview modal containing all timetable entries across the week. Students find this overwhelming and error-prone when they only want to modify one specific subject's time, room, or lecturer.

---

## 2. Scope & Key Changes

### A. Compact Portal Top Header (`SuperAppHeader.tsx`)
- **Vertical Height Reduction:** Reduce container padding on mobile from `pt-6 pb-7` down to `pt-4 pb-4` (desktop scales to `pt-5 pb-5`).
- **Unified Greeting & Name Row:** Combine the greeting and student nickname into a single concise line (e.g., `"Selamat Pagi, Haziq 👋"`) positioned adjacent to the role badge (`[PENTADBIR UTAMA]`).
- **Conditional Subtitle Display:** Hide the long campus subtitle on small screens (`hidden sm:block`) to conserve vertical space.
- **Slim Search Capsule:** Adjust the command palette trigger search button from `h-12` to `h-10` with proportional typography and padding, preserving keyboard shortcut badges on desktop.
- **Target Viewport Footprint:** Drops from ~40% down to ~20-25% on standard mobile screens.

### B. Catchy & Actionable Copy (`NextClassBentoCard.tsx`)
- Replace the lengthy paragraph in the empty state with:
  > **"Takut terlepas kelas? Muat naik jadual sekarang untuk peringatan automatik & panduan lokasi bilik."**
- Retain the prominent CTA button linking directly to `/akademik/takwim`.

### C. Decluttered 2-Tier Mobile Action Bar (`MyTimetableView.tsx`)
- **Hero CTA Button:** Prominent button labeled **`MUAT NAIK JADUAL`** (in all caps) styled with high-contrast Indigo theme, upload icon, and clear tap target.
- **Smart 2-Tier Mobile Layout:**
  - **Tier 1 (Mobile):** Full-width or prominent `MUAT NAIK JADUAL` hero button.
  - **Tier 2 (Mobile Utility Bar):** 
    - Left side: Segmented control for Grid vs. Agenda toggle (`LayoutGrid` / `List`).
    - Right side: Quick utility cluster containing:
      - `Tambah Slot (+)` button
      - `Peringatan Kelas (Bell)` toggle button with active/inactive indicators
      - `Padam Semua Jadual (Trash)` button with confirm prompt
  - **Desktop View:** Neatly expands into a balanced, single horizontal bar. No isolated wrapped buttons.

### D. Single-Subject Edit Modal (`EditClassSlotModal.tsx`)
- **Class Card Click Interactivity:**
  - In both Weekly Grid (`ClassCard`) and Daily Agenda views, cards are fully clickable with hover elevation (`hover:border-slate-300 dark:hover:border-white/20`, `-translate-y-0.5`).
  - Add an edit pencil icon (`Edit2`) button in the card header next to delete, clearly signaling that clicking/tapping edits the subject.
- **Dedicated Single-Slot Editor:**
  - Modal title: `"Kemaskini Slot Kelas"` with subject badge.
  - Form Fields:
    1. **Course Code** (`course_code`) - e.g., `DET20123`
    2. **Course Name** (`course_name`) - e.g., `ELECTRICAL CIRCUITS 2`
    3. **Day of Week** (`day_of_week`) - 1 (Isnin) to 5 (Jumaat) dropdown
    4. **Start Time & End Time** (`start_time`, `end_time`) - time pickers
    5. **Class Type** (`class_type`) - Kuliah, Amali, Tutorial, Lain-lain
    6. **Room / Location** (`room_raw`) - with auto-match to PolyMaps locations
    7. **Lecturer Code** (`lecturer_code`)
    8. **Online Class Toggle** (`is_online`) - Teams / Online toggle
    9. **Course Color** (`color`) - Aesthetic palette picker
  - Actions:
    - **"Simpan Perubahan"**: Updates the specific row in Supabase `student_timetables` by `id`.
    - **"Padam Slot Ini"**: Archives/deletes the single slot with user confirmation.
    - **"Batal"**: Closes the modal without saving.
  - Conflict Check: Validates that the updated slot does not overlap with any other active slots of the student.

---

## 3. Database & Security (RLS) Compliance
- No schema alterations needed. Uses existing `student_timetables` table columns:
  - `id` (UUID, primary key)
  - `user_id` (UUID, foreign key referencing auth.users)
  - `academic_session`, `semester`, `class_name`
  - `day_of_week`, `start_time`, `end_time`
  - `course_code`, `course_name`, `class_type`
  - `lecturer_code`, `room_raw`, `location_id`
  - `is_online`, `color`, `is_archived`
- RLS query compliance: Updates specify `.eq('id', slotId).eq('user_id', (SELECT auth.uid()))` to ensure strict tenant isolation.

---

## 4. Verification & Testing Plan
1. **Visual & Responsive Testing:**
   - Verify `SuperAppHeader` on mobile viewport (< 640px) consumes ~20-25% height, greeting and name render on one line, search bar is `h-10`.
   - Verify `NextClassBentoCard` renders the approved copy: *"Takut terlepas kelas? Muat naik jadual sekarang untuk peringatan automatik & panduan lokasi bilik."*
   - Verify `MyTimetableView` button reads **"MUAT NAIK JADUAL"** and the 2-tier mobile toolbar renders with zero orphaned buttons.
2. **Functional Testing:**
   - Click any class card in agenda view -> verify `EditClassSlotModal` opens with prefilled data for that slot only.
   - Click any class card in grid view -> verify `EditClassSlotModal` opens with prefilled data for that slot only.
   - Edit subject details (e.g. room name or time) and save -> verify data persists in Supabase and UI updates instantly.
   - Delete single slot from inside the modal -> verify slot is archived and removed from timetable.
   - Test conflict detection when setting overlapping time on the same day.
