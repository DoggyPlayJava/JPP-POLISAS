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
> - 🚧 e-Keusahawanan (dalam pembangunan)
> - 🔜 e-Kebajikan, e-Sukan, dan lain-lain (belum dimulakan)
>
> **Akibatnya, struktur fail mungkin kelihatan tidak konsisten:**
> - Route e-KPP tiada prefix (`/dashboard`, `/aktiviti`) walaupun exco lain ada prefix (`/keusahawanan/*`)
> - Sesetengah nama komponen masih menggunakan nama lama berorientasikan KPP
> - `JppAdminPage.tsx` adalah fail terbesar (3000+ baris) kerana ia merangkumi semua logik admin global
> - Bahagian sidebar, navbar, dan portal masih dalam proses dipisahkan mengikut exco
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
| `club_logs` | Audit log semua tindakan |
| `jpp_mt_assignments` | MT yang oversee unit exco tertentu |
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

### Terminologi (Penting untuk AI & UI):
- `Laporan Aktiviti` dalam database = `Laporan Bulanan` dalam UI
- **JANGAN** tunjuk "Laporan Aktiviti" kepada pengguna — selalu guna "Laporan Bulanan"

---

## 9. Contexts (State Global)

| Context | Eksport | Kegunaan |
|---|---|---|
| `AuthContext` | `useAuth()` | User, profile, role flags, club switching |
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
| `src/config/excoModules.ts` | Config modul exco. `isActive: false` = modul tersembunyi |
| `supabase/migrations/` | Database schema history. Jangan edit migration lama |

---

*Dikemas kini: April 2026 — Setiap perubahan besar pada sistem perlu dikemas kini dokumen ini.*
