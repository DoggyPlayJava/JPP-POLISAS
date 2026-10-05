import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { REACTION_EMOJIS, ReactionSummary } from '@/lib/polySuaraHelpers';
import { PolySuaraReactions, PolySuaraReactionsProps } from '@/components/polysuara/PolySuaraReactions';
import DefaultPolySuaraReactions from '@/components/polysuara/PolySuaraReactions';

// Helper to inspect the React tree returned by PolySuaraReactions with active React dispatcher
function renderComponentTree(props: PolySuaraReactionsProps) {
  let captured: React.ReactElement | null = null;
  function Harness() {
    captured = PolySuaraReactions(props);
    return captured;
  }
  const html = renderToString(React.createElement(Harness));
  return { tree: captured as unknown as React.ReactElement, html };
}

// Recursive finder for React virtual elements matching a predicate
function findElements(node: any, predicate: (element: any) => boolean, results: any[] = []): any[] {
  if (!node) return results;
  if (Array.isArray(node)) {
    for (const item of node) {
      findElements(item, predicate, results);
    }
    return results;
  }
  if (typeof node !== 'object') return results;
  if (predicate(node)) {
    results.push(node);
  }
  if (node.props && node.props.children) {
    findElements(node.props.children, predicate, results);
  }
  return results;
}

