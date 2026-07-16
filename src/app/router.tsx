import { createBrowserRouter, Navigate } from 'react-router'

import { GuestOnly, RequireAuth } from '@/features/auth/guards'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { GoogleCallbackPage } from '@/features/auth/pages/GoogleCallbackPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { TwoFactorPage } from '@/features/auth/pages/TwoFactorPage'
import { ClientDetailPage } from '@/features/clients/pages/ClientDetailPage'
import { ClientFormPage } from '@/features/clients/pages/ClientFormPage'
import { ClientsListPage } from '@/features/clients/pages/ClientsListPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { InvoiceDetailPage } from '@/features/invoicing/pages/InvoiceDetailPage'
import { InvoiceFormPage } from '@/features/invoicing/pages/InvoiceFormPage'
import { InvoicePdfPage } from '@/features/invoicing/pages/InvoicePdfPage'
import { InvoicesListPage } from '@/features/invoicing/pages/InvoicesListPage'
import { PublicInvoicePage } from '@/features/public/pages/PublicInvoicePage'
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
    // Public document pages — no auth. /q/:token is reserved for quotes (roadmap).
    path: '/i/:token',
    element: <PublicInvoicePage />,
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
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <NotFoundPage /> },
]

export const router = createBrowserRouter(routes)
