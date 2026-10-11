import { describe, it, expect } from 'vitest';
import { 
  mergeConsecutiveSlots, 
  parseCourseCodeAndType, 
  clusterRowsByY,
  parseCell,
  toTextItems,
  rowText,
  COURSE_PALETTE,
  DAY_NAMES
} from '@/lib/timetableParser';
import type { ImapsRoomMapping } from '@/types';

describe('Timetable Parser Logic', () => {
  it('should parse course code and class type accurately', () => {
    expect(parseCourseCodeAndType('DEE20153(L)')).toEqual({ courseCode: 'DEE20153', classType: 'KULIAH' });
    expect(parseCourseCodeAndType('DET30053(P)')).toEqual({ courseCode: 'DET30053', classType: 'AMALI' });
    expect(parseCourseCodeAndType('DUE10062(TU)')).toEqual({ courseCode: 'DUE10062', classType: 'TUTORIAL' });
    expect(parseCourseCodeAndType('PA(O)')).toEqual({ courseCode: 'PA', classType: 'LAIN_LAIN' });
    expect(parseCourseCodeAndType('KOKURIKULUM')).toEqual({ courseCode: 'KOKURIKULUM', classType: 'LAIN_LAIN' });
  });

  it('should merge consecutive 1-hour slots into a 2-hour continuous slot', () => {
    const rawSlots = [
      {
        day_of_week: 1,
        start_time: '08:00:00',
        end_time: '09:00:00',
        course_code: 'DEE20153',
        course_name: 'DIGITAL ELECTRONICS',
        class_type: 'KULIAH' as const,
        lecturer_code: 'AI',
        room_raw: 'EA303',
        is_online: false,
        color: '#3b82f6'
      },
      {
        day_of_week: 1,
        start_time: '09:00:00',
        end_time: '10:00:00',
        course_code: 'DEE20153',
        course_name: 'DIGITAL ELECTRONICS',
        class_type: 'KULIAH' as const,
        lecturer_code: 'AI',
        room_raw: 'EA303',
        is_online: false,
        color: '#3b82f6'
      }
    ];

    const merged = mergeConsecutiveSlots(rawSlots);
    expect(merged.length).toBe(1);
    expect(merged[0].start_time).toBe('08:00:00');
    expect(merged[0].end_time).toBe('10:00:00');
  });

  it('should not merge non-consecutive slots or slots with different attributes', () => {
    const rawSlots = [
      {
        day_of_week: 1,
        start_time: '08:00:00',
        end_time: '09:00:00',
        course_code: 'DEE20153',
        class_type: 'KULIAH' as const,
        room_raw: 'EA303',
      },
      {
        day_of_week: 1,
        start_time: '10:00:00', // gap
        end_time: '11:00:00',
        course_code: 'DEE20153',
        class_type: 'KULIAH' as const,
        room_raw: 'EA303',
      },
      {
        day_of_week: 2, // different day
        start_time: '11:00:00',
        end_time: '12:00:00',
        course_code: 'DEE20153',
        class_type: 'KULIAH' as const,
        room_raw: 'EA303',
      },
    ];

    const merged = mergeConsecutiveSlots(rawSlots);
    expect(merged.length).toBe(3);
  });

  it('should cluster text items into horizontal bands by Y proximity', () => {
    const items = [
      { str: '8:00', x: 50, y: 100, width: 20, height: 10 },
      { str: '9:00', x: 100, y: 102, width: 20, height: 10 },
      { str: 'ISNIN', x: 20, y: 150, width: 30, height: 10 },
      { str: 'DEE20153(L)', x: 50, y: 152, width: 40, height: 10 },
    ];
    const rows = clusterRowsByY(items, 5);
    expect(rows.length).toBe(2);
    expect(rows[0].length).toBe(2);
    expect(rows[1].length).toBe(2);
  });

  it('should convert raw pdf items to text items and assemble row text', () => {
    const content = {
      items: [
        { str: '  DEE20153(L)  ', transform: [1, 0, 0, 1, 100, 200], width: 40, height: 12 },
        { str: '   ', transform: [1, 0, 0, 1, 150, 200], width: 10, height: 12 },
        { str: 'AI EA303', transform: [1, 0, 0, 1, 160, 200], width: 50, height: 12 },
      ]
    };
    const items = toTextItems(content);
    expect(items.length).toBe(2);
    expect(items[0].str).toBe('DEE20153(L)');
    expect(items[1].str).toBe('AI EA303');
    expect(rowText(items)).toBe('DEE20153(L) AI EA303');
  });

  it('should parse cell text and match room mappings correctly', () => {
    const roomMappings: ImapsRoomMapping[] = [
      {
        id: 'map-1',
        room_code_pattern: '^EA303$',
        location_id: 'loc-ea303',
        is_online: false,
      },
      {
        id: 'map-2',
        room_code_pattern: 'ONLINE',
        location_id: null,
        is_online: true,
      }
    ];

    const parsed1 = parseCell('DEE20153(L) AI EA303', roomMappings);
    expect(parsed1.course_code).toBe('DEE20153');
    expect(parsed1.class_type).toBe('KULIAH');
    expect(parsed1.lecturer_code).toBe('AI');
    expect(parsed1.room_raw).toBe('EA303');
    expect(parsed1.location_id).toBe('loc-ea303');
    expect(parsed1.is_online).toBe(false);

    const parsed2 = parseCell('DUE10062(TU) NUR ONLINE', roomMappings);
    expect(parsed2.course_code).toBe('DUE10062');
    expect(parsed2.class_type).toBe('TUTORIAL');
    expect(parsed2.lecturer_code).toBe('NUR');
    expect(parsed2.room_raw).toBe('ONLINE');
    expect(parsed2.is_online).toBe(true);
  });

  it('should export expected palettes and day names', () => {
    expect(COURSE_PALETTE.length).toBeGreaterThanOrEqual(8);
    expect(DAY_NAMES).toEqual(['ISNIN', 'SELASA', 'RABU', 'KHAMIS', 'JUMAAT']);
  });
});
