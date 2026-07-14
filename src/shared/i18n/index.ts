import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enAuth from './locales/en/auth.json'
import enCommon from './locales/en/common.json'
import skAuth from './locales/sk/auth.json'
import skCommon from './locales/sk/common.json'

export const AVAILABLE_LOCALES = ['en', 'sk'] as const
export type Locale = (typeof AVAILABLE_LOCALES)[number]

void i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon, auth: enAuth },
    sk: { common: skCommon, auth: skAuth },
  },
  lng: navigator.language.startsWith('sk') ? 'sk' : 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
})

export function syncLocale(locale: string | null | undefined): void {
  if (locale && AVAILABLE_LOCALES.includes(locale as Locale) && i18n.language !== locale) {
    void i18n.changeLanguage(locale)
  }
}

export default i18n
