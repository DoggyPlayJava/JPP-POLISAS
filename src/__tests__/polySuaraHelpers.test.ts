import { describe, it, expect } from 'vitest';
import {
  POLISAS_CAMPUS_STICKERS,
  REACTION_EMOJIS,
  extractStickerToken,
  embedStickerToken,
  getAnimalAvatarFromCodename,
  aggregateReactions,
  cleanConfessionText,
  FRIENDLY_ANON_PERSONAS,
  getFriendlyAnonName,
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

  describe('getAnimalAvatarFromCodename', () => {
    it('matches "Kucing Misteri" and returns emoji 🐱', () => {
      const avatar = getAnimalAvatarFromCodename('Kucing Misteri');
      expect(avatar.emoji).toBe('🐱');
      expect(avatar.bgClass).toBeTruthy();
      expect(avatar.textClass).toBeTruthy();
    });

    it('matches "Harimau Berani" and returns emoji 🐯', () => {
      const avatar = getAnimalAvatarFromCodename('Harimau Berani');
      expect(avatar.emoji).toBe('🐯');
    });

    it('matches "Musang Pantas" and returns emoji 🦊', () => {
      const avatar = getAnimalAvatarFromCodename('Musang Pantas');
      expect(avatar.emoji).toBe('🦊');
    });

    it('matches additional known animals like Singa and Elang', () => {
      expect(getAnimalAvatarFromCodename('Singa Garang').emoji).toBe('🦁');
      expect(getAnimalAvatarFromCodename('Elang Terbang').emoji).toBe('🦅');
      expect(getAnimalAvatarFromCodename('Panda Comel').emoji).toBe('🐼');
    });

    it('returns fallback 👻 when codename is missing, empty or generic', () => {
      expect(getAnimalAvatarFromCodename(undefined).emoji).toBe('👻');
      expect(getAnimalAvatarFromCodename('').emoji).toBe('👻');
      expect(getAnimalAvatarFromCodename('Pelajar Anon').emoji).toBe('👻');
      expect(getAnimalAvatarFromCodename('Unknown X').emoji).toBe('👻');
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

  describe('FRIENDLY_ANON_PERSONAS constant', () => {
    it('has at least 16 distinct Malaysian campus animal personas with required fields', () => {
      expect(FRIENDLY_ANON_PERSONAS).toBeDefined();
      expect(FRIENDLY_ANON_PERSONAS.length).toBeGreaterThanOrEqual(16);

      const requiredAnimals = [
        'Kucing Oren',
        'Tupai Laju',
        'Panda Comel',
        'Arnab Pantas',
        'Musang Cerdik',
        'Koala Tenang',
        'Helang Biru',
        'Rusa Riang',
        'Singa Santai',
        'Beruang Madu',
        'Kancil Bijak',
        'Otter Ceria',
        'Harimau Berani',
        'Zirafah Tinggi',
        'Kucing Hitam',
        'Burung Hantu',
      ];

      const names = FRIENDLY_ANON_PERSONAS.map((p) => p.displayName);
      requiredAnimals.forEach((requiredName) => {
        expect(names).toContain(requiredName);
      });

      FRIENDLY_ANON_PERSONAS.forEach((persona) => {
        expect(persona.displayName).toBeTruthy();
        expect(persona.emoji).toBeTruthy();
        expect(persona.bgClass).toBeTruthy();
      });
    });
  });

  describe('getFriendlyAnonName', () => {
    it('deterministically maps an Anon hash to a friendly animal persona', () => {
      const result1 = getFriendlyAnonName('Anon-eb689');
      const result2 = getFriendlyAnonName('Anon-eb689');

      expect(result1.displayName).toBeTruthy();
      expect(result1.displayName).not.toContain('Anon');
      expect(result1.emoji).toBeTruthy();
      expect(result1.bgClass).toBeTruthy();

      // Determinism test: calling multiple times must return the identical persona
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

    it('preserves existing named animals and strips [Penulis] while using appropriate emoji', () => {
      const namedResult = getFriendlyAnonName('Burung Pantas [Penulis]');
      expect(namedResult.displayName).toBe('Burung Pantas');
      expect(namedResult.emoji).toBe('🦜');
      expect(namedResult.isOP).toBe(true);

      const namedWithoutOp = getFriendlyAnonName('Harimau Perkasa');
      expect(namedWithoutOp.displayName).toBe('Harimau Perkasa');
      expect(namedWithoutOp.emoji).toBe('🐯');
      expect(namedWithoutOp.isOP).toBe(false);
    });

    it('gracefully handles missing, empty, or undefined codenames', () => {
      const emptyResult = getFriendlyAnonName('');
      expect(emptyResult.displayName).toBe('Pelajar Anon');
      expect(emptyResult.emoji).toBe('👻');

      const undefinedResult = getFriendlyAnonName(undefined);
      expect(undefinedResult.displayName).toBe('Pelajar Anon');
      expect(undefinedResult.emoji).toBe('👻');

      const nullResult = getFriendlyAnonName(null as unknown as string, true);
      expect(nullResult.displayName).toBe('Pelajar Anon');
      expect(nullResult.isOP).toBe(true);
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
});
