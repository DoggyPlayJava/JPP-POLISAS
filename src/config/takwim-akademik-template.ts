// ============================================================
// Kalendar Akademik 2026/2027 — Institusi B (Auto-Fill Template)
// Sumber: Kementerian Pendidikan Tinggi (KPT)
// Program Diploma dan Sijil Politeknik dan Kolej Komuniti
// ============================================================

export interface KalendarAkademikEntry {
  sesi: 'I' | 'II';
  tarikhMula: string;       // YYYY-MM-DD (Institusi B)
  tarikhTamat: string;      // YYYY-MM-DD
  bilMinggu: number | null;  // null = cuti/non-week
  aktiviti: string;
  catatan?: string;          // Cuti umum, perayaan, dll
  isCuti?: boolean;          // Cuti perayaan/umum
}

// ── SESI I: 2026/2027 ────────────────────────────────────────
const SESI_I: KalendarAkademikEntry[] = [
  {
    sesi: 'I',
    tarikhMula: '2026-06-22',
    tarikhTamat: '2026-06-28',
    bilMinggu: 1,
    aktiviti: 'Pendaftaran Pelajar Baharu / Aktiviti Suai Kenal',
  },
  {
    sesi: 'I',
    tarikhMula: '2026-06-29',
    tarikhTamat: '2026-08-30',
    bilMinggu: 9,
    aktiviti: 'Kuliah',
    catatan: 'Maulidur Rasul: 25/08/2026 (Selasa)',
  },
  {
    sesi: 'I',
    tarikhMula: '2026-08-31',
    tarikhTamat: '2026-09-06',
    bilMinggu: null,
    aktiviti: 'Cuti Pertengahan Semester',
    catatan: 'Hari Kebangsaan: 31/08/2026 (Isnin)',
    isCuti: true,
  },
  {
    sesi: 'I',
    tarikhMula: '2026-09-07',
    tarikhTamat: '2026-10-11',
    bilMinggu: 5,
    aktiviti: 'Kuliah',
    catatan: 'Hari Malaysia: 16/09/2026 (Rabu)',
  },
  {
    sesi: 'I',
    tarikhMula: '2026-10-12',
    tarikhTamat: '2026-10-18',
    bilMinggu: null,
    aktiviti: 'Minggu Ulang Kaji',
  },
  {
    sesi: 'I',
    tarikhMula: '2026-10-19',
    tarikhTamat: '2026-11-08',
    bilMinggu: 3,
    aktiviti: 'Peperiksaan Akhir Semester (kecuali STE)',
    catatan: 'Hari Deepavali — kecuali Negeri Sarawak: 08/11/2026 (Ahad)',
  },
  {
    sesi: 'I',
    tarikhMula: '2026-11-09',
    tarikhTamat: '2026-11-29',
    bilMinggu: 3,
    aktiviti: 'Cuti Akhir Semester',
    isCuti: true,
  },
];

// ── SESI II: 2026/2027 ───────────────────────────────────────
const SESI_II: KalendarAkademikEntry[] = [
  {
    sesi: 'II',
    tarikhMula: '2026-11-22',
    tarikhTamat: '2026-11-28',
    bilMinggu: null,
    aktiviti: 'Pendaftaran Pelajar Baharu / Aktiviti Suai Kenal',
  },
  {
    sesi: 'II',
    tarikhMula: '2026-11-29',
    tarikhTamat: '2027-02-07',
    bilMinggu: 10,
    aktiviti: 'Kuliah',
    catatan: 'Hari Krismas: 25/12/2026 (Jumaat) · Tahun Baru: 01/01/2027 · Tahun Baru Cina: 06&07/02/2027 (Sabtu & Ahad)',
  },
  {
    sesi: 'II',
    tarikhMula: '2027-02-07',
    tarikhTamat: '2027-02-14',
    bilMinggu: null,
    aktiviti: 'Cuti Pertengahan Semester',
    isCuti: true,
  },
  {
    sesi: 'II',
    tarikhMula: '2027-02-14',
    tarikhTamat: '2027-03-07',
    bilMinggu: null,
    aktiviti: 'Kuliah',
  },
  {
    sesi: 'II',
    tarikhMula: '2027-03-07',
    tarikhTamat: '2027-03-14',
    bilMinggu: 1,
    aktiviti: 'Cuti Perayaan',
    catatan: 'Hari Raya Aidilfitri: 10 & 11/03/2027 (Rabu & Khamis)',
    isCuti: true,
  },
  {
    sesi: 'II',
    tarikhMula: '2027-03-14',
    tarikhTamat: '2027-03-21',
    bilMinggu: null,
    aktiviti: 'Kuliah',
  },
  {
    sesi: 'II',
    tarikhMula: '2027-03-21',
    tarikhTamat: '2027-03-27',
    bilMinggu: null,
    aktiviti: 'Minggu Ulang Kaji',
  },
  {
    sesi: 'II',
    tarikhMula: '2027-03-27',
    tarikhTamat: '2027-04-18',
    bilMinggu: 3,
    aktiviti: 'Peperiksaan Akhir Semester (kecuali STE)',
  },
  {
    sesi: 'II',
    tarikhMula: '2027-04-18',
    tarikhTamat: '2027-04-18',
    bilMinggu: null,
    aktiviti: 'Cuti Akhir Semester / Semester Pendek',
    catatan: 'Hari Pekerja: 01/05/2027 · Hari Raya Aidiadha: 17/05/2027 · Hari Vesak: 20/05/2027 · Awal Muharram: 06/06/2027 · Hari Keputeraan YDP Agong: 07/06/2027',
    isCuti: true,
  },
  {
    sesi: 'II',
    tarikhMula: '2027-04-19',
    tarikhTamat: '2027-06-20',
    bilMinggu: 9,
    aktiviti: 'Pelaksanaan Semester Pendek (bergantung kepada institusi)',
    catatan: 'Kuliah Semester Pendek bermula pada 19 April 2027',
  },
];

// ── Sesi I 2027/2028 (pendaftaran sahaja) ────────────────────
const SESI_I_2027_2028: KalendarAkademikEntry[] = [
  {
    sesi: 'I',
    tarikhMula: '2027-06-14',
    tarikhTamat: '2027-06-20',
    bilMinggu: null,
    aktiviti: 'Pendaftaran Pelajar Baharu / Aktiviti Suai Kenal',
  },
];

// ── Combined export ──────────────────────────────────────────
export const KALENDAR_AKADEMIK_2026_2027 = [...SESI_I, ...SESI_II];
export const KALENDAR_AKADEMIK_PREVIEW = [...SESI_I_2027_2028];

/**
 * Converts template data to takwim_pusat insert payload.
 * Used by TakwimPusatBulkForm for auto-fill.
 */
export function templateToInsertPayload(
  entries: KalendarAkademikEntry[],
  userId: string,
  sesi: string = '2026/2027'
) {
  return entries.map(e => ({
    jenis: e.isCuti ? 'CUTI_UMUM' : 'AKADEMIK' as const,
    tajuk: e.aktiviti,
    catatan: e.catatan || null,
    tarikh_mula: e.tarikhMula,
    tarikh_tamat: e.tarikhTamat,
    bil_minggu: e.bilMinggu,
    aktiviti: e.aktiviti,
    sesi,
    exco_module: 'AKADEMIK',
    created_by: userId,
  }));
}
