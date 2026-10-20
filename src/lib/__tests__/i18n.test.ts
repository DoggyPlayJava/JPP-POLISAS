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

// Polyfill minimal window for browser environment checks
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    location: {
      search: '',
      origin: 'http://localhost:3000',
    },
  };
}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import i18n, { detectLanguage, changeLanguage, SUPPORTED_LANGUAGES, STORAGE_KEY } from '../i18n';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

describe('Language Detection Algorithm & Background DB Sync', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });
  });

  it('exports expected constants', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['en', 'ms']);
    expect(STORAGE_KEY).toBe('jpp_language');
  });

  it('detects en for English browser locales when no localStorage exists', () => {
    expect(detectLanguage('en-US')).toBe('en');
    expect(detectLanguage('en-GB')).toBe('en');
    expect(detectLanguage('en-MY')).toBe('en');
    expect(detectLanguage('en')).toBe('en');
  });

  it('detects ms for Malay browser locales when no localStorage exists', () => {
    expect(detectLanguage('ms-MY')).toBe('ms');
    expect(detectLanguage('ms')).toBe('ms');
    expect(detectLanguage('ms-BN')).toBe('ms');
    expect(detectLanguage('ms-SG')).toBe('ms');
    expect(detectLanguage('zlm')).toBe('ms');
    expect(detectLanguage('malay-MY')).toBe('ms');
    expect(detectLanguage('Malay')).toBe('ms');
  });

  it('defaults to en when browser language is unrecognized or generic', () => {
    expect(detectLanguage('zh-CN')).toBe('en');
    expect(detectLanguage('fr-FR')).toBe('en');
    expect(detectLanguage('')).toBe('en');
    expect(detectLanguage(undefined)).toBe('en');
  });

  it('prioritizes saved localStorage over browser language', () => {
    localStorage.setItem(STORAGE_KEY, 'ms');
    expect(detectLanguage('en-US')).toBe('ms');

    localStorage.setItem(STORAGE_KEY, 'en');
    expect(detectLanguage('ms-MY')).toBe('en');
  });

  it('changes language, persists to localStorage, and updates document.documentElement.lang', async () => {
    await changeLanguage('ms', false);
    expect(i18n.language).toBe('ms');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('ms');
    expect(document.documentElement.lang).toBe('ms');

    await changeLanguage('en', false);
    expect(i18n.language).toBe('en');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('syncs to Supabase profiles table in background when user session exists', async () => {
    const mockSession = { user: { id: 'test-user-123' } };
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession } });

    await changeLanguage('ms');

    expect(localStorage.getItem(STORAGE_KEY)).toBe('ms');
    expect(supabase.from).toHaveBeenCalledWith('profiles');
  });

  it('does not sync to Supabase when user session does not exist', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });

    await changeLanguage('en');

    expect(localStorage.getItem(STORAGE_KEY)).toBe('en');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('does not sync to Supabase when syncToDb is false even if session exists', async () => {
    const mockSession = { user: { id: 'test-user-456' } };
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession } });

    await changeLanguage('ms', false);

    expect(supabase.from).not.toHaveBeenCalled();
  });
});
