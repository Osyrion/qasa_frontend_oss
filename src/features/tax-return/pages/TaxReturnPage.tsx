import { isAxiosError } from 'axios'
import { DownloadIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFieldArray, useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  postTaxReturnPreview,
  useDeleteTaxReturnDraft,
  useGetTaxReturnDraft,
  useGetTaxReturnSchema,
  useGetTaxReturnSystemData,
  usePutTaxReturnDraft,
} from '@/api/generated/taxation/taxation'
import type {
  PostTaxReturnPreview200Data,
  PutTaxReturnDraftBody,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { useCan } from '@/features/auth/permissions'
import { MoneyText } from '@/shared/components/MoneyText'
import { TextField } from '@/shared/components/TextField'
import { triggerBlobDownload } from '@/shared/lib/download'
import { extractErrorMessage } from '@/shared/lib/laravel-errors'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Checkbox } from '@/shared/ui/checkbox'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Spinner } from '@/shared/ui/spinner'

interface FormValues {
  use_actual_expenses: boolean
  is_main_activity: boolean
  months_active: string
  spouse_eligible_for_credit: boolean
  flat_rate_category_percent: string
  children: { age: string }[]
  employment_income: string
  other_income: string
  foreign_income: string
}

function defaultValues(): FormValues {
  return {
    use_actual_expenses: false,
    is_main_activity: true,
    months_active: '12',
    spouse_eligible_for_credit: false,
    flat_rate_category_percent: '60',
    children: [],
    employment_income: '0',
    other_income: '0',
    foreign_income: '0',
  }
}

