import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  JPP_THEME_DEFAULT_COLOR,
  JPP_COLOR_PRESETS,
  getJppSidebarBg,
} from '@/pages/jpp/jppConfig';

// Helper regex to detect raw emojis (standard emoji ranges)
const EMOJI_REGEX = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

// Helper regex to detect em-dash and en-dash (— or –)
const DASH_REGEX = /[\u2013\u2014]/;

describe('JPP HQ Leadership Cockpit & Exco Sidebar - Earthy Minimal Theme', () => {
  describe('jppConfig.ts Theme Tokens', () => {
    it('sets JPP_THEME_DEFAULT_COLOR to Deep Forest Moss (#2E3A2F)', () => {
      expect(JPP_THEME_DEFAULT_COLOR).toBe('#2E3A2F');
    });

    it('sets JPP_COLOR_PRESETS to executive forest war room colors', () => {
      expect(JPP_COLOR_PRESETS).toContain('#2E3A2F');
      expect(JPP_COLOR_PRESETS).toEqual([
        '#2E3A2F', '#1E271F', '#3B4A3C', '#6B7F5B', '#C96F4F', '#4A584B',
      ]);
    });

    it('returns Earthy Minimal tokens for light mode sidebar', () => {
      const lightBg = getJppSidebarBg('#2E3A2F', false);
      expect(lightBg.top).toBe('#F8F6EE');
      expect(lightBg.bottom).toBe('#F2EDE4');
      expect(lightBg.border).toBe('rgba(217, 201, 178, 0.8)');
      expect(lightBg.textPrimary).toBe('#2E3A2F');
      expect(lightBg.textSecondary).toBe('#556453');
      expect(lightBg.hoverBg).toBe('rgba(46, 58, 47, 0.06)');
      expect(lightBg.activeBg).toBe('rgba(46, 58, 47, 0.12)');
    });

    it('returns Earthy Minimal tokens for dark mode sidebar', () => {
      const darkBg = getJppSidebarBg('#2E3A2F', true);
      expect(darkBg.top).toBe('#151D16');
      expect(darkBg.bottom).toBe('#1B241C');
      expect(darkBg.border).toBe('rgba(58, 74, 59, 0.5)');
      expect(darkBg.textPrimary).toBe('#F8F6EE');
      expect(darkBg.textSecondary).toBe('#A3B39F');
      expect(darkBg.hoverBg).toBe('rgba(255, 255, 255, 0.05)');
      expect(darkBg.activeBg).toBe('rgba(107, 127, 91, 0.2)');
    });
  });

  describe('Source Code Compliance Checks', () => {
    const jppFiles = [
      'src/pages/jpp/jppConfig.ts',
      'src/pages/jpp/JppLayout.tsx',
      'src/pages/jpp/JppSidebar.tsx',
      'src/pages/jpp/JppOverviewPage.tsx',
    ];

    it('ensures zero raw emojis across all JPP core files', () => {
      jppFiles.forEach(fileRelPath => {
        const fullPath = path.resolve(process.cwd(), fileRelPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        expect(EMOJI_REGEX.test(content), `Raw emoji found in ${fileRelPath}`).toBe(false);
      });
    });

    it('ensures strictly zero em-dashes and en-dashes across all JPP core files', () => {
      jppFiles.forEach(fileRelPath => {
        const fullPath = path.resolve(process.cwd(), fileRelPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        expect(DASH_REGEX.test(content), `Em-dash or en-dash found in ${fileRelPath}`).toBe(false);
      });
    });

    it('ensures JppLayout.tsx uses Earthy Minimal canvas classes', () => {
      const layoutContent = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/jpp/JppLayout.tsx'), 'utf-8');
      expect(layoutContent).toContain('bg-[#F8F6EE]');
      expect(layoutContent).toContain('dark:bg-[#151D16]');
    });

    it('ensures complete elimination of legacy text-rose-950 and border-rose-200 in JppSidebar.tsx', () => {
      const sidebarContent = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/jpp/JppSidebar.tsx'), 'utf-8');
      expect(sidebarContent).not.toContain('text-rose-950');
      expect(sidebarContent).not.toContain('border-rose-200');
    });
  });
});
