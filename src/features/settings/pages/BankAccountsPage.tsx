import { zodResolver } from '@hookform/resolvers/zod'
import { PencilIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  useDeleteBankAccountsId,
  useGetBankAccounts,
  usePostBankAccounts,
  usePutBankAccountsId,
} from '@/api/generated/bank-accounts/bank-accounts'
import {
  PostBankAccountsBodyCurrency,
  type BankAccount,
  type PostBankAccountsBody,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors } from '@/shared/lib/laravel-errors'
import { queryClient } from '@/shared/lib/query-client'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const CURRENCIES = Object.values(PostBankAccountsBodyCurrency)

export function BankAccountsPage() {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation()
  const [dialogTarget, setDialogTarget] = useState<BankAccount | null | undefined>(undefined)

  const accounts = useGetBankAccounts()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/api/v1/bank-accounts'] })

  const remove = useDeleteBankAccountsId({
    mutation: {
      onSuccess: () => {
        void invalidate()
        toast.success(t('bank_accounts.deleted'))
      },
    },
  })

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('bank_accounts.title')}</h1>
        <Button type="button" onClick={() => setDialogTarget(null)}>
          <PlusIcon />
          {t('bank_accounts.new_account')}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('bank_accounts.column_label')}</TableHead>
            <TableHead>{t('bank_accounts.column_iban')}</TableHead>
            <TableHead>{t('bank_accounts.column_currency')}</TableHead>
            <TableHead>{t('bank_accounts.column_default')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(accounts.data ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t('bank_accounts.empty')}
              </TableCell>
            </TableRow>
          )}
          {(accounts.data ?? []).map((account) => (
            <TableRow key={account.id}>
              <TableCell className="font-medium">{account.label}</TableCell>
              <TableCell>{account.iban ?? account.account_number ?? '—'}</TableCell>
              <TableCell>{account.currency}</TableCell>
              <TableCell>{account.is_default && <Badge>✓</Badge>}</TableCell>
              <TableCell className="flex justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={tCommon('edit')}
                  onClick={() => setDialogTarget(account)}
                >
                  <PencilIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  aria-label={tCommon('delete')}
                  onClick={() => {
                    if (
                      account.id !== undefined &&
                      window.confirm(t('bank_accounts.delete_confirm'))
                    ) {
                      remove.mutate({ id: account.id })
                    }
                  }}
                >
                  <TrashIcon />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <BankAccountDialog
        target={dialogTarget}
        onClose={() => setDialogTarget(undefined)}
        onSaved={() => void invalidate()}
      />
    </div>
  )
}

interface BankAccountFormValues {
  label: string
  bank_name: string
  account_number: string
  iban: string
  bic: string
  currency: PostBankAccountsBodyCurrency
  is_default: boolean
}

function accountToFormValues(account?: BankAccount | null): BankAccountFormValues {
  return {
    label: account?.label ?? '',
    bank_name: account?.bank_name ?? '',
    account_number: account?.account_number ?? '',
    iban: account?.iban ?? '',
    bic: account?.bic ?? '',
    currency: (account?.currency ??
      PostBankAccountsBodyCurrency.EUR) as PostBankAccountsBodyCurrency,
    is_default: account?.is_default ?? false,
  }
}

function toRequestBody(values: BankAccountFormValues): PostBankAccountsBody {
  const orNull = (value: string) => (value.trim() ? value.trim() : null)
  return {
    label: values.label.trim(),
    bank_name: orNull(values.bank_name),
    account_number: orNull(values.account_number),
    iban: orNull(values.iban),
    bic: orNull(values.bic),
    currency: values.currency,
    is_default: values.is_default,
  }
}

interface BankAccountDialogProps {
  target: BankAccount | null | undefined
  onClose: () => void
  onSaved: () => void
}

function BankAccountDialog({ target, onClose, onSaved }: BankAccountDialogProps) {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation()
  const isEdit = Boolean(target?.id)
  const open = target !== undefined

  const schema = z.object({
    label: z.string().min(1).max(100),
    bank_name: z.string().max(100),
    account_number: z.string().max(30),
    iban: z.string().max(34),
    bic: z.string().max(11),
    currency: z.enum(CURRENCIES),
    is_default: z.boolean(),
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<BankAccountFormValues>({
    resolver: zodResolver(schema),
    defaultValues: accountToFormValues(target),
  })

  useEffect(() => {
    if (open) reset(accountToFormValues(target))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target])

  const createMutation = usePostBankAccounts({
    mutation: {
      onSuccess: () => {
        toast.success(t('bank_accounts.created'))
        onSaved()
        onClose()
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const updateMutation = usePutBankAccountsId({
    mutation: {
      onSuccess: () => {
        toast.success(t('bank_accounts.updated'))
        onSaved()
        onClose()
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const onSubmit: SubmitHandler<BankAccountFormValues> = (values) => {
    const body = toRequestBody(values)
    if (isEdit && target?.id) {
      updateMutation.mutate({ id: target.id, data: body })
    } else {
      createMutation.mutate({ data: body })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t('bank_accounts.edit_title') : t('bank_accounts.create_title')}
            </DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <TextField
              id="ba-label"
              label={t('bank_accounts.label')}
              error={errors.label}
              {...register('label')}
            />
            <TextField
              id="ba-bank-name"
              label={t('bank_accounts.bank_name')}
              error={errors.bank_name}
              {...register('bank_name')}
            />
            <TextField
              id="ba-iban"
              label={t('bank_accounts.iban')}
              error={errors.iban}
              {...register('iban')}
            />
            <div className="grid grid-cols-2 gap-3">
              <TextField
                id="ba-account-number"
                label={t('bank_accounts.account_number')}
                error={errors.account_number}
                {...register('account_number')}
              />
              <TextField
                id="ba-bic"
                label={t('bank_accounts.bic')}
                error={errors.bic}
                {...register('bic')}
              />
            </div>
            <Field>
              <FieldLabel htmlFor="ba-currency">{t('bank_accounts.currency')}</FieldLabel>
              <Select
                value={watch('currency')}
                onValueChange={(value) =>
                  setValue('currency', value as PostBankAccountsBodyCurrency)
                }
              >
                <SelectTrigger id="ba-currency">
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
            <Field orientation="horizontal">
              <Checkbox
                id="ba-is-default"
                checked={watch('is_default')}
                onCheckedChange={(checked) => setValue('is_default', checked === true)}
              />
              <FieldLabel htmlFor="ba-is-default">{t('bank_accounts.is_default')}</FieldLabel>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
