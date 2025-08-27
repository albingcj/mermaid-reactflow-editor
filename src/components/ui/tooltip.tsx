

import * as React from "react"
import { Popover, PopoverTrigger, PopoverContent } from "./popover"

// Compatibility shim: export Tooltip API names but use Popover under the hood.
function TooltipProvider({ children }: { children?: React.ReactNode }) {
  // No-op provider; popover has no provider equivalent. Keep API for compatibility.
  return <>{children}</>
}

function Tooltip(props: React.ComponentProps<typeof Popover>) {
  // Render a Popover under the Tooltip name so existing code works.
  return <Popover {...(props as any)} />
}

const TooltipTrigger = PopoverTrigger
const TooltipContent = PopoverContent

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
