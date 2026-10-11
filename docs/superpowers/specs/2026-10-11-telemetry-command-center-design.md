# Reka Bentuk Spesifikasi: Pusat Kawalan Telemetri Sistem (SentinelAI Style)
**Tarikh:** 11 Oktober 2026  
**Status:** Draf Diluluskan  
**Rujukan Visual:** SentinelAI Observability Dashboard  
**Skop:** Baik pulih menyeluruh UI/UX `JppTelemetryPage.tsx` menjadi Pusat Kawalan Telemetri Interaktif (*Cyber Command Center*)

---

## 1. Latar Belakang & Objektif

Halaman Telemetri Sistem JPP-POLISAS sebelum ini bergantung kepada susunan kad Bento (*bento cards*) statik yang berulang (lebih 15 kad bertingkat). Ini menyebabkan:
1. **Ketiadaan Hierarki Visual & Model Mental:** Sukar bagi Super Admin untuk melihat aliran data sistem sebenar dari pengguna, API, perkhidmatan modul, sehinggalah ke pangkalan data.
2. **Ketiadaan Skor Eksekutif Berpusat:** Tiada penunjuk aras pantas (0-100) untuk mengetahui status kesihatan dan ketahanan keseluruhan sistem secara sepintas lalu.
3. **Pemisahan Log Ralat & Amaran:** Fungsi *Crash & Error Tracker* (`system_error_events`) diletakkan berasingan di bahagian bawah dan tidak disepadukan dengan amaran diagnostik.

**Objektif reka bentuk ini:**
* Menukar halaman telemetri kepada susun atur **Pusat Kawalan 3-Lajur (SentinelAI Inspiration)**.
* Membina gambar rajah **Aliran Topologi Interaktif (*Live System Topology Flow*)** di bahagian tengah dengan 3 mod pandangan (*Flow View*, *Traffic*, *Health Matrix*).
* Memusatkan pengiraan **Skor Ketahanan Sistem (*Resilience Score*)** di backend (`server.js`) sebagai *Single Source of Truth*.
* Mengintegrasikan suapan ralat pelayar & pelayan (`system_error_events`) bersama amaran diagnostik dalam satu **Live Incident & Activity Timeline**.
* Menyusun semua metrik 15+ modul kampus dan komersial ke dalam **Tab Navigasi Teratur** tanpa mencetuskan kesesakan visual (*visual clutter*).

---

## 2. Struktur Data & Integrasi Supabase

### 2.1 Sumber Data Supabase
Semua data telemetri dijana terus daripada pangkalan data Supabase:
* **Modul PolyRider:** Jadual `polyrider_jobs`, `polyrider_bids`, `polyrider_sos_logs`, `polyrider_profiles`.
* **Modul PolyMart:** Jadual `polymart_orders`, `polymart_reviews`, `polymart_reports`.
* **Modul e-Kebajikan:** Jadual `kebajikan_tickets`, `kebajikan_ticket_comments`.
* **Modul Profil & Akaun:** Jadual `profiles` (status akaun, jabatan, peranan).
* **Crash & Error Tracker:** Jadual `system_error_events` (ralat client `window.onerror`, ralat server uncaught/5xx).
* **Snapshot Sejarah:** Jadual `system_telemetry_snapshots` (rekod harian 3:00 AM).
* **Infrastruktur & DB:** RPC `get_database_health_metrics` untuk sambungan aktif, saiz DB, cache hit, dan WAL.
*(Nota: Untuk modul perkhidmatan PolyRider, PolyMart, Kebajikan, dan Profil, pengagregatan dilakukan secara langsung melalui queries selamat di `server.js` tanpa bergantung kepada RPC luaran).*

### 2.2 Kontrak Backend Baharu (`server.js`)
Endpoint `GET /api/system-telemetry` dipertingkatkan untuk mengira dan memulangkan skor ketahanan secara automatik:

```typescript
interface TelemetryBackendResponse {
  server: {
    uptime_seconds: number; // Uptime proses Node.js
    memory: { rss_mb: number; heap_used_mb: number; heap_total_mb: number; external_mb: number };
    cpu: { user_us: number; system_us: number };
    node_version: string; platform: string; pid: number;
  };
  resilience_score: number;    // 0 - 100
  resilience_rating: 'Cemerlang' | 'Stabil' | 'Perhatian Diperlukan' | 'Kritikal';
  resilience_deductions: Array<{
    code: string;
    label: string;
    points: number;
  }>;
  modules: Record<string, any>;
  diagnostics: {
    polyrider: any; polymart: any; kebajikan: any;
    ai: any; push: any; accounts: any; database: any;
  };
  snapshots: any[];
  timestamp: string;
}
```

