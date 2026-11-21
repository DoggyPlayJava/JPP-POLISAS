# PolyMaps 360 Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin 360 directory covering active, pending, rejected, disabled, and unreferenced uploads, with safe pin editing and panorama selection.
**Architecture:** Add dedicated directory tab in existing JPP PolyMaps admin. Aggregate DB rows and Storage listing; detail actions operate through current Supabase access and preserve pending review state. Harden approval writes so errors stop approval.
**Tech Stack:** React, TypeScript, Supabase JS/Postgres, Vite; existing app UI patterns.
**Spec:** `docs/superpowers/specs/2026-11-21-polymaps-360-directory-design.md`

## Global Constraints
- Admin role gate remains JPP/SUPER_ADMIN_JPP.
- Pending edits never publish to map until explicit approval.
- Do not auto-delete unreferenced uploads.
- GitHub fallback stays disabled; original values remain reversible.
- Keep each panorama's room pins and yaw/pitch intact.

## Review Focus
- Panorama URL hash fragments resolve to one storage object; test parser.
- Shared panorama with multiple room pins is not counted as unused; test multi-reference.
- Failed room insert/update during approval leaves submission pending; test error path.
- Editing pending pins does not mutate active map records; test request payload/state.
- Storage list pagination/errors must not silently label incomplete results as all uploads; test visible error state.

---

### Task 1: Directory data model and reference resolver

**Files:**
- Create: `src/lib/polymaps360Directory.ts`
- Test: `src/lib/__tests__/polymaps360Directory.test.ts`

**Interfaces:**
- Produces `normalizeStorageObjectPath(url: string): string | null` and `buildPolyMaps360Directory(buildings, locations, submissions, hotspots, storageObjects, disabledBackup): DirectoryEntry[]`.
- Entry status union: `active | pending | rejected | disabled | unused`.

- [ ] Add tests for URL hash normalization, multi-reference panorama, and unused object classification.
- [ ] Run focused test; confirm failures.
- [ ] Implement minimal resolver and deterministic status precedence.
- [ ] Run focused test; confirm pass.

### Task 2: Dedicated admin directory and filters

**Files:**
- Modify: `src/pages/jpp/JppPolyMapsAdmin.tsx`
- Modify: `src/lib/polymaps360Directory.ts`

**Interfaces:**
- Consume directory builder from Task 1.
- Add `360 Directory` tab; filters use directory status, query, building, and provenance.

- [ ] Add tests for status filter counts and query matching.
- [ ] Implement fetch of buildings, locations, submissions, hotspots, storage objects, disabled backup metadata; show partial-fetch errors.
- [ ] Add responsive list/cards and detail popup with image, building, provenance, status, and pins.
- [ ] Verify filters, empty state, and error state.

### Task 3: Pending pin editor and explicit building panorama selection

**Files:**
- Modify: `src/pages/jpp/JppPolyMapsAdmin.tsx`
- Add focused component only if existing page patterns need it.

**Interfaces:**
- Pending edit writes `hotspots_json` and `hotspots_payload` on same submission; status remains `pending`.
- Building selection requires explicit confirm and updates selected building panorama only.

- [ ] Test pin add/edit/remove payload normalization and pending preservation.
- [ ] Implement editor preserving yaw/pitch and room codes; edits must not write map tables.
- [ ] Implement explicit confirmation to use panorama for building; check returned DB error.
- [ ] Verify editing changes submission only; active map unchanged until approval.

### Task 4: Approval validation

**Files:**
- Modify: `src/pages/jpp/JppPolyMapsAdmin.tsx`
- Test: focused approval helper test or assert-based self-check.

- [ ] Test failed building/location/hotspot write prevents `status='approved'`.
- [ ] Check every Supabase result in approval; update status only after all publication writes succeed.
- [ ] Preserve pending state and show actionable error on failure.
- [ ] Verify successful path publishes panorama, room pins, hotspots, then marks approved.

### Task 5: Integration verification and deploy

- [ ] Run focused tests and `npm run build`.
- [ ] Inspect diff; confirm no storage objects or production records mutated by tests.
- [ ] Deploy and restart PM2 only after build passes.
- [ ] Verify live directory filters, pending-edit semantics, explicit panorama selection, and approval failure handling.
