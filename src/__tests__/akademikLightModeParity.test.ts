import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

describe('E-Akademik Light Mode Parity — Zero Raw Emojis', () => {
  const filePaths = [
    '../pages/akademik/AkademikLayout.tsx',
    '../pages/akademik/AkademikDashboard.tsx',
    '../pages/akademik/AkademikCgpa.tsx',
    '../pages/akademik/AkademikFolderPage.tsx',
    '../pages/akademik/AkademikTakwimPage.tsx',
    '../pages/akademik/AkademikLeaderboard.tsx',
    '../pages/akademik/AkademikPencapaian.tsx',
    '../pages/akademik/AkademikQrPage.tsx',
    '../pages/akademik/AkademikMeritPage.tsx',
    '../components/takwim/DayDetailSheet.tsx',
  ];

  filePaths.forEach((relPath) => {
    it(`contains 100% zero raw emojis in ${path.basename(relPath)}`, () => {
      const fullPath = path.resolve(__dirname, relPath);
      const source = fs.readFileSync(fullPath, 'utf-8');
      const emojiMatches = source.match(EMOJI_REGEX) || [];
      expect(emojiMatches).toEqual([]);
    });
  });
});

describe('E-Akademik Light Mode Parity — AkademikLayout.tsx', () => {
  const layoutPath = path.resolve(__dirname, '../pages/akademik/AkademikLayout.tsx');
  const source = fs.readFileSync(layoutPath, 'utf-8');

  it('contains dual-mode root container classes for porcelain light and obsidian dark', () => {
    expect(source).toContain('min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans overflow-x-hidden transition-colors duration-200');
  });

  it('contains dual-mode top header styles with backdrop-blur', () => {
    expect(source).toContain('sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 py-3.5 border-b border-slate-200/80 dark:border-white/[0.06] bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl');
  });

  it('mounts ThemeToggle component cleanly in the header', () => {
    expect(source).toContain('<ThemeToggle');
  });

  it('provides dual-mode styling for sidebar surface', () => {
    expect(source).toContain('bg-white/95 dark:bg-slate-900/95');
    expect(source).toContain('border-r border-slate-200/80 dark:border-white/[0.06]');
  });

  it('provides dual-mode styling for nav items', () => {
    expect(source).toContain('bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white');
    expect(source).toContain('text-slate-600 dark:text-white/40');
    expect(source).toContain('hover:text-slate-900 dark:hover:text-white/70');
    expect(source).toContain('hover:bg-slate-50 dark:hover:bg-white/[0.04]');
  });

  it('provides dual-mode styling for user profile and footer', () => {
    expect(source).toContain('border-slate-200/80 dark:border-white/[0.06]');
  });
});

describe('E-Akademik Light Mode Parity — AkademikDashboard.tsx', () => {
  const dashboardPath = path.resolve(__dirname, '../pages/akademik/AkademikDashboard.tsx');
  const source = fs.readFileSync(dashboardPath, 'utf-8');

  it('styles StatCard with Apple Porcelain Light and Obsidian Dark tokens', () => {
    expect(source).toContain('bg-white dark:bg-white/[0.03]');
    expect(source).toContain('border-slate-200/80 dark:border-white/[0.06]');
    expect(source).toContain('text-slate-900 dark:text-white');
    expect(source).toContain('shadow-xs');
  });

  it('styles QuickAction with dual-mode background and borders', () => {
    expect(source).toContain('bg-white dark:bg-white/[0.02]');
    expect(source).toContain('border-slate-200/80 dark:border-white/[0.05]');
    expect(source).toContain('hover:bg-slate-50 dark:hover:bg-white/[0.05]');
    expect(source).toContain('text-slate-900 dark:text-white');
  });

  it('styles Student Cockpit Header with dual-mode classes', () => {
    expect(source).toContain('bg-white dark:bg-white/[0.02]');
    expect(source).toContain('border-slate-200/80 dark:border-white/[0.07]');
    expect(source).toContain('text-slate-900 dark:text-white');
  });

  it('uses high-contrast slate text tokens for subheadings, counters, and badges', () => {
    expect(source).toContain('text-slate-500 dark:text-white/40');
  });
});

