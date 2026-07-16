import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  useGetExpensesExpense,
  usePostExpenses,
  usePutExpensesExpense,
} from '@/api/generated/expenses/expenses'
import {
  PostExpensesBodyCategory,
  PostExpensesBodyCurrency,
  type PostExpensesBody,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { ExpenseAttachmentSection } from '@/features/expenses/components/ExpenseAttachmentSection'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors } from '@/shared/lib/laravel-errors'
import { normalizeMoneyInput } from '@/shared/lib/money'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { Spinner } from '@/shared/ui/spinner'
import { Textarea } from '@/shared/ui/textarea'

const CATEGORIES = Object.values(PostExpensesBodyCategory)
const CURRENCIES = Object.values(PostExpensesBodyCurrency)

interface FormValues {
  description: string
  category: PostExpensesBodyCategory
  amount: string
  currency: PostExpensesBodyCurrency
  date: string
  note: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function defaultValues(): FormValues {
  return {
    description: '',
    category: PostExpensesBodyCategory.office,
    amount: '',
    currency: PostExpensesBodyCurrency.EUR,
    date: todayIso(),
    note: '',
  }
}

interface ExpenseFormSheetProps {
  expenseId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExpenseFormSheet({ expenseId, open, onOpenChange }: ExpenseFormSheetProps) {
  const { t } = useTranslation('expenses')
  const { t: tCommon } = useTranslation()
  const isEdit = Boolean(expenseId)

  const existing = useGetExpensesExpense(expenseId ?? '', { query: { enabled: isEdit && open } })

  const schema = z.object({
    description: z.string().min(1, t('validation.description_required')),
    category: z.enum(CATEGORIES),
    amount: z.string().refine((v) => Number(normalizeMoneyInput(v)) > 0, {
      message: t('validation.amount_positive'),
    }),
    currency: z.enum(CURRENCIES),
    date: z.string().min(1, t('validation.date_required')),
    note: z.string(),
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(),
  })

  useEffect(() => {
    if (!open) return
    if (existing.data) {
      reset({
        description: existing.data.description ?? '',
        category: (existing.data.category ?? 'office') as PostExpensesBodyCategory,
        amount: existing.data.amount != null ? String(existing.data.amount) : '',
        currency: (existing.data.currency ?? 'EUR') as PostExpensesBodyCurrency,
        date: existing.data.date ?? todayIso(),
        note: existing.data.note ?? '',
      })
    } else if (!isEdit) {
      reset(defaultValues())
    }
  }, [open, existing.data, isEdit, reset])

  const invalidateList = () =>
    void queryClient.invalidateQueries({ queryKey: ['/api/v1/expenses'] })

  const createMutation = usePostExpenses({
    mutation: {
      onSuccess: () => {
        invalidateList()
        toast.success(t('form.created'))
        onOpenChange(false)
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const updateMutation = usePutExpensesExpense({
    mutation: {
      onSuccess: () => {
        invalidateList()
        void queryClient.invalidateQueries({ queryKey: [`/api/v1/expenses/${expenseId}`] })
        toast.success(t('form.updated'))
        onOpenChange(false)
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const toBody = (values: FormValues): PostExpensesBody => ({
    description: values.description,
    category: values.category,
    amount: Number(normalizeMoneyInput(values.amount)),
    currency: values.currency,
    date: values.date,
    note: values.note || null,
  })

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    if (isEdit && expenseId) {
      updateMutation.mutate({ expense: expenseId, data: toBody(values) })
    } else {
      createMutation.mutate({ data: toBody(values) })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? t('form.edit_title') : t('form.create_title')}</SheetTitle>
        </SheetHeader>
        {isEdit && existing.isPending ? (
          <div className="flex justify-center p-6">
            <Spinner />
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
          >
            <FieldGroup>
              <TextField
                id="expense-description"
                label={t('form.description')}
                error={errors.description}
                {...register('description')}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="expense-category">{t('form.category')}</FieldLabel>
                  <Select
                    value={watch('category')}
                    onValueChange={(value) =>
                      setValue('category', value as PostExpensesBodyCategory)
                    }
                  >
                    <SelectTrigger id="expense-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {t(`category.${category}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <TextField
                  id="expense-date"
                  type="date"
                  label={t('form.date')}
                  error={errors.date}
                  {...register('date')}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  id="expense-amount"
                  label={t('form.amount')}
                  error={errors.amount}
                  {...register('amount')}
                />
                <Field>
                  <FieldLabel htmlFor="expense-currency">{t('form.currency')}</FieldLabel>
                  <Select
                    value={watch('currency')}
                    onValueChange={(value) =>
                      setValue('currency', value as PostExpensesBodyCurrency)
                    }
                  >
                    <SelectTrigger id="expense-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="expense-note">{t('form.note')}</FieldLabel>
                <Textarea id="expense-note" {...register('note')} />
              </Field>
            </FieldGroup>

            {isEdit && expenseId && (
              <FieldGroup>
                <h3 className="text-sm font-medium">{t('attachment.title')}</h3>
                <ExpenseAttachmentSection
                  expenseId={expenseId}
                  attachment={existing.data?.attachment}
                />
              </FieldGroup>
            )}

            <SheetFooter className="mt-auto flex-row justify-end border-t px-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {tCommon('save')}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
