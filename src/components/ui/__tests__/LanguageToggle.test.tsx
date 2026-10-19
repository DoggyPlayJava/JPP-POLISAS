import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import i18n, { changeLanguage } from '@/lib/i18n';
import { LanguageToggle } from '../LanguageToggle';

// Polyfill localStorage in node environment if needed
if (typeof globalThis.localStorage === 'undefined') {
  let store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = {
    documentElement: {
      lang: 'en',
    },
  };
}

describe('LanguageToggle Component', () => {
  beforeEach(async () => {
    localStorage.clear();
    await changeLanguage('en');
  });

  it('renders the trigger button with accessible aria label', () => {
    const html = renderToString(
      <I18nextProvider i18n={i18n}>
        <LanguageToggle />
      </I18nextProvider>
    );

    // Trigger button should be rendered
    expect(html).toContain('button');
    // Accessible aria-label for switching language (English locale: "Change Language")
    expect(html).toContain('aria-label="Change Language"');
  });

  it('displays current language tag EN when language is en', async () => {
    await changeLanguage('en');
    const html = renderToString(
      <I18nextProvider i18n={i18n}>
        <LanguageToggle />
      </I18nextProvider>
    );

    expect(html).toContain('EN');
  });

  it('displays current language tag BM and Malay aria-label when language is ms', async () => {
    await changeLanguage('ms');
    const html = renderToString(
      <I18nextProvider i18n={i18n}>
        <LanguageToggle />
      </I18nextProvider>
    );

    expect(html).toContain('BM');
    expect(html).toContain('aria-label="Tukar Bahasa"');
  });

  it('accepts and applies custom className prop', () => {
    const html = renderToString(
      <I18nextProvider i18n={i18n}>
        <LanguageToggle className="custom-test-class" />
      </I18nextProvider>
    );

    expect(html).toContain('custom-test-class');
  });
});
