import React from 'react';
import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { TimetableMatrixGrid } from '@/components/takwim/TimetableMatrixGrid';
import type { StudentTimetableEntry } from '@/types';

const mockEntries: StudentTimetableEntry[] = [
  {
    id: 'slot-1',
    user_id: 'user-123',
    academic_session: 'S1 2026/2027',
    semester: '3',
    class_name: 'DTK3A',
    day_of_week: 1, // Isnin
    start_time: '09:00:00',
    end_time: '11:00:00',
    course_code: 'DEE30163',
    course_name: 'ELECTRONIC CIRCUITS',
    class_type: 'KULIAH',
    lecturer_code: 'FZA',
    room_raw: 'EA301',
    location_id: null,
    is_online: false,
    color: '#3b82f6',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'slot-2',
    user_id: 'user-123',
    academic_session: 'S1 2026/2027',
    semester: '3',
    class_name: 'DTK3A',
    day_of_week: 2, // Selasa
    start_time: '14:00:00',
    end_time: '17:00:00',
    course_code: 'DEC30173',
    course_name: 'COMPUTER NETWORKING',
    class_type: 'AMALI',
    lecturer_code: 'AFM',
    room_raw: 'EB303',
    location_id: null,
    is_online: false,
    color: '#10b981',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('TimetableMatrixGrid Component', () => {
  const componentPath = path.resolve(__dirname, '../components/takwim/TimetableMatrixGrid.tsx');

  it('renders all 5 days of the week in the sticky day column', () => {
    const html = renderToString(<TimetableMatrixGrid entries={mockEntries} />);
    expect(html).toContain('ISNIN');
    expect(html).toContain('SELASA');
    expect(html).toContain('RABU');
    expect(html).toContain('KHAMIS');
    expect(html).toContain('JUMAAT');
  });

  it('renders official time columns including 13:00 - 14:00 REHAT column', () => {
    const html = renderToString(<TimetableMatrixGrid entries={mockEntries} />);
    expect(html).toContain('08:00 - 09:00');
    expect(html).toContain('13:00 - 14:00');
  });

  it('renders class card with course code, room, and lecturer', () => {
    const html = renderToString(<TimetableMatrixGrid entries={mockEntries} />);
    expect(html).toContain('DEE30163');
    expect(html).toContain('EA301');
    expect(html).toContain('FZA');
  });

  it('renders mobile scroll hint for responsive guidance', () => {
    const html = renderToString(<TimetableMatrixGrid entries={mockEntries} />);
    expect(html).toMatch(/Leret untuk lihat jadual penuh/i);
  });

  it('verifies sticky layout classes in source code', () => {
    const content = fs.readFileSync(componentPath, 'utf8');
    expect(content).toContain('sticky left-0');
    expect(content).toContain('overflow-x-auto');
    expect(content).toContain('MATRIX_TIME_SLOTS');
  });
});
