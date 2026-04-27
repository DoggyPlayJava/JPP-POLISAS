import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
 * Mengabaikan imbuhan awal yang terlalu umum (Muhammad, Nur, Siti, dll.).
 */
export function getMalaysianNickname(fullName?: string | null): string {
  if (!fullName) return 'Pengguna';
  
  const ignoreList = [
    'muhammad', 'mohamad', 'mohd', 'muhd', 'ahmad', 'abdul',
    'nur', 'nurul', 'siti', 'puteri', 'putera', 'wan', 'megat',
    'syed', 'sharifah', 'tengku', 'raja', 'nik'
  ];

  const words = fullName.trim().split(/\s+/);
  if (words.length <= 1) return words[0] || 'Pengguna';

  // Cari perkataan pertama yang TIDAK ada dalam senarai abaikan
  const nickname = words.find(w => !ignoreList.includes(w.toLowerCase()));
  
  // Jika entah bagaimana semua perkataan ada dalam ignoreList (contoh: "Mohd Ahmad"), 
  // ambil perkataan terakhir sebagai fallback.
  return nickname || words[words.length - 1];
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