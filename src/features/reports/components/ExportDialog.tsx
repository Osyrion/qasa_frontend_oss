import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  getInvoicesExportCsv,
  getInvoicesExportOmega,
  getInvoicesExportPohoda,
  getSupplierInvoicesExportOmega,
} from '@/api/generated/invoice-export/invoice-export'
import type { GetInvoicesExportCsvTypesItem } from '@/api/generated/qASAAPIDocumentation.schemas'

type PeriodBasis = 'issue' | 'tax'
import { triggerBlobDownload } from '@/shared/lib/download'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Field, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

const DOCUMENT_TYPES: GetInvoicesExportCsvTypesItem[] = ['invoice', 'credit_note', 'storno']

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: 'invoices' | 'supplier-invoices'
}

export function ExportDialog({ open, onOpenChange, kind }: ExportDialogProps) {
  const { t } = useTranslation('reports')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [periodBasis, setPeriodBasis] = useState<PeriodBasis>('issue')
  const [types, setTypes] = useState<GetInvoicesExportCsvTypesItem[]>(['invoice'])
  const [downloading, setDownloading] = useState<string | null>(null)

  const toggleType = (type: GetInvoicesExportCsvTypesItem) => {
    setTypes((prev) => (prev.includes(type) ? prev.filter((t2) => t2 !== type) : [...prev, type]))
  }

  const download = async (format: string, fetcher: () => Promise<unknown>, filename: string) => {
    if (!dateFrom || !dateTo) {
      toast.error(t('export.date_range_required'))
      return
    }
    setDownloading(format)
    try {
      const blob = await fetcher()
      triggerBlobDownload(blob as Blob, filename)
    } catch {
      toast.error(t('export.failed'))
    } finally {
      setDownloading(null)
    }
  }

  const invoiceParams = {
    date_from: dateFrom,
    date_to: dateTo,
    period_basis: periodBasis,
    'types[]': types,
  }
  const supplierParams = { date_from: dateFrom, date_to: dateTo, period_basis: periodBasis }
  const filename = (prefix: string, extension: string) =>
    `${prefix}_${dateFrom}_${dateTo}.${extension}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {kind === 'invoices' ? t('export.title_invoices') : t('export.title_supplier_invoices')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="export-date-from">{t('export.date_from')}</FieldLabel>
              <Input
                id="export-date-from"
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="export-date-to">{t('export.date_to')}</FieldLabel>
              <Input
                id="export-date-to"
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="export-period-basis">{t('export.period_basis')}</FieldLabel>
            <Select
              value={periodBasis}
              onValueChange={(value) => setPeriodBasis(value as PeriodBasis)}
            >
              <SelectTrigger id="export-period-basis">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="issue">{t('export.period_basis_issue')}</SelectItem>
                <SelectItem value="tax">{t('export.period_basis_tax')}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {kind === 'invoices' && (
            <Field>
              <FieldLabel>{t('export.document_types')}</FieldLabel>
              <div className="flex flex-col gap-2">
                {DOCUMENT_TYPES.map((type) => (
                  <div key={type} className="flex items-center gap-2">
                    <Checkbox
                      id={`export-type-${type}`}
                      checked={types.includes(type)}
                      onCheckedChange={() => toggleType(type)}
                    />
                    <label htmlFor={`export-type-${type}`} className="text-sm">
                      {t(`export.type_${type}`)}
                    </label>
                  </div>
                ))}
              </div>
            </Field>
          )}

          <div className="flex flex-col gap-2 border-t pt-4">
            {kind === 'invoices' ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={downloading !== null}
                  onClick={() =>
                    void download(
                      'pohoda',
                      () => getInvoicesExportPohoda(invoiceParams, { responseType: 'blob' }),
                      filename('pohoda', 'xml'),
                    )
                  }
                >
                  {downloading === 'pohoda' ? t('export.downloading') : t('export.download_pohoda')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={downloading !== null}
                  onClick={() =>
                    void download(
                      'csv',
                      () => getInvoicesExportCsv(invoiceParams, { responseType: 'blob' }),
                      filename('faktury', 'csv'),
                    )
                  }
                >
                  {downloading === 'csv' ? t('export.downloading') : t('export.download_csv')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={downloading !== null}
                  onClick={() =>
                    void download(
                      'omega',
                      () => getInvoicesExportOmega(invoiceParams, { responseType: 'blob' }),
                      filename('omega_vydane', 'txt'),
                    )
                  }
                >
                  {downloading === 'omega' ? t('export.downloading') : t('export.download_omega')}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={downloading !== null}
                onClick={() =>
                  void download(
                    'omega',
                    () => getSupplierInvoicesExportOmega(supplierParams, { responseType: 'blob' }),
                    filename('omega_prijate', 'txt'),
                  )
                }
              >
                {downloading === 'omega' ? t('export.downloading') : t('export.download_omega')}
              </Button>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('export.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
