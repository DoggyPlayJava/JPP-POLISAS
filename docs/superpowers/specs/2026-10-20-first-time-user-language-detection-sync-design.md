# Design Specification: First-Time User Language Auto-Detection, Database Sync, & Universal Toggle Placement

**Date:** 2026-10-20  
**Status:** Approved by User  
**Target Domains:** Core Architecture (`src/lib/i18n.ts`, `src/contexts/AuthContext.tsx`), Modals (`CompleteProfileModal.tsx`), Global Shells & Headers (`SuperAppHeader.tsx`, `PortalNavbar.tsx`, etc.), Database (`supabase/migrations/`)

---

## 1. Executive Summary & Goals

### 1.1 Context
JPP-POLISAS features a comprehensive bilingual infrastructure (Bahasa Melayu & English) covering 17 functional domains. However, prior to this specification:
1. First-time users whose mobile devices / operating systems are configured in English may not immediately experience the English UI unless `localStorage` was clean and auto-detection occurred, and no prompt existed during their first-time onboarding.
2. User language preference was stored purely client-side in `localStorage`, meaning preferences did not sync across devices (e.g., student switching from phone to laptop).
3. The `LanguageToggle` button was present in primary club navigation and the login page, but missing from several major touchpoints where `ThemeToggle` already exists—most notably the Student Portal header (`SuperAppHeader`), `PortalNavbar`, and several unit layouts.

### 1.2 User Decision Log (Grill-Me Alignment)
* **Strategy:** Smart Hybrid — Zero-click auto-detection on first visit (English phone immediately gets English UI, Malay phone gets Malay UI) combined with a first-time choice/confirmation toggle inside `CompleteProfileModal`.
* **Persistence:** Dual persistence — Client-side `localStorage` + Supabase database column (`profiles.preferred_language`) with real-time background syncing upon any language switch while authenticated.
* **Fallback Language:** English (`en`) if device language is neither Malay (`ms`) nor English (`en`).
* **CompleteProfileModal Placement:** Top right of modal header with a sleek segmented control (`[ 🇲🇾 BM | 🇬🇧 EN ]`).
* **Global Scope:** Add `LanguageToggle` adjacent to `ThemeToggle` across **all pages and navigation shells** that feature theme switching.

---

## 2. Architecture & Language Resolution Engine

### 2.1 Resolution Hierarchy
When a user accesses any page, the active language is resolved using the following order of precedence:

```
[1] Database Profile: profile.preferred_language (if user is authenticated and has set preference)
       ↓ (if unauthenticated or null)
[2] Local Storage: localStorage.getItem('jpp_language') (if valid 'en' or 'ms')
       ↓ (if null or first-time visit)
[3] Client Device Detection: navigator.language / navigator.languages[0]
       - Starts with 'ms', 'zlm', or contains 'malay' → 'ms'
       - Any other language (including 'en', 'en-US', 'en-GB', etc.) → 'en'
       ↓ (if navigator is undefined/empty)
[4] Default Fallback: 'en'
```

### 2.2 Immediate UI Enforcement
1. In `src/lib/i18n.ts`:
   - Refine `detectLanguage(browserLang?: string)` to guarantee that fresh visitors with English OS/browser language resolve to `'en'`, and visitors with Malay OS/browser language resolve to `'ms'`.
   - Update `changeLanguage(lang: SupportedLanguage)`:
     - Updates `i18n.changeLanguage(lang)`.
     - Sets `document.documentElement.lang = lang`.
     - Writes to `localStorage.setItem('jpp_language', lang)`.
     - If an active Supabase auth session is present, fires a fire-and-forget background update to `profiles.preferred_language`.
2. In `src/contexts/AuthContext.tsx`:
   - When `fetchProfile` retrieves `profileData`:
     - If `profileData.preferred_language` is present (`'en'` or `'ms'`) and differs from the current `i18n.language`, automatically call `changeLanguage(profileData.preferred_language)`.
     - If `profileData.preferred_language` is `NULL` (e.g., brand-new user), automatically sync the currently active detected language into their profile record.

---

## 3. Database Schema & Migration

### 3.1 Migration Specification
A new migration file in `supabase/migrations/` (following `.agents/AGENTS.md` and `DEV_GUIDELINE.md` non-negotiable rules: no editing of past migrations, explicit column check constraint, safe execution):

