import { CopyIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  useDeleteAuthTokensId,
  useGetAuthTokens,
  usePostAuthTokens,
} from '@/api/generated/tokens/tokens'
import { TOKEN_ABILITIES } from '@/features/settings/lib/token-abilities'
import { DateText } from '@/shared/components/DateText'
import { TextField } from '@/shared/components/TextField'
import { extractErrorMessage } from '@/shared/lib/laravel-errors'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

export function TokensPage() {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation()
  const [createOpen, setCreateOpen] = useState(false)
  const [createdToken, setCreatedToken] = useState<string | null>(null)

  const tokens = useGetAuthTokens()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/api/v1/auth/tokens'] })

  const revoke = useDeleteAuthTokensId({
    mutation: {
      onSuccess: () => {
        void invalidate()
        toast.success(t('tokens.revoked'))
      },
    },
  })

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('tokens.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('tokens.hint')}</p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <PlusIcon />
          {t('tokens.new_token')}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('tokens.column_name')}</TableHead>
            <TableHead>{t('tokens.column_abilities')}</TableHead>
            <TableHead>{t('tokens.column_last_used')}</TableHead>
            <TableHead>{t('tokens.column_created')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(tokens.data ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t('tokens.empty')}
              </TableCell>
            </TableRow>
          )}
          {(tokens.data ?? []).map((token) => (
            <TableRow key={token.id}>
              <TableCell className="font-medium">{token.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {(token.abilities ?? []).join(', ')}
              </TableCell>
              <TableCell>
                {token.last_used_at ? (
                  <DateText value={token.last_used_at} />
                ) : (
                  t('tokens.never_used')
                )}
              </TableCell>
              <TableCell>
                <DateText value={token.created_at} />
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  aria-label={tCommon('delete')}
                  onClick={() => {
                    if (token.id !== undefined && window.confirm(t('tokens.revoke_confirm'))) {
                      revoke.mutate({ id: token.id })
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

      <CreateTokenDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(token) => {
          void invalidate()
          setCreatedToken(token)
        }}
      />

      <Dialog open={createdToken !== null} onOpenChange={(open) => !open && setCreatedToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('tokens.created_title')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('tokens.created_hint')}</p>
          <code className="block rounded-lg border bg-muted/30 p-2 text-sm break-all">
            {createdToken}
          </code>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(createdToken ?? '')
                toast.success(t('tokens.copied'))
              }}
            >
              <CopyIcon />
              {t('tokens.copy')}
            </Button>
            <Button type="button" onClick={() => setCreatedToken(null)}>
              {tCommon('back')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface CreateTokenFormValues {
  name: string
  abilities: string[]
}

interface CreateTokenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (token: string) => void
}

function CreateTokenDialog({ open, onOpenChange, onCreated }: CreateTokenDialogProps) {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation()
  const { register, handleSubmit, watch, setValue, reset } = useForm<CreateTokenFormValues>({
    defaultValues: { name: '', abilities: [] },
  })

  const create = usePostAuthTokens({
    mutation: {
      onSuccess: (response) => {
        onOpenChange(false)
        onCreated(response.token ?? '')
      },
      onError: (error) => {
        toast.error(extractErrorMessage(error) ?? tCommon('error_generic'))
      },
    },
  })

  const abilities = watch('abilities')

  const toggleAbility = (ability: string, checked: boolean) => {
    setValue(
      'abilities',
      checked ? [...abilities, ability] : abilities.filter((a) => a !== ability),
    )
  }

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next)
    if (next) reset({ name: '', abilities: [] })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form
          onSubmit={handleSubmit((values) =>
            create.mutate({ data: { name: values.name, abilities: values.abilities } }),
          )}
          noValidate
        >
          <DialogHeader>
            <DialogTitle>{t('tokens.create_title')}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <TextField id="token-name" label={t('tokens.name_label')} {...register('name')} />
            <Field>
              <FieldLabel>{t('tokens.abilities_label')}</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {TOKEN_ABILITIES.map((ability) => (
                  <Field key={ability} orientation="horizontal">
                    <Checkbox
                      id={`ability-${ability}`}
                      checked={abilities.includes(ability)}
                      onCheckedChange={(checked) => toggleAbility(ability, checked === true)}
                    />
                    <FieldLabel htmlFor={`ability-${ability}`} className="font-normal">
                      {t(`tokens.abilities.${ability}`)}
                    </FieldLabel>
                  </Field>
                ))}
              </div>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={create.isPending || abilities.length === 0}>
              {t('tokens.create_action')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
