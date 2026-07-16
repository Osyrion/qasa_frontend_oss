import { isAxiosError } from 'axios'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { getReportsVatControlStatementXml } from '@/api/generated/vat-reports/vat-reports'
import {
  useGetReportsEuSalesList,
  useGetReportsVatControlStatement,
} from '@/api/generated/vat-reports/vat-reports'
import { ExportDialog } from '@/features/reports/components/ExportDialog'
import { PeriodPicker, type PeriodValue } from '@/features/reports/components/PeriodPicker'
import type {
  VatControlStatementSections,
  VatControlStatementSummarySections,
} from '@/features/reports/lib/types'
import { MoneyText } from '@/shared/components/MoneyText'
import { triggerBlobDownload } from '@/shared/lib/download'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Spinner } from '@/shared/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'

function periodParams(period: PeriodValue) {
  return {
    year: period.year,
    quarter: period.granularity === 'quarter' ? period.quarter : undefined,
    month: period.granularity === 'month' ? period.month : undefined,
  }
}

export function ReportsPage() {
  const { t } = useTranslation('reports')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      <Tabs defaultValue="eu-sales-list">
        <TabsList>
          <TabsTrigger value="eu-sales-list">{t('tabs.eu_sales_list')}</TabsTrigger>
          <TabsTrigger value="control-statement">{t('tabs.control_statement')}</TabsTrigger>
          <TabsTrigger value="exports">{t('tabs.exports')}</TabsTrigger>
        </TabsList>

        <TabsContent value="eu-sales-list">
          <EuSalesListTab />
        </TabsContent>
        <TabsContent value="control-statement">
          <ControlStatementTab />
        </TabsContent>
        <TabsContent value="exports">
          <ExportsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EuSalesListTab() {
  const { t } = useTranslation('reports')
  const [period, setPeriod] = useState<PeriodValue>({
    year: new Date().getFullYear(),
    granularity: 'year',
  })

  const report = useGetReportsEuSalesList(periodParams(period))
  const rows = report.data?.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('tabs.eu_sales_list')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PeriodPicker value={period} onChange={setPeriod} />

        {report.isPending ? (
          <Spinner />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('eu_sales_list.column_period')}</TableHead>
                <TableHead>{t('eu_sales_list.column_vat_id')}</TableHead>
                <TableHead>{t('eu_sales_list.column_client')}</TableHead>
                <TableHead>{t('eu_sales_list.column_amount')}</TableHead>
                <TableHead>{t('eu_sales_list.column_code')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t('eu_sales_list.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.period}</TableCell>
                    <TableCell>{row.vat_id}</TableCell>
                    <TableCell>{row.client_name}</TableCell>
                    <TableCell>
                      <MoneyText amount={row.amount} currency="EUR" />
                    </TableCell>
                    <TableCell>{row.code}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function ControlStatementTab() {
  const { t } = useTranslation('reports')
  const [country, setCountry] = useState<'SK' | 'CZ'>('SK')
  const [period, setPeriod] = useState<PeriodValue>({
    year: new Date().getFullYear(),
    granularity: 'quarter',
    quarter: 1,
  })
  const [downloadingXml, setDownloadingXml] = useState(false)

  const report = useGetReportsVatControlStatement(
    { country, ...periodParams(period) },
    { query: { retry: false } },
  )

  const isNonPayer = isAxiosError(report.error) && report.error.response?.status === 422

  const canDownloadXml = country !== 'SK' || period.granularity !== 'year'

  const handleDownloadXml = async () => {
    setDownloadingXml(true)
    try {
      const blob = await getReportsVatControlStatementXml(
        { country, ...periodParams(period) },
        { responseType: 'blob' },
      )
      const suffix =
        period.granularity === 'month'
          ? `m${String(period.month).padStart(2, '0')}`
          : `q${period.quarter}`
      triggerBlobDownload(
        blob as Blob,
        `${country === 'CZ' ? 'dphkh1' : 'kvdph'}-${period.year}-${suffix}.xml`,
      )
    } catch {
      toast.error(t('export.failed'))
    } finally {
      setDownloadingXml(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('tabs.control_statement')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <Select value={country} onValueChange={(value) => setCountry(value as 'SK' | 'CZ')}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SK">SK</SelectItem>
              <SelectItem value="CZ">CZ</SelectItem>
            </SelectContent>
          </Select>
          <PeriodPicker value={period} onChange={setPeriod} requirePeriod={country === 'SK'} />
          <Button
            type="button"
            variant="outline"
            disabled={!canDownloadXml || downloadingXml || isNonPayer}
            onClick={() => void handleDownloadXml()}
          >
            {t('control_statement.download_xml')}
          </Button>
        </div>
        {!canDownloadXml && (
          <p className="text-xs text-muted-foreground">
            {t('control_statement.xml_period_required')}
          </p>
        )}

        {report.isPending ? (
          <Spinner />
        ) : isNonPayer ? (
          <Alert>
            <AlertTitle>{t('control_statement.not_a_payer_title')}</AlertTitle>
            <AlertDescription>{t('control_statement.not_a_payer_body')}</AlertDescription>
          </Alert>
        ) : (
          <ControlStatementSections
            sections={(report.data?.sections ?? {}) as VatControlStatementSections}
            summarySections={
              (report.data?.summary_sections ?? {}) as VatControlStatementSummarySections
            }
            assumptions={report.data?.assumptions ?? []}
          />
        )}
      </CardContent>
    </Card>
  )
}

function ControlStatementSections({
  sections,
  summarySections,
  assumptions,
}: {
  sections: VatControlStatementSections
  summarySections: VatControlStatementSummarySections
  assumptions: string[]
}) {
  const { t } = useTranslation('reports')
  const sectionCodes = Object.keys(sections)
  const summaryCodes = Object.keys(summarySections)

  return (
    <div className="flex flex-col gap-6">
      {assumptions.length > 0 && (
        <Alert>
          <AlertTitle>{t('control_statement.assumptions_title')}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {assumptions.map((assumption, index) => (
                <li key={index}>{assumption}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {sectionCodes.map((code) => (
        <div key={code} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">
            {t('control_statement.section')} {code}
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('control_statement.column_document')}</TableHead>
                <TableHead>{t('control_statement.column_date')}</TableHead>
                <TableHead>{t('control_statement.column_partner')}</TableHead>
                <TableHead>{t('control_statement.column_tax_id')}</TableHead>
                <TableHead>{t('control_statement.column_rate')}</TableHead>
                <TableHead>{t('control_statement.column_base')}</TableHead>
                <TableHead>{t('control_statement.column_vat')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections[code].map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.document_number}</TableCell>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.partner_name}</TableCell>
                  <TableCell>{row.partner_tax_id ?? '—'}</TableCell>
                  <TableCell>{row.rate}%</TableCell>
                  <TableCell>{row.base}</TableCell>
                  <TableCell>{row.vat}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}

      {summaryCodes.map((code) => (
        <div key={code} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">
            {t('control_statement.summary_section')} {code}
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('control_statement.column_rate')}</TableHead>
                <TableHead>{t('control_statement.column_base')}</TableHead>
                <TableHead>{t('control_statement.column_vat')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summarySections[code].map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.rate}%</TableCell>
                  <TableCell>{row.base}</TableCell>
                  <TableCell>{row.vat}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  )
}

function ExportsTab() {
  const { t } = useTranslation('reports')
  const [openKind, setOpenKind] = useState<'invoices' | 'supplier-invoices' | null>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('tabs.exports')}</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => setOpenKind('invoices')}>
          {t('export.invoices')}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpenKind('supplier-invoices')}>
          {t('export.supplier_invoices')}
        </Button>
      </CardContent>

      {openKind && (
        <ExportDialog
          open={Boolean(openKind)}
          onOpenChange={() => setOpenKind(null)}
          kind={openKind}
        />
      )}
    </Card>
  )
}
