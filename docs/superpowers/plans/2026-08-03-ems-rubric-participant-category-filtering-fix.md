# EMS Jury Portal Category & Rubric Isolation Bugfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two critical bugs in the Jury Portal (`/ems/juri`):
1. **Rubric Isolation in Evaluation Wizard**: When a jury evaluates a participant in *Best Showcase*, ONLY rubrics for *Best Showcase* will be displayed in the Step-by-Step Evaluation Wizard (preventing rubrics from *Best Pitching* or other categories from appearing).
2. **Participant Category Fallback & Jury Code Restriction**: Ensure `availableCategories` respects `juryCodeData.assigned_categories`, and fix participant category matching (`category_name`, `custom_responses.category`, `custom_responses.category_name`, `custom_responses.kategori`, or fallback for uncategorized participants) so participant cards never incorrectly report "0 peserta".

**Architecture:** 
- Modify `availableCategories` and `catParticipants` in `EmsJuryPortalPage.tsx` to handle category fallback and respect jury code `assigned_categories`.
- Update `sections` grouping and `liveTotalWeightedScore` in `EmsJuryPortalPage.tsx` to filter `rubrics` strictly by `evalParticipant`'s category (`evalParticipant.category_name || selectedCategory`).

**Tech Stack:** React, TypeScript, Supabase Client, Tailwind CSS.

## Global Constraints
- All code must pass `npx tsc --noEmit`.

---

### Task 1: Fix Jury Code `assigned_categories` & Participant Category Fallback (`src/pages/ems/EmsJuryPortalPage.tsx`)

**Files:**
- Modify: `src/pages/ems/EmsJuryPortalPage.tsx`

**Interfaces:**
- Consumes: `juryCodeData.assigned_categories`, `assignedParticipants`, `rubrics`.
- Produces: Correctly filtered `availableCategories` and robust `catParticipants` count.

- [ ] **Step 1: Update `availableCategories` to respect `juryCodeData.assigned_categories`**

```typescript
const availableCategories = useMemo(() => {
  const cats = new Set<string>();
  
  if (rubrics) {
    rubrics.forEach((r) => {
      if (r.category_name && r.category_name.trim()) {
        cats.add(r.category_name.trim());
      }
    });
  }
  if (assignedParticipants) {
    assignedParticipants.forEach((p) => {
      const cat = p.category_name?.trim() || 
                  (p.custom_responses?.category as string)?.trim() || 
                  (p.custom_responses?.category_name as string)?.trim() ||
                  (p.custom_responses?.kategori as string)?.trim();
      if (cat) cats.add(cat);
    });
  }

  let result = Array.from(cats);

  // Filter by jury code assigned_categories if restricted
  if (juryCodeData?.assigned_categories && 
      juryCodeData.assigned_categories.length > 0 && 
      !juryCodeData.assigned_categories.includes('ALL')) {
    result = result.filter(cat => 
      juryCodeData.assigned_categories!.some(ac => ac.toLowerCase() === cat.toLowerCase())
    );
  }

  return result;
}, [rubrics, assignedParticipants, juryCodeData]);
```

- [ ] **Step 2: Update `catParticipants` matching with fallback for uncategorized participants**

When matching participants to a category card `cat`:
```typescript
const getParticipantCategory = (p: EmsParticipant): string => {
  return (
    p.category_name?.trim() ||
    (p.custom_responses?.category as string)?.trim() ||
    (p.custom_responses?.category_name as string)?.trim() ||
    (p.custom_responses?.kategori as string)?.trim() ||
    ''
  );
};

const catParticipants = assignedParticipants.filter((p) => {
  const pCat = getParticipantCategory(p);
  if (!pCat) return true; // Uncategorized participants are available across all event categories
  return pCat.toLowerCase() === cat.trim().toLowerCase();
});
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/ems/EmsJuryPortalPage.tsx
git commit -m "fix(ems): filter available categories by jury code assigned categories and fallback participant matching"
```

---

### Task 2: Filter Rubrics in Evaluation Wizard by Participant Category (`src/pages/ems/EmsJuryPortalPage.tsx`)

**Files:**
- Modify: `src/pages/ems/EmsJuryPortalPage.tsx`

**Interfaces:**
- Consumes: `evalParticipant`, `selectedCategory`, `rubrics`.
- Produces: `participantRubrics` filtered strictly by active participant category.

- [ ] **Step 1: Create `participantRubrics` memo filtered by active participant's category**

```typescript
const activeParticipantCategory = useMemo(() => {
  if (!evalParticipant) return selectedCategory || '';
  return (
    evalParticipant.category_name?.trim() ||
    (evalParticipant.custom_responses?.category as string)?.trim() ||
    (evalParticipant.custom_responses?.category_name as string)?.trim() ||
    (evalParticipant.custom_responses?.kategori as string)?.trim() ||
    selectedCategory ||
    ''
  );
}, [evalParticipant, selectedCategory]);

const participantRubrics = useMemo(() => {
  if (!rubrics || rubrics.length === 0) return [];
  if (!activeParticipantCategory) return rubrics;

  const target = activeParticipantCategory.toLowerCase();
  const matched = rubrics.filter((r) => {
    const rCat = r.category_name?.trim().toLowerCase() || '';
    return !rCat || rCat === 'umum' || rCat === target;
  });

  // Fallback: if no rubrics specifically match target, return all event rubrics
  return matched.length > 0 ? matched : rubrics;
}, [rubrics, activeParticipantCategory]);
```

- [ ] **Step 2: Update `sections`, `liveTotalWeightedScore`, and submission payload to use `participantRubrics`**

Replace `rubrics` with `participantRubrics` in `sections` memo, `liveTotalWeightedScore`, summary step breakdown, and `scoresPayload` submission in `EmsJuryPortalPage.tsx`.

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/ems/EmsJuryPortalPage.tsx
git commit -m "fix(ems): filter evaluation wizard rubrics strictly by participant category"
```

---

## Verification Plan

### Automated Tests
- Run `npx tsc --noEmit` to verify 100% type safety.

### Manual Verification
1. Log in to `/ems/juri` using code `JURI-UIYO`.
2. Verify **Category Gateway Screen**:
   - Only assigned categories (e.g. *Best Showcase* & *Best Pitching*) are displayed.
   - Participant counts for *Best Showcase* and *Best Pitching* accurately reflect registered participants (not 0).
3. Click **Best Showcase** and open evaluation wizard for a participant.
4. Verify that ONLY *Best Showcase* rubrics (4 sections / 16 rubrics) are displayed in the wizard (no *Best Pitching* rubrics!).
5. Click **Best Pitching** and open evaluation wizard for a pitching participant.
6. Verify that ONLY *Best Pitching* rubrics (10 rubrics) are displayed!
