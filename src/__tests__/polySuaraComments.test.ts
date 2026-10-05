import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';

import {
  extractStickerToken,
  embedStickerToken,
  cleanConfessionText,
  POLISAS_CAMPUS_STICKERS,
} from '@/lib/polySuaraHelpers';
import { PolySuaraStickerBadge } from '@/components/polysuara/PolySuaraStickerBadge';
import { PolySuaraStickerPicker } from '@/components/polysuara/PolySuaraStickerPicker';

describe('PolySuara Comments Suite (TDD)', () => {
  describe('Sticker Token Helpers & Content Sanitization for Comments', () => {
    it('extracts sticker token and clean content from a comment content string', () => {
      const commentWithSticker = '[sticker:kamsis_berhantu] Memang seram lalu blok B waktu malam!';
      const { stickerId, cleanContent } = extractStickerToken(commentWithSticker);

      expect(stickerId).toBe('kamsis_berhantu');
      expect(cleanContent).toBe('Memang seram lalu blok B waktu malam!');
    });

    it('extracts null stickerId and preserves content when comment has no sticker', () => {
      const normalComment = 'Setuju sangat dengan pandangan penulis confession ini.';
      const { stickerId, cleanContent } = extractStickerToken(normalComment);

      expect(stickerId).toBeNull();
      expect(cleanContent).toBe('Setuju sangat dengan pandangan penulis confession ini.');
    });

    it('cleans comment content using cleanConfessionText', () => {
      const commentWithSticker = '[sticker:otak_jem] Pening kepala buat assignment.';
      expect(cleanConfessionText(commentWithSticker)).toBe('Pening kepala buat assignment.');

      const cleanComment = 'Komen biasa tanpa sebarang pelekat.';
      expect(cleanConfessionText(cleanComment)).toBe('Komen biasa tanpa sebarang pelekat.');
    });

    it('handles comment containing only a sticker token', () => {
      const stickerOnly = '[sticker:solidariti]';
      const { stickerId, cleanContent } = extractStickerToken(stickerOnly);

      expect(stickerId).toBe('solidariti');
      expect(cleanContent).toBe('');
    });

    it('embeds a sticker token into comment text', () => {
      const rawText = 'Betul sangat tu bro!';
      const result = embedStickerToken(rawText, 'geng_repeat');

      expect(result).toBe('[sticker:geng_repeat] Betul sangat tu bro!');
    });

    it('embeds a sticker token into empty comment text', () => {
      const result = embedStickerToken('', 'otak_jem');

      expect(result).toBe('[sticker:otak_jem]');
    });

    it('replaces an existing sticker token when embedding a new sticker', () => {
      const oldComment = '[sticker:otak_jem] Pening kepala buat assignment.';
      const result = embedStickerToken(oldComment, 'kopi_ais');

      expect(result).toBe('[sticker:kopi_ais] Pening kepala buat assignment.');
      const extracted = extractStickerToken(result);
      expect(extracted.stickerId).toBe('kopi_ais');
      expect(extracted.cleanContent).toBe('Pening kepala buat assignment.');
    });
  });

  describe('Comment Sticker Picker & Badge Components', () => {
    it('renders PolySuaraStickerBadge with onRemove for preview', () => {
      const handleRemove = vi.fn();
      const html = renderToString(
        React.createElement(PolySuaraStickerBadge, {
          stickerId: 'otak_jem',
          size: 'sm',
          onRemove: handleRemove,
          className: 'mb-2',
        })
      );

      expect(html).toContain('Otak Jem');
      expect(html).toContain('🧠💥');
      expect(html).toContain('button');
    });

    it('renders PolySuaraStickerPicker with sticker options', () => {
      const handleSelect = vi.fn();
      const handleClose = vi.fn();
      const html = renderToString(
        React.createElement(PolySuaraStickerPicker, {
          isOpen: true,
          onClose: handleClose,
          onSelectSticker: handleSelect,
          selectedStickerId: 'kamsis_berhantu',
        })
      );

      expect(html).toContain('Pelekat Kampus POLISAS');
      expect(html).toContain('Otak Jem');
      expect(html).toContain('Geng Repeat');
      expect(html).toContain('Solidariti');
      expect(html).toContain('Deadline Esok');
    });
  });

  describe('PolySuaraPage Comments Drawer Dual Mode & Deprecated Stickers', () => {
    const pageFilePath = path.resolve(__dirname, '../pages/polyservices/PolySuaraPage.tsx');
    const pageContent = fs.readFileSync(pageFilePath, 'utf-8');

    it('removes comment sticker state and pickers from PolySuaraPage', () => {
      expect(pageContent).not.toContain('commentStickerId');
      expect(pageContent).not.toContain('commentStickerPickerOpen');
      expect(pageContent).not.toContain('selectedStickerId={commentStickerId}');
      expect(pageContent).not.toContain('title="Pelekat Kampus"');
    });

    it('uses cleanConfessionText to clean comments, replies, and drawer preview', () => {
      expect(pageContent).toContain('cleanConfessionText(comment.content)');
      expect(pageContent).toContain('cleanConfessionText(reply.content)');
      expect(pageContent).toContain('cleanConfessionText(activeConfessionForComments.content)');
    });

    it('applies dual Light & Dark mode classes, z-[999] elevation, and bottom clearance to comments drawer', () => {
      // Drawer container
      expect(pageContent).toContain('bg-white dark:bg-slate-900');
      expect(pageContent).toContain('border-slate-200 dark:border-slate-800');
      expect(pageContent).toContain('text-slate-900 dark:text-white');
      expect(pageContent).toContain('z-[999]');
      expect(pageContent).toContain('pb-8 sm:pb-4');
      expect(pageContent).toContain('fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[990]');

      // Drawer close button dual mode
      expect(pageContent).toMatch(/text-slate-500 dark:text-slate-400/);
    });

    it('applies minimalist quotation card styling to active confession preview inside drawer', () => {
      expect(pageContent).toContain('bg-slate-50/80 dark:bg-white/[0.03]');
      expect(pageContent).toContain('border-b border-slate-100 dark:border-white/5');
      expect(pageContent).toMatch(/text-slate-600 dark:text-slate-300|text-slate-700 dark:text-slate-300/);
    });

    it('renders clean modern conversation thread styling, role badges, and discrete actions', () => {
      // Clean conversation rows with hairline dividers
      expect(pageContent).toContain('border-b border-slate-100 dark:border-white/5 py-3.5 px-4');

      // Nested replies hairline thread line
      expect(pageContent).toContain('border-l-2 border-slate-200 dark:border-white/10 pl-3 ml-2 mt-2 space-y-2.5');

      // OP role badge
      expect(pageContent).toContain('text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20');

      // JPP RASMI role badge
      expect(pageContent).toContain('text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20');
      expect(pageContent).toContain('JPP RASMI');

      // Discrete escalation trigger replacing bulky yellow button
      expect(pageContent).toContain('title="Eskalasi kecemasan ke Kebajikan (Rahsia)"');
      expect(pageContent).not.toContain('bg-amber-500/10 hover:bg-amber-500/20');
    });

    it('renders modern floating capsule comment input bar and sensitive comment blur toggle', () => {
      expect(pageContent).toContain('bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm');
      expect(pageContent).toContain('focus:outline-none focus:border-rose-500/50');
      expect(pageContent).not.toContain('Pelekat Kampus');
      expect(pageContent).toContain('Tanda sebagai Sensitif (Blur)');
    });
  });
});