### 2.3 Formula & Peraturan Tolak-Mata Backend
Markah asas bermula pada **100**, ditolak berdasarkan insiden diagnostik yang dikesan:
1. **Memori Heap:** `srv.memory.heap_used_mb / srv.memory.heap_total_mb > 0.8` ➔ `-10 mata`
2. **Sambungan DB:** `d.database.active_connections / d.database.max_connections > 0.8` ➔ `-15 mata`
3. **WAL Retained:** `d.database.wal_retained_mb > 1024` ➔ `-30 mata` (atau `> 512` ➔ `-15 mata`)
4. **SLA Kebajikan:** `d.kebajikan.sla_breached > 0` ➔ `-10 mata` setiap satu (had maks -25 mata)
5. **PolyRider SOS Tersekat:** `d.polyrider.stuck_emergency > 0` ➔ `-20 mata` setiap satu
6. **Pesanan PolyMart Tertunggak:** `d.polymart.pending_stale > 0` ➔ `-5 mata` setiap satu
7. **Kuota Token AI:** `d.ai.usage_pct > 90` ➔ `-10 mata`

---

## 3. Seni Bina Komponen Frontend (`src/pages/jpp/telemetry/`)

Kod dipecahkan kepada komponen modular di bawah `src/pages/jpp/telemetry/`:

```
src/pages/jpp/
├── JppTelemetryPage.tsx             # Main Page Container, Auth Guard & Fetching
└── telemetry/
    ├── telemetryTypes.ts            # Definisi TypeScript untuk semua kontrak data
    ├── telemetryUtils.ts            # Helper pemformatan masa, warna rating, dan penukar data
    ├── TelemetryLeftRail.tsx        # Lajur Kiri: Executive Greeting, Skor Kesihatan (0-100), Status Isu
    ├── TelemetryTopologyFlow.tsx    # Bahagian Tengah: Aliran Topologi Interaktif (3 Mod Paparan)
    ├── TelemetryLiveTimeline.tsx    # Lajur Kanan: Kronologi Insiden & Log Ralat Sebenar
    ├── TelemetryQuickMetrics.tsx    # Bawah Topology: 4 Kad Metrik Utama (Bottlenecks, DB, AI, Automation)
    └── TelemetryModuleTabs.tsx      # Tab Terperinci: Trend Graf, Modul Pentadbiran, Komersial & DB Deep-Dive
```

### 3.1 Lajur Kiri (`TelemetryLeftRail.tsx`)
* **Executive Summary:** Ucapan kepada pentadbir, status operasi ("Sistem beroperasi pada tahap optimum"), dan butang tindakan pantas ("Imbas Semula").
* **Skor Ketahanan Sistem (0-100):** Paparan bulatan/gauge dengan penarafan visual (`Cemerlang` / `Stabil` / `Perhatian Diperlukan` / `Kritikal`).
* **Senarai Penalti Aktif:** Ringkasan tolak-mata jika ada isu yang mengurangkan skor.
* **Metrik Proses Pelayan:** 
  * "Uptime Proses Node.js" (jam, minit, saat).
  * Penggunaan memori heap MB dengan bar peratusan visual.

### 3.2 Aliran Topologi Interaktif (`TelemetryTopologyFlow.tsx`)
* **3 Mod Paparan (Toggle Tabs):**
  1. `Aliran Pipeline (Flow View)` — Aliran linear & bercabang:
     `Pelajar & Trafik (Ingress)` ➔ `Node.js API Engine` ➔ `Auth & RBAC Shield` ➔ `Modul Perkhidmatan (PolyMart, PolyRider, Kebajikan, AI)` ➔ `PostgreSQL Cluster & WAL Watchdog`.
  2. `Taburan Trafik (Traffic View)` — Bar beban relatif permintaan mengikut perkhidmatan.
  3. `Matriks Kesihatan (Health Heatmap)` — Peta grid status semua subsistem dengan penunjuk warna hijau/kuning/merah.
* **Interaktiviti:** Setiap nod memaparkan lampu status denyutan (*pulse indicator*) dan metrik ringkas.

### 3.3 Lajur Kanan (`TelemetryLiveTimeline.tsx`)
* Menggabungkan DUA sumber insiden masa nyata:
  1. Ralat & Crash daripada `GET /api/system-errors?limit=25` (diambil daripada jadual `system_error_events`).
  2. Amaran diagnostik daripada `diagnostics.*.alerts`.
