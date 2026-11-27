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

describe('JPP HQ Leadership Cockpit & Exco Sidebar - Semambu Mineral Teal Theme', () => {
  describe('jppConfig.ts Theme Tokens', () => {
    it('sets JPP_THEME_DEFAULT_COLOR to Mineral Teal (#0F766E)', () => {
      expect(JPP_THEME_DEFAULT_COLOR).toBe('#0F766E');
    });

    it('sets JPP_COLOR_PRESETS to unified Pine-Teal colors', () => {
      expect(JPP_COLOR_PRESETS).toContain('#0F766E');
      expect(JPP_COLOR_PRESETS).toEqual([
        '#0F766E', '#0B2420', '#0D9488', '#115E59', '#14B8A6', '#134E4A',
      ]);
    });

    it('returns Unified Deep Pine-Teal tokens for light mode sidebar', () => {
      const lightBg = getJppSidebarBg('#0F766E', false);
      expect(lightBg.top).toBe('#0B2420');
      expect(lightBg.bottom).toBe('#061714');
      expect(lightBg.border).toBe('rgba(45, 212, 191, 0.16)');
      expect(lightBg.textPrimary).toBe('#F6FBF9');
      expect(lightBg.textSecondary).toBe('#99CBC2');
      expect(lightBg.hoverBg).toBe('rgba(255, 255, 255, 0.06)');
      expect(lightBg.activeBg).toBe('rgba(45, 212, 191, 0.16)');
    });

    it('returns Unified Deep Pine-Teal tokens for dark mode sidebar', () => {
      const darkBg = getJppSidebarBg('#0F766E', true);
      expect(darkBg.top).toBe('#0B2420');
      expect(darkBg.bottom).toBe('#061714');
      expect(darkBg.border).toBe('rgba(45, 212, 191, 0.16)');
      expect(darkBg.textPrimary).toBe('#F6FBF9');
      expect(darkBg.textSecondary).toBe('#99CBC2');
      expect(darkBg.hoverBg).toBe('rgba(255, 255, 255, 0.06)');
      expect(darkBg.activeBg).toBe('rgba(45, 212, 191, 0.16)');
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

    it('ensures JppLayout.tsx uses Mineral Teal and Alabaster canvas classes', () => {
      const layoutContent = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/jpp/JppLayout.tsx'), 'utf-8');
      expect(layoutContent).toContain('bg-[#F6FBF9]');
      expect(layoutContent).toContain('dark:bg-[#061714]');
    });

    it('ensures complete elimination of legacy text-rose-950 and border-rose-200 in JppSidebar.tsx', () => {
      const sidebarContent = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/jpp/JppSidebar.tsx'), 'utf-8');
      expect(sidebarContent).not.toContain('text-rose-950');
      expect(sidebarContent).not.toContain('border-rose-200');
    });
  });
});
