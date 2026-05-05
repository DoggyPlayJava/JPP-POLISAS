# JPP-POLISAS — Panduan Pembangunan (Dev Guideline)

> **Baca dokumen ini terlebih dahulu sebelum membuat sebarang perubahan.**
> Dikemas kini: April 2026

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

## 15. Sistem Kohort Pelajar POLISAS ⭐

> Ditambah: April 2026

Sistem kohort membolehkan pegawai JPP mengenal pasti tahap pengajian dan program pelajar (Junior/Senior/Asasi) dan menapis ahli mengikut program atau semester dengan mudah.

### 14.1 Medan Database (`profiles`)

| Kolum | Jenis | Penerangan |
|---|---|---|
| `programme_code` | `TEXT` | Kod program: `DEE`, `DTK`, `DEP`, `DAD`, `DKM`, `DSB`, `DKA`, `DGU`, `DTM`, `DMH`, `DAT`, `DSK`, `DLS`, `DBS`, `FTV` |
| `intake_year` | `SMALLINT` | Tahun pengambilan: 2020–2026 |
| `intake_period` | `SMALLINT` | `1` = Intake Pertama (Pertengahan Tahun, ~Julai) \| `2` = Intake Kedua (Awal Tahun, ~Januari) |
| `semester_override` | `SMALLINT` | Pembetulan manual semester. `NULL` = guna kiraan auto |

> **Nota:** Semua kolum adalah `NULLABLE`. Staf (`STAFF`, `SUPER_ADMIN_JPP`, `ADMIN`) dikecualikan daripada pengisian data kohort.

### 14.2 Konfigurasi Sistem (`system_settings`)

| Key | Jenis | Nilai Lalai | Maksud |
|---|---|---|---|
| `intake_1_month` | `INT` | `7` (Julai) | Bulan mula Intake Pertama |
| `intake_2_month` | `INT` | `1` (Januari) | Bulan mula Intake Kedua |
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

Realtime:
  [ ] Tiada Realtime subscription baru dalam komponen global/layout/sidebar
  [ ] Semua subscription ada cleanup (return () => channel.unsubscribe())
  [ ] Pertimbangkan polling via visibilitychange sebagai alternatif

Notifikasi:
  [ ] INSERT notification untuk orang lain hanya dalam komponen JPP/admin
  [ ] Student hanya insert notification untuk diri sendiri (user_id = auth.uid())
```

---

*Dikemas kini: April 2026 — Selepas audit prestasi Musim Orientasi.*

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
