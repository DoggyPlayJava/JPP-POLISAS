import { describe, it, expect } from 'vitest';
import {
  POLISAS_CAMPUS_STICKERS,
  REACTION_EMOJIS,
  extractStickerToken,
  embedStickerToken,
  getAnimalAvatarFromCodename,
  aggregateReactions,
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
});
