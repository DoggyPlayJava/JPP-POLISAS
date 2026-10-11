import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

describe('LoginPage Google SSO-First & Earthy Minimal Redesign', () => {
  const loginPagePath = path.resolve(__dirname, '../pages/LoginPage.tsx');
  const source = fs.readFileSync(loginPagePath, 'utf-8');

  describe('Zero Raw Emojis & Anti-Slop Discipline', () => {
    it('contains 100% zero raw emojis across LoginPage.tsx', () => {
      const emojiMatches = source.match(EMOJI_REGEX) || [];
      expect(emojiMatches).toEqual([]);
    });

    it('strictly contains ZERO em-dashes (— or –)', () => {
      expect(source).not.toContain('—');
      expect(source).not.toContain('–');
    });

    it('incorporates the Earthy Minimal palette tokens (#2E3A2F, #6B7F5B, #D9C9B2, #C96F4F, #F8F6EE)', () => {
      // Primary: Deep Forest Moss
      expect(source).toContain('#2E3A2F');
      // Secondary: Sage Green
      expect(source).toContain('#6B7F5B');
      // Border / Tertiary: Warm Sand / Linen
      expect(source).toContain('#D9C9B2');
      // Accent: Terracotta Clay
      expect(source).toContain('#C96F4F');
      // Background: Warm Alabaster / Cream
      expect(source).toContain('#F8F6EE');
    });

    it('removes fake 15,000+ students and 120+ clubs, using authentic POLISAS stats', () => {
      expect(source).not.toContain('15,000+');
      expect(source).not.toContain('120+');
      // Real POLISAS metrics: Kelab & Persatuan, 9 Portfolio Exco, 5 Jabatan
      expect(source).toContain('Unit Exco JPP');
      expect(source).toContain('Jabatan Akademik');
    });
    it('displays the official slogan "Perpaduan Progresif Demi Mahasiswa" and bans old slogan', () => {
      expect(source).toContain('Perpaduan Progresif Demi Mahasiswa');
      expect(source).not.toContain('Membentuk Kepimpinan Kampus Digital POLISAS');
    });

    it('uses official institutional name "Jawatankuasa Perwakilan Pelajar" and bans "Majlis Perwakilan Pelajar"', () => {
      expect(source).toContain('Jawatankuasa Perwakilan Pelajar');
      expect(source).not.toContain('Majlis Perwakilan Pelajar');
    });
  });

  describe('Google SSO-First Clean Hierarchy (Uncluttered)', () => {
    it('prioritizes Google SSO as primary hero action', () => {
      expect(source).toContain('handleGoogleLogin');
      expect(source).toContain('Teruskan dengan Google');
    });

    it('hides manual login by default behind a clean toggle (showManualLogin)', () => {
      expect(source).toContain('showManualLogin');
      expect(source).toContain('setShowManualLogin');
    });

    it('renders the Developer Bypass prominently on localhost outside the manual form toggle', () => {
      expect(source).toContain('Pintas Log Masuk (Dev Mode)');
      expect(source).toContain('import.meta.env.DEV');
      const manualFormClosing = source.indexOf('</motion.div>\n                  </AnimatePresence>\n                )}');
      const devBypassIndex = source.indexOf('Pintas Log Masuk (Dev Mode)');
      // Must be outside the collapsible motion.div
      expect(devBypassIndex).toBeGreaterThan(manualFormClosing);
    });

    it('preserves core authentication handlers and security guards', () => {
      expect(source).toContain('handleLogin');
      expect(source).toContain('resolve_login_identifier');
      expect(source).toContain('handleRegister');
      expect(source).toContain('check_matric_registered');
      expect(source).toContain('check_email_registered');
      expect(source).toContain('verify_staff_code');
    });

    it('preserves WhatsApp support contact link and redirect handling', () => {
      expect(source).toContain('https://wa.me/601139413699');
      expect(source).toContain('sanitizeRedirect');
      expect(source).toContain('post_login_redirect');
    });
  });
});
