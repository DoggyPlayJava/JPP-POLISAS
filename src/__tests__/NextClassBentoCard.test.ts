import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  parseTimeToMinutes,
  formatDisplayTime,
  getMalaysianNow,
  findNextUpcomingClass,
  buildPolyMapsRoomUrl,
} from '../components/portal/NextClassBentoCard';
import type { StudentTimetableEntry } from '../types';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

describe('NextClassBentoCard Implementation & Parity', () => {
  const cardPath = path.resolve(__dirname, '../components/portal/NextClassBentoCard.tsx');
  const portalPath = path.resolve(__dirname, '../pages/PortalPage.tsx');

  it('verifies NextClassBentoCard exists and implements live countdown and PolyMaps deep link', () => {
    expect(fs.existsSync(cardPath)).toBe(true);
    const content = fs.readFileSync(cardPath, 'utf-8');
    expect(content).toContain('Asia/Kuala_Lumpur');
    expect(content).toContain('polymaps?room=');
    expect(content).toContain('is_online');
  });

  it('verifies PortalPage integrates NextClassBentoCard in parallel fetch and UI', () => {
    expect(fs.existsSync(portalPath)).toBe(true);
    const content = fs.readFileSync(portalPath, 'utf-8');
    expect(content).toContain('NextClassBentoCard');
    expect(content).toContain('student_timetables');
  });

  it('ensures zero raw emojis in NextClassBentoCard.tsx', () => {
    expect(fs.existsSync(cardPath)).toBe(true);
    const content = fs.readFileSync(cardPath, 'utf-8');
    const emojis = content.match(EMOJI_REGEX) || [];
    expect(emojis).toEqual([]);
  });

  it('correctly converts time strings to minutes from midnight', () => {
    expect(parseTimeToMinutes('08:00:00')).toBe(480);
    expect(parseTimeToMinutes('08:30')).toBe(510);
    expect(parseTimeToMinutes('14:45:00')).toBe(885);
    expect(parseTimeToMinutes('')).toBe(0);
    expect(parseTimeToMinutes(null)).toBe(0);
  });

  it('correctly formats display time to HH:mm', () => {
    expect(formatDisplayTime('08:00:00')).toBe('08:00');
    expect(formatDisplayTime('14:30')).toBe('14:30');
    expect(formatDisplayTime('')).toBe('');
    expect(formatDisplayTime(null)).toBe('');
  });

  it('evaluates Malaysian time zone (Asia/Kuala_Lumpur)', () => {
    const myTime = getMalaysianNow();
    expect(myTime.dayOfWeek).toBeGreaterThanOrEqual(0);
    expect(myTime.dayOfWeek).toBeLessThanOrEqual(6);
    expect(myTime.hour).toBeGreaterThanOrEqual(0);
    expect(myTime.hour).toBeLessThanOrEqual(23);
    expect(myTime.minute).toBeGreaterThanOrEqual(0);
    expect(myTime.minute).toBeLessThanOrEqual(59);
    expect(myTime.currentMinutes).toBe(myTime.hour * 60 + myTime.minute);
  });

  it('skips weekends and identifies next scheduled class accurately', () => {
    const mockEntries: StudentTimetableEntry[] = [
      {
        id: '1',
        user_id: 'u1',
        academic_session: 'I 2026/2027',
        semester: '3',
        class_name: 'DDT3A',
        day_of_week: 1, // Isnin
        start_time: '08:00:00',
        end_time: '10:00:00',
        course_code: 'DFC30133',
        course_name: 'Python Programming',
        class_type: 'KULIAH',
        room_raw: 'EA301',
        location_id: 'loc-1',
        is_online: false,
        color: '#3b82f6',
        is_archived: false,
      },
      {
        id: '2',
        user_id: 'u1',
        academic_session: 'I 2026/2027',
        semester: '3',
        class_name: 'DDT3A',
        day_of_week: 3, // Rabu
        start_time: '10:00:00',
        end_time: '12:00:00',
        course_code: 'DFC30143',
        course_name: 'Web Dev',
        class_type: 'AMALI',
        room_raw: 'MK1',
        location_id: null,
        is_online: false,
        color: '#10b981',
        is_archived: false,
      },
    ];

    // From Friday (day 5), next class is Monday (day 1)
    const nextFromFri = findNextUpcomingClass(mockEntries, 5);
    expect(nextFromFri).not.toBeNull();
    expect(nextFromFri?.entry.day_of_week).toBe(1);
    expect(nextFromFri?.dayLabel).toBe('Isnin');

    // From Sunday (day 0), next class is Monday (day 1, tomorrow)
    const nextFromSun = findNextUpcomingClass(mockEntries, 0);
    expect(nextFromSun).not.toBeNull();
    expect(nextFromSun?.entry.day_of_week).toBe(1);
    expect(nextFromSun?.isTomorrow).toBe(true);

    // From Monday (day 1), next class is Wednesday (day 3)
    const nextFromMon = findNextUpcomingClass(mockEntries, 1);
    expect(nextFromMon).not.toBeNull();
    expect(nextFromMon?.entry.day_of_week).toBe(3);
    expect(nextFromMon?.dayLabel).toBe('Rabu');
  });

  it('correctly constructs PolyMaps deep link URL without malformed q= prefixes', () => {
    // When location_id is present, uses location_id
    expect(
      buildPolyMapsRoomUrl({
        location_id: 'loc-123-uuid',
        room_raw: 'EA301',
      })
    ).toBe('/polymaps?room=loc-123-uuid');

    // When location_id is null, falls back to encoded room_raw directly
    expect(
      buildPolyMapsRoomUrl({
        location_id: null,
        room_raw: 'A301',
      })
    ).toBe('/polymaps?room=A301');

    // Never produces malformed ?room=q=A301
    const url = buildPolyMapsRoomUrl({
      location_id: null,
      room_raw: 'BK A',
    });
    expect(url).toBe('/polymaps?room=BK%20A');
    expect(url).not.toContain('?room=q=');
  });

  it('verifies collapsible functionality with localStorage persistence and default compact state', () => {
    const content = fs.readFileSync(cardPath, 'utf-8');
    expect(content).toContain('portal_next_class_collapsed');
    expect(content).toContain('isCollapsed');
    expect(content).toContain('toggleCollapsed');
    expect(content).toContain('ChevronDown');
    expect(content).toContain('ChevronUp');
    // Default is collapsed (compact view)
    expect(content).toContain("return saved !== null ? saved === 'true' : true;");
    // Direct action buttons in compact bar stop propagation
    expect(content).toContain('onClick={(e) => e.stopPropagation()}');
    // Prevents redundant header repetitions
    expect(content).toContain('displayName');
    // Includes ongoing progress bar
    expect(content).toContain('progressPercent');
  });
});
