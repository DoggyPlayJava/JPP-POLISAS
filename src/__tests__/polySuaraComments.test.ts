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

// Mock document for SSR createPortal rendering in Node environment
if (typeof document === 'undefined') {
  (global as any).document = {
    createElement: () => ({}),
    body: {},
  };
}

// Mocks for dependencies used when rendering PolySuaraPage comments drawer
vi.mock('react-dom', async () => {
  const actual = await vi.importActual<any>('react-dom');
  return {
    ...actual,
    createPortal: (node: any) => node,
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: {
      id: 'usr-test-123',
      role: 'STUDENT',
      full_name: 'Siswa Ujian',
    },
  }),
}));

vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    isSubscribed: true,
    requestPermission: vi.fn(),
    unsubscribe: vi.fn(),
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
  }),
}));

vi.mock('@/lib/notifications', () => ({
  sendNotificationToKebajikanExco: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/components/layout/BottomNav', () => ({
  BottomNav: () => React.createElement('div', { 'data-testid': 'mock-bottom-nav' }),
}));

vi.mock('@/components/ai/FloatingAiChat', () => ({
  FloatingAiChat: () => React.createElement('div', { 'data-testid': 'mock-floating-chat' }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { is_enabled: true }, error: null }),
      single: vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

import { PolySuaraPage } from '@/pages/polyservices/PolySuaraPage';

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

    it('uses cleanConfessionText to clean comments and drawer preview', () => {
      expect(pageContent).toContain('cleanConfessionText(comment.content)');
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

      // Nested replies hairline thread line with compact 12px indentation
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
      expect(pageContent).toContain('rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 p-1.5 flex items-center gap-2');
      expect(pageContent).toContain('placeholder="Tulis ulasan sulit anda..."');
      expect(pageContent).not.toContain('Pelekat Kampus');
      expect(pageContent).toContain('Tanda sebagai Sensitif (Blur)');
    });
  });

  describe('Phase 2: Friendly Animal Personas & 4-Depth Nested Comments Layout', () => {
    const pageFilePath = path.resolve(__dirname, '../pages/polyservices/PolySuaraPage.tsx');
    const pageContent = fs.readFileSync(pageFilePath, 'utf-8');

    it('maps comments and active confession to friendly animal personas', () => {
      expect(pageContent).toContain('getFriendlyAnonName(comment.codename)');
      expect(pageContent).toContain('getFriendlyAnonName(activeConfessionForComments.codename)');
      expect(pageContent).toContain('persona.displayName');
      expect(pageContent).toContain('persona.emoji');
      expect(pageContent).toContain('persona.bgClass');
    });

    it('supports 4-depth nested threaded replies with compact 12px indentation', () => {
      expect(pageContent).toContain('Math.min(depth + 1, 4)');
      expect(pageContent).toContain('border-l-2 border-slate-200 dark:border-white/10 pl-3 ml-2 mt-2 space-y-2.5');
    });

    it('auto-tags parent username in reply input', () => {
      expect(pageContent).toContain('setReplyingToCommentId(comment.id)');
      expect(pageContent).toContain('setReplyCommentText(`@${displayName} `)');
    });

    it('renders Threads-style clean micro-actions and typography', () => {
      // Squircle persona avatar
      expect(pageContent).toMatch(/rounded-xl flex items-center justify-center shrink-0 text-sm/);

      // Generous line-height typography
      expect(pageContent).toContain('leading-relaxed text-sm text-slate-800 dark:text-slate-200');

      // Discrete ··· action trigger
      expect(pageContent).toContain('···');
      expect(pageContent).toContain('title="Pilihan ulasan"');

      // Micro-heart like button
      expect(pageContent).toContain('aria-label="Suka ulasan"');
      expect(pageContent).toContain('comment.upvotes || 0');

      // Subtle Balas button
      expect(pageContent).toContain('aria-label="Balas komen"');
      expect(pageContent).toContain('<MessageCircle className="w-3.5 h-3.5" />');
    });
  });

  describe('1-Hour Self-Delete Feature for Comments', () => {
    const pageFilePath = path.resolve(__dirname, '../pages/polyservices/PolySuaraPage.tsx');
    const pageContent = fs.readFileSync(pageFilePath, 'utf-8');

    it('defines handleDeleteComment with 1-hour time check and tombstone update in PolySuaraPage', () => {
      expect(pageContent).toContain('handleDeleteComment');
      expect(pageContent).toContain('isWithin1Hour');
      expect(pageContent).toContain("content: '[deleted]'");
      expect(pageContent).toContain('is_deleted_by_author: true');
      expect(pageContent).toContain('telah memadamkan ruangan ini');
    });

    it('renders "Padam Ulasan" option when comment was created within 1 hour by author', () => {
      const recentTimestamp = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 mins ago
      const confessionId = 'conf-drawer-1';
      const commentId = 'comm-recent-1';

      const html = renderToString(React.createElement(PolySuaraPage, {
        initialCommentDrawerOpen: true,
        initialActiveConfession: {
          id: confessionId,
          content: 'Confession dengan ulasan terkini',
          codename: 'Kucing Oren',
          category: 'UMUM',
        },
        initialComments: [{
          id: commentId,
          confession_id: confessionId,
          user_id: 'usr-test-123',
          content: 'Ulasan baharu saya yang boleh dipadam.',
          codename: 'Musang Cerdik',
          created_at: recentTimestamp,
          upvotes: 2,
          downvotes: 0,
        }],
      }));

      expect(html).toContain('Padam Ulasan');
      expect(html).toContain('aria-label="Padam Ulasan"');
      expect(html).toContain('Ulasan baharu saya yang boleh dipadam.');
    });

    it('does NOT render "Padam Ulasan" option when comment is older than 1 hour', () => {
      const oldTimestamp = new Date(Date.now() - 75 * 60 * 1000).toISOString(); // 75 mins ago
      const confessionId = 'conf-drawer-2';
      const commentId = 'comm-old-1';

      const html = renderToString(React.createElement(PolySuaraPage, {
        initialCommentDrawerOpen: true,
        initialActiveConfession: {
          id: confessionId,
          content: 'Confession dengan ulasan lama',
          codename: 'Kucing Oren',
          category: 'UMUM',
        },
        initialComments: [{
          id: commentId,
          confession_id: confessionId,
          user_id: 'usr-test-123',
          content: 'Ulasan lama yang melebihi satu jam.',
          codename: 'Musang Cerdik',
          created_at: oldTimestamp,
          upvotes: 4,
          downvotes: 0,
        }],
      }));

      expect(html).not.toContain('Padam Ulasan');
      expect(html).not.toContain('aria-label="Padam Ulasan"');
      expect(html).toContain('Ulasan lama yang melebihi satu jam.');
    });

    it('renders tombstone message and disables reply and like actions when comment is deleted by author', () => {
      const recentTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const confessionId = 'conf-drawer-3';
      const commentId = 'comm-deleted-1';

      const html = renderToString(React.createElement(PolySuaraPage, {
        initialCommentDrawerOpen: true,
        initialActiveConfession: {
          id: confessionId,
          content: 'Confession dengan ulasan dipadam',
          codename: 'Kucing Oren',
          category: 'UMUM',
        },
        initialComments: [{
          id: commentId,
          confession_id: confessionId,
          user_id: 'usr-test-123',
          content: '[deleted]',
          is_deleted_by_author: true,
          codename: 'Tupai Laju',
          created_at: recentTimestamp,
          upvotes: 0,
          downvotes: 0,
        }],
      }));

      // Tombstone message with exact text and styling
      expect(html).toContain('Tupai Laju telah memadamkan ruangan ini');
      expect(html).toContain('text-slate-400 dark:text-slate-500 italic text-xs');

      // Reply and Like actions are disabled on deleted comment
      expect(html).toContain('aria-label="Balas komen"');
      expect(html).toContain('aria-label="Suka ulasan"');
      expect(html).toContain('cursor-not-allowed');

      // Padam option is NOT shown on already deleted comment
      expect(html).not.toContain('Padam Ulasan');
    });
  });
});
