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

  describe('Inline Active Non-Heart Reaction Pills', () => {
    it('renders non-heart reactions with count > 0 inline with flex-nowrap', () => {
      const { html, tree } = renderComponentTree({
        confessionId: 'conf-301',
        reactions: sampleReactions, // heart(12), laugh(5), fire(8)
        onToggleReaction: vi.fn(),
      });

      // Heart is in the main heart button, laugh & fire are in non-heart pills
      const laughPill = findElements(tree, el => el.props?.['data-testid'] === 'reaction-pill-laugh')[0];
      const firePill = findElements(tree, el => el.props?.['data-testid'] === 'reaction-pill-fire')[0];
      const heartPill = findElements(tree, el => el.props?.['data-testid'] === 'reaction-pill-heart')[0];

      expect(laughPill).toBeDefined();
      expect(firePill).toBeDefined();
      // Heart pill is not duplicated as a separate pill since it's the main button
      expect(heartPill).toBeUndefined();

      expect(laughPill.props.className).toContain('flex-nowrap');
      expect(laughPill.props.className).toContain('shrink-0');
      expect(html).toContain('5');
      expect(html).toContain('8');
    });

    it('clicking non-heart reaction pill toggles reaction', () => {
      const onToggle = vi.fn();
      const { tree } = renderComponentTree({
        confessionId: 'conf-302',
        reactions: sampleReactions,
        onToggleReaction: onToggle,
      });

      const firePill = findElements(tree, el => el.props?.['data-testid'] === 'reaction-pill-fire')[0];
      firePill.props.onClick({ stopPropagation: vi.fn() });

      expect(onToggle).toHaveBeenCalledWith('conf-302', 'fire');
    });

    it('highlights active userReacted non-heart pill with active styles', () => {
      const reactionsWithUserLaugh: ReactionSummary[] = [
        { type: 'heart', emoji: '❤️', count: 1, userReacted: false },
        { type: 'laugh', emoji: '😂', count: 3, userReacted: true },
      ];

      const { tree } = renderComponentTree({
        confessionId: 'conf-303',
        reactions: reactionsWithUserLaugh,
        onToggleReaction: vi.fn(),
      });

      const laughPill = findElements(tree, el => el.props?.['data-testid'] === 'reaction-pill-laugh')[0];
      expect(laughPill.props.className).toContain('bg-rose-500/15');
      expect(laughPill.props.className).toContain('border-rose-500/40');
      expect(laughPill.props.className).toContain('font-bold');
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
