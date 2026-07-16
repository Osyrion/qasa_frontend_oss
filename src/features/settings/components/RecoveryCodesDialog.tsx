import { CopyIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'

interface RecoveryCodesDialogProps {
  codes: string[] | null
  onClose: () => void
}

/** Shows a freshly (re)generated recovery-code set exactly once — the API never returns them again. */
export function RecoveryCodesDialog({ codes, onClose }: RecoveryCodesDialogProps) {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation()

  return (
    <Dialog open={codes !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('security.recovery_codes_title')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t('security.recovery_codes_hint')}</p>
        <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-3 font-mono text-sm">
          {codes?.map((code) => (
            <span key={code}>{code}</span>
          ))}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText((codes ?? []).join('\n'))
              toast.success(t('tokens.copied'))
            }}
          >
            <CopyIcon />
            {t('tokens.copy')}
          </Button>
          <Button type="button" onClick={onClose}>
            {tCommon('back')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
