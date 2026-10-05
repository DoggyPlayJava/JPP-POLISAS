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

describe('PolySuaraReactions Component Suite', () => {
  const sampleReactions: ReactionSummary[] = [
    { type: 'heart', emoji: '❤️', count: 12, userReacted: true },
    { type: 'laugh', emoji: '😂', count: 5, userReacted: false },
    { type: 'fire', emoji: '🔥', count: 8, userReacted: false },
  ];

  describe('Component Exports & Basic Structure', () => {
    it('exports PolySuaraReactions as named and default export', () => {
      expect(PolySuaraReactions).toBeDefined();
      expect(typeof PolySuaraReactions).toBe('function');
      expect(DefaultPolySuaraReactions).toBeDefined();
      expect(PolySuaraReactions).toBe(DefaultPolySuaraReactions);
    });

    it('renders reaction trigger button with minimum 44px mobile touch target and tooltip', () => {
      const onToggle = vi.fn();
      const { html, tree } = renderComponentTree({
        confessionId: 'conf-101',
        reactions: sampleReactions,
        onToggleReaction: onToggle,
      });

      // HTML contains accessibility title/tooltip "Beri Reaksi"
      expect(html).toContain('Beri Reaksi');
      expect(html).toContain('min-h-[44px]');
      expect(html).toContain('min-w-[44px]');

      // Tree has trigger button
      const triggerBtn = findElements(tree, el => el.props?.['data-testid'] === 'reaction-trigger-btn')[0];
      expect(triggerBtn).toBeDefined();
      expect(triggerBtn.props.title).toBe('Beri Reaksi');
      expect(typeof triggerBtn.props.onClick).toBe('function');
    });

    it('renders active and inactive reaction pills for counts > 0', () => {
      const onToggle = vi.fn();
      const { html, tree } = renderComponentTree({
        confessionId: 'conf-101',
        reactions: sampleReactions,
        onToggleReaction: onToggle,
      });

      // Shows counts 12, 5, 8
      expect(html).toContain('12');
      expect(html).toContain('5');
      expect(html).toContain('8');

      // 3 reaction pills rendered
      const pills = findElements(tree, el => el.props?.['data-testid']?.startsWith('reaction-pill-'));
      expect(pills.length).toBe(3);
    });
  });

  describe('Reaction Popover & Emoji Selection', () => {
    it('opens floating reaction popover displaying all 6 reaction emojis when open', () => {
      const onToggle = vi.fn();
      const { html, tree } = renderComponentTree({
        confessionId: 'conf-101',
        reactions: sampleReactions,
        onToggleReaction: onToggle,
        defaultOpen: true,
      });

      // Popover container exists
      const popover = findElements(tree, el => el.props?.['data-testid'] === 'reaction-popover')[0];
      expect(popover).toBeDefined();

      // All 6 emojis are present in the popover
      REACTION_EMOJIS.forEach(item => {
        expect(html).toContain(item.emoji);
        const emojiBtn = findElements(tree, el => el.props?.['data-testid'] === `reaction-emoji-${item.type}`)[0];
        expect(emojiBtn).toBeDefined();
        expect(typeof emojiBtn.props.onClick).toBe('function');
      });
    });

    it('clicking trigger button opens and toggles the floating reaction popover', () => {
      let openState = false;
      const onOpenChange = vi.fn((next: boolean) => {
        openState = next;
      });

      const { tree } = renderComponentTree({
        confessionId: 'conf-101',
        reactions: sampleReactions,
        onToggleReaction: vi.fn(),
        isOpen: openState,
        onOpenChange,
      });

      const triggerBtn = findElements(tree, el => el.props?.['data-testid'] === 'reaction-trigger-btn')[0];
      expect(triggerBtn).toBeDefined();

      // Trigger click toggles popover
      triggerBtn.props.onClick({ stopPropagation: vi.fn() });
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    it('clicking an emoji in the popover calls onToggleReaction(confessionId, reactionType) and closes popover', () => {
      const onToggle = vi.fn();
      const onOpenChange = vi.fn();

      const { tree } = renderComponentTree({
        confessionId: 'conf-202',
        reactions: sampleReactions,
        onToggleReaction: onToggle,
        defaultOpen: true,
        isOpen: true,
        onOpenChange,
      });

      // Click on fire emoji
      const fireBtn = findElements(tree, el => el.props?.['data-testid'] === 'reaction-emoji-fire')[0];
      expect(fireBtn).toBeDefined();

      fireBtn.props.onClick({ stopPropagation: vi.fn() });

      // Verifies onToggleReaction was called with correct confessionId and reactionType
      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onToggle).toHaveBeenCalledWith('conf-202', 'fire');

      // Verifies popover is requested to close
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('clicking outside / backdrop overlay closes the popover', () => {
      const onOpenChange = vi.fn();
      const { tree } = renderComponentTree({
        confessionId: 'conf-202',
        reactions: sampleReactions,
        onToggleReaction: vi.fn(),
        defaultOpen: true,
        isOpen: true,
        onOpenChange,
      });

      const backdrop = findElements(tree, el => el.props?.['data-testid'] === 'reaction-backdrop')[0];
      expect(backdrop).toBeDefined();

      backdrop.props.onClick({ stopPropagation: vi.fn() });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Reaction Pills & Highlight Styling', () => {
    it('clicking an existing reaction pill calls onToggleReaction(confessionId, reactionType)', () => {
      const onToggle = vi.fn();
      const { tree } = renderComponentTree({
        confessionId: 'conf-303',
        reactions: sampleReactions,
        onToggleReaction: onToggle,
      });

      // Find the 'heart' pill
      const heartPill = findElements(tree, el => el.props?.['data-testid'] === 'reaction-pill-heart')[0];
      expect(heartPill).toBeDefined();

      heartPill.props.onClick({ stopPropagation: vi.fn() });
      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onToggle).toHaveBeenCalledWith('conf-303', 'heart');

      // Find the 'laugh' pill
      const laughPill = findElements(tree, el => el.props?.['data-testid'] === 'reaction-pill-laugh')[0];
      expect(laughPill).toBeDefined();

      laughPill.props.onClick({ stopPropagation: vi.fn() });
      expect(onToggle).toHaveBeenCalledTimes(2);
      expect(onToggle).toHaveBeenCalledWith('conf-303', 'laugh');
    });

    it('highlights active reactions (userReacted: true) with active border, tint, and bold text', () => {
      const { tree } = renderComponentTree({
        confessionId: 'conf-404',
        reactions: sampleReactions,
        onToggleReaction: vi.fn(),
      });

      const heartPill = findElements(tree, el => el.props?.['data-testid'] === 'reaction-pill-heart')[0];
      const laughPill = findElements(tree, el => el.props?.['data-testid'] === 'reaction-pill-laugh')[0];

      // Heart pill (userReacted: true) must have active highlight classes
      expect(heartPill.props.className).toContain('bg-rose-500/15');
      expect(heartPill.props.className).toContain('border-rose-500/40');
      expect(heartPill.props.className).toContain('text-rose-600');
      expect(heartPill.props.className).toContain('dark:text-rose-400');
      expect(heartPill.props.className).toContain('font-bold');

      // Laugh pill (userReacted: false) must NOT have active bold or rose border
      expect(laughPill.props.className).not.toContain('border-rose-500/40');
      expect(laughPill.props.className).not.toContain('font-bold');
    });
  });

  describe('Light & Dark Mode Classes', () => {
    it('supports dual light and dark mode classes on popover container and pills', () => {
      const { html } = renderComponentTree({
        confessionId: 'conf-505',
        reactions: sampleReactions,
        onToggleReaction: vi.fn(),
        defaultOpen: true,
      });

      // Popover dual mode container classes
      expect(html).toContain('bg-white/95');
      expect(html).toContain('dark:bg-slate-900/95');
      expect(html).toContain('border-slate-200/90');
      expect(html).toContain('dark:border-white/15');
      expect(html).toContain('shadow-xl');
      expect(html).toContain('dark:shadow-2xl');
      expect(html).toContain('backdrop-blur-2xl');

      // Pills dark mode text and border
      expect(html).toContain('dark:text-rose-400');
      expect(html).toContain('dark:border-white/10');
    });
  });
});
