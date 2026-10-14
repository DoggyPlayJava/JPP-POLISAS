# Pelan Pelaksanaan Video Pengenalan JPP-POLISAS (Remotion Intro Video)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membina video pengenalan sinematik 38 saat (1,140 frame @ 30 FPS) untuk JPP-POLISAS menggunakan Remotion, berasaskan bahasa reka bentuk *05 Earthy Minimal / Swiss Editorial Luxury*, dengan 5 babak khusus berteraskan data dan modul sebenar kampus (PolyMaps, PolyMart, PolySuara, E-Aduan, EMS) serta kawalan props dinamik Zod di Remotion Studio.

**Architecture:** Video dibina di dalam folder `remotion/` dengan fail utama `remotion/JppIntroVideo.tsx` yang *self-contained*, dihubungkan dengan `remotion/Root.tsx` dan `remotion/schema.ts` untuk kawalan visual Remotion Studio. Animasi memanfaatkan fungsi bawaan `spring()` dan `interpolate()` dengan perkakasan GPU (`transform`, `opacity`).

**Tech Stack:** Remotion 4.x, React 19, TypeScript, Zod, Lucide Icons, Canvas-Confetti micro-triggers.

## Global Constraints

- **Palet Warna Terkunci:**
  - Primary: `#2E3A2F` (Deep Forest Moss Green)
  - Secondary: `#6B7F5B` (Sage Olive Green)
  - Tertiary: `#D9C9B2` (Warm Sand / Oatmeal Linen)
  - Accent: `#C96F4F` (Terracotta Clay Orange)
  - Background: `#F8F6EE` (Warm Milk Porcelain)
- **Slogan Rasmi:** `"Perpaduan Progresif Demi Mahasiswa"`
- **Resolusi & Format:** 1920 × 1080 (16:9 Landscape), 30 FPS, Durasi: 1,140 frame (38 saat).
- **Anti-Slop Guardrails:** Tiada gradien ungu AI, tiada font rawak; gunakan tipografi Swiss berwibawa, margin lapang, dan bayang atmosfera lembut.

---

### Task 1: Pasang Ketergantungan Remotion & Skrip CLI

**Files:**
- Modify: `package.json`
- Test: CLI command `npx remotion --version`

**Interfaces:**
- Consumes: Node.js, npm, package.json
- Produces: `remotion` dan `@remotion/cli` dipasang dalam `devDependencies`.

- [ ] **Step 1: Semak dan pasang pakej remotion**

Pasang pakej remotion:
```bash
npm install --save-dev remotion @remotion/cli
```

- [ ] **Step 2: Tambah skrip Remotion dalam package.json**

Tambah skrip berikut ke dalam `package.json`:
```json
"remotion:studio": "remotion studio remotion/index.ts",
"remotion:render": "remotion render remotion/index.ts JppIntroVideo out/jpp-intro.mp4"
```

- [ ] **Step 3: Uji bahawa CLI Remotion sedia digunakan**

Jalankan:
```bash
npx remotion --version
```
Jangkaan: Memaparkan versi Remotion 4.x.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install remotion and configure cli scripts"
```

---

### Task 2: Cipta Skema Zod Props Dinamik (`remotion/schema.ts`)

**Files:**
- Create: `remotion/schema.ts`
- Test: Unit test atau validasi skema TypeScript

**Interfaces:**
- Consumes: `zod`
- Produces: `JppIntroVideoSchema` dan jenis TypeScript `JppIntroVideoProps` untuk digunakan oleh `Root.tsx` dan `JppIntroVideo.tsx`.

- [ ] **Step 1: Tulis skema Zod lengkap dalam remotion/schema.ts**

Cipta fail `remotion/schema.ts`:
```typescript
import { z } from 'zod';

