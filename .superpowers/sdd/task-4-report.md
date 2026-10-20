# Task 4 Report: Deep-Localize Domain 5 (Campus Services & Digital Commerce: PolyMart, PolyRent, PolyMaps)

**Date:** 2026-10-20  
**Scope:** Domain 5 — Campus Services & Digital Commerce (`commerce.json`, `housing.json`, `services.json`)  
**Status:** Completed & Verified (76/76 Tests Passing across Domain 5, Locale Master, and Vendor SuperApp Suites)  

---

## 1. Summary of Changes

### A. Localized Components & Domain 5 Modules (11 Files 100% Localized)

#### PolyMart Pages & Vendor Components (8 Files):
1. **`src/pages/polymart/vendor/VendorOrdersPipeline.tsx`**
   - Implemented `useTranslation(['commerce', 'common'])`.
   - Preserved `export const PIPELINE_STAGES` for unit test contract compatibility.
   - Localized order fulfillment pipeline stages (`Semua`, `Menunggu Bayaran`, `Dalam Proses`, `Sedia Diambil`, `Selesai`, `Dibatalkan`), status badges, search placeholders, filter chips, order card headers, action buttons, bulk processing toasts, and cancellation/completion confirmation dialogs.
   - Handled AST fallback strings: `t('commerce:pipeline_all', 'Semua')`, `t('commerce:pipeline_pending_payment', 'Menunggu Bayaran')`, etc.

2. **`src/pages/polymart/vendor/ReceiptReviewSheet.tsx`**
   - Implemented `useTranslation(['commerce', 'common'])`.
   - Localized customer payment slip viewer, zoom controls, verification chips (`Menunggu Pengesahan`, `Resit Sah`, `Resit Ditolak`), rejection notes modal, customer contact actions, and verification confirmation buttons.
   - Implemented fallback string interpolation pattern: `t('commerce:order_prefix', \`Pesanan \${formattedOrderId}\`, { id: formattedOrderId })` for robust rendering across both live i18n and SSR / uninitialized test environments.

3. **`src/pages/polymart/vendor/VendorAnalyticsPromo.tsx`**
   - Implemented `useTranslation(['commerce', 'common'])`.
   - Localized merchant telemetry hero banner, POS analytics shortcut, 7-day sales and order volume trend charts, low-stock inventory alerts, sponsored ads showcase, promo voucher creation modal, and discount type selectors.

4. **`src/pages/polymart/PolyMartMyOrders.tsx`**
   - Implemented `useTranslation(['commerce', 'common'])`.
   - Localized customer order history tabs, delivery timeline tracker, `ReviewModal`, `CancelModal`, `ReceiptUploadButton`, and `OrderCard` with localized action triggers (reorder, cancel, review, track).

5. **`src/pages/polymart/PolyMartAdminPanel.tsx`**
   - Implemented `useTranslation(['commerce', 'common'])`.
   - Resolved variable shadowing by renaming tab iteration parameter from `t` to `tabItem`.
   - Localized marketplace administration telemetry, vendor verification queue, dispute resolution desk, commission rate settings, `ReportCard`, and `AdsManagerTab`.

6. **`src/pages/polymart/PolyMartPaymentPage.tsx`**
   - Implemented `useTranslation(['commerce', 'common'])`.
   - Localized payment countdown timer, Step 1 DuitNow QR display & manual bank transfer instructions, Step 2 receipt image uploader with preview and remove buttons, and order item price breakdown summary.

7. **`src/pages/polymart/PolyMartProductDetail.tsx`**
   - Implemented `useTranslation(['commerce', 'common'])`.
   - Localized product specifications, seller reputation profile, customer `ReviewCard`, and `ProductVariationBottomSheet` (variation selector, stepper counter, estimated pickup time, order notes, payment mode switcher, and instant checkout buttons).

8. **`src/pages/polymart/PolyMartVerifyPickup.tsx`**
   - Implemented `useTranslation(['commerce', 'common'])`.
   - Localized counter pickup verification console, camera QR scanner HUD, student identity verification card, order items checklist, and one-tap order handover confirmation button.

