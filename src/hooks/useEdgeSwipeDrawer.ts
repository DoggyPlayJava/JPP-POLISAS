import { useEffect, useRef } from 'react';

export interface EdgeSwipeSample {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  viewportWidth: number;
}

const MIN_START_X = 24;
const MAX_START_X = 75;
const MIN_DELTA_X = 55;
const HORIZONTAL_RATIO = 2.2;
const MOBILE_MAX_VIEWPORT = 1024;

const EXCLUDED_SELECTOR =
  '.leaflet-container, [data-no-swipe], [role="dialog"], [aria-modal="true"], [data-radix-popper-content-wrapper], input, textarea, select, [contenteditable="true"]';

export function evaluateEdgeSwipeGesture(sample: EdgeSwipeSample): boolean {
  if (sample.viewportWidth >= MOBILE_MAX_VIEWPORT) return false;
  if (sample.startX < MIN_START_X || sample.startX > MAX_START_X) return false;

  const dx = sample.endX - sample.startX;
  const dy = sample.endY - sample.startY;
  if (dx <= MIN_DELTA_X) return false;
  if (Math.abs(dx) <= HORIZONTAL_RATIO * Math.abs(dy)) return false;

  return true;
}

type StyleReader = (el: HTMLElement) => { overflowX?: string };

export function isSwipeTargetExcluded(
  target: EventTarget | null,
  readStyle?: StyleReader
): boolean {
  if (!target || typeof target !== 'object') return false;
  const el = target as HTMLElement;

  if (typeof el.closest === 'function' && el.closest(EXCLUDED_SELECTOR)) {
    return true;
  }

  const getStyle: StyleReader | null =
    readStyle ||
    (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function'
      ? (node) => window.getComputedStyle(node)
      : null);

  let current: HTMLElement | null = el;
  let depth = 0;
  while (current && depth < 12) {
    if (
      typeof current.scrollWidth === 'number' &&
      typeof current.clientWidth === 'number' &&
      current.scrollWidth > current.clientWidth + 4
    ) {
      const overflowX = getStyle ? getStyle(current)?.overflowX : '';
      if (overflowX === 'auto' || overflowX === 'scroll') {
        return true;
      }
    }
    current = current.parentElement;
    depth += 1;
  }

  return false;
}

export interface UseEdgeSwipeDrawerOptions {
  enabled?: boolean;
  isOpen: boolean;
  onOpen: () => void;
}

/**
 * Guarded passive non-edge swipe drawer hook for mobile Portal/Dashboard sidebars.
 * Starts strictly inside 24–75px (clearing iOS Safari's 0–23px native swipe-back zone)
 * and never calls preventDefault(), avoiding interference with browser navigation or scrolling.
 */
export function useEdgeSwipeDrawer({
  enabled = true,
  isOpen,
  onOpen,
}: UseEdgeSwipeDrawerOptions): void {
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!enabled || isOpen || typeof window === 'undefined') return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        tracking = false;
        return;
      }
      if (window.innerWidth >= MOBILE_MAX_VIEWPORT) {
        tracking = false;
        return;
      }
      // Abort if any modal/dialog overlay is currently mounted in the document
      if (document.querySelector('[role="dialog"], [aria-modal="true"]')) {
        tracking = false;
        return;
      }
      const touch = event.touches[0];
      if (touch.clientX < MIN_START_X || touch.clientX > MAX_START_X) {
        tracking = false;
        return;
      }
      if (isSwipeTargetExcluded(event.target)) {
        tracking = false;
        return;
      }
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = true;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!tracking || event.changedTouches.length === 0) return;
      tracking = false;
      const touch = event.changedTouches[0];
      const matched = evaluateEdgeSwipeGesture({
        startX,
        startY,
        endX: touch.clientX,
        endY: touch.clientY,
        viewportWidth: window.innerWidth,
      });
      if (matched) {
        onOpenRef.current();
      }
    };

    const handleTouchCancel = () => {
      tracking = false;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [enabled, isOpen]);
}
