import { ChevronDownIcon } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

interface StatusTransitionMenuProps<TStatus extends string> {
  triggerLabel: string
  transitions: TStatus[]
  labelForStatus: (status: TStatus) => string
  onTransition: (status: TStatus) => void
  isPending?: boolean
  /** Transitions that end the document's lifecycle — gated behind a confirm prompt. */
  terminalTransitions?: TStatus[]
  confirmMessage?: (status: TStatus) => string
}

export function StatusTransitionMenu<TStatus extends string>({
  triggerLabel,
  transitions,
  labelForStatus,
  onTransition,
  isPending = false,
  terminalTransitions = [],
  confirmMessage,
}: StatusTransitionMenuProps<TStatus>) {
  if (transitions.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isPending}>
          {triggerLabel}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {transitions.map((status) => (
          <DropdownMenuItem
            key={status}
            onSelect={() => {
              if (terminalTransitions.includes(status)) {
                const message = confirmMessage?.(status) ?? labelForStatus(status)
                if (!window.confirm(message)) return
              }
              onTransition(status)
            }}
          >
            {labelForStatus(status)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
