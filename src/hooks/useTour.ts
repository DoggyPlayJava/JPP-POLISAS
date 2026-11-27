import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook untuk menguruskan logic SystemTour di setiap page.
 * 
 * FLOW:
 * 1. autoStart = false (profile belum load) → skip
 * 2. autoStart = true  (profile dah load)   → semak localStorage
 *    - localStorage ada  → user dah tengok → skip
 *    - localStorage tiada → first time → start tour selepas delay
 * 3. closeTour() → simpan ke localStorage supaya tak auto lagi
 * 4. startTour() → manual trigger (butang ?) — bypass localStorage
 * 
 * @param tourKey  Kunci unik untuk localStorage (cth: 'EKPP_AKTIVITI')
 * @param autoStart  true apabila data (profile/user) sudah sedia
 * @param delay  Masa tunggu sebelum auto-start (default 2000ms)
 */
export function useTour(tourKey: string, autoStart: boolean = true, delay: number = 2000) {
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    // Jangan auto-start selagi data belum sedia
    if (!autoStart) return;

    // Hanya mula secara automatik jika diaktifkan secara eksplisit (mis. "Mulakan Semula Panduan" dari Tetapan).
    // Untuk kegunaan harian, pengguna boleh klik ikon '?' pada bila-bila masa.
    const isForcedTour =
      typeof sessionStorage !== 'undefined' && sessionStorage.getItem('jpp_force_tour') === 'true';
    if (!isForcedTour) return;

    // Jika user dah pernah lihat tour ini dan tidak memaksa semula, jangan auto-start
    const hasSeenTour = localStorage.getItem(tourKey);
    if (hasSeenTour) return;

    // Auto-start selepas delay — beri masa DOM render
    const timer = setTimeout(() => {
      setRunTour(true);
      localStorage.setItem(tourKey, 'true');
      try {
        sessionStorage.removeItem('jpp_force_tour');
      } catch {}
    }, delay);

    return () => clearTimeout(timer);
  }, [tourKey, autoStart, delay]);

  const startTour = useCallback(() => {
    // Manual trigger — butang (?) boleh restart tour bila-bila masa
    setRunTour(true);
  }, []);

  const closeTour = useCallback(() => {
    // Stop tour + rekod ke localStorage supaya tak auto-play lagi
    setRunTour(false);
    localStorage.setItem(tourKey, 'true');
  }, [tourKey]);

  return { runTour, startTour, closeTour };
}