describe('E-Akademik Light Mode Parity — AkademikCgpa.tsx', () => {
  const cgpaPath = path.resolve(__dirname, '../pages/akademik/AkademikCgpa.tsx');
  const source = fs.readFileSync(cgpaPath, 'utf-8');

  it('styles Hero card with porcelain fallback gradient and obsidian dark styles', () => {
    expect(source).toContain('bg-gradient-to-br from-indigo-50/80 to-white dark:from-slate-900/80 dark:to-slate-950 border border-slate-200/80 dark:border-white/[0.06]');
  });

  it('styles AreaChart container with dual-mode classes', () => {
    expect(source).toContain('bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05] text-slate-900 dark:text-white');
  });

  it('implements responsive CartesianGrid and CustomTooltip for Recharts', () => {
    expect(source).toContain('CartesianGrid stroke="currentColor" className="text-slate-200 dark:text-white/[0.04]"');
    expect(source).toContain('bg-white/95 dark:bg-[#0F1629]/95 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white shadow-xl');
  });

  it('styles semester history cards with porcelain and obsidian dual-mode classes', () => {
    expect(source).toContain('bg-white dark:bg-white/[0.02] border-slate-200/80 dark:border-white/[0.06] text-slate-900 dark:text-white');
  });
});

describe('E-Akademik Light Mode Parity — AkademikFolderPage.tsx', () => {
  const folderPath = path.resolve(__dirname, '../pages/akademik/AkademikFolderPage.tsx');
  const source = fs.readFileSync(folderPath, 'utf-8');

  it('styles FolderCard with dual-mode classes', () => {
    expect(source).toContain('border-slate-200/80 dark:border-white/[0.06]');
    expect(source).toContain('bg-white dark:bg-white/[0.02]');
    expect(source).toContain('text-slate-900 dark:text-white');
    expect(source).toContain('shadow-xs');
  });

  it('styles FileCard with dual-mode classes', () => {
    expect(source).toContain('border-slate-200/70 dark:border-white/[0.05]');
    expect(source).toContain('bg-white dark:bg-white/[0.02]');
    expect(source).toContain('hover:bg-slate-50 dark:hover:bg-white/[0.04]');
    expect(source).toContain('text-slate-900 dark:text-white');
  });

  it('adapts Document Previewer Lightbox cleanly to light and dark themes', () => {
    expect(source).toContain('bg-white dark:bg-[#0F172A]');
    expect(source).toContain('border-slate-200 dark:border-white/10');
  });
});

describe('E-Akademik Light Mode Parity — AkademikTakwimPage.tsx & DayDetailSheet.tsx', () => {
  const takwimPath = path.resolve(__dirname, '../pages/akademik/AkademikTakwimPage.tsx');
  const sheetPath = path.resolve(__dirname, '../components/takwim/DayDetailSheet.tsx');
  const takwimSource = fs.readFileSync(takwimPath, 'utf-8');
  const sheetSource = fs.readFileSync(sheetPath, 'utf-8');

  it('Takwim headers and selectors use dual-mode tokens', () => {
    expect(takwimSource).toContain('text-slate-900 dark:text-white');
    expect(takwimSource).toContain('text-slate-500 dark:text-white/40');
    expect(takwimSource).toContain('bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white');
  });

  it('Takwim calendar view provides high contrast month title and day numbers', () => {
    expect(takwimSource).toContain('border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02]');
    expect(takwimSource).toContain('bg-slate-50/80 dark:bg-white/[0.03]');
    expect(takwimSource).toContain('text-slate-900 dark:text-white uppercase tracking-widest');
    expect(takwimSource).toContain('text-slate-500 dark:text-white/40');
  });

  it('DayDetailSheet adapts cleanly to light and dark modes', () => {
    expect(sheetSource).toContain('bg-white dark:bg-[#0f1117]');
    expect(sheetSource).toContain('border-slate-200 dark:border-white/10');
    expect(sheetSource).toContain('text-slate-900 dark:text-white');
  });
});

