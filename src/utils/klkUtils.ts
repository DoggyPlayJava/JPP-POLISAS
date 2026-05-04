/**
 * Kira tahun akademik KLK berdasarkan tarikh semasa.
 * KLK tidak bergantung pada global admin setting — tahun dikira automatik.
 *
 * Logik: Julai–Disember = tahun baru bermula, Januari–Jun = masih tahun yang sama
 * Contoh: Jun 2025 → "2024/2025", Ogos 2025 → "2025/2026"
 */
export function getKlkAcademicYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 6 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

/**
 * Senarai tahun akademik untuk dropdown historik KLK.
 * Bermula dari 2023/2024 hingga tahun semasa.
 */
export function getKlkYearOptions(): string[] {
  const currentYear = getKlkAcademicYear();
  const [startStr] = currentYear.split('/');
  const startYear = parseInt(startStr);
  const years: string[] = [];
  for (let y = 2023; y <= startYear; y++) {
    years.push(`${y}/${y + 1}`);
  }
  return years.reverse(); // Terbaru dahulu
}
