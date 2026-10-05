import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  CampusPulseBar,
  DEFAULT_PULSE_ITEMS,
  type PulseItem,
  type CampusPulseBarProps,
} from '@/components/polysuara/CampusPulseBar';

describe('CampusPulseBar Component Suite', () => {
  it('exports CampusPulseBar component and DEFAULT_PULSE_ITEMS list', () => {
    expect(CampusPulseBar).toBeDefined();
    expect(typeof CampusPulseBar).toBe('function');
    expect(DEFAULT_PULSE_ITEMS).toBeDefined();
    expect(Array.isArray(DEFAULT_PULSE_ITEMS)).toBe(true);
    expect(DEFAULT_PULSE_ITEMS.length).toBeGreaterThanOrEqual(6);
  });

  it('renders horizontal pulse bar with all specified pulse items', () => {
    const onSelectPulse = vi.fn();
    const onOpenCompose = vi.fn();

    const html = renderToString(
      React.createElement(CampusPulseBar, {
        activePulseId: 'all',
        onSelectPulse,
        onOpenCompose,
      })
    );

    // Track classes
    expect(html).toContain('flex items-center gap-3.5 sm:gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x');

    // Specified pulse item labels
    expect(html).toContain('+ Luah');
    expect(html).toContain('Hangat');
    expect(html).toContain('Exam');
    expect(html).toContain('Kamsis');
    expect(html).toContain('Kafe');
    expect(html).toContain('Aduan');

    // Specified emojis
    expect(html).toContain('✍️');
    expect(html).toContain('⚡');
    expect(html).toContain('📚');
    expect(html).toContain('🏠');
    expect(html).toContain('🍔');
    expect(html).toContain('💬');
  });

  it('renders dual light and dark mode classes on bubble avatars and labels', () => {
    const html = renderToString(
      React.createElement(CampusPulseBar, {
        activePulseId: 'all',
        onSelectPulse: vi.fn(),
        onOpenCompose: vi.fn(),
      })
    );

    // Inner avatar background classes
    expect(html).toContain('bg-white');
    expect(html).toContain('dark:bg-slate-900');

    // Label text color classes
    expect(html).toContain('text-slate-700');
    expect(html).toContain('dark:text-slate-300');
    expect(html).toContain('text-[11px] sm:text-xs font-bold text-center mt-1');
  });

  it('highlights the active bubble with elevated glow and active ring styling', () => {
    const htmlActiveExam = renderToString(
      React.createElement(CampusPulseBar, {
        activePulseId: 'exam',
        onSelectPulse: vi.fn(),
        onOpenCompose: vi.fn(),
      })
    );

    // Elevated glow styling for active pulse
    expect(htmlActiveExam).toContain('shadow-[0_0_15px_rgba(244,63,94,0.35)]');
    expect(htmlActiveExam).toContain('ring-2 ring-rose-500/50');
  });

  it('renders a small + badge icon for the create pulse item (+ Luah)', () => {
    const html = renderToString(
      React.createElement(CampusPulseBar, {
        activePulseId: 'all',
        onSelectPulse: vi.fn(),
        onOpenCompose: vi.fn(),
      })
    );

    // Check presence of create badge
    expect(html).toContain('+');
  });

  it('calls onOpenCompose when clicking the create pulse item (+ Luah)', () => {
    const onSelectPulse = vi.fn();
    const onOpenCompose = vi.fn();

    const elementTree = CampusPulseBar({
      activePulseId: 'all',
      onSelectPulse,
      onOpenCompose,
    });

    // The element tree is a container div with children buttons
    const children = React.Children.toArray(elementTree.props.children) as React.ReactElement[];
    expect(children.length).toBe(DEFAULT_PULSE_ITEMS.length);

    // Find the create item
    const createItemIndex = DEFAULT_PULSE_ITEMS.findIndex((item) => item.isCreate);
    expect(createItemIndex).toBeGreaterThanOrEqual(0);

    const createButton = children[createItemIndex];
    createButton.props.onClick();

    expect(onOpenCompose).toHaveBeenCalledTimes(1);
    expect(onSelectPulse).not.toHaveBeenCalled();
  });

  it('calls onSelectPulse with id and categoryFilter when clicking a topic pulse bubble (Exam)', () => {
    const onSelectPulse = vi.fn();
    const onOpenCompose = vi.fn();

    const elementTree = CampusPulseBar({
      activePulseId: 'all',
      onSelectPulse,
      onOpenCompose,
    });

    const children = React.Children.toArray(elementTree.props.children) as React.ReactElement[];

    // Find 'exam' item
    const examIndex = DEFAULT_PULSE_ITEMS.findIndex((item) => item.id === 'exam');
    expect(examIndex).toBeGreaterThanOrEqual(0);

    const examButton = children[examIndex];
    examButton.props.onClick();

    expect(onSelectPulse).toHaveBeenCalledTimes(1);
    expect(onSelectPulse).toHaveBeenCalledWith('exam', 'AKADEMIK');
    expect(onOpenCompose).not.toHaveBeenCalled();
  });

  it('calls onSelectPulse with id and undefined categoryFilter for trending topic bubble', () => {
    const onSelectPulse = vi.fn();
    const onOpenCompose = vi.fn();

    const elementTree = CampusPulseBar({
      activePulseId: 'all',
      onSelectPulse,
      onOpenCompose,
    });

    const children = React.Children.toArray(elementTree.props.children) as React.ReactElement[];

    // Find 'trending' item
    const trendingIndex = DEFAULT_PULSE_ITEMS.findIndex((item) => item.id === 'trending');
    expect(trendingIndex).toBeGreaterThanOrEqual(0);

    const trendingButton = children[trendingIndex];
    trendingButton.props.onClick();

    expect(onSelectPulse).toHaveBeenCalledTimes(1);
    expect(onSelectPulse).toHaveBeenCalledWith('trending', undefined);
  });
});
