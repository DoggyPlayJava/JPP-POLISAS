import { describe, it, expect } from 'vitest';
import {
  aggregatePortalCampaigns,
  calculateBentoLayoutSpan,
  validateZeroEmDashes,
  formatCampusTelemetry,
  type CampaignNotificationItem
} from '@/lib/portalDeckHelpers';
import { EXCO_MODULES } from '@/config/excoModules';

describe('Portal Command Deck & Layout Helpers', () => {
  describe('aggregatePortalCampaigns', () => {
    it('prioritizes actionable MAKMP and KAMSIS items above informational items', () => {
      const items = aggregatePortalCampaigns({
        kamsisStatus: 'APPROVED',
        kamsisExtraData: null,
        kamsisToggles: { kamsis_result_open: true },
        makmpStatus: 'DIJEMPUT',
        makmpTrackingCode: 'MK-1234',
        supsasActive: true,
        supsasEdition: { name: 'SUPSAS 2026' },
        karnivalActive: false,
        karnivalStatus: null,
      });

      expect(items.length).toBeGreaterThanOrEqual(2);
      expect(items[0].id).toBe('makmp');
      expect(items[0].priority).toBe(1);
      expect(items[1].id).toBe('kamsis');
      expect(items[1].badgeLabel).toBe('LULUS');
    });

    it('returns empty array when no campaigns are active', () => {
      const items = aggregatePortalCampaigns({
        kamsisStatus: null,
        kamsisExtraData: null,
        kamsisToggles: {},
        makmpStatus: null,
        makmpTrackingCode: null,
        supsasActive: false,
        supsasEdition: null,
        karnivalActive: false,
        karnivalStatus: null,
      });

      expect(items).toEqual([]);
    });

    it('correctly tags Karnival and SUPSAS live events', () => {
      const items = aggregatePortalCampaigns({
        kamsisStatus: null,
        kamsisExtraData: null,
        kamsisToggles: {},
        makmpStatus: null,
        makmpTrackingCode: null,
        supsasActive: true,
        supsasEdition: { name: 'Kejohanan SUPSAS' },
        karnivalActive: true,
        karnivalStatus: { name: 'Karnival Siswa' },
      });

      expect(items.some(i => i.id === 'karnival')).toBe(true);
      expect(items.some(i => i.id === 'supsas')).toBe(true);
    });
  });

  describe('calculateBentoLayoutSpan', () => {
    it('allocates hero column span to Sistem Kelab (ekpp) and EMS', () => {
      const ekppSpan = calculateBentoLayoutSpan('ekpp', 0, 5);
      const emsSpan = calculateBentoLayoutSpan('ems', 4, 5);
      const kebajikanSpan = calculateBentoLayoutSpan('kebajikan', 1, 5);

      expect(ekppSpan.colSpan).toBe('lg:col-span-8');
      expect(ekppSpan.isHero).toBe(true);
      expect(emsSpan.colSpan).toBe('lg:col-span-8');
      expect(emsSpan.isHero).toBe(true);
      expect(kebajikanSpan.colSpan).toBe('lg:col-span-4');
      expect(kebajikanSpan.isHero).toBe(false);
    });
  });

  describe('validateZeroEmDashes', () => {
    it('detects em-dashes and rejects them', () => {
      const textWithEmDash = 'Portal akademik pelajar \u2014 rekod merit';
      const textWithEnDash = 'Sesi 2025\u20132026';
      const cleanText = 'Portal akademik pelajar - rekod merit';

      expect(validateZeroEmDashes(textWithEmDash)).toBe(false);
      expect(validateZeroEmDashes(textWithEnDash)).toBe(false);
      expect(validateZeroEmDashes(cleanText)).toBe(true);
    });

    it('confirms EXCO_MODULES descriptions and taglines have zero em-dashes', () => {
      EXCO_MODULES.forEach(mod => {
        expect(validateZeroEmDashes(mod.name), `Module name for ${mod.id} has em-dash`).toBe(true);
        expect(validateZeroEmDashes(mod.tagline), `Module tagline for ${mod.id} has em-dash`).toBe(true);
        expect(validateZeroEmDashes(mod.description), `Module description for ${mod.id} has em-dash`).toBe(true);
      });
    });
  });

  describe('formatCampusTelemetry', () => {
    it('formats active and resolved tickets with hyphen fallback', () => {
      expect(formatCampusTelemetry({ open: 5, resolved: 12 })).toEqual({
        openText: '5',
        resolvedText: '12',
        ratingText: '5.0',
      });

      expect(formatCampusTelemetry(null)).toEqual({
        openText: '-',
        resolvedText: '-',
        ratingText: '-',
      });
    });
  });
});
