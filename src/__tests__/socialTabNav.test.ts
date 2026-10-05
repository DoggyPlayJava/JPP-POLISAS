import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  SocialTabNav,
  SOCIAL_TABS,
  type SocialTabType,
  type SocialTabNavProps,
} from '@/components/polysuara/SocialTabNav';

describe('SocialTabNav Component Suite', () => {
  it('exports SocialTabNav component and SOCIAL_TABS list', () => {
    expect(SocialTabNav).toBeDefined();
    expect(typeof SocialTabNav).toBe('function');
    expect(SOCIAL_TABS).toBeDefined();
    expect(Array.isArray(SOCIAL_TABS)).toBe(true);
    expect(SOCIAL_TABS.length).toBe(3);
    expect(SOCIAL_TABS.map((t) => t.id)).toEqual(['FOR_YOU', 'LATEST', 'TRENDING']);
  });

  it('renders all 3 tabs with designated labels: Untuk Anda, Terkini, Hangat', () => {
    const onChangeTab = vi.fn();
    const html = renderToString(
      React.createElement(SocialTabNav, {
        activeTab: 'FOR_YOU',
        onChangeTab,
      })
    );

    // Labels
    expect(html).toContain('Untuk Anda');
    expect(html).toContain('Terkini');
    expect(html).toContain('Hangat');

    // Tablist container role and styling
    expect(html).toContain('role="tablist"');
    expect(html).toContain('border-b border-slate-200/80 dark:border-white/10');
  });

  it('supports light and dark mode classes on container and buttons', () => {
    const onChangeTab = vi.fn();
    const html = renderToString(
      React.createElement(SocialTabNav, {
        activeTab: 'FOR_YOU',
        onChangeTab,
      })
    );

    // Dark mode border class
    expect(html).toContain('dark:border-white/10');

    // Active tab text classes (Light + Dark)
    expect(html).toContain('text-slate-900');
    expect(html).toContain('dark:text-white');
    expect(html).toContain('font-extrabold');

    // Inactive tab text classes (Light + Dark)
    expect(html).toContain('text-slate-400');
    expect(html).toContain('dark:text-slate-500');
    expect(html).toContain('dark:hover:text-slate-300');
  });

  it('sets aria-selected="true" on the active tab and aria-selected="false" on inactive tabs', () => {
    const onChangeTab = vi.fn();

    // 1. When activeTab is 'FOR_YOU'
    const htmlForYou = renderToString(
      React.createElement(SocialTabNav, {
        activeTab: 'FOR_YOU',
        onChangeTab,
      })
    );
    expect(htmlForYou).toMatch(/aria-selected="true"[^>]*>[\s\S]*?Untuk Anda/);
    expect(htmlForYou).toMatch(/aria-selected="false"[^>]*>[\s\S]*?Terkini/);
    expect(htmlForYou).toMatch(/aria-selected="false"[^>]*>[\s\S]*?Hangat/);

    // 2. When activeTab is 'LATEST'
    const htmlLatest = renderToString(
      React.createElement(SocialTabNav, {
        activeTab: 'LATEST',
        onChangeTab,
      })
    );
    expect(htmlLatest).toMatch(/aria-selected="false"[^>]*>[\s\S]*?Untuk Anda/);
    expect(htmlLatest).toMatch(/aria-selected="true"[^>]*>[\s\S]*?Terkini/);
    expect(htmlLatest).toMatch(/aria-selected="false"[^>]*>[\s\S]*?Hangat/);

    // 3. When activeTab is 'TRENDING'
    const htmlTrending = renderToString(
      React.createElement(SocialTabNav, {
        activeTab: 'TRENDING',
        onChangeTab,
      })
    );
    expect(htmlTrending).toMatch(/aria-selected="false"[^>]*>[\s\S]*?Untuk Anda/);
    expect(htmlTrending).toMatch(/aria-selected="false"[^>]*>[\s\S]*?Terkini/);
    expect(htmlTrending).toMatch(/aria-selected="true"[^>]*>[\s\S]*?Hangat/);
  });

  it('renders the animated indicator with gradient styling only for the active tab', () => {
    const onChangeTab = vi.fn();
    const html = renderToString(
      React.createElement(SocialTabNav, {
        activeTab: 'TRENDING',
        onChangeTab,
      })
    );

    // Active sliding indicator gradient styling
    expect(html).toContain('bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400');
    expect(html).toContain('rounded-full');
  });

  it('calls onChangeTab with LATEST when Terkini tab is clicked', () => {
    const onChangeTab = vi.fn();
    const elementTree = SocialTabNav({
      activeTab: 'FOR_YOU',
      onChangeTab,
    });

    const buttons = React.Children.toArray(elementTree.props.children) as React.ReactElement[];
    expect(buttons.length).toBe(3);

    // Button 1 is LATEST (index 1)
    const latestButton = buttons[1];
    latestButton.props.onClick();

    expect(onChangeTab).toHaveBeenCalledTimes(1);
    expect(onChangeTab).toHaveBeenCalledWith('LATEST');
  });

  it('calls onChangeTab with TRENDING when Hangat tab is clicked', () => {
    const onChangeTab = vi.fn();
    const elementTree = SocialTabNav({
      activeTab: 'FOR_YOU',
      onChangeTab,
    });

    const buttons = React.Children.toArray(elementTree.props.children) as React.ReactElement[];
    // Button 2 is TRENDING (index 2)
    const trendingButton = buttons[2];
    trendingButton.props.onClick();

    expect(onChangeTab).toHaveBeenCalledTimes(1);
    expect(onChangeTab).toHaveBeenCalledWith('TRENDING');
  });

  it('calls onChangeTab with FOR_YOU when Untuk Anda tab is clicked', () => {
    const onChangeTab = vi.fn();
    const elementTree = SocialTabNav({
      activeTab: 'LATEST',
      onChangeTab,
    });

    const buttons = React.Children.toArray(elementTree.props.children) as React.ReactElement[];
    // Button 0 is FOR_YOU (index 0)
    const forYouButton = buttons[0];
    forYouButton.props.onClick();

    expect(onChangeTab).toHaveBeenCalledTimes(1);
    expect(onChangeTab).toHaveBeenCalledWith('FOR_YOU');
  });

  it('applies optional custom className to container', () => {
    const onChangeTab = vi.fn();
    const html = renderToString(
      React.createElement(SocialTabNav, {
        activeTab: 'FOR_YOU',
        onChangeTab,
        className: 'custom-feed-tabs sticky top-0 z-30',
      })
    );

    expect(html).toContain('custom-feed-tabs');
    expect(html).toContain('sticky top-0 z-30');
  });
});
