import { isAxiosError } from 'axios'
import { useTranslation } from 'react-i18next'

import { useGetSupplierInvoicesSupplierInvoicePaymentQr } from '@/api/generated/supplier-invoices/supplier-invoices'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Spinner } from '@/shared/ui/spinner'

interface PaymentQrCardProps {
  supplierInvoiceId: string
}

export function PaymentQrCard({ supplierInvoiceId }: PaymentQrCardProps) {
  const { t } = useTranslation('supplierInvoices')
  const qr = useGetSupplierInvoicesSupplierInvoicePaymentQr(supplierInvoiceId)

  if (qr.isPending) {
    return (
      <Card>
        <CardContent className="flex justify-center pt-6">
          <Spinner />
        </CardContent>
      </Card>
    )
  }

  if (qr.isError) {
    const isUnsupported = isAxiosError(qr.error) && qr.error.response?.status === 422
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('payment_qr.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {isUnsupported ? t('payment_qr.unavailable') : t('payment_qr.failed')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('payment_qr.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center">
        <img src={qr.data?.data_uri} alt={t('payment_qr.title')} className="size-48" />
      </CardContent>
    </Card>
  )
}
