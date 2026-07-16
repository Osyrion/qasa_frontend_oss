import { createBrowserRouter, Navigate } from 'react-router'

import { GuestOnly, RequireAuth } from '@/features/auth/guards'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { GoogleCallbackPage } from '@/features/auth/pages/GoogleCallbackPage'
import { ActivityPage } from '@/features/activity/pages/ActivityPage'
import { ExpensesListPage } from '@/features/expenses/pages/ExpensesListPage'
import { InboxPage } from '@/features/inbox/pages/InboxPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { TwoFactorPage } from '@/features/auth/pages/TwoFactorPage'
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage'
import { ClientDetailPage } from '@/features/clients/pages/ClientDetailPage'
import { ClientFormPage } from '@/features/clients/pages/ClientFormPage'
import { ClientsListPage } from '@/features/clients/pages/ClientsListPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { InvoiceDetailPage } from '@/features/invoicing/pages/InvoiceDetailPage'
import { InvoiceFormPage } from '@/features/invoicing/pages/InvoiceFormPage'
import { InvoicePdfPage } from '@/features/invoicing/pages/InvoicePdfPage'
import { InvoicesListPage } from '@/features/invoicing/pages/InvoicesListPage'
import { OrderDetailPage } from '@/features/orders/pages/OrderDetailPage'
import { OrderFormPage } from '@/features/orders/pages/OrderFormPage'
import { OrdersListPage } from '@/features/orders/pages/OrdersListPage'
import { PublicInvoicePage } from '@/features/public/pages/PublicInvoicePage'
import { PublicQuotePage } from '@/features/public/pages/PublicQuotePage'
import { QuoteDetailPage } from '@/features/quotes/pages/QuoteDetailPage'
import { RecurringFormPage } from '@/features/recurring/pages/RecurringFormPage'
import { RecurringListPage } from '@/features/recurring/pages/RecurringListPage'
import { SupplierInvoiceDetailPage } from '@/features/supplier-invoices/pages/SupplierInvoiceDetailPage'
import { SupplierInvoiceFormPage } from '@/features/supplier-invoices/pages/SupplierInvoiceFormPage'
import { SupplierInvoicesListPage } from '@/features/supplier-invoices/pages/SupplierInvoicesListPage'
import { StatisticsPage } from '@/features/statistics/pages/StatisticsPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { QuoteFormPage } from '@/features/quotes/pages/QuoteFormPage'
import { QuotePdfPage } from '@/features/quotes/pages/QuotePdfPage'
import { QuotesListPage } from '@/features/quotes/pages/QuotesListPage'
import { BankAccountsPage } from '@/features/settings/pages/BankAccountsPage'
import { ExchangeRatesPage } from '@/features/settings/pages/ExchangeRatesPage'
import { ProfilePage } from '@/features/settings/pages/ProfilePage'
import { SecurityPage } from '@/features/settings/pages/SecurityPage'
import { SettingsLayout } from '@/features/settings/pages/SettingsLayout'
import { TokensPage } from '@/features/settings/pages/TokensPage'
import { VatRatesPage } from '@/features/settings/pages/VatRatesPage'
import { AppShell } from '@/shared/components/AppShell'
import { NotFoundPage } from '@/shared/components/NotFoundPage'

export const routes = [
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/login/2fa', element: <TwoFactorPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/auth/google/callback', element: <GoogleCallbackPage /> },
    ],
  },
  {
    // Reachable both signed-in and signed-out — no GuestOnly/RequireAuth wrapper.
    path: '/verify-email',
    element: <VerifyEmailPage />,
  },
  {
    // Public document pages — no auth.
    path: '/i/:token',
    element: <PublicInvoicePage />,
  },
  {
    path: '/q/:token',
    element: <PublicQuotePage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/clients', element: <ClientsListPage /> },
          { path: '/clients/new', element: <ClientFormPage /> },
          { path: '/clients/:id/edit', element: <ClientFormPage /> },
          { path: '/clients/:id', element: <ClientDetailPage /> },
          { path: '/invoices', element: <InvoicesListPage /> },
          { path: '/invoices/new', element: <InvoiceFormPage /> },
          { path: '/invoices/:id/edit', element: <InvoiceFormPage /> },
          { path: '/invoices/:id/pdf', element: <InvoicePdfPage /> },
          { path: '/invoices/:id', element: <InvoiceDetailPage /> },
          { path: '/quotes', element: <QuotesListPage /> },
          { path: '/quotes/new', element: <QuoteFormPage /> },
          { path: '/quotes/:id/edit', element: <QuoteFormPage /> },
          { path: '/quotes/:id/pdf', element: <QuotePdfPage /> },
          { path: '/quotes/:id', element: <QuoteDetailPage /> },
          { path: '/orders', element: <OrdersListPage /> },
          { path: '/orders/new', element: <OrderFormPage /> },
          { path: '/orders/:id/edit', element: <OrderFormPage /> },
          { path: '/orders/:id', element: <OrderDetailPage /> },
          { path: '/recurring', element: <RecurringListPage /> },
          { path: '/recurring/new', element: <RecurringFormPage /> },
          { path: '/recurring/:id/edit', element: <RecurringFormPage /> },
          { path: '/supplier-invoices', element: <SupplierInvoicesListPage /> },
          { path: '/supplier-invoices/new', element: <SupplierInvoiceFormPage /> },
          { path: '/supplier-invoices/:id/edit', element: <SupplierInvoiceFormPage /> },
          { path: '/supplier-invoices/:id', element: <SupplierInvoiceDetailPage /> },
          { path: '/inbox', element: <InboxPage /> },
          { path: '/expenses', element: <ExpensesListPage /> },
          { path: '/statistics', element: <StatisticsPage /> },
          { path: '/reports', element: <ReportsPage /> },
          { path: '/activity', element: <ActivityPage /> },
          {
            path: '/settings',
            element: <SettingsLayout />,
            children: [
              { index: true, element: <Navigate to="/settings/profile" replace /> },
              { path: 'profile', element: <ProfilePage /> },
              { path: 'security', element: <SecurityPage /> },
              { path: 'tokens', element: <TokensPage /> },
              { path: 'bank-accounts', element: <BankAccountsPage /> },
              { path: 'vat-rates', element: <VatRatesPage /> },
              { path: 'exchange-rates', element: <ExchangeRatesPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <NotFoundPage /> },
]

export const router = createBrowserRouter(routes)
