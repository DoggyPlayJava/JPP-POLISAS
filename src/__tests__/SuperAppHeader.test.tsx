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

describe('SuperAppHeader Compact Layout Suite', () => {
  it('renders container with reduced mobile padding and compact gap', () => {
    const html = renderHeader({ displayName: 'Aiman' });

    // Requirement 1: Container padding reduced on mobile & gap tightened
    expect(html).toContain('pt-3.5 sm:pt-6 pb-4 sm:pb-6');
    expect(html).toContain('gap-3 sm:gap-5');
  });

  it('consolidates greeting title, student name, and emoji into a unified h1 element', () => {
    const html = renderHeader({ displayName: 'Aiman' });

    // Requirement 2: Combined h1 typography and flex classes
    expect(html).toContain(
      'text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight flex items-center gap-1.5 flex-wrap'
    );
    expect(html).toContain('Aiman');
    expect(html).toContain('👋');
  });

  it('renders role badge inline inside h1 when profile has a role', () => {
    const html = renderHeader({
      profile: {
        id: 'user-admin',
        full_name: 'PENTADBIR SISTEM',
        role: 'SUPERADMIN',
      },
    });

    expect(html).toContain('PENTADBIR UTAMA');
    // Role badge should be rendered within the h1 structure
    expect(html).toContain('bg-[#6B7F5B]/30');
    expect(html).toContain('text-[#D9C9B2]');
  });

  it('renders Karnival and SUPSAS badges inline inside h1 when active', () => {
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

    // Requirement 3: Campus subtitle hidden on mobile, visible on sm+
    expect(html).toContain('hidden sm:block text-xs sm:text-sm text-white/80 font-medium max-w-2xl leading-relaxed');
    expect(html).toContain('Pusat sehenti digital untuk semua aktiviti, servis, acara dan kebajikan kampus.');
  });

  it('updates command palette search capsule to compact h-10 sm:h-11 with Ctrl+K shortcut', () => {
    const html = renderHeader({ displayName: 'Aiman' });

    // Requirement 4: Slim search button height and styling
    expect(html).toContain('h-10 sm:h-11');
    expect(html).toContain('px-3.5 sm:px-4');
    expect(html).toContain('Cari makanan, runner, servis, acara, merit...');
    expect(html).toContain('Ctrl');
    expect(html).toContain('K');
  });
});
