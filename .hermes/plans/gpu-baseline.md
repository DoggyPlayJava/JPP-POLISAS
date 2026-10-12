# PELAN REWORK — BASELINE MINIMAL GPU SERAGAM (JPP-POLISAS)

> **Status:** FINAL — gabungan penemuan 2 audit (audit-1 stale, audit-2 sahih @ HEAD `d4d757a`).
> **Matlamat:** Buang `isLowPerf` + semua effect GPU-mahal dari source. Satu kod path, semua device dapat pengalaman sama yang ringan.
> **Bukan:** tampal CSS `.low-perf-device` lagi (terbukti bocor).

---

## PRINSIP HARD (jangan langgar)

1. **Compositor-only animation** = `transform` + `opacity` SAHAJA.
   Jangan animate `width`, `height`, `top`, `left`, `margin`, `box-shadow`, `filter`.
2. **Blur ganti solid surface + border**, bukan buang terus. Kalau buang tanpa ganti → contrast bleed (WCAG fail).
3. **Loading spinner + progress bar MESTI kekal.** (UX perlu, bukan kosmetik).
4. **`prefersReducedMotion` user MESTI dihormati** via `MotionConfig reducedMotion="user"` (sudah ada di `App.tsx:674`).
5. **mix-blend element = BUANG element, bukan neutral-kan** (neutral-kan jadi tompok kelabu).

---

## FASA 0 — Branch + baseline

```bash
pct exec 100 -- bash -c 'cd /var/www/jpp-polisas && git checkout -b perf/baseline-gpu && npx vitest run'
```
Confirm: test pass (sekarang 564 pass). Semua kerja dalam branch ini.

---

## FASA 1 — Design system + padam ambient blur (impact ~80%, risiko rendah)

### 1a. `.glass` / `.glass-premium` — buang `backdrop-filter`

`src/index.css:138-148`. Ganti `backdrop-filter: blur(28px/32px) saturate(...)` dengan solid:

```css
.glass {
  background: hsl(var(--card) / 0.95);
  @apply border border-border shadow-2xl;
}
.glass-premium {
  background: hsl(var(--card) / 0.98);
  @apply border border-border shadow-2xl ring-1 ring-white/10 dark:ring-white/5;
}
```
**Verify:** `grep -n "backdrop-filter" src/index.css` → kosong.

### 1b. Padam semua ambient blur ≥ 35px dari source (bukan CSS kill)

Padam `<div>` dekoratif gergasi. Ganti warna dengan `bg-[color]/10` flat (tanpa blur) kalau perlu. Senarai (grep `blur-2xl|blur-[3-9][0-9]px`):

| Fail | Nota |
|---|---|
| `KelabPage.tsx` 174,205 | blur-2xl |
| `KeusahawananDashboard.tsx` 251 | blur-2xl |
| `PolyMapsPage.tsx` 2108 | blur-2xl |
| `PolyMartHome.tsx` 120 | blur-2xl |

**Verify:** `grep -rn "blur-2xl\|blur-\[3-9][0-9]px\|blur-\[1-6][0-9][0-9]px" src --include="*.tsx"` → kosong (kecuali LaunchVideo/PromoPage — FASA 5).

---

## FASA 2 — Buang animation mahal (reflow + continuous loop)

### 2a. BottomNav — `width: 0→auto` label + breathing glow

`src/components/layout/BottomNav.tsx:366-372` — label slide guna `width` (reflow). Ganti fade+scale sahaja:
```tsx
initial={{ opacity: 0, scale: 0.8 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.8 }}
transition={{ type: "spring", stiffness: 500, damping: 30 }}
```
Buang `width: 0` dan `width: "auto"`.

`BottomNav.tsx:265-277` — **buang breathing glow** (`repeat: Infinity`, 24/7 GPU wake lock). Padam block `{!isActionsOpen && ( <motion.div ... animate={{ scale: [1,1.25,1] ... /> )}`.

### 2b. CurtainReveal — `top` → `y`

`src/components/portal/CurtainReveal.tsx:29` — animate `top` (reflow). Ganti `transform: translateY`:
```tsx
initial={{ y: "-120%" }} animate={{ y: "0%" }}
```

### 2c. ExcoCard — conic spin + mask

`src/components/portal/ExcoCard.tsx:197-205` — `animate-[spin_4s_linear_infinite]` + `conic-gradient` + mask. **Padam block.** Ganti `border-violet-500/40` statik kalau nak.

### 2d. boxShadow tween framer

`PromoPage.tsx` (226, 252) + `LaunchVideo.tsx` (2047) — `boxShadow` dalam `animate`. Buang, ganti opacity/scale.

### 2e. animate-ping container penuh + shimmer

- `PolyMapsModal.tsx:77` — ping whole modal → padam
- `KebajikanLiveTrackerCard.tsx` (7 ping) → padam
- `KarnivalMegaBanner.tsx:121` + `SupsasMegaBanner.tsx:110` shimmer sweep infinite → padam/ganti statik
- `skeleton.tsx:10` shimmer → kekal (loading skeleton perlu, sekali je)

### 2f. Accordion `height: 0→auto` (127 tempat)

Keputusan archi: **ganti kepada instant show/hide** (tiada animate height). Corak:
```tsx
// SEBELUM (reflow tiap frame):
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
// SELEPAS (opacity-only, instant height):
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
```
Fail utama: `AkademikDashboard.tsx`, `AkademikFolderPage.tsx`, `AkademikQrScan.tsx`, `PolyMapsPage.tsx` (1981, 2054, 2371, 3201), `JppUsersPage.tsx`, `JppSidebar.tsx`.

