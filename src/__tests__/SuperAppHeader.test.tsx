import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SuperAppHeader } from '@/components/portal/SuperAppHeader';

// Polyfill localStorage in node environment if needed
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  };
}

// Mock AuthContext if necessary
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-header' },
    hasKeusahawananAccess: false,
    isSuperAdmin: false,
  }),
}));

function renderHeader(props: React.ComponentProps<typeof SuperAppHeader> = {}) {
  return renderToString(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(SuperAppHeader, props)
      )
    )
  );
}

describe('SuperAppHeader Balanced Layout Suite', () => {
  it('renders container with comfortable mobile padding and balanced gap', () => {
    const html = renderHeader({ displayName: 'Aiman' });

    // Balanced padding & gap
    expect(html).toContain('pt-5 sm:pt-7 pb-5 sm:pb-6');
    expect(html).toContain('gap-4 sm:gap-5');
  });

  it('renders distinct greeting overline and prominent student name in h1', () => {
    const html = renderHeader({ displayName: 'Aiman' });

    // Distinct greeting with Lucide Sparkles icon (Zero Raw Emojis standard)
    expect(html).toMatch(/lucide-sparkles/i);
    // Prominent h1 for student name
    expect(html).toContain(
      '<h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">Aiman</h1>'
    );
  });

  it('renders role badge in greeting overline when profile has a role', () => {
    const html = renderHeader({
      profile: {
        id: 'user-admin',
        full_name: 'PENTADBIR SISTEM',
        role: 'SUPERADMIN',
      },
    });

    expect(html).toContain('PENTADBIR UTAMA');
    expect(html).toContain('bg-[#6B7F5B]/30');
    expect(html).toContain('text-[#D9C9B2]');
  });

  it('renders Karnival and SUPSAS badges in greeting overline when active', () => {
    const karnivalHtml = renderHeader({
      displayName: 'Aiman',
      karnivalActive: true,
    });
    expect(karnivalHtml).toContain('Karnival Siswa');
    expect(karnivalHtml).toContain('bg-pink-500/25');

    const supsasHtml = renderHeader({
      displayName: 'Aiman',
      supsasActive: true,
    });
    expect(supsasHtml).toContain('SUPSAS Langsung');
    expect(supsasHtml).toContain('bg-amber-500/25');
  });

  it('hides long campus subtitle on mobile with hidden sm:block', () => {
    const html = renderHeader({ displayName: 'Aiman' });

    // Campus subtitle hidden on mobile, visible on sm+
    expect(html).toContain('hidden sm:block text-xs sm:text-sm text-white/80 font-medium max-w-2xl leading-relaxed');
    expect(html).toContain('Pusat sehenti digital untuk semua aktiviti, servis, acara dan kebajikan kampus.');
  });

  it('updates command palette search capsule to h-11 sm:h-12 with Ctrl+K shortcut', () => {
    const html = renderHeader({ displayName: 'Aiman' });

    // Search button height and styling
    expect(html).toContain('h-11 sm:h-12');
    expect(html).toContain('px-3.5 sm:px-4');
    expect(html).toContain('Cari makanan, runner, servis, acara, merit...');
    expect(html).toContain('Ctrl');
    expect(html).toContain('K');
  });
});
