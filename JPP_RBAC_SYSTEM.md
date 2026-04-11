# JPP-POLISAS — Sistem RBAC (Role-Based Access Control)
> **Dokumen ini adalah rujukan utama untuk setiap agen/pembangun yang bekerja pada sistem JPP.**
> Kemas kini dokumen ini setiap kali perubahan besar dibuat pada sistem peranan.

---

## 1. Hierarki Peranan (Role Hierarchy)

```
SUPER_ADMIN_JPP   ─── HEP / Developer sahaja. Akses penuh ke semua sistem.
       │
       ├── JPP (jpp_unit = 'KPP')   ─── Exco KPP: Pemantauan rentas-kelab penuh.
       │         └── MT (jpp_mt_assignments.unit = 'KPP')   ─── MT yang oversee KPP: sama seperti Exco KPP.
       │
       └── JPP (jpp_unit = lain)    ─── JPP biasa: Pangkalan Data Pelajar + Takwim sahaja.
                 └── MT (jpp_mt_assignments.unit ≠ 'KPP')  ─── MT lain: sama seperti JPP biasa.

CLUB_ADVISOR      ─── Penasihat Kelab (per-kelab)
CLUB_PRESIDENT    ─── Presiden Kelab (per-kelab)
CLUB_MT           ─── Ahli Jawatankuasa Kelab (per-kelab)
CLUB_MEMBER       ─── Ahli Biasa (per-kelab)
```

### ⚠️ Peraturan Kritikal

1. **`SUPER_ADMIN_JPP` ≠ `JPP`**. JPP adalah ahli biasa JPP. SUPER_ADMIN_JPP adalah HEP/developer sahaja.
2. **MT yang oversee exco tertentu sahaja mendapat akses exco tersebut.** MT lain = JPP biasa.
3. **KPP Exco** mendapat `isAdvisor = true` secara global (boleh switch ke mana-mana kelab).
4. **Jangan campurkan** logik peranan global (`profiles.role`) dengan peranan per-kelab (`student_club_memberships.role`).

---

## 2. Struktur Data (Database)

### `profiles` table (global role)
```
id              uuid (FK → auth.users)
role            'SUPER_ADMIN_JPP' | 'JPP' | 'CLUB_PRESIDENT' | 'CLUB_MT' | 'CLUB_MEMBER' | 'CLUB_ADVISOR'
jpp_position    'YDP' | 'TIMBALAN_YDP' | 'NAIB_YDP' | 'SETIAUSAHA_KERJA' | 'SETIAUSAHA_KEHORMAT' | 'BENDAHARI'
                | 'KETUA_EXCO' | 'TIMBALAN_EXCO' | 'EXCO_BIASA'   (null untuk non-JPP)
jpp_unit        'KPP' | 'KEUSAHAWANAN' | 'KEBAJIKAN' | 'SUKAN' | ... (null untuk bukan exco unit)
```

### `student_club_memberships` table (per-kelab role)
```
user_id         uuid (FK → profiles)
club_id         uuid (FK → clubs)
role            'CLUB_PRESIDENT' | 'CLUB_ADVISOR' | 'CLUB_MT' | 'CLUB_MEMBER'
account_status  'PENDING' | 'APPROVED' | 'REJECTED'
is_primary      boolean
```

### `jpp_mt_assignments` table (MT → unit oversee mapping)
```
id              uuid
mt_user_id      uuid (FK → profiles) — mesti ada jpp_position dalam JPP_MT_POSITIONS
unit            JppUnit ('KPP', 'KEUSAHAWANAN', dll.)
assigned_by     uuid | null
assigned_at     timestamptz
```

---

## 3. AuthContext RBAC Engine (`src/contexts/AuthContext.tsx`)

```typescript
// ── PERANAN GLOBAL ────────────────────────────────────────────────────
const profileRole = profile?.role ?? '';
const isSuperAdmin = profileRole === 'SUPER_ADMIN_JPP' || profileRole === 'ADMIN';
const isJppMember  = profileRole === 'JPP';  // JPP biasa — BUKAN super admin

// ── EFFECTIVE ROLE (bergantung kepada kelab yang dipilih) ─────────────
const effectiveRole = (() => {
  if (isSuperAdmin) return 'SUPER_ADMIN_JPP';
  if (isJppMember)  return 'JPP';                    // ← JPP kekal sebagai JPP
  // ... cari dari junction table berdasarkan selectedClubId
})();

// ── ROLE FLAGS ────────────────────────────────────────────────────────
const isKppExco   = profileRole === 'JPP' && profile?.jpp_unit === 'KPP';
const isAdvisor   = effectiveRole === 'CLUB_ADVISOR' || isSuperAdmin || isKppExco;
const isPresident = effectiveRole === 'CLUB_PRESIDENT' || isAdvisor;
const isMT        = effectiveRole === 'CLUB_MT' || isPresident;
const isMember    = effectiveRole === 'CLUB_MEMBER' || isMT;
```

### Nilai yang diexpose dalam context:
| Flag | Penerangan |
|---|---|
| `isSuperAdmin` | Hanya SUPER_ADMIN_JPP/ADMIN |
| `isAdvisor` | Advisor kelab aktif, ATAU KPP exco global |
| `isPresident` | Presiden kelab aktif, atau lebih tinggi |
| `isMT` | MT kelab aktif, atau lebih tinggi |
| `isMember` | Mana-mana ahli (paling rendah) |
| `effectiveRole` | String role untuk kelab yang sedang dipilih |
| `selectedClubId` | Kelab yang sedang dilihat |
| `setSelectedClubId(id)` | Tukar kelab aktif |

---