> `ponytail:` kalau nak accordion slide licin balik, guna teknik grid-rows `0fr→1fr` (compositor-friendly) — bukan sekarang.

**Verify:** `grep -rn "height: .auto\|height: 0" src --include="*.tsx" | grep motion` → kosong.

---

## FASA 3 — Buang `isLowPerf` + hook + branch

### 3a. Buang reference `isLowPerf`/`isLowEnd`/`useDevicePerformance`

Senarai fail (grep confirm): 

| Fail | Tindakan |
|---|---|
| `BottomNav.tsx` | buang import + branch → kekal spring/transition |
| `Sidebar.tsx` | buang import + `isLowPerf ? '' : transition-*` → kekal `transition-*` (tapi tukar `transition-all` → `transition-colors`/`transition-transform` specific) |
| `ExcoCard.tsx` | buang import + `!isLowPerf && backdrop-blur-xl` → buang backdrop-blur terus |
| `JppOverviewPage.tsx` | buang import + fade `isLowPerf ? 0 : 0.5` → `0.5`; chart `isLowPerf ? 0 : 1500` → `1500` |
| `DashboardPage.tsx` | buang import + fade → kekal; `isAnimationActive={!isLowPerf}` → `isAnimationActive` |
| `KeusahawananDashboard.tsx` | buang import + `isAnimationActive={!isLowPerf}` → true |
| `PolyMapsPage.tsx` | buang import + `isLowEnd` branch → kekal version penuh (spring, flyTo, tile buffer default) |
| `ExcoAktivitiPage.tsx` | `PAGE_SIZE = isLowPerf ? 10 : 20` → `20` |
| `LandingPage.tsx` | buang import + unused `isLowPerf` |
| `LoginPage.tsx` | buang import + unused `isLowEnd` |
| `SettingsPage.tsx` | buang import + `isLowEnd && hidden` → buang `hidden` (blur dah dipadam FASA 1b) |
| `QuickActions.tsx` | buang `useHolographicTilt(isLowPerf)` → buang tilt entirely, ganti hover scale CSS |
| `KarnivalEffects.tsx` | buang import + `if (isLowPerf) return` → simplify jadi static gradient, buang heavy stack |
| `SupsasEffects.tsx` | sama — static gradient |
| `App.tsx` | buang `useDevicePerformance()` call |

### 3b. Padam hook

```bash
pct exec 100 -- bash -c 'cd /var/www/jpp-polisas && git rm src/hooks/useDevicePerformance.ts'
```

### 3c. Padam CSS `.low-perf-device` block

`src/index.css:240-269` — buang seluruh block.

### 3d. Confirm `reducedMotion="user"`

`App.tsx:674` — dah betul. Kekal.

**Verify:** `grep -rn "isLowPerf\|isLowEnd\|useDevicePerformance\|low-perf-device" src --include="*.tsx" --include="*.ts" --include="*.css"` → kosong (kecuali test).

---

## FASA 4 — Test

### 4a. Padam/update test stale

- `src/__tests__/lowEndPerformance.test.ts` → **padam** (hook tiada)
- `src/tests/devicePerformance.test.ts` → **padam**
- `src/__tests__/landingPageRevamp.test.ts` → buang assertion `useDevicePerformance`
- `src/__tests__/settingsEarthyMinimal.test.ts` → buang assertion `isLowEnd|isLowPerf`
- `src/__tests__/keusahawananSuperApp.test.ts` → buang `vi.mock useDevicePerformance`

### 4b. Test baru (satu, runnable check)

`src/__tests__/gpuBaseline.test.ts` — assert:
- `index.css` tiada `backdrop-filter`
- `src/` tiada `blur-2xl` / `blur-[8-9][0-9]px` / `blur-[1-6][0-9][0-9]px` (kecuali LaunchVideo/PromoPage)
- `src/` tiada `animate-ping` / `width: 0` / `boxShadow` dalam motion animate
- hook file dah tak wujud

---

## FASA 5 — LaunchVideo + PromoPage (BERASINGAN, jangan lump)

Dua file ni showcase 3D/blur/rotate bertimbun (5000+ baris LaunchVideo). Bukan critical path harian.

**Keputusan:** biarkan sekarang. Tandakan `ponytail:` comment. PR berasingan kalau nak ringankan nanti.

---

## FASA 6 — Verify + build + deploy

```bash
pct exec 100 -- bash -c 'cd /var/www/jpp-polisas && npx vitest run && npm run build && pm2 restart jpp-polisas --update-env && sleep 2 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000'
```

**Manual QA:**
- `/portal` — buka, scroll, tekan `+` (bouncy jalan, tiada lag, tiada glow infinite)
- Modal/sidebar — readable (solid surface)
- Loading spinner — masih spin
- Accordion — buka/tutup instant (tak jank)
- `/akademik` — glow orb + ping hilang
- OS reduced-motion — spinner kaku = expected (jangan "fix", itu betul)

---

## URUTAN (mesti ikut, jangan skip verify)

FASA 0 → 1 → 2 → 3 → 4 → 6. **Verify grep antara fasa** — ni yang pastikan takde kebocoran.

## ANGGARAN

~18-20 fail, mostly deletion. Business logic (Supabase/auth/state) tak disentuh. LaunchVideo/PromoPage dikecualikan.
