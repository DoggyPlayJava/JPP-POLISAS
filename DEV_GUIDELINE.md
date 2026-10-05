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
│   │   ├── JppFoodBankAdmin.tsx ← Pusat Kawalan Pentadbir Food Bank JPP (/jpp/foodbank)
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
│   ├── ems/                   ← Modul EMS (Event Management System)
│   └── karnival/              ← Modul Karnival (sistem undian & booth)
│
├── components/
│   ├── RouteGuards.tsx        ← ProtectedRoute, PublicRoute
│   ├── ai/                   ← FloatingAiChat, komponen AI
│   ├── ems/                  ← Templat E-Sijil & komponen EMS
│   ├── layout/               ← AppLayout, Sidebar, BottomNav
│   ├── portal/               ← Komponen Portal Super App (SuperAppHeader, CampusServicesGrid, Carousel, Feeds, dll)
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
│   ├── superAppHelpers.ts    ← Konfigurasi & utiliti pembantu portal Super App (greetings, feeds, badges)
│   ├── utils.ts              ← cn(), helper functions
│   ├── generateLaporanDocx.ts← Penjana dokumen DOCX laporan
│   ├── polymaps360Data.ts    ← Pangkalan data 28 bangunan & 200+ bilik 360° terverifikasi (Norman POLISAS)
│   ├── foodbankDefaults.ts   ← Fallback data dan barangan lalai Food Bank JPP
│   ├── email.ts              ← Email dispatch via Express server
│   └── report-utils.ts       ← Utility untuk laporan
│
├── types/
│   └── index.ts              ← Type definitions, role constants, ALL_CLUBS, JPP_MT_POSITIONS
│
└── config/
    └── excoModules.ts        ← Config modul exco (nama, warna, route, aktif/tidak)
```

### 2.1 Piawaian Reka Bentuk UI/UX & Token Tema Digital Flagship (Hybrid Precision-Editorial)

Bagi memastikan JPP-POLISAS mencapai kualiti produk taraf flagship antarabangsa tanpa kelihatan seperti "AI Slop" generik:

1. **Palet Warna Institusi Teguh (Locked Color Tokens):**
   - **Royal Maroon:** `hsl(0 78% 29%)` / `#831010` (Elemen utama, border fokus, tindakan kepimpinan rasmi).
   - **Refined Brass / Gold:** `hsl(43 78% 46%)` / `#D4A017` (Lencana anugerah, penunjuk merit, sorotan pencapaian).
   - **Latar Belakang Bersih:** Mod gelap menggunakan Neutral Deep Slate `#0A0202` / `slate-950` yang jitu, manakala mod terang menggunakan `#F8FAFC` bersih.
   - **Tiada Warna Neon Berkonflik:** Menghapuskan ungu cerah terpencil (`bg-purple-600`) dan warna chameleon yang tidak seragam merentasi navigasi dan modul.

2. **Tipografi & Hirarki Kandungan:**
   - Menggunakan sistem susunan fon natif berprestasi tinggi (`Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif`).
   - Larangan teks berbalut melampau (banned 6-line awkward wraps); menggunakan `max-w-2xl` atau `max-w-3xl` dengan *leading-relaxed*.

3. **Prinsip Anti-Slop (Strict Anti-Patterns):**
   - **Sifar Mockup Pelayar Palsu:** Menghapuskan div palsu bertingkap tiga butang merah/kuning/hijau (*fake browser chrome*). Sebaliknya paparkan antaramuka interaktif sebenar.
   - **Pencegahan Kebutaan Banner (Banner Blindness):** Menggabungkan banner berturut-turut yang memakan ketinggian melebihi 600px ke dalam satu `PortalNotificationCenter` kompak (72-80px) dengan navigasi bertitik dan tindakan terus.
   - **Hirarki Tindakan Kemas:** Pada setiap kad acara EMS, elakkan timbunan 10 butang berwarna-warni. Gunakan butang tindakan utama ("Urus Acara & Skor") bersama dropdown menu bagi fungsi pengurusan lain.

4. **Fizik Interaksi & Prestasi Skrol:**
   - Navigasi terapung dan bar status wajib menggunakan `useScroll` daripada `framer-motion` dan bukan event listener manual `window.addEventListener('scroll')` bagi mengelakkan kebocoran memori dan jank susun atur.

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
| `profile_edit_requests` | Permintaan pindaan data profil pelajar (no. matrik & semester) |
| `clubs` | Senarai kelab & persatuan |
| `student_club_memberships` | Keahlian per-kelab (role varies per club) |
| `club_activities` | Aktiviti kelab |
| `club_reports` | Laporan bulanan kelab |
| `club_logs` | Audit log semua tindakan kelab |
| `admin_audit_logs` | Log audit semua tindakan admin / exco JPP secara terpusat |
| `jpp_mt_assignments` | MT yang oversee unit exco tertentu |
| `keusahawanan_businesses`| Profil perniagaan e-Keusahawanan pelajar |
| `student_business_memberships`| Keahlian & hirarki perniagaan pelajar (role: `OWNER`/`MEMBER`, status: `PENDING`/`ACTIVE`/`REJECTED`)|
| `ai_usage_logs` | Rekod penggunaan AI Nexus |
| `notifications` | Notifikasi dalam app |
| `polysuara_comments` | Ulasan/komen rahsia Tier-1 & Tier-2 bagi PolySuara |
| `polysuara_comment_votes` | Log undian upvote/downvote ulasan PolySuara |
| `polysuara_comment_reports` | Laporan penyalahgunaan ulasan PolySuara oleh pelajar |
| `polysuara_notif_optout` | Rekod pilihan keluar (opt-out) notifikasi PolySuara |
| `ems_events` | Modul EMS — Maklumat acara (COMPETITION, OPEN_AUDIENCE, HYBRID) |
| `ems_form_fields` | Modul EMS — Borang pendaftaran dinamik per-acara |
| `ems_participants` | Modul EMS — Pendaftaran peserta (individu/pasukan, media, status check-in) |
| `ems_jury_codes` | Modul EMS — Kod laluan (passcode) & tugasan juri |
| `ems_rubrics` | Modul EMS — Kriteria & wajaran rubrik pemarkahan |
| `ems_scores` | Modul EMS — Markah penilaian & ulasan juri |
| `ems_certificates` | Modul EMS — Rekod sijil digital, nombor siri & QR verifikasi |
| `ems_visitors` | Modul EMS — Kehadiran pengunjung audience & pemenang cabutan bertuah |

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
| `ThemeContext` | `useTheme()` | Dark/light mode, toggle (Lalai global: Light mode) |
| `AiSettingsContext` | `useAiSettings()` | Tetapan AI (concise mode, model pilihan) |
| `KarnivalContext` | `useKarnival()` | State undian karnival |
| `ExcoThemeContext` | `useExcoTheme()` | Warna exco aktif untuk theming |
| `SupsasContext` | `useSupsas()` | Data edisi, kontingen, sukan, fixtures, medal tally SUPSAS |
| `JppConfigContext` | `useJppConfig()` | Konfigurasi portal JPP (tetapan, feature flags) |
| `useDevicePerformance` | `useDevicePerformance()` | Pengesanan pasif spesifikasi peranti (`<=4` teras CPU, `<=4GB` RAM) untuk tiering prestasi & CSS `.low-perf-device` |

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
| `final_schema.sql` | Consolidated database schema. Golden source to recreate database from scratch |
| `DATABASE_BLUEPRINT.md` | Comprehensive database architecture blueprint and Dual-RBAC documentation |
| `src/contexts/AuthContext.tsx` | Seluruh RBAC sistem. Bug di sini = security hole |
| `src/lib/supabase.ts` | Client singleton. Jangan buat instance baru |
| `src/lib/driveUpload.ts` | Routing storan hibrid. Silap = data tersalah simpan |
| `src/lib/notifications.ts` | Helper notifikasi. Guna ini — jangan `.insert()` terus tanpa ikut polisi RLS |
| `src/lib/keusahawanan.ts` | Helper pendaftaran automatik perniagaan Siswapreneur EMS & auto-archive |
| `src/types/index.ts` | Type contracts. ALL_CLUBS, constants |
| `src/pages/jpp/jppConfig.ts` | Config semua unit exco JPP. `isActive: false` = unit tersembunyi. `moduleLink` menentukan destinasi klik sidebar |
| `src/store/useNotificationStore.ts` | Zustand store. Guna atomic selector — jangan destructure keseluruhan store |
| `src/components/exco/ExcoAktivitiPage.tsx` | **Template universal** aktiviti exco — jangan duplicate logik ini |
| `src/components/exco/ExcoLaporanPage.tsx` | **Template universal** laporan exco — gunakan semula untuk semua unit |
| `src/components/exco/ExcoSemakanLaporanPage.tsx` | Panel semakan MT — satu komponen untuk semua unit |
| `src/components/ui/PromptDialog.tsx` | Pengganti standard accessible modal untuk `window.prompt` dan `window.confirm`. Mengelakkan sekatan pelayar moden |
| `src/components/portal/PortalNotificationCenter.tsx` | Pusat notifikasi portal bersepadu untuk KAMSIS, Karnival, SUPSAS, dan MAKMP menggantikan banner bertindih |
| `src/pages/PortalPage.tsx` | Entry portal utama. Mengintegrasikan Campus Super App dan modul rasmi Exco |
| `src/lib/superAppHelpers.ts` | Kontrak pembantu & konfigurasi 8 servis teras, ucapan harian dan pengiraan kempen Super App |
| `src/components/portal/SuperAppHeader.tsx` | Header pintar Super App berorientasikan gaya hidup pelajar kampus |
| `supabase/migrations/` | Database schema history. Jangan edit migration lama |
| `Dockerfile` | Konfigurasi kontena pengeluaran. Buka jalan keluar daripada overhead Nixpacks yang menyebabkan Coolify sangkut/timeout |


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

### 14.5 Pangkalan Data & Polisi Keselamatan push_subscriptions
Jadual `push_subscriptions` digunakan untuk menyimpan token Push Notification bagi peranti pelajar. Jadual ini tertakluk kepada kawalan keselamatan dan keperluan indeks berikut:
- **Indeks Unik (user_id, endpoint)**: Wajib dipasang (`push_subscriptions_user_endpoint_idx`) bagi menyokong sintaks `ON CONFLICT (user_id, endpoint)` semasa melakukan `upsert` daripada frontend.
- **Indeks Kunci Asing (user_id)**: Wajib dipasang (`push_subscriptions_user_id_idx`) ke atas lajur kunci asing yang merujuk kepada `profiles(id)`.
- **Polisi RLS (Row Level Security)**:
  - **SELECT**: Menggunakan `(SELECT auth.uid()) IS NOT NULL` bagi membolehkan mana-mana pengguna berdaftar memanggil utiliti client-side untuk membaca token peranti bagi menghantar push notification.
  - **INSERT / UPDATE / DELETE**: Dihadkan hanya kepada pemilik rekod (`user_id = (SELECT auth.uid())`) atau mana-mana pentadbir dengan peranan `SUPER_ADMIN_JPP`, `ADMIN`, atau `JPP`.

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

### 15.8 Pengoptimuman Peranti Rendah (Low-End Devices) & PWA Caching ⭐ WAJIB BACA

Bagi mengelakkan isu kelambatan (frame drops, laggy scroll, memory spikes) pada telefon berspesifikasi rendah (e.g. 2-4GB RAM, 4 CPU cores):

1. **PWA Precache Tuning (`vite.config.ts`):**
   - Hanya shell teras (~3MB) di-precache dalam SW manifest awal.
   - Pustaka berat seperti `@react-pdf/renderer`, `exceljs`, `heic2any`, `pdfjs`, `html5-qrcode` mesti diabaikan (`globIgnores`) daripada precache awal dan di-cache atas permintaan (on-demand runtime caching) melalui `lazy-assets-cache` dalam `src/sw.ts`.

2. **Pengesanan Pasif Spesifikasi Peranti (`useDevicePerformance`):**
   - Hook `useDevicePerformance` mengesan `hardwareConcurrency <= 4` atau `deviceMemory <= 4GB`.
   - Mengaktifkan kelas `.low-perf-device` pada `<html>` yang secara automatik mematikan offscreen `backdrop-filter: blur(...)` dan `mix-blend-*` render passes.

3. **Scoping Provider Tempatan (Jangan Letak di Root):**
   - Modul khusus seperti `KarnivalProvider` atau `SupsasProvider` **TIDAK BOLEH** dibungkus pada root `App.tsx`.
   - Bungkus hanya pada sub-route berkaitan (`/karnival/*` atau `/supsas/*`) untuk mengelakkan 3-6 query automatik berjalan pada setiap muat halaman biasa.
   - Gunakan hook status ringan (seperti `useKarnivalStatus()`) untuk komponen global seperti `Sidebar`.

4. **Zero-Jank Touch (`GlobalPullToUpdate.tsx`):**
   - Dilarang membuat traversal rekursif DOM dengan `window.getComputedStyle(el)` pada event `touchstart`.
   - Hanya pasang listener `touchmove` (`passive: false`) secara dinamik apabila pengguna berada di bahagian atas sekali (`window.scrollY <= 0`).

5. **Dynamic Imports untuk Export Heavy Libraries:**
   - Semua fungsi jana laporan PDF atau Excel mesti menggunakan dynamic `await import('@react-pdf/renderer')` atau `await import('exceljs')` di dalam event handler, bukan `import` statik di atas fail.

---

*Dikemas kini: Ogos 2026 — Pengoptimuman Prestasi Rendah & PWA Precache.*

---

## 16. Modul PolyMart — Marketplace Pelajar

> Route prefix: `/polymart/*` | Layout: `src/pages/polymart/PolyMartLayout.tsx`

PolyMart adalah marketplace dalam-app untuk pelajar POLISAS menjual dan membeli produk/perkhidmatan sesama sendiri.

> [!NOTE]
> **Mei 2026 — Integrasi PolyRider telah DIPUTUSKAN.** Modul PolyRider masih wujud secara berasingan, tetapi semua rujukan PolyRider (polyrider_jobs query, butang "Panggil Rider", Bike import) telah dibuang dari semua halaman PolyMart.

### 16.1 Jadual Database

| Jadual | Fungsi |
|---|---|
| `polymart_ads` | Iklan/listing produk oleh vendor |
| `polymart_orders` | Pesanan pembeli (status: `PENDING`→`CONFIRMED`→`READY`→`COMPLETED`/`CANCELLED`) |
| `polymart_reports` | Laporan aduan terhadap iklan |
| `polymart_reviews` | Ulasan pembeli selepas transaksi selesai |
| `polymart_conversations` | Sesi perbualan sembang antara pembeli dan vendor perniagaan |
| `polymart_messages` | Mesej dalam perbualan sembang polymart |
| `polymart_wishlist` | Senarai hajat produk pilihan pembeli |

#### Lajur Pembayaran Baru (Migration `52_polymart_online_payment.sql`)

| Jadual | Lajur Baru | Jenis | Fungsi |
|---|---|---|---|
| `keusahawanan_businesses` | `online_payment_enabled` | `BOOLEAN DEFAULT false` | Aktifkan QR payment |
| `keusahawanan_businesses` | `cod_enabled` | `BOOLEAN DEFAULT true` | Aktifkan COD |
| `keusahawanan_businesses` | `payment_qr_url` | `TEXT` | URL gambar QR pembayaran |
| `keusahawanan_businesses` | `payment_instructions` | `TEXT` | Arahan bank/pembayaran |
| `keusahawanan_businesses` | `business_phone` | `TEXT` | No. telefon perniagaan |
| `keusahawanan_businesses` | `payment_deadline_value` | `INT DEFAULT 24` | Nilai had masa pembayaran |
| `keusahawanan_businesses` | `payment_deadline_unit` | `TEXT DEFAULT 'HOURS'` | Unit had masa (`HOURS`/`DAYS`/`WEEKS`) |
| `business_products` | `online_payment_enabled` | `BOOLEAN DEFAULT NULL` | Override per-produk (NULL=ikut perniagaan) |
| `polymart_orders` | `payment_method` | `TEXT DEFAULT 'COD'` | Kaedah pembayaran (`COD`/`QR_ONLINE`) |
| `polymart_orders` | `payment_receipt_url` | `TEXT` | URL resit pembayaran |
| `polymart_orders` | `payment_receipt_rejected` | `BOOLEAN DEFAULT false` | Resit ditolak oleh vendor |
| `polymart_orders` | `payment_verified_at` | `TIMESTAMPTZ` | Masa pengesahan bayaran |
| `polymart_orders` | `payment_verified_by` | `UUID` | Vendor yang sahkan bayaran |
| `polymart_orders` | `payment_deadline_at` | `TIMESTAMPTZ` | Had masa auto-cancel |

#### Ciri Promosi, Pra-Tempahan & Pembatalan (Mei 2026 Updates)

| Jadual | Lajur Baru | Jenis | Fungsi |
|---|---|---|---|
| `business_products` | `image_urls` | `TEXT[] DEFAULT '{}'` | Sokongan berbilang gambar produk |
| `business_products` | `sale_price` | `DECIMAL(10,2)` | Harga jualan promosi / kilat (flash sale) |
| `business_products` | `sale_start_at` | `TIMESTAMPTZ` | Tarikh/masa mula promosi |
| `business_products` | `sale_end_at` | `TIMESTAMPTZ` | Tarikh/masa tamat promosi |
| `business_products` | `is_preorder` | `BOOLEAN DEFAULT false` | Status produk pra-tempah (pre-order) |
| `business_products` | `preorder_deadline` | `TIMESTAMPTZ` | Had masa tempoh pra-tempah |
| `polymart_orders` | `cancellation_requested_at` | `TIMESTAMPTZ` | Masa pembatalan dipohon oleh pembeli |
| `polymart_orders` | `cancellation_reason` | `TEXT` | Alasan pembatalan oleh pembeli |
| `polymart_orders` | `cancelled_at` | `TIMESTAMPTZ` | Tarikh pembatalan diluluskan/selesai |
| `polymart_orders` | `cancelled_by` | `UUID` | ID profil yang membatalkan pesanan |

#### Pengurusan Stok & Variasi Berasaskan JSONB (Mei 2026 Updates)

Sistem variasi produk (saiz baju, warna, dll.) ditukar daripada senarai teks biasa (`TEXT[]`) kepada jenis data berstruktur `JSONB` bagi membolehkan penjejakan stok khusus bagi setiap variasi secara automatik.

| Jadual | Lajur Baru | Jenis | Fungsi |
|---|---|---|---|
| `business_products` | `variations` | `JSONB` | Menyimpan array variasi: `[{"name": "S", "stock": 10, "reserved": 2}, ...]` |
| `polymart_cart_items` | `selected_variation` | `TEXT` | Menyimpan variasi pilihan dalam troli (UNIQUE index `(buyer_id, product_id, COALESCE(selected_variation, ''))` membolehkan pelajar menambah pelbagai variasi bagi baju yang sama) |

##### Mekanisme Pengiraan Stok
1. **Auto-Sum UI**: Borang POS / PolyMart vendor secara automatik menjumlahkan semua stok variasi (cth: `S:5`, `M:10` -> Stok Semasa: `15`) dan mengunci ruangan input stok utama untuk mengelakkan ralat kemasukan.
2. **Row Locking & Safe Update**: Semua RPC tempahan stok (`reserve_polymart_stock`), pelepasan stok (`release_polymart_stock`), dan penyelesaian pesanan (`complete_polymart_order`) memanggil helper function `update_product_variation_stock()` dengan mengunci baris produk (`FOR UPDATE`) bagi menghalang race condition.

### 16.2 Routes

| Route | Komponen | Akses |
|---|---|---|
| `/polymart` | `PolyMartHome` | Semua (termasuk pelawat tanpa login) |
| `/polymart/produk/:id` | `PolyMartProductDetail` | Semua |
| `/polymart/kedai/:id` | `PolyMartVendorStorefront` | Semua (termasuk pelawat tanpa login) |
| `/polymart/troli` | `PolyMartCartPage` | Authenticated |
| `/polymart/pesanan-saya` | `PolyMartMyOrders` | Authenticated |
| `/polymart/chat` / `/polymart/mesej` | `PolyMartChat` | Authenticated — sembang langsung pembeli-vendor |
| `/polymart/wishlist` | `PolyMartWishlist` | Authenticated |
| `/polymart/vendor` | `PolyMartVendorDashboard` | Vendor (ada perniagaan aktif) |
| `/polymart/verify/:orderId` | `PolyMartVerifyPickup` | Vendor (ahli perniagaan) — scan QR pickup |
| `/polymart/bayar/:orderId` | `PolyMartPaymentPage` | Authenticated — muat naik resit QR (checkout portal) |
| `/polymart/admin` | `PolyMartAdminPanel` | `hasKeusahawananAccess` atau `isSuperAdmin` |

### 16.3 Aliran Pembayaran Atas Talian (Online Payment)

Aliran pembayaran QR & pengesahan bersemuka (pickup):
1. **Tetapan Perniagaan**: Vendor mengaktifkan QR online di *Urus Perniagaan Page* (Tab Ciri), memuat naik QR perniagaan, mengisi maklumat bank, dan menetapkan had masa pembayaran (cth. 24 jam).
2. **Tempahan**: Pelanggan memilih kaedah `QR_ONLINE` semasa checkout. Pesanan dicipta dengan status `PENDING` dan `payment_deadline_at` dikira. Stok produk disimpan (`reserve_polymart_stock`).
3. **Muat Naik Resit**: Pelanggan memuat naik bukti resit dalam tempoh had masa. Status pembayaran bertukar kepada *Menunggu Pengesahan*.
4. **Pengesahan Pembayaran**: Vendor menyemak resit di *Vendor Dashboard* dan menekan "Sahkan Bayaran" (status pesanan menjadi `CONFIRMED`) atau "Tolak Resit" (pelanggan perlu muat naik semula).
5. **Serahan & QR Scan**: Semasa pelanggan mengambil pesanan (status pesanan `READY`), mereka menunjukkan kod QR pesanan kepada vendor. Vendor mengimbas/membuka URL `/polymart/verify/:orderId` dan menekan "Tandakan Selesai" yang memanggil RPC `complete_polymart_order`. Ini secara automatik mengurangkan stok kekal, mengosongkan stok tempahan, merekod transaksi POS, dan menukar status pesanan kepada `COMPLETED`.

### 16.4 Pembatalan Automatik (Auto-Cancel) & Peringatan

Untuk mengekalkan kebersihan database dan mengelakkan stok "tersangkut" (deadlock) pada pesanan PENDING:
- **Cron Server**: `server.js` menjalankan tugas `node-cron` setiap 15 minit.
- **Auto-Cancel**: Cron memanggil RPC `cancel_expired_polymart_orders()` yang menukar status pesanan `PENDING` yang telah melepasi `payment_deadline_at` kepada `CANCELLED` dan memanggil `release_polymart_stock` untuk membebaskan semula stok yang ditempah.
- **Notifikasi Peringatan**: Cron memanggil RPC `get_expiring_polymart_orders()` untuk mendapatkan senarai pesanan yang akan tamat dalam masa ~1 jam, kemudian menghantar push notification bertajuk `⏰ Pesanan Hampir Tamat Tempoh!` ke akaun pembeli.

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
| `/supsas/scorekeeper` | Portal Juri/Pengadil Padang — Pengadil berotoriti dengan Kod PIN 4-digit |
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
| `foodbank_settings` | Konfigurasi had bajet dan kelayakan permohonan Food Bank |
| `foodbank_distribution_locations` | Lokasi pusat edaran agihan berintegrasi PolyMaps |
| `foodbank_items` | Katalog dan baki stok inventori barangan Food Bank |
| `foodbank_applications` | Rekod permohonan bantuan Food Bank pelajar bersama pas QR |
| `foodbank_budget_transactions` | Lejar transaksi perbelanjaan dan penambahan bajet |

### 20.2 Routes

| Route | Komponen | Akses |
|---|---|---|
| `/kebajikan` | `KebajikanHubPage` | Semua pengguna (Hab Pendaratan Moden E-Kebajikan & Food Bank) |
| `/kebajikan/dashboard` | `KebajikanDashboard` | Exco Kebajikan / Super Admin (Papan Pemuka Tiket Aduan) |
| `/kebajikan/foodbank` | `KebajikanFoodBankPage` | Pelajar / Semua pengguna (Permohonan & Pas QR Food Bank) |
| `/kebajikan/buat-aduan` | `KebajikanSubmitPage` | Pelajar (buat tiket baru) |
| `/kebajikan/aduan-saya` | `KebajikanMyTickets` | Pelajar (lihat tiket sendiri) |
| `/kebajikan/aduan/:id` | `KebajikanStudentChat` | Pelajar (chat dalam tiket) |
| `/kebajikan/statistik` | `KebajikanStatsPage` | Semua authenticated |
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
> **Isu berulang — Mei 2026 (kali ke-3 difix):** Loading screen stuck, flickering/reload loop selepas deploy, dan amaran palsu "Internet lambat?". **Baca seluruh bahagian ini sebelum sentuh `AuthContext.tsx`, `RouteGuards.tsx`, `PwaUpdater.tsx`, `main.tsx`, atau `server.js` (bahagian static file serving).**

---

### 26.1 Punca Loading Stuck & Flickering — Diagnosis

Isu loading stuck / flickering berlaku apabila mana-mana satu syarat ini gagal:

