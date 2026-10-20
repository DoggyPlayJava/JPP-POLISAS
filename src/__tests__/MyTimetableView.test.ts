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

  it('verifies default view mode is grid matrix with localStorage persistence', () => {
    const content = fs.readFileSync(myTimetableViewPath, 'utf-8');
    expect(content).toContain("jpp_student_timetable_view");
    expect(content).toContain("TimetableMatrixGrid");
    expect(content).toContain("setSelectedDay(0)");
    expect(content).toContain('timetable_all_days');
  });

  it('verifies hero CTA button and empty state use uppercase "MUAT NAIK JADUAL"', () => {
    const content = fs.readFileSync(myTimetableViewPath, 'utf-8');
    expect(content).toContain('MUAT NAIK JADUAL');
    expect(content).not.toContain('Muat Naik PDF');
    expect(content).not.toContain('Muat Naik Fail Jadual PDF');
  });

  it('verifies 2-tier decluttered mobile action bar and desktop toolbar structure', () => {
    const content = fs.readFileSync(myTimetableViewPath, 'utf-8');
    expect(content).toContain('w-full md:w-auto h-10 px-4');
    expect(content).toContain('bg-indigo-600 hover:bg-indigo-700 text-white');
    expect(content).toContain('Tambah Slot');
    expect(content).toContain('Peringatan');
  });

  it('verifies integration of single-slot editing with EditClassSlotModal', () => {
    const content = fs.readFileSync(myTimetableViewPath, 'utf-8');
    expect(content).toContain('EditClassSlotModal');
    expect(content).toContain('editingSlot');
    expect(content).toContain('setEditingSlot');
    expect(content).toContain('onEdit');
  });

  it('verifies ClassCard click-to-edit interaction and Edit2 pencil icon', () => {
    const content = fs.readFileSync(myTimetableViewPath, 'utf-8');
    expect(content).toContain('Edit2');
    expect(content).toContain('cursor-pointer');
    expect(content).toContain('hover:border-indigo-500/40');
    expect(content).toContain('hover:shadow-md');
    expect(content).toContain('hover:-translate-y-0.5');
    expect(content).toContain('e.stopPropagation()');
  });
});