export function TaxReturnPage() {
  const { t } = useTranslation('taxReturn')
  const [year, setYear] = useState(new Date().getFullYear())
  const [result, setResult] = useState<PostTaxReturnPreview200Data | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const canManageTaxation = useCan('taxation.manage')

  const schema = useGetTaxReturnSchema({ year })
  const systemData = useGetTaxReturnSystemData({ year })
  const draft = useGetTaxReturnDraft({ year }, { query: { retry: false } })

  const { register, handleSubmit, watch, setValue, control, reset } = useForm<FormValues>({
    defaultValues: defaultValues(),
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'children' })

  useEffect(() => {
    const existing = draft.data?.data
    if (existing) {
      reset({
        use_actual_expenses: existing.use_actual_expenses ?? false,
        is_main_activity: existing.is_main_activity ?? true,
        months_active: String(existing.months_active ?? 12),
        spouse_eligible_for_credit: existing.spouse_eligible_for_credit ?? false,
        flat_rate_category_percent: existing.flat_rate_category_percent
          ? String(existing.flat_rate_category_percent)
          : '60',
        children: (existing.children_ages ?? []).map((age) => ({ age: String(age) })),
        employment_income: String(existing.employment_income ?? 0),
        other_income: String(existing.other_income ?? 0),
        foreign_income: String(existing.foreign_income ?? 0),
      })
    } else {
      reset(defaultValues())
    }
    setResult(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, draft.data])

  const toBody = (values: FormValues): PutTaxReturnDraftBody => ({
    year,
    use_actual_expenses: values.use_actual_expenses,
    is_main_activity: values.is_main_activity,
    months_active: Number(values.months_active),
    spouse_eligible_for_credit: values.spouse_eligible_for_credit,
    flat_rate_category_percent: schema.data?.data?.supports_flat_rate_category_selection
      ? (Number(
          values.flat_rate_category_percent,
        ) as PutTaxReturnDraftBody['flat_rate_category_percent'])
      : null,
    children_ages: values.children.map((child) => Number(child.age)),
    employment_income: Number(values.employment_income),
    other_income: Number(values.other_income),
    foreign_income: Number(values.foreign_income),
  })

  const saveDraft = usePutTaxReturnDraft({
    mutation: {
      onSuccess: () => toast.success(t('draft_saved')),
      onError: (error) => toast.error(extractErrorMessage(error) ?? t('draft_save_failed')),
    },
  })

  const discardDraft = useDeleteTaxReturnDraft({
    mutation: {
      onSuccess: () => {
        reset(defaultValues())
        toast.success(t('draft_discarded'))
      },
    },
  })

  const [isCalculating, setIsCalculating] = useState(false)

  const onCalculate: SubmitHandler<FormValues> = async (values) => {
    setIsCalculating(true)
    try {
      const response = await postTaxReturnPreview(toBody(values))
      setResult(response.data ?? null)
    } catch (error) {
      toast.error(extractErrorMessage(error) ?? t('preview_failed'))
    } finally {
      setIsCalculating(false)
    }
  }

  const onDownloadPdf = handleSubmit(async (values) => {
    setIsDownloading(true)
    try {
      // The backend returns a binary PDF for ?format=pdf even though the
      // generated type (JSON-only in the OpenAPI spec) claims otherwise.
      const blob = (await postTaxReturnPreview(
        toBody(values),
        { format: 'pdf' },
        {
          responseType: 'blob',
        },
      )) as unknown as Blob
      triggerBlobDownload(blob, `tax-return-${year}.pdf`)
    } catch {
      toast.error(t('preview_failed'))
    } finally {
      setIsDownloading(false)
    }
  })

  const schemaData = schema.data?.data
  const system = systemData.data?.data
  const isCzFlatRate = schemaData?.supports_flat_rate_category_selection === true
  const flatRateCategories = schemaData?.flat_rate_categories ?? []
  const isFeatureUnavailable = isAxiosError(schema.error) && schema.error.response?.status === 403
  const isResidencyMissing = isAxiosError(schema.error) && schema.error.response?.status === 409

  if (isFeatureUnavailable) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <h1 className="text-lg font-semibold">{t('upgrade_required_title')}</h1>
        <p className="text-sm text-muted-foreground">{t('upgrade_required_body')}</p>
      </div>
    )
  }

  if (isResidencyMissing) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <h1 className="text-lg font-semibold">{t('residency_required_title')}</h1>
        <p className="text-sm text-muted-foreground">{t('residency_required_body')}</p>
      </div>
    )
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <Field className="w-32">
          <FieldLabel htmlFor="tax-return-year">{t('year')}</FieldLabel>
          <input
            id="tax-return-year"
            type="number"
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            value={year}
            onChange={(event) => setYear(Number(event.target.value) || year)}
          />
        </Field>
      </div>

      {schema.isError && !isFeatureUnavailable && !isResidencyMissing && (
        <Alert variant="destructive">
          <AlertDescription>{t('unsupported_year')}</AlertDescription>
        </Alert>
      )}

      {system && (
        <Card>
          <CardHeader>
            <CardTitle>{t('system_data_title')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">{t('business_income')}</div>
              <MoneyText amount={system.business_income} currency={system.currency ?? 'EUR'} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('total_actual_expenses')}</div>
              <MoneyText
                amount={system.total_actual_expenses}
                currency={system.currency ?? 'EUR'}
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('social_contributions_paid')}</div>
              <MoneyText
                amount={system.social_contributions_paid}
                currency={system.currency ?? 'EUR'}
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('health_contributions_paid')}</div>
              <MoneyText
                amount={system.health_contributions_paid}
                currency={system.currency ?? 'EUR'}
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('income_tax_advances_paid')}</div>
              <MoneyText
                amount={system.income_tax_advances_paid}
                currency={system.currency ?? 'EUR'}
              />
            </div>
            {(system.unconverted_amounts ?? []).length > 0 && (
              <Alert variant="destructive" className="col-span-2">
                <AlertDescription>{t('unconverted_amounts_warning')}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('wizard_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4">
            <FieldGroup>
              <Field orientation="horizontal">
                <Checkbox
                  id="use-actual-expenses"
                  checked={watch('use_actual_expenses')}
                  onCheckedChange={(checked) => setValue('use_actual_expenses', checked === true)}
                />
                <FieldLabel htmlFor="use-actual-expenses">{t('use_actual_expenses')}</FieldLabel>
              </Field>

              <Field orientation="horizontal">
                <Checkbox
                  id="is-main-activity"
                  checked={watch('is_main_activity')}
                  onCheckedChange={(checked) => setValue('is_main_activity', checked === true)}
                />
                <FieldLabel htmlFor="is-main-activity">{t('is_main_activity')}</FieldLabel>
              </Field>

              <Field orientation="horizontal">
                <Checkbox
                  id="spouse-eligible"
                  checked={watch('spouse_eligible_for_credit')}
                  onCheckedChange={(checked) =>
                    setValue('spouse_eligible_for_credit', checked === true)
                  }
                />
                <FieldLabel htmlFor="spouse-eligible">{t('spouse_eligible_for_credit')}</FieldLabel>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <TextField
                  id="months-active"
                  type="number"
                  min={0}
                  max={12}
                  label={t('months_active')}
                  {...register('months_active')}
                />

                {isCzFlatRate && (
                  <Field>
                    <FieldLabel htmlFor="flat-rate-category">
                      {t('flat_rate_category_percent')}
                    </FieldLabel>
                    <Select
                      value={watch('flat_rate_category_percent')}
                      onValueChange={(value) => setValue('flat_rate_category_percent', value)}
                    >
                      <SelectTrigger id="flat-rate-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {flatRateCategories.map((percent) => (
                          <SelectItem key={percent} value={String(percent)}>
                            {percent}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <TextField
                  id="employment-income"
                  label={t('employment_income')}
                  {...register('employment_income')}
                />
                <TextField
                  id="other-income"
                  label={t('other_income')}
                  {...register('other_income')}
                />
                <TextField
                  id="foreign-income"
                  label={t('foreign_income')}
                  {...register('foreign_income')}
                />
              </div>

              <Field>
                <FieldLabel>{t('children_ages')}</FieldLabel>
                <div className="flex flex-col gap-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={30}
                        className="h-9 w-24 rounded-md border bg-transparent px-3 text-sm"
                        {...register(`children.${index}.age` as const)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => remove(index)}
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="self-start"
                    onClick={() => append({ age: '0' })}
                  >
                    <PlusIcon />
                    {t('add_child')}
                  </Button>
                </div>
              </Field>
            </FieldGroup>

            <div className="flex flex-wrap gap-2">
              {/* Reading the wizard and calculating a preview need only
                  taxation.view, which every role holds; persisting a draft
                  is taxation.manage, which a Viewer does not. */}
              {canManageTaxation && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saveDraft.isPending}
                    onClick={handleSubmit((values) => saveDraft.mutate({ data: toBody(values) }))}
                  >
                    {t('save_draft')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive"
                    disabled={discardDraft.isPending}
                    onClick={() => discardDraft.mutate({ params: { year } })}
                  >
                    {t('discard_draft')}
                  </Button>
                </>
              )}
              <Button type="button" disabled={isCalculating} onClick={handleSubmit(onCalculate)}>
                {isCalculating ? <Spinner /> : t('calculate')}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isDownloading}
                onClick={() => void onDownloadPdf()}
              >
                <DownloadIcon />
                {t('download_pdf')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>{t('result_title')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <ResultRow
                label={t('total_tax_base')}
                amount={result.total_tax_base}
                currency={result.currency}
              />
              <ResultRow
                label={t('expenses_used')}
                amount={result.expenses_used}
                currency={result.currency}
              />
              <ResultRow
                label={t('tax_before_credits')}
                amount={result.tax_before_credits}
                currency={result.currency}
              />
              <ResultRow
                label={t('tax_credits')}
                amount={result.tax_credits}
                currency={result.currency}
              />
              <ResultRow
                label={t('child_tax_bonus')}
                amount={result.child_tax_bonus}
                currency={result.currency}
              />
              <ResultRow
                label={t('final_tax')}
                amount={result.final_tax}
                currency={result.currency}
              />
              <ResultRow
                label={t('advances_paid')}
                amount={result.advances_paid}
                currency={result.currency}
              />
              <ResultRow
                label={t('tax_balance')}
                amount={result.tax_balance}
                currency={result.currency}
              />
            </div>
            {result.notes && result.notes.length > 0 && (
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                {result.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">{result.disclaimer}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ResultRow({
  label,
  amount,
  currency,
}: {
  label: string
  amount?: number
  currency?: string
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <MoneyText amount={amount} currency={currency ?? 'EUR'} />
    </div>
  )
}
