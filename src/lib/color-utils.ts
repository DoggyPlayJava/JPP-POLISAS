/**
 * Smart Contrast Utility — JPP Theme System
 * Determines whether text should be white or black based on background color luminance.
 * Uses WCAG 2.0 relative luminance formula.
 */

export function getContrastColor(hexColor: string): '#FFFFFF' | '#000000' {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // sRGB to linear
  const rLin = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLin = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLin = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  const luminance = 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
  return luminance > 0.179 ? '#000000' : '#FFFFFF';
}

/**
 * Format a date string (YYYY-MM-DD) to D/M/YYYY format.
 */
export function formatDateDMY(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/**
 * Format a date range to D/M/YYYY – D/M/YYYY (en-dash).
 * If start === end, returns single date.
 */
export function formatDateRange(start: string, end?: string): string {
  const s = formatDateDMY(start);
  if (!end || end === start) return s;
  return `${s} – ${formatDateDMY(end)}`;
}

/** Default JPP theme color (Maroon Premium) */
export const DEFAULT_JPP_COLOR = '#6B1D2A';
