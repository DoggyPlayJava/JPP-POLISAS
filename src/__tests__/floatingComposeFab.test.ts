import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  FloatingComposeFab,
  type FloatingComposeFabProps,
} from '@/components/polysuara/FloatingComposeFab';

describe('FloatingComposeFab Component Suite', () => {
  it('exports FloatingComposeFab component function', () => {
    expect(FloatingComposeFab).toBeDefined();
    expect(typeof FloatingComposeFab).toBe('function');
  });

  it('renders button with accessible label (aria-label)', () => {
    const onClick = vi.fn();
    const html = renderToString(
      React.createElement(FloatingComposeFab, { onClick })
    );

    // Accessible label for screen readers
    const hasAccessibleLabel =
      html.includes('aria-label="Tulis Luahan Rahsia Baharu"') ||
      html.includes('aria-label="Tulis Luahan"');
    expect(hasAccessibleLabel).toBe(true);

    // Accessible role or title
    expect(html).toContain('role="button"');
  });

  it('has radiant gradient background class', () => {
    const onClick = vi.fn();
    const html = renderToString(
      React.createElement(FloatingComposeFab, { onClick })
    );

    expect(html).toContain('from-rose-600');
    expect(html).toContain('via-pink-500');
    expect(html).toContain('to-rose-400');
  });

  it('contains Plus icon inside the button', () => {
    const onClick = vi.fn();
    const html = renderToString(
      React.createElement(FloatingComposeFab, { onClick })
    );

    // SVG icon rendered with Lucide Plus attributes
    expect(html).toContain('<svg');
    expect(html).toContain('lucide-plus');
  });

  it('renders with fixed center positioning above BottomNav dock', () => {
    const onClick = vi.fn();
    const html = renderToString(
      React.createElement(FloatingComposeFab, { onClick })
    );

    // Positioning and hardware acceleration classes
    expect(html).toContain('fixed');
    expect(html).toContain('bottom-24');
    expect(html).toContain('sm:bottom-28');
    expect(html).toContain('left-1/2');
    expect(html).toContain('-translate-x-1/2');
    expect(html).toContain('z-40');
    expect(html).toContain('transform-gpu');
  });

  it('renders circular button with dimensions, shadow, and interaction classes', () => {
    const onClick = vi.fn();
    const html = renderToString(
      React.createElement(FloatingComposeFab, { onClick })
    );

    expect(html).toContain('w-14 h-14');
    expect(html).toContain('sm:w-16 sm:h-16');
    expect(html).toContain('rounded-full');
    expect(html).toContain('shadow-[0_8px_25px_rgba(244,63,94,0.45)]');
    expect(html).toContain('border border-white/25');
    expect(html).toContain('active:scale-90');
    expect(html).toContain('transition-transform');
  });

  it('renders an ambient glowing aura behind the button', () => {
    const onClick = vi.fn();
    const html = renderToString(
      React.createElement(FloatingComposeFab, { onClick })
    );

    // Ambient aura element with blur and pulse
    expect(html).toContain('blur-');
    expect(html).toContain('animate-pulse');
  });

  it('calls onClick prop when button is clicked', () => {
    const onClick = vi.fn();
    const element = FloatingComposeFab({ onClick });

    // The root or the button element inside should have onClick
    if (element.props.onClick) {
      element.props.onClick();
    } else {
      // Find button child
      const children = React.Children.toArray(element.props.children) as React.ReactElement[];
      const buttonChild = children.find((c) => c && c.props && typeof c.props.onClick === 'function');
      expect(buttonChild).toBeDefined();
      buttonChild?.props.onClick();
    }

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies optional custom className prop', () => {
    const onClick = vi.fn();
    const html = renderToString(
      React.createElement(FloatingComposeFab, {
        onClick,
        className: 'custom-fab-override md:hidden',
      })
    );

    expect(html).toContain('custom-fab-override');
    expect(html).toContain('md:hidden');
  });
});