* Menyediakan penapis pantas (*Filter pills*): `[Semua]`, `[Kritikal]`, `[Amaran]`, `[Sistem]`.
* Jika tiada ralat: Memaparkan status "Semua Subsistem Beroperasi dengan Selamat".

### 3.4 Kad Ringkasan Pantas (`TelemetryQuickMetrics.tsx`)
Terletak terus di bawah gambar rajah topologi:
1. **Bottlenecks & Amaran:** Isu memerlukan perhatian dengan bar impak (SLA tiket, pesanan basi, trip kecemasan).
2. **Infrastruktur Teras:** Status Node.js, PostgreSQL pool (sambungan aktif / maks), dan saiz storan DB.
3. **Kepintaran AI:** Penggunaan token AI, baki kuota, dan kadar pengoptimuman.
4. **Automasi & Snapshot:** Status snapshot harian jam 3:00 AM, langganan Push, dan kadar penyelesaian tiket.

### 3.5 Tab Navigasi Modul Terperinci (`TelemetryModuleTabs.tsx`)
Mengekalkan kesemua 15+ rekod modul tanpa mengganggu susun atur utama:
* **Tab 1: 📊 Trend Pertumbuhan & Kebajikan** — Graf kawasan (*AreaChart*) 30-hari dari `system_telemetry_snapshots` dan graf pai (*PieChart*) tiket e-Kebajikan.
* **Tab 2: 🏛️ Pentadbiran & Kampus** — Kad e-Akademik, Kelab/Persatuan, SUPSAS, Karnival, KLK Siswa Luar, dan Takwim Pusat.
* **Tab 3: 🛒 Komersial & Logistik** — Kad PolyMart (dengan pecahan status pesanan), PolyRider (dengan status trip & SOS), dan e-Keusahawanan (transaksi POS).
* **Tab 4: ⚙️ Diagnostik DB & WAL** — Paparan mendalam WAL retained MB (had 2GB crash prevention), Transaction ID age (TXID), Cache hit rate, Dead tuples, dan locks.

---

## 4. Sistem Visual & Dwi-Tema (*Seamless Dual-Theme*)

Mengikut panduan `design-taste-frontend`:
* **Mod Cerah (Light Mode - SentinelAI Warm Theme):**
  * Latar belakang: `bg-[#F8F9FA]` dengan aksen hangat.
  * Kad: `bg-white border-slate-200/90 shadow-xs`.
  * Tipografi: Slate pekat `text-slate-900` dan label slate sederhana `text-slate-500`.
* **Mod Gelap (Dark Mode - Cyber Command Center):**
  * Latar belakang: `dark:bg-[#08090D]`.
  * Kad: `dark:bg-[#0E1118]/90 dark:border-white/[0.08] backdrop-blur-md`.
  * Tipografi: Putih `dark:text-white` dan label `dark:text-white/40`.
* **Warna Status Berkanun:**
  * Hijau Emerald (`#10B981`): Sihat / Optimal / Berjaya.
  * Amber / Jingga (`#F59E0B`): Amaran / Sederhana / Dalam Tindakan.
  * Merah Mawar (`#EF4444` / `#F43F5E`): Kritikal / SLA Pecah / Ralat.
  * Cyan / Biru (`#06B6D4` / `#3B82F6`): Aliran Data & Rangkaian.
  * Ungu / Indigo (`#8B5CF6` / `#A78BFA`): AI & Enjin Pintar.

---

## 5. Pelan Pengesahan & Ujian (Verification Plan)

1. **Ujian Jenis & Kompilasi:**
   * Jalankan `npx tsc --noEmit` untuk mengesahkan tiada ralat TypeScript.
   * Jalankan `npm run build` untuk mengesahkan *bundle tree* bersih.
2. **Ujian Integrasi API:**
   * Uji pemanggilan selari `Promise.all` bagi `/api/system-telemetry` dan `/api/system-errors`.
   * Pastikan sesi luput (*expired session*) ditangani dengan mesej ralat yang mesra pengguna.
3. **Ujian Responsif Pelbagai Peranti:**
   * Skrin Desktop Lebar (1440px+): Grid 3-lajur sempurna.
   * Skrin Komputer Riba (1024px - 1280px): Grid adaptif tanpa limpahan teks.
   * Skrin Tablet & Mudah Alih (< 1024px): Keruntuhan lancar kepada susunan menegak yang kemas.
4. **Dokumentasi `DEV_GUIDELINE.md`:**
   * Kemas kini `DEV_GUIDELINE.md` selaras dengan kewajipan di bawah `AGENTS.md`.
