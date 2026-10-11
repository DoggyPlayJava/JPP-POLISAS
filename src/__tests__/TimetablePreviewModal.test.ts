import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  checkTimetableConflicts,
  computeDefaultSemesterDates,
  inferSemesterFromClassName,
  parseTimeToMinutes,
} from '../components/takwim/TimetablePreviewModal';

describe('Timetable Modals Implementation & Parity', () => {
  const previewModalPath = path.resolve(__dirname, '../components/takwim/TimetablePreviewModal.tsx');
  const uploadModalPath = path.resolve(__dirname, '../components/takwim/TimetableUploadModal.tsx');

  it('verifies TimetablePreviewModal contains mandatory disclosure and slot edit handlers', () => {
    expect(fs.existsSync(previewModalPath)).toBe(true);
    const content = fs.readFileSync(previewModalPath, 'utf-8');
    expect(content).toContain('Ini adalah jadual kuliah mingguan biasa');
    expect(content).toContain('student_timetables');
    expect(content).toContain('student_timetable_metadata');
  });

  it('verifies TimetableUploadModal contains pdf scan and class selector dropdown', () => {
    expect(fs.existsSync(uploadModalPath)).toBe(true);
    const content = fs.readFileSync(uploadModalPath, 'utf-8');
    expect(content).toContain('scanPdfClasses');
    expect(content).toContain('parseTimetablePage');
  });

  it('correctly converts time strings to minutes', () => {
    expect(parseTimeToMinutes('08:00')).toBe(480);
    expect(parseTimeToMinutes('08:30:00')).toBe(510);
    expect(parseTimeToMinutes('16:15:00')).toBe(975);
    expect(parseTimeToMinutes('')).toBe(0);
  });

  it('detects overlapping slot conflicts on the same day', () => {
    const slots = [
      { day_of_week: 1, start_time: '08:00:00', end_time: '10:00:00', course_code: 'DEE1013' },
      { day_of_week: 1, start_time: '09:00:00', end_time: '11:00:00', course_code: 'DEE1022' },
      { day_of_week: 2, start_time: '08:00:00', end_time: '10:00:00', course_code: 'DEE1033' },
    ];

    const conflicts = checkTimetableConflicts(slots);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].dayOfWeek).toBe(1);
    expect(conflicts[0].indexA).toBe(0);
    expect(conflicts[0].indexB).toBe(1);
    expect(conflicts[0].message).toContain('Pertindihan pada hari Isnin');
  });

  it('does not flag adjacent slots as conflicts', () => {
    const slots = [
      { day_of_week: 1, start_time: '08:00:00', end_time: '10:00:00', course_code: 'DEE1013' },
      { day_of_week: 1, start_time: '10:00:00', end_time: '12:00:00', course_code: 'DEE1022' },
    ];

    const conflicts = checkTimetableConflicts(slots);
    expect(conflicts.length).toBe(0);
  });

  it('calculates semester dates from effectiveDate + 18 weeks', () => {
    const dates = computeDefaultSemesterDates('08-07-2024');
    expect(dates.startDate).toBe('2024-07-08');
    // 18 weeks later (126 days)
    expect(dates.endDate).toBe('2024-11-11');
  });

  it('falls back to takwim template dates when effectiveDate is missing', () => {
    const sesi1Dates = computeDefaultSemesterDates('', 'SESI I : 2026/2027');
    expect(sesi1Dates.startDate).toBe('2026-06-22');
    expect(sesi1Dates.endDate).toBe('2026-11-08');

    const sesi2Dates = computeDefaultSemesterDates(undefined, 'SESI II');
    expect(sesi2Dates.startDate).toBe('2026-11-23');
    expect(sesi2Dates.endDate).toBe('2027-04-18');
  });

  it('infers semester number from standard Malaysian polytechnic class names', () => {
    expect(inferSemesterFromClassName('DEE1A')).toBe('1');
    expect(inferSemesterFromClassName('DTK4B')).toBe('4');
    expect(inferSemesterFromClassName('DIT3A')).toBe('3');
    expect(inferSemesterFromClassName('DSK5B')).toBe('5');
    expect(inferSemesterFromClassName('UNKNOWN')).toBe('1');
    expect(inferSemesterFromClassName('')).toBe('1');
  });

  it('verifies auto-reporting RPC integration for missing timetable rooms', () => {
    const content = fs.readFileSync(previewModalPath, 'utf-8');
    expect(content).toContain('report_missing_timetable_room');
    expect(content).toContain('p_room_code');
  });
});
