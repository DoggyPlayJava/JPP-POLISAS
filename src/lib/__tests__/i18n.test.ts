// Polyfill localStorage in node environment if needed
if (typeof globalThis.localStorage === 'undefined') {
  let store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = String(val); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  };
}

// Polyfill minimal document if needed for document.documentElement.lang
if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = {
    documentElement: {
      lang: 'en',
    },
  };
}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import i18n, { detectLanguage, changeLanguage, SUPPORTED_LANGUAGES, STORAGE_KEY } from '../i18n';

describe('Language Detection Algorithm', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('exports expected constants', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['en', 'ms']);
    expect(STORAGE_KEY).toBe('jpp_language');
  });

  it('honors manual override in localStorage if present', () => {
    localStorage.setItem('jpp_language', 'ms');
    expect(detectLanguage('en-US')).toBe('ms');

    localStorage.setItem('jpp_language', 'en');
    expect(detectLanguage('ms-MY')).toBe('en');
  });

  it('detects Malay when browser language indicates Malay', () => {
    expect(detectLanguage('ms-MY')).toBe('ms');
    expect(detectLanguage('ms')).toBe('ms');
    expect(detectLanguage('ms-BN')).toBe('ms');
    expect(detectLanguage('zlm')).toBe('ms');
    expect(detectLanguage('ms-SG')).toBe('ms');
    expect(detectLanguage('Malay')).toBe('ms');
  });

  it('defaults to English when browser language is English or any other language', () => {
    expect(detectLanguage('en-US')).toBe('en');
    expect(detectLanguage('en-GB')).toBe('en');
    expect(detectLanguage('fr-FR')).toBe('en');
    expect(detectLanguage('zh-CN')).toBe('en');
    expect(detectLanguage('')).toBe('en');
    expect(detectLanguage(undefined)).toBe('en');
  });

  it('changes language, persists to localStorage, and updates document.documentElement.lang', async () => {
    await changeLanguage('ms');
    expect(i18n.language).toBe('ms');
    expect(localStorage.getItem('jpp_language')).toBe('ms');
    expect(document.documentElement.lang).toBe('ms');

    await changeLanguage('en');
    expect(i18n.language).toBe('en');
    expect(localStorage.getItem('jpp_language')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });
});
