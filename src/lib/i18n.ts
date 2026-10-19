import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import commonEn from '@/locales/en/common.json';
import authEn from '@/locales/en/auth.json';
import navEn from '@/locales/en/nav.json';
import settingsEn from '@/locales/en/settings.json';

import commonMs from '@/locales/ms/common.json';
import authMs from '@/locales/ms/auth.json';
import navMs from '@/locales/ms/nav.json';
import settingsMs from '@/locales/ms/settings.json';

export const SUPPORTED_LANGUAGES = ['en', 'ms'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const STORAGE_KEY = 'jpp_language';

/**
 * Determines the initial language:
 * 1. Returns saved preference in localStorage if 'en' or 'ms'.
 * 2. If browser language starts with 'ms', 'zlm', or contains 'malay', returns 'ms'.
 * 3. Defaults to 'en'.
 */
export function detectLanguage(browserLang?: string): SupportedLanguage {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'ms') {
        return saved;
      }
    } catch {
      // Ignore storage access errors
    }
  }

  const lang = (
    browserLang ??
    (typeof navigator !== 'undefined'
      ? (navigator.language || (navigator.languages && navigator.languages[0]))
      : '')
  )?.toLowerCase() || '';

  if (lang.startsWith('ms') || lang.startsWith('zlm') || lang.includes('malay')) {
    return 'ms';
  }

  return 'en';
}

export const resources = {
  en: {
    common: commonEn,
    auth: authEn,
    nav: navEn,
    settings: settingsEn,
  },
  ms: {
    common: commonMs,
    auth: authMs,
    nav: navMs,
    settings: settingsMs,
  },
} as const;

const initialLang = detectLanguage();
if (typeof document !== 'undefined' && document?.documentElement) {
  document.documentElement.lang = initialLang;
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  });

export async function changeLanguage(lang: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage access errors
    }
  }
  if (typeof document !== 'undefined' && document?.documentElement) {
    document.documentElement.lang = lang;
  }
}

export default i18n;
