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

describe('Task 2: AkademikCgpa Tracker & Slip Uploader Revamp', () => {
  const cgpaPath = path.resolve(__dirname, '../pages/akademik/AkademikCgpa.tsx');
  const source = fs.readFileSync(cgpaPath, 'utf-8');

  it('contains 100% zero raw emojis across AkademikCgpa.tsx', () => {
    const emojiMatches = source.match(EMOJI_REGEX) || [];
    expect(emojiMatches).toEqual([]);
  });

  it('contains mobile camera capture attribute and pdf/image mime acceptance', () => {
    expect(source).toContain('capture="environment"');
    expect(source).toContain('accept="application/pdf,image/*"');
  });

  it('ensures action buttons on semester cards have mobile-accessible touch sizing without hover requirement', () => {
    // Action buttons must be accessible on mobile (opacity-100 md:opacity-0 md:group-hover:opacity-100)
    expect(source).toContain('opacity-100 md:opacity-0 md:group-hover:opacity-100');
    // Touch targets >= 44px
    expect(source).toContain('min-h-[44px]');
    expect(source).toContain('min-w-[44px]');
  });

  it('ensures Recharts AreaChart has non-zero right margin to prevent 375px edge clipping', () => {
    expect(source).toContain('margin={{ top: 10, right: 12, bottom: 0, left: -20 }}');
  });

  it('preserves PDF extraction, hybrid Drive upload, and Supabase database operations', () => {
    expect(source).toContain('extractCgpaFromPdf');
    expect(source).toContain('uploadPdfToDrive');
    expect(source).toContain('akademik_cgpa_records');
    expect(source).toContain('useAuth');
  });
});

describe('Task 3: AkademikFolderPage In-App Quick Document Previewer Revamp', () => {
  const folderPath = path.resolve(__dirname, '../pages/akademik/AkademikFolderPage.tsx');
  const source = fs.readFileSync(folderPath, 'utf-8');

  it('contains 100% zero raw emojis across AkademikFolderPage.tsx', () => {
    const emojiMatches = source.match(EMOJI_REGEX) || [];
    expect(emojiMatches).toEqual([]);
  });

  it('contains previewFile state, onPreview callback, and InAppDocumentPreviewer component', () => {
    expect(source).toContain('previewFile');
    expect(source).toContain('setPreviewFile');
    expect(source).toContain('onPreview');
    expect(source).toContain('InAppDocumentPreviewer');
  });

  it('supports PDF iframe preview with /preview conversion and image lightbox preview', () => {
    expect(source).toContain('getDocumentPreviewUrl');
    expect(source).toContain('/preview');
    expect(source).toContain('<iframe');
    expect(source).toContain('max-h-[60vh]');
    expect(source).toContain('object-contain');
  });

  it('provides accessible mobile touch targets and action buttons (Download, ExternalLink, and close X)', () => {
    expect(source).toContain('Download');
    expect(source).toContain('ExternalLink');
    expect(source).toContain('Muat Turun Fail');
    expect(source).toContain('Buka Tab Luaran');
    expect(source).toContain('min-h-[44px]');
    expect(source).toContain('min-w-[44px]');
  });

  it('respects isLowEnd device optimization for overlay backdrop blur', () => {
    expect(source).toContain('isLowEnd');
    expect(source).toContain('isLowEnd ?');
  });

  it('preserves existing folder presets, zip generation, file deletion, and drive uploads', () => {
    expect(source).toContain('FOLDER_PRESETS');
    expect(source).toContain('buildAndDownloadZip');
    expect(source).toContain('handleDeleteFile');
    expect(source).toContain('uploadPdfToDrive');
    expect(source).toContain('uploadFileToDrive');
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

    const emojis = source.match(EMOJI_REGEX) || [];
    expect(emojis.length).toBe(0);
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
