import type { ComponentProps } from 'react'
import type { FieldError as RhfFieldError } from 'react-hook-form'

import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'

interface TextFieldProps extends ComponentProps<typeof Input> {
  id: string
  label: string
  error?: RhfFieldError
}

export function TextField({ id, label, error, ...inputProps }: TextFieldProps) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} aria-invalid={error ? true : undefined} {...inputProps} />
      <FieldError errors={error ? [error] : undefined} />
    </Field>
  )
}
