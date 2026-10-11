import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

describe('MyTimetableView & AkademikTakwimPage Unified Tabs', () => {
  const myTimetableViewPath = path.resolve(__dirname, '../components/takwim/MyTimetableView.tsx');
  const takwimPagePath = path.resolve(__dirname, '../pages/akademik/AkademikTakwimPage.tsx');

  it('verifies MyTimetableView exists and implements grid, agenda, and upload actions', () => {
    expect(fs.existsSync(myTimetableViewPath)).toBe(true);
    const content = fs.readFileSync(myTimetableViewPath, 'utf-8');
    expect(content).toContain('student_timetables');
    expect(content).toContain('student_timetable_settings');
    expect(content).toContain('TimetableUploadModal');
    expect(content).toContain('TimetablePreviewModal');
  });

  it('verifies AkademikTakwimPage integrates dual main tabs (Personal & Pusat)', () => {
    expect(fs.existsSync(takwimPagePath)).toBe(true);
    const content = fs.readFileSync(takwimPagePath, 'utf-8');
    expect(content).toContain('MyTimetableView');
    expect(content).toContain('Jadual Kuliah Saya');
    expect(content).toContain('Takwim Rasmi');
  });

  it('ensures zero raw emojis in MyTimetableView.tsx', () => {
    if (fs.existsSync(myTimetableViewPath)) {
      const content = fs.readFileSync(myTimetableViewPath, 'utf-8');
      const emojis = content.match(EMOJI_REGEX) || [];
      expect(emojis).toEqual([]);
    }
  });
});
