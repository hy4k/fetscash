import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-[var(--k-label-quaternary)] selection:bg-[rgba(11,92,67,0.16)] h-10 w-full min-w-0 rounded-lg border border-[rgba(17,23,19,0.18)] bg-[var(--f-card)] px-3.5 py-1 text-base shadow-none transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm [font-feature-settings:'tnum'_1]",
        "focus-visible:border-[var(--f-green)] focus-visible:ring-[rgba(11,92,67,0.18)] focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