```sql
-- Migration: 100_add_preferred_language_to_profiles.sql
-- Adds preferred_language column to profiles table for cross-device i18n synchronization

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT NULL 
CHECK (preferred_language IS NULL OR preferred_language IN ('en', 'ms'));

COMMENT ON COLUMN profiles.preferred_language IS 'User preferred interface language (en = English, ms = Bahasa Melayu)';
```

### 3.2 Security & RLS
- The `profiles` table already has user self-update RLS policies (`(SELECT auth.uid()) = id`).
- Updating `preferred_language` conforms to existing RLS policies without creating extra policy overhead.

---

## 4. UI/UX Implementation Details

### 4.1 `CompleteProfileModal.tsx` Header Integration
* **Location:** Top-right corner of the modal header, horizontally aligned with the POLISAS emblem and title, keeping the form body focused and clean.
* **Component:** Compact segmented toggle button:
  - 🇲🇾 `BM` (Bahasa Melayu)
  - 🇬🇧 `EN` (English)
* **Real-time Reactivity:**
  - Clicking a language button instantly switches the modal UI text (field labels, error messages, placeholders, badges) via `changeLanguage`.
  - When the user submits the profile completion form (`handleSubmit`), `preferred_language` is included in the payload sent to `profiles` table.

### 4.2 Universal `LanguageToggle` Beside `ThemeToggle`
Wherever `<ThemeToggle />` is mounted across the application, mount `<LanguageToggle />` immediately adjacent to it:

1. **Student Portal Shells:**
   - `src/components/portal/SuperAppHeader.tsx`: Inside the right-hand action cluster, in a matching circular glass container beside `ThemeToggle`.
   - `src/components/portal/PortalNavbar.tsx`: Adjacent to `<ThemeToggle />` and `<NotificationBell />`.
2. **Administrative & Unit Shells:**
   - `src/pages/jpp/JppLayout.tsx` (already present).
   - `src/pages/jpp/JppSidebar.tsx`: Adjacent to `<ThemeToggle />` in the sidebar bottom bar.
   - `src/pages/kebajikan/KebajikanLayout.tsx` & `src/pages/kebajikan/KebajikanSidebar.tsx`.
   - `src/pages/keusahawanan/KeusahawananLayout.tsx`.
   - `src/pages/akademik/AkademikLayout.tsx`.
   - `src/components/makmp/MakmpJppChrome.tsx`.
   - `src/pages/polyservices/PolySuaraPage.tsx`.
3. **EMS (Event Management System) Public & Admin Shells:**
   - `src/pages/ems/EmsAudienceScanPage.tsx`
   - `src/pages/ems/EmsCertificatePage.tsx`
   - `src/pages/ems/EmsCertVerifyPage.tsx`
   - `src/pages/ems/EmsCheckinPage.tsx`
   - `src/pages/ems/EmsJuryPortalPage.tsx`
   - `src/pages/ems/EmsLeaderboardPage.tsx`
   - `src/pages/ems/EmsPublicRegisterPage.tsx`
4. **Consistency:**
   - Ensure `LanguageToggle` supports flexible styling variants (e.g. `variant="circular"` or container classes) so it blends harmoniously into circular clusters (like `SuperAppHeader`) as well as standard navbar button groups.

---

## 5. Verification & Testing Plan

### 5.1 Unit & Integration Tests
1. **`src/lib/__tests__/i18n.test.ts`:**
   - Test `detectLanguage` with `'en-US'`, `'en-GB'`, `'en-MY'`, `'ms-MY'`, `'ms'`, and unknown locales.
   - Test `changeLanguage` writing to both `localStorage` and syncing to Supabase profile if session exists.
2. **`src/__tests__/CompleteProfileModalLanguage.test.tsx`:**
   - Verify segmented language switch renders in header.
   - Verify clicking 'EN' updates document language and modal labels.
   - Verify form submission payload includes `preferred_language`.
3. **`src/__tests__/UniversalLanguageToggle.test.tsx`:**
   - Inspect all target shell components (`SuperAppHeader`, `PortalNavbar`, `KebajikanLayout`, etc.) to assert that `<LanguageToggle` is rendered adjacent to `<ThemeToggle`.
4. **Regression Run:**
   - Run Vitest suite across all affected i18n tests to ensure no regressions.

---

## 6. Documentation Compliance
- Update `DEV_GUIDELINE.md` Section 15 (Database Schema / Profiles table) and Section 14 (CompleteProfileModal and i18n architecture).
- Ensure zero breaking changes to existing RBAC or Supabase client patterns.
