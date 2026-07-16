import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router'

import { cn } from '@/shared/lib/utils'

const tabs = [
  { to: '/settings/profile', labelKey: 'nav.profile' },
  { to: '/settings/security', labelKey: 'nav.security' },
  { to: '/settings/tokens', labelKey: 'nav.tokens' },
  { to: '/settings/bank-accounts', labelKey: 'nav.bank_accounts' },
  { to: '/settings/vat-rates', labelKey: 'nav.vat_rates' },
  { to: '/settings/exchange-rates', labelKey: 'nav.exchange_rates' },
] as const

export function SettingsLayout() {
  const { t } = useTranslation('settings')

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground',
                isActive && 'border-primary font-medium text-foreground',
              )
            }
          >
            {t(tab.labelKey)}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