## 4. JppAdminPage — Tab Access Matrix (`src/pages/JppAdminPage.tsx`)

| Pengguna | Tab yang boleh diakses |
|---|---|
| `SUPER_ADMIN_JPP` | Dashboard MT, Analisis MT, Dashboard KPP, Semua Aktiviti, Semua Laporan, Keahlian, Nexus Hub, Pelajar, Ahli JPP, Tetapan Sistem, Audit Log, Takwim |
| `JPP` + `jpp_unit=KPP` | Dashboard KPP, Semua Aktiviti, Semua Laporan, Keahlian, Senarai Kelab, Log Audit |
| `JPP` MT + `jpp_mt_assignments.unit=KPP` | (Sama seperti KPP Exco) |
| `JPP` biasa / MT unit lain | Pangkalan Data Pelajar (RO), Takwim Global |

### Logic dalam kod:
```typescript
const isKppExco = profile?.jpp_unit === 'KPP';
const [isMTKpp, setIsMTKpp] = useState(false);
// Fetch dari jpp_mt_assignments.unit = 'KPP' → setIsMTKpp(true/false)

const hasKppAccess = isKppExco || isMTKpp;

if (isSuperAdmin) { /* full tabs */ }
else if (hasKppAccess) { /* kpp tabs */ }
else { /* limited tabs */ }
```

---

## 5. Cross-Club Switching (Tukar Antara Kelab)

KPP Exco (`jpp_unit === 'KPP'`) dan SUPER_ADMIN_JPP boleh switch ke mana-mana kelab.

**Cara kerja:**
1. `setSelectedClubId(clubId)` dalam AuthContext (disimpan dalam localStorage)
2. `effectiveRole` dikira semula berdasarkan `selectedClubId`
3. Untuk KPP: `isAdvisor = true` global walaupun tiada membership dalam `student_club_memberships`
4. UI club switcher ada dalam `Sidebar.tsx` (dropdown)

**Untuk exco lain masa depan:**
- Tambah `jpp_unit === 'UNIT_NAME'` check dalam AuthContext jika unit tersebut perlukan cross-club access
- ATAU gunakan `isAdvisor` check dalam komponen berkenaan

---

## 6. Cara Extend ke Exco Baharu

Apabila membuat modul exco baharu (cth: e-Kebajikan, e-Sukan), ikut pola ini:

### Step 1: Tambah route dalam `App.tsx`
```typescript
// Contoh
<Route path="/exco-kebajikan/*" element={<KebajikanPage />} />
```

### Step 2: Guard akses dalam halaman exco
```typescript
// Dalam halaman exco
const { isAdvisor, isPresident, isMT, isMember, profile } = useAuth();

// Cek unit untuk akses penuh
const isKebajikanExco = profile?.jpp_unit === 'KEBAJIKAN';
const isMTKebajikan = /* fetch dari jpp_mt_assignments.unit = 'KEBAJIKAN' */;

// Render berdasarkan akses
if (!isMember && !isKebajikanExco && !isSuperAdmin) return <AccessDenied />;
```

### Step 3: Tambah dalam JppAdminPage tab list
Tambah tab baharu dalam `hasKppAccess` block atau buat block berasingan untuk unit tersebut.

### Step 4: Sidebar navigation
Tambah NavLink dalam `Sidebar.tsx` atau dalam `EkppSidebarContent` yang berkenaan.

### Step 5: Detect exco aktif dalam Sidebar
```typescript
// Dalam detectActiveExco() fungsi dalam Sidebar.tsx
if (pathname.startsWith('/exco-kebajikan')) return 'kebajikan';
```

---

## 7. Fail Penting & Lokasi

| Fail | Fungsi |
|---|---|
| `src/contexts/AuthContext.tsx` | **Pusat RBAC** — semua role computation ada di sini |
| `src/types/index.ts` | Type definitions, ROLE_LABELS, JPP_MT_POSITIONS, JPP_EXCO_POSITIONS |
| `src/lib/supabase.ts` | Profile interface, supabase client |
| `src/pages/JppAdminPage.tsx` | Global JPP Dashboard (route: `/jpp-admin`) |
| `src/components/layout/Sidebar.tsx` | Sidebar utama dengan club switcher |
| `src/pages/PortalPage.tsx` | Halaman portal — entry point ke semua modul |

---

## 8. Peraturan Yang Tidak Boleh Dilanggar

```
✅ BOLEH:
  - JPP user (role='JPP') akses Global JPP Dashboard
  - KPP exco switch ke mana-mana kelab untuk pemantauan
  - MT yang oversee KPP mendapat akses KPP sama seperti exco KPP

❌ JANGAN:
  - Menambah 'JPP' ke dalam isSuperAdmin check (bug yang telah diperbaiki)
  - Menganggap semua MT mendapat akses penuh semua exco
  - Menggunakan profiles.role untuk club-specific access — guna effectiveRole / memberships
  - Hardcode club ID dalam logik RBAC — guna selectedClubId dari context
```

---

## 9. Changelog RBAC

| Tarikh | Perubahan |
|---|---|
| 2026-04-10 | **BUG FIX KRITIKAL**: Keluarkan 'JPP' dari isSuperAdmin. JPP user tidak lagi mendapat SUPER_ADMIN_JPP privileges secara silap. |
| 2026-04-10 | Tambah isKppExco, isAdvisor global untuk KPP cross-club access |
| 2026-04-10 | Tambah isMTKpp async check dari jpp_mt_assignments |
| 2026-04-10 | KPP tab list dikembangkan: 6 tab pemantauan penuh |
| 2026-04-10 | Club switcher dalam Sidebar untuk KPP & SuperAdmin |
