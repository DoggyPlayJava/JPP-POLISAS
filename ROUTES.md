# JPP Digital Portal — Dokumentasi Konvensyen Route

> **Dibaca oleh pembangun:** Dokumen ini menjelaskan konvensyen penamaan route dalam projek ini.
> Ikut konvensyen ini dengan ketat apabila menambah exco atau modul baharu.

---

## Konvensyen Utama

### Route TANPA Prefix → Milik `e-KPP`

Semua route berikut adalah milik **modul e-KPP** (Exco Kelab, Persatuan & Perpaduan).
Route-route ini **TIDAK** akan diubah ke prefix kerana ia adalah konvensyen yang ditetapkan
sejak pembangunan asal sistem ini.

| Route | Deskripsi |
|---|---|
| `/portal` | Portal Hub — halaman pilih exco |
| `/dashboard` | Dashboard utama e-KPP |
| `/kelab` | Senarai kelab & persatuan |
| `/sertai-kelab` | Urus keahlian kelab |
| `/aktiviti` | Pengurusan aktiviti |
| `/ahli` | Senarai ahli jawatankuasa |
| `/laporan` | Laporan kelab |
| `/urus-kelab` | Pengurusan profil kelab (Presiden) |
| `/semakan-laporan` | Semakan laporan (Admin) |
| `/jpp-admin` | Panel admin JPP |
| `/leaderboard` | Papan kedudukan |
| `/logs` | Log penasihat |
| `/karnival` | Pengundian karnival |
| `/nexus` | Nexus AI Hub |
| `/carian` | Carian global |
| `/tetapan` | Tetapan akaun |
| `/kelab/:id` | Halaman detail kelab |

---

### Route DENGAN Prefix → Milik Exco Baharu

Setiap exco baharu yang ditambah **MESTI** menggunakan prefix dengan ID exco mereka.

**Format:** `/<exco-id>/<nama-route>`

| Prefix | Exco | Status |
|---|---|---|
| `/kebajikan/*` | e-Kebajikan | 🔜 Akan Datang |
| `/keusahawanan/*` | e-Keusahawanan | 🔜 Akan Datang |
| `/sukan/*` | e-Sukan | 🔜 Akan Datang |

**Contoh route baharu:**
```
/kebajikan/dashboard
/kebajikan/program
/kebajikan/permohonan
/keusahawanan/dashboard
/keusahawanan/geran
```

---

## Cara Tambah Exco Baharu

1. **Tambah entry dalam `src/config/excoModules.ts`**
   ```ts
   {
     id: 'kebajikan',          // ID mesti sama dengan prefix route
     name: 'e-Kebajikan',
     fullName: 'Exco Kebajikan Pelajar',
     tagline: 'Khidmat · Bantuan · Kesejahteraan',
     description: '...',
     defaultColor: '#0D7377',
     icon: '❤️‍🩹',
     basePath: '/kebajikan/dashboard',
     isActive: true,           // Tukar kepada true bila modul siap
   }
   ```

2. **Tambah route dalam `src/App.tsx`**
   ```tsx
   {/* ── e-Kebajikan (prefix: /kebajikan/) ── */}
   <Route path="/kebajikan/dashboard" element={<KebajikanDashboardPage />} />
   <Route path="/kebajikan/program" element={<KebajikanProgramPage />} />
   ```

3. **Kemaskini dokumen ini** — tambah prefix baharu dalam jadual di atas.

---

## Nota Penting

- `/portal` adalah laluan masuk semua pengguna selepas log masuk (kecuali Admin JPP yang terus ke `/jpp-admin`)
- `SUPER_ADMIN_JPP` dan `JPP` roles akan bypass portal dan terus ke `/jpp-admin`
- Untuk route yang memerlukan prefix, asingkan fail dalam folder page: `src/pages/kebajikan/`, `src/pages/keusahawanan/`, dsb.

---

*Dikemaskini oleh: Pembangun JPP Digital Portal*
*Tarikh: April 2026*