| Fail | Simptom | Punca |
|---|---|---|
| `main.tsx` | **Flickering / infinite reload loop** selepas deploy | `vite:preloadError` handler tanpa had retry |
| `AuthContext.tsx` | `isLoading` kekal `true` selamanya | `safetyTimer` tidak di-cancel bila `onAuthStateChange` dah fire |
| `RouteGuards.tsx` | Loading screen tidak hilang | `minDelayPassed` stuck, atau `isLoading` tidak resolve |
| `RouteGuards.tsx` (PublicRoute) | **Stuck di HZ splash selamanya** | `profile === null` selepas loading selesai → tiada fallback |
| `RouteGuards.tsx` (LoadingScreen) | **Amaran palsu "Internet lambat?"** | Amaran keluar 3s tetapi auth safety timer 4s |
| `PwaUpdater.tsx` | **Reload loop** selepas deploy | `_updateHasBeenTriggered` reset setiap reload |
| `server.js` | SW lama kekal 24 jam | `sw.js` dicache 1 hari oleh `express.static` |
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
  triggerUpdate(); // ← Auto-reload (tertakluk kepada cooldown guard)
} else {
  showManualUpdateToast(); // ← Tanya user dulu (ada borang aktif)
}
```

> [!IMPORTANT]
> **JANGAN** tukar interval `setInterval` ke lebih dari 5 minit (300,000ms). Sebelum ini ia 1 jam — menyebabkan pelajar guna versi lama seharian walaupun dah ada update di server.

> [!WARNING]
> **JANGAN** buang `_updateHasBeenTriggered` guard atau cooldown guard. Tanpanya, `updateServiceWorker(true)` akan dipanggil berkali-kali dan menyebabkan reload loop yang tidak henti.

#### Cooldown Guard (Pemutus Litar Reload Loop):

```typescript
// Dalam triggerUpdate():
const lastReload = parseInt(sessionStorage.getItem('pwa_last_reload_ts') || '0', 10);
if (Date.now() - lastReload < 15_000) {
  // Baru reload < 15s lalu → jangan auto-reload, tunjuk toast manual
  showManualUpdateToast();
  return;
}
sessionStorage.setItem('pwa_last_reload_ts', String(Date.now()));
```

> [!CAUTION]
> **JANGAN** buang cooldown 15s ini. Ia adalah pemutus litar (circuit breaker) yang menghentikan reload loop apabila `_updateHasBeenTriggered` di-reset oleh reload. Tanpanya, SW lama → detect update → reload → SW lama lagi → loop.

#### Cara tambah halaman ke `SAFE_AUTO_RELOAD_PATHS`:

Tambah path baharu ke dalam array `SAFE_AUTO_RELOAD_PATHS` dalam `PwaUpdater.tsx` **HANYA jika halaman tersebut tidak ada borang aktif yang boleh hilang data bila reload**. Contoh yang **TIDAK** selamat: halaman borang permohonan asrama, borang laporan, checkout PolyMart.

---

### 26.5 Pengawal vite:preloadError — `main.tsx`

Apabila deployment baharu dilancarkan, fail chunk lama dipadamkan dari server. Jika Service Worker masih menyajikan `index.html` lama yang merujuk chunk lama → 404 → `vite:preloadError` → reload → SW sajikan lama lagi → loop tanpa henti.

```typescript
window.addEventListener('vite:preloadError', () => {
  const retries = parseInt(sessionStorage.getItem('vite_preload_retries') || '0', 10);
  if (retries < 2) {
    sessionStorage.setItem('vite_preload_retries', String(retries + 1));
    window.location.reload(); // Cuba lagi (max 2x)
  } else {
    sessionStorage.removeItem('vite_preload_retries');
    caches.keys().then(names => names.forEach(n => caches.delete(n)));
    window.location.replace('/?t=' + Date.now()); // Hard redirect + bust cache
  }
});

// Selepas app berjaya render:
sessionStorage.removeItem('vite_preload_retries'); // Reset counter
```

> [!CAUTION]
> **JANGAN** buang had 2 retry ini. Tanpanya, app akan reload tanpa henti sehingga user tutup tab secara paksa.

---

### 26.6 PublicRoute Fallback — `RouteGuards.tsx`

Jika pengguna authenticated tetapi `profile` kekal `null` selepas `isLoading = false` (fetchProfile gagal), `PublicRoute` akan stuck di HZ splash screen selamanya. Fallback 3s redirect ke `/portal` menyelesaikan ini.

```typescript
if (profile === null) {
  const fallbackTimer = setTimeout(() => {
    navigate('/portal', { replace: true }); // Fallback selepas 3s
  }, 3000);
  return () => clearTimeout(fallbackTimer);
}
```

> [!NOTE]
> `/portal` (PortalPage) dibina dengan `profile?.` optional chaining di semua tempat — ia tidak crash walaupun profile belum dimuatkan sepenuhnya.

---

### 26.7 Server Cache Headers — `server.js`

`sw.js` dan `registerSW.js` **WAJIB** no-cache supaya browser sentiasa dapat versi terbaru selepas deployment. Tanpa ini, browser cache SW lama sehingga 24 jam.

```javascript
const baseName = path.basename(filePath);
if (baseName === 'sw.js' || baseName === 'registerSW.js') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
}
```

> [!WARNING]
> Guna `path.basename()` dan bukannya `filePath.endsWith()` kerana path separator berbeza antara Windows (`\`) dan Linux (`/`).

---

### 26.8 Amaran "Internet lambat?" — Timing

Amaran muncul selepas **5000ms** (5 saat), iaitu 1 saat SELEPAS safety timer AuthContext (4s). Ini memastikan amaran hanya keluar jika app betul-betul stuck, bukan semasa boot biasa.

```typescript
useEffect(() => {
  const timeout = setTimeout(() => setShowWarning(true), 5000);
  return () => clearTimeout(timeout);
}, []);
```

> [!CAUTION]
> **JANGAN** turunkan nilai ini di bawah 4000ms (safety timer). Amaran akan muncul secara palsu semasa cold boot biasa dan mengelirukan pengguna.

---

### 26.9 Senarai Semak — Sebelum Ubah Fail Auth/Loading

```
main.tsx:
  [ ] vite:preloadError handler ADA dengan max 2 retries (sessionStorage)
  [ ] sessionStorage.removeItem('vite_preload_retries') ADA selepas render berjaya

AuthContext.tsx:
  [ ] safetyTimer masih 4000ms (atau lebih rendah)
  [ ] safetyTimerFired = true ADA dalam onAuthStateChange
  [ ] clearTimeout(safetyTimer) ADA dalam onAuthStateChange
  [ ] setIsLoading(false) dipanggil dalam finally block initialize()
  [ ] setIsLoading(false) dipanggil di akhir onAuthStateChange handler

RouteGuards.tsx:
  [ ] LoadingScreen showWarning delay ≥ 5000ms (MESTI lebih dari safetyTimer 4s)
  [ ] PublicRoute ada fallback timeout 3s untuk profile === null
  [ ] ProtectedRoute ada hardTimeoutRef dengan 8000ms
  [ ] hardTimeout di-cancel apabila isLoading jadi false
  [ ] sessionStorage 'hz_splash_seen' flag masih ada dan digunakan

PwaUpdater.tsx:
  [ ] Cooldown guard 15s ADA (sessionStorage 'pwa_last_reload_ts')
  [ ] setInterval dalam onRegistered TIDAK lebih dari 5 minit (300,000ms)
  [ ] visibilitychange listener ADA dan trigger r.update()
  [ ] window.online listener ADA dan trigger r.update()
  [ ] useEffect([location.pathname]) ADA untuk semak update bila navigate
  [ ] _updateHasBeenTriggered guard ADA untuk elak double-call
  [ ] SAFE_AUTO_RELOAD_PATHS ada semua halaman utama (bukan halaman borang)

server.js:
  [ ] sw.js dan registerSW.js ada Cache-Control: no-cache
  [ ] Guna path.basename() untuk check (bukan endsWith)