#### PolyRent Pages (2 Files):
9. **`src/pages/polyrent/PolyRentPage.tsx`**
   - Updated translation hook to multi-namespace: `useTranslation(['housing', 'commerce', 'common'])`.
   - Localized student housing search banner ("Find Roommates. Save More."), gender filter buttons (`Semua`, `Lelaki`, `Perempuan`), distance to campus slider, room type amenities pills, roommate matching cards, and value picks section.

10. **`src/pages/polyrent/PolyRentForm.tsx`**
    - Updated translation hook to multi-namespace: `useTranslation(['housing', 'commerce', 'common'])`.
    - Localized multi-step room advertisement wizard:
      - Step 1: Property title, monthly rental, security deposit, vacancy count, and address.
      - Step 2: Room layout, furnishing checklist, aircond/wifi/laundry amenities, and house rules.
      - Step 3: Photo upload gallery and landlord WhatsApp contact details.
      - Step 4: Submission preview and publication confirmation.

#### PolyMaps Page (1 File):
11. **`src/pages/polymaps/PolyMapsPage.tsx`**
    - Implemented `useTranslation(['services', 'common'])`.
    - Localized interactive campus map header, 360 panoramic views, covered walkway navigation toggle ("Laluan Berbumbung"), indoor room finder hint, GPS vehicle drive mode, and user geolocation popup.

---

### B. Translation Dictionaries & Key Parity

| Namespace | EN Keys | MS Keys | Key Parity | Missing / Empty Keys |
|-----------|---------|---------|------------|----------------------|
| `commerce.json` | 456 | 456 | 100% | 0 |
| `housing.json` | 274 | 274 | 100% | 0 |
| `services.json` | 255 | 255 | 100% | 0 |
| **Total Domain 5** | **985** | **985** | **100%** | **0** |

- **Strict Fallback Guarantee:** All `t()` calls across all 11 files supply the original Malay literal as the second argument, ensuring zero broken UI if a key lookup fails or runs without an initialized provider.
- **Engine Registration:** Registered under `en` and `ms` in `src/lib/i18n.ts`.

---

## 2. Verification & Test Suite

### Executed Command:
```bash
npx vitest run src/__tests__/Domain5CommerceCompleteI18n.test.tsx src/locales/__tests__/masterLocales.test.ts src/__tests__/polymartVendorSuperApp.test.ts
```

### Results:
- **`src/__tests__/Domain5CommerceCompleteI18n.test.tsx`:** 20/20 tests passed
  - Dictionary contract parity checks for `commerce`, `housing`, and `services` (100% symmetry, 0 empty strings).
  - English SSR DOM renders for PolyMart, PolyRent, and PolyMaps.
  - Malay SSR DOM renders for PolyMart, PolyRent, and PolyMaps.
  - Dynamic language toggle test (`en` <-> `ms`).
- **`src/locales/__tests__/masterLocales.test.ts`:** 20/20 tests passed.
- **`src/__tests__/polymartVendorSuperApp.test.ts`:** 36/36 tests passed.
- **Total:** **76/76 tests passed (100% success rate, 0 failures, 0 regressions)**.

---

## 3. Compliance Checklist
- [x] **Zero Database Alterations:** No database migrations, tables, columns, or RLS policies were modified or added.
- [x] **Preserved Supabase Singleton:** Maintained single global instance from `@/lib/supabase`; no ad-hoc clients created.
- [x] **Strict 100% Key Parity:** Exactly 985 matching keys across English and Bahasa Melayu dictionaries for `commerce`, `housing`, and `services`.
- [x] **Mandatory Malay Fallbacks:** All calls to `t()` supply original Malay literal strings as the second argument: `t('namespace:key', 'Literal BM Asal')`.
- [x] **Sub-component Hook Scoping:** Sub-components declare `useTranslation` within their own scope; avoided scope leaking and variable shadowing.
- [x] **Documentation Updated:** `DEV_GUIDELINE.md` updated in Section 36 with Subsection 36.13 documenting Domain 5 deep localization.
