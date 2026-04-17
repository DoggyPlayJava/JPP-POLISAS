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
│   ├── JppAdminPage.tsx       ← Global JPP Dashboard (/jpp-admin) — 3000+ baris
│   ├── AktivitiFull.tsx       ← Pengurusan aktiviti e-KPP
│   ├── LaporanPage.tsx        ← Submit laporan
│   ├── SemakanLaporanPage.tsx ← Semak & luluskan laporan (Admin/Penasihat)
│   ├── NexusPage.tsx          ← Nexus AI Hub standalone
│   ├── PortalPage.tsx         ← Portal hub (pilih exco)
│   ├── DashboardPage.tsx      ← Dashboard utama e-KPP
│   └── keusahawanan/          ← Modul e-Keusahawanan (ada layout sendiri)
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
├── hooks/
│   ├── useAiAssistant.ts     ← Hook Gemini AI (callAi + sendChatMessage)
│   ├── useDashboardData.ts   ← Fetch data dashboard
│   ├── useReports.ts         ← Fetch dan urus laporan
│   └── useJppExcoUnits.ts    ← Fetch unit exco JPP
│
├── lib/
│   ├── supabase.ts           ← Supabase client singleton + Profile interface + createLog()
│   ├── driveUpload.ts        ← ⚠️ Hybrid storage: images → Supabase, PDF → Google Drive
│   ├── cache.ts              ← Caching utility
│   ├── utils.ts              ← cn(), helper functions
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
VITE_SUPABASE_URL=https://ujklcxfbmmzxsqtidjtz.supabase.co
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
| `src/types/index.ts` | Type contracts. ALL_CLUBS, constants |
| `src/pages/jpp/jppConfig.ts` | Config semua unit exco JPP. `isActive: false` = unit tersembunyi. `moduleLink` menentukan destinasi klik sidebar |
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

## 14. Sistem Kohort Pelajar POLISAS ⭐

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
