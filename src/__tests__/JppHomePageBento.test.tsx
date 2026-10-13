import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { JppHomePage } from '@/pages/jpp/JppHomePage';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user' },
    profile: { full_name: 'Ahmad Faiz', jpp_position: 'YDP', role: 'JPP' },
    isSuperAdmin: true,
  }),
}));

vi.mock('@/contexts/JppConfigContext', () => ({
  useJppConfig: () => ({
    positionLabels: { YDP: 'Yang Di-Pertua' },
    unitConfig: {
      KPP: { shortLabel: 'KPP', fullLabel: 'Kelab & Perpaduan', color: '#F87171', isActive: true, icon: () => null },
    },
    unitOrder: ['KPP'],
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
        gte: () => ({ order: () => ({ limit: vi.fn().mockResolvedValue({ data: [] }) }) }),
      }),
    }),
  },
}));

describe('JppHomePage Bento Polish', () => {
  const homePath = path.resolve(__dirname, '../pages/jpp/JppHomePage.tsx');
  const sourceCode = fs.readFileSync(homePath, 'utf8');

  it('does not leak internal git commit hash in user-facing hero', () => {
    expect(sourceCode).not.toContain('Build {__GIT_HASH__}');
    expect(sourceCode).not.toContain('Current Build Hash');
  });

  it('enforces font-mono and tabular-nums on statistical metrics', () => {
    expect(sourceCode).toContain('font-mono');
    expect(sourceCode).toContain('tabular-nums');
  });

  it('renders headline with refined institutional styling', () => {
    const html = renderToString(
      <MemoryRouter>
        <JppHomePage />
      </MemoryRouter>
    );

    expect(html).toContain('Selamat datang');
  });
});
