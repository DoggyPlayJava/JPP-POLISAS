import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import fs from 'fs';
import path from 'path';
import { JppCommandPalette } from '@/components/jpp/JppCommandPalette';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog-root">{children}</div> : null),
  DialogContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  DialogTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    profile: { full_name: 'Test Leader', jpp_position: 'YDP', role: 'JPP' },
    isSuperAdmin: true,
  }),
}));

vi.mock('@/contexts/JppConfigContext', () => ({
  useJppConfig: () => ({
    unitConfig: {
      KPP: { shortLabel: 'KPP', fullLabel: 'Kelab & Perpaduan', color: '#F87171', isActive: true },
      KEUSAHAWANAN: { shortLabel: 'Keusahawanan', fullLabel: 'Perniagaan & POS', color: '#F59E0B', isActive: true },
    },
    unitOrder: ['KPP', 'KEUSAHAWANAN'],
  }),
}));

describe('JppCommandPalette', () => {
  const componentPath = path.resolve(__dirname, '../components/jpp/JppCommandPalette.tsx');
  const sourceCode = fs.readFileSync(componentPath, 'utf8');

  it('renders command palette items when open', () => {
    const html = renderToString(
      <MemoryRouter>
        <JppCommandPalette open={true} onOpenChange={() => {}} />
      </MemoryRouter>
    );

    expect(html).toContain('Cari apa-apa sahaja di JPP HQ');
    expect(html).toContain('Kelab &amp; Perpaduan');
    expect(html).toContain('Perniagaan &amp; POS');
  });

  it('renders nothing when open is false', () => {
    const html = renderToString(
      <MemoryRouter>
        <JppCommandPalette open={false} onOpenChange={() => {}} />
      </MemoryRouter>
    );

    expect(html).toBe('');
  });

  it('listens for Ctrl+K / Cmd+K hotkey', () => {
    expect(sourceCode).toContain("e.key.toLowerCase() === 'k'");
    expect(sourceCode).toContain('e.metaKey || e.ctrlKey');
  });
});
