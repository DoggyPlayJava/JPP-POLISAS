import React from 'react';
import fs from 'fs';
import path from 'path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { StudentTimetableEntry } from '@/types';
import {
  EditClassSlotModal,
  detectSlotConflict,
  formatTimeToSeconds,
  DAY_OPTIONS,
  CLASS_TYPE_OPTIONS,
} from '@/components/takwim/EditClassSlotModal';

// Polyfill localStorage in node environment
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

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-456' },
    user: { id: 'user-456' },
  }),
}));

vi.mock('@radix-ui/react-dialog', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    Portal: ({ children }: any) => React.createElement('div', { 'data-testid': 'dialog-portal' }, children),
  };
});

const mockSlot: StudentTimetableEntry = {
  id: 'slot-123',
  user_id: 'user-456',
  academic_session: 'SESI I : 2026/2027',
  semester: '1',
  class_name: 'DIT1A',
  day_of_week: 1, // Isnin
  start_time: '08:00:00',
  end_time: '10:00:00',
  course_code: 'DFC10042',
  course_name: 'PROBLEM SOLVING AND ALGORITHMS',
  class_type: 'KULIAH',
  lecturer_code: 'MNA',
  room_raw: 'BK01',
  location_id: 'loc-bk01',
  is_online: false,
  color: '#3b82f6',
  is_archived: false,
};

const conflictingSlot: StudentTimetableEntry = {
  id: 'slot-999',
  user_id: 'user-456',
  academic_session: 'SESI I : 2026/2027',
  semester: '1',
  class_name: 'DIT1A',
  day_of_week: 1, // Isnin
  start_time: '09:00:00',
  end_time: '11:00:00',
  course_code: 'DIT2023',
  course_name: 'DATABASE SYSTEMS',
  class_type: 'AMALI',
  lecturer_code: 'AZR',
  room_raw: 'MAKMAL 2',
  location_id: null,
  is_online: false,
  color: '#10b981',
  is_archived: false,
};

const adjacentSlot: StudentTimetableEntry = {
  id: 'slot-888',
  user_id: 'user-456',
  academic_session: 'SESI I : 2026/2027',
  semester: '1',
  class_name: 'DIT1A',
  day_of_week: 1, // Isnin
  start_time: '10:00:00',
  end_time: '12:00:00',
  course_code: 'MAT101',
  course_name: 'MATHEMATICS',
  class_type: 'TUTORIAL',
  lecturer_code: 'SITI',
  room_raw: 'BK02',
  location_id: null,
  is_online: false,
  color: '#8b5cf6',
  is_archived: false,
};

