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

| Prefix | Exco / Modul | Status |
|---|---|---|
| `/jpp/*` | JPP HQ (Induk) | ✅ Aktif |
| `/akademik/*` | e-Akademik | ✅ Aktif |
| `/kebajikan/*` | e-Kebajikan | ✅ Aktif |
| `/keusahawanan/*` | e-Keusahawanan | ✅ Aktif |
| `/klk/*` | e-KLK (Kediaman Luar Kampus) | ✅ Aktif |
| `/polymart/*` | PolyMart | ✅ Aktif |
| `/polyrider/*` | PolyRider | ✅ Aktif |
| `/karnival/*` | Sistem Karnival JPP | ✅ Aktif |
| `/sukan/*` | e-Sukan | 🔜 Akan Datang |

**Contoh route exco / modul tambahan:**
```
/jpp                    (Dashboard JPP HQ)
/semakan-laporan        (Dashboard Semakan Laporan KPP)
/akademik/pencapaian    (Akademik: Pencapaian pelajar)
/akademik/cgpa          (Akademik: Muat naik rekod HPNM)
/klk/form               (Borang Kediaman Luar Kampus)
/keusahawanan/dashboard (Dashboard Exco Keusahawanan)
/polyrider              (Laman Utama PolyRider)
/polyrider-admin        (Pusat Kawalan PolyRider)
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
