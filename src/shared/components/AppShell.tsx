import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useNavigate } from 'react-router'

import { usePostAuthLogout } from '@/api/generated/authentication/authentication'
import { EmailVerificationBanner } from '@/features/auth/components/EmailVerificationBanner'
import { useAuthStore } from '@/features/auth/store'
import { useActivityAccess } from '@/features/activity/lib/use-activity-access'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

const navGroups = [
  {
    labelKey: 'nav.group_overview',
    items: [{ to: '/dashboard', labelKey: 'nav.dashboard' }],
  },
  {
    labelKey: 'nav.group_sales',
    items: [
      { to: '/clients', labelKey: 'nav.clients' },
      { to: '/invoices', labelKey: 'nav.invoices' },
      { to: '/quotes', labelKey: 'nav.quotes' },
      { to: '/orders', labelKey: 'nav.orders' },
      { to: '/recurring', labelKey: 'nav.recurring' },
    ],
  },
  {
    labelKey: 'nav.group_purchases',
    items: [
      { to: '/supplier-invoices', labelKey: 'nav.supplier_invoices' },
      { to: '/inbox', labelKey: 'nav.inbox' },
      { to: '/expenses', labelKey: 'nav.expenses' },
    ],
  },
  {
    labelKey: 'nav.group_analysis',
    items: [
      { to: '/statistics', labelKey: 'nav.statistics' },
      { to: '/reports', labelKey: 'nav.reports' },
      { to: '/activity', labelKey: 'nav.activity' },
    ],
  },
] as const

export function AppShell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const clear = useAuthStore((state) => state.clear)
  const activityAccess = useActivityAccess()

  const visibleNavGroups = navGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.to !== '/activity' || !activityAccess.forbidden),
  }))

  const logout = usePostAuthLogout({
    mutation: {
      // Local session ends even if the revoke call fails (e.g. offline).
      onSettled: () => {
        clear()
        void navigate('/login')
      },
    },
  })

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="px-4 py-5 text-lg font-semibold">{t('app_name')}</div>
        <nav className="flex flex-1 flex-col gap-4 px-2">
          {visibleNavGroups.map((group) => (
            <div key={group.labelKey} className="flex flex-col gap-1">
              <div className="px-3 text-xs font-semibold tracking-wide text-sidebar-foreground/60 uppercase">
                {t(group.labelKey)}
              </div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent',
                      isActive && 'bg-sidebar-accent font-medium',
                    )
                  }
                >
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t p-2">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'block rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent',
                isActive && 'bg-sidebar-accent font-medium',
              )
            }
          >
            {t('nav.settings')}
          </NavLink>
        </div>
        <div className="border-t p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start truncate">
                {user?.full_name || user?.email || '…'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={logout.isPending}
                onSelect={() => logout.mutate()}
                variant="destructive"
              >
                {t('nav.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 p-6">
          <EmailVerificationBanner />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
