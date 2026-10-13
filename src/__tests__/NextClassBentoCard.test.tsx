import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { NextClassBentoCard } from '../components/portal/NextClassBentoCard';

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

function renderCard(props: React.ComponentProps<typeof NextClassBentoCard> = {}) {
  return renderToString(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(NextClassBentoCard, props)
    )
  );
}

describe('NextClassBentoCard Empty-State Suite', () => {
  it('renders student-friendly actionable empty-state copy when no timetable entries are present', () => {
    const html = renderCard({ entries: [] });

    // Header & badge checks
    expect(html).toContain('Jadual Kuliah Belum Dimuat Naik');
    expect(html).toContain('Peribadi Pelajar');
    expect(html).toContain('e-Akademik');

    // Requirement 1: Exact approved copy
    const approvedCopy = 'Takut terlepas kelas? Muat naik jadual sekarang untuk peringatan automatik &amp; panduan lokasi bilik.';
    expect(html).toContain(approvedCopy);

    // Old verbose copy should no longer exist
    expect(html).not.toContain('Muat naik fail jadual kelas (PDF) anda di modul e-Akademik');

    // Requirement 2: Paragraph styling with leading-relaxed
    expect(html).toContain('text-xs sm:text-sm text-[#556453] dark:text-[#A3B39F] max-w-xl leading-relaxed');

    // Requirement 3: Retain "Muat Naik Jadual" button linking to /akademik/takwim
    expect(html).toContain('href="/akademik/takwim"');
    expect(html).toContain('Muat Naik Jadual');
  });

  it('renders empty-state when entries prop is null or undefined', () => {
    const htmlNull = renderCard({ entries: null });
    expect(htmlNull).toContain('Takut terlepas kelas? Muat naik jadual sekarang untuk peringatan automatik &amp; panduan lokasi bilik.');

    const htmlUndefined = renderCard({});
    expect(htmlUndefined).toContain('Takut terlepas kelas? Muat naik jadual sekarang untuk peringatan automatik &amp; panduan lokasi bilik.');
  });
});
