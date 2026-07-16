import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-semibold">404</h1>
      <p className="text-muted-foreground">{t('not_found')}</p>
      <Link to="/dashboard" className="text-sm underline">
        {t('back_home')}
      </Link>
    </div>
  )
}
