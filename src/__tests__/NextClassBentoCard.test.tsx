import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import {
  NextClassBentoCard,
  formatCompactLocation,
  getMalaysianNow,
} from '../components/portal/NextClassBentoCard';
import type { StudentTimetableEntry } from '../types';

let mockStorage: Record<string, string> = {};

// Polyfill localStorage in node environment
globalThis.localStorage = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = String(val);
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    mockStorage = {};
  },
  key: () => null,
  length: 0,
};

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
  beforeEach(() => {
    mockStorage = {};
  });

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

describe('NextClassBentoCard Location Formatter', () => {
  it('condenses long department building names to standard acronyms', () => {
    const entryJTMK: Partial<StudentTimetableEntry> = {
      room_raw: 'BK4 · BANGUNAN TEKNOLOGI MAKLUMAT & KOMUNIKASI',
    };
    expect(formatCompactLocation(entryJTMK as StudentTimetableEntry)).toBe('BK4 · JTMK');

    const entryJKA: Partial<StudentTimetableEntry> = {
      room_raw: 'DEWAN · BANGUNAN KEJURUTERAAN AWAM',
    };
    expect(formatCompactLocation(entryJKA as StudentTimetableEntry)).toBe('DEWAN · JKA');

    const entryJKE: Partial<StudentTimetableEntry> = {
      room_raw: 'LAB 1 · BANGUNAN KEJURUTERAAN ELEKTRIK',
    };
    expect(formatCompactLocation(entryJKE as StudentTimetableEntry)).toBe('LAB 1 · JKE');

    const entryJKM: Partial<StudentTimetableEntry> = {
      room_raw: 'BENGKEL · BANGUNAN KEJURUTERAAN MEKANIKAL',
    };
    expect(formatCompactLocation(entryJKM as StudentTimetableEntry)).toBe('BENGKEL · JKM');

    const entryJP: Partial<StudentTimetableEntry> = {
      room_raw: 'BILIK 2 · BANGUNAN PERDAGANGAN',
    };
    expect(formatCompactLocation(entryJP as StudentTimetableEntry)).toBe('BILIK 2 · JP');
  });

  it('handles structured location object with building acronym mapping', () => {
    const entry: Partial<StudentTimetableEntry> = {
      location: {
        id: 'loc-1',
        room_code: 'BK4',
        building: {
          id: 'b-1',
          name: 'BANGUNAN TEKNOLOGI MAKLUMAT & KOMUNIKASI',
        },
      } as any,
    };
    expect(formatCompactLocation(entry as StudentTimetableEntry)).toBe('BK4 · JTMK');
  });
});

describe('NextClassBentoCard Full Subject Name & Expanded Streamline', () => {
  beforeEach(() => {
    mockStorage = {
      portal_next_class_collapsed: 'false', // Expanded view
    };
  });

  it('renders full subject name as main headline and hides redundant duplicate course code badge', () => {
    const malaysian = getMalaysianNow();
    // Create an entry that is active today covering the whole day
    const mockEntries: StudentTimetableEntry[] = [
      {
        id: 'test-1',
        user_id: 'user-1',
        academic_session: 'I 2026/2027',
        semester: '3',
        class_name: 'DDT3A',
        day_of_week: malaysian.dayOfWeek,
        start_time: '00:00:00',
        end_time: '23:59:00',
        course_code: 'DFT40133',
        course_name: 'PENGATURCARAAN WEB',
        class_type: 'KULIAH',
        room_raw: 'BK4 · BANGUNAN TEKNOLOGI MAKLUMAT & KOMUNIKASI',
        location_id: null,
        is_online: false,
        color: '#3b82f6',
        is_archived: false,
      },
    ];

    const html = renderCard({ entries: mockEntries });

    // 1. Full Subject Name is main headline
    expect(html).toContain('PENGATURCARAAN WEB');

    // 2. Redundant course code badge is not printed alongside course_name
    // (Previously <span ...>DFT40133</span> was printed above course_name)
    expect(html).not.toMatch(/<span[^>]*>DFT40133<\/span>/);

    // 3. Compact location is rendered
    expect(html).toContain('BK4 · JTMK');

    // 4. Active class progress bar has slim h-1 height
    expect(html).toContain('h-1 overflow-hidden');

    // 5. "Lihat Jadual Penuh" link routes to /akademik/takwim?tab=personal
    expect(html).toContain('href="/akademik/takwim?tab=personal"');
    expect(html).toContain('Lihat Jadual Penuh');
  });

  it('falls back to course_code when course_name is missing or empty', () => {
    const malaysian = getMalaysianNow();
    const mockEntries: StudentTimetableEntry[] = [
      {
        id: 'test-2',
        user_id: 'user-1',
        academic_session: 'I 2026/2027',
        semester: '3',
        class_name: 'DDT3A',
        day_of_week: malaysian.dayOfWeek,
        start_time: '00:00:00',
        end_time: '23:59:00',
        course_code: 'DFT40133',
        course_name: '',
        class_type: 'KULIAH',
        room_raw: 'BK4 · BANGUNAN TEKNOLOGI MAKLUMAT & KOMUNIKASI',
        location_id: null,
        is_online: false,
        color: '#3b82f6',
        is_archived: false,
      },
    ];

    const html = renderCard({ entries: mockEntries });
    expect(html).toContain('DFT40133');
  });
});
