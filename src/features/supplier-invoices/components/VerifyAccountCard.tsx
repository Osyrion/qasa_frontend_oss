import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { usePostSupplierInvoicesSupplierInvoiceVerifyAccount } from '@/api/generated/supplier-invoices/supplier-invoices'
import type {
  PostSupplierInvoicesSupplierInvoiceVerifyAccount200PublishedAccountsItem,
  SupplierInvoice,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { DateText } from '@/shared/components/DateText'
import { extractErrorMessage } from '@/shared/lib/laravel-errors'
import { queryClient } from '@/shared/lib/query-client'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

interface VerifyAccountCardProps {
  supplierInvoice: SupplierInvoice
}

export function VerifyAccountCard({ supplierInvoice }: VerifyAccountCardProps) {
  const { t } = useTranslation('supplierInvoices')
  const supplierInvoiceId = supplierInvoice.id
  const [publishedAccounts, setPublishedAccounts] = useState<
    PostSupplierInvoicesSupplierInvoiceVerifyAccount200PublishedAccountsItem[]
  >([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const verify = usePostSupplierInvoicesSupplierInvoiceVerifyAccount({
    mutation: {
      onSuccess: (result) => {
        setErrorMessage(null)
        setPublishedAccounts(result.published_accounts ?? [])
        void queryClient.invalidateQueries({
          queryKey: [`/api/v1/supplier-invoices/${supplierInvoiceId}`],
        })
      },
      onError: (error) => {
        setErrorMessage(extractErrorMessage(error) ?? t('verify_account.failed'))
      },
    },
  })

  if (!supplierInvoiceId) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('verify_account.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {supplierInvoice.account_verification_result && (
            <Badge
              variant={
                supplierInvoice.account_verification_result === 'published'
                  ? 'default'
                  : 'destructive'
              }
            >
              {t(`verify_account.result.${supplierInvoice.account_verification_result}`)}
            </Badge>
          )}
          {supplierInvoice.account_verified_at && (
            <span className="text-sm text-muted-foreground">
              {t('verify_account.verified_at')}{' '}
              <DateText value={supplierInvoice.account_verified_at} />
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          className="self-start"
          disabled={verify.isPending}
          onClick={() => supplierInvoiceId && verify.mutate({ supplierInvoice: supplierInvoiceId })}
        >
          {t('verify_account.verify')}
        </Button>

        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

        {publishedAccounts.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              {t('verify_account.published_accounts')}
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('verify_account.account_number')}</TableHead>
                  <TableHead>{t('verify_account.bank_code')}</TableHead>
                  <TableHead>{t('verify_account.iban')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {publishedAccounts.map((account, index) => (
                  <TableRow key={index}>
                    <TableCell>{account.account_number ?? '—'}</TableCell>
                    <TableCell>{account.bank_code ?? '—'}</TableCell>
                    <TableCell>{account.iban ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">{t('verify_account.reset_hint')}</p>
      </CardContent>
    </Card>
  )
}
