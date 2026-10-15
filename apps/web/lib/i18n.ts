'use client'

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
import ha from './locales/ha.json'
import yo from './locales/yo.json'
import ig from './locales/ig.json'

export const SUPPORTED_LANGUAGES = ['en', 'ha', 'yo', 'ig'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

if (!i18n.isInitialized) {
  void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { common: en },
        ha: { common: ha },
        yo: { common: yo },
        ig: { common: ig },
      },
      fallbackLng: 'en',
      supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
      defaultNS: 'common',
      ns: ['common'],
      interpolation: { escapeValue: false },
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: 'ravencry-lang',
        caches: ['localStorage'],
      },
      react: { useSuspense: false },
    })
}

export default i18n
