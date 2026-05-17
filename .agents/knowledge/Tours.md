# JPP-POLISAS Interactive Tour System

Dokumen ini menerangkan secara komprehensif seni bina, penetapan, dan langkah penyelesaian masalah (troubleshooting) untuk sistem tutorial interaktif portal JPP-POLISAS. Sistem ini dibina menggunakan `react-joyride` v3.

## 1. Seni Bina Utama

Sistem tour terbahagi kepada 3 fail utama:

1.  **`src/config/tourSteps.ts`**: Repositori berpusat untuk semua `tourKey` dan konfigurasi langkah (`steps`).
2.  **`src/hooks/useTour.ts`**: Hook tersuai (custom hook) untuk mengurus kitaran hayat (lifecycle) tour dan persistensi status menggunakan `localStorage`.
3.  **`src/components/ui/SystemTour.tsx`**: Wrapper utama untuk `<Joyride>` v3 yang memaparkan komponen tooltip tersuai dan menangani logik oh-bypass (close/skip).

---

## 2. Pengekalan Status (Persistence) & Auto-Start

Sistem menggunakan `localStorage` untuk memastikan pengguna hanya melihat tutorial **sekali sahaja** secara automatik.

*   Kunci (Key): Menggunakan nilai `tourKey` yang sama (cth: `POLYTASK_BOARD`). *Perhatian: Sistem lama menggunakan awalan `jpp_has_seen_`, tetapi v3 telah diseragamkan untuk terus menggunakan nilai `tourKey`*.
*   Bypass: Butang tanda soal `(?)` menggunakan `startTour()` untuk mengaktifkan kembali tutorial (menetapkan `runTour: true`) tanpa mempedulikan status `localStorage`.

---

## 3. Garis Panduan Menambah Tour Baharu

### Langkah 1: Tentukan `tourKey` dan Konfigurasi Langkah
Dalam `src/config/tourSteps.ts`, tambah kunci baharu dan definisikan langkah-langkah.

**PERATURAN PENTING & BUG FIXES:**
*   **Langkah Pertama WAJIB**: Sentiasa mulakan langkah pertama dengan `target: 'body'` dan `placement: 'center'`. Ini bertindak sebagai pengenalan (intro). Jika langkah pertama mensasarkan elemen spesifik yang belum render (async data) atau tersembunyi (`md:hidden`), tour akan cuba skrol tanpa memaparkan tooltip (menampakkan "bug" seolah-olah tiada popout).
*   **`disableBeacon: true`**: MESTI diletakkan pada setiap langkah. Ini menghalang penunjuk (beacon) lalai Joyride (titik/bulatan kecil hitam) daripada muncul sebelum tooltip dirender. Ketiadaan prop ini akan menyebabkan "titik hitam" misteri terapung pada antaramuka pengguna.

```ts
export const TOUR_STEPS: Record<string, Step[]> = {
  MODUL_BAHARU: [
    {
      target: 'body',
      title: '🌟 Pengenalan Modul',
      content: 'Selamat datang ke modul baharu. Mari lihat fungsi yang ditawarkan.',
      placement: 'center',
      disableBeacon: true, // WAJIB
    },
    {
      target: '.tour-elemen-spesifik',
      title: '🔍 Fungsi X',
      content: 'Klik butang ini untuk fungsi X.',
      placement: 'bottom',
      disableBeacon: true, // WAJIB
    }
  ]
};
```

### Langkah 2: Laksanakan di Halaman Komponen (Page Component)
Dalam komponen anda, sediakan elemen sasaran (target elements) menggunakan atribut `className`. Prefixkan class dengan `tour-` untuk memudahkan penjejakan. Import dan panggil `useTour` serta `SystemTour`.

```tsx
import { useTour } from '@/hooks/useTour';
import { SystemTour } from '@/components/ui/SystemTour';
import { HelpCircle } from 'lucide-react';

export function HalamanModulBaharu({ data_sedia }) {
  // autoStart = true (jika data_sedia ada)
  const { runTour, startTour, closeTour } = useTour('MODUL_BAHARU', !!data_sedia);

  return (
    <div>
      {/* Butang Bantuan Manual */}
      <button onClick={startTour} className="tour-help-button">
        <HelpCircle />
      </button>

      {/* Elemen Sasaran (Target) */}
      <div className="tour-elemen-spesifik">
        {/* ... */}
      </div>

      {/* Komponen SystemTour (Letak di penghujung JSX) */}
      <SystemTour run={runTour} onClose={closeTour} tourKey="MODUL_BAHARU" />
    </div>
  );
}
```

---

## 4. Perubahan API & Evolusi (Penting untuk Penyelenggaraan)

Sistem ini adalah migrasi dan *workaround* untuk API `react-joyride` v3 yang berbeza dan mengandungi pepijat internal dalam komponen tersuai.

*   **Penyisihan Prop `callback` (v2 ke v3):** Dalam v2, status tour dipantau melalui prop `callback`. Dalam v3 (`react-joyride@3.1.0`), prop `callback` **dihapuskan**. Pemantauan status telah digantikan sepenuhnya dengan hook `useJoyride()`.
*   **Pepijat (Bug) Tooltip Tersuai v3 (`closeProps` rosak):** Dalam komponen `CustomTooltip`, `closeProps.onClick` serta `skipProps.onClick` **TIDAK BERFUNGSI** untuk mencetuskan penutupan tour atau logik `controls.close()`.
    *   **Penyelesaian (Bypass):** Butang "X" dan butang "Selesai" tidak menggunakan prop lalai Joyride. Sistem ini telah dibina semula di mana `SystemTour.tsx` mencipta komponen pembalut (wrapper component) secara *on-the-fly* menggunakan `useCallback` dan `useRef`, meluluskan fungsi `onCloseTour` ke dalam tooltip tersuai. Fungsi tersebut dipanggil secara terus untuk menutup tour.
*   **React Strict Mode (Double Mount Bug):** `useTour.ts` versi awal menggunakan `useRef(hasAutoStarted)` yang terdedah kepada isu `useEffect` berjalan dua kali dalam React 18 Strict Mode, membatalkan auto-start. Versi terkini (diterima pakai sekarang) menyelesaikan hal ini dengan bergantung 100% pada semakan sinkronus `localStorage`.

---

## 5. Ringkasan Senarai Semak Visi-UI (Visual/UI Checklist)
Setiap kali melaksanakan tour, pastikan:
1.  Dialog `Install Aplikasi JPP` atau sebarang modal ber-*z-index* tinggi (`z-index: 999+`) ditutup sebelum tour diuji bagi mengelakkan isu intercept.
2.  Tiada titik hitam kelihatan (pengesahan `disableBeacon: true`).
3.  Tooltip muncul dan X butang berfungsi menutupnya, menetapkan `localStorage`.
4.  Langkah pertama mensasarkan `'body'` dengan orientasi `'center'`.