export const JppIntroVideoSchema = z.object({
  institutionName: z.string().default('POLITEKNIK SULTAN HAJI AHMAD SHAH'),
  councilName: z.string().default('JAWATANKUASA PERWAKILAN PELAJAR'),
  sessionLabel: z.string().default('SESI AKADEMIK 2026/2027'),
  sloganLine1: z.string().default('Perpaduan Progresif'),
  sloganLine2: z.string().default('Demi Mahasiswa.'),
  portalUrl: z.string().default('jpp.polisas.edu.my'),

  // Scene 1: PolyMaps & Jadual
  nextClass: z.object({
    code: z.string().default('DIT3013'),
    name: z.string().default('Pembangunan Aplikasi Web'),
    time: z.string().default('10:00 AM – 12:00 PM'),
    room: z.string().default('Makmal Komputer 3 (Aras 2)'),
    department: z.string().default('Jabatan Teknologi Maklumat & Komunikasi'),
  }).default({}),

  // Scene 2: PolyMart
  polyMart: z.object({
    featuredProduct: z.string().default('CHICKEN POPCORN CRISPY'),
    vendorName: z.string().default('QUADRA H ENTERPRISE'),
    price: z.string().default('RM 9.00'),
    productsCount: z.number().default(277),
    ordersCount: z.number().default(344),
  }).default({}),

  // Scene 3: PolySuara
  polySuara: z.object({
    pollTitle: z.string().default('Menu Sihat Kafeteria Siswa'),
    optionA: z.string().default('Set Ayam Percik Salad'),
    percentageA: z.number().default(68),
    optionB: z.string().default('Sandwic Telur Herba'),
    percentageB: z.number().default(32),
    totalVotes: z.number().default(412),
  }).default({}),

  // Scene 4: E-Aduan Kebajikan
  eAduan: z.object({
    ticketNo: z.string().default('KBJ-2026-0842'),
    category: z.string().default('Penyelenggaraan Dewan Kuliah Utama'),
    slaHours: z.string().default('< 48 Jam'),
    statusStep: z.number().default(3), // 1: Dihantar, 2: Disemak, 3: Tindakan, 4: Selesai
  }).default({}),

  // Scene 5: EMS (Event Management System)
  ems: z.object({
    eventTitle: z.string().default('Malam Anugerah Kecemerlangan Mahasiswa (MAKMP)'),
    studentName: z.string().default('AMIRUL HAKIM BIN AZMAN'),
    matricNo: z.string().default('04DAT24F1022'),
    certSerial: z.string().default('EMS-CERT-2026-9041'),
  }).default({}),
});

export type JppIntroVideoProps = z.infer<typeof JppIntroVideoSchema>;
```

- [ ] **Step 2: Semak jenis TypeScript dengan tsc**

Jalankan:
```bash
npx tsc --noEmit
```
Jangkaan: Lulus tanpa ralat.

- [ ] **Step 3: Commit**

```bash
git add remotion/schema.ts
git commit -m "feat(remotion): create zod schema for configurable video props"
```

---

### Task 3: Bina Fail Video Utama & Babak 0 – 1 (`remotion/JppIntroVideo.tsx`)

**Files:**
- Create: `remotion/JppIntroVideo.tsx`

**Interfaces:**
- Consumes: `JppIntroVideoProps` dari `remotion/schema.ts`
- Produces: Komponen utama `JppIntroVideo` merangkumi Babak 0 (Pembukaan Rasmi) dan Babak 1 (Jadual Kuliah & PolyMaps).

- [ ] **Step 1: Cipta struktur asas, token warna, dan babak 0 & 1**

Tulis kod `JppIntroVideo.tsx` dengan:
- Konstanta warna Earthy Minimal (`#2E3A2F`, `#6B7F5B`, `#D9C9B2`, `#C96F4F`, `#F8F6EE`).
- Grid latar belakang linen halus.
- Babak 0 (Frame 0 – 120): Kemunculan logo JPP POLISAS dengan interpolasi spring, teks slogan "Perpaduan Progresif Demi Mahasiswa".
- Babak 1 (Frame 120 – 315): Kad Jadual Kelas Seterusnya (`NextClassBentoCard` visual), transisi zum ke peta 2D kampus PolyMaps dengan laluan garisan putus-putus dan pin destinasi berdenyut.

