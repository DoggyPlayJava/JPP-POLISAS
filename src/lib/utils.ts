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