# JPP-POLISAS — Panduan Pembangunan (Dev Guideline)

> **Baca dokumen ini terlebih dahulu sebelum membuat sebarang perubahan.**
> Dikemas kini: Mei 2026

---

> [!IMPORTANT]
> ## ⚠️ Konteks Perkembangan Projek — Baca Ini Dulu
>
> **Projek ini sedang dalam fasa transisi besar.**
>
> Asalnya, sistem ini dibina **khusus untuk e-KPP sahaja** (Exco Kelab, Persatuan & Perpaduan).
> Semua route, nama fail, dan struktur folder direka dengan andaian bahawa **hanya satu modul exco** yang wujud.
>
> Sekarang, ia sedang dikembangkan menjadi **platform JPP penuh** yang merangkumi semua exco:
> - ✅ e-KPP (siap, route tanpa prefix — konvensyen lama dikekalkan)
> - ✅ e-Keusahawanan (siap dengan modul POS, inventori, Onboarding Perniagaan, dan Program CRUD)
> - ✅ Semua unit exco JPP (KK, AKADEMIK, KEBAJIKAN, MULTIMEDIA, KLS, KOLAB, SRK) kini menggunakan **Sistem Laporan Exco Universal** (Seksyen 12)
>
> **Akibatnya, struktur fail mungkin kelihatan tidak konsisten:**
> - Route e-KPP tiada prefix (`/dashboard`, `/aktiviti`) walaupun exco lain ada prefix (`/keusahawanan/*`)
> - Sesetengah nama komponen masih menggunakan nama lama berorientasikan KPP
> - `JppAdminPage.tsx` adalah fail kawalan utama (JPP HQ Dashboard) kerana ia merangkumi semua logik admin global dan pemantauan rentas-exco
>
> **Falsafah Pemusatan (JPP HQ Centric):**
> Sistem ini dipusatkan melalui *Laman Portal JPP*. Pentadbir (JPP/Developer) sentiasa memantau keadaan kelab/perniagaan secara "Cross-Monitor" (contoh: *Business Switcher Sidebar* untuk Keusahawanan dan *Club Switcher* untuk KPP) dari satu akaun JPP tanpa perlu mencipta pelbagai jenis akaun untuk setiap perniagaan.
>
> **Jangan refactor tanpa faham sejarah ini.** Ikut konvensyen yang ditetapkan dalam `ROUTES.md` untuk sebarang modul baharu.

---

## Dokumen Berkaitan (Baca Juga)

| Dokumen | Kandungan |
|---|---|
| [`JPP_RBAC_SYSTEM.md`](./JPP_RBAC_SYSTEM.md) | ⚠️ **WAJIB BACA** — Sistem RBAC JPP, hierarki peranan, cara extend ke exco baharu |
| [`ROUTES.md`](./ROUTES.md) | Konvensyen penamaan route dan cara tambah modul exco baharu |
| [`USER_GUIDELINE.md`](./USER_GUIDELINE.md) | Panduan pengguna akhir (pelajar) |
| [`Panduan_Deploy_Proxmox.md`](./Panduan_Deploy_Proxmox.md) | Arahan deploy ke server Proxmox on-premise |
| [`src/takwim_rasmi_workflow.md`](./src/takwim_rasmi_workflow.md) | Workflow lengkap sistem Takwim Rasmi |

---

## 1. Tech Stack

| Kategori | Teknologi | Versi |
|---|---|---|
| **Framework** | React + Vite | React 19+, Vite 7+ |
| **Bahasa** | TypeScript | ~5.9 |
| **Styling** | Tailwind CSS + Shadcn UI (Radix UI) | Tailwind 3.3 |
| **Animasi** | Framer Motion | 12+ |
| **Routing** | React Router | v7 |
| **Backend / DB** | Supabase (PostgreSQL + Auth + Storage + Edge Functions) | JS SDK v2 |
| **AI** | Google Gemini API (direct REST call) | gemini-2.5-flash, gemini-1.5-pro |
| **Laporan PDF** | `@react-pdf/renderer` | 4+ |
| **Dokumen DOCX** | `docx` | 9+ |
| **Charts** | Recharts | 2.15 |
| **3D** | React Three Fiber + Drei | 9+ |
| **Drag & Drop** | @dnd-kit/core | 6+ |
| **PWA** | vite-plugin-pwa | — |
| **Monitoring** | @vercel/speed-insights | — |

---

## 2. Senibina Projek

```
src/
├── App.tsx                   ← Entry routing utama
├── main.tsx                  ← React DOM render
├── index.css                 ← CSS global + Tailwind directives
│
├── contexts/
│   ├── AuthContext.tsx        ← ⚠️ RBAC engine, multi-club memberships (PALING KRITIKAL)
│   ├── ThemeContext.tsx       ← Dark/Light mode
│   ├── AiSettingsContext.tsx  ← Tetapan AI per-user
│   ├── KarnivalContext.tsx    ← State pengundian Karnival
│   └── ExcoThemeContext.tsx   ← Warna tema exco aktif
│
├── pages/
│   ├── jpp/                   ← Portal JPP HQ (semua page JPP admin)
│   │   ├── JppHomePage.tsx    ← Home dashboard JPP (/jpp)
│   │   ├── JppMembersPage.tsx ← Pengurusan ahli
│   │   ├── JppOverviewPage.tsx← Overview rentas-kelab
│   │   ├── JppUsersPage.tsx   ← Pengurusan pengguna
│   │   ├── JppLogsPage.tsx    ← Audit log
│   │   ├── JppSidebar.tsx     ← Sidebar navigasi JPP
│   │   ├── JppLayout.tsx      ← Layout shell JPP
│   │   ├── jppConfig.ts       ← UNIT_CFG (semua unit exco + isActive flag)
│   │   └── ExcoWrappers.tsx   ← Thin wrappers untuk route exco universal
│   ├── AktivitiFull.tsx       ← Pengurusan aktiviti e-KPP
│   ├── LaporanPage.tsx        ← Submit laporan
│   ├── SemakanLaporanPage.tsx ← Semak & luluskan laporan (Admin/Penasihat)
│   ├── NexusPage.tsx          ← Nexus AI Hub standalone
│   ├── PortalPage.tsx         ← Portal hub (pilih exco)
│   ├── DashboardPage.tsx      ← Dashboard utama e-KPP
│   ├── keusahawanan/          ← Modul e-Keusahawanan (ada layout sendiri)
│   ├── kebajikan/             ← Modul e-Kebajikan (sistem tiket aduan)
│   ├── akademik/              ← Modul e-Akademik (CGPA, merit, folder, QR)
│   ├── polymart/              ← Modul PolyMart (marketplace pelajar)
│   ├── supsas/                ← Modul SUPSAS (sukan & pertandingan)
│   └── karnival/              ← Modul Karnival (sistem undian & booth)
│
├── components/
│   ├── RouteGuards.tsx        ← ProtectedRoute, PublicRoute
│   ├── ai/                   ← FloatingAiChat, komponen AI
│   ├── layout/               ← AppLayout, Sidebar, BottomNav
│   ├── reports/              ← Penjana PDF/DOCX laporan
│   ├── takwim/               ← Komponen takwim/kalendar
│   ├── tasks/                ← Komponen pengurusan tugasan
│   └── ui/                   ← Shadcn UI components
│
├── store/
│   └── useNotificationStore.ts ← Zustand store untuk notifikasi (guna atomic selector!)
│
├── hooks/
│   ├── useAiAssistant.ts     ← Hook Gemini AI (callAi + sendChatMessage)
│   ├── useDashboardData.ts   ← Fetch data dashboard
│   ├── useReports.ts         ← Fetch dan urus laporan
│   ├── useJppExcoUnits.ts    ← Fetch unit exco JPP
│   ├── useBracket.ts         ← Bracket tournament logic (SUPSAS)
│   ├── useLiveDraw.ts        ← Live draw fixtures (SUPSAS)
│   ├── usePosData.ts         ← POS system data (Keusahawanan)
│   └── usePushNotifications.ts ← Web Push subscription management
│
├── lib/
│   ├── supabase.ts           ← Supabase client singleton + Profile interface + createLog()
│   ├── driveUpload.ts        ← ⚠️ Hybrid storage: images → Supabase, PDF → Google Drive
│   ├── cache.ts              ← Caching utility (QueryCache dengan TTL)
│   ├── notifications.ts      ← Helper: sendNotificationToUser(), sendNotificationToRole()
│   ├── utils.ts              ← cn(), helper functions
│   ├── generateLaporanDocx.ts← Penjana dokumen DOCX laporan
│   ├── email.ts              ← Email dispatch via Express server
│   └── report-utils.ts       ← Utility untuk laporan
│
├── types/
│   └── index.ts              ← Type definitions, role constants, ALL_CLUBS, JPP_MT_POSITIONS
│
└── config/
    └── excoModules.ts        ← Config modul exco (nama, warna, route, aktif/tidak)
```

---

## 3. Sistem Storan Hibrid (Hybrid Storage) ⚠️ PENTING

Sistem ini menggunakan **dua platform storan secara serentak**. Setiap jenis fail ada tempat yang berbeza:

### `src/lib/driveUpload.ts`

