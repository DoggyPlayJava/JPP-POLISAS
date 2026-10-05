import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { POLISAS_CAMPUS_STICKERS } from '@/lib/polySuaraHelpers';
import {
  PolySuaraStickerBadge,
  PolySuaraStickerBadgeProps,
} from '@/components/polysuara/PolySuaraStickerBadge';
import DefaultPolySuaraStickerBadge from '@/components/polysuara/PolySuaraStickerBadge';
import {
  PolySuaraStickerPicker,
  PolySuaraStickerPickerProps,
} from '@/components/polysuara/PolySuaraStickerPicker';
import DefaultPolySuaraStickerPicker from '@/components/polysuara/PolySuaraStickerPicker';

// Helper to inspect the React tree returned by PolySuaraStickerBadge
function renderBadgeTree(props: PolySuaraStickerBadgeProps) {
  let captured: React.ReactElement | null = null;
  function Harness() {
    captured = PolySuaraStickerBadge(props);
    return captured;
  }
  const html = renderToString(React.createElement(Harness));
  return { tree: captured as unknown as React.ReactElement | null, html };
}

// Helper to inspect the React tree returned by PolySuaraStickerPicker
function renderPickerTree(props: PolySuaraStickerPickerProps) {
  let captured: React.ReactElement | null = null;
  function Harness() {
    captured = PolySuaraStickerPicker(props);
    return captured;
  }
  const html = renderToString(React.createElement(Harness));
  return { tree: captured as unknown as React.ReactElement | null, html };
}

// Recursive element finder
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

