import { UploadIcon } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { cn } from '@/shared/lib/utils'
import { Spinner } from '@/shared/ui/spinner'

export interface FileUploadPreset {
  /** `accept` attribute for the file input, e.g. "image/jpeg,image/png,application/pdf". */
  accept: string
  allowedMimeTypes: string[]
  maxSizeBytes: number
}

interface FileUploadProps {
  preset: FileUploadPreset
  onUpload: (file: File) => Promise<void> | void
  isUploading?: boolean
  hint?: string
}

function formatMaxSize(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`
}

export function FileUpload({ preset, onUpload, isUploading = false, hint }: FileUploadProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const validateAndUpload = (file: File) => {
    if (!preset.allowedMimeTypes.includes(file.type)) {
      toast.error(t('file_upload.type_not_allowed'))
      return
    }
    if (file.size > preset.maxSizeBytes) {
      toast.error(t('file_upload.too_large', { max: formatMaxSize(preset.maxSizeBytes) }))
      return
    }
    void onUpload(file)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) validateAndUpload(file)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click()
      }}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted-foreground transition-colors hover:border-primary/50',
        isDragging && 'border-primary bg-primary/5',
      )}
    >
      {isUploading ? <Spinner /> : <UploadIcon className="size-6" />}
      <span>{hint ?? t('file_upload.hint')}</span>
      <span className="text-xs">
        {t('file_upload.max_size', { max: formatMaxSize(preset.maxSizeBytes) })}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={preset.accept}
        className="hidden"
        disabled={isUploading}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) validateAndUpload(file)
        }}
      />
    </div>
  )
}
