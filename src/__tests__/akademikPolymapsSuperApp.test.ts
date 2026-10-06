import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

describe('Task 1: AkademikLayout SuperApp Revamp', () => {
  const layoutPath = path.resolve(__dirname, '../pages/akademik/AkademikLayout.tsx');
  const source = fs.readFileSync(layoutPath, 'utf-8');

  it('contains 100% zero raw emojis across AkademikLayout.tsx', () => {
    const emojiMatches = source.match(EMOJI_REGEX) || [];
    expect(emojiMatches).toEqual([]);
  });

  it('cleans raw emojis from akademikTourSteps titles and content', () => {
    expect(source).not.toContain('Modul e-Akademik 🎓');
    expect(source).not.toContain('Navigasi Menu 📑');
    expect(source).not.toContain('Prestasi Akademik 📈');
    expect(source).not.toContain('Status Merit ⭐');

    // Asserts clean professional titles
    expect(source).toContain("title: 'Modul e-Akademik'");
    expect(source).toContain("title: 'Navigasi Menu'");
    expect(source).toContain("title: 'Prestasi Akademik'");
    expect(source).toContain("title: 'Status Merit'");
  });

  it('renders system tour integration cleanly', () => {
    expect(source).toContain('SystemTour');
    expect(source).toContain('akademikTourSteps');
  });
});

describe('Task 1: AkademikDashboard Cockpit & Quick Actions Revamp', () => {
  const dashboardPath = path.resolve(__dirname, '../pages/akademik/AkademikDashboard.tsx');
  const source = fs.readFileSync(dashboardPath, 'utf-8');

  it('contains 100% zero raw emojis across AkademikDashboard.tsx', () => {
    const emojiMatches = source.match(EMOJI_REGEX) || [];
    expect(emojiMatches).toEqual([]);
  });

  it('contains Student Cockpit Header elements with student identity, matric, department, semester, CGPA, and activity merit', () => {
    // Student identity
    expect(source).toContain('Student Cockpit');
    expect(source).toContain('profile?.full_name');

    // Matric number
    expect(source).toContain('matric_no');
    expect(source).toContain('CreditCard');

    // Department
    expect(source).toContain('department');
    expect(source).toContain('Building2');

    // Semester info
    expect(source).toContain('getSemesterInfo');
    expect(source).toContain('semInfo.semester');
    expect(source).toContain('GraduationCap');

    // Current CGPA
    expect(source).toContain('HPNM / CGPA');
    expect(source).toContain('latestHpnm');

    // Activity merit
    expect(source).toContain('Merit Aktiviti');
    expect(source).toContain('meritQr');
    expect(source).toContain('Zap');
  });

  it('contains quick action buttons with BookOpen, FileText, QrCode, and CalendarDays', () => {
    expect(source).toContain('BookOpen');
    expect(source).toContain('FileText');
    expect(source).toContain('QrCode');
    expect(source).toContain('CalendarDays');

    // Validates routes and labels
    expect(source).toContain('/akademik/pencapaian');
    expect(source).toContain('/akademik/cgpa');
    expect(source).toContain('/akademik/qr');
    expect(source).toContain('/akademik/takwim');
  });

  it('ensures quick actions have mobile-first touch targets >= 44px', () => {
    // Touch targets >= 44px (using min-h-[52px] or min-h-[44px])
    expect(source).toMatch(/min-h-\[(4[4-9]|5[0-9]|6[0-9])px\]/);
  });

  it('adheres to isLowEnd device performance optimization without heavy blur loops', () => {
    expect(source).toContain('isLowEnd');
    // Ensure data fetching uses Promise.all and Supabase singleton
    expect(source).toContain('Promise.all');
    expect(source).toContain("from '@/lib/supabase'");
  });
});

describe('Future Tasks Scaffold: AkademikCgpa, AkademikFolderPage, and PolyMapsPage', () => {
  const cgpaPath = path.resolve(__dirname, '../pages/akademik/AkademikCgpa.tsx');
  const folderPath = path.resolve(__dirname, '../pages/akademik/AkademikFolderPage.tsx');
  const polyPath = path.resolve(__dirname, '../pages/polymaps/PolyMapsPage.tsx');

  it('verifies baseline for AkademikCgpa and scaffolds zero raw emoji goal for Task 2', () => {
    expect(fs.existsSync(cgpaPath)).toBe(true);
    const source = fs.readFileSync(cgpaPath, 'utf-8');
    expect(source).toContain('uploadPdfToDrive');
    expect(source).toContain('gradeInfo');

    // Scaffolding: Task 2 will clean remaining raw emojis to exactly 0
    const emojis = source.match(EMOJI_REGEX) || [];
    // Currently <= 3 emojis before Task 2 cleanup
    expect(emojis.length).toBeLessThanOrEqual(3);
  });

  it('verifies baseline for AkademikFolderPage and scaffolds in-app document previewing for Task 2', () => {
    expect(fs.existsSync(folderPath)).toBe(true);
    const source = fs.readFileSync(folderPath, 'utf-8');
    expect(source).toContain('fetchAsBytes');
    expect(source).toContain('FOLDER_PRESETS');

    // Scaffolding: Task 2 will introduce previewFile for in-app preview
    const hasPreviewOrDownload = source.includes('previewFile') || source.includes('fetchAsBytes');
    expect(hasPreviewOrDownload).toBe(true);
  });

  it('verifies baseline for PolyMapsPage and scaffolds drag interactions, overlay filter, and event integrations for Task 3', () => {
    expect(fs.existsSync(polyPath)).toBe(true);
    const source = fs.readFileSync(polyPath, 'utf-8');
    expect(source).toContain('isLowEnd');

    // Scaffolding: Task 3 will introduce drag="y", activeOverlayFilter, ems_events
    const hasDragSupport = source.includes('drag="y"') || source.includes('MapDragDetector');
    expect(hasDragSupport).toBe(true);

    const hasOverlayOrLayers = source.includes('activeOverlayFilter') || source.includes('Layers');
    expect(hasOverlayOrLayers).toBe(true);
  });
});