- [ ] **Step 2: Uji kompilasi kod dengan tsc**

Jalankan:
```bash
npx tsc --noEmit
```
Jangkaan: Berjaya tanpa sebarang ralat sintaks.

- [ ] **Step 3: Commit**

```bash
git add remotion/JppIntroVideo.tsx
git commit -m "feat(remotion): implement scene 0 and scene 1 in JppIntroVideo"
```

---

### Task 4: Bina Babak 2 (PolyMart), Babak 3 (PolySuara) & Babak 4 (E-Aduan)

**Files:**
- Modify: `remotion/JppIntroVideo.tsx`

**Interfaces:**
- Consumes: `props.polyMart`, `props.polySuara`, `props.eAduan`
- Produces: Babak 2 (Frame 315 – 510), Babak 3 (Frame 510 – 705), Babak 4 (Frame 705 – 900).

- [ ] **Step 1: Lengkapkan Babak 2 — PolyMart**
  - Kad showcase produk siswa bergaya katalog moden (CHICKEN POPCORN, harga RM 9.00, vendor QUADRA H).
  - Kaunter statistik dinamik dengan efek spring (`270+ Produk`, `340+ Pesanan`).
  - Lencana rasmi "JPP Pay & Pesanan Terus".

- [ ] **Step 2: Lengkapkan Babak 3 — PolySuara**
  - Kad undian langsung komuniti siswa (Live Poll: 68% vs 32%).
  - Lencana mikro-reaksi meluncur keluar (Heart, Trophy, Sparkles).
  - Tajuk seksyen kemas: "Ruang Ekspresi & Suara Siswa".

- [ ] **Step 3: Lengkapkan Babak 4 — E-Aduan & Kebajikan**
  - Stepper interaktif 4 peringkat: `1. Dihantar` ➔ `2. Disemak JPP` ➔ `3. Tindakan Unit Fasiliti` ➔ `4. Selesai`.
  - Kad tiket aduan `#KBJ-2026-0842` dengan tag respon pantas SLA `< 48 Jam`.

- [ ] **Step 4: Uji kompilasi tsc**

Jalankan:
```bash
npx tsc --noEmit
```
Jangkaan: Lulus tanpa ralat.

- [ ] **Step 5: Commit**

```bash
git add remotion/JppIntroVideo.tsx
git commit -m "feat(remotion): implement scenes 2, 3, and 4 in JppIntroVideo"
```

---

### Task 5: Bina Babak 5 (EMS Kehadiran & Sijil Digital) & Babak 6 (Grand Outro)

**Files:**
- Modify: `remotion/JppIntroVideo.tsx`

**Interfaces:**
- Consumes: `props.ems`, `props.portalUrl`
- Produces: Babak 5 (Frame 900 – 1095) dan Babak 6 (Frame 1095 – 1200).

- [ ] **Step 1: Lengkapkan Babak 5 — EMS (Event Management System)**
  - Pas VIP Acara Mahasiswa dengan Kod QR bertekstur.
  - Garis imbasan laser terracotta meluncur turun naik.
  - Animasi tanda sah (*Checkmark*) muncul dengan letupan mikro-partikel konfeti bersahaja.
  - Sijil Digital rasmi (*e-Certificate*) POLISAS terbit serta-merta dengan nama mahasiswa: `AMIRUL HAKIM BIN AZMAN`, No Matrik: `04DAT24F1022`, Siri: `EMS-CERT-2026-9041`.

- [ ] **Step 2: Lengkapkan Babak 6 — Grand Outro**
  - Semua elemen kad berpusat dan melipat anggun kembali ke lambang emblem rasmi JPP POLISAS.
  - Teks penutup: "JPP POLISAS" — "Perpaduan Progresif Demi Mahasiswa" — `jpp.polisas.edu.my`.

- [ ] **Step 3: Uji kompilasi tsc**

