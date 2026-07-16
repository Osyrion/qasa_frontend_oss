import { useTranslation } from 'react-i18next'

export function DashboardPage() {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="text-2xl font-semibold">{t('nav.dashboard')}</h1>
    </div>
  )
}
