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
  });

  describe('Google SSO-First Hierarchy', () => {
    it('prioritizes Google SSO as primary action before manual login', () => {
      expect(source).toContain('handleGoogleLogin');
      expect(source).toContain('Teruskan dengan Google');

      // Ensure Google button appears before password input in standard login form
      const googleIndex = source.indexOf('handleGoogleLogin');
      const passwordInputIndex = source.indexOf('type="password"');
      expect(googleIndex).toBeGreaterThan(-1);
      expect(passwordInputIndex).toBeGreaterThan(-1);
      expect(googleIndex).toBeLessThan(passwordInputIndex);
    });

    it('provides clean divider and manual login option', () => {
      expect(source).toMatch(/atau log masuk manual|atau guna emel/i);
      expect(source).toContain('handleLogin');
      expect(source).toContain('resolve_login_identifier');
    });

    it('preserves registration with Google priority and role selection', () => {
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
