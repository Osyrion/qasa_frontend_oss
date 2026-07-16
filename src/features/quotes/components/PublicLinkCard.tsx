import { CopyIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  useDeleteQuotesQuotePublicLink,
  usePostQuotesQuotePublicLink,
} from '@/api/generated/quotes/quotes'
import type { Quote } from '@/api/generated/qASAAPIDocumentation.schemas'
import { isQuoteEditable } from '@/shared/lib/transitions'
import { DateText } from '@/shared/components/DateText'
import { extractErrorMessage } from '@/shared/lib/laravel-errors'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'

interface PublicLinkCardProps {
  quote: Quote
}

export function PublicLinkCard({ quote }: PublicLinkCardProps) {
  const { t } = useTranslation('quotes')
  const quoteId = quote.id

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [`/api/v1/quotes/${quoteId}`] })

  const createLink = usePostQuotesQuotePublicLink({
    mutation: {
      onSuccess: () => {
        void invalidate()
        toast.success(t('public_link.created'))
      },
      onError: (error) => {
        toast.error(extractErrorMessage(error) ?? t('public_link.create_failed'))
      },
    },
  })

  const revokeLink = useDeleteQuotesQuotePublicLink({
    mutation: {
      onSuccess: () => {
        void invalidate()
        toast.success(t('public_link.revoked'))
      },
    },
  })

  // Quotes can only get a public link once sent — mirrors canManagePublicLink for invoices.
  if (!quoteId || isQuoteEditable(quote.status ?? 'draft')) {
    return null
  }

  const link = quote.public_link

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('public_link.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {link?.url ? (
          <>
            <div className="flex gap-2">
              <Input value={link.url} readOnly />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={t('public_link.copy')}
                onClick={() => {
                  void navigator.clipboard.writeText(link.url ?? '')
                  toast.success(t('public_link.copied'))
                }}
              >
                <CopyIcon />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('public_link.view_count', { count: link.view_count ?? 0 })}
              {link.first_viewed_at && (
                <>
                  {' · '}
                  {t('public_link.first_viewed')} <DateText value={link.first_viewed_at} />
                </>
              )}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={createLink.isPending}
                onClick={() => {
                  if (window.confirm(t('public_link.confirm_regenerate'))) {
                    createLink.mutate({ quote: quoteId, data: { regenerate: true } })
                  }
                }}
              >
                {t('public_link.regenerate')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-destructive"
                disabled={revokeLink.isPending}
                onClick={() => revokeLink.mutate({ quote: quoteId })}
              >
                {t('public_link.revoke')}
              </Button>
            </div>
          </>
        ) : (
          <Button
            type="button"
            disabled={createLink.isPending}
            onClick={() => createLink.mutate({ quote: quoteId, data: {} })}
          >
            {t('public_link.generate')}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