```

---

### 26.10 Pengoptimuman Deployment — Dockerfile vs Nixpacks

Bagi mempercepatkan dan menstabilkan binaan (*build*) aplikasi di pelayan Coolify, kami telah menggantikan sistem pengesan automatik Nixpacks dengan fail `Dockerfile` pengeluaran (*multi-stage build*) yang sangat dioptimumkan.

#### Kenapa Nixpacks Bermasalah?
1. **Sangat Berat & Lambat:** Nixpacks memuat turun beberapa arkib `nixpkgs` berasingan yang besar dari GitHub pada setiap binaan.
2. **Kelebihan Masa Binaan (Build Timeout):** Fasa memuat turun pakej asas mengambil masa melebihi 700 saat (11+ minit), menyebabkan pelayan Coolify memotong bekas binaan (*build container*) dengan kod keluar `255` (timeout).
3. **Penggunaan Memori Tinggi:** Kompilasi Nix OS memakan RAM yang amat besar, membahayakan kestabilan pelayan berkapasiti terhad semasa musim kemuncak.

#### Penyelesaian Dockerfile Multi-Stage:
* Menggunakan imej asas `node:22-alpine` (amat ringan, saiz minima).
* Mengasingkan fasa binaan kepada dua peringkat (*Stage 1: Builder* untuk memasang dependensi penuh & compile React frontend ke `/dist`, dan *Stage 2: Runner* untuk hanya menyalin fail pengeluaran dan dependensi runtime penting sahaja).
* Memendekkan masa kompilasi Coolify daripada **15+ minit (dan sering gagal/timeout)** kepada **kurang dari 2 minit (100% berjaya & stabil)**.

---

*Dikemas kini: Mei 2026 — Kali ke-3 difix. Tambah pengawal vite:preloadError, cooldown PwaUpdater, fallback PublicRoute, no-cache sw.js, dan Dockerfile multi-stage untuk pembinaan pantas Coolify.*



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
7. **z-[9999]**: Notifikasi 
eact-hot-toast (ditetapkan ke 	op-center) dan Penunjuk Mod Luar Talian (OfflineIndicator).

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

## 18. Antaramuka Pengguna (UI) PolyMaps & Pengurusan Zon 🗺️

> Ditambah: Mei 2026

Modul PolyMaps pada asalnya memaparkan semua bangunan secara serentak yang mengakibatkan UI menjadi sangat padat (cluttered), terutamanya di kawasan yang banyak bangunan seperti Jabatan Akademik atau Kamsis. 

### 18.1 Sistem Pengelompokan Zon (Zone Grouping)
- **Konsep:** Bangunan kini boleh dikelompokkan menggunakan medan `zone_name`. 
- **Dynamic Map Clustering:** Di dalam `PolyMapsPage.tsx`, peta menggunakan logik skala *zoom* untuk memutuskan sama ada memaparkan label kumpulan (contoh: "JKE") atau label bangunan individu.
- **Skala Zoom:** Skala penanda aras diletakkan pada `< 19` (`mapZoom < 19`). Ini bermakna kumpulan (zon) akan kekal dipaparkan walaupun pengguna telah mula *zoom in* (skala 16, 17, dan 18). Hanya pada tahap *zoom* maksimum (skala 19), barulah label berpecah kepada bangunan individu.
- **Sidebar Terkategori:** Menu Eksplorasi (Explore Sidebar) kini menggunakan reka bentuk **Accordion Bertab**. 
  - **Tab Akademik/Blok:** Menghimpunkan bangunan mengikut `zone_name`. Bangunan tanpa zon akan dipaparkan secara tunggal di bawah senarai.
  - **Tab Fasiliti Utama:** Menghimpunkan bangunan mengikut jenis fasiliti (`facility_type`) seperti "Kafe", "Surau", dsb.
- **Penyembunyian Bersyarat (Conditional Visibility):** Fasiliti berkapasiti kecil dan banyak seperti "Tandas" disembunyikan daripada peta secara lalai bagi mengelakkan kesesakan visual (*clutter*). Penanda hanya muncul sekiranya pengguna menekan butang *filter* "Tandas" di bar navigasi.

### 18.2 Input Auto-Saran (Datalist) untuk Admin
Bagi memastikan kelancaran logik pengelompokan (grouping) dan klasifikasi fasiliti, pentadbir tidak boleh melakukan kesilapan ejaan (contohnya: terbuat "Jke" dan "JKE " atau "Cafe" dan "Kafe").
- **Penyelesaian:** Modul Admin PolyMaps (`JppPolyMapsAdmin.tsx`) menggunakan elemen asli HTML `<datalist>` untuk medan `zone_name` dan `facility_type`.
- Apabila admin klik pada ruang input, senarai cadangan (diambil secara dinamik dari pangkalan data sedia ada) akan terpapar.
- Titik merah (`CircleMarker`) juga ditambah ke dalam Peta Admin untuk memudahkan admin melihat lokasi bangunan sedia ada bagi mengelakkan pertindihan data (*double-entry*).

### 18.3 Pemilihan Bangunan (Admin UI)
- **Input Asal:** Dropdown <select> biasa yang menjadi sangat meleret.
- **Naik Taraf (Datalist):** Ditukar menggunakan <input> bersama <datalist>. Pentadbir kini boleh *type-to-search* nama bangunan atau kod bangunan. Sistem akan secara proaktif menterjemahkan teks yang dipadankan kepada uilding_id di sebalik tabir.


### 18.4 Rangkaian Laluan Pejalan Kaki Pintar (Walkway Network & Dijkstra)
- **Skema Jadual (`imaps_walkways`):** Menyimpan koordinat segmen laluan pejalan kaki (arrays of `[lat, lng]` sebagai JSONB). Dipertingkatkan dengan atribut `is_covered` (laluan berbumbung) dan `is_blocked` (jalan ditutup/halangan). RLS diaktifkan (pembacaan awam anonym, penulisan terhad kepada pentadbir/JPP).
- **Junction Bridge (Penyambungan Automatik):** Titik dari segmen laluan berasingan yang berada dalam lingkungan 8 meter secara automatik dihubungkan sebagai simpang persilangan semasa graf dibina pada peranti pengguna, mengelakkan keperluan menyambung titik secara manual semasa melukis.
- **Algoritma Dijkstra & Laluan Berbumbung:** Menghubungkan titik GPS pengguna dan destinasi bangunan ke rangkaian jalan terdekat, kemudian mencari laluan pejalan kaki terpendek secara dinamik.
  - **Laluan Berbumbung (Covered Walkways):** Apabila mod "Utamakan Laluan Berbumbung" aktif (boleh ditoggel secara manual atau diaktifkan automatik sekiranya status cuaca adalah hujan), algoritma Dijkstra meletakkan gandaan pemberat denda sebanyak 8x ke atas segmen laluan yang tidak berbumbung. Ini membolehkan sistem mengutamakan laluan berbumbung bagi keselesaan pelajar ketika cuaca buruk.
  - **Jalan Ditutup / Laporan Halangan:** Mana-mana segmen laluan yang ditoggel sebagai `is_blocked` oleh pentadbir JPP akan disaring keluar semasa pembinaan graf Dijkstra, memastikan jalan terhalang tidak terpilih untuk navigasi pejalan kaki.
- **Arahan Langkah-demi-Langkah (Turn-by-Turn Directions):** Dinilai secara automatik menerusi perbezaan sudut bearing ($\Delta\theta > 25^\circ$ ditafsirkan sebagai belokan kiri/kanan). Setiap langkah perjalanan dikira mengikut nama laluan kampus, dipaparkan dengan jarak dalam meter, dan dilengkapi penanda status berbumbung/tidak berbumbung menggunakan ikon visual yang premium.

### 18.5 Penunjuk Arah Kompas (Device Orientation Heading Cone)
- **Penunjuk Cahaya Biru (Flashlight Cone):** Penanda GPS pelajar memaparkan pancaran cahaya biru yang berputar dinamik mengikut orientasi fizikal telefon pintar (compass heading).
- **Kebenaran iOS Safari:** Menguruskan protokol `DeviceOrientationEvent.requestPermission()` secara lancar di mana permintaan dialog kebenaran kompas iOS dipicu oleh tindakan interaksi pengguna semasa butang "Mula Pandu Arah" ditekan.

### 18.6 Penonton 360° Panorama Kampus & Penyerlah Kotak Hijau Admin
- **Komponen (`src/components/polymaps/Pannellum360Viewer.tsx`):**
  - Mengintegrasikan enjin WebGL Pannellum secara dinamik melalui pemuatan skrip & gaya CDN tanpa membebankan saiz bundle asas.
  - Menyokong rendering imej equirectangular 360° berserta kawalan gestur sentuhan (touch drag/pinch) untuk telefon pintar dan tetikus PC.
  - Dilengkapi ciri putaran auto (auto-rotate -1.5), togol mod skrin penuh, dan butang penetapan semula (reset view).
- **Integrasi PolyMaps (`src/pages/polymaps/PolyMapsPage.tsx`):**
  - Medan `panorama_360_url` pada jadual `imaps_buildings` dan `imaps_locations`.
  - Tab `360° View` aktif secara automatik pada kad bangunan/ruangan yang mempunyai panorama 360°.
  - Butang pantas terapung **"360° Street View"** pada kad ringkasan bangunan (collapsed card) membolehkan pelajar melompat terus ke mod paparan skrin penuh 360°.
- **Penyerlah Kotak Hijau Admin (`src/pages/jpp/JppPolyMapsAdmin.tsx`):**
  - Kad bangunan dan lokasi yang memiliki pautan `panorama_360_url` diserlahkan dengan kotak hijau terang (`border-2 border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/25`) berserta lencana `360° AKTIF`.
  - Kad tanpa 360 kekal dengan sempadan neutral dan lencana `Tiada 3D` untuk memudahkan pemantauan liputan 3D kampus oleh pihak pentadbir.
  - Suis togol format paparan lokasi (**Kad** vs **Jadual**) disediakan bagi pentadbiran yang fleksibel.

---

## 19. Senibina Modul PolySuara Social Commenting Platform (e-Kebajikan) 💬

> Ditambah: Mei 2026

Modul PolySuara kini telah dinaik taraf daripada papan luahan sehala kepada **platform perbincangan sosial tanpa nama** yang interaktif. Pengguna boleh bertukar pendapat melalui sistem ulasan bertingkat (2-level comment nesting: confessions $\rightarrow$ comments $\rightarrow$ replies) dengan kawalan privasi bertaraf tinggi serta sistem moderasi pintar di bawah seliaan Exco Kebajikan.

### 19.1 Skema Pangkalan Data & Trigger Unik
Bagi menyokong perbincangan tanpa profil peribadi pelajar diceroboh, pangkalan data dibina dengan struktur rujukan silang yang selamat:
- **`polysuara_comments`**: Menyimpan teks ulasan, sokongan untuk lampiran imej (`image_url`), status *soft-delete* (`is_deleted_by_moderator`), dan `parent_id` untuk menyokong sarangan Tier-2 (balas komen).
- **`polysuara_comment_votes`**: Menyimpan data undian ulasan (`UPVOTE` / `DOWNVOTE`) bagi memastikan mutual exclusion (satu undi sahaja bagi setiap komen/pelajar).
- **`polysuara_comment_reports`**: Menyimpan rekod laporan penyalahgunaan ulasan bagi tujuan audit moderasi.

#### 🔐 Codenaming Tanpa Nama Terselubung (Thread-Scoped Hashing)
Untuk mengelakkan pendedahan identiti di sebalik ulasan merentasi post berbeza (*student profiling*), sistem menggunakan trigger automatik `trg_polysuara_comment_codename`:
1. **Original Poster (OP):** Jika pengomen adalah penulis confession asal, nama samarannya diselaraskan semula dengan mengekalkan nama samaran post ditambah dengan tag **`[Penulis]`** (cth: `Kucing Comel [Penulis]`).
2. **Komen Pelajar Lain:** Jika pelajar lain yang mengomen, identiti mereka ditukar secara dinamik berasaskan MD5 hash komposit:
   $$\text{Codename} = \text{"Anon-"} + \text{substring}(\text{md5}(\text{user\_id} + \text{confession\_id}), 1, 5)$$
   *Kelebihan:* Nama samaran `Anon-XXXXX` kekal konsisten di dalam satu thread luahan (pelajar boleh berbincang dengan identiti konsisten di post tersebut) tetapi bertukar sepenuhnya kepada nama rawak lain di post luahan yang berbeza, menghalang sesiapa daripada mengumpul profil tingkah laku pelajar.
3. **Trigger Penapisan Profaniti:** Pemasangan trigger `trg_censor_polysuara_comment` yang menggunakan semula fungsi `censor_polysuara_content()` memastikan setiap komen yang dihantar disaring terlebih dahulu daripada perkataan sensor sebelum disimpan dalam DB.

### 19.2 Polisi Keselamatan (RLS) & RPC Atomik
Sejajar dengan garis panduan prestasi tinggi dan beban 1,500 pengguna orientasi:
- **Polisi Seleksi Terhad:** Polisi `polysuara_comment_votes` and `polysuara_comment_reports` mengehadkan select query strictly kepada `user_id = (SELECT auth.uid())`. Tiada sesiapa pun (termasuk frontend pembangun awam) boleh mengekstrak identiti siapa yang mengundi atau melaporkan sesuatu komen.
- **RPC Voting `toggle_polysuara_comment_vote`:** Mengelakkan operasi gandaan frontend (*race conditions*). Panggilan atomik PostgreSQL ini mengurus pertukaran sokong/bantah, menyelaraskan kaunter cache ulasan, dan menguji threshold komuniti.
- **Had Sembunyi Komuniti (Auto-Hide):**
  - **Ulasan:** Disembunyikan secara automatik (`is_hidden_by_community = true`) sekiranya ulasan mendapat $\ge 5$ laporan unik ATAU mendapat downvote melebihi $70\%$ daripada jumlah undian (minimum 10 undian keseluruhan).
  - **Confession:** Disembunyikan secara automatik sekiranya menerima downvote melebihi $60\%$ daripada 40 undian pertama awam.

### 19.3 Integriti Front-End & Eskalasi Krisis Kebajikan
- **Visual Nesting Premium:** Tier-2 (balasan) disusun di bawah Tier-1 dengan anjakan margin kiri (`pl-6`) disertakan garisan visual menegak kelabu kabur (`border-l border-slate-800 ml-5`) bagi menghasilkan kesinambungan mata yang premium.
- **Sensitive Content Blur:** Komen yang ditandakan sebagai sensitif oleh pelajar semasa hantar akan diselimuti kabur spoiler (`SensitiveCommentContent`). Kandungan hanya akan didedahkan setelah pelajar menekan amaran tersebut secara manual.
- **OP Highlight Badge:** Penulis luahan asal dibekalkan dengan lencana OP bergradien yang cantik (`bg-gradient-to-r from-rose-500 to-pink-500`) bagi memudahkan pelajar mengecam input tulen OP manakala nama samaran dibersihkan daripada teks plain `[Penulis]`.
- **Tombstone Rendering:** Ulasan bertanda `is_deleted_by_moderator = true` mempamerkan kotak amaran kelabu gelap eksklusif manakala butang tindakan seperti undian, balasan, dan laporan disembunyikan.
- **🚨 Butang Eskalasi Kebajikan ("Bantuan"):** Jika ulasan mengandungi unsur krisis mental atau kemudaratan fizikal, butang kecemasan membolehkan mana-mana pelajar menolak isyarat aduan kecemasan ke Exco Kebajikan secara rahsia. RPC database akan menandakan ulasan untuk disembunyikan dan menghantar notifikasi segera ke Exco menggunakan utiliti:
  ```typescript
  await sendNotificationToKebajikanExco({
    title: '🚨 Kecemasan Ulasan PolySuara',
    message: 'Pelajar melaporkan ulasan memerlukan tindakan kebajikan segera.',
    type: 'ALERT',
    module: 'KEBAJIKAN',
    link: '/jpp/kebajikan'
  });
  ```

### 19.4 Moderasi & Analisis Komposit (JPP Dashboard)
- **Moderasi Komen:** Exco Kebajikan JPP mempunyai panel kawalan khusus di tab Moderasi `/jpp/polyservices`. Setiap ulasan yang disembunyikan oleh komuniti (auto-hide) or dilaporkan akan disenaraikan di bahagian atas untuk tindakan:
  - **`Lepaskan`:** Memanggil RPC `restore_hidden_comment()` untuk menetapkan semula status `is_hidden_by_community` kepada false, membersihkan reports_count, dan memulihkan ulasan di feed awam.
  - **`Padam`:** Memanggil RPC pintar `soft_or_hard_delete_polysuara_comment()` yang secara automatik memilih antara *Soft-Delete / Tombstone* (jika ulasan mempunyai jawapan Tier-2 di bawahnya) bagi mengekalkan kesinambungan topik perbincangan, atau melakukan *Hard-Delete* (jika tiada ulasan anak) untuk menjaga kebersihan pangkalan data.
- **Analisis Sentimen Awan Kata (Word-Cloud):** Algoritma awan kata (`getWordCloud`) kini dinaik taraf untuk menggabungkan teks luahan confession berserta kandungan ulasan sosial yang aktif bagi membolehkan Exco menganalisis topik dan kebimbangan pelajar POLISAS secara menyeluruh dan holistik.

### 19.5 Penambahbaikan Sistem Poll & Notifikasi (v5.1)
- **Kolum Cache `vote_count`**: Diperkenalkan pada jadual `polysuara_poll_options` bagi menyimpan jumlah undi secara terus. Kemaskini dijalankan secara automatik menggunakan trigger `trg_sync_poll_vote_count` apabila undian ditambah/dibuang.
- **RPC `toggle_polysuara_poll_vote`**: Menguruskan transaksi undian poll secara atomic, mengelakkan perlumbaan syarat (race conditions) dan menguruskan pilihan tunggal (single-choice) dengan menyingkirkan undian lama secara automatik.
- **Jadual `polysuara_notif_optout`**: Menyimpan senarai pengguna yang memilih untuk tidak menerima notifikasi baharu daripada PolySuara.
- **Jadual `polysuara_notif_state`**: Menyimpan konfigurasi notifikasi PolySuara (seperti had threshold upvote dan maklumat penjejakan cooldown bagi post luahan trending).
- **Trigger Webhook Notifikasi**: Trigger `trg_polysuara_new_confession_notify` dipasang pada jadual `polysuara_confessions` (AFTER INSERT) untuk memanggil API webhook secara tidak-menyinkron (asynchronous) menerusi fungsi `supabase_functions.http_request` menggunakan `pg_net` extension.
- **Pelekatan RLS `polysuara_poll_votes`**: Menggantikan dasar awam kepada dasar berasaskan pengguna di mana pelajar hanya boleh membaca undian sendiri `user_id = (SELECT auth.uid())` bagi melindungi privasi dan kerahsiaan pilihan.
- **Indeks Kolum FK**: Indeks `idx_polysuara_poll_votes_user_id` and `idx_polysuara_poll_votes_option_id` ditambah untuk mematuhi peraturan indeks asing demi prestasi optimal.

## 20. Senibina Pindaan Profil Pelajar (profile_edit_requests) 📋
Modul ini membenarkan pelajar memohon perubahan maklumat kritikal (seperti No. Matrik atau Semester semasa) untuk disemak dan diluluskan secara manual oleh Majlis Perwakilan Pelajar (JPP) / Majlis Tertinggi (MT) demi mengekalkan kualiti data.

### 20.1 Pangkalan Data & Logik RLS
- **Jadual `profile_edit_requests`**: Menyimpan perincian permohonan dengan status flow `PENDING` $\rightarrow$ `APPROVED` / `REJECTED`.
- **Dasar Row-Level Security (RLS)**:
  - Pelajar hanya dibenarkan menghantar (`INSERT`) dan melihat (`SELECT`) permohonan milik mereka sendiri (`user_id = (SELECT auth.uid())`).
  - Ahli JPP dan SUPER_ADMIN_JPP dibenarkan melihat (`SELECT`) dan mengemaskini (`UPDATE`) mana-mana permohonan.
- **Trigger `trg_profile_edit_requests_reviewed_at`**: Automatik menetapkan tarikh kelulusan/penolakan (`reviewed_at`) apabila status berubah dari `PENDING`.
- **Indeks Prestasi**: Indeks `idx_profile_edit_requests_user_id` dan `idx_profile_edit_requests_reviewed_by` memastikan carian pantas mengikut profil pengguna dan pemeriksa JPP.

## 21. Log Audit Terpusat (admin_audit_logs & system_logs) 🛡️
Bagi tujuan keselamatan dan pemantauan salah guna kuasa pentadbir/exco JPP, sistem merekodkan setiap tindakan pentadbir secara terpusat.

### 21.1 Skema & RLS
- **Jadual `admin_audit_logs`**: Menyimpan maklumat terperinci log seperti jenis tindakan (`action_type`), exco unit (`module`), dan entiti yang terkesan.
- **RLS**: strictly disekat untuk carian awam. Hanya pengguna bertaraf `JPP` atau `SUPER_ADMIN_JPP` sahaja dibenarkan membaca rekod log (`Allow select admin_audit_logs for admins`).
- **Pandangan `system_logs` (View)**: VIEW ini menggabungkan audit log dari `admin_audit_logs` dan `club_logs` menggunakan `UNION ALL`. Ia menapis paparan menggunakan klausa `WHERE EXISTS` agar hanya boleh diakses oleh exco bertaraf JPP/SUPER_ADMIN_JPP.

---

## 22. Senibina Modul Event Management System (EMS) 🎯

> Dikemas kini: Julai 2026

Modul Event Management System (EMS) ialah platform pengurusan acara komprehensif politeknik yang merangkumi pembinaan borang & rubrik dinamik, wisard pendaftaran peserta awam/pelajar dengan muat naik media, pengimbas kehadiran QR krew real-time, portal penilaian juri luar/dalaman berautentikasi kod laluan, papan pendahulu (live leaderboard) berserta mod pentas (Stage Mode) animasi podium, dan penjanaan serta pengesahan sijil digital PDF berserta QR.

### 22.1 Skema Pangkalan Data & Indeks FK

Modul EMS menggunakan 8 jadual teras di dalam skema `public` dengan penguatkuasaan RLS serta indeks pada semua kolum Foreign Key (FK):

1. **`ems_events`**: Menyimpan rekod induk acara/pertandingan.
   - **Kolum**: `id` (UUID, PK), `title` (TEXT), `description` (TEXT), `category` (TEXT), `event_mode` (TEXT: 'INDIVIDUAL' | 'TEAM'), `event_date` (TIMESTAMPTZ), `location` (TEXT), `status` (TEXT: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'LIVE' | 'COMPLETED'), `is_leaderboard_public` (BOOLEAN), `created_by` (UUID, FK -> `profiles.id`), `created_at` (TIMESTAMPTZ).
   - **Indeks FK**: `idx_ems_events_created_by`.

2. **`ems_form_fields`**: Menyimpan medan borang pendaftaran dinamik per acara.
   - **Kolum**: `id` (UUID, PK), `event_id` (UUID, FK -> `ems_events.id` ON DELETE CASCADE), `field_label` (TEXT), `field_type` (TEXT: 'TEXT' | 'NUMBER' | 'SELECT' | 'FILE' | 'CHECKBOX'), `is_required` (BOOLEAN), `options` (JSONB), `sort_order` (INT).
   - **Indeks FK**: `idx_ems_form_fields_event_id`.

3. **`ems_participants`**: Menyimpan maklumat pendaftaran peserta atau kumpulan terdaftar.
   - **Kolum**: `id` (UUID, PK), `event_id` (UUID, FK -> `ems_events.id` ON DELETE CASCADE), `participant_type` (TEXT: 'STUDENT' | 'PUBLIC'), `entity_mode` (TEXT: 'INDIVIDUAL' | 'TEAM'), `team_name` (TEXT), `booth_no` (TEXT), `category_name` (TEXT), `leader_name` (TEXT), `matrix_no` (TEXT), `email` (TEXT), `phone` (TEXT), `members_list` (JSONB), `custom_responses` (JSONB), `media_urls` (JSONB), `is_checked_in` (BOOLEAN), `checked_in_at` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ).
   - **Indeks FK**: `idx_ems_participants_event_id`.

4. **`ems_jury_codes`**: Menyimpan kod laluan (passcode) akses juri luar/dalaman.
   - **Kolum**: `id` (UUID, PK), `event_id` (UUID, FK -> `ems_events.id` ON DELETE CASCADE), `code` (TEXT, UNIQUE per event), `jury_name` (TEXT), `organization` (TEXT), `ic_no` (TEXT, NULLABLE), `email` (TEXT, NULLABLE), `office_address` (TEXT, NULLABLE), `assigned_categories` (JSONB / TEXT[]), `assigned_booths` (JSONB / TEXT[]), `is_active` (BOOLEAN, DEFAULT true), `created_at` (TIMESTAMPTZ).
   - **Indeks FK**: `idx_ems_jury_codes_event_id`.

5. **`ems_rubrics`**: Menyimpan kriteria rubrik pemarkahan untuk sesuatu acara.
   - **Kolum**: `id` (UUID, PK), `event_id` (UUID, FK -> `ems_events.id` ON DELETE CASCADE), `criteria_name` (TEXT), `max_score` (NUMERIC), `weight` (NUMERIC), `sort_order` (INT).
   - **Indeks FK**: `idx_ems_rubrics_event_id`.

6. **`ems_scores`**: Menyimpan markah penilaian yang diberikan oleh juri.
   - **Kolum**: `id` (UUID, PK), `event_id` (UUID, FK -> `ems_events.id` ON DELETE CASCADE), `participant_id` (UUID, FK -> `ems_participants.id` ON DELETE CASCADE), `jury_code_id` (UUID, FK -> `ems_jury_codes.id` ON DELETE CASCADE), `rubric_id` (UUID, FK -> `ems_rubrics.id` ON DELETE CASCADE), `score` (NUMERIC), `comments` (TEXT), `created_at` (TIMESTAMPTZ).
   - **Indeks FK**: `idx_ems_scores_event_id`, `idx_ems_scores_participant_id`, `idx_ems_scores_jury_code_id`, `idx_ems_scores_rubric_id`.

7. **`ems_certificates`**: Menyimpan rekod sijil digital dan nombor siri rasmi.
   - **Kolum**: `id` (UUID, PK), `event_id` (UUID, FK -> `ems_events.id` ON DELETE CASCADE), `participant_id` (UUID, FK -> `ems_participants.id` ON DELETE CASCADE, NULLABLE), `jury_code_id` (UUID, FK -> `ems_jury_codes.id` ON DELETE CASCADE, NULLABLE), `cert_type` (TEXT: 'PARTICIPANT' | 'WINNER' | 'JURY'), `cert_serial` (TEXT, UNIQUE), `qr_code_url` (TEXT), `created_at` (TIMESTAMPTZ).
   - **Indeks FK**: `idx_ems_certificates_event_id`, `idx_ems_certificates_participant_id`, `idx_ems_certificates_jury_code_id`.

8. **`ems_visitors`**: Menyimpan rekod imbasan kehadiran pengunjung awam / milestone winners.
   - **Kolum**: `id` (UUID, PK), `event_id` (UUID, FK -> `ems_events.id` ON DELETE CASCADE), `user_id` (UUID, FK -> `auth.users.id`, NULLABLE), `name` (TEXT), `matrix_no` (TEXT), `email` (TEXT), `phone` (TEXT), `is_milestone_winner` (BOOLEAN), `milestone_number` (INT), `scanned_at` (TIMESTAMPTZ).
   - **Indeks FK**: `idx_ems_visitors_event_id`, `idx_ems_visitors_user_id`.

### 22.2 Polisi Row-Level Security (RLS) & Subquery Guidelines

> [!CRITICAL]
> **Piawaian Wajib RLS `(SELECT auth.uid())`**:
> Semua polisi RLS pada jadual EMS **WAJIB** menggunakan subquery `(SELECT auth.uid())` dan bukannya bare `auth.uid()`.
> Ini dipatuhi bagi mengelakkan panggilan per-baris (per-row function evaluation) yang boleh menyebabkan masalah prestasi kritikal pada Supavisor connection pooler apabila menampung sehingga 1,500 pengguna serentak semasa Orientation Season.

Setiap jadual EMS mematuhi piawaian RLS ketat projek:
- **Pengehadan Satu Polisi Per Operasi**: Mengelakkan polisi duplikasi/bertindih pada jadual yang sama (`OR` dibenarkan dalam satu polisi).
- **Integriti FK**: Semua hubungan Foreign Key dilengkapi indeks bagi mengelakkan *table scan* semasa query RLS.

**Peraturan Akses mengikut Entiti EMS**:
1. **Pengurusan Admin & Penganjur (`ems_events`, `ems_form_fields`, `ems_rubrics`, `ems_jury_codes`)**:
   - `SELECT`, `INSERT`, `UPDATE`, `DELETE` dibolehkan untuk pencipta acara (`created_by = (SELECT auth.uid())`) atau pengguna bertaraf `JPP` / `SUPER_ADMIN_JPP`.
   - `SELECT` dibolehkan untuk awam/peserta pada `ems_events` (apabila status `APPROVED` atau `LIVE`) dan `ems_form_fields` untuk borang pendaftaran.
2. **Portal Pendaftaran Peserta (`ems_participants`)**:
   - `INSERT` dibolehkan untuk sesi awam/pelajar (anonymous & authenticated) mendaftar acara.
   - `SELECT` dibolehkan untuk penganjur acara, krew imbasan QR, dan awam (untuk papan pendahulu & pas digital).
   - `UPDATE` dibolehkan untuk krew/penganjur mengemaskini status kehadiran (`is_checked_in`, `checked_in_at`).
3. **Portal Penilaian Juri (`ems_jury_codes`, `ems_scores`)**:
   - `SELECT` pada `ems_jury_codes` dibolehkan secara awam untuk pengesahan passcode juri (`code = ...`).
   - `INSERT` & `UPDATE` pada `ems_scores` dibolehkan untuk penyerahan markah juri berautentikasi kod juri sah.
   - `SELECT` pada `ems_scores` dibolehkan untuk penganjur/admin dan pengiraan aggregat leaderboard.
4. **Portal E-Sijil (`ems_certificates`)**:
   - `SELECT` dibolehkan untuk carian awam melalui `id` atau `cert_serial` bagi pengesahan ketulenan sijil digital & paparan QR.
   - `INSERT` dibolehkan untuk penganjur acara/admin bagi pembentukan sijil secara pukal.
5. **Portal Kehadiran Pengunjung (`ems_visitors`)**:
   - `INSERT` dibolehkan secara awam untuk pengunjung merekod kehadiran menerusi kod QR.
   - `SELECT` dibolehkan untuk pengiraan aggregate bilangan pengunjung, penentuan milestone winner, dan cabutan bertuah.

### 22.3 Storan Media EMS & Dynamic File Upload Renderers (`driveUpload.ts`)

Sistem EMS mengintegrasikan modul storan hibrid projek (`src/lib/driveUpload.ts`) serta baldi Supabase `ems-media` (Public Access):
- **Storan Imej & Grafik**: Poster acara (`ems-media/events/:eventId/`) dan gambar muat naik peserta disimpan di Supabase Storage dengan automasi mampatan format JPEG.
- **Dokumen PDF & Slaid Projek**: Dokumen kertas kerja, slaid pembentangan saiz besar, dan lampiran peserta disalurkan ke Google Drive melalui Edge Function `upload-to-drive` mengikut piawaian `driveUpload.ts` untuk menjimatkan storan Supabase.
- **Dynamic File Upload Renderers**: Medan pendaftaran borang dinamik (`field_type: 'FILE'`) pada `EmsPublicRegisterPage` & `EmsEventFormPage` disokong oleh renderer dinamik yang mengesan mime-type:
  - **Imej (`image/*`)**: Dipaparkan sebagai gambar pratinjau thumbnail interaktif dengan fungsi lightbox modal.
  - **PDF (`application/pdf`)**: Dipaparkan sebagai kad pratonton dokumen berikon PDF berserta pautan muat turun / pembuka Google Drive Viewer secara terus.

### 22.4 Universal QR Scanner & Smart Routing

Platform EMS menyediakan sistem imbasan QR universal dengan *smart routing* yang berkeupayaan membedah muatan (payload) kod QR dan menghalakan krew/pengguna secara automatik:
- **Pengimbas Krew (`/ems/checkin/:eventId`) & (`/ems/checkin`)**: Menggunakan komponen `html5-qrcode` dengan sokongan kamera belakang mudah alih dan maklum balas audio chime.
- **Logik Smart Routing Payload**:
  1. **Peserta / Pas Digital**: Kod QR berbentuk `EMS-PASS::<participantId>` atau URL `/ems/e/:eventId/register` → Auto-proses pengesahan kehadiran peserta (`is_checked_in = true`) dan memaparkan maklumat peserta.
  2. **Pengunjung Awam**: Kod QR berbentuk `EMS-VISITOR::<eventId>` atau URL `/ems/v/:eventId/scan` → Dihala ke Portal Imbas Kehadiran Pengunjung & pengiraan *Milestone Winner*.
  3. **Verifikasi E-Sijil**: Kod QR berbentuk `EMS-CERT::<certSerial>` atau URL `/ems/cert/:certId` → Dihala ke Portal Verifikasi Sijil Digital PDF.
  4. **Passcode Juri**: Kod QR / Pautan juri → Dihala ke Portal Akses Juri (`/ems/juri`) dengan pengisian automatik passcode.

### 22.5 Piawaian UI/UX Mobil & Dynamic Mobile Padding (`pb-28 md:pb-8`)

Bagi menjamin kebolehgunaannya pada peranti mudah alih (telefon pintar) di kawasan acara/pertandingan:
- **Piawaian Klearance Bottom Navigation (`pb-28 md:pb-8`)**: Semua fail halaman dalam `src/pages/ems/` diwajibkan menggunakan kelas padding `pb-28 md:pb-8` pada bekas utama (main wrapper container).
- **Tujuan**: Memastikan butang tindakan utama (seperti *Submit Score*, *Register Participant*, *Check-In Now*, dan *Export Cert*) tidak terlindung di belakang bar navigasi bawah peranti mudah alih (`BottomNav`).
- **Skrin Pintar & Pentas**: Halaman seperti Mod Pentas (`/ems/stage/:eventId`) direkabentuk secara skrin penuh (*fullscreen responsive*) untuk paparan projektor/TV LED tanpa navigasi mudah alih.

### 22.6 Laluan (Routes) & Fail Halaman EMS

Semua 12 laluan EMS menggunakan prefix `/ems/*` dan dipeta kepada komponen halaman dedicated dalam `src/pages/ems/`:

| Route | Fail Komponen | Mod Akses | Deskripsi |
|---|---|---|---|
| `/ems/dashboard` | `src/pages/ems/EmsDashboardPage.tsx` | Protected (AppLayout) | **Hub Acara EMS & Eksplorasi** — EMS Main Management Hub: papan pemuka utama penganjur acara untuk mengurus senarai acara, status kelulusan, jana kod juri, jana pautan QR pendaftaran, tie-breaker, Roda Cabutan Bertuah & pengurusan e-sijil. |
| `/ems/event/new` | `src/pages/ems/EmsEventFormPage.tsx` | Protected (AppLayout) | **Borang & Builder Acara** — Event Form & Rubric Builder: pembina borang pendaftaran dinamik (custom fields) & pembina rubrik pemarkahan kriteria juri untuk acara baharu. |
| `/ems/event/:id/edit` | `src/pages/ems/EmsEventFormPage.tsx` | Protected (AppLayout) | **Borang & Builder Acara Edit** — Event Form & Rubric Builder Edit: kemaskini borang dinamik & rubrik pemarkahan acara sedia ada. |
| `/ems/approvals` | `src/pages/ems/EmsApprovalPage.tsx` | Protected (SUPER_ADMIN_JPP) | **Semakan HQ Super Admin** — Super Admin Approval Page: semakan & kelulusan penganjuran acara oleh Pentadbir Mutlak (`SUPER_ADMIN_JPP`). |
| `/ems/e/:eventId/register` | `src/pages/ems/EmsPublicRegisterPage.tsx` | Public Standalone | **Wizard Pendaftaran Peserta & Pas QR** — Public Participant Registration Wizard: wisard pendaftaran peserta awam/pelajar multi-langkah (individu/pasukan), borang soalan dinamik, muat naik media, & pas digital QR. |
| `/ems/checkin` | `src/pages/ems/EmsCheckinSelectorPage.tsx` | Protected (AppLayout) | **Pemilih Acara Crew Check-In** — Crew Check-in Event Selector: pemilih acara aktif untuk urus setia & crew melakukan check-in peserta mengikut acara. |
| `/ems/checkin/:eventId` | `src/pages/ems/EmsCheckinPage.tsx` | Protected (AppLayout) | **Scanner Kehadiran Crew** — Crew Attendance QR Check-In Scanner: portal pengimbas QR kehadiran krew / AJK hari kejadian menggunakan kamera real-time (`html5-qrcode`), carian manual, audio chime & statistik live. |
| `/ems/juri` | `src/pages/ems/EmsJuryPortalPage.tsx` | Public Standalone | **Portal Akses Juri Luar** — External Jury Access Portal: portal penilaian juri luar/dalaman berautentikasi passcode kod juri, penilaian rubrik & hantaran skor real-time. |
| `/ems/leaderboard/:eventId` | `src/pages/ems/EmsLeaderboardPage.tsx` | Protected / Public (jika `is_leaderboard_public`) | **Live Leaderboard & Markah** — Live Realtime Leaderboard Dashboard: papan pendahulu live penganjur & penonton berserta Roda Cabutan Bertuah, tie-breaker & pecahan skor. |
| `/ems/stage/:eventId` | `src/pages/ems/EmsLeaderboardPage.tsx` | Public Standalone (`isStageMode={true}`) | **Mod Pentas Presentasi** — Stage Display Mode: mod persembahan pentas skrin penuh bertema gelap/vibrant, animasi podium Top 3, lencana 🥇/🥈/🥉, pelancaran Roda Cabutan Bertuah & bunga api (`canvas-confetti`). |
| `/ems/v/:eventId/scan` | `src/pages/ems/EmsAudienceScanPage.tsx` | Public Standalone | **Portal Imbas Kehadiran Pengunjung & Milestone** — Audience Attendance Scan Portal: portal imbasan QR pendaftaran kehadiran pengunjung awam, borang auto-fill, pengiraan milestone winner automatik & bunga api. |
| `/ems/cert/verify` | `src/pages/ems/EmsCertVerifyPage.tsx` | Public Standalone | **Semakan Carian E-Sijil** — Digital E-Certificate Verification Lookup: halaman carian nombor siri E-Sijil rasmi (cth: `CERT-EMS-2026-XXXXX`) dan pengesahan ketulenan. |
| `/ems/cert/:certId` | `src/pages/ems/EmsCertificatePage.tsx` | Public Standalone | **Portal Sijil PDF & Verifikasi Ber-QR** — Digital E-Certificate PDF & Verification Portal: portal muat turun PDF sijil digital, pratinjau & verifikasi ber-QR (`EmsCertificateTemplate.tsx`). |

---

### 22.7 Peningkatan Digital Flagship EMS & Pusat Kawalan Eksekutif (Command Palette)

1. **Mod Pentas Dewan & Pengawal Dedah Berperingkat (Grand Hall Presentation Stage Mode)**:
   - **Laluan**: `/ems/stage/:eventId` atau `/ems/leaderboard/:eventId` (Tab PENTAS DEWAN).
   - **Gaya Visual**: Tema gelap obsidian (`bg-slate-950`) dengan pencahayaan emas reflektif (`border-amber-500/30`), kad podium terlindung dengan animasi kunci denyut misteri (*suspenseful veiled cards*), dan bar telemetri langsung masa nyata di bahagian bawah.
   - **Kawalan Papan Kekunci Emcee**:
     - `Space` / `ArrowRight`: Melangkah ke fasa pendedahan seterusnya (`HIDDEN` -> `BRONZE` -> `SILVER` -> `CHAMPION` -> `ALL`). Di fasa `CHAMPION`, letupan bunga api (`canvas-confetti`) dicetuskan secara automatik.
     - `ArrowLeft`: Mengundur fasa pendedahan ke belakang sekiranya berlaku kesilapan klik.
     - `R`: Mengunci semula pentas ke mod bersiap sedia (`HIDDEN / Armed`) dengan makluman toast.
     - `C`: Mencetuskan letupan konfeti manual.
     - `F`: Menogol paparan skrin penuh (*fullscreen presentation*).

2. **Pemarkahan Sentuhan Tablet & Simpan Draf Automatik (Tablet-First Tactile Scoring & Auto-Save)**:
   - **Laluan**: `/ems/juri` dan `/ems/jury`.
   - **Simpan Draf Tempatan**: Setiap perubahan skor atau ulasan disimpan secara automatik ke dalam `sessionStorage` menggunakan kunci `ems_jury_draft_<eventId>_<juryCode>_<participantId>`. Status simpanan dipaparkan dengan lencana titik hijau berdenyut (`Draf disimpan setempat`).
   - **Pemulihan Pintar**: Apabila juri membuka semula penilaian peserta yang belum dihantar ke pelayan, data draf dipulihkan secara automatik dengan notifikasi toast.
   - **Ergonomik Tablet**: Butang skala Likert (1 - 5) dibina dengan sasaran sentuhan ergonomik (`min-h-[56px]`, `active:scale-[0.98]`, `touch-manipulation`).
   - **Aliran Urutan Pantas**: Butang `Simpan & Peserta Seterusnya` membolehkan juri menghantar markah peserta semasa dan terus membuka borang peserta seterusnya secara berturutan tanpa perlu kembali ke grid utama.

3. **Pendaftaran Pas Digital Gaya Apple Wallet**:
   - **Laluan**: `/ems/e/:eventId/register` dan `/ems/register/:id`.
   - Kad pas acara digital dibina dengan kontras gelap obsidian berbingkai emas, kod QR beresolusi tinggi untuk imbasan pintu masuk, nombor siri pendaftaran, dan butang cetak satu klik (`window.print()`).

4. **Pusat Kawalan Eksekutif (Command Palette / Cmd+K)**:
   - **Komponen**: `src/components/ui/CommandPalette.tsx` dipasang secara global pada peringkat akar `src/App.tsx` di dalam `BrowserRouter` supaya aktif di semua laluan aplikasi (termasuk `/portal`, `/`, EMS, MAKMP, dan PolyMart).
   - **Pintasan Papan Kekunci & Hotkey Capture**: Menggunakan `window.addEventListener('keydown', handleKeyDown, { capture: true })` dengan `e.preventDefault()` dan `e.stopPropagation()` pada fasa tangkapan (*capture phase*) bagi memintas pintasan `Ctrl+K` (Windows/Linux) dan `Cmd+K` (macOS) sebelum pelayar Chromium mengambil alih carian omnibox.
   - **Helper Pencetus Programatik**: Fungsi `triggerCommandPalette()` di `src/lib/commandPalette.ts` membolehkan bar carian di `Header.tsx`, `PortalNavbar.tsx`, dan `BottomNav.tsx` membuka dialog carian dengan satu klik.
   - **Aksesibiliti & Dialog Radix**: Dilengkapi dengan `DialogPrimitive.Title` dan `DialogPrimitive.Description` (`sr-only`) untuk mematuhi piawaian ARIA serta mengelakkan sebarang amaran hydration pelayar.
   - **Capaian Pantas EMS**: Menyediakan carian segera ke Papan Pemuka EMS, Kaunter Imbasan QR, Portal Juri, Semakan Sijil, Kelulusan Acara, dan pautan langsung ke pentas acara aktif yang diambil secara dinamik daripada jadual `ems_events`.

---

## 23. Modul Majlis Anugerah Kecemerlangan POLISAS (MAKMP)

Modul **Majlis Anugerah Kecemerlangan POLISAS (MAKMP)** ialah subsistem pencalonan, semakan, pemarkahan matriks, dan penganugerahan merit anugerah kecemerlangan tahunan bagi pelajar dan kelab/entiti Politeknik Sultan Haji Ahmad Shah.

### 23.1 Ciri-Ciri Utama Senibina MAKMP

1. **Permohonan Berbilang Anugerah Serentak (Multi-Award System — Lampiran IV)**:
   - Pelajar boleh memohon **lebih daripada satu anugerah serentak** dalam satu borang (`makmp_submission_awards`).
   - Merangkumi **9 Kumpulan Kategori** dan **18 Anugerah Rasmi** mengikut Garis Panduan Lampiran IV (Akademik, Kepimpinan, Sukan, Kebudayaan, Inovasi, Keusahawanan, Khidmat Masyarakat, Sahsiah, Khas).
   - Setiap anugerah yang dimohon menerima status kelulusan, catatan juri, dan kiraan merit yang berasingan (`MENUNGGU`, `DALAM_SEMAKAN`, `DISAHKAN`, `DITOLAK`).

2. **Dwi-Model Dokumen (Logik Khas Unit Keusahawanan & Kelab Entiti)**:
   - **Model A — Sijil & Pencapaian (`CERTIFICATES`)**: Digunakan untuk anugerah individu seperti *Tokoh Keusahawanan*, *Olahragawan*, *Tokoh Siswa*, dll. Dinilai berdasarkan matriks automatik Peringkat & Tahap Kejayaan (fast matrix merit scoring).
   - **Model B — Laporan Projek & Bukti Sokongan (`REPORT_AND_EVIDENCE`)**: Digunakan untuk kategori anugerah entiti/kumpulan seperti *Inkubator Terbaik*, *Perusahaan Terbaik*, dan *Program Terbaik*. 
     - Menyediakan sepanduk rasmi muat turun **Templat Laporan Rasmi** (Google Docs/PDF rasmi Unit Keusahawanan).
     - Dokumen #1 wajib mengandungi Laporan Projek PDF yang lengkap.
     - Dokumen #2 dan seterusnya memuatkan bukti sokongan (pendaftaran SSM, rekod jualan, transaksi kewangan, atau gambar operasi).
     - Borang meminta input nama entiti/kelab (`entity_name`) dan peranan pemohon (`applicant_role`).

3. **Borang Penyerahan Awam Berautentikasi Segera & Tanpa Syarat Login (`/makmp`)**:
   - Pelajar boleh memilih sama ada memiliki akaun portal (`PORTAL`) atau belum berdaftar (`MANUAL`).
   - **Log Masuk Segera (Inline Login Langkah 1)**: Pelajar dengan akaun portal boleh memasukkan No Matrik / Emel dan Kata Laluan secara terus di Langkah 1. Sistem mengesahkan identiti melalui RPC `resolve_login_identifier` dan `signInWithPassword`, auto-fill biodata pelajar, serta membuka capaian selamat ke repositori sijil e-Akademik peribadi.
   - **Import 1-Klik Sijil e-Akademik (`akademik_pencapaian`)**:
     - Pelajar yang telah mendaftar sijil dalam sistem e-Akademik tidak perlu memuat naik semula dokumen ke Google Drive.
     - Disediakan butang "✨ Pilih Dari e-Akademik Saya" dan modal pemilih sijil (`AkademikCertPickerModal`).
     - **Penapisan Tahun Edisi Automatik**: Sijil ditapis mengikut tahun edisi MAKMP secara lalai (cth: borang MAKMP 2026 menapis sijil tahun 2026 sahaja; sijil 2026 tidak akan mengelirukan edisi 2027), berserta tab pilihan "Semua Sijil".
     - Memaparkan status pengesahan e-Akademik (`DISAHKAN`, `MENUNGGU`, `DITOLAK`), pautan pratinjau Google Drive, dan pengisian automatik tajuk, peringkat, serta tahap pencapaian.
     - Rekod dokumen disimpan dengan punca `source = 'E_AKADEMIK'` dan foreign key `akademik_pencapaian_id`.
   - **Prinsip Integriti & Kebebasan Rekod e-Akademik**:
     - Penilaian juri MAKMP (`/makmp/juri`) adalah bebas sepenuhnya daripada rekod e-akademik asal.
     - Sekiranya juri MAKMP menolak atau mengubah markah anugerah MAKMP, status dan merit sijil asal dalam `akademik_pencapaian` kekal utuh dan tidak terjejas sama sekali.
   - Integrasi `StudentSearchCombobox` sebagai alternatif carian pantas profil pelajar jika tidak log masuk.
   - Pelajar tidak berdaftar boleh mengisi borang secara manual tanpa dihalang oleh sekatan log masuk.

4. **Resit Digital Penyerahan & Integrasi WhatsApp**:
   - Penjanaan Kod Rujukan tunggal (`MAKMP-2026-XXXXX`) dan Kod QR interaktif.
   - Pautan 1-klik pantas "Simpan ke WhatsApp" (`getMakmpWhatsAppUrl`) dengan teks pra-format rasmi merangkumi senarai semua anugerah yang dipohon.
   - Portal semakan status berterusan di `/makmp/status?code=...` yang memaparkan perincian status setiap anugerah secara berasingan.

5. **Portal Juri Mudah Alih Tanpa Login (`/makmp/juri`)**:
   - Pegawai/juri mengakses portal semakan melalui **Kod PIN Rahsia 6-Digit** (`makmp_jury_pins`) tanpa perlu mendaftar akaun portal.
   - Penapisan tugasan juri mengikut **Kumpulan Kategori** (`assigned_categories`, cth: PIN khas Unit Keusahawanan hanya melihat anugerah keusahawanan).
   - Antara muka *Split-View Workbench*: memaparkan dokumen laporan/sijil (`iframe` Drive / imej) di sebelah kiri berserta lencana punca `✨ e-Akademik` jika diimport dari e-akademik, dan panel penilaian di sebelah kanan.
   - Untuk anugerah berteraskan laporan, juri memasukkan markah merit secara terus berpandukan kualiti laporan. Untuk anugerah bersijil, juri melaraskan matriks peringkat/pencapaian.
   - Butang tindakan "1-Click Sahkan & Seterusnya" dan senarai pilihan pantas sebab penolakan rasmi (*canned rejection reasons*).

6. **Integrasi & Auto-Sync Sempurna ke e-Akademik & Merit**:
   - Menggunakan fungsi RPC PostgreSQL `sync_makmp_submission_to_akademik(submission_id)`.
   - Apabila disahkan, sijil yang dimuat naik secara manual (`source = 'MANUAL_UPLOAD'`) dimasukkan ke `akademik_pencapaian`, disusun automatik ke folder fail pelajar (`auto_sort_pencapaian_file`), dan merit ditambah melalui `increment_merit_by_source(user_id, points, 'AKADEMIK')` serta dicatat dalam `merit_transactions`. Sijil yang diimport dari e-Akademik tidak diduplikasi.
   - Jika pelajar belum berdaftar semasa penyerahan dan disahkan, *database trigger* `trg_sync_makmp_on_profile_create` akan memadankan `matric_no` dan menyelaraskan rekod secara automatik sebaik sahaja pelajar mendaftar akaun portal pada masa hadapan.

### 23.2 Skema Pangkalan Data MAKMP

| Jadual | Keterangan |
|---|---|
| `makmp_editions` | Edisi tahunan anugerah (tahun, tajuk, tarikh tutup, status aktif). |
| `makmp_award_definitions` | Definisi 18 anugerah rasmi (Lampiran IV): nama, kumpulan kategori, target (`INDIVIDUAL` vs `ENTITY`), syarat dokumen (`CERTIFICATES` vs `REPORT_AND_EVIDENCE`), pautan templat rasmi (`template_url`), had dokumen & merit maksima. |
| `makmp_categories` | Kategori asas pangkalan data legasi (nama, skop jabatan, kuota sijil, had maksima merit). |
| `makmp_jury_pins` | Kod PIN akses 6-digit juri/pegawai penilai, nama juri, organisasi, dan array tugasan kumpulan kategori (`assigned_categories`). |
| `makmp_submissions` | Rekod induk penyerahan pelajar (kod rujukan `MAKMP-2026-XXXXX`, matrik, nama, telefon, emel, jabatan, jumlah merit keseluruhan). |
| `makmp_submission_awards` | Junction table permohonan berbilang anugerah: menghubungkan permohonan ke anugerah (`award_id`), nama entiti (`entity_name`), peranan pemohon (`applicant_role`), status anugerah, merit yang diluluskan, sebab tolak, dan ulasan juri. |
| `makmp_submission_items` | Senarai dokumen/fail bagi setiap anugerah (`submission_award_id`), jenis dokumen (`SIJIL`, `LAPORAN`, `BUKTI_SOKONGAN`), sumber fail (`source`: `MANUAL_UPLOAD` / `E_AKADEMIK`), rujukan `akademik_pencapaian_id`, peringkat, tahap pencapaian, pautan Google Drive, merit cadangan, dan merit sah. |

### 23.3 Laluan (Routes) & Fail Halaman MAKMP

| Route | Fail Komponen | Mod Akses | Deskripsi |
|---|---|---|---|
| `/makmp` | `src/pages/makmp/MakmpPublicFormPage.tsx` | Public Standalone | **Borang Pencalonan Awam Berbilang Anugerah** — Pilihan akaun / manual, log masuk segera Langkah 1, 1-klik import sijil e-akademik, 9 kumpulan kategori & 18 anugerah rasmi, penjajaran jabatan rasmi POLISAS (JP, JKM, JTM, JKE, JKA, FTV) dengan auto-fill, muat naik tabbed per-anugerah, templat laporan rasmi, & resit WhatsApp. |
| `/makmp/status` | `src/pages/makmp/MakmpStatusTrackingPage.tsx` | Public Standalone | **Semakan Status Multi-Award** — Carian tracking code, kad status berasingan setiap anugerah, tag jenis dokumen (`LAPORAN`, `BUKTI_SOKONGAN`, `SIJIL`), sebab tolak & merit sah. |
| `/makmp/juri` | `src/pages/makmp/MakmpJuryPortalPage.tsx` | Public Standalone (PIN Protected) | **Portal Juri Berpusat** — Log masuk PIN 6-digit, tapisan pelbagai kategori tugasan (`assigned_categories: text[]` atau `SEMUA`), split-view workbench semakan laporan & bukti berserta lencana `✨ e-Akademik`, pemarkahan laporan projek vs matriks sijil (siling merit 50), lightbox fullscreen, & 1-click approve. |
| `/jpp/unit/akademik?tab=makmp` (alias: `/unit/akademik`, `/jpp/makmp`) | `src/pages/jpp/units/MakmpAdminDashboardPage.tsx` & `AkademikUnitDashboard.tsx` | Protected (Exco Akademik / JPP / Super Admin) | **Pusat Urus Setia & Kawalan MAKMP (Exco Akademik)** — Ditempatkan terus di bawah modul Exco Akademik (`/unit/akademik`): CRUD penuh 18 Anugerah Rasmi & Kategori Asas (Tambah, Kemaskini, Padam, Toggle Aktif), pengurusan PIN juri berbilang kategori dengan lencana & kawalan akses penuh, perincian multi-award permohonan, & eksport CSV dengan label jabatan POLISAS sebenar. |

### 23.4 Keselamatan, RLS & Table Grants (PostgreSQL Anon Access)

Bagi membolehkan borang awam `/makmp` dan semakan status `/makmp/status` diakses oleh sesi tanpa log masuk (`anon`), di samping polisi RLS, hak capaian jadual PostgreSQL (*table-level grants*) diberikan secara eksplisit:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.makmp_editions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.makmp_award_definitions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.makmp_categories TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.makmp_jury_pins TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.makmp_submissions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.makmp_submission_awards TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.makmp_submission_items TO anon, authenticated, service_role;
```
> [!IMPORTANT]
> Polisi RLS pada `makmp_*` mengawal baris mana yang boleh dibaca/ditulis mengikut prinsip `(SELECT auth.uid())` dan kod rujukan awam, manakala `GRANT` membenarkan role Supabase melepasi *table privilege check* (mengelakkan *PostgreSQL Error 42501: permission denied for table*).

### 23.5 Penjajaran Jabatan Sebenar POLISAS (`department`)

Tiada jabatan JTMK, JMSK atau JPA dalam struktur akademik POLISAS semasa. Semua modul MAKMP (`src/lib/makmp.ts`, borang awam, dan dashboard pentadbir) diselaraskan secara rasmi dengan `profiles.department` dan `JABATAN_LIST`:
- `perdagangan` — Jabatan Perdagangan (JP)
- `mekanikal` — Jabatan Kejuruteraan Mekanikal (JKM)
- `makanan` — Jabatan Teknologi Makanan (JTM)
- `elektrik` — Jabatan Kejuruteraan Elektrik (JKE)
- `awam` — Jabatan Kejuruteraan Awam (JKA)
- `ftv` — Asasi Teknologi Kejuruteraan (FTV)

Utiliti `getJabatanLabel(dept)` dan `JABATAN_OPTIONS` dalam `src/lib/makmp.ts` memastikan konsistensi paparan di seluruh antara muka pengguna.

### 23.6 Penyelarasan Siling Maksimum Merit (Max Merit 50)

Mengikut Matriks Merit Rasmi MAKMP (`MAKMP_MERIT_MATRIX`), mata merit dihitung mengikut Peringkat × Tahap Pencapaian di mana peringkat Antarabangsa Johan/Emas bersamaan 10 mata setiap sijil.
- **5 Sijil**: Siling maksimum merit ialah **50 mata** ($5 \times 10$ mata).
- **3 Sijil** (cth: Anugerah Inovasi & Rekacipta): Siling maksimum merit ialah **30 mata** ($3 \times 10$ mata).
- Jadual `makmp_award_definitions` dan `makmp_categories` telah dikemas kini melalui migrasi `20260916_makmp_update_max_merit_to_50.sql` bagi memastikan pelajar antarabangsa tidak mengalami pemotongan mata yang tidak adil.

### 23.7 Pengesahan E2E Multi-Agent Beta Testing (`e2e/makmp_full_beta_test.spec.ts`)

Bagi mensimulasikan penggunaan sebenar tanpa kecacatan sebelum dilancarkan kepada 1,500 pelajar, modul MAKMP telah diuji menggunakan suit ujian Playwright 13-Persona (`e2e/makmp_full_beta_test.spec.ts`):
1. **6 Sub-Agent Pelajar**:
   - Pelajar Berdaftar Multi-Award (Desktop): Memohon Tokoh Keusahawanan + Olahragawan serentak, muat naik sijil berbilang tab, & pengesahan resit WhatsApp.
   - Pelajar Manual Entiti (Mobile iPhone 14): Borang tanpa akaun, permohonan Inkubator Terbaik (Kelab Koperasi), pengesanan templat laporan rasmi, & muat naik laporan projek PDF.
   - Penguatkuasaan Had Kuota: Menguji sekatan kuota dokumen kategori Inovasi (tambah dan buang dokumen secara dinamik).
   - Format Sijil Gambar PNG (Mobile Pixel 7): Muat naik format imej sijil Olahragawati dan penentukuran merit automatik.
   - Ujian Sempadan & Had Fail: Sekatan fail >10MB dan semakan status penyerahan di `/makmp/status`.
   - **Import Sijil e-Akademik 2026 (Persona 13)**: Mengimport sijil sedia ada daripada rekod e-akademik pelajar, menapis mengikut tahun edisi 2026, menghantar tanpa muat naik semula fail, serta mengesahkan lencana `✨ e-Akademik` pada portal juri.
2. **5 Sub-Agent Juri / Pegawai Penilai**:
   - Log masuk PIN 6-digit (`884920`) dengan penapisan berbilang kategori tugasan juri.
   - Split-screen document workbench & fullscreen image/PDF lightbox dengan zoom in/out.
   - Pelarasan markah merit laporan projek dan matriks sijil (siling maksimum sehingga 50 mata).
   - Aliran 1-click "Sahkan & Seterusnya" berserta penyelarasan automatik ke e-akademik.
   - Aliran penolakan anugerah dengan pilihan pantas sebab rasmi (*canned rejection reasons*).
3. **2 Sub-Agent EXCO / Urus Setia**:
   - Pemantauan KPI masa nyata dan penapisan status permohonan di bawah Pusat Kawalan Exco Akademik.
   - CRUD penuh Anugerah & Kategori: Tambah anugerah/kategori baharu, edit syarat dokumen dan kuota, toggle status aktif/nyahaktif, dan padam rekod selamat.
   - Penjanaan & kemaskini PIN juri dengan pilihan multi-kategori dan mod akses penuh (`SEMUA`).
   - Eksport data CSV berbilang anugerah dengan nama jabatan POLISAS rasmi.

### 23.8 Penjajaran Anugerah Rasmi dalam Penugasan PIN Juri

Bagi mengelakkan kekeliruan di mana modal PIN juri hanya memaparkan nama kumpulan kategori generik, sistem penugasan PIN juri telah diselaraskan dengan senarai anugerah rasmi (`makmp_award_definitions`):
- **Hierarki Kumpulan & Anugerah**: Setiap anugerah tersusun kemas di bawah Kumpulan Kategori masing-masing (cth: *ANUGERAH KEUSAHAWANAN* mengandungi *Tokoh Keusahawanan*, *Inkubator Terbaik*, *Program Keusahawanan*, & *Perusahaan Terbaik*).
- **Fleksibiliti Penugasan**:
  1. **⭐ Akses Penuh Semua Anugerah** (`'ALL'`).
  2. **Pilih Seluruh Kumpulan** (cth: Klik butang "Pilih Semua Kumpulan" untuk melantik juri menyemak keseluruhan anugerah dalam kumpulan berkenaan).
  3. **Pilih Anugerah Khusus** (cth: Pegawai A hanya menyemak *Inkubator Terbaik* & *Perusahaan Terbaik*).
- **Carian Masa Nyata (*Real-Time Filter*)**: Membolehkan urus setia menapis anugerah serta-merta semasa menetapkan tugasan juri.
- **Logik Penapisan Queue Juri (`fetchJuryAwardApplications`)**: Memadankan `assigned_categories` mengikut nama anugerah rasmi secara tepat, ID anugerah, mahupun nama kumpulan kategori tanpa konflik padanan rentetan.
- **Lencana Kad Juri**: Kad PIN membezakan lencana kumpulan (`📁 Kumpulan`) dan anugerah khusus (`🏆 Anugerah`) untuk kejelasan pengurusan.

### 23.9 Mekanisme Penyelarasan Merit Automatik & Kawalan Manual Juri (`MakmpJuryPortalPage.tsx`)

Bagi menjamin ketepatan pengiraan merit anugerah dan kelancaran proses semakan tanpa ralat manusia, portal juri MAKMP (`src/pages/makmp/MakmpJuryPortalPage.tsx`) mengintegrasikan enjin penentukuran merit automatik (*auto-sync*) dipacu formula berasaskan matriks rasmi (`src/lib/makmp.ts`), dengan sokongan prapemuatan pintar (*smart hydration*) serta kawalan manual juri (*manual override*).

#### 1. Formula Pengiraan Merit Mengikut Jenis Dokumen
Sistem membahagikan pengiraan merit dokumen kepada 3 modul logik:

- **A. Sijil Standard (Model Additive Peringkat + Tahap):**
  Menggunakan fungsi `calculateSuggestedMerit(peringkat, pencapaianType)`:
  $$\text{Merit} = \text{getPeringkatMerit}(\text{peringkat}) + \text{getTahapMerit}(\text{tahap})$$
  - Nilai dijepit (*clamped*) antara 0 hingga maksimum **10 mata** bagi setiap sijil.
  - Nilai Peringkat (`PERINGKAT_MERIT`): Antarabangsa = 5, Kebangsaan = 4, Negeri = 3, Daerah/Zon = 2, Politeknik = 1.
  - Nilai Tahap Pencapaian (`TAHAP_MERIT`): Johan/Emas = 5, Naib Johan/Perak = 4, Ketiga/Gangsa = 3, Peserta = 2, Lain-lain = 1.

- **B. Sijil Anugerah Kepimpinan JPP:**
  Dikesan melalui utiliti `isKepimpinanJppAward(awardName)` (cth: *"Anugerah Kepimpinan JPP Terbaik"*).
  Menggunakan fungsi `getKepimpinanJppMerit(peringkat, role)`:
  $$\text{Merit} = \text{KEPIMPINAN\_JPP\_PERINGKAT\_MERIT}[\text{peringkat}] + \text{getKepimpinanJppRoleMerit}(\text{role})$$
  - Nilai Peringkat (`KEPIMPINAN_JPP_PERINGKAT_MERIT`): Antarabangsa = 5, Kebangsaan = 4, Negeri = 3, Daerah = 2, Politeknik = 1.
  - Nilai Peranan Kepimpinan (`KEPIMPINAN_JPP_OPTIONS`): Pengarah/Pengerusi = 5, Timbalan Pengarah/Pengerusi = 4, Setiausaha/Bendahari = 3, Ahli Jawatankuasa (AJK) = 2, Penyertaan = 1.
  - Siling maksimum adalah **10 mata** per sijil.

- **C. Laporan Projek & Keusahawanan (`document_type === 'LAPORAN'`):**
  Markah mentah laporan dinilai atas skala 0 hingga 100 dan ditukar kepada merit (maks 10):
  $$\text{Merit Laporan} = \max\left(0, \min\left(10, \text{Math.round}\left(\frac{\text{report\_score}}{10}\right)\right)\right)$$
  - Pelarasan slider/input markah laporan akan mengemas kini `report_score` dan secara automatik menjana nilai `merit_awarded` sepadan.

#### 2. Pemuatan Awal Pintar (*Smart Hydration*)
Semasa juri membuka modal penilaian (`openReviewModal`), item semakan (`reviewItems`) dihidrasikan mengikut hierarki keutamaan berikut:
```typescript
const formulaMerit = getItemFormulaMerit(item, isKepimpinan);
const initialMerit =
  item.merit_awarded > 0
    ? item.merit_awarded
    : (item.merit_suggested && item.merit_suggested > 0)
    ? item.merit_suggested
    : formulaMerit;
```
1. **`item.merit_awarded`**: Digunakan jika item telah dinilai atau disahkan terdahulu (> 0).
2. **`item.merit_suggested`**: Digunakan jika permohonan baru membawa nilai cadangan merit pemohon (> 0).
3. **`formulaMerit`**: Digunakan sebagai sandaran automatik (*fallback*) berasaskan formula sekiranya kedua-dua nilai di atas sifar/kosong.

#### 3. Penyelarasan Automatik Semasa Semakan (*Auto-Sync on Change*)
Apabila juri mengubah dropdown **Peringkat Sah** atau **Tahap Sah / Peranan Kepimpinan**, pengendali `handleUpdateItemReview` secara reaktif memanggil `getItemFormulaMerit(updated, isKepimpinan)`.
Nilai `merit_awarded` akan disegerakkan serta-merta tanpa memerlukan juri mengira secara manual atau memasukkan angka satu persatu.

#### 4. Pengendalian Manual Override & Pemulihan Automatik (`↺ Auto`)
Walaupun sistem menyediakan kiraan automatik, budi bicara juri dihormati sepenuhnya:
- **Pengesanan Status Override:**
  Keadaan dinilai melalui `isManualOverride = (rItem.merit_awarded !== formulaMerit)`.
- **Penunjuk Lencana Interaktif:**
  - `Auto`: Lencana hijau zamrud (`bg-emerald-100 text-emerald-800`) menandakan nilai merit mematuhi formula standard.
  - `Manual`: Lencana ambar (`bg-amber-100 text-amber-800`) berserta garisan sempadan input ambar memberi amaran visual bahawa nilai telah diubah suai oleh juri.
- **Butang Reset `↺ Auto` (`RotateCcw`):**
  Jika juri ingin membatalkan ubah suai manual, klik pada butang `↺ Auto` atau pautan cadangan `Guna Cadangan ({formulaMerit})` akan mencetuskan aksi `'reset_auto'` untuk memulihkan `merit_awarded` kepada nilai formula terkini serta-merta.

---

## 24. Modul Persembahan Eksekutif Berasaskan Web (`WEBSITE/`)

Persembahan slaid eksekutif berasaskan web yang berasingan di dalam direktori `WEBSITE/` direka khas untuk pembentangan aras tinggi kepada pihak pengurusan kanan dan Pegawai JHEP POLISAS.

### 24.1 Senibina Modular & Ciri Utama
- **Fail Kendiri:** `WEBSITE/index.html`, `WEBSITE/app.js`, `WEBSITE/style.css`, dan `WEBSITE/assets/`.
- **Tema Visual:** Modern Tech Minimalist (Light Theme) berteraskan reka bentuk Double-Bezel ala Apple/Linear.
- **Navigasi Slaid:** Enjin slaid native JavaScript berasaskan hash URL (`#slide-1` hingga `#slide-11`), papan kekunci (`ArrowRight`, `Space`, `Enter`, `ArrowLeft`, `F` untuk Fullscreen, `P` untuk Cetak/PDF, `M` untuk Slide Drawer, `1-9` untuk lompat slaid).
- **Bar Kawalan Terapung:** `#floating-nav` dan `#progress-bar` memaparkan penunjuk slaid semasa (`01 / 11`) dan kawalan interaktif pantas.

### 24.2 Senarai 11 Slaid Eksekutif & Komponen Interaktif
1. **Slaid 1 (Muka Depan):** Identiti berkembar POLISAS & JPP, lencana inisiatif kampus pintar JHEP.
2. **Slaid 2 (Impak & Angka Sebenar):** Kaunter metrik beranimasi disahkan pangkalan data (2,733+ Pelajar, 60 Bisnes Usahawan Siswa, 276 Produk PolyMart, 850 Push Subscribers, 21 Kelab, 1,500 kapasiti serentak) dengan suis togol tangkapan skrin sebenar JPP HQ & Gambaran Sistem Portal.
3. **Slaid 3 (PolyMaps):** Navigasi satelit kampus pintar (`real_polymaps.jpg`), penukar laluan berbumbung hujan & carian blok zon jabatan.
4. **Slaid 4 (PolyMart & POS):** Marketplace siswa (`real_polymart.png`) dan terminal juruwang Web POS (`real_pos.png`) imbas kod bar serta resit digital.
5. **Slaid 5 (E-Kebajikan):** Perbandingan Google Form dulu vs Sistem Tiket Sebenar (`real_kebajikan.png`, SLA < 24-48j) berserta simulasi sembang langsung 2-hala.
6. **Slaid 6 (E-Akademik):** Rekod HPNM sebenar 3.97 Cemerlang (`real_akademik_hpnm.png`), kalkulator CGPA unjuran graduasi & pemuat turun e-Sijil digital terverifikasi.
7. **Slaid 7 (EMS & Kehakiman):** Papan pemuka pengurusan acara sebenar (`real_ems_events.png` - Gema Merdeka, Siswapreneur Showcase, iFAMB), check-in QR, kalkulator rubrik live berkod PIN juri & penjanaan e-sijil berkod QR.
8. **Slaid 8 (Laporan Auto-Generate):** Pusat Dokumen Kelab Mechanical Student Society (`real_laporan_auto.png`) dengan enjin penjanaan laporan bulanan automatik berstatus DILULUSKAN dalam 60 saat serta kelulusan berperingkat.
9. **Slaid 9 (MAKMP):** Pencalonan Terbuka MAKMP 2026 Multi-Award (`real_makmp_awards.png`), kalkulator skor merit rasmi (Antarabangsa 100m, Kebangsaan 80m, Negeri 60m, Daerah 40m, Politeknik 20m) dan portal juri berjejak audit.
10. **Slaid 10 (Nexus AI & Dual-RBAC):** Pembantu pintar draf kertas kerja berkuasa Gemini API, matriks hierarki 4 peranan (Super Admin, Majlis Tertinggi, Exco, Pelajar) dan pengasingan data PostgreSQL Row Level Security (`(SELECT auth.uid())`).
11. **Slaid 11 (Rumusan Eksekutif, ROI & Hala Tuju Strategik — Tanpa Q&A):** Reka bentuk Hero Showcase Split (40/60) berprestij: Ruang kiri memaparkan 3 metrik nombor besar (2,733+ Pelajar Sah, 59 Usahawan Siswa, < 24 Jam SLA Respon) & Lencana Penghantaran Exco KPP (100% Sedia); Ruang kanan memaparkan tingkap pelayar uncompressed UI sebenar Hab Eksekutif JPP HQ (`real_jpp_pengurusan.png`) dengan suis ke Laman Utama (`real_mainpage.png`), 3 cip lencana terapung, dan Lightbox zoom.

### 24.3 Standard Visual & Kad Before-After (Slaid 3–10)
- **Format 2-Bullet Ringkas:** Setiap kad *SEBELUM* (Rose) dan *SELEPAS* (Emerald) menggunakan format senarai berpoin tajuk tebal (bold keywords) 1-baris tanpa teks perenggan berjela-jela, menjamin imbasan eksekutif pantas dalam masa 3 saat tanpa kesesakan teks (*word cluttered*).
- **Pengesyoran Cetakan PDF (`@media print`):**
  - Konfigurasi `@page { size: 297mm 210mm landscape; margin: 0; }`.
  - Setiap `.slide` diformat sebagai satu mukasurat landskap tepat dengan `break-after: page;` dan `page-break-inside: avoid;`.
  - Elemen terapung `.no-print`, `#floating-nav`, `#progress-bar`, `#slide-drawer`, `#toast-container` disembunyikan secara automatik semasa cetakan PDF.

---

## 25. Senibina Tema Global (Default Light Theme & Dwi-Tema Menyeluruh MAKMP / JPPHQ)

Sistem beroperasi secara rasmi dengan **Light Theme sebagai mod lalai (*default mode*)** bagi seluruh ekosistem aplikasi, terutamanya modul awam MAKMP dan keseluruhan halaman Hab Pengurusan JPPHQ (`/jpp/*`).

### 25.1 Konvensyen & Keutamaan Pilihan Pengguna
- **Lalai Tanpa Tetapan (`localStorage === null`)**: Pengguna baharu atau tetamu yang mengakses mana-mana halaman portal akan dipaparkan dengan **Light Theme** secara automatik.
- **Keutamaan Pilihan Pengguna**: Sekiranya pengguna menukar tema kepada **Dark Theme**, pilihan tersebut disimpan ke dalam `localStorage.getItem('theme')` dan dihormati secara berterusan merentas sesi.
- **Pencegahan Flash Latar Belakang**: Skrip sebaris (*inline script*) dalam `<head>` pada `index.html` memeriksa `localStorage` sebelum pemasangan React untuk mengelakkan kelipan putih jika pengguna telah menetapkan tema gelap.

### 25.2 Modul MAKMP (Dwi-Tema Bersih & Aksen Emas Rasmi)
- **Komponen & Halaman Terlibat:**
  - `src/components/makmp/MakmpJppChrome.tsx`: `MakmpJppHeader` menyertakan `ThemeToggle` di bar atas kanan.
  - `src/components/makmp/MakmpRankingView.tsx`: Kad kedudukan pemenang dan senarai ranking dwi-tema tanpa kotak gelap pada mod cerah.
  - `src/components/makmp/MakmpWinnerBanner.tsx`: Sepanduk pengumuman pemenang adaptif dengan sempadan dan bayang kemas.
  - `src/pages/makmp/MakmpPublicFormPage.tsx`: Borang Pencalonan Pelajar & Wizard Multi-Langkah.
  - `src/pages/makmp/MakmpStatusTrackingPage.tsx`: Semakan Resit Status & Maklumat Pemenang.
  - `src/pages/makmp/MakmpJuryPortalPage.tsx`: Skrin PIN Juri, Meja Penilaian & Tab Kedudukan.
- **Standard Visual**:
  - Menggunakan `bg-slate-50 dark:bg-slate-950` sebagai latar belakang utama.
  - Kad dan panel menggunakan `bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm`.
  - Mengekalkan aksen emas diraja (*Royal Gold / Amber* `text-amber-600 dark:text-amber-400`, `bg-amber-500`) bagi mengekalkan prestij majlis anugerah.

### 25.3 Hab Pengurusan Utama JPPHQ (`/jpp`) & Sidebar Maroon Lembut
- **Komponen & Halaman Terlibat:**
  - `src/pages/jpp/JppLayout.tsx`: Penyingkiran kelas `dark` statik pada akar shell; `ThemeToggle` pada bar navigasi mobile.
  - `src/pages/jpp/JppSidebar.tsx` & `src/pages/jpp/jppConfig.ts`:
    - **Mod Cerah (Light Mode)**: Menggunakan kecerunan *Soft Maroon Tint* (`#fff8f8` hingga `#fee2e2`) dengan sempadan mawar lembut (`border-rose-200/70`) dan tipografi berkontras tinggi (`text-rose-950`). Menghilangkan ketidakselarasan sidebar hitam pekat pada mod cerah sambil mengekalkan identiti warna rasmi POLISAS.
    - **Mod Gelap (Dark Mode)**: Mengekalkan warna Maroon tandatangan POLISAS mendalam (`rgb(r*0.07, g*0.03, b*0.03)`).
  - `src/pages/jpp/JppHomePage.tsx`: Dashboard ringkasan (StatCard, UnitCard, TakwimCard, QuickActions dalam mod dwi-tema).
  - `src/pages/jpp/JppMembersPage.tsx`: Pengurusan ahli JPP, modal pendaftaran, kad status & hierarki exco.
  - `src/pages/jpp/JppUsersPage.tsx`: Pengurusan akaun pengguna sistem, carian, penapis peranan & tindakan pengguna.
  - `src/pages/jpp/JppOverviewPage.tsx`: Pemantauan aktiviti kelab rentas-organisasi & metrik kelulusan.
- **Standard Visual**:
  - Kawasan kandungan (*content area*) bertukar kepada mod cerah (`bg-slate-100 dark:bg-[#0a0a0f]`) dengan kad putih berbayang halus (`shadow-sm`) dan teks kontras tinggi (`text-slate-900 dark:text-white`).

### 25.4 Pengurusan Demerit & Merit (`DemeritManager.tsx` & `AkademikMeritPage.tsx`)
- **Komponen Terlibat:**
  - `src/pages/akademik/DemeritManager.tsx`: Modul pengurusan demerit pelajar (digunakan dalam tab unit KK, KPP, Akademik dan pentadbir). Kad carian pelajar, rekod potongan, panel rayuan pelajar, dan dialog tutup kohort ditukar kepada dwi-tema berkontras tinggi.
  - `src/pages/akademik/AkademikMeritPage.tsx`: Pusat rekod merit pelajar, kad jumlah merit semasa, grid pecahan (Kelab, Akademik, Asrama, Demerit), garis masa transaksi dan modal rayuan.

### 25.5 Operasi Kampus (`/jpp/polymaps`, `/jpp/takwim`, `/jpp/pengumuman`)
- **Komponen & Halaman Terlibat:**
  - `src/pages/jpp/JppPolyMapsAdmin.tsx`: Pengurusan PolyMaps (header, penapis tab, kad bangunan, jadual lokasi, laluan pejalan kaki & dialog modal).
  - `src/pages/jpp/JppTakwimPage.tsx`: Takwim aktiviti (tukar sesi, paparan jadual `TakwimTable`, paparan kalendar `TakwimCalendar`, dialog CRUD acara).
  - `src/pages/jpp/AnnouncementsPage.tsx`: Pengumuman rasmi & hebahan kampus (lencana sasaran, modal respon & kontras teks tajuk).

### 25.6 Sistem & Utiliti Pentadbiran (`/jpp/logs`, `/jpp/settings`, `/jpp/nexus`, `/jpp/telemetry`, `/jpp/services`, `/jpp/structure`, `/jpp/asrama`)
- **Komponen & Halaman Terlibat:**
  - `src/pages/jpp/JppLogsPage.tsx`: Audit log sistem, kad ringkasan AI, bar statistik & jadual peristiwa audit.
  - `src/pages/jpp/JppSettingsPage.tsx`: Konfigurasi takwim akademik, kod staf, permintaan sunting profil & pengurus pautan QR.
  - `src/pages/jpp/JppNexusPage.tsx`: Nexus AI Admin Hub, pemantauan model AI, kill-switch & token analytics.
  - `src/pages/jpp/JppTelemetryPage.tsx`: Telemetri sistem, status server Node.js, status kluster PostgreSQL & carta aktiviti Recharts.
  - `src/pages/jpp/PolyServicesAdmin.tsx`: Pentadbiran PolyServices, penapis tab, kad pos/komen confession & panel analitik sentimen.
  - `src/pages/jpp/JppStructureSettings.tsx`: Tetapan struktur carta organisasi JPP & input jawatan exco.
  - `src/pages/jpp/JppAsramaPage.tsx`: Papan rujukan asrama KAMSIS & pemohon rayuan.

### 25.7 Ekosistem EMS (`/ems/*`) — Tema Ungu & Kontras Tinggi Juri
- **Warna Tema Rasmi**: **Ungu Diraja (*Royal Purple* / `#7c3aed` / `purple-600`)** sebagai warna aksen primer di seluruh modul EMS.
- **Penyelesaian Kebolehlihatan Juri (Dark Mode & Light Mode)**:
  - Isu kesukaran juri menilai dalam mod gelap diselesaikan dengan memperkukuh `LIKERT_OPTIONS`:
    - Menggantikan lencana pudar dengan warna kontras tinggi bertenaga (`bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-300`).
    - Butang terpilih (*selected*) menggunakan warna pepejal pekat dengan teks putih terang dan lingkaran *ring* jelas.
    - Kotak deskriptor kriteria skor menggunakan latar berbeza (`bg-slate-100 dark:bg-slate-800/90`) dengan teks terang yang tajam.
  - Penambahan `ThemeToggle` pada bar atas portal juri (`EmsJuryPortalPage.tsx`) dan skrin PIN kemasukan.
- **Liputan Penuh Halaman EMS**:
  - `src/pages/ems/EmsJuryPortalPage.tsx`: Portal Penjurian, skrin kod PIN, hab kategori, modal rubrik dan kad ringkasan markah.
  - `src/pages/ems/EmsPublicRegisterPage.tsx`: Borang pendaftaran peserta awam & pelajar, wizard 4-langkah, dropzone fail & tiket pas digital.
  - `src/pages/ems/EmsAudienceScanPage.tsx`: Portal imbasan QR kehadiran pengunjung, kad pendaftaran & notifikasi milestone pemenang bertuah.
  - `src/pages/ems/EmsLeaderboardPage.tsx`: Papan pendahulu penganjur dan **Mod Pentas Skrin Besar** (`/ems/stage/:eventId`) yang menyokong pertukaran dwi-tema untuk auditorium bercahaya terang mahupun projektor pentas gelap.
  - `src/pages/ems/EmsCertificatePage.tsx` & `src/pages/ems/EmsCertVerifyPage.tsx`: Portal semakan sijil digital dan paparan PDF dengan aksen ungu dan ThemeToggle.
  - `src/pages/ems/EmsDashboardPage.tsx`: Papan pemuka pentadbiran EMS, kad acara, tab penapis status, modal kod juri, modal pendaftaran manual, senarai e-sijil.
  - `src/pages/ems/EmsEventFormPage.tsx`: Borang cipta/kemaskini acara dan pembina kriteria rubrik juri.
  - `src/pages/ems/EmsApprovalPage.tsx`: Meja kelulusan kertas kerja acara.
  - `src/pages/ems/EmsCheckinSelectorPage.tsx` & `src/pages/ems/EmsCheckinPage.tsx`: Hab pengimbas kamera QR kehadiran peserta/pengunjung.
- **Integrasi Penjurian MAKMP Keusahawanan (Migrasi 100)**:
  - Acara rasmi `MAKMP 2026 - ANUGERAH KEUSAHAWANAN` dikonfigurasi secara automatik merangkumi 2 kategori rubrik mengikut Borang Penjurian AKMP 2026:
    1. *Anugerah Projek Keusahawanan Terbaik* (5 kriteria x pekali 4, skala Likert 1-5, jumlah 100).
    2. *Anugerah Perusahaan Pelajar Terbaik* (7 kriteria: Logo x1, Maklumat x3, Aktiviti x2, Organisasi x1, Pencapaian x3, Jualan x4, Bukti Kewangan/SSM x5).
  - Prapendaftaran 7 calon permohonan MAKMP beserta pautan fail PDF/imej ke dalam `ems_participants`.
  - Penambahan lajur metadata juri `ic_no`, `email`, dan `office_address` pada `ems_jury_codes` berserta konfigurasi 5 kod PIN juri rasmi (3 panel luar, 1 pegawai dalaman Unit Keusahawanan, dan 1 akaun ujian pentadbir).
  - Sokongan semakan dokumen PDF & imej secara terus dalam modal pemarkahan juri (`EmsJuryPortalPage.tsx`) bagi mengesahkan bukti SSM dan penyata kewangan calon.
### 25.8 Pusat Kawalan Food Bank JPP (`/jpp/foodbank`)
- **Fail Utama:** `src/pages/jpp/JppFoodBankAdmin.tsx`
- **Laluan:** `/jpp/foodbank` (didaftarkan di bawah `JppLayout` dalam `src/App.tsx`)
- **Akses & RBAC:** YDP, Super Admin, MT, Exco Kebajikan, KPP, KK, Akademik, HEP (`canAccessFoodBank`).
- **Jadual Pangkalan Data:** `foodbank_settings`, `foodbank_items`, `foodbank_applications`, `foodbank_distribution_locations`, `foodbank_budget_transactions`, `foodbank_location_stocks`, `foodbank_officers`, `foodbank_audit_logs`, `imaps_buildings`.
- **Ciri-ciri Utama:**
  - **Header KPI & Kawalan Sesi:** Paparan peruntukan belanjawan RM70,000, jumlah belanja semasa (`current_spent`), dan baki dengan bar peratusan; metrik permohonan Menunggu/Lulus/Selesai; suis pantas buka/tutup permohonan (`is_application_open`).
  - **Tab 1: Pengurusan Permohonan & Imbasan Kaunter:** Kotak carian pantas imbasan kod QR (FB-...) / No. Matrik; tindakan meluluskan dan menolak dengan modal sebab; tindakan pengesahan pengambilan fizikal di kaunter memanggil fungsi atomik RPC `verify_and_complete_foodbank_pickup(p_application_id, p_verifier_id)` / `verify_and_complete_foodbank_pickup_by_qr(p_qr_code, p_verifier_id)` yang mengunci stok, menolak inventori secara atomik, menambah kos ke `current_spent` dan memasukkan log lejar `foodbank_budget_transactions`.
  - **Tab 2: Pengurusan Inventori & Stok:** Katalog barangan berbilang kategori (`MAKANAN`, `MINUMAN`, `KEBERSIHAN`, `KEPERLUAN_ASAS`), pengubah stok pantas (`+10`, `+50`, `-10`), toggle aktif, muat naik gambar ke storage dengan kompresi automatik melalui `uploadFileToDrive`.
  - **Tab 3: Penjejakan Bajet & Lejar Audit (RM70,000):** Analitik penggunaan bajet peruntukan siling RM70k, jadual transaksi lejar audit lengkap dengan nama pegawai, permohonan dan amaun; modal pelarasan/suntikan bajet.
  - **Tab 4: Tetapan Sesi & Formula Kuota:** Formula kuota had permohonan bulanan dan barangan asas, teks hebahan arahan & syarat kelayakan, serta CRUD lokasi pengagihan berintegrasi PolyMaps 360° (`imaps_buildings`).

### 25.9 Modul Pelajar Food Bank JPP (`/kebajikan/foodbank`) & Autocomplete Rakan Serumah
- **Fail Utama:** `src/pages/kebajikan/KebajikanFoodBankPage.tsx`, `src/components/foodbank/FoodBankQrPassModal.tsx`, `src/lib/foodbankDefaults.ts`
- **Laluan:** `/kebajikan/foodbank` (didaftarkan di bawah `KebajikanLayout` dalam `src/App.tsx`)
- **Akses & Syarat Kelayakan:** Terbuka kepada semua pelajar POLISAS yang log masuk (`isAuthenticated`). Sistem mengehadkan kepada **1 permohonan aktif pada satu masa** (Permohonan baru hanya dibenarkan selepas permohonan terdahulu berstatus `COMPLETED` atau `REJECTED`).
- **Formula Kuota Rakan Serumah:**
  - Formula: `Math.min(items_per_person * (1 + housemates.length), max_items_limit)`
  - Asas 5 barangan untuk pemohon, tambahan +5 barangan bagi setiap rakan serumah yang sah, tertakluk kepada had siling maksimum sesi (contoh: 20 barangan).
- **Carian Pintas & Autocomplete Rakan Serumah Masa Nyata:**
  - Pemohon boleh menaip nama penuh atau nombor matrik rakan serumah dalam input carian `housemateQuery`.
  - Carian mengkuiri jadual `profiles` secara masa nyata (`or(full_name.ilike.%${q}%,matric_no.ilike.%${q}%)`) dengan pencegahan penduaan rakan serumah sedia ada dan pengecualian akaun pemohon sendiri.
  - Memaparkan kad cadangan lengkap dengan inisial avatar, nama penuh, nombor matrik, dan jabatan akademik berserta butang "Tambah" 1-klik pantas.
  - Menyediakan borang manual sandaran (*fallback form*) sekiranya rakan serumah belum mendaftar akaun portal.
- **Katalog Barangan & Pemilihan Slot Pengambilan:**
  - Barangan dikategorikan (`MAKANAN`, `MINUMAN`, `KEBERSIHAN`, `KEPERLUAN_ASAS`) dengan kawalan kuota barangan secara interaktif.
  - Pilihan lokasi pengagihan kampus berintegrasi dengan pautan terus ke lokasi blok PolyMaps.
- **Pas Pengambilan Digital Kod QR (`FoodBankQrPassModal`):**
  - Menjana kod QR unik (`FB-YYYYMMDD-XXXX`) dan pas digital rasmi untuk diimbas oleh petugas JPP semasa serahan barangan di kaunter.

### 25.10 Integrasi 3D PolyMaps 360° Panoramik & Petunjuk Hijau Pentadbir
- **Fail Utama:** `src/lib/polymaps360Data.ts`, `src/components/polymaps/Pannellum360Viewer.tsx`, `src/pages/polymaps/PolyMapsPage.tsx`, `src/pages/jpp/JppPolyMapsAdmin.tsx`
- **Migrasi Pangkalan Data:** `supabase/migrations/88_foodbank_and_polymaps_360.sql` & `supabase/migrations/89_polymaps_360_verified_seed.sql`
- **Pangkalan Data 360 Terverifikasi (`polymaps360Data.ts`):**
  - Mengandungi pemetaan URL imej equirectangular 360° resolusi tinggi dari repositori rasmi `normane176680.github.io/my-map-polisas/` untuk 28 bangunan utama kampus POLISAS (Blok Kejuruteraan Elektrik A, Awam B, Mekanikal C, Perdagangan D, Dewan Sri Mahkota, Pentadbiran Pusat, Kamsis Ibnu Sina, Mahkota Square, Kafe, dll.) dan lebih 200 ruang bilik/makmal.
  - Kesemua 28 pautan imej disahkan secara langsung berstatus HTTP 200 OK.
  - Menyediakan fallback pintar di peringkat frontend supaya paparan 360° berfungsi secara serta-merta tanpa bergantung sepenuhnya kepada ketersediaan kolum pangkalan data `panorama_360_url`.
- **Petunjuk Hijau Pengawasan Pentadbir (`JppPolyMapsAdmin.tsx`):**
  - Semua kad bangunan dan lokasi yang memiliki liputan 3D panorama dipaparkan dengan sempadan hijau menyerlah (`border-2 border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/25`) berserta lencana beranimasi `360° AKTIF` bagi memudahkan pengawasan dan pemantauan menyeluruh pentadbir JPP.
- **Pengalaman Interaktif Pelajar (`PolyMapsPage.tsx` & `Pannellum360Viewer.tsx`):**
  - Kad perincian bangunan memaparkan butang terapung beranimasi `🧭 360° Street View` supaya pelajar dapat melihat pandangan 360° dengan serta-merta tanpa perlu menekan tab manual.
  - Paparan skrin penuh interaktif dikuasakan oleh enjin WebGL Pannellum 2.5.6 dengan sokongan sentuhan mudah alih, kawalan seretan tetikus (*mouse drag*), putaran auto (*auto-rotate*), dan kompas orientasi.

### 25.11 Penambahbaikan Kawalan Pentadbir 360°, Suis Induk Food Bank & Hab Kebajikan Eksekutif
- **Kawalan Berbutir Pentadbir PolyMaps 360° (`JppPolyMapsAdmin.tsx`, `polymaps360Data.ts`):**
  - **Status Lalai:** Setiap integrasi 360° bagi bangunan dan bilik ditetapkan kepada **MATI (OFF)** secara lalai sehingga disahkan oleh pentadbir.
  - **Skema Warna Lencana Dwi-Status:**
    - *Tersedia tapi MATI:* Kotak bersempadan **BIRU** (`border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/25`) dengan lencana `360° TERSEDIA (OFF)` untuk semakan pentadbir.
    - *Diaktifkan (ON):* Kotak bersempadan **HIJAU** (`border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/25`) dengan lencana `360° AKTIF`.
  - **Butang Pratonton 1-Klik:** Pentadbir boleh membuka modal pratonton Pannellum 360° sebelum menukar suis toggle.
  - **Pills Penapis Status 360:** Penapisan pantas mengikut `Semua`, `360° Aktif (Hijau)`, `360° Tersedia (Biru)`, dan `Tiada 360`.
  - **Sekatan Paparan Pelajar:** Pelajar di `/polymaps` hanya melihat butang 360° Street View bagi lokasi yang telah disahkan dan diaktifkan (HIJAU) oleh pentadbir.
- **Suis Induk Pelancaran Modul Food Bank (`JppFoodBankAdmin.tsx`, `KebajikanFoodBankPage.tsx`):**
  - Menyediakan suis induk pelancaran modul (`is_module_active`) di Tab 4 pentadbiran Food Bank JPP HQ.
  - **Mod Dalam Persediaan (Akses Mahasiswa):** Apabila modul ditutup, portal `/kebajikan/foodbank` memaparkan banner persediaan rasmi, membuka akses untuk semakan katalog dan lokasi, tetapi mengunci butang permohonan dengan label `Pelancaran Rasmi Tidak Lama Lagi (Dalam Persediaan)`. Mahasiswa dengan pas QR sedia ada tetap boleh mengakses pas mereka.
  - **Ketahanan Luar Talian & Sandaran Skema:** Sandaran `loadLocalFoodBankSettings` dan `saveLocalFoodBankSettings` memastikan sistem boleh diuji dan beroperasi tanpa ralat skema cache pangkalan data.
  - **Pembaikan Input Siling Belanjawan:** Menukar `step={500}` kepada `step="any"` pada input nombor belanjawan bagi mengelakkan sekatan pengesahan HTML5 pelayar.
- **Deep Linking PolyMaps Berketepatan Tinggi:**
  - Pautan lokasi di Hab Kebajikan dan Food Bank kini menghantar parameter `?b=` yang memadankan kod, ID, atau nama bangunan secara *case-insensitive* untuk autofokus dan pemilihan terus di atas peta.
- **Reka Bentuk Semula Hab Kebajikan (Linear/Apple Minimalist Executive):**
  - Muka surat `/kebajikan` (`KebajikanHubPage.tsx`) dirombak sepenuhnya daripada teks generik AI yang berselerak kepada reka bentuk eksekutif berimpak tinggi: 2 kad utama kontras tinggi (Aduan & Fasiliti dengan SLA < 24 Jam; Food Bank JPP dengan lencana status modul masa nyata), serta jalur ringkas akses pantas pentadbiran pegawai/exco di bahagian bawah.
- **Aliran Kad Maklumat Penuh Serta-merta PolyMaps (Instant Expanded Card & 360 First):**
  - Sebarang pemilihan lokasi (carian, klik pin peta, atau *deep link*) kini secara lalai terus membuka **kad maklumat penuh (Gambar 1)** serta-merta tanpa memerlukan pelajar menekan *pill bar* kecil terlebih dahulu.
  - Jika lokasi memiliki 360° yang aktif, tab media di atas kad secara pintar mengutamakan **paparan 360° Street View** supaya pelajar dapat meneliti persekitaran destinasi secara langsung.
  - Pelajar boleh menekan butang *"Lipat Kad"* pada bila-bila masa untuk mengecilkan kad kepada *pill bar* kompak (Gambar 2).
  - Apabila pelajar menekan *"Mula Pandu Arah"*, kad dilipat secara automatik kepada bar navigasi HUD ringkas supaya peta dan anak panah GPS tidak terlindung semasa berjalan, dan dibuka semula secara automatik sebaik sahaja tiba di destinasi (`dist <= 30m`).

### 25.12 Sistem Warna Semantik Berpadu Modul Food Bank JPP ("Warm Citrus & Fresh Harvest")

Bagi mengelakkan kekeliruan pengguna awal yang disebabkan oleh kepelbagaian warna rawak dan tidak konsisten, modul Food Bank JPP (merangkumi portal pelajar, pas digital QR, pusat kawalan pentadbir, dan hab kebajikan) telah diseragamkan dengan sistem warna berdisiplin:

1. **Palet Identiti Utama ("Warm Citrus & Fresh Harvest"):**
   - **Aksen Primer:** Kuning Amber / Tangerine Oren (`amber-500` / `amber-600`) sebagai warna khas ramah Food Bank JPP (simbol rezeki, kehangatan, dan keprihatinan).
   - **Aksen Sekunder:** Hijau Pudina / Zamrud (`emerald-500` / `emerald-600`) untuk kelulusan, ketersediaan stok mencukupi, dan penunjuk kejayaan.
   - **Latar Neutral:** Slate bersih (`slate-50` / `white` dalam Light Mode, `slate-900` / `slate-950` dalam Dark Mode) bagi memastikan keterbacaan teks berkontras tinggi (lulus WCAG AA).

2. **4 Kategori Semantik Pastel (`FOODBANK_CATEGORY_CONFIG` dalam `src/lib/foodbankDefaults.ts`):**
   - **Makanan Asas (`MAKANAN`):** Warm Amber (`bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30`, Ikon: 🍚)
   - **Minuman (`MINUMAN`):** Fresh Sky Blue (`bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/30`, Ikon: ☕)
   - **Kebersihan Diri (`KEBERSIHAN`):** Mint / Teal (`bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30`, Ikon: 🧼)
   - **Keperluan Lain / Asas (`LAIN_LAIN`, `KEPERLUAN_ASAS`):** Soft Lavender (`bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/30`, Ikon: 📦)

3. **Peraturan 3-Warna Lencana Stok (`getFoodBankStockBadge`):**
   - **Stok > 10 unit:** Hijau Emerald (`bg-emerald-600 dark:bg-emerald-500 text-white font-bold`, label: `Baki: X unit`)
   - **Stok 1 – 10 unit:** Kuning Amber (`bg-amber-500 text-slate-950 font-black`, label: `Terhad: X unit`)
   - **Stok 0 unit:** Merah Rose (`bg-rose-500 text-white font-black`, label: `Stok Habis`)

4. **Pas Pengambilan Digital Pas Boarding QR (`FoodBankQrPassModal.tsx`):**
   - **Bekas Kod QR Putih Padu (Solid White High-Contrast):** Bekas QR dikekalkan berlatar belakang putih padu (`bg-white border-slate-200`) tanpa dipengaruhi oleh mod gelap, memastikan kadar imbasan kamera telefon pintar atau pengimbas kaunter 100% responsif.
   - **Reben Status Berdisiplin:** Menunggu (Amber), Dalam Semakan (Sky Blue), Lulus (Emerald bersinar), Selesai (Emerald Mint), Ditolak (Rose), Batal (Slate).

5. **Harmonisasi Pusat Kawalan Pentadbir (`/jpp/foodbank` - `JppFoodBankAdmin.tsx`):**
   - Mengekalkan bingkai Maroon rasmi JPP HQ untuk susun atur luaran shell (`JppLayout` & `JppSidebar`).
   - Menyeragamkan 4 kad metrik KPI (Peruntukan Bajet RM70k & Belanja dalam Amber/Gold, Permohonan Menunggu dalam Amber, Pas Sedia Diambil dalam Sky Blue, Agihan Selesai dalam Mint Emerald).
   - Butang navigasi tab aktif menggunakan Amber Citrus (`bg-amber-600 text-white shadow-md`).
   - Kotak carian dan butang pengesahan imbasan kaunter menggunakan fokus Amber.
   - Kad inventori memaparkan lencana kategori pastel dan lencana stok 3-warna yang seragam.

6. **Kad Hab Kebajikan (`/kebajikan` - `KebajikanHubPage.tsx`):**
   - Kad tonggak Food Bank JPP diselaraskan dengan aksen Warm Amber pada butang utama, butang semak pas, dan ikon beg barangan, berdiri harmoni di sebelah kad Aduan Siswa (Teal) tanpa percanggahan visual.

### 25.13 Sistem Inventori Multi-Lokasi, Pindahan Stok Atomik, Pelantikan Pegawai & Lejar Audit Dedikasi Food Bank JPP

Bagi menyokong pengoperasian pusat edaran fizikal kampus yang berasingan (Pusat Edaran Utama Student Centre, Hab Edaran Kamsis Al-Biruni, dan Kaunter Kebajikan Blok Pentadbiran), modul Food Bank JPP telah dipertingkatkan dengan seni bina inventori berbilang lokasi dan pengauditan berwibawa:

1. **Seni Bina Inventori Multi-Lokasi (`foodbank_location_stocks`):**
   - **Pemisahan Katalog vs Baki Stok:** Katalog barangan induk kekal dalam `foodbank_items`, manakala kuantiti stok fizikal disimpan mengikut pusat edaran dalam `foodbank_location_stocks(item_id, location_id, current_stock, reorder_level)`.
   - **Kekangan Komposit Unik Atomik:** `CONSTRAINT uq_foodbank_item_location UNIQUE (item_id, location_id)` menghalang duplikasi rekod stok di lokasi yang sama.
   - **Pencegahan Stok Negatif:** `CHECK (current_stock >= 0)` memastikan baki stok tidak boleh menjadi negatif.
   - **Indeks Lengkap:** Indeks FK dipasang pada `item_id` dan `location_id`.

2. **Transaksi Atomik Pindahan Stok Antara Lokasi (`transfer_foodbank_stock` RPC):**
   - Pindahan stok antara pusat edaran dijalankan melalui fungsi atomik PostgreSQL RPC `transfer_foodbank_stock(p_item_id, p_from_location_id, p_to_location_id, p_quantity, p_actor_id, p_actor_name, p_notes)`.
   - **Integriti ACID & Row Locking:** Menggunakan kunci baris `FOR UPDATE` pada baki lokasi sumber untuk mengelakkan *race conditions* sekiranya dua petugas membuat pindahan serentak.
   - **Semakan Baki & Upsert Destinasi:** Mengesahkan baki mencukupi sebelum memotong stok sumber dan melaksanakan `ON CONFLICT (item_id, location_id) DO UPDATE` pada lokasi destinasi.
   - **Audit Automatik:** Menyuntik entri ke dalam `foodbank_audit_logs` (`action_type: 'STOCK_TRANSFER'`) dalam transaksi yang sama.

3. **Sistem Pelantikan Pegawai Bertugas Kaunter & Kawalan Akses (RBAC Gating):**
   - **Jadual `foodbank_officers`:** Merekodkan lantikan mahasiswa/staf bertugas (`user_id`, `location_id`, `role_title`, `is_active`, `assigned_by`). Lokasi `NULL` menandakan pegawai terapung (*Floating / Semua Lokasi*).
   - **Pengurusan di Tab 4 Pentadbiran:** Borang carian calon mahasiswa masa nyata daripada `profiles` (No. Matrik / Nama), pemilihan lokasi jagaan, lencana status, suis toggle aktif/nyahaktif, dan pemadaman pegawai dengan audit logging (`OFFICER_ASSIGNED`, `OFFICER_REMOVED`).
   - **RBAC Gating Antara Muka:**
     - `isExecutiveAdmin` (Super Admin, YDP, Exco Kebajikan, Admin JPP): Akses penuh ke semua 5 tab dan kawalan suis sesi.
     - `isAssignedOfficer` (Petugas Kaunter): Hanya boleh mengakses Tab 1 (Permohonan & Imbasan Kaunter), Tab 2 (Inventori), dan Tab 5 (Log Audit). Tab 3 (Bajet RM70k) dan Tab 4 (Tetapan) dikunci dan disembunyikan.
     - Kunci Lokasi Inventori: Jika pegawai mempunyai `assignedLocationId`, paparan inventori dikunci secara automatik ke lokasi jagaan mereka.
   - **Pelepasan Laluan Shell (`JppLayout.tsx` & `JppSidebar.tsx`):** Mahasiswa bukan JPP yang dilantik sebagai pegawai aktif Food Bank dibenarkan melepasi `JppLayout` untuk mengakses `/jpp/foodbank` tanpa dilencongkan ke `/portal`.

4. **Pusat Lejar Log Audit Dedikasi Food Bank (Tab 5 `JppFoodBankAdmin.tsx`):**
   - **Jadual `foodbank_audit_logs`:** Merekodkan aktiviti audit terperinci (`actor_id`, `actor_name`, `action_type`, `location_id`, `target_id`, `details JSONB`, `created_at`).
   - **4 Metrik KPI Audit:** Jumlah Transaksi, Pindahan Stok, Penebusan QR Disahkan, dan Tindakan Pentadbiran.
   - **Penapis Kategori & Carian:** Penapis tab `SEMUA`, `STOK`, `AGIHAN`, `PEGAWAI`, `TETAPAN`, penapis pusat edaran lokasi, dan bar carian teks masa nyata.
   - **Kad Garis Masa Berkontras Tinggi:** Paparan kad dwi-tema dengan ikon tindakan berkonteks, cap masa terformat Bahasa Melayu, dan paparan ringkas atribut JSON.
   - **Eksport CSV Rasmi JHEP:** Butang muat turun fail `Audit_FoodBank_POLISAS_[YYYYMMDD].csv` dengan aksara UTF-8 BOM untuk keserasian Microsoft Excel.

5. **Aliran Permohonan Pelajar Berasaskan Lokasi Dahulu (*Location-First Student Flow*):**
   - **Susunan Urutan Borang (`KebajikanFoodBankPage.tsx`):**
     - Bahagian 1: Maklumat Pemohon & Status Kewangan
     - Bahagian 2: Maklumat Kediaman & Kuota Rakan Serumah
     - Bahagian 3: **Lokasi Agihan & Slot Waktu Pengambilan** (Dinaikkan sebelum katalog)
     - Bahagian 4: **Katalog Pilihan Barangan Bebas** (Menilai stok lokasi yang dipilih)
   - **Semakan Baki Masa Nyata & Lencana Alternatif:** Katalog memaparkan baki khusus di pusat edaran yang dipilih. Jika habis di pusat berkenaan tetapi berbaki di lokasi lain, petunjuk mesra dipaparkan: `"Berbaki di [Nama Lokasi] • Tukar lokasi di atas jika perlu"`.
   - **Penyelarasan Automatik (*Reactive Clamping*):** Sekiranya pelajar menukar pusat edaran selepas memilih barangan, kuantiti barangan yang melebihi baki stok lokasi baharu diselaraskan secara automatik dengan notifikasi toast mesra.




---

## 28. Piawaian Dialog, Modal & Interaksi (Pencegahan Sekatan Pelayar & Aksesibiliti)

### 28.1 Larangan Mutlak `window.prompt`, `window.confirm`, dan `window.alert`
Pelayar moden (Chrome, Safari, Edge, Firefox) menyekat atau melumpuhkan fungsi dialog sekatan lalai (`window.prompt`, `window.confirm`, `window.alert`) dalam pelbagai konteks (contohnya tab latar belakang, PWA berskrin penuh, dan mod WebView mudah alih). Selain itu, dialog natif mencacatkan estetika institusi dan tidak memenuhi piawaian aksesibiliti (a11y).

**Peraturan:**
- **DILARANG SAMA SEKALI** memanggil `window.prompt()`, `window.confirm()`, atau `window.alert()` dalam mana-mana kod pengeluaran.
- Sebarang keperluan input kata laluan, teks pengesahan, atau tindakan kritikal (seperti pelupusan rekod) WAJIB menggunakan komponen `<PromptDialog />`.

### 28.2 Komponen Accessible `<PromptDialog />` (`src/components/ui/PromptDialog.tsx`)
Komponen modal dialog berasaskan Radix UI Dialog yang menyediakan:
- Sokongan dwi-tema automatik (Dark & Light Mode).
- Mod input teks selamat (`type="password"` atau `type="text"`).
- Pengesahan input (*validation*) terbina dalam melalui helper `src/lib/promptUtils.ts`.
- Navigasi papan kekunci lengkap: `Enter` untuk hantar, `Escape` untuk batal, dan perangkap fokus (`focus-trap`).
- Atribut ARIA penuh (`aria-describedby`, `aria-labelledby`) yang mesra pembaca skrin.

### 28.3 Polisi Sifar Em-Dash (Tanda Sempang Standard Sahaja)
Untuk mengekalkan konsistensi tipografi antarabangsa dan mengelakkan isu pengekodan aksara pada pelbagai platform:
- Gunakan tanda sempang standard `-` atau simbol anak panah `->`.
- Jangan sekali-kali memasukkan aksara em-dash dalam teks antaramuka, tooltip, mesej toast, mahupun komen kod.

---

## 29. Senibina Portal Campus Super App (Mobile-First Experience)

> Ditambah: Oktober 2026

Laman Portal Utama (`/portal` - `src/pages/PortalPage.tsx`) telah dinaik taraf kepada pengalaman **Campus Super App** berorientasikan mudah alih (*mobile-first hybrid experience*). Transformasi ini menggabungkan utiliti harian kampus, suapan perkhidmatan langsung, dan integrasi modul rasmi Exco JPP dalam satu hab sehenti yang intuitif dan responsif.

### 29.1 Palet Kecerunan Header Kampus & Pemasangan Logo JPP

1. **Palet Warna Kecerunan Header Kampus:**
   - Kecerunan rasmi portal (`getHeaderGradientClass`) menggunakan tona Obsidian Emerald moden yang selesa pada mata:
     ```css
     from-emerald-950 via-slate-900 to-slate-950 text-white border-b border-emerald-500/20
     ```
   - Menyediakan latar belakang gelap berprestij dengan biasan hijau zamrud halus yang mematuhi kontras WCAG AA tanpa keletihan visual.
   - Kecerunan beralih secara kontekstual sekiranya musim sukan atau karnival kampus sedang aktif:
     - **Karnival Aktif:** Kecerunan Violet/Purple (`from-violet-950 via-purple-900 to-indigo-950`).
     - **SUPSAS Aktif:** Kecerunan Amber/Navy (`from-amber-950 via-slate-900 to-sky-950`).
     - **Lalai (Obsidian Emerald):** `from-emerald-950 via-slate-900 to-slate-950`.

2. **Pemasangan Logo Rasmi JPP (`/jpp-logo.png`):**
   - Logo rasmi JPP dipasang secara menonjol dalam kapsul kaca gelap (`bg-black/25 backdrop-blur-md border border-white/15 shadow-sm`) di sebelah kiri atas header.
   - Mengandungi aset imej logo rasmi `/jpp-logo.png` (`w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 drop-shadow`), teks jenama `JPP POLISAS`, dan sublabel keemasan `Portal Rasmi` (`text-amber-300/80 font-bold`).
   - Berdampingan dengan kapsul lokasi fizikal kampus: `"POLISAS, Semambu"` dengan ikon pin peta beranimasi (`animate-pulse`).

3. **Sapaan Kontekstual & Lencana Peranan Berdisiplin:**
   - **Sapaan Masa Nyata (`formatGreeting`):** Mengikut waktu (Pagi: 05:00-11:59, Petang: 12:00-18:59, Malam: 19:00-23:59, Dinihari: 00:00-04:59) disatukan dengan nama pertama pengguna daripada profil (`profile.full_name`).
   - **Lencana Peranan Berdisiplin (`getRoleBadgeTitle`):** Menukar peranan mentah pangkalan data kepada gelaran rasmi mesra pengguna (`PENTADBIR UTAMA`, `MAJLIS JPP`, `STAF POLISAS`, atau `SISWA POLISAS`).

---

### 29.2 Kawalan Header Kaca Eksekutif & Kapsul Carian Stadium Putih Tulen (`SuperAppHeader.tsx`)

1. **Bulatan Tindakan Terapung Diskret (Floating Discrete Action Circles):**
   - Menggantikan kapsul duk bertembok/berpembahagi sebelum ini (*murky dock pill* `divide-x`, `bg-white/[0.08]`) dengan susunan baris bulatan tindakan terbuka (*floating discrete action circles*):
     - **Bekas Baris Terbuka:** `flex items-center gap-3 shrink-0` membolehkan setiap butang terapung secara berasingan tanpa kepungan duk legap.
     - **Butang Permata Frosted 36px (36px Subtle Frosted Jewel Buttons):**
       - `<ThemeToggle />`: Butang bulat terapung bersaiz 36px (`w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md shadow-sm flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-95 shrink-0 [&_button]:!h-9 [&_button]:!w-9 [&_button]:!rounded-full [&_button]:!bg-transparent [&_button]:hover:!bg-transparent [&_button]:!p-0`).
       - `<NotificationBell variant="dark" />`: Butang bulat terapung bersaiz 36px (`w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md shadow-sm flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-95 shrink-0 [&_button]:!h-9 [&_button]:!w-9 [&_button]:!rounded-full [&_button]:!bg-transparent [&_button]:hover:!bg-transparent [&_button]:!p-0`).
     - **Avatar Pengguna Cecincin Zamrud (Emerald Ring User Avatar):**
       - Butang profil bulat bersaiz 36px dengan cecincin zamrud (`w-9 h-9 rounded-full ring-2 ring-emerald-400/60 hover:ring-emerald-400 active:scale-95 transition-all shadow-md focus:outline-none cursor-pointer shrink-0 overflow-hidden .tour-navbar-profile`).
       - Dilengkapi avatar fallback kecerunan zamrud (`bg-gradient-to-tr from-emerald-600 to-teal-500 text-white text-[11px] font-black rounded-full`) yang memicu pembukaan `PortalSidebar`.
   - Menghapuskan sepenuhnya kapsul pil legap terdahulu (*murky dock pill*) bagi menghasilkan hierarki visual yang ringan, bersih, dan terapung bebas di atas latar header Obsidian Emerald.

2. **Pembersihan Butang Terapung Bantuan & Pemindahan ke Sidebar:**
   - Butang bantuan terapung canggung (`.tour-help-button` di `fixed top-20 right-4`) telah dibuang sepenuhnya daripada `PortalPage.tsx`.
   - Pencetus "Panduan Sistem (Tutorial)" kini disepadukan dengan kemas di dalam laci navigasi sisi `PortalSidebar.tsx` melalui prop `onStartTour`.

3. **Kapsul Carian Stadium Putih Tulen (Pure White Stadium Search Capsule):**
   - Menggantikan bar carian kaca terdahulu dengan kapsul carian stadium penuh (*pure white stadium capsule* - `rounded-full`) putih tulen berkontras tinggi yang terapung jelas di atas latar belakang kecerunan obsidian:
     `bg-white hover:bg-slate-50 text-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.18)] hover:shadow-[0_10px_35px_rgba(0,0,0,0.22)] border border-white/40`.
   - **Kanta Pembesar Pudina/Zamrud (*Mint Magnifying Glass*):** Ikon kanta pembesar bertempat dalam bekas bulatan mint lembut (`w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`).
   - **Placeholder Carian Inklusif:** Teks placeholder dikemas kini kepada *"Cari makanan, runner, servis, acara, merit..."* (`text-slate-500 group-hover:text-slate-700 font-medium truncate`).
   - **Lencana Pintasan Papan Kekunci Monokrom:** Menyertakan lencana kekunci `Ctrl+K` (`text-slate-400 bg-slate-100 rounded-full border border-slate-200/80`).

---

### 29.3 8 Servis Teras Kampus Yang Diselaraskan (`CampusServicesGrid.tsx`)

Komponen `src/components/portal/CampusServicesGrid.tsx` menyusun utiliti harian kampus ke dalam susun atur grid 4 kolum mesra sentuhan telefon pintar (`grid grid-cols-4 gap-2 sm:gap-3 md:gap-4`):

| No | ID Servis | Nama Paparan | Sublabel | Tindakan / Laluan | Tour Class | Lencana (*Badge*) | Ikon |
|---|---|---|---|---|---|---|---|
| 1 | `polysuara` | PolySuara | Suara Siswa | Route: `/polysuara` | - | - | Megaphone |
| 2 | `polymart` | PolyMart | Pasaran Siswa | Route: `/polymart` | - | - | UtensilsCrossed |
| 3 | `takwim` | Takwim | Kalendar Rasmi | Route: `/akademik/takwim` | `tour-qa-polyservices` | - | CalendarDays |
| 4 | `polymaps` | PolyMaps | Peta Kampus | Route: `/polymaps` | - | - | Map |
| 5 | `polyrent` | PolyRent | Sewa Rumah | Route: `/polyrent` | - | - | Home |
| 6 | `kebajikan` | E-Kebajikan | Aduan & Bantuan | Route: `/kebajikan` | `tour-qa-kebajikan` | Bilangan aktif (`kbStats.open`) | HeartHandshake |
| 7 | `akademik_qr` | Scan QR | Kumpul Merit | Route: `/akademik/qr` | `tour-qa-qr` | `MERIT` | QrCode |
| 8 | `ekpp` | Kelab EKPP | Persatuan Siswa | Route: `/kelab` | `tour-mod-ekpp` | `KELAB` | Landmark |

- **Kedalaman Bekas Kad Dipertingkatkan (Elevated Card Container Depth):**
  - Bekas kad butang perkhidmatan menggunakan kedalaman visual berlapis untuk menaikkan kontras pada kedua-dua mod terang dan gelap:
    - **Mod Terang:** `bg-white hover:bg-slate-50 border border-slate-200/70 hover:border-emerald-400/40 shadow-xs hover:shadow-md rounded-2xl sm:rounded-3xl`
    - **Mod Gelap:** `dark:bg-slate-900/80 dark:hover:bg-slate-800/90 dark:backdrop-blur-md dark:border-white/[0.08] dark:hover:border-emerald-500/30 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]`
- **Kad Servis Cyber Luminescent (Cyber Luminescent Service Cards):**
  - Bekas ikon squircle (`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl`) menggunakan sistem warna semantik dwi-tema berkontras tinggi:
    - **Mod Terang (High-Contrast Pastel):** Latar belakang pastel lembut dengan teks dan sempadan warna tepu yang jelas bagi keterlihatan maksimum:
      `bg-{color}-50 text-{color}-600 border-{color}-200 shadow-xs`
    - **Mod Gelap (Cyber Luminescent Micro-Glow):** Latar belakang lutsinar bertenaga dengan pendaran cahaya mikro neon-pastel:
      `dark:bg-{color}-500/20 dark:text-{color}-400 dark:border-{color}-500/40 dark:shadow-[0_0_12px_rgba(...)]`
  - Contoh pemetaan warna semantik dalam `SERVICE_STYLES`:
    - PolySuara: Rose (`bg-rose-50 text-rose-600 border-rose-200` / `dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/40 dark:shadow-[0_0_12px_rgba(244,63,94,0.3)]`)
    - PolyMart: Amber (`bg-amber-50 text-amber-600 border-amber-200` / `dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40 dark:shadow-[0_0_12px_rgba(245,158,11,0.3)]`)
    - Takwim: Indigo (`bg-indigo-50 text-indigo-600 border-indigo-200` / `dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/40 dark:shadow-[0_0_12px_rgba(99,102,241,0.3)]`)
    - PolyMaps: Emerald (`bg-emerald-50 text-emerald-600 border-emerald-200` / `dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40 dark:shadow-[0_0_12px_rgba(16,185,129,0.3)]`)
    - PolyRent: Cyan (`bg-cyan-50 text-cyan-600 border-cyan-200` / `dark:bg-cyan-500/20 dark:text-cyan-400 dark:border-cyan-500/40 dark:shadow-[0_0_12px_rgba(6,182,212,0.3)]`)
    - E-Kebajikan: Teal (`bg-teal-50 text-teal-600 border-teal-200` / `dark:bg-teal-500/20 dark:text-teal-400 dark:border-teal-500/40 dark:shadow-[0_0_12px_rgba(20,184,166,0.3)]`)
    - Scan QR: Violet (`bg-violet-50 text-violet-600 border-violet-200` / `dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-500/40 dark:shadow-[0_0_12px_rgba(139,92,246,0.3)]`)
    - Kelab EKPP: Blue (`bg-blue-50 text-blue-600 border-blue-200` / `dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/40 dark:shadow-[0_0_12px_rgba(59,130,246,0.3)]`)
- **Ergonomik Butang Sentuh (*Tactile Buttons*):**
  - Butang jubin padat `p-2 sm:p-3 rounded-2xl sm:rounded-3xl` dengan bekas ikon bersaiz `w-11 h-11 sm:w-13 sm:h-13 rounded-2xl` bagi mengelakkan limpahan melintang (*horizontal overflow*) pada skrin 360px+.
  - Animasi sentuhan spring Framer Motion (`whileHover={{ scale: 1.04, y: -2 }}`, `whileTap={{ scale: 0.95 }}`).
  - Label teks dipotong kemas (`truncate w-full text-center text-[10px] sm:text-xs font-bold`) dan sublabel disembunyikan pada telefon (`hidden sm:block text-[9px]`).
- **Lencana Dinamik (*Badging*):**
  - E-Kebajikan memaparkan lencana bilangan tiket aduan aktif (`kbStats.open`) jika melebihi 0.
  - Scan QR memaparkan lencana ungu `MERIT` (`bg-purple-600 text-white dark:bg-purple-500 dark:shadow-[0_0_10px_rgba(168,85,247,0.5)]`).
  - Kelab EKPP memaparkan lencana biru `KELAB` (`bg-blue-600 text-white dark:bg-blue-500 dark:shadow-[0_0_10px_rgba(59,130,246,0.5)]`).
- **Pengendalian Modul Dinyahaktifkan (*Graceful Degradation*):**
  - Sekiranya modul ditutup dalam konfigurasi `portal_settings` dan pengguna bukan SuperAdmin, ikon dipudarkan (`opacity-50 grayscale cursor-not-allowed`) dan klik menghasilkan makluman toast mesra *"sedang dikemas kini"*.

---

### 29.4 Ergonomik & Responsif Mudah Alih (Mobile Ergonomics & Layout Balance)

Bagi menjamin pengalaman penggunaan tanpa cela pada pelbagai resolusi peranti mudah alih (termasuk skrin kompak 360px-390px):

1. **Pencegahan Limpahan Mendatar (*Horizontal Overflow Prevention*):**
   - Penggunaan kelas `-mx-4 px-4 sm:mx-0 sm:px-0` pada bekas suapan tatalan melintang (`EmsEventsFeed.tsx` dan `PolyMartFeed.tsx`).
   - Pendekatan ini membolehkan kad suapan beranimasi tatal mendatar secara penuh tepi-ke-tepi (*edge-to-edge bleed scroll*) pada peranti mudah alih, sambil mengekalkan penjajaran grid kemas di tablet dan desktop tanpa menyebabkan sebarang limpahan paksi-X pada badan dokumen (`overflow-x-hidden w-full max-w-full`).
2. **Semakan Automatik Kekosongan Acara (*Auto Empty State Suppression*):**
   - Komponen `EmsEventsFeed` secara automatik menyembunyikan seksyen (`return null`) sekiranya penapisan `filterUpcomingEvents(events, 8)` mendapati tiada sebarang acara aktif atau acara masa depan yang tersedia (`!loading && events.length === 0`).
   - Ini mengelakkan pembaziran ruang visual pada peranti mudah alih dan membolehkan suapan PolyMart naik secara elegan di bawah servis teras.
3. **Kelegaan Bawah Menyeluruh (*Bottom Navigation Clearance*):**
   - Bekas `<main>` di `PortalPage.tsx` dikonfigurasi dengan kelas penjarakan `pb-36 sm:pb-32` serta pseudo-elemen `flex-1 after:content-[''] after:block after:h-28 after:shrink-0`.
   - Konfigurasi ini menjamin ruang pemisah menegak yang selamat antara bahagian bawah kandungan (Grid Modul Exco) dan bar navigasi terapung mudah alih (`BottomNav`), menghalang kad atau butang tindakan daripada terlindung atau tertekan secara tidak sengaja.
4. **Estetika "OLED Glass Aura" & Jubin Bersinar (Dark Mode):**
   - Latar belakang ambient mesh aura (`hidden dark:block -z-10`) dengan kecerunan kabur zamrud dan nila (`bg-emerald-500/[0.035]` dan `bg-indigo-500/[0.025]`).
   - Jubin servis 8-ikon dan kad suapan menggunakan aras kaca gelap (*deep glass elevation*): `dark:bg-slate-900/80 dark:backdrop-blur-md dark:border-white/[0.08]` dengan warna ikon cyber luminescent neon-pastel yang menyerlah dan tidak kusam pada skrin OLED.

---

### 29.5 Carousel Sorotan Kempen Dinamik (`CampusCampaignCarousel.tsx`)

Komponen `src/components/portal/CampusCampaignCarousel.tsx` menyediakan slaid sorotan berimpak tinggi yang dipaparkan secara kontekstual melalui pembantu `buildCampaignSlides`:

1. **Jenis-jenis Slaid Kempen (`CampaignSlide`):**
   - **MAKMP (`gold`):** Muncul apabila mahasiswa menerima jemputan anugerah (`makmpStatus === 'DIJEMPUT'`) dan edisi MAKMP berkaitan sedang aktif (`makmp_editions.is_active = true`), membolehkan semakan status dan pengesahan kehadiran terus ke `/makmp`. Sekiranya edisi dinyahaktifkan di pusat MAKMP, slaid ini disenyapkan secara automatik di portal pelajar dan papan pemuka Exco Akademik (`AkademikUnitDashboard.tsx`) memaparkan status `Sesi Ditutup`.
   - **KAMSIS (`emerald` atau `amber`):** Muncul untuk pelajar yang memohon asrama. Memaparkan tawaran penempatan lulus (`emerald`) atau status rayuan/pemprosesan (`amber`) dengan pautan modal rayuan.
   - **Karnival Siswa (`violet`):** Muncul secara automatik semasa karnival tahunan berlangsung (`karnivalActive === true`) membawa pelajar ke hab pengundian `/karnival`.
   - **SUPSAS (`amber`):** Muncul semasa kejohanan sukan antara jabatan berlangsung (`supsasActive === true`) menuju ke papan kedudukan `/supsas`.

2. **Interaksi & Navigasi Slaid:**
   - Transisi lancar menggunakan Framer Motion `AnimatePresence`.
   - Pertukaran slaid automatik setiap 6 saat sekiranya terdapat lebih daripada 1 slaid aktif.
   - Kawalan titik (*dot indicators*) boleh diklik untuk melompat terus ke slaid pilihan.

---

### 29.6 Suapan Langsung Acara (EMS) & Makanan (PolyMart) (`EmsEventsFeed.tsx` & `PolyMartFeed.tsx`)

Bagi menghidupkan ekosistem kampus harian, portal memaparkan dua suapan mendatar (*horizontal feeds*) masa nyata dengan tatalan sentuhan berasaskan *snap scroll* (`snap-x snap-mandatory`):

1. **Suapan Acara Kampus (`EmsEventsFeed.tsx`):**
   - Mengambil data daripada jadual `ems_events` (status bukan `DRAFT`).
   - Penapis utiliti `filterUpcomingEvents(events, 8)` menyingkirkan acara yang telah tamat atau dibatalkan, menyusun tarikh secara kronologi terdekat.
   - Kad acara memaparkan poster/banner acara, lencana `TERBUKA`, tajuk acara, tarikh terformat Bahasa Melayu, dan nama lokasi.
   - Klik kad membuka halaman pendaftaran pantas `/ems/register/:id`, manakala butang *"Lihat Semua"* membawa ke `/ems/dashboard`.
   - Keadaan skeleton loading terurus dan paparan kosong pintar yang menekan seksyen secara automatik.

2. **Suapan Pasaran Siswa (`PolyMartFeed.tsx`):**
   - Mengambil produk usahawan siswa daripada jadual `business_products` yang ditandakan `publish_to_polymart = true` dan `is_available = true`.
   - **Cip Penapis Dwi-Mod:**
     - **🔥 Terhangat:** Mengisih produk paling popular dan promosi daripada perniagaan berstatus `ACTIVE`.
     - **✨ Terkini:** Mengisih produk mengikut masa penambahan terbaharu (`created_at DESC`).
   - **Navigasi Terus Pasaran:**
     - Klik kad produk membuka halaman katalog produk khusus **`/polymart/produk/:id`**.
     - Butang *"Buka Mart"* membuka pasaran utama **`/polymart`**.
   - Integriti perniagaan: Produk daripada perniagaan tidak aktif ditapis keluar secara automatik (`biz.status === 'ACTIVE'`).
   - Memaparkan gambar produk, tag `Pesan`, nama produk, serta harga terformat RM melalui `formatProductPrice(displayPrice)` termasuk sokongan harga diskaun `sale_price`.

---

### 29.7 Integriti Modul Exco & Kawalan SuperAdmin

1. **Pengekalan Papan Kawalan Exco Rasmi:**
   - Grid modul rasmi JPP di bahagian bawah portal (`tour-exco-modules`) mengekalkan kad rasmi (`ExcoCard`) bagi membolehkan wakil kelab, pimpinan siswa, dan staf mengakses pengurusan khusus (KPP, Keusahawanan, Kebajikan, Akademik, dll).
   - Penyesuaian tema warna (`handleColorSave`) dan suis pengaktifan modul (`handleToggle`) dikemas kini terus ke jadual `portal_settings` Supabase dengan penyimpanan cache tempatan `localStorage` untuk membasmi kelipan putih (*white flashes*).

2. **Pelepasan Pentadbir Utama (*SuperAdmin Bypass*):**
   - Pengguna dengan peranan SuperAdmin (`isSuperAdmin`) diberi kebenaran mengakses semua modul dan servis teras walaupun status konfigurasi modul dimatikan (`is_enabled: false`).
   - Garis status pentadbir (`AdminStatusIndicator`) memaparkan penunjuk mod visual:
     - Hijau: *Sistem Operasi (Live)*
     - Jingga/Kuning: *Pratonton Pentadbir*
     - Kelabu/Gelap: *Dalam Pembangunan*

3. **Pengoptimuman Prestasi & Ketahanan Skalabiliti:**
   - Semua panggilan rangkaian portal menggunakan `Promise.all` serentak dengan `AbortController` (timeout 5 saat) bagi menjamin *First Contentful Paint (FCP)* di bawah 1.0 saat ketika 1,500 pengguna melayari serentak.
   - Notifikasi unread count dihubungkan ke selector atomik Zustand `useNotificationStore(s => s.unreadCount)` tanpa mencetuskan render semula komponen lain yang tidak berkaitan.

---

### 29.8 Seni Bina Hab Profil & Tetapan Super App (`/tetapan`)

Laman Tetapan (`src/pages/SettingsPage.tsx`) telah dirombak daripada reka bentuk desktop lama kepada **Hab Profil & Tetapan Super App** bertaraf mudah alih (ala iOS / Grab):

1. **Kad Identiti Pelajar (Hero Profile Card):**
   - Ditempatkan di bahagian teratas dengan gaya kaca mendalam (`bg-card/70 dark:bg-slate-900/70 backdrop-blur-xl border border-border/60 dark:border-white/10 shadow-lg rounded-[2rem] p-5 sm:p-7`).
   - Avatar besar bersama pemicu butang kamera bagi muat naik gambar profil (dengan perlindungan had 5MB dan kompresi automatik).
   - Nama Penuh & Nombor Matrik rasmi bersama lencana peranan (`PENTADBIR UTAMA`, `MAJLIS JPP`, `SISWA POLISAS`).
   - **Jalur Ringkasan Status Pintar (*Live Status Strip*):**
     - 🎓 **Semester:** Bilangan semester aktif semasa (contoh: *Semester 4*).
     - ⭐ **Mata Merit:** Baki mata merit pelajar dari modul akademik.
     - 🏠 **Status Kediaman:** *Asrama Kamsis* atau *Rumah Sewa (Luar)*.

2. **Bar Navigasi Kapsul Mendatar (Segmented Tab Bar):**
   - Menggantikan *select dropdown* telefon lama dan sidebar menegak dengan bar tab kapsul mudah leret (`flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x`):
     - `profil`: Maklumat peribadi, nombor telefon, e-mel, dan seksyen permohonan pindaan matrik/semester (`profile_edit_requests`).
     - `kediaman`: Pengisytiharan status kediaman KLK, pemilihan kawasan, dan perincian alamat sewa.
     - `tema`: Pemilih tema visual (☀️ Cerah, 🌙 Gelap, 💻 Ikut Sistem) dengan kad pratonton interaktif berbingkai hijau zamrud aktif.
     - `notifikasi`: Suis amaran pintar (pesanan PolyMart, tiket E-Kebajikan, acara EMS, hebahan JPP).
     - `keselamatan`: Borang penukaran kata laluan, penunjuk sesi web aktif, dan butang Log Keluar merah berprestij.
     - `bantuan`: Butang mulakan semula panduan sistem (Joyride tour), hubungan pantas Majlis JPP, dan borang maklum balas.
   - *Tab 'Langganan / Billing' Nexus lapuk telah dimansuhkan sepenuhnya.*

3. **Keserasian Parameter URL Sedia Ada (*Backward Compatibility*):**
   - Menyokong pemetaan automatik:
     - `?tab=general` → `profil`
     - `?tab=notifications` → `notifikasi`
     - `?tab=security` → `keselamatan`
     - `?tab=help` → `bantuan`
   - Memastikan pautan luar daripada e-mel, bookmark, dan `PortalSidebar` kekal berfungsi 100%.

4. **Ergonomik & Prestasi Peranti Rendah:**
   - Kelegaan bawah `pb-36` dan `after:h-28` untuk menghalang halangan `BottomNav`.
   - Sasaran sentuhan minimum 44px (`min-h-[44px]`).
   - Mengelakkan operasi gelung N+1 dan memelihara operasi berasaskan perkakasan GPU `transform-gpu`.

---

### 29.9 Seni Bina PolyMart SuperApp: Obsidian-Amber Marketplace & Performance Guardrails

> Route prefix: `/polymart/*` | Komponen Utama: `src/pages/polymart/PolyMartLayout.tsx` & `src/pages/polymart/PolyMartHome.tsx`

Laman Pasaran Mahasiswa PolyMart (`/polymart`) telah dinaik taraf kepada pengalaman **PolyMart SuperApp** berprestasi tinggi berteraskan reka bentuk moden, navigasi pantas, dan ergonomik peranti mudah alih:

1. **Identiti Tema Obsidian-Amber (#f59e0b):**
   - **Rasional Penjenamaan:** Modul e-Keusahawanan dan pasaran PolyMart mengekalkan tema warna Amber / Warm Gold (`#f59e0b`, `amber-500` / `amber-400`) sebagai identiti visual unik yang berasingan daripada tema hijau zamrud Portal Kampus (*Emerald Portal*).
   - Kecerunan rasmi bar tajuk atas menggunakan tona obsidian ambar:
     ```css
     from-amber-950 via-slate-900 to-slate-950 text-white border-b border-amber-500/20
     ```
     disokong oleh lingkaran aura ambar lembut (`bg-amber-500/10 blur-2xl`) untuk memberikan impresi kedalaman visual premium tanpa menjejaskan kejelasan teks.

2. **Kapsul Carian Stadium Moden (Stadium Search Capsule):**
   - Bar carian produk direka bentuk semula sebagai kapsul stadium anggun (`h-10 px-4 rounded-full bg-white dark:bg-slate-900 border border-border/70 hover:border-amber-400/50 focus-within:border-amber-500 shadow-xs`).
   - Dilengkapi ikon kanta pembesar aksen ambar (`Search` Lucide, `text-amber-500`) dan teks penanda tempat kontras tinggi:
     `Cari makanan, minuman, servis, pakaian...`
   - Menyediakan butang pembersihan pantas (`X`) apabila teks ditaip serta butang hantar carian interaktif berkontras mesra sentuhan.

3. **Butang Tindakan Terapung Bulat (Floating Discrete Action Circles):**
   - Menggantikan kapsul/pill lapuk atau bar bertembok lama dengan susunan butang tindakan diskret bulat seragam bersaiz 36px (`w-9 h-9 rounded-full`):
     - **Kembali (`Back`):** Akses kembali pantas ke Portal Siswa `/portal` dengan ikon `ArrowLeft`.
     - **Bakul (`Cart`):** Akses troli belian (`ShoppingCart`) lengkap dengan lencana kuantiti terapung ambar (`bg-amber-500 text-white font-bold`).
     - **Pesanan (`Orders`):** Laluan pantas ke senarai pesanan aktif pembeli (`/polymart/pesanan-saya`) dengan ikon `ShoppingBag`.
     - **Senarai Hajat (`Wishlist`):** Membuka laci senarai hajat pengguna dengan ikon `Heart`.
   - Menggunakan gaya butang permata kaca porselin/obsidian bersinar:
     ```css
     bg-white/80 dark:bg-slate-900/80 border border-border/60 hover:border-amber-400/60 hover:text-amber-500 active:scale-95 shadow-xs transition-all duration-200
     ```

4. **Pemetaan Kategori Vektor Lucide (Vector Category Mapping):**
   - Semua penggunaan emoji mentah (seperti 🍔, ☕, 📱, dsb.) telah dimansuhkan sepenuhnya daripada antaramuka pasaran PolyMart.
   - Dipetakan secara konsisten menerusi kamus `CATEGORY_ICON_MAP`:
     - `'SEMUA'`: `LayoutGrid`
     - `'MAKANAN'`: `Utensils`
     - `'MINUMAN'`: `Coffee`
     - `'KECANTIKAN'`: `Sparkles`
     - `'SERVIS'`: `Wrench`
     - `'PAKAIAN'`: `Shirt`
     - `'ELEKTRONIK'`: `Smartphone`
     - `'LAIN-LAIN'`: `Package`
   - Bar kapsul kategori mendatar (`overflow-x-auto scrollbar-none snap-x`) membolehkan penapisan sepintas lalu dengan maklum balas visual pantas (latar ambar pekat `bg-amber-500 text-white` untuk kategori aktif).

5. **3 Pengawal Senior (Senior Guardrails):**
   - **Guardrail 1 (Prestasi Telefon Pelajar / 60fps Scrolling):**
     - Sifar `backdrop-blur` berat atau glow berlapis-lapis pada 50 kad produk dalam grid.
     - Setiap kad produk menggunakan struktur garis halus ringan (*hairline border*):
       ```css
       rounded-2xl bg-card dark:bg-slate-900/90 border border-border/60 hover:border-amber-400/50 transition-all duration-200
       ```
     - Ini mengelakkan bebanan berlebihan pada GPU mudah alih dan memastikan kelancaran tatalan 60fps pada peranti bajet seperti jenama Redmi dan Infinix yang popular dalam kalangan mahasiswa.
   - **Guardrail 2 (Ruang Skrin Mudah Alih Padat / Screen Estate):**
     - Showcase Hero Banner dihadkan ketinggiannya secara ketat kepada `max-h-[180px]`.
     - Dilengkapi pil statistik metrik beku (*frosted stats pills* untuk jumlah produk & peniaga) dengan latar separa lutsinar (`bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-full px-3 py-1 text-xs border border-white/15`).
     - Memastikan barangan pasaran terus nampak pada lipatan pertama skrin telefon (*above-the-fold*) tanpa memerlukan pelajar menatal jauh ke bawah.
   - **Guardrail 3 (Disiplin Jenama & Integriti Logik):**
     - Mengekalkan warna tema Amber PolyMart tanpa pencampuran yang mengelirukan dengan tema modul lain.
     - Pematuhan ketat 0% pengubahsuaian terhadap logik perniagaan, troli, pesanan, mahupun skema database (100% Visual & UI Polish).

---

### 29.10 Seni Bina Kedai Peniaga Berdedikasi & Laman Produk SuperApp

> Laluan Utama: `/polymart/kedai/:id` & `/polymart/produk/:id` | Komponen: `src/pages/polymart/PolyMartVendorStorefront.tsx`, `src/pages/polymart/PolyMartProductDetail.tsx`, & `src/pages/polymart/PolyMartLayout.tsx`

Laman pasaran mahasiswa PolyMart menyediakan pengalaman peruncitan kampus menyeluruh daripada penemuan produk sehingga profil kedai peniaga dan helaian belian pantas:

1. **Laman Kedai Peniaga Berdedikasi (`PolyMartVendorStorefront.tsx`):**
   - **Laluan Awam:** `/polymart/kedai/:id`. Membolehkan peniaga siswa mempromosikan katalog dan jenama kedai mereka secara berasingan melalui pautan luaran mahupun kod QR kedai.
   - **Smart Preset Ambient Mesh:** Apabila peniaga belum memuat naik gambar penutup (`cover_url`), sistem menjana latar belakang kecerunan Obsidian-Amber pintar (`from-amber-950 via-slate-900 to-stone-950`) secara automatik berserta tanda air (*watermark*) vektor geometri kategori perniagaan berskala besar yang estetik dan tidak kelihatan kosong.
   - **Jalur Profil & Metrik Kedai:** Memaparkan lencana pengesahan rasmi (*Peniaga Siswa Sah POLISAS* / *Siswapreneur*), skor penarafan bintang dan jumlah ulasan, jumlah produk aktif, ketersediaan sokongan pembayaran (DuitNow QR Online / Tunai Semasa Ambil COD), nombor pendaftaran perniagaan/SSM, serta maklumat waktu operasi dan lokasi pengambilan barang dalam kampus.
   - **Tab Navigasi Kedai Interaktif:**
     - `Semua Produk`: Penjelajahan katalog penuh dengan sokongan carian dalam kedai dan penapisan kategori vektor pantas.
     - `Paling Laris`: Susunan produk dengan ulasan tertinggi dan terlaris untuk memudahkan pelajar membuat pilihan pantas.
     - `Info & Lokasi Ambil`: Butiran lengkap waktu operasi, koordinat/nama zon serahan kampus, panduan pembayaran, dan butang tindakan langsung (WhatsApp, panggilan telefon, kongsi pautan kedai).
   - **Pautan Silang Menyeluruh (Omnipresent Cross-Linking):** Navigasi ke storefront kedai peniaga disepadukan secara menyeluruh dari kad produk `PolyMartHome`, laci/halaman `PolyMartCartPage`, pautan penjual dalam `PolyMartMyOrders`, dan butang mikro pada dok pembelian `PolyMartProductDetail`.

2. **Penyahduplikasian Navigasi Mudah Alih (BottomNav Deduplication):**
   - **Kekangan Antaramuka (UI Clutter Prevention):** Laman perincian produk (`/polymart/produk/*`) memerlukan dok pembelian pantas yang melekat di bahagian bawah skrin (`fixed bottom-0`). Jika bar navigasi global `<BottomNav />` turut dirender serentak, ia mencetuskan pertembungan dwi-dok (*double-docking clash*) yang memakan ruang skrin secara berlebihan dan menghalang butang tindakan utama.
   - **Logik Penindasan Kondisional (`PolyMartLayout.tsx`):**
     ```tsx
     {!(
       location.pathname.includes('/polymart/vendor') ||
       location.pathname.includes('/polymart/admin') ||
       location.pathname.includes('/polymart/produk/')
     ) && (
       <div className="tour-polymart-mobile-nav">
         <BottomNav ... />
       </div>
     )}
     ```
   - **Kesinambungan Navigasi:** Laluan kedai `/polymart/kedai/:id` mengekalkan paparan `<BottomNav />` global supaya pembeli dapat melompat kembali ke Utiliti Kampus, Kegemaran, Troli, atau Pesanan dengan satu sentuhan.

3. **Dok Pembelian Produk Melekat Mudah Alih (Mobile Sticky Bottom Purchase Dock):**
   - **Kedudukan & Ergonomik:** Berada pada posisi `fixed bottom-0 left-0 right-0 z-40 bg-card/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-border/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]` lengkap dengan bayang lembut dan penampan bawah `pb-28 sm:pb-32` pada kontena kandungan utama supaya tiada teks atau ulasan terselindung di sebalik dok.
   - **Trio Butang Mikro Kiri:**
     - **Kedai (`Store`):** Membuka terus etalase kedai peniaga (`/polymart/kedai/:business_id`).
     - **Sembang (`MessageCircle`):** Membuka tetingkap sembang segera (*real-time chat modal*) terus kepada peniaga untuk sebarang pertanyaan stok atau kustomisasi.
     - **Troli (`ShoppingCart`):** Akses segera ke `/polymart/troli` lengkap dengan lencana bilangan item semasa (`cartCount`) berwarna merah jambu (`bg-rose-500 text-white`).
   - **Butang Tindakan Berkembar Kanan:**
     - `+ Troli`: Membuka helaian bawah pemilihan variasi dalam mod penambahan troli (`CART`).
     - `Beli Sekarang`: Membuka helaian bawah dalam mod pesanan terus (`BUY`) dengan gaya kecerunan ambar bertenaga (`PM_GRADIENT`).

4. **Helaian Bawah Variasi Bergerak Naik Ergonomik (Ergonomic Slide-Up Variation Bottom Sheet):**
   - **Komponen:** `ProductVariationBottomSheet` menggantikan modal kotak tengah lapuk (*antiquated centered dialog modal*) yang sukar dicapai oleh ibu jari pada peranti skrin panjang.
   - **Ciri-ciri Utama:**
     - Animasi luncuran spring daripada bahagian bawah skrin (`framer-motion`) berserta penguncian tatalan latar belakang (*body scroll lock*).
     - Tajuk mini dengan pratonton lakaran *squircle thumbnail*, paparan harga dinamik mengikut variasi, dan pembilang baki stok sebenar.
     - Cip pemilihan saiz/warna/variasi interaktif berserta petunjuk kehabisan stok bagi setiap variasi secara automatik.
     - Kaunter kuantiti (+/-) ergonomik dihadkan mengikut baki stok sedia ada.
     - Bahagian pemilihan waktu ambil (*pickup time slot*) dan penukaran kaedah pembayaran (DuitNow QR Online / Tunai Semasa Ambil COD) mengikut tetapan peniaga.
     - Menyokong dua mod aliran lancar: Mod `'CART'` (simpan ke troli Supabase dan kemas kini lencana masa nyata) dan Mod `'BUY'` (aliran terus ke pengesahan tempahan).

5. **Karusel Produk Silang (Cross-Selling Horizontal Snap Carousel):**
   - Memaparkan seksyen *"Produk Lain dari Kedai Ini"* di bahagian bawah laman produk untuk memacu jualan silang (*cross-selling*).
   - Susun atur leretan mendatar (*horizontal snap carousel* `overflow-x-auto scrollbar-none snap-x`) yang membolehkan pelajar meluncur katalog tanpa membebankan ruang vertikal skrin.
   - Data produk silang dimuatkan secara selari menggunakan `Promise.all` serentak dengan maklumat produk utama, mematuhi prinsip pencegahan N+1 queries.

6. **Disiplin Prestasi Telefon Siswa & Sifar Emoji Mentah:**
   - **60fps Mobile Performance:** Mengelakkan penggunaan `backdrop-blur` berat atau bayang-bayang kompleks merentasi kad grid dan kad karusel. Mengutamakan sempadan garis halus (*hairline border*) `border border-border/60` yang ringan diproses oleh cip pemproses peranti kelas permulaan mahasiswa.
   - **Sifar Emoji Mentah:** Penghapusan 100% aksara emoji mentah dalam semua teks status, butang, dan kategori produk. Digantikan sepenuhnya oleh ikon vektor Lucide seragam (`CATEGORY_ICON_MAP`: `Utensils`, `Coffee`, `Sparkles`, `Wrench`, `Shirt`, `Smartphone`, `Package`) untuk memastikan rupa antaramuka yang konsisten merentasi sistem operasi Android, iOS, Windows, dan macOS tanpa isu glyph hilang atau perbezaan rendering emoji pengeluar telefon.

---

## 30. Modul PolySuara Super App: Suapan Media Sosial Bersih & Moden (Clean Modern Social Architecture)

> Route: `/polysuara` | Komponen Utama: `src/pages/polyservices/PolySuaraPage.tsx` | Layout: Kendiri (dengan `BottomNav` & `ThemeToggle`)

Modul PolySuara telah dinaik taraf kepada **Aplikasi Media Sosial Alternatif Mahasiswa** bertaraf tinggi dengan seni bina bersih dan moden (*anti-slop clean social architecture*). Elemen visual berlebihan seperti bar cerita bertingkat (*story pulse bar*) dan butang FAB terapung bertindih telah dimansuhkan. Sebaliknya, suapan kini menampilkan bar navigasi atas lekat (*sticky header*) dwi-mod, kapsul penggubah pantas (*quick-compose capsule*), trek navigasi suapan tunggal eksekutif (*Executive Single-Line Track*), kad luahan terapung mewah bersudut melengkung `rounded-[2rem]` dalam palet **Apple Porcelain & Rose Glow**, baris tindakan sosial bersepadu dengan corak *One-Tap Heart + WhatsApp Reactions* dan saling eksklusif (like vs dislike), laci ulasan moden gaya Threads (*Threads-Style Comments Drawer*) dengan 4-depth nested comment threading dan persona haiwan mesra, penaikan modal melalui React Portal berserta penindasan chrome global (`BottomNav` / `FloatingAiChat`), serta mekanisme pemadaman kendiri 1 jam (*1-Hour Self-Delete*) bertombstone.

---

### 30.1 Konsep Reka Bentuk & Spesifikasi Apple Porcelain & Rose Glow (Light & Dark Mode Parity)

1. **Kanvas Bersih Dwi-Mod Apple Porcelain & Obsidian Glow:**
   - PolySuara menyokong penuh peralihan mod tema cerah dan gelap melalui suis `<ThemeToggle />` di bahagian atas bar navigasi lekat (*sticky header*).
   - **Mod Cerah (Apple Porcelain):** 
     - Kanvas latar belakang lembut: `bg-slate-50 text-slate-900`.
     - Kad luahan terapung porselin bersih: `bg-white border border-slate-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] rounded-[2rem] p-5 sm:p-6 mb-5 transition-all duration-300 relative overflow-hidden`.
     - Lencana kategori: `text-slate-600 bg-slate-100/90 border border-slate-200/60 rounded-full text-[10px] uppercase font-black tracking-wider px-3 py-1`.
     - Tipografi editorial luas: `text-[15px] sm:text-base leading-relaxed text-slate-800 whitespace-pre-wrap font-normal mb-3.5`.
   - **Mod Gelap (Obsidian Rose Glow):** 
     - Kanvas: `dark:bg-slate-950 text-slate-100`.
     - Aras kaca obsidian dalam: `dark:bg-slate-900/70 dark:backdrop-blur-xl dark:border-white/[0.07] dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]`.
     - Lencana kategori: `dark:text-slate-400 dark:bg-white/[0.06] dark:border-white/[0.08]`.
     - Tipografi editorial: `dark:text-slate-200`.
   - Mesh aura ambien di latar belakang (`bg-rose-500/5 dark:bg-rose-500/10 blur-[100px]`) memberikan kedalaman visual tanpa membebankan pemproses grafik peranti mudah alih.

2. **Header Lekat Pintar (*Sticky Top Bar*):**
   - Menempatkan butang kembali bulat pantas ke Portal `/portal`, penunjuk status hidup bulatan hijau bersinar, suis tema `<ThemeToggle />`, suis loceng notifikasi PolySuara (diselaraskan dengan jadual `polysuara_notif_optout`), dan lencana mod tanpa nama (*Anon Mode* berbingkai perisai ros).

3. **Spesifikasi Modul Undian Apple Porcelain & Dual Mode (`PolySuaraPoll.tsx`):**
   - Menghapuskan sepenuhnya kelas konkrit gelap tegar (`bg-slate-900/50`, `border-slate-800`, `text-slate-300`).
   - **Bekas Utama:** `bg-slate-50/90 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs`.
   - **Header Undian:** `flex items-center gap-2 mb-3 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider`.
   - **Butang Pilihan (Bukan Diundi):** `border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs`.
   - **Butang Pilihan (Telah Diundi):** `border-rose-400/60 dark:border-rose-500/50 bg-rose-50/60 dark:bg-rose-500/10 shadow-xs ring-1 ring-rose-400/20 dark:ring-rose-500/20`.
   - **Bar Kemajuan (Progress Fill):**
     - Diundi: `bg-rose-500/20 dark:bg-rose-500/25`
     - Bukan diundi: `bg-slate-100 dark:bg-slate-700/40`
   - **Teks Pilihan:**
     - Diundi: `text-rose-950 dark:text-rose-100 font-semibold`
     - Bukan diundi: `text-slate-800 dark:text-slate-200 font-medium`
   - **Peratusan & Bilangan Undi:**
     - Diundi: `text-rose-600 dark:text-rose-400 font-bold font-mono`
     - Bukan diundi: `text-slate-500 dark:text-slate-400 font-bold font-mono`
   - **Jumlah Undian:** `text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[10px]`.

---

### 30.2 Pemansuhan Komponen Berlebihan & Anti-Slop (Deprecation of `CampusPulseBar` & `FloatingComposeFab`)

1. **Penyingkiran `CampusPulseBar` (Anti-Slop):**
   - Bar bulatan cerita gaya Instagram (*story pulse rings*) telah dimansuhkan sepenuhnya daripada sistem (`src/components/polysuara/CampusPulseBar.tsx` dipadamkan).
   - **Rasional Seni Bina:** Bar cerita tersebut mencetuskan kesesakan visual (*AI-slop visual clutter*), memakan ruang vertikal skrin peranti mudah alih secara berlebihan, dan menduplikasi fungsi penapisan kategori suapan. Penapisan kategori kini disatukan secara elegan ke dalam *Executive Single-Line Track*.

2. **Penyingkiran `FloatingComposeFab` (Mengelakkan Pertembungan FAB):**
   - Butang tindakan terapung merah jambu berasingan (`src/components/polysuara/FloatingComposeFab.tsx`) telah dipadamkan sepenuhnya.
   - **Rasional Seni Bina:** Butang FAB terapung tersebut bertembung (*overlapping collision*) dan bersaing ruang secara langsung dengan butang bulat `+` emas rasmi milik `BottomNav` (`z-[120]`) serta butang pembantu AI (`FloatingAiChat`).

3. **Kapsul Penggubah Luahan Pantas (*Quick-Compose Capsule*):**
   - Penulisan luahan kampus kini diakses melalui kapsul sentuh sebaris yang ditempatkan secara kemas di atas suapan utama (`✍️ Ada luahan atau rahsia kampus? Kongsi secara rahsia... [Luahkan]`).
   - Mengetik kapsul ini mencetuskan pembukaan **Modal Penggubah Bebas Gangguan (*Compose Modal*)** berserta papan kekunci tanpa sebarang gangguan elemen terapung lain.

4. **Pembersihan Navigasi Berganda (*Deduplicated Chrome*):**
   - Memastikan hanya satu komponen `<BottomNav />` dirender di bahagian bawah `PolySuaraPage.tsx` dan mengelakkan sebarang penduaan komponen navigasi global sistem.

---

### 30.3 Trek Navigasi Suapan Tunggal Eksekutif (Executive Single-Line Track)

1. **Susun Atur Sebaris Padat & Kemas (*Single-Line Consolidated Navigation Track*):**
   - Menyatukan kawalan susunan suapan dan penapisan kategori ke dalam satu baris mendatar yang anggun (`flex items-center gap-2 overflow-x-auto pb-3 mb-5 scrollbar-none snap-x w-full`):
   - **Togol Segmen Isih (Kiri):**
     - Butang dwipil padat untuk `🕒 Terkini` (`sortBy === 'LATEST'`) dan `🔥 Hangat` (`sortBy === 'TRENDING'`).
     - Menyediakan peralihan pantas antara kronologi masa nyata dan luahan hangat bervolum tinggi dengan maklum balas aktif bersinar.
   - **Garis Pemisah Halus (Tengah):**
     - Penanda sempadan menegak mikro (*hairline divider* `w-px h-5 bg-slate-200 dark:bg-white/10 shrink-0`) yang memisahkan segmen isih dan kategori secara diskret tanpa kekusutan visual.
   - **Cip Penapis Kategori Leret (Kanan):**
     - Trek leret mendatar (*horizontal snap track* `overflow-x-auto scrollbar-none snap-x flex items-center gap-1.5 shrink-0`) merangkumi cip kategori: `Semua`, `Akademik`, `Fasiliti`, `Kamsis`, dan `Kaunseling`.
     - Menggunakan reka bentuk pil moden bersudut `rounded-xl` yang bertukar kepada kontras tinggi apabila aktif.

---

### 30.4 Kad Luahan Terapung & Reaksi Saling Eksklusif (Strict Mutual Exclusivity)

1. **Struktur Kad Lapang & Berkarisma:**
   - Sudut melengkung eksekutif `rounded-[2rem]` dengan bayang terapung moden.
   - **Header Kad:**
     - Avatar bulat watak haiwan di dalam gelang neon kecerunan tebal (`bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400`).
     - Nama samaran rahsia dalam teks tebal (`font-extrabold text-slate-900 dark:text-white`) bersama lencana semakan anon biru/cyan comel (✓) bertajuk *"Identiti Anon Sah Disahkan"*.
     - Masa relatif kiriman (`2 jam lepas`) di bawah nama pengarang.
     - Lencana kategori berbentuk pil berhuruf besar bersempadan halus (`border border-slate-200/60 dark:border-white/[0.08]`).
     - Butang laporan bendera ditempatkan secara kemas di penjuru kanan atas.
   - **Badan Luahan:**
     - Teks luahan editorial luas: `text-[15px] sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-normal mb-3.5`.
     - Lampiran imej dengan nisbah aspek penuh, sempadan `rounded-2xl`, dan animasi zum pada sentuhan.
     - Maklum balas rasmi JPP direka sebagai kad petikan verifikasi eksklusif dengan sempadan sisi hijau firus (`border-l-2 border-teal-500 bg-teal-50 dark:bg-teal-500/[0.04] p-3.5 rounded-r-2xl`).

2. **Corak Reaksi Facebook/LinkedIn "Dynamic User Emoji + Stacked Badges" (`PolySuaraReactions.tsx`):**
   - **Transformasi Emoji Dinamik Butang Utama:**
     - Butang utama memaparkan ikon Hati (❤️) secara lalai dengan angka bilangan suka (`tabular-nums font-mono text-[11px] leading-none shrink-0`).
     - Sekiranya pengguna memilih reaksi lain (cth: 😂, 🔥, 😢, 😮, 💯), ikon Hati secara automatik **digantikan** dengan emoji yang dipilih bersama tona warna aktif yang sepadan (cth: `bg-amber-500/15 text-amber-600` untuk 😂).
     - Mengetik semula butang tersebut serta-merta membatalkan reaksi (*un-react*) dan mengembalikannya kepada ikon ❤️ lalai.
   - **Kluster Emoji Bertindan Komuniti (*Stacked Overlapping Badges*):**
     - Apabila luahan menerima pelbagai reaksi, sehingga 3 emoji teratas dipaparkan bertindan separa (*overlapping micro-circles* dengan sempadan cincin halus `ring-1 ring-white dark:ring-slate-900`) di dalam kapsul utama.
     - Menyediakan paparan sentimen komuniti secara padat (~55px) tanpa menduplikasi pil berasingan yang memanjangkan barisan.
   - **Pecahan Terperinci Interaktif (*Interactive Breakdown Popover*):**
     - Mengetik kluster emoji bertindan membuka popover mini pecahan komuniti (`reactions-breakdown-popover`) yang dipancarkan melalui `createPortal` (`z-[9985]`).
     - Memaparkan kiraan setiap emoji (cth: `❤️ 12`, `😂 5`, `🔥 2`) berserta lencana `Anda` bagi reaksi milik pengguna, dan membenarkan pertukaran reaksi terus dari dalam senarai pecahan.
   - **Pencetus Popover 6 Emoji WhatsApp:**
     - Butang `+` halus di hujung kapsul membuka popover terapung berisi 6 emoji WhatsApp (❤️, 😂, 🔥, 😢, 😮, 💯) menggunakan `createPortal` (`z-[9999]`) dengan penutupan klik di luar (*outside tap dismiss*).

3. **Peraturan Ketat Saling Eksklusif Like & Dislike (*Strict Mutual Exclusivity*):**
   - **Suka Membatalkan Tidak Suka (Like Cancels Dislike):** Mengetik reaksi suka (Heart atau mana-mana emoji WhatsApp) secara automatik membatalkan rekod downvote pengguna pada luahan berkenaan, menolak kiraan `downvotes` sebanyak 1, dan menghapuskannya daripada `userDownvotes` (`syncReactionToggleState`).
   - **Tidak Suka Membatalkan Suka (Dislike Cancels Like):** Mengetik butang Downvote (👎) secara automatik membatalkan sebarang reaksi aktif pengguna pada luahan tersebut, menolak kiraan `upvotes` sebanyak 1, dan mengeluarkan reaksi dari `confessionReactions` (`syncDownvoteToggleState`).
   - **Jaminan Konsistensi RPC:** Logik peringkat pangkalan data (`toggle_polysuara_reaction` dan `toggle_polysuara_downvote`) menguatkuasakan penghapusan rekod songsang secara atomik bagi memastikan integriti data 100%.

4. **Baris Tindakan Sosial Bebas Balutan (*Clean Single-Row Action Bar* & Portal Popover):**
   - Bekas kontena: `flex items-center justify-between gap-1.5 sm:gap-2 pt-3 border-t border-slate-100 dark:border-white/5 flex-nowrap overflow-x-auto scrollbar-none`.
   - **Ketinggian Popover Terapung (React Portal Elevation):** Popover 6 emoji WhatsApp dipancarkan terus ke `document.body` menggunakan `createPortal` dengan koordinat dinamik (`position: fixed; z-index: 9999;`). Ini membolehkan baris tindakan menggunakan `overflow-x-auto scrollbar-none` bagi menyokong leretan peranti mudah alih tanpa memotong atau menindih popover emoji.
   - **Kiri (`flex items-center gap-1.5 shrink-0 flex-nowrap`):**
     - Kluster Reaksi & Suka Sekali Sentuh `<PolySuaraReactions />`.
     - Butang Dislike (👎) komuniti untuk semakan auto-moderasi dengan bilangan undian.
     - Butang Ulasan (💬) dengan bilangan komen untuk membuka laci ulasan.
   - **Kanan (`flex items-center gap-1 sm:gap-1.5 shrink-0 flex-nowrap`):**
     - Butang Perkongsian grafik pantas (`Share2`).
     - Butang Simpanan / Bookmark (`Bookmark`).
     - Butang `Balas JPP` padat (`px-2 sm:px-2.5 py-1 shrink-0 flex-nowrap`) hanya dipaparkan bagi pemegang peranan autoriti (`JPP`, `ADMIN`, `SUPER_ADMIN`) atau penulis asal.

---

### 30.5 Laci Ulasan Gaya Threads, Threading Bersarang 4 Aras & Persona Haiwan Mesra

1. **Laci Ulasan Moden Gaya Threads (*Threads-Style Comments Drawer*):**
   - **Reka Bentuk Berpusatkan Pembacaan:**
     - Pemegang seret atas (*drag pill indicator*) untuk gerak isyarat tutup pantas pada peranti mudah alih.
     - Pratonton ringkas teks luahan asal di bawah tajuk laci untuk mengekalkan konteks perbincangan.
     - Pemisah garis halus (*hairline dividers* `border-b border-slate-100 dark:border-white/5 py-3.5 px-4`) antara ulasan induk dan jawapan bersarang, menggantikan kad berkotak yang sempit dengan gaya editorial lapang.
   - **Lencana Pengenalan Khusus:**
     - **Lencana OP (*Original Poster*):** Ditandakan secara automatik (`bg-rose-500/10 text-rose-500 border border-rose-500/20`) apabila penulis luahan asal membalas sebarang komen.
     - **Lencana Rasmi JPP:** Ditandakan dengan lencana zamrud (`bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20`) berserta ikon perisai bagi maklum balas rasmi kepimpinan pelajar.

2. **Threading Ulasan Bersarang 4 Aras (*4-Depth Nested Comment Threading*):**
   - Ulasan menyokong perbincangan berstruktur anak-beranak sehingga 4 kedalaman (`depth <= 4`):
     - Aras 1: Ulasan primer bergaris pemisah penuh.
     - Aras 2: Anjakan ke dalam `ml-6` dengan sempadan sisi halus (`border-l-2 border-slate-200 dark:border-slate-800 pl-3`).
     - Aras 3: Anjakan tambahan `ml-4` dengan penanda garis salur.
     - Aras 4: Aras jawapan terdalam dengan penunjuk `@nama_persona` bagi mengelakkan limpahan melintang (*horizontal overflow*) pada peranti mudah alih kompak.

3. **Persona Haiwan Mesra Deterministik (*Deterministic Friendly Animal Personas*):**
   - Setiap pengulas tanpa nama diberikan nama samaran haiwan mesra melalui fungsi `getFriendlyAnonName(authorId, confessionId)`:
     - Gabungan haiwan kampus (cth: `Kucing Oren`, `Panda Santai`, `Arnab Putih`, `Koala Comel`, `Musang Cerdik`, dll.) dengan palet warna avatar lembut.
     - Dijana secara deterministik berasaskan cincangan ID pengguna dan ID luahan, membolehkan pembaca mengenali pengulas yang konsisten dalam utas komen tanpa membocorkan identiti sebenar mahasiswa.

4. **Penaikan Modal Melalui React Portal & Penindasan Chrome Global (*Portal Elevation & Global Chrome Suppression*):**
   - **Penaikan React Portal:** Semua dialog dan panel skrin penuh (Compose Modal, Comments Drawer, Report Modal) dirender terus ke `document.body` menggunakan `createPortal(..., document.body)` bagi mengelakkan perangkapan konteks tindanan z-index daripada bekas induk.
   - **Penindasan Chrome Global:** Apabila modal atau laci aktif (`composeModalOpen || commentDrawerOpen`), komponen navigasi bawah (`<BottomNav />`) dan pembantu AI terapung (`<FloatingAiChat />`) **ditindas sepenuhnya daripada rendering** (`!composeModalOpen && !commentDrawerOpen && (...)`). Ini menghapuskan sebarang pertembungan sentuh atau gangguan pandangan semasa menaip ulasan atau luahan.

---

### 30.6 Mekanisme Pemadaman Kendiri 1 Jam Bertombstone (*1-Hour Self-Delete with Tombstone*)

1. **Had Masa Pemadaman Kendiri 1 Jam:**
   - Pengarang luahan atau ulasan mempunyai tingkap masa selama 1 jam dari waktu penghantaran (`isWithin1Hour(created_at)`) untuk memadamkan kiriman mereka sendiri.
   - Selepas 1 jam luput, butang `Padam` disembunyikan secara automatik untuk mengekalkan arkib perbincangan kampus.

2. **Pemeliharaan Integriti Utas dengan Mesej Tombstone:**
   - Sekiranya pengarang memadamkan luahan mereka dalam tempoh 1 jam:
     - Teks asal digantikan dengan `[deleted]` dan bendera `is_deleted_by_author = true` ditetapkan dalam pangkalan data.
     - Lampiran imej dan undian dipadamkan/disembunyikan.
     - UI luahan memaparkan mesej tombstone rasmi:
       `<Trash2 className="w-4 h-4 text-slate-400" /> <nama> telah memadamkan ruangan ini`
       (contoh: *"Kucing Oren telah memadamkan ruangan ini"*).
     - Seluruh rantaian ulasan sedia ada di bawah luahan dikekalkan bagi memastikan konteks maklum balas dan perbincangan mahasiswa lain tidak hilang secara mendadak.

---

### 30.7 Pengekalan Mekanisme Auto-Moderasi Komuniti & Keselamatan

1. **Pengekalan Butang Dislike / Undi Turun (👎):**
   - Butang Dislike dikekalkan sebagai instrumen berasingan di sebelah reaksi.
   - **Peraturan Ambang Auto-Sembunyi POLISAS:** Sekiranya sesuatu luahan menerima lebih daripada 60% downvote daripada minimum 40 jumlah undian, fungsi RPC `toggle_polysuara_downvote` akan menyembunyikan luahan tersebut dari tatapan awam secara automatik dan menghantar amaran kecemasan kepada Exco Kebajikan.
2. **Eskalasi Krisis & Kebajikan Rahsia:**
   - Butang *"Bantuan"* pada ulasan dan butang laporan perisai pada kad luahan membolehkan pelajar menghantar isyarat kecemasan terus kepada barisan pimpinan kebajikan secara 100% sulit.
3. **Ergonomik Mudah Alih & Ruang Bawah:**
   - Penjarakan bawah `pb-36 md:pb-32` berserta ruang pemisah mudah alih `<div className="h-32 md:hidden" aria-hidden="true" />` memastikan `BottomNav` tidak sekali-kali menghalang butang reaksi atau kad luahan paling bawah semasa suapan ditatal.

