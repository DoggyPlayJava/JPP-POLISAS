import React from 'react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import i18n from '@/lib/i18n';

beforeAll(async () => {
  await i18n.changeLanguage('ms');
});
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';

// Mocks for dependencies used by PolySuaraPage
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

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/supabase', () => {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    range: vi.fn().mockResolvedValue({ data: [], error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: { is_enabled: true }, error: null }),
    single: vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null }),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
  };

  return {
    supabase: {
      from: vi.fn(() => chainable),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ data: { path: 'mock.webp' } }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/mock.webp' } }),
        })),
      },
    },
  };
});

import {
  PolySuaraPage,
  syncReactionToggleState,
  syncDownvoteToggleState,
  type ConfessionVoteState,
} from '@/pages/polyservices/PolySuaraPage';
import DefaultPolySuaraPage from '@/pages/polyservices/PolySuaraPage';
import {
  extractStickerToken,
  embedStickerToken,
  getAnimalAvatarFromCodename,
  aggregateReactions,
  POLISAS_CAMPUS_STICKERS,
  REACTION_EMOJIS,
} from '@/lib/polySuaraHelpers';

describe('PolySuaraPage Suite', () => {
  describe('Module Exports & Component Definition', () => {
    it('exports PolySuaraPage as named and default component', () => {
      expect(PolySuaraPage).toBeDefined();
      expect(typeof PolySuaraPage).toBe('function');
      expect(DefaultPolySuaraPage).toBeDefined();
      expect(typeof DefaultPolySuaraPage).toBe('function');
      expect(PolySuaraPage).toBe(DefaultPolySuaraPage);
    });
  });

  describe('Dual Light & Dark Mode Layout Integration', () => {
    it('renders outer container with smooth transition and Mineral Teal light/dark theme classes', () => {
      const html = renderToString(React.createElement(PolySuaraPage));

      // Container checks
      expect(html).toContain('bg-[#F6FBF9]');
      expect(html).toContain('dark:bg-[#090B0E]');
      expect(html).toContain('text-[#0B2420]');
      expect(html).toContain('dark:text-[#F1F5F9]');
      expect(html).toContain('transition-colors');
    });

    it('renders sticky header with opaque Mineral Teal dual surface and ThemeToggle integration', () => {
      const html = renderToString(React.createElement(PolySuaraPage));

      // Header background (opaque surface — no /95 translucency)
      expect(html).toContain('bg-[#F6FBF9]');
      expect(html).toContain('dark:bg-[#090B0E]');
      expect(html).not.toContain('bg-[#F6FBF9]/95');
      expect(html).toContain('border-[#B8E4DC]/80');
      expect(html).toContain('dark:border-[#252B35]');

      // Theme toggle presence in top navigation
      expect(html).toContain('Tukar Tema');

      // Anon mode indicator
      expect(html).toContain('Anon Mode');
    });

    it('renders Threads-style quick-compose capsule and removes sticker trigger from composer', () => {
      const html = renderToString(React.createElement(PolySuaraPage));

      // Quick-compose capsule prompt text
      expect(html).toContain('Ada luahan atau rahsia kampus?');
      expect(html).toContain('Kongsi secara rahsia...');

      // Action button and aria label
      expect(html).toContain('Luahkan');
      expect(html).toContain('aria-label="Tulis luahan kampus baharu"');

      // Pelekat sticker trigger should NOT be in the composer
      expect(html).not.toContain('<span>Pelekat</span>');

      // Quick-compose capsule styling
      expect(html).toContain('rounded-2xl sm:rounded-3xl');
    });

    it('defines composeModalOpen state and centered modal dialog structure in PolySuaraPage', () => {
      const pageFilePath = path.resolve(__dirname, '../pages/polyservices/PolySuaraPage.tsx');
      const pageContent = fs.readFileSync(pageFilePath, 'utf-8');

      // State check: composeModalOpen defined, composer sticker states removed
      expect(pageContent).toContain('const [composeModalOpen, setComposeModalOpen] = useState(initialComposeModalOpen);');
      expect(pageContent).not.toContain('composerStickerId');
      expect(pageContent).not.toContain('stickerPickerOpen');

      // Modal dialog centered with flexbox viewport wrapper (never colliding translate-x-1/2 with Framer Motion)
      expect(pageContent).toContain('Tulis Luahan Rahsia');
      expect(pageContent).toContain('100% Rahsia');
      expect(pageContent).toContain('fixed inset-0 bg-[#090B0E]/75 z-[99990]');
      expect(pageContent).toContain('flex items-end sm:items-center justify-center');
      expect(pageContent).toContain('max-h-[90dvh]');
      expect(pageContent).not.toContain('sm:-translate-x-1/2');
      expect(pageContent).toContain('z-[99999]');
      expect(pageContent).toContain('pb-28 sm:pb-6');
      expect(pageContent).toContain('rounded-t-[2.5rem] sm:rounded-3xl');
      expect(pageContent).toContain('Kongsi Luahan');
      expect(pageContent).toContain('setComposeModalOpen(false)');
    });

    it('does not render deprecated CampusPulseBar story mood rings track', () => {
      const html = renderToString(React.createElement(PolySuaraPage));

      // Campus pulse bar items should no longer exist
      expect(html).not.toContain('+ Luah');
      expect(html).not.toContain('Exam');
      expect(html).not.toContain('Kafe');
    });

    it('renders X/Threads underline feed navigation bar, Saluran & Tapis drawer button, and adaptive desktop rails', () => {
      const html = renderToString(React.createElement(PolySuaraPage));

      // Clean 3-tab underline bar + Channels & Filters drawer trigger
      expect(html).toContain('Terkini');
      expect(html).toContain('Hangat');
      expect(html).toContain('Dijawab JPP');
      expect(html).toContain('Saluran &amp; Tapis');

      // Localized categories rendered in PolySuaraLeftRail
      expect(html).toContain('Semua');
      expect(html).toContain('Umum');
      expect(html).toContain('Akademik');
      expect(html).toContain('Fasiliti');
      expect(html).toContain('Kamsis');
      expect(html).toContain('Kaunseling');

      // Desktop Rails
      expect(html).toContain('Suara → Tindakan');
      expect(html).toContain('Mod Fokus');

      // Old tabs no longer exist
      expect(html).not.toContain('Untuk Anda');
      expect(html).not.toContain('role="tablist"');
    });

    it('does not render FloatingComposeFab and renders exactly one BottomNav with mobile dock spacer', () => {
      const html = renderToString(React.createElement(PolySuaraPage));

      // FAB should no longer exist
      expect(html).not.toContain('aria-label="Tulis Luahan Rahsia Baharu"');
      expect(html).not.toContain('fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2');

      // Mobile dock spacer
      expect(html).toContain('h-32 md:hidden');

      // Deduplicated BottomNav: exactly 1 instance rendered
      const bottomNavMatches = html.match(/data-testid="mock-bottom-nav"/g);
      expect(bottomNavMatches).toHaveLength(1);
    });
  });

  describe('Sticker and Reaction Helpers Integration with PolySuaraPage', () => {
    it('correctly extracts sticker tokens from confession content for card badges', () => {
      const sampleContent = '[sticker:otak_jem] Otak saya tengah jem nak submit lab malam ni.';
      const { stickerId, cleanContent } = extractStickerToken(sampleContent);

      expect(stickerId).toBe('otak_jem');
      expect(cleanContent).toBe('Otak saya tengah jem nak submit lab malam ni.');

      const matchingSticker = POLISAS_CAMPUS_STICKERS.find(s => s.id === stickerId);
      expect(matchingSticker).toBeDefined();
      expect(matchingSticker?.label).toBe('Otak Jem');
      expect(matchingSticker?.emoji).toBe('🧠💥');
    });

    it('correctly embeds sticker token into composer clean content', () => {
      const userText = 'Jumpa di Dewan Sri Mahkota esok!';
      const embedded = embedStickerToken(userText, 'solidariti');

      expect(embedded).toBe('[sticker:solidariti] Jumpa di Dewan Sri Mahkota esok!');

      // Re-extraction roundtrip
      const extracted = extractStickerToken(embedded);
      expect(extracted.stickerId).toBe('solidariti');
      expect(extracted.cleanContent).toBe(userText);
    });

    it('derives dynamic animal avatar and colors from anonymous codename', () => {
      const kucingAvatar = getAnimalAvatarFromCodename('Kucing Misteri');
      expect(kucingAvatar.emoji).toBe('🐱');
      expect(kucingAvatar.bgClass).toContain('amber');

      const harimauAvatar = getAnimalAvatarFromCodename('Harimau Berani');
      expect(harimauAvatar.emoji).toBe('🐯');
      expect(harimauAvatar.bgClass).toContain('orange');

      const defaultAvatar = getAnimalAvatarFromCodename(undefined);
      expect(defaultAvatar.emoji).toBe('👻');
    });

    it('aggregates raw reactions into summary list for PolySuaraReactions action bar', () => {
      const rawReactions = [
        { reaction_type: 'heart', user_id: 'usr-1' },
        { reaction_type: 'heart', user_id: 'usr-test-123' },
        { reaction_type: 'laugh', user_id: 'usr-2' },
        { reaction_type: 'fire', user_id: 'usr-3' },
        { reaction_type: 'fire', user_id: 'usr-4' },
      ];

      const summaries = aggregateReactions(rawReactions, 'usr-test-123');

      // Heart reaction
      const heart = summaries.find(s => s.type === 'heart');
      expect(heart).toBeDefined();
      expect(heart?.count).toBe(2);
      expect(heart?.userReacted).toBe(true);

      // Laugh reaction
      const laugh = summaries.find(s => s.type === 'laugh');
      expect(laugh).toBeDefined();
      expect(laugh?.count).toBe(1);
      expect(laugh?.userReacted).toBe(false);

      // Fire reaction
      const fire = summaries.find(s => s.type === 'fire');
      expect(fire).toBeDefined();
      expect(fire?.count).toBe(2);
      expect(fire?.userReacted).toBe(false);

      // All 6 emoji types are accounted in constant
      expect(REACTION_EMOJIS).toHaveLength(6);
    });
  });

  describe('Elevated Pipel/Dribbble Confession Card & Action Bar', () => {
    const pageFilePath = path.resolve(__dirname, '../pages/polyservices/PolySuaraPage.tsx');
    const cardFilePath = path.resolve(__dirname, '../components/polysuara/PolySuaraConfessionCard.tsx');
    const pageContent = fs.readFileSync(pageFilePath, 'utf-8');
    const cardContent = fs.readFileSync(cardFilePath, 'utf-8');
    const combinedSrc = `${pageContent}\n${cardContent}`;

    it('cleans confession content with cleanConfessionText and removes sticker badges from cards', () => {
      expect(combinedSrc).toContain('cleanConfessionText(confession.content)');
      expect(combinedSrc).not.toContain('<PolySuaraStickerBadge');
    });

    it('renders elevated floating card container with rounded-[2rem], Mineral Teal tokens, and Media Viewer', () => {
      expect(cardContent).toContain('rounded-[2rem]');
      expect(cardContent).toContain('shadow-[0_4px_24px_rgba(11,36,32,0.04)]');
      expect(cardContent).toContain('dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]');
      expect(cardContent).toContain('<PolySuaraCivicProgress');
      expect(cardContent).toContain('extractCampusLocations(confession.content)');
      expect(cardContent).toContain('FACT_CHECK');
      expect(cardContent).toContain('OFFICIAL_NOTE');
      expect(pageContent).toContain('<PolySuaraMediaViewer');
      expect(pageContent).toContain('<ConfirmDialog');
      expect(pageContent).not.toContain('window.confirm(');
    });

    it('renders avatar with Mineral Teal gradient ring container', () => {
      expect(cardContent).toContain('bg-gradient-to-tr from-[#0F766E] via-[#14B8A6] to-[#2DD4BF]');
      expect(cardContent).toContain('avatar.emoji');
    });

    it('renders verified anonymous identity badge (✓) and author name', () => {
      expect(cardContent).toMatch(/title="Identiti Anon Sah Disahkan"|title=\{t\(['"]services:anon_verified_tooltip['"],\s*['"]Identiti Anon Sah Disahkan['"]\)\}/);
      expect(cardContent).toContain('✓');
      expect(cardContent).toMatch(/formatDistanceToNow\(new Date\(confession\.created_at\)/);
    });

    it('renders modern Mineral Teal category badge chip', () => {
      expect(cardContent).toContain('text-[11px] font-bold px-3 py-1 rounded-full text-[#0F766E] dark:text-[#2DD4BF] bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC]/80 dark:border-[#252B35] shrink-0');
    });

    it('applies refined editorial typography mb-3.5 to confession card content', () => {
      expect(cardContent).toContain('text-[15px] sm:text-base leading-relaxed text-[#0B2420] dark:text-[#F1F5F9] whitespace-pre-wrap font-normal mb-3.5');
    });

    it('renders JPP official note and community fact-check callout with full hairline border', () => {
      expect(cardContent).toContain('rounded-2xl border border-[#0F766E]/25 dark:border-[#2DD4BF]/25');
      expect(cardContent).not.toContain('border-l-2');
    });

    it('renders full social action row with reactions, dislike, comments, deep link, share, and bookmark', () => {
      expect(cardContent).toContain('<PolySuaraReactions');
      expect(cardContent).toContain('ThumbsDown');
      expect(cardContent).toContain('MessageCircle');
      expect(cardContent).toContain('Link2');
      expect(cardContent).toContain('Share2');
      expect(cardContent).toContain('Bookmark');
      expect(cardContent).toContain('onToggleBookmark');
      expect(cardContent).toContain('border-t border-[#B8E4DC]/50 dark:border-[#252B35]');
      expect(pageContent).toContain('<PolySuaraQuickReportModal');
      expect(pageContent).toContain('<PolySuaraMediaViewer');
    });

    it('manages sort, category, format, and bookmark states in PolySuaraPage and removes SocialTabNav', () => {
      expect(pageContent).not.toContain('const [activePulseId, setActivePulseId] = useState');
      expect(pageContent).not.toContain('handleSelectPulse');
      expect(pageContent).not.toContain('SocialTabNav');
      expect(pageContent).toContain('const [activeCategory, setActiveCategory] = useState');
      expect(pageContent).toContain('const [activeFormat, setActiveFormat] = useState');
      expect(pageContent).toContain('const [sortBy, setSortBy] = useState');
      expect(pageContent).toContain('const [bookmarkedIds, setBookmarkedIds] = useState');
    });
  });

  describe('Like (❤️) vs Dislike (👎) Strict Mutual Exclusivity and State Sync', () => {
    it('enforces exact sequence: 28 -> 29 (Like) -> 28 (Dislike cancels Like) -> 29 (Like cancels Dislike) -> 28 (Un-like)', () => {
      const userId = 'usr-test-123';
      const confessionId = 'conf-sync-1';

      let state: ConfessionVoteState = {
        confessions: [{ id: confessionId, upvotes: 28, downvotes: 0 }],
        confessionReactions: {},
        userDownvotes: new Set<string>(),
      };

      // 0. Initial baseline: 28 upvotes, 0 downvotes
      expect(state.confessions[0].upvotes).toBe(28);
      expect(state.confessions[0].downvotes).toBe(0);
      expect(state.userDownvotes.has(confessionId)).toBe(false);

      // 1. User Likes (adds reaction 'heart'): 28 -> 29 upvotes, 0 downvotes
      state = syncReactionToggleState(state, confessionId, 'heart', userId);
      expect(state.confessions[0].upvotes).toBe(29);
      expect(state.confessions[0].downvotes).toBe(0);
      expect(state.userDownvotes.has(confessionId)).toBe(false);
      expect(state.confessionReactions[confessionId]).toEqual([
        { reaction_type: 'heart', user_id: userId },
      ]);

      // 2. User Dislikes (Dislike cancels Like): 29 -> 28 upvotes, 0 -> 1 downvote
      state = syncDownvoteToggleState(state, confessionId, userId);
      expect(state.confessions[0].upvotes).toBe(28);
      expect(state.confessions[0].downvotes).toBe(1);
      expect(state.userDownvotes.has(confessionId)).toBe(true);
      expect(state.confessionReactions[confessionId]).toEqual([]);

      // 3. User Likes again (Like cancels Dislike): 1 -> 0 downvotes, 28 -> 29 upvotes
      state = syncReactionToggleState(state, confessionId, 'heart', userId);
      expect(state.confessions[0].upvotes).toBe(29);
      expect(state.confessions[0].downvotes).toBe(0);
      expect(state.userDownvotes.has(confessionId)).toBe(false);
      expect(state.confessionReactions[confessionId]).toEqual([
        { reaction_type: 'heart', user_id: userId },
      ]);

      // 4. User Un-likes (removes reaction 'heart'): 29 -> 28 upvotes, 0 downvotes
      state = syncReactionToggleState(state, confessionId, 'heart', userId);
      expect(state.confessions[0].upvotes).toBe(28);
      expect(state.confessions[0].downvotes).toBe(0);
      expect(state.userDownvotes.has(confessionId)).toBe(false);
      expect(state.confessionReactions[confessionId]).toEqual([]);
    });

    it('enforces un-downvoting cancels downvote back to 0 without inflating counts', () => {
      const userId = 'usr-test-123';
      const confessionId = 'conf-sync-2';

      let state: ConfessionVoteState = {
        confessions: [{ id: confessionId, upvotes: 15, downvotes: 0 }],
        confessionReactions: {},
        userDownvotes: new Set<string>(),
      };

      // 1. User downvotes -> 1 downvote, 15 upvotes
      state = syncDownvoteToggleState(state, confessionId, userId);
      expect(state.confessions[0].downvotes).toBe(1);
      expect(state.confessions[0].upvotes).toBe(15);
      expect(state.userDownvotes.has(confessionId)).toBe(true);

      // 2. User un-downvotes -> 0 downvotes, 15 upvotes
      state = syncDownvoteToggleState(state, confessionId, userId);
      expect(state.confessions[0].downvotes).toBe(0);
      expect(state.confessions[0].upvotes).toBe(15);
      expect(state.userDownvotes.has(confessionId)).toBe(false);
    });

    it('verifies PolySuaraPage code structure implements mutual exclusivity and state cancellation', () => {
      const pageFilePath = path.resolve(__dirname, '../pages/polyservices/PolySuaraPage.tsx');
      const pageContent = fs.readFileSync(pageFilePath, 'utf-8');

      // handleToggleReaction must cancel downvote and delete from polysuara_downvotes
      expect(pageContent).toContain('const wasDownvoted = userDownvotes.has(confessionId);');
      expect(pageContent).toContain('next.delete(confessionId);');
      expect(pageContent).toContain("from('polysuara_downvotes')");
      expect(pageContent).toContain('Math.max(downs - 1, 0)');

      // handleDownvote must cancel reaction and delete from polysuara_reactions
      expect(pageContent).toContain('const hasAnyReaction = Boolean(existingReaction);');
      expect(pageContent).toContain("from('polysuara_reactions')");
      expect(pageContent).toContain('toggle_polysuara_downvote');
      expect(pageContent).toContain('Math.max(ups - 1, 0)');
    });
  });

  describe('Modal & Comment Drawer Portal Elevation and Navigation Suppression', () => {
    it('renders BottomNav and FloatingAiChat when compose modal and comment drawer are closed', () => {
      const html = renderToString(React.createElement(PolySuaraPage, {
        initialComposeModalOpen: false,
        initialCommentDrawerOpen: false,
      }));

      expect(html).toContain('data-testid="mock-bottom-nav"');
      expect(html).toContain('data-testid="mock-floating-chat"');
    });

    it('suppresses BottomNav and FloatingAiChat when composeModalOpen is true', () => {
      const html = renderToString(React.createElement(PolySuaraPage, {
        initialComposeModalOpen: true,
        initialCommentDrawerOpen: false,
      }));

      expect(html).not.toContain('data-testid="mock-bottom-nav"');
      expect(html).not.toContain('data-testid="mock-floating-chat"');
    });

    it('suppresses BottomNav and FloatingAiChat when commentDrawerOpen is true', () => {
      const html = renderToString(React.createElement(PolySuaraPage, {
        initialComposeModalOpen: false,
        initialCommentDrawerOpen: true,
      }));

      expect(html).not.toContain('data-testid="mock-bottom-nav"');
      expect(html).not.toContain('data-testid="mock-floating-chat"');
    });

    it('suppresses BottomNav and FloatingAiChat when both compose modal and comment drawer are open', () => {
      const html = renderToString(React.createElement(PolySuaraPage, {
        initialComposeModalOpen: true,
        initialCommentDrawerOpen: true,
      }));

      expect(html).not.toContain('data-testid="mock-bottom-nav"');
      expect(html).not.toContain('data-testid="mock-floating-chat"');
    });

    it('wraps Compose Modal and Comment Drawer in createPortal with z-[99990] and z-[99999] elevation', () => {
      const pageFilePath = path.resolve(__dirname, '../pages/polyservices/PolySuaraPage.tsx');
      const pageContent = fs.readFileSync(pageFilePath, 'utf-8');

      // createPortal import and target
      expect(pageContent).toContain("import { createPortal } from 'react-dom';");
      expect(pageContent).toContain('createPortal(');
      expect(pageContent).toContain('document.body');

      // Elevation classes for modal and drawer
      expect(pageContent).toContain('fixed inset-0 bg-[#090B0E]/75 z-[99990]');
      expect(pageContent).toContain('z-[99999]');

      // Conditional suppression check
      expect(pageContent).toContain('!composeModalOpen && !commentDrawerOpen');
      expect(pageContent).toContain('?post=');
      expect(pageContent).toContain('<PolySuaraLeftRail');
      expect(pageContent).toContain('<PolySuaraRightRail');
    });
  });

  describe('1-Hour Self-Delete Feature for Confessions', () => {
    const pageFilePath = path.resolve(__dirname, '../pages/polyservices/PolySuaraPage.tsx');
    const cardFilePath = path.resolve(__dirname, '../components/polysuara/PolySuaraConfessionCard.tsx');
    const pageContent = fs.readFileSync(pageFilePath, 'utf-8');
    const cardContent = fs.readFileSync(cardFilePath, 'utf-8');
    const combinedSrc = `${pageContent}\n${cardContent}`;

    it('defines handleDeleteConfession with 1-hour time check and tombstone update in PolySuaraPage', () => {
      expect(pageContent).toContain('handleDeleteConfession');
      expect(pageContent).toContain('isWithin1Hour');
      expect(pageContent).toContain("content: '[deleted]'");
      expect(pageContent).toContain('is_deleted_by_author: true');
      expect(combinedSrc).toContain('telah memadamkan ruangan ini');
    });

    it('renders "Padam Luahan" button when confession was created within 1 hour by author', () => {
      const confessionId = 'conf-recent-1';
      const recentTimestamp = new Date(Date.now() - 20 * 60 * 1000).toISOString(); // 20 mins ago

      const html = renderToString(React.createElement(PolySuaraPage, {
        initialConfessions: [{
          id: confessionId,
          content: 'Luahan baharu dalam tempoh satu jam.',
          category: 'UMUM',
          created_at: recentTimestamp,
          codename: 'Kucing Oren',
          upvotes: 5,
          downvotes: 0,
          comments_count: 0,
        }],
        initialMyConfessions: new Set([confessionId]),
      }));

      expect(html).toContain('Padam Luahan');
      expect(html).toContain('aria-label="Padam Luahan"');
      expect(html).toContain('Luahan baharu dalam tempoh satu jam.');
    });

    it('does NOT render "Padam Luahan" button when confession is older than 1 hour', () => {
      const confessionId = 'conf-old-1';
      const oldTimestamp = new Date(Date.now() - 90 * 60 * 1000).toISOString(); // 90 mins ago

      const html = renderToString(React.createElement(PolySuaraPage, {
        initialConfessions: [{
          id: confessionId,
          content: 'Luahan lama yang telah melebihi tempoh satu jam.',
          category: 'UMUM',
          created_at: oldTimestamp,
          codename: 'Kucing Oren',
          upvotes: 12,
          downvotes: 0,
          comments_count: 0,
        }],
        initialMyConfessions: new Set([confessionId]),
      }));

      expect(html).not.toContain('Padam Luahan');
      expect(html).not.toContain('aria-label="Padam Luahan"');
      expect(html).toContain('Luahan lama yang telah melebihi tempoh satu jam.');
    });

    it('renders tombstone message and disables Like/Dislike interactions when confession is deleted by author', () => {
      const confessionId = 'conf-deleted-1';
      const recentTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const html = renderToString(React.createElement(PolySuaraPage, {
        initialConfessions: [{
          id: confessionId,
          content: '[deleted]',
          is_deleted_by_author: true,
          category: 'UMUM',
          created_at: recentTimestamp,
          codename: 'Musang Cerdik',
          upvotes: 0,
          downvotes: 0,
          comments_count: 0,
        }],
        initialMyConfessions: new Set([confessionId]),
      }));

      // Tombstone message with exact text and styling
      expect(html).toContain('Musang Cerdik telah memadamkan ruangan ini');
      expect(html).toContain('text-[#3B635C] dark:text-[#94A0B2] italic text-sm');

      // Actions are disabled on deleted confessions
      expect(html).toContain('aria-label="Suka (Dinyahdayakan)"');
      expect(html).toContain('aria-label="Tidak setuju (Dinyahdayakan)"');
      expect(html).toContain('cursor-not-allowed');

      // Padam button is NOT shown on already deleted confession
      expect(html).not.toContain('Padam Luahan');
    });
  });
});

