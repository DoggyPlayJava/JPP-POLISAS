import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    order: vi.fn().mockReturnThis(),
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

import { PolySuaraPage } from '@/pages/polyservices/PolySuaraPage';
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
    it('renders outer container with smooth transition and light/dark theme classes', () => {
      const html = renderToString(React.createElement(PolySuaraPage));

      // Container checks
      expect(html).toContain('bg-slate-50');
      expect(html).toContain('dark:bg-slate-950');
      expect(html).toContain('text-slate-900');
      expect(html).toContain('dark:text-slate-100');
      expect(html).toContain('transition-colors');
    });

    it('renders sticky header with dual glass background and ThemeToggle integration', () => {
      const html = renderToString(React.createElement(PolySuaraPage));

      // Header background
      expect(html).toContain('bg-white/85');
      expect(html).toContain('dark:bg-slate-950/80');
      expect(html).toContain('border-slate-200/80');
      expect(html).toContain('dark:border-white/5');

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

    it('defines composeModalOpen state and modal dialog structure in PolySuaraPage', () => {
      const pageFilePath = path.resolve(__dirname, '../pages/polyservices/PolySuaraPage.tsx');
      const pageContent = fs.readFileSync(pageFilePath, 'utf-8');

      // State check: composeModalOpen defined, composer sticker states removed
      expect(pageContent).toContain('const [composeModalOpen, setComposeModalOpen] = useState(false);');
      expect(pageContent).not.toContain('composerStickerId');
      expect(pageContent).not.toContain('stickerPickerOpen');

      // Modal dialog elements
      expect(pageContent).toContain('Tulis Luahan Rahsia');
      expect(pageContent).toContain('100% Rahsia');
      expect(pageContent).toContain('fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200]');
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

    it('renders Executive Single-Line Feed Navigation Track with sort pills and category chips', () => {
      const html = renderToString(React.createElement(PolySuaraPage));

      // Sort segmented pills
      expect(html).toContain('Terkini');
      expect(html).toContain('Hangat');

      // Hairline divider
      expect(html).toContain('w-px h-5 bg-slate-200 dark:bg-white/10 shrink-0');

      // Category filter chips
      expect(html).toContain('Semua');
      expect(html).toContain('Akademik');
      expect(html).toContain('Fasiliti');
      expect(html).toContain('Kamsis');
      expect(html).toContain('Kaunseling');

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
    const pageContent = fs.readFileSync(pageFilePath, 'utf-8');

    it('cleans confession content with cleanConfessionText and removes sticker badges from cards', () => {
      expect(pageContent).toContain('cleanConfessionText(confession.content)');
      expect(pageContent).not.toContain('<PolySuaraStickerBadge');
    });

    it('renders elevated floating card container with rounded-[2rem] and modern shadows', () => {
      expect(pageContent).toContain('rounded-[2rem]');
      expect(pageContent).toContain('shadow-[0_8px_30px_rgb(0,0,0,0.04)]');
      expect(pageContent).toContain('dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]');
    });

    it('renders avatar with neon gradient ring container', () => {
      expect(pageContent).toContain('bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400');
      expect(pageContent).toContain('avatar.emoji');
    });

    it('renders verified anonymous identity badge (✓) and author name', () => {
      expect(pageContent).toContain('title="Identiti Anon Sah Disahkan"');
      expect(pageContent).toContain('✓');
      expect(pageContent).toMatch(/formatDistanceToNow\(new Date\(confession\.created_at\)/);
    });

    it('renders modern uppercase category badge chip', () => {
      expect(pageContent).toContain('text-[10px] uppercase font-black tracking-wider px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 shrink-0');
    });

    it('applies refined editorial typography mb-3.5 to confession card content', () => {
      expect(pageContent).toContain('text-[15px] sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-normal mb-3.5');
    });

    it('renders JPP official reply with clean quote callout styling', () => {
      expect(pageContent).toContain('border-l-2 border-teal-500 bg-teal-50 dark:bg-teal-500/[0.04] p-3.5 rounded-r-2xl');
    });

    it('renders full social action row with reactions, dislike, comments, share, and bookmark', () => {
      expect(pageContent).toContain('<PolySuaraReactions');
      expect(pageContent).toContain('ThumbsDown');
      expect(pageContent).toContain('MessageCircle');
      expect(pageContent).toContain('Share2');
      expect(pageContent).toContain('Bookmark');
      expect(pageContent).toContain('toggleBookmark');
      expect(pageContent).toContain('flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-white/5 flex-nowrap overflow-x-auto scrollbar-none');
    });

    it('manages sort, category filter, and bookmark states in PolySuaraPage and removes SocialTabNav', () => {
      expect(pageContent).not.toContain('const [activePulseId, setActivePulseId] = useState');
      expect(pageContent).not.toContain('handleSelectPulse');
      expect(pageContent).not.toContain('SocialTabNav');
      expect(pageContent).toContain('const [activeCategory, setActiveCategory] = useState');
      expect(pageContent).toContain('const [sortBy, setSortBy] = useState');
      expect(pageContent).toContain('const [bookmarkedIds, setBookmarkedIds] = useState');
    });
  });
});
