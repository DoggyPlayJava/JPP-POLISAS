import { describe, it, expect } from 'vitest';
import {
  calculateSuggestedMerit,
  getPeringkatMerit,
  getTahapMerit,
  getKepimpinanJppMerit,
  getKepimpinanJppRoleMerit,
  isKepimpinanJppAward,
  PERINGKAT_MERIT,
  TAHAP_MERIT,
  KEPIMPINAN_JPP_OPTIONS,
  KEPIMPINAN_JPP_PERINGKAT_MERIT,
} from '@/lib/makmp';

describe('MAKMP Merit Calculation Logic', () => {
  describe('Standard Sijil Additive Merit (Peringkat + Tahap)', () => {
    it('sepatutnya mengira Antarabangsa + Johan = 10 (5 + 5)', () => {
      const peringkat = 'ANTARABANGSA';
      const tahap = 'JOHAN';
      const merit = calculateSuggestedMerit(peringkat, tahap);
      expect(getPeringkatMerit(peringkat)).toBe(5);
      expect(getTahapMerit(tahap)).toBe(5);
      expect(merit).toBe(10);
    });

    it('sepatutnya mengira Kebangsaan + Ketiga = 7 (4 + 3)', () => {
      const peringkat = 'KEBANGSAAN';
      const tahap = 'KETIGA';
      const merit = calculateSuggestedMerit(peringkat, tahap);
      expect(getPeringkatMerit(peringkat)).toBe(4);
      expect(getTahapMerit(tahap)).toBe(3);
      expect(merit).toBe(7);
    });

    it('sepatutnya mengira Politeknik + Peserta = 3 (1 + 2)', () => {
      const peringkat = 'POLITEKNIK';
      const tahap = 'PESERTA';
      const merit = calculateSuggestedMerit(peringkat, tahap);
      expect(getPeringkatMerit(peringkat)).toBe(1);
      expect(getTahapMerit(tahap)).toBe(2);
      expect(merit).toBe(3);
    });

    it('sepatutnya mengira Negeri + Naib Johan = 7 (3 + 4)', () => {
      const peringkat = 'NEGERI';
      const tahap = 'NAIB_JOHAN';
      const merit = calculateSuggestedMerit(peringkat, tahap);
      expect(getPeringkatMerit(peringkat)).toBe(3);
      expect(getTahapMerit(tahap)).toBe(4);
      expect(merit).toBe(7);
    });

    it('memastikan had merit sijil sentiasa antara 1 dan 10', () => {
      // Nilai minimum: POLITEKNIK (1) + LAIN (1) = 2
      expect(calculateSuggestedMerit('POLITEKNIK', 'LAIN')).toBe(2);
      // Nilai maksimum: ANTARABANGSA (5) + JOHAN (5) = 10
      expect(calculateSuggestedMerit('ANTARABANGSA', 'JOHAN')).toBe(10);
      expect(calculateSuggestedMerit('ANTARABANGSA', 'EMAS')).toBe(10);
    });
  });

  describe('Kepimpinan JPP Merit (Peringkat + Peranan)', () => {
    it('mengesan isKepimpinanJppAward dengan tepat', () => {
      expect(isKepimpinanJppAward('Anugerah Kepimpinan JPP Terbaik')).toBe(true);
      expect(isKepimpinanJppAward('anugerah kepimpinan jpp terbaik')).toBe(true);
      expect(isKepimpinanJppAward('Tokoh Kolej Kediaman Terbaik')).toBe(false);
      expect(isKepimpinanJppAward('Olahragawan POLISAS')).toBe(false);
      expect(isKepimpinanJppAward(null)).toBe(false);
      expect(isKepimpinanJppAward(undefined)).toBe(false);
      expect(isKepimpinanJppAward('')).toBe(false);
    });

    it('sepatutnya mengira Kebangsaan + Pengarah = 9 (4 + 5)', () => {
      const peringkat = 'KEBANGSAAN';
      const role = 'PENGARAH';
      expect(KEPIMPINAN_JPP_PERINGKAT_MERIT[peringkat]).toBe(4);
      expect(getKepimpinanJppRoleMerit(role)).toBe(5);
      expect(getKepimpinanJppMerit(peringkat, role)).toBe(9);
    });

    it('sepatutnya mengira Politeknik + AJK = 3 (1 + 2)', () => {
      const peringkat = 'POLITEKNIK';
      const role = 'AJK';
      expect(KEPIMPINAN_JPP_PERINGKAT_MERIT[peringkat]).toBe(1);
      expect(getKepimpinanJppRoleMerit(role)).toBe(2);
      expect(getKepimpinanJppMerit(peringkat, role)).toBe(3);
    });

    it('sepatutnya mengira Antarabangsa + Setiausaha = 8 (5 + 3)', () => {
      const peringkat = 'ANTARABANGSA';
      const role = 'SETIAUSAHA';
      expect(KEPIMPINAN_JPP_PERINGKAT_MERIT[peringkat]).toBe(5);
      expect(getKepimpinanJppRoleMerit(role)).toBe(3);
      expect(getKepimpinanJppMerit(peringkat, role)).toBe(8);
    });

    it('memastikan had merit kepimpinan JPP berada dalam julat 0 hingga 10', () => {
      // Minimum: POLITEKNIK (1) + PENYERTAAN (1) = 2
      expect(getKepimpinanJppMerit('POLITEKNIK', 'PENYERTAAN')).toBe(2);
      // Maksimum: ANTARABANGSA (5) + PENGARAH (5) = 10
      expect(getKepimpinanJppMerit('ANTARABANGSA', 'PENGARAH')).toBe(10);
    });
  });

  describe('Laporan Calculation Logic', () => {
    const calculateReportMerit = (score: number): number => {
      return Math.max(0, Math.min(10, Math.round((Number(score) || 0) / 10)));
    };

    it('sepatutnya membundar markah laporan kepada merit mengikut skala 0-10', () => {
      // 85 -> 9
      expect(Math.round(85 / 10)).toBe(9);
      expect(calculateReportMerit(85)).toBe(9);

      // 74 -> 7
      expect(Math.round(74 / 10)).toBe(7);
      expect(calculateReportMerit(74)).toBe(7);

      // 0 -> 0
      expect(Math.round(0 / 10)).toBe(0);
      expect(calculateReportMerit(0)).toBe(0);

      // 100 -> 10
      expect(Math.round(100 / 10)).toBe(10);
      expect(calculateReportMerit(100)).toBe(10);
    });

    it('mengendalikan kes sempadan bundaran dan had had (clamping) 0-10', () => {
      // Bundaran titik perpuluhan
      expect(calculateReportMerit(65)).toBe(7);
      expect(calculateReportMerit(64)).toBe(6);
      expect(calculateReportMerit(45)).toBe(5);
      expect(calculateReportMerit(95)).toBe(10);

      // Clamping bawah 0 atau atas 100
      expect(calculateReportMerit(-10)).toBe(0);
      expect(calculateReportMerit(120)).toBe(10);
    });
  });
});