describe('PolySuaraReactions One-Tap Heart & Popover Suite', () => {
  const sampleReactions: ReactionSummary[] = [
    { type: 'heart', emoji: '❤️', count: 12, userReacted: true },
    { type: 'laugh', emoji: '😂', count: 5, userReacted: false },
    { type: 'fire', emoji: '🔥', count: 8, userReacted: false },
  ];

  describe('Component Exports & Layout Architecture', () => {
    it('exports PolySuaraReactions as named and default export', () => {
      expect(PolySuaraReactions).toBeDefined();
      expect(typeof PolySuaraReactions).toBe('function');
      expect(DefaultPolySuaraReactions).toBeDefined();
      expect(PolySuaraReactions).toBe(DefaultPolySuaraReactions);
    });

    it('renders outer container with flex-nowrap and shrink-0 to prevent line breaks', () => {
      const { tree } = renderComponentTree({
        confessionId: 'conf-1',
        reactions: sampleReactions,
        onToggleReaction: vi.fn(),
      });
      expect(tree.props.className).toContain('flex-nowrap');
      expect(tree.props.className).toContain('shrink-0');
    });
  });

  describe('One-Tap Heart (❤️) Like Button', () => {
    it('renders one-tap Heart Like button with count inline and without line breaks', () => {
      const { html, tree } = renderComponentTree({
        confessionId: 'conf-101',
        reactions: [{ type: 'heart', emoji: '❤️', label: 'Suka', count: 29, userReacted: false }],
        totalUpvotes: 29,
        onToggleReaction: vi.fn(),
      });

      // The count must be rendered inline with heart button
      expect(html).toContain('29');

      const heartBtn = findElements(tree, el => el.props?.['data-testid'] === 'reaction-heart-btn')[0];
      expect(heartBtn).toBeDefined();
      expect(heartBtn.props.className).toContain('flex-nowrap');
      expect(heartBtn.props.className).toContain('shrink-0');
      expect(heartBtn.props.title).toBe('Suka luahan ini');
    });

    it('falls back to totalUpvotes when heart reaction count is 0 or absent', () => {
      const { html, tree } = renderComponentTree({
        confessionId: 'conf-102',
        reactions: [],
        totalUpvotes: 42,
        onToggleReaction: vi.fn(),
      });

      expect(html).toContain('42');
      const heartBtn = findElements(tree, el => el.props?.['data-testid'] === 'reaction-heart-btn')[0];
      expect(heartBtn).toBeDefined();
      expect(heartBtn.props['aria-label']).toContain('42');
    });

    it('toggles heart reaction on single tap of the Heart button', () => {
      const onToggle = vi.fn();
      const { tree } = renderComponentTree({
        confessionId: 'conf-103',
        reactions: [{ type: 'heart', emoji: '❤️', label: 'Suka', count: 5, userReacted: false }],
        onToggleReaction: onToggle,
      });

      const heartBtn = findElements(tree, el => el.props?.['data-testid'] === 'reaction-heart-btn')[0];
      expect(heartBtn).toBeDefined();

      heartBtn.props.onClick({ stopPropagation: vi.fn() });
      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onToggle).toHaveBeenCalledWith('conf-103', 'heart');
    });

    it('highlights heart button with active styling when userReacted is true', () => {
      const { tree } = renderComponentTree({
        confessionId: 'conf-104',
        reactions: [{ type: 'heart', emoji: '❤️', label: 'Suka', count: 12, userReacted: true }],
        onToggleReaction: vi.fn(),
      });

      const heartBtn = findElements(tree, el => el.props?.['data-testid'] === 'reaction-heart-btn')[0];
      expect(heartBtn).toBeDefined();
      expect(heartBtn.props.className).toMatch(/bg-rose-500/);
    });
  });

  describe('Reaction Menu Trigger & WhatsApp Popover', () => {
    it('renders reaction menu trigger button right beside the heart', () => {
      const { tree } = renderComponentTree({
        confessionId: 'conf-201',
        reactions: sampleReactions,
        onToggleReaction: vi.fn(),
      });

      const menuTrigger = findElements(tree, el => el.props?.['data-testid'] === 'reaction-menu-trigger')[0];
      expect(menuTrigger).toBeDefined();
      expect(menuTrigger.props.title).toBe('Pilih reaksi lain');
    });

    it('opens popover when reaction menu trigger is clicked', () => {
      let openState = false;
      const onOpenChange = vi.fn((next: boolean) => {
        openState = next;
      });

      const { tree } = renderComponentTree({
        confessionId: 'conf-202',
        reactions: sampleReactions,
        onToggleReaction: vi.fn(),
        isOpen: openState,
        onOpenChange,
      });

      const menuTrigger = findElements(tree, el => el.props?.['data-testid'] === 'reaction-menu-trigger')[0];
      menuTrigger.props.onClick({ stopPropagation: vi.fn() });
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    it('renders all 6 emojis in popover when open', () => {
      const { html, tree } = renderComponentTree({
        confessionId: 'conf-203',
        reactions: sampleReactions,
        onToggleReaction: vi.fn(),
        defaultOpen: true,
      });

      const popover = findElements(tree, el => el.props?.['data-testid'] === 'reaction-popover')[0];
      expect(popover).toBeDefined();

      REACTION_EMOJIS.forEach(item => {
        expect(html).toContain(item.emoji);
        const emojiBtn = findElements(tree, el => el.props?.['data-testid'] === `reaction-emoji-${item.type}`)[0];
        expect(emojiBtn).toBeDefined();
      });
    });

    it('selecting an emoji calls onToggleReaction and closes popover', () => {
      const onToggle = vi.fn();
      const onOpenChange = vi.fn();

      const { tree } = renderComponentTree({
        confessionId: 'conf-204',
        reactions: sampleReactions,
        onToggleReaction: onToggle,
        isOpen: true,
        onOpenChange,
      });

      const fireBtn = findElements(tree, el => el.props?.['data-testid'] === 'reaction-emoji-fire')[0];
      expect(fireBtn).toBeDefined();

      fireBtn.props.onClick({ stopPropagation: vi.fn() });
      expect(onToggle).toHaveBeenCalledWith('conf-204', 'fire');
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('clicking backdrop overlay closes popover', () => {
      const onOpenChange = vi.fn();
      const { tree } = renderComponentTree({
        confessionId: 'conf-205',
        reactions: sampleReactions,
        onToggleReaction: vi.fn(),
        isOpen: true,
        onOpenChange,
      });

      const backdrop = findElements(tree, el => el.props?.['data-testid'] === 'reaction-backdrop')[0];
      expect(backdrop).toBeDefined();

      backdrop.props.onClick({ stopPropagation: vi.fn() });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Stacked Community Emoji Badges & Dynamic User Reaction', () => {
    it('renders stacked community badges with top emojis and total count when diverse reactions exist', () => {
      const { html, tree } = renderComponentTree({
        confessionId: 'conf-301',
        reactions: sampleReactions, // heart(12), fire(8), laugh(5) -> total 25
        onToggleReaction: vi.fn(),
      });

      const summaryBadge = findElements(tree, el => el.props?.['data-testid'] === 'reactions-summary-badge')[0];
      expect(summaryBadge).toBeDefined();
      expect(summaryBadge.props.className).toContain('shrink-0');

      const heartStacked = findElements(tree, el => el.props?.['data-testid'] === 'stacked-emoji-heart')[0];
      const fireStacked = findElements(tree, el => el.props?.['data-testid'] === 'stacked-emoji-fire')[0];
      const laughStacked = findElements(tree, el => el.props?.['data-testid'] === 'stacked-emoji-laugh')[0];

      expect(heartStacked).toBeDefined();
      expect(fireStacked).toBeDefined();
      expect(laughStacked).toBeDefined();

      // Total count across all reactions (12 + 5 + 8 = 25)
      expect(html).toContain('25');
    });

    it('transforms main button to chosen reaction emoji and toggles it off on click', () => {
      const onToggle = vi.fn();
      const reactionsWithUserLaugh: ReactionSummary[] = [
        { type: 'heart', emoji: '❤️', label: 'Suka', count: 1, userReacted: false },
        { type: 'laugh', emoji: '😂', label: 'Lawak', count: 3, userReacted: true },
      ];

      const { tree, html } = renderComponentTree({
        confessionId: 'conf-302',
        reactions: reactionsWithUserLaugh,
        onToggleReaction: onToggle,
      });

      const mainBtn = findElements(tree, el => el.props?.['data-testid'] === 'reaction-heart-btn')[0];
      expect(mainBtn).toBeDefined();
      // Transformed to laugh reaction styling
      expect(mainBtn.props.className).toContain('bg-amber-500/15');
      expect(mainBtn.props.className).toContain('text-amber-600');
      expect(html).toContain('😂');

      // Clicking un-reacts the laugh reaction
      mainBtn.props.onClick({ stopPropagation: vi.fn() });
      expect(onToggle).toHaveBeenCalledWith('conf-302', 'laugh');
    });

    it('transforms main button to fire emoji with orange styling when user reacts with fire', () => {
      const onToggle = vi.fn();
      const reactionsWithUserFire: ReactionSummary[] = [
        { type: 'fire', emoji: '🔥', label: 'Padu', count: 4, userReacted: true },
      ];

      const { tree, html } = renderComponentTree({
        confessionId: 'conf-303',
        reactions: reactionsWithUserFire,
        onToggleReaction: onToggle,
      });

      const mainBtn = findElements(tree, el => el.props?.['data-testid'] === 'reaction-heart-btn')[0];
      expect(mainBtn).toBeDefined();
      expect(mainBtn.props.className).toContain('bg-orange-500/15');
      expect(mainBtn.props.className).toContain('text-orange-600');
      expect(html).toContain('🔥');

      mainBtn.props.onClick({ stopPropagation: vi.fn() });
      expect(onToggle).toHaveBeenCalledWith('conf-303', 'fire');
    });
  });

  describe('Light & Dark Mode Classes', () => {
    it('supports dual light and dark mode classes on popover container', () => {
      const { html } = renderComponentTree({
        confessionId: 'conf-401',
        reactions: sampleReactions,
        onToggleReaction: vi.fn(),
        defaultOpen: true,
      });

      expect(html).toContain('bg-white/95');
      expect(html).toContain('dark:bg-slate-900/95');
      expect(html).toContain('border-slate-200/90');
      expect(html).toContain('dark:border-white/15');
      expect(html).toContain('backdrop-blur-2xl');
    });
  });
});
