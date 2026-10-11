import { describe, it, expect } from 'vitest';
import { 
  mergeConsecutiveSlots, 
  parseCourseCodeAndType, 
  clusterRowsByY,
  parseCell,
  toTextItems,
  rowText,
  COURSE_PALETTE,
  DAY_NAMES,
  extractTimetableFromItems,
  matchRoomToLocation,
  type RoomLocationLookup
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

  it('should extract timetable entries with synthetic PDF coordinate items and canonical day index', () => {
    // Synthetic items in PDF coordinates (Y increases upwards: higher Y is higher on page)
    // We intentionally put items out of order to verify sorting by Y descending & X ascending
    const syntheticItems = [
      // Headers at top of page (Y=520..550)
      { str: 'JABATAN : JABATAN KEJURUTERAAN ELEKTRIK', x: 50, y: 550, width: 200, height: 10 },
      { str: 'KELAS : DEP4A', x: 50, y: 540, width: 80, height: 10 },
      { str: 'SESI : II : 2025/2026', x: 200, y: 540, width: 100, height: 10 },
      { str: 'TARIKH KUATKUASA : 01-03-2026', x: 350, y: 540, width: 100, height: 10 },

      // Time row headers (Y=480)
      { str: '08:00', x: 100, y: 480, width: 30, height: 10 },
      { str: '09:00', x: 180, y: 480, width: 30, height: 10 },
      { str: '10:00', x: 260, y: 480, width: 30, height: 10 },

      // Day 1: ISNIN (Row anchor Y=400)
      { str: 'ISNIN', x: 30, y: 400, width: 40, height: 10 },
      // Cell at 08:00 (x=100). Line 2 has lower Y (380), Line 1 has higher Y (395).
      // We list line 2 first in items array to verify Y descending sort (b.y - a.y)
      { str: 'AI EA303', x: 100, y: 380, width: 50, height: 10 },
      { str: 'DEE20153(L)', x: 100, y: 395, width: 60, height: 10 },

      // Note: SELASA is intentionally omitted to verify canonical day_of_week index!
      // Day 3: RABU (Row anchor Y=300)
      { str: 'RABU', x: 30, y: 300, width: 40, height: 10 },
      // Cell at 09:00 (x=180).
      { str: 'NUR EB101', x: 180, y: 280, width: 50, height: 10 },
      { str: 'DET30053(P)', x: 180, y: 295, width: 60, height: 10 },
    ];

    const roomMappings: ImapsRoomMapping[] = [
      {
        id: 'map-1',
        room_code_pattern: '^EA303$',
        location_id: 'loc-ea303',
        is_online: false,
      },
    ];

    const { metadata, entries } = extractTimetableFromItems(syntheticItems, roomMappings);

    // Verify metadata parsed accurately
    expect(metadata.className).toBe('DEP4A');
    expect(metadata.session).toBe('II : 2025/2026');
    expect(metadata.effectiveDate).toBe('01-03-2026');
    expect(metadata.department).toBe('JABATAN KEJURUTERAAN ELEKTRIK');

    // Verify entries
    expect(entries.length).toBe(2);

    // ISNIN entry (Monday -> canonical day 1)
    const isninEntry = entries.find((e) => e.day_of_week === 1);
    expect(isninEntry).toBeDefined();
    expect(isninEntry!.course_code).toBe('DEE20153');
    expect(isninEntry!.class_type).toBe('KULIAH');
    expect(isninEntry!.lecturer_code).toBe('AI');
    expect(isninEntry!.room_raw).toBe('EA303');
    expect(isninEntry!.location_id).toBe('loc-ea303');
    expect(isninEntry!.start_time).toBe('08:00:00');
    expect(isninEntry!.end_time).toBe('09:00:00');

    // RABU entry (Wednesday -> canonical day 3, NOT shifted to 2!)
    const rabuEntry = entries.find((e) => e.day_of_week === 3);
    expect(rabuEntry).toBeDefined();
    expect(rabuEntry!.course_code).toBe('DET30053');
    expect(rabuEntry!.class_type).toBe('AMALI');
    expect(rabuEntry!.lecturer_code).toBe('NUR');
    expect(rabuEntry!.room_raw).toBe('EB101');
    expect(rabuEntry!.start_time).toBe('09:00:00');
    expect(rabuEntry!.end_time).toBe('10:00:00');

    // Verify day 2 (SELASA) was not assigned
    expect(entries.some((e) => e.day_of_week === 2)).toBe(false);
  });

  it('should match room to location via room_code, search_tags, online keywords, and prefix stripping', () => {
    const locations: RoomLocationLookup[] = [
      { id: 'loc-ea301', room_code: 'EA301', search_tags: 'JKE, A301' },
      { id: 'loc-bf107', room_code: 'BF107', search_tags: 'Makmal Komputer, F107, JKE' },
      { id: 'loc-bka', room_code: 'BILIK KULIAH A', search_tags: 'BKA, BKB, MBKA' },
      { id: 'loc-ea304', room_code: 'EA304', search_tags: null },
    ];

    // 1. Exact match
    expect(matchRoomToLocation('EA301', locations)).toEqual({
      location_id: 'loc-ea301',
      is_online: false,
    });

    // 2. Alias via search_tags (A301 -> EA301)
    expect(matchRoomToLocation('A301', locations)).toEqual({
      location_id: 'loc-ea301',
      is_online: false,
    });

    // 3. Alias via search_tags (F107 -> BF107)
    expect(matchRoomToLocation('F107', locations)).toEqual({
      location_id: 'loc-bf107',
      is_online: false,
    });

    // 4. Nickname via search_tags (BKA -> BILIK KULIAH A)
    expect(matchRoomToLocation('BKA', locations)).toEqual({
      location_id: 'loc-bka',
      is_online: false,
    });

    // 5. Online keywords
    expect(matchRoomToLocation('ONLINE', locations)).toEqual({
      location_id: null,
      is_online: true,
    });
    expect(matchRoomToLocation('MICROSOFT TEAMS', locations)).toEqual({
      location_id: null,
      is_online: true,
    });

    // 6. Prefix stripping fallback (A304 without tag matches EA304)
    expect(matchRoomToLocation('A304', locations)).toEqual({
      location_id: 'loc-ea304',
      is_online: false,
    });

    // 7. Unknown room returns null
    expect(matchRoomToLocation('ZZ999', locations)).toEqual({
      location_id: null,
      is_online: false,
    });
  });
});
