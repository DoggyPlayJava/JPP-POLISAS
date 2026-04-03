# JPP-POLISAS Developer Guidelines / Panduan Pembangunan

Languages / Bahasa:
- [English](#english-developer-guidelines)
- [Bahasa Melayu](#panduan-pembangunan-bahasa-melayu)

---

## English Developer Guidelines

### 1. Technology Stack
- **Frontend / Core:** React (v19+), Vite, TypeScript.
- **Styling:** Tailwind CSS, Shadcn UI (Radix UI), Framer Motion for animations.
- **Backend / Database:** Supabase (PostgreSQL), with extensive use of Row-Level Security (RLS) policies and RPC functions.
- **Documentation / PDF:** `@react-pdf/renderer` for generating Takwim reports.
- **Routing:** React Router v7.

### 2. Project Architecture & Setup
- Start the development server using `npm run dev`. Wait for Vite to build the project.
- Global CSS is primarily inside `src/index.css`. Tailwind configs are in `tailwind.config.cjs`. Check CSS variable definition via `npm run lint`.
- Layout components wrap individual pages found under `src/pages/`.
- Auth Context (`AuthContext.tsx`) manages multi-club memberships and determines the `effectiveRole` of a user dynamically to prevent logic bypasses.

### 3. Database Security & Structure (Supabase)
- We rely heavily on Supabase RLS. Do not use Global Server-Side bypasses unless absolutely necessary.
- **Golden Rule for RLS:** Always write policies based on the junction tables (e.g. `student_club_memberships`) rather than assuming static roles inside `profiles`. A student might be a 'Presiden' in one club and a normal 'Ahli' in another.
- Make sure queries in RPC functions explicitly pass `project_id` or `club_id` properly to isolate club data.

### 4. Code Standards & Contribution
- Ensure all IDs and Matric Cards are strictly stored and validated as **UPPERCASE**. This is enforced frontend-side to maintain data standardization.
- **Imports:** Rely on standard absolute imports where configured, or relative imports standard to Vite. 
- Use Shadcn components for UI elements to maintain premium and consistent aesthetics. Avoid inline custom CSS colors if a CSS Variable or standard Tailwind class exists.

### 5. Deployment
- The app uses standard Vite compilation (`npm run build`).
- Deployable static files are output to the `/dist` directory.
- Refer to `Panduan_Deploy_Proxmox.md` for specific instructions on moving the artifact to our on-premise Proxmox virtualization platform.

---

## Panduan Pembangunan (Bahasa Melayu)

### 1. Teknologi Digunakan (Tech Stack)
- **Frontend / Asas Utama:** React (v19+), Vite, TypeScript.
- **Struktur Antara Muka (Styling):** Tailwind CSS, Shadcn UI (Radix UI) dan Framer Motion (untuk animasi).
- **Backend / Pangkalan Data:** Supabase (PostgreSQL), sangat bergantung kepada pemakaian *Row-Level Security* (RLS) serta fungsi RPC (Remote Procedure Call).
- **Laporan PDF:** Menggunakan `@react-pdf/renderer` untuk menjana dan mencetak laporan Takwim.
- **Penghalaan (Routing):** React Router v7.

### 2. Senibina & Konfigurasi Projek
- Jalankan *dev server* dengan menggunakan `npm run dev` dan tunggu sehingga *build* selesai.
- CSS utama ditetapkan pada `src/index.css` manakala tetapan Tailwind berada pada `tailwind.config.cjs`. Lakukan semakan (*lint*) menggunakan arahan `npm run lint`.
- `AuthContext.tsx` bertanggungjawab mengurus pelbagai keahlian kelab pengguna di mana *effectiveRole* ditentukan secara dinamik. Pengurusan logik ini penting bagi mengelakkan pertindanan akses pengguna antara beberapa kelab berbeza.

### 3. Keselamatan Pangkalan Data (Supabase)
- Sistem keselamatan bergantung penuh pada Polisi RLS (*Row-Level Security*). Elakkan dari melangkau sistem peranan melainkan sangat-sangat perlu (seperti pada lapisan Service Role Admin).
- **Peraturan Emas RLS:** Tulis dasar polisi berdasarkan jadual pengantara (*junction table*) seperti `student_club_memberships` , bukan sekadar merujuk jadual `profiles`. Ini kerana seseorang pelajar mungkin memegang jawatan 'Presiden' di satu kelab, tetapi hanya sebagai 'Ahli' biasa di kelab yang lain.
- Pastikan carian data (*queries*) di fungsi RPC mengasingkan data menggunakan parameter ID kelompok seperti `club_id`.

### 4. Piawaian Kod & Penyumbangan
- Sentiasa pastikan input bagi setiap ID atau Nombor Matrik diubah dan disimpan dalam format **HURUF BESAR** (UPPERCASE) secara automatik sebelum masuk ke *database* untuk mengekalkan kebersihan data.
- **Komponen UI:** Guna komponen terbina Shadcn UI (`radix-ui`) untuk mengekalkan rekaan visual premium yang seragam. Elakkan *inline CSS* jika *CSS Variables* atau fungsi *utility* Tailwind sudah wujud.

### 5. Pelancaran (Deployment)
- Aplikasi akan dijalankan seperti pemprosesan statik menggunakan fungsi Vite (`npm run build`).
- Pakej yang siap dibangunkan akan tersimpan secara automatik pada folder `/dist`.
- Untuk tugasan pementasan dan penghasilan (Production/Staging) di *server* maya lokal (Proxmox), sila rujuk dokumen khusus pada fail `Panduan_Deploy_Proxmox.md`.
