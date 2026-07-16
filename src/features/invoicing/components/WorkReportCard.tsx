import { zodResolver } from '@hookform/resolvers/zod'
import { PencilIcon, PlusIcon, TrashIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  useGetInvoicesInvoiceWorkReport,
  usePutInvoicesInvoiceWorkReport,
} from '@/api/generated/invoices/invoices'
import { normalizeMoneyInput } from '@/shared/lib/money'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Skeleton } from '@/shared/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'

interface WorkReportCardProps {
  invoiceId: string
  editable: boolean
}

interface WorkReportFormValues {
  lines: { work_date: string; description: string; hours: string }[]
}

function emptyLine(): WorkReportFormValues['lines'][number] {
  return { work_date: '', description: '', hours: '' }
}

function sumHours(hours: (number | undefined)[]): number {
  return hours.reduce((sum: number, value) => sum + (value ?? 0), 0)
}

export function WorkReportCard({ invoiceId, editable }: WorkReportCardProps) {
  const { t } = useTranslation('invoices')
  const { t: tCommon } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)

  const workReport = useGetInvoicesInvoiceWorkReport(invoiceId, {
    query: { enabled: Boolean(invoiceId) },
  })

  const schema = z.object({
    lines: z.array(
      z.object({
        work_date: z.string().min(1, t('validation.work_date_required')),
        description: z.string().min(1, t('validation.description_required')).max(255),
        hours: z.string().refine((value) => Number(normalizeMoneyInput(value)) > 0, {
          message: t('validation.hours_positive'),
        }),
      }),
    ),
  })

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<WorkReportFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { lines: [] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const watchedLines = watch('lines')

  const updateLines = usePutInvoicesInvoiceWorkReport({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: [`/api/v1/invoices/${invoiceId}/work-report`],
        })
        toast.success(t('work_report.saved'))
        setIsEditing(false)
      },
      onError: () => {
        toast.error(t('work_report.save_failed'))
      },
    },
  })

  const startEditing = () => {
    const lines = (workReport.data ?? []).map((line) => ({
      work_date: line.work_date ?? '',
      description: line.description ?? '',
      hours: line.hours != null ? String(line.hours) : '',
    }))
    reset({ lines: lines.length ? lines : [emptyLine()] })
    setIsEditing(true)
  }

  const onSubmit = handleSubmit((values) => {
    updateLines.mutate({
      invoice: invoiceId,
      data: {
        lines: values.lines.map((line) => ({
          work_date: line.work_date,
          description: line.description,
          hours: Number(normalizeMoneyInput(line.hours)),
        })),
      },
    })
  })

  const totalHours = sumHours((workReport.data ?? []).map((line) => line.hours))
  const draftTotalHours = sumHours(
    (watchedLines ?? []).map((line) => Number(normalizeMoneyInput(line.hours || '0')) || 0),
  )

  return (
    <Card data-testid="work-report-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('work_report.title')}</CardTitle>
        {editable && !isEditing && (
          <Button size="sm" variant="outline" onClick={startEditing}>
            <PencilIcon />
            {tCommon('edit')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {workReport.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : isEditing ? (
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('work_report.work_date')}</TableHead>
                  <TableHead>{t('work_report.description')}</TableHead>
                  <TableHead>{t('work_report.hours')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell className="w-40 align-top">
                      <Input
                        type="date"
                        aria-label={t('work_report.work_date')}
                        {...register(`lines.${index}.work_date`)}
                      />
                      {errors.lines?.[index]?.work_date && (
                        <p className="text-sm text-destructive">
                          {errors.lines[index]?.work_date?.message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        aria-label={t('work_report.description')}
                        {...register(`lines.${index}.description`)}
                      />
                      {errors.lines?.[index]?.description && (
                        <p className="text-sm text-destructive">
                          {errors.lines[index]?.description?.message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="w-28 align-top">
                      <Input
                        aria-label={t('work_report.hours')}
                        {...register(`lines.${index}.hours`)}
                      />
                      {errors.lines?.[index]?.hours && (
                        <p className="text-sm text-destructive">
                          {errors.lines[index]?.hours?.message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={fields.length <= 1}
                        aria-label={t('work_report.delete_line')}
                        onClick={() => remove(index)}
                      >
                        <TrashIcon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2}>{t('work_report.total_hours')}</TableCell>
                  <TableCell colSpan={2}>{draftTotalHours}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>

            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" onClick={() => append(emptyLine())}>
                <PlusIcon />
                {t('work_report.add_line')}
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  <XIcon />
                  {tCommon('cancel')}
                </Button>
                <Button type="submit" disabled={updateLines.isPending}>
                  {t('work_report.save')}
                </Button>
              </div>
            </div>
          </form>
        ) : !workReport.data?.length ? (
          <p className="text-sm text-muted-foreground">{t('work_report.empty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('work_report.work_date')}</TableHead>
                <TableHead>{t('work_report.description')}</TableHead>
                <TableHead>{t('work_report.hours')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workReport.data.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.work_date}</TableCell>
                  <TableCell>{line.description}</TableCell>
                  <TableCell>{line.hours}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>{t('work_report.total_hours')}</TableCell>
                <TableCell>{totalHours}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
