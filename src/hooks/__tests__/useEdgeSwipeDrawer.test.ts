import { describe, it, expect } from 'vitest';
import {
  evaluateEdgeSwipeGesture,
  isSwipeTargetExcluded,
} from '../useEdgeSwipeDrawer';

describe('useEdgeSwipeDrawer gesture guards', () => {
  describe('evaluateEdgeSwipeGesture', () => {
    it('accepts a clean horizontal left-to-right swipe starting in the 24–75px safe zone', () => {
      expect(
        evaluateEdgeSwipeGesture({
          startX: 38,
          startY: 300,
          endX: 112,
          endY: 312,
          viewportWidth: 393,
        })
      ).toBe(true);
    });

    it('rejects swipes starting in the iOS Safari native swipe-back edge (0–23px)', () => {
      expect(
        evaluateEdgeSwipeGesture({
          startX: 10,
          startY: 300,
          endX: 120,
          endY: 305,
          viewportWidth: 393,
        })
      ).toBe(false);

      expect(
        evaluateEdgeSwipeGesture({
          startX: 23,
          startY: 300,
          endX: 120,
          endY: 300,
          viewportWidth: 393,
        })
      ).toBe(false);
    });

    it('rejects swipes starting past 75px from the left edge', () => {
      expect(
        evaluateEdgeSwipeGesture({
          startX: 76,
          startY: 300,
          endX: 200,
          endY: 300,
          viewportWidth: 393,
        })
      ).toBe(false);
    });

    it('rejects short drags (dx <= 55px) and right-to-left swipes', () => {
      expect(
        evaluateEdgeSwipeGesture({
          startX: 40,
          startY: 300,
          endX: 95,
          endY: 300,
          viewportWidth: 393,
        })
      ).toBe(false);

      expect(
        evaluateEdgeSwipeGesture({
          startX: 60,
          startY: 300,
          endX: 10,
          endY: 300,
          viewportWidth: 393,
        })
      ).toBe(false);
    });

    it('rejects diagonal or vertical scrolls where |dx| <= 2.2 * |dy|', () => {
      expect(
        evaluateEdgeSwipeGesture({
          startX: 40,
          startY: 300,
          endX: 110, // dx = 70
          endY: 340, // dy = 40 -> 2.2 * 40 = 88 > 70
          viewportWidth: 393,
        })
      ).toBe(false);
    });

    it('rejects desktop viewports (>= 1024px)', () => {
      expect(
        evaluateEdgeSwipeGesture({
          startX: 40,
          startY: 300,
          endX: 130,
          endY: 302,
          viewportWidth: 1280,
        })
      ).toBe(false);
    });
  });

  describe('isSwipeTargetExcluded', () => {
    const makeNode = (opts: {
      tag?: string;
      matches?: string[];
      scrollWidth?: number;
      clientWidth?: number;
      overflowX?: string;
      parent?: any;
    }) => ({
      tagName: (opts.tag || 'DIV').toUpperCase(),
      closest: (selector: string) =>
        (opts.matches || []).some((m) => selector.includes(m)) ? {} : null,
      scrollWidth: opts.scrollWidth ?? 100,
      clientWidth: opts.clientWidth ?? 100,
      parentElement: opts.parent ?? null,
      __overflowX: opts.overflowX ?? 'visible',
    });

    it('excludes Leaflet maps, data-no-swipe regions, form controls, and open modals', () => {
      expect(isSwipeTargetExcluded(makeNode({ matches: ['.leaflet-container'] }) as any)).toBe(true);
      expect(isSwipeTargetExcluded(makeNode({ matches: ['[data-no-swipe]'] }) as any)).toBe(true);
      expect(isSwipeTargetExcluded(makeNode({ matches: ['[role="dialog"]'] }) as any)).toBe(true);
      expect(isSwipeTargetExcluded(makeNode({ matches: ['[aria-modal="true"]'] }) as any)).toBe(true);
      expect(isSwipeTargetExcluded(makeNode({ tag: 'INPUT', matches: ['input'] }) as any)).toBe(true);
    });

    it('excludes horizontally scrollable carousel containers', () => {
      const scrollableParent = makeNode({
        scrollWidth: 800,
        clientWidth: 360,
        overflowX: 'auto',
      });
      const card = makeNode({ parent: scrollableParent });

      expect(
        isSwipeTargetExcluded(card as any, (el: any) => ({
          overflowX: el.__overflowX || 'visible',
        }))
      ).toBe(true);
    });

    it('allows normal vertical page content', () => {
      const wrapper = makeNode({ scrollWidth: 393, clientWidth: 393, overflowX: 'hidden' });
      const child = makeNode({ parent: wrapper });

      expect(
        isSwipeTargetExcluded(child as any, (el: any) => ({
          overflowX: el.__overflowX || 'visible',
        }))
      ).toBe(false);
    });
  });
});