| Fungsi | Jenis Fail | Platform | Keterangan |
|---|---|---|---|
| `uploadFileToDrive()` | **Gambar** (image/*) | **Supabase Storage** | Auto-compress JPEG, jimat kuota. Bucket: `reports` |
| `uploadMultipleImages()` | Beberapa gambar (max 3) | **Supabase Storage** | Batch upload gambar |
| `uploadPdfToDrive()` | **PDF sahaja** | **Google Drive** | Via Supabase Edge Function `upload-to-drive` |

### Cara kerja PDF ke Google Drive:
1. Frontend call `uploadPdfToDrive(file, subfolder)`
2. Edge Function `supabase/functions/upload-to-drive/` diaktifkan
3. Token akses Supabase JWT digunakan sebagai auth
4. PDF disimpan ke Google Drive, URL dikembalikan ke frontend
5. URL Google Drive disimpan dalam Supabase database (bukan fail itu sendiri)

### Peraturan Storan:
- **JANGAN** upload PDF ke Supabase Storage — guna `uploadPdfToDrive()` supaya jimat quota
- **JANGAN** upload gambar ke Google Drive — guna `uploadFileToDrive()` yang compress auto
- Gambar avatar disimpan dalam bucket `avatars`
- Dokumen laporan (PDF, kertas kerja) disimpan di Google Drive

---

## 4. Sistem RBAC (Role-Based Access Control) ⚠️ WAJIB FAHAM

> **Baca [`JPP_RBAC_SYSTEM.md`](./JPP_RBAC_SYSTEM.md) untuk dokumentasi lengkap.**

Ringkasan cepat:

| Peranan | Keterangan |
|---|---|
| `SUPER_ADMIN_JPP` | HEP / Developer — akses penuh. Bukan sama dengan JPP! |
| `JPP` + `jpp_unit = 'KPP'` | Exco KPP — akses pemantauan rentas-kelab |
| `JPP` + `jpp_unit = lain` | JPP biasa — akses terhad |
| `CLUB_ADVISOR` | Penasihat Kelab — per kelab |
| `CLUB_PRESIDENT` | Presiden Kelab — per kelab |

**Semua role logic ada dalam `AuthContext.tsx` — jangan duplicate logic di tempat lain.**

---

## 5. Sistem AI (Nexus AI)

### Model yang digunakan:
| Model | Kegunaan |
|---|---|
| `gemini-2.5-flash` | Default — kertas kerja, analisis, minit mesyuarat |
| `gemini-2.5-flash-lite` | Chat & semak ejaan (pantas & jimat) |
| `gemini-1.5-pro` | Pro tier — kertas kerja premium |

### Cara memanggil AI:
```typescript
const { callAi, sendChatMessage } = useAiAssistant();

// Tugasan spesifik
await callAi({ task: 'analyze_performance', clubId: '...' });
await callAi({ task: 'jana_kertas_kerja', data: { tajuk: '...', kos: 500 } });

// Chat multi-turn (FloatingAiChat)
await sendChatMessage(userText, history, context);
```

### Token Economy:
- Token dikurangkan via `supabase.rpc('spend_ai_tokens', { task_name })` selepas AI berjaya
- Semakan token via `supabase.rpc('check_ai_tokens', { task_name })` sebelum panggil AI
- Kadar: Chat = 0 token, Semak Ejaan = 0, Analisis = 5, Kertas Kerja Flash = 20, Pro = 50

### API Key:
```
VITE_GEMINI_API_KEY=... (dalam .env.local)
```

---

## 6. Route & Navigasi

> **Baca [`ROUTES.md`](./ROUTES.md) untuk dokumentasi lengkap konvensyen routing.**

Ringkasan:
- Route **TANPA prefix** (cth: `/dashboard`, `/aktiviti`) = milik **e-KPP** (jangan ubah!)
- Route **DENGAN prefix** (cth: `/keusahawanan/*`, `/kebajikan/*`) = milik exco baharu
- Entry semua pengguna selepas login: `/portal`
- JPP & SUPER_ADMIN_JPP boleh terus ke `/jpp-admin`

### Cara tambah modul exco baharu:
1. Tambah dalam `src/config/excoModules.ts`
2. Tambah route dalam `src/App.tsx` dengan prefix
3. Buat folder `src/pages/<nama-exco>/`
4. Update `ROUTES.md`
5. Baca bahagian 6 dalam `JPP_RBAC_SYSTEM.md` untuk RBAC

### Global Bottom Navigation (Mobile)
> Sistem kini menggunakan navigasi berpusat `<BottomNav />` untuk mobile view (menggantikan sidebar lama).
- Komponen: `src/components/layout/BottomNav.tsx`
- Penggunaan: Sentiasa diletakkan di dalam `AppLayout.tsx` (untuk modul KPP/Keusahawanan/Admin) atau diletakkan secara manual di halaman root seperti `PortalPage.tsx` dan `SettingsPage.tsx`.
- Tindakan Pantas (Quick Actions): Menampilkan pintasan modul. Logik tapisan (RBAC) wujud secara terus di dalamnya (cth: `isKlkEligible` untuk Kediaman, `isJppMember` untuk JPP HQ).

---

## 7. Supabase & Database

### Konfigurasi:
```
# Sistem ini self-hosted — bukan Supabase Cloud
VITE_SUPABASE_URL=https://api.cipher-node.org  (atau nilai dalam .env.local)
VITE_SUPABASE_ANON_KEY=... (dalam .env.local)
```

### Supabase Client:
```typescript
import { supabase } from '@/lib/supabase';
```
- Client adalah **singleton global** (`globalThis.__supabaseClient`) — jangan buat client baru
- Gunakan `noopLock` untuk elak konflik token refresh di React StrictMode / HMR

### Peraturan RLS (Row-Level Security):
- **JANGAN** bypass RLS melainkan sangat perlu (guna Service Role sahaja di server)
- Tulis policy berdasarkan `student_club_memberships` (junction table), **bukan** `profiles.role` sahaja
- Seorang pelajar boleh jadi Presiden di satu kelab dan Ahli Biasa di kelab lain

### Jadual Data Utama:
| Jadual | Fungsi |
|---|---|
| `profiles` | Data pengguna + global role + JPP position/unit |
| `clubs` | Senarai kelab & persatuan |
| `student_club_memberships` | Keahlian per-kelab (role varies per club) |
| `club_activities` | Aktiviti kelab |
| `club_reports` | Laporan bulanan kelab |
| `club_logs` | Audit log semua tindakan kelab |
| `jpp_mt_assignments` | MT yang oversee unit exco tertentu |
| `keusahawanan_businesses`| Profil perniagaan e-Keusahawanan pelajar |
| `student_business_memberships`| Keahlian & hirarki perniagaan pelajar (role: `OWNER`/`MEMBER`, status: `PENDING`/`ACTIVE`/`REJECTED`)|
| `ai_usage_logs` | Rekod penggunaan AI Nexus |
| `notifications` | Notifikasi dalam app |

### Logging:
```typescript
import { createLog } from '@/lib/supabase';
await createLog(clubId, actorId, actorName, 'ACTION_TYPE', 'Deskripsi tindakan', { metadata });
```

### Edge Functions:
| Fungsi | Kegunaan |
|---|---|
| `upload-to-drive` | Upload PDF laporan ke Google Drive |
| `ai-assistant` | (jika ada) Proxy AI calls |

---

## 8. Konvensyen Kod

### Import Path:
```typescript
import { something } from '@/lib/supabase';   // ✅ Guna absolute alias
import { something } from '../lib/supabase';  // ❌ Elakkan relative
```

### Format Data:
- **Nombor Matrik / ID**: Sentiasa simpan dan validate dalam **UPPERCASE**
- **Tarikh**: Guna `date-fns` dengan locale `ms` (Malay)
- **Error handling**: Tunjuk toast error yang mesra pengguna

### UI Components:
- Guna **Shadcn UI** (`@radix-ui/*`) untuk komponen standard
- Guna `cn()` dari `@/lib/utils` untuk conditional classes
- **JANGAN** hardcode warna — guna CSS variables atau Tailwind classes
- Semua UI perlu **mobile-responsive** (test pada lebar 375px ke atas)
- **Modals / Popouts Mobile**: WAJIB menggunakan `max-h-[85dvh]` berbanding `vh` atau ketinggian tetap untuk mengelak isu terpotong akibat bar navigasi/alat telefon. Hadkan saiz maksimum gambar dalam modal supaya butang aksi di bawah tidak terkeluar dari skrin.

### Terminologi (Penting untuk AI & UI):
- `Laporan Aktiviti` dalam database = `Laporan Bulanan` dalam UI
- **JANGAN** tunjuk "Laporan Aktiviti" kepada pengguna — selalu guna "Laporan Bulanan"

---

## 9. Contexts (State Global)

| Context | Eksport | Kegunaan |
|---|---|---|
| `AuthContext` | `useAuth()` | User, profile, role flags, JPP HQ states, club switching |
| `BusinessSwitcherContext` | `useBusinessSwitcher()` | Mengawal & menukar navigasi antara perniagaan yang dipantau (untuk Business Owner & JPP Admin) |
| `ThemeContext` | `useTheme()` | Dark/light mode, toggle |
| `AiSettingsContext` | `useAiSettings()` | Tetapan AI (concise mode, model pilihan) |
| `KarnivalContext` | `useKarnival()` | State undian karnival |
| `ExcoThemeContext` | `useExcoTheme()` | Warna exco aktif untuk theming |
| `SupsasContext` | `useSupsas()` | Data edisi, kontingen, sukan, fixtures, medal tally SUPSAS |
| `JppConfigContext` | `useJppConfig()` | Konfigurasi portal JPP (tetapan, feature flags) |

---

## 10. Development & Testing

### Arahan Server:
```bash
npm run dev          # Jalankan dev server (Vite HMR)
npm run build        # Build production ke /dist
npm run preview      # Preview build production
```

### Linting:
```bash
npm run lint         # Run semua linting (TypeScript + ESLint + CSS + CSS vars)
npm run lint:types   # TypeScript check sahaja
npm run lint:js      # ESLint sahaja
npm run lint:css     # Stylelint sahaja
```

### Deploy:
- Output build: `/dist` (static files)
- Rujuk `Panduan_Deploy_Proxmox.md` untuk deploy ke server Proxmox on-premise

---

## 11. Fail Kritikal yang Tidak Boleh Disentuh Tanpa Faham

| Fail | Mengapa Kritikal |
|---|---|
| `src/contexts/AuthContext.tsx` | Seluruh RBAC sistem. Bug di sini = security hole |
| `src/lib/supabase.ts` | Client singleton. Jangan buat instance baru |
| `src/lib/driveUpload.ts` | Routing storan hibrid. Silap = data tersalah simpan |
| `src/lib/notifications.ts` | Helper notifikasi. Guna ini — jangan `.insert()` terus tanpa ikut polisi RLS |
| `src/types/index.ts` | Type contracts. ALL_CLUBS, constants |
| `src/pages/jpp/jppConfig.ts` | Config semua unit exco JPP. `isActive: false` = unit tersembunyi. `moduleLink` menentukan destinasi klik sidebar |
| `src/store/useNotificationStore.ts` | Zustand store. Guna atomic selector — jangan destructure keseluruhan store |
| `src/components/exco/ExcoAktivitiPage.tsx` | **Template universal** aktiviti exco — jangan duplicate logik ini |
| `src/components/exco/ExcoLaporanPage.tsx` | **Template universal** laporan exco — gunakan semula untuk semua unit |
| `src/components/exco/ExcoSemakanLaporanPage.tsx` | Panel semakan MT — satu komponen untuk semua unit |
| `supabase/migrations/` | Database schema history. Jangan edit migration lama |

---

## 12. Sistem Laporan Exco JPP Universal ⭐ BACA INI

> Semua unit exco JPP (kecuali KPP dan Keusahawanan yang punya dashboard penuh) menggunakan **templat universal berasaskan komponen** untuk fungsi Aktiviti, Laporan, dan Semakan.

### Falsafah Reka Bentuk

Daripada membina satu komponen besar per-unit (yang menyebabkan kod berulang), kami menggunakan **tiga komponen template universal** yang dikonfigurasikan secara dinamik melalui URL params.

```
URL                                  → Komponen
/exco/kebajikan/aktiviti             → ExcoAktivitiPage (excoUnit="KEBAJIKAN")
/exco/kebajikan/laporan              → ExcoLaporanPage  (excoUnit="KEBAJIKAN")
/jpp/semak-laporan-exco/kebajikan    → ExcoSemakanLaporanPage (excoUnit="KEBAJIKAN")
```

### Fail-fail penting

| Fail | Fungsi |
|---|---|
| `src/components/exco/ExcoAktivitiPage.tsx` | CRUD aktiviti. Filter by `exco_unit` column dalam `club_activities` |
| `src/components/exco/ExcoLaporanPage.tsx` | Jana laporan PDF, upload manual, semak status. Filter by `exco_unit` dalam `club_reports` |
| `src/components/exco/ExcoSemakanLaporanPage.tsx` | Panel MT untuk Lulus/Tolak laporan per unit |
| `src/pages/jpp/units/ExcoGenericDashboard.tsx` | Dashboard overview (stat, aktiviti terkini, laporan terkini, quick actions) |
| `src/pages/jpp/ExcoWrappers.tsx` | Thin route wrappers — baca `unitCode` dari URL, hantar ke komponen template |
| `src/pages/jpp/jppConfig.ts` | Config semua unit: `UNIT_CFG`, `UNIT_ORDER`, `UnitConfig` interface |

### Cara Kerja Auto-PDF (per unit)

```typescript
// Setting key format: auto_pdf_KEBAJIKAN, auto_pdf_MULTIMEDIA, dll.
// Jika row tiada, default = true (auto-PDF aktif)
const { data } = await supabase.from('system_settings')
  .select('value').eq('key', `auto_pdf_${excoUnit}`).maybeSingle();
```

### Aliran Kerja Laporan Exco

```
Exco isi aktiviti                    (ExcoAktivitiPage)
    ↓
Exco jana laporan PDF / upload manual (ExcoLaporanPage)
    ↓
Laporan status: "Menunggu"
    ↓
MT yang oversee unit terima notifikasi
    ↓
MT semak dalam ExcoSemakanLaporanPage
    ↓
[Lulus] → status: "Diluluskan"
[Tolak] → status: "Ditolak" + nota penolakan → Exco perlu hantar semula
```

### RBAC Exco Reporting

| Peranan | Akses |
|---|---|
| Ahli exco unit (KETUA\_EXCO / TIMBALAN\_EXCO / EXCO\_BIASA) dengan `jpp_unit = 'KEBAJIKAN'` | Baca & tulis aktiviti/laporan unit sendiri sahaja |
| MT yang di-assign ke unit (`jpp_mt_assignments`) | Baca semua aktiviti/laporan unit itu + kuasa Lulus/Tolak |
| YDP / SUPER\_ADMIN\_JPP | Akses penuh semua unit |

> Semak `JPP_MT_POSITIONS` dalam `src/types/index.ts` untuk senarai jawatan MT.

### Cara Tambah Unit Exco Baharu

Jika ada unit exco JPP baharu perlu ditambah:

1. **Tambah dalam `jppConfig.ts`** — Tambah entry baharu dalam `UNIT_CFG` dengan `isActive: true`
2. **Routing automatik** — Route `/exco/:unitCode/*` dan `/jpp/semak-laporan-exco/:unitCode` sudah wujud dalam `App.tsx`. Tiada perubahan routing diperlukan.
3. **Sidebar automatik** — `JppSidebar.tsx` akan auto-detect unit baharu dan papar sub-nav Aktiviti/Laporan/Semak mengikut RBAC.
4. **Dashboard unit** — `JppUnitDashboard.tsx` akan auto-render `ExcoGenericDashboard` untuk unit baharu.
5. **Database** — Pastikan column `exco_unit` dalam `club_activities` dan `club_reports` boleh terima nilai unit baharu.

> **PENTING**: Jangan buat fail `.tsx` terpisah untuk setiap unit exco. Gunakan templat universal yang sedia ada.

### Database Columns yang Berkaitan

```sql
-- club_activities: tambahan berbanding e-KPP
exco_unit TEXT  -- e.g. 'KEBAJIKAN', 'MULTIMEDIA', 'SRK'

-- club_reports: tambahan berbanding e-KPP  
exco_unit TEXT  -- sama seperti di atas

-- system_settings: toggle auto-PDF per unit
key  = 'auto_pdf_KEBAJIKAN'  -- value: 'true' atau 'false'

-- jpp_mt_assignments: siapa oversee unit mana
mt_user_id UUID   -- profile.id MT berkenaan
unit       TEXT   -- kod unit, cth: 'KEBAJIKAN'
```

---

## 13. Modul Keusahawanan — Program CRUD

`src/pages/keusahawanan/KeusahawananProgram.tsx` kini adalah **real CRUD** (bukan demo data).

### Jadual Database

| Jadual | Fungsi |
|---|---|
| `keusahawanan_programs` | Senarai program/workshop/pertandingan |
| `keusahawanan_program_registrations` | Daftar minat peserta (auto-count via trigger) |

### Kolum Penting `keusahawanan_programs`

| Kolum | Jenis | Keterangan |
|---|---|---|
| `visibility` | `AWAM` / `JPP_SAHAJA` | AWAM = semua boleh lihat; JPP_SAHAJA = ahli JPP sahaja |
| `participants_count` | integer | Auto-dikira via database trigger dari `registrations` |
| `max_participants` | integer | Had kapasiti (0 = tiada had) |
| `image_url` | text | URL poster dari Supabase Storage bucket `keusahawanan` |
| `icon` | text | Emoji fallback jika tiada poster |

### Storan Poster
- Bucket: `keusahawanan` (Supabase Storage)
- Sambungan dibenarkan: gambar sahaja (`image/*`)
- **JANGAN** guna bucket `reports` atau `announcements` untuk program Keusahawanan

### RBAC Program

| Peranan | Akses |
|---|---|
| Unit Keusahawanan (`jpp_unit = 'KEUSAHAWANAN'`) | Buat, edit, padam, tukar visibiliti |
| Mana-mana JPP position | Boleh lihat semua program (AWAM + JPP_SAHAJA) |
| SUPER_ADMIN_JPP | Akses penuh |
| Pelajar biasa | Hanya nampak program AWAM, boleh daftar minat |

---

*Dikemas kini: April 2026 — Setiap perubahan besar pada sistem perlu dikemas kini dokumen ini.*

---

## 14. Sistem Notifikasi & Push Architecture 🔔

> Ditambah: Mei 2026

Sistem notifikasi direka untuk menyokong penyampaian maklumat secara **Real-time (tanpa WebSocket overhead)** dan menyokong **Multi-Device Push Notifications** untuk pengalaman pelajar yang lancar (iOS & Android).

### 14.1 Falsafah Senibina
- **Tiada Supabase Realtime**: Supabase Realtime memakan kos sambungan (connection cost) yang tinggi untuk 1,500 pelajar serentak. Sistem kini menggunakan **Lightweight Polling (60 saat)** di `NotificationContext.tsx` yang hanya melakukan `COUNT(*)` untuk menjimatkan *bandwidth*.
- **Multi-Device Push**: Seorang pengguna boleh melanggan notifikasi dari pelbagai peranti serentak (contoh: Laptop + iPhone). Setiap langganan direkodkan secara berasingan dalam jadual `push_subscriptions`. Apabila notifikasi dihantar, ia memancar (fan-out) ke **semua** peranti pengguna tersebut.
- **Aggressive Prompt**: Model UX menggunakan "Aggressive Prompt" (`PushPermissionModal.tsx`) di halaman `PortalPage`. Jika pengguna belum melanggan, modal skrin penuh akan muncul. Jika ditolak (snooze), ia hanya ditangguhkan selama **24 jam** dan akan muncul semula esok.

### 14.2 API Penghantaran Standard

**JANGAN** gunakan `supabase.from('notifications').insert()` secara terus di dalam komponen untuk logik perniagaan yang melibatkan pengguna akhir, kerana ia **TIDAK** akan memicu *push notification*.

**✅ CARA YANG BETUL:** Gunakan utiliti standard `sendNotificationToUser`.

```typescript
import { sendNotificationToUser } from '@/lib/notifications';

// 1. Lakukan operasi database/perniagaan anda
await supabase.from('kamsis_applications').update({ status: 'APPROVED' }).eq('id', appId);

// 2. Hantar notifikasi (In-App + Push akan diuruskan secara automatik)
try {
  await sendNotificationToUser(studentId, {
    title: '✅ Permohonan Asrama Diluluskan',
    message: 'Tahniah! Permohonan asrama anda telah diluluskan.',
    type: 'KAMSIS_STATUS',
    module: 'KAMSIS', // Lihat jenis NotificationModule yang dibenarkan
    link: '/dashboard', // URL destinasi apabila pengguna klik notifikasi
  });
} catch (e) {
  // Biarkan kosong. JANGAN block aliran perniagaan jika notifikasi gagal
}
```

### 14.3 Mekanisme Push Notification Server

1. Frontend memanggil `sendNotificationToUser()`.
2. Fungsi tersebut menyimpan rekod ke dalam jadual `notifications` (In-App).
3. Secara *background* (tidak-menyekat), utiliti memanggil `firePush()` yang membuat permintaan POST ke `/api/send-push-notification` pada pelayan Node.js / Express kita.
4. Express menggunakan modul `web-push` bersama kunci VAPID (`.env`) untuk menolak mesej ke pelayan Apple/Google Push.

### 14.4 Menambah Modul Notifikasi Baharu
Jika anda menambah sistem exco baharu dan memerlukan ikon/warna lencana (badge) yang khusus:
1. Tambah jenis baharu dalam `NotificationModule` di `src/lib/notifications.ts`.
2. Daftar warna lalai, pautan, dan ikon di dalam `MODULE_CONFIG` dan `MODULE_FALLBACK` dalam `src/components/ui/NotificationBell.tsx`.

---

> Ditambah: April 2026

Sistem kohort membolehkan pegawai JPP mengenal pasti tahap pengajian dan program pelajar (Junior/Senior/Asasi) dan menapis ahli mengikut program atau semester dengan mudah.

### 14.1 Medan Database (`profiles`)

| Kolum | Jenis | Penerangan |
|---|---|---|
| `programme_code` | `TEXT` | Kod program: `DEE`, `DTK`, `DEP`, `DAD`, `DKM`, `DSB`, `DKA`, `DGU`, `DTM`, `DMH`, `DAT`, `DSK`, `DLS`, `DBS`, `FTV` |
| `intake_year` | `SMALLINT` | Tahun pengambilan: 2020–2026 |
| `intake_1_alert_sent_{YEAR}` | `BOOL` | — | Flag: notifikasi intake 1 sudah dihantar tahun ini |
| `intake_2_alert_sent_{YEAR}` | `BOOL` | — | Flag: notifikasi intake 2 sudah dihantar tahun ini |

Admin boleh ubah `intake_1_month` dan `intake_2_month` di `/jpp/settings` → "Konfigurasi Takwim Pengambilan".

### 14.3 Senarai Program POLISAS (Muktamad)

| Jabatan (DB value) | Kod Program | Nama Program |
|---|---|---|
| `elektrik` | `DEE` | Diploma Elektrik dan Elektronik |
| `elektrik` | `DTK` | Diploma Elektronik (Komputer) |
| `elektrik` | `DEP` | Diploma Elektronik (Komunikasi) |
| `mekanikal` | `DAD` | Diploma Kejuruteraan Mekanikal (Automotif) |
| `mekanikal` | `DKM` | Diploma Kejuruteraan Mekanikal |
| `awam` | `DSB` | Diploma Senibina |
| `awam` | `DKA` | Diploma Kejuruteraan Awam |
| `awam` | `DGU` | Diploma Geomatik |
| `makanan` | `DTM` | Diploma Teknologi Makanan |
| `makanan` | `DMH` | Diploma Makanan Halal |
| `perdagangan` | `DAT` | Diploma Akauntansi |
| `perdagangan` | `DSK` | Diploma Sains Kesetiausahaan |
| `perdagangan` | `DLS` | Diploma Pengurusan Logistik & Rangkaian Bekalan |
| `perdagangan` | `DBS` | Diploma Sistem Maklumat Perniagaan |
| `ftv` | `FTV` | Asasi Teknologi Kejuruteraan *(tiada sub-program, tiada kelab auto-assign)* |

### 14.4 Formula Pengiraan Semester

```
startMonth  = intake_period === 1 ? intake_1_month : intake_2_month
totalMonths = (currentYear - intake_year) × 12 + (currentMonth - startMonth)
semester    = clamp(floor(totalMonths / 6) + 1, 1, isFtv ? 2 : 6)

level:
  - FTV          → "Asasi" (bukan Junior/Senior)
  - semester ≤ 3 → "Junior"
  - semester ≥ 4 → "Senior"
```

Jika `semester_override` tidak NULL → guna nilai tersebut tanpa pengiraan.

### 14.5 Cara Guna dalam Komponen

```typescript
import { getSemesterInfo, JABATAN_PROGRAMMES, INTAKE_YEARS } from '@/types';

// 1. Dapatkan bulan intake dari system_settings terlebih dahulu
const { data } = await supabase.from('system_settings')
  .select('key,value').in('key', ['intake_1_month', 'intake_2_month']);
const sm1 = Number(data?.find(r => r.key === 'intake_1_month')?.value) || 7;
const sm2 = Number(data?.find(r => r.key === 'intake_2_month')?.value) || 1;

// 2. Kira semester
const { semester, level } = getSemesterInfo(
  profile.intake_year,    // 2024
  profile.intake_period,  // 1 atau 2
  profile.programme_code === 'FTV',
  sm1, sm2,
  profile.semester_override   // null jika tiada override
);
// level === 'Junior' | 'Senior' | 'Asasi'
// semester === 1 | 2 | 3 | 4 | 5 | 6

// 3. Ambil senarai program untuk dropdown
const programmes = JABATAN_PROGRAMMES['elektrik'];
// [{ code: 'DEE', label: '...' }, { code: 'DTK', label: '...' }, ...]
```

### 14.6 Menambah Program Baharu (Panduan Successor)

1. Tambah entry dalam `JABATAN_PROGRAMMES[jabatan]` di `src/types/index.ts`
2. **Tiada** migration database diperlukan — `programme_code` adalah `TEXT` bebas
3. Kemaskini jadual senarai program di §14.3 dokumen ini

### 14.7 Aliran `CompleteProfileModal` (4 Senario)

| Senario | Syarat | Medan yang Ditunjukkan |
|---|---|---|
| Profil lengkap | Semua ada | Modal tidak muncul |
| `isOnlyMissingPhone` | Ada semua kecuali phone | Phone sahaja |
| `isOnlyMissingCohort` | Ada matric+dept+phone, tiada programme/intake | Jabatan + Program + Tahun + Intake (+ override) |
| `isMissingPhoneAndCohort` | Ada matric+dept, tiada phone dan kohort | Phone + Jabatan + Program + Tahun + Intake |
| Full Registration | Tiada matric | Nama IC + Matrik + Phone + Jabatan + Program + Intake |

> **Pelajar sedia ada (85 orang pada April 2026)** terkena senario `isOnlyMissingCohort` apabila log masuk pertama kali selepas kemaskini ini.

### 14.8 Notifikasi Automatik Intake

Apabila mana-mana `SUPER_ADMIN_JPP` atau `ADMIN` log masuk ke `/jpp/settings`, sistem menyemak secara automatik sama ada bulan semasa adalah 1 bulan sebelum `intake_1_month` atau `intake_2_month`. Jika ya, notifikasi dihantar kepada semua admin mengingatkan mereka untuk semak konfigurasi intake. Notifikasi ini hanya dihantar **sekali setahun** per sesi intake (disimpan dalam `system_settings` dengan key `intake_N_alert_sent_{YEAR}`).

---

*Dikemas kini: April 2026 — Setiap perubahan besar pada sistem perlu dikemas kini dokumen ini.*

---

## 16. Database-Friendly Development ⚠️ WAJIB BACA (Untuk AI Agent & Developer)

> **Latar belakang:** Sistem ini perlu menanggung 1,500 pendaftaran serentak semasa Musim Orientasi. Bahagian ini mengandungi peraturan mandatori yang telah dipersetujui selepas audit prestasi mendalam (April 2026). Setiap peraturan di sini mempunyai sebab teknikal yang konkrit — **jangan abaikannya**.

---

### 15.1 Peraturan RLS Policy — KRITIKAL

> [!CAUTION]
> **Insiden Sebenar — Mei 2026:** CPU database naik ke 99.84% dan terpaksa di-restart. Punca utama: policies `takwim_pusat` menggunakan `auth.uid()` terus (bukan `SELECT auth.uid()`), ditambah dengan 6 duplicate policies pada `klk_student_residency`. Semua telah diperbaiki — **jangan ulang pattern yang sama**.

#### ✅ SELALU guna `(SELECT auth.uid())` — BUKAN `auth.uid()` terus

```sql
-- ❌ SALAH — PostgreSQL evaluate auth.uid() untuk SETIAP ROW yang discan
CREATE POLICY "contoh_salah" ON public.my_table
  FOR SELECT USING (user_id = auth.uid());

-- ✅ BETUL — PostgreSQL evaluate auth.uid() SEKALI sahaja per query (init-plan)
CREATE POLICY "contoh_betul" ON public.my_table
  FOR SELECT USING (user_id = (SELECT auth.uid()));
```

**Mengapa penting:** Dengan 1,000 baris dalam jadual, `auth.uid()` tanpa `SELECT` dipanggil 1,000 kali per query. Dengan `(SELECT auth.uid())`, ia dipanggil sekali. Pada skala 1,500 pengguna serentak, ini perbezaan antara stabil dan crash.

Peraturan yang sama berlaku untuk:
- `auth.role()` → `(SELECT auth.role())`
- `auth.jwt()` → `(SELECT auth.jwt())`
- Sebarang RPC call dalam USING/WITH CHECK

#### ✅ SATU policy per operasi per jadual — jangan buat duplikat

```sql
-- ❌ SALAH — dua policy permissive untuk UPDATE pada jadual yang sama
CREATE POLICY "update_own" ON profiles FOR UPDATE USING (id = (SELECT auth.uid()));
CREATE POLICY "admin_update" ON profiles FOR UPDATE USING (is_admin((SELECT auth.uid())));

-- ✅ BETUL — gabungkan dalam satu policy menggunakan OR
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (
    (id = (SELECT auth.uid()))
    OR is_admin((SELECT auth.uid()))
  )
  WITH CHECK (
    (id = (SELECT auth.uid()))
    OR is_admin((SELECT auth.uid()))
  );
```

**Mengapa penting:** PostgreSQL menilai SEMUA permissive policy dan menggabungkan dengan OR. Dua policy = dua kali kerja per query. Sentiasa merge menjadi satu.

#### ✅ Untuk jadual yang kerap dibaca, tambah `WITH CHECK` yang ketat

Jadual seperti `notifications`, `profiles`, `portal_settings` dibaca pada SETIAP page load. Policy INSERT/UPDATE mesti mempunyai `WITH CHECK` yang mengehadkan akses — jangan `WITH CHECK (true)`.

---

### 15.2 Peraturan Query Frontend — KRITIKAL

#### ✅ SENTIASA fetch secara selari dengan `Promise.all`

```typescript
// ❌ SALAH — sequential fetch (waterfall), lebih lambat & membazir connection
const profile = await supabase.from('profiles').select('*').eq('id', userId).single();
const memberships = await supabase.from('student_club_memberships').select('*').eq('user_id', userId);

// ✅ BETUL — parallel fetch, 2x+ lebih pantas
const [profileRes, membershipsRes] = await Promise.all([
  supabase.from('profiles').select('*').eq('id', userId).single(),
  supabase.from('student_club_memberships').select('*').eq('user_id', userId),
]);
```

#### ✅ JANGAN buat N+1 queries

```typescript
// ❌ SALAH — N+1: satu query per item dalam array
const clubs = await supabase.from('clubs').select('*');
for (const club of clubs.data) {
  const members = await supabase.from('student_club_memberships')
    .select('*').eq('club_id', club.id); // dipanggil N kali
}

// ✅ BETUL — satu query dengan .in()
const members = await supabase
  .from('student_club_memberships')
  .select('*, club:clubs(*)')
  .in('club_id', clubs.data.map(c => c.id));
```

#### ✅ Guna `QueryCache` untuk data yang kerap diakses

```typescript
import { queryCache } from '@/lib/cache';

const CACHE_KEY = `dashboard_${userId}`;
const cached = queryCache.get(CACHE_KEY);
if (cached) return cached;

const data = await fetchDashboardData(userId);
queryCache.set(CACHE_KEY, data, 2 * 60 * 1000); // 2 minit TTL
return data;
```

**Panduan TTL berdasarkan jenis data:**

| Jenis Data | TTL Cadangan | Sebab |
|---|---|---|
| `portal_settings` (feature flags) | 10 minit | Jarang berubah |
| Senarai kelab, unit exco | 30 minit | Data statik |
| Data dashboard (stats, laporan) | 2–3 minit | Semi-statik |
| Notifikasi | Jangan cache | Perlu fresh |
| Data profil pengguna sendiri | 1 minit | Boleh berubah |

#### ✅ Pilih column yang diperlukan sahaja — jangan `select('*')` untuk jadual besar

```typescript
// ❌ SALAH
const { data } = await supabase.from('profiles').select('*');

// ✅ BETUL
const { data } = await supabase.from('profiles').select('id, full_name, email, role, club_id');
```

#### ✅ Guna Optimistic Locking untuk mengelak Race Conditions (Update Berkuantiti)

Apabila mengemaskini nilai yang bergantung kepada bacaan sebelumnya (contoh: increment `scans_total` atau baki tiket), **JANGAN** guna pattern "Read-then-Write" yang berasingan. Ia akan gagal apabila diakses oleh ramai pengguna serentak.

```typescript
// ❌ SALAH — Race condition! (Pengguna A dan B baca nilai 5 serentak, dua-dua update jadi 6)
const { data } = await supabase.from('tokens').select('count').single();
await supabase.from('tokens').update({ count: data.count + 1 });

// ✅ BETUL — Optimistic Locking pada peringkat database
const { error } = await supabase
  .from('tokens')
  .update({ count: currentCount + 1 })
  .eq('id', tokenId)
  .eq('count', currentCount); // ← UPDATE hanya jika nilai belum diubah oleh orang lain!

if (error || /* tidak jumpa row */) {
  // Cuba semula (retry) atau papar ralat
}
```

---

### 15.3 Peraturan Realtime & WebSocket — PENTING

#### ❌ JANGAN tambah Realtime subscription untuk ciri high-traffic

Realtime subscription = satu WebSocket connection kekal per komponen yang subscribe. Dengan 1,500 pengguna serentak, ini bermaksud 1,500 connection terbuka serentak ke Supabase Realtime.

**Peraturan:**
- **DILARANG** guna `supabase.channel().on('postgres_changes', ...)` dalam komponen yang dimuatkan pada setiap page load (cth: layout, sidebar, notifikasi global)
- Guna **polling berasaskan visibility** sebagai ganti:

```typescript
// ✅ CARA YANG BETUL — polling via visibilitychange (pattern sedia ada dalam NotificationContext)
useEffect(() => {
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') fetchLatestData();
  };
  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, []);
