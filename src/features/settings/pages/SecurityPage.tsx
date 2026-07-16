import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  useDeleteAuth2fa,
  usePostAuth2faConfirm,
  usePostAuth2faEnable,
  usePostAuth2faRecoveryCodes,
} from '@/api/generated/two-factor/two-factor'
import { useAuthStore } from '@/features/auth/store'
import { RecoveryCodesDialog } from '@/features/settings/components/RecoveryCodesDialog'
import { TextField } from '@/shared/components/TextField'
import { extractErrorMessage } from '@/shared/lib/laravel-errors'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'

export function SecurityPage() {
  const { t } = useTranslation('settings')
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)

  const [enableOpen, setEnableOpen] = useState(false)
  const [disableOpen, setDisableOpen] = useState(false)
  const [regenerateOpen, setRegenerateOpen] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)

  const markEnabled = (enabled: boolean) => {
    if (user) setUser({ ...user, two_factor_enabled: enabled })
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t('security.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('security.two_factor_title')}
            <Badge variant={user?.two_factor_enabled ? 'default' : 'secondary'}>
              {user?.two_factor_enabled
                ? t('security.two_factor_enabled')
                : t('security.two_factor_disabled')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          {user?.two_factor_enabled ? (
            <>
              <Button type="button" variant="outline" onClick={() => setRegenerateOpen(true)}>
                {t('security.regenerate_action')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-destructive"
                onClick={() => setDisableOpen(true)}
              >
                {t('security.disable_action')}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={() => setEnableOpen(true)}>
              {t('security.enable_action')}
            </Button>
          )}
        </CardContent>
      </Card>

      <EnableTwoFactorDialog
        open={enableOpen}
        onOpenChange={setEnableOpen}
        onEnabled={(codes) => {
          markEnabled(true)
          setRecoveryCodes(codes)
        }}
      />
      <DisableTwoFactorDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        hasPassword={user?.has_password ?? true}
        onDisabled={() => markEnabled(false)}
      />
      <RegenerateRecoveryCodesDialog
        open={regenerateOpen}
        onOpenChange={setRegenerateOpen}
        onRegenerated={(codes) => setRecoveryCodes(codes)}
      />
      <RecoveryCodesDialog codes={recoveryCodes} onClose={() => setRecoveryCodes(null)} />
    </div>
  )
}

interface EnableTwoFactorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEnabled: (recoveryCodes: string[]) => void
}

function EnableTwoFactorDialog({ open, onOpenChange, onEnabled }: EnableTwoFactorDialogProps) {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation()
  const { register, handleSubmit, reset } = useForm<{ code: string }>({
    defaultValues: { code: '' },
  })

  const enable = usePostAuth2faEnable()

  const confirm = usePostAuth2faConfirm({
    mutation: {
      onSuccess: (response) => {
        onOpenChange(false)
        onEnabled(response.recovery_codes ?? [])
        toast.success(t('security.enabled_toast'))
      },
      onError: (error) => {
        toast.error(extractErrorMessage(error) ?? tCommon('error_generic'))
      },
    },
  })

  useEffect(() => {
    if (open) {
      reset({ code: '' })
      enable.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={handleSubmit((values) => confirm.mutate({ data: { code: values.code } }))}
          noValidate
        >
          <DialogHeader>
            <DialogTitle>{t('security.enable_dialog_title')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">{t('security.enable_step_scan')}</p>
            {enable.data?.qr_svg && (
              <img src={enable.data.qr_svg} alt="" className="size-48 rounded border bg-white" />
            )}
            {enable.data?.secret && (
              <Field className="w-full">
                <FieldLabel>{t('security.secret_label')}</FieldLabel>
                <code className="block rounded-lg border bg-muted/30 p-2 text-center text-sm break-all">
                  {enable.data.secret}
                </code>
              </Field>
            )}
            <FieldGroup className="w-full">
              <TextField
                id="enable-code"
                inputMode="numeric"
                label={t('security.confirm_code_label')}
                {...register('code')}
              />
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={confirm.isPending || !enable.data}>
              {t('security.confirm_action')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface DisableTwoFactorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hasPassword: boolean
  onDisabled: () => void
}

function DisableTwoFactorDialog({
  open,
  onOpenChange,
  hasPassword,
  onDisabled,
}: DisableTwoFactorDialogProps) {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation()
  const { register, handleSubmit, reset } = useForm<{ password: string; code: string }>({
    defaultValues: { password: '', code: '' },
  })

  const disable = useDeleteAuth2fa({
    mutation: {
      onSuccess: () => {
        onOpenChange(false)
        onDisabled()
        toast.success(t('security.disabled_toast'))
      },
      onError: (error) => {
        toast.error(extractErrorMessage(error) ?? tCommon('error_generic'))
      },
    },
  })

  useEffect(() => {
    if (open) reset({ password: '', code: '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={handleSubmit((values) =>
            disable.mutate({
              data: { password: hasPassword ? values.password : null, code: values.code },
            }),
          )}
          noValidate
        >
          <DialogHeader>
            <DialogTitle>{t('security.disable_dialog_title')}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            {hasPassword && (
              <TextField
                id="disable-password"
                type="password"
                autoComplete="current-password"
                label={t('security.disable_password')}
                {...register('password')}
              />
            )}
            <TextField id="disable-code" label={t('security.disable_code')} {...register('code')} />
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" variant="destructive" disabled={disable.isPending}>
              {t('security.disable_action')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface RegenerateRecoveryCodesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegenerated: (codes: string[]) => void
}

function RegenerateRecoveryCodesDialog({
  open,
  onOpenChange,
  onRegenerated,
}: RegenerateRecoveryCodesDialogProps) {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation()
  const { register, handleSubmit, reset } = useForm<{ code: string }>({
    defaultValues: { code: '' },
  })

  const regenerate = usePostAuth2faRecoveryCodes({
    mutation: {
      onSuccess: (response) => {
        onOpenChange(false)
        onRegenerated(response.recovery_codes ?? [])
        toast.success(t('security.regenerated_toast'))
      },
      onError: (error) => {
        toast.error(extractErrorMessage(error) ?? tCommon('error_generic'))
      },
    },
  })

  useEffect(() => {
    if (open) reset({ code: '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={handleSubmit((values) => regenerate.mutate({ data: { code: values.code } }))}
          noValidate
        >
          <DialogHeader>
            <DialogTitle>{t('security.regenerate_dialog_title')}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <TextField
              id="regenerate-code"
              label={t('security.regenerate_code_label')}
              {...register('code')}
            />
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={regenerate.isPending}>
              {t('security.regenerate_action')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
