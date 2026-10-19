import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Core & Shell namespaces
import commonEn from '@/locales/en/common.json';
import authEn from '@/locales/en/auth.json';
import navEn from '@/locales/en/nav.json';
import settingsEn from '@/locales/en/settings.json';

// Functional Domain namespaces
import portalEn from '@/locales/en/portal.json';
import kppEn from '@/locales/en/kpp.json';
import jppEn from '@/locales/en/jpp.json';
import keusahawananEn from '@/locales/en/keusahawanan.json';
import kebajikanEn from '@/locales/en/kebajikan.json';
import karnivalEn from '@/locales/en/karnival.json';
import emsEn from '@/locales/en/ems.json';
import makmpEn from '@/locales/en/makmp.json';
import commerceEn from '@/locales/en/commerce.json';
import servicesEn from '@/locales/en/services.json';
import akademikEn from '@/locales/en/akademik.json';
import housingEn from '@/locales/en/housing.json';
import supsasEn from '@/locales/en/supsas.json';

// Bahasa Melayu namespaces
import commonMs from '@/locales/ms/common.json';
import authMs from '@/locales/ms/auth.json';
import navMs from '@/locales/ms/nav.json';
import settingsMs from '@/locales/ms/settings.json';

import portalMs from '@/locales/ms/portal.json';
import kppMs from '@/locales/ms/kpp.json';
import jppMs from '@/locales/ms/jpp.json';
import keusahawananMs from '@/locales/ms/keusahawanan.json';
import kebajikanMs from '@/locales/ms/kebajikan.json';
import karnivalMs from '@/locales/ms/karnival.json';
import emsMs from '@/locales/ms/ems.json';
import makmpMs from '@/locales/ms/makmp.json';
import commerceMs from '@/locales/ms/commerce.json';
import servicesMs from '@/locales/ms/services.json';
import akademikMs from '@/locales/ms/akademik.json';
import housingMs from '@/locales/ms/housing.json';
import supsasMs from '@/locales/ms/supsas.json';

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
    portal: portalEn,
    kpp: kppEn,
    jpp: jppEn,
    keusahawanan: keusahawananEn,
    kebajikan: kebajikanEn,
    karnival: karnivalEn,
    ems: emsEn,
    makmp: makmpEn,
    commerce: commerceEn,
    services: servicesEn,
    akademik: akademikEn,
    housing: housingEn,
    supsas: supsasEn,
  },
  ms: {
    common: commonMs,
    auth: authMs,
    nav: navMs,
    settings: settingsMs,
    portal: portalMs,
    kpp: kppMs,
    jpp: jppMs,
    keusahawanan: keusahawananMs,
    kebajikan: kebajikanMs,
    karnival: karnivalMs,
    ems: emsMs,
    makmp: makmpMs,
    commerce: commerceMs,
    services: servicesMs,
    akademik: akademikMs,
    housing: housingMs,
    supsas: supsasMs,
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
