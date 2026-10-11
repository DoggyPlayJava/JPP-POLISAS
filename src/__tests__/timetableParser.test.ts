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
  normalizeTimetableTime,
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

    // 8. Composite rooms (e.g. EA301/EA302 resolves primary EA301)
    expect(matchRoomToLocation('EA301/EA302', locations)).toEqual({
      location_id: 'loc-ea301',
      is_online: false,
    });
  });

  it('should prioritize physical classroom when EMSTEAM or AMSTEAM coincides in the same cell', () => {
    const locations: RoomLocationLookup[] = [
      { id: 'loc-ea301', room_code: 'EA301', search_tags: 'JKE, A301' },
      { id: 'loc-ea303', room_code: 'EA303', search_tags: 'JKE, A303' },
    ];

    // Cell containing both physical classroom EA301 and EMSTEAM
    const parsed1 = parseCell('DEE20153(L) AI EA301 EMSTEAM', locations);
    expect(parsed1.course_code).toBe('DEE20153');
    expect(parsed1.class_type).toBe('KULIAH');
    expect(parsed1.room_raw).toBe('EA301');
    expect(parsed1.is_online).toBe(false);
    expect(parsed1.location_id).toBe('loc-ea301');
    expect(parsed1.lecturer_code).toBe('AI');

    // Cell containing AMSTEAM and physical room EA303
    const parsed2 = parseCell('DET30053(P) NUR AMSTEAM EA303', locations);
    expect(parsed2.course_code).toBe('DET30053');
    expect(parsed2.class_type).toBe('AMALI');
    expect(parsed2.room_raw).toBe('EA303');
    expect(parsed2.is_online).toBe(false);
    expect(parsed2.location_id).toBe('loc-ea303');
    expect(parsed2.lecturer_code).toBe('NUR');

    // Cell with purely online class (no physical classroom)
    const parsed3 = parseCell('MPU21032(L) UST EMSTEAM', locations);
    expect(parsed3.course_code).toBe('MPU21032');
    expect(parsed3.class_type).toBe('KULIAH');
    expect(parsed3.room_raw).toBe('EMSTEAM');
    expect(parsed3.is_online).toBe(true);
    expect(parsed3.location_id).toBeNull();
    expect(parsed3.lecturer_code).toBe('UST');
  });

  it('should support composite / split rooms (e.g. EA301/EA302)', () => {
    const locations: RoomLocationLookup[] = [
      { id: 'loc-ea301', room_code: 'EA301', search_tags: 'JKE, A301' },
      { id: 'loc-ea302', room_code: 'EA302', search_tags: 'JKE, A302' },
    ];

    const parsed = parseCell('DEE20153(L) AI EA301/EA302', locations);
    expect(parsed.course_code).toBe('DEE20153');
    expect(parsed.class_type).toBe('KULIAH');
    expect(parsed.room_raw).toBe('EA301/EA302');
    expect(parsed.is_online).toBe(false);
    expect(parsed.location_id).toBe('loc-ea301');
    expect(parsed.lecturer_code).toBe('AI');
  });

  it('should normalize timetable header time strings accurately (1:00 PM -> 13:00)', () => {
    // 12-hour format afternoon hours in Malaysian polytechnic timetables
    expect(normalizeTimetableTime('1:00')).toBe('13:00');
    expect(normalizeTimetableTime('01:00')).toBe('13:00');
    expect(normalizeTimetableTime('2:00')).toBe('14:00');
    expect(normalizeTimetableTime('3:00')).toBe('15:00');
    expect(normalizeTimetableTime('4:00')).toBe('16:00');
    expect(normalizeTimetableTime('5:00')).toBe('17:00');
    expect(normalizeTimetableTime('6:00')).toBe('18:00');

    // Dot notation
    expect(normalizeTimetableTime('1.00')).toBe('13:00');
    expect(normalizeTimetableTime('2.00')).toBe('14:00');

    // Range notation
    expect(normalizeTimetableTime('1:00 - 2:00')).toBe('13:00');
    expect(normalizeTimetableTime('8:00 - 9:00')).toBe('08:00');

    // Morning and noon hours
    expect(normalizeTimetableTime('8:00')).toBe('08:00');
    expect(normalizeTimetableTime('08:00')).toBe('08:00');
    expect(normalizeTimetableTime('9:00')).toBe('09:00');
    expect(normalizeTimetableTime('10:00')).toBe('10:00');
    expect(normalizeTimetableTime('11:00')).toBe('11:00');
    expect(normalizeTimetableTime('12:00')).toBe('12:00');

    // Already 24-hour format
    expect(normalizeTimetableTime('13:00')).toBe('13:00');
    expect(normalizeTimetableTime('14:00')).toBe('14:00');

    // Invalid string
    expect(normalizeTimetableTime('')).toBeNull();
    expect(normalizeTimetableTime('ISNIN')).toBeNull();
  });

  it('should correctly parse afternoon classes with 1:00 as 13:00 (1:00 PM, not 1:00 AM)', () => {
    // Synthetic grid where time headers are 8:00, 9:00, 12:00, 1:00, 2:00
    const items = [
      { str: 'KELAS : DEE1A', x: 50, y: 550, width: 80, height: 10 },
      { str: 'SESI : I : 2026/2027', x: 200, y: 550, width: 100, height: 10 },

      // Time headers across the top (X increases left-to-right)
      { str: '8:00', x: 100, y: 480, width: 30, height: 10 },
      { str: '9:00', x: 180, y: 480, width: 30, height: 10 },
      { str: '12:00', x: 260, y: 480, width: 30, height: 10 },
      { str: '1:00', x: 340, y: 480, width: 30, height: 10 }, // 1:00 PM
      { str: '2:00', x: 420, y: 480, width: 30, height: 10 }, // 2:00 PM

      // Day 1: ISNIN
      { str: 'ISNIN', x: 30, y: 400, width: 40, height: 10 },

      // Morning class at 8:00 AM (x=100)
      { str: 'DEE1013(L)', x: 100, y: 395, width: 60, height: 10 },
      { str: 'AI EA301', x: 100, y: 380, width: 50, height: 10 },

      // Afternoon class at 1:00 PM (x=340)
      { str: 'DEE1022(P)', x: 340, y: 395, width: 60, height: 10 },
      { str: 'NUR EA302', x: 340, y: 380, width: 50, height: 10 },
    ];

    const { entries } = extractTimetableFromItems(items);

    expect(entries.length).toBe(2);

    // Morning class at 8:00 AM -> 08:00:00
    const morningClass = entries.find((e) => e.course_code === 'DEE1013');
    expect(morningClass).toBeDefined();
    expect(morningClass!.start_time).toBe('08:00:00');
    expect(morningClass!.end_time).toBe('09:00:00');

    // Afternoon class at 1:00 PM -> MUST BE 13:00:00, NOT 01:00:00!
    const afternoonClass = entries.find((e) => e.course_code === 'DEE1022');
    expect(afternoonClass).toBeDefined();
    expect(afternoonClass!.start_time).toBe('13:00:00');
    expect(afternoonClass!.end_time).toBe('14:00:00');
  });

  it('should support double-row SPMP header times (8:00..4:00 on top, 9:00..5:00 on bottom) without column collapse', () => {
    const items = [
      { str: 'KELAS : DKA1A', x: 50, y: 700, width: 80, height: 10 },
      { str: 'SESI : S1 20262027', x: 200, y: 700, width: 100, height: 10 },

      // Upper row of time headers (y=640)
      { str: '8:00', x: 104.5, y: 640.9, width: 30, height: 10 },
      { str: '9:00', x: 222.7, y: 640.9, width: 30, height: 10 },
      { str: '10:00', x: 340.9, y: 640.9, width: 30, height: 10 },
      { str: '11:00', x: 459.1, y: 640.9, width: 30, height: 10 },
      { str: '12:00', x: 577.3, y: 640.9, width: 30, height: 10 },
      { str: '1:00', x: 695.5, y: 640.9, width: 30, height: 10 },
      { str: '2:00', x: 813.6, y: 640.9, width: 30, height: 10 },
      { str: '3:00', x: 931.8, y: 640.9, width: 30, height: 10 },
      { str: '4:00', x: 1050.0, y: 640.9, width: 30, height: 10 },

      // Lower row of time headers (y=624)
      { str: '9:00', x: 188.3, y: 624.4, width: 30, height: 10 },
      { str: '10:00', x: 300.3, y: 624.4, width: 30, height: 10 },
      { str: '11:00', x: 418.5, y: 624.4, width: 30, height: 10 },
      { str: '12:00', x: 536.7, y: 624.4, width: 30, height: 10 },
      { str: '1:00', x: 661.1, y: 624.4, width: 30, height: 10 },
      { str: '2:00', x: 779.3, y: 624.4, width: 30, height: 10 },
      { str: '3:00', x: 897.4, y: 624.4, width: 30, height: 10 },
      { str: '4:00', x: 1015.6, y: 624.4, width: 30, height: 10 },
      { str: '5:00', x: 1133.8, y: 624.4, width: 30, height: 10 },

      // Day: ISNIN (y=595.2)
      { str: 'ISNIN', x: 49.3, y: 595.2, width: 40, height: 10 },

      // Class 1 in column 10:00-11:00 (x=372.4)
      { str: 'DCC40423(L)', x: 372.4, y: 606.4, width: 60, height: 10 },
      { str: 'RMR', x: 386.1, y: 595.9, width: 30, height: 10 },
      { str: 'CPJ108', x: 381.4, y: 585.4, width: 40, height: 10 },

      // Class 2 in column 14:00-15:00 (x=845.1)
      { str: 'DCC40412(L)', x: 845.1, y: 606.4, width: 60, height: 10 },
      { str: 'ARAR', x: 857.2, y: 595.9, width: 30, height: 10 },
      { str: 'CPJ407', x: 854.1, y: 585.4, width: 40, height: 10 },
    ];

    const { entries } = extractTimetableFromItems(items);
    expect(entries.length).toBe(2);

    const class1 = entries.find((e) => e.course_code === 'DCC40423');
    expect(class1).toBeDefined();
    expect(class1!.start_time).toBe('10:00:00');
    expect(class1!.end_time).toBe('11:00:00');
    expect(class1!.room_raw).toBe('CPJ108');
    expect(class1!.lecturer_code).toBe('RMR');

    const class2 = entries.find((e) => e.course_code === 'DCC40412');
    expect(class2).toBeDefined();
    expect(class2!.start_time).toBe('14:00:00');
    expect(class2!.end_time).toBe('15:00:00');
    expect(class2!.room_raw).toBe('CPJ407');
    expect(class2!.lecturer_code).toBe('ARAR');
  });

  it('should parse course codes with spaces (MPU 21072) and underscores (ELECTIVE_JKM)', () => {
    expect(parseCourseCodeAndType('MPU 21072(L)')).toEqual({
      courseCode: 'MPU 21072',
      classType: 'KULIAH',
    });
    expect(parseCourseCodeAndType('MPU 21072(TU)')).toEqual({
      courseCode: 'MPU 21072',
      classType: 'TUTORIAL',
    });
    expect(parseCourseCodeAndType('ELECTIVE_JKM(L)')).toEqual({
      courseCode: 'ELECTIVE_JKM',
      classType: 'KULIAH',
    });
    expect(parseCourseCodeAndType('MPU24XXX(P)')).toEqual({
      courseCode: 'MPU24XXX',
      classType: 'AMALI',
    });
    expect(parseCourseCodeAndType('MPU24XX1(P)')).toEqual({
      courseCode: 'MPU24XX1',
      classType: 'AMALI',
    });
  });

  it('should parse multi-course cells (e.g. MPU24031(P), MPU24041(P)) without leaking into lecturer', () => {
    const parsed = parseCell('MPU24031(P), MPU24041(P), KOKO JPH');
    expect(parsed.course_code).toBe('MPU24031 / MPU24041');
    expect(parsed.class_type).toBe('AMALI');
    expect(parsed.lecturer_code).toBe('KOKO');
    expect(parsed.room_raw).toBe('JPH');
    expect(parsed.is_online).toBe(false);
  });

  it('should recognize all department online Teams keywords and clean trailing commas', () => {
    // JP (PMSTEAM1, PMSTEAM2)
    const jpCell = parseCell('DPS10033(L) PMRR PMSTEAM1');
    expect(jpCell.is_online).toBe(true);
    expect(jpCell.room_raw).toBe('PMSTEAM1');

    // JKA / JKM (CMSTEAM)
    const jkaCell = parseCell('DUW10042(L) RAR CMSTEAM');
    expect(jkaCell.is_online).toBe(true);
    expect(jkaCell.room_raw).toBe('CMSTEAM');

    // JTM (MMSTEAM)
    const jtmCell = parseCell('DMT10293(L) SHARINA MMSTEAM');
    expect(jtmCell.is_online).toBe(true);
    expect(jtmCell.room_raw).toBe('MMSTEAM');

    // Physical room priority with trailing comma: MMD103, MMSTEAM -> MMD103 (online: false)
    const hybridCell = parseCell('DMT10283(L) ROSLIZA MMD103, MMSTEAM');
    expect(hybridCell.is_online).toBe(false);
    expect(hybridCell.room_raw).toBe('MMD103');
    expect(hybridCell.lecturer_code).toBe('ROSLIZA');
  });

  it('should capture classes when course code is near top of cell and day label is in middle of band (no dead zone)', () => {
    // Simulating SPMP senior class layout (e.g. DKA5A):
    // Header times at Y=640 and Y=624.
    // ISNIN label at Y=579.
    // Course code at Y=606 (above ISNIN + 15).
    const items = [
      { str: 'KELAS : DKA5A', x: 50, y: 660, width: 80, height: 10 },
      { str: 'SESI : S1 20262027', x: 200, y: 660, width: 100, height: 10 },
      { str: 'TARIKH KUATKUASA : 29-June-2026', x: 50, y: 650, width: 120, height: 10 },
      // Header times (upper & lower)
      { str: '8:00', x: 100, y: 640, width: 30, height: 10 },
      { str: '9:00', x: 100, y: 624, width: 30, height: 10 },
      { str: '9:00', x: 200, y: 640, width: 30, height: 10 },
      { str: '10:00', x: 200, y: 624, width: 30, height: 10 },
      // ISNIN label centered at Y=579
      { str: 'ISNIN', x: 30, y: 579, width: 40, height: 10 },
      // Course in slot 08:00 at Y=606 (would be cut off by yTop = curY + 15)
      { str: 'DCC50492(L)', x: 100, y: 606, width: 60, height: 10 },
      { str: 'NK', x: 100, y: 585, width: 30, height: 10 },
      { str: 'CPJ407', x: 100, y: 570, width: 40, height: 10 },
      // SELASA at Y=520
      { str: 'SELASA', x: 30, y: 520, width: 40, height: 10 },
      { str: 'DCC50522(L)', x: 200, y: 535, width: 60, height: 10 },
      { str: 'JJ', x: 200, y: 520, width: 30, height: 10 },
      { str: 'CMA103', x: 200, y: 505, width: 40, height: 10 },
    ];

    const { entries } = extractTimetableFromItems(items);
    expect(entries.length).toBe(2);

    const mondayEntry = entries.find((e) => e.day_of_week === 1);
    expect(mondayEntry).toBeDefined();
    expect(mondayEntry!.course_code).toBe('DCC50492');
    expect(mondayEntry!.room_raw).toBe('CPJ407');
    expect(mondayEntry!.lecturer_code).toBe('NK');

    const tuesdayEntry = entries.find((e) => e.day_of_week === 2);
    expect(tuesdayEntry).toBeDefined();
    expect(tuesdayEntry!.course_code).toBe('DCC50522');
  });

  it('should extract bottom-level workshop rooms when amali has multi-line lecturers and ignore single-char overflow', () => {
    // Simulating DAD1A Friday amali with 5 levels:
    // Level 0: Course
    // Level 1: Lecturers line 1
    // Level 2: Lecturers line 2 (starts with single char "S")
    // Level 3: Lecturers line 3
    // Level 4: Workshops (bottom level)
    const cellItems: PdfTextItem[] = [
      { str: 'DJJ10232(P)', x: 100, y: 448, width: 60, height: 10 },
      { str: 'FARID,SYED,AMIN A,HADRY,AMIN', x: 100, y: 437, width: 120, height: 10 },
      { str: 'S,HAZ,JUE,SYAMSI,MAS,MUNIRAH,OTH', x: 100, y: 427, width: 130, height: 10 },
      { str: 'MAN,ACR', x: 100, y: 416, width: 60, height: 10 },
      { str: 'JGEGAS, JMESIN2, JKIMPALAN', x: 100, y: 406, width: 120, height: 10 },
    ];

    const parsed = parseCell(cellItems);
    expect(parsed.course_code).toBe('DJJ10232');
    expect(parsed.class_type).toBe('AMALI');
    // Workshop rooms extracted from bottom level, joined with slash
    expect(parsed.room_raw).toBe('JGEGAS/JMESIN2/JKIMPALAN');
    // Single char "S" is NOT treated as room
    expect(parsed.room_raw).not.toBe('S');
    expect(parsed.is_online).toBe(false);
  });

  it('should correctly recognize named workshops across JKA (CPROJEK, CBBATA) and JTM (MFIZIKAL, MSENSORI)', () => {
    // JKA CPROJEK
    const jkaProjek = parseCell('DCC50513(P) JJ,RMR CPROJEK');
    expect(jkaProjek.room_raw).toBe('CPROJEK');
    expect(jkaProjek.is_online).toBe(false);

    // JKA CBBATA
    const jkaBata = parseCell('DCC10273(P) ELA,NLJ CBBATA');
    expect(jkaBata.room_raw).toBe('CBBATA');

    // JTM MFIZIKAL
    const jtmFizikal = parseCell('DMT30353(P) RABIATUL MFIZIKAL');
    expect(jtmFizikal.room_raw).toBe('MFIZIKAL');

    // JTM MSENSORI
    const jtmSensori = parseCell('DMT50454(P) IMAN,NUSRAH MSENSORI');
    expect(jtmSensori.room_raw).toBe('MSENSORI');
  });
});
