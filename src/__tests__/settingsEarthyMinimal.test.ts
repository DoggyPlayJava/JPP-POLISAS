import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

describe('Task 1: Profil Digital Mahasiswa, Hab Tetapan and Alias Laluan', () => {
  const settingsPath = path.resolve(__dirname, '../pages/SettingsPage.tsx');
  const appPath = path.resolve(__dirname, '../App.tsx');
  const settingsSource = fs.readFileSync(settingsPath, 'utf-8');
  const appSource = fs.readFileSync(appPath, 'utf-8');

  describe('Zero Raw Emojis and Zero Em-Dashes Discipline', () => {
    it('contains 100% zero raw emojis in SettingsPage.tsx', () => {
      const emojiMatches = settingsSource.match(EMOJI_REGEX) || [];
      expect(emojiMatches).toEqual([]);
    });

    it('contains 100% zero em-dashes (both unicode 2014 and 2013) in SettingsPage.tsx', () => {
      expect(settingsSource).not.toContain('\u2014');
      expect(settingsSource).not.toContain('\u2013');
    });
  });

  describe('Earthy Minimal Design System Tokens and Card Styling', () => {
    it('applies Earthy Minimal canvas background tokens (#F8F6EE and #151D16)', () => {
      expect(settingsSource).toContain('#F8F6EE');
      expect(settingsSource).toContain('#151D16');
      expect(settingsSource).toContain('bg-[#F8F6EE]');
      expect(settingsSource).toContain('dark:bg-[#151D16]');
    });

    it('configures ambient organic glows (#6B7F5B and #C96F4F)', () => {
      expect(settingsSource).toContain('#6B7F5B');
      expect(settingsSource).toContain('#C96F4F');
    });

    it('uses hairline borders (#D9C9B2 or #6B7F5B) and dark surface (#1E271F)', () => {
      expect(settingsSource).toContain('#D9C9B2');
      expect(settingsSource).toContain('#1E271F');
    });

    it('applies Earthy Minimal tokens to segmented navigation tabs', () => {
      // Active and inactive tab tokens
      expect(settingsSource).toContain('#2E3A2F');
      expect(settingsSource).toContain('#556453');
    });

    it('respects isLowEnd device performance optimization', () => {
      expect(settingsSource).toContain('useDevicePerformance');
      expect(settingsSource).toMatch(/isLowEnd|isLowPerf/);
    });
  });

  describe('Route Aliases in App.tsx', () => {
    it('aliases /profile to /tetapan with replace navigation', () => {
      expect(appSource).toMatch(/path=["']\/profile["'][\s\S]*?Navigate to=["']\/tetapan["']/);
    });

    it('aliases /settings to /tetapan with replace navigation', () => {
      expect(appSource).toMatch(/path=["']\/settings["'][\s\S]*?Navigate to=["']\/tetapan["']/);
    });
  });
});
