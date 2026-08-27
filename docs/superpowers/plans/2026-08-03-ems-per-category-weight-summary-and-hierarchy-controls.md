# EMS Per-Category Weight Calculation & Advanced Hierarchy Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the EMS Event Form Builder (`EmsEventFormPage.tsx`) so that rubric weight totals are calculated and validated **independently per category** (eliminating false "200%" imbalance warnings when multiple 100% categories exist), and provide explicit hierarchical creation buttons (**"+ Tambah Kategori Baharu"**, **"+ Tambah Seksyen / Sub-kategori"**, **"+ Tambah Kriteria"**).

**Architecture:** 
- Modify the `Ringkasan Pemberat Kriteria` component in `EmsEventFormPage.tsx` to iterate over unique categories and calculate `categoryTotalWeight` independently. Display per-category status badges (e.g. 📦 *Best Showcase*: 100% ✅, 🎤 *Best Pitching*: 100% ✅).
- Add explicit action buttons:
  - 📂 **"+ Tambah Kategori Baharu"**: Adds a new category group block with a starter rubric item.
  - 📑 **"+ Tambah Seksyen / Sub-kategori"**: Prompts for section name under active category and appends a pre-filled rubric.
  - 📝 **"+ Tambah Kriteria"**: Appends a rubric criterion to the targeted category/section.

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide Icons, React Hot Toast.

## Global Constraints
- All code must pass `npx tsc --noEmit`.

---

### Task 1: Per-Category Weight Summary & Independent Validation (`src/pages/ems/EmsEventFormPage.tsx`)

**Files:**
- Modify: `src/pages/ems/EmsEventFormPage.tsx`

**Interfaces:**
- Consumes: `rubrics` array.
- Produces: Category-grouped weight breakdown badges and per-category balance warnings.

- [ ] **Step 1: Update `Ringkasan Pemberat Kriteria` calculation logic**

Iterate over `categoryGroups` (grouped by `category_name`):
```typescript
const categoryWeightSummaries = categoryGroups.map(group => {
  const catTotalWeight = group.items.reduce((sum, item) => sum + (Number(item.rubric.weight) || 0), 0);
  const isBalanced = Math.abs(catTotalWeight - 100) < 0.01;
  return {
    categoryName: group.categoryName,
    totalWeight: catTotalWeight,
    isBalanced
  };
});
```

- [ ] **Step 2: Render Per-Category Weight Badges in Summary Box**

Render individual badges per category:
- If all categories are 100%: Green overall badge: `Semua Kategori 100% Seimbang ✅`
- Display category list pills (e.g. 📦 **Best Showcase**: `100%` ✅, 🎤 **Best Pitching**: `100%` ✅).
- If a category is not 100% (e.g. 85%), render an amber warning specific to that category name: `Amaran: Pemberat Kategori "Best Showcase" ialah 85%. Disyorkan 100%.`.

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/ems/EmsEventFormPage.tsx
git commit -m "fix(ems): calculate rubric weight summary independently per category"
```

---

### Task 2: Advanced Hierarchy Creation Controls (`+ Tambah Kategori`, `+ Tambah Seksyen`, `+ Tambah Kriteria`) (`src/pages/ems/EmsEventFormPage.tsx`)

**Files:**
- Modify: `src/pages/ems/EmsEventFormPage.tsx`

**Interfaces:**
- Consumes: `rubrics` state.
- Produces: `addCategory`, `addSection`, and `addRubric` helper functions with UI action buttons.

- [ ] **Step 1: Implement `addCategory` and `addSection` handlers**

```typescript
const handleAddCategory = () => {
  const categoryName = window.prompt('Masukkan nama Kategori Penilaian baharu (e.g. Best Innovation / Anugerah Khas):');
  if (!categoryName || !categoryName.trim()) return;
  addRubric(categoryName.trim(), 'Seksyen 1');
  toast.success(`Kategori baharu "${categoryName.trim()}" telah ditambah!`);
};

const handleAddSection = (categoryName: string) => {
  const sectionName = window.prompt(`Masukkan nama Seksyen / Sub-kategori baharu untuk "${categoryName}" (e.g. TIKTOK PROMOTION [25%]):`);
  if (!sectionName || !sectionName.trim()) return;
  addRubric(categoryName, sectionName.trim());
  toast.success(`Seksyen baharu "${sectionName.trim()}" telah ditambah ke dalam ${categoryName}!`);
};
```

- [ ] **Step 2: Add Action Buttons in Section 3 Header & Category Banners**

In Section 3 header:
- Render **"📂 + Tambah Kategori Baharu"** button alongside **"+ Tambah Kriteria"**.

In each Category Banner:
- Render **"📑 + Tambah Seksyen"** button and **"📝 + Tambah Kriteria"** button.

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/ems/EmsEventFormPage.tsx
git commit -m "feat(ems): add advanced hierarchy creation controls for categories and sections"
```

---

## Verification Plan

### Automated Tests
- Run `npx tsc --noEmit` to verify 100% type safety.

### Manual Verification
1. Go to `/ems/event/new`.
2. Load BOTH **Best Showcase** and **Best Pitching** presets.
3. Verify the **Ringkasan Pemberat Kriteria** summary box:
   - Displays 2 separate 100% badges (Best Showcase: 100% ✅, Best Pitching: 100% ✅).
   - No 200% imbalance warning is triggered!
4. Click **"📂 + Tambah Kategori Baharu"**. Enter "Anugerah Khas". Verify new category group block is created.
5. Click **"📑 + Tambah Seksyen"** under "Anugerah Khas". Verify section name is pre-filled.
