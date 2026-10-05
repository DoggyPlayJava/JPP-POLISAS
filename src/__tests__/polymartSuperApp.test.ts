import React from 'react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
    hasKeusahawananAccess: false,
    isSuperAdmin: false,
  }),
}));

describe('PolyMartLayout SuperApp Modernization', () => {
  it('exports CATEGORY_LIST with valid Lucide icon mapping and no raw emoji strings', async () => {
    const { CATEGORY_LIST } = await import('@/pages/polymart/PolyMartLayout');
    expect(CATEGORY_LIST).toBeDefined();
    expect(CATEGORY_LIST.length).toBe(8);

    // Verify all categories have icon components and clean labels
    CATEGORY_LIST.forEach((cat: any) => {
      expect(cat.key).toBeDefined();
      expect(cat.label).toBeDefined();
      expect(cat.icon).toBeDefined();
      expect(['function', 'object']).toContain(typeof cat.icon);
      // No raw emojis in labels
      expect(cat.label).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    });
  }, 30000);

  it('renders PolyMartLayout with stadium search capsule and discrete circular buttons', async () => {
    const { PolyMartLayout } = await import('@/pages/polymart/PolyMartLayout');
    const { MemoryRouter } = await import('react-router-dom');
    const { renderToString } = await import('react-dom/server');

    const html = renderToString(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/polymart'] },
        React.createElement(PolyMartLayout)
      )
    );

    // Stadium search capsule tokens
    expect(html).toContain('rounded-full');
    expect(html).toContain('border-amber-500/20');

    // Discrete circular button tokens
    expect(html).toContain('w-9 h-9 rounded-full');
    expect(html).toContain('MARKETPLACE');
  }, 30000);
});
