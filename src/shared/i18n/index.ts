import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enAuth from './locales/en/auth.json'
import enClients from './locales/en/clients.json'
import enCommon from './locales/en/common.json'
import enInvoices from './locales/en/invoices.json'
import enExpenses from './locales/en/expenses.json'
import enActivity from './locales/en/activity.json'
import enInbox from './locales/en/inbox.json'
import enOrders from './locales/en/orders.json'
import enQuotes from './locales/en/quotes.json'
import enRecurring from './locales/en/recurring.json'
import enReports from './locales/en/reports.json'
import enSettings from './locales/en/settings.json'
import enStatistics from './locales/en/statistics.json'
import enSupplierInvoices from './locales/en/supplier-invoices.json'
import skActivity from './locales/sk/activity.json'
import skAuth from './locales/sk/auth.json'
import skClients from './locales/sk/clients.json'
import skCommon from './locales/sk/common.json'
import skExpenses from './locales/sk/expenses.json'
import skInbox from './locales/sk/inbox.json'
import skInvoices from './locales/sk/invoices.json'
import skOrders from './locales/sk/orders.json'
import skQuotes from './locales/sk/quotes.json'
import skRecurring from './locales/sk/recurring.json'
import skReports from './locales/sk/reports.json'
import skSettings from './locales/sk/settings.json'
import skStatistics from './locales/sk/statistics.json'
import skSupplierInvoices from './locales/sk/supplier-invoices.json'

export const AVAILABLE_LOCALES = ['en', 'sk'] as const
export type Locale = (typeof AVAILABLE_LOCALES)[number]

void i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      auth: enAuth,
      clients: enClients,
      invoices: enInvoices,
      quotes: enQuotes,
      orders: enOrders,
      recurring: enRecurring,
      supplierInvoices: enSupplierInvoices,
      inbox: enInbox,
      expenses: enExpenses,
      statistics: enStatistics,
      reports: enReports,
      activity: enActivity,
      settings: enSettings,
    },
    sk: {
      common: skCommon,
      auth: skAuth,
      clients: skClients,
      invoices: skInvoices,
      quotes: skQuotes,
      orders: skOrders,
      recurring: skRecurring,
      supplierInvoices: skSupplierInvoices,
      inbox: skInbox,
      expenses: skExpenses,
      statistics: skStatistics,
      reports: skReports,
      activity: skActivity,
      settings: skSettings,
    },
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
