import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

describe('ResetPasswordPage Polish & Dark Mode High Contrast', () => {
  const pagePath = path.resolve(__dirname, '../pages/ResetPasswordPage.tsx');
  const source = fs.readFileSync(pagePath, 'utf-8');

  it('contains zero raw emojis across ResetPasswordPage.tsx', () => {
    const emojiMatches = source.match(EMOJI_REGEX) || [];
    expect(emojiMatches).toEqual([]);
  });

  it('strictly contains zero em-dashes', () => {
    expect(source).not.toContain('—');
    expect(source).not.toContain('–');
  });

  it('contains official POLISAS emblem branding and institutional title', () => {
    expect(source).toContain('/jpp-logo.png');
    expect(source).toContain('JPP POLISAS');
    expect(source).toContain('Portal Rasmi');
  });

  it('provides high-contrast text and Earthy Minimal tokens for dark mode readability', () => {
    expect(source).toContain('#2E3A2F');
    expect(source).toContain('#F8F6EE');
    expect(source).toContain('#151D16');
    expect(source).toContain('dark:text-[#F8F6EE]');
  });

  it('provides password visibility toggle for both fields', () => {
    expect(source).toContain('showPassword');
    expect(source).toContain('showConfirmPassword');
  });

  it('includes return to login navigation', () => {
    expect(source).toMatch(/Kembali ke Log Masuk/i);
    expect(source).toContain('/login');
  });
});