describe('E-Akademik Light Mode Parity — AkademikLeaderboard.tsx', () => {
  const lbPath = path.resolve(__dirname, '../pages/akademik/AkademikLeaderboard.tsx');
  const source = fs.readFileSync(lbPath, 'utf-8');

  it('Leaderboard header, tabs, and empty state are visible in light mode', () => {
    expect(source).toContain('text-slate-900 dark:text-white');
    expect(source).toContain('text-slate-500 dark:text-white/40');
    expect(source).toContain('text-slate-400 dark:text-white/20');
    expect(source).toContain('text-slate-300 dark:text-white/10');
    expect(source).toContain('border-slate-200 dark:border-white/[0.08]');
  });
});

describe('E-Akademik Light Mode Parity — AkademikPencapaian.tsx', () => {
  const pencPath = path.resolve(__dirname, '../pages/akademik/AkademikPencapaian.tsx');
  const source = fs.readFileSync(pencPath, 'utf-8');

  it('Pencapaian headers, filter tabs, cards, and empty state are visible in light mode', () => {
    expect(source).toContain('text-slate-900 dark:text-white');
    expect(source).toContain('text-slate-500 dark:text-white/40');
    expect(source).toContain('text-slate-400 dark:text-white/20');
    expect(source).toContain('text-slate-300 dark:text-white/10');
    expect(source).toContain('bg-white dark:bg-white/[0.02]');
    expect(source).toContain('border-slate-200/80 dark:border-white/[0.06]');
  });
});

describe('E-Akademik Light Mode Parity — AkademikQrPage.tsx', () => {
  const qrPath = path.resolve(__dirname, '../pages/akademik/AkademikQrPage.tsx');
  const source = fs.readFileSync(qrPath, 'utf-8');

  it('QR scan header, cards, and scan history have porcelain light parity', () => {
    expect(source).toContain('text-slate-900 dark:text-white');
    expect(source).toContain('text-slate-500 dark:text-white/40');
    expect(source).toContain('bg-white dark:bg-white/[0.02]');
    expect(source).toContain('border-slate-200/80 dark:border-white/[0.05]');
    expect(source).toContain('text-slate-400 dark:text-white/20');
  });
});

describe('E-Akademik Light Mode Parity — Runtime Robustness & Exports', () => {
  it('Leaderboard and Pencapaian properly import cn and export both named and default', () => {
    const lbSource = fs.readFileSync(path.resolve(__dirname, '../pages/akademik/AkademikLeaderboard.tsx'), 'utf-8');
    const pencSource = fs.readFileSync(path.resolve(__dirname, '../pages/akademik/AkademikPencapaian.tsx'), 'utf-8');
    const landingSource = fs.readFileSync(path.resolve(__dirname, '../pages/LandingPage.tsx'), 'utf-8');

    // cn import assertions
    expect(lbSource).toMatch(/import.*\{[^}]*\bcn\b[^}]*\}\s*from\s*['"]@\/lib\/utils['"]/);
    expect(pencSource).toMatch(/import.*\{[^}]*\bcn\b[^}]*\}\s*from\s*['"]@\/lib\/utils['"]/);

    // Named & default export assertions (preventing "Lazy element type must resolve to a class or function")
    expect(lbSource).toContain('export function AkademikLeaderboard');
    expect(lbSource).toContain('export default AkademikLeaderboard');

    expect(pencSource).toContain('export function AkademikPencapaian');
    expect(pencSource).toContain('export default AkademikPencapaian');

    expect(landingSource).toContain('export const LandingPage');
    expect(landingSource).toContain('export default LandingPage');
  });
});