```

**Pengecualian yang dibenarkan:** Realtime boleh digunakan untuk ciri chat atau voting masa nyata, TETAPI mesti:
1. Di-subscribe hanya apabila pengguna berada di halaman berkenaan
2. Di-unsubscribe apabila komponen unmount (`return () => channel.unsubscribe()`)
3. Tidak diletakkan dalam komponen Layout/Sidebar/global provider

---

### 15.4 Peraturan Migration Database

#### ✅ SENTIASA tulis migration baharu — JANGAN edit migration lama

Setiap migration adalah rekod sejarah database. Edit migration lama akan menyebabkan drift antara development dan production.

#### ✅ Template jadual baharu — RLS WAJIB

```sql
CREATE TABLE public.my_new_table (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WAJIB aktifkan RLS
ALTER TABLE public.my_new_table ENABLE ROW LEVEL SECURITY;

-- WAJIB ada sekurang-kurangnya satu policy dengan (SELECT auth.uid())
CREATE POLICY "my_new_table_select" ON public.my_new_table
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- WAJIB index untuk setiap FK column
CREATE INDEX idx_my_new_table_user_id ON public.my_new_table(user_id);
```

---

### 15.5 Peraturan Notifikasi

Policy INSERT pada `notifications` mengizinkan:

| Siapa | Boleh insert untuk siapa |
|---|---|
| Mana-mana `authenticated` user | Diri sendiri sahaja (`user_id = auth.uid()`) |
| `JPP`, `SUPER_ADMIN_JPP`, `CLUB_PRESIDENT`, `CLUB_MT` | Pengguna lain |
| `authenticated` user | Role-broadcast (`user_id IS NULL`, `target_role IS NOT NULL`) |

```typescript
// ✅ BETUL — student insert notifikasi untuk diri sendiri
await supabase.from('notifications').insert({
  user_id: currentUser.id,  // ← MESTI sama dengan auth.uid()
  title: 'QR Scan Berjaya',
  type: 'SUCCESS'
});

// ❌ SALAH — student cuba insert untuk orang lain (akan GAGAL dengan RLS error)
await supabase.from('notifications').insert({
  user_id: someOtherUserId,  // ← RLS akan BLOCK ini
  ...
});
```

---

### 15.6 Senarai Semak Prestasi — Untuk Setiap Feature Baru

Sebelum deploy feature baharu, semak senarai ini:

```
Database:
  [ ] Semua RLS policy guna (SELECT auth.uid()) bukan auth.uid() terus
  [ ] Tiada policy pendua/bertindih untuk operasi yang sama pada jadual yang sama
  [ ] Setiap FK column ada index
  [ ] Setiap jadual baharu ada RLS diaktifkan + sekurang-kurangnya satu policy
  [ ] Migration dinamakan dengan deskriptif (bukan 'fix.sql' atau 'update.sql')

Query Frontend:
  [ ] Fetch selari guna Promise.all (bukan sequential await)
  [ ] Tiada N+1 query pattern
  [ ] select() hanya column yang diperlukan (bukan select('*') untuk jadual besar)
  [ ] Data semi-statik dicache dengan QueryCache + TTL bersesuaian

Realtime & Connections:
  [ ] Tiada Realtime subscription baru dalam komponen global/layout/sidebar
  [ ] Semua subscription ada cleanup (return () => channel.unsubscribe())
  [ ] Pertimbangkan polling via visibilitychange sebagai alternatif
  [ ] Semua useEffect yang fetch data ada cleanup / isMounted guard
  [ ] Tiada infinite loop fetch (dependency array useEffect betul)

Notifikasi:
  [ ] INSERT notification untuk orang lain hanya dalam komponen JPP/admin
  [ ] Student hanya insert notification untuk diri sendiri (user_id = auth.uid())
```

---

### 15.7 Diagnosis CPU Spike Database — Panduan Insiden

> [!NOTE]
> Bahagian ini ditulis berdasarkan **insiden sebenar Mei 2026** di mana CPU Supabase mencecah 99.84% dan perlu di-restart.

#### Tanda-tanda ada masalah

| Simptom | Kemungkinan Punca |
|---|---|
| CPU database > 80% secara berterusan | RLS `auth.uid()` tanpa `SELECT`, duplicate policies, atau query tanpa index |
| SWAP usage tinggi (> 80%) | Banyak connection terbuka serentak / connection leak |
| App jadi lambat tapi tiada error | Connection pool penuh — query beratur menunggu |
| App okay selepas restart DB | Connection buildup — ada leak dalam kod frontend |
| CPU spike bila banyak user login | Realtime subscription dalam komponen global (bukan per-page) |

#### Cara audit bila CPU tinggi (guna Supabase MCP)

```sql
-- 1. Semak query yang sedang berjalan (ada stuck query?)
SELECT pid, now() - query_start AS duration, query, state, wait_event
FROM pg_stat_activity
WHERE state != 'idle' AND query_start IS NOT NULL
ORDER BY duration DESC LIMIT 20;

-- 2. Semak dead tuples (perlu VACUUM?)
SELECT relname, n_dead_tup, n_live_tup,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct,
  last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 100
ORDER BY n_dead_tup DESC LIMIT 15;

-- 3. Semak policy duplikat
SELECT tablename, cmd, COUNT(*) as policy_count, STRING_AGG(policyname, ', ') as policies
FROM pg_policies
WHERE schemaname = 'public' AND permissive = 'PERMISSIVE'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY policy_count DESC;
```

Atau gunakan **Supabase MCP** terus:
```
get_logs(service: 'postgres')         ← Semak error & fatal messages
get_advisors(type: 'performance')     ← Auto-detect RLS & index issues
```

#### Punca biasa & cara fix

| Punca | Cara Fix |
|---|---|
| `auth.uid()` dalam RLS tanpa `SELECT` | Tukar ke `(SELECT auth.uid())` — lihat §15.1 |
| Duplicate permissive policies | Merge jadi satu policy dengan `OR` — lihat §15.1 |
| Realtime subscription dalam komponen global | Pindahkan ke page-level, tambah cleanup |
| `useEffect` tanpa cleanup / infinite loop | Pastikan dependency array betul, tambah `isMounted` guard |
| Connection leak (SWAP tinggi) | Cari komponen yang subscribe tapi tak unsubscribe |
| Post-restart CPU spike | Normal — Postgres buat WAL recovery + buffer warmup. Tunggu 5–10 minit |

#### Bila CPU spike berlaku SEBELUM restart tapi OKAY selepas restart

Ini tanda **connection buildup** bukan query performance. Punca biasa:
1. `useEffect` yang buat subscription tapi tak ada `return () => unsubscribe()`
2. Realtime channel yang dibuka berkali-kali tanpa tutup yang lama
3. `fetch` dalam infinite render loop

Cara cari:
```typescript
// ✅ Pastikan SETIAP subscription ada cleanup
useEffect(() => {
  const channel = supabase.channel('my_channel').subscribe();
  return () => { supabase.removeChannel(channel); }; // ← WAJIB ADA INI
}, []);
```

---

*Dikemas kini: Mei 2026 — Selepas audit prestasi Musim Orientasi + insiden CPU Mei 2026.*

---

## 16. Modul PolyMart — Marketplace Pelajar

> Route prefix: `/polymart/*` | Layout: `src/pages/polymart/PolyMartLayout.tsx`

PolyMart adalah marketplace dalam-app untuk pelajar POLISAS menjual dan membeli produk/perkhidmatan sesama sendiri.

### 16.1 Jadual Database

| Jadual | Fungsi |
|---|---|
| `polymart_ads` | Iklan/listing produk oleh vendor |
| `polymart_orders` | Pesanan pembeli (status: `PENDING`→`CONFIRMED`→`READY`→`COMPLETED`/`CANCELLED`) |
| `polymart_reports` | Laporan aduan terhadap iklan |
| `polymart_reviews` | Ulasan pembeli selepas transaksi selesai |

### 16.2 Routes

| Route | Komponen | Akses |
|---|---|---|
| `/polymart` | `PolyMartHome` | Semua (termasuk pelawat tanpa login) |
| `/polymart/produk/:id` | `PolyMartProductDetail` | Semua |
| `/polymart/pesanan-saya` | `PolyMartMyOrders` | Authenticated |
| `/polymart/vendor` | `PolyMartVendorDashboard` | Vendor (ada perniagaan aktif) |
| `/polymart/admin` | `PolyMartAdminPanel` | `hasKeusahawananAccess` atau `isSuperAdmin` |

### 16.3 RBAC PolyMart

| Peranan | Akses |
|---|---|
| Pelawat (tidak login) | Boleh browse dan lihat produk sahaja |
| Pelajar biasa | Boleh beli, buat pesanan, tulis review |
| Vendor (owner/ahli perniagaan aktif) | Boleh list produk, urus pesanan masuk |
| `hasKeusahawananAccess` / `isSuperAdmin` | Akses admin panel (moderasi, urus laporan) |

### 16.4 Konteks Dalaman

`PolyMartLayout.tsx` mengeksport konteks dalaman `usePolymart()` yang mengandungi:
- `activeCategory` — penapis kategori aktif
- `searchQuery` — query carian
- `isVendor` — sama ada pengguna adalah vendor
- `pendingVendorCount` — bilangan pesanan masuk yang belum diproses
- `myActiveOrdersCount` — bilangan pesanan aktif pembeli

### 16.5 Realtime (Pengecualian Dibenarkan)

PolyMartLayout **menggunakan Realtime** tetapi HANYA untuk vendor yang sedang aktif:
```typescript
// Hanya subscribe jika pengguna adalah vendor
if (!user || !isVendor) return;
const sub = supabase.channel('polymart_vendor_orders_live')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'polymart_orders' }, refetchCounts)
  .subscribe();
return () => { supabase.removeChannel(sub); }; // cleanup ada
```
Pembeli biasa menggunakan fetch-on-mount tanpa Realtime.

### 16.6 Kategori Produk

`Makanan`, `Minuman`, `Aksesori`, `Perkhidmatan`, `Pakaian`, `Elektronik`, `Umum`

---

## 17. Modul E-Akademik — Pengurusan Akademik Pelajar

> Route prefix: `/akademik/*` | Layout: `src/pages/akademik/AkademikLayout.tsx`

E-Akademik adalah modul khusus untuk pengurusan rekod akademik, pencapaian, dan dokumen peribadi pelajar.

### 17.1 Jadual Database

| Jadual | Fungsi |
|---|---|
| `akademik_cgpa_records` | Rekod CGPA semester pelajar |
| `akademik_pencapaian` | Sijil dan pencapaian akademik |
| `akademik_sijil_categories` | Kategori sijil (konfigurasi) |
| `akademik_merit_config` | Konfigurasi poin merit untuk aktiviti akademik |
| `akademik_files` | Fail peribadi pelajar (RLS: owner sahaja) |
| `akademik_folders` | Folder peribadi pelajar (RLS: creator sahaja) |
| `akademik_qr_tokens` | Token QR yang dijana untuk scan kehadiran |
| `akademik_qr_scans` | Log scan QR oleh pelajar |
| `akademik_unlock_requests` | Permintaan buka kunci rekod akademik |

### 17.2 Routes

| Route | Komponen | Fungsi |
|---|---|---|
| `/akademik` | `AkademikDashboard` | Dashboard ringkasan |
| `/akademik/pencapaian` | `AkademikPencapaian` | Sijil & pencapaian |
| `/akademik/merit` | `AkademikMeritPage` | Poin merit akademik |
| `/akademik/qr` | `AkademikQrPage` | Jana & urus QR token |
| `/akademik/qr/:token` | `AkademikQrScan` | Scan QR (public, no auth required) |
| `/akademik/cgpa` | `AkademikCgpa` | Rekod CGPA |
| `/akademik/folder` | `AkademikFolderPage` | Storan dokumen peribadi |
| `/akademik/leaderboard` | `AkademikLeaderboard` | Papan mata merit |

### 17.3 Sistem Folder Peribadi

`akademik_files` dan `akademik_folders` adalah **peribadi sepenuhnya** — RLS memastikan pelajar hanya boleh akses folder/fail mereka sendiri. Policy menggunakan `(SELECT auth.uid())` pattern (telah dioptimumkan April 2026).

### 17.4 RBAC E-Akademik

| Peranan | Akses |
|---|---|
| Semua pelajar | Dashboard, CGPA, pencapaian, folder peribadi sendiri |
| Exco Akademik (`jpp_unit = 'AKADEMIK'`) | Urus merit config, jana QR token |
| `SUPER_ADMIN_JPP` | Akses penuh + unlock requests |

---

## 18. Modul SUPSAS — Sukan & Pertandingan

> Route prefix: `/supsas/*` | Context: `SupsasContext` | Layout: `src/pages/supsas/SupsasLayout.tsx`

SUPSAS (Sukan Universiti POLISAS) adalah sistem pengurusan pertandingan sukan antara kontingen jabatan.

### 18.1 Jadual Database

| Jadual | Fungsi |
|---|---|
| `supsas_editions` | Edisi pertandingan (satu aktif pada satu masa) |
| `supsas_sports` | Senarai sukan dalam edisi (format: `knockout`/`round_robin`/`group_knockout`) |
| `supsas_kontingen` | Pasukan/jabatan yang menyertai |
| `supsas_teams` | Kumpulan dalam sukan (satu kontingen boleh ada beberapa kumpulan) |
| `supsas_fixtures` | Jadual perlawanan (ada bracket fields untuk knockout) |
| `supsas_results` | Keputusan perlawanan |
| `supsas_participants` | Peserta individu |

### 18.2 Routes

| Route | Akses |
|---|---|
| `/supsas` | Landing page — semua |
| `/supsas/scoreboard` | Papan mata — semua |
| `/supsas/jadual` | Jadual perlawanan — semua |
| `/supsas/sukan` | Senarai sukan — semua |
| `/supsas/bracket/:sportId` | Bracket sukan — semua |
| `/supsas/sejarah` | Sejarah edisi lepas — semua |
| `/supsas/admin/*` | Panel admin — Exco SRK / Super Admin |
| `/supsas/ketua` | Dashboard ketua kontingen — ketua kontingen sahaja |

### 18.3 SupsasContext — Cara Guna

```typescript
import { useSupsas } from '@/contexts/SupsasContext';

const { edition, kontingen, sports, fixtures, medalTally, isLive, isLoading } = useSupsas();
```

**PENTING:** SupsasContext menggunakan **visibility-based polling** untuk pengguna biasa. Realtime HANYA diaktifkan untuk admin panel:
```typescript
const { enableRealtime, disableRealtime } = useSupsas();
// SupsasAdminLayout memanggil enableRealtime() pada mount
// dan disableRealtime() pada unmount
```

### 18.4 RBAC SUPSAS

| Peranan | Akses |
|---|---|
| Semua (termasuk awam) | View scoreboard, jadual, bracket |
| Ketua Kontingen | Dashboard ketua, urus team sendiri |
| Exco SRK (`jpp_unit = 'SRK'`) | Admin panel penuh |
| `SUPER_ADMIN_JPP` | Akses penuh |

---

## 19. Modul Karnival — Sistem Undian & Booth

> Route prefix: `/karnival/*` | Context: `KarnivalContext` | Layout: `src/pages/karnival/KarnivalLayout.tsx`

Karnival adalah sistem pengurusan booth dan undian untuk Karnival tahunan POLISAS.

### 19.1 Jadual Database

| Jadual | Fungsi |
|---|---|
| `karnival_editions` | Edisi karnival (satu aktif pada satu masa) |
| `karnival_categories` | Kategori pertandingan/penilaian booth |
| `karnival_booths` | Booth yang menyertai karnival |
| `karnival_votes_v2` | Rekod undi (satu pelajar satu undi per kategori) |

### 19.2 Routes

| Route | Komponen | Akses |
|---|---|---|
| `/karnival` | `KarnivalLandingPage` | Semua |
| `/karnival/undi` | `KarnivalVotePage` | Authenticated |
| `/karnival/scoreboard` | `KarnivalScoreboard` | Semua |
| `/karnival/admin` | `KarnivalAdminDashboard` | JPP/SuperAdmin |
| `/karnival/admin/edition` | `KarnivalAdminEdition` | JPP/SuperAdmin |
| `/karnival/admin/categories` | `KarnivalAdminCategories` | JPP/SuperAdmin |
| `/karnival/admin/booths` | `KarnivalAdminBooths` | JPP/SuperAdmin |
| `/karnival/admin/results` | `KarnivalAdminResults` | JPP/SuperAdmin |

### 19.3 KarnivalContext

```typescript
import { useKarnival } from '@/contexts/KarnivalContext';
// Menyediakan state undian, semakan sama ada pengguna sudah mengundi,
// dan data edisi karnival aktif
```

---

## 20. Modul E-Kebajikan — Sistem Tiket Aduan

> Route prefix: `/kebajikan/*` | Layout: `src/pages/kebajikan/` (tiada layout berasingan — guna AppLayout)

E-Kebajikan adalah sistem pengurusan aduan dan kebajikan pelajar dengan aliran tiket dua-arah.

### 20.1 Jadual Database

| Jadual | Fungsi |
|---|---|
| `kebajikan_tickets` | Tiket aduan pelajar |
| `kebajikan_ticket_comments` | Komen/chat dalam tiket (antara pelajar & exco) |
| `kebajikan_ticket_status_log` | Log perubahan status tiket |
| `kebajikan_escalation_actions` | Tindakan eskalasi (hantar ke jabatan luar) |
| `kebajikan_pics` | Preset PIC (Person-In-Charge) per jabatan/kemudahan |
| `kebajikan_settings` | Tetapan modul (SLA, kategori) |
| `kebajikan_staff_assignments` | Penugasan exco kepada tiket |
| `kebajikan_tags` | Tag/label untuk mengkategorikan tiket |
| `kebajikan_notifications` | Notifikasi khusus kebajikan |

### 20.2 Routes

| Route | Komponen | Akses |
|---|---|---|
| `/kebajikan/buat-aduan` | `KebajikanSubmitPage` | Pelajar (buat tiket baru) |
| `/kebajikan/aduan-saya` | `KebajikanMyTickets` | Pelajar (lihat tiket sendiri) |
| `/kebajikan/aduan/:id` | `KebajikanStudentChat` | Pelajar (chat dalam tiket) |
| `/kebajikan/statistik` | `KebajikanStatsPage` | Semua authenticated |
| `/kebajikan` | `KebajikanDashboard` | Exco Kebajikan |
| `/kebajikan/tiket` | `KebajikanTicketsPage` | Exco Kebajikan (semua tiket) |
| `/kebajikan/tiket/:id` | `KebajikanTicketDetail` | Exco Kebajikan (urus tiket) |
| `/kebajikan/laporan` | `KebajikanReportPage` | Exco Kebajikan |
| `/kebajikan/staff` | `KebajikanStaffPage` | Exco Kebajikan (urus penugasan) |
| `/kebajikan/tetapan` | `KebajikanSettingsPage` | Exco Kebajikan / Super Admin |

### 20.3 Aliran Tiket Aduan

```
Pelajar buat aduan           → status: "OPEN"
      ↓
Exco terima & assign         → status: "IN_PROGRESS"
      ↓
Chat dua-hala (KebajikanStudentChat / KebajikanTicketDetail)
      ↓
[Selesai]  → status: "RESOLVED"
[Eskalasi] → status: "ESCALATED" + escalation_actions diisi
[Tutup]    → status: "CLOSED"
```

### 20.4 RBAC E-Kebajikan

| Peranan | Akses |
|---|---|
| Semua pelajar | Buat aduan, lihat tiket sendiri, chat dalam tiket sendiri |
| Exco Kebajikan (`jpp_unit = 'KEBAJIKAN'`) | Lihat & urus semua tiket, assign staff, eskalasi |
| `SUPER_ADMIN_JPP` | Akses penuh termasuk settings & laporan |

---

## 21. Modul Kediaman Luar Kampus (KLK)

> Route prefix: `/klk/*` | Layout: `src/pages/klk/` (sebahagian guna AppLayout)

Modul KLK (Kediaman Luar Kampus) digunakan untuk memantau status kediaman pelajar, mengumpul data statistik, dan menyediakan "form builder" dinamik untuk maklumat tambahan yang dikehendaki oleh pihak asrama atau exco.

### 21.1 Jadual Database Utama

| Jadual | Fungsi |
|---|---|
| `klk_student_residency` | Data kediaman setiap pelajar (disimpan per-semester) |
| `klk_dynamic_fields` | Soalan dinamik "form builder" (cth: "Sebab tinggal luar", "Sewa bulanan") |
| `klk_kawasan` | Senarai rasmi kawasan kediaman luar kampus |
| `klk_settings` | Tetapan modul (termasuk is_active) |

### 21.2 Ciri-ciri Utama

1. **Pengasingan Sesi (Decoupling dari KAMSIS)**
   - KLK **tidak lagi** bergantung pada sesi akademik global KAMSIS (yang diuruskan di Papan Rujukan Asrama).
   - Tahun akademik KLK dikira secara automatik berdasarkan tarikh semasa (`getKlkAcademicYear` dalam `klkUtils.ts`). Data KLK dihimpunkan mengikut tahun, bukan semester.
   - Papan pemuka KLK mempunyai pemilih tahun (dropdown) berasingan untuk melihat data historik tanpa menjejaskan modul lain.

2. **Deklarasi & Auto-Luput (Auto-Expiry)**
   - Setiap pelajar **Sem 2 dan ke atas** wajib mendeklarasikan status kediaman. Pengecualian: Pelajar Semester 1, `SUPER_ADMIN_JPP`, dan `STAFF`.
   - **Auto-Expiry Sem 5+:** Pelajar yang berada di Semester 5 ke atas wajib mengemaskini status mereka **setiap 30 hari** (atau setiap semester baru). Jika rekod lebih dari 30 hari, ia diarkibkan (`is_expired = true`) dan pelajar akan diminta mengisi semula form.

3. **Form Builder & Hybrid Data**
   - Soalan dinamik diuruskan oleh Exco di `/klk/tetapan`.
   - Jawapan pelajar disimpan dalam lajur `extra_data` (`JSONB`) di dalam `klk_student_residency`.

4. **Pengurusan Kawasan "Lain-lain"**
   - Pelajar yang memilih "Lain-lain" (`LAIN_LAIN`) boleh memasukkan nama kawasan secara manual (`kawasan_custom`).
   - Sistem menyediakan UI khusus (`get_klk_lain_lain_summary`) untuk Exco memantau dan memigrasikan data "Lain-lain" ini menjadi kawasan rasmi (`migrate_klk_lain_lain` RPC).

5. **Public Statistics (Akses Awam / QR)**
   - Akses: `/klk/statistik` (berbeza dari admin statistik).
   - Menggunakan RPC `SECURITY DEFINER` (`get_klk_public_stats`) untuk membekalkan agregat data tanpa mendedahkan identiti.

### 21.3 RBAC KLK

| Peranan | Akses |
|---|---|
| Pelajar (Sem 2 & ke atas) | Deklarasi kediaman, akses form via Settings |
| JPP Biasa (Sem 2 & ke atas) | Deklarasi kediaman (diwajibkan) |
| Exco KLS (`jpp_unit = 'KLS'`) | Admin panel penuh (Dashboard, Pengurusan Kawasan, Form Builder) |
| `SUPER_ADMIN_JPP` | Akses admin penuh |

---

## 22. Pengurusan Sesi KAMSIS (Papan Rujukan Asrama)

Berbeza dengan KLK yang automatik, sesi permohonan KAMSIS kini diuruskan **secara terus** oleh Exco Kediaman di `JppAsramaPage.tsx` (Papan Rujukan Asrama) melalui input "Sesi" dan dropdown "Semester" pada header. 

Pengasingan kawalan ini membolehkan Exco KAMSIS mengurus sesi pengambilan mereka sendiri tanpa mengubah tetapan modul JPP lain secara global.

---

*Dikemas kini: Mei 2026 — Decoupling KLK dari global session, pelaksanaan Auto-Expiry Sem 5+, dan kawalan sesi KAMSIS inline.*

---

## 23. Pengurusan "Merit Rasmi" (Sistem Vouch Dual-Review) ⭐

> Ditambah: Mei 2026

Permohonan "Merit Rasmi" membenarkan kelab memberi merit kehadiran kepada peserta yang hadir aktiviti. Tanggungjawab semakan ("vouching") kini diuruskan oleh **Exco KPP**, bukan lagi Exco Akademik.

### 23.1 Aliran Kerja (Dual-Review)

Keputusan mutlak permohonan merit ini adalah di bawah bidang kuasa **Exco Kediaman** memandangkan markah merit mempengaruhi kelayakan asrama. Aliran baharu:

```
1. Kelab Submit → Status: 'pending'
      ↓
2. Exco KPP (Vouch) → Status: 'kpp_vouched' atau 'kpp_not_vouched'
   (Sebagai Supporter/Penyemak Pertama - Menyemak kesahihan aktiviti)
      ↓
3. Exco Kediaman (Lulus) → Status: 'fully_approved' atau 'rejected'
   (Kuasa Mutlak - Meluluskan dan auto-kredit merit kepada peserta)
```

### 23.2 Komponen Panel Review

Sistem ini dikendalikan oleh komponen universal `MeritRasmiReviewPanel.tsx`. 
- **KPP Dashboard (`KppUnitDashboard.tsx`)** memanggil komponen ini dengan `reviewerUnit="KPP"`.
- **Kediaman Dashboard (`KkUnitDashboard.tsx`)** memanggil komponen ini dengan `reviewerUnit="KEDIAMAN"`.

### 23.3 Database Table & Log

| Jadual | Keterangan |
|---|---|
| `merit_program_applications` | Menyimpan permohonan dengan lajur status, `kpp_reviewer_id`, dan `kediaman_reviewer_id`. |
| `merit_review_log` | Merekod sejarah semakan (KPP vouch / Kediaman lulus). |
| `merit_transactions` | Menyimpan transaksi markah merit yang berjaya dimasukkan kepada peserta (`p_src='KELAB'`). |

> **Perhatian Developer:** Fungsi pengiraan (`increment_merit_by_source`) dipanggil secara *Promise.all* batch untuk mengelakkan *sequential blocking* apabila meluluskan kehadiran beramai-ramai.

---

## 24. Prestasi & Optimasasi Kelajuan (Performance Optimization) 🚀

> Ditambah: Mei 2026

Untuk memastikan portal JPP-POLISAS lancar pada peranti "low-end" (contoh: telefon bajet) dan rangkaian perlahan, patuhi prinsip-prinsip berikut:

### 24.1 Larangan Wildcard Import (`lucide-react`)
**JANGAN sesekali** menggunakan wildcard import untuk ikon kerana ia akan memasukkan *keseluruhan 540KB library ikon* ke dalam bundle utama.

```typescript
// ❌ SALAH (Menyebabkan bundle JS gergasi)
import * as LucideIcons from 'lucide-react';
const Icon = LucideIcons['Trophy'];

// ✅ BETUL (Jika nama ikon statik)
import { Trophy, Clock } from 'lucide-react';
const Icon = Trophy;

// ✅ BETUL (Jika nama ikon dinamik dari DB)
import { DynamicIcon } from '@/components/ui/DynamicIcon';
<DynamicIcon name={sport.icon} className="w-5 h-5" />
```
*Gunakan `<DynamicIcon>` untuk ikon yang namanya dipanggil secara dinamik (cth: dari database). Ia akan lazy-load library `lucide-react` secara pintar.*

### 24.2 Pemisahan Bundle Manual (Chunk Splitting)
Konfigurasi `vite.config.ts` telah disetkan dengan `manualChunks` bagi library besar seperti `vendor-react`, `vendor-supabase`, `vendor-radix`, dll. Ini memastikan fail JS dimuat turun secara serentak (parallel) dan dikompres/di-cache secara bebas. Jangan ubah tetapan ini melainkan ada penambahan library gergasi baharu.

### 24.3 Lazy Loading Modul & Modal
Disebabkan JPP mempunyai modul exco yang banyak, elakkan *eager loading*.

```typescript
// ❌ SALAH
import { KamsisApplicationModal } from '@/components/kamsis/KamsisApplicationModal';

// ✅ BETUL (Lazy-load dalam App.tsx)
const KamsisApplicationModal = lazy(() => import('@/components/kamsis/KamsisApplicationModal').then(m => ({ default: m.KamsisApplicationModal })));
```
Semua layout exco dan *global modals* telah ditukar ke `React.lazy()`. Modal global juga diletakkan di dalam `requestIdleCallback` (di `RequireApproval` komponen) supaya ia hanya dirender **selepas** halaman utama portal selesai di-"paint".

### 24.4 Throttling Event Scroll
**JANGAN** panggil logik UI yang berat di dalam `window.addEventListener('scroll')` tanpa throttling, kerana ia akan menyebabkan "jank" (tersangkut) pada peranti murah. Gunakan `requestAnimationFrame` dan `passive: true`.

```typescript
// ✅ BETUL (Contoh Throttling Scroll)
useEffect(() => {
  let ticking = false;
  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 20);
        ticking = false;
      });
      ticking = true;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);
```

### 24.5 Page Transition (Framer Motion)
Elakkan menggunakan `<AnimatePresence mode="wait">` untuk *page routing transition* keseluruhan halaman (seperti dalam `AppLayout.tsx`). `mode="wait"` menghalang rendering komponen baharu sehingga animasi komponen lama tamat, menyebabkan tanggapan "lagging". Gunakan animasi `opacity` pantas (0.15s) dengan `willChange: 'opacity'` untuk "GPU hardware acceleration".

### 24.6 Promise.all untuk API Fetch
Semasa memuatkan Dashboard/Portal, satukan pengambilan data secara "Parallel". Rujuk peraturan 15.2 (Query Frontend). Elakkan N+1 loading dan siri sequential `useEffect` yang mengakibatkan "Waterfall loading".

---

## 25. Modul PolyRider — Sistem Carpool & E-Hailing Kampus 🛵

> Dikemas kini: Mei 2026 (Migrasi ke Realtime WebSockets, Keselamatan Bidaan, + Feature Wave 2: Add-ons, Tip, Counter-Offer, Multi-Stop)

PolyRider merupakan sistem pengangkutan (carpool / e-hailing) khusus untuk kemudahan warga kampus. Ia kini beroperasi menggunakan model **Sistem Pengumpulan & Kelulusan (Gathering & Approval System)** di mana penumpang boleh berkongsi kenderaan (carpool) untuk meminimumkan kos tambang.

### 25.1 Jadual Database Utama

| Jadual | Fungsi |
|---|---|
| `polyrider_jobs` | Menyimpan rekod carpool/perjalanan. Status: `GATHERING`, `CARPOOL_REQUEST`, `PENDING`, `ACCEPTED`, `CANCELLED`, `COMPLETED`. Column tambahan: `addons` (JSONB), `stops` (JSONB), `tip_amount` (NUMERIC) |
| `polyrider_profiles` | Profil pemandu (rider) termasuk butiran kenderaan, nombor plat, dan rating. |
| `polyrider_bids` | Rekod bidaan harga oleh rider. Column tambahan: `counter_amount` (NUMERIC), `counter_status` (TEXT: `PENDING_RIDER`, `ACCEPTED`, `REJECTED`) |
| `polyrider_chats` | Rekod perbualan antara rider dan penumpang dalam sesuatu tugasan. |

### 25.2 Aliran Sistem Carpool (Passenger Flow)

Sistem carpool tidak lagi menggunakan instant-match secara membuta tuli, sebaliknya bergantung kepada "Bilik Carpool":

1. **Buka Bilik (Owner):** Penumpang pertama (Owner) membuka bilik carpool (Status: `GATHERING`).
2. **Mohon Sertai (Passenger):** Penumpang lain yang mencari destinasi sama akan nampak bilik ini dan memohon untuk menyertai (Status: `CARPOOL_REQUEST`).
3. **Kelulusan (Owner):** Owner akan menerima notifikasi dan mempunyai kuasa untuk *Accept* atau *Reject* permohonan tersebut (had maksimum 3 orang penumpang tambahan, menjadikannya 4 termasuk owner, berdasarkan kapasiti kereta standard). Sistem menunjukkan nama dan jantina pemohon untuk tujuan keselamatan.
4. **Kunci & Cari Rider:** Apabila kumpulan penuh atau owner sedia bertolak, owner menekan butang "Tutup Bilik & Cari Rider". Status berubah dari `GATHERING` ke `PENDING`. Semua permohonan yang belum dijawab akan dibatalkan (auto-cancel).
5. **Diterima Rider:** Rider menerima tugasan (Status: `ACCEPTED`). Harga tambang akan dibahagikan secara automatik mengikut jumlah penumpang dalam kumpulan.

### 25.3 RLS & Keselamatan Database (PENTING) ⚠️

Semasa pembangunan, sistem ini mengalami isu *Infinite Recursion* (rujukan kendiri) dalam RLS yang menyebabkan CPU Database memuncak (500 Internal Server Error) dan mematikan API.

**Peraturan Baharu RLS PolyRider:**
- **JANGAN** tulis RLS pada `polyrider_jobs` yang membuat subquery kepada `polyrider_jobs` kembali secara terus.
- **Guna Helper Function:** Kita menggunakan fungsi `SECURITY DEFINER` (seperti `get_my_carpool_group_ids()`) untuk memintas semakan RLS semasa mencari ahli kumpulan secara selamat.
- **Polisi Kumpulan:** *"Carpool group members can view each other"* — membenarkan penumpang melihat satu sama lain untuk tujuan keselamatan dalam UI (Dashboard Rider) tanpa menyebabkan semakan rekursif.

### 25.4 RPCs (Remote Procedure Calls) & State Transitions

Logik transisi carpool dikendalikan sepenuhnya di peringkat database untuk mengelakkan *Race Conditions*:
- `create_polyrider_job`: Inisialisasi bilik carpool baharu. **Kini menerima `p_addons` (JSONB) dan `p_stops` (JSONB) sebagai parameter tambahan.** Surcharge RM0.50/stop dikira secara automatik dalam RPC.
- `lock_polyrider_carpool`: Transisi kumpulan dari `GATHERING` ke `PENDING` secara serentak (atomic update).
- `respond_carpool_request`: Mengendalikan kelulusan (approve/reject). Mempunyai logic lock/check saiz kumpulan supaya tidak melebihi limit secara *concurrent*.

### 25.5 Pengurusan Bidaan & Keselamatan Data (Anti-Spam) ⭐

Sistem PolyRider mempunyai lapisan keselamatan tambahan (*constraints*) di peringkat database untuk mencegah eksploitasi (*spam*) pada fungsi bidaan:
- **`unique_rider_job_bid` Constraint:** Setiap rider hanya dibenarkan membuat HANYA SATU bidaan yang sah untuk sesuatu perjalanan (`job_id`). Sebarang skrip API Postman yang cuba membanjiri sistem dengan ribuan tawaran akan terus ditolak oleh pelayan PostgreSQL dengan ralat *Error 23505*.
- **Indexing (`idx_polyrider_bids_job`):** Sistem *lookup* perhubungan *foreign key* telah dioptimumkan menggunakan *Index* supaya pertanyaan carian harga tidak mengimbas keseluruhan pangkalan data (*Sequential Scans*).

### 25.6 Real-time WebSockets vs API Polling (Optimasasi CPU) 🚀

- **Penghapusan Polling Agresif:** Kaedah asal menggunakan `setInterval` setiap 5–8 saat telah dibuang sepenuhnya. Ini kerana *polling* secara membuta tuli menyebabkan 125+ API calls per saat jika terdapat 1000 pengguna serentak, yang membebankan kapasiti *Server CPU*.
- **Supabase Realtime (`postgres_changes`):** Fail `PolyRiderHome.tsx` dan `PolyRiderDashboard.tsx` kini melanggan kepada *Supabase Realtime WebSockets* untuk jadual `polyrider_jobs`, `polyrider_bids`, dan `polyrider_chats`. Sistem kini berehat 100% pada kadar CPU melainkan ada perubahan terbaharu yang ditolak masuk (push) dari pelayan.
- **Fallback Polling (30 saat):** Sebagai *safety net*, `setInterval(poll, 30000)` digunakan untuk memulihkan sambungan sekiranya WebSocket gagal berfungsi akibat sambungan 4G yang lemah pada peranti pelajar.

### 25.7 Sistem Penjejakan Lokasi GPS Semasa (Live Tracking) 📡

Untuk memastikan keselamatan dan pengalaman pengguna yang lancar, PolyRider menggunakan sistem penjejakan lokasi separa masa nyata (semi-realtime) semasa fasa perjalanan (`ACCEPTED`).

- **Auto-Polling (Rider):** Apabila rider menerima pesanan (`ACCEPTED`), sistem di `PolyRiderDashboard.tsx` akan mula mengambil koordinat GPS (*auto-polling*) setiap **90 saat** secara automatik di latar belakang.
- **Kestabilan Background:** Auto-polling ini di-desain supaya terus berjalan walaupun rider menukar aplikasi (contohnya membuka Waze atau Google Maps). Ia hanya akan berhenti secara automatik apabila status bertukar kepada `ARRIVED` atau ke atas.
- **Fail-Safe Polling:** Permintaan GPS menggunakan *timeout* 15 saat dan mengabaikan ralat secara senyap (*silent fail*) untuk mengelakkan *toast error spam* yang mengganggu pemanduan rider.
- **Paparan Pelajar (Passenger):** Di `PolyRiderHome.tsx`, pelajar akan dipaparkan kad maklumat "Lokasi Rider Semasa" yang mengira jarak proksimiti (menggunakan formula *Haversine*) dan menyediakan pautan terus ke Waze.
- **Pengoptimuman Memori:** Fungsi matematik berat seperti `haversineKm` diletakkan di luar *React render loop* (*module scope*) untuk mengelakkan proses *Garbage Collection (GC)* yang tinggi yang boleh melemahkan peranti tahap rendah (*low-end devices*).

### 25.8 Metodologi Ujian Chat UI (Chat Testing Guidelines)

Bagi UI perbualan (Chat), pengesanan *Sender* dan *Receiver* menggunakan logik pengiraan boolean peribadi: `msg.sender_id === user.id`.

- Jika anda sedang menguji (testing) antara *Rider* dan *Penumpang*, pastikan anda menggunakan **dua akaun (emel) yang berbeza**.
- Jika anda mencuba untuk log masuk dengan **akaun yang sama** di dalam dua tab/telefon yang berbeza (satu bertindak sebagai rider, satu sebagai penumpang), sistem akan mendapati bahawa `sender_id` tersebut milik anda di kedua-dua belah. Oleh itu, sistem akan meletakkan buih sembang (chat bubble) di sebelah **KANAN** (sebagai Penghantar) pada kedua-dua peranti. Ini **bukan satu bug**, tetapi ia tindak balas logikal berdasarkan ID pengguna yang sama.

### 25.9 Add-ons / Keperluan Khas (Maxim-style) 🏷️

> Ditambah: Mei 2026

Penumpang boleh memilih keperluan khas sebelum tempah untuk memberi maklumat kepada rider.

**Constants:** Semua definisi add-on ada dalam `src/lib/polyRiderConstants.ts` (diimport oleh kedua-dua Home & Dashboard).

| Key | Label | Emoji |
|---|---|---|
| `BESAR` | Barang Besar/Berat | 📦 |
| `LEBIH_SEORANG` | Lebih dari 1 Orang | 👥 |
| `HUJAN` | Perlu Perlindungan | ☂️ |

**Storan:** Column `addons JSONB DEFAULT '[]'` dalam `polyrider_jobs`. Dihantar ke RPC sebagai `p_addons` JSON string.

**Peraturan Developer:**
- **JANGAN** tambah add-on baru dalam kod — tambah dalam array `POLYRIDER_ADDONS` di `polyRiderConstants.ts` sahaja. Dashboard rider akan auto-reflect tanpa ubah kod lain.
- Tiada RLS baharu diperlukan — column JSONB diwarisi oleh policy sedia ada.

### 25.10 Sistem Tip Rider (Grab-style) 💰

> Ditambah: Mei 2026

Penumpang boleh memberi tip (RM0.50, RM1.00, atau RM2.00) kepada rider melalui `RatingModal` selepas perjalanan selesai.

**Storan:** Column `tip_amount NUMERIC(8,2) DEFAULT 0` dalam `polyrider_jobs`.

**Aliran:**
1. `RatingModal` papar butang tip pilihan (Tiada / RM0.50 / RM1.00 / RM2.00)
2. `submitRating()` update `tip_amount` dalam satu `.update()` call bersama rating
3. Rider dinotifikasi via `notifyUsers()` jika tip > 0
4. `fetchTodayEarnings()` dalam Dashboard kini include `tip_amount` dalam jumlah pendapatan harian
5. Digital Receipt papar breakdown: Tambang + Tip Rider + Jumlah

**Nota Kepatuhan:**
- Satu `.update()` call sahaja — tiada N+1 (ikut §15.2)
- Tiada Realtime subscription baharu

### 25.11 Counter-Offer / Tawar-Menawar (inDrive-style) 💬

> Ditambah: Mei 2026

Penumpang boleh membalas bidaan rider dengan tawaran balas. Rider pula boleh terima atau tolak.

**Schema:**
```
polyrider_bids.counter_amount  NUMERIC(8,2)  — amaun tawaran balas penumpang
polyrider_bids.counter_status  TEXT          — NULL | 'PENDING_RIDER' | 'ACCEPTED' | 'REJECTED'
```

**Aliran (Passenger Side — PolyRiderHome.tsx):**
1. Setiap bid card ada dua butang: **Terima** (hijau) dan **Tawar Balik** (kuning)
2. Klik "Tawar Balik" → inline input muncul untuk masuk amaun baharu
3. Hantar → `counter_status = 'PENDING_RIDER'` disimpan dalam `polyrider_bids`
4. Rider dinotifikasi untuk respond
5. Bila rider setuju (`ACCEPTED`) → butang "Sahkan" muncul dengan amaun counter untuk acceptance muktamad

**Aliran (Rider Side — PolyRiderDashboard.tsx):**
1. `fetchJobs()` fetch bids dengan `counter_amount` dan `counter_status`
2. Jika `counter_status === 'PENDING_RIDER'` → kad "Pelajar Tawar Balik RM_X" muncul dengan butang Terima/Tolak
3. `respondCounterOffer()` update `counter_status` dan notifikasi penumpang

**Nota Kepatuhan:**
- Counter-offer update guna Realtime channel sedia ada `polyrider_bids` — tiada subscription baharu
- Tiada RLS baharu — `polyrider_bids` policy sedia ada sudah cukup
- **Index:** `idx_polyrider_bids_counter_pending` (partial index, hanya row dengan `counter_status = 'PENDING_RIDER'`)

### 25.12 Multi-Stop / Hentian Tambahan (Grab-style) 🗺️

> Ditambah: Mei 2026

Penumpang boleh tambah **sehingga 3 hentian pertengahan** (multi-stop) dalam satu perjalanan. Surcharge RM0.50 per hentian dikira automatik oleh RPC.

**Storan:** Column `stops JSONB DEFAULT '[]'` dalam `polyrider_jobs`.

**Format JSONB:**
```json
[
  { "name": "ATM Koperasi", "lat": 3.1234, "lng": 101.5678 },
  { "name": "Pejabat HEP", "lat": 3.1240, "lng": 101.5680 }
]
```

**UI (PolyRiderHome.tsx):**
- Butang "Tambah Hentian" muncul di borang tempahan (had 3 hentian)
- Setiap hentian ada `LocationSearchInput` tersendiri dan butang padam (Trash2 icon)
- Surcharge dipaparkan secara real-time: "+RM1.00 surcharge (2 hentian tambahan)"

**Pengiraan Harga (dalam RPC `create_polyrider_job`):**
```sql
v_stop_count  := COALESCE(jsonb_array_length(p_stops), 0);
v_final_price := p_proposed_price + (v_stop_count * 0.50);
```

**Paparan Rider (PolyRiderDashboard.tsx):**
- Stops dipapar dalam job card dengan garis tepi putus-putus kuning
- Format: "Singgah 1: ATM Koperasi", "Singgah 2: Pejabat HEP"

**Nota Kepatuhan:**
- `LocationSearchInput` terima `(result: LocationResult) => void` — gunakan `result.name`, `result.lat`, `result.lng`
- Stops dikembalikan dalam query `polyrider_jobs` sedia ada — tiada fetch tambahan (tiada N+1)

### 25.13 Sistem Langganan Rider & Gantung Tugas (Admin Suspension) 🛑

> Ditambah: Mei 2026

Bagi mengawal selia jumlah pemandu dan mengenakan yuran bulanan (RM10), sistem PolyRider menggunakan model langganan bulanan berasaskan `upsert` dan kawalan akses status secara terus (Direct Status Control).

**Aliran Langganan (Subscription Flow):**
1. Rider baru atau rider yang tamat tempoh wajib memuat naik resit pembayaran yuran pendaftaran/bulanan.
2. Proses pendaftaran menggunakan `.upsert()` pada `polyrider_profiles` untuk menangani senario permohonan semula (mengelakkan ralat *409 Conflict*). Status diset kepada `PENDING`.
3. Admin (Exco KLK) memeriksa pautan `receipt_url` dan meluluskan langganan.
4. Apabila diluluskan, `status = 'APPROVED'`, dan `subscription_valid_until` disetkan ke 30 hari dari tarikh kelulusan.
5. Selepas tamat tempoh, sistem memberi kelonggaran (grace period) selama 3 hari sebelum menyekat rider sepenuhnya.

**Sistem Gantung Tugas (Suspension System):**
1. Admin KLK mempunyai kawalan mutlak untuk menekan **"Gantung Tugas"** pada *dashboard* admin.
2. Tindakan ini menukar `status = 'SUSPENDED'` dan `is_active = false`.
3. Rider dengan status `SUSPENDED`:
   - Dihalang daripada menekan butang ON-DUTY pada Dashboard.
   - Dipaparkan *banner* amaran besar berwarna merah bahawa akaun mereka digantung.
4. Admin boleh menekan **"Sambung Tugas"** untuk memulihkan status rider kembali kepada `APPROVED`.

**Nota Kepatuhan Keselamatan:**
- Logik *blocking* dalam `toggleStatus` wajib dikekalkan untuk menghalang eksploitasi di bahagian klien.
- Maklumat profil rider (termasuk status gantung) dipantau terus tanpa melepaskan data melalui komponen UI secara lemah.

---

## 26. Sistem Auth Loading & PWA Auto-Update — ⚠️ JANGAN ROSAK INI LAGI

> [!CAUTION]
> **Isu berulang — Mei 2026 (kali ke-2 difix):** Loading screen stuck bila buka website / navigate balik ke app. Bug ini muncul semula selepas refactor kerana developer tidak faham senibina tiga-lapisan yang sengaja dibina. **Baca seluruh bahagian ini sebelum sentuh `AuthContext.tsx`, `RouteGuards.tsx`, atau `PwaUpdater.tsx`.**

---

### 26.1 Punca Loading Stuck — Diagnosis

Isu loading stuck berlaku apabila mana-mana satu syarat ini gagal:

| Fail | Simptom | Punca |
|---|---|---|
| `AuthContext.tsx` | `isLoading` kekal `true` selamanya | `safetyTimer` tidak di-cancel bila `onAuthStateChange` dah fire |
| `RouteGuards.tsx` | Loading screen tidak hilang | `minDelayPassed` stuck, atau `isLoading` tidak resolve |
| `onAuthStateChange` vs `initialize()` | Race condition | Dua-dua path cuba set `isLoading=false` secara serentak |

**Root cause paling biasa:** `onAuthStateChange` dan `initialize()` berlumba — `safetyTimer` tidak di-cancel walaupun auth sudah selesai, menyebabkan ia fire lambat dan set loading state yang dah expired.

---

### 26.2 Senibina Tiga-Lapisan Anti-Stuck (JANGAN BUANG)

Sistem ini menggunakan **tiga lapisan** pertahanan supaya loading screen tidak stuck selamanya:

```
Lapisan 1: AuthContext safetyTimer (4 saat)
   ↓ jika gagal (Supabase lambat response)
Lapisan 2: onAuthStateChange cancel timer (serta-merta)
   ↓ jika ada bug logic lain
Lapisan 3: ProtectedRoute hardTimeout (8 saat) → paksa redirect /login
```

#### Lapisan 1 — `AuthContext.tsx`: Safety Timer

```typescript
// ⏱️ SAFETY TIMEOUT: Paksa loading screen hilang selepas 4 saat
let safetyTimerFired = false;
const safetyTimer = setTimeout(() => {
  if (isMounted && !safetyTimerFired) {
    safetyTimerFired = true;
    setIsLoading(false); // ← Force hilang walaupun Supabase lambat
  }
}, 4000);
```

> [!WARNING]
> **JANGAN** naikkan nilai ini ke lebih dari 4 saat. Pengguna di rangkaian perlahan akan stuck selama-lamanya jika nilai terlalu tinggi.

#### Lapisan 2 — `AuthContext.tsx`: Cancel Timer dalam `onAuthStateChange`

```typescript
supabase.auth.onAuthStateChange(async (event, currentSession) => {
  // ✅ KRITIKAL: Cancel safety timer bila auth confirm — tiada race condition
  safetyTimerFired = true;
  clearTimeout(safetyTimer);

  // ... logik auth seterusnya
  setIsLoading(false);
});
```

> [!CAUTION]
> **JANGAN buang `safetyTimerFired = true` dan `clearTimeout(safetyTimer)` ini.** Tanpanya, timer akan fire SELEPAS `onAuthStateChange` sudah selesai dan menyebabkan state update yang tidak dijangka (double-render, flicker, atau blank screen).

#### Lapisan 3 — `RouteGuards.tsx`: Hard Timeout di `ProtectedRoute`

```typescript
// Hard timeout: jika loading stuck selama 8s, paksa redirect ke /login
useEffect(() => {
  if (isLoading) {
    hardTimeoutRef.current = setTimeout(() => {
      navigate('/login', { replace: true }); // ← Last resort
    }, 8000);
  } else {
    clearTimeout(hardTimeoutRef.current);
  }
}, [isLoading, navigate]);
```

Ini adalah jaring keselamatan terakhir. Walaupun `AuthContext` ada bug, pengguna tidak akan stuck di loading screen lebih dari 8 saat.

---

### 26.3 Splash Screen Logic — `sessionStorage` Flag

`ProtectedRoute` dan `PublicRoute` mempunyai splash screen (3 saat) yang **hanya ditunjukkan sekali** per sesi:

```typescript
const hasSeenSplash = sessionStorage.getItem('hz_splash_seen');
if (hasSeenSplash) {
  setMinDelayPassed(true); // Skip splash terus
} else {
  setTimeout(() => {
    setMinDelayPassed(true);
    sessionStorage.setItem('hz_splash_seen', 'true');
  }, 3000);
}
```

**Kenapa penting:** Tanpa flag ini, setiap kali user navigate antara page, mereka akan nampak splash screen 3 saat setiap kali — sangat annoying. Flag `sessionStorage` memastikan splash hanya sekali per tab/sesi.

> [!NOTE]
> `sessionStorage` (bukan `localStorage`) digunakan dengan sengaja — flag hilang bila tab ditutup, supaya Cold Boot PWA baru sentiasa dapat splash screen.

---

### 26.4 Sistem PWA Auto-Update — Senibina

Fail: `src/components/PwaUpdater.tsx`

#### Pemicu Update (4 cara):

| Pemicu | Kekerapan | Keterangan |
|---|---|---|
| **Startup (cold start)** | **Serta-merta (1s delay)** | `setTimeout(r.update, 1000)` dalam `onRegistered` — menutup blind spot |
| Interval berkala | Setiap **5 minit** | `setInterval` dalam `onRegistered` |
| Tab visibility change | Bila user fokus balik ke tab | `document.visibilitychange` |
| Reconnect dari offline | Bila internet pulih | `window.online` event |
| Route navigation | Setiap tukar halaman | `useEffect([location.pathname])` |

#### Strategi Auto-Reload:

```typescript
// Halaman selamat untuk auto-reload tanpa tanya
const SAFE_AUTO_RELOAD_PATHS = ['/', '/portal', '/jpp', '/polymart', ...];

if (isSafeToAutoReload(currentPath)) {
  updateServiceWorker(true); // ← Auto-reload terus, user tak perasan
} else {
  toast(...); // ← Tanya user dulu (ada borang aktif)
}
```

> [!IMPORTANT]
> **JANGAN** tukar interval `setInterval` ke lebih dari 5 minit (300,000ms). Sebelum ini ia 1 jam — menyebabkan pelajar guna versi lama seharian walaupun dah ada update di server.

> [!WARNING]
> **JANGAN** buang `updateCalledRef` guard. Tanpanya, `updateServiceWorker(true)` akan dipanggil berkali-kali dalam satu render cycle dan menyebabkan reload loop yang tidak henti.

#### Cara tambah halaman ke `SAFE_AUTO_RELOAD_PATHS`:

Tambah path baharu ke dalam array `SAFE_AUTO_RELOAD_PATHS` dalam `PwaUpdater.tsx` **HANYA jika halaman tersebut tidak ada borang aktif yang boleh hilang data bila reload**. Contoh yang **TIDAK** selamat: halaman borang permohonan asrama, borang laporan, checkout PolyMart.

---

### 26.5 Senarai Semak — Sebelum Ubah Fail Auth/Loading

```
AuthContext.tsx:
  [ ] safetyTimer masih 4000ms (atau lebih rendah)
  [ ] safetyTimerFired = true ADA dalam onAuthStateChange
  [ ] clearTimeout(safetyTimer) ADA dalam onAuthStateChange
  [ ] setIsLoading(false) dipanggil dalam finally block initialize()
  [ ] setIsLoading(false) dipanggil di akhir onAuthStateChange handler

RouteGuards.tsx:
  [ ] ProtectedRoute ada hardTimeoutRef dengan 8000ms
  [ ] hardTimeout di-cancel apabila isLoading jadi false
  [ ] sessionStorage 'hz_splash_seen' flag masih ada dan digunakan

PwaUpdater.tsx:
  [ ] setInterval dalam onRegistered TIDAK lebih dari 5 minit (300,000ms)
  [ ] visibilitychange listener ADA dan trigger r.update()
  [ ] window.online listener ADA dan trigger r.update()
  [ ] useEffect([location.pathname]) ADA untuk semak update bila navigate
  [ ] updateCalledRef guard ADA untuk elak double-call
  [ ] SAFE_AUTO_RELOAD_PATHS ada semua halaman utama (bukan halaman borang)
```

---

*Ditambah: Mei 2026 — Selepas isu loading stuck berlaku buat kali ke-2. Semoga kali ini kekal.*


---


## 13. Piawaian UI/UX Mudah Alih & Hierarki Z-Index

Bagi mengekalkan ciri 'Native-App Feel' dan mengelakkan pertindihan visual (UI overlap) pada peranti mudah alih, kod UI harus mematuhi hierarki Z-Index dan amalan prestasi berikut:

### Hierarki Z-Index Global
Semua komponen utama mestilah dipetakan mengikut lapisan Z-Index yang ketat ini (Dari Bawah ke Atas):

1. **z-[0] hingga z-[40]**: Kandungan halaman biasa dan elemen terapung tahap rendah.
2. **z-[112]**: BottomNav (Bar Navigasi Bawah Mudah Alih).
3. **z-[120]**: FloatingAiChat (Butang Terapung AI Nexus).
4. **z-[130]**: Backdrop (Latar gelap) untuk mana-mana Sidebar Modul (JPP, KLK, Kebajikan, dll).
5. **z-[140]**: Sidebar (Kandungan sebenar menu navigasi tepi). *Ini memastikan Sidebar yang ditarik dari tepi sentiasa menutup BottomNav.*
6. **z-[999]**: Semua Pop-out Shadcn (Drawer, Dialog, Sheet, AlertDialog). *Ini memastikan sebarang tetingkap timbul sentiasa berada di atas komponen susun atur.*
7. **z-[9999]**: Notifikasi eact-hot-toast (ditetapkan ke 	op-center) dan Penunjuk Mod Luar Talian (OfflineIndicator).

### Prestasi Navigasi (Mobile Performance)
- **Elakkan React State untuk Scroll**: Gunakan Manipulasi DOM secara terus (
avRef.current.classList.add) untuk kesan scroll (seperti Hide/Shrink BottomNav) bagi menjimatkan kitaran *re-render* dan menjaga kelancaran 60 FPS pada peranti spesifikasi rendah.
- **Fat Finger Rule**: Apabila mengecilkan (shrink) saiz butang, jangan gunakan scale yang terlalu kecil. Had yang ideal adalah scale-[0.85] untuk memastikan ia kekal mesra-ibujari.
- **Haptic Feedback**: Panggil `navigator.vibrate(30)` untuk tindakan mikro (micro-interactions) bagi memberi rasa mekanikal/premium (cth: klik FAB atau besarkan navigasi).

---

## 17. Senibina Modul PolyRider (Carpooling & Keselamatan) 🚗

> Ditambah: Mei 2026

Modul PolyRider merupakan sistem *ride-hailing* (e-hailing) kampus yang menghubungkan pelajar (penumpang) dengan pelajar lain yang mempunyai kenderaan (rider). Sistem ini dibina dengan mengutamakan kelajuan (*realtime*) dan keselamatan.

### 17.1 Senibina Real-Time (Supabase Channels)
Bagi mengekalkan prestasi dan mengelakkan isu *database CPU spike*, semua operasi yang memerlukan kemas kini pantas kini menggunakan **Supabase Realtime Channels** berbanding *polling* (`setInterval`).
- **Penjejakan Status:** Jadual `polyrider_jobs` dipantau melalui *channel* untuk mendengar perubahan status (`ACCEPTED`, `ARRIVED`, `IN_TRANSIT`, `COMPLETED`).
- **Sistem Bidaan (Bidding):** Perubahan pada jadual `polyrider_bids` didengari secara langsung.
- **AMARAN:** Sentiasa bersihkan memori dengan memanggil `supabase.removeChannel(channel)` di dalam blok `return () => {}` bagi `useEffect` untuk mengelakkan kebocoran memori (memory leak).

### 17.2 Protokol Keselamatan & SOS (Sangat Penting)
Keselamatan penumpang adalah keutamaan.
- **Tetapan Pengesanan GPS & Auto-Polling:** Fungsi `navigator.geolocation.getCurrentPosition` mesti mempunyai `enableHighAccuracy: true`, `timeout: 15000` (15 saat), dan `maximumAge: 0`. Berdasarkan ujian, *timeout* 5 saat terlalu singkat untuk telefon pintar menangkap lokasi tepat. Sistem juga melaksanakan **Auto-Polling setiap 90 saat** semasa fasa `ACCEPTED` supaya lokasi dikemas kini berterusan di latar belakang, membolehkan pelajar memantau ketibaan rider. Ralat GPS sewaktu auto-polling diabaikan (*silent fail*) bagi mengelakkan gangguan UI pemandu.
- **Trigasi SOS:** Butang "Swipe to SOS" akan mengemas kini status pekerjaan ke `EMERGENCY` dan terus merekod log dalam `polyrider_sos_logs`.
- **Notifikasi SOS:** Emel amaran secara automatik dihantar kepada ahli JPP unit KLS menggunakan fungsi `notifyKLKOnSuspension()` (melalui *Resend API*).
- **Penolakan Prank/Khianat:** Jika Exco KLK menandakan isyarat SOS sebagai `FALSE_ALARM`, akaun pemanggil (pelajar atau rider) akan digantung secara automatik selama 24 jam. Ini diuruskan oleh *RPC* `cancel_polyrider_job`.

### 17.3 Algoritma Bidaan & Anti-Spam
Sistem harga berasaskan "bidaan" (*bidding*). Penumpang meletakkan harga permulaan, rider boleh terima atau tawar harga baharu.
- **Anti-Spam (Pembatalan Berulang):** Sekiranya seorang penumpang atau rider membatalkan pesanan berturut-turut sebanyak lebih daripada 4 kali dalam tempoh 1 jam, akaun mereka akan digantung selama 24 jam. Ini disemak secara langsung dalam pangkalan data melalui fungsi RPC `cancel_polyrider_job`.
- **Integriti Data:** `polyrider_bids` mempunyai kunci unik untuk memastikan *race conditions* tidak berlaku jika dua rider membida pesanan yang sama serentak. Indeks `idx_polyrider_bids_job` diletakkan untuk menggantikan kos mengimbas jadual (*table scan*).

### 17.4 Hubungi JPP & Laporan Ralat
Disebabkan kritikalnya sistem PolyRider (melibatkan pergerakan fizikal pelajar), satu **Floating Action Button (Menu Kenalan JPP)** sentiasa dipaparkan.
1. **Lapor Ralat (Tech Support):** Menghala terus ke nombor pembangun (*developer*) sistem PolyRider (+601139413699).
2. **Admin PolyRider (Exco KLK):** Menghala terus ke nombor rasmi unit KLK (Keselamatan & Lalu Lintas) melalui `system_settings` (`klk_emergency_phone`).

**JANGAN buang atau sembunyikan butang ini** pada peranti mudah alih memandangkan sebarang masalah sistem berpotensi mengakibatkan pelajar terkandas di sekitar kampus.

---

## 18. Antaramuka Pengguna (UI) iMaps & Pengurusan Zon 🗺️

> Ditambah: Mei 2026

Modul iMaps pada asalnya memaparkan semua bangunan secara serentak yang mengakibatkan UI menjadi sangat padat (cluttered), terutamanya di kawasan yang banyak bangunan seperti Jabatan Akademik atau Kamsis. 

### 18.1 Sistem Pengelompokan Zon (Zone Grouping)
- **Konsep:** Bangunan kini boleh dikelompokkan menggunakan medan `zone_name`. 
- **Dynamic Map Clustering:** Di dalam `IMapsPage.tsx`, peta menggunakan logik skala *zoom* untuk memutuskan sama ada memaparkan label kumpulan (contoh: "JKE") atau label bangunan individu.
- **Skala Zoom:** Skala penanda aras diletakkan pada `< 19` (`mapZoom < 19`). Ini bermakna kumpulan (zon) akan kekal dipaparkan walaupun pengguna telah mula *zoom in* (skala 16, 17, dan 18). Hanya pada tahap *zoom* maksimum (skala 19), barulah label berpecah kepada bangunan individu.
- **Sidebar Terkategori:** Menu Eksplorasi (Explore Sidebar) kini menggunakan reka bentuk **Accordion Bertab**. 
  - **Tab Akademik/Blok:** Menghimpunkan bangunan mengikut `zone_name`. Bangunan tanpa zon akan dipaparkan secara tunggal di bawah senarai.
  - **Tab Fasiliti Utama:** Menghimpunkan bangunan mengikut jenis fasiliti (`facility_type`) seperti "Kafe", "Surau", dsb.
- **Penyembunyian Bersyarat (Conditional Visibility):** Fasiliti berkapasiti kecil dan banyak seperti "Tandas" disembunyikan daripada peta secara lalai bagi mengelakkan kesesakan visual (*clutter*). Penanda hanya muncul sekiranya pengguna menekan butang *filter* "Tandas" di bar navigasi.

### 18.2 Input Auto-Saran (Datalist) untuk Admin
Bagi memastikan kelancaran logik pengelompokan (grouping) dan klasifikasi fasiliti, pentadbir tidak boleh melakukan kesilapan ejaan (contohnya: terbuat "Jke" dan "JKE " atau "Cafe" dan "Kafe").
- **Penyelesaian:** Modul Admin iMaps (`JppImapsAdmin.tsx`) menggunakan elemen asli HTML `<datalist>` untuk medan `zone_name` dan `facility_type`.
- Apabila admin klik pada ruang input, senarai cadangan (diambil secara dinamik dari pangkalan data sedia ada) akan terpapar.
- Titik merah (`CircleMarker`) juga ditambah ke dalam Peta Admin untuk memudahkan admin melihat lokasi bangunan sedia ada bagi mengelakkan pertindihan data (*double-entry*).

### 18.3 Pemilihan Bangunan (Admin UI)
- **Input Asal:** Dropdown <select> biasa yang menjadi sangat meleret.
- **Naik Taraf (Datalist):** Ditukar menggunakan <input> bersama <datalist>. Pentadbir kini boleh *type-to-search* nama bangunan atau kod bangunan. Sistem akan secara proaktif menterjemahkan teks yang dipadankan kepada uilding_id di sebalik tabir.