Jalankan:
```bash
npx tsc --noEmit
```
Jangkaan: Lulus tanpa ralat.

- [ ] **Step 4: Commit**

```bash
git add remotion/JppIntroVideo.tsx
git commit -m "feat(remotion): complete scene 5 (EMS) and grand outro in JppIntroVideo"
```

---

### Task 6: Sediakan Entry Point & Pendaftaran Komposisi (`Root.tsx` & `index.ts`)

**Files:**
- Create: `remotion/Root.tsx`
- Create: `remotion/index.ts`

**Interfaces:**
- Consumes: `JppIntroVideo`, `JppIntroVideoSchema`, `remotion`
- Produces: Komposisi rasmi `<Composition id="JppIntroVideo">` boleh dikesan oleh Remotion CLI & Studio.

- [ ] **Step 1: Cipta remotion/Root.tsx**

```tsx
import React from 'react';
import { Composition } from 'remotion';
import { JppIntroVideo } from './JppIntroVideo';
import { JppIntroVideoSchema } from './schema';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="JppIntroVideo"
      component={JppIntroVideo}
      durationInFrames={1140}
      fps={30}
      width={1920}
      height={1080}
      schema={JppIntroVideoSchema}
      defaultProps={{
        institutionName: 'POLITEKNIK SULTAN HAJI AHMAD SHAH',
        councilName: 'JAWATANKUASA PERWAKILAN PELAJAR',
        sessionLabel: 'SESI AKADEMIK 2026/2027',
        sloganLine1: 'Perpaduan Progresif',
        sloganLine2: 'Demi Mahasiswa.',
        portalUrl: 'jpp.polisas.edu.my',
      }}
    />
  );
};
```

- [ ] **Step 2: Cipta remotion/index.ts**

```typescript
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

registerRoot(RemotionRoot);
```

- [ ] **Step 3: Uji pendaftaran komposisi melalui Remotion CLI**

Jalankan:
```bash
npx remotion compositions remotion/index.ts
```
Jangkaan: Menyenaraikan `JppIntroVideo (1920x1080, 1140 frames, 30 fps)`.

- [ ] **Step 4: Commit**

```bash
git add remotion/Root.tsx remotion/index.ts
git commit -m "feat(remotion): register root composition and index entry point"
```

---

### Task 7: Ujian Render Bingkai & Pengesahan Kualiti Akhir

**Files:**
- Test: Render sampel frame ke format PNG untuk audit visual.
- Verify: `npx remotion still remotion/index.ts JppIntroVideo --frame 60 out/frame-intro.png`
- Verify: `npx remotion still remotion/index.ts JppIntroVideo --frame 200 out/frame-polymaps.png`
- Verify: `npx remotion still remotion/index.ts JppIntroVideo --frame 400 out/frame-polymart.png`
- Verify: `npx remotion still remotion/index.ts JppIntroVideo --frame 600 out/frame-polysuara.png`
- Verify: `npx remotion still remotion/index.ts JppIntroVideo --frame 800 out/frame-eaduan.png`
- Verify: `npx remotion still remotion/index.ts JppIntroVideo --frame 1000 out/frame-ems.png`

- [ ] **Step 1: Jalankan render still bagi setiap babak utama**

Jalankan arahan render sampel frame.

- [ ] **Step 2: Semak integriti visual (Earthy Minimal colors, no clipping, correct Swiss typography)**

Pastikan setiap frame mematuhi palet `#2E3A2F`, `#6B7F5B`, `#D9C9B2`, `#C96F4F`, `#F8F6EE`.

- [ ] **Step 3: Kemas kini DEV_GUIDELINE.md**

Kemas kini fail panduan dokumentasi projek seperti yang diwajibkan oleh peraturan `AGENTS.md`.

- [ ] **Step 4: Commit Akhir**

```bash
git add DEV_GUIDELINE.md
git commit -m "docs: update DEV_GUIDELINE.md with Remotion video module details"
```
