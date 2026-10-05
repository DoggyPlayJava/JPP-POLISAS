import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';

import {
  extractStickerToken,
  embedStickerToken,
  POLISAS_CAMPUS_STICKERS,
} from '@/lib/polySuaraHelpers';
import { PolySuaraStickerBadge } from '@/components/polysuara/PolySuaraStickerBadge';
import { PolySuaraStickerPicker } from '@/components/polysuara/PolySuaraStickerPicker';

describe('PolySuara Comments Suite (TDD)', () => {
  describe('Sticker Token Helpers for Comments', () => {
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
    it('renders PolySuaraStickerBadge with onRemove for comment input preview', () => {
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
      // Should have remove button
      expect(html).toContain('button');
    });

    it('renders PolySuaraStickerPicker with sticker options for comments', () => {
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

  describe('PolySuaraPage Comments Drawer Dual Mode & Sticker Integration', () => {
    const pageFilePath = path.resolve(__dirname, '../pages/polyservices/PolySuaraPage.tsx');
    const pageContent = fs.readFileSync(pageFilePath, 'utf-8');

    it('implements state for comment sticker in PolySuaraPage', () => {
      expect(pageContent).toContain('commentStickerId');
      expect(pageContent).toContain('setCommentStickerId');
      expect(pageContent).toContain('commentStickerPickerOpen');
      expect(pageContent).toContain('setCommentStickerPickerOpen');
    });

    it('embeds comment sticker into comment content and resets it on insert', () => {
      expect(pageContent).toMatch(/embedStickerToken\([^)]*commentStickerId[^)]*\)|commentStickerId\s*\?\s*embedStickerToken/);
      expect(pageContent).toContain('setCommentStickerId(null)');
    });

    it('applies dual Light & Dark mode classes to comments drawer container and header', () => {
      // Drawer container
      expect(pageContent).toContain('bg-white dark:bg-slate-900');
      expect(pageContent).toContain('border-slate-200 dark:border-slate-800');
      expect(pageContent).toContain('text-slate-900 dark:text-white');

      // Drawer close button dual mode
      expect(pageContent).toMatch(/hover:bg-slate-100 dark:hover:bg-slate-800/);
      expect(pageContent).toMatch(/text-slate-500 dark:text-slate-400/);
    });

    it('applies dual mode classes to active confession preview inside drawer', () => {
      expect(pageContent).toContain('bg-slate-50 dark:bg-slate-950/60');
      expect(pageContent).toMatch(/text-slate-700 dark:text-slate-300|text-slate-600 dark:text-slate-400/);
    });

    it('renders comment items with dual mode styling and sticker badges', () => {
      // Comment item card styling
      expect(pageContent).toContain('bg-slate-50 dark:bg-slate-950/40');
      expect(pageContent).toContain('border-slate-200 dark:border-slate-800/60');

      // Sticker badge rendering in comments
      expect(pageContent).toContain('PolySuaraStickerBadge');
      expect(pageContent).toMatch(/extractStickerToken\((?:comment|reply)\.content\)/);
    });

    it('provides sticker picker button and preview in comments input form', () => {
      // Comment input form dual styling
      expect(pageContent).toContain('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800');
      // Sticker trigger button
      expect(pageContent).toContain('Pelekat Kampus');
      expect(pageContent).toContain('setCommentStickerPickerOpen(true)');
      // Sticker picker mounted for comments
      expect(pageContent).toContain('selectedStickerId={commentStickerId}');
    });
  });
});
