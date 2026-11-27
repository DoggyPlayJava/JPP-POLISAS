import { describe, it, expect } from 'vitest';
import {
  detectComplaintNudge,
  suggestKebajikanEscalation,
  normalizeTicketImageUrls,
  buildEscalationRpcArgs,
  buildKebajikanPrefillState,
  getHandledUnitForCategory,
} from '../polySuaraEscalation';

describe('polySuaraEscalation domain logic', () => {
  describe('detectComplaintNudge (Layer 1 pre-submit complaint detector)', () => {
    it('detects department facility complaints and suggests FASILITI_JABATAN -> KEBAJIKAN', () => {
      const result = detectComplaintNudge(
        'Aircond di BK12 JTMK rosak dah 3 hari, panas sangat masa kuliah pagi.',
        'FASILITI'
      );
      expect(result.triggered).toBe(true);
      expect(result.suggestedCategory).toBe('FASILITI_JABATAN');
      expect(result.handledByUnit).toBe('KEBAJIKAN');
      expect(result.reason).toBe('facility');
    });

    it('detects hostel WiFi/water complaints and suggests WIFI_KAMSIS -> KEBAJIKAN', () => {
      const result = detectComplaintNudge(
        'WiFi Kamsis Blok C langsung tak boleh connect sejak malam semalam, air pun tiada.',
        'KAMSIS'
      );
      expect(result.triggered).toBe(true);
      expect(result.suggestedCategory).toBe('WIFI_KAMSIS');
      expect(result.handledByUnit).toBe('KEBAJIKAN');
      expect(result.reason).toBe('kamsis');
    });

    it('detects cafeteria hygiene or pricing complaints even under UMUM and routes to KK', () => {
      const result = detectComplaintNudge(
        'Makanan di kafe Al-Biruni tadi basi dan harga lauk terlalu mahal untuk pelajar.',
        'UMUM'
      );
      expect(result.triggered).toBe(true);
      expect(result.suggestedCategory).toBe('KAFETERIA');
      expect(result.handledByUnit).toBe('KK');
      expect(result.reason).toBe('cafeteria');
    });

    it('detects sports facility complaints and suggests FASILITI_SUKAN', () => {
      const result = detectComplaintNudge(
        'Lampu gelanggang futsal padam separuh dan jaring gol koyak bahaya waktu malam.',
        'FASILITI'
      );
      expect(result.triggered).toBe(true);
      expect(result.suggestedCategory).toBe('FASILITI_SUKAN');
      expect(result.handledByUnit).toBe('KEBAJIKAN');
    });

    it('does NOT false-trigger on regular confessions, crushes, or short drafts', () => {
      const crush = detectComplaintNudge(
        'Shoutout dekat abang JTMK pakai baju biru hari ni, senyuman awak buat hari saya ceria!',
        'UMUM'
      );
      expect(crush.triggered).toBe(false);

      const shortDraft = detectComplaintNudge('Rosak', 'FASILITI');
      expect(shortDraft.triggered).toBe(false);
    });
  });

  describe('suggestKebajikanEscalation (Layer 2 JPP auto-suggestion)', () => {
    it('routes KAFETERIA keywords to KK unit and strips spoiler tokens from title', () => {
      const suggestion = suggestKebajikanEscalation({
        content: '[spoiler-img] Kafe Al-Ghazali kotor ada lipas dekat meja makan pelajar',
        category: 'UMUM',
        codename: 'Harimau Bijak',
        image_url: 'https://cdn.example.com/proof.jpg',
      });

      expect(suggestion.category).toBe('KAFETERIA');
      expect(suggestion.handledByUnit).toBe('KK');
      expect(suggestion.title).not.toContain('[spoiler-img]');
      expect(suggestion.title.length).toBeLessThanOrEqual(100);
      expect(suggestion.imageUrls).toEqual(['https://cdn.example.com/proof.jpg']);
    });

    it('falls back to LAIN_LAIN and empty imageUrls array when image_url is null', () => {
      const suggestion = suggestKebajikanEscalation({
        content: 'Mohon bantuan kewangan kecemasan untuk pelajar yang terkesan banjir minggu ini.',
        category: 'UMUM',
        image_url: null,
      });

      expect(suggestion.category).toBe('LAIN_LAIN');
      expect(suggestion.handledByUnit).toBe('KEBAJIKAN');
      expect(suggestion.imageUrls).toEqual([]);
      expect(suggestion.priority).toBe('HIGH');
    });

    it('routes KAFETERIA to KK and all other categories to KEBAJIKAN', () => {
      expect(getHandledUnitForCategory('KAFETERIA')).toBe('KK');
      expect(getHandledUnitForCategory('FASILITI_JABATAN')).toBe('KEBAJIKAN');
      expect(getHandledUnitForCategory('WIFI_KAMSIS')).toBe('KEBAJIKAN');
      expect(getHandledUnitForCategory('FASILITI_SUKAN')).toBe('KEBAJIKAN');
      expect(getHandledUnitForCategory('LAIN_LAIN')).toBe('KEBAJIKAN');
    });
  });

  describe('normalizeTicketImageUrls (null-safety guard for KebajikanTicketDetail)', () => {
    it('returns an empty array for null, undefined, or non-array inputs', () => {
      expect(normalizeTicketImageUrls(null)).toEqual([]);
      expect(normalizeTicketImageUrls(undefined)).toEqual([]);
      expect(normalizeTicketImageUrls('not-an-array')).toEqual([]);
      expect(normalizeTicketImageUrls({})).toEqual([]);
    });

    it('filters out blank strings and non-strings from valid arrays', () => {
      expect(
        normalizeTicketImageUrls(['https://a.test/1.png', '', '   ', null, 42, 'https://a.test/2.png'])
      ).toEqual(['https://a.test/1.png', 'https://a.test/2.png']);
    });
  });

  describe('buildEscalationRpcArgs (Zero-PII contract guard)', () => {
    it('strips any accidental PII fields and trims/caps title to 120 chars', () => {
      const longTitle = 'A'.repeat(160);
      const args = buildEscalationRpcArgs({
        confessionId: '11111111-1111-1111-1111-111111111111',
        category: 'FASILITI_JABATAN',
        priority: 'URGENT',
        title: `  ${longTitle}  `,
        note: '  Perlu semakan segera pihak penyelenggaraan  ',
        // Simulate accidental PII passed in at runtime
        ...({ author_id: 'secret-uuid', submitter_id: 'secret-uuid', matric_no: '04DDT24F1001' } as any),
      });

      expect(args).toEqual({
        p_confession_id: '11111111-1111-1111-1111-111111111111',
        p_category: 'FASILITI_JABATAN',
        p_priority: 'URGENT',
        p_title: 'A'.repeat(120),
        p_note: 'Perlu semakan segera pihak penyelenggaraan',
      });
      expect(Object.keys(args)).not.toContain('author_id');
      expect(Object.keys(args)).not.toContain('submitter_id');
      expect(Object.keys(args)).not.toContain('matric_no');
    });
  });

  describe('buildKebajikanPrefillState (Layer 1 draft handoff)', () => {
    it('creates clean router state with category, trimmed title, and full description', () => {
      const nudge = detectComplaintNudge(
        'Paip tandas tingkat 2 blok JKE bocor teruk air melimpah ke koridor.',
        'FASILITI'
      );
      const state = buildKebajikanPrefillState(
        'Paip tandas tingkat 2 blok JKE bocor teruk air melimpah ke koridor.',
        nudge
      );

      expect(state.fromPolySuara).toBe(true);
      expect(state.category).toBe('FASILITI_JABATAN');
      expect(state.description).toContain('Paip tandas tingkat 2 blok JKE');
      expect(state.title.length).toBeGreaterThan(5);
      expect(state.title.length).toBeLessThanOrEqual(100);
    });
  });
});