describe('EditClassSlotModal Unit & Integration Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Pure Helper Functions', () => {
    it('correctly standardizes time strings with seconds (formatTimeToSeconds)', () => {
      expect(formatTimeToSeconds('08:00')).toBe('08:00:00');
      expect(formatTimeToSeconds('14:30')).toBe('14:30:00');
      expect(formatTimeToSeconds('08:00:00')).toBe('08:00:00');
      expect(formatTimeToSeconds('')).toBe('00:00:00');
    });

    it('detects slot conflict when times overlap on the same day', () => {
      const conflict = detectSlotConflict(
        'slot-123',
        1,
        '08:00',
        '10:00',
        [conflictingSlot]
      );
      expect(conflict).not.toBeNull();
      expect(conflict?.course_code).toBe('DIT2023');
    });

    it('ignores conflict against self (same slot id)', () => {
      const conflict = detectSlotConflict(
        'slot-123',
        1,
        '08:00',
        '10:00',
        [mockSlot]
      );
      expect(conflict).toBeNull();
    });

    it('does not flag adjacent slots as conflicts', () => {
      const conflict = detectSlotConflict(
        'slot-123',
        1,
        '08:00',
        '10:00',
        [adjacentSlot]
      );
      expect(conflict).toBeNull();
    });

    it('ignores slots on a different day of the week', () => {
      const tuesdaySlot = { ...conflictingSlot, day_of_week: 2 };
      const conflict = detectSlotConflict(
        'slot-123',
        1, // Checking Monday
        '09:00',
        '11:00',
        [tuesdaySlot]
      );
      expect(conflict).toBeNull();
    });

    it('ignores archived slots from conflict checks', () => {
      const archived = { ...conflictingSlot, is_archived: true };
      const conflict = detectSlotConflict(
        'slot-123',
        1,
        '09:00',
        '11:00',
        [archived]
      );
      expect(conflict).toBeNull();
    });

    it('provides all 5 day options and 4 class type options', () => {
      expect(DAY_OPTIONS.length).toBe(5);
      expect(DAY_OPTIONS.map(d => d.value)).toEqual([1, 2, 3, 4, 5]);
      expect(CLASS_TYPE_OPTIONS.map(c => c.value)).toEqual(['KULIAH', 'AMALI', 'TUTORIAL', 'LAIN_LAIN']);
    });
  });

  describe('Component Rendering & State Initialization', () => {
    it('returns null or empty content when isOpen is false', () => {
      const html = renderToString(
        React.createElement(EditClassSlotModal, {
          isOpen: false,
          onClose: vi.fn(),
          slot: mockSlot,
          onSaveSuccess: vi.fn(),
          onDeleteSuccess: vi.fn(),
        })
      );
      expect(html).toBe('');
    });

    it('returns null or empty content when slot is null', () => {
      const html = renderToString(
        React.createElement(EditClassSlotModal, {
          isOpen: true,
          onClose: vi.fn(),
          slot: null,
          onSaveSuccess: vi.fn(),
          onDeleteSuccess: vi.fn(),
        })
      );
      expect(html).toBe('');
    });

    it('renders modal title, prefilled inputs, and action buttons when open with a slot', () => {
      const html = renderToString(
        React.createElement(EditClassSlotModal, {
          isOpen: true,
          onClose: vi.fn(),
          slot: mockSlot,
          allSlots: [mockSlot],
          onSaveSuccess: vi.fn(),
          onDeleteSuccess: vi.fn(),
        })
      );

      // Title & badge
      expect(html).toContain('Kemaskini Slot Kelas');
      expect(html).toContain('DFC10042');
      expect(html).toContain('PROBLEM SOLVING AND ALGORITHMS');

      // Room & lecturer inputs
      expect(html).toContain('BK01');
      expect(html).toContain('MNA');

      // Buttons
      expect(html).toContain('Padam Slot Ini');
      expect(html).toContain('Batal');
      expect(html).toContain('Simpan Perubahan');

      // No conflict warning when no conflict
      expect(html).not.toContain('Amaran Pertindihan Jadual');
    });

    it('renders inline conflict warning banner when slot overlaps with another slot in allSlots', () => {
      const html = renderToString(
        React.createElement(EditClassSlotModal, {
          isOpen: true,
          onClose: vi.fn(),
          slot: mockSlot, // 08:00 - 10:00 on Isnin
          allSlots: [mockSlot, conflictingSlot], // conflictingSlot is 09:00 - 11:00 on Isnin
          onSaveSuccess: vi.fn(),
          onDeleteSuccess: vi.fn(),
        })
      );

      expect(html).toContain('Amaran Pertindihan Jadual');
      expect(html).toContain('DIT2023');
    });

    it('renders color swatches and online class switch', () => {
      const html = renderToString(
        React.createElement(EditClassSlotModal, {
          isOpen: true,
          onClose: vi.fn(),
          slot: mockSlot,
          allSlots: [mockSlot],
          onSaveSuccess: vi.fn(),
          onDeleteSuccess: vi.fn(),
        })
      );

      expect(html).toContain('Kelas Atas Talian');
      expect(html).toContain('Warna Tema Subjek');
      expect(html).toContain('Pilih warna #3b82f6');
    });

    it('renders time validation warning when end time is before or equal to start time', () => {
      const invalidSlot: StudentTimetableEntry = {
        ...mockSlot,
        start_time: '10:00:00',
        end_time: '08:00:00',
      };

      const html = renderToString(
        React.createElement(EditClassSlotModal, {
          isOpen: true,
          onClose: vi.fn(),
          slot: invalidSlot,
          onSaveSuccess: vi.fn(),
          onDeleteSuccess: vi.fn(),
        })
      );

      expect(html).toContain('Masa tamat mestilah lebih lewat daripada masa mula');
    });
  });

  describe('Implementation & Architectural Integrity', () => {
    const componentPath = path.resolve(__dirname, '../components/takwim/EditClassSlotModal.tsx');

    it('verifies EditClassSlotModal component file exists and contains all required contracts', () => {
      expect(fs.existsSync(componentPath)).toBe(true);
      const content = fs.readFileSync(componentPath, 'utf-8');

      // Table update & archive targets
      expect(content).toContain(".from('student_timetables')");
      expect(content).toContain('.update(');
      expect(content).toContain(".eq('id', slot.id)");
      expect(content).toContain(".eq('user_id', userId)");
      expect(content).toContain('is_archived: true');

      // Room matching & palette
      expect(content).toContain('matchRoomToLocation');
      expect(content).toContain('COURSE_PALETTE');

      // Confirm dialog & toast notifications
      expect(content).toContain('Adakah anda pasti ingin memadam slot kelas ini?');
      expect(content).toContain('Slot kelas berjaya dikemaskini.');
      expect(content).toContain('Slot kelas berjaya dipadam.');

      // Action buttons
      expect(content).toContain('Padam Slot Ini');
      expect(content).toContain('Batal');
      expect(content).toContain('Simpan Perubahan');
    });
  });
});