describe('PolySuara Campus Stickers Suite', () => {
  describe('PolySuaraStickerBadge', () => {
    it('exports PolySuaraStickerBadge as named and default export', () => {
      expect(PolySuaraStickerBadge).toBeDefined();
      expect(typeof PolySuaraStickerBadge).toBe('function');
      expect(DefaultPolySuaraStickerBadge).toBeDefined();
      expect(PolySuaraStickerBadge).toBe(DefaultPolySuaraStickerBadge);
    });

    it('renders matching emoji, label, and phrase for a valid stickerId (otak_jem)', () => {
      const { html, tree } = renderBadgeTree({ stickerId: 'otak_jem' });
      expect(tree).not.toBeNull();
      expect(html).toContain('Otak Jem');
      expect(html).toContain('🧠');

      const emojiEl = findElements(tree, (el) => el.props?.['data-testid'] === 'sticker-badge-emoji')[0];
      const labelEl = findElements(tree, (el) => el.props?.['data-testid'] === 'sticker-badge-label')[0];
      const phraseEl = findElements(tree, (el) => el.props?.['data-testid'] === 'sticker-badge-phrase')[0];

      expect(emojiEl).toBeDefined();
      expect(emojiEl.props.children).toContain('🧠');
      expect(labelEl).toBeDefined();
      expect(labelEl.props.children).toBe('Otak Jem');
      expect(phraseEl).toBeDefined();
      expect(phraseEl.props.children).toBe('Assignment overload & mental fatigue');
    });

    it('renders correctly for all 8 campus stickers in POLISAS_CAMPUS_STICKERS', () => {
      expect(POLISAS_CAMPUS_STICKERS.length).toBe(8);

      for (const item of POLISAS_CAMPUS_STICKERS) {
        const { html, tree } = renderBadgeTree({ stickerId: item.id });
        expect(tree).not.toBeNull();
        expect(html).toContain(item.label);

        const phraseEl = findElements(tree, (el) => el.props?.['data-testid'] === 'sticker-badge-phrase')[0];
        expect(phraseEl).toBeDefined();
        expect(phraseEl.props.children).toBe(item.phrase);
      }
    });

    it('returns null safely when an unknown stickerId is passed', () => {
      const { html, tree } = renderBadgeTree({ stickerId: 'invalid_sticker_xyz' });
      expect(tree).toBeNull();
      expect(html).toBe('');
    });

    it('calls onRemove when the remove button is clicked', () => {
      const onRemove = vi.fn();
      const { tree } = renderBadgeTree({ stickerId: 'otak_jem', onRemove });

      const removeBtn = findElements(
        tree,
        (el) => el.props?.['data-testid'] === 'sticker-badge-remove-btn'
      )[0];
      expect(removeBtn).toBeDefined();

      const stopPropagation = vi.fn();
      removeBtn.props.onClick({ stopPropagation });

      expect(stopPropagation).toHaveBeenCalled();
      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it('does not render remove button when onRemove is omitted', () => {
      const { tree } = renderBadgeTree({ stickerId: 'otak_jem' });
      const removeBtn = findElements(
        tree,
        (el) => el.props?.['data-testid'] === 'sticker-badge-remove-btn'
      )[0];
      expect(removeBtn).toBeUndefined();
    });

    it('supports sm, md, and lg sizes with corresponding styling', () => {
      const sm = renderBadgeTree({ stickerId: 'pakat_makan', size: 'sm' });
      const md = renderBadgeTree({ stickerId: 'pakat_makan', size: 'md' });
      const lg = renderBadgeTree({ stickerId: 'pakat_makan', size: 'lg' });

      expect(sm.tree?.props?.['data-size']).toBe('sm');
      expect(md.tree?.props?.['data-size']).toBe('md');
      expect(lg.tree?.props?.['data-size']).toBe('lg');

      expect(sm.html).toContain('text-xs');
      expect(lg.html).toContain('text-2xl');
    });

    it('includes dual light and dark mode classes with high contrast', () => {
      const { html } = renderBadgeTree({ stickerId: 'exam_mood' });
      expect(html).toContain('text-slate-800');
      expect(html).toContain('dark:text-slate-100');
    });
  });

  describe('PolySuaraStickerPicker', () => {
    it('exports PolySuaraStickerPicker as named and default export', () => {
      expect(PolySuaraStickerPicker).toBeDefined();
      expect(typeof PolySuaraStickerPicker).toBe('function');
      expect(DefaultPolySuaraStickerPicker).toBeDefined();
      expect(PolySuaraStickerPicker).toBe(DefaultPolySuaraStickerPicker);
    });

    it('does not render when isOpen is false', () => {
      const { html, tree } = renderPickerTree({
        isOpen: false,
        onClose: vi.fn(),
        onSelectSticker: vi.fn(),
      });
      expect(tree).toBeNull();
      expect(html).toBe('');
    });

    it('renders modal dialog and all 8 stickers when isOpen is true', () => {
      const { html, tree } = renderPickerTree({
        isOpen: true,
        onClose: vi.fn(),
        onSelectSticker: vi.fn(),
      });

      expect(tree).not.toBeNull();
      const modal = findElements(tree, (el) => el.props?.['data-testid'] === 'sticker-picker-dialog')[0];
      expect(modal).toBeDefined();

      for (const sticker of POLISAS_CAMPUS_STICKERS) {
        expect(html).toContain(sticker.label);
        const itemBtn = findElements(
          tree,
          (el) => el.props?.['data-testid'] === `sticker-item-${sticker.id}`
        )[0];
        expect(itemBtn).toBeDefined();
      }
    });

    it('renders category filter tabs (SEMUA, STUDY, MOOD, CAMPUS, MEME) and filters stickers accordingly', () => {
      const { tree: allTree } = renderPickerTree({
        isOpen: true,
        onClose: vi.fn(),
        onSelectSticker: vi.fn(),
      });

      const categories = ['SEMUA', 'STUDY', 'MOOD', 'CAMPUS', 'MEME'] as const;
      categories.forEach((cat) => {
        const tab = findElements(
          allTree,
          (el) => el.props?.['data-testid'] === `sticker-category-tab-${cat}`
        )[0];
        expect(tab).toBeDefined();
      });

      // Filter by STUDY category
      const { tree: studyTree } = renderPickerTree({
        isOpen: true,
        onClose: vi.fn(),
        onSelectSticker: vi.fn(),
        defaultCategory: 'STUDY',
      });

      const studyItem1 = findElements(studyTree, (el) => el.props?.['data-testid'] === 'sticker-item-exam_mood')[0];
      const studyItem2 = findElements(studyTree, (el) => el.props?.['data-testid'] === 'sticker-item-deadline_esok')[0];
      const memeItem = findElements(studyTree, (el) => el.props?.['data-testid'] === 'sticker-item-relatable')[0];

      expect(studyItem1).toBeDefined();
      expect(studyItem2).toBeDefined();
      expect(memeItem).toBeUndefined();

      // Filter by MEME category
      const { tree: memeTree } = renderPickerTree({
        isOpen: true,
        onClose: vi.fn(),
        onSelectSticker: vi.fn(),
        defaultCategory: 'MEME',
      });

      const memeItem1 = findElements(memeTree, (el) => el.props?.['data-testid'] === 'sticker-item-relatable')[0];
      const memeItem2 = findElements(memeTree, (el) => el.props?.['data-testid'] === 'sticker-item-geng_repeat')[0];
      const campusItem = findElements(memeTree, (el) => el.props?.['data-testid'] === 'sticker-item-pakat_makan')[0];

      expect(memeItem1).toBeDefined();
      expect(memeItem2).toBeDefined();
      expect(campusItem).toBeUndefined();
    });

    it('clicking a sticker calls onSelectSticker(stickerId) and onClose()', () => {
      const onSelect = vi.fn();
      const onClose = vi.fn();

      const { tree } = renderPickerTree({
        isOpen: true,
        onClose,
        onSelectSticker: onSelect,
      });

      const deadlineBtn = findElements(
        tree,
        (el) => el.props?.['data-testid'] === 'sticker-item-deadline_esok'
      )[0];
      expect(deadlineBtn).toBeDefined();

      deadlineBtn.props.onClick();

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith('deadline_esok');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('highlights currently selected sticker when selectedStickerId matches', () => {
      const { tree } = renderPickerTree({
        isOpen: true,
        onClose: vi.fn(),
        onSelectSticker: vi.fn(),
        selectedStickerId: 'otak_jem',
      });

      const selectedItem = findElements(
        tree,
        (el) => el.props?.['data-testid'] === 'sticker-item-otak_jem'
      )[0];
      const otherItem = findElements(
        tree,
        (el) => el.props?.['data-testid'] === 'sticker-item-pakat_makan'
      )[0];

      expect(selectedItem.props.className).toContain('ring-2');
      expect(selectedItem.props.className).toContain('ring-rose-500');
      expect(otherItem.props.className).not.toContain('ring-2');

      const indicator = findElements(
        selectedItem,
        (el) => el.props?.['data-testid'] === 'sticker-selected-indicator'
      )[0];
      expect(indicator).toBeDefined();
    });

    it('close button and backdrop overlay dismiss the picker by calling onClose()', () => {
      const onClose = vi.fn();
      const { tree } = renderPickerTree({
        isOpen: true,
        onClose,
        onSelectSticker: vi.fn(),
      });

      const closeBtn = findElements(
        tree,
        (el) => el.props?.['data-testid'] === 'sticker-picker-close-btn'
      )[0];
      expect(closeBtn).toBeDefined();
      closeBtn.props.onClick();
      expect(onClose).toHaveBeenCalledTimes(1);

      const backdrop = findElements(
        tree,
        (el) => el.props?.['data-testid'] === 'sticker-picker-backdrop'
      )[0];
      expect(backdrop).toBeDefined();
      backdrop.props.onClick();
      expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('enforces minimum 44px touch targets on buttons and dual light/dark mode classes', () => {
      const { html } = renderPickerTree({
        isOpen: true,
        onClose: vi.fn(),
        onSelectSticker: vi.fn(),
      });

      // Touch targets
      expect(html).toContain('min-h-[44px]');

      // Dual mode classes
      expect(html).toContain('bg-white');
      expect(html).toContain('dark:bg-slate-900');
      expect(html).toContain('border-slate-200');
      expect(html).toContain('dark:border-white/10');
      expect(html).toContain('text-slate-900');
      expect(html).toContain('dark:text-white');
    });
  });
});
