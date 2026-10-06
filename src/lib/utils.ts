import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Fungsi untuk Tailwind classes (sedia ada)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 🔥 Fungsi Magik Warna (Sekarang dah duduk luar)
export function getContrastColor(hexcolor: string) {
  if (!hexcolor) return '#ffffff';

  // Buang tanda # jika ada
  const hex = hexcolor.replace("#", "");

  // Tukar hex ke RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Kira YIQ (Luminance)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

  // Jika > 128 maksudnya warna cerah (hitam), jika tidak (putih)
  return (yiq >= 128) ? '#000000' : '#ffffff';
}

/**
 * Kira teks kontras terbaik atas latar warna hex.
 * Guna formula WCAG Rec.601 perceived luminance.
 * Warna terang → teks hitam (#111111)
 * Warna gelap  → teks putih (#ffffff)
 */
export function getContrastText(hex: string): string {
  if (!hex || hex === 'transparent') return '#ffffff';
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substr(0, 2), 16);
  const g = parseInt(clean.substr(2, 2), 16);
  const b = parseInt(clean.substr(4, 2), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#111111' : '#ffffff';
}

/** hex → rgba string */
export function hexToRgba(hex: string, alpha: number): string {
  if (!hex || hex === 'transparent') return `rgba(255,255,255,${alpha})`;
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substr(0, 2), 16);
  const g = parseInt(clean.substr(2, 2), 16);
  const b = parseInt(clean.substr(4, 2), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Ekstrak 'Nama Panggilan' (Nickname) yang sesuai untuk konteks Malaysia.
 * 1. Menapis nama ayah/keluarga selepas perkataan patronimik (Bin, Binti, A/L, A/P, dll.)
 * 2. Mengabaikan imbuhan/gelaran awalan umum (Muhammad, Mohd, Nur, Siti, Wan, Syed, dll.)
 * 3. Mengambil nama sebenar (second name/given name) dan memformatkannya ke Title Case.
 */
export function getMalaysianNickname(fullName?: string | null, fallback: string = 'Pelajar'): string {
  if (!fullName || typeof fullName !== 'string') return fallback;

  // 1. Bersihkan teks kurungan (cth: "Amirul (JPP)") dan alias @ (cth: "Aiman @ Bob")
  let cleanName = fullName
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .split('@')[0]
    .trim();

  if (!cleanName) return fallback;

  // 2. Potong bahagian nama ayah selepas pemisah patronimik (case-insensitive)
  // Menyokong: bin, binti, bt, bte, b., a/l, a/p, a.l., a.p., al, ap, s/o, d/o, anak lelaki, anak perempuan
  const patronymicRegex = /\s+(?:bin|binti|bte|bte\.|bt|bt\.|b\.|a\/l|a\/p|a\.l\.|a\.p\.|al|ap|s\/o|d\/o|anak\s+lelaki|anak\s+perempuan)\b.*$/i;
  const personalPart = cleanName.replace(patronymicRegex, '').trim();

  const targetName = personalPart || cleanName;

  // 3. Senarai awalan/imbuhan nama Melayu & gelaran warisan yang biasanya bukan nama panggilan harian
  const ignorePrefixes = new Set([
    'muhammad', 'mohamad', 'mohd', 'muhd', 'mohamed', 'md',
    'ahmad', 'ahmed',
    'abdul', 'abd',
    'nur', 'nurul', 'noor', 'nor',
    'siti',
    'puteri', 'putera',
    'wan', 'nik', 'che', 'meor',
    'syed', 'syarifah', 'sharifah', 'sayed',
    'tengku', 'raja', 'megat', 'tuan',
    'dayang', 'awang', 'abg', 'abang'
  ]);

  // Pecahkan kepada perkataan
  const words = targetName.split(/[\s_-]+/).filter(Boolean);
  if (words.length === 0) return fallback;

  // Cari perkataan pertama yang BUKAN dalam senarai awalan
  const foundWord = words.find(w => {
    const normalized = w.toLowerCase().replace(/[^a-z]/gi, '');
    return normalized && !ignorePrefixes.has(normalized);
  });

  // Jika semua perkataan adalah awalan (cth: "Muhammad" atau "Mohd Ahmad"), 
  // ambil perkataan terakhir jika lebih dari 1 perkataan, atau perkataan pertama.
  const chosen = foundWord || (words.length > 1 ? words[words.length - 1] : words[0]);

  return toTitleCase(chosen);
}

function toTitleCase(str: string): string {
  if (!str) return '';
  const cleaned = str.replace(/[^a-zA-Z0-9']/g, '');
  if (!cleaned) return str;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

/**
 * Picu getaran haptik fizikal pada peranti pintar (mudah alih).
 * Memerlukan sokongan API navigator.vibrate.
 */
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light') {
  if (typeof window !== 'undefined' && navigator && navigator.vibrate) {
    switch (type) {
      case 'light':
        navigator.vibrate(50);
        break;
      case 'medium':
        navigator.vibrate(100);
        break;
      case 'heavy':
        navigator.vibrate(200);
        break;
      case 'success':
        navigator.vibrate([50, 50, 100]); // Dua kali ganda pantas, satu panjang
        break;
      case 'warning':
        navigator.vibrate([100, 50, 100, 50, 100]); // Getaran berulang
        break;
      default:
        navigator.vibrate(50);
    }
  }
}

/**
 * Menyembunyikan nama penuh pengguna untuk tujuan privasi (Privacy Shield).
 * Contoh: "Ahmad Ali Bin Abu" -> "Ahmad A."
 */
export function formatMaskedName(fullName?: string | null): string {
  if (!fullName) return 'Pelajar POLISAS';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
}