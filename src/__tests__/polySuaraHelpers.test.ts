import { describe, it, expect } from 'vitest';
import {
  POLISAS_CAMPUS_STICKERS,
  REACTION_EMOJIS,
  extractStickerToken,
  embedStickerToken,
  getAnimalAvatarFromCodename,
  aggregateReactions,
  cleanConfessionText,
  hasSpoilerImageToken,
  embedSpoilerImageToken,
  extractCampusLocations,
  isDebatePollOptions,
  detectPostIntent,
  getCivicProgressStep,
  shouldShowCivicTracker,
  checkEmpathyNudge,
  FRIENDLY_ANON_PERSONAS,
  getFriendlyAnonName,
  isLegacyAnimalCodename,
  normalizePolySuaraCodename,
  isWithin1Hour,
} from '../lib/polySuaraHelpers';

describe('polySuaraHelpers', () => {
  describe('POLISAS_CAMPUS_STICKERS & REACTION_EMOJIS constants', () => {
    it('has exactly 8 campus stickers with required fields', () => {
      expect(POLISAS_CAMPUS_STICKERS).toBeDefined();
      expect(POLISAS_CAMPUS_STICKERS).toHaveLength(8);

      const expectedIds = [
        'otak_jem',
        'exam_mood',
        'relatable',
        'pakat_makan',
        'nangis_katil',
        'solidariti',
        'deadline_esok',
        'geng_repeat',
      ];

      const stickerIds = POLISAS_CAMPUS_STICKERS.map((s) => s.id);
      expect(stickerIds).toEqual(expectedIds);

      POLISAS_CAMPUS_STICKERS.forEach((sticker) => {
        expect(sticker.id).toBeTruthy();
        expect(sticker.label).toBeTruthy();
        expect(sticker.emoji).toBeTruthy();
        expect(sticker.phrase).toBeTruthy();
        expect(['STUDY', 'MOOD', 'CAMPUS', 'MEME']).toContain(sticker.category);
        expect(sticker.gradientClass).toBeTruthy();
        expect(sticker.borderClass).toBeTruthy();
      });
    });

    it('has exactly 6 reaction emojis with expected types', () => {
      expect(REACTION_EMOJIS).toBeDefined();
      expect(REACTION_EMOJIS).toHaveLength(6);

      const expectedTypes = ['heart', 'laugh', 'fire', 'cry', 'shock', 'hundred'];
      const types = REACTION_EMOJIS.map((r) => r.type);
      expect(types).toEqual(expectedTypes);

      REACTION_EMOJIS.forEach((reaction) => {
        expect(reaction.type).toBeTruthy();
        expect(reaction.emoji).toBeTruthy();
        expect(reaction.label).toBeTruthy();
      });
    });
  });

  describe('extractStickerToken', () => {
    it('extracts stickerId when token is present at the beginning', () => {
      const result = extractStickerToken('[sticker:otak_jem] Luahan saya');
      expect(result).toEqual({
        stickerId: 'otak_jem',
        cleanContent: 'Luahan saya',
      });
    });

    it('returns null stickerId and untouched content when no token is present', () => {
      const raw = 'Luahan tanpa apa-apa pelekat di sini.';
      const result = extractStickerToken(raw);
      expect(result).toEqual({
        stickerId: null,
        cleanContent: raw,
      });
    });

    it('handles empty content gracefully', () => {
      const result = extractStickerToken('');
      expect(result).toEqual({
        stickerId: null,
        cleanContent: '',
      });
    });

    it('handles content with sticker token only', () => {
      const result = extractStickerToken('[sticker:exam_mood]');
      expect(result).toEqual({
        stickerId: 'exam_mood',
        cleanContent: '',
      });
    });

    it('handles sticker token with extra whitespace or embedded within text', () => {
      const result = extractStickerToken('   [sticker:deadline_esok]   Tugasan kena hantar esok pagi!   ');
      expect(result.stickerId).toBe('deadline_esok');
      expect(result.cleanContent).toBe('Tugasan kena hantar esok pagi!');
    });
  });

  describe('embedStickerToken', () => {
    it('embeds sticker token into content', () => {
      const result = embedStickerToken('My content', 'exam_mood');
      expect(result).toBe('[sticker:exam_mood] My content');
    });

    it('replaces existing sticker if already present', () => {
      const original = '[sticker:otak_jem] Luahan saya';
      const result = embedStickerToken(original, 'exam_mood');
      expect(result).toBe('[sticker:exam_mood] Luahan saya');
    });

    it('handles empty content by returning token only', () => {
      const result = embedStickerToken('', 'relatable');
      expect(result).toBe('[sticker:relatable]');
    });

    it('returns clean content if stickerId is empty', () => {
      const original = '[sticker:otak_jem] Luahan saya';
      const result = embedStickerToken(original, '');
      expect(result).toBe('Luahan saya');
    });
  });

  describe('getAnimalAvatarFromCodename (70-Character Fictional Monogram Avatars)', () => {
    it('maps curated fictional characters across franchises to monogram initials and color tokens', () => {
      const korra = getAnimalAvatarFromCodename('Korra');
      expect(korra.emoji).toBe('K');
      expect(korra.bgClass).toContain('teal');
      expect(korra.textClass).toBeTruthy();

      const luffy = getAnimalAvatarFromCodename('Monkey D. Luffy');
      expect(luffy.emoji).toBe('MDL');
      expect(luffy.bgClass).toContain('red');

      const bbb = getAnimalAvatarFromCodename('BoBoiBoy');
      expect(bbb.emoji).toBe('BBB');
      expect(bbb.bgClass).toContain('orange');

      const ali = getAnimalAvatarFromCodename('Ejen Ali');
      expect(ali.emoji).toBe('EA');
      expect(ali.bgClass).toContain('cyan');
    });

    it('deterministically remaps legacy animal codenames to non-animal character monograms', () => {
      const forbiddenAnimalIcons = ['🐱', '🐯', '🦊', '🦁', '🦅', '🐼', '🦜', '🐻', '🐘', '🐰', '🐿️', '🐨', '🦌', '🦦', '🦒', '🦉', '👻'];
      const samples = ['Kucing Misteri', 'Harimau Berani', 'Musang Pantas', 'Singa Garang', 'Elang Terbang', 'Panda Comel'];

      for (const sample of samples) {
        const a1 = getAnimalAvatarFromCodename(sample);
        const a2 = getAnimalAvatarFromCodename(sample);
        expect(a1.emoji).toBe(a2.emoji);
        expect(forbiddenAnimalIcons).not.toContain(a1.emoji);
        expect(a1.bgClass).toBeTruthy();
        expect(a1.textClass).toBeTruthy();
      }
    });

    it('returns non-ghost fictional monogram fallback K when codename is missing or empty', () => {
      expect(getAnimalAvatarFromCodename(undefined).emoji).toBe('K');
      expect(getAnimalAvatarFromCodename('').emoji).toBe('K');
      expect(getAnimalAvatarFromCodename('Pelajar Anon').emoji).toBeTruthy();
      expect(getAnimalAvatarFromCodename('Pelajar Anon').emoji).not.toBe('👻');
    });
  });

  describe('aggregateReactions', () => {
    it('aggregates an array of reaction records into ReactionSummary[]', () => {
      const rawReactions = [
        { reaction_type: 'heart', user_id: 'user-1' },
        { reaction_type: 'heart', user_id: 'user-2' },
        { reaction_type: 'fire', user_id: 'user-3' },
        { reaction_type: 'laugh', user_id: 'user-4' },
      ];

      const summaries = aggregateReactions(rawReactions, 'user-1');

      expect(summaries).toBeInstanceOf(Array);
      expect(summaries.length).toBe(3);

      const heartSummary = summaries.find((s) => s.type === 'heart');
      expect(heartSummary).toBeDefined();
      expect(heartSummary?.emoji).toBe('❤️');
      expect(heartSummary?.count).toBe(2);
      expect(heartSummary?.userReacted).toBe(true);

      const fireSummary = summaries.find((s) => s.type === 'fire');
      expect(fireSummary).toBeDefined();
      expect(fireSummary?.emoji).toBe('🔥');
      expect(fireSummary?.count).toBe(1);
      expect(fireSummary?.userReacted).toBe(false);

      const laughSummary = summaries.find((s) => s.type === 'laugh');
      expect(laughSummary).toBeDefined();
      expect(laughSummary?.emoji).toBe('😂');
      expect(laughSummary?.count).toBe(1);
      expect(laughSummary?.userReacted).toBe(false);
    });

    it('flags userReacted: true when a reaction matches currentUserId', () => {
      const rawReactions = [
        { reaction_type: 'hundred', user_id: 'target-user-id' },
      ];

      const summary = aggregateReactions(rawReactions, 'target-user-id');
      expect(summary).toHaveLength(1);
      expect(summary[0]).toEqual({
        type: 'hundred',
        emoji: '💯',
        label: 'Solid',
        count: 1,
        userReacted: true,
      });
    });

    it('returns an empty array when no reactions are provided', () => {
      expect(aggregateReactions([])).toEqual([]);
      expect(aggregateReactions(null as unknown as [])).toEqual([]);
    });
  });

  describe('cleanConfessionText', () => {
    it('strips single sticker token', () => {
      expect(cleanConfessionText('[sticker:otak_jem] Luahan saya')).toBe('Luahan saya');
    });

    it('strips sticker token with no space', () => {
      expect(cleanConfessionText('[sticker:exam_mood]Exam esok')).toBe('Exam esok');
    });

    it('leaves text without stickers untouched', () => {
      expect(cleanConfessionText('Luahan biasa sahaja')).toBe('Luahan biasa sahaja');
    });

    it('handles empty or falsy strings safely', () => {
      expect(cleanConfessionText('')).toBe('');
      expect(cleanConfessionText(undefined as unknown as string)).toBe('');
      expect(cleanConfessionText(null as unknown as string)).toBe('');
    });
  });

  describe('FRIENDLY_ANON_PERSONAS constant (70 Fictional Characters across 7 Series — Zero Legacy Animals)', () => {
    it('has exactly 70 distinct characters (10 per franchise across 7 series) with monogram initials and zero animal codenames', () => {
      expect(FRIENDLY_ANON_PERSONAS).toBeDefined();
      expect(FRIENDLY_ANON_PERSONAS).toHaveLength(70);

      const countsByFranchise = FRIENDLY_ANON_PERSONAS.reduce<Record<string, number>>((acc, p) => {
        acc[p.franchise] = (acc[p.franchise] || 0) + 1;
        return acc;
      }, {});

      expect(countsByFranchise).toEqual({
        'The Legend of Korra': 10,
        'Avatar: The Last Airbender': 10,
        'One Piece': 10,
        'Sword Art Online': 10,
        'Harry Potter': 10,
        'BoBoiBoy': 10,
        'Ejen Ali': 10,
      });

      const uniqueNames = new Set(FRIENDLY_ANON_PERSONAS.map((p) => p.displayName));
      expect(uniqueNames.size).toBe(70);

      // Verify flagship characters from each series
      for (const flagship of ['Korra', 'Aang', 'Monkey D. Luffy', 'Kirito', 'Harry Potter', 'BoBoiBoy', 'Ejen Ali']) {
        expect(uniqueNames.has(flagship)).toBe(true);
      }

      FRIENDLY_ANON_PERSONAS.forEach((persona) => {
        expect(persona.displayName).toBeTruthy();
        expect(persona.franchise).toBeTruthy();
        expect(isLegacyAnimalCodename(persona.displayName)).toBe(false);
        expect(persona.emoji).toMatch(/^[A-Z]{1,3}$/);
        expect(persona.bgClass).toBeTruthy();
      });
    });
  });

  describe('getFriendlyAnonName & normalizePolySuaraCodename', () => {
    it('deterministically maps an Anon hash to a fictional character persona', () => {
      const result1 = getFriendlyAnonName('Anon-eb689');
      const result2 = getFriendlyAnonName('Anon-eb689');

      expect(result1.displayName).toBeTruthy();
      expect(result1.displayName).not.toContain('Anon');
      expect(isLegacyAnimalCodename(result1.displayName)).toBe(false);
      expect(result1.emoji).toMatch(/^[A-Z]{1,3}$/);
      expect(result1.bgClass).toBeTruthy();

      expect(result1.displayName).toBe(result2.displayName);
      expect(result1.emoji).toBe(result2.emoji);
      expect(result1.bgClass).toBe(result2.bgClass);
    });

    it('maps different Anon hashes deterministically across render cycles', () => {
      const resultA1 = getFriendlyAnonName('Anon-112233');
      const resultA2 = getFriendlyAnonName('Anon-112233');
      const resultB = getFriendlyAnonName('Anon-998877');

      expect(resultA1.displayName).toBe(resultA2.displayName);
      expect(resultA1.emoji).toBe(resultA2.emoji);

      const personaNames = FRIENDLY_ANON_PERSONAS.map((p) => p.displayName);
      expect(personaNames).toContain(resultA1.displayName);
      expect(personaNames).toContain(resultB.displayName);
    });

    it('handles codenames formatted with [Penulis] and preserves OP status', () => {
      const opResult = getFriendlyAnonName('Anon-eb689 [Penulis]');
      const normalResult = getFriendlyAnonName('Anon-eb689');

      expect(opResult.displayName).toBe(normalResult.displayName);
      expect(opResult.displayName).not.toContain('[Penulis]');
      expect(opResult.displayName).not.toContain('Anon');
      expect(opResult.isOP).toBe(true);
      expect(normalResult.isOP).toBe(false);
    });

    it('deterministically remaps legacy animal codenames to the 70-character roster and preserves OP status', () => {
      const personaNames = FRIENDLY_ANON_PERSONAS.map((p) => p.displayName);

      const opAnimal = getFriendlyAnonName('Burung Pantas [Penulis]');
      expect(personaNames).toContain(opAnimal.displayName);
      expect(opAnimal.displayName).not.toContain('Burung');
      expect(opAnimal.displayName).not.toContain('[Penulis]');
      expect(opAnimal.isOP).toBe(true);

      const legacyTiger = normalizePolySuaraCodename('Harimau Perkasa');
      expect(personaNames).toContain(legacyTiger.displayName);
      expect(legacyTiger.displayName).not.toContain('Harimau');
      expect(legacyTiger.isOP).toBe(false);

      const legacyGhost = normalizePolySuaraCodename('Hantu Tanpa Nama');
      expect(personaNames).toContain(legacyGhost.displayName);
      expect(legacyGhost.displayName).not.toContain('Hantu');

      // Curated fictional characters stay intact with their franchise monogram
      const korra = normalizePolySuaraCodename('Korra [Penulis]');
      expect(korra.displayName).toBe('Korra');
      expect(korra.emoji).toBe('K');
      expect(korra.isOP).toBe(true);

      const bbb = normalizePolySuaraCodename('BoBoiBoy');
      expect(bbb.displayName).toBe('BoBoiBoy');
      expect(bbb.emoji).toBe('BBB');

      const ali = normalizePolySuaraCodename('Ejen Ali');
      expect(ali.displayName).toBe('Ejen Ali');
      expect(ali.emoji).toBe('EA');
    });

    it('gracefully handles missing, empty, or undefined codenames with Korra fallback', () => {
      const emptyResult = getFriendlyAnonName('');
      expect(emptyResult.displayName).toBe('Korra');
      expect(emptyResult.emoji).toBe('K');

      const undefinedResult = getFriendlyAnonName(undefined);
      expect(undefinedResult.displayName).toBe('Korra');
      expect(undefinedResult.emoji).toBe('K');

      const nullResult = getFriendlyAnonName(null as unknown as string, true);
      expect(nullResult.displayName).toBe('Korra');
      expect(nullResult.isOP).toBe(true);
    });

    it('strictly maps unknown, legacy, and unlisted animal codenames into the 70-character roster without leaking raw text', () => {
      const personaNames = new Set(FRIENDLY_ANON_PERSONAS.map((p) => p.displayName));
      const unlistedSamples = [
        'Kancil Baru',
        'Haiwan Legacy 123',
        'Buaya Pantas',
        'Monyet Laju',
        'Unknown Custom Alias',
        'Buaya Pantas [Penulis]',
      ];

      for (const raw of unlistedSamples) {
        const mapped1 = normalizePolySuaraCodename(raw);
        const mapped2 = normalizePolySuaraCodename(raw);
        const strippedRaw = raw.replace(/\s*\[Penulis\]\s*/gi, '').trim();

        expect(personaNames.has(mapped1.displayName)).toBe(true);
        expect(mapped1.displayName).not.toBe(strippedRaw);
        expect(mapped1.displayName).toBe(mapped2.displayName);
        expect(mapped1.emoji).toMatch(/^[A-Z]{1,3}$/);
        expect(mapped1.isOP).toBe(raw.includes('[Penulis]'));
      }
    });
  });

  describe('isWithin1Hour', () => {
    it('returns true for timestamps within 1 hour (e.g. 30 mins ago, 59 mins ago)', () => {
      const now = Date.now();
      const thirtyMinsAgo = new Date(now - 30 * 60 * 1000).toISOString();
      const fiftyNineMinsAgo = new Date(now - 59 * 60 * 1000).toISOString();
      const justNow = new Date(now - 5 * 1000).toISOString();

      expect(isWithin1Hour(thirtyMinsAgo)).toBe(true);
      expect(isWithin1Hour(fiftyNineMinsAgo)).toBe(true);
      expect(isWithin1Hour(justNow)).toBe(true);
    });

    it('returns false for timestamps older than 1 hour (e.g. 61 mins ago, 2 hours ago)', () => {
      const now = Date.now();
      const sixtyOneMinsAgo = new Date(now - 61 * 60 * 1000).toISOString();
      const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();

      expect(isWithin1Hour(sixtyOneMinsAgo)).toBe(false);
      expect(isWithin1Hour(twoHoursAgo)).toBe(false);
    });

    it('returns false for falsy or invalid dates', () => {
      expect(isWithin1Hour(null)).toBe(false);
      expect(isWithin1Hour(undefined)).toBe(false);
      expect(isWithin1Hour('')).toBe(false);
      expect(isWithin1Hour('invalid-date')).toBe(false);
    });

    it('handles Date objects appropriately', () => {
      const fifteenMinsAgoDate = new Date(Date.now() - 15 * 60 * 1000);
      const ninetyMinsAgoDate = new Date(Date.now() - 90 * 60 * 1000);

      expect(isWithin1Hour(fifteenMinsAgoDate)).toBe(true);
      expect(isWithin1Hour(ninetyMinsAgoDate)).toBe(false);
    });
  });

  describe('PolySuara 2.0 Campus Hub Helpers', () => {
    it('embeds and detects [spoiler-img] token and strips it from cleanConfessionText', () => {
      const hidden = embedSpoilerImageToken('Lihat keadaan paip rosak di blok.', true);
      expect(hidden).toBe('[spoiler-img] Lihat keadaan paip rosak di blok.');
      expect(hasSpoilerImageToken(hidden)).toBe(true);
      expect(cleanConfessionText(hidden)).toBe('Lihat keadaan paip rosak di blok.');

      const normal = embedSpoilerImageToken(hidden, false);
      expect(hasSpoilerImageToken(normal)).toBe(false);
      expect(normal).toBe('Lihat keadaan paip rosak di blok.');
    });

    it('extracts up to 3 unique POLISAS campus locations and room codes for PolyMaps deep links', () => {
      const locs = extractCampusLocations('Aircond di BK12 dan JTMK rosak, kafe di Kafeteria dan Kamsis juga sesak.');
      expect(locs).toHaveLength(3);
      expect(locs.map((l) => l.roomQuery)).toEqual(['JTMK', 'KAMSIS', 'KAFETERIA']);

      const roomOnly = extractCampusLocations('Jumpa di mk04 atau E102 selepas kelas.');
      expect(roomOnly).toEqual([
        { label: 'MK04', roomQuery: 'MK04' },
        { label: 'E102', roomQuery: 'E102' },
      ]);
    });

    it('detects Debate split polls, post intents, civic steps, and client-side PII empathy nudge', () => {
      expect(isDebatePollOptions([{ option_text: 'Setuju' }, { option_text: 'Tidak' }])).toBe(true);
      expect(isDebatePollOptions([{ option_text: 'Agree' }, { option_text: 'Disagree' }])).toBe(true);
      expect(isDebatePollOptions([{ option_text: 'Ya' }, { option_text: 'Mungkin' }, { option_text: 'Tidak' }])).toBe(false);

      expect(detectPostIntent({ content: 'Bila tarikh konvo? #TanyaKampus', category: 'UMUM' })).toBe('QNA');
      expect(detectPostIntent({ content: 'Terima kasih cleaner blok! #Apresiasi', category: 'UMUM' })).toBe('SHOUTOUT');
      expect(detectPostIntent({
        content: 'Wajar ke tutup lampu awal?',
        polysuara_polls: [{ polysuara_poll_options: [{ option_text: 'Setuju' }, { option_text: 'Tidak' }] }],
      })).toBe('DEBATE');
      expect(detectPostIntent({ content: 'Lampu koridor rosak', category: 'FASILITI' })).toBe('CIVIC');

      expect(getCivicProgressStep('NEW')).toBe(1);
      expect(getCivicProgressStep('PENDING')).toBe(1);
      expect(getCivicProgressStep('ACKNOWLEDGED')).toBe(2);
      expect(getCivicProgressStep('FACT_CHECK')).toBe(1);
      expect(getCivicProgressStep('OFFICIAL_NOTE')).toBe(1);
      expect(getCivicProgressStep('INVESTIGATING')).toBe(3);
      expect(getCivicProgressStep('RESOLVED')).toBe(4);

      expect(checkEmpathyNudge('Hubungi saya di 012-3456789 sekarang')).toEqual({ triggered: true, reasonKey: 'phone' });
      expect(checkEmpathyNudge('Pelajar 03DIT23F1012 perlu dibantu')).toEqual({ triggered: true, reasonKey: 'matric' });
      expect(checkEmpathyNudge('Ali bin Abu sering datang awal')).toEqual({ triggered: true, reasonKey: 'personal_name' });
      expect(checkEmpathyNudge('Mohon baiki kipas di dewan kuliah.')).toEqual({ triggered: false, reasonKey: null });
    });

    it('strictly gates shouldShowCivicTracker and attaches localized labels in aggregateReactions', () => {
      expect(shouldShowCivicTracker('FASILITI', 'PENDING')).toBe(true);
      expect(shouldShowCivicTracker('KAMSIS', 'NEW')).toBe(true);
      expect(shouldShowCivicTracker('UMUM', 'PENDING')).toBe(false);
      expect(shouldShowCivicTracker('UMUM', 'OFFICIAL_NOTE')).toBe(false);
      expect(shouldShowCivicTracker('AKADEMIK', 'FACT_CHECK')).toBe(false);
      expect(shouldShowCivicTracker('UMUM', 'INVESTIGATING')).toBe(true);
      expect(shouldShowCivicTracker('UMUM', 'RESOLVED')).toBe(false);
      expect(shouldShowCivicTracker('FASILITI', 'RESOLVED')).toBe(true);

      const list = aggregateReactions([{ reaction_type: 'heart', user_id: 'u1' }], 'u1');
      expect(list[0].label).toBeDefined();
    });
  });
});
