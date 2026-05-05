/**
 * sanitizeRedirect — Validate URL redirect untuk elak open redirect vulnerability.
 *
 * Hanya terima path dalaman (bermula dengan '/') yang bukan protocol-relative URL
 * (seperti '//evil.com'). URL luar domain akan diabaikan sepenuhnya.
 *
 * @param url - Raw redirect string dari URLSearchParams atau sessionStorage
 * @returns Path yang selamat, atau null jika tidak sah
 */
export function sanitizeRedirect(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const decoded = decodeURIComponent(url);
    // Mesti bermula dengan '/' tetapi BUKAN '//' (protocol-relative external)
    if (decoded.startsWith('/') && !decoded.startsWith('//')) {
      return decoded;
    }
  } catch {
    // decodeURIComponent gagal — URL tidak sah, abaikan
  }
  return null;
}
