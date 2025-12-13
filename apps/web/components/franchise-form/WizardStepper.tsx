"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface Props {
  steps: string[]
  current: number
  onSelect?: (index: number) => void
}

export default function WizardStepper({ steps, current, onSelect }: Props) {
  return (
    <div className="mb-8">
      <ol className="flex items-center w-full relative z-0">
        {steps.map((label, idx) => {
          const active = idx === current
          const done = idx < current
          const canSelect = Boolean(onSelect) && idx <= current

          return (
            <li key={label} className={cn("flex-1 relative", idx === steps.length - 1 ? "flex-none" : "")}>
              {/* Connecting Line */}
              {idx < steps.length - 1 && (
                <div className={cn(
                  "absolute top-4 left-0 w-full h-[2px] -z-10 bg-gray-100",
                  // Adjust width to connect centers
                  "left-[50%] right-[-50%]",
                  idx < current ? "bg-meu-primary" : "bg-gray-200"
                )} />
              )}

              <div className="flex flex-col items-center group">
                <button
                  type="button"
                  disabled={!canSelect}
                  onClick={() => canSelect && onSelect && onSelect(idx)}
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-semibold transition-all duration-300 bg-white z-10",
                    active ? "border-meu-primary text-meu-primary ring-4 ring-meu-primary/10" :
                      done ? "border-meu-primary bg-meu-primary text-white" : "border-gray-200 text-gray-400",
                    canSelect ? "cursor-pointer" : "cursor-default"
                  )}
                >
                  {done ? <Check className="w-4 h-4" /> : idx + 1}
                </button>
                <span className={cn(
                  "mt-2 text-xs font-medium transition-colors duration-300 absolute top-8 w-32 text-center",
                  active ? "text-meu-primary" : "text-gray-500",
                  // Hide labels on mobile for better fit, show on md+
                  "hidden md:block"
                )}>
                  {label}
                </span>
                {/* Mobile Label (only for active step) */}
                <span className={cn(
                  "mt-2 text-xs font-medium transition-colors duration-300 absolute top-8 w-max text-center md:hidden",
                  active ? "text-meu-primary block" : "hidden"
                )}>
                  {label}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
      <div className="h-6 md:h-8" /> {/* Spacer for absolute labels */}
    </div>
  )
}
